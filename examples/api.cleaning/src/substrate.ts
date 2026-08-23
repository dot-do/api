/**
 * substrate.ts — Stratum A: the G3 substrate `facilities-services`,
 * instantiated from the register row
 * (studio docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "facilities-services") per the property template spec §1.
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products` and
 * this local copy is extracted to it then (prove-then-extract — this example
 * is a proving instance, not the abstraction's home).
 *
 * RECORD-TYPE COLLISION, RECORDED (no primacy ruling in the register):
 * the WorkOrder / service-visit grain is shared-adjacent with the
 * `repair-field-services` vertical (the cascade tree spans (811, 5617) with
 * one THE WORK ORDER record and one FSM system) and with the
 * `fn-facilities-assets` horizontal (maintenance work-order grain). The
 * register carries NO primacy ruling for the shared record type, so this row
 * builds WorkOrder/ServiceVisit under its OWN row key — row-scoped schema
 * addresses (…/facilities-services/…), nothing shared is claimed, and the
 * collision is recorded here and in the projection config. A future primacy
 * ruling reconciles the row-scoped types into the shared address.
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

/** The building-service classes at the row's NAICS 5617 core grain. */
export const SERVICE_CLASSES = [
  'janitorial', // NAICS 56172
  'landscaping', // NAICS 56173
  'pest-control', // NAICS 56171
] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listWorkOrders', method: 'GET', path: '/work-orders', noun: 'WorkOrder', summary: 'The branching work-order collection — typed OK | EMPTY | BLOCKED on one pathname' },
  { operation: 'getWorkOrder', method: 'GET', path: '/work-orders/{id}', noun: 'WorkOrder', summary: 'One work order by id, with its service visits' },
  { operation: 'createWorkOrder', method: 'POST', path: '/work-orders', noun: 'WorkOrder', summary: 'Capture a work order at the rail (sandbox: ephemeral workspace)' },
  { operation: 'dispatchWorkOrder', method: 'POST', path: '/work-orders/{id}/dispatch', noun: 'WorkOrder', summary: 'Dispatch a work order to the supply side — answers the 402 OFFER boundary (labeled stub: the dispatch rail is not yet built and the settlement rail is not activated)' },
  { operation: 'logServiceVisit', method: 'POST', path: '/work-orders/{id}/visits', noun: 'ServiceVisit', summary: 'Log a service visit against a work order (sandbox: ephemeral workspace)' },
  { operation: 'listServiceVisits', method: 'GET', path: '/service-visits', noun: 'ServiceVisit', summary: 'Service-visit records in the current workspace' },
  { operation: 'listSchedules', method: 'GET', path: '/schedules', noun: 'ServiceSchedule', summary: 'Recurring-service schedules (janitorial contracts are recurring by nature)' },
  { operation: 'getSchedule', method: 'GET', path: '/schedules/{id}', noun: 'ServiceSchedule', summary: 'One recurring-service schedule by id' },
  { operation: 'createSchedule', method: 'POST', path: '/schedules', noun: 'ServiceSchedule', summary: 'Capture a recurring-service schedule (sandbox: ephemeral workspace)' },
  { operation: 'listVendors', method: 'GET', path: '/vendors', noun: 'Vendor', summary: 'Building-services vendors (supply side) with onboarding-packet state (W-9 / COI / banking flags)' },
  { operation: 'getVendor', method: 'GET', path: '/vendors/{id}', noun: 'Vendor', summary: 'One vendor by id' },
  { operation: 'listFacilities', method: 'GET', path: '/facilities', noun: 'Facility', summary: 'Facilities under service (demand side)' },
]

export const substrate: APIProduct = {
  substrate: 'facilities-services',
  nouns: [
    {
      noun: 'WorkOrder',
      // ROW-SCOPED address — see the collision note in the file header: no
      // primacy ruling exists for the (811, 5617)-spanning WorkOrder type, so
      // this row claims nothing shared.
      schema: 'https://schema.org.ai/facilities-services/WorkOrder',
      binding: 'native',
      verbs: ['list', 'get', 'create', 'dispatch'],
      bindingNote:
        'THE WORK ORDER record (row data ply; the cascade tree names it for the (811, 5617) span). Source route = first-party work-order capture at the rail (owned-by-construction class) — the rail is NOT yet built (C-class), so the wave-zero corpus is labeled synthetic seed per spec §5.2, never claimed as real. Collision recorded: shared-adjacent with repair-field-services and fn-facilities-assets; row-scoped pending a primacy ruling.',
    },
    {
      noun: 'ServiceVisit',
      schema: 'https://schema.org.ai/facilities-services/ServiceVisit',
      binding: 'native',
      verbs: ['list', 'log'],
      bindingNote:
        'Service-visit record (row data ply, same FSM grain as the work order). Same collision note and row-scoping as WorkOrder; same C-class labeled-synthetic seed at wave zero.',
    },
    {
      noun: 'ServiceSchedule',
      schema: 'https://schema.org.ai/facilities-services/ServiceSchedule',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      bindingNote:
        "Recurring-service schedule record — the row's second data-ply grain (janitorial contracts are recurring by nature; the recurring-consumable grammar's services analog, register-flagged UNVERIFIED inference and carried verbatim, not extended).",
    },
    {
      noun: 'Vendor',
      schema: 'https://schema.org/Organization',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'Supply-side building-services vendor at NAICS 5617 grain; schema.org generic per cascade rule 2 (the row records no industry interchange standard). Carries onboarding-packet state (W-9 / COI / banking flags) per the row source route; COI ties to the insurance document grain (register note). Public-registry enrichment is register-flagged UNVERIFIED and is NOT ingested at wave zero.',
    },
    {
      noun: 'Facility',
      schema: 'https://schema.org/Place',
      binding: 'native',
      verbs: ['list'],
      bindingNote:
        'The serviced building/site (demand side — the fn-facilities-assets horizontal is the transactional counterparty; asset-grain records stay in THAT row). schema.org generic per cascade rule 2.',
    },
  ],
  systems: [
    // FSM spans (811, 5617) in the cascade tree — shared-system-span rule:
    // one headless abstraction, two vertical lenses; this row's lens is the
    // building-services coordinate. Nothing is claimed for the 811 lens.
    { system: 'FSM', coordinates: ['building-services'] },
    { system: 'Scheduler', coordinates: ['recurring-service-booking'] },
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
