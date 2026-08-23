/**
 * substrate.ts — Stratum A: the G3 substrate `retail-ecommerce`, instantiated
 * from the register row (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "retail-ecommerce") per the property template spec §1.
 *
 * Row grain: GS1 Digital Link + schema.org Offer/Order — the row NAMES its
 * interchange standard, so the record schemas are schema.org commerce nouns
 * (Product / Offer / Order) with GS1 GTIN identity; no cascade fallback is
 * needed. The 4-lens product-identity crosswalk (GTIN / GPC / UNSPSC / HTS)
 * is this vertical's identity spine (register matrix §1).
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
  /** $type → schema.org.ai identity (schema.org where the row's standard IS schema.org) */
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
  { operation: 'listProducts', method: 'GET', path: '/products', noun: 'Product', summary: 'The branching product collection — typed OK | EMPTY | BLOCKED on one pathname; GTIN-identified (GS1 demo prefix 952 in the sandbox seed)' },
  { operation: 'getProduct', method: 'GET', path: '/products/{gtin}', noun: 'Product', summary: 'One product by GTIN' },
  { operation: 'createProduct', method: 'POST', path: '/products', noun: 'Product', summary: 'Add a catalog product (headless OMS/storefront door; sandbox: ephemeral workspace, GTIN minted from the GS1 demo-952 space when omitted)' },
  { operation: 'resolveDigitalLink', method: 'GET', path: '/digital-links/{gtin}', noun: 'ProductIdentity', summary: 'GS1 Digital Link resolution + the 4-lens identity crosswalk (GTIN / GPC / UNSPSC / HTS) for one product' },
  { operation: 'listOffers', method: 'GET', path: '/offers', noun: 'Offer', summary: 'Offers (price + availability per GTIN) — the surface agent buyers read' },
  { operation: 'getOffer', method: 'GET', path: '/offers/{id}', noun: 'Offer', summary: 'One offer by id' },
  { operation: 'createOffer', method: 'POST', path: '/offers', noun: 'Offer', summary: 'Publish an offer for a catalog product (headless storefront pricing door; sandbox: ephemeral workspace)' },
  { operation: 'listOrders', method: 'GET', path: '/orders', noun: 'Order', summary: 'Orders in the current workspace (seed lifecycle: pending → paid → shipped → delivered, plus a returned order)' },
  { operation: 'getOrder', method: 'GET', path: '/orders/{id}', noun: 'Order', summary: 'One order by id' },
  { operation: 'createOrder', method: 'POST', path: '/orders', noun: 'Order', summary: 'Place an order against served offers (the agents-as-buyers door; sandbox: ephemeral workspace, no payment occurs)' },
]

export const substrate: APIProduct = {
  substrate: 'retail-ecommerce',
  nouns: [
    {
      noun: 'Product',
      schema: 'https://schema.org/Product',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      bindingNote:
        'first-party catalog capture at the commerce rails (row source route). Merchant product feeds are Class B (agreements) — until those land, catalog seed is labeled synthetic per spec §5.2 and an `ingested` feed binding is deliberately NOT declared.',
    },
    {
      noun: 'ProductIdentity',
      schema: 'https://schema.org.ai/ProductIdentity',
      binding: 'generated',
      verbs: ['resolve'],
      bindingNote:
        'the 4-lens crosswalk (GTIN / GPC / UNSPSC / HTS) + canonical GS1 Digital Link URI, computed mechanically from the catalog — the identity spine of the vertical (register matrix §1). Live external resolution against id.gs1.org is not performed at wave zero (nothing federated is declared).',
    },
    {
      noun: 'Offer',
      schema: 'https://schema.org/Offer',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      bindingNote:
        'first-party offer capture (row source route); the enrichment ladder (offer capture → GTIN-normalized catalog → live price/availability oracle) accretes later as actuation exhaust — the oracle rung is a recorded vacancy, not a served surface.',
    },
    {
      noun: 'Order',
      schema: 'https://schema.org/Order',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      bindingNote: 'first-party order capture at the commerce rails; OMS system-of-record grain.',
    },
  ],
  systems: [
    // Row headless ply: "POS/OMS + storefront". POS is an avoid-class-3
    // commodity at breadth (row note) — deliberately NOT served; the headless
    // value is the OMS/storefront pair consumed by agent buyers.
    { system: 'OMS', coordinates: ['online-retailers (NAICS 44-45 ex-441)'] },
    { system: 'Storefront', coordinates: ['multichannel-merchants', 'marketplace-sellers'] },
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
