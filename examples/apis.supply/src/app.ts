/**
 * apis.supply — wave-zero instantiation of register row
 * `wholesale-distribution` as a @dotdo/api instance (property template spec,
 * §7.3 wave-zero MUSTs).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face (X12 850/856/810
 * typed documents) and the headless system-of-record door
 * (OrderManagement/ERP at coordinate ⟨wholesale-distribution⟩) are the same
 * collections; REST and MCP are emitted from the same store functions.
 * The MCP door is authless — the anon-sandbox rung is the only rung served
 * today (bearer-key arrives with the rungs above, per the ruled ladder).
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
  const id = { id: { type: 'string' } }
  return [
    t('listPurchaseOrders', 'List purchase orders (X12 850-typed; filter by status/partner)', { status: { type: 'string' }, partner: { type: 'string' } }, (i) => {
      const q = i as { status?: string; partner?: string }
      return store
        .listPurchaseOrders(ws)
        .filter((p) => (q.status ? p.status === q.status : true))
        .filter((p) => (q.partner ? p.partner === q.partner : true))
    }),
    t('getPurchaseOrder', 'One purchase order by id, with its document flow', id, (i) => {
      const po = store.getPurchaseOrder(ws, (i as { id?: string }).id ?? '')
      return po ? { ...po, flow: store.documentFlow(po.id) } : { message: 'not found' }
    }),
    t('submitPurchaseOrder', 'Submit an 850-typed purchase order (sandbox: ephemeral workspace)', { partnerId: { type: 'string' }, lines: { type: 'array' } }, (i) =>
      store.submitPurchaseOrder(ws, i as store.SubmitPurchaseOrderInput)),
    t('matchPurchaseOrder', 'Order a verified three-way match (850 ↔ 856 ↔ 810) — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur)', id, (i) => {
      const po = store.getPurchaseOrder(ws, (i as { id?: string }).id ?? '')
      if (!po) return { message: 'not found' }
      return { type: 'OFFER', purchaseOrder: po.id, see: 'POST /purchase-orders/{id}/match', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listShipNotices', 'Advance ship notices (X12 856-typed; filter by po)', { po: { type: 'string' } }, (i) => {
      const poId = (i as { po?: string }).po
      return store.listShipNotices().filter((s) => (poId ? s.poId === poId : true))
    }),
    t('getShipNotice', 'One advance ship notice by id', id, (i) => store.getShipNotice((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listInvoices', 'Invoices (X12 810-typed; filter by po)', { po: { type: 'string' } }, (i) => {
      const poId = (i as { po?: string }).po
      return store.listInvoices().filter((inv) => (poId ? inv.poId === poId : true))
    }),
    t('getInvoice', 'One invoice by id', id, (i) => store.getInvoice((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listCatalogItems', 'The GTIN/UNSPSC-keyed product catalog (GS1 demo prefix 952 in the sandbox)', {}, () => store.listCatalogItems()),
    t('getCatalogItem', 'One catalog item by GTIN', { gtin: { type: 'string' } }, (i) => store.getCatalogItem((i as { gtin?: string }).gtin ?? '') ?? { message: 'not found' }),
    t('quoteLandedCost', 'Compute a landed-cost quote (sandbox: labeled demo formula, not real duty/freight rates)', { gtin: { type: 'string' }, qty: { type: 'number' }, destinationCountry: { type: 'string' } }, (i) =>
      store.quoteLandedCost(i as store.LandedCostInput)),
  ]
}

export function apisSupply(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'apis.supply',
    description: "The functions a distributor's systems call",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'apis.supply', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
