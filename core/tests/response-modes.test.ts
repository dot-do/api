import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { API } from '../src/index'
import { responseModesMiddleware, rewriteUrlToDomainStyle } from '../src/middleware/response-modes'

// Helper to create a test app with response modes middleware
function createApp(config?: Parameters<typeof responseModesMiddleware>[0]) {
  const app = API({
    name: 'response-modes-test',
    routes: (a) => {
      a.get('/items', (c) =>
        c.var.respond({
          data: [
            { id: 'item_1', name: 'Widget', price: 9.99 },
            { id: 'item_2', name: 'Gadget', price: 19.99 },
          ],
          total: 2,
          limit: 10,
          page: 1,
          links: {
            self: 'https://apis.do/items',
            home: 'https://apis.do',
            collection: 'https://apis.do/items',
            docs: 'https://apis.do/docs',
          },
          actions: {
            create: 'https://apis.do/items',
          },
          options: {
            sort_by_name: 'https://apis.do/items?sort=name',
          },
        }),
      )

      a.get('/contacts', (c) =>
        c.var.respond({
          data: [{ id: 'c_1', name: 'Alice' }],
          key: 'contacts',
        }),
      )

      a.get('/fail', (c) =>
        c.var.respond({
          error: { message: 'Not Found', code: 'NOT_FOUND', status: 404 },
          status: 404,
        }),
      )

      a.get('/single', (c) =>
        c.var.respond({
          data: { id: 'item_1', name: 'Widget', price: 9.99 },
          key: 'item',
        }),
      )
    },
  })

  // Add response modes middleware before the API's own middleware
  // Since API() builds its own app, we wrap it
  const wrapper = new Hono()
  wrapper.use('*', responseModesMiddleware(config))
  wrapper.route('/', app)
  return wrapper
}

describe('Response modes — no mode active', () => {
  it('passes through unchanged when no query params', async () => {
    const app = createApp()
    const res = await app.request('/items')
    const body = await res.json()

    expect(res.headers.get('content-type')).toContain('application/json')
    expect(body.data).toHaveLength(2)
    expect(body.api.name).toBe('response-modes-test')
    expect(body.links.self).toBe('https://apis.do/items')
  })
})

describe('Response modes — ?raw', () => {
  it('strips envelope and returns just data', async () => {
    const app = createApp()
    const res = await app.request('/items?raw')
    const body = await res.json()

    // Should be just the data array, no envelope
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('item_1')
    expect(body[0].name).toBe('Widget')
  })

  it('returns custom-keyed data when key is not "data"', async () => {
    const app = createApp()
    const res = await app.request('/contacts?raw')
    const body = await res.json()

    // Should find the 'contacts' key as the semantic payload
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].name).toBe('Alice')
  })

  it('returns error object when response is an error', async () => {
    const app = createApp()
    const res = await app.request('/fail?raw')
    const body = await res.json()

    expect(body.message).toBe('Not Found')
    expect(body.code).toBe('NOT_FOUND')
  })
})

describe('Response modes — ?debug', () => {
  it('adds debug metadata to response', async () => {
    const app = createApp()
    const res = await app.request('/items?debug')
    const body = await res.json()

    expect(body.debug).toBeDefined()
    expect(body.debug.timing).toBeDefined()
    expect(body.debug.timing.duration).toMatch(/^\d+ms$/)
    expect(body.debug.timing.timestamp).toBeDefined()
    expect(body.debug.request).toBeDefined()
    expect(body.debug.request.method).toBe('GET')
    expect(body.debug.request.url).toContain('/items')
  })

  it('includes request headers by default', async () => {
    const app = createApp()
    const res = await app.request('/items?debug', {
      headers: { 'X-Custom': 'test-value' },
    })
    const body = await res.json()

    expect(body.debug.request.headers).toBeDefined()
    expect(body.debug.request.headers['x-custom']).toBe('test-value')
  })

  it('omits sensitive headers', async () => {
    const app = createApp()
    const res = await app.request('/items?debug', {
      headers: { Authorization: 'Bearer secret', Cookie: 'session=abc' },
    })
    const body = await res.json()

    expect(body.debug.request.headers.authorization).toBeUndefined()
    expect(body.debug.request.headers.cookie).toBeUndefined()
  })

  it('respects debugHeaders: false config', async () => {
    const app = createApp({ debugHeaders: false })
    const res = await app.request('/items?debug', {
      headers: { 'X-Custom': 'test-value' },
    })
    const body = await res.json()

    expect(body.debug.request.headers).toBeUndefined()
  })

  it('preserves original data alongside debug', async () => {
    const app = createApp()
    const res = await app.request('/items?debug')
    const body = await res.json()

    expect(body.data).toHaveLength(2)
    expect(body.api.name).toBe('response-modes-test')
  })
})

