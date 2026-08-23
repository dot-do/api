/**
 * product.js — the G3 APIProduct instance for register row `banking-payments`
 * (property-template spec §1, docs/plans/2026-08-23-property-template-spec.md).
 *
 * Stratum A only: substrate, Nouns (schema + binding + verbs), System
 * coordinates, transports, operations, sandbox spec, meters. NO brand, ICP,
 * motion, offer, price, or positioning here — those are G4 projection fields
 * (projection.config.json). One substrate, many non-exclusive projections
 * (apis.finance today; apis.credit / apis.loans / apis.cards are recorded
 * same-property sub-rail names, not separate substrates).
 *
 * Bindings note (row source route): the row's public-regulatory-ingest route
 * is an [UNVERIFIED route inference] (no ruled cascade entry; the FFIEC
 * call-report analog is background knowledge only) and is NOT reachable in
 * this session — so every wave-zero Noun is `generated`: the §5.2 labeled
 * synthetic sandbox seed over the row's record schemas (ISO 20022 interchange
 * spine). The Loan Noun is the core-banking system-of-record door
 * (headless ply) and flips to `native` when a claimed workspace persists;
 * at wave zero the workspace door is ephemeral and discloses it.
 * Register ruling carried: rails are avoid-class 3 — this property is the
 * data/functions layer, NEVER the payment rails themselves; settlement/
 * billing/escrow primitives (payments.do, Batch-S) are platform modules this
 * property CONSUMES, not contains (blocks the monetized-serving stage only).
 */

/** ISO 20022 message types the data ply serves at wave zero. */
export const ISO20022_MESSAGE_TYPES = Object.freeze([
  "pain.001.001.09", // customer credit transfer initiation (disbursement instruction)
  "pacs.008.001.08", // FI-to-FI customer credit transfer (settlement / installment)
  "camt.053.001.08", // bank-to-customer statement (servicing-account period statement)
]);

export const APIProduct = Object.freeze({
  substrate: "banking-payments",
  nouns: Object.freeze([
    Object.freeze({
      noun: "PaymentMessage",
      schema: { $type: "PaymentMessage", $context: "https://schema.org.ai" },
      binding: "generated", // §5.2 synthetic seed; ISO 20022-typed (the pre-agreed record schema per the schema-settledness rule)
      types: ISO20022_MESSAGE_TYPES,
      verbs: Object.freeze(["listPaymentMessages", "getPaymentMessage"]),
    }),
    Object.freeze({
      noun: "Loan",
      schema: { $type: "Loan", $context: "https://schema.org.ai" },
      binding: "generated", // door grain (origination via licensed Lenders); native once the claimed-workspace core-banking door persists
      verbs: Object.freeze(["listLoans", "getLoan", "submitOrigination", "registerLoanRecord"]),
    }),
    Object.freeze({
      noun: "CreditFile",
      schema: { $type: "CreditFile", $context: "https://schema.org.ai" },
      binding: "generated", // the apis.credit records floor: "Agents can't grant credit. They can pull the file."
      verbs: Object.freeze(["listCreditFiles", "getCreditFile", "pullCreditFile"]),
    }),
    Object.freeze({
      noun: "Lender",
      schema: { $type: "Lender", $context: "https://schema.org.ai" },
      binding: "generated", // lender/product market record; the public-ingest enrichment route is [UNVERIFIED] and deferred
      verbs: Object.freeze(["listLenders", "getLender"]),
    }),
    Object.freeze({
      noun: "Workspace",
      schema: { $type: "Workspace", $context: "https://schema.org.ai" },
      binding: "native", // the headless system-of-record door (auto-mint rung of the sandbox); ephemeral at wave zero, disclosed on mint
      verbs: Object.freeze(["mintWorkspace", "getWorkspace"]),
    }),
  ]),
  systems: Object.freeze([
    // 52-System catalog: the SC tree's named system-of-record for NAICS
    // 521-522 is the core banking system; coordinates are the row's ICP
    // company types (banks, credit unions, non-bank lenders, fintech loan
    // servicers) — the operator brings the license (regulation unlock, #22).
    Object.freeze({ system: "CoreBanking", coordinates: Object.freeze(["banks", "credit-unions", "non-bank-lenders", "fintech-loan-servicers"]) }),
  ]),
  transports: Object.freeze(["REST", "MCP"]), // live-only: both mounted; RPC/CapnWeb/HATEOAS land with the serving-lane extraction
  // The only things a rate card may price. `operationId` on EVERY route is a
  // batch-2 ruled placement — the bridge (bridge.js) stamps the generator
  // routes that carry none, and the build gate fails closed if any path
  // operation ends up without one.
  operations: Object.freeze([
    Object.freeze({ verb: "listPaymentMessages", wire: "GET /payment-messages", operationId: "listCollection" }),
    Object.freeze({ verb: "getPaymentMessage", wire: "GET /payment-messages/{id}", operationId: "getPaymentMessage" }),
    Object.freeze({ verb: "listLoans", wire: "GET /loans", operationId: "listLoans" }),
    Object.freeze({ verb: "getLoan", wire: "GET /loans/{id}", operationId: "getLoan" }),
    Object.freeze({ verb: "listCreditFiles", wire: "GET /credit-files", operationId: "listCreditFiles" }),
    Object.freeze({ verb: "getCreditFile", wire: "GET /credit-files/{id}", operationId: "getCreditFile" }),
    Object.freeze({ verb: "pullCreditFile", wire: "POST /credit-files/pulls", operationId: "pullCreditFile" }),
    Object.freeze({ verb: "listLenders", wire: "GET /lenders", operationId: "listLenders" }),
    Object.freeze({ verb: "getLender", wire: "GET /lenders/{id}", operationId: "getLender" }),
    Object.freeze({ verb: "submitOrigination", wire: "POST /originations", operationId: "submitOrigination" }),
    Object.freeze({ verb: "mintWorkspace", wire: "POST /workspaces", operationId: "mintWorkspace" }),
    Object.freeze({ verb: "getWorkspace", wire: "GET /workspaces/{id}", operationId: "getWorkspace" }),
    Object.freeze({ verb: "registerLoanRecord", wire: "POST /workspaces/{id}/loans", operationId: "registerLoanRecord" }),
  ]),
  sandbox: Object.freeze({
    // §5.2 — mechanically produced synthetic seed; the generator is seed.js
    // and reseeding is a build step (the seed is code, versioned with the
    // manifest). Fixture law: fictional institutions and borrowers, fictional
    // BIC-like identifiers, no real routing numbers or EINs, every record
    // labeled example: true. Internal consistency is generated, not typed:
    // amortization schedules, payment messages, statements, and credit-file
    // tradelines all derive from one loan model and are re-derived by the
    // self-verify gate.
    seedModule: "./seed.js",
    tenant: "example", // tenant #1 pattern: same handlers as product, simulated data
    retention: "anonymous sandbox reads are stateless; minted workspaces are ephemeral at wave zero and disclose it; nothing a caller sends is stored",
  }),
  meters: Object.freeze(
    [
      "listPaymentMessages", "getPaymentMessage", "listLoans", "getLoan",
      "listCreditFiles", "getCreditFile", "pullCreditFile", "listLenders",
      "getLender", "submitOrigination", "mintWorkspace", "getWorkspace", "registerLoanRecord",
    ].map((operation) =>
      Object.freeze({ operation, event: "meter", tags: Object.freeze(["substrate", "projection", "motion", "operation", "shape", "pattern"]) }),
    ),
  ),
});
