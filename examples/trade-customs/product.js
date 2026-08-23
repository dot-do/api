/**
 * product.js — the Stratum-A G3 `APIProduct` instance for the
 * `trade-customs` substrate (template spec §1), instantiated from the
 * register row "Cross-Border Trade & Customs (NAICS 481-483, customs)".
 *
 * This is a GAP row: no G4 name is held for this category (candidates on
 * record — api.trade†, api.customs†, tradedocs† — are ALL availability-
 * UNVERIFIED), so per spec §0 the substrate + sandbox are built G3-first
 * under a placeholder org.ai address and the G4 brand config attaches when a
 * name is ruled. Nothing in this directory implies acquisition of any name.
 *
 * The regulated act (customs brokerage, 19 CFR 111) is cleanly separated
 * from this buildable document layer: the substrate serves typed trade
 * documents and headless document assembly; the licensed operator brings the
 * license (#22 regulation unlock). No brokerage act is performed here.
 *
 * NOT in this stratum (spec §1): brand, ICP, motion, offer, price,
 * positioning — those live in projection.json (Stratum B).
 */

export const product = {
  substrate: "trade-customs",

  // Canonical Nouns — each: schema typing ($type → schema.org.ai), binding
  // direction, served verbs. This row is SPEC-NATIVE (SC #4): the document
  // schemas come free from UN/CEFACT + DCSA (eBL), so document Nouns type
  // against those standards rather than schema.org generics. The MLETR/ETDA
  // adoption spread is the row's statutory clock: electronic transferable
  // records gain legal equivalence jurisdiction by jurisdiction.
  nouns: [
    { name: "Shipment", $type: "https://schema.org.ai/Shipment", binding: "native", verbs: ["list", "get", "create", "assemblePacket"] },
    { name: "BillOfLading", $type: "https://schema.org.ai/BillOfLading", interchangeStandard: "DCSA eBL", binding: "native", verbs: ["list", "get"] },
    { name: "CertificateOfOrigin", $type: "https://schema.org.ai/CertificateOfOrigin", interchangeStandard: "UN/CEFACT", binding: "native", verbs: ["list"] },
    { name: "PhytosanitaryCertificate", $type: "https://schema.org.ai/PhytosanitaryCertificate", interchangeStandard: "UN/CEFACT (IPPC ePhyto-adjacent) [UNVERIFIED anchor — register row]", binding: "native", verbs: ["list"] },
    { name: "CommercialInvoice", $type: "https://schema.org.ai/CommercialInvoice", interchangeStandard: "UN/CEFACT", binding: "native", verbs: ["list", "get"] },
    // Customs entry / classification records are HTS-keyed; the register row
    // flags this grain [UNVERIFIED] — carried here verbatim, and the sandbox
    // uses synthetic HTS-SHAPED codes, never real classifications.
    { name: "CustomsEntry", $type: "https://schema.org.ai/CustomsEntry", binding: "generated", verbs: ["list", "get"] },
  ],

  // The row's headless ply, carried verbatim: "forwarder-grade document
  // pipeline / headless doc assembly" + "forwarder TMS (cascade tree
  // assignment for 481-483/customs)". Per-cell 52-System derivation is not on
  // record for this row (the row itself carries an [inference] flag) — the
  // coordinates below restate the row, they do not extend it.
  systems: [
    { system: "TMS", coordinates: ["freight-forwarders"] },
    { system: "DocumentManagement", coordinates: ["trade-document-assembly"] },
  ],

  // Presence-when-true: only the transports actually mounted by this worker.
  transports: ["REST", "MCP"],

  // Canonical operation identifiers — camelCase verbs, one identifier across
  // every face (OpenAPI operationId = MCP tool string = /verify suite ref =
  // rates[] key). These are the only things the rate card may price.
  operations: [
    "listShipments", //        GET /shipments (the branching collection)
    "getShipment", //          GET /shipments/{id}
    "createShipment", //       POST /shipments — headless system-of-record door (native binding)
    "assemblePacket", //       POST /shipments/{id}/assemble-packet — outcome verb, 402 OFFER stub at wave zero
    "listBillsOfLading", //    GET /bills-of-lading
    "getBillOfLading", //      GET /bills-of-lading/{id}
    "listCertificatesOfOrigin", // GET /certificates-of-origin
    "listPhytosanitaryCertificates", // GET /phytosanitary-certificates
    "listCommercialInvoices", //  GET /commercial-invoices
    "getCommercialInvoice", //    GET /commercial-invoices/{id}
    "listCustomsEntries", //      GET /customs-entries
    "getCustomsEntry", //         GET /customs-entries/{id}
    "getIcp", //                  GET /icp.json
    "getVerify", //               GET /verify
    "getPricing", //              generator quartet
    "getOffer", //                generator offer door
  ],

  // §5.2 sandbox spec — the seed is versioned with the manifest; reseeding is
  // a build step (scripts/generate-seed.mjs), never a manual edit.
  sandbox: {
    seedScript: "scripts/generate-seed.mjs",
    seedFile: "seed.json",
    deterministic: true,
    labeling: "every record carries example:true + demo_notice (live-demo ruling: real product over labeled simulated data)",
    workspaces: "anonymous POSTs mint an ephemeral per-isolate workspace (X-Workspace header); disclosed retention: ephemeral, may reset at any time",
  },

  // The /verify export (published test suite). interfaces.testSuite is NOT
  // declared on the card at wave zero — declaration arms the strict
  // digest-pinned check and belongs after the hosted api.qa verdict exists.
  suite: { url: "/verify", declaredOnCard: false },

  // One meter per operation; every metering event is tagged per spec §6.4.
  meters: { perOperation: true, tags: ["substrate", "projection", "motion", "operation", "shape", "pattern"] },
};
