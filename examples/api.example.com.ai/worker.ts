import { API } from '../../src'

export default API({
  name: 'api.example.com.ai',
  description: 'Example API demonstrating the api.do framework',
  version: '1.0.0',
  auth: { mode: 'optional', trustSnippets: true },
  crud: {
    db: 'DB',
    table: 'projects',
    searchable: ['name', 'description'],
    sortable: ['name', 'created_at', 'updated_at'],
    pageSize: 25,
  },
  analytics: { binding: 'ANALYTICS' },
  routes: (app) => {
    app.get('/health', (c) => c.var.respond({ data: { status: 'ok', timestamp: new Date().toISOString() } }))

    app.get('/examples', (c) => {
      const url = new URL(c.req.url)
      return c.var.respond({
        data: [
          { name: 'CRUD', description: 'Auto-generated REST endpoints from D1 table config', path: '/projects' },
          { name: 'Health', description: 'Simple health check endpoint', path: '/health' },
          { name: 'Response Envelope', description: 'All responses wrapped in consistent envelope', path: '/' },
        ],
        links: {
          self: `${url.origin}/examples`,
          source: 'https://github.com/dot-do/api',
          docs: 'https://api.do',
        },
      })
    })
  },
})
