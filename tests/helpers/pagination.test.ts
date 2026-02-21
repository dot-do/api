import { describe, it, expect } from 'vitest'
import { buildPagination, buildPagePagination, buildCursorPagination } from '../../src/helpers/pagination'

describe('Pagination helpers', () => {
  describe('buildPagination (offset-based)', () => {
    it('generates correct self, first, prev, next, last links', () => {
      const url = new URL('https://api.example.com/users?offset=20&limit=10')
      const result = buildPagination({
        url,
        total: 100,
        limit: 10,
        offset: 20,
      })

      expect(result.links.self).toBe('https://api.example.com/users?offset=20&limit=10')
      expect(result.links.first).toBe('https://api.example.com/users?offset=0&limit=10')
      expect(result.links.prev).toBe('https://api.example.com/users?offset=10&limit=10')
      expect(result.links.next).toBe('https://api.example.com/users?offset=30&limit=10')
      expect(result.links.last).toBe('https://api.example.com/users?offset=90&limit=10')
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
    })

    it('returns total, limit, and page', () => {
      const url = new URL('https://api.example.com/users?offset=20&limit=10')
      const result = buildPagination({ url, total: 100, limit: 10, offset: 20 })

      expect(result.total).toBe(100)
      expect(result.limit).toBe(10)
      expect(result.page).toBe(3) // offset 20 / limit 10 + 1
    })

    it('handles first page (no prev link)', () => {
      const url = new URL('https://api.example.com/users?offset=0&limit=10')
      const result = buildPagination({
        url,
        total: 50,
        limit: 10,
        offset: 0,
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
        offset: 40,
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
        offset: 0,
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
        offset: 0,
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
        offset: 10,
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
          offset: 0,
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
          offset: 0,
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
          offset: 0,
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
          offset: 0,
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
          offset: 9,
        })

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
          offset: 100,
        })

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
          offset: 2,
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
          offset: 0,
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
          offset: 0,
        })

        expect(result.hasNext).toBe(false)
        expect(result.hasPrev).toBe(false)
        expect(result.links.last).toBe('https://api.example.com/users?offset=0&limit=10')
      })
    })
  })

  describe('buildPagePagination', () => {
    it('generates correct links for middle page', () => {
      const url = new URL('https://api.example.com/users?page=3&limit=10')
      const result = buildPagePagination({ url, total: 100, limit: 10, page: 3 })

      expect(result.links.self).toBe('https://api.example.com/users?page=3&limit=10')
      expect(result.links.first).toContain('page=1')
      expect(result.links.prev).toContain('page=2')
      expect(result.links.next).toContain('page=4')
      expect(result.links.last).toContain('page=10')
      expect(result.total).toBe(100)
      expect(result.limit).toBe(10)
      expect(result.page).toBe(3)
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
    })

    it('omits prev on first page', () => {
      const url = new URL('https://api.example.com/users?page=1&limit=10')
      const result = buildPagePagination({ url, total: 50, limit: 10, page: 1 })

      expect(result.links.prev).toBeUndefined()
      expect(result.links.next).toContain('page=2')
      expect(result.hasPrev).toBe(false)
      expect(result.hasNext).toBe(true)
    })

    it('omits next on last page', () => {
      const url = new URL('https://api.example.com/users?page=5&limit=10')
      const result = buildPagePagination({ url, total: 50, limit: 10, page: 5 })

      expect(result.links.next).toBeUndefined()
      expect(result.links.prev).toContain('page=4')
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(true)
    })

    it('single page has neither prev nor next', () => {
      const url = new URL('https://api.example.com/users?page=1&limit=25')
      const result = buildPagePagination({ url, total: 5, limit: 25, page: 1 })

      expect(result.links.prev).toBeUndefined()
      expect(result.links.next).toBeUndefined()
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(false)
    })

    it('clamps page to valid range', () => {
      const url = new URL('https://api.example.com/users?page=999&limit=10')
      const result = buildPagePagination({ url, total: 50, limit: 10, page: 999 })

      // Should be clamped to last page (5)
      expect(result.page).toBe(5)
      expect(result.links.next).toBeUndefined()
    })
  })

  describe('buildCursorPagination', () => {
    it('generates cursor-based links with next cursor using after param', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: 'abc123',
      })

      expect(result.links.self).toBe('https://api.example.com/users?limit=10')
      expect(result.links.next).toContain('after=abc123')
      expect(result.links.next).toContain('limit=10')
      expect(result.limit).toBe(10)
    })

    it('omits next link when hasMore is false', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: false,
        nextCursor: undefined,
      })

      expect(result.links.self).toBe('https://api.example.com/users?limit=10')
      expect(result.links.next).toBeUndefined()
    })

    it('omits next link when hasMore is true but no nextCursor', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: undefined,
      })

      expect(result.links.self).toBe('https://api.example.com/users?limit=10')
      expect(result.links.next).toBeUndefined()
    })

    it('includes prev link when prevCursor is provided', () => {
      const url = new URL('https://api.example.com/users?after=abc&limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: 'def456',
        prevCursor: 'xyz789',
      })

      expect(result.links.next).toContain('after=def456')
      expect(result.links.prev).toContain('before=xyz789')
      // prev link should not contain after param
      expect(result.links.prev).not.toContain('after=')
    })

    it('preserves query parameters in cursor links', () => {
      const url = new URL('https://api.example.com/users?filter=active&sort=name&limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: 'xyz789',
      })

      expect(result.links.self).toContain('filter=active')
      expect(result.links.self).toContain('sort=name')
      expect(result.links.next).toContain('filter=active')
      expect(result.links.next).toContain('sort=name')
      expect(result.links.next).toContain('after=xyz789')
    })

    it('handles empty string cursor', () => {
      const url = new URL('https://api.example.com/users?limit=10')
      const result = buildCursorPagination({
        url,
        limit: 10,
        hasMore: true,
        nextCursor: '',
      })

      // Empty string is falsy, so no next link
      expect(result.links.next).toBeUndefined()
    })

    it('works without existing query params', () => {
      const url = new URL('https://api.example.com/users')
      const result = buildCursorPagination({
        url,
        limit: 20,
        hasMore: true,
        nextCursor: 'cursor123',
      })

      expect(result.links.self).toBe('https://api.example.com/users')
      expect(result.links.next).toBe('https://api.example.com/users?after=cursor123&limit=20')
    })
  })
})