describe('Response modes — ?domains', () => {
  it('rewrites links to domain-style URLs', async () => {
    const app = createApp()
    const res = await app.request('/items?domains')
    const body = await res.json()

    // Links should be rewritten from apis.do/events to events.do style
    expect(body.links.self).toBe('https://items.do')
    expect(body.links.home).toBe('https://apis.do')
    expect(body.links.docs).toBe('https://docs.do')
  })

  it('rewrites actions URLs', async () => {
    const app = createApp()
    const res = await app.request('/items?domains')
    const body = await res.json()

    expect(body.actions.create).toBe('https://items.do')
  })

  it('rewrites options URLs', async () => {
    const app = createApp()
    const res = await app.request('/items?domains')
    const body = await res.json()

    expect(body.options.sort_by_name).toContain('items.do')
  })

  it('uses custom domain suffix', async () => {
    const app = createApp({ domainSuffix: 'headless.ly' })
    const res = await app.request('/items?domains')
    const body = await res.json()

    expect(body.links.self).toBe('https://items.headless.ly')
  })

  it('uses explicit domain map', async () => {
    const app = createApp({
      domainMap: { items: 'products', docs: 'documentation' },
    })
    const res = await app.request('/items?domains')
    const body = await res.json()

    expect(body.links.self).toBe('https://products.do')
    expect(body.links.docs).toBe('https://documentation.do')
  })
})

