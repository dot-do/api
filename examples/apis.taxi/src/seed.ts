/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types. Deterministic (no RNG):
 * reseeding is a build step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; titles carry a "[demo]" label
 *   - fictional operator, fictional city and zones (Porthaven), no real
 *     company or person names; drivers appear as role labels + call signs,
 *     never as named people
 *   - synthetic identifiers: DEMO- prefixed plates and livery license
 *     numbers (never a real municipal format claim); no VINs at all
 *   - the register row's source route is UNRULED (its candidates — municipal
 *     livery/TNC registries, GTFS feeds — are marked UNVERIFIED in the row),
 *     so per spec §5.2 this labeled synthetic seed is the wave-zero corpus.
 *     The GTFS-typed schedules below are synthetic examples in GTFS shape,
 *     NOT ingested from any real transit agency feed.
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation — a
 * fleet spanning the row's ICP (sedan taxi, charter shuttle, NEMT van), two
 * service days of reservations and trips in every status the filters branch
 * on, a full zone-pair × service-class fare schedule, and two GTFS-typed
 * routes with complete stop-time sequences.
 */

import { SERVICE_CLASSES } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

export type ServiceClass = (typeof SERVICE_CLASSES)[number]

export interface SeedVehicle {
  $context: string
  $type: 'Vehicle'
  id: string
  unit: string
  serviceClass: ServiceClass
  seats: number
  wheelchairAccessible: boolean
  plate: string
  liveryLicense: string
  example: true
  label: string
}

export interface SeedFare {
  $context: string
  $type: 'Fare'
  id: string
  fromZone: string
  toZone: string
  serviceClass: ServiceClass
  flatFare: number
  currency: 'USD'
  example: true
  label: string
}

export interface SeedReservation {
  $context: string
  $type: 'Reservation'
  id: string
  passengerRole: string
  fromZone: string
  toZone: string
  serviceClass: ServiceClass
  pickupAt: string
  status: 'requested' | 'confirmed' | 'dispatched' | 'completed'
  example: true
  label: string
}

export interface SeedTrip {
  $context: string
  $type: 'Trip'
  id: string
  reservationId: string
  vehicleId: string
  driverCallSign: string
  fromZone: string
  toZone: string
  date: string
  status: 'scheduled' | 'in-progress' | 'completed'
  fare: number
  currency: 'USD'
  example: true
  label: string
}

export interface GtfsStopTime {
  stopId: string
  stopName: string
  arrival: string
  departure: string
}

export interface SeedTransitSchedule {
  $context: string
  $type: 'TransitSchedule'
  id: string
  routeId: string
  routeName: string
  tripId: string
  serviceDate: string
  stopTimes: GtfsStopTime[]
  example: true
  label: string
}

/** The demo operator — tenant #1 on the production substrate (live-demo ruling). */
export const OPERATOR = {
  $context: CONTEXT,
  $type: 'Operator',
  id: 't-harborline',
  name: 'Harborline Livery Co (demo)',
  liveryLicense: 'DEMO-LIV-0001',
  city: 'Porthaven (fictional demo city)',
  example: true as const,
  label: '[demo] Fictional livery/shuttle/NEMT operator — sandbox seed tenant',
}

export const ZONES = ['airport', 'downtown', 'harbor-district', 'medical-center'] as const

export const VEHICLES: SeedVehicle[] = [
  {
    $context: CONTEXT, $type: 'Vehicle', id: 'v-unit-101', unit: 'unit-101', serviceClass: 'sedan',
    seats: 4, wheelchairAccessible: false, plate: 'DEMO-101', liveryLicense: 'DEMO-LIV-0001',
    example: true, label: '[demo] Sedan taxi — fictional fleet unit',
  },
  {
    $context: CONTEXT, $type: 'Vehicle', id: 'v-unit-201', unit: 'unit-201', serviceClass: 'shuttle',
    seats: 14, wheelchairAccessible: false, plate: 'DEMO-201', liveryLicense: 'DEMO-LIV-0001',
    example: true, label: '[demo] Charter shuttle — fictional fleet unit',
  },
  {
    $context: CONTEXT, $type: 'Vehicle', id: 'v-unit-301', unit: 'unit-301', serviceClass: 'nemt-van',
    seats: 6, wheelchairAccessible: true, plate: 'DEMO-301', liveryLicense: 'DEMO-LIV-0001',
    example: true, label: '[demo] Wheelchair-accessible NEMT van — fictional fleet unit',
  },
]

/** Deterministic flat-fare schedule: every ordered zone pair × service class. */
const CLASS_BASE: Record<ServiceClass, number> = { sedan: 18, shuttle: 45, 'nemt-van': 32 }

export const FARES: SeedFare[] = ZONES.flatMap((from, fi) =>
  ZONES.filter((to) => to !== from).flatMap((to) =>
    SERVICE_CLASSES.map((sc): SeedFare => {
      const ti = ZONES.indexOf(to)
      const distanceSteps = Math.abs(ti - fi) // deterministic proxy, not a geography claim
      return {
        $context: CONTEXT,
        $type: 'Fare',
        id: `f-${from}-${to}-${sc}`,
        fromZone: from,
        toZone: to,
        serviceClass: sc,
        flatFare: CLASS_BASE[sc] + distanceSteps * 6,
        currency: 'USD',
        example: true,
        label: `[demo] Flat fare ${from} → ${to} (${sc}) — synthetic schedule, fictional city`,
      }
    }),
  ),
)

