/**
 * Thin State Durable Object - Pure State Coordinator
 *
 * This DO has NO WASM bundled - it's purely a state coordinator
 * that ALWAYS delegates compute to the shared compute worker.
 *
 * Key characteristics:
 * - NO PGLite WASM in bundle (fast cold start, tiny bundle)
 * - Uses DO SQLite for persistence
 * - ALL queries delegated to Compute Worker via RPC
 * - Returns results, persists mutations to DO SQLite
 *
 * This is the most minimal architecture for state management.
 * The hypothesis: Thin State should have near-instant cold start
 * because there's no WASM to instantiate.
 *
 * Comparison to other architectures:
 * - Traditional DO: ~13MB bundle, ~2.0s cold start, ~10ms hot query
 * - Hybrid DO: ~13MB bundle, ~3.0s cold start, ~30ms cold / ~10ms warm
 * - Thin State DO: <100KB bundle, ~???ms cold start, ~30ms always
 */

import { Hono } from 'hono'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './shared/timing'
import type { ComputeResponse, QueryResult } from './shared/types'

// NO WASM IMPORTS - This is the key difference!
// import wasmModule from './pglite.wasm'  // NOT included
// import dataBundle from './pglite.data'  // NOT included

/**
 * Environment bindings for Thin State DO
 */
export interface ThinStateDoEnv {
  COMPUTE_WORKER: Fetcher
}

/**
 * Module-level tracking
 */
const DO_MODULE_LOADED_AT = Date.now()
let DO_INSTANCE_COUNT = 0

/**
 * Thin State Durable Object - state coordinator only
 */
export class ThinStateDO implements DurableObject {
  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  // DO SQLite for persistence
  private sql: SqlStorage

  // Track routing stats
  private delegatedCount = 0

