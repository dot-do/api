/**
 * api.repair — wave-zero instantiation of register row `repair-field-services`
 * as a @dotdo/api instance (spec §7.3 MUSTs).
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 *
 * One worker, one substrate, both plies: the data face and the headless FSM
 * system-of-record door (FSM⟨repair-field-services⟩) are the same
 * collections; REST and MCP are emitted from the same store functions. The
 * MCP door is authless at the sandbox rung (the universal floor); keyed
 * rungs sit ABOVE it on the B2A ladder — never below.
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
    t('listWorkOrders', 'List work orders (typed; filter by status/repairClass)', { status: { type: 'string' }, repairClass: { type: 'string' } }, (i) => {
      const q = i as { status?: string; repairClass?: string }
      return store
        .listWorkOrders(ws)
        .filter((w) => (q.status ? w.status === q.status : true))
        .filter((w) => (q.repairClass ? w.repairClass === q.repairClass : true))
    }),
    t('getWorkOrder', 'One work order by id', id, (i) => store.getWorkOrder(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('createWorkOrder', 'Open a work order — the FSM system-of-record door (sandbox: ephemeral workspace)', { operatorId: { type: 'string' }, repairClass: { type: 'string' }, unit: { type: 'string' }, complaint: { type: 'string' } }, (i) =>
      store.createWorkOrder(ws, i as store.CreateWorkOrderInput)),
    t('completeWorkOrder', 'Complete a work order (status transition; sandbox: ephemeral workspace)', id, (i) => store.completeWorkOrder(ws, (i as { id?: string }).id ?? '')),
    t('listEstimates', 'Estimates with line items and internally consistent totals', { status: { type: 'string' }, workOrder: { type: 'string' } }, (i) => {
      const q = i as { status?: string; workOrder?: string }
      return store
        .listEstimates(ws)
        .filter((e) => (q.status ? e.status === q.status : true))
        .filter((e) => (q.workOrder ? e.workOrderId === q.workOrder : true))
    }),
    t('getEstimate', 'One estimate by id', id, (i) => store.getEstimate(ws, (i as { id?: string }).id ?? '') ?? { message: 'not found' }),
    t('approveEstimate', 'Approve an estimate (lifecycle verb; sandbox: ephemeral workspace)', id, (i) => store.approveEstimate(ws, (i as { id?: string }).id ?? '')),
    t('listInspectionReports', 'Inspection reports — the condition record behind an estimate', { workOrder: { type: 'string' } }, (i) => {
      const q = i as { workOrder?: string }
      return [...store.listInspectionReports()].filter((r) => (q.workOrder ? r.workOrderId === q.workOrder : true))
    }),
    t('getInspectionReport', 'One inspection report by id', id, (i) => store.getInspectionReport((i as { id?: string }).id ?? '') ?? { message: 'not found' }),
  ]
}

export function apiRepair(): Hono<ApiEnv> {
  const ws = store.createWorkspace()
  return API({
    name: 'api.repair',
    description: 'The rail an agent calls to get repair',
    version: '0.1.0',
    landing: false, // the machine face owns '/' (three-faced home via the vendored generator)
    mcp: { name: 'api.repair', version: '0.1.0', tools: mcpTools(ws) },
    routes: (app) => mountRoutes(app, ws),
  })
}
