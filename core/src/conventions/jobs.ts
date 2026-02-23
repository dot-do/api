/**
 * Async Jobs Convention
 *
 * Transparently promotes long-running function executions to async jobs.
 * When a function takes longer than a configurable threshold (default 5s),
 * the framework returns a job object instead of blocking. Callers can poll
 * the job URL, cancel via POST /jobs/:id/cancel, or stream progress via
 * SSE when ?stream is present.
 *
 * Job state is stored in-memory per convention instance (designed to live
 * inside a tenant Durable Object in production).
 *
 * URL examples:
 *   GET  /jobs              -> list all jobs
 *   GET  /jobs/:id          -> job status
 *   GET  /jobs/:id?stream   -> SSE progress stream
 *   POST /jobs/:id/cancel   -> cancel a running job
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv, Links } from '../types'

// =============================================================================
// Types
// =============================================================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface JobProgress {
  /** 0-100 percentage */
  percent: number
  /** Human-readable message */
  message?: string
}

export interface Job {
  /** Unique job identifier (e.g. "job_abc123") */
  id: string
  /** Function name that is executing */
  function: string
  /** Current status */
  status: JobStatus
  /** Progress info (while running) */
  progress?: JobProgress
  /** Final result (when completed) */
  result?: unknown
  /** Error details (when failed) */
  error?: { message: string; code?: string }
  /** ISO timestamp of creation */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
  /** ISO timestamp of completion */
  completedAt?: string
}

export interface JobConfig {
  /** Timeout in ms before auto-promoting to async job (default: 5000) */
  timeout?: number
  /** Maximum number of concurrent jobs per tenant (default: 50) */
  maxConcurrent?: number
  /** How long to retain completed/failed jobs in ms (default: 3600000 = 1 hour) */
  retentionMs?: number
  /** Base path for job routes (default: '/jobs') */
  basePath?: string
}

// =============================================================================
// Job Manager
// =============================================================================

/**
 * In-memory job state manager.
 *
 * In production this lives inside a tenant Durable Object so state is
 * scoped per tenant automatically. The class is intentionally stateless
 * with respect to external storage so it can be tested in isolation.
 */
export class JobManager {
  private jobs = new Map<string, Job>()
  private abortControllers = new Map<string, AbortController>()
  private progressListeners = new Map<string, Set<(progress: JobProgress) => void>>()
  private completionListeners = new Map<string, Set<(job: Job) => void>>()
  private retentionMs: number
  private maxConcurrent: number

  constructor(config: JobConfig = {}) {
    this.retentionMs = config.retentionMs ?? 3_600_000
    this.maxConcurrent = config.maxConcurrent ?? 50
  }

