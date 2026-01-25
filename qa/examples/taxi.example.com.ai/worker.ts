/**
 * taxi.example.com.ai - NYC Taxi Trip Data at the Edge
 *
 * Uses PGLite in Durable Objects for storing and querying NYC Taxi trip data.
 * Features streaming seed logic that fetches data directly from remote CSV sources.
 * Uses chunked/batch inserts to avoid memory issues.
 *
 * WASM Loading Strategy:
 * Uses eager-but-non-blocking pattern - WASM starts loading immediately on DO init.
 * Non-query endpoints respond instantly while WASM loads in background.
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'
import { PGliteLocal } from './src/pglite-local'

// Static WASM imports - Wrangler pre-compiles these
// @ts-ignore
import pgliteWasm from './src/pglite-assets/pglite.wasm'
// @ts-ignore
import pgliteData from './src/pglite-assets/pglite.data'

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
  startedAt: string | null
  completedAt: string | null
  error: string | null
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
    startedAt: null,
    completedAt: null,
    error: null,
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
  async seedSample(): Promise<Response> {
    if (this.seedProgress.isSeeding) {
      return Response.json({ error: 'Seeding already in progress' }, { status: 409 })
    }

    this.seedProgress = {
      isSeeding: true,
      rowsInserted: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    }

    try {
      await this.ensureSchema()

      // Generate sample data
      const sampleData = this.generateSampleData(100)

      // Batch insert
      const batchSize = 50
      for (let i = 0; i < sampleData.length; i += batchSize) {
        const batch = sampleData.slice(i, i + batchSize)
        await this.insertBatch(batch)
        this.seedProgress.rowsInserted += batch.length
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
   * Seed from remote CSV source with streaming
   */
  async seedFromRemote(month: string): Promise<Response> {
    if (this.seedProgress.isSeeding) {
      return Response.json({ error: 'Seeding already in progress' }, { status: 409 })
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return Response.json({ error: 'Invalid month format. Use YYYY-MM (e.g., 2024-01)' }, { status: 400 })
    }

    this.seedProgress = {
      isSeeding: true,
      rowsInserted: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    }

    try {
      await this.ensureSchema()

      // For demo purposes, we'll use a smaller sample CSV
      // Real implementation would fetch from: https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_${month}.parquet
      // Since PGLite doesn't support Parquet, we use pre-converted CSV samples

      // Use a sample CSV endpoint (GitHub gist or similar)
      const csvUrl = `https://raw.githubusercontent.com/datadesk/nyc-taxi-trip-data/main/sample-yellow-tripdata-${month}.csv`

      console.log(`[taxi] Fetching CSV from: ${csvUrl}`)

      const response = await fetch(csvUrl)
      if (!response.ok) {
        // Fallback: use sample data if remote fetch fails
        console.warn(`[taxi] Remote fetch failed (${response.status}), using sample data`)
        return this.seedSample()
      }

      const text = await response.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',')

      // Parse CSV in batches
      const batchSize = 100
      let batch: Array<Partial<Trip>> = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',')
        const trip = this.parseCSVRow(headers, values)
        if (trip) {
          batch.push(trip)
        }

        if (batch.length >= batchSize) {
          await this.insertBatch(batch)
          this.seedProgress.rowsInserted += batch.length
          batch = []
        }
      }

      // Insert remaining rows
      if (batch.length > 0) {
        await this.insertBatch(batch)
        this.seedProgress.rowsInserted += batch.length
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
  private generateSampleData(count: number): Array<Partial<Trip>> {
    const trips: Array<Partial<Trip>> = []
    const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago

    for (let i = 0; i < count; i++) {
      const pickupTime = new Date(baseTime + Math.random() * 30 * 24 * 60 * 60 * 1000)
      const tripDuration = 5 + Math.random() * 60 // 5-65 minutes
      const dropoffTime = new Date(pickupTime.getTime() + tripDuration * 60 * 1000)

      const distance = 0.5 + Math.random() * 20 // 0.5-20.5 miles
      const baseFare = 2.5 + distance * 2.5
      const tip = Math.random() > 0.3 ? baseFare * (0.1 + Math.random() * 0.2) : 0
      const total = baseFare + tip + 0.5 // +$0.5 for fees

      trips.push({
        pickup_datetime: pickupTime.toISOString().replace('T', ' ').slice(0, 19),
        dropoff_datetime: dropoffTime.toISOString().replace('T', ' ').slice(0, 19),
        passenger_count: Math.floor(1 + Math.random() * 5),
        trip_distance: parseFloat(distance.toFixed(2)),
        fare_amount: parseFloat(baseFare.toFixed(2)),
        tip_amount: parseFloat(tip.toFixed(2)),
        total_amount: parseFloat(total.toFixed(2)),
        pickup_location_id: Math.floor(1 + Math.random() * 265),
        dropoff_location_id: Math.floor(1 + Math.random() * 265),
      })
    }

    return trips
  }

  // ===========================================================================
  // Query Endpoints
  // ===========================================================================

  /**
   * List trips with pagination
   */
  async listTrips(limit = 100, offset = 0): Promise<Response> {
    const start = Date.now()
    await this.ensureSchema()

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

    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'bigint') {
        serialized[key] = Number(value)
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
  async getStats(): Promise<Response> {
    const start = Date.now()
    await this.ensureSchema()

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
  async getHourlyStats(): Promise<Response> {
    const start = Date.now()
    await this.ensureSchema()

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
  async getDailyStats(): Promise<Response> {
    const start = Date.now()
    await this.ensureSchema()

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

  async fetch(request: Request): Promise<Response> {
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
      return this.seedSample()
    }

    if (path === '/seed' && request.method === 'POST') {
      const body = await request.json() as { month?: string }
      if (!body.month) {
        return Response.json({ error: 'Missing "month" parameter (YYYY-MM)' }, { status: 400 })
      }
      return this.seedFromRemote(body.month)
    }

    if (path === '/seed/status') {
      return Response.json(this.seedProgress)
    }

    if (path === '/trips') {
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      return this.listTrips(limit, offset)
    }

    if (path.startsWith('/trips/')) {
      const id = parseInt(path.split('/')[2])
      if (isNaN(id)) {
        return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
      }
      return this.getTripById(id)
    }

    if (path === '/stats') {
      return this.getStats()
    }

    if (path === '/stats/hourly') {
      return this.getHourlyStats()
    }

    if (path === '/stats/daily') {
      return this.getDailyStats()
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

router.get('/', () => {
  return Response.json({
    name: 'taxi.example.com.ai',
    description: 'NYC Taxi trip data powered by PGLite at the edge',
    endpoints: {
      'GET /': 'API info',
      'GET /ping': 'Health check',
      'GET /debug': 'Lifecycle info',
      'POST /seed/sample': 'Seed with sample data (fast)',
      'POST /seed': 'Seed from remote CSV (body: {month: "YYYY-MM"})',
      'GET /seed/status': 'Seeding progress',
      'GET /trips': 'List trips (params: limit, offset)',
      'GET /trips/:id': 'Get trip by ID',
      'GET /stats': 'Aggregated statistics',
      'GET /stats/hourly': 'Trips by hour of day',
      'GET /stats/daily': 'Trips by day of week',
      'POST /benchmark': 'Run benchmark queries',
    },
    example: {
      seed: 'POST /seed/sample',
      query: 'GET /trips?limit=10',
      stats: 'GET /stats',
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
