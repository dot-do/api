#!/usr/bin/env node

/**
 * Compute Worker POC Benchmark Script
 *
 * Compares the two architectures:
 * 1. New: State DO (no WASM) + Compute Worker (WASM)
 * 2. Traditional: WASM inside DO
 *
 * Measures:
 * - Cold start time
 * - Hot query latency
 * - Write path performance
 * - Throughput
 */

const ROUTER_URL = process.env.ROUTER_URL || 'https://compute-worker-poc-router.dotdo.workers.dev'

const TEST_QUERIES = [
  { name: 'simple', sql: 'SELECT 1+1 as result' },
  { name: 'now', sql: 'SELECT NOW() as time' },
  { name: 'version', sql: 'SELECT version()' },
]

async function runBenchmark(name, url, body) {
  const start = performance.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const end = performance.now()
    const data = await response.json()

    return {
      name,
      success: true,
      e2eMs: end - start,
      data,
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error.message,
      e2eMs: performance.now() - start,
    }
  }
}

async function warmUpEndpoint(url, body) {
  for (let i = 0; i < 3; i++) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // Ignore warmup errors
    }
    await new Promise((r) => setTimeout(r, 100))
  }
}

async function runColdStartBenchmark(iterations = 5) {
  console.log('\n=== Cold Start Benchmark ===\n')
  console.log(`Running ${iterations} cold start tests...\n`)

  const newTimes = []
  const tradTimes = []

  for (let i = 0; i < iterations; i++) {
    process.stdout.write(`  Iteration ${i + 1}/${iterations}...`)

    const result = await runBenchmark(
      `cold-${i}`,
      `${ROUTER_URL}/benchmark/cold-start`,
      { sql: 'SELECT 1+1 as result' }
    )

    if (result.success && result.data.results) {
      newTimes.push(result.data.results.new.e2eMs)
      tradTimes.push(result.data.results.traditional.e2eMs)
      console.log(
        ` New: ${result.data.results.new.e2eMs.toFixed(0)}ms, ` +
          `Traditional: ${result.data.results.traditional.e2eMs.toFixed(0)}ms`
      )
    } else {
      console.log(' Error:', result.error || result.data?.error)
    }

    // Wait between iterations
    await new Promise((r) => setTimeout(r, 500))
  }

  if (newTimes.length > 0) {
    const stats = (times) => {
      const sorted = [...times].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
      }
    }

    const newStats = stats(newTimes)
    const tradStats = stats(tradTimes)

    console.log('\nCold Start Results:')
    console.log('┌───────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐')
    console.log('│ Architecture          │ Min (ms)    │ Avg (ms)    │ P50 (ms)    │ Max (ms)    │')
    console.log('├───────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤')
    console.log(
      `│ New (DO + Worker)     │ ${newStats.min.toFixed(0).padStart(11)} │ ${newStats.avg.toFixed(0).padStart(11)} │ ${newStats.p50.toFixed(0).padStart(11)} │ ${newStats.max.toFixed(0).padStart(11)} │`
    )
    console.log(
      `│ Traditional (WASM DO) │ ${tradStats.min.toFixed(0).padStart(11)} │ ${tradStats.avg.toFixed(0).padStart(11)} │ ${tradStats.p50.toFixed(0).padStart(11)} │ ${tradStats.max.toFixed(0).padStart(11)} │`
    )
    console.log('└───────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘')

    const speedup = tradStats.avg / newStats.avg
    const savings = tradStats.avg - newStats.avg
    console.log(`\n  Speedup: ${speedup.toFixed(2)}x faster cold start`)
    console.log(`  Savings: ${savings.toFixed(0)}ms saved per cold start`)
  }

  return { newTimes, tradTimes }
}

