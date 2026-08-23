/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  BOOKINGS,
  CAMP_SESSIONS,
  ENROLLMENTS,
  OPERATORS,
  RETENTION_NOTE,
  SAILINGS,
  TRIPS,
  type SeedBooking,
  type SeedCampSession,
  type SeedEnrollment,
} from './seed'
import { SUB_VERTICALS, type SubVertical } from './substrate'

export interface Workspace {
  extraBookings: SeedBooking[]
  extraEnrollments: Map<string, SeedEnrollment[]>
}

export function createWorkspace(): Workspace {
  return { extraBookings: [], extraEnrollments: new Map() }
}

export const listOperators = () => OPERATORS
export const listSailings = () => SAILINGS
export const getSailing = (id: string) => SAILINGS.find((s) => s.id === id)
export const listTrips = () => TRIPS
export const getTrip = (id: string) => TRIPS.find((t) => t.id === id)

export const listBookings = (ws: Workspace) => [...BOOKINGS, ...ws.extraBookings]
export const getBooking = (ws: Workspace, id: string) => listBookings(ws).find((b) => b.id === id)

export function listCampSessions(ws: Workspace): SeedCampSession[] {
  return CAMP_SESSIONS.map((s) => withRoster(s, ws))
}

export function getCampSession(ws: Workspace, id: string): (SeedCampSession & { roster: SeedEnrollment[] }) | undefined {
  const s = CAMP_SESSIONS.find((x) => x.id === id)
  if (!s) return undefined
  const roster = [...ENROLLMENTS.filter((e) => e.sessionId === id), ...(ws.extraEnrollments.get(id) ?? [])]
  return { ...withRoster(s, ws), roster }
}

function withRoster(s: SeedCampSession, ws: Workspace): SeedCampSession {
  const extra = ws.extraEnrollments.get(s.id)?.length ?? 0
  return extra > 0 ? { ...s, enrolled: s.enrolled + extra } : s
}

export interface CreateBookingInput {
  subVertical?: string
  itemRef?: string
  partySize?: number
}

export function createBooking(ws: Workspace, input: CreateBookingInput): { booking?: SeedBooking; error?: string } {
  if (!SUB_VERTICALS.includes(input.subVertical as SubVertical)) {
    return { error: `subVertical must be one of ${SUB_VERTICALS.join(' | ')}` }
  }
  const sub = input.subVertical as SubVertical
  const item =
    sub === 'camp' ? CAMP_SESSIONS.find((s) => s.id === input.itemRef) : SAILINGS.find((s) => s.id === input.itemRef && s.subVertical === sub)
  if (!item) return { error: `unknown itemRef '${input.itemRef}' for subVertical '${sub}' — see /sailings and /camp-sessions` }
  const partySize = typeof input.partySize === 'number' && input.partySize >= 1 ? Math.floor(input.partySize) : 1
  const booking: SeedBooking = {
    $context: 'https://schema.org.ai',
    $type: 'Booking',
    id: `bk-ws-${ws.extraBookings.length + 1}`,
    operatorId: item.operatorId,
    subVertical: sub,
    itemRef: item.id,
    partySize,
    contactRole: 'traveler-contact (role label — no person named)',
    status: 'pending',
    bookedOn: new Date().toISOString().slice(0, 10),
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraBookings.push(booking)
  return { booking }
}

export function enrollCamper(ws: Workspace, sessionId: string, input: { camperAgeBand?: string }): { enrollment?: SeedEnrollment; error?: string } {
  const session = CAMP_SESSIONS.find((s) => s.id === sessionId)
  if (!session) return { error: `no camp session '${sessionId}' — see /camp-sessions` }
  const existing = ws.extraEnrollments.get(sessionId) ?? []
  const enrollment: SeedEnrollment = {
    id: `enr-ws-${sessionId.slice(3)}-${existing.length + 1}`,
    sessionId,
    camperAgeBand: input.camperAgeBand ?? session.ageRange,
    guardianRole: 'guardian-contact (role label — no person named)',
    enrolledOn: new Date().toISOString().slice(0, 10),
    example: true,
  }
  ws.extraEnrollments.set(sessionId, [...existing, enrollment])
  return { enrollment }
}
