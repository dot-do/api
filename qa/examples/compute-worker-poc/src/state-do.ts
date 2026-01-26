/**
 * Stateful Durable Object (NO WASM)
 *
 * This DO owns state and persistence but delegates compute to the Compute Worker.
 * This is the "state" part of the "Stateful DO + Stateless Compute Worker" architecture.
 *
 * Key characteristics:
 * - NO PGLite WASM loading (instant cold start)
 * - Uses DO SQLite for persistent storage
 * - Routes queries to Compute Worker via service binding
 * - Applies mutations to local SQLite after compute
 *
 * The insight: by moving WASM to a separate Worker, DO cold starts become instant.
 */

import { Hono } from 'hono'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './shared/timing'
import type { StateDoEnv, ComputeResponse, QueryResult } from './shared/types'

/**
 * Module-level tracking
 */
const DO_MODULE_LOADED_AT = Date.now()
let DO_INSTANCE_COUNT = 0

/**
 * State Durable Object - owns state, delegates compute
 */
export class StateDOv2 implements DurableObject {
  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  // DO SQLite for persistence
  private sql: SqlStorage

  constructor(
    private state: DurableObjectState,
    private env: StateDoEnv
  ) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    this.instanceId = `state-do-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
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
  }

  /**
   * Get instance status (instant)
   */
  private getStatus(): object {
    const now = Date.now()

    // Get some stats from SQLite
    const kvCount = this.sql.exec('SELECT COUNT(*) as count FROM kv').one() as { count: number }
    const queryCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log').one() as { count: number }

    return {
      success: true,
      architecture: 'stateful-do-no-wasm',
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
      },
      persistence: {
        kvEntries: kvCount.count,
        queryLogEntries: queryCount.count,
      },
      note: 'This DO has NO WASM - instant cold start!',
    }
  }

  /**
   * Execute SQL via compute worker
   */
  private async executeViaComputeWorker(sql: string, timing: TimingCollector): Promise<ComputeResponse> {
    timing.start('rpc_call')
    const response = await this.env.COMPUTE_WORKER.fetch('https://compute/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, requestId: timing.requestId }),
    })
    timing.end()

    timing.start('parse_response')
    const data = (await response.json()) as ComputeResponse
    timing.end()

    return data
  }

  /**
   * Persist query result to DO SQLite (for write operations)
   */
  private persistQueryLog(sql: string, result: QueryResult | undefined, computeMs: number, persistMs: number, totalMs: number): void {
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
   * Handle query request - delegate to compute worker
   */
  private async handleQuery(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    try {
      // Delegate compute to the Compute Worker
      const computeResult = await this.executeViaComputeWorker(sql, timing)

      if (!computeResult.success) {
        return Response.json({
          success: false,
          error: computeResult.error,
          coldStart: wasColdStart,
          architecture: 'stateful-do-no-wasm',
        }, { status: 500 })
      }

      // For writes, we'd persist to DO SQLite here
      // For this POC, we just log the query
      timing.start('persist')
      this.persistQueryLog(
        sql,
        computeResult.result,
        computeResult.timings.executionMs,
        0,
        computeResult.timings.totalMs
      )
      timing.end()

      this.coldStart = false

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        rows: computeResult.result?.rows,
        affectedRows: computeResult.result?.affectedRows,
        coldStart: wasColdStart,
        architecture: 'stateful-do-no-wasm',
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
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        architecture: 'stateful-do-no-wasm',
      }, { status: 500 })
    }
  }

  /**
   * Handle timing request (detailed measurement)
   */
  private async handleTiming(sql: string, requestId?: string): Promise<Response> {
    const timing = new TimingCollector(requestId)
    const wasColdStart = this.coldStart

    try {
      // Delegate compute to the Compute Worker
      const computeResult = await this.executeViaComputeWorker(sql, timing)

      if (!computeResult.success) {
        return Response.json({
          success: false,
          error: computeResult.error,
          coldStart: wasColdStart,
          architecture: 'stateful-do-no-wasm',
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
      timing.end()

      this.coldStart = false

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        rows: computeResult.result?.rows,
        affectedRows: computeResult.result?.affectedRows,
        coldStart: wasColdStart,
        architecture: 'stateful-do-no-wasm',
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
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        architecture: 'stateful-do-no-wasm',
      }, { status: 500 })
    }
  }

  /**
   * Handle write operation with persistence
   */
  private async handleWrite(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    try {
      // Execute via compute worker
      const computeResult = await this.executeViaComputeWorker(sql, timing)

      if (!computeResult.success) {
        return Response.json({
          success: false,
          error: computeResult.error,
          coldStart: wasColdStart,
          architecture: 'stateful-do-no-wasm',
        }, { status: 500 })
      }

      // For a real implementation, we'd:
      // 1. Parse the SQL to understand what was mutated
      // 2. Apply those changes to DO SQLite
      // For this POC, we just log it

      timing.start('persist')
      this.persistQueryLog(
        sql,
        computeResult.result,
        computeResult.timings.executionMs,
        0,
        computeResult.timings.totalMs
      )

      // Also store in kv for demonstration
      const key = `write-${Date.now()}`
      this.sql.exec(
        `INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
        key,
        JSON.stringify({ sql, result: computeResult.result })
      )
      timing.end()

      this.coldStart = false

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        affectedRows: computeResult.result?.affectedRows,
        coldStart: wasColdStart,
        architecture: 'stateful-do-no-wasm',
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
        architecture: 'stateful-do-no-wasm',
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
      const body = (await request.json()) as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleQuery(body.sql)
    }

    // Timing endpoint (detailed measurement)
    if (url.pathname === '/timing' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; requestId?: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleTiming(body.sql, body.requestId)
    }

    // Write endpoint (with persistence)
    if (url.pathname === '/write' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleWrite(body.sql)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

/**
 * Worker that hosts the State DO
 */
const app = new Hono<{ Bindings: StateDoEnv & { STATE_DO: DurableObjectNamespace } }>()

app.get('/', (c) => {
  return c.json({
    name: 'State DO Worker',
    description: 'Hosts the StateDOv2 - lightweight DO with no WASM',
    architecture: 'stateful-do-no-wasm',
  })
})

app.get('/ping', (c) => {
  return c.json({ ok: true })
})

// Proxy all other requests to the DO
app.all('/*', async (c) => {
  const doId = c.env.STATE_DO.idFromName('state-main')
  const stub = c.env.STATE_DO.get(doId)
  return stub.fetch(c.req.raw)
})

export default {
  fetch: app.fetch,
}
