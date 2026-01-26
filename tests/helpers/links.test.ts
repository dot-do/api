import { describe, it, expect } from 'vitest'
import { createLinkBuilder } from '../../src/helpers/links'

describe('Link helpers', () => {
  describe('createLinkBuilder', () => {
    describe('basic functionality', () => {
      it('creates a link builder with baseUrl', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })

        expect(builder).toBeDefined()
        expect(typeof builder.build).toBe('function')
        expect(typeof builder.collection).toBe('function')
        expect(typeof builder.resource).toBe('function')
      })

      it('creates a link builder with baseUrl and basePath', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: '/v1'
        })

        expect(builder).toBeDefined()
      })
    })

    describe('build method', () => {
      it('builds a simple URL with path', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users')

        expect(url).toBe('https://api.example.com/users')
      })

      it('builds URL with basePath', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: '/v1'
        })
        const url = builder.build('/users')

        expect(url).toBe('https://api.example.com/v1/users')
      })

      it('builds URL with query parameters', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users', { page: '1', limit: '10' })

        expect(url).toBe('https://api.example.com/users?page=1&limit=10')
      })

      it('builds URL with basePath and query parameters', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: '/api/v2'
        })
        const url = builder.build('/items', { sort: 'name', order: 'asc' })

        expect(url).toBe('https://api.example.com/api/v2/items?sort=name&order=asc')
      })

      it('handles empty params object', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users', {})

        expect(url).toBe('https://api.example.com/users')
      })

      it('handles undefined params', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users', undefined)

        expect(url).toBe('https://api.example.com/users')
      })

      it('handles no params argument', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users')

        expect(url).toBe('https://api.example.com/users')
      })
    })

    describe('link generation with different base URLs', () => {
      it('works with HTTP URLs', () => {
        const builder = createLinkBuilder({ baseUrl: 'http://localhost:3000' })
        const url = builder.build('/api/users')

        expect(url).toBe('http://localhost:3000/api/users')
      })

      it('works with HTTPS URLs', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://secure.api.com' })
        const url = builder.build('/data')

        expect(url).toBe('https://secure.api.com/data')
      })

      it('works with URLs containing ports', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com:8443' })
        const url = builder.build('/users')

        expect(url).toBe('https://api.example.com:8443/users')
      })

      it('works with localhost and port', () => {
        const builder = createLinkBuilder({ baseUrl: 'http://127.0.0.1:8080' })
        const url = builder.build('/test')

        expect(url).toBe('http://127.0.0.1:8080/test')
      })

      it('works with subdomain URLs', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.v1.prod.example.com' })
        const url = builder.build('/resources')

        expect(url).toBe('https://api.v1.prod.example.com/resources')
      })

      it('handles trailing slash in baseUrl', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com/' })
        const url = builder.build('/users')

        // URL constructor normalizes this
        expect(url).toBe('https://api.example.com/users')
      })

      it('handles empty basePath', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: ''
        })
        const url = builder.build('/users')

        expect(url).toBe('https://api.example.com/users')
      })

      it('handles basePath with trailing slash', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: '/v1/'
        })
        const url = builder.build('users')

        expect(url).toBe('https://api.example.com/v1/users')
      })
    })

    describe('collection method', () => {
      it('generates collection links with self and docs', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.collection('/users')

        expect(links.self).toBe('https://api.example.com/users')
        expect(links.docs).toBe('https://api.example.com/docs')
      })

      it('generates collection links with basePath', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: '/v1'
        })
        const links = builder.collection('/products')

        expect(links.self).toBe('https://api.example.com/v1/products')
        expect(links.docs).toBe('https://api.example.com/v1/docs')
      })

      it('handles root path collection', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.collection('/')

        expect(links.self).toBe('https://api.example.com/')
        expect(links.docs).toBe('https://api.example.com/docs')
      })

      it('handles nested path collection', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.collection('/organizations/123/members')

        expect(links.self).toBe('https://api.example.com/organizations/123/members')
        expect(links.docs).toBe('https://api.example.com/docs')
      })
    })

    describe('resource method', () => {
      it('generates resource links with self and collection', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.resource('/users', '123')

        expect(links.self).toBe('https://api.example.com/users/123')
        expect(links.collection).toBe('https://api.example.com/users')
      })

      it('generates resource links with basePath', () => {
        const builder = createLinkBuilder({
          baseUrl: 'https://api.example.com',
          basePath: '/api/v2'
        })
        const links = builder.resource('/items', 'abc-456')

        expect(links.self).toBe('https://api.example.com/api/v2/items/abc-456')
        expect(links.collection).toBe('https://api.example.com/api/v2/items')
      })

      it('handles UUID ids', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.resource('/documents', '550e8400-e29b-41d4-a716-446655440000')

        expect(links.self).toBe('https://api.example.com/documents/550e8400-e29b-41d4-a716-446655440000')
        expect(links.collection).toBe('https://api.example.com/documents')
      })

      it('handles nested resource paths', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.resource('/orgs/456/teams', '789')

        expect(links.self).toBe('https://api.example.com/orgs/456/teams/789')
        expect(links.collection).toBe('https://api.example.com/orgs/456/teams')
      })

      it('handles numeric string ids', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const links = builder.resource('/posts', '42')

        expect(links.self).toBe('https://api.example.com/posts/42')
        expect(links.collection).toBe('https://api.example.com/posts')
      })
    })

    describe('edge cases', () => {
      describe('special characters in params', () => {
        it('encodes special characters in query values', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/search', { q: 'hello world' })

          expect(url).toBe('https://api.example.com/search?q=hello+world')
        })

        it('encodes ampersand in query values', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/search', { q: 'foo&bar' })

          expect(url).toContain('q=foo%26bar')
        })

        it('encodes equals sign in query values', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/search', { filter: 'status=active' })

          expect(url).toContain('filter=status%3Dactive')
        })

        it('encodes question mark in query values', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/search', { q: 'what?' })

          expect(url).toContain('q=what%3F')
        })

        it('encodes unicode characters in query values', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/search', { q: 'caf\u00E9' })

          expect(url).toContain('q=caf%C3%A9')
        })

        it('handles empty string parameter value', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/users', { filter: '' })

          expect(url).toBe('https://api.example.com/users?filter=')
        })
      })

      describe('special characters in paths', () => {
        it('handles paths with hyphens', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/api-v2/user-profiles')

          expect(url).toBe('https://api.example.com/api-v2/user-profiles')
        })

        it('handles paths with underscores', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/user_accounts')

          expect(url).toBe('https://api.example.com/user_accounts')
        })

        it('handles paths with numbers', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/v2/api123')

          expect(url).toBe('https://api.example.com/v2/api123')
        })
      })

      describe('special characters in resource ids', () => {
        it('handles id with hyphen', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const links = builder.resource('/items', 'item-123-abc')

          expect(links.self).toBe('https://api.example.com/items/item-123-abc')
        })

        it('handles id with underscore', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const links = builder.resource('/items', 'item_123')

          expect(links.self).toBe('https://api.example.com/items/item_123')
        })

        it('handles id with dots', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const links = builder.resource('/versions', '1.2.3')

          expect(links.self).toBe('https://api.example.com/versions/1.2.3')
        })
      })

      describe('multiple query parameters', () => {
        it('handles many parameters', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/search', {
            q: 'test',
            page: '1',
            limit: '10',
            sort: 'name',
            order: 'asc',
            filter: 'active'
          })

          expect(url).toContain('q=test')
          expect(url).toContain('page=1')
          expect(url).toContain('limit=10')
          expect(url).toContain('sort=name')
          expect(url).toContain('order=asc')
          expect(url).toContain('filter=active')
        })

        it('maintains parameter order from object', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/users', {
            a: '1',
            b: '2',
            c: '3'
          })

          // URLSearchParams maintains insertion order
          expect(url).toBe('https://api.example.com/users?a=1&b=2&c=3')
        })
      })

      describe('path edge cases', () => {
        it('handles double slashes in path (URL treats as protocol-relative)', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('//users')

          // URL constructor interprets // as protocol-relative URL
          // This is expected browser URL behavior
          expect(url).toBe('https://users/')
        })

        it('handles path without leading slash', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('users')

          expect(url).toBe('https://api.example.com/users')
        })

        it('handles empty path', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('')

          expect(url).toBe('https://api.example.com/')
        })

        it('handles root path', () => {
          const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
          const url = builder.build('/')

          expect(url).toBe('https://api.example.com/')
        })
      })
    })

    describe('pagination link generation', () => {
      it('generates pagination-style links with offset and limit', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users', { offset: '20', limit: '10' })

        expect(url).toBe('https://api.example.com/users?offset=20&limit=10')
      })

      it('generates cursor-based pagination links', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users', { cursor: 'abc123', limit: '25' })

        expect(url).toBe('https://api.example.com/users?cursor=abc123&limit=25')
      })

      it('generates page-based pagination links', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/posts', { page: '3', per_page: '15' })

        expect(url).toBe('https://api.example.com/posts?page=3&per_page=15')
      })
    })

    describe('action link generation', () => {
      it('generates action links for resources', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })

        const activate = builder.build('/users/123/activate')
        const deactivate = builder.build('/users/123/deactivate')
        const suspend = builder.build('/users/123/suspend')

        expect(activate).toBe('https://api.example.com/users/123/activate')
        expect(deactivate).toBe('https://api.example.com/users/123/deactivate')
        expect(suspend).toBe('https://api.example.com/users/123/suspend')
      })

      it('generates action links with query parameters', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/orders/456/ship', { carrier: 'fedex' })

        expect(url).toBe('https://api.example.com/orders/456/ship?carrier=fedex')
      })

      it('generates bulk action links', () => {
        const builder = createLinkBuilder({ baseUrl: 'https://api.example.com' })
        const url = builder.build('/users/bulk-delete', { ids: '1,2,3' })

        expect(url).toContain('/users/bulk-delete')
        expect(url).toContain('ids=1%2C2%2C3')
      })
    })
  })
})
