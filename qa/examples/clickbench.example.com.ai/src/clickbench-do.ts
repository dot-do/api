/**
 * ClickBench Durable Object
 *
 * Provides PGLite-backed storage for ClickBench analytics dataset.
 * Uses eager-but-non-blocking WASM loading pattern.
 */

import { PGLiteWrapper } from './pglite-wrapper'
import { HITS_SCHEMA } from './schema'
import { CLICKBENCH_QUERIES } from './queries'

// Module-level state for tracking lifecycle
const MODULE_ID = 'module-' + Math.random().toString(36).slice(2, 11)
const MODULE_LOADED_AT = Date.now()
let MODULE_REQUEST_COUNT = 0

export class ClickBenchDO {
  private db: PGLiteWrapper | null = null
  private dbPromise: Promise<PGLiteWrapper> | null = null
  private initialized = false
  private seeding = false
  private seedProgress = { loaded: 0, total: 0, status: 'idle' as 'idle' | 'loading' | 'complete' | 'error' }

  // Instance lifecycle tracking
  private instanceId: string
  private instanceCreatedAt: number
  private instanceRequestCount = 0

  // WASM lifecycle tracking
  private wasmLoadStartedAt: number | null = null
  private wasmLoadedAt: number | null = null

  constructor(private state: DurableObjectState) {
    this.instanceId = 'instance-' + Math.random().toString(36).slice(2, 11)
    this.instanceCreatedAt = Date.now()

    // Start WASM loading eagerly but don't block constructor
    this.wasmLoadStartedAt = Date.now()
    this.dbPromise = this.initDB().then((db) => {
      this.wasmLoadedAt = Date.now()
      return db
    })
  }

