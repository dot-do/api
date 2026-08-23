/**
 * substrate.ts — Stratum A: the G3 substrate `passenger-mobility`, instantiated
 * from the register row (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "passenger-mobility") per the property template spec §1.
 *
 * Row facts this file is built from (never re-derived):
 *   - G1 anchors: NAICS 485-487; O*NET 53-3054 [UNVERIFIED code, per row];
 *     GTFS as the public-transit data standard [row marks UNVERIFIED];
 *     schema.org Reservation/Trip nouns
 *   - data ply: booking/trip record (schema.org Offer/Reservation) +
 *     fare/rate record; GTFS-typed transit schedules for the 4851 sub-branch
 *   - headless ply: dispatch + booking/scheduling (H5 Scheduler rail
 *     vertically lensed; FSM-adjacent dispatch); the row records that no
 *     cascade row exists at this coordinate
 *   - source route: NO RULED ROUTE (candidates in the row are UNVERIFIED) —
 *     so the wave-zero corpus is the §5.2 labeled synthetic sandbox seed
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products` and
 * this local copy is extracted to it then (prove-then-extract — this example
 * is a proving instance, not the abstraction's home).
 *
 * Nothing in this file is brand, ICP, motion, offer, price, or positioning —
 * those are G4 projection fields (../projections/*.json, spec §2).
 */

export type NounBinding = 'ingested' | 'generated' | 'native' | 'federated'

export interface NounDef {
  /** canonical Noun name, PascalCase */
  noun: string
  /** $type → schema.org.ai identity (falls back to schema.org generics per cascade rule 2) */
  schema: string
  binding: NounBinding
  verbs: string[]
  /** why this binding — provenance metadata per the row's source route */
  bindingNote: string
}

export interface SystemCoordinate {
  system: string
  coordinates: string[]
}

export interface OperationDef {
  /** OpenAPI operationId — the only thing a rate card may price */
  operation: string
  method: 'GET' | 'POST'
  path: string
  noun: string
  summary: string
}

export interface APIProduct {
  substrate: string
  nouns: NounDef[]
  systems: SystemCoordinate[]
  transports: string[]
  operations: OperationDef[]
  /** §5.2 sandbox: seed spec is versioned with the manifest; reseed = build step */
  sandbox: { seedModule: string; seedVersion: string; tenancyNote: string }
  /** one meter per operation, tagged per spec §6.4 at emit time */
  meters: { operation: string }[]
}

/** Service classes the fleet grain serves (row ICP: taxi fleet, shuttle/charter, NEMT). */
export const SERVICE_CLASSES = ['sedan', 'shuttle', 'nemt-van'] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listTrips', method: 'GET', path: '/trips', noun: 'Trip', summary: 'The branching trip collection — typed OK | EMPTY | BLOCKED on one pathname, branching on status, date, and vehicle' },
  { operation: 'getTrip', method: 'GET', path: '/trips/{id}', noun: 'Trip', summary: 'One trip by id' },
  { operation: 'listReservations', method: 'GET', path: '/reservations', noun: 'Reservation', summary: 'Reservations (bookings) in the current workspace' },
  { operation: 'getReservation', method: 'GET', path: '/reservations/{id}', noun: 'Reservation', summary: 'One reservation by id' },
  { operation: 'createReservation', method: 'POST', path: '/reservations', noun: 'Reservation', summary: 'Book a pickup (sandbox: ephemeral workspace)' },
  { operation: 'dispatchTrip', method: 'POST', path: '/reservations/{id}/dispatch', noun: 'Trip', summary: 'Dispatch a vehicle against a confirmed reservation (outcome grain) — answers the 402 OFFER boundary' },
  { operation: 'listFares', method: 'GET', path: '/fares', noun: 'Fare', summary: 'The published fare schedule (zone-pair × service class)' },
  { operation: 'quoteFare', method: 'GET', path: '/fares/quote', noun: 'Fare', summary: 'Quote a fare for a zone pair and service class' },
  { operation: 'listVehicles', method: 'GET', path: '/vehicles', noun: 'Vehicle', summary: 'The fleet: vehicles with service class and accessibility flags' },
  { operation: 'getVehicle', method: 'GET', path: '/vehicles/{id}', noun: 'Vehicle', summary: 'One vehicle by id' },
  { operation: 'listTransitSchedules', method: 'GET', path: '/transit-schedules', noun: 'TransitSchedule', summary: 'GTFS-typed transit schedules (4851 sub-branch), branching on route' },
  { operation: 'getTransitSchedule', method: 'GET', path: '/transit-schedules/{id}', noun: 'TransitSchedule', summary: 'One GTFS-typed schedule by id' },
]

export const substrate: APIProduct = {
  substrate: 'passenger-mobility',
  nouns: [
    {
      noun: 'Trip',
      schema: 'https://schema.org/Trip',
      binding: 'native',
      verbs: ['list', 'get', 'dispatch'],
      bindingNote:
        'the trip record of the dispatch/booking system-of-record door (H5 Scheduler rail vertically lensed, per the row headless ply); schema.org Trip per the row G1 anchors. Row source route is unruled — first-party booking capture at the rail is the recorded candidate [row marks UNVERIFIED]',
    },
    {
      noun: 'Reservation',
      schema: 'https://schema.org/Reservation',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      bindingNote:
        'THE BOOKING record (row data ply: schema.org Offer/Reservation grain, same record grain the cascade assigns to travel #22); system-of-record door — the operator brings the livery/TNC license (spec §3.2 regulation unlock)',
    },
    {
      noun: 'Fare',
      schema: 'https://schema.org/Offer',
      binding: 'native',
      verbs: ['list', 'quote'],
      bindingNote:
        'fare/rate record (row data ply); schema.org Offer generic per cascade rule 2 — the row records no fare interchange standard beyond GTFS fare attributes on the transit sub-branch',
    },
    {
      noun: 'Vehicle',
      schema: 'https://schema.org/Vehicle',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'fleet grain (row ICP: livery/limo, shuttle/charter, NEMT, taxi fleet); the dispatch door assigns from this set',
    },
    {
      noun: 'TransitSchedule',
      schema: 'https://schema.org.ai/TransitSchedule',
      binding: 'generated',
      verbs: ['list', 'get'],
      bindingNote:
        'GTFS-typed (the row G1 anchor names GTFS as the public-transit standard, marked UNVERIFIED in estate docs). Binding is `generated` HONESTLY: no ingest route is ruled (row: candidates UNVERIFIED), so the wave-zero corpus is generated synthetic GTFS-typed example data; public GTFS feed ingest is the enrichment-ladder candidate and flips this binding to `ingested` only when a route is ruled and running',
    },
  ],
  systems: [
    // Row headless ply: dispatch + booking/scheduling — the H5 Scheduler rail
    // vertically lensed. The row records that no cascade row exists at this
    // coordinate and marks the O*NET-modal system UNVERIFIED; the coordinate
    // below states the lens, not a catalog rank claim.
    { system: 'Scheduler', coordinates: ['passenger-dispatch'] },
  ],
  transports: ['REST', 'MCP'], // live-only: RPC / CapnWeb / HATEOAS-full arrive with the workers.do lane (spec §7.2); nothing unbuilt is declared
  operations: OPERATIONS,
  sandbox: {
    seedModule: './seed.ts',
    seedVersion: '1.0.0',
    tenancyNote:
      'seed tenant = tenant #1 on the same handlers as product (live-demo ruling: real product over simulated data, never a faked demo); anonymous writes are ephemeral (in-memory, per-isolate) with disclosed retention',
  },
  meters: OPERATIONS.map((o) => ({ operation: o.operation })),
}
