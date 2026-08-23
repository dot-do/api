/**
 * product.js — the Stratum-A G3 `APIProduct` instance for the `automotive`
 * substrate (template spec §1), instantiated from the full-economy register
 * row "Automotive (NAICS 441/8111)".
 *
 * CLASS A, LIVE-REVENUE row — the estate's only one: auto.dev is the proven
 * wedge ($70-80k MRR [INV §2 via coverage doc]; HARVEST/HOLD posture [SC #1]).
 * The production rail serves at api.auto.dev on the Drivly, Inc. serving
 * stack (entity boundary — Drivly restructuring); THIS directory is the
 * wave-zero machine-face instantiation of the register row, built in
 * dot-do/api examples per the agriculture-food home precedent. It consumes
 * the live lanes as corpus shape only (a consumption edge, not a blocker):
 *
 *   Source-route probes, recorded 2026-08-23 (in-session, honest):
 *   - https://auto.dev/api/listings keyless → 401 "Authentication required"
 *   - https://api.auto.dev (base of the live rail) — key-gated, all plans
 *   - https://www.auto.dev/llms.txt → 200 (real, agent-oriented)
 *   - https://www.auto.dev/openapi.json → 200
 *   - https://auto.dev/.well-known/agents.json → 308 → www → 404 (NO AXP card)
 *   - /pricing → 200 HTML marketing page (no machine Pricing Document)
 *
 *   So the live rail already serves llms.txt + OpenAPI but NOT the AXP card,
 *   typed envelopes, keyless anon-sandbox floor, or a rates[] Pricing
 *   Document — those are the gaps this wave-zero face closes, as an
 *   adoptable artifact. Because the corpus is key-gated from this build, the
 *   universal-floor sandbox seed is labeled synthetic per §5.2, typed to the
 *   live rail's record shapes so the real corpus can back it without a
 *   schema change. Real records are NEVER faked here (fixture law).
 *
 * NOT in this stratum (spec §1): brand, ICP, motion, offer, price,
 * positioning — those live in projection.json (Stratum B).
 */

export const product = {
  substrate: "automotive",

  // Canonical Nouns — each: schema typing ($type → schema.org.ai), binding
  // direction, served verbs. G1 anchors from the row: NAICS 441 (motor
  // vehicle & parts dealers) + 8111 (automotive repair & maintenance); VIN as
  // the G1 identity key (ISO 3779/3780 [register: UNVERIFIED — standard cited
  // from background knowledge, not estate docs]); UNSPSC segment 25
  // [UNVERIFIED at class level]; O*NET 49-3023 / 41-2022 [UNVERIFIED specific
  // codes] — all carried as typing anchors with the row's own caveats.
  nouns: [
    // THE VEHICLE record, VIN-keyed, full breadth — the row's data ply and
    // the Vindex enrichment pattern's origin. Owned corpus at the live rail
    // (2.1M listings [SC #1]); key-gated from this build, so sandbox records
    // are VIN-shaped synthetic, labeled.
    { name: "Vehicle", $type: "https://schema.org.ai/Vehicle", binding: "ingested", verbs: ["list", "get", "decode"] },
    // Retail listings on the vehicle record (the live rail's listings lane).
    { name: "Listing", $type: "https://schema.org.ai/Listing", binding: "ingested", verbs: ["list", "get"] },
    // Parts/tires catalogs on the GTIN/UNSPSC identity spine (row data ply);
    // tires are a category on the parts collection here — apis.tires /
    // apis.parts are held sibling names, recorded in projection.json, not
    // served faces (ghost-surface law).
    { name: "Part", $type: "https://schema.org.ai/Part", binding: "ingested", verbs: ["list", "get"] },
    // The 8111 work-order record — the row's headless ply for repair &
    // maintenance: "FSM with the work-order record — recon/inspection/
    // maintenance already live in Vin lanes [SC #14]". The one native-bound
    // Noun: the system-of-record door served by this face.
    { name: "WorkOrder", $type: "https://schema.org.ai/WorkOrder", binding: "native", verbs: ["list", "get", "create", "complete"] },
  ],

  // The row's System set. The headless ply names TWO cells:
  //   - FSM⟨automotive-repair 8111⟩ with the work-order record — live in Vin
  //     lanes per the row; the System coordinate this face serves.
  //   - DMS (dealer management system) — "dms.headless.ly named, empty;
  //     instantiation deferred" (row, verbatim). Declared AS PROVIDED in the
  //     note below and NOT served: mounting a DMS door here would be a ghost
  //     surface. The regulation unlock (#22) is the row's note on DMS.vin,
  //     carried in projection.json.
  systems: [{ system: "FSM", coordinates: ["automotive-repair (NAICS 8111)", "work-order record grain (recon | inspection | maintenance)"] }],
  systemsNote:
    "register row headless_ply names DMS (dms.headless.ly, empty — instantiation deferred, row verbatim) and FSM for 8111 (work-order record, recon/inspection/maintenance already live in Vin lanes [SC #14]). Only the FSM work-order door is served here; DMS is recorded as provided-but-deferred, never mounted (presence-when-true).",

  // Presence-when-true: only the transports actually mounted by this worker.
  transports: ["REST", "MCP"],

  // Canonical operation identifiers (axp-ext/rates-g2 §1: camelCase verb
  // form; ONE name across OpenAPI operationId = MCP tool = suite coverage =
  // SDK method = rates[] key). These are the only things the rate card may
  // price. Collections carry real verbs (listVehicles, never listCollection).
  operations: [
    "listVehicles", //     GET /vehicles (the branching collection, VIN-keyed)
    "getVehicle", //       GET /vehicles/{vin}
    "decodeVin", //        GET /vin/{vin} — the live wedge's signature operation, sandbox-corpus decode here
    "listListings", //     GET /listings
    "getListing", //       GET /listings/{id}
    "listParts", //        GET /parts (GTIN/UNSPSC spine; tires = category)
    "getPart", //          GET /parts/{id}
    "listWorkOrders", //   GET /work-orders (the FSM headless collection)
    "getWorkOrder", //     GET /work-orders/{id}
    "createWorkOrder", //  POST /work-orders — the native FSM door
    "completeWorkOrder", // POST /work-orders/{id}/complete — outcome verb, 402 OFFER stub
    "getIcp", //           GET /icp.json
    "getVerifySuite", //   GET /verify
    "getPricing", //       generated quartet operation
    "getOffer", //         generated (metered) quartet operation
  ],

  // §5.2 sandbox spec — versioned with the manifest; reseeding is a build
  // step (scripts/generate-seed.mjs), never a manual act. Fixture law for
  // this row: fictional dealer/make names tagged [example]; VIN-shaped
  // synthetic identifiers (17-char, EXAMPLE-prefixed, I/O/Q excluded, check
  // digit NOT computed — never a real VIN; ISO 3779 is a typing anchor only,
  // register [UNVERIFIED]); GTIN grain EXISTS on this row (parts/tires) so
  // the GS1 demo prefix 952 rule applies WITH valid check digits; synthetic
  // 00-prefix EINs; secret-scanned. The live corpus is key-gated from this
  // build (probe above), so no real listing, price, or dealer record appears.
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
