import { describe, it, expect } from 'vitest'
import {
  handlePageSize,
  handleSort,
  handleCount,
  handleSchema,
  handlePages,
  handleDistinct,
} from '../../src/conventions/meta-resources'
import type { MetaResourceConfig } from '../../src/conventions/meta-resources'

describe('Meta-Resources Convention', () => {
  // ============================================================================
  // $pageSize
  // ============================================================================
  describe('handlePageSize', () => {
    it('generates correct page size links with defaults', () => {
      const result = handlePageSize('https://crm.do/~acme/contacts')

      expect(result.key).toBe('pageSize')
      expect(result.data).toEqual({
        5: 'https://crm.do/~acme/contacts?limit=5',
        10: 'https://crm.do/~acme/contacts?limit=10',
        25: 'https://crm.do/~acme/contacts?limit=25',
        50: 'https://crm.do/~acme/contacts?limit=50',
        100: 'https://crm.do/~acme/contacts?limit=100',
        500: 'https://crm.do/~acme/contacts?limit=500',
        1000: 'https://crm.do/~acme/contacts?limit=1000',
      })
    })

    it('generates page size links with custom sizes', () => {
      const result = handlePageSize('https://crm.do/~acme/contacts', { pageSizes: [10, 20, 50] })

      expect(result.data).toEqual({
        10: 'https://crm.do/~acme/contacts?limit=10',
        20: 'https://crm.do/~acme/contacts?limit=20',
        50: 'https://crm.do/~acme/contacts?limit=50',
      })
    })

    it('strips trailing slash from base URL', () => {
      const result = handlePageSize('https://crm.do/~acme/contacts/')

      expect(result.data[5]).toBe('https://crm.do/~acme/contacts?limit=5')
    })

    it('preserves existing query parameters', () => {
      const result = handlePageSize('https://crm.do/~acme/contacts?status=active')

      expect(result.data[25]).toBe('https://crm.do/~acme/contacts?status=active&limit=25')
    })
  })

  // ============================================================================
  // $sort
  // ============================================================================
  describe('handleSort', () => {
    it('generates default sort options when no sortable fields provided', () => {
      const result = handleSort('https://crm.do/~acme/contacts')

      expect(result.key).toBe('sort')
      expect(result.data).toHaveProperty('Newest first')
      expect(result.data).toHaveProperty('Oldest first')
      expect(result.data).toHaveProperty('Recently updated')
      expect(result.data['Newest first']).toBe('https://crm.do/~acme/contacts?sort=createdAt.desc')
      expect(result.data['Oldest first']).toBe('https://crm.do/~acme/contacts?sort=createdAt.asc')
      expect(result.data['Recently updated']).toBe('https://crm.do/~acme/contacts?sort=updatedAt.desc')
    })

    it('generates sort options from sortable fields', () => {
      const result = handleSort('https://crm.do/~acme/contacts', {
        sortableFields: { contacts: ['name', 'email'] },
        collection: 'contacts',
      })

      expect(result.data).toHaveProperty('Name (A-Z)')
      expect(result.data).toHaveProperty('Name (Z-A)')
      expect(result.data['Name (A-Z)']).toBe('https://crm.do/~acme/contacts?sort=name.asc')
      expect(result.data['Name (Z-A)']).toBe('https://crm.do/~acme/contacts?sort=name.desc')
      expect(result.data).toHaveProperty('Email (A-Z)')
      expect(result.data).toHaveProperty('Email (Z-A)')
    })

    it('always includes temporal sort options', () => {
      const result = handleSort('https://crm.do/~acme/contacts', {
        sortableFields: { contacts: ['name'] },
        collection: 'contacts',
      })

      expect(result.data).toHaveProperty('Newest first')
      expect(result.data).toHaveProperty('Oldest first')
      expect(result.data).toHaveProperty('Recently updated')
    })

    it('preserves existing query parameters', () => {
      const result = handleSort('https://crm.do/~acme/contacts?status=active')

      expect(result.data['Newest first']).toBe('https://crm.do/~acme/contacts?status=active&sort=createdAt.desc')
    })
  })

  // ============================================================================
  // $count
  // ============================================================================
  describe('handleCount', () => {
    it('returns count value', async () => {
      const result = await handleCount(async () => 847)

      expect(result.key).toBe('count')
      expect(result.data).toBe(847)
    })

    it('returns zero count', async () => {
      const result = await handleCount(async () => 0)

      expect(result.key).toBe('count')
      expect(result.data).toBe(0)
    })
  })

  // ============================================================================
  // $schema
  // ============================================================================
  describe('handleSchema', () => {
    it('returns JSON Schema for a collection', () => {
      const mockSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name'],
      }

      const result = handleSchema(() => mockSchema, 'contacts')

      expect(result.key).toBe('schema')
      expect(result.data).toEqual(mockSchema)
    })

    it('returns null when no schema provider', () => {
      const result = handleSchema(undefined, 'contacts')

      expect(result.key).toBe('schema')
      expect(result.data).toBeNull()
    })
  })

  // ============================================================================
  // $pages
  // ============================================================================
  describe('handlePages', () => {
    it('generates page links', () => {
      const result = handlePages('https://crm.do/~acme/contacts', 100, 25)

      expect(result.key).toBe('pages')
      expect(result.data).toEqual({
        1: 'https://crm.do/~acme/contacts?page=1&limit=25',
        2: 'https://crm.do/~acme/contacts?page=2&limit=25',
        3: 'https://crm.do/~acme/contacts?page=3&limit=25',
        4: 'https://crm.do/~acme/contacts?page=4&limit=25',
      })
    })

    it('generates single page when total is less than page size', () => {
      const result = handlePages('https://crm.do/~acme/contacts', 10, 25)

      expect(result.data).toEqual({
        1: 'https://crm.do/~acme/contacts?page=1&limit=25',
      })
    })

    it('handles exact page boundary', () => {
      const result = handlePages('https://crm.do/~acme/contacts', 50, 25)

      expect(result.data).toEqual({
        1: 'https://crm.do/~acme/contacts?page=1&limit=25',
        2: 'https://crm.do/~acme/contacts?page=2&limit=25',
      })
    })

    it('handles zero total', () => {
      const result = handlePages('https://crm.do/~acme/contacts', 0, 25)

      expect(result.data).toEqual({
        1: 'https://crm.do/~acme/contacts?page=1&limit=25',
      })
    })

    it('preserves existing query parameters', () => {
      const result = handlePages('https://crm.do/~acme/contacts?status=active', 50, 25)

      expect(result.data[1]).toBe('https://crm.do/~acme/contacts?status=active&page=1&limit=25')
    })
  })

  // ============================================================================
  // $distinct
  // ============================================================================
  describe('handleDistinct', () => {
    it('returns distinct values with counts', async () => {
      const result = await handleDistinct('status', async () => ({
        active: 45,
        inactive: 12,
        pending: 8,
      }))

      expect(result.key).toBe('distinct')
      expect(result.data).toEqual({
        field: 'status',
        values: {
          active: 45,
          inactive: 12,
          pending: 8,
        },
      })
    })
  })

  // ============================================================================
  // Config
  // ============================================================================
  describe('MetaResourceConfig', () => {
    it('accepts custom page sizes', () => {
      const config: MetaResourceConfig = {
        pageSizes: [10, 20, 50],
      }
      const result = handlePageSize('https://crm.do/~acme/contacts', config)
      expect(Object.keys(result.data)).toEqual(['10', '20', '50'])
    })

    it('accepts sortable fields per collection', () => {
      const config: MetaResourceConfig = {
        sortableFields: {
          contacts: ['name', 'email', 'company'],
          deals: ['value', 'stage', 'closeDate'],
        },
      }
      const result = handleSort('https://crm.do/~acme/contacts', { ...config, collection: 'contacts' })
      expect(result.data).toHaveProperty('Name (A-Z)')
      expect(result.data).toHaveProperty('Email (A-Z)')
      expect(result.data).toHaveProperty('Company (A-Z)')
      expect(result.data).not.toHaveProperty('Value (A-Z)')
    })
  })
})
