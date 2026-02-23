/**
 * Example/template worker entry using api.do
 *
 * Usage:
 *   import { API } from 'api.do'
 *   export default API({ ... })
 */
import { API } from './index'

export default API({
  name: 'my-api',
  description: 'Example API built with api.do',
  version: '1.0.0',
  auth: { mode: 'optional' },
  crud: {
    db: 'DB',
    table: 'items',
    searchable: ['name', 'description'],
    pageSize: 25,
  },
  routes: (app) => {
    app.get('/health', (c) => c.var.respond({ data: { status: 'ok' } }))
  },
})
