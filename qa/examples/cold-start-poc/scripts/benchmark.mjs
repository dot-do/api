#!/usr/bin/env node

/**
 * Cold Start Benchmark Script
 *
 * Measures and compares cold start times across different approaches:
 * 1. Direct DO access (baseline)
 * 2. Factory service binding (RPC)
 * 3. Forced cold starts for both
 */

const FACTORY_URL = process.env.FACTORY_URL || 'https://cold-start-factory.dotdo.workers.dev'
const CONSUMER_URL = process.env.CONSUMER_URL || 'https://cold-start-consumer.dotdo.workers.dev'
const WARM_PROXY_URL = process.env.WARM_PROXY_URL || 'https://cold-start-warm-proxy.dotdo.workers.dev'

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
      coldStart: data.coldStart,
      workerTimings: data.workerTimings,
      doTimings: data.doTimings,
      initializationTiming: data.initializationTiming,
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
  // Make a few requests to warm up the endpoint
  for (let i = 0; i < 3; i++) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await new Promise((r) => setTimeout(r, 100))
  }
}

async function runColdStartComparison() {
  console.log('\n=== Cold Start Comparison ===\n')

  const sql = TEST_QUERIES[0].sql

  // Test 1: Forced cold start via factory
  console.log('1. Forced cold start via factory...')
  const factoryCold = await runBenchmark('factory-cold', `${FACTORY_URL}/cold-start`, { sql })
  console.log(`   E2E: ${factoryCold.e2eMs.toFixed(2)}ms`)
  if (factoryCold.initializationTiming) {
    console.log(`   WASM init: ${factoryCold.initializationTiming.totalMs?.toFixed(2)}ms`)
  }

  // Wait a bit
  await new Promise((r) => setTimeout(r, 500))

  // Test 2: Forced cold start via consumer (direct)
  console.log('\n2. Forced cold start via consumer (direct)...')
  const directCold = await runBenchmark('direct-cold', `${CONSUMER_URL}/cold-direct`, { sql })
  console.log(`   E2E: ${directCold.e2eMs.toFixed(2)}ms`)
  if (directCold.initializationTiming) {
    console.log(`   WASM init: ${directCold.initializationTiming.totalMs?.toFixed(2)}ms`)
  }

  // Wait a bit
  await new Promise((r) => setTimeout(r, 500))

  // Test 3: Warm factory query
  console.log('\n3. Warming up factory...')
  await warmUpEndpoint(`${FACTORY_URL}/timing`, { sql })
  const factoryWarm = await runBenchmark('factory-warm', `${FACTORY_URL}/timing`, { sql })
  console.log(`   E2E: ${factoryWarm.e2eMs.toFixed(2)}ms (cold: ${factoryWarm.coldStart})`)

  // Test 4: Warm consumer (direct) query
  console.log('\n4. Warming up consumer...')
  await warmUpEndpoint(`${CONSUMER_URL}/direct`, { sql })
  const directWarm = await runBenchmark('direct-warm', `${CONSUMER_URL}/direct`, { sql })
  console.log(`   E2E: ${directWarm.e2eMs.toFixed(2)}ms (cold: ${directWarm.coldStart})`)

  // Test 5: Consumer via factory service binding
  console.log('\n5. Consumer via factory service binding...')
  const factoryBinding = await runBenchmark('consumer-via-factory', `${CONSUMER_URL}/factory`, { sql })
  console.log(`   E2E: ${factoryBinding.e2eMs.toFixed(2)}ms (cold: ${factoryBinding.coldStart})`)

  // Test 6: Warm proxy worker (no DO)
  console.log('\n6. Warm proxy worker (no DO)...')
  await warmUpEndpoint(`${WARM_PROXY_URL}/timing`, { sql })
  const warmProxy = await runBenchmark('warm-proxy', `${WARM_PROXY_URL}/timing`, { sql })
  console.log(`   E2E: ${warmProxy.e2eMs.toFixed(2)}ms (cold: ${warmProxy.coldStart})`)

  // Summary
  console.log('\n=== Summary ===\n')
  console.log('| Mode                    | E2E (ms)    | Cold Start |')
  console.log('|-------------------------|-------------|------------|')
  console.log(`| Factory Cold Start      | ${factoryCold.e2eMs.toFixed(2).padStart(11)} | ${String(factoryCold.coldStart).padStart(10)} |`)
  console.log(`| Direct Cold Start       | ${directCold.e2eMs.toFixed(2).padStart(11)} | ${String(directCold.coldStart).padStart(10)} |`)
  console.log(`| Factory Warm            | ${factoryWarm.e2eMs.toFixed(2).padStart(11)} | ${String(factoryWarm.coldStart).padStart(10)} |`)
  console.log(`| Direct Warm             | ${directWarm.e2eMs.toFixed(2).padStart(11)} | ${String(directWarm.coldStart).padStart(10)} |`)
  console.log(`| Consumer via Factory    | ${factoryBinding.e2eMs.toFixed(2).padStart(11)} | ${String(factoryBinding.coldStart).padStart(10)} |`)
  console.log(`| Warm Proxy (no DO)      | ${warmProxy.e2eMs.toFixed(2).padStart(11)} | ${String(warmProxy.coldStart).padStart(10)} |`)

  console.log('\n=== Analysis ===\n')

  const coldDiff = factoryCold.e2eMs - directCold.e2eMs
  console.log(`Cold start difference (factory - direct): ${coldDiff.toFixed(2)}ms`)

  const warmDiff = factoryWarm.e2eMs - directWarm.e2eMs
  console.log(`Warm query difference (factory - direct): ${warmDiff.toFixed(2)}ms`)

  const serviceBindingOverhead = factoryBinding.e2eMs - factoryWarm.e2eMs
  console.log(`Service binding overhead: ~${serviceBindingOverhead.toFixed(2)}ms`)

  return {
    factoryCold,
    directCold,
    factoryWarm,
    directWarm,
    factoryBinding,
    warmProxy,
  }
}

