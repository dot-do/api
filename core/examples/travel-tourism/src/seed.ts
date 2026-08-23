/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types. Deterministic (no RNG):
 * reseeding is a build step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; titles carry a "[demo]" label
 *   - fictional operators, vessels, camps, and ports (no real company or
 *     person names; travelers are party-size + role labels, never names)
 *   - synthetic operator registration ids use the 00- prefix
 *   - the row's source route (first-party booking capture at the rail,
 *     owned-by-construction) is not reachable in-session, so per spec §5.2
 *     this labeled synthetic seed is the wave-zero corpus — real bookings
 *     accrete at the rail later, consent-at-rail
 *   - fare/availability data is deliberately ABSENT (row: crowded lane,
 *     avoid-class 5) — a seeded fare table would improvise a lane the row
 *     rules out
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation —
 * bookings across all three zoned sub-verticals and all statuses (so the
 * branching filters genuinely branch), sailings with manifest capacity,
 * camp sessions with rosters, trips with itinerary segments, operators at
 * 5615 grain.
 */

import { SUB_VERTICALS, type SubVertical } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

export interface SeedOperator {
  $context: string
  $type: 'Operator'
  id: string
  name: string
  registrationId: string
  operatorType: 'travel-agency' | 'cruise-operator' | 'charter-operator' | 'camp-operator'
  subVertical: SubVertical | 'agency'
  example: true
  label: string
}

export interface SeedSailing {
  $context: string
  $type: 'Sailing'
  id: string
  operatorId: string
  vessel: string
  subVertical: 'cruise' | 'charter'
  departs: string
  returns: string
  ports: string[]
  capacity: number
  berthsBooked: number
  status: 'boarding-open' | 'sold-out'
  example: true
  label: string
}

export interface SeedCampSession {
  $context: string
  $type: 'CampSession'
  id: string
  operatorId: string
  name: string
  starts: string
  ends: string
  capacity: number
  enrolled: number
  ageRange: string
  status: 'enrollment-open' | 'waitlist'
  example: true
  label: string
}

export interface SeedTrip {
  $context: string
  $type: 'Trip'
  id: string
  bookingId: string
  segments: { kind: string; ref: string; date: string }[]
  example: true
  label: string
}

export interface SeedBooking {
  $context: string
  $type: 'Booking'
  id: string
  operatorId: string
  subVertical: SubVertical
  itemRef: string
  partySize: number
  contactRole: string
  status: 'confirmed' | 'pending' | 'cancelled'
  bookedOn: string
  example: true
  label: string
}

export interface SeedEnrollment {
  id: string
  sessionId: string
  camperAgeBand: string
  guardianRole: string
  enrolledOn: string
  example: true
}

/** The demo operators — tenant #1 on the production substrate (live-demo ruling). */
export const OPERATORS: SeedOperator[] = [
  { $context: CONTEXT, $type: 'Operator', id: 'op-waypoint-fern', name: 'Waypoint & Fern Travel Co (demo)', registrationId: '00-3000001', operatorType: 'travel-agency', subVertical: 'agency', example: true, label: '[demo] Fictional travel agency (5615 grain) — sandbox seed tenant' },
  { $context: CONTEXT, $type: 'Operator', id: 'op-sableline', name: 'Sable Line Coastal Cruises (demo)', registrationId: '00-3000002', operatorType: 'cruise-operator', subVertical: 'cruise', example: true, label: '[demo] Fictional small-ship cruise operator' },
  { $context: CONTEXT, $type: 'Operator', id: 'op-harborlight', name: 'Harborlight Charters LLC (demo)', registrationId: '00-3000003', operatorType: 'charter-operator', subVertical: 'charter', example: true, label: '[demo] Fictional sailing-charter operator' },
  { $context: CONTEXT, $type: 'Operator', id: 'op-cedarknoll', name: 'Cedar Knoll Summer Camp (demo)', registrationId: '00-3000004', operatorType: 'camp-operator', subVertical: 'camp', example: true, label: '[demo] Fictional residential summer camp' },
]

/** Fictional ports — no real place is claimed by the demo itineraries. */
const PORTS = ['Port Alder', 'Gullwing Cay', 'Brinemarsh Landing', 'Tern Hollow']

