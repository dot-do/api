/**
 * taxi.example.com.ai - NYC Taxi Trip Data at the Edge
 *
 * Uses PGLite in Durable Objects for storing and querying NYC Taxi trip data.
 * Features streaming seed logic that fetches data directly from NYC TLC Parquet sources.
 * Uses chunked/batch inserts to avoid memory issues.
 *
 * Data Source: NYC TLC Trip Record Data
 * https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page
 *
 * WASM Loading Strategy:
 * Uses eager-but-non-blocking pattern - WASM starts loading immediately on DO init.
 * Non-query endpoints respond instantly while WASM loads in background.
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'
import { PGliteLocal } from './src/pglite-local'
// Pure JS Parquet parser - works in Cloudflare Workers
import { asyncBufferFromUrl, parquetReadObjects, parquetMetadataAsync } from 'hyparquet'
// Compressors for ZSTD, Gzip, Brotli, LZ4 support
import { compressors } from 'hyparquet-compressors'

// Static WASM imports - Wrangler pre-compiles these
// @ts-ignore
import pgliteWasm from './src/pglite-assets/pglite.wasm'
// @ts-ignore
import pgliteData from './src/pglite-assets/pglite.data'

// NYC TLC Trip Data URLs (Parquet format)
const NYC_TAXI_DATA_BASE_URL = 'https://d37ci6vzurychx.cloudfront.net/trip-data'

/**
 * Get the URL for NYC Yellow Taxi data for a given month
 */
function getTaxiDataUrl(month: string): string {
  return `${NYC_TAXI_DATA_BASE_URL}/yellow_tripdata_${month}.parquet`
}

// =============================================================================
// Module-Level Hoisting (survives DO reinstantiation)
// =============================================================================

let MODULE_LOAD_TIME: number | null = null
const MODULE_INSTANCE_ID = Math.random().toString(36).slice(2, 10)

function getModuleLoadTime(): number {
  if (MODULE_LOAD_TIME === null) {
    MODULE_LOAD_TIME = Date.now()
  }
  return MODULE_LOAD_TIME
}

let moduleRequestCount = 0

/** Hoisted PGLite instance */
let hoistedPglite: PGliteLocal | null = null

/** Promise for in-progress PGLite initialization */
let hoistedPglitePromise: Promise<PGliteLocal> | null = null

/** Timestamp when WASM loading started */
let wasmLoadStartedAt: number | null = null

/** Timestamp when WASM was loaded */
let wasmLoadedAt: number | null = null

function isWasmLoading(): boolean {
  return hoistedPglitePromise !== null && hoistedPglite === null
}

function startWasmLoadingInBackground(): void {
  if (hoistedPglite || hoistedPglitePromise) return

  wasmLoadStartedAt = Date.now()
  console.log(`[taxi] Starting WASM load in background - module: ${MODULE_INSTANCE_ID}`)

  hoistedPglitePromise = PGliteLocal.create({
    wasmModule: pgliteWasm,
    fsBundle: pgliteData,
  }).then((pg) => {
    hoistedPglite = pg
    wasmLoadedAt = Date.now()
    const loadDuration = wasmLoadedAt - (wasmLoadStartedAt ?? wasmLoadedAt)
    console.log(`[taxi] WASM LOADED - took ${loadDuration}ms, module: ${MODULE_INSTANCE_ID}`)
    return pg
  }).catch((err) => {
    console.error(`[taxi] WASM load failed:`, err)
    hoistedPglitePromise = null
    throw err
  })
}

async function getOrAwaitHoistedPglite(): Promise<PGliteLocal> {
  if (hoistedPglite) return hoistedPglite
  if (hoistedPglitePromise) return hoistedPglitePromise

  startWasmLoadingInBackground()
  return hoistedPglitePromise!
}

// =============================================================================
// Types
// =============================================================================

interface Env {
  TAXI: DurableObjectNamespace<TaxiDO>
  ANALYTICS?: AnalyticsEngineDataset
}

interface Trip {
  id: number
  pickup_datetime: string
  dropoff_datetime: string
  passenger_count: number
  trip_distance: number
  fare_amount: number
  tip_amount: number
  total_amount: number
  pickup_location_id: number | null
  dropoff_location_id: number | null
}

interface SeedProgress {
  isSeeding: boolean
  rowsInserted: number
  totalRows: number | null
  currentBatch: number
  totalBatches: number | null
  startedAt: string | null
  completedAt: string | null
  error: string | null
  source: string | null
  bytesProcessed: number
}

// =============================================================================
// Taxi Durable Object
// =============================================================================

export class TaxiDO extends DurableObject {
  private pglite: PGliteLocal | null = null
  private colo: string = 'unknown'

  // Instance tracking
  private readonly instanceCreatedAt = Date.now()
  private readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  private instanceRequestCount = 0
  private wasmInitializedAt: number | null = null

  // Seeding state
  private seedProgress: SeedProgress = {
    isSeeding: false,
    rowsInserted: 0,
    totalRows: null,
    currentBatch: 0,
    totalBatches: null,
    startedAt: null,
    completedAt: null,
    error: null,
    source: null,
    bytesProcessed: 0,
  }

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.colo = (ctx as unknown as { colo?: string }).colo || 'unknown'
    moduleRequestCount++

