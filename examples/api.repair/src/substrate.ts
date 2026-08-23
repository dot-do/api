/**
 * substrate.ts — Stratum A: the G3 substrate `repair-field-services`,
 * instantiated from the register row
 * (studio docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "repair-field-services": NAICS 811 EXCLUDING 8111 — 8112 electronics &
 * precision equipment repair, 8113 commercial machinery repair, 8114 personal
 * & household goods repair) per the property template spec §1.
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products`
 * (prove-then-extract — this example is a proving instance, not the
 * abstraction's home).
 *
 * Nothing in this file is brand, ICP, motion, offer, price, or positioning —
 * those are G4 projection fields (../projections/*.json, spec §2).
 *
 * RECORD-TYPE COLLISION, RECORDED (batch watch-list primacy rule): the Noun
 * `WorkOrder` is also defined by the fn-service-delivery row's substrate
 * (api.services, branch draft/fn-service-delivery-wave0) at its O*NET task
 * grain. The register carries NO primacy ruling for the WorkOrder record
 * type, so this substrate builds its own WorkOrder under ITS OWN row key at
 * the row's FSM grain (the 811 field-service work order — SC #14's THE
 * record) and claims NOTHING shared with the fn-service-delivery definition.
 * The same discipline applies to the FSM system name: the cascade tree's
 * (811, 5617) span names FSM for both this row and facilities-services (one
 * abstraction, two vertical lenses) — this substrate declares its OWN
 * coordinate and claims no shared implementation.
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

/** The row's three repair classes — NAICS 811 ex-8111, one per subsector. */
export const REPAIR_CLASSES = ['electronics', 'industrial-machinery', 'appliance'] as const

/**
 * SOURCE-ROUTE PROBE, RECORDED HONESTLY (2026-08-23, batch watch list):
 * the row's ruled axis is SD — first-party work-order capture generalizing
 * outward from the LIVE Vin recon/inspection/maintenance lanes [SC #14].
 * That live corpus is the AUTOMOTIVE (8111) instance of this record, and
 * 8111 is carved OUT of this row by the register itself ("8111's names are
 * carved to the automotive row"). No consumption edge from the live Vin
 * lanes into this ex-8111 scope exists in this build session, and pulling
 * the 8111 corpus here would misfile it in scope even if one did. So the
 * wave-zero corpus is LABELED SYNTHETIC seed per spec §5.2 — the Class A
 * route is recorded as the enrichment source, never claimed as serving.
 */
export const OPERATIONS: OperationDef[] = [
  { operation: 'listWorkOrders', method: 'GET', path: '/work-orders', noun: 'WorkOrder', summary: 'The branching work-order collection — typed OK | EMPTY | BLOCKED on one pathname; filters status and repairClass' },
  { operation: 'getWorkOrder', method: 'GET', path: '/work-orders/{id}', noun: 'WorkOrder', summary: 'One work order by id, with its estimate and inspection links' },
  { operation: 'createWorkOrder', method: 'POST', path: '/work-orders', noun: 'WorkOrder', summary: 'Open a work order — the FSM system-of-record door; keyless calls land in an ephemeral sandbox workspace' },
  { operation: 'completeWorkOrder', method: 'POST', path: '/work-orders/{id}/complete', noun: 'WorkOrder', summary: 'Complete a work order (status transition on the system-of-record door; sandbox: ephemeral workspace)' },
  { operation: 'listEstimates', method: 'GET', path: '/estimates', noun: 'Estimate', summary: 'Estimates — typed line items with internally consistent totals' },
  { operation: 'getEstimate', method: 'GET', path: '/estimates/{id}', noun: 'Estimate', summary: 'One estimate by id' },
  { operation: 'approveEstimate', method: 'POST', path: '/estimates/{id}/approve', noun: 'Estimate', summary: 'Approve an estimate (lifecycle verb; sandbox: ephemeral workspace)' },
  { operation: 'listInspectionReports', method: 'GET', path: '/inspection-reports', noun: 'InspectionReport', summary: 'Inspection reports — the condition record behind an estimate' },
  { operation: 'getInspectionReport', method: 'GET', path: '/inspection-reports/{id}', noun: 'InspectionReport', summary: 'One inspection report by id' },
]

export const substrate: APIProduct = {
  substrate: 'repair-field-services',
  nouns: [
    {
      noun: 'WorkOrder',
      schema: 'https://schema.org.ai/WorkOrder',
      binding: 'native',
      verbs: ['list', 'get', 'create', 'complete'],
      bindingNote:
        'THE record of the row [SC #14]; native — the FSM system-of-record door serves it. ' +
        'COLLISION RECORDED: fn-service-delivery (api.services) defines its own WorkOrder at O*NET task grain; no register primacy ruling exists, so this is the repair-field-services WorkOrder at FSM grain and nothing is claimed shared. ' +
        'Source route (Class A, SD axis): first-party capture generalizing from the live Vin recon/inspection/maintenance lanes — the live corpus is the 8111 instance, carved to the automotive row; ex-8111 corpus accretes here, so wave-zero seed is labeled synthetic per §5.2.',
    },
    {
      noun: 'Estimate',
      schema: 'https://schema.org.ai/Estimate',
      binding: 'native',
      verbs: ['list', 'get', 'approve'],
      bindingNote:
        'the estimate leg of the row data ply; native at FSM grain. Estimate benchmarks / repair-cost data are the enrichment LADDER (work orders → typed estimates → cost/duration benchmarks per repair class) — generated benchmark Nouns arrive later, consent-at-rail; nothing generated is declared at wave zero.',
    },
    {
      noun: 'InspectionReport',
      schema: 'https://schema.org.ai/InspectionReport',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'the inspection-report leg of the row data ply — the record shape the live Vin inspection lane proves in the adjacent 8111 instance; native here, generalized to bench/field inspection of electronics, machinery, and appliances.',
    },
  ],
  systems: [
    // shared-system-span note: FSM is also facilities-services' named system
    // ((811, 5617) span); this substrate declares its OWN coordinate only.
    { system: 'FSM', coordinates: ['repair-field-services'] },
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
