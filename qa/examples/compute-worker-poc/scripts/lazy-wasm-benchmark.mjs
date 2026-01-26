#!/usr/bin/env node
/**
 * Lazy WASM DO Benchmark
 *
 * IMPORTANT: This benchmark demonstrates that lazy WASM loading
 * DOES NOT work in Cloudflare Workers due to security restrictions
 * on runtime WASM compilation.
 *
 * The benchmark will show:
 * 1. Fast cold starts (delegates to compute worker) - WORKS
 * 2. Background WASM loading from R2/Cache - FAILS
 * 3. Transition to local execution - NEVER HAPPENS
 * 4. All requests continue delegating - PERMANENT FALLBACK
 *
 * For a WORKING alternative, use the Hybrid DO architecture.
 * See hybrid-do.ts and benchmark with: npm run benchmark
 *
 * Usage:
 *   node scripts/lazy-wasm-benchmark.mjs [--local]
 *
 * Options:
 *   --local    Use local dev server instead of production
 */

const args = process.argv.slice(2)
const useLocal = args.includes('--local')

// Base URLs
const BASE_URL = useLocal
  ? 'http://localhost:8787'
  : 'https://compute-worker-poc-lazy-wasm.dotdo.workers.dev'

// Test SQL queries
const SIMPLE_QUERY = 'SELECT 1+1 as result'
const COMPLEX_QUERY = `
  SELECT
    generate_series as id,
    'row_' || generate_series as name,
    random() as value
  FROM generate_series(1, 100)
`

function formatMs(ms) {
  return `${ms.toFixed(2)}ms`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTiming(url, options = {}) {
  const start = performance.now()
  const response = await fetch(url, options)
  const e2eMs = performance.now() - start
  const data = await response.json()
  return { data, e2eMs, status: response.status }
}

async function runQuery(tenantId, sql, label = '') {
  const url = `${BASE_URL}/timing`
  const result = await fetchWithTiming(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    },
    body: JSON.stringify({ sql }),
  })

  return {
    label,
    ...result,
  }
}

async function getStatus(tenantId) {
  const url = `${BASE_URL}/status`
  const result = await fetchWithTiming(url, {
    headers: { 'X-Tenant-Id': tenantId },
  })
  return result.data
}

async function forceWasmLoad(tenantId) {
  const url = `${BASE_URL}/force-load`
  const result = await fetchWithTiming(url, {
    method: 'POST',
    headers: { 'X-Tenant-Id': tenantId },
  })
  return result
}

async function runColdStartBenchmark(tenantId) {
  console.log('\n=== Cold Start Benchmark ===')
  console.log(`Testing cold start behavior for tenant: ${tenantId}`)
  console.log('Expected: First requests delegate to compute worker, then switch to local\n')

  const results = []

  for (let i = 1; i <= 10; i++) {
    const result = await runQuery(tenantId, SIMPLE_QUERY, `Request ${i}`)

    const wasDelegated = result.data.wasDelegated
    const wasmStatus = result.data.wasmStatus
    const executionPath = wasDelegated ? 'DELEGATED' : 'LOCAL'

    results.push({
      request: i,
      e2eMs: result.e2eMs,
      wasDelegated,
      wasmStatus,
      totalMs: result.data.doTimings?.totalMs || 0,
    })

    console.log(
      `  Request ${i}: ${formatMs(result.e2eMs)} [${executionPath}] - WASM: ${wasmStatus}`
    )

    // Small delay between requests
    if (i < 10) {
      await sleep(100)
    }
  }

  // Summary
  console.log('\n  Summary:')
  const delegated = results.filter(r => r.wasDelegated)
  const local = results.filter(r => !r.wasDelegated)

  if (delegated.length > 0) {
    const avgDelegated = delegated.reduce((a, b) => a + b.e2eMs, 0) / delegated.length
    console.log(`    Delegated requests: ${delegated.length}, avg: ${formatMs(avgDelegated)}`)
  }
  if (local.length > 0) {
    const avgLocal = local.reduce((a, b) => a + b.e2eMs, 0) / local.length
    console.log(`    Local requests: ${local.length}, avg: ${formatMs(avgLocal)}`)
  }

  // When did it switch to local?
  const firstLocal = results.findIndex(r => !r.wasDelegated)
  if (firstLocal >= 0) {
    console.log(`    Switched to local execution at request: ${firstLocal + 1}`)
  }

  return results
}

async function runWasmLoadTimingBenchmark(tenantId) {
  console.log('\n=== WASM Load Timing Benchmark ===')
  console.log(`Testing WASM loading time for tenant: ${tenantId}`)
  console.log('This forces WASM load and measures the time\n')

  const result = await forceWasmLoad(tenantId)

  if (result.data.wasAlreadyLoaded) {
    console.log('  WASM was already loaded')
  } else {
    console.log(`  WASM load time: ${formatMs(result.data.forcedLoadDurationMs || 0)}`)
  }

  if (result.data.wasmLoadTimings) {
    const t = result.data.wasmLoadTimings
    console.log('  Load breakdown:')
    if (t.cacheCheckMs) console.log(`    Cache check: ${formatMs(t.cacheCheckMs)}`)
    if (t.r2FetchMs) console.log(`    R2 fetch: ${formatMs(t.r2FetchMs)}`)
    if (t.dataFetchMs) console.log(`    Data buffer: ${formatMs(t.dataFetchMs)}`)
    if (t.compileMs) console.log(`    WASM compile: ${formatMs(t.compileMs)}`)
    if (t.initMs) console.log(`    PGLite init: ${formatMs(t.initMs)}`)
    if (t.totalMs) console.log(`    Total: ${formatMs(t.totalMs)}`)
  }

  return result
}