export const SAILINGS: SeedSailing[] = [
  { $context: CONTEXT, $type: 'Sailing', id: 's-sableline-2026-09-05', operatorId: 'op-sableline', vessel: 'MV Sable Crest (demo)', subVertical: 'cruise', departs: '2026-09-05', returns: '2026-09-12', ports: [PORTS[0]!, PORTS[1]!, PORTS[2]!], capacity: 120, berthsBooked: 84, status: 'boarding-open', example: true, label: RETENTION_NOTE },
  { $context: CONTEXT, $type: 'Sailing', id: 's-sableline-2026-10-03', operatorId: 'op-sableline', vessel: 'MV Sable Crest (demo)', subVertical: 'cruise', departs: '2026-10-03', returns: '2026-10-10', ports: [PORTS[0]!, PORTS[3]!, PORTS[1]!], capacity: 120, berthsBooked: 120, status: 'sold-out', example: true, label: RETENTION_NOTE },
  { $context: CONTEXT, $type: 'Sailing', id: 's-harborlight-2026-09-12', operatorId: 'op-harborlight', vessel: 'SV Larkspur (demo)', subVertical: 'charter', departs: '2026-09-12', returns: '2026-09-19', ports: [PORTS[2]!, PORTS[3]!], capacity: 8, berthsBooked: 6, status: 'boarding-open', example: true, label: RETENTION_NOTE },
  { $context: CONTEXT, $type: 'Sailing', id: 's-harborlight-2026-09-26', operatorId: 'op-harborlight', vessel: 'SV Larkspur (demo)', subVertical: 'charter', departs: '2026-09-26', returns: '2026-10-03', ports: [PORTS[3]!, PORTS[0]!], capacity: 8, berthsBooked: 2, status: 'boarding-open', example: true, label: RETENTION_NOTE },
]

export const CAMP_SESSIONS: SeedCampSession[] = [
  { $context: CONTEXT, $type: 'CampSession', id: 'cs-cedarknoll-2027-a', operatorId: 'op-cedarknoll', name: '[demo] Cedar Knoll Session A (June)', starts: '2027-06-14', ends: '2027-06-27', capacity: 90, enrolled: 61, ageRange: '9-12', status: 'enrollment-open', example: true, label: RETENTION_NOTE },
  { $context: CONTEXT, $type: 'CampSession', id: 'cs-cedarknoll-2027-b', operatorId: 'op-cedarknoll', name: '[demo] Cedar Knoll Session B (July)', starts: '2027-07-05', ends: '2027-07-18', capacity: 90, enrolled: 90, ageRange: '12-15', status: 'waitlist', example: true, label: RETENTION_NOTE },
]

const BOOKING_STATUSES = ['confirmed', 'pending', 'cancelled'] as const

/**
 * Deterministic bookings: every zoned sub-vertical × every status appears,
 * so `?status=` and `?subVertical=` genuinely branch (OK / narrower OK /
 * EMPTY on unmatched values). Items reference real seed sailings/sessions.
 */
export const BOOKINGS: SeedBooking[] = (() => {
  const itemsBySub: Record<SubVertical, string[]> = {
    cruise: ['s-sableline-2026-09-05', 's-sableline-2026-10-03'],
    charter: ['s-harborlight-2026-09-12', 's-harborlight-2026-09-26'],
    camp: ['cs-cedarknoll-2027-a', 'cs-cedarknoll-2027-b'],
  }
  const operatorBySub: Record<SubVertical, string> = {
    cruise: 'op-sableline',
    charter: 'op-harborlight',
    camp: 'op-cedarknoll',
  }
  const out: SeedBooking[] = []
  let n = 0
  for (const sub of SUB_VERTICALS) {
    for (const [ix, itemRef] of itemsBySub[sub].entries()) {
      for (const [si, status] of BOOKING_STATUSES.entries()) {
        n += 1
        out.push({
          $context: CONTEXT,
          $type: 'Booking',
          id: `bk-${sub}-${String(n).padStart(3, '0')}`,
          operatorId: operatorBySub[sub],
          subVertical: sub,
          itemRef,
          partySize: 1 + ((ix + si) % 4),
          contactRole: 'traveler-contact (role label — no person named)',
          status,
          bookedOn: `2026-08-${String(2 + n).padStart(2, '0')}`,
          example: true,
          label: RETENTION_NOTE,
        })
      }
    }
  }
  return out
})()

/** One itinerary per CONFIRMED booking — trips exercise the Trip noun with depth. */
export const TRIPS: SeedTrip[] = BOOKINGS.filter((b) => b.status === 'confirmed').map((b) => ({
  $context: CONTEXT,
  $type: 'Trip',
  id: `trip-${b.id.slice(3)}`,
  bookingId: b.id,
  segments:
    b.subVertical === 'camp'
      ? [
          { kind: 'arrival', ref: b.itemRef, date: '2027-06-14' },
          { kind: 'session', ref: b.itemRef, date: '2027-06-14' },
          { kind: 'departure', ref: b.itemRef, date: '2027-06-27' },
        ]
      : [
          { kind: 'embark', ref: b.itemRef, date: '2026-09-05' },
          { kind: 'sailing', ref: b.itemRef, date: '2026-09-06' },
          { kind: 'disembark', ref: b.itemRef, date: '2026-09-12' },
        ],
  example: true,
  label: RETENTION_NOTE,
}))

export const ENROLLMENTS: SeedEnrollment[] = CAMP_SESSIONS.flatMap((s, si) =>
  [0, 1].map((i) => ({
    id: `enr-${s.id.slice(3)}-${i + 1}`,
    sessionId: s.id,
    camperAgeBand: s.ageRange,
    guardianRole: 'guardian-contact (role label — no person named)',
    enrolledOn: `2026-08-${String(10 + si * 2 + i).padStart(2, '0')}`,
    example: true,
  })),
)
