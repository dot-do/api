/**
 * Async Jobs Convention Tests
 *
 * Tests for:
 * 1. JobManager — create, start, progress, complete, fail, cancel, list
 * 2. Job routes — GET /jobs, GET /jobs/:id, POST /jobs/:id/cancel
 * 3. Auto-promotion — functions exceeding timeout return job objects
 * 4. SSE streaming — GET /jobs/:id?stream returns event stream
 * 5. Concurrency limits and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { jobsConvention, JobManager } from '../../src/conventions/jobs'
import type { JobConfig, Job, JobStatus } from '../../src/conventions/jobs'
import type { ApiEnv } from '../../src/types'
import { responseMiddleware } from '../../src/response'

// =============================================================================
// Helper: create a test app with jobs convention
// =============================================================================

function createTestApp(config: JobConfig = {}) {
  const { routes, manager, wrapFunction } = jobsConvention(config)
  const app = new Hono<ApiEnv>()

  app.use('*', responseMiddleware({ name: 'test.do', description: 'Test API' }))
  app.route('/', routes)

  return { app, manager, wrapFunction }
}

// =============================================================================
// Helper: sleep utility
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================================================
// 1. JobManager — unit tests
// =============================================================================

describe('JobManager', () => {
  let manager: JobManager

  beforeEach(() => {
    manager = new JobManager({ retentionMs: 60_000 })
  })

  it('creates a job with pending status', () => {
    const job = manager.create('test.function')
    expect(job.id).toMatch(/^job_/)
    expect(job.function).toBe('test.function')
    expect(job.status).toBe('pending')
    expect(job.createdAt).toBeDefined()
    expect(job.updatedAt).toBeDefined()
  })

  it('starts a pending job', () => {
    const job = manager.create('test.function')
    const started = manager.start(job.id)
    expect(started).toBeDefined()
    expect(started!.status).toBe('running')
  })

  it('updates progress on a running job', () => {
    const job = manager.create('test.function')
    manager.start(job.id)
    const updated = manager.updateProgress(job.id, { percent: 50, message: 'Halfway' })
    expect(updated).toBeDefined()
    expect(updated!.progress).toEqual({ percent: 50, message: 'Halfway' })
  })

  it('completes a running job with a result', () => {
    const job = manager.create('test.function')
    manager.start(job.id)
    const completed = manager.complete(job.id, { answer: 42 })
    expect(completed).toBeDefined()
    expect(completed!.status).toBe('completed')
    expect(completed!.result).toEqual({ answer: 42 })
    expect(completed!.completedAt).toBeDefined()
    expect(completed!.progress).toEqual({ percent: 100, message: 'Completed' })
  })

  it('fails a running job with an error', () => {
    const job = manager.create('test.function')
    manager.start(job.id)
    const failed = manager.fail(job.id, { message: 'Something broke', code: 'BROKEN' })
    expect(failed).toBeDefined()
    expect(failed!.status).toBe('failed')
    expect(failed!.error).toEqual({ message: 'Something broke', code: 'BROKEN' })
    expect(failed!.completedAt).toBeDefined()
  })

  it('cancels a running job', () => {
    const job = manager.create('test.function')
    manager.start(job.id)
    const cancelled = manager.cancel(job.id)
    expect(cancelled).toBeDefined()
    expect(cancelled!.status).toBe('cancelled')
    expect(cancelled!.completedAt).toBeDefined()
  })

  it('cancels a pending job', () => {
    const job = manager.create('test.function')
    const cancelled = manager.cancel(job.id)
    expect(cancelled).toBeDefined()
    expect(cancelled!.status).toBe('cancelled')
  })

  it('cannot cancel a completed job', () => {
    const job = manager.create('test.function')
    manager.start(job.id)
    manager.complete(job.id, 'done')
    const result = manager.cancel(job.id)
    expect(result).toBeUndefined()
  })

  it('cannot start a non-pending job', () => {
    const job = manager.create('test.function')
    manager.start(job.id)
    manager.complete(job.id, 'done')
    const result = manager.start(job.id)
    expect(result).toBeUndefined()
  })

  it('gets a job by ID', () => {
    const job = manager.create('test.function')
    const found = manager.get(job.id)
    expect(found).toBeDefined()
    expect(found!.id).toBe(job.id)
  })

  it('returns undefined for unknown job ID', () => {
    const found = manager.get('job_nonexistent')
    expect(found).toBeUndefined()
  })

  it('lists all jobs', () => {
    manager.create('fn1')
    manager.create('fn2')
    manager.create('fn3')
    const all = manager.list()
    expect(all).toHaveLength(3)
  })

  it('lists jobs filtered by status', () => {
    const j1 = manager.create('fn1')
    const j2 = manager.create('fn2')
    manager.create('fn3')
    manager.start(j1.id)
    manager.start(j2.id)
    manager.complete(j1.id, 'done')

    const running = manager.list('running')
    expect(running).toHaveLength(1)
    expect(running[0].id).toBe(j2.id)

    const completed = manager.list('completed')
    expect(completed).toHaveLength(1)
    expect(completed[0].id).toBe(j1.id)

    const pending = manager.list('pending')
    expect(pending).toHaveLength(1)
  })

  it('enforces concurrency limit', () => {
    const smallManager = new JobManager({ maxConcurrent: 2 })
    smallManager.create('fn1')
    smallManager.create('fn2')
    expect(() => smallManager.create('fn3')).toThrow(/Maximum concurrent jobs/)
  })

  it('provides abort signal for cancellation', () => {
    const job = manager.create('test.function')
    const signal = manager.getAbortSignal(job.id)
    expect(signal).toBeDefined()
    expect(signal!.aborted).toBe(false)

    manager.cancel(job.id)
    expect(signal!.aborted).toBe(true)
  })

  it('notifies progress listeners', () => {
    const job = manager.create('test.function')
    manager.start(job.id)

    const listener = vi.fn()
    manager.onProgress(job.id, listener)

    manager.updateProgress(job.id, { percent: 25, message: 'Quarter done' })
    expect(listener).toHaveBeenCalledWith({ percent: 25, message: 'Quarter done' })
  })

  it('notifies completion listeners', () => {
    const job = manager.create('test.function')
    manager.start(job.id)

    const listener = vi.fn()
    manager.onCompletion(job.id, listener)

    manager.complete(job.id, { data: 'result' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
  })

  it('unsubscribes progress listeners', () => {
    const job = manager.create('test.function')
    manager.start(job.id)

    const listener = vi.fn()
    const unsubscribe = manager.onProgress(job.id, listener)

    manager.updateProgress(job.id, { percent: 25 })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    manager.updateProgress(job.id, { percent: 50 })
    expect(listener).toHaveBeenCalledTimes(1) // not called again
  })
})

// =============================================================================
// 2. Job routes — REST endpoints
// =============================================================================

describe('Job routes — GET /jobs', () => {
  it('returns empty list when no jobs exist', async () => {
    const { app } = createTestApp()
    const res = await app.request('/jobs')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.jobs).toEqual([])
    expect(body.total).toBe(0)
  })

  it('lists all jobs with links', async () => {
    const { app, manager } = createTestApp()
    manager.create('fn1')
    manager.create('fn2')

    const res = await app.request('/jobs')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.jobs).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(body.jobs[0].links).toBeDefined()
    expect(body.jobs[0].links.self).toContain('/jobs/')
  })

  it('filters jobs by status query param', async () => {
    const { app, manager } = createTestApp()
    const j1 = manager.create('fn1')
    manager.create('fn2')
    manager.start(j1.id)
    manager.complete(j1.id, 'done')

    const res = await app.request('/jobs?status=completed')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.jobs).toHaveLength(1)
    expect(body.jobs[0].status).toBe('completed')
  })

  it('includes standard envelope fields', async () => {
    const { app } = createTestApp()
    const res = await app.request('/jobs')
    const body = await res.json()

    expect(body.api).toBeDefined()
    expect(body.api.name).toBe('test.do')
    expect(body.links).toBeDefined()
  })
})

describe('Job routes — GET /jobs/:id', () => {
  it('returns job status by ID', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')

    const res = await app.request(`/jobs/${job.id}`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.job).toBeDefined()
    expect(body.job.id).toBe(job.id)
    expect(body.job.status).toBe('pending')
  })

  it('returns 404 for unknown job', async () => {
    const { app } = createTestApp()
    const res = await app.request('/jobs/job_nonexistent')
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('JOB_NOT_FOUND')
  })

  it('includes cancel and stream links for running jobs', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)

    const res = await app.request(`/jobs/${job.id}`)
    const body = await res.json()

    expect(body.links.cancel).toContain(`/jobs/${job.id}/cancel`)
    expect(body.links.stream).toContain(`/jobs/${job.id}?stream`)
  })

  it('omits cancel and stream links for completed jobs', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)
    manager.complete(job.id, 'done')

    const res = await app.request(`/jobs/${job.id}`)
    const body = await res.json()

    expect(body.links.cancel).toBeUndefined()
    expect(body.links.stream).toBeUndefined()
  })
})

describe('Job routes — POST /jobs/:id/cancel', () => {
  it('cancels a running job', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)

    const res = await app.request(`/jobs/${job.id}/cancel`, { method: 'POST' })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.job.status).toBe('cancelled')
  })

  it('returns 404 for unknown job', async () => {
    const { app } = createTestApp()
    const res = await app.request('/jobs/job_nonexistent/cancel', { method: 'POST' })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error.code).toBe('JOB_NOT_FOUND')
  })

  it('returns 409 for already-completed job', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)
    manager.complete(job.id, 'done')

    const res = await app.request(`/jobs/${job.id}/cancel`, { method: 'POST' })
    expect(res.status).toBe(409)

    const body = await res.json()
    expect(body.error.code).toBe('JOB_NOT_CANCELLABLE')
  })
})

// =============================================================================
// 3. Auto-promotion — wrapFunction
// =============================================================================

describe('wrapFunction — auto-promotion', () => {
  it('returns result directly for fast functions', async () => {
    const { app, wrapFunction } = createTestApp({ timeout: 1000 })

    const fastFn = async (_input: unknown, _signal: AbortSignal) => {
      return { result: 'fast' }
    }

    const handler = wrapFunction('fast.fn', fastFn)

    const testApp = new Hono<ApiEnv>()
    testApp.use('*', responseMiddleware({ name: 'test.do' }))
    testApp.post('/fast', async (c) => {
      return handler(c, {})
    })

    const res = await testApp.request('/fast', { method: 'POST' })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toEqual({ result: 'fast' })
  })

  it('returns job object (202) for slow functions', async () => {
    const { wrapFunction } = createTestApp({ timeout: 50 })

    const slowFn = async (_input: unknown, _signal: AbortSignal) => {
      await sleep(200)
      return { result: 'slow' }
    }

    const handler = wrapFunction('slow.fn', slowFn)

    const testApp = new Hono<ApiEnv>()
    testApp.use('*', responseMiddleware({ name: 'test.do' }))
    testApp.post('/slow', async (c) => {
      return handler(c, {})
    })

    const res = await testApp.request('/slow', { method: 'POST' })
    expect(res.status).toBe(202)

    const body = await res.json()
    expect(body.job).toBeDefined()
    expect(body.job.status).toBe('running')
    expect(body.job.id).toMatch(/^job_/)
    expect(body.links.self).toContain('/jobs/')
    expect(body.links.cancel).toContain('/cancel')
    expect(body.links.stream).toContain('?stream')
  })

  it('completes job in background after promotion', async () => {
    const { manager, wrapFunction } = createTestApp({ timeout: 50 })

    const slowFn = async (_input: unknown, _signal: AbortSignal) => {
      await sleep(100)
      return { result: 'background-done' }
    }

    const handler = wrapFunction('slow.fn', slowFn)

    const testApp = new Hono<ApiEnv>()
    testApp.use('*', responseMiddleware({ name: 'test.do' }))
    testApp.post('/slow', async (c) => {
      return handler(c, {})
    })

    const res = await testApp.request('/slow', { method: 'POST' })
    const body = await res.json()
    const jobId = body.job.id

    // Wait for background completion
    await sleep(200)

    const job = manager.get(jobId)
    expect(job).toBeDefined()
    expect(job!.status).toBe('completed')
    expect(job!.result).toEqual({ result: 'background-done' })
  })

  it('records failure for functions that throw', async () => {
    const { manager, wrapFunction } = createTestApp({ timeout: 50 })

    const failFn = async (_input: unknown, _signal: AbortSignal) => {
      await sleep(100)
      throw new Error('Background failure')
    }

    const handler = wrapFunction('fail.fn', failFn)

    const testApp = new Hono<ApiEnv>()
    testApp.use('*', responseMiddleware({ name: 'test.do' }))
    testApp.post('/fail', async (c) => {
      return handler(c, {})
    })

    const res = await testApp.request('/fail', { method: 'POST' })
    const body = await res.json()
    const jobId = body.job.id

    // Wait for background failure
    await sleep(200)

    const job = manager.get(jobId)
    expect(job).toBeDefined()
    expect(job!.status).toBe('failed')
    expect(job!.error!.message).toBe('Background failure')
  })

  it('returns error directly for fast-failing functions', async () => {
    const { wrapFunction } = createTestApp({ timeout: 1000 })

    const failFn = async (_input: unknown, _signal: AbortSignal) => {
      throw new Error('Immediate failure')
    }

    const handler = wrapFunction('fail.fn', failFn)

    const testApp = new Hono<ApiEnv>()
    testApp.use('*', responseMiddleware({ name: 'test.do' }))
    testApp.post('/fail', async (c) => {
      return handler(c, {})
    })

    const res = await testApp.request('/fail', { method: 'POST' })
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBe('Immediate failure')
    expect(body.error.code).toBe('FUNCTION_ERROR')
  })
})

// =============================================================================
// 4. SSE streaming
// =============================================================================

describe('SSE streaming — GET /jobs/:id?stream', () => {
  it('returns event stream content type', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)

    const res = await app.request(`/jobs/${job.id}?stream`)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('returns 404 SSE for unknown job', async () => {
    const { app } = createTestApp()
    const res = await app.request('/jobs/job_nonexistent?stream')
    expect(res.status).toBe(404)
  })

  it('returns terminal event for completed job', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)
    manager.complete(job.id, { answer: 42 })

    const res = await app.request(`/jobs/${job.id}?stream`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')

    const text = await res.text()
    expect(text).toContain('event: completed')
    expect(text).toContain('"answer":42')
  })

  it('returns terminal event for failed job', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)
    manager.fail(job.id, { message: 'Broken' })

    const res = await app.request(`/jobs/${job.id}?stream`)
    const text = await res.text()
    expect(text).toContain('event: failed')
    expect(text).toContain('Broken')
  })

  it('returns terminal event for cancelled job', async () => {
    const { app, manager } = createTestApp()
    const job = manager.create('test.fn')
    manager.start(job.id)
    manager.cancel(job.id)

    const res = await app.request(`/jobs/${job.id}?stream`)
    const text = await res.text()
    expect(text).toContain('event: cancelled')
  })
})

// =============================================================================
// 5. Custom base path
// =============================================================================

describe('Job routes — custom basePath', () => {
  it('mounts routes at custom path', async () => {
    const { app, manager } = createTestApp({ basePath: '/tasks' })
    manager.create('test.fn')

    const res = await app.request('/tasks')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.jobs).toHaveLength(1)
    expect(body.jobs[0].links.self).toContain('/tasks/')
  })

  it('serves job status at custom path', async () => {
    const { app, manager } = createTestApp({ basePath: '/tasks' })
    const job = manager.create('test.fn')

    const res = await app.request(`/tasks/${job.id}`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.job.id).toBe(job.id)
  })

  it('serves cancel at custom path', async () => {
    const { app, manager } = createTestApp({ basePath: '/tasks' })
    const job = manager.create('test.fn')

    const res = await app.request(`/tasks/${job.id}/cancel`, { method: 'POST' })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.job.status).toBe('cancelled')
  })
})

// =============================================================================
// 6. Edge cases
// =============================================================================

describe('Edge cases', () => {
  it('generates unique job IDs', () => {
    const manager = new JobManager({ maxConcurrent: 200 })
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(manager.create('test').id)
    }
    // With 36^12 possible IDs, collisions in 100 tries should not happen
    expect(ids.size).toBe(100)
  })

  it('cannot update progress on completed job', () => {
    const manager = new JobManager()
    const job = manager.create('test')
    manager.start(job.id)
    manager.complete(job.id, 'done')

    const result = manager.updateProgress(job.id, { percent: 50 })
    expect(result).toBeUndefined()
  })

  it('cannot fail a completed job', () => {
    const manager = new JobManager()
    const job = manager.create('test')
    manager.start(job.id)
    manager.complete(job.id, 'done')

    const result = manager.fail(job.id, { message: 'late error' })
    expect(result).toBeUndefined()
  })
})
