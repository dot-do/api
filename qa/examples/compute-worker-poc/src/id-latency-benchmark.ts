/**
 * DO ID Generation Latency Benchmark
 *
 * Tests whether idFromName() requires network calls or is a local operation.
 *
 * Hypothesis to test:
 * - If idFromName() is local: <1ms consistently
 * - If idFromName() requires global coordination: 100-300ms for new names
 *
 * We'll test:
 * 1. idFromName() for known existing DO names
 * 2. idFromName() for brand new random names
 * 3. idFromString() with existing IDs
 * 4. newUniqueId() generation
 * 5. Compare to actual stub.fetch() latency
 */

import { Hono } from 'hono'

interface Env {
  TEST_DO: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

// Benchmark idFromName() latency
app.get('/benchmark/id-from-name', async (c) => {
  const iterations = parseInt(c.req.query('iterations') || '100')
  const results: {
    existingNames: number[]
    newNames: number[]
    idFromString: number[]
    newUniqueId: number[]
  } = {
    existingNames: [],
    newNames: [],
    idFromString: [],
    newUniqueId: [],
  }

  // Test 1: idFromName() with "existing" names (names we've used before)
  const existingNames = [
    'tenant-known-1',
    'tenant-known-2',
    'tenant-known-3',
    'test-do-existing',
    'benchmark-do',
  ]

  for (let i = 0; i < iterations; i++) {
    const name = existingNames[i % existingNames.length]
    const start = performance.now()
    const id = c.env.TEST_DO.idFromName(name)
    const elapsed = performance.now() - start
    results.existingNames.push(elapsed)
    // Force the id to be used to prevent optimization
    if (!id.toString()) throw new Error('Invalid ID')
  }

  // Test 2: idFromName() with brand new random names
  for (let i = 0; i < iterations; i++) {
    const randomName = `new-random-${Date.now()}-${Math.random().toString(36)}-${i}`
    const start = performance.now()
    const id = c.env.TEST_DO.idFromName(randomName)
    const elapsed = performance.now() - start
    results.newNames.push(elapsed)
    if (!id.toString()) throw new Error('Invalid ID')
  }

  // Test 3: idFromString() with a known ID string
  const knownId = c.env.TEST_DO.idFromName('known-reference')
  const idString = knownId.toString()

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const id = c.env.TEST_DO.idFromString(idString)
    const elapsed = performance.now() - start
    results.idFromString.push(elapsed)
    if (!id.toString()) throw new Error('Invalid ID')
  }

  // Test 4: newUniqueId() generation
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const id = c.env.TEST_DO.newUniqueId()
    const elapsed = performance.now() - start
    results.newUniqueId.push(elapsed)
    if (!id.toString()) throw new Error('Invalid ID')
  }

  // Calculate statistics
  const stats = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  return c.json({
    iterations,
    summary: {
      existingNames: stats(results.existingNames),
      newNames: stats(results.newNames),
      idFromString: stats(results.idFromString),
      newUniqueId: stats(results.newUniqueId),
    },
    interpretation: {
      'If all < 1ms': 'idFromName() is a LOCAL hash operation',
      'If newNames >> existingNames': 'Global coordination required for new names',
      'If all > 100ms': 'Network call required for all ID operations',
    },
    rawSamples: {
      existingNames: results.existingNames.slice(0, 10),
      newNames: results.newNames.slice(0, 10),
      idFromString: results.idFromString.slice(0, 10),
      newUniqueId: results.newUniqueId.slice(0, 10),
    },
  })
})

