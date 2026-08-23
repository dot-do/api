/**
 * substrate.ts — Stratum A: the G3 substrate `restaurants-food-service`,
 * instantiated from the register row
 * (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "restaurants-food-service") per the property template spec §1.
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products` and
 * this local copy is extracted to it then (prove-then-extract — this example
 * is a proving instance, not the abstraction's home).
 *
 * Row grain: the back-of-house operational-artifact set — par levels,
 * inventory counts, supplier invoices — plus the schema.org-typed order/menu
 * records (SC #23 verbatim: 'Order/menu record (schema.org)'). The row's
 * ruled posture is Axis-2 ONLY (SC #23, avoid-class 3 at POS): the POS/OMS
 * front is commoditized and is NEVER a front here — the abstraction is built
 * once in the catalog. The uncommoditized ply the held artifact name
 * (parlevels.co) points at is the back-of-house inventory/par-level system
 * (row-flagged [analysis]), and that is the ply this substrate serves.
 *
 * Source route honesty: the route-if-provisioned is FIRST-PARTY artifact
 * capture (par levels, counts, invoices) at the rail — owned-by-construction.
 * That route was NOT provisioned in-session, so the wave-zero corpus is the
 * §5.2 labeled synthetic seed — recorded honestly, never unlabeled, never an
 * improvised class-A claim. Menu/order data is schema.org-public and crowded
 * (the row's avoid lane): nothing here is scraped or ingested from it.
 *
 * FSMA-204 / EPCIS traceability rides the agriculture-food (11/311) row per
 * the row's G1 anchors — upstream adjacency only, never claimed here.
 *
 * RECORD-TYPE COLLISIONS, recorded (no primacy ruling on record — per the
 * batch rule this build claims NOTHING beyond its own row key):
 *   - Order: the Offer/Order record grain is shared with retail-ecommerce
 *     (SC #25 'Offer/Order record (schema.org + GS1 Digital Link)').
 *   - SupplierInvoice: the invoice record grain is adjacent to
 *     wholesale-distribution (X12 810 typed invoice) and to the accounting-tax
 *     worked example's schema.org Invoice/Order fallback.
 * Both collisions are recorded in ../projections/apis.restaurant.json
 * (`sharedFaces`); the shared faces are not claimed.
 *
 * Sub-verticals: apis.pizza and apis.catering are sub-verticals INSIDE this
 * property per the property-grain ruling (register row, proposed_primary_name)
 * — represented here as location grains (NAICS 722513 pizza, 722320 catering),
 * never separate substrates.
 *
 * Nothing in this file is brand, ICP, motion, offer, price, or positioning —
 * those are G4 projection fields (../projections/*.json, spec §2).
 */

export type NounBinding = 'ingested' | 'generated' | 'native' | 'federated'

export interface NounDef {
  /** canonical Noun name, PascalCase */
  noun: string
  /** $type → schema identity (real schema.org types where one exists — Order, Menu, Invoice, FoodEstablishment; schema.org.ai estate typing for the artifact records — cascade rule 2, no settled interchange standard for the back-of-house artifact grain) */
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

/** Count lifecycle: an open count becomes reconciled only as a completed, verified reconciliation (the outcome grain). */
export const COUNT_STATUSES = ['open', 'reconciled'] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listInventoryCounts', method: 'GET', path: '/inventory-counts', noun: 'InventoryCount', summary: 'The branching inventory-count collection — typed OK | EMPTY | BLOCKED on one pathname' },
  { operation: 'getInventoryCount', method: 'GET', path: '/inventory-counts/{id}', noun: 'InventoryCount', summary: 'One inventory count with its lines, food-cost arithmetic, and supplier invoices resolved by reference' },
  { operation: 'recordInventoryCount', method: 'POST', path: '/locations/{id}/inventory-counts', noun: 'InventoryCount', summary: 'Record an inventory count for a location (sandbox: ephemeral workspace) — the system-of-record door' },
  { operation: 'reconcileInventoryCount', method: 'POST', path: '/inventory-counts/{id}/reconcile', noun: 'InventoryCount', summary: 'Order the completed, VERIFIED reconciliation of a count (variance vs par levels + supplier invoices; outcome grain) — answers the 402 OFFER boundary' },
  { operation: 'listParLevels', method: 'GET', path: '/par-levels', noun: 'ParLevel', summary: 'Par levels (location-keyed; the recurring-operational-artifact grain the property is named for)' },
  { operation: 'getParLevel', method: 'GET', path: '/par-levels/{id}', noun: 'ParLevel', summary: 'One par level by id' },
  { operation: 'listSupplierInvoices', method: 'GET', path: '/supplier-invoices', noun: 'SupplierInvoice', summary: 'Supplier invoices (period-keyed; line totals sum to the invoice total)' },
  { operation: 'getSupplierInvoice', method: 'GET', path: '/supplier-invoices/{id}', noun: 'SupplierInvoice', summary: 'One supplier invoice by id' },
  { operation: 'listOrders', method: 'GET', path: '/orders', noun: 'Order', summary: 'Order records, schema.org-typed (period- and location-keyed)' },
  { operation: 'getOrder', method: 'GET', path: '/orders/{id}', noun: 'Order', summary: 'One order by id' },
  { operation: 'listMenus', method: 'GET', path: '/menus', noun: 'Menu', summary: 'Menus, schema.org-typed (one per location)' },
  { operation: 'getMenu', method: 'GET', path: '/menus/{id}', noun: 'Menu', summary: 'One menu with its items' },
  { operation: 'listLocations', method: 'GET', path: '/locations', noun: 'Location', summary: 'Locations of the current operator workspace (NAICS 722 grain: full-service, pizza, catering)' },
  { operation: 'getLocation', method: 'GET', path: '/locations/{id}', noun: 'Location', summary: 'One location with its menus, par levels, counts, and invoices linked' },
]

