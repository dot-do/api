/**
 * apiproduct.js — the G3 APIProduct instance for the `fn-supply-chain`
 * substrate, authored in the primitives.org.ai digital-products shape
 * (template spec §1). Stratum A only: NO brand, domain, ICP, motion, offer,
 * price or positioning lives here — those are G4 projection fields
 * (projection.js).
 */
import { buildManifest, ORIGIN } from "./manifest.js";
import { RETENTION_NOTICE } from "./seed.js";

/** Every operation the surface serves — camelCase verbs, UPPERCASE acronyms;
 *  the only things a rate card may price. */
export const OPERATIONS = [
  "listPurchaseOrders", // served as the branching collection (openapi operationId: listCollection)
  "getPurchaseOrder",
  "createPurchaseOrder", // headless buy-side system-of-record door
  "listRFQs",
  "createRFQ", // headless door
  "submitQuote", // supply-side price response — the RFQ fan-out corpus germ
  "listQuotes",
  "listInvoices",
  "listShipmentNotices",
  "listEPCISEvents",
  "listItems",
  "getICP",
  "getVerify",
  "getPricing",
  "getOffer",
  "getFamilyRegistry",
];

export const SUBSTRATE = "fn-supply-chain";

export const apiProduct = Object.freeze({
  substrate: SUBSTRATE,

  /** Canonical Nouns — each names its schema, interchange anchor, binding
   *  direction, and verbs. Bindings are per-Noun honest at wave zero: Nouns
   *  with a mounted write door are `native` (buy-side system of record);
   *  read-only synthetic-seeded Nouns are `generated`. The row's source route
   *  (internal-first: the studio's own agent purchasing across posted-rate
   *  catalogs; EPCIS captured first-party at the rail, consent-at-rail; X12
   *  docs via the transactions.dev germ) upgrades these as the corpus
   *  accretes — the enrichment ladder runs quote/PO captures → cross-vendor
   *  price and lead-time index → commodity-grain I-O weights (VC route 6). */
  nouns: [
    {
      noun: "PurchaseOrder",
      schema: "https://schema.org/Order",
      interchange: "ANSI X12 850 (purchase order)", // settled-schema cheap entry per the cascade ranking
      binding: "native",
      verbs: ["listPurchaseOrders", "getPurchaseOrder", "createPurchaseOrder"],
    },
    {
      noun: "RFQ",
      schema: "https://schema.org.ai/RFQ", // H3 record; no single interchange standard for RFQs — substrate-typed
      binding: "native",
      verbs: ["listRFQs", "createRFQ"],
      // Register dispute carried VERBATIM, unresolved by this build: RFQ
      // breadth-vs-narrowed (convergence §5.3 — VC claims V at cross-category
      // breadth [H — probe before build]; FP/SC/EO all narrow it). Wave zero
      // is category-narrow; "resolve by incumbency probe, not by ruling".
    },
    {
      noun: "Quote",
      schema: "https://schema.org/Offer", // the price response — the row's "most valuable prospective dataset" germ
      binding: "native",
      verbs: ["listQuotes", "submitQuote"],
    },
    {
      noun: "Invoice",
      schema: "https://schema.org/Invoice",
      interchange: "ANSI X12 810 (invoice)",
      binding: "generated",
      verbs: ["listInvoices"],
    },
    {
      noun: "ShipmentNotice",
      schema: "https://schema.org.ai/ShipmentNotice",
      interchange: "ANSI X12 856 (advance ship notice)",
      binding: "generated",
      verbs: ["listShipmentNotices"],
    },
    {
      noun: "EPCISEvent",
      schema: "https://schema.org.ai/EPCISEvent",
      interchange: "GS1 EPCIS 2.0",
      binding: "generated",
      verbs: ["listEPCISEvents"],
      // epcis.dev remains the traceability sub-position's own face (distinct
      // register cell); this Noun is the Function row's data-ply record.
    },
    {
      noun: "Item",
      schema: "https://schema.org/Product",
      interchange: "GS1 GTIN/GLN (identification spine); UNSPSC codes documented as the what-is-bought spine but OMITTED in fixtures, never fabricated",
      binding: "generated",
      verbs: ["listItems"],
    },
  ],

  /** The row's System set (headless ply): the buy-side Procurement system of
   *  record (H3) with ERP (#1 in the 52-System catalog, 381 occupations)
   *  beside it. The WMS (worklists.app germ) and order-management/EDI
   *  pipeline (transactions.dev germ, cascade #16) are register germs, not
   *  declared coordinates until they serve. */
  systems: [
    { system: "Procurement", coordinates: ["supply-chain-procurement", "buy-side"] },
    { system: "ERP", coordinates: ["supply-chain-procurement"] },
  ],

  /** Transports emitted from the one definition. MCP is mounted (worker.js);
   *  REST is live; RPC/CapnWeb/HATEOAS ride the same manifest when the
   *  serving lane mounts them — not declared until served (presence-when-true). */
  transports: ["REST", "MCP"],

  /** The machine face — ONE defineSiteManifest() input; the whole quartet
   *  generates from this (vendored axp-faces at the PINS.json digest). */
  face: buildManifest(),

  operations: OPERATIONS,

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seedModule: "./seed.js",
    tenant: "anon-sandbox (universal floor — AXP Clause 7, keyless first value)",
    retention: RETENTION_NOTICE,
    fixtureLaw:
      "GS1 demo prefix 952 with valid check digits on GTINs AND GLNs; no real company or person names; every record example:true, every titled record a [demo] prefix; UNSPSC codes omitted, never fabricated; invoice amounts foot to their PO lines",
    regeneration: "build-step",
  },

  /** The published suite — the /verify export plus the local fail-closed gate. */
  suite: {
    verifyUrl: `${ORIGIN}/verify`,
    conformance: {
      spec: "apis-ax-axp@2.6.0",
      digest: "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d",
      localGate: "test/conformance.test.js (assertConforms, fail-closed at the pinned digest)",
    },
    // interfaces.testSuite deliberately NOT declared on the card (batch-2
    // watch list: stays undeclared until digest-pinned): declaring it would
    // arm check-published-test-suite against a document that is not yet
    // published at a pinned digest. /verify still ships and links.verify
    // names it.
  },

  /** One meter per operation — §6.4 rollup grain. Events are emitted at the
   *  seams (seams.js) tagged { substrate, projection, motion, operation, shape, pattern }. */
  meters: OPERATIONS.map((operation) => ({ operation, event: "meter" })),
});