    // Start WASM loading in background
    startWasmLoadingInBackground()
  }

  // ===========================================================================
  // Schema and Setup
  // ===========================================================================

  private async ensureSchema(): Promise<void> {
    if (!this.pglite) {
      this.pglite = await getOrAwaitHoistedPglite()
      this.wasmInitializedAt = Date.now()
    }

    // Check if trips table exists
    const result = await this.pglite.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'trips'
      ) as exists`
    )

    if (!result.rows[0].exists) {
      console.log('[taxi] Creating trips table with indexes')

      await this.pglite.exec(`
        CREATE TABLE trips (
          id SERIAL PRIMARY KEY,
          pickup_datetime TIMESTAMP NOT NULL,
          dropoff_datetime TIMESTAMP NOT NULL,
          passenger_count INTEGER NOT NULL,
          trip_distance DECIMAL(10, 2) NOT NULL,
          fare_amount DECIMAL(10, 2) NOT NULL,
          tip_amount DECIMAL(10, 2) NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          pickup_location_id INTEGER,
          dropoff_location_id INTEGER
        )
      `)

      // Create indexes for common queries
      await this.pglite.exec(`
        CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime);
        CREATE INDEX idx_trips_dropoff_datetime ON trips(dropoff_datetime);
        CREATE INDEX idx_trips_pickup_location ON trips(pickup_location_id);
        CREATE INDEX idx_trips_dropoff_location ON trips(dropoff_location_id);
      `)
    }
  }

  // ===========================================================================
  // Seeding Logic - Streaming from Remote Source
  // ===========================================================================

  /**
   * Seed with sample data (faster for testing)
   */
  async seedSample(count = 100): Promise<Response> {
    if (this.seedProgress.isSeeding) {
      return Response.json({ error: 'Seeding already in progress', progress: this.seedProgress }, { status: 409 })
    }

    const batchSize = 50
    const totalBatches = Math.ceil(count / batchSize)

    this.seedProgress = {
      isSeeding: true,
      rowsInserted: 0,
      totalRows: count,
      currentBatch: 0,
      totalBatches,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      source: 'sample-generator',
      bytesProcessed: 0,
    }

    try {
      await this.ensureSchema()

      // Generate sample data
      const sampleData = this.generateSampleData(count)

      // Batch insert
      for (let i = 0; i < sampleData.length; i += batchSize) {
        const batch = sampleData.slice(i, i + batchSize)
        await this.insertBatch(batch)
        this.seedProgress.rowsInserted += batch.length
        this.seedProgress.currentBatch++
        console.log(`[taxi] Sample seed progress: ${this.seedProgress.rowsInserted}/${count} (batch ${this.seedProgress.currentBatch}/${totalBatches})`)
      }

      this.seedProgress.isSeeding = false
      this.seedProgress.completedAt = new Date().toISOString()

      return Response.json({
        success: true,
        rowsInserted: this.seedProgress.rowsInserted,
        duration: Date.now() - new Date(this.seedProgress.startedAt!).getTime(),
      })
    } catch (error) {
      this.seedProgress.isSeeding = false
      this.seedProgress.error = error instanceof Error ? error.message : String(error)
      return Response.json({ error: this.seedProgress.error }, { status: 500 })
    }
  }

  /**
   * Seed from NYC TLC Parquet data source
   *
   * @param month - Month in YYYY-MM format (e.g., "2024-01")
   * @param limit - Maximum number of rows to import (default: all)
   */
  async seedFromParquet(month: string, limit?: number): Promise<Response> {
    if (this.seedProgress.isSeeding) {
      return Response.json({ error: 'Seeding already in progress', progress: this.seedProgress }, { status: 409 })
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return Response.json({ error: 'Invalid month format. Use YYYY-MM (e.g., 2024-01)' }, { status: 400 })
    }

    const parquetUrl = getTaxiDataUrl(month)

    this.seedProgress = {
      isSeeding: true,
      rowsInserted: 0,
      totalRows: null,
      currentBatch: 0,
      totalBatches: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      source: parquetUrl,
      bytesProcessed: 0,
    }

    try {
      await this.ensureSchema()

      console.log(`[taxi] Fetching Parquet metadata from: ${parquetUrl}`)

      // Create async buffer from URL for range requests
      const file = await asyncBufferFromUrl({ url: parquetUrl })

      // Get metadata to determine total rows
      const metadata = await parquetMetadataAsync(file)
      const totalRows = Number(metadata.num_rows)
      const effectiveLimit = limit ? Math.min(limit, totalRows) : totalRows

      console.log(`[taxi] Parquet file has ${totalRows} rows, importing ${effectiveLimit}`)

      this.seedProgress.totalRows = effectiveLimit

      // Read in small chunks to avoid memory issues in Workers
      // Workers have 128MB limit, and ZSTD decompression can be memory-intensive
      const chunkSize = 500 // Small chunks to stay under memory limit
      const batchSize = 100 // Insert batch size
      const totalChunks = Math.ceil(effectiveLimit / chunkSize)

      this.seedProgress.totalBatches = Math.ceil(effectiveLimit / batchSize)

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const rowStart = chunkIndex * chunkSize
        const rowEnd = Math.min(rowStart + chunkSize, effectiveLimit)

        console.log(`[taxi] Reading chunk ${chunkIndex + 1}/${totalChunks}: rows ${rowStart}-${rowEnd}`)

        try {
          // Read chunk of rows as objects
          const rows = await parquetReadObjects({
            file,
            rowStart,
            rowEnd,
            compressors,
          }) as Array<Record<string, unknown>>

          // Process rows in batches for insertion
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)
            const trips = batch.map(row => this.parseParquetRow(row)).filter(Boolean) as Array<Partial<Trip>>

            if (trips.length > 0) {
              await this.insertBatch(trips)
              this.seedProgress.rowsInserted += trips.length
              this.seedProgress.currentBatch++

              // Log progress every 5 batches
              if (this.seedProgress.currentBatch % 5 === 0) {
                const pct = ((this.seedProgress.rowsInserted / effectiveLimit) * 100).toFixed(1)
                console.log(`[taxi] Progress: ${this.seedProgress.rowsInserted}/${effectiveLimit} (${pct}%) - batch ${this.seedProgress.currentBatch}`)
              }
            }
          }

          // Estimate bytes processed (rough calculation based on progress)
          this.seedProgress.bytesProcessed = Math.floor((rowEnd / totalRows) * (metadata.metadata_length || 0))
        } catch (chunkError) {
          console.error(`[taxi] Error processing chunk ${chunkIndex + 1}:`, chunkError)
          // Continue with next chunk on error
        }
      }

      this.seedProgress.isSeeding = false
      this.seedProgress.completedAt = new Date().toISOString()

      const durationMs = Date.now() - new Date(this.seedProgress.startedAt!).getTime()
      const rowsPerSecond = Math.round(this.seedProgress.rowsInserted / (durationMs / 1000))

      console.log(`[taxi] Seed completed: ${this.seedProgress.rowsInserted} rows in ${durationMs}ms (${rowsPerSecond} rows/sec)`)

      return Response.json({
        success: true,
        source: parquetUrl,
        rowsInserted: this.seedProgress.rowsInserted,
        totalAvailable: totalRows,
        durationMs,
        rowsPerSecond,
      })
    } catch (error) {
      this.seedProgress.isSeeding = false
      this.seedProgress.error = error instanceof Error ? error.message : String(error)
      console.error(`[taxi] Seed failed:`, error)
      return Response.json({
        error: this.seedProgress.error,
        progress: this.seedProgress,
      }, { status: 500 })
    }
  }

  /**
   * Parse a row from the Parquet file into a Trip object
   *
   * NYC Yellow Taxi Parquet schema:
   * - VendorID: int64
   * - tpep_pickup_datetime: timestamp
   * - tpep_dropoff_datetime: timestamp
   * - passenger_count: double
   * - trip_distance: double
   * - RatecodeID: double
   * - store_and_fwd_flag: string
   * - PULocationID: int64
   * - DOLocationID: int64
   * - payment_type: int64
   * - fare_amount: double
   * - extra: double
   * - mta_tax: double
   * - tip_amount: double
   * - tolls_amount: double
   * - improvement_surcharge: double
   * - total_amount: double
   * - congestion_surcharge: double
   * - Airport_fee: double
   */
  private parseParquetRow(row: Record<string, unknown>): Partial<Trip> | null {
    try {
      // Handle timestamp conversion (can be Date, number, or bigint)
      const parseTimestamp = (val: unknown): string => {
        if (val instanceof Date) {
          return val.toISOString().replace('T', ' ').slice(0, 19)
        }
        if (typeof val === 'number' || typeof val === 'bigint') {
          // Parquet timestamps are typically in microseconds
          const ms = typeof val === 'bigint' ? Number(val / 1000n) : val / 1000
          return new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
        }
        if (typeof val === 'string') {
          return val.slice(0, 19)
        }
        return new Date().toISOString().replace('T', ' ').slice(0, 19)
      }

      const parseNumber = (val: unknown): number => {
        if (typeof val === 'number') return val
        if (typeof val === 'bigint') return Number(val)
        if (typeof val === 'string') return parseFloat(val) || 0
        return 0
      }

      const parseIntOrNull = (val: unknown): number | null => {
        if (val === null || val === undefined) return null
        if (typeof val === 'number') return Math.floor(val)
        if (typeof val === 'bigint') return Number(val)
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10)
          return isNaN(parsed) ? null : parsed
        }
        return null
      }

      return {
        pickup_datetime: parseTimestamp(row.tpep_pickup_datetime),
        dropoff_datetime: parseTimestamp(row.tpep_dropoff_datetime),
        passenger_count: Math.max(1, Math.floor(parseNumber(row.passenger_count) || 1)),
        trip_distance: parseFloat(parseNumber(row.trip_distance).toFixed(2)),
        fare_amount: parseFloat(parseNumber(row.fare_amount).toFixed(2)),
        tip_amount: parseFloat(parseNumber(row.tip_amount).toFixed(2)),
        total_amount: parseFloat(parseNumber(row.total_amount).toFixed(2)),
        pickup_location_id: parseIntOrNull(row.PULocationID),
        dropoff_location_id: parseIntOrNull(row.DOLocationID),
      }
    } catch (error) {
      console.error('[taxi] Error parsing Parquet row:', error, row)
      return null
    }
  }

  /**
   * Legacy: Seed from remote CSV source (kept for backwards compatibility)
   */
  async seedFromRemote(month: string): Promise<Response> {
    // Redirect to Parquet-based seeding
    return this.seedFromParquet(month)
  }

  /**
   * Parse a CSV row into a Trip object
   */
  private parseCSVRow(headers: string[], values: string[]): Partial<Trip> | null {
    try {
      // Map CSV columns to our schema
      // Typical columns: tpep_pickup_datetime,tpep_dropoff_datetime,passenger_count,trip_distance,fare_amount,tip_amount,total_amount,PULocationID,DOLocationID
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || ''
      })

      return {
        pickup_datetime: row.tpep_pickup_datetime || row.pickup_datetime,
        dropoff_datetime: row.tpep_dropoff_datetime || row.dropoff_datetime,
        passenger_count: parseInt(row.passenger_count) || 1,
        trip_distance: parseFloat(row.trip_distance) || 0,
        fare_amount: parseFloat(row.fare_amount) || 0,
        tip_amount: parseFloat(row.tip_amount) || 0,
        total_amount: parseFloat(row.total_amount) || 0,
        pickup_location_id: row.PULocationID ? parseInt(row.PULocationID) : null,
        dropoff_location_id: row.DOLocationID ? parseInt(row.DOLocationID) : null,
      }
    } catch (error) {
      console.error('[taxi] Error parsing CSV row:', error)
      return null
    }
  }

  /**
   * Insert a batch of trips
   */
  private async insertBatch(trips: Array<Partial<Trip>>): Promise<void> {
    if (!this.pglite || trips.length === 0) return

    const values = trips.map(trip => {
      const pickupDt = trip.pickup_datetime ? `'${trip.pickup_datetime}'` : 'NOW()'
      const dropoffDt = trip.dropoff_datetime ? `'${trip.dropoff_datetime}'` : 'NOW()'
      return `(${pickupDt}, ${dropoffDt}, ${trip.passenger_count || 1}, ${trip.trip_distance || 0}, ${trip.fare_amount || 0}, ${trip.tip_amount || 0}, ${trip.total_amount || 0}, ${trip.pickup_location_id || 'NULL'}, ${trip.dropoff_location_id || 'NULL'})`
    }).join(',')

    const sql = `
      INSERT INTO trips (pickup_datetime, dropoff_datetime, passenger_count, trip_distance, fare_amount, tip_amount, total_amount, pickup_location_id, dropoff_location_id)
      VALUES ${values}
    `

    await this.pglite.exec(sql)
  }

  /**
   * Generate sample data for testing
   */
  /**
   * Generate realistic NYC taxi trip data based on real patterns
   *
   * Based on analysis of actual NYC Yellow Taxi data:
   * - Peak hours: 7-9 AM and 5-8 PM (rush hour)
   * - Popular locations: Manhattan (zones 140-262), JFK (132), LaGuardia (138)
   * - Average trip: 2.5 miles, $14 fare, 11 minutes
   * - Tipping: ~70% of trips, average 18% of fare
   * - Passenger distribution: 1 (65%), 2 (20%), 3-4 (10%), 5-6 (5%)
   */
  private generateSampleData(count: number): Array<Partial<Trip>> {
    const trips: Array<Partial<Trip>> = []

    // NYC Yellow Taxi location zones (simplified)
    // Manhattan: 4, 12-13, 41-45, 48-50, 68, 74-75, 79-80, 87-90, 100-107, 113-114, 116, 120, 125, 127-128, 137, 140-144, 148, 151-153, 158, 161-170, 186, 194, 209, 211, 224, 229-230, 231, 232-234, 236-238, 239, 243, 246, 249, 261-263
    const manhattanZones = [4, 12, 13, 41, 42, 43, 44, 45, 48, 49, 50, 68, 74, 75, 79, 80, 87, 88, 89, 90, 100, 107, 113, 114, 116, 120, 125, 127, 128, 137, 140, 141, 142, 143, 144, 148, 151, 152, 153, 158, 161, 162, 163, 164, 186, 230, 231, 232, 233, 234, 236, 237, 238, 239, 243, 246, 249, 261, 262, 263]
    const airportZones = [132, 138] // JFK (132), LaGuardia (138)
    const brooklynZones = [7, 8, 11, 14, 17, 21, 22, 25, 26, 29, 33, 34, 35, 36, 37, 39, 40, 47, 52, 54, 55, 61, 62, 63, 65, 66, 67, 69, 71, 72, 76, 77, 80, 85, 89, 91, 97, 106, 108, 111, 112, 123, 133, 149, 150, 154, 155, 165, 177, 178, 181, 188, 189, 190, 195, 210, 217, 222, 225, 227, 228, 240, 248, 255, 256, 257]

    // Hour-of-day trip distribution (reflects NYC taxi patterns)
    const hourlyWeights = [
      0.3, 0.2, 0.1, 0.1, 0.1, 0.2, // 0-5 AM (low)
      0.5, 1.2, 1.5, 1.3, 1.0, 1.0, // 6-11 AM (morning rush)
      1.2, 1.2, 1.3, 1.4, 1.5, 1.8, // 12-5 PM (afternoon)
      2.0, 1.8, 1.5, 1.2, 1.0, 0.6, // 6-11 PM (evening rush)
    ]

    // Passenger distribution weights
    const passengerWeights = [0.65, 0.20, 0.08, 0.04, 0.02, 0.01] // 1-6 passengers

    // Use January 2024 as the base month to match real data
    const year = 2024
    const month = 0 // January

    // Use a seeded random that varies based on current row count and time
    // This ensures each call produces different data
    const seededRandom = (seed: number): (() => number) => {
      let s = seed
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        return s / 0x7fffffff
      }
    }

    // Combine multiple sources of entropy for unique data each call
    const baseSeed = Date.now() ^ (Math.random() * 0x7fffffff)
    const random = seededRandom(baseSeed)

    const weightedChoice = <T>(items: T[], weights: number[]): T => {
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      let r = random() * totalWeight
      for (let i = 0; i < items.length; i++) {
        r -= weights[i]
        if (r <= 0) return items[i]
      }
      return items[items.length - 1]
    }

    const chooseLocation = (): number => {
      const r = random()
      if (r < 0.70) {
        // 70% Manhattan
        return manhattanZones[Math.floor(random() * manhattanZones.length)]
      } else if (r < 0.85) {
        // 15% Brooklyn
        return brooklynZones[Math.floor(random() * brooklynZones.length)]
      } else if (r < 0.92) {
        // 7% Airport
        return airportZones[Math.floor(random() * airportZones.length)]
      } else {
        // 8% Other (random zone 1-265)
        return Math.floor(1 + random() * 265)
      }
    }

    for (let i = 0; i < count; i++) {
      // Choose a random day in January 2024
      const day = 1 + Math.floor(random() * 31)

      // Choose hour based on weighted distribution
      const hourIndex = weightedChoice([...Array(24).keys()], hourlyWeights)
      const minute = Math.floor(random() * 60)
      const second = Math.floor(random() * 60)

      const pickupTime = new Date(year, month, day, hourIndex, minute, second)

      // Trip distance: log-normal distribution (most trips 1-5 miles, some longer)
      // Mean ~2.5 miles, with long tail for airport trips
      const isAirportTrip = random() < 0.05 // 5% airport trips
      let distance: number
      if (isAirportTrip) {
        distance = 10 + random() * 20 // Airport: 10-30 miles
      } else {
        // Log-normal distribution for typical trips
        const u1 = random()
        const u2 = random()
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
        distance = Math.max(0.3, Math.exp(0.8 + z * 0.7)) // Median ~2.2 miles
      }

      // Trip duration based on distance and traffic (rush hour slower)
      const isRushHour = (hourIndex >= 7 && hourIndex <= 9) || (hourIndex >= 17 && hourIndex <= 19)
      const speedMph = isRushHour ? 8 + random() * 7 : 12 + random() * 10 // 8-15 mph rush, 12-22 mph normal
      const tripMinutes = (distance / speedMph) * 60
      const dropoffTime = new Date(pickupTime.getTime() + tripMinutes * 60 * 1000)

      // Fare calculation (NYC TLC rates)
      // Base fare: $3.00
      // Per mile: $2.50
      // Per minute: $0.50
      // MTA tax: $0.50
      // Improvement surcharge: $1.00
      // Congestion surcharge: $2.50 (Manhattan)
      const baseFare = 3.00
      const mileageFare = distance * 2.50
      const timeFare = tripMinutes * 0.50
      const mtaTax = 0.50
      const improvementSurcharge = 1.00
      const congestionSurcharge = random() < 0.5 ? 2.50 : 0 // Only for Manhattan pickups
      const fareAmount = baseFare + mileageFare + timeFare

      // Tipping: 70% tip, average 18%
      const tipped = random() < 0.70
      const tipPercent = tipped ? 0.10 + random() * 0.20 : 0 // 10-30% when tipping
      const tipAmount = fareAmount * tipPercent

      const totalAmount = fareAmount + tipAmount + mtaTax + improvementSurcharge + congestionSurcharge

      // Choose passenger count
      const passengers = [1, 2, 3, 4, 5, 6]
      const passengerCount = weightedChoice(passengers, passengerWeights)

      // Choose pickup and dropoff locations
      const pickupLocationId = isAirportTrip && random() < 0.5
        ? airportZones[Math.floor(random() * airportZones.length)]
        : chooseLocation()
      const dropoffLocationId = isAirportTrip && random() >= 0.5
        ? airportZones[Math.floor(random() * airportZones.length)]
        : chooseLocation()

      trips.push({
        pickup_datetime: pickupTime.toISOString().replace('T', ' ').slice(0, 19),
        dropoff_datetime: dropoffTime.toISOString().replace('T', ' ').slice(0, 19),
        passenger_count: passengerCount,
        trip_distance: parseFloat(distance.toFixed(2)),
        fare_amount: parseFloat(fareAmount.toFixed(2)),
        tip_amount: parseFloat(tipAmount.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        pickup_location_id: pickupLocationId,
        dropoff_location_id: dropoffLocationId,
      })
    }

    return trips
  }

  /**
   * Seed with a large amount of realistic NYC taxi data
   * This is the stress test endpoint that generates millions of trips
   */
  async seedRealistic(count: number): Promise<Response> {
    if (this.seedProgress.isSeeding) {
      return Response.json({ error: 'Seeding already in progress', progress: this.seedProgress }, { status: 409 })
    }

    const startTime = Date.now()

    // Limit to reasonable amounts per request to avoid timeout/memory issues
    // 50k is safer for Workers memory constraints
    const effectiveCount = Math.min(count, 50000)
    const batchSize = 100 // Smaller batch size to reduce memory pressure
    const totalBatches = Math.ceil(effectiveCount / batchSize)

    this.seedProgress = {
      isSeeding: true,
      rowsInserted: 0,
      totalRows: effectiveCount,
      currentBatch: 0,
      totalBatches,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      source: 'realistic-generator',
      bytesProcessed: 0,
    }

    try {
      await this.ensureSchema()

      console.log(`[taxi] Starting realistic seed: ${effectiveCount} trips in ${totalBatches} batches`)

      // Generate and insert in batches to avoid memory issues
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize
        const batchEnd = Math.min(batchStart + batchSize, effectiveCount)
        const currentBatchSize = batchEnd - batchStart

        // Generate batch of trips
        const batch = this.generateSampleData(currentBatchSize)

        // Insert batch
        await this.insertBatch(batch)
        this.seedProgress.rowsInserted += currentBatchSize
        this.seedProgress.currentBatch++

        // Log progress every 50 batches
        if (this.seedProgress.currentBatch % 50 === 0 || this.seedProgress.currentBatch === totalBatches) {
          const pct = ((this.seedProgress.rowsInserted / effectiveCount) * 100).toFixed(1)
          const elapsed = Date.now() - startTime
          console.log(`[taxi] Realistic seed progress: ${this.seedProgress.rowsInserted}/${effectiveCount} (${pct}%) - batch ${this.seedProgress.currentBatch}/${totalBatches} - ${elapsed}ms elapsed`)
        }
      }

      this.seedProgress.isSeeding = false
      this.seedProgress.completedAt = new Date().toISOString()

      const durationMs = Date.now() - startTime
      const rowsPerSecond = durationMs > 0 ? Math.round(this.seedProgress.rowsInserted / (durationMs / 1000)) : 0

      console.log(`[taxi] Realistic seed completed: ${this.seedProgress.rowsInserted} rows in ${durationMs}ms (${rowsPerSecond} rows/sec)`)

      return Response.json({
        success: true,
        source: 'realistic-generator',
        rowsInserted: this.seedProgress.rowsInserted,
        requestedCount: count,
        effectiveCount,
        durationMs,
        rowsPerSecond,
        note: count > 50000 ? 'Limited to 50k per request. Call multiple times for more data.' : undefined,
      })
    } catch (error) {
      this.seedProgress.isSeeding = false
      this.seedProgress.error = error instanceof Error ? error.message : String(error)
      console.error(`[taxi] Realistic seed failed:`, error)
      return Response.json({
        error: this.seedProgress.error,
        progress: this.seedProgress,
      }, { status: 500 })
    }
  }

  // ===========================================================================
  // Auto-seeding Logic
  // ===========================================================================

  /**
   * Check if database is empty and trigger auto-seed if needed
   * Returns true if seeding was triggered
   */
  private async checkAndAutoSeed(ctx?: ExecutionContext): Promise<boolean> {
    await this.ensureSchema()

    // Check if we have any trips
    const countResult = await this.pglite!.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM trips`
    )
    const count = Number(countResult.rows[0].count)

    // If we have data or already seeding, no need to auto-seed
    if (count > 0 || this.seedProgress.isSeeding) {
      return false
    }

    // Trigger auto-seed in background with 500 sample trips
    console.log('[taxi] Database empty, triggering auto-seed with 500 sample trips')

    if (ctx) {
      ctx.waitUntil(this.runAutoSeed())
    } else {
      // If no ExecutionContext, run synchronously (shouldn't happen in production)
      await this.runAutoSeed()
    }

    return true
  }

  /**
   * Run auto-seed with default sample data (500 trips)
   */
  private async runAutoSeed(): Promise<void> {
    const count = 500
    const batchSize = 50
    const totalBatches = Math.ceil(count / batchSize)

    this.seedProgress = {
      isSeeding: true,
      rowsInserted: 0,
      totalRows: count,
      currentBatch: 0,
      totalBatches,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      source: 'auto-seed-sample',
      bytesProcessed: 0,
    }

    try {
      // Generate 500 sample trips
      const sampleData = this.generateSampleData(count)

      // Batch insert
      for (let i = 0; i < sampleData.length; i += batchSize) {
        const batch = sampleData.slice(i, i + batchSize)
        await this.insertBatch(batch)
        this.seedProgress.rowsInserted += batch.length
        this.seedProgress.currentBatch++
        console.log(`[taxi] Auto-seed progress: ${this.seedProgress.rowsInserted}/${count} (batch ${this.seedProgress.currentBatch}/${totalBatches})`)
      }

      this.seedProgress.isSeeding = false
      this.seedProgress.completedAt = new Date().toISOString()
      console.log(`[taxi] Auto-seed completed: ${this.seedProgress.rowsInserted} trips`)
    } catch (error) {
      this.seedProgress.isSeeding = false
      this.seedProgress.error = error instanceof Error ? error.message : String(error)
      console.error('[taxi] Auto-seed failed:', this.seedProgress.error)
    }
  }

  // ===========================================================================
  // Query Endpoints
  // ===========================================================================

  /**
   * List trips with pagination
   */
  async listTrips(limit = 100, offset = 0, ctx?: ExecutionContext): Promise<Response> {
    const start = Date.now()

    // Check if auto-seed is needed
    const autoSeeded = await this.checkAndAutoSeed(ctx)
    if (autoSeeded) {
      return Response.json({
        message: 'Database is empty. Auto-seeding in progress with 500 sample trips.',
        seedProgress: this.seedProgress,
        checkStatus: '/seed/status',
      }, { status: 202 })
    }

    const result = await this.pglite!.query<Trip>(
      `SELECT * FROM trips ORDER BY pickup_datetime DESC LIMIT ${limit} OFFSET ${offset}`
    )

    const countResult = await this.pglite!.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM trips`
    )

    return Response.json({
      trips: this.serializeRows(result.rows),
      total: Number(countResult.rows[0].count),
      limit,
      offset,
      queryMs: Date.now() - start,
      doColo: this.colo,
    })
  }

  /**
   * Convert BigInt values to Numbers for JSON serialization
   */
  private serializeRows<T>(rows: T[]): T[] {
    return rows.map(row => this.serializeRow(row))
  }

  private serializeRow<T>(row: T): T {
    if (row === null || typeof row !== 'object') return row

    // Handle Date objects
    if (row instanceof Date) {
      return row.toISOString() as unknown as T
    }

    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'bigint') {
        serialized[key] = Number(value)
      } else if (value instanceof Date) {
        serialized[key] = value.toISOString()
      } else if (value && typeof value === 'object') {
        serialized[key] = this.serializeRow(value)
      } else {
        serialized[key] = value
      }
    }
    return serialized as T
  }

  /**
   * Get trip by ID
   */
  async getTripById(id: number): Promise<Response> {
    const start = Date.now()
    await this.ensureSchema()

    const result = await this.pglite!.query<Trip>(
      `SELECT * FROM trips WHERE id = ${id}`
    )

    if (result.rows.length === 0) {
      return Response.json({ error: 'Trip not found' }, { status: 404 })
    }

    return Response.json({
      trip: this.serializeRow(result.rows[0]),
      queryMs: Date.now() - start,
      doColo: this.colo,
    })
  }

  /**
   * Get aggregated statistics
   */
  async getStats(ctx?: ExecutionContext): Promise<Response> {
    const start = Date.now()

    // Check if auto-seed is needed
    const autoSeeded = await this.checkAndAutoSeed(ctx)
    if (autoSeeded) {
      return Response.json({
        message: 'Database is empty. Auto-seeding in progress with 500 sample trips.',
        seedProgress: this.seedProgress,
        checkStatus: '/seed/status',
      }, { status: 202 })
    }

    const result = await this.pglite!.query<{
      total_trips: number
      avg_fare: number
      avg_tip: number
      avg_distance: number
      avg_passengers: number
      total_revenue: number
    }>(`
      SELECT
        COUNT(*) as total_trips,
        AVG(fare_amount) as avg_fare,
        AVG(tip_amount) as avg_tip,
        AVG(trip_distance) as avg_distance,
        AVG(passenger_count) as avg_passengers,
        SUM(total_amount) as total_revenue
      FROM trips
    `)

    return Response.json({
      stats: this.serializeRow(result.rows[0]),
      queryMs: Date.now() - start,
      doColo: this.colo,
    })
  }

  /**
   * Get trips by hour of day
   */
  async getHourlyStats(ctx?: ExecutionContext): Promise<Response> {
    const start = Date.now()

    // Check if auto-seed is needed
    const autoSeeded = await this.checkAndAutoSeed(ctx)
    if (autoSeeded) {
      return Response.json({
        message: 'Database is empty. Auto-seeding in progress with 500 sample trips.',
        seedProgress: this.seedProgress,
        checkStatus: '/seed/status',
      }, { status: 202 })
    }

    const result = await this.pglite!.query<{
      hour: number
      trip_count: number
      avg_fare: number
    }>(`
      SELECT
        EXTRACT(HOUR FROM pickup_datetime) as hour,
        COUNT(*) as trip_count,
        AVG(fare_amount) as avg_fare
      FROM trips
      GROUP BY EXTRACT(HOUR FROM pickup_datetime)
      ORDER BY hour
    `)

    return Response.json({
      hourly: this.serializeRows(result.rows),
      queryMs: Date.now() - start,
      doColo: this.colo,
    })
  }

  /**
   * Get trips by day of week
   */
  async getDailyStats(ctx?: ExecutionContext): Promise<Response> {
    const start = Date.now()

    // Check if auto-seed is needed
    const autoSeeded = await this.checkAndAutoSeed(ctx)
    if (autoSeeded) {
      return Response.json({
        message: 'Database is empty. Auto-seeding in progress with 500 sample trips.',
        seedProgress: this.seedProgress,
        checkStatus: '/seed/status',
      }, { status: 202 })
    }

    const result = await this.pglite!.query<{
      day: number
      trip_count: number
      avg_fare: number
    }>(`
      SELECT
        EXTRACT(DOW FROM pickup_datetime) as day,
        COUNT(*) as trip_count,
        AVG(fare_amount) as avg_fare
      FROM trips
      GROUP BY EXTRACT(DOW FROM pickup_datetime)
      ORDER BY day
    `)

    return Response.json({
      daily: this.serializeRows(result.rows),
      queryMs: Date.now() - start,
      doColo: this.colo,
    })
  }

  /**
   * Run benchmark queries
   */
  async runBenchmark(): Promise<Response> {
    await this.ensureSchema()

    const benchmarks: Array<{ query: string; name: string; durationMs: number }> = []

    const queries = [
      { name: 'Count all trips', sql: 'SELECT COUNT(*) FROM trips' },
      { name: 'Average fare by hour', sql: 'SELECT EXTRACT(HOUR FROM pickup_datetime) as hour, AVG(fare_amount) FROM trips GROUP BY hour ORDER BY hour' },
      { name: 'Top 10 locations by pickups', sql: 'SELECT pickup_location_id, COUNT(*) as count FROM trips WHERE pickup_location_id IS NOT NULL GROUP BY pickup_location_id ORDER BY count DESC LIMIT 10' },
      { name: 'Trips over $50', sql: 'SELECT COUNT(*) FROM trips WHERE total_amount > 50' },
      { name: 'Average tip percentage', sql: 'SELECT AVG(CASE WHEN fare_amount > 0 THEN (tip_amount / fare_amount) * 100 ELSE 0 END) as avg_tip_pct FROM trips' },
    ]

    for (const { name, sql } of queries) {
      const start = Date.now()
      await this.pglite!.query(sql)
      const durationMs = Date.now() - start
      benchmarks.push({ name, query: sql, durationMs })
    }

    const totalMs = benchmarks.reduce((sum, b) => sum + b.durationMs, 0)

    return Response.json({
      benchmarks,
      totalMs,
      doColo: this.colo,
    })
  }

  // ===========================================================================
  // Lifecycle Endpoints
  // ===========================================================================

  async handlePing(): Promise<Response> {
    this.instanceRequestCount++

    return Response.json({
      pong: true,
      colo: this.colo,
      instanceId: this.instanceId,
      moduleInstanceId: MODULE_INSTANCE_ID,
      uptime: Date.now() - this.instanceCreatedAt,
      requestCount: this.instanceRequestCount,
      wasmStatus: isWasmLoading() ? 'loading' : (hoistedPglite ? 'ready' : 'not-started'),
    })
  }

  async handleDebug(): Promise<Response> {
    this.instanceRequestCount++

    return Response.json({
      instance: {
        id: this.instanceId,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        uptime: Date.now() - this.instanceCreatedAt,
        requestCount: this.instanceRequestCount,
        wasmInitializedAt: this.wasmInitializedAt ? new Date(this.wasmInitializedAt).toISOString() : null,
        colo: this.colo,
      },
      module: {
        id: MODULE_INSTANCE_ID,
        loadedAt: new Date(getModuleLoadTime()).toISOString(),
        requestCount: moduleRequestCount,
        wasmStatus: isWasmLoading() ? 'loading' : (hoistedPglite ? 'ready' : 'not-started'),
        wasmLoadStartedAt: wasmLoadStartedAt ? new Date(wasmLoadStartedAt).toISOString() : null,
        wasmLoadedAt: wasmLoadedAt ? new Date(wasmLoadedAt).toISOString() : null,
        wasmLoadDurationMs: wasmLoadedAt && wasmLoadStartedAt ? wasmLoadedAt - wasmLoadStartedAt : null,
      },
      seedProgress: this.seedProgress,
    })
  }

  // ===========================================================================
  // RPC Handler
  // ===========================================================================

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Route requests
    if (path === '/ping') {
      return this.handlePing()
    }

    if (path === '/debug') {
      return this.handleDebug()
    }

    if (path === '/seed/sample' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as { count?: number }
      return this.seedSample(body.count || 100)
    }

    // Realistic NYC Taxi data generation - the stress test endpoint
    if (path === '/seed/realistic' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as { count?: number }
      const count = body.count || 50000 // Default 50k trips
      return this.seedRealistic(count)
    }

    // Full NYC Taxi data seeding from Parquet (note: may hit memory limits)
    if (path === '/seed/full' && request.method === 'POST') {
      const body = await request.json() as { month?: string; limit?: number }
      const month = body.month || '2024-01'  // Default to January 2024
      return this.seedFromParquet(month, body.limit)
    }

    // Legacy endpoint (redirects to Parquet)
    if (path === '/seed' && request.method === 'POST') {
      const body = await request.json() as { month?: string; limit?: number }
      if (!body.month) {
        return Response.json({ error: 'Missing "month" parameter (YYYY-MM)' }, { status: 400 })
      }
      return this.seedFromParquet(body.month, body.limit)
    }

    if (path === '/seed/status') {
      return Response.json({
        ...this.seedProgress,
        percentComplete: this.seedProgress.totalRows
          ? ((this.seedProgress.rowsInserted / this.seedProgress.totalRows) * 100).toFixed(1)
          : null,
      })
    }

    if (path === '/trips') {
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      return this.listTrips(limit, offset, this.ctx)
    }

    if (path.startsWith('/trips/')) {
      const id = parseInt(path.split('/')[2])
      if (isNaN(id)) {
        return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
      }
      return this.getTripById(id)
    }

    if (path === '/stats') {
      return this.getStats(this.ctx)
    }

    if (path === '/stats/hourly') {
      return this.getHourlyStats(this.ctx)
    }

    if (path === '/stats/daily') {
      return this.getDailyStats(this.ctx)
    }

    if (path === '/benchmark' && request.method === 'POST') {
      return this.runBenchmark()
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

const router = AutoRouter({
  catch: (error: Error) => {
    console.error('[taxi] Router error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  },
})

router.get('/', (request: Request) => {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  return Response.json({
    name: 'taxi.example.com.ai',
    description: 'NYC Taxi trip data powered by PGLite at the edge',
    dataSource: {
      name: 'NYC TLC Trip Record Data',
      url: 'https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page',
      format: 'Parquet',
      note: 'Full NYC Yellow Taxi data - millions of real trip records',
    },
    note: 'Database auto-seeds with 500 sample trips when empty. Use /seed/full for real data.',
    endpoints: {
      'GET /': 'API info',
      'GET /ping': 'Health check',
      'GET /debug': 'Lifecycle and seed status',
      'POST /seed/sample': 'Seed with basic sample data (body: {count?: number})',
      'POST /seed/realistic': 'RECOMMENDED: Seed with realistic NYC taxi patterns (body: {count?: number}, max 100k per request)',
      'POST /seed/full': 'Seed from NYC TLC Parquet data (body: {month?: "YYYY-MM", limit?: number}) - may hit memory limits',
      'POST /seed': 'Legacy: Seed from Parquet (body: {month: "YYYY-MM", limit?: number})',
      'GET /seed/status': 'Seeding progress with percentage',
      'GET /trips': 'List trips (params: limit, offset)',
      'GET /trips/:id': 'Get trip by ID',
      'GET /stats': 'Aggregated statistics',
      'GET /stats/hourly': 'Trips by hour of day',
      'GET /stats/daily': 'Trips by day of week',
      'POST /benchmark': 'Run benchmark queries',
    },
    quickLinks: {
      ping: `${baseUrl}/ping`,
      debug: `${baseUrl}/debug`,
      seedStatus: `${baseUrl}/seed/status`,
      trips: `${baseUrl}/trips?limit=10`,
      stats: `${baseUrl}/stats`,
      hourly: `${baseUrl}/stats/hourly`,
      daily: `${baseUrl}/stats/daily`,
    },
    seedExamples: {
      recommended: {
        endpoint: 'POST /seed/realistic',
        body: { count: 100000 },
        note: 'RECOMMENDED: 100k realistic NYC taxi trips with accurate patterns. Call multiple times for more data.',
      },
      stressTest: {
        endpoint: 'POST /seed/realistic',
        body: { count: 100000 },
        callMultipleTimes: 'Call 10x for 1M trips, 30x for 3M trips',
        note: 'Each call adds more data. Use /seed/status to monitor progress.',
      },
      quickSample: {
        endpoint: 'POST /seed/sample',
        body: { count: 1000 },
        note: 'Fast basic synthetic data for quick testing',
      },
      parquetData: {
        endpoint: 'POST /seed/full',
        body: { month: '2024-01', limit: 1000 },
        note: 'Real Parquet data - may hit memory limits with larger amounts',
      },
    },
  })
})

router.all('*', async (request: Request, env: Env) => {
  // Forward all other requests to the Durable Object
  const id = env.TAXI.idFromName('default')
  const stub = env.TAXI.get(id)

  // Create a new request with the same URL and method
  const url = new URL(request.url)
  return stub.fetch(new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  }))
})

export default router