  /**
   * Initialize PGLite database
   * Uses static imports for WASM and data
   */
  private async initDB(): Promise<PGLiteWrapper> {
    if (this.db) return this.db

    try {
      // Create PGLite instance
      this.db = await PGLiteWrapper.create()

      // Create schema
      await this.db.exec(HITS_SCHEMA)

      this.initialized = true
      return this.db
    } catch (error) {
      console.error('Failed to initialize PGLite:', error)
      throw error
    }
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<PGLiteWrapper> {
    if (this.db) return this.db
    if (!this.dbPromise) {
      this.dbPromise = this.initDB()
    }
    this.db = await this.dbPromise
    return this.db
  }

  /**
   * Ping endpoint - instant response without waiting for WASM
   */
  async ping() {
    return {
      ok: true,
      wasmLoaded: this.db !== null,
      wasmLoading: this.dbPromise !== null && this.db === null,
      moduleId: MODULE_ID,
      instanceId: this.instanceId,
    }
  }

  /**
   * Get debug info - instant response without waiting for WASM
   */
  async getDebugInfo() {
    const now = Date.now()
    return {
      module: {
        id: MODULE_ID,
        loadedAt: new Date(MODULE_LOADED_AT).toISOString(),
        ageMs: now - MODULE_LOADED_AT,
        requestCount: MODULE_REQUEST_COUNT,
      },
      instance: {
        id: this.instanceId,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        ageMs: now - this.instanceCreatedAt,
        requestCount: this.instanceRequestCount,
      },
      wasm: {
        loaded: this.db !== null,
        loading: this.dbPromise !== null && this.db === null,
        loadStartedAt: this.wasmLoadStartedAt ? new Date(this.wasmLoadStartedAt).toISOString() : null,
        loadedAt: this.wasmLoadedAt ? new Date(this.wasmLoadedAt).toISOString() : null,
        loadDurationMs: this.wasmLoadedAt && this.wasmLoadStartedAt ? this.wasmLoadedAt - this.wasmLoadStartedAt : null,
        timeSinceLoadMs: this.wasmLoadedAt ? now - this.wasmLoadedAt : null,
      },
      seedProgress: this.seedProgress,
    }
  }

  /**
   * Seed sample data
   * Generates synthetic data to avoid large file downloads
   */
  async seedSample(count: number = 10000) {
    const db = await this.ensureDB()

    if (this.seeding) {
      return {
        success: false,
        error: 'Seeding already in progress',
        progress: this.seedProgress,
      }
    }

    this.seeding = true
    this.seedProgress = { loaded: 0, total: count, status: 'loading' }

    try {
      const batchSize = 100
      const batches = Math.ceil(count / batchSize)

      for (let batch = 0; batch < batches; batch++) {
        const values: string[] = []
        const currentBatchSize = Math.min(batchSize, count - batch * batchSize)

        for (let i = 0; i < currentBatchSize; i++) {
          const idx = batch * batchSize + i
          values.push(this.generateRow(idx))
        }

        const sql = `INSERT INTO hits (
          WatchID, JavaEnable, Title, GoodEvent, EventTime, EventDate, CounterID, ClientIP,
          RegionID, UserID, CounterClass, OS, UserAgent, URL, Referer, IsRefresh,
          RefererCategoryID, RefererRegionID, URLCategoryID, URLRegionID, ResolutionWidth,
          ResolutionHeight, ResolutionDepth, FlashMajor, FlashMinor, FlashMinor2, NetMajor,
          NetMinor, UserAgentMajor, UserAgentMinor, CookieEnable, JavascriptEnable, IsMobile,
          MobilePhone, MobilePhoneModel, Params, IPNetworkID, TraficSourceID, SearchEngineID,
          SearchPhrase, AdvEngineID, IsArtifical, WindowClientWidth, WindowClientHeight,
          ClientTimeZone, ClientEventTime, SilverlightVersion1, SilverlightVersion2,
          SilverlightVersion3, SilverlightVersion4, PageCharset, CodeVersion, IsLink,
          IsDownload, IsNotBounce, FUniqID, OriginalURL, HID, IsOldCounter, IsEvent,
          IsParameter, DontCountHits, WithHash, HitColor, LocalEventTime, Age, Sex, Income,
          Interests, Robotness, RemoteIP, WindowName, OpenerName, HistoryLength, BrowserLanguage,
          BrowserCountry, SocialNetwork, SocialAction, HTTPError, SendTiming, DNSTiming,
          ConnectTiming, ResponseStartTiming, ResponseEndTiming, FetchTiming,
          SocialSourceNetworkID, SocialSourcePage, ParamPrice, ParamOrderID, ParamCurrency,
          ParamCurrencyID, OpenstatServiceName, OpenstatCampaignID, OpenstatAdID,
          OpenstatSourceID, UTMSource, UTMMedium, UTMCampaign, UTMContent, UTMTerm, FromTag,
          HasGCLID, RefererHash, URLHash, CLID
        ) VALUES ${values.join(', ')};`

        await db.exec(sql)

        this.seedProgress.loaded = Math.min((batch + 1) * batchSize, count)
      }

      this.seedProgress.status = 'complete'
      this.seeding = false

      return {
        success: true,
        rowsInserted: count,
        progress: this.seedProgress,
      }
    } catch (error) {
      this.seedProgress.status = 'error'
      this.seeding = false
      throw error
    }
  }

  /**
   * Generate a synthetic row of data
   */
  private generateRow(idx: number): string {
    const timestamp = new Date(2013, 6, 1 + (idx % 30), Math.floor(idx / 1000) % 24, (idx % 60))
    const date = timestamp.toISOString().split('T')[0]
    const time = timestamp.toISOString().replace('T', ' ').split('.')[0]

    const searchPhrases = ['', '', '', '', 'google search', 'youtube videos', 'news today', 'weather forecast', 'online shopping']
    const urls = ['https://example.com/', 'https://example.com/page1', 'https://example.com/page2', 'https://google.com/', 'https://youtube.com/']
    const referers = ['', '', '', 'https://google.com/', 'https://bing.com/']
    const titles = ['Example Page', 'Product Page', 'News Article', 'Search Results', 'Video Page']

    const userId = 1000000000000000000n + BigInt(idx % 10000)
    const watchId = 5000000000000000000n + BigInt(idx)

    return `(
      ${watchId}, ${idx % 2}, '${titles[idx % titles.length]}', 1, '${time}', '${date}', ${62 + (idx % 10)}, ${Math.floor(Math.random() * 1000000000)},
      ${idx % 1000}, ${userId}, 0, ${idx % 5}, ${idx % 50}, '${urls[idx % urls.length]}', '${referers[idx % referers.length]}', ${idx % 10 === 0 ? 1 : 0},
      0, 0, 0, 0, ${1024 + (idx % 4) * 256}, ${768 + (idx % 3) * 256}, 24, 11, 0, '', 4, 0, ${idx % 100}, '0', 1, 1, ${idx % 100 < 5 ? 1 : 0}, ${idx % 10}, '', '', 0, ${idx % 10}, ${idx % 5},
      '${searchPhrases[idx % searchPhrases.length]}', ${idx % 100 < 10 ? idx % 3 : 0}, 0, ${1024 + (idx % 4) * 256}, ${768 + (idx % 3) * 256}, ${-5 - (idx % 12)}, '${time}', 0, 0, 0, 0, 'UTF-8',
      200, ${idx % 100 < 5 ? 1 : 0}, ${idx % 100 < 2 ? 1 : 0}, ${idx % 10 > 2 ? 1 : 0}, ${watchId + 1n}, '', ${idx}, 0, 0, 0, 0, 0, 'R', '${time}', ${20 + (idx % 50)}, ${idx % 2}, ${idx % 5},
      0, 0, ${Math.floor(Math.random() * 1000000000)}, 0, 0, ${1 + (idx % 20)}, 'en', 'US', '', '', 0, ${50 + (idx % 200)}, ${10 + (idx % 100)}, ${50 + (idx % 150)}, ${100 + (idx % 200)}, ${150 + (idx % 250)}, ${200 + (idx % 300)}, 0, '', 0,
      '', '', 0, '', '', '', '', '', '', '', '', '', '', 0, ${Math.abs(userId.toString().split('').reduce((a, b) => ((a << 5) - a) + parseInt(b), 0))}, ${Math.abs(urls[idx % urls.length].split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}, 0
    )`
  }

  /**
   * Get seed status
   */
  async getSeedStatus() {
    return {
      success: true,
      progress: this.seedProgress,
      seeding: this.seeding,
    }
  }

  /**
   * List hits with pagination
   */
  async listHits(limit: number = 10, offset: number = 0) {
    const db = await this.ensureDB()
    const result = await db.query(`SELECT * FROM hits LIMIT $1 OFFSET $2`, [limit, offset])
    return {
      success: true,
      rows: result.rows,
      count: result.rows.length,
    }
  }

  /**
   * Get basic statistics
   */
  async getStats() {
    const db = await this.ensureDB()

    const countResult = await db.query('SELECT COUNT(*) as count FROM hits')
    const dateRangeResult = await db.query('SELECT MIN(EventDate) as min_date, MAX(EventDate) as max_date FROM hits')
    const userCountResult = await db.query('SELECT COUNT(DISTINCT UserID) as distinct_users FROM hits')

    return {
      success: true,
      stats: {
        totalRows: countResult.rows[0]?.count || 0,
        dateRange: {
          min: dateRangeResult.rows[0]?.min_date || null,
          max: dateRangeResult.rows[0]?.max_date || null,
        },
        distinctUsers: userCountResult.rows[0]?.distinct_users || 0,
      },
    }
  }

  /**
   * Run a specific ClickBench query
   */
  async runQuery(queryId: number) {
    const db = await this.ensureDB()

    const query = CLICKBENCH_QUERIES.find((q) => q.id === queryId)
    if (!query) {
      return {
        success: false,
        error: `Query not found: ${queryId}`,
      }
    }

    const startTime = performance.now()
    try {
      const result = await db.query(query.query)
      const durationMs = performance.now() - startTime

      return {
        success: true,
        query: {
          id: query.id,
          name: query.name,
          description: query.description,
          category: query.category,
          sql: query.query,
        },
        result: {
          rows: result.rows,
          rowCount: result.rows.length,
          durationMs: Math.round(durationMs * 100) / 100,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: {
          id: query.id,
          name: query.name,
          description: query.description,
          category: query.category,
          sql: query.query,
        },
      }
    }
  }

  /**
   * Run benchmark (all queries or quick subset)
   */
  async runBenchmark(quick: boolean = false) {
    const db = await this.ensureDB()

    const queries = quick ? CLICKBENCH_QUERIES.slice(0, 5) : CLICKBENCH_QUERIES
    const results = []

    const benchmarkStart = performance.now()

    for (const query of queries) {
      const startTime = performance.now()
      try {
        const result = await db.query(query.query)
        const durationMs = performance.now() - startTime

        results.push({
          id: query.id,
          name: query.name,
          category: query.category,
          success: true,
          durationMs: Math.round(durationMs * 100) / 100,
          rowCount: result.rows.length,
        })
      } catch (error) {
        results.push({
          id: query.id,
          name: query.name,
          category: query.category,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: 0,
          rowCount: 0,
        })
      }
    }

    const benchmarkDurationMs = performance.now() - benchmarkStart

    // Calculate percentiles
    const successfulDurations = results.filter((r) => r.success).map((r) => r.durationMs).sort((a, b) => a - b)
    const p50 = successfulDurations[Math.floor(successfulDurations.length * 0.5)] || 0
    const p95 = successfulDurations[Math.floor(successfulDurations.length * 0.95)] || 0
    const p99 = successfulDurations[Math.floor(successfulDurations.length * 0.99)] || 0

    return {
      success: true,
      benchmark: {
        totalQueries: queries.length,
        successfulQueries: results.filter((r) => r.success).length,
        failedQueries: results.filter((r) => !r.success).length,
        totalDurationMs: Math.round(benchmarkDurationMs * 100) / 100,
        avgQueryMs: Math.round((successfulDurations.reduce((a, b) => a + b, 0) / successfulDurations.length) * 100) / 100,
        p50Ms: Math.round(p50 * 100) / 100,
        p95Ms: Math.round(p95 * 100) / 100,
        p99Ms: Math.round(p99 * 100) / 100,
        results,
      },
    }
  }

  /**
   * RPC fetch handler
   */
  async fetch(request: Request) {
    MODULE_REQUEST_COUNT++
    this.instanceRequestCount++

    const url = new URL(request.url)

    // Instant endpoints (don't wait for WASM)
    if (url.pathname === '/ping') {
      return Response.json(await this.ping())
    }

    if (url.pathname === '/debug') {
      return Response.json(await this.getDebugInfo())
    }

    // All other endpoints wait for WASM
    await this.ensureDB()

    if (url.pathname === '/seed/sample' && request.method === 'POST') {
      const body = await request.json() as { count?: number }
      const result = await this.seedSample(body.count || 10000)
      return Response.json(result)
    }

    if (url.pathname === '/seed/status') {
      const result = await this.getSeedStatus()
      return Response.json(result)
    }

    if (url.pathname === '/hits') {
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const result = await this.listHits(limit, offset)
      return Response.json(result)
    }

    if (url.pathname === '/stats') {
      const result = await this.getStats()
      return Response.json(result)
    }

    if (url.pathname.startsWith('/query/') && request.method === 'POST') {
      const queryId = parseInt(url.pathname.split('/')[2])
      const result = await this.runQuery(queryId)
      return Response.json(result)
    }

    if (url.pathname === '/benchmark' && request.method === 'POST') {
      const body = await request.json() as { quick?: boolean }
      const result = await this.runBenchmark(body.quick || false)
      return Response.json(result)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
