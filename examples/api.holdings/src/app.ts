/**
 * api.holdings — wave-zero instantiation of register row
 * `holdings-corporate-mgmt` (NAICS 55) as a @dotdo/api instance per the
 * property template spec.
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (EntityBackOffice⟨registration⟩) are the same
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
    t('listRenewals', 'List renewal obligations (typed; filter by status/jurisdiction)', { status: { type: 'string' }, jurisdiction: { type: 'string' } }, (i) => {
      const q = i as { status?: string; jurisdiction?: string }
      return store
        .listRenewals()
        .filter((r) => (q.status ? r.status === q.status : true))
        .filter((r) => (q.jurisdiction ? r.jurisdiction === q.jurisdiction : true))
    }),
    t('getRenewal', 'One renewal obligation by id', id, (i) => store.getRenewal((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('orderRenewalFiling', 'Order a completed, verified renewal filing — returns the 402 OFFER terms (settlement rail not yet activated; labeled stub, no charge can occur)', id, (i) => {
      const r = store.getRenewal((i as { id?: string }).id ?? '')
      if (!r) return { message: 'not found' }
      return { type: 'OFFER', renewal: r.id, see: 'POST /renewals/{id}/order', stub: 'settlement rail not yet activated — no charge can occur' }
    }),
    t('listEntities', 'Entities in the current workspace — the unified entity records', {}, () => store.listEntities(ws)),
    t('getEntity', 'One unified entity record (formation, EIN, registered agent, registrations, renewals, ownership)', id, (i) => store.getEntityUnified(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createEntity', 'Create an entity record (sandbox: ephemeral workspace)', { name: { type: 'string' }, jurisdiction: { type: 'string' }, entityType: { type: 'string' }, parentId: { type: 'string' } }, (i) => store.createEntity(ws, i as store.CreateEntityInput)),
    t('listFormations', 'Typed formation records (SoS filing grain)', {}, () => store.listFormations()),
    t('getFormation', 'One formation record by id', id, (i) => store.getFormation((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listRegistrations', 'Public-registry registration rows (filter by registry/entity)', { registry: { type: 'string' }, entity: { type: 'string' } }, (i) => {
      const q = i as { registry?: string; entity?: string }
      return store
        .listRegistrations()
        .filter((r) => (q.registry ? r.registry === q.registry : true))
        .filter((r) => (q.entity ? r.entityId === q.entity : true))
    }),
    t('getRegistration', 'One registration row by id', id, (i) => store.getRegistration((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listBOIReports', 'BOI filing-status records (status grain only)', {}, () => store.listBOIReports()),
    t('listRegisteredAgents', 'Registered agents of record', {}, () => store.listRegisteredAgents()),
    t('listOwnershipStakes', 'The ownership structure as typed edges', {}, () => store.listOwnershipStakes()),
  ]
}

export function apiHoldings(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'api.holdings',
    description: 'The rail an agent calls to act on holdings and entities',
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'api.holdings', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