  /** Generate a unique job ID */
  private generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = 'job_'
    for (let i = 0; i < 12; i++) {
      id += chars[Math.floor(Math.random() * chars.length)]
    }
    return id
  }

  /** Create a new pending job */
  create(functionName: string): Job {
    // Enforce concurrency limit
    const running = this.runningCount()
    if (running >= this.maxConcurrent) {
      throw new Error(`Maximum concurrent jobs (${this.maxConcurrent}) reached`)
    }

    const now = new Date().toISOString()
    const job: Job = {
      id: this.generateId(),
      function: functionName,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    this.jobs.set(job.id, job)
    this.abortControllers.set(job.id, new AbortController())
    return job
  }

  /** Mark a job as running */
  start(id: string): Job | undefined {
    const job = this.jobs.get(id)
    if (!job || job.status !== 'pending') return undefined
    job.status = 'running'
    job.updatedAt = new Date().toISOString()
    return job
  }

  /** Update progress on a running job */
  updateProgress(id: string, progress: JobProgress): Job | undefined {
    const job = this.jobs.get(id)
    if (!job || (job.status !== 'running' && job.status !== 'pending')) return undefined
    job.progress = progress
    job.updatedAt = new Date().toISOString()

    // Notify SSE listeners
    const listeners = this.progressListeners.get(id)
    if (listeners) {
      for (const listener of listeners) {
        listener(progress)
      }
    }

    return job
  }

  /** Complete a job with a result */
  complete(id: string, result: unknown): Job | undefined {
    const job = this.jobs.get(id)
    if (!job || (job.status !== 'running' && job.status !== 'pending')) return undefined
    job.status = 'completed'
    job.result = result
    job.progress = { percent: 100, message: 'Completed' }
    job.completedAt = new Date().toISOString()
    job.updatedAt = job.completedAt

    this.abortControllers.delete(id)
    this.notifyCompletion(id, job)
    this.scheduleCleanup(id)
    return job
  }

  /** Fail a job with an error */
  fail(id: string, error: { message: string; code?: string }): Job | undefined {
    const job = this.jobs.get(id)
    if (!job || (job.status !== 'running' && job.status !== 'pending')) return undefined
    job.status = 'failed'
    job.error = error
    job.completedAt = new Date().toISOString()
    job.updatedAt = job.completedAt

    this.abortControllers.delete(id)
    this.notifyCompletion(id, job)
    this.scheduleCleanup(id)
    return job
  }

  /** Cancel a running or pending job */
  cancel(id: string): Job | undefined {
    const job = this.jobs.get(id)
    if (!job || (job.status !== 'running' && job.status !== 'pending')) return undefined
    job.status = 'cancelled'
    job.completedAt = new Date().toISOString()
    job.updatedAt = job.completedAt

    // Signal abort to the running function
    const controller = this.abortControllers.get(id)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(id)
    }

    this.notifyCompletion(id, job)
    this.scheduleCleanup(id)
    return job
  }

  /** Get a job by ID */
  get(id: string): Job | undefined {
    return this.jobs.get(id)
  }

  /** List all jobs, optionally filtered by status */
  list(status?: JobStatus): Job[] {
    const all = Array.from(this.jobs.values())
    if (status) return all.filter((j) => j.status === status)
    return all
  }

  /** Get the abort signal for a job (used by the executing function) */
  getAbortSignal(id: string): AbortSignal | undefined {
    return this.abortControllers.get(id)?.signal
  }

  /** Subscribe to progress updates (for SSE) */
  onProgress(id: string, listener: (progress: JobProgress) => void): () => void {
    if (!this.progressListeners.has(id)) {
      this.progressListeners.set(id, new Set())
    }
    this.progressListeners.get(id)!.add(listener)
    return () => {
      this.progressListeners.get(id)?.delete(listener)
      if (this.progressListeners.get(id)?.size === 0) {
        this.progressListeners.delete(id)
      }
    }
  }

  /** Subscribe to job completion (for SSE final event) */
  onCompletion(id: string, listener: (job: Job) => void): () => void {
    if (!this.completionListeners.has(id)) {
      this.completionListeners.set(id, new Set())
    }
    this.completionListeners.get(id)!.add(listener)
    return () => {
      this.completionListeners.get(id)?.delete(listener)
      if (this.completionListeners.get(id)?.size === 0) {
        this.completionListeners.delete(id)
      }
    }
  }

  /** Count of currently running jobs */
  private runningCount(): number {
    let count = 0
    for (const job of this.jobs.values()) {
      if (job.status === 'running' || job.status === 'pending') count++
    }
    return count
  }

  /** Notify completion listeners */
  private notifyCompletion(id: string, job: Job): void {
    const listeners = this.completionListeners.get(id)
    if (listeners) {
      for (const listener of listeners) {
        listener(job)
      }
      this.completionListeners.delete(id)
    }
    this.progressListeners.delete(id)
  }

  /** Schedule removal of completed job after retention period */
  private scheduleCleanup(id: string): void {
    if (this.retentionMs > 0) {
      setTimeout(() => {
        const job = this.jobs.get(id)
        if (job && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
          this.jobs.delete(id)
        }
      }, this.retentionMs)
    }
  }
}

// =============================================================================
// SSE Helper
// =============================================================================

