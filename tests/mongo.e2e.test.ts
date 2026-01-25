import { describe, it, expect } from 'vitest'

const MONGO_URL = 'https://mongo.example.com.ai'

interface Timing {
  workerColo: string
  doColo: string
  queryMs: number
  rpcMs: number
  totalMs: number
}

interface Document {
  _id: string
  [key: string]: unknown
}

interface WithTiming<T> extends Record<string, unknown> {
  timing: Timing
}

describe('E2E: mongo.example.com.ai', () => {
  describe('Root endpoint', () => {
    it('returns API info with links and worker colo', async () => {
      const res = await fetch(MONGO_URL)
      expect(res.ok).toBe(true)

      const body = await res.json() as Record<string, unknown>
      expect(body.name).toBe('mongo.example.com.ai')
      expect(body.description).toContain('MongoDB')
      expect(body.workerColo).toBeDefined()
      expect(body.links).toBeDefined()

      const links = body.links as Record<string, string>
      expect(links['Collections']).toContain('/collections')
      expect(links['List Products']).toContain('/products')
    })
  })

  describe('Timing metrics', () => {
    it('returns timing info on all endpoints', async () => {
      const res = await fetch(`${MONGO_URL}/products/stats`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ count: number }>
      expect(body.timing).toBeDefined()
      expect(body.timing.workerColo).toBeDefined()
      expect(body.timing.doColo).toBeDefined()
      expect(typeof body.timing.queryMs).toBe('number')
      expect(typeof body.timing.rpcMs).toBe('number')
      expect(typeof body.timing.totalMs).toBe('number')
    })
  })

  describe('Collections', () => {
    it('lists all collections', async () => {
      const res = await fetch(`${MONGO_URL}/collections`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ collections: string[] }>
      expect(Array.isArray(body.collections)).toBe(true)
      expect(body.collections).toContain('products')
      expect(body.timing).toBeDefined()
    })
  })

  describe('Documents CRUD', () => {
    it('lists documents in a collection', async () => {
      const res = await fetch(`${MONGO_URL}/products`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ documents: Document[]; count: number }>
      expect(Array.isArray(body.documents)).toBe(true)
      expect(body.count).toBeGreaterThan(0)
      expect(body.timing).toBeDefined()
    })

    it('filters documents by field', async () => {
      const res = await fetch(`${MONGO_URL}/products?category=electronics`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ documents: Document[] }>
      expect(body.documents.every(d => d.category === 'electronics')).toBe(true)
      expect(body.timing).toBeDefined()
    })

    it('creates, reads, updates, and deletes a document', async () => {
      // CREATE
      const createRes = await fetch(`${MONGO_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `E2E Test Product ${Date.now()}`,
          category: 'test',
          price: 99.99,
        }),
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as WithTiming<{ insertedId: string; document: Document }>
      expect(created.insertedId).toBeDefined()
      expect(created.timing).toBeDefined()
      const docId = created.insertedId

      // READ
      const getRes = await fetch(`${MONGO_URL}/products/${docId}`)
      expect(getRes.ok).toBe(true)
      const gotten = await getRes.json() as WithTiming<Document>
      expect(gotten._id).toBe(docId)
      expect(gotten.timing).toBeDefined()

      // UPDATE
      const updateRes = await fetch(`${MONGO_URL}/products/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated E2E Test Product', price: 149.99 }),
      })
      expect(updateRes.ok).toBe(true)
      const updated = await updateRes.json() as WithTiming<{ matchedCount: number; modifiedCount: number }>
      expect(updated.matchedCount).toBe(1)
      expect(updated.modifiedCount).toBe(1)
      expect(updated.timing).toBeDefined()

      // DELETE
      const deleteRes = await fetch(`${MONGO_URL}/products/${docId}`, {
        method: 'DELETE',
      })
      expect(deleteRes.ok).toBe(true)
      const deleted = await deleteRes.json() as WithTiming<{ deletedCount: number }>
      expect(deleted.deletedCount).toBe(1)
      expect(deleted.timing).toBeDefined()

      // CONFIRM DELETION
      const confirmRes = await fetch(`${MONGO_URL}/products/${docId}`)
      expect(confirmRes.status).toBe(404)
    })

    it('returns 404 for non-existent document', async () => {
      const res = await fetch(`${MONGO_URL}/products/nonexistent-id-xyz`)
      expect(res.status).toBe(404)

      const body = await res.json() as WithTiming<{ error: string }>
      expect(body.error).toBe('Not found')
      expect(body.timing).toBeDefined()
    })
  })

  describe('Aggregation', () => {
    it('aggregates documents by category', async () => {
      const res = await fetch(`${MONGO_URL}/products/aggregate`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ results: Array<{ _id: string; count: number; totalPrice: number }> }>
      expect(Array.isArray(body.results)).toBe(true)
      expect(body.results.length).toBeGreaterThan(0)

      // Check aggregation structure
      for (const result of body.results) {
        expect(result._id).toBeDefined()
        expect(typeof result.count).toBe('number')
        expect(typeof result.totalPrice).toBe('number')
      }

      expect(body.timing).toBeDefined()
    })
  })

  describe('Stats', () => {
    it('returns collection stats', async () => {
      const res = await fetch(`${MONGO_URL}/products/stats`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ count: number; collection: string }>
      expect(typeof body.count).toBe('number')
      expect(body.collection).toBe('products')
      expect(body.timing).toBeDefined()
    })
  })

  describe('Edge location awareness', () => {
    it('reports worker and DO colocations', async () => {
      const res = await fetch(`${MONGO_URL}/products/stats`)
      const body = await res.json() as WithTiming<{ count: number }>

      // Worker colo should be 3-letter IATA airport code
      expect(body.timing.workerColo).toMatch(/^[A-Z]{3}$/)
      // DO colo should be defined (may be IATA code or 'unknown')
      expect(body.timing.doColo).toBeDefined()

      console.log(`Worker colo: ${body.timing.workerColo}, DO colo: ${body.timing.doColo}`)
    })
  })

  describe('Dynamic collections', () => {
    it('creates a new collection automatically', async () => {
      const collectionName = `test_${Date.now()}`

      // Insert into new collection
      const createRes = await fetch(`${MONGO_URL}/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Doc' }),
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as WithTiming<{ insertedId: string }>

      // Verify collection exists
      const collectionsRes = await fetch(`${MONGO_URL}/collections`)
      const collections = await collectionsRes.json() as WithTiming<{ collections: string[] }>
      expect(collections.collections).toContain(collectionName)

      // Clean up
      await fetch(`${MONGO_URL}/${collectionName}/${created.insertedId}`, {
        method: 'DELETE',
      })
    })
  })
})