async function runHotQueryBenchmark(iterations = 20) {
  console.log('\n=== Hot Query Benchmark ===\n')
  console.log('Warming up endpoints...')

  // Warm up
  await warmUpEndpoint(`${ROUTER_URL}/new/query`, { sql: 'SELECT 1' })
  await warmUpEndpoint(`${ROUTER_URL}/traditional/query`, { sql: 'SELECT 1' })

  console.log(`Running ${iterations} hot query tests...\n`)

  const newTimes = []
  const tradTimes = []

  for (let i = 0; i < iterations; i++) {
    // Test new architecture
    const newStart = performance.now()
    await fetch(`${ROUTER_URL}/new/timing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1+1 as result' }),
    })
    newTimes.push(performance.now() - newStart)

    // Test traditional architecture
    const tradStart = performance.now()
    await fetch(`${ROUTER_URL}/traditional/timing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1+1 as result' }),
    })
    tradTimes.push(performance.now() - tradStart)

    process.stdout.write('.')
    await new Promise((r) => setTimeout(r, 50))
  }
  console.log('\n')

  const stats = (times) => {
    const sorted = [...times].sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  const newStats = stats(newTimes)
  const tradStats = stats(tradTimes)

  console.log('Hot Query Results:')
  console.log('┌───────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐')
  console.log('│ Architecture          │ Min     │ Avg     │ P50     │ P95     │ P99     │ Max     │')
  console.log('├───────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤')
  console.log(
    `│ New (DO + Worker)     │ ${newStats.min.toFixed(0).padStart(7)} │ ${newStats.avg.toFixed(0).padStart(7)} │ ${newStats.p50.toFixed(0).padStart(7)} │ ${newStats.p95.toFixed(0).padStart(7)} │ ${newStats.p99.toFixed(0).padStart(7)} │ ${newStats.max.toFixed(0).padStart(7)} │`
  )
  console.log(
    `│ Traditional (WASM DO) │ ${tradStats.min.toFixed(0).padStart(7)} │ ${tradStats.avg.toFixed(0).padStart(7)} │ ${tradStats.p50.toFixed(0).padStart(7)} │ ${tradStats.p95.toFixed(0).padStart(7)} │ ${tradStats.p99.toFixed(0).padStart(7)} │ ${tradStats.max.toFixed(0).padStart(7)} │`
  )
  console.log('└───────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘')

  const overhead = newStats.avg - tradStats.avg
  console.log(`\n  RPC Overhead: ${overhead.toFixed(0)}ms (new arch has extra hop to Compute Worker)`)

  return { newStats, tradStats }
}

