/**
 * apis.restaurant — wave-zero instantiation of register row
 * `restaurants-food-service` as a @dotdo/api instance (property template spec
 * §7.3 MUSTs, built for real).
 *
 * In this repo the example imports the framework from ../../../core/src (the
 * @dotdo/api package) so it runs (wrangler dev, vitest, tsc) without a build
 * step. Outside the repo you would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (Inventory⟨restaurant-back-of-house⟩) are the same
 * collections; REST and MCP are emitted from the same store functions.
 * Mounted-rungs-only: the MCP door is the authless sandbox rung.
 */

import type { Hono } from 'hono'
import { API } from '../../../core/src'
import type { ApiEnv, McpTool } from '../../../core/src/types'
import { mountRoutes } from './routes'
import * as store from './store'
import { emitMeter } from './seams'

function mcpTools(ws: store.Workspace): McpTool[] {
  const t = (name: string, description: string, inputSchema: Record<string, unknown>, handler: (input: unknown) => unknown): McpTool => ({
    name,
    description,
    inputSchema: { type: 'object', properties: inputSchema },
    handler: async (input) => {
      emitMeter(name, 'anon-sandbox')
      return handler(input ?? {})
    },
  })
  const id = { id: { type: 'string' } }
  return [
    t('listInventoryCounts', 'List inventory counts (typed; filter by status/period/location)', { status: { type: 'string' }, period: { type: 'string' }, location: { type: 'string' } }, (i) => {
      const q = i as { status?: string; period?: string; location?: string }
      return store
        .listInventoryCounts(ws)
        .filter((cnt) => (q.status ? cnt.status === q.status : true))
        .filter((cnt) => (q.period ? cnt.period === q.period : true))
        .filter((cnt) => (q.location ? cnt.locationId === q.location : true))
    }),
    t('getInventoryCount', 'One inventory count by id', id, (i) => store.getInventoryCount(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('recordInventoryCount', 'Record an inventory count for a location (sandbox: ephemeral workspace)', { locationId: { type: 'string' }, period: { type: 'string' }, lines: { type: 'array' } }, (i) => {
      const q = i as { locationId?: string } & store.RecordCountInput
      return store.recordInventoryCount(ws, q.locationId ?? '', q)
    }),
    t('reconcileInventoryCount', 'Order the completed, verified reconciliation of a count — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur)', id, (i) => {
      const cnt = store.getInventoryCount(ws, (i as { id?: string }).id ?? '')
      if (!cnt) return { message: 'not found' }
      return { type: 'OFFER', inventoryCount: cnt.id, see: 'POST /inventory-counts/{id}/reconcile', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listParLevels', 'Par levels (filter by location)', { location: { type: 'string' } }, (i) => {
      const q = i as { location?: string }
      return store.listParLevels().filter((p) => (q.location ? p.locationId === q.location : true))
    }),
    t('getParLevel', 'One par level by id', id, (i) => store.getParLevel((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listSupplierInvoices', 'Supplier invoices (filter by period/location)', { period: { type: 'string' }, location: { type: 'string' } }, (i) => {
      const q = i as { period?: string; location?: string }
      return store
        .listSupplierInvoices()
        .filter((si) => (q.period ? si.period === q.period : true))
        .filter((si) => (q.location ? si.locationId === q.location : true))
    }),
    t('getSupplierInvoice', 'One supplier invoice by id', id, (i) => store.getSupplierInvoice((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listOrders', 'Order records (filter by period/location)', { period: { type: 'string' }, location: { type: 'string' } }, (i) => {
      const q = i as { period?: string; location?: string }
      return store
        .listOrders()
        .filter((o) => (q.period ? o.period === q.period : true))
        .filter((o) => (q.location ? o.locationId === q.location : true))
    }),
    t('getOrder', 'One order by id', id, (i) => store.getOrder((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listMenus', 'Menus (filter by location)', { location: { type: 'string' } }, (i) => {
      const q = i as { location?: string }
      return store.listMenus().filter((m) => (q.location ? m.locationId === q.location : true))
    }),
    t('getMenu', 'One menu with its items', id, (i) => store.getMenu((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listLocations', 'Locations of the current operator workspace', {}, () => store.listLocations()),
    t('getLocation', 'One location by id', id, (i) => store.getLocation((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
  ]
}

export function apisRestaurant(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'apis.restaurant',
    description: "The functions a restaurant's systems call",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'apis.restaurant', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
