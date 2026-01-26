/**
 * Shared types for the Compute Worker POC
 *
 * Defines the interface between:
 * - Router Worker
 * - State DO (stateful, no WASM)
 * - Compute Worker (stateless, WASM)
 * - Traditional DO (baseline comparison)
 */

/**
 * Query result from PGLite
 */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[]
  affectedRows: number
  fields?: { name: string; dataTypeID: number }[]
}

/**
 * RPC request to compute worker
 */
export interface ComputeRequest {
  type: 'execute' | 'execute_batch'
  sql?: string
  params?: unknown[]
  statements?: string[]
  requestId: string
}

/**
 * RPC response from compute worker
 */
export interface ComputeResponse {
  success: boolean
  result?: QueryResult
  results?: QueryResult[]
  error?: string
  timings: {
    ensurePGLiteMs: number
    executionMs: number
    totalMs: number
  }
  workerInfo: {
    workerId: string
    instanceAge: number
    requestCount: number
    wasColdStart: boolean
  }
}

/**
 * Benchmark result structure
 */
export interface BenchmarkResult {
  name: string
  success: boolean
  e2eMs: number
  coldStart?: boolean
  timings?: {
    routerMs?: number
    doMs?: number
    computeMs?: number
    persistMs?: number
    totalMs?: number
  }
  error?: string
}

/**
 * Environment bindings for Router Worker
 */
export interface RouterEnv {
  STATE_DO: DurableObjectNamespace
  TRADITIONAL_DO: DurableObjectNamespace
  HYBRID_DO: DurableObjectNamespace
  THIN_STATE_DO: DurableObjectNamespace
  LAZY_WASM_DO: DurableObjectNamespace
  COMPUTE_WORKER: Fetcher
}

/**
 * Environment bindings for State DO
 */
export interface StateDoEnv {
  COMPUTE_WORKER: Fetcher
}

/**
 * Environment bindings for Traditional DO (baseline)
 */
export interface TraditionalDoEnv {
  // No external bindings needed - self-contained with WASM
}

/**
 * Environment bindings for Hybrid DO
 */
export interface HybridDoEnv {
  COMPUTE_WORKER: Fetcher
}

/**
 * Environment bindings for Thin State DO
 */
export interface ThinStateDoEnv {
  COMPUTE_WORKER: Fetcher
}

/**
 * Environment bindings for Compute Worker
 */
export interface ComputeWorkerEnv {
  // No external bindings - stateless worker
}

/**
 * Environment bindings for Lazy WASM DO
 * WASM is fetched from R2/Cache on-demand, not bundled statically
 */
export interface LazyWasmDoEnv {
  COMPUTE_WORKER: Fetcher
  WASM_BUCKET: R2Bucket
}

/**
 * Write operation for State DO to persist
 */
export interface WriteOperation {
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data?: Record<string, unknown>
  where?: Record<string, unknown>
}

/**
 * Mutation result from compute worker that needs persistence
 */
export interface MutationResult {
  affectedRows: number
  operations: WriteOperation[]
}
