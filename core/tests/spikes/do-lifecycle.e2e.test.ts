/**
 * DO Lifecycle E2E Tests
 *
 * This is a spike/exploratory test file to understand Durable Object lifecycle patterns.
 * Tests use the /debug endpoint on postgres.example.com.ai to observe:
 * - Module/isolate lifetime
 * - DO class recreation frequency
 * - WASM hoisting behavior
 * - Cold vs warm start timing
 *
 * Run with: npx vitest run tests/spikes/do-lifecycle.e2e.test.ts
 * Run long tests: INCLUDE_LONG_TESTS=1 npx vitest run tests/spikes/do-lifecycle.e2e.test.ts
 */

import { describe, it, expect } from 'vitest'

const POSTGRES_URL = 'https://postgres.example.com.ai'
const MONGO_URL = 'https://mongo.example.com.ai'

// Whether to run long-running tests (skip in CI)
const INCLUDE_LONG_TESTS = process.env.INCLUDE_LONG_TESTS === '1'

/**
 * Debug response from postgres.example.com.ai/debug
 */
interface DebugResponse {
  module: {
    id: string
    loadedAt: string
    ageMs: number
    requestCount: number
  }
  instance: {
    id: string
    createdAt: string
    ageMs: number
    requestCount: number
  }
  wasm: {
    initialized: boolean
    initializedAt: string
    ageMs: number
    reused: boolean
    initMs: number | null // null when WASM is reused (no fresh init needed)
  }
  doColo: string
  timing: {
    workerColo: string
    doColo: string
    rpcMs: number
    totalMs: number
  }
  explanation: Record<string, string>
}

/**
 * Helper to fetch debug info from postgres.example.com.ai
 */
