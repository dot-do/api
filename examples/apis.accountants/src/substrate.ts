/**
 * substrate.ts — Stratum A: the G3 substrate `accounting-tax`, instantiated
 * from the register row (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "accounting-tax") per the property template spec §1/§10.1.
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

/** The 10 typed close deliverables, trial balance → month-end (row data ply). */
export const CLOSE_DELIVERABLE_TYPES = [
  'trial-balance',
  'bank-reconciliation',
  'ar-reconciliation',
  'ap-reconciliation',
  'accruals-journal',
  'prepaids-amortization',
  'fixed-asset-rollforward',
  'payroll-reconciliation',
  'flux-analysis',
  'close-package',
] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listCloseDeliverables', method: 'GET', path: '/close-deliverables', noun: 'CloseDeliverable', summary: 'The branching close-deliverable collection — typed OK | EMPTY | BLOCKED on one pathname' },
  { operation: 'getCloseDeliverable', method: 'GET', path: '/close-deliverables/{id}', noun: 'CloseDeliverable', summary: 'One close deliverable by id' },
  { operation: 'orderCloseDeliverable', method: 'POST', path: '/close-deliverables/{id}/order', noun: 'CloseDeliverable', summary: 'Order a completed, verified close deliverable (outcome grain) — answers the 402 OFFER boundary' },
  { operation: 'listLedgers', method: 'GET', path: '/ledgers', noun: 'Ledger', summary: 'Ledgers in the current workspace' },
  { operation: 'getLedger', method: 'GET', path: '/ledgers/{id}', noun: 'Ledger', summary: 'One ledger with its entries' },
  { operation: 'postEntry', method: 'POST', path: '/ledgers/{id}/entries', noun: 'Ledger', summary: 'Post a balanced journal entry to a ledger (sandbox: ephemeral workspace)' },
  { operation: 'listReturns', method: 'GET', path: '/returns', noun: 'Return', summary: 'Year-keyed returns in the current workspace' },
  { operation: 'getReturn', method: 'GET', path: '/returns/{id}', noun: 'Return', summary: 'One return by id' },
  { operation: 'listClients', method: 'GET', path: '/clients', noun: 'Client', summary: 'Clients of the current firm workspace' },
  { operation: 'listEngagements', method: 'GET', path: '/engagements', noun: 'Engagement', summary: 'Engagements in the current firm workspace' },
  { operation: 'createEngagement', method: 'POST', path: '/engagements', noun: 'Engagement', summary: 'Create an engagement (sandbox: ephemeral workspace)' },
]

export const substrate: APIProduct = {
  substrate: 'accounting-tax',
  nouns: [
    {
      noun: 'Ledger',
      schema: 'https://schema.org.ai/Ledger',
      binding: 'native',
      verbs: ['list', 'get', 'postEntry'],
      bindingNote: 'accounting.headless.ly system of record (named empty slot); row source route = owned corpus via headless usage accretion (Class A, internal-first-customer)',
    },
    {
      noun: 'CloseDeliverable',
      schema: 'https://schema.org.ai/CloseDeliverable',
      binding: 'native',
      verbs: ['list', 'get', 'order'],
      bindingNote: '10 typed deliverables, trial balance → month-end; outcome grain passes the row selector (agent-native + outcome-priced); generated benchmark siblings arrive later on the enrichment ladder, consent-at-rail',
    },
    {
      noun: 'Return',
      schema: 'https://schema.org.ai/Return',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'typed, year-keyed (row data ply)',
    },
    {
      noun: 'Client',
      schema: 'https://schema.org/Organization',
      binding: 'native',
      verbs: ['list'],
      bindingNote: 'firm-practice grain; schema.org generic per cascade rule 2 (row records no industry interchange standard)',
    },
    {
      noun: 'Engagement',
      schema: 'https://schema.org/Service',
      binding: 'native',
      verbs: ['list', 'create'],
      bindingNote: 'firm-practice grain; schema.org generic per cascade rule 2',
    },
  ],
  systems: [
    { system: 'Accounting', coordinates: ['accounting-firms'] },
    { system: 'Accounting', coordinates: ['tax-practice-management'] },
  ],
  transports: ['REST', 'MCP'], // live-only: RPC / CapnWeb / HATEOAS-full arrive with the workers.do lane (spec §7.2); nothing unbuilt is declared
  operations: OPERATIONS,
  sandbox: {
    seedModule: './seed.ts',
    seedVersion: '1.0.0',
    tenancyNote: 'seed tenant = tenant #1 on the same handlers as product (live-demo ruling: real product over simulated data, never a faked demo); anonymous writes are ephemeral (in-memory, per-isolate) with disclosed retention',
  },
  meters: OPERATIONS.map((o) => ({ operation: o.operation })),
}