function createSSEStream(c: Context<ApiEnv>, manager: JobManager, jobId: string): Response {
  const job = manager.get(jobId)
  if (!job) {
    return c.json({ error: { message: 'Job not found', code: 'JOB_NOT_FOUND' } }, 404)
  }

  // If already terminal, return a single-event stream
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: ${job.status}\ndata: ${JSON.stringify(job)}\n\n`))
        controller.close()
      },
    })
    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // Stream progress + completion
  const encoder = new TextEncoder()
  let unsubProgress: (() => void) | undefined
  let unsubComplete: (() => void) | undefined

  const body = new ReadableStream({
    start(controller) {
      // Send current state
      controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify(job)}\n\n`))

      unsubProgress = manager.onProgress(jobId, (progress) => {
        try {
          controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`))
        } catch {
          // Stream closed
        }
      })

      unsubComplete = manager.onCompletion(jobId, (completedJob) => {
        try {
          controller.enqueue(encoder.encode(`event: ${completedJob.status}\ndata: ${JSON.stringify(completedJob)}\n\n`))
          controller.close()
        } catch {
          // Stream closed
        }
      })
    },
    cancel() {
      unsubProgress?.()
      unsubComplete?.()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// =============================================================================
// Job Routes
// =============================================================================

function buildJobLinks(c: Context<ApiEnv>, job: Job, basePath: string): Links {
  const url = new URL(c.req.url)
  const base = `${url.protocol}//${url.host}${basePath}`
  const links: Links = {
    self: `${base}/${job.id}`,
    home: base,
  }

  if (job.status === 'running' || job.status === 'pending') {
    links.cancel = `${base}/${job.id}/cancel`
    links.stream = `${base}/${job.id}?stream`
  }

  return links
}

function createJobRoutes(manager: JobManager, config: JobConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const basePath = config.basePath ?? '/jobs'

  // List all jobs
  app.get(basePath, (c) => {
    const url = new URL(c.req.url)
    const statusFilter = url.searchParams.get('status') as JobStatus | null
    const jobs = manager.list(statusFilter ?? undefined)

    return c.var.respond({
      data: jobs.map((job) => ({
        ...job,
        links: buildJobLinks(c, job, basePath),
      })),
      key: 'jobs',
      total: jobs.length,
    })
  })

  // Get job status (or SSE stream)
  app.get(`${basePath}/:id`, (c) => {
    const id = c.req.param('id')
    const url = new URL(c.req.url)

    // SSE stream mode
    if (url.searchParams.has('stream')) {
      return createSSEStream(c, manager, id)
    }

    const job = manager.get(id)
    if (!job) {
      return c.var.respond({
        error: { message: 'Job not found', code: 'JOB_NOT_FOUND' },
        status: 404,
      })
    }

    return c.var.respond({
      data: job,
      key: 'job',
      links: buildJobLinks(c, job, basePath),
    })
  })

  // Cancel a job
  app.post(`${basePath}/:id/cancel`, (c) => {
    const id = c.req.param('id')
    const job = manager.cancel(id)
    if (!job) {
      const existing = manager.get(id)
      if (!existing) {
        return c.var.respond({
          error: { message: 'Job not found', code: 'JOB_NOT_FOUND' },
          status: 404,
        })
      }
      return c.var.respond({
        error: { message: `Cannot cancel job with status '${existing.status}'`, code: 'JOB_NOT_CANCELLABLE' },
        status: 409,
      })
    }

    return c.var.respond({
      data: job,
      key: 'job',
      links: buildJobLinks(c, job, config.basePath ?? '/jobs'),
    })
  })

  return app
}

// =============================================================================
// Convention — Wraps Function Execution with Job Tracking
// =============================================================================

export type FunctionExecutor = (input: unknown, signal: AbortSignal) => Promise<unknown>

/**
 * Creates the jobs convention.
 *
 * Returns:
 * - `routes`: Hono sub-app with job management routes (list, status, cancel)
 * - `manager`: JobManager instance for creating and tracking jobs
 * - `wrapFunction`: Higher-order function that wraps a function handler
 *   with automatic job promotion when execution exceeds the timeout
 */
export function jobsConvention(config: JobConfig = {}): {
  routes: Hono<ApiEnv>
  manager: JobManager
  wrapFunction: (name: string, fn: FunctionExecutor) => (c: Context<ApiEnv>, input: unknown) => Promise<Response>
} {
  const timeout = config.timeout ?? 5000
  const manager = new JobManager(config)
  const routes = createJobRoutes(manager, config)
  const basePath = config.basePath ?? '/jobs'

  /**
   * Wrap a function so it auto-promotes to an async job if it exceeds the timeout.
   *
   * The wrapped function races the original execution against a timer. If the
   * function completes within the timeout, the result is returned synchronously
   * (normal response). If it exceeds the timeout, a job is created, the function
   * continues executing in the background, and the caller gets back a job object
   * with a poll URL.
   */
  function wrapFunction(name: string, fn: FunctionExecutor) {
    return async (c: Context<ApiEnv>, input: unknown): Promise<Response> => {
      // Create job preemptively (cheap — we delete it if the function completes fast)
      const job = manager.create(name)
      const signal = manager.getAbortSignal(job.id)!

      manager.start(job.id)

      // Race: function vs timeout
      let settled = false
      const resultPromise = fn(input, signal)
        .then((result) => ({ ok: true as const, result }))
        .catch((err) => ({ ok: false as const, error: err instanceof Error ? err : new Error(String(err)) }))

      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), timeout)
      })

      const race = await Promise.race([resultPromise, timeoutPromise])

      if (race === 'timeout') {
        // Function is still running — return job object for polling
        settled = true

        // Let the function continue in the background
        resultPromise.then((outcome) => {
          if (outcome.ok) {
            manager.complete(job.id, outcome.result)
          } else {
            manager.fail(job.id, { message: outcome.error.message, code: 'FUNCTION_ERROR' })
          }
        })

        const url = new URL(c.req.url)
        const jobUrl = `${url.protocol}//${url.host}${basePath}/${job.id}`

        return c.var.respond({
          data: {
            id: job.id,
            function: name,
            status: 'running' as const,
          },
          key: 'job',
          status: 202,
          links: {
            self: jobUrl,
            cancel: `${jobUrl}/cancel`,
            stream: `${jobUrl}?stream`,
          },
        })
      }

      // Function completed within timeout — return result directly
      if (!settled) {
        // Clean up the preemptive job
        if (race.ok) {
          manager.complete(job.id, race.result)
          return c.var.respond({ data: race.result })
        } else {
          manager.fail(job.id, { message: race.error.message, code: 'FUNCTION_ERROR' })
          return c.var.respond({
            error: { message: race.error.message, code: 'FUNCTION_ERROR' },
            status: 500,
          })
        }
      }

      // Should not reach here
      return c.var.respond({
        error: { message: 'Unexpected state', code: 'INTERNAL_ERROR' },
        status: 500,
      })
    }
  }

  return { routes, manager, wrapFunction }
}
