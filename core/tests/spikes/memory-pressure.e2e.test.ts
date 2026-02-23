/**
 * Memory Pressure and DO Eviction Correlation E2E Tests
 *
 * SPIKE: Investigate whether higher memory usage (~64MB for PGLite) causes
 * faster DO eviction compared to lighter workloads (~5MB for DO SQLite only).
 *
 * This test compares eviction patterns between:
 * - Heavy: postgres.example.com.ai (PGLite WASM, ~64MB runtime memory)
 * - Light: mongo.example.com.ai (DO SQLite only, ~5MB runtime memory)
 *
 * Run with: npx vitest run tests/spikes/memory-pressure.e2e.test.ts
 * Run long tests: INCLUDE_LONG_TESTS=1 npx vitest run tests/spikes/memory-pressure.e2e.test.ts
 *
 * Issue: postgres-v7yv
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Endpoints
const HEAVY_URL = 'https://postgres.example.com.ai' // PGLite WASM (~64MB)
const LIGHT_URL = 'https://mongo.example.com.ai' // DO SQLite (~5MB)

// Whether to run long-running tests (skip in CI)
const INCLUDE_LONG_TESTS = process.env.INCLUDE_LONG_TESTS === '1'

/**
 * Debug response from postgres.example.com.ai/debug (heavy - with WASM)
 */
interface HeavyDebugResponse {
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
    initMs: number | null
  }
  doColo: string
  timing: {
    workerColo: string
    doColo: string
    rpcMs: number
    totalMs: number
  }
}

/**
 * Debug response from mongo.example.com.ai/debug (light - no WASM)
 */
interface LightDebugResponse {
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
    initialized: false
    note: string
  }
  doColo: string
  timing: {
    workerColo: string
    doColo: string
    rpcMs: number
    totalMs: number
  }
}

/**
 * Unified sample structure for comparison
 */
interface EvictionSample {
  timestamp: number
  elapsedMs: number
  moduleId: string
  moduleAgeMs: number
  instanceId: string
  instanceAgeMs: number
  requestCount: number
  rpcMs: number
  isColdStart: boolean // moduleId changed from previous
  isDoRecreated: boolean // instanceId changed but moduleId same
}

/**
 * Eviction statistics for a service
 */
interface EvictionStats {
  service: 'heavy' | 'light'
  totalSamples: number
  coldStarts: number // module ID changes
  doRecreations: number // instance ID changes (not cold starts)
  avgModuleLifetimeMs: number
  maxModuleLifetimeMs: number
  minModuleLifetimeMs: number
  avgInstanceLifetimeMs: number
  maxInstanceLifetimeMs: number
  minInstanceLifetimeMs: number
  avgRpcMs: number
  coldStartRate: number // cold starts per hour
  doRecreationRate: number // DO recreations per hour
  moduleIds: string[]
  instanceIds: string[]
}

/**
 * Helper to fetch debug info from heavy service (postgres)
 */