export const SERVICE_DATES = ['2026-08-20', '2026-08-21'] as const

interface ResSpec {
  n: number
  from: (typeof ZONES)[number]
  to: (typeof ZONES)[number]
  sc: ServiceClass
  hour: string
  status: SeedReservation['status']
  role: string
}

const RES_SPECS: ResSpec[] = [
  { n: 1, from: 'airport', to: 'downtown', sc: 'sedan', hour: '08:00', status: 'completed', role: 'business traveler' },
  { n: 2, from: 'downtown', to: 'airport', sc: 'sedan', hour: '17:30', status: 'completed', role: 'business traveler' },
  { n: 3, from: 'harbor-district', to: 'downtown', sc: 'shuttle', hour: '09:15', status: 'dispatched', role: 'charter group lead' },
  { n: 4, from: 'medical-center', to: 'harbor-district', sc: 'nemt-van', hour: '11:00', status: 'dispatched', role: 'NEMT patient (role label only)' },
  { n: 5, from: 'downtown', to: 'medical-center', sc: 'nemt-van', hour: '14:45', status: 'confirmed', role: 'NEMT patient (role label only)' },
  { n: 6, from: 'airport', to: 'harbor-district', sc: 'shuttle', hour: '19:00', status: 'requested', role: 'charter group lead' },
]

export const RESERVATIONS: SeedReservation[] = SERVICE_DATES.flatMap((date) =>
  RES_SPECS.map((s): SeedReservation => ({
    $context: CONTEXT,
    $type: 'Reservation',
    id: `r-${date}-${s.n}`,
    passengerRole: s.role,
    fromZone: s.from,
    toZone: s.to,
    serviceClass: s.sc,
    pickupAt: `${date}T${s.hour}:00-05:00`,
    status: s.status,
    example: true,
    label: `[demo] ${s.sc} booking ${s.from} → ${s.to} — passenger is a role label, never a named person`,
  })),
)

const VEHICLE_BY_CLASS: Record<ServiceClass, string> = { sedan: 'v-unit-101', shuttle: 'v-unit-201', 'nemt-van': 'v-unit-301' }
const CALL_SIGN_BY_CLASS: Record<ServiceClass, string> = { sedan: 'D-11 (demo)', shuttle: 'D-21 (demo)', 'nemt-van': 'D-31 (demo)' }

/** Trips exist for every reservation past `confirmed` (dispatch is what mints a trip). */
export const TRIPS: SeedTrip[] = RESERVATIONS.filter((r) => r.status === 'dispatched' || r.status === 'completed').map((r): SeedTrip => {
  const date = r.pickupAt.slice(0, 10)
  const fare = FARES.find((f) => f.fromZone === r.fromZone && f.toZone === r.toZone && f.serviceClass === r.serviceClass)
  return {
    $context: CONTEXT,
    $type: 'Trip',
    id: `t-${r.id.slice(2)}`,
    reservationId: r.id,
    vehicleId: VEHICLE_BY_CLASS[r.serviceClass],
    driverCallSign: CALL_SIGN_BY_CLASS[r.serviceClass],
    fromZone: r.fromZone,
    toZone: r.toZone,
    date,
    status: r.status === 'completed' ? 'completed' : date === SERVICE_DATES[1] ? 'in-progress' : 'scheduled',
    fare: fare?.flatFare ?? CLASS_BASE[r.serviceClass],
    currency: 'USD',
    example: true,
    label: RETENTION_NOTE,
  }
})

/** GTFS-typed synthetic schedules — GTFS SHAPE, not a real agency's feed. */
const ROUTE_STOPS: Record<string, { name: string; minutes: number[] }[]> = {
  'demo-rt-1': [
    { name: 'Harbor Terminal (demo)', minutes: [0] },
    { name: 'Quayside (demo)', minutes: [7] },
    { name: 'Market Square (demo)', minutes: [15] },
    { name: 'Downtown Interchange (demo)', minutes: [24] },
  ],
  'demo-rt-2': [
    { name: 'Downtown Interchange (demo)', minutes: [0] },
    { name: 'University Gate (demo)', minutes: [9] },
    { name: 'Medical Center Main (demo)', minutes: [18] },
  ],
}

const ROUTE_NAMES: Record<string, string> = {
  'demo-rt-1': 'Route 1 — Harbor Loop (demo)',
  'demo-rt-2': 'Route 2 — Medical Shuttle (demo)',
}

function hhmm(startHour: number, addMinutes: number): string {
  const total = startHour * 60 + addMinutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

export const TRANSIT_SCHEDULES: SeedTransitSchedule[] = Object.keys(ROUTE_STOPS).flatMap((routeId) =>
  [7, 12].map((startHour, runIx): SeedTransitSchedule => ({
    $context: CONTEXT,
    $type: 'TransitSchedule',
    id: `ts-${routeId}-run${runIx + 1}`,
    routeId,
    routeName: ROUTE_NAMES[routeId]!,
    tripId: `${routeId}-2026-08-20-run${runIx + 1}`,
    serviceDate: '2026-08-20',
    stopTimes: ROUTE_STOPS[routeId]!.map((s, i): GtfsStopTime => ({
      stopId: `${routeId}-s${i + 1}`,
      stopName: s.name,
      arrival: hhmm(startHour, s.minutes[0]!),
      departure: hhmm(startHour, s.minutes[0]! + 1),
    })),
    example: true,
    label: '[demo] Synthetic GTFS-typed schedule — fictional city, NOT ingested from any real transit feed',
  })),
)
