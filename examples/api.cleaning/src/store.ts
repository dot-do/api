/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  FACILITIES,
  RETENTION_NOTE,
  SCHEDULES,
  SERVICE_VISITS,
  VENDORS,
  WORK_ORDERS,
  type SeedSchedule,
  type SeedServiceVisit,
  type SeedWorkOrder,
  type ServiceClass,
} from './seed'
import { SERVICE_CLASSES } from './substrate'

export interface Workspace {
  extraWorkOrders: SeedWorkOrder[]
  extraSchedules: SeedSchedule[]
  extraVisits: SeedServiceVisit[]
}

export function createWorkspace(): Workspace {
  return { extraWorkOrders: [], extraSchedules: [], extraVisits: [] }
}

const CONTEXT = 'https://schema.org.ai'

export const listVendors = () => VENDORS
export const getVendor = (id: string) => VENDORS.find((v) => v.id === id)
export const listFacilities = () => FACILITIES

export const listWorkOrders = (ws: Workspace) => [...WORK_ORDERS, ...ws.extraWorkOrders]
export const getWorkOrder = (ws: Workspace, id: string) => listWorkOrders(ws).find((w) => w.id === id)
export const listServiceVisits = (ws: Workspace) => [...SERVICE_VISITS, ...ws.extraVisits]
export const visitsFor = (ws: Workspace, workOrderId: string) => listServiceVisits(ws).filter((v) => v.workOrderId === workOrderId)

export const listSchedules = (ws: Workspace) => [...SCHEDULES, ...ws.extraSchedules]
export const getSchedule = (ws: Workspace, id: string) => listSchedules(ws).find((s) => s.id === id)

export interface CreateWorkOrderInput {
  facilityId?: string
  vendorId?: string
  service?: string
  title?: string
}

export function createWorkOrder(ws: Workspace, input: CreateWorkOrderInput): { workOrder?: SeedWorkOrder; error?: string } {
  const facility = FACILITIES.find((f) => f.id === input.facilityId)
  if (!facility) return { error: `unknown facilityId '${input.facilityId}' — see /facilities` }
  const vendor = VENDORS.find((v) => v.id === input.vendorId)
  if (!vendor) return { error: `unknown vendorId '${input.vendorId}' — see /vendors` }
  if (!SERVICE_CLASSES.includes(input.service as ServiceClass)) {
    return { error: `service must be one of ${SERVICE_CLASSES.join(', ')}` }
  }
  const workOrder: SeedWorkOrder = {
    $context: CONTEXT,
    $type: 'WorkOrder',
    id: `wo-ws-${ws.extraWorkOrders.length + 1}`,
    facilityId: facility.id,
    vendorId: vendor.id,
    service: input.service as ServiceClass,
    period: new Date().toISOString().slice(0, 7),
    status: 'scheduled',
    naics: vendor.naics,
    estimate: { amount: 0, currency: 'USD', basis: '[sandbox workspace — ephemeral] no estimate priced; capture-only record' },
    title: `[sandbox workspace — ephemeral] ${input.title ?? `${input.service} work order`}`,
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraWorkOrders.push(workOrder)
  return { workOrder }
}

export function logServiceVisit(ws: Workspace, workOrderId: string, input: { date?: string; crewRole?: string; minutes?: number }): { visit?: SeedServiceVisit; error?: string } {
  const workOrder = getWorkOrder(ws, workOrderId)
  if (!workOrder) return { error: `no work order '${workOrderId}' — see /work-orders` }
  const minutes = input.minutes ?? 0
  if (typeof minutes !== 'number' || minutes <= 0) return { error: 'a service visit needs { minutes: number > 0 }' }
  const visit: SeedServiceVisit = {
    $context: CONTEXT,
    $type: 'ServiceVisit',
    id: `sv-ws-${ws.extraVisits.length + 1}`,
    workOrderId,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    crewRole: input.crewRole ?? 'crew',
    minutes,
    outcome: 'completed',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraVisits.push(visit)
  return { visit }
}

export function createSchedule(ws: Workspace, input: { facilityId?: string; vendorId?: string; service?: string; cadence?: string }): { schedule?: SeedSchedule; error?: string } {
  const facility = FACILITIES.find((f) => f.id === input.facilityId)
  if (!facility) return { error: `unknown facilityId '${input.facilityId}' — see /facilities` }
  const vendor = VENDORS.find((v) => v.id === input.vendorId)
  if (!vendor) return { error: `unknown vendorId '${input.vendorId}' — see /vendors` }
  if (!SERVICE_CLASSES.includes(input.service as ServiceClass)) {
    return { error: `service must be one of ${SERVICE_CLASSES.join(', ')}` }
  }
  if (!input.cadence) return { error: 'a recurring schedule needs a cadence (e.g. nightly-5x-week, biweekly, monthly)' }
  const schedule: SeedSchedule = {
    $context: CONTEXT,
    $type: 'ServiceSchedule',
    id: `s-ws-${ws.extraSchedules.length + 1}`,
    facilityId: facility.id,
    vendorId: vendor.id,
    service: input.service as ServiceClass,
    cadence: input.cadence,
    startedOn: new Date().toISOString().slice(0, 10),
    status: 'active',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraSchedules.push(schedule)
  return { schedule }
}