describe('Response modes — ?stream', () => {
  it('returns SSE content type', async () => {
    const app = createApp()
    const res = await app.request('/items?stream')

    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  it('emits structured SSE events', async () => {
    const app = createApp()
    const res = await app.request('/items?stream')
    const text = await res.text()

    // Should contain event types
    expect(text).toContain('event: api\n')
    expect(text).toContain('event: data\n')
    expect(text).toContain('event: links\n')
    expect(text).toContain('event: done\n')
  })

  it('chunks array data into individual events', async () => {
    const app = createApp()
    const res = await app.request('/items?stream')
    const text = await res.text()

    // Each array item should be a separate data event
    const dataEvents = text.split('\n\n').filter((block: string) => block.startsWith('event: data'))
    expect(dataEvents).toHaveLength(2)

    // Parse the first data event
    const firstData = JSON.parse(dataEvents[0]!.split('data: ')[1]!)
    expect(firstData.id).toBe('item_1')
  })

  it('emits single data event for non-array data', async () => {
    const app = createApp()
    const res = await app.request('/single?stream')
    const text = await res.text()

    const dataEvents = text.split('\n\n').filter((block: string) => block.startsWith('event: data'))
    expect(dataEvents).toHaveLength(1)
  })

  it('emits error event for error responses', async () => {
    const app = createApp()
    const res = await app.request('/fail?stream')
    const text = await res.text()

    expect(text).toContain('event: error\n')
    const errorBlock = text.split('\n\n').find((block: string) => block.startsWith('event: error'))
    const errorData = JSON.parse(errorBlock!.split('data: ')[1]!)
    expect(errorData.message).toBe('Not Found')
  })

  it('ends with done event', async () => {
    const app = createApp()
    const res = await app.request('/items?stream')
    const text = await res.text()

    const blocks = text.split('\n\n').filter(Boolean)
    const lastBlock = blocks[blocks.length - 1]!
    expect(lastBlock).toContain('event: done')
    const doneData = JSON.parse(lastBlock.split('data: ')[1]!)
    expect(doneData.ok).toBe(true)
  })
})

describe('Response modes — ?format=md', () => {
  it('returns markdown content type', async () => {
    const app = createApp()
    const res = await app.request('/items?format=md')

    expect(res.headers.get('content-type')).toContain('text/markdown')
  })

  it('generates markdown table for array data', async () => {
    const app = createApp()
    const res = await app.request('/items?format=md')
    const text = await res.text()

    // Should have API heading
    expect(text).toContain('# response-modes-test')

    // Should have data table
    expect(text).toContain('| id | name | price |')
    expect(text).toContain('| --- | --- | --- |')
    expect(text).toContain('| item_1 | Widget | 9.99 |')
    expect(text).toContain('| item_2 | Gadget | 19.99 |')
  })

  it('includes pagination info', async () => {
    const app = createApp()
    const res = await app.request('/items?format=md')
    const text = await res.text()

    expect(text).toContain('> 2 total')
  })

  it('includes links section', async () => {
    const app = createApp()
    const res = await app.request('/items?format=md')
    const text = await res.text()

    expect(text).toContain('## Links')
    expect(text).toContain('[self]')
    expect(text).toContain('[home]')
  })

  it('includes actions section', async () => {
    const app = createApp()
    const res = await app.request('/items?format=md')
    const text = await res.text()

    expect(text).toContain('## Actions')
    expect(text).toContain('[create]')
  })

  it('generates key-value table for single object data', async () => {
    const app = createApp()
    const res = await app.request('/single?format=md')
    const text = await res.text()

    expect(text).toContain('| Key | Value |')
    expect(text).toContain('| id | item_1 |')
    expect(text).toContain('| name | Widget |')
  })

  it('shows error in markdown', async () => {
    const app = createApp()
    const res = await app.request('/fail?format=md')
    const text = await res.text()

    expect(text).toContain('## Error')
    expect(text).toContain('NOT_FOUND')
    expect(text).toContain('Not Found')
  })
})

describe('Response modes — combined modes', () => {
  it('applies debug + domains together', async () => {
    const app = createApp()
    const res = await app.request('/items?debug&domains')
    const body = await res.json()

    // Debug should be added
    expect(body.debug).toBeDefined()
    expect(body.debug.timing.duration).toMatch(/^\d+ms$/)

    // Links should be rewritten
    expect(body.links.self).toBe('https://items.do')
  })

  it('applies debug + raw together', async () => {
    const app = createApp()
    const res = await app.request('/items?debug&raw')
    const body = await res.json()

    // Raw strips the envelope, so debug won't be visible
    // The raw transform gets the data after debug is applied
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe('item_1')
  })

  it('applies domains + stream together', async () => {
    const app = createApp()
    const res = await app.request('/items?domains&stream')
    const text = await res.text()

    expect(res.headers.get('content-type')).toBe('text/event-stream')

    // Links event should have rewritten URLs
    const linksBlock = text.split('\n\n').find((block: string) => block.startsWith('event: links'))
    const linksData = JSON.parse(linksBlock!.split('data: ')[1]!)
    expect(linksData.self).toBe('https://items.do')
  })

  it('applies domains + format=md together', async () => {
    const app = createApp()
    const res = await app.request('/items?domains&format=md')
    const text = await res.text()

    expect(res.headers.get('content-type')).toContain('text/markdown')
    // Links in markdown should show domain-style URLs
    expect(text).toContain('items.do')
  })
})

describe('rewriteUrlToDomainStyle', () => {
  it('rewrites path-style to domain-style', () => {
    expect(rewriteUrlToDomainStyle('https://apis.do/events', 'do')).toBe('https://events.do')
  })

  it('preserves remaining path segments', () => {
    expect(rewriteUrlToDomainStyle('https://apis.do/events/123', 'do')).toBe('https://events.do/123')
  })

  it('preserves query parameters', () => {
    expect(rewriteUrlToDomainStyle('https://apis.do/events?page=2', 'do')).toBe('https://events.do/?page=2')
  })

  it('skips tenant paths (~acme)', () => {
    expect(rewriteUrlToDomainStyle('https://apis.do/~acme/events', 'do')).toBe('https://apis.do/~acme/events')
  })

  it('handles root URL (no path segments)', () => {
    const result1 = rewriteUrlToDomainStyle('https://apis.do', 'do')
    const result2 = rewriteUrlToDomainStyle('https://apis.do/', 'do')
    // URL constructor normalizes trailing slash — both are equivalent
    expect(result1.replace(/\/$/, '')).toBe('https://apis.do')
    expect(result2.replace(/\/$/, '')).toBe('https://apis.do')
  })

  it('uses custom suffix', () => {
    expect(rewriteUrlToDomainStyle('https://api.example.com/events', 'headless.ly')).toBe('https://events.headless.ly')
  })

  it('uses domain map for explicit mappings', () => {
    const map = { events: 'analytics', docs: 'documentation' }
    expect(rewriteUrlToDomainStyle('https://apis.do/events', 'do', map)).toBe('https://analytics.do')
    expect(rewriteUrlToDomainStyle('https://apis.do/docs', 'do', map)).toBe('https://documentation.do')
  })

  it('falls back to default behavior for unmapped segments', () => {
    const map = { events: 'analytics' }
    expect(rewriteUrlToDomainStyle('https://apis.do/items', 'do', map)).toBe('https://items.do')
  })

  it('handles invalid URLs gracefully', () => {
    expect(rewriteUrlToDomainStyle('not-a-url', 'do')).toBe('not-a-url')
  })
})