async function fetchDebug(): Promise<DebugResponse> {
  const res = await fetch(`${POSTGRES_URL}/debug`)
  if (!res.ok) {
    throw new Error(`Debug endpoint failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<DebugResponse>
}

/**
 * Helper to wait for a specific duration
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Helper to format milliseconds as human-readable duration
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

describe('DO Lifecycle Behavior', () => {
  describe('Debug endpoint validation', () => {
    it('returns all expected fields', async () => {
      const debug = await fetchDebug()

      // Module fields
      expect(debug.module).toBeDefined()
      expect(typeof debug.module.id).toBe('string')
      expect(debug.module.id.length).toBeGreaterThan(0)
      expect(typeof debug.module.ageMs).toBe('number')
      expect(typeof debug.module.requestCount).toBe('number')
      expect(debug.module.loadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

      // Instance fields
      expect(debug.instance).toBeDefined()
      expect(typeof debug.instance.id).toBe('string')
      expect(debug.instance.id.length).toBeGreaterThan(0)
      expect(typeof debug.instance.ageMs).toBe('number')
      expect(typeof debug.instance.requestCount).toBe('number')

      // WASM fields
      expect(debug.wasm).toBeDefined()
      expect(typeof debug.wasm.initialized).toBe('boolean')
      expect(typeof debug.wasm.reused).toBe('boolean')
      // initMs is null when WASM is reused, number when freshly initialized
      expect(debug.wasm.initMs === null || typeof debug.wasm.initMs === 'number').toBe(true)

      // Timing fields
      expect(debug.timing).toBeDefined()
      expect(debug.timing.workerColo).toMatch(/^[A-Z]{3}$/)
      expect(typeof debug.timing.rpcMs).toBe('number')
      expect(typeof debug.timing.totalMs).toBe('number')

      console.log('Debug response structure validated')
      console.log(`  Module ID: ${debug.module.id} (age: ${formatDuration(debug.module.ageMs)})`)
      console.log(`  Instance ID: ${debug.instance.id} (age: ${formatDuration(debug.instance.ageMs)})`)
      console.log(`  WASM reused: ${debug.wasm.reused}, initMs: ${debug.wasm.initMs}ms`)
      console.log(`  Colo: Worker=${debug.timing.workerColo}, DO=${debug.timing.doColo}`)
    })
  })

  describe('Rapid requests (no wait)', () => {
    it('tracks request counts correctly within same instance', async () => {
      // Make 3 rapid requests
      const results: DebugResponse[] = []
      for (let i = 0; i < 3; i++) {
        results.push(await fetchDebug())
      }

      // Module should be the same across all requests (no isolate restart)
      const moduleIds = new Set(results.map((r) => r.module.id))
      expect(moduleIds.size).toBe(1)

      // Module request count should increase
      const moduleCounts = results.map((r) => r.module.requestCount)
      for (let i = 1; i < moduleCounts.length; i++) {
        expect(moduleCounts[i]).toBeGreaterThanOrEqual(moduleCounts[i - 1])
      }

      // WASM should be reused after first request
      const wasmReused = results.map((r) => r.wasm.reused)
      // First request might or might not be reused depending on prior state
      // But subsequent requests should definitely reuse
      expect(wasmReused.slice(1).every((r) => r === true)).toBe(true)

      console.log('Rapid request observations:')
      console.log(`  Module ID: ${results[0].module.id} (stable across ${results.length} requests)`)
      console.log(`  Module request counts: ${moduleCounts.join(' -> ')}`)
      console.log(`  Instance IDs: ${results.map((r) => r.instance.id).join(', ')}`)
      console.log(`  WASM reused: ${wasmReused.join(', ')}`)
      console.log(`  RPC times: ${results.map((r) => r.timing.rpcMs + 'ms').join(', ')}`)
    })
  })

  describe('WASM hoisting validation', () => {
    it('shows WASM reuse after first initialization', async () => {
      // First request
      const first = await fetchDebug()
      console.log(`First request: WASM reused=${first.wasm.reused}, initMs=${first.wasm.initMs}`)

      // Quick follow-up request
      const second = await fetchDebug()
      console.log(`Second request: WASM reused=${second.wasm.reused}, initMs=${second.wasm.initMs}`)

      // WASM should be reused on second request
      expect(second.wasm.reused).toBe(true)

      // When WASM is reused, initMs is null (no initialization needed)
      // When not reused, it's typically 15-50ms for full initialization
      if (second.wasm.reused) {
        // Reused WASM should have null initMs (no init performed) or minimal init time
        expect(second.wasm.initMs === null || second.wasm.initMs < 100).toBe(true)
      }

      console.log('\nWASM Hoisting Analysis:')
      console.log(`  First: initMs=${first.wasm.initMs}ms, reused=${first.wasm.reused}`)
      console.log(`  Second: initMs=${second.wasm.initMs}ms, reused=${second.wasm.reused}`)
      console.log(`  Module same: ${first.module.id === second.module.id}`)
    })

    it('compares initialization times for reused vs fresh WASM', async () => {
      // Make several requests and collect timing data
      const samples: Array<{ reused: boolean; initMs: number | null }> = []

      for (let i = 0; i < 5; i++) {
        const debug = await fetchDebug()
        samples.push({ reused: debug.wasm.reused, initMs: debug.wasm.initMs })
        // Small delay to avoid overwhelming
        await wait(100)
      }

      const reusedSamples = samples.filter((s) => s.reused)
      const freshSamples = samples.filter((s) => !s.reused)

      // Filter for numeric initMs values
      const reusedTimes = reusedSamples.map((s) => s.initMs).filter((ms): ms is number => ms !== null)
      const freshTimes = freshSamples.map((s) => s.initMs).filter((ms): ms is number => ms !== null)

      console.log('WASM Init Time Comparison:')
      console.log(`  Reused WASM (${reusedSamples.length} samples): ${reusedSamples.map((s) => s.initMs === null ? 'null' : `${s.initMs}ms`).join(', ')}`)
      console.log(`  Fresh WASM (${freshSamples.length} samples): ${freshSamples.map((s) => s.initMs === null ? 'null' : `${s.initMs}ms`).join(', ')}`)

      if (reusedTimes.length > 0) {
        const avgReused = reusedTimes.reduce((a, b) => a + b, 0) / reusedTimes.length
        console.log(`  Average reused init time (non-null): ${avgReused.toFixed(1)}ms`)
      } else {
        console.log(`  All reused samples have null initMs (expected - no init needed)`)
      }
      if (freshTimes.length > 0) {
        const avgFresh = freshTimes.reduce((a, b) => a + b, 0) / freshTimes.length
        console.log(`  Average fresh init time: ${avgFresh.toFixed(1)}ms`)
      }

      // At least some should be reused
      expect(reusedSamples.length).toBeGreaterThan(0)
    })
  })

  describe('DO class recreation patterns', () => {
    it('observes instance vs module ID changes', async () => {
      // Take a snapshot, wait a bit, take another
      const first = await fetchDebug()
      await wait(1000)
      const second = await fetchDebug()

      const moduleChanged = first.module.id !== second.module.id
      const instanceChanged = first.instance.id !== second.instance.id

      console.log('ID Change Analysis (1 second gap):')
      console.log(`  Module: ${first.module.id} -> ${second.module.id} (changed: ${moduleChanged})`)
      console.log(`  Instance: ${first.instance.id} -> ${second.instance.id} (changed: ${instanceChanged})`)
      console.log(`  Module age: ${formatDuration(first.module.ageMs)} -> ${formatDuration(second.module.ageMs)}`)
      console.log(`  Instance age: ${formatDuration(first.instance.ageMs)} -> ${formatDuration(second.instance.ageMs)}`)

      if (moduleChanged && instanceChanged) {
        console.log('  Interpretation: TRUE COLD START (isolate restarted)')
      } else if (!moduleChanged && instanceChanged) {
        console.log('  Interpretation: WARM START (isolate warm, DO class recreated)')
      } else if (!moduleChanged && !instanceChanged) {
        console.log('  Interpretation: HOT (same DO instance)')
      }
    })
  })
})

/**
 * Long-running tests for isolate lifetime observation
 * These tests are skipped by default. Run with INCLUDE_LONG_TESTS=1
 */
describe.skipIf(!INCLUDE_LONG_TESTS)('Isolate lifetime tests (long-running)', () => {
  it('tracks module age over 5 seconds', async () => {
    const first = await fetchDebug()
    console.log(`Initial: module.ageMs=${first.module.ageMs}, module.id=${first.module.id}`)

    await wait(5000)

    const second = await fetchDebug()
    console.log(`After 5s: module.ageMs=${second.module.ageMs}, module.id=${second.module.id}`)

    if (first.module.id === second.module.id) {
      // Same isolate - module age should have increased by ~5000ms
      const ageDiff = second.module.ageMs - first.module.ageMs
      console.log(`Same module, age increased by ${ageDiff}ms (expected ~5000ms)`)
      expect(ageDiff).toBeGreaterThan(4000)
      expect(ageDiff).toBeLessThan(7000)
    } else {
      // Isolate restarted (cold start)
      console.log('Module ID changed - isolate restarted (cold start detected)')
      console.log(`Old module: ${first.module.id} (age: ${formatDuration(first.module.ageMs)})`)
      console.log(`New module: ${second.module.id} (age: ${formatDuration(second.module.ageMs)})`)
    }
  }, 10000)

  it('tracks module age over 15 seconds', async () => {
    const intervals = [0, 5000, 10000, 15000]
    const samples: DebugResponse[] = []

    for (let i = 0; i < intervals.length; i++) {
      if (i > 0) {
        await wait(5000)
      }
      samples.push(await fetchDebug())
    }

    console.log('\n15-Second Observation:')
    console.log('| Interval | Module ID | Module Age | Instance ID | Instance Age | WASM Reused |')
    console.log('|----------|-----------|------------|-------------|--------------|-------------|')

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      console.log(
        `| ${intervals[i] / 1000}s       | ${s.module.id.slice(0, 8)}  | ${formatDuration(s.module.ageMs).padEnd(10)} | ${s.instance.id.slice(0, 8)}    | ${formatDuration(s.instance.ageMs).padEnd(12)} | ${s.wasm.reused}        |`
      )
    }

    // Analyze patterns
    const moduleIds = [...new Set(samples.map((s) => s.module.id))]
    const instanceIds = [...new Set(samples.map((s) => s.instance.id))]

    console.log(`\nSummary:`)
    console.log(`  Unique module IDs: ${moduleIds.length} (${moduleIds.length === 1 ? 'isolate stayed warm' : 'isolate restarted'})`)
    console.log(`  Unique instance IDs: ${instanceIds.length}`)
    console.log(`  Cold starts detected: ${moduleIds.length - 1}`)
    console.log(`  DO recreations detected: ${instanceIds.length - 1}`)
  }, 25000)

  it('tracks module age over 30 seconds', async () => {
    const checkpoints = [0, 10, 20, 30]
    const samples: Array<{ elapsed: number; debug: DebugResponse }> = []

    for (let i = 0; i < checkpoints.length; i++) {
      if (i > 0) {
        await wait(10000)
      }
      samples.push({ elapsed: checkpoints[i], debug: await fetchDebug() })
    }

    console.log('\n30-Second Observation:')
    console.log('| Elapsed | Module ID | Module Age | Changed |')
    console.log('|---------|-----------|------------|---------|')

    for (let i = 0; i < samples.length; i++) {
      const { elapsed, debug } = samples[i]
      const changed = i > 0 && debug.module.id !== samples[i - 1].debug.module.id
      console.log(`| ${elapsed}s      | ${debug.module.id.slice(0, 8)}  | ${formatDuration(debug.module.ageMs).padEnd(10)} | ${changed ? 'YES' : 'no'}     |`)
    }

    // Calculate observed isolate lifetime
    const moduleIds = samples.map((s) => s.debug.module.id)
    let maxContinuousAge = 0
    for (const sample of samples) {
      if (sample.debug.module.ageMs > maxContinuousAge) {
        maxContinuousAge = sample.debug.module.ageMs
      }
    }

    console.log(`\nObserved max continuous isolate age: ${formatDuration(maxContinuousAge)}`)

    // Count cold starts
    let coldStarts = 0
    for (let i = 1; i < moduleIds.length; i++) {
      if (moduleIds[i] !== moduleIds[i - 1]) {
        coldStarts++
      }
    }
    console.log(`Cold starts during observation: ${coldStarts}`)
  }, 45000)

  it('tracks module age over 60 seconds', async () => {
    const checkpoints = [0, 15, 30, 45, 60]
    const samples: Array<{ elapsed: number; debug: DebugResponse }> = []

    for (let i = 0; i < checkpoints.length; i++) {
      if (i > 0) {
        await wait(15000)
      }
      samples.push({ elapsed: checkpoints[i], debug: await fetchDebug() })
    }

    console.log('\n60-Second Observation:')
    console.log('| Elapsed | Module ID | Module Age   | Instance ID | WASM Reused | RPC ms |')
    console.log('|---------|-----------|--------------|-------------|-------------|--------|')

    for (const { elapsed, debug } of samples) {
      console.log(
        `| ${String(elapsed).padEnd(7)} | ${debug.module.id.slice(0, 8)}  | ${formatDuration(debug.module.ageMs).padEnd(12)} | ${debug.instance.id.slice(0, 8)}    | ${String(debug.wasm.reused).padEnd(11)} | ${String(debug.timing.rpcMs).padEnd(6)} |`
      )
    }

    // Detailed analysis
    const moduleIds = [...new Set(samples.map((s) => s.debug.module.id))]
    const instanceIds = [...new Set(samples.map((s) => s.debug.instance.id))]
    const rpcTimes = samples.map((s) => s.debug.timing.rpcMs)

    console.log(`\n60-Second Summary:`)
    console.log(`  Unique modules (isolates): ${moduleIds.length}`)
    console.log(`  Unique instances (DO classes): ${instanceIds.length}`)
    console.log(`  RPC times: min=${Math.min(...rpcTimes)}ms, max=${Math.max(...rpcTimes)}ms, avg=${(rpcTimes.reduce((a, b) => a + b, 0) / rpcTimes.length).toFixed(0)}ms`)

    // Estimate isolate lifetime
    let maxAge = 0
    for (const sample of samples) {
      if (sample.debug.module.ageMs > maxAge) {
        maxAge = sample.debug.module.ageMs
      }
    }
    console.log(`  Max observed isolate age: ${formatDuration(maxAge)}`)
  }, 75000)
})

/**
 * Comparison tests between mongo and postgres cold starts
 */
describe('Mongo vs Postgres cold start comparison', () => {
  it('compares initial RPC times', async () => {
    // Fetch both in parallel
    const [postgresRes, mongoRes] = await Promise.all([fetch(`${POSTGRES_URL}/debug`), fetch(`${MONGO_URL}/products/stats`)])

    const postgres = (await postgresRes.json()) as DebugResponse
    const mongo = (await mongoRes.json()) as { timing: { rpcMs: number; totalMs: number; workerColo: string; doColo: string } }

    console.log('Cold Start Comparison (Postgres vs Mongo):')
    console.log('')
    console.log('| Service  | RPC ms | Total ms | Worker Colo | DO Colo |')
    console.log('|----------|--------|----------|-------------|---------|')
    console.log(`| Postgres | ${String(postgres.timing.rpcMs).padEnd(6)} | ${String(postgres.timing.totalMs).padEnd(8)} | ${postgres.timing.workerColo}         | ${postgres.timing.doColo}     |`)
    console.log(`| MongoDB  | ${String(mongo.timing.rpcMs).padEnd(6)} | ${String(mongo.timing.totalMs).padEnd(8)} | ${mongo.timing.workerColo}         | ${mongo.timing.doColo}     |`)
    console.log('')

    const diff = postgres.timing.rpcMs - mongo.timing.rpcMs
    if (diff > 0) {
      console.log(`Postgres is ${diff}ms slower (expected: PGLite WASM initialization overhead)`)
    } else {
      console.log(`Mongo is ${-diff}ms slower (unexpected - usually postgres has WASM overhead)`)
    }

    // Both should respond reasonably fast (< 5 seconds)
    expect(postgres.timing.totalMs).toBeLessThan(5000)
    expect(mongo.timing.totalMs).toBeLessThan(5000)
  })

  it('collects timing samples for statistical comparison', async () => {
    const samples = 5
    const postgresTimes: number[] = []
    const mongoTimes: number[] = []

    for (let i = 0; i < samples; i++) {
      // Sequential to avoid interference
      const postgresRes = await fetch(`${POSTGRES_URL}/debug`)
      const postgres = (await postgresRes.json()) as DebugResponse
      postgresTimes.push(postgres.timing.rpcMs)

      const mongoRes = await fetch(`${MONGO_URL}/products/stats`)
      const mongo = (await mongoRes.json()) as { timing: { rpcMs: number } }
      mongoTimes.push(mongo.timing.rpcMs)

      // Small delay between samples
      await wait(200)
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    const min = (arr: number[]) => Math.min(...arr)
    const max = (arr: number[]) => Math.max(...arr)

    console.log(`\nTiming Statistics (${samples} samples):`)
    console.log('')
    console.log('| Service  | Avg ms  | Min ms  | Max ms  | Samples        |')
    console.log('|----------|---------|---------|---------|----------------|')
    console.log(`| Postgres | ${avg(postgresTimes).toFixed(0).padEnd(7)} | ${String(min(postgresTimes)).padEnd(7)} | ${String(max(postgresTimes)).padEnd(7)} | ${postgresTimes.join(', ')} |`)
    console.log(`| MongoDB  | ${avg(mongoTimes).toFixed(0).padEnd(7)} | ${String(min(mongoTimes)).padEnd(7)} | ${String(max(mongoTimes)).padEnd(7)} | ${mongoTimes.join(', ')} |`)
    console.log('')

    const avgDiff = avg(postgresTimes) - avg(mongoTimes)
    console.log(`Average difference: Postgres is ${avgDiff > 0 ? 'slower' : 'faster'} by ${Math.abs(avgDiff).toFixed(0)}ms`)

    console.log('\nExplanation:')
    console.log('  - Postgres uses PGLite (full PostgreSQL compiled to WASM)')
    console.log('  - MongoDB compatibility uses native DO SQLite storage')
    console.log('  - WASM initialization adds overhead on cold starts')
    console.log('  - WASM hoisting reduces overhead on warm starts')
  })
})

describe('Cold vs Warm start detection', () => {
  it('identifies cold start characteristics', async () => {
    const debug = await fetchDebug()

    // Cold start indicators:
    // - module.ageMs is very small (< 1000ms)
    // - instance.ageMs is very small (< 500ms)
    // - wasm.ageMs is very small (< 500ms)
    // - wasm.reused is false

    const isColdStart = debug.module.ageMs < 1000 && !debug.wasm.reused
    const isWarmStart = debug.module.ageMs > 5000 && debug.wasm.reused
    const isHot = debug.instance.ageMs < 100 && debug.wasm.reused

    console.log('Start Type Analysis:')
    console.log(`  Module age: ${formatDuration(debug.module.ageMs)}`)
    console.log(`  Instance age: ${formatDuration(debug.instance.ageMs)}`)
    console.log(`  WASM age: ${formatDuration(debug.wasm.ageMs)}`)
    console.log(`  WASM reused: ${debug.wasm.reused}`)
    console.log(`  WASM init time: ${debug.wasm.initMs}ms`)
    console.log('')

    if (isColdStart) {
      console.log('Detected: COLD START')
      console.log('  - Isolate was freshly created')
      console.log('  - WASM was initialized from scratch')
    } else if (isWarmStart) {
      console.log('Detected: WARM START')
      console.log('  - Isolate was already warm (module survived)')
      console.log('  - WASM was reused from module cache')
    } else {
      console.log('Detected: WARM/HOT (ambiguous)')
      console.log('  - Module has been alive for a while')
      console.log('  - Check instance age to determine if DO was recreated')
    }

    // The test passes regardless - this is exploratory
    expect(debug).toBeDefined()
  })
})
