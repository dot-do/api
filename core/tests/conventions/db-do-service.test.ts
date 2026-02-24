import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDBAdapter, stripTenantPrefix } from '../../src/conventions/database/db-adapter'
import type { DBDOStub } from '../../src/conventions/database/db-adapter'
import type { ParsedSchema } from '../../src/conventions/database/types'

// =========================================================================
// stripTenantPrefix
// =========================================================================

describe('stripTenantPrefix', () => {
  it('strips ~tenant/ prefix', () => {
    expect(stripTenantPrefix('~acme/contacts')).toBe('contacts')
  })

  it('returns bare type unchanged', () => {
    expect(stripTenantPrefix('contacts')).toBe('contacts')
  })

  it('handles multi-segment types', () => {
    expect(stripTenantPrefix('~org/feature-flags')).toBe('feature-flags')
  })

  it('handles tilde without slash', () => {
    expect(stripTenantPrefix('~acme')).toBe('~acme')
  })

  it('handles empty string', () => {
    expect(stripTenantPrefix('')).toBe('')
  })
})

// =========================================================================
// createDBAdapter
// =========================================================================

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

function createMockStub(): DBDOStub & { [K in keyof DBDOStub]: ReturnType<typeof vi.fn> } {
  return {
    find: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
    get: vi.fn().mockResolvedValue(null),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ $id: 'contact_abc', $type: 'contacts', $version: 1, $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-01-01T00:00:00Z', name: 'Alice' }),
    update: vi.fn().mockResolvedValue({ $id: 'contact_abc', $type: 'contacts', $version: 2, $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-06-01T00:00:00Z', name: 'Updated' }),
    delete: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    count: vi.fn().mockResolvedValue(42),
  }
}

describe('createDBAdapter', () => {
  let stub: ReturnType<typeof createMockStub>
  let adapter: ReturnType<typeof createDBAdapter>

  beforeEach(() => {
    stub = createMockStub()
    adapter = createDBAdapter(stub, testSchema, '~acme')
  })

  describe('create', () => {
    it('resolves model to bare type name (no tenant prefix)', async () => {
      await adapter.create('Contact', { name: 'Alice' })
      expect(stub.create).toHaveBeenCalledWith('contacts', expect.objectContaining({ name: 'Alice', $type: 'Contact' }))
    })

    it('returns a Document with mapped fields', async () => {
      const doc = await adapter.create('Contact', { name: 'Alice' })
      expect(doc.id).toBe('contact_abc')
      expect(doc._version).toBe(1)
      expect(doc._createdAt).toBe('2025-01-01T00:00:00Z')
      expect(doc.name).toBe('Alice')
    })

    it('passes userId as createdBy', async () => {
      await adapter.create('Contact', { name: 'Bob' }, { userId: 'user_1' })
      expect(stub.create).toHaveBeenCalledWith(
        'contacts',
        expect.objectContaining({ name: 'Bob', createdBy: 'user_1', updatedBy: 'user_1' }),
      )
    })

    it('derives name from subject/title/description', async () => {
      await adapter.create('Deal', { title: 'Enterprise' })
      expect(stub.create).toHaveBeenCalledWith(
        'deals',
        expect.objectContaining({ name: 'Enterprise', title: 'Enterprise' }),
      )
    })

    it('falls back to lowercase for unknown models', async () => {
      await adapter.create('Unknown', { name: 'test' })
      expect(stub.create).toHaveBeenCalledWith('unknown', expect.any(Object))
    })
  })

  describe('get', () => {
    it('returns null when entity not found', async () => {
      const doc = await adapter.get('Contact', 'nonexistent')
      expect(doc).toBeNull()
    })

    it('returns Document when entity found', async () => {
      stub.get.mockResolvedValue({ $id: 'contact_1', $type: 'contacts', $version: 2, name: 'Alice', $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-06-01T00:00:00Z' })
      const doc = await adapter.get('Contact', 'contact_1')
      expect(doc).not.toBeNull()
      expect(doc!.id).toBe('contact_1')
      expect(doc!._version).toBe(2)
    })

    it('falls back to find by user-set id field', async () => {
      stub.get.mockResolvedValue(null)
      stub.find.mockResolvedValue({
        items: [{ $id: 'contact_internal', $type: 'contacts', $version: 1, name: 'Alice', $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-01-01T00:00:00Z' }],
        total: 1,
        hasMore: false,
      })

      const doc = await adapter.get('Contact', 'user-facing-id')
      expect(stub.find).toHaveBeenCalledWith('contacts', { id: 'user-facing-id' }, { limit: 1 })
      expect(doc!.id).toBe('contact_internal')
    })
  })

  describe('update', () => {
    it('sends $set and returns updated Document', async () => {
      const doc = await adapter.update('Contact', 'contact_abc', { name: 'Updated' })
      expect(stub.update).toHaveBeenCalledWith('contacts', 'contact_abc', { $set: { name: 'Updated' } })
      expect(doc.id).toBe('contact_abc')
      expect(doc.name).toBe('Updated')
    })

    it('falls back to find by user-set id when direct update returns null', async () => {
      stub.update
        .mockResolvedValueOnce(null) // direct update fails
        .mockResolvedValueOnce({ $id: 'contact_internal', $type: 'contacts', $version: 3, name: 'Updated', $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-06-01T00:00:00Z' })
      stub.find.mockResolvedValue({
        items: [{ $id: 'contact_internal', $type: 'contacts', $version: 2, name: 'Alice', $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-01-01T00:00:00Z' }],
        total: 1,
        hasMore: false,
      })

      const doc = await adapter.update('Contact', 'user-id', { name: 'Updated' })
      expect(stub.find).toHaveBeenCalledWith('contacts', { id: 'user-id' }, { limit: 1 })
      expect(stub.update).toHaveBeenCalledTimes(2)
      expect(doc.id).toBe('contact_internal')
    })

    it('throws if entity not found after update', async () => {
      stub.update.mockResolvedValue(null)
      await expect(adapter.update('Contact', 'nonexistent', { name: 'Alice' })).rejects.toThrow('not found after update')
    })

    it('includes userId in $set', async () => {
      await adapter.update('Contact', 'contact_abc', { name: 'Updated' }, { userId: 'user_1' })
      expect(stub.update).toHaveBeenCalledWith('contacts', 'contact_abc', { $set: { name: 'Updated', updatedBy: 'user_1' } })
    })
  })

  describe('delete', () => {
    it('calls stub.delete with bare type name', async () => {
      await adapter.delete('Contact', 'contact_1')
      expect(stub.delete).toHaveBeenCalledWith('contacts', 'contact_1')
    })

    it('falls back to find by user-set id', async () => {
      stub.delete.mockResolvedValueOnce({ deletedCount: 0 })
      stub.find.mockResolvedValue({
        items: [{ $id: 'contact_internal' }],
        total: 1,
        hasMore: false,
      })

      await adapter.delete('Contact', 'user-id')
      expect(stub.find).toHaveBeenCalledWith('contacts', { id: 'user-id' }, { limit: 1 })
      expect(stub.delete).toHaveBeenCalledTimes(2)
      expect(stub.delete).toHaveBeenLastCalledWith('contacts', 'contact_internal')
    })
  })

  describe('list', () => {
    it('converts result to QueryResult format', async () => {
      stub.find.mockResolvedValue({
        items: [
          { $id: 'contact_1', $type: 'contacts', $version: 1, name: 'Alice', $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-01-01T00:00:00Z' },
          { $id: 'contact_2', $type: 'contacts', $version: 1, name: 'Bob', $createdAt: '2025-01-02T00:00:00Z', $updatedAt: '2025-01-02T00:00:00Z' },
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
      expect(result.hasMore).toBe(true)
    })

    it('passes where filter through', async () => {
      await adapter.list('Contact', { where: { stage: 'Lead' }, limit: 10 })
      expect(stub.find).toHaveBeenCalledWith(
        'contacts',
        { stage: 'Lead' },
        expect.objectContaining({ limit: 10 }),
      )
    })

    it('converts orderBy string to sort', async () => {
      await adapter.list('Contact', { orderBy: '-name' })
      expect(stub.find).toHaveBeenCalledWith(
        'contacts',
        undefined,
        expect.objectContaining({ sort: { name: -1 } }),
      )
    })

    it('converts orderBy array to sort', async () => {
      await adapter.list('Contact', { orderBy: [{ field: 'name', direction: 'asc' }, { field: 'email', direction: 'desc' }] })
      expect(stub.find).toHaveBeenCalledWith(
        'contacts',
        undefined,
        expect.objectContaining({ sort: { name: 1, email: -1 } }),
      )
    })

    it('uses default limit/offset when not provided', async () => {
      await adapter.list('Contact')
      expect(stub.find).toHaveBeenCalledWith(
        'contacts',
        undefined,
        expect.objectContaining({ limit: 20, offset: 0 }),
      )
    })
  })

  describe('search', () => {
    it('builds $or filter across string/text fields', async () => {
      await adapter.search('Contact', 'alice')
      expect(stub.find).toHaveBeenCalledWith(
        'contacts',
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
      expect(stub.find).toHaveBeenCalledWith(
        'deals',
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
      expect(stub.find).toHaveBeenCalledWith(
        'contacts',
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
    it('delegates to stub.count for unfiltered count', async () => {
      const result = await adapter.count('Contact')
      expect(stub.count).toHaveBeenCalledWith('contacts', undefined)
      expect(result).toBe(42)
    })

    it('delegates to stub.count for filtered count', async () => {
      stub.count.mockResolvedValue(7)
      const result = await adapter.count('Contact', { stage: 'Lead' })
      expect(stub.count).toHaveBeenCalledWith('contacts', { stage: 'Lead' })
      expect(result).toBe(7)
    })
  })

  describe('listFormatted', () => {
    it('returns $-prefixed format directly', async () => {
      stub.find.mockResolvedValue({
        items: [{ $id: 'contact_1', $type: 'contacts', $version: 1, name: 'Alice', $createdAt: '2025-01-01T00:00:00Z', $updatedAt: '2025-01-01T00:00:00Z' }],
        total: 1,
        hasMore: false,
      })

      const result = await adapter.listFormatted!('Contact', '$', { limit: 10 })
      expect(result.data[0].$type).toBe('Contact')
      expect(result.data[0].$id).toBe('contact_1')
      expect(result.data[0].$version).toBe(1)
      expect(result.data[0].name).toBe('Alice')
    })
  })

  describe('formatOne', () => {
    it('formats a Document to $-prefixed response', () => {
      const doc = { id: 'contact_1', _version: 2, _createdAt: '2025-01-01T00:00:00Z', _updatedAt: '2025-06-01T00:00:00Z', name: 'Alice' }
      const result = adapter.formatOne!('Contact', '$', doc as never)
      expect(result.$type).toBe('Contact')
      expect(result.$id).toBe('contact_1')
      expect(result.$version).toBe(2)
      expect(result.name).toBe('Alice')
    })
  })

  describe('getEvents', () => {
    it('returns empty array', async () => {
      const events = await adapter.getEvents!({})
      expect(events).toEqual([])
    })
  })
})