// Compare ID generation to actual DO access
app.get('/benchmark/id-vs-access', async (c) => {
  const results: {
    idGeneration: number[]
    stubCreation: number[]
    firstAccess: number[]
    subsequentAccess: number[]
  } = {
    idGeneration: [],
    stubCreation: [],
    firstAccess: [],
    subsequentAccess: [],
  }

  // Use a new random name to ensure we're testing first-time access
  const testName = `benchmark-${Date.now()}-${Math.random().toString(36)}`

  // Measure ID generation
  const idStart = performance.now()
  const id = c.env.TEST_DO.idFromName(testName)
  results.idGeneration.push(performance.now() - idStart)

  // Measure stub creation (should be instant - no network)
  const stubStart = performance.now()
  const stub = c.env.TEST_DO.get(id)
  results.stubCreation.push(performance.now() - stubStart)

  // Measure first access (this is where global coordination happens)
  const firstAccessStart = performance.now()
  try {
    const response = await stub.fetch('https://internal/ping')
    await response.text()
  } catch (e) {
    // DO might not have ping endpoint, that's ok
  }
  results.firstAccess.push(performance.now() - firstAccessStart)

  // Measure subsequent access (should be faster - DO is now located)
  const subsequentStart = performance.now()
  try {
    const response = await stub.fetch('https://internal/ping')
    await response.text()
  } catch (e) {
    // DO might not have ping endpoint
  }
  results.subsequentAccess.push(performance.now() - subsequentStart)

  return c.json({
    testName,
    timings: {
      idGenerationMs: results.idGeneration[0],
      stubCreationMs: results.stubCreation[0],
      firstAccessMs: results.firstAccess[0],
      subsequentAccessMs: results.subsequentAccess[0],
    },
    interpretation: {
      'idGeneration < 1ms': 'ID generation is local (hash only)',
      'idGeneration > 100ms': 'ID generation requires network coordination',
      'firstAccess > 100ms': 'First access requires global coordination',
      'subsequentAccess < firstAccess': 'DO location is cached after first access',
    },
  })
})

// Test accessing the SAME DO to measure routing cache duration
app.get('/benchmark/same-do-access', async (c) => {
  const name = c.req.query('name') || 'persistent-test-do'

  const idStart = performance.now()
  const id = c.env.TEST_DO.idFromName(name)
  const idMs = performance.now() - idStart

  const stubStart = performance.now()
  const stub = c.env.TEST_DO.get(id)
  const stubMs = performance.now() - stubStart

  const accessStart = performance.now()
  try {
    const response = await stub.fetch('https://internal/ping')
    await response.text()
  } catch (e) {
    // DO might not have ping endpoint
  }
  const accessMs = performance.now() - accessStart

  return c.json({
    name,
    idString: id.toString().slice(0, 16) + '...',
    timings: {
      idGenerationMs: idMs,
      stubCreationMs: stubMs,
      accessMs: accessMs,
    },
    timestamp: new Date().toISOString(),
    note: 'Call this multiple times with same name to test routing cache duration',
  })
})

// Test with multiple new DOs in parallel
app.get('/benchmark/parallel-new-dos', async (c) => {
  const count = parseInt(c.req.query('count') || '10')

  const names = Array.from({ length: count }, (_, i) =>
    `parallel-test-${Date.now()}-${i}-${Math.random().toString(36)}`
  )

  // Measure parallel ID generation
  const idStart = performance.now()
  const ids = names.map(name => c.env.TEST_DO.idFromName(name))
  const idGenerationMs = performance.now() - idStart

  // Measure parallel stub creation
  const stubStart = performance.now()
  const stubs = ids.map(id => c.env.TEST_DO.get(id))
  const stubCreationMs = performance.now() - stubStart

  // Measure parallel first access
  const accessStart = performance.now()
  const accessResults = await Promise.allSettled(
    stubs.map(stub =>
      stub.fetch('https://internal/ping').then(r => r.text()).catch(() => 'error')
    )
  )
  const parallelAccessMs = performance.now() - accessStart

  return c.json({
    count,
    timings: {
      idGenerationTotalMs: idGenerationMs,
      idGenerationPerDoMs: idGenerationMs / count,
      stubCreationTotalMs: stubCreationMs,
      stubCreationPerDoMs: stubCreationMs / count,
      parallelAccessTotalMs: parallelAccessMs,
      parallelAccessPerDoMs: parallelAccessMs / count,
    },
    interpretation: {
      'If idGeneration ~0ms total': 'All ID generation is local (batched hashing)',
      'If idGeneration scales with count': 'Each ID requires a network call',
      'If parallelAccess >> idGeneration': 'Global coordination happens on access, not ID generation',
    },
  })
})

export default app

// Minimal DO for testing
export class TestDO {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/ping') {
      return new Response('pong')
    }
    return new Response('TestDO', { status: 200 })
  }
}
