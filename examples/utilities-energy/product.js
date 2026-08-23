/**
 * product.js — the Stratum-A G3 `APIProduct` instance for the
 * `utilities-energy` substrate (template spec §1), instantiated from the
 * full-economy register row "Utilities & Energy (NAICS 22)".
 *
 * GAP row, PLACEHOLDER KEY, and — unlike the other GAP rows — a DEPTH-RULED
 * cell: SC #21 classes NAICS 22 as Axis-2 only, avoid-class 5 (door-shape +
 * balance-sheet failure on the utility-side sale). The register's own note:
 * "this GAP differs from manufacturing/freight GAPs in kind: the depth
 * ruling, not the name shortage, is the binding constraint." Consequences
 * built in, not around:
 *
 *   - NOUN-GRAIN properties on the rails, no front (the row's ruled Axis-2
 *     posture) — this substrate is the metering.click + interconnection.click
 *     entry-artifact grain, NEVER an apex or data-thesis face;
 *   - the buyer coordinate is the PARTY FILING INTO THE UTILITY (solar
 *     installers/EPCs, interconnection applicants), never the utility itself
 *     (the utility-side sale fails the ruled screen);
 *   - energy.org.ai is a held G2 NAMESPACE, not a market face (register) —
 *     it serves as the placeholder address per spec §0; the G4 brand attaches
 *     if/when a name is ruled (#16), and the depth ruling itself weakens the
 *     case for buying one (register note carried verbatim).
 *
 * NOT in this stratum (spec §1): brand, ICP, motion, offer, price,
 * positioning — those live in projection.json (Stratum B).
 */

export const product = {
  substrate: "utilities-energy",

  // Canonical Nouns — each: schema typing ($type → schema.org.ai), binding
  // direction, served verbs. G1 anchors from the row: NAICS 221; Green
  // Button / NAESB ESPI as the meter-data interchange standard [UNVERIFIED —
  // not in estate docs; carried as a TYPING ANCHOR with the row's own
  // caveat]; FERC/state interconnection-queue registries implied by
  // interconnection.click.
  nouns: [
    // The one data abstraction the cascade assigns this market (SC #21):
    // the meter/interval record. ESPI/Green Button appear as typing anchors
    // only [register: UNVERIFIED]; wave-zero records are synthetic, labeled.
    { name: "IntervalRead", $type: "https://schema.org.ai/IntervalRead", binding: "ingested", verbs: ["list"] },
    { name: "Meter", $type: "https://schema.org.ai/Meter", binding: "ingested", verbs: ["list", "get"] },
    // Public FERC/ISO interconnection-queue records (the interconnection.click
    // read side). Queue names in the sandbox are schema-shaped synthetic
    // (ISO-EX-*) — never real queue data presented as authoritative.
    { name: "QueueEntry", $type: "https://schema.org.ai/QueueEntry", binding: "ingested", verbs: ["list", "get"] },
    // The applicant-side filing — the interconnection.click WRITE grain and
    // this substrate's one native-bound Noun: the party filing into the
    // utility tracks its own request here. NOTE: this is the entry-artifact
    // grain, NOT a 52-System catalog door — the row's headless cell is empty
    // (see `systems` below).
    { name: "InterconnectionRequest", $type: "https://schema.org.ai/InterconnectionRequest", binding: "native", verbs: ["list", "get", "create", "submit"] },
    // Utility tariff filings (public source class per the row's route).
    { name: "Tariff", $type: "https://schema.org.ai/Tariff", binding: "ingested", verbs: ["list", "get"] },
  ],

  // The row's System set from the ~52-System catalog: EMPTY — and that is the
  // row's actual value, not a missing field. The register: "Cascade assigns
  // none ('—' in SC #21) — the only market row in the cascade with an empty
  // headless cell." CIS / meter-data management are CANDIDATES marked
  // [UNVERIFIED — not computed from O*NET in any doc], so presence-when-true
  // keeps them out. The empty set is declared AS PROVIDED; the native
  // InterconnectionRequest door above is the applicant-filing entry-artifact
  // grain, deliberately not dressed up as a catalog System.
  systems: [],
  systemsNote:
    "register row headless_ply is the cascade's only empty cell ('—' in SC #21); CIS/MDM candidates are [UNVERIFIED] and not declared (presence-when-true). The headless door served here is the applicant-side filing workspace (interconnection.click grain), not a 52-System coordinate.",

  // Presence-when-true: only the transports actually mounted by this worker.
  transports: ["REST", "MCP"],

  // Canonical operation identifiers (axp-ext/rates-g2 §1: camelCase verb
  // form; ONE name across OpenAPI operationId = MCP tool = suite coverage =
  // SDK method = rates[] key). These are the only things the rate card may
  // price. Collections carry real verbs (listMeters, never listCollection).
  operations: [
    "listIntervalReads", //          GET /interval-reads (the branching collection)
    "listMeters", //                 GET /meters
    "getMeter", //                   GET /meters/{id}
    "listQueueEntries", //           GET /queue-entries (public-queue shape)
    "getQueueEntry", //              GET /queue-entries/{id}
    "listInterconnectionRequests", // GET /interconnection-requests
    "getInterconnectionRequest", //  GET /interconnection-requests/{id}
    "createInterconnectionRequest", // POST /interconnection-requests — the native applicant-filing door
    "submitInterconnectionRequest", // POST /interconnection-requests/{id}/submit — outcome verb, 402 OFFER stub
    "listTariffs", //                GET /tariffs
    "getTariff", //                  GET /tariffs/{id}
    "getIcp", //                     GET /icp.json
    "getVerifySuite", //             GET /verify
    "getPricing", //                 generated quartet operation
    "getOffer", //                   generated (metered) quartet operation
  ],

  // §5.2 sandbox spec — versioned with the manifest; reseeding is a build
  // step (scripts/generate-seed.mjs), never a manual edit. Fixture law for
  // this row: fictional utility/applicant names tagged [example]; synthetic
  // identifiers (UTIL-EX-/MTR-EX-/ISO-EX-/TRF-EX- prefixes, 00-prefixed
  // EIN pattern); no real EIA/FERC/ISO identifiers or tariff numbers
  // presented as authoritative; no GTIN grain exists on this row (the GS1
  // 952 rule applies where GTINs exist — none do here); secret-scanned.
  // Source-route probe recorded at build (2026-08-23): EIA v2 API is
  // key-gated (API_KEY_MISSING keyless); the EIA bulk manifest answers 200
  // keyless — but the row classes its route as public-licensable ingest
  // [UNVERIFIED], NOT class A, so the wave-zero seed is synthetic and
  // labeled, typed to the EIA-class feed shapes so real ingest can replace
  // it without a schema change.
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
