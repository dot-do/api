import { describe, it, expect } from 'vitest'
import { buildPagination, buildCursorPagination } from '../../src/helpers/pagination'

describe('Pagination helpers', () => {
  describe('buildPagination', () => {
    it('generates correct self, first, prev, next, last links', () => {
      const url = new URL('https://api.example.com/users?offset=20&limit=10')
      const result = buildPagination({
        url,
        total: 100,
        limit: 10,
        offset: 20
      })

      expect(result.links.self).toBe('https://api.example.com/users?offset=20&limit=10')
      expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.prev).toBe('https://api.example.com/users?offset=10&limit=10')
      expect(result.links.next).toBe('https://api.example.com/users?offset=30&limit=10')
      expect(result.links.last).toBe('https://api.example.com/users?offset=90&limit=10')
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
    })

    it('handles first page (no prev link)', () => {
      const url = new URL('https://api.example.com/users?offset=0&limit=10')
      const result = buildPagination({
        url,
        total: 50,
        limit: 10,
        offset: 0
      })

      expect(result.links.self).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.prev).toBeUndefined()
      expect(result.links.next).toBe('https://api.example.com/users?offset=10&limit=10')
      expect(result.links.last).toBe('https://api.example.com/users?offset=40&limit=10')
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(false)
    })

    it('handles last page (no next link)', () => {
      const url = new URL('https://api.example.com/users?offset=40&limit=10')
      const result = buildPagination({
        url,
        total: 50,
        limit: 10,
        offset: 40
      })

      expect(result.links.self).toBe('https://api.example.com/users?offset=40&limit=10')
      expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.prev).toBe('https://api.example.com/users?offset=30&limit=10')
      expect(result.links.next).toBeUndefined()
      expect(result.links.last).toBe('https://api.example.com/users?offset=40&limit=10')
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(true)
    })

    it('handles single page (only self and first)', () => {
      const url = new URL('https://api.example.com/users?offset=0&limit=10')
      const result = buildPagination({
        url,
        total: 5,
        limit: 10,
        offset: 0
      })

      expect(result.links.self).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.prev).toBeUndefined()
      expect(result.links.next).toBeUndefined()
      expect(result.links.last).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(false)
    })

    it('handles empty results (total=0)', () => {
      const url = new URL('https://api.example.com/users?offset=0&limit=10')
      const result = buildPagination({
        url,
        total: 0,
        limit: 10,
        offset: 0
      })

      expect(result.links.self).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.prev).toBeUndefined()
      expect(result.links.next).toBeUndefined()
      expect(result.links.last).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(false)
    })

    it('preserves query parameters in links', () => {
      const url = new URL('https://api.example.com/users?filter=active&sort=name&offset=10&limit=5')
      const result = buildPagination({
        url,
        total: 30,
        limit: 5,
        offset: 10
      })

      // All links should preserve filter and sort params
      expect(result.links.self).toContain('filter=active')
      expect(result.links.self).toContain('sort=name')
      expect(result.links.first).toContain('filter=active')
      expect(result.links.first).toContain('sort=name')
      expect(result.links.next).toContain('filter=active')
      expect(result.links.next).toContain('sort=name')
      expect(result.links.prev).toContain('filter=active')
      expect(result.links.prev).toContain('sort=name')
      expect(result.links.last).toContain('filter=active')
      expect(result.links.last).toContain('sort=name')
    })

    describe('off-by-one edge cases', () => {
      it('handles total exactly equal to limit', () => {
        const url = new URL('https://api.example.com/users?offset=0&limit=10')
        const result = buildPagination({
          url,
          total: 10,
          limit: 10,
          offset: 0
        })

        expect(result.hasNext).toBe(false)
        expect(result.hasPrev).toBe(false)
        expect(result.links.next).toBeUndefined()
        expect(result.links.prev).toBeUndefined()
        expect(result.links.last).toBe('https://api.example.com/users?offset=0&limit=10')
      })

      it('handles total one less than next page boundary', () => {
        const url = new URL('https://api.example.com/users?offset=0&limit=10')
        const result = buildPagination({
          url,
          total: 19,
          limit: 10,
          offset: 0
        })

        expect(result.hasNext).toBe(true)
        expect(result.links.next).toBe('https://api.example.com/users?offset=10&limit=10')
        expect(result.links.last).toBe('https://api.example.com/users?offset=10&limit=10')
      })

      it('handles total exactly at page boundary', () => {
        const url = new URL('https://api.example.com/users?offset=0&limit=10')
        const result = buildPagination({
          url,
          total: 20,
          limit: 10,
          offset: 0
        })

        expect(result.hasNext).toBe(true)
        expect(result.links.next).toBe('https://api.example.com/users?offset=10&limit=10')
        expect(result.links.last).toBe('https://api.example.com/users?offset=10&limit=10')
      })

      it('handles total one more than page boundary', () => {
        const url = new URL('https://api.example.com/users?offset=0&limit=10')
        const result = buildPagination({
          url,
          total: 21,
          limit: 10,
          offset: 0
        })

        expect(result.hasNext).toBe(true)
        expect(result.links.next).toBe('https://api.example.com/users?offset=10&limit=10')
        expect(result.links.last).toBe('https://api.example.com/users?offset=20&limit=10')
      })

      it('handles offset at last item', () => {
        const url = new URL('https://api.example.com/users?offset=9&limit=10')
        const result = buildPagination({
          url,
          total: 10,
          limit: 10,
          offset: 9
        })

        // offset=9, limit=10, total=10 means we're showing items 9-9 (1 item)
        // offset + limit (19) >= total (10), so no next
        expect(result.hasNext).toBe(false)
        expect(result.hasPrev).toBe(true)
        expect(result.links.prev).toBe('https://api.example.com/users?offset=0&limit=10')
      })

      it('handles offset beyond total (edge case)', () => {
        const url = new URL('https://api.example.com/users?offset=100&limit=10')
        const result = buildPagination({
          url,
          total: 50,
          limit: 10,
          offset: 100
        })

        // Even though offset > total, we should still have correct links
        expect(result.hasNext).toBe(false)
        expect(result.hasPrev).toBe(true)
        expect(result.links.prev).toBe('https://api.example.com/users?offset=90&limit=10')
        expect(result.links.last).toBe('https://api.example.com/users?offset=40&limit=10')
      })

      it('handles limit of 1 (single item pages)', () => {
        const url = new URL('https://api.example.com/users?offset=2&limit=1')
        const result = buildPagination({
          url,
          total: 5,
          limit: 1,
          offset: 2
        })

        expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=1')
        expect(result.links.prev).toBe('https://api.example.com/users?offset=1&limit=1')
        expect(result.links.next).toBe('https://api.example.com/users?offset=3&limit=1')
        expect(result.links.last).toBe('https://api.example.com/users?offset=4&limit=1')
      })

      it('handles large page sizes', () => {
        const url = new URL('https://api.example.com/users?offset=0&limit=1000')
        const result = buildPagination({
          url,
          total: 50,
          limit: 1000,
          offset: 0
        })

        expect(result.hasNext).toBe(false)
        expect(result.hasPrev).toBe(false)
        expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=1000')
        expect(result.links.last).toBe('https://api.example.com/users?offset=0&limit=1000')
      })

      it('handles total=1', () => {
        const url = new URL('https://api.example.com/users?offset=0&limit=10')
        const result = buildPagination({
          url,
          total: 1,
          limit: 10,
          offset: 0
        })

        expect(result.hasNext).toBe(false)
        expect(result.hasPrev).toBe(false)
        expect(result.links.last).toBe('https://api.example.com/users?offset=0&limit=10')
      })
    })
  })

  describe('buildCursorPagination', () => {
    it('generates cursor-based links with next cursor', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: 'abc123'
      })

      expect(result.self).toBe('https://api.example.com/users?limit=10')
      expect(result.next).toBe('https://api.example.com/users?limit=10&cursor=abc123')
    })

    it('omits next link when hasMore is false', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: false,
        nextCursor: undefined
      })

      expect(result.self).toBe('https://api.example.com/users?limit=10')
      expect(result.next).toBeUndefined()
    })

    it('omits next link when hasMore is true but no nextCursor', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: undefined
      })

      expect(result.self).toBe('https://api.example.com/users?limit=10')
      expect(result.next).toBeUndefined()
    })

    it('preserves query parameters in cursor links', () => {
      const url = new URL('https://api.example.com/users?filter=active&sort=name&limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: 'xyz789'
      })

      expect(result.self).toContain('filter=active')
      expect(result.self).toContain('sort=name')
      expect(result.next).toContain('filter=active')
      expect(result.next).toContain('sort=name')
      expect(result.next).toContain('cursor=xyz789')
    })

    it('updates existing cursor in URL', () => {
      const url = new URL('https://api.example.com/users?cursor=old123&limit=10')
      const result = buildCursorPagination({
        url,
        cursor: 'old123',
        limit: 10,
        hasMore: true,
        nextCursor: 'new456'
      })

      expect(result.self).toBe('https://api.example.com/users?cursor=old123&limit=10')
      expect(result.next).toContain('cursor=new456')
      // Should not contain the old cursor
      expect(result.next).not.toContain('cursor=old123')
    })

    it('handles encoded cursor values', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const encodedCursor = 'eyJpZCI6MTIzfQ==' // base64 encoded JSON
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: encodedCursor
      })

      expect(result.next).toContain(`cursor=${encodeURIComponent(encodedCursor)}`)
    })

    it('handles empty string cursor', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: ''
      })

      // Empty string is falsy, so no next link
      expect(result.next).toBeUndefined()
    })

    it('works without existing query params', () => {
      const url = new URL('https://api.example.com/users')
      const result = buildCursorPagination({
        url,
        limit: 20,
        hasMore: true,
        nextCursor: 'cursor123'
      })

      expect(result.self).toBe('https://api.example.com/users')
      expect(result.next).toBe('https://api.example.com/users?cursor=cursor123&limit=20')
    })
  })
})