  constructor(
    private state: DurableObjectState,
    private env: ThinStateDoEnv
  ) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    this.instanceId = `thin-state-do-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
    this.instanceCreatedAt = Date.now()
    this.sql = state.storage.sql

    // Initialize schema synchronously (fast - no WASM!)
    this.initSchema()
  }

  /**
   * Initialize DO SQLite schema for persistence
   * This is synchronous and instant (no WASM loading)
   */
  private initSchema(): void {
    // Create a simple key-value table for persisting state
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Create a table to track query history
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS query_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sql TEXT,
        result TEXT,
        compute_ms REAL,
        persist_ms REAL,
        total_ms REAL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Track mutations for replay/sync
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS mutations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sql TEXT,
        params TEXT,
        affected_rows INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
  }

  /**
   * Get instance status (instant - no WASM check needed)
   */
  private getStatus(): object {
    const now = Date.now()

    // Get some stats from SQLite
    const kvCount = this.sql.exec('SELECT COUNT(*) as count FROM kv').one() as { count: number }
    const queryCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log').one() as { count: number }
    const mutationCount = this.sql.exec('SELECT COUNT(*) as count FROM mutations').one() as { count: number }

    return {
      success: true,
      architecture: 'thin-state',
      description: 'Pure state coordinator - NO WASM, ALWAYS delegates to compute worker',
      module: {
        id: MODULE_ID,
        loadedAt: new Date(MODULE_LOAD_TIME).toISOString(),
        ageMs: now - MODULE_LOAD_TIME,
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
        delegatedCount: this.delegatedCount,
      },
      persistence: {
        kvEntries: kvCount.count,
        queryLogEntries: queryCount.count,
        mutationCount: mutationCount.count,
      },
      bundleInfo: {
        wasmIncluded: false,
        dataIncluded: false,
        expectedBundleSize: '<100KB',
        note: 'No WASM means instant cold start!',
      },
    }
  }

  /**
   * ALWAYS delegate to compute worker - this is the core of thin state
   */
  private async executeViaComputeWorker(
    sql: string,
    params: unknown[] | undefined,
    timing: TimingCollector
  ): Promise<ComputeResponse> {
    this.delegatedCount++

    timing.start('rpc_call')
    const response = await this.env.COMPUTE_WORKER.fetch('https://compute/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql,
        params,
        requestId: timing.requestId,
      }),
    })
    timing.end()

    timing.start('parse_response')
    const data = (await response.json()) as ComputeResponse
    timing.end()

    return data
  }

  /**
   * Persist query result to DO SQLite
   */
  private persistQueryLog(
    sql: string,
    result: QueryResult | undefined,
    computeMs: number,
    persistMs: number,
    totalMs: number
  ): void {
    this.sql.exec(
      `INSERT INTO query_log (sql, result, compute_ms, persist_ms, total_ms) VALUES (?, ?, ?, ?, ?)`,
      sql,
      JSON.stringify(result?.rows || []),
      computeMs,
      persistMs,
      totalMs
    )
  }

  /**
   * Track mutations for potential replay/sync
   */
  private trackMutation(sql: string, params: unknown[] | undefined, affectedRows: number): void {
    this.sql.exec(
      `INSERT INTO mutations (sql, params, affected_rows) VALUES (?, ?, ?)`,
      sql,
      JSON.stringify(params || []),
      affectedRows
    )
  }

  /**
   * Handle query request - ALWAYS delegates to compute worker
   */
  async query(sql: string, params?: unknown[]): Promise<Response> {
    const start = performance.now()
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    try {
      // ALWAYS delegate to compute worker - no local WASM
      const computeResult = await this.executeViaComputeWorker(sql, params, timing)

      if (!computeResult.success) {
        return Response.json({
          success: false,
          error: computeResult.error,
          coldStart: wasColdStart,
          architecture: 'thin-state',
        }, { status: 500 })
      }

      // Persist query log
      timing.start('persist')
      this.persistQueryLog(
        sql,
        computeResult.result,
        computeResult.timings.executionMs,
        0,
        computeResult.timings.totalMs
      )

      // Track mutations if this was a write
      const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql)
      if (isWrite && computeResult.result) {
        this.trackMutation(sql, params, computeResult.result.affectedRows)
      }
      timing.end()

      this.coldStart = false

      const totalMs = performance.now() - start

      return Response.json({
        success: true,
        rows: computeResult.result?.rows,
        affectedRows: computeResult.result?.affectedRows,
        coldStart: wasColdStart,
        architecture: 'thin-state',
        totalMs,
        timings: {
          doTimings: {
            rpcCallMs: timing.getDuration('rpc_call'),
            parseResponseMs: timing.getDuration('parse_response'),
            persistMs: timing.getDuration('persist'),
            totalMs,
          },
          computeWorkerTimings: computeResult.timings,
          computeWorkerInfo: computeResult.workerInfo,
        },
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
          delegatedCount: this.delegatedCount,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        architecture: 'thin-state',
        totalMs: performance.now() - start,
      }, { status: 500 })
    }
  }

  /**
   * Handle timing request (detailed measurement)
   */
  private async handleTiming(sql: string, params?: unknown[], requestId?: string): Promise<Response> {
    const timing = new TimingCollector(requestId)
    const wasColdStart = this.coldStart

    try {
      // ALWAYS delegate to compute worker
      const computeResult = await this.executeViaComputeWorker(sql, params, timing)

      if (!computeResult.success) {
        return Response.json({
          success: false,
          error: computeResult.error,
          coldStart: wasColdStart,
          architecture: 'thin-state',
        }, { status: 500 })
      }

      timing.start('persist')
      this.persistQueryLog(
        sql,
        computeResult.result,
        computeResult.timings.executionMs,
        timing.getDuration('persist') || 0,
        computeResult.timings.totalMs
      )

      const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql)
      if (isWrite && computeResult.result) {
        this.trackMutation(sql, params, computeResult.result.affectedRows)
      }
      timing.end()

      this.coldStart = false

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        rows: computeResult.result?.rows,
        affectedRows: computeResult.result?.affectedRows,
        coldStart: wasColdStart,
        architecture: 'thin-state',
        doTimings: {
          rpcCallMs: timing.getDuration('rpc_call'),
          parseResponseMs: timing.getDuration('parse_response'),
          persistMs: timing.getDuration('persist'),
          totalMs: timings.totalMs,
        },
        computeWorkerTimings: computeResult.timings,
        computeWorkerInfo: computeResult.workerInfo,
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
          delegatedCount: this.delegatedCount,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        architecture: 'thin-state',
      }, { status: 500 })
    }
  }

  /**
   * Handle write operation with persistence
   */
  private async handleWrite(sql: string, params?: unknown[]): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    try {
      // ALWAYS execute via compute worker
      const computeResult = await this.executeViaComputeWorker(sql, params, timing)

      if (!computeResult.success) {
        return Response.json({
          success: false,
          error: computeResult.error,
          coldStart: wasColdStart,
          architecture: 'thin-state',
        }, { status: 500 })
      }

      timing.start('persist')
      // Log the query
      this.persistQueryLog(
        sql,
        computeResult.result,
        computeResult.timings.executionMs,
        0,
        computeResult.timings.totalMs
      )

      // Track the mutation
      if (computeResult.result) {
        this.trackMutation(sql, params, computeResult.result.affectedRows)
      }

      // Also store in kv for demonstration
      const key = `write-${Date.now()}`
      this.sql.exec(
        `INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
        key,
        JSON.stringify({ sql, params, result: computeResult.result })
      )
      timing.end()

      this.coldStart = false

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        affectedRows: computeResult.result?.affectedRows,
        coldStart: wasColdStart,
        architecture: 'thin-state',
        timings: {
          doTimings: {
            rpcCallMs: timing.getDuration('rpc_call'),
            parseResponseMs: timing.getDuration('parse_response'),
            persistMs: timing.getDuration('persist'),
            totalMs: timings.totalMs,
          },
          computeWorkerTimings: computeResult.timings,
          computeWorkerInfo: computeResult.workerInfo,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        architecture: 'thin-state',
      }, { status: 500 })
    }
  }

  /**
   * Fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    this.requestCount++
    const url = new URL(request.url)

    // Status endpoint (instant)
    if (url.pathname === '/status') {
      return Response.json(this.getStatus())
    }

    // Query endpoint
    if (url.pathname === '/query' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; params?: unknown[] }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.query(body.sql, body.params)
    }

    // Timing endpoint (detailed measurement)
    if (url.pathname === '/timing' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; params?: unknown[]; requestId?: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleTiming(body.sql, body.params, body.requestId)
    }

    // Write endpoint (with persistence)
    if (url.pathname === '/write' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; params?: unknown[] }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleWrite(body.sql, body.params)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

/**
 * Worker that hosts the Thin State DO
 */
const app = new Hono<{ Bindings: ThinStateDoEnv & { THIN_STATE_DO: DurableObjectNamespace } }>()

app.get('/', (c) => {
  return c.json({
    name: 'Thin State DO Worker',
    description: 'Hosts the ThinStateDO - pure state coordinator with NO WASM',
    architecture: 'thin-state',
    bundleInfo: {
      wasmIncluded: false,
      dataIncluded: false,
      expectedBundleSize: '<100KB',
    },
  })
})

app.get('/ping', (c) => {
  return c.json({ ok: true })
})

// Proxy all other requests to the DO
app.all('/*', async (c) => {
  const doId = c.env.THIN_STATE_DO.idFromName('thin-state-main')
  const stub = c.env.THIN_STATE_DO.get(doId)
  return stub.fetch(c.req.raw)
})

export default {
  fetch: app.fetch,
}
