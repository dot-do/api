import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createParqueDBAdapter } from '../../src/conventions/database/parquedb-adapter'
import type { ParsedSchema } from '../../src/conventions/database/types'

const testSchema: ParsedSchema = {
  models: {
    Contact: {
      name: 'Contact',
      singular: 'contact',
      plural: 'contacts',
      primaryKey: 'id',
      fields: {
        name: { name: 'name', type: 'string', required: true, unique: false, indexed: false },
        email: { name: 'email', type: 'string', required: false, unique: true, indexed: true },
        stage: { name: 'stage', type: 'string', required: false, unique: false, indexed: false, enum: ['Lead', 'Qualified', 'Customer'] },
      },
    },
    Deal: {
      name: 'Deal',
      singular: 'deal',
      plural: 'deals',
      primaryKey: 'id',
      fields: {
        title: { name: 'title', type: 'string', required: true, unique: false, indexed: false },
        value: { name: 'value', type: 'number', required: false, unique: false, indexed: false },
        notes: { name: 'notes', type: 'text', required: false, unique: false, indexed: false },
      },
    },
  },
}

function createMockService() {
  return {
    find: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ $id: 'contact_abc', $type: 'Contact', $version: 1, name: 'Alice', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' }),
    update: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    delete: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    count: vi.fn().mockResolvedValue(0),
    link: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ParqueDB Adapter', () => {
  let mockService: ReturnType<typeof createMockService>
  let adapter: ReturnType<typeof createParqueDBAdapter>

  beforeEach(() => {
    mockService = createMockService()
    adapter = createParqueDBAdapter(mockService as never, testSchema, '~acme')
  })

  describe('namespace resolution', () => {
    it('maps model name to plural with tenant prefix', async () => {
      await adapter.create('Contact', { name: 'Alice' })
      expect(mockService.create).toHaveBeenCalledWith('~acme/contacts', expect.objectContaining({ name: 'Alice' }))
    })

    it('maps Deal model to deals namespace', async () => {
      await adapter.count('Deal')
      expect(mockService.count).toHaveBeenCalledWith('~acme/deals', undefined)
    })

    it('falls back to lowercase for unknown models', async () => {
      await adapter.count('Unknown')
      expect(mockService.count).toHaveBeenCalledWith('~acme/unknown', undefined)
    })
  })

  describe('create', () => {
    it('creates and returns a Document with mapped fields', async () => {
      const doc = await adapter.create('Contact', { name: 'Alice' })
      expect(doc.id).toBe('contact_abc')
      expect(doc._version).toBe(1)
      expect(doc._createdAt).toBe('2025-01-01T00:00:00Z')
    })

    it('passes userId as createdBy', async () => {
      await adapter.create('Contact', { name: 'Bob' }, { userId: 'user_1' })
      expect(mockService.create).toHaveBeenCalledWith(
        '~acme/contacts',
        expect.objectContaining({ name: 'Bob', createdBy: 'user_1' }),
      )
    })
  })

  describe('get', () => {
    it('returns null when entity not found', async () => {
      const doc = await adapter.get('Contact', 'nonexistent')
      expect(doc).toBeNull()
    })

    it('returns Document when entity found', async () => {
      mockService.get.mockResolvedValue({ $id: 'contact_1', $version: 2, name: 'Alice', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' })
      const doc = await adapter.get('Contact', 'contact_1')
      expect(doc).not.toBeNull()
      expect(doc!.id).toBe('contact_1')
      expect(doc!._version).toBe(2)
    })
  })

  describe('update', () => {
    it('sends $set operator and re-fetches', async () => {
      mockService.get.mockResolvedValue({ $id: 'contact_1', $version: 3, name: 'Alice Updated', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' })

      const doc = await adapter.update('Contact', 'contact_1', { name: 'Alice Updated' })
      expect(mockService.update).toHaveBeenCalledWith('~acme/contacts', 'contact_1', { $set: { name: 'Alice Updated' } })
      expect(mockService.get).toHaveBeenCalledWith('~acme/contacts', 'contact_1')
      expect(doc.id).toBe('contact_1')
      expect(doc._version).toBe(3)
    })

    it('throws if entity not found after update', async () => {
      mockService.get.mockResolvedValue(null)
      await expect(adapter.update('Contact', 'contact_1', { name: 'Alice' })).rejects.toThrow('not found after update')
    })
  })

  describe('delete', () => {
    it('calls service delete with correct namespace', async () => {
      await adapter.delete('Contact', 'contact_1')
      expect(mockService.delete).toHaveBeenCalledWith('~acme/contacts', 'contact_1')
    })
  })

  describe('list', () => {
    it('converts ParqueDB find result to QueryResult format', async () => {
      mockService.find.mockResolvedValue({
        items: [
          { $id: 'contact_1', $version: 1, name: 'Alice', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { $id: 'contact_2', $version: 1, name: 'Bob', createdAt: '2025-01-02T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' },
        ],
        total: 5,
        hasMore: true,
      })

      const result = await adapter.list('Contact', { limit: 2, offset: 0 })
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('contact_1')
      expect(result.data[1].id).toBe('contact_2')
      expect(result.total).toBe(5)
      expect(result.limit).toBe(2)
      expect(result.offset).toBe(0)
      expect(result.hasMore).toBe(true)
    })

    it('passes where filter through', async () => {
      await adapter.list('Contact', { where: { stage: 'Lead' }, limit: 10 })
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/contacts',
        { stage: 'Lead' },
        expect.objectContaining({ limit: 10 }),
      )
    })

    it('converts orderBy string to sort', async () => {
      await adapter.list('Contact', { orderBy: '-name' })
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/contacts',
        undefined,
        expect.objectContaining({ sort: { name: -1 } }),
      )
    })

    it('converts orderBy array to sort', async () => {
      await adapter.list('Contact', { orderBy: [{ field: 'name', direction: 'asc' }, { field: 'email', direction: 'desc' }] })
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/contacts',
        undefined,
        expect.objectContaining({ sort: { name: 1, email: -1 } }),
      )
    })

    it('uses default limit/offset when not provided', async () => {
      await adapter.list('Contact')
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/contacts',
        undefined,
        expect.objectContaining({ limit: 20, offset: 0 }),
      )
    })
  })

  describe('search', () => {
    it('builds $or filter across string/text fields', async () => {
      await adapter.search('Contact', 'alice')
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/contacts',
        {
          $or: [
            { name: { $regex: 'alice', $options: 'i' } },
            { email: { $regex: 'alice', $options: 'i' } },
            { stage: { $regex: 'alice', $options: 'i' } },
          ],
        },
        expect.any(Object),
      )
    })

    it('searches text fields on Deal', async () => {
      await adapter.search('Deal', 'enterprise')
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/deals',
        {
          $or: [
            { title: { $regex: 'enterprise', $options: 'i' } },
            { notes: { $regex: 'enterprise', $options: 'i' } },
          ],
        },
        expect.any(Object),
      )
    })

    it('merges search filter with where clause', async () => {
      await adapter.search('Contact', 'alice', { where: { stage: 'Lead' } })
      expect(mockService.find).toHaveBeenCalledWith(
        '~acme/contacts',
        {
          $and: [
            {
              $or: [
                { name: { $regex: 'alice', $options: 'i' } },
                { email: { $regex: 'alice', $options: 'i' } },
                { stage: { $regex: 'alice', $options: 'i' } },
              ],
            },
            { stage: 'Lead' },
          ],
        },
        expect.any(Object),
      )
    })
  })

  describe('count', () => {
    it('delegates to service.count with filter', async () => {
      mockService.count.mockResolvedValue(42)
      const result = await adapter.count('Contact', { stage: 'Lead' })
      expect(result).toBe(42)
      expect(mockService.count).toHaveBeenCalledWith('~acme/contacts', { stage: 'Lead' })
    })
  })

  describe('empty tenant prefix', () => {
    it('omits tenant prefix when empty', async () => {
      const noTenantAdapter = createParqueDBAdapter(mockService as never, testSchema, '')
      await noTenantAdapter.count('Contact')
      expect(mockService.count).toHaveBeenCalledWith('contacts', undefined)
    })
  })
})
