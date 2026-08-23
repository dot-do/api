/**
 * substrate.ts — Stratum A: the G3 substrate `construction`, instantiated
 * from the register row (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "construction") per the property template spec §1.
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products` and
 * this local copy is extracted to it then (prove-then-extract — this example
 * is a proving instance, not the abstraction's home).
 *
 * Row grain: the construction payment-documentation set — draw package,
 * lien waiver, pay application — plus the permit record. NO settled
 * interchange standard exists for this grain (the row marks the door
 * SD(typed-artifact) [HYPOTHESIS], incumbency probe flagged; human-first
 * incumbent forms exist per the row [BK]). The record schemas therefore fall
 * back per cascade rule 2: real schema.org types where one exists (Permit →
 * GovernmentPermit, Project → Project), estate-typed schema.org.ai identities
 * for the typed artifacts — the typed-artifact door stays a recorded
 * hypothesis, never an asserted standard.
 *
 * SHARED FACE, recorded: the lien-waiver record type is shared with the
 * real-estate-closing adjacency (SC #10/#13). No projection-primacy ruling is
 * on record, so this build claims NOTHING beyond its own row key —
 * `construction` — and records the collision (see the LienWaiver bindingNote
 * and ../projections/apis.construction.json).
 *
 * Nothing in this file is brand, ICP, motion, offer, price, or positioning —
 * those are G4 projection fields (../projections/*.json, spec §2).
 */

export type NounBinding = 'ingested' | 'generated' | 'native' | 'federated'

export interface NounDef {
  /** canonical Noun name, PascalCase */
  noun: string
  /** $type → schema identity (schema.org where a real type exists; schema.org.ai estate typing for the typed artifacts — cascade rule 2, no settled industry standard) */
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

/** The four lien-waiver forms of the payment-documentation grammar. */
export const LIEN_WAIVER_TYPES = [
  'conditional-progress',
  'unconditional-progress',
  'conditional-final',
  'unconditional-final',
] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listDrawPackages', method: 'GET', path: '/draw-packages', noun: 'DrawPackage', summary: 'The branching draw-package collection — typed OK | EMPTY | BLOCKED on one pathname' },
  { operation: 'getDrawPackage', method: 'GET', path: '/draw-packages/{id}', noun: 'DrawPackage', summary: 'One draw package with its pay application, lien waivers, and permits resolved by reference' },
  { operation: 'orderDrawPackage', method: 'POST', path: '/draw-packages/{id}/order', noun: 'DrawPackage', summary: 'Order the completed, verified assembly of a draw package (outcome grain) — answers the 402 OFFER boundary' },
  { operation: 'listPayApplications', method: 'GET', path: '/pay-applications', noun: 'PayApplication', summary: 'Pay applications (period-keyed, schedule-of-values lines, retainage arithmetic)' },
  { operation: 'getPayApplication', method: 'GET', path: '/pay-applications/{id}', noun: 'PayApplication', summary: 'One pay application by id' },
  { operation: 'submitPayApplication', method: 'POST', path: '/projects/{id}/pay-applications', noun: 'PayApplication', summary: 'Submit a pay application for a project (sandbox: ephemeral workspace) — the system-of-record door' },
  { operation: 'listLienWaivers', method: 'GET', path: '/lien-waivers', noun: 'LienWaiver', summary: 'Lien waivers (conditional/unconditional × progress/final; claimant-keyed)' },
  { operation: 'getLienWaiver', method: 'GET', path: '/lien-waivers/{id}', noun: 'LienWaiver', summary: 'One lien waiver by id' },
  { operation: 'listPermits', method: 'GET', path: '/permits', noun: 'Permit', summary: 'Permit records (jurisdiction-keyed)' },
  { operation: 'getPermit', method: 'GET', path: '/permits/{id}', noun: 'Permit', summary: 'One permit record by id' },
  { operation: 'listProjects', method: 'GET', path: '/projects', noun: 'Project', summary: 'Projects of the current contractor workspace (NAICS 236/237 grain; 238 enters via subcontractor lien waivers)' },
  { operation: 'getProject', method: 'GET', path: '/projects/{id}', noun: 'Project', summary: 'One project with its permits, pay applications, and draw packages linked' },
]

export const substrate: APIProduct = {
  substrate: 'construction',
  nouns: [
    {
      noun: 'DrawPackage',
      schema: 'https://schema.org.ai/DrawPackage',
      binding: 'native',
      verbs: ['list', 'get', 'order'],
      bindingNote:
        'first-party document assembly at the rail (row source route); outcome grain — the payable unit is the completed, verified assembly. ' +
        'SD(typed-artifact) door is [HYPOTHESIS] per the row (incumbency probe flagged): no settled interchange standard exists; the schema is estate typing, not an industry standard.',
    },
    {
      noun: 'PayApplication',
      schema: 'https://schema.org.ai/PayApplication',
      binding: 'native',
      verbs: ['list', 'get', 'submit'],
      bindingNote:
        'first-party assembly at the rail; period-keyed with schedule-of-values lines and retainage arithmetic. Human-first incumbent forms exist for this record per the row [BK] — typed-artifact door recorded as hypothesis, cascade rule 2 fallback typing.',
    },
    {
      noun: 'LienWaiver',
      schema: 'https://schema.org.ai/LienWaiver',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'SHARED FACE, recorded: the lien-waiver record type is shared with the real-estate-closing adjacency (SC #10/#13). No projection-primacy ruling on record — built under row key `construction` only; the collision is recorded in the projection config and this build claims no shared face.',
    },
    {
      noun: 'Permit',
      schema: 'https://schema.org/GovernmentPermit',
      binding: 'ingested',
      verbs: ['list', 'get'],
      bindingNote:
        'row source route: public-licensable ingest of permit records (estate holds permits.casa / permits.works / permitti.ng doors per the coverage doc). The route was NOT probed in-session and the register marks the enrichment ladder [UNVERIFIED], so the wave-zero corpus is the §5.2 labeled synthetic seed — never unlabeled stand-in data.',
    },
    {
      noun: 'Project',
      schema: 'https://schema.org/Project',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'the grain holder: draws, waivers, pay applications, and permits hang off a project; schema.org generic per cascade rule 2.',
    },
  ],
  systems: [
    // Construction PM is the vertical lens of the PM System (#2 of the ~52-System
    // catalog by occupation coverage, 308 occs). The cascade ruling for this cell
    // is abstraction only — the coordinate is declared, no PM product is
    // instantiated. FSM adjacency for specialty trades (NAICS 238) is recorded in
    // the row, not declared here as a served coordinate.
    { system: 'ProjectManagement', coordinates: ['construction-pm'] },
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
