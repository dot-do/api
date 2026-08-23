/**
 * product.js — the Stratum-A G3 `APIProduct` instance for the
 * `manufacturing` substrate (template spec §1), instantiated from the
 * full-economy register row "Manufacturing (NAICS 31-33)".
 *
 * This is a GAP row — the register's largest naming vacuum: zero market-face
 * names held for the biggest B2B sector. Per spec §0 the substrate + sandbox
 * are built G3-first under a placeholder org.ai address (manufacturing.org.ai
 * is a held G2 NAMESPACE, not a market face) and the G4 brand config attaches
 * when a name is ruled (#16 acquisition lane). Nothing in this directory
 * implies acquisition of any name.
 *
 * NOT in this stratum (spec §1): brand, ICP, motion, offer, price,
 * positioning — those live in projection.json (Stratum B).
 */

export const product = {
  substrate: "manufacturing",

  // Canonical Nouns — each: schema typing ($type → schema.org.ai), binding
  // direction, served verbs. The row's grain is item/BOM/GTIN master data;
  // G1 anchors: GS1 GTIN/GPC/Digital Link for product identity, UNSPSC
  // classification (the UNSPSC-GPC-HTS crosswalk is the identity spine this
  // row rides), X12 850/856/810 on the trading edge.
  nouns: [
    // Product master data — the row's data ply (SC #15, marked HYPOTHESIS in
    // the register). Native: the PIM/ERP item master is the system of record
    // the headless face doors; wave-zero records are synthetic and labeled.
    { name: "Item", $type: "https://schema.org.ai/Item", binding: "native", verbs: ["list", "get", "create", "syndicate"] },
    { name: "BillOfMaterials", $type: "https://schema.org.ai/BillOfMaterials", binding: "native", verbs: ["list", "get"] },
    // Digital Product Passport — the row's only DATED demand signal (EU
    // battery-regulation DPP, statutory 2027-02-18, register [VC #23, H]).
    { name: "ProductPassport", $type: "https://schema.org.ai/ProductPassport", binding: "generated", verbs: ["list", "get"] },
    // The RFQ grain (FP #26 buyer-side mfg RFQ; VC packaging RFQ #13).
    { name: "RFQ", $type: "https://schema.org.ai/RFQ", binding: "native", verbs: ["list", "get"] },
    { name: "Quote", $type: "https://schema.org.ai/Quote", binding: "generated", verbs: ["list"] },
    // X12 850/856/810 typing anchors on the wholesale trading edge —
    // document CONTENT at wave zero is synthetic and labeled.
    { name: "TradingDocument", $type: "https://schema.org.ai/TradingDocument", binding: "generated", verbs: ["list"] },
    // The UNSPSC↔GPC↔HTS classification spine (87,747-node UNSPSC corpus per
    // the register's EO lens); wave-zero entries are schema-shaped synthetic
    // rows, never real codes presented as authoritative.
    { name: "CrosswalkEntry", $type: "https://schema.org.ai/CrosswalkEntry", binding: "generated", verbs: ["list"] },
  ],

  // The row's System set from the ~52-System catalog (register headless ply).
  // ERP is the O*NET-modal system for this market — 381 occupations, the top
  // row of the catalog [SC §1.3]; CAD/PLM at 254 occupations; PIM is the
  // master-data-grain system. MES is EXCLUDED: the register marks it
  // [UNVERIFIED — not in the cited catalog rows] (presence-when-true).
  systems: [
    { system: "ERP", coordinates: ["manufacturers"] },
    { system: "PLM", coordinates: ["engineering-document-control"] },
    { system: "PIM", coordinates: ["product-master-data"] },
  ],

  // Presence-when-true: only the transports actually mounted by this worker.
  transports: ["REST", "MCP"],

  // Canonical operation identifiers (axp-ext/rates-g2 §1: camelCase verb
  // form; ONE name across OpenAPI operationId = MCP tool = suite coverage =
  // rates[] key). These are the only things the rate card may price.
  operations: [
    "listItems", //             GET /items (the branching collection)
    "getItem", //               GET /items/{id}
    "createItem", //            POST /items — headless master-data door (native binding)
    "syndicateItem", //         POST /items/{id}/syndicate — outcome verb, 402 OFFER stub
    "listBoms",
    "getBom",
    "listPassports",
    "getPassport",
    "listRfqs",
    "getRfq",
    "listQuotes",
    "listTradingDocuments",
    "listCrosswalkEntries",
    "getIcp",
    "getVerifySuite",
    "getPricing", //            generated quartet operation
    "getOffer", //              generated (metered) quartet operation
  ],

  // §5.2 sandbox spec — the seed is versioned with the manifest; reseeding is
  // a build step (scripts/generate-seed.mjs), never a manual edit. GS1
  // fixture law: every GTIN uses the GS1 demo prefix 952 with a VALID check
  // digit; classification codes are schema-shaped synthetic (never real codes
  // presented as authoritative); no real company or person names.
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
