/**
 * api.cleaning — wave-zero instantiation of register row `facilities-services`
 * as a @dotdo/api instance (property template spec §7.3 MUSTs).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless
 * system-of-record door (FSM⟨building-services⟩ + Scheduler) are the same
 * collections; REST and MCP are emitted from the same store functions.
 * The MCP door is authless at the anon-sandbox rung only; rungs above the
 * floor are keyed (mounted-rungs-only: no keyed rung is declared until it
 * is mounted).
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
    t('listWorkOrders', 'List work orders (typed; filter by status/service/period)', { status: { type: 'string' }, service: { type: 'string' }, period: { type: 'string' } }, (i) => {
      const q = i as { status?: string; service?: string; period?: string }
      return store
        .listWorkOrders(ws)
        .filter((w) => (q.status ? w.status === q.status : true))
        .filter((w) => (q.service ? w.service === q.service : true))
        .filter((w) => (q.period ? w.period === q.period : true))
    }),
    t('getWorkOrder', 'One work order by id, with its service visits', id, (i) => {
      const w = store.getWorkOrder(ws, (i as { id?: string }).id ?? '')
      return w ? { ...w, visits: store.visitsFor(ws, w.id) } : { message: 'not found' }
    }),
    t('createWorkOrder', 'Capture a work order at the rail (sandbox: ephemeral workspace)', { facilityId: { type: 'string' }, vendorId: { type: 'string' }, service: { type: 'string' }, title: { type: 'string' } }, (i) =>
      store.createWorkOrder(ws, i as store.CreateWorkOrderInput)),
    t('dispatchWorkOrder', 'Dispatch a work order to the supply side — returns the 402 OFFER terms (labeled stub: dispatch rail not yet built, settlement rail not activated; no dispatch occurs, no charge can occur)', id, (i) => {
      const w = store.getWorkOrder(ws, (i as { id?: string }).id ?? '')
      if (!w) return { message: 'not found' }
      return { type: 'OFFER', workOrder: w.id, see: 'POST /work-orders/{id}/dispatch', stub: 'dispatch rail not yet built; settlement rail not activated — no dispatch occurs, no charge can occur' }
    }),
    t('logServiceVisit', 'Log a service visit against a work order (sandbox: ephemeral workspace)', { workOrderId: { type: 'string' }, date: { type: 'string' }, crewRole: { type: 'string' }, minutes: { type: 'number' } }, (i) => {
      const q = i as { workOrderId?: string; date?: string; crewRole?: string; minutes?: number }
      return store.logServiceVisit(ws, q.workOrderId ?? '', q)
    }),
    t('listServiceVisits', 'Service-visit records (filter by workOrder)', { workOrder: { type: 'string' } }, (i) => {
      const woId = (i as { workOrder?: string }).workOrder
      return store.listServiceVisits(ws).filter((v) => (woId ? v.workOrderId === woId : true))
    }),
    t('listSchedules', 'Recurring-service schedules (filter by service/facility)', { service: { type: 'string' }, facility: { type: 'string' } }, (i) => {
      const q = i as { service?: string; facility?: string }
      return store
        .listSchedules(ws)
        .filter((s) => (q.service ? s.service === q.service : true))
        .filter((s) => (q.facility ? s.facilityId === q.facility : true))
    }),
    t('getSchedule', 'One recurring-service schedule by id', id, (i) => store.getSchedule(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createSchedule', 'Capture a recurring-service schedule (sandbox: ephemeral workspace)', { facilityId: { type: 'string' }, vendorId: { type: 'string' }, service: { type: 'string' }, cadence: { type: 'string' } }, (i) =>
      store.createSchedule(ws, i as { facilityId?: string; vendorId?: string; service?: string; cadence?: string })),
    t('listVendors', 'Building-services vendors with onboarding-packet state', {}, () => store.listVendors()),
    t('getVendor', 'One vendor by id', id, (i) => store.getVendor((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('listFacilities', 'Facilities under service', {}, () => store.listFacilities()),
  ]
}

export function apiCleaning(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'api.cleaning',
    description: 'The rail an agent calls to get cleaning',
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'api.cleaning', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