export const substrate: APIProduct = {
  substrate: 'restaurants-food-service',
  nouns: [
    {
      noun: 'InventoryCount',
      schema: 'https://schema.org.ai/InventoryCount',
      binding: 'native',
      verbs: ['list', 'get', 'record', 'reconcile'],
      bindingNote:
        'first-party artifact capture at the rail (the row source route: par levels, counts, invoices — owned-by-construction IF provisioned). The route was NOT provisioned in-session, so the wave-zero corpus is the §5.2 labeled synthetic seed — never unlabeled stand-in data, never an improvised class-A claim. The reconcile verb is the outcome grain: the payable unit is the completed, verified reconciliation.',
    },
    {
      noun: 'ParLevel',
      schema: 'https://schema.org.ai/ParLevel',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        "THE recurring-operational-artifact grain (parlevels.co — the DC artifact-grammar entry for this sector, the row's 'interesting held asset'). No interchange standard exists for the back-of-house artifact grain — estate typing per cascade rule 2.",
    },
    {
      noun: 'SupplierInvoice',
      schema: 'https://schema.org/Invoice',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'row marks supplier-invoice / food-cost records [UNVERIFIED — inferred, no estate doc types them] — carried as recorded, typed with the real schema.org Invoice type. COLLISION recorded: the invoice record grain is adjacent to wholesale-distribution (X12 810) and the accounting-tax Invoice fallback — no primacy ruling on record; built under row key `restaurants-food-service` only, the shared face is not claimed.',
    },
    {
      noun: 'Order',
      schema: 'https://schema.org/Order',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'schema.org Order typing per SC #23 verbatim. First-party records at the rail only — public menu/order data is the crowded schema.org-public lane the row rules avoided; nothing is scraped. COLLISION recorded: the Offer/Order record grain is shared with retail-ecommerce (SC #25) — no primacy ruling on record; built under row key `restaurants-food-service` only.',
    },
    {
      noun: 'Menu',
      schema: 'https://schema.org/Menu',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote: 'schema.org Menu/MenuItem typing per SC #23; first-party, one menu per location in the seed.',
    },
    {
      noun: 'Location',
      schema: 'https://schema.org/FoodEstablishment',
      binding: 'native',
      verbs: ['list', 'get'],
      bindingNote:
        'the grain holder: par levels, counts, invoices, orders, and menus hang off a location; real schema.org type (FoodEstablishment). apis.pizza / apis.catering are sub-verticals INSIDE this property (property-grain ruling) — location grains 722513 / 722320, never separate substrates.',
    },
  ],
  systems: [
    // The row's derived System is POS/OMS (SC #23) but the cascade ruling is
    // avoid-class 3 — 'POS commoditized': the abstraction is built once in the
    // catalog, NEVER a front here, so no POS/OMS coordinate is declared as
    // served. The served coordinate is the uncommoditized ply the row's held
    // artifact name (parlevels.co) points at — the back-of-house
    // inventory/par-level system (row-flagged [analysis], carried as recorded).
    // Scheduling/helpdesk ride the H5 rails and are not declared here.
    { system: 'Inventory', coordinates: ['restaurant-back-of-house'] },
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