async function runLatencyTest(iterations = 10) {
  console.log(`\n=== Latency Test (${iterations} iterations) ===\n`)

  const sql = TEST_QUERIES[0].sql

  // Warm up all endpoints first
  console.log('Warming up endpoints...')
  await warmUpEndpoint(`${FACTORY_URL}/timing`, { sql })
  await warmUpEndpoint(`${CONSUMER_URL}/direct`, { sql })
  await warmUpEndpoint(`${CONSUMER_URL}/factory`, { sql })
  await warmUpEndpoint(`${WARM_PROXY_URL}/timing`, { sql })

  const factoryTimes = []
  const directTimes = []
  const bindingTimes = []
  const warmProxyTimes = []

  console.log('Running iterations...')

  for (let i = 0; i < iterations; i++) {
    // Factory
    const factoryResult = await runBenchmark(`factory-${i}`, `${FACTORY_URL}/timing`, { sql })
    factoryTimes.push(factoryResult.e2eMs)

    // Direct
    const directResult = await runBenchmark(`direct-${i}`, `${CONSUMER_URL}/direct`, { sql })
    directTimes.push(directResult.e2eMs)

    // Service binding
    const bindingResult = await runBenchmark(`binding-${i}`, `${CONSUMER_URL}/factory`, { sql })
    bindingTimes.push(bindingResult.e2eMs)

    // Warm proxy
    const warmProxyResult = await runBenchmark(`warm-proxy-${i}`, `${WARM_PROXY_URL}/timing`, { sql })
    warmProxyTimes.push(warmProxyResult.e2eMs)

    // Small delay between iterations
    await new Promise((r) => setTimeout(r, 50))

    process.stdout.write('.')
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

  const factoryStats = stats(factoryTimes)
  const directStats = stats(directTimes)
  const bindingStats = stats(bindingTimes)
  const warmProxyStats = stats(warmProxyTimes)

  console.log('| Mode              | Min     | Avg     | P50     | P95     | P99     | Max     |')
  console.log('|-------------------|---------|---------|---------|---------|---------|---------|')
  console.log(
    `| Factory Direct    | ${factoryStats.min.toFixed(1).padStart(7)} | ${factoryStats.avg.toFixed(1).padStart(7)} | ${factoryStats.p50.toFixed(1).padStart(7)} | ${factoryStats.p95.toFixed(1).padStart(7)} | ${factoryStats.p99.toFixed(1).padStart(7)} | ${factoryStats.max.toFixed(1).padStart(7)} |`
  )
  console.log(
    `| Consumer Direct   | ${directStats.min.toFixed(1).padStart(7)} | ${directStats.avg.toFixed(1).padStart(7)} | ${directStats.p50.toFixed(1).padStart(7)} | ${directStats.p95.toFixed(1).padStart(7)} | ${directStats.p99.toFixed(1).padStart(7)} | ${directStats.max.toFixed(1).padStart(7)} |`
  )
  console.log(
    `| Service Binding   | ${bindingStats.min.toFixed(1).padStart(7)} | ${bindingStats.avg.toFixed(1).padStart(7)} | ${bindingStats.p50.toFixed(1).padStart(7)} | ${bindingStats.p95.toFixed(1).padStart(7)} | ${bindingStats.p99.toFixed(1).padStart(7)} | ${bindingStats.max.toFixed(1).padStart(7)} |`
  )
  console.log(
    `| Warm Proxy (no DO)| ${warmProxyStats.min.toFixed(1).padStart(7)} | ${warmProxyStats.avg.toFixed(1).padStart(7)} | ${warmProxyStats.p50.toFixed(1).padStart(7)} | ${warmProxyStats.p95.toFixed(1).padStart(7)} | ${warmProxyStats.p99.toFixed(1).padStart(7)} | ${warmProxyStats.max.toFixed(1).padStart(7)} |`
  )

  return { factoryStats, directStats, bindingStats, warmProxyStats }
}

async function main() {
  console.log('Cold Start POC Benchmark')
  console.log('========================\n')
  console.log(`Factory URL: ${FACTORY_URL}`)
  console.log(`Consumer URL: ${CONSUMER_URL}`)
  console.log(`Warm Proxy URL: ${WARM_PROXY_URL}`)

  // Check connectivity
  console.log('\nChecking connectivity...')
  try {
    const factoryPing = await fetch(`${FACTORY_URL}/ping`)
    const consumerPing = await fetch(`${CONSUMER_URL}/ping`)
    const warmProxyPing = await fetch(`${WARM_PROXY_URL}/ping`)

    if (!factoryPing.ok || !consumerPing.ok || !warmProxyPing.ok) {
      throw new Error('Endpoints not responding')
    }
    console.log('All endpoints responding!')
  } catch (error) {
    console.error(`\nError: Cannot connect to endpoints. Make sure workers are deployed.`)
    console.error(`  npm run deploy:all`)
    process.exit(1)
  }

  // Run cold start comparison
  await runColdStartComparison()

  // Run latency test
  await runLatencyTest(20)

  console.log('\n=== Conclusions ===\n')
  console.log('Key findings to record:')
  console.log('1. Cold start time baseline (direct DO)')
  console.log('2. Cold start time via factory (service binding)')
  console.log('3. Service binding overhead for warm queries')
  console.log('4. Whether factory approach actually reduces cold starts')
  console.log('')
  console.log('Hypothesis validation:')
  console.log('- Service bindings create new isolates (not shared)')
  console.log('- WASM modules are per-isolate')
  console.log('- Service binding adds network hop latency')
}

main().catch(console.error)
