/**
 * apis.shop — wave-zero instantiation of register row `retail-ecommerce`
 * as a @dotdo/api instance (property template spec §7.3).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * OMS/storefront system-of-record doors (OMS⟨online-retailers⟩ +
 * Storefront⟨multichannel-merchants, marketplace-sellers⟩) are the same
 * collections; REST and MCP are emitted from the same store functions.
 *
 * MCP auth (batch ruling): authless on the anon-sandbox rung — the only rung
 * mounted at wave zero; a bearer key becomes required on rungs above it when
 * they mount.
 */

import type { Hono } from 'hono'
import { API } from '../../../src'
import type { ApiEnv, McpTool } from '../../../src/types'
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
  const gtin = { gtin: { type: 'string' } }
  const id = { id: { type: 'string' } }
  return [
    t('listProducts', 'List catalog products (typed; filter by category/brand)', { category: { type: 'string' }, brand: { type: 'string' } }, (i) => {
      const q = i as { category?: string; brand?: string }
      return store
        .listProducts(ws)
        .filter((p) => (q.category ? p.category === q.category : true))
        .filter((p) => (q.brand ? p.brand === q.brand : true))
    }),
    t('getProduct', 'One product by GTIN', gtin, (i) => store.getProduct(ws, (i as { gtin?: string }).gtin ?? '') ?? { message: 'not found' }),
    t('createProduct', 'Add a catalog product (sandbox: ephemeral workspace; GTIN minted from the GS1 demo-952 space when omitted)', { gtin: { type: 'string' }, name: { type: 'string' }, brand: { type: 'string' }, category: { type: 'string' } }, (i) => {
      const r = store.createProduct(ws, i as store.CreateProductInput)
      return r.error ? { error: r.error } : r.product
    }),
    t('resolveDigitalLink', 'GS1 Digital Link resolution + the 4-lens identity crosswalk (GTIN/GPC/UNSPSC/HTS)', gtin, (i) => store.resolveIdentity(ws, (i as { gtin?: string }).gtin ?? '') ?? { message: 'not found' }),
    t('listOffers', 'Offers — price + availability per GTIN (filter by gtin/availability)', { gtin: { type: 'string' }, availability: { type: 'string' } }, (i) => {
      const q = i as { gtin?: string; availability?: string }
      return store
        .listOffers(ws)
        .filter((o) => (q.gtin ? o.gtin === q.gtin : true))
        .filter((o) => (q.availability ? o.availability === q.availability : true))
    }),
    t('getOffer', 'One offer by id', id, (i) => store.getOffer(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createOffer', 'Publish an offer for a catalog product (sandbox: ephemeral workspace)', { gtin: { type: 'string' }, price: { type: 'number' }, availability: { type: 'string' } }, (i) => {
      const r = store.createOffer(ws, i as store.CreateOfferInput)
      return r.error ? { error: r.error } : r.offer
    }),
    t('listOrders', 'Orders in the current workspace (filter by status)', { status: { type: 'string' } }, (i) => {
      const s = (i as { status?: string }).status
      return store.listOrders(ws).filter((o) => (s ? o.status === s : true))
    }),
    t('getOrder', 'One order by id', id, (i) => store.getOrder(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createOrder', 'Place an order against served offers (the agents-as-buyers door; sandbox: ephemeral workspace, no payment occurs)', { lines: { type: 'array' }, customer: { type: 'string' } }, (i) => {
      const r = store.createOrder(ws, i as store.CreateOrderInput)
      return r.error ? { error: r.error } : r.order
    }),
  ]
}

export function apisShop(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'apis.shop',
    description: "The functions a shop's systems call",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'apis.shop', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
