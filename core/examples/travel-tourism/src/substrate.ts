/**
 * substrate.ts — Stratum A: the G3 substrate `travel-tourism`, instantiated
 * from the register row (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "travel-tourism") per the property template spec §1.
 *
 * D-row placeholder build: the 5615 apex name is a recorded GAP (#16); the
 * ruled posture is per-sub-vertical properties on the held names
 * (apis.cruises / apis.voyage / apis.camp carry zones) — the substrate is
 * built ONCE under the row key and every sub-vertical G4 config projects it
 * (../projections/*.json). The G3 work is never blocked on a name (spec §0).
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products`
 * (prove-then-extract — this example is a proving instance, not the
 * abstraction's home).
 *
 * Deliberately NOT built: fare/availability data — the row rules it the
 * crowded lane (avoid-class 5, SC #22); the census narrowing points this
 * substrate at the unserved sub-verticals (charters, camps, group/specialty)
 * via first-party booking capture, owned-by-construction.
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

/** The three zoned sub-verticals the ruled posture names (register row, 2026-08-23). */
export const SUB_VERTICALS = ['cruise', 'charter', 'camp'] as const
export type SubVertical = (typeof SUB_VERTICALS)[number]

export const OPERATIONS: OperationDef[] = [
  { operation: 'listBookings', method: 'GET', path: '/bookings', noun: 'Booking', summary: 'The branching booking collection — typed OK | EMPTY | BLOCKED on one pathname, branching on status and subVertical' },
  { operation: 'getBooking', method: 'GET', path: '/bookings/{id}', noun: 'Booking', summary: 'One booking by id' },
  { operation: 'createBooking', method: 'POST', path: '/bookings', noun: 'Booking', summary: 'Create a booking (headless system-of-record door; sandbox: ephemeral workspace)' },
  { operation: 'confirmBooking', method: 'POST', path: '/bookings/{id}/confirm', noun: 'Booking', summary: 'Confirm a booking (outcome grain: a confirmed booking, not a call) — answers the 402 OFFER boundary' },
  { operation: 'listTrips', method: 'GET', path: '/trips', noun: 'Trip', summary: 'Itinerary/trip records in the current workspace' },
  { operation: 'getTrip', method: 'GET', path: '/trips/{id}', noun: 'Trip', summary: 'One trip with its itinerary segments' },
  { operation: 'listSailings', method: 'GET', path: '/sailings', noun: 'Sailing', summary: 'Sailings/charter departures with manifest capacity (cruise + charter sub-verticals)' },
  { operation: 'getSailing', method: 'GET', path: '/sailings/{id}', noun: 'Sailing', summary: 'One sailing with its manifest summary' },
  { operation: 'listCampSessions', method: 'GET', path: '/camp-sessions', noun: 'CampSession', summary: 'Camp sessions with enrollment rosters (camp sub-vertical)' },
  { operation: 'getCampSession', method: 'GET', path: '/camp-sessions/{id}', noun: 'CampSession', summary: 'One camp session with its roster summary' },
  { operation: 'enrollCamper', method: 'POST', path: '/camp-sessions/{id}/enrollments', noun: 'CampSession', summary: 'Enroll into a camp session roster (sandbox: ephemeral workspace)' },
  { operation: 'listOperators', method: 'GET', path: '/operators', noun: 'Operator', summary: 'Tour/charter/camp operators and agencies (5615 grain) in the sandbox tenant' },
]

export const substrate: APIProduct = {
  substrate: 'travel-tourism',
  nouns: [
    {
      noun: 'Booking',
      schema: 'https://schema.org/Reservation',
      binding: 'native',
      verbs: ['list', 'get', 'create', 'confirm'],
      bindingNote:
        'schema.org Reservation typing per cascade rule 2 — the row cites NO interchange standard from estate docs (IATA NDC/ONE Order is flagged [UNVERIFIED] on the row and is NOT adopted here); source route = first-party booking capture at the rail, owned-by-construction. That route is not reachable in-session, so the wave-zero corpus is labeled synthetic seed per spec §5.2.',
    },
    {
      noun: 'Trip',
      schema: 'https://schema.org/Trip',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'itinerary/trip record — the row flags this grain [UNVERIFIED — inferred]; carried verbatim, not upgraded',
    },
    {
      noun: 'Sailing',
      schema: 'https://schema.org/BoatTrip',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'sailing/charter manifest grain (voyage + cruises sub-verticals) — row flags [UNVERIFIED — inferred grain, no estate doc]; carried verbatim',
    },
    {
      noun: 'CampSession',
      schema: 'https://schema.org.ai/CampSession',
      binding: 'native',
      verbs: ['list', 'get', 'enroll'],
      bindingNote: 'session/enrollment roster grain (camp sub-vertical) — row flags [UNVERIFIED — inferred grain]; carried verbatim',
    },
    {
      noun: 'Operator',
      schema: 'https://schema.org/Organization',
      binding: 'native',
      verbs: ['list'],
      bindingNote: '5615 CompanyType grain (agency / tour operator / charter operator / camp operator); schema.org generic per cascade rule 2',
    },
  ],
  systems: [
    // Booking/PMS family per SC #22; the tour-operator / charter back-office and
    // agency mid-office coordinates are flagged [UNVERIFIED] on the row — the
    // flags are carried, the coordinates are declared at the row's own words.
    { system: 'Booking', coordinates: ['tour-operators'] },
    { system: 'Booking', coordinates: ['charter-operators'] },
    { system: 'Booking', coordinates: ['camp-operators'] },
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
