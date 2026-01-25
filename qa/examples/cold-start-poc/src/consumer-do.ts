/**
 * Consumer Durable Object
 *
 * A standard PGLite DO for baseline cold start measurements.
 * This represents the "direct" approach without factory optimization.
 */

import { TimingCollector, MODULE_ID } from './timing'
import { PGliteLocal } from './pglite-local'

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'

const DO_MODULE_LOADED_AT = Date.now()
let DO_INSTANCE_COUNT = 0

export class ConsumerDO implements DurableObject {
  private pg: PGliteLocal | null = null
  private pgPromise: Promise<PGliteLocal> | null = null
  private initialized = false
  private initializationTiming: TimingCollector | null = null

  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  private wasmLoadStartedAt: number | null = null
  private wasmLoadedAt: number | null = null

  constructor(private state: DurableObjectState) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    // Use timestamp + counter instead of crypto.randomUUID() to avoid issues
    this.instanceId = `consumer-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
    this.instanceCreatedAt = Date.now()

    // Start warm-up eagerly
    this.wasmLoadStartedAt = Date.now()
    this.pgPromise = this.initPGLite()
  }

  private async initPGLite(): Promise<PGliteLocal> {
    if (this.pg) return this.pg

    const timing = new TimingCollector()
    this.initializationTiming = timing

    try {
      timing.start('wasm_load')
      const wasmModule = pgliteWasm
      timing.end({ wasmSize: 'pre-compiled' })

      timing.start('data_load')
      const dataBuffer = pgliteData
      timing.end({ dataSize: dataBuffer.byteLength })

      timing.start('module_init')
      this.pg = await PGliteLocal.create({
        wasmModule,
        fsBundle: dataBuffer,
        debug: false,
      })
      timing.end()

      this.wasmLoadedAt = Date.now()
      this.initialized = true

      timing.start('first_query')
      await this.pg.query('SELECT 1')
      timing.end()

      return this.pg
    } catch (error) {
      console.error('PGLite initialization failed:', error)
      throw error
    }
  }

  private async ensurePGLite(): Promise<PGliteLocal> {
    if (this.pg) return this.pg
    if (!this.pgPromise) {
      this.pgPromise = this.initPGLite()
    }
    this.pg = await this.pgPromise
    return this.pg
  }

  private getStatus(): object {
    const now = Date.now()
    return {
      success: true,
      module: {
        id: MODULE_ID,
        doModuleLoadedAt: new Date(DO_MODULE_LOADED_AT).toISOString(),
        doModuleAgeMs: now - DO_MODULE_LOADED_AT,
        instanceCount: DO_INSTANCE_COUNT,
      },
      instance: {
        id: this.instanceId,
        number: this.instanceNumber,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        ageMs: now - this.instanceCreatedAt,
        requestCount: this.requestCount,
        coldStart: this.coldStart,
      },
      pglite: {
        initialized: this.initialized,
        initializing: this.pgPromise !== null && !this.initialized,
        loadDurationMs:
          this.wasmLoadedAt && this.wasmLoadStartedAt ? this.wasmLoadedAt - this.wasmLoadStartedAt : null,
      },
      initializationTiming: this.initializationTiming?.getTimings() || null,
    }
  }

  private async handleTiming(sql: string, requestId?: string): Promise<Response> {
    const timing = new TimingCollector(requestId)
    const wasColdStart = this.coldStart

    try {
      timing.start('ensure_pglite')
      const pg = await this.ensurePGLite()
      const ensureEvent = timing.end()

      this.coldStart = false

      timing.start('query_execution')
      const result = await pg.query(sql)
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = wasColdStart

      return Response.json({
        success: true,
        rows: result.rows,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        doTimings: {
          ensurePGLiteMs: ensureEvent?.durationMs,
          queryExecutionMs: timings.events.find((e) => e.name === 'query_execution')?.durationMs,
          totalMs: timings.totalMs,
        },
        initializationTiming: wasColdStart ? this.initializationTiming?.getTimings() : null,
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
        },
      })
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          coldStart: wasColdStart,
        },
        { status: 500 }
      )
    }
  }

  async fetch(request: Request): Promise<Response> {
    this.requestCount++
    const url = new URL(request.url)

    if (url.pathname === '/status') {
      return Response.json(this.getStatus())
    }

    if (url.pathname === '/timing' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; requestId?: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleTiming(body.sql, body.requestId)
    }

    if (url.pathname === '/query' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }

      const wasColdStart = this.coldStart
      const pg = await this.ensurePGLite()
      this.coldStart = false

      const result = await pg.query(body.sql)
      return Response.json({
        success: true,
        rows: result.rows,
        coldStart: wasColdStart,
      })
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
