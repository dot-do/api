/**
 * product.js — the G3 APIProduct instance for register row `fn-finance`
 * (property-template spec §1, docs/plans/2026-08-23-property-template-spec.md).
 *
 * Stratum A only: substrate, Nouns (schema + binding + verbs), System
 * coordinates, transports, operations, sandbox spec, meters. NO brand, ICP,
 * motion, offer, price, or positioning here — those are G4 projection fields
 * (projection.config.json). One substrate, many non-exclusive projections.
 *
 * Bindings note (row source route): owned corpus via headless usage
 * accretion — every minted startup runs the same Ledger (internal-first
 * customer, Class A). Wave-zero Nouns are `native`; the enrichment ladder
 * (per-tenant ledgers → anonymized close-cycle benchmarks → outcome-priced
 * close products) adds `generated` benchmark Nouns later, consent-at-rail.
 */

/** The ten typed close deliverables, trial balance → month-end package. */
export const CLOSE_DELIVERABLE_TYPES = Object.freeze([
  "trial-balance",
  "bank-reconciliation",
  "ar-aging",
  "ap-cutoff",
  "accrual-journal",
  "prepaid-amortization",
  "fixed-asset-rollforward",
  "revenue-recognition",
  "balance-sheet-reconciliation",
  "month-end-package",
]);

export const APIProduct = Object.freeze({
  substrate: "fn-finance",
  nouns: Object.freeze([
    Object.freeze({
      noun: "Ledger",
      schema: { $type: "Ledger", $context: "https://schema.org.ai" },
      binding: "native", // system of record: the accounting/close system door
      verbs: Object.freeze(["listLedgers", "getLedger"]),
    }),
    Object.freeze({
      noun: "CloseDeliverable",
      schema: { $type: "CloseDeliverable", $context: "https://schema.org.ai" },
      binding: "native", // produced on the Ledger; outcome grain (SC #6)
      types: CLOSE_DELIVERABLE_TYPES,
      verbs: Object.freeze(["listCloseDeliverables", "getCloseDeliverable", "orderCloseDeliverable"]),
    }),
  ]),
  systems: Object.freeze([
    // 52-System catalog: Accounting (197 occupations), at the Function-root
    // coordinate — the finance department of every CompanyType, not the
    // accounting-firm practice (that is the accounting-tax vertical's row).
    Object.freeze({ system: "Accounting", coordinates: Object.freeze(["finance-departments"]) }),
  ]),
  transports: Object.freeze(["REST"]), // live-only; RPC/CapnWeb/MCP/HATEOAS land with the serving-lane extraction
  // The only things a rate card may price. Extra manifest routes carry no
  // generator operationId, so each verb records its wire address too.
  operations: Object.freeze([
    Object.freeze({ verb: "listCloseDeliverables", wire: "GET /close-deliverables", operationId: "listCollection" }),
    Object.freeze({ verb: "getCloseDeliverable", wire: "GET /close-deliverables/{id}" }),
    Object.freeze({ verb: "listLedgers", wire: "GET /ledgers" }),
    Object.freeze({ verb: "getLedger", wire: "GET /ledgers/{id}" }),
    Object.freeze({ verb: "orderCloseDeliverable", wire: "POST /orders" }),
  ]),
  sandbox: Object.freeze({
    // §5.2 — mechanically produced synthetic seed; the generator is seed.js
    // and reseeding is a build step (the seed is code, versioned with the
    // manifest). Fixture law: fictional company, no real names, no real
    // identifiers, every record labeled example: true.
    seedModule: "./seed.js",
    tenant: "example", // tenant #1 pattern: same handlers as product, simulated data
    retention: "anonymous sandbox reads are stateless; nothing a caller sends is stored at wave zero",
  }),
  meters: Object.freeze(
    ["listCloseDeliverables", "getCloseDeliverable", "listLedgers", "getLedger", "orderCloseDeliverable"].map((operation) =>
      Object.freeze({ operation, event: "meter", tags: Object.freeze(["substrate", "projection", "motion", "operation", "shape", "pattern"]) }),
    ),
  ),
});
