import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import type { ApiEnv } from '../../src/types'
import { responseMiddleware } from '../../src/response'
import { routerMiddleware } from '../../src/router'
import { contextMiddleware } from '../../src/middleware/context'
import { mutationMiddleware } from '../../src/middleware/mutations'

/**
 * Create a test app with router + response + mutation middleware.
 * Routes are registered to simulate real handlers that execute mutations.
 *
 * Note: Hono route patterns use `/:t` to match the `~acme` path segment.
 * The `~` prefix is part of the tenant path segment, not a route literal.
 */
function createTestApp(mutationConfig?: { secret?: string; ttl?: number; actions?: string[] }) {
  const app = new Hono<ApiEnv>()

  const config = { name: 'test-api' }

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware(config))
  app.use('*', routerMiddleware({ collections: ['contacts', 'leads'] }))
  app.use('*', mutationMiddleware({ secret: 'test-secret', ...mutationConfig }))

  // Collection action handler: create
  // Route pattern /:t matches ~acme as a whole path segment
  app.all('/:t/contacts/create', (c) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams)
    // Remove the confirm param from the data
    const { confirm, ...data } = query
    return c.var.respond({
      key: 'contact',
      data: { $id: 'contact_abc', ...data },
      status: 201,
    })
  })

  // Entity action handler: update
  app.all('/:t/contact_abc/update', (c) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams)
    const { confirm, ...data } = query
    return c.var.respond({
      key: 'contact',
      data: { $id: 'contact_abc', ...data },
    })
  })

  // Entity action handler: delete
  app.all('/:t/contact_abc/delete', (c) => {
    return c.var.respond({
      key: 'contact',
      data: { $id: 'contact_abc', deleted: true },
    })
  })

  // Entity action handler: qualify (verb)
  app.all('/:t/contact_abc/qualify', (c) => {
    return c.var.respond({
      key: 'contact',
      data: { $id: 'contact_abc', status: 'Qualified' },
    })
  })

  // Entity action handler: revert
  app.all('/:t/contact_abc/revert', (c) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams)
    const { confirm, ...data } = query
    return c.var.respond({
      key: 'contact',
      data: { $id: 'contact_abc', version: data.to || 'latest' },
    })
  })

  return app
}

