/**
 * substrate.ts — Stratum A: the G3 substrate `holdings-corporate-mgmt`,
 * instantiated from the register row
 * (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "holdings-corporate-mgmt", NAICS 55) per the property template spec §1.
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
  /** canonical Noun name, PascalCase (UPPERCASE acronyms: BOIReport) */
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

export const OPERATIONS: OperationDef[] = [
  { operation: 'listRenewals', method: 'GET', path: '/renewals', noun: 'Renewal', summary: 'The branching renewal/compliance-calendar collection — typed OK | EMPTY | BLOCKED on one pathname' },
  { operation: 'getRenewal', method: 'GET', path: '/renewals/{id}', noun: 'Renewal', summary: 'One renewal obligation by id' },
  { operation: 'orderRenewalFiling', method: 'POST', path: '/renewals/{id}/order', noun: 'Renewal', summary: 'Order a completed, verified renewal filing (outcome grain — the apply/renew transaction layer) — answers the 402 OFFER boundary' },
  { operation: 'listEntities', method: 'GET', path: '/entities', noun: 'Entity', summary: 'Entities in the current workspace — the unified entity records of the holding structure' },
  { operation: 'getEntity', method: 'GET', path: '/entities/{id}', noun: 'Entity', summary: 'One unified entity record: formation, EIN, registered agent, registrations, renewals, ownership' },
  { operation: 'createEntity', method: 'POST', path: '/entities', noun: 'Entity', summary: 'Create an entity record (sandbox: ephemeral workspace)' },
  { operation: 'listFormations', method: 'GET', path: '/formations', noun: 'Formation', summary: 'Typed formation records (Secretary-of-State filing grain)' },
  { operation: 'getFormation', method: 'GET', path: '/formations/{id}', noun: 'Formation', summary: 'One formation record by id' },
  { operation: 'listRegistrations', method: 'GET', path: '/registrations', noun: 'Registration', summary: 'Public-registry registration rows (SAM/UEI, SoS good standing, USAspending grain)' },
  { operation: 'getRegistration', method: 'GET', path: '/registrations/{id}', noun: 'Registration', summary: 'One registration row by id' },
  { operation: 'listBOIReports', method: 'GET', path: '/boi-reports', noun: 'BOIReport', summary: 'BOI filing-status records (status grain only — never beneficial-owner personal data)' },
  { operation: 'listRegisteredAgents', method: 'GET', path: '/registered-agents', noun: 'RegisteredAgent', summary: 'Registered agents of record across jurisdictions' },
  { operation: 'listOwnershipStakes', method: 'GET', path: '/ownership-stakes', noun: 'OwnershipStake', summary: 'The subsidiary/ownership structure as typed edges (parent → subsidiary, percentage)' },
]

export const substrate: APIProduct = {
  substrate: 'holdings-corporate-mgmt',
  nouns: [
    {
      noun: 'Entity',
      schema: 'https://schema.org/Organization',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      bindingNote:
        'the unified entity record of the entity back-office system of record; schema.org generic per cascade rule 2 (row: no settled interchange standard — SoS/BOI/SAM public schemas are the de facto G1). The internal-first-customer corpus (a studio-shaped multi-entity structure) accretes behind auth as tenants; it never appears in the public seed (fixture law: no real company names).',
    },
    {
      noun: 'Formation',
      schema: 'https://schema.org.ai/Formation',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'typed formation record at Secretary-of-State filing grain (row data ply); held natively per entity in the system of record',
    },
    {
      noun: 'Registration',
      schema: 'https://schema.org.ai/Registration',
      binding: 'ingested',
      verbs: ['list', 'get'],
      bindingNote:
        'public-registry mirror rows — the row source route names SoS registries, SAM/USAspending, BOI/UEI feeds (public-licensable ingest). The ingest route is not reachable keyless in-session at typed grain, so the wave-zero corpus is the §5.2 labeled synthetic seed; the enrichment ladder (public registration rows → unified entity record → renewal/compliance calendar → apply/renew transaction layer) attaches real rows when the ingest lands.',
    },
    {
      noun: 'BOIReport',
      schema: 'https://schema.org.ai/BOIReport',
      binding: 'native',
      verbs: ['list'],
      bindingNote:
        "the company's OWN BOI filing-status record (FinCEN BOI data is not public — only the filing status is held natively; beneficial-owner personal data is never held in the sandbox corpus)",
    },
    {
      noun: 'RegisteredAgent',
      schema: 'https://schema.org.ai/RegisteredAgent',
      binding: 'native',
      verbs: ['list'],
      bindingNote: 'agent-of-record per entity per jurisdiction (row data ply: registered agent records)',
    },
    {
      noun: 'Renewal',
      schema: 'https://schema.org.ai/Renewal',
      binding: 'native',
      verbs: ['list', 'get', 'order'],
      bindingNote:
        'the renewal/compliance calendar (row enrichment ladder rung 3); the order verb is the apply/renew transaction layer — the FP-ruled highest-R5/lowest-coverage belt (FP #28), outcome grain',
    },
    {
      noun: 'OwnershipStake',
      schema: 'https://schema.org.ai/OwnershipStake',
      binding: 'native',
      verbs: ['list'],
      bindingNote: 'subsidiary/ownership structure as typed edges (row data ply); counterparties below reporting grain are role labels, never person names',
    },
  ],
  systems: [
    // SC #18: the entity back-office registration module — V at module grain
    // ("D1 back-office module now"). The fuller system-of-record span
    // (compliance calendar, cap-table/ownership ledger) is NOT a named
    // 52-System catalog row in the register excerpts and is deliberately not
    // declared (presence-when-true applies to catalog coordinates too).
    { system: 'EntityBackOffice', coordinates: ['registration'] },
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
