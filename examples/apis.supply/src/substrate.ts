/**
 * substrate.ts — Stratum A: the G3 substrate `wholesale-distribution`,
 * instantiated from the register row
 * (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "wholesale-distribution") per the property template spec §1.
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products` and
 * this local copy is extracted to it then (prove-then-extract — this example
 * is a proving instance, not the abstraction's home).
 *
 * Row anchors carried here: NAICS 42; X12 850 (PO) / 856 (ASN) / 810
 * (invoice) — the settled interchange set; GS1 GTIN/GLN for product/party
 * identity; UNSPSC as the cross-distributor catalog spine. The X12 document
 * rail rides the transactions.dev germ (agent-native EDI; documents captured
 * first-party, consent-at-rail).
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

/** PO lifecycle states — the branching-collection filter axis. */
export const PURCHASE_ORDER_STATUSES = ['acknowledged', 'shipped', 'invoiced', 'matched'] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listPurchaseOrders', method: 'GET', path: '/purchase-orders', noun: 'PurchaseOrder', summary: 'The branching purchase-order collection (X12 850-typed) — typed OK | EMPTY | BLOCKED on one pathname' },
  { operation: 'getPurchaseOrder', method: 'GET', path: '/purchase-orders/{id}', noun: 'PurchaseOrder', summary: 'One purchase order by id, with its document-flow links (ASN, invoice)' },
  { operation: 'submitPurchaseOrder', method: 'POST', path: '/purchase-orders', noun: 'PurchaseOrder', summary: 'Submit an 850-typed purchase order into the sandbox workspace (agent-native EDI door; ephemeral)' },
  { operation: 'matchPurchaseOrder', method: 'POST', path: '/purchase-orders/{id}/match', noun: 'PurchaseOrder', summary: 'Order a verified three-way match (850 ↔ 856 ↔ 810) for this PO — outcome grain; answers the 402 OFFER boundary' },
  { operation: 'listShipNotices', method: 'GET', path: '/ship-notices', noun: 'ShipNotice', summary: 'Advance ship notices (X12 856-typed) in the current workspace' },
  { operation: 'getShipNotice', method: 'GET', path: '/ship-notices/{id}', noun: 'ShipNotice', summary: 'One advance ship notice by id' },
  { operation: 'listInvoices', method: 'GET', path: '/invoices', noun: 'Invoice', summary: 'Invoices (X12 810-typed) in the current workspace' },
  { operation: 'getInvoice', method: 'GET', path: '/invoices/{id}', noun: 'Invoice', summary: 'One invoice by id' },
  { operation: 'listCatalogItems', method: 'GET', path: '/catalog-items', noun: 'CatalogItem', summary: 'The GTIN/UNSPSC-keyed product catalog (GS1 demo prefix 952 in the sandbox)' },
  { operation: 'getCatalogItem', method: 'GET', path: '/catalog-items/{id}', noun: 'CatalogItem', summary: 'One catalog item by GTIN' },
  { operation: 'quoteLandedCost', method: 'POST', path: '/landed-cost', noun: 'LandedCostQuote', summary: 'Compute a landed-cost quote for a catalog item and destination (sandbox: labeled demo formula)' },
]

export const substrate: APIProduct = {
  substrate: 'wholesale-distribution',
  nouns: [
    {
      noun: 'PurchaseOrder',
      schema: 'https://schema.org.ai/PurchaseOrder',
      binding: 'native',
      verbs: ['list', 'get', 'submit', 'match'],
      bindingNote: 'X12 850-typed (the settled interchange set, row G1 anchor); row source route = owned-by-construction, documents captured first-party at the agent-native EDI rail (transactions.dev germ), consent-at-rail',
    },
    {
      noun: 'ShipNotice',
      schema: 'https://schema.org.ai/ShipNotice',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'X12 856-typed advance ship notice; same first-party document rail',
    },
    {
      noun: 'Invoice',
      schema: 'https://schema.org.ai/Invoice',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'X12 810-typed; same first-party document rail; pre-agreed schema market (cheapest data-entry class per the row)',
    },
    {
      noun: 'CatalogItem',
      schema: 'https://schema.org/Product',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'GS1 GTIN identity + UNSPSC catalog spine (row G1 anchors); schema.org Product carries GTIN natively. Cross-distributor price/availability breadth is a [H] claim on the row — NOT built here (probe before build); this catalog is single-tenant sandbox grain',
    },
    {
      noun: 'LandedCostQuote',
      schema: 'https://schema.org.ai/LandedCostQuote',
      binding: 'generated',
      verbs: ['quote'],
      bindingNote: 'computed record (landedcost.click artifact grain, held name); sandbox uses a labeled demo formula — never presented as real duty/freight rates',
    },
  ],
  systems: [
    // Row headless ply: "Order management / EDI pipeline [SC #16]; ERP/PIM (cascade tree assignment for 42)"
    { system: 'OrderManagement', coordinates: ['wholesale-distribution', 'edi-pipeline'] },
    { system: 'ERP', coordinates: ['wholesale-distribution'] },
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