describe('Mutation Middleware', () => {
  // ============================================================================
  // GET without confirm — returns confirmation preview
  // ============================================================================
  describe('GET without confirm', () => {
    it('returns confirmation preview for collection create', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contacts/create?name=Alice&email=alice@acme.com')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.confirm).toBeDefined()
      expect(body.confirm.action).toBe('create')
      expect(body.confirm.preview).toEqual({ name: 'Alice', email: 'alice@acme.com' })
      expect(body.confirm.execute).toContain('confirm=')
      expect(body.confirm.cancel).toBeDefined()
    })

    it('returns confirmation preview for entity update', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/update?status=Qualified')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.confirm).toBeDefined()
      expect(body.confirm.action).toBe('update')
      expect(body.confirm.preview).toEqual({ status: 'Qualified' })
      expect(body.confirm.execute).toContain('confirm=')
    })

    it('returns confirmation preview for entity delete', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/delete')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.confirm).toBeDefined()
      expect(body.confirm.action).toBe('delete')
      expect(body.confirm.execute).toContain('confirm=')
    })

    it('returns confirmation preview for verb action (qualify)', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/qualify')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.confirm).toBeDefined()
      expect(body.confirm.action).toBe('qualify')
      expect(body.confirm.execute).toContain('confirm=')
    })

    it('returns confirmation preview for entity revert', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/revert?to=v3')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.confirm).toBeDefined()
      expect(body.confirm.action).toBe('revert')
      expect(body.confirm.preview).toEqual({ to: 'v3' })
      expect(body.confirm.execute).toContain('confirm=')
    })

    it('includes api metadata in confirmation response', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contacts/create?name=Alice')

      const body = await res.json()
      expect(body.api).toBeDefined()
      expect(body.api.name).toBe('crm.do') // resolveApiIdentity uses hostname for .do domains
    })
  })

  // ============================================================================
  // GET with valid confirm — executes mutation
  // ============================================================================
  describe('GET with valid confirm', () => {
    it('executes create mutation when confirm hash is valid', async () => {
      const app = createTestApp()

      // Step 1: Get the confirmation preview
      const previewRes = await app.request('https://crm.do/~acme/contacts/create?name=Alice&email=alice@acme.com')
      const previewBody = await previewRes.json()
      const executeUrl = previewBody.confirm.execute

      // Step 2: Execute with the confirm hash
      const res = await app.request(executeUrl)

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.name).toBe('Alice')
      expect(body.contact.email).toBe('alice@acme.com')
    })

    it('executes update mutation when confirm hash is valid', async () => {
      const app = createTestApp()

      // Get preview
      const previewRes = await app.request('https://crm.do/~acme/contact_abc/update?status=Qualified')
      const previewBody = await previewRes.json()

      // Execute
      const res = await app.request(previewBody.confirm.execute)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.status).toBe('Qualified')
    })

    it('executes delete mutation when confirm hash is valid', async () => {
      const app = createTestApp()

      // Get preview
      const previewRes = await app.request('https://crm.do/~acme/contact_abc/delete')
      const previewBody = await previewRes.json()

      // Execute
      const res = await app.request(previewBody.confirm.execute)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.deleted).toBe(true)
    })

    it('executes verb action when confirm hash is valid', async () => {
      const app = createTestApp()

      // Get preview
      const previewRes = await app.request('https://crm.do/~acme/contact_abc/qualify')
      const previewBody = await previewRes.json()

      // Execute
      const res = await app.request(previewBody.confirm.execute)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.status).toBe('Qualified')
    })
  })

  // ============================================================================
  // POST — direct execution (no confirmation needed)
  // ============================================================================
  describe('POST bypasses confirmation', () => {
    it('executes create directly via POST', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contacts/create?name=Alice&email=alice@acme.com', {
        method: 'POST',
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.name).toBe('Alice')
      // No confirm block in POST responses
      expect(body.confirm).toBeUndefined()
    })

    it('executes update directly via POST', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/update?status=Qualified', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.status).toBe('Qualified')
      expect(body.confirm).toBeUndefined()
    })

    it('executes delete directly via POST', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/delete', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.deleted).toBe(true)
      expect(body.confirm).toBeUndefined()
    })

    it('executes verb action directly via POST', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/qualify', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.contact.status).toBe('Qualified')
      expect(body.confirm).toBeUndefined()
    })
  })

  // ============================================================================
  // Invalid confirm hash — error response
  // ============================================================================
  describe('Invalid confirm hash', () => {
    it('returns error for invalid confirm hash', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contacts/create?name=Alice&confirm=badhash')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('BAD_REQUEST')
      expect(body.error.message).toContain('confirm')
    })

    it('returns error for expired confirm hash', async () => {
      // Use very short TTL
      const app = createTestApp({ ttl: 1 }) // 1ms TTL

      // Get preview — hash is generated
      const previewRes = await app.request('https://crm.do/~acme/contacts/create?name=Alice')
      const previewBody = await previewRes.json()

      // Wait a moment, then try to confirm — the time bucket will have changed
      await new Promise((r) => setTimeout(r, 50))

      const res = await app.request(previewBody.confirm.execute)

      // Should fail because the hash was generated for a different time bucket
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })
  })

  // ============================================================================
  // Non-mutation routes pass through
  // ============================================================================
  describe('Non-mutation routes', () => {
    it('GET to collection list passes through without confirmation', async () => {
      const app = createTestApp()

      // Add a collection list handler (/:t matches ~acme)
      app.get('/:t/contacts', (c) => {
        return c.var.respond({ key: 'contacts', data: [{ $id: 'contact_abc' }] })
      })

      const res = await app.request('https://crm.do/~acme/contacts')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contacts).toBeDefined()
      expect(body.confirm).toBeUndefined()
    })

    it('GET to entity lookup passes through without confirmation', async () => {
      const app = createTestApp()

      // Add an entity handler
      app.get('/:t/contact_abc', (c) => {
        return c.var.respond({ key: 'contact', data: { $id: 'contact_abc', name: 'Alice' } })
      })

      const res = await app.request('https://crm.do/~acme/contact_abc')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.contact).toBeDefined()
      expect(body.confirm).toBeUndefined()
    })
  })

  // ============================================================================
  // Custom actions config
  // ============================================================================
  describe('Custom actions config', () => {
    it('only intercepts configured actions when actions list is provided', async () => {
      const app = createTestApp({ actions: ['create', 'update'] })

      // Add a handler for a non-mutation action
      app.get('/:t/contacts/export', (c) => {
        return c.var.respond({ key: 'export', data: { format: 'csv' } })
      })

      // 'export' is not in the actions list, should pass through
      const res = await app.request('https://crm.do/~acme/contacts/export')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.export).toBeDefined()
      expect(body.confirm).toBeUndefined()
    })
  })

  // ============================================================================
  // Confirm response shape matches spec
  // ============================================================================
  describe('Confirm response shape', () => {
    it('matches the specified response format', async () => {
      const app = createTestApp()
      const res = await app.request('https://crm.do/~acme/contacts/create?name=Alice+Johnson&email=alice@acme.com')

      expect(res.status).toBe(200)
      const body = await res.json()

      // Required fields in confirm block
      expect(body.confirm).toHaveProperty('action')
      expect(body.confirm).toHaveProperty('preview')
      expect(body.confirm).toHaveProperty('execute')
      expect(body.confirm).toHaveProperty('cancel')

      // The execute URL should be a valid URL with confirm param
      const executeUrl = new URL(body.confirm.execute)
      expect(executeUrl.searchParams.has('confirm')).toBe(true)

      // The confirm hash should be 6 hex chars
      const confirmHash = executeUrl.searchParams.get('confirm')
      expect(confirmHash).toMatch(/^[0-9a-f]{6}$/)
    })
  })
})