async function runHotQueryBenchmark(tenantId, iterations = 10) {
  console.log('\n=== Hot Query Benchmark ===')
  console.log(`Testing hot query performance for tenant: ${tenantId}`)
  console.log(`Running ${iterations} queries after warmup\n`)

  // Ensure WASM is loaded
  await forceWasmLoad(tenantId)
  await sleep(500)

  const results = []

  for (let i = 1; i <= iterations; i++) {
    const result = await runQuery(tenantId, SIMPLE_QUERY, `Hot query ${i}`)
    results.push({
      request: i,
      e2eMs: result.e2eMs,
      localQueryMs: result.data.doTimings?.localQueryMs || 0,
    })

    // No delay for hot queries - we want rapid fire
  }

  // Summary
  const avgE2e = results.reduce((a, b) => a + b.e2eMs, 0) / results.length
  const avgLocal = results.reduce((a, b) => a + b.localQueryMs, 0) / results.length
  const minE2e = Math.min(...results.map(r => r.e2eMs))
  const maxE2e = Math.max(...results.map(r => r.e2eMs))

  console.log('  Results:')
  console.log(`    Avg E2E: ${formatMs(avgE2e)}`)
  console.log(`    Avg local query: ${formatMs(avgLocal)}`)
  console.log(`    Min/Max E2E: ${formatMs(minE2e)} / ${formatMs(maxE2e)}`)

  return results
}

async function runComparisonBenchmark(tenantId) {
  console.log('\n=== Comparison: Delegated vs Local Execution ===')
  console.log('Comparing query execution times between paths\n')

  // First, run a query when cold (delegated)
  const coldTenantId = `comparison-cold-${Date.now()}`
  const coldResult = await runQuery(coldTenantId, SIMPLE_QUERY, 'Cold (delegated)')
  console.log(`  Cold (delegated): ${formatMs(coldResult.e2eMs)}`)
  if (coldResult.data.computeWorkerTimings) {
    console.log(`    - Compute worker execution: ${formatMs(coldResult.data.computeWorkerTimings.executionMs)}`)
    console.log(`    - RPC overhead: ${formatMs(coldResult.data.doTimings?.rpcCallMs || 0)}`)
  }

  // Wait for WASM to load
  await forceWasmLoad(coldTenantId)
  await sleep(500)

  // Now run a query when hot (local)
  const hotResult = await runQuery(coldTenantId, SIMPLE_QUERY, 'Hot (local)')
  console.log(`  Hot (local): ${formatMs(hotResult.e2eMs)}`)
  if (hotResult.data.doTimings?.localQueryMs) {
    console.log(`    - Local query execution: ${formatMs(hotResult.data.doTimings.localQueryMs)}`)
  }

  // Calculate savings
  const savings = coldResult.e2eMs - hotResult.e2eMs
  const savingsPercent = (savings / coldResult.e2eMs) * 100
  console.log(`\n  Hot path is ${formatMs(savings)} faster (${savingsPercent.toFixed(1)}% improvement)`)
}

async function main() {
  console.log('=== Lazy WASM DO Benchmark ===')
  console.log(`Base URL: ${BASE_URL}`)
  console.log()

  // Check if service is reachable
  try {
    const pingResult = await fetchWithTiming(`${BASE_URL}/ping`)
    if (!pingResult.data.ok) {
      throw new Error('Ping failed')
    }
    console.log(`Service is reachable (ping: ${formatMs(pingResult.e2eMs)})`)
  } catch (error) {
    console.error('Error: Could not reach service')
    console.error(`Make sure the lazy WASM worker is deployed or running locally`)
    console.error(`URL: ${BASE_URL}`)
    process.exit(1)
  }

  // Generate unique tenant ID for this benchmark run
  const baseTenantId = `benchmark-${Date.now()}`

  // Run benchmarks
  await runColdStartBenchmark(`${baseTenantId}-cold`)
  await runWasmLoadTimingBenchmark(`${baseTenantId}-timing`)
  await runHotQueryBenchmark(`${baseTenantId}-hot`)
  await runComparisonBenchmark(`${baseTenantId}-compare`)

  // Final status
  console.log('\n=== Final Status ===')
  const status = await getStatus(`${baseTenantId}-cold`)
  console.log(`  WASM Status: ${status.wasmStatus?.state || 'unknown'}`)
  console.log(`  Delegated requests: ${status.requestRouting?.delegatedCount || 0}`)
  console.log(`  Local executions: ${status.requestRouting?.localExecutionCount || 0}`)

  console.log('\n=== Benchmark Complete ===')
}

main().catch(error => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})
