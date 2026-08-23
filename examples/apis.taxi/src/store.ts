/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  FARES,
  RESERVATIONS,
  RETENTION_NOTE,
  TRANSIT_SCHEDULES,
  TRIPS,
  VEHICLES,
  ZONES,
  type SeedFare,
  type SeedReservation,
  type SeedTrip,
  type ServiceClass,
} from './seed'
import { SERVICE_CLASSES } from './substrate'

export interface Workspace {
  extraReservations: SeedReservation[]
}

export function createWorkspace(): Workspace {
  return { extraReservations: [] }
}

export const listTrips = (): SeedTrip[] => TRIPS
export const getTrip = (id: string) => TRIPS.find((t) => t.id === id)
export const listVehicles = () => VEHICLES
export const getVehicle = (id: string) => VEHICLES.find((v) => v.id === id)
export const listFares = () => FARES
export const listTransitSchedules = () => TRANSIT_SCHEDULES
export const getTransitSchedule = (id: string) => TRANSIT_SCHEDULES.find((s) => s.id === id)

export const listReservations = (ws: Workspace): SeedReservation[] => [...RESERVATIONS, ...ws.extraReservations]
export const getReservation = (ws: Workspace, id: string) => listReservations(ws).find((r) => r.id === id)

export function quoteFare(fromZone: string, toZone: string, serviceClass: string): { fare?: SeedFare; error?: string } {
  if (!(ZONES as readonly string[]).includes(fromZone)) return { error: `unknown fromZone '${fromZone}' — zones: ${ZONES.join(', ')}` }
  if (!(ZONES as readonly string[]).includes(toZone)) return { error: `unknown toZone '${toZone}' — zones: ${ZONES.join(', ')}` }
  if (!(SERVICE_CLASSES as readonly string[]).includes(serviceClass)) {
    return { error: `unknown serviceClass '${serviceClass}' — classes: ${SERVICE_CLASSES.join(', ')}` }
  }
  const fare = FARES.find((f) => f.fromZone === fromZone && f.toZone === toZone && f.serviceClass === serviceClass)
  if (!fare) return { error: `no fare published for ${fromZone} → ${toZone} (${serviceClass})` }
  return { fare }
}

export interface CreateReservationInput {
  fromZone?: string
  toZone?: string
  serviceClass?: string
  pickupAt?: string
}

export function createReservation(ws: Workspace, input: CreateReservationInput): { reservation?: SeedReservation; error?: string } {
  const { fromZone, toZone, serviceClass } = input
  if (!fromZone || !toZone || !serviceClass) {
    return { error: 'a booking needs { fromZone, toZone, serviceClass } — see /fares for zones and classes' }
  }
  const quoted = quoteFare(fromZone, toZone, serviceClass)
  if (quoted.error) return { error: quoted.error }
  const reservation: SeedReservation = {
    $context: 'https://schema.org.ai',
    $type: 'Reservation',
    id: `r-ws-${ws.extraReservations.length + 1}`,
    passengerRole: 'sandbox requester (role label only)',
    fromZone,
    toZone,
    serviceClass: serviceClass as ServiceClass,
    pickupAt: input.pickupAt ?? new Date().toISOString(),
    status: 'requested',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraReservations.push(reservation)
  return { reservation }
}
