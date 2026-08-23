/**
 * product.js — the Stratum-A G3 `APIProduct` instance for the
 * `chemicals-materials` substrate (template spec §1), instantiated from the
 * register row "Chemicals & Materials (NAICS 325)".
 *
 * This is a GAP row: no G4 name is held for this category (api.chemicals /
 * apis.chemicals availability [UNVERIFIED]; no acquisition candidate is named
 * in any estate doc), so per spec §0 the substrate + sandbox are built
 * G3-first under a placeholder org.ai address and the G4 brand config
 * attaches when a name is ruled. Nothing in this directory implies
 * acquisition of any name.
 *
 * ROW HEDGE (operative fact of the row): this is a single-lens candidate —
 * only VC #25 nominates the sector, at artifact depth, marked [H] with an
 * explicit probe-before-build flag. Every anchor below that the register
 * marks [UNVERIFIED] stays marked here; nothing in this build hardens a
 * hypothesis into a claim.
 *
 * NOT in this stratum (spec §1): brand, ICP, motion, offer, price,
 * positioning — those live in projection.json (Stratum B).
 */

export const product = {
  substrate: "chemicals-materials",

  // Canonical Nouns — each: schema typing ($type → schema.org.ai), binding
  // direction, served verbs. The row's settled document schema is the GHS
  // 16-section SDS (OSHA HazCom 2012) — the SDS instance of the
  // insurance-document pattern: own the mandatory document layer under
  // whoever transacts. Register marks the cite [UNVERIFIED — standard is
  // real, cite not in estate docs]; carried as a typing anchor only.
  nouns: [
    // CAS registry numbers are the row's identity spine [UNVERIFIED anchor];
    // wave-zero ids are CAS-SHAPED synthetic, never real registry numbers.
    { name: "Substance", $type: "https://schema.org.ai/Substance", binding: "generated", verbs: ["list", "get", "create"] },
    // The 16-section SDS document record — the row's settled artifact grain.
    // Target-state binding is `ingested` (supplier-published SDS corpora —
    // the row's source-route hypothesis, UNPROBED); wave zero is `generated`
    // synthetic, honestly, because the route is not class A today.
    { name: "SafetyDataSheet", $type: "https://schema.org.ai/SafetyDataSheet", binding: "generated", verbs: ["list", "get"] },
    // The per-edge compliance artifact (49 CFR hazmat shipping papers grain,
    // UN dangerous-goods anchor [UNVERIFIED]) — the enrichment-ladder
    // hypothesis's outcome grain; `issue` is the outcome verb (402 stub).
    { name: "ShippingDeclaration", $type: "https://schema.org.ai/ShippingDeclaration", binding: "native", verbs: ["list", "get", "issue"] },
    // Right-to-know inventory grain: every receiving establishment must
    // maintain SDS access under HazCom [UNVERIFIED breadth claim — register
    // hedge carried]; the facility↔substance join is where that lives.
    { name: "Facility", $type: "https://schema.org.ai/Facility", binding: "generated", verbs: ["list", "get"] },
  ],

  // The row's System set. HONESTY NOTE: the register marks the vertical
  // system of record — EHS/chemical-inventory compliance — [UNVERIFIED, not
  // in the cited ~52-System rows]. It is declared here as the row wrote it,
  // hedge carried; ERP is the row's named system for the manufacturing base.
  systems: [
    { system: "EHS", coordinates: ["chemical-inventory-compliance"], note: "[UNVERIFIED — not in the cited ~52-System rows; declared as the register row wrote it]" },
    { system: "ERP", coordinates: ["chemical-manufacturing"] },
  ],

  // Presence-when-true: only the transports actually mounted by this worker.
  transports: ["REST", "MCP"],

  // Canonical operation identifiers — camelCase verbs, ONE name per
  // operation across all five surfaces (route = MCP tool = suite ref =
  // SDK functionName = rates key). These are the only things the rate card
  // may price.
  operations: [
    "listSubstances", //            GET /substances
    "getSubstance", //              GET /substances/{id}
    "createSubstance", //           POST /substances — headless chemical-inventory door
    "listSafetyDataSheets", //      GET /safety-data-sheets (the branching collection)
    "getSafetyDataSheet", //        GET /safety-data-sheets/{id}
    "listShippingDeclarations", //  GET /shipping-declarations
    "getShippingDeclaration", //    GET /shipping-declarations/{id}
    "issueShippingDeclaration", //  POST /shipping-declarations/{id}/issue — outcome verb, 402 OFFER stub
    "listFacilities", //            GET /facilities
    "getFacility", //               GET /facilities/{id}
    "getIcp", //                    GET /icp.json
    "getVerify", //                 GET /verify
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