async function fetchHeavyDebug(): Promise<HeavyDebugResponse> {
  const res = await fetch(`${HEAVY_URL}/debug`)
  if (!res.ok) {
    throw new Error(`Heavy debug endpoint failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<HeavyDebugResponse>
}

/**
 * Helper to fetch debug info from light service (mongo)
 */
async function fetchLightDebug(): Promise<LightDebugResponse> {
  const res = await fetch(`${LIGHT_URL}/debug`)
  if (!res.ok) {
    throw new Error(`Light debug endpoint failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<LightDebugResponse>
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
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(2)}h`
}

/**
 * Collect samples from a service at regular intervals
 */
async function collectSamples(
  serviceName: 'heavy' | 'light',
  fetchFn: () => Promise<HeavyDebugResponse | LightDebugResponse>,
  intervalMs: number,
  durationMs: number
): Promise<EvictionSample[]> {
  const samples: EvictionSample[] = []
  const startTime = Date.now()
  let prevModuleId: string | null = null
  let prevInstanceId: string | null = null

  const numSamples = Math.ceil(durationMs / intervalMs) + 1

  console.log(`\n[${serviceName}] Starting sample collection: ${numSamples} samples over ${formatDuration(durationMs)}`)

  for (let i = 0; i < numSamples; i++) {
    try {
      const now = Date.now()
      const debug = await fetchFn()

      const isColdStart = prevModuleId !== null && debug.module.id !== prevModuleId
      const isDoRecreated = prevInstanceId !== null && debug.instance.id !== prevInstanceId && !isColdStart

      samples.push({
        timestamp: now,
        elapsedMs: now - startTime,
        moduleId: debug.module.id,
        moduleAgeMs: debug.module.ageMs,
        instanceId: debug.instance.id,
        instanceAgeMs: debug.instance.ageMs,
        requestCount: debug.module.requestCount,
        rpcMs: debug.timing.rpcMs,
        isColdStart,
        isDoRecreated,
      })

      if (isColdStart) {
        console.log(
          `  [${serviceName}] COLD START at ${formatDuration(now - startTime)}: ` + `${prevModuleId?.slice(0, 8)} -> ${debug.module.id.slice(0, 8)}`
        )
      }
      if (isDoRecreated) {
        console.log(
          `  [${serviceName}] DO recreated at ${formatDuration(now - startTime)}: ` +
            `${prevInstanceId?.slice(0, 8)} -> ${debug.instance.id.slice(0, 8)}`
        )
      }

      prevModuleId = debug.module.id
      prevInstanceId = debug.instance.id
    } catch (error) {
      console.error(`  [${serviceName}] Error at sample ${i}:`, error)
    }

    // Wait for next interval (except after last sample)
    if (i < numSamples - 1) {
      await wait(intervalMs)
    }
  }

  console.log(`[${serviceName}] Collection complete: ${samples.length} samples`)
  return samples
}

/**
 * Calculate eviction statistics from samples
 */
function calculateStats(service: 'heavy' | 'light', samples: EvictionSample[]): EvictionStats {
  if (samples.length === 0) {
    return {
      service,
      totalSamples: 0,
      coldStarts: 0,
      doRecreations: 0,
      avgModuleLifetimeMs: 0,
      maxModuleLifetimeMs: 0,
      minModuleLifetimeMs: 0,
      avgInstanceLifetimeMs: 0,
      maxInstanceLifetimeMs: 0,
      minInstanceLifetimeMs: 0,
      avgRpcMs: 0,
      coldStartRate: 0,
      doRecreationRate: 0,
      moduleIds: [],
      instanceIds: [],
    }
  }

  const moduleIds = [...new Set(samples.map((s) => s.moduleId))]
  const instanceIds = [...new Set(samples.map((s) => s.instanceId))]
  const coldStarts = samples.filter((s) => s.isColdStart).length
  const doRecreations = samples.filter((s) => s.isDoRecreated).length

  const moduleAges = samples.map((s) => s.moduleAgeMs)
  const instanceAges = samples.map((s) => s.instanceAgeMs)
  const rpcTimes = samples.map((s) => s.rpcMs)

  const totalDurationMs = samples[samples.length - 1].elapsedMs
  const totalDurationHours = totalDurationMs / 3600000

  return {
    service,
    totalSamples: samples.length,
    coldStarts,
    doRecreations,
    avgModuleLifetimeMs: moduleAges.reduce((a, b) => a + b, 0) / moduleAges.length,
    maxModuleLifetimeMs: Math.max(...moduleAges),
    minModuleLifetimeMs: Math.min(...moduleAges),
    avgInstanceLifetimeMs: instanceAges.reduce((a, b) => a + b, 0) / instanceAges.length,
    maxInstanceLifetimeMs: Math.max(...instanceAges),
    minInstanceLifetimeMs: Math.min(...instanceAges),
    avgRpcMs: rpcTimes.reduce((a, b) => a + b, 0) / rpcTimes.length,
    coldStartRate: totalDurationHours > 0 ? coldStarts / totalDurationHours : 0,
    doRecreationRate: totalDurationHours > 0 ? doRecreations / totalDurationHours : 0,
    moduleIds,
    instanceIds,
  }
}

/**
 * Print comparison report
 */
function printComparisonReport(heavyStats: EvictionStats, lightStats: EvictionStats): void {
  console.log('\n' + '='.repeat(80))
  console.log('MEMORY PRESSURE AND DO EVICTION CORRELATION REPORT')
  console.log('='.repeat(80))

  console.log('\n## Overview')
  console.log(`Heavy (PGLite WASM, ~64MB): ${heavyStats.totalSamples} samples`)
  console.log(`Light (DO SQLite, ~5MB): ${lightStats.totalSamples} samples`)

  console.log('\n## Eviction Events')
  console.log('')
  console.log('| Metric                | Heavy (PGLite) | Light (SQLite) | Difference |')
  console.log('|-----------------------|----------------|----------------|------------|')
  console.log(
    `| Cold starts           | ${String(heavyStats.coldStarts).padEnd(14)} | ${String(lightStats.coldStarts).padEnd(14)} | ${heavyStats.coldStarts - lightStats.coldStarts >= 0 ? '+' : ''}${heavyStats.coldStarts - lightStats.coldStarts} |`
  )
  console.log(
    `| DO recreations        | ${String(heavyStats.doRecreations).padEnd(14)} | ${String(lightStats.doRecreations).padEnd(14)} | ${heavyStats.doRecreations - lightStats.doRecreations >= 0 ? '+' : ''}${heavyStats.doRecreations - lightStats.doRecreations} |`
  )
  console.log(
    `| Unique module IDs     | ${String(heavyStats.moduleIds.length).padEnd(14)} | ${String(lightStats.moduleIds.length).padEnd(14)} | ${heavyStats.moduleIds.length - lightStats.moduleIds.length >= 0 ? '+' : ''}${heavyStats.moduleIds.length - lightStats.moduleIds.length} |`
  )
  console.log(
    `| Unique instance IDs   | ${String(heavyStats.instanceIds.length).padEnd(14)} | ${String(lightStats.instanceIds.length).padEnd(14)} | ${heavyStats.instanceIds.length - lightStats.instanceIds.length >= 0 ? '+' : ''}${heavyStats.instanceIds.length - lightStats.instanceIds.length} |`
  )

  console.log('\n## Module Lifetime (Isolate Persistence)')
  console.log('')
  console.log('| Metric                | Heavy (PGLite) | Light (SQLite) | Difference    |')
  console.log('|-----------------------|----------------|----------------|---------------|')
  console.log(
    `| Avg module age        | ${formatDuration(heavyStats.avgModuleLifetimeMs).padEnd(14)} | ${formatDuration(lightStats.avgModuleLifetimeMs).padEnd(14)} | ${formatDuration(Math.abs(heavyStats.avgModuleLifetimeMs - lightStats.avgModuleLifetimeMs))} |`
  )
  console.log(
    `| Max module age        | ${formatDuration(heavyStats.maxModuleLifetimeMs).padEnd(14)} | ${formatDuration(lightStats.maxModuleLifetimeMs).padEnd(14)} | ${formatDuration(Math.abs(heavyStats.maxModuleLifetimeMs - lightStats.maxModuleLifetimeMs))} |`
  )
  console.log(
    `| Min module age        | ${formatDuration(heavyStats.minModuleLifetimeMs).padEnd(14)} | ${formatDuration(lightStats.minModuleLifetimeMs).padEnd(14)} | ${formatDuration(Math.abs(heavyStats.minModuleLifetimeMs - lightStats.minModuleLifetimeMs))} |`
  )

  console.log('\n## Instance Lifetime (DO Persistence)')
  console.log('')
  console.log('| Metric                | Heavy (PGLite) | Light (SQLite) | Difference    |')
  console.log('|-----------------------|----------------|----------------|---------------|')
  console.log(
    `| Avg instance age      | ${formatDuration(heavyStats.avgInstanceLifetimeMs).padEnd(14)} | ${formatDuration(lightStats.avgInstanceLifetimeMs).padEnd(14)} | ${formatDuration(Math.abs(heavyStats.avgInstanceLifetimeMs - lightStats.avgInstanceLifetimeMs))} |`
  )
  console.log(
    `| Max instance age      | ${formatDuration(heavyStats.maxInstanceLifetimeMs).padEnd(14)} | ${formatDuration(lightStats.maxInstanceLifetimeMs).padEnd(14)} | ${formatDuration(Math.abs(heavyStats.maxInstanceLifetimeMs - lightStats.maxInstanceLifetimeMs))} |`
  )
  console.log(
    `| Min instance age      | ${formatDuration(heavyStats.minInstanceLifetimeMs).padEnd(14)} | ${formatDuration(lightStats.minInstanceLifetimeMs).padEnd(14)} | ${formatDuration(Math.abs(heavyStats.minInstanceLifetimeMs - lightStats.minInstanceLifetimeMs))} |`
  )

  console.log('\n## Eviction Rates (per hour)')
  console.log('')
  console.log('| Metric                | Heavy (PGLite) | Light (SQLite) | Ratio         |')
  console.log('|-----------------------|----------------|----------------|---------------|')
  console.log(
    `| Cold start rate       | ${heavyStats.coldStartRate.toFixed(2).padEnd(14)} | ${lightStats.coldStartRate.toFixed(2).padEnd(14)} | ${lightStats.coldStartRate > 0 ? (heavyStats.coldStartRate / lightStats.coldStartRate).toFixed(2) + 'x' : 'N/A'} |`
  )
  console.log(
    `| DO recreation rate    | ${heavyStats.doRecreationRate.toFixed(2).padEnd(14)} | ${lightStats.doRecreationRate.toFixed(2).padEnd(14)} | ${lightStats.doRecreationRate > 0 ? (heavyStats.doRecreationRate / lightStats.doRecreationRate).toFixed(2) + 'x' : 'N/A'} |`
  )

  console.log('\n## RPC Timing')
  console.log('')
  console.log('| Metric                | Heavy (PGLite) | Light (SQLite) | Difference    |')
  console.log('|-----------------------|----------------|----------------|---------------|')
  console.log(
    `| Avg RPC time          | ${heavyStats.avgRpcMs.toFixed(0).padEnd(12)}ms | ${lightStats.avgRpcMs.toFixed(0).padEnd(12)}ms | ${(heavyStats.avgRpcMs - lightStats.avgRpcMs >= 0 ? '+' : '') + (heavyStats.avgRpcMs - lightStats.avgRpcMs).toFixed(0)}ms |`
  )

  // Analysis
  console.log('\n## Analysis')

  const coldStartDiff = heavyStats.coldStarts - lightStats.coldStarts
  if (coldStartDiff > 0) {
    console.log(`\n[FINDING] Heavy service experienced ${coldStartDiff} MORE cold starts than light service.`)
    console.log('  This suggests memory pressure may be causing faster isolate eviction.')
  } else if (coldStartDiff < 0) {
    console.log(`\n[FINDING] Light service experienced ${-coldStartDiff} MORE cold starts than heavy service.`)
    console.log('  This is unexpected - memory usage does not appear to correlate with faster eviction.')
  } else {
    console.log('\n[FINDING] Both services experienced the same number of cold starts.')
    console.log('  No clear correlation between memory usage and eviction rate observed.')
  }

  const moduleLifetimeDiff = heavyStats.avgModuleLifetimeMs - lightStats.avgModuleLifetimeMs
  if (moduleLifetimeDiff < -60000) {
    // More than 1 minute shorter
    console.log(`\n[FINDING] Heavy service has shorter average module lifetime by ${formatDuration(-moduleLifetimeDiff)}.`)
    console.log('  This supports the hypothesis that memory pressure causes faster eviction.')
  } else if (moduleLifetimeDiff > 60000) {
    console.log(`\n[FINDING] Heavy service has LONGER average module lifetime by ${formatDuration(moduleLifetimeDiff)}.`)
    console.log('  This contradicts the hypothesis - memory pressure does not seem to cause faster eviction.')
  } else {
    console.log('\n[FINDING] Module lifetimes are similar (within 1 minute difference).')
    console.log('  No significant correlation between memory usage and isolate lifetime.')
  }

  console.log('\n' + '='.repeat(80))
}

describe('Memory Pressure and DO Eviction Correlation', () => {
  describe('Debug endpoint validation', () => {
    it('validates heavy service (postgres) debug endpoint', async () => {
      const debug = await fetchHeavyDebug()

      expect(debug.module).toBeDefined()
      expect(debug.module.id).toBeDefined()
      expect(typeof debug.module.ageMs).toBe('number')
      expect(debug.instance).toBeDefined()
      expect(debug.wasm).toBeDefined()
      expect(debug.wasm.initialized).toBe(true)
      expect(debug.timing).toBeDefined()

      console.log('Heavy service (PGLite WASM) debug validated:')
      console.log(`  Module ID: ${debug.module.id} (age: ${formatDuration(debug.module.ageMs)})`)
      console.log(`  Instance ID: ${debug.instance.id} (age: ${formatDuration(debug.instance.ageMs)})`)
      console.log(`  WASM initialized: ${debug.wasm.initialized}, reused: ${debug.wasm.reused}`)
      console.log(`  Expected memory: ~64MB (PGLite runtime)`)
    })

    it('validates light service (mongo) debug endpoint', async () => {
      const debug = await fetchLightDebug()

      expect(debug.module).toBeDefined()
      expect(debug.module.id).toBeDefined()
      expect(typeof debug.module.ageMs).toBe('number')
      expect(debug.instance).toBeDefined()
      expect(debug.wasm).toBeDefined()
      expect(debug.wasm.initialized).toBe(false)
      expect(debug.timing).toBeDefined()

      console.log('Light service (DO SQLite) debug validated:')
      console.log(`  Module ID: ${debug.module.id} (age: ${formatDuration(debug.module.ageMs)})`)
      console.log(`  Instance ID: ${debug.instance.id} (age: ${formatDuration(debug.instance.ageMs)})`)
      console.log(`  No WASM: ${debug.wasm.note}`)
      console.log(`  Expected memory: ~5MB (DO SQLite only)`)
    })
  })

  describe('Quick comparison (30 seconds)', () => {
    it('compares eviction patterns over 30 seconds', async () => {
      const intervalMs = 5000 // 5 seconds between samples
      const durationMs = 30000 // 30 seconds total

      // Collect samples from both services in parallel
      const [heavySamples, lightSamples] = await Promise.all([
        collectSamples('heavy', fetchHeavyDebug, intervalMs, durationMs),
        collectSamples('light', fetchLightDebug, intervalMs, durationMs),
      ])

      const heavyStats = calculateStats('heavy', heavySamples)
      const lightStats = calculateStats('light', lightSamples)

      printComparisonReport(heavyStats, lightStats)

      // Basic assertions - both services should respond
      expect(heavySamples.length).toBeGreaterThan(0)
      expect(lightSamples.length).toBeGreaterThan(0)
    }, 60000) // 60 second timeout
  })

  describe('Immediate burst comparison', () => {
    it('compares behavior under rapid sequential requests', async () => {
      const burstSize = 10
      const heavySamples: EvictionSample[] = []
      const lightSamples: EvictionSample[] = []
      const startTime = Date.now()

      let prevHeavyModuleId: string | null = null
      let prevHeavyInstanceId: string | null = null
      let prevLightModuleId: string | null = null
      let prevLightInstanceId: string | null = null

      console.log(`\nBurst test: ${burstSize} rapid sequential requests to each service`)

      for (let i = 0; i < burstSize; i++) {
        // Heavy service
        const heavyDebug = await fetchHeavyDebug()
        const heavyIsColdStart = prevHeavyModuleId !== null && heavyDebug.module.id !== prevHeavyModuleId
        const heavyIsDoRecreated = prevHeavyInstanceId !== null && heavyDebug.instance.id !== prevHeavyInstanceId && !heavyIsColdStart
        heavySamples.push({
          timestamp: Date.now(),
          elapsedMs: Date.now() - startTime,
          moduleId: heavyDebug.module.id,
          moduleAgeMs: heavyDebug.module.ageMs,
          instanceId: heavyDebug.instance.id,
          instanceAgeMs: heavyDebug.instance.ageMs,
          requestCount: heavyDebug.module.requestCount,
          rpcMs: heavyDebug.timing.rpcMs,
          isColdStart: heavyIsColdStart,
          isDoRecreated: heavyIsDoRecreated,
        })
        prevHeavyModuleId = heavyDebug.module.id
        prevHeavyInstanceId = heavyDebug.instance.id

        // Light service
        const lightDebug = await fetchLightDebug()
        const lightIsColdStart = prevLightModuleId !== null && lightDebug.module.id !== prevLightModuleId
        const lightIsDoRecreated = prevLightInstanceId !== null && lightDebug.instance.id !== prevLightInstanceId && !lightIsColdStart
        lightSamples.push({
          timestamp: Date.now(),
          elapsedMs: Date.now() - startTime,
          moduleId: lightDebug.module.id,
          moduleAgeMs: lightDebug.module.ageMs,
          instanceId: lightDebug.instance.id,
          instanceAgeMs: lightDebug.instance.ageMs,
          requestCount: lightDebug.module.requestCount,
          rpcMs: lightDebug.timing.rpcMs,
          isColdStart: lightIsColdStart,
          isDoRecreated: lightIsDoRecreated,
        })
        prevLightModuleId = lightDebug.module.id
        prevLightInstanceId = lightDebug.instance.id
      }

      // Calculate stats
      const heavyModuleIds = [...new Set(heavySamples.map((s) => s.moduleId))]
      const lightModuleIds = [...new Set(lightSamples.map((s) => s.moduleId))]
      const heavyRpcAvg = heavySamples.reduce((a, b) => a + b.rpcMs, 0) / heavySamples.length
      const lightRpcAvg = lightSamples.reduce((a, b) => a + b.rpcMs, 0) / lightSamples.length

      console.log('\n## Burst Test Results')
      console.log('')
      console.log('| Metric              | Heavy (PGLite) | Light (SQLite) |')
      console.log('|---------------------|----------------|----------------|')
      console.log(`| Samples collected   | ${String(heavySamples.length).padEnd(14)} | ${String(lightSamples.length).padEnd(14)} |`)
      console.log(`| Unique module IDs   | ${String(heavyModuleIds.length).padEnd(14)} | ${String(lightModuleIds.length).padEnd(14)} |`)
      console.log(`| Cold starts         | ${String(heavySamples.filter((s) => s.isColdStart).length).padEnd(14)} | ${String(lightSamples.filter((s) => s.isColdStart).length).padEnd(14)} |`)
      console.log(`| Avg RPC time        | ${(heavyRpcAvg.toFixed(0) + 'ms').padEnd(14)} | ${(lightRpcAvg.toFixed(0) + 'ms').padEnd(14)} |`)

      // Assertions
      expect(heavySamples.length).toBe(burstSize)
      expect(lightSamples.length).toBe(burstSize)

      // Under burst load, we expect modules to stay stable (no cold starts)
      expect(heavyModuleIds.length).toBe(1)
      expect(lightModuleIds.length).toBe(1)
    }, 30000)
  })
})

/**
 * Long-running tests for detailed eviction pattern analysis
 * These tests are skipped by default. Run with INCLUDE_LONG_TESTS=1
 */
describe.skipIf(!INCLUDE_LONG_TESTS)('Extended eviction analysis (long-running)', () => {
  it('compares eviction patterns over 2 minutes', async () => {
    const intervalMs = 5000 // 5 seconds between samples
    const durationMs = 120000 // 2 minutes total

    const [heavySamples, lightSamples] = await Promise.all([
      collectSamples('heavy', fetchHeavyDebug, intervalMs, durationMs),
      collectSamples('light', fetchLightDebug, intervalMs, durationMs),
    ])

    const heavyStats = calculateStats('heavy', heavySamples)
    const lightStats = calculateStats('light', lightSamples)

    printComparisonReport(heavyStats, lightStats)

    expect(heavySamples.length).toBeGreaterThan(20)
    expect(lightSamples.length).toBeGreaterThan(20)
  }, 180000) // 3 minute timeout

  it('compares eviction patterns over 5 minutes', async () => {
    const intervalMs = 10000 // 10 seconds between samples
    const durationMs = 300000 // 5 minutes total

    const [heavySamples, lightSamples] = await Promise.all([
      collectSamples('heavy', fetchHeavyDebug, intervalMs, durationMs),
      collectSamples('light', fetchLightDebug, intervalMs, durationMs),
    ])

    const heavyStats = calculateStats('heavy', heavySamples)
    const lightStats = calculateStats('light', lightSamples)

    printComparisonReport(heavyStats, lightStats)

    // Export raw data for further analysis
    console.log('\n## Raw Sample Data (First 5 from each)')
    console.log('\nHeavy samples:')
    for (const sample of heavySamples.slice(0, 5)) {
      console.log(`  ${formatDuration(sample.elapsedMs)}: module=${sample.moduleId.slice(0, 8)}, age=${formatDuration(sample.moduleAgeMs)}, rpc=${sample.rpcMs}ms`)
    }
    console.log('\nLight samples:')
    for (const sample of lightSamples.slice(0, 5)) {
      console.log(`  ${formatDuration(sample.elapsedMs)}: module=${sample.moduleId.slice(0, 8)}, age=${formatDuration(sample.moduleAgeMs)}, rpc=${sample.rpcMs}ms`)
    }

    expect(heavySamples.length).toBeGreaterThan(25)
    expect(lightSamples.length).toBeGreaterThan(25)
  }, 360000) // 6 minute timeout

  it('tracks eviction patterns with idle gaps', async () => {
    // Test hypothesis: DOs with higher memory may be evicted faster during idle periods
    const samples: Array<{
      phase: string
      heavy: EvictionSample
      light: EvictionSample
    }> = []

    console.log('\n## Idle Gap Test')
    console.log('Testing whether memory pressure causes faster eviction during idle periods')

    // Phase 1: Initial requests to warm up
    console.log('\nPhase 1: Warming up both services')
    const heavyWarm = await fetchHeavyDebug()
    const lightWarm = await fetchLightDebug()
    samples.push({
      phase: 'warmup',
      heavy: {
        timestamp: Date.now(),
        elapsedMs: 0,
        moduleId: heavyWarm.module.id,
        moduleAgeMs: heavyWarm.module.ageMs,
        instanceId: heavyWarm.instance.id,
        instanceAgeMs: heavyWarm.instance.ageMs,
        requestCount: heavyWarm.module.requestCount,
        rpcMs: heavyWarm.timing.rpcMs,
        isColdStart: false,
        isDoRecreated: false,
      },
      light: {
        timestamp: Date.now(),
        elapsedMs: 0,
        moduleId: lightWarm.module.id,
        moduleAgeMs: lightWarm.module.ageMs,
        instanceId: lightWarm.instance.id,
        instanceAgeMs: lightWarm.instance.ageMs,
        requestCount: lightWarm.module.requestCount,
        rpcMs: lightWarm.timing.rpcMs,
        isColdStart: false,
        isDoRecreated: false,
      },
    })

    // Phase 2-4: Idle gaps followed by requests
    const idleGaps = [30000, 60000, 90000] // 30s, 60s, 90s idle

    for (const gapMs of idleGaps) {
      console.log(`\nWaiting ${formatDuration(gapMs)} (idle gap)...`)
      await wait(gapMs)

      const heavyAfter = await fetchHeavyDebug()
      const lightAfter = await fetchLightDebug()
      const prevHeavy = samples[samples.length - 1].heavy
      const prevLight = samples[samples.length - 1].light

      const heavyColdStart = heavyAfter.module.id !== prevHeavy.moduleId
      const lightColdStart = lightAfter.module.id !== prevLight.moduleId

      samples.push({
        phase: `after-${gapMs / 1000}s`,
        heavy: {
          timestamp: Date.now(),
          elapsedMs: Date.now() - samples[0].heavy.timestamp,
          moduleId: heavyAfter.module.id,
          moduleAgeMs: heavyAfter.module.ageMs,
          instanceId: heavyAfter.instance.id,
          instanceAgeMs: heavyAfter.instance.ageMs,
          requestCount: heavyAfter.module.requestCount,
          rpcMs: heavyAfter.timing.rpcMs,
          isColdStart: heavyColdStart,
          isDoRecreated: false,
        },
        light: {
          timestamp: Date.now(),
          elapsedMs: Date.now() - samples[0].light.timestamp,
          moduleId: lightAfter.module.id,
          moduleAgeMs: lightAfter.module.ageMs,
          instanceId: lightAfter.instance.id,
          instanceAgeMs: lightAfter.instance.ageMs,
          requestCount: lightAfter.module.requestCount,
          rpcMs: lightAfter.timing.rpcMs,
          isColdStart: lightColdStart,
          isDoRecreated: false,
        },
      })

      if (heavyColdStart) {
        console.log(`  Heavy: COLD START after ${formatDuration(gapMs)} idle`)
      } else {
        console.log(`  Heavy: Module survived ${formatDuration(gapMs)} idle (age: ${formatDuration(heavyAfter.module.ageMs)})`)
      }
      if (lightColdStart) {
        console.log(`  Light: COLD START after ${formatDuration(gapMs)} idle`)
      } else {
        console.log(`  Light: Module survived ${formatDuration(gapMs)} idle (age: ${formatDuration(lightAfter.module.ageMs)})`)
      }
    }

    // Summary
    console.log('\n## Idle Gap Summary')
    console.log('')
    console.log('| Phase        | Heavy Cold Start | Light Cold Start | Heavy Module Age | Light Module Age |')
    console.log('|--------------|------------------|------------------|------------------|------------------|')
    for (const sample of samples) {
      console.log(
        `| ${sample.phase.padEnd(12)} | ${String(sample.heavy.isColdStart).padEnd(16)} | ${String(sample.light.isColdStart).padEnd(16)} | ${formatDuration(sample.heavy.moduleAgeMs).padEnd(16)} | ${formatDuration(sample.light.moduleAgeMs).padEnd(16)} |`
      )
    }

    const heavyColdStarts = samples.filter((s) => s.heavy.isColdStart).length
    const lightColdStarts = samples.filter((s) => s.light.isColdStart).length

    console.log(`\nTotal cold starts - Heavy: ${heavyColdStarts}, Light: ${lightColdStarts}`)

    if (heavyColdStarts > lightColdStarts) {
      console.log('\n[FINDING] Heavy service (PGLite WASM) had more cold starts during idle gaps.')
      console.log('  This supports the hypothesis that memory pressure causes faster eviction.')
    } else if (lightColdStarts > heavyColdStarts) {
      console.log('\n[FINDING] Light service (DO SQLite) had more cold starts during idle gaps.')
      console.log('  This contradicts the hypothesis.')
    } else {
      console.log('\n[FINDING] Both services had the same number of cold starts.')
      console.log('  No clear correlation between memory usage and idle eviction.')
    }

    expect(samples.length).toBe(4)
  }, 300000) // 5 minute timeout
})

/**
 * Statistical analysis tests
 */
describe('Statistical analysis helpers', () => {
  it('exports sample data format for external analysis', async () => {
    // Collect a small sample for format verification
    const heavyDebug = await fetchHeavyDebug()
    const lightDebug = await fetchLightDebug()

    const sampleFormat = {
      timestamp: new Date().toISOString(),
      services: {
        heavy: {
          endpoint: HEAVY_URL,
          memoryEstimate: '~64MB',
          hasWasm: true,
          sample: {
            moduleId: heavyDebug.module.id,
            moduleAgeMs: heavyDebug.module.ageMs,
            instanceId: heavyDebug.instance.id,
            instanceAgeMs: heavyDebug.instance.ageMs,
            wasmReused: heavyDebug.wasm.reused,
            rpcMs: heavyDebug.timing.rpcMs,
          },
        },
        light: {
          endpoint: LIGHT_URL,
          memoryEstimate: '~5MB',
          hasWasm: false,
          sample: {
            moduleId: lightDebug.module.id,
            moduleAgeMs: lightDebug.module.ageMs,
            instanceId: lightDebug.instance.id,
            instanceAgeMs: lightDebug.instance.ageMs,
            rpcMs: lightDebug.timing.rpcMs,
          },
        },
      },
    }

    console.log('\n## Sample Data Format (for external analysis)')
    console.log(JSON.stringify(sampleFormat, null, 2))

    expect(sampleFormat.services.heavy.hasWasm).toBe(true)
    expect(sampleFormat.services.light.hasWasm).toBe(false)
  })
})
