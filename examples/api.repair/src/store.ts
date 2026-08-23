/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  ESTIMATES,
  INSPECTION_REPORTS,
  OPERATORS,
  RETENTION_NOTE,
  WORK_ORDERS,
  type RepairClass,
  type SeedEstimate,
  type SeedWorkOrder,
} from './seed'
import { REPAIR_CLASSES } from './substrate'

export interface Workspace {
  extraWorkOrders: SeedWorkOrder[]
  /** workspace-local status/approval overlays, keyed by record id */
  completed: Set<string>
  approvedEstimates: Set<string>
}

export function createWorkspace(): Workspace {
  return { extraWorkOrders: [], completed: new Set(), approvedEstimates: new Set() }
}

export const listOperators = () => OPERATORS

export function listWorkOrders(ws: Workspace): SeedWorkOrder[] {
  return [...WORK_ORDERS.map((w) => withOverlay(w, ws)), ...ws.extraWorkOrders]
}

export function getWorkOrder(ws: Workspace, id: string): SeedWorkOrder | undefined {
  const w = WORK_ORDERS.find((x) => x.id === id) ?? ws.extraWorkOrders.find((x) => x.id === id)
  return w && withOverlay(w, ws)
}

function withOverlay(w: SeedWorkOrder, ws: Workspace): SeedWorkOrder {
  return ws.completed.has(w.id) && w.status !== 'completed'
    ? { ...w, status: 'completed', completedOn: new Date().toISOString().slice(0, 10) }
    : w
}

export interface CreateWorkOrderInput {
  operatorId?: string
  repairClass?: string
  unit?: string
  complaint?: string
}

export function createWorkOrder(ws: Workspace, input: CreateWorkOrderInput): { workOrder?: SeedWorkOrder; error?: string } {
  const operator = OPERATORS.find((o) => o.id === input.operatorId)
  if (!operator) return { error: `unknown operatorId '${input.operatorId}' — the sandbox operators are: ${OPERATORS.map((o) => o.id).join(', ')}` }
  if (typeof input.unit !== 'string' || input.unit.length === 0) return { error: 'a work order needs { unit: string }' }
  if (typeof input.complaint !== 'string' || input.complaint.length === 0) return { error: 'a work order needs { complaint: string }' }
  const repairClass = (REPAIR_CLASSES as readonly string[]).includes(input.repairClass ?? '')
    ? (input.repairClass as RepairClass)
    : operator.repairClass
  const n = ws.extraWorkOrders.length + 1
  const workOrder: SeedWorkOrder = {
    $context: 'https://schema.org.ai',
    $type: 'WorkOrder',
    id: `wo-ws-${n}`,
    operatorId: operator.id,
    repairClass,
    status: 'open',
    assetTag: `952-ws-${String(n).padStart(4, '0')}`,
    unit: input.unit,
    complaint: input.complaint,
    openedOn: new Date().toISOString().slice(0, 10),
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraWorkOrders.push(workOrder)
  return { workOrder }
}

export function completeWorkOrder(ws: Workspace, id: string): { workOrder?: SeedWorkOrder; error?: string } {
  const w = getWorkOrder(ws, id)
  if (!w) return { error: `no work order '${id}' — see /work-orders` }
  if (w.status === 'completed') return { error: `work order '${id}' is already completed` }
  ws.completed.add(id)
  const idx = ws.extraWorkOrders.findIndex((x) => x.id === id)
  if (idx >= 0) ws.extraWorkOrders[idx] = { ...ws.extraWorkOrders[idx]!, status: 'completed', completedOn: new Date().toISOString().slice(0, 10) }
  return { workOrder: getWorkOrder(ws, id) }
}

export function listEstimates(ws: Workspace): SeedEstimate[] {
  return ESTIMATES.map((e) => withEstimateOverlay(e, ws))
}

export function getEstimate(ws: Workspace, id: string): SeedEstimate | undefined {
  const e = ESTIMATES.find((x) => x.id === id)
  return e && withEstimateOverlay(e, ws)
}

function withEstimateOverlay(e: SeedEstimate, ws: Workspace): SeedEstimate {
  return ws.approvedEstimates.has(e.id) && e.status !== 'approved' ? { ...e, status: 'approved' } : e
}

export function approveEstimate(ws: Workspace, id: string): { estimate?: SeedEstimate; error?: string } {
  const e = getEstimate(ws, id)
  if (!e) return { error: `no estimate '${id}' — see /estimates` }
  ws.approvedEstimates.add(id)
  return { estimate: getEstimate(ws, id) }
}

export const listInspectionReports = () => INSPECTION_REPORTS
export const getInspectionReport = (id: string) => INSPECTION_REPORTS.find((r) => r.id === id)
