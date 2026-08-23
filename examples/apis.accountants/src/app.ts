/**
 * apis.accountants — wave-zero instantiation of register row `accounting-tax`
 * as a @dotdo/api instance (spec §10 worked example, built for real).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (Accounting⟨accounting-firms⟩) are the same
 * collections; REST and MCP are emitted from the same store functions.
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
    t('listCloseDeliverables', 'List close deliverables (typed; filter by status/period)', { status: { type: 'string' }, period: { type: 'string' } }, (i) => {
      const q = i as { status?: string; period?: string }
      return store
        .listCloseDeliverables()
        .filter((d) => (q.status ? d.status === q.status : true))
        .filter((d) => (q.period ? d.period === q.period : true))
    }),
    t('getCloseDeliverable', 'One close deliverable by id', id, (i) => store.getCloseDeliverable((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('orderCloseDeliverable', 'Order a completed, verified close deliverable — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur)', id, (i) => {
      const d = store.getCloseDeliverable((i as { id?: string }).id ?? '')
      if (!d) return { message: 'not found' }
      return { type: 'OFFER', deliverable: d.id, see: 'POST /close-deliverables/{id}/order', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listLedgers', 'Ledgers in the current workspace', {}, () => store.listLedgers(ws).map((l) => ({ ...l, entries: undefined, entryCount: l.entries.length }))),
    t('getLedger', 'One ledger with its entries', id, (i) => store.getLedger(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('postEntry', 'Post a balanced journal entry (sandbox: ephemeral workspace)', { ledgerId: { type: 'string' }, memo: { type: 'string' }, lines: { type: 'array' } }, (i) => {
      const q = i as { ledgerId?: string } & store.PostEntryInput
      return store.postEntry(ws, q.ledgerId ?? '', q)
    }),
    t('listReturns', 'Year-keyed returns', { year: { type: 'string' } }, (i) => {
      const y = (i as { year?: string }).year
      return store.listReturns().filter((r) => (y ? String(r.year) === y : true))
    }),
    t('getReturn', 'One return by id', id, (i) => store.getReturn((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listClients', 'Clients of the current firm workspace', {}, () => store.listClients()),
    t('listEngagements', 'Engagements in the current firm workspace', {}, () => store.listEngagements(ws)),
    t('createEngagement', 'Create an engagement (sandbox: ephemeral workspace)', { clientId: { type: 'string' } }, (i) => store.createEngagement(ws, i as { clientId?: string })),
  ]
}

export function apisAccountants(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'apis.accountants',
    description: "The functions an accounting firm's systems call",
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'apis.accountants', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