async function runWriteBenchmark(iterations = 10) {
  console.log('\n=== Write Benchmark ===\n')
  console.log('Warming up endpoints...')

  // Warm up
  await warmUpEndpoint(`${ROUTER_URL}/new/query`, { sql: 'SELECT 1' })
  await warmUpEndpoint(`${ROUTER_URL}/traditional/query`, { sql: 'SELECT 1' })

  console.log(`Running ${iterations} write tests...\n`)

  const newTimes = []
  const tradTimes = []

  for (let i = 0; i < iterations; i++) {
    const sql = `SELECT ${i + 1} as write_test`

    // Test new architecture write
    const result = await runBenchmark(`write-${i}`, `${ROUTER_URL}/benchmark/write`, { sql })

    if (result.success && result.data.results) {
      newTimes.push(result.data.results.new.e2eMs)
      tradTimes.push(result.data.results.traditional.e2eMs)
    }

    process.stdout.write('.')
    await new Promise((r) => setTimeout(r, 100))
  }
  console.log('\n')

  if (newTimes.length > 0) {
    const stats = (times) => {
      const sorted = [...times].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
      }
    }

    const newStats = stats(newTimes)
    const tradStats = stats(tradTimes)

    console.log('Write Results:')
    console.log('┌───────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐')
    console.log('│ Architecture          │ Min (ms)    │ Avg (ms)    │ P50 (ms)    │ Max (ms)    │')
    console.log('├───────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤')
    console.log(
      `│ New (DO + Worker)     │ ${newStats.min.toFixed(0).padStart(11)} │ ${newStats.avg.toFixed(0).padStart(11)} │ ${newStats.p50.toFixed(0).padStart(11)} │ ${newStats.max.toFixed(0).padStart(11)} │`
    )
    console.log(
      `│ Traditional (WASM DO) │ ${tradStats.min.toFixed(0).padStart(11)} │ ${tradStats.avg.toFixed(0).padStart(11)} │ ${tradStats.p50.toFixed(0).padStart(11)} │ ${tradStats.max.toFixed(0).padStart(11)} │`
    )
    console.log('└───────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘')

    const overhead = newStats.avg - tradStats.avg
    console.log(`\n  Write Overhead: ${overhead.toFixed(0)}ms (new arch has RPC + DO persist)`)
  }

  return { newTimes, tradTimes }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║     Compute Worker POC Benchmark                                 ║')
  console.log('║     Stateful DO + Stateless Compute Worker vs Traditional DO     ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log(`\nRouter URL: ${ROUTER_URL}`)

  // Check connectivity
  console.log('\nChecking connectivity...')
  try {
    const ping = await fetch(`${ROUTER_URL}/ping`)
    if (!ping.ok) {
      throw new Error('Router not responding')
    }
    console.log('Router is responding!')

    // Check individual workers
    const computeStatus = await fetch(`${ROUTER_URL}/compute/status`)
    if (computeStatus.ok) {
      const data = await computeStatus.json()
      console.log(`Compute Worker: ${data.workerId} (age: ${data.workerAgeMs}ms)`)
    }
  } catch (error) {
    console.error(`\nError: Cannot connect to router. Make sure workers are deployed.`)
    console.error(`  npm run deploy:all`)
    process.exit(1)
  }

  // Run benchmarks
  const coldResults = await runColdStartBenchmark(5)
  const hotResults = await runHotQueryBenchmark(20)
  const writeResults = await runWriteBenchmark(10)

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                           SUMMARY                                ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')

  if (coldResults.newTimes.length > 0 && coldResults.tradTimes.length > 0) {
    const coldAvgNew = coldResults.newTimes.reduce((a, b) => a + b, 0) / coldResults.newTimes.length
    const coldAvgTrad = coldResults.tradTimes.reduce((a, b) => a + b, 0) / coldResults.tradTimes.length
    const coldSpeedup = coldAvgTrad / coldAvgNew
    const coldSavings = coldAvgTrad - coldAvgNew

    console.log('\nCold Start:')
    console.log(`  New Architecture:    ${coldAvgNew.toFixed(0)}ms average`)
    console.log(`  Traditional:         ${coldAvgTrad.toFixed(0)}ms average`)
    console.log(`  Speedup:             ${coldSpeedup.toFixed(2)}x faster`)
    console.log(`  Savings:             ${coldSavings.toFixed(0)}ms per cold start`)
  }

  console.log('\nHot Query:')
  console.log(`  New Architecture:    ${hotResults.newStats.avg.toFixed(0)}ms average`)
  console.log(`  Traditional:         ${hotResults.tradStats.avg.toFixed(0)}ms average`)
  console.log(`  RPC Overhead:        ${(hotResults.newStats.avg - hotResults.tradStats.avg).toFixed(0)}ms`)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                         KEY FINDINGS                             ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')

  const coldSpeedup =
    coldResults.tradTimes.length > 0
      ? (
          coldResults.tradTimes.reduce((a, b) => a + b, 0) /
          coldResults.tradTimes.length /
          (coldResults.newTimes.reduce((a, b) => a + b, 0) / coldResults.newTimes.length)
        ).toFixed(2)
      : 'N/A'

  const rpcOverhead = (hotResults.newStats.avg - hotResults.tradStats.avg).toFixed(0)

  console.log(`
1. Cold Start Improvement: ${coldSpeedup}x faster
   - New arch has instant DO cold start (no WASM to load)
   - WASM loading happens in Compute Worker (stays warm)

2. RPC Overhead: ${rpcOverhead}ms per request
   - New arch adds a hop: DO -> Compute Worker -> DO
   - This is the cost of the new architecture for hot queries

3. Trade-off Analysis:
   - If you have ${rpcOverhead}ms RPC overhead and ${coldSpeedup}x cold start speedup
   - The new architecture pays off when cold starts are frequent
   - Break-even: ~${Math.round(parseInt(rpcOverhead) / (parseFloat(coldSpeedup) - 1))} hot queries per cold start

4. Recommendation:
   - Use new architecture if cold starts are frequent (multi-tenant, many DOs)
   - Use traditional if hot query latency is critical (single long-lived DO)
`)
}

main().catch(console.error)
