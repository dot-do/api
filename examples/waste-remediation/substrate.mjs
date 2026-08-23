/**
 * substrate.mjs — Stratum A: the G3 `APIProduct` instance for register row
 * `waste-remediation` (Waste Management & Remediation, NAICS 562 — spec §1,
 * PascalCase shape from primitives.org.ai digital-products). This is the ONE
 * definition both plies serve from: the data face (record collections) and
 * the headless route/dispatch face (work-order doors on the SAME substrate)
 * are the same manifest rows, same envelopes, same rate rows — binding
 * direction differs, never the surface.
 *
 * GAP row (spec §0): the register's verdict is "GAP — zero names held
 * anywhere in the estate", so everything here is name-independent by
 * construction. No brand, domain, ICP, persona, motion, offer, price, or
 * positioning appears in this stratum — those are G4 projection fields (§2).
 *
 * G1 anchors (from the row, flags kept verbatim):
 *   - NAICS 562 (5621 collection, 5622 treatment & disposal, 5629 remediation)
 *   - EPA RCRA / e-Manifest as the statutory record system [UNVERIFIED —
 *     background knowledge; no estate doc names it]
 *   - O*NET 53-7081 refuse collectors [UNVERIFIED code]
 *   - UNSPSC segment 76 environmental/cleaning services [UNVERIFIED]
 *
 * Source-route probe (2026-08-23, in-session, honest): EPA ECHO RCRA
 * facility search — keyless 200, REAL public-domain records (Class A,
 * ingested → facilities.real.mjs). EPA e-Manifest / RCRAInfo REST — 401,
 * registered credentials required, NOT reachable in-session → the Manifest
 * noun is labeled synthetic sandbox seed at wave zero (spec §5.2) and the
 * e-Manifest ingest is the first rung of the row's enrichment ladder.
 */
import { manifests, workOrders, scaleTickets, wasteProfiles } from "./seed.mjs";
import { facilities } from "./facilities.real.mjs";

export const substrate = Object.freeze({
  substrate: "waste-remediation",

  /** Canonical Nouns — each names its schema and its binding direction.
   * The row names EPA e-Manifest as the statutory record system [UNVERIFIED
   * flag kept], but no keyless interchange feed exists (401 in-session), so
   * record schemas are schema.org.ai-typed per cascade rule 2. */
  nouns: [
    {
      noun: "Manifest",
      schema: "https://schema.org.ai/HazardousWasteManifest",
      binding: "native", // system-of-record door at wave zero; e-Manifest INGEST is the enrichment-ladder rung (feed auth-gated, probed 401)
      verbs: ["list", "get", "create"],
    },
    {
      noun: "Facility",
      schema: "https://schema.org.ai/Facility",
      binding: "ingested", // REAL Class-A corpus: EPA ECHO RCRA handler search, public domain, keyless (probed 200 in-session); provenance on every record
      verbs: ["list", "get"],
    },
    {
      noun: "WorkOrder",
      schema: "https://schema.org.ai/WorkOrder",
      binding: "native", // the headless ply's door: route/dispatch (FSM-class) system of record
      verbs: ["list", "create", "complete"],
    },
    {
      noun: "ScaleTicket",
      schema: "https://schema.org.ai/ScaleTicket",
      binding: "native", // emitted by the dispatch system when a work order completes
      verbs: ["list"],
    },
    {
      noun: "WasteProfile",
      schema: "https://schema.org.ai/WasteProfile",
      binding: "generated", // mechanically derived from the manifest corpus
      verbs: ["list"],
    },
  ],

  /** The row's System set. The row itself flags [UNVERIFIED which of the
   * ~52 Systems is O*NET-modal for 562] — declared here as the row's named
   * headless-ply systems (route/dispatch FSM-class + compliance calendar),
   * not as a catalog citation. */
  systems: [
    { system: "RouteDispatch", coordinates: ["Industry=NAICS-562", "CompanyType=hauler"] },
    { system: "ComplianceCalendar", coordinates: ["Industry=NAICS-562", "Persona=compliance-manager"] },
  ],

  /** Transports actually served by this wave-zero worker — live-only,
   * presence-when-true. (RPC / CapnWeb / HATEOAS emission is the workers.do
   * pattern and arrives with the extraction lane, spec §7.2.) */
  transports: ["REST", "MCP"],

  /** OpenAPI operations — the only things a rate card may price. One
   * canonical camelCase operationId per operation (axp-ext-rates-g2 §1):
   * `listManifests` IS the branching collection's operationId
   * (collection.operationId in manifest.mjs), the MCP tool name, and the
   * rates[] key — one operation, one identifier, everywhere. */
  operations: [
    { operation: "listManifests", method: "GET", path: "/manifests", noun: "Manifest", verb: "list" },
    { operation: "getManifest", method: "GET", path: "/manifests/{manifestId}", noun: "Manifest", verb: "get" },
    { operation: "createManifest", method: "POST", path: "/manifests", noun: "Manifest", verb: "create" },
    { operation: "listFacilities", method: "GET", path: "/facilities", noun: "Facility", verb: "list" },
    { operation: "getFacility", method: "GET", path: "/facilities/{handlerId}", noun: "Facility", verb: "get" },
    { operation: "listWorkOrders", method: "GET", path: "/work-orders", noun: "WorkOrder", verb: "list" },
    { operation: "createWorkOrder", method: "POST", path: "/work-orders", noun: "WorkOrder", verb: "create" },
    { operation: "completeWorkOrder", method: "POST", path: "/work-orders/{workOrderId}/complete", noun: "WorkOrder", verb: "complete" },
    { operation: "listScaleTickets", method: "GET", path: "/scale-tickets", noun: "ScaleTicket", verb: "list" },
    { operation: "listWasteProfiles", method: "GET", path: "/waste-profiles", noun: "WasteProfile", verb: "list" },
  ],

  /** §5.2 sandbox spec — the universal floor. Synthetic records are
   * generated deterministically by seed.mjs (labeled, 952-prefixed);
   * the Facility corpus is REAL ingested public data with provenance
   * (facilities.real.mjs). Anonymous callers get both, keyless, plus an
   * ephemeral auto-minted workspace for writes. */
  sandbox: {
    seedModule: "./seed.mjs",
    realCorpusModule: "./facilities.real.mjs (Class-A ingested — EPA ECHO, public domain; never mixed into synthetic records)",
    seedTenant: "tenant-1 (the labeled demo tenant on the production substrate — live-demo ruling)",
    autoMintedWorkspace: {
      retention: "ephemeral — isolate lifetime only at wave zero; records created anonymously are not durable and are disclosed as such on every write",
      tenure: "anon (#17 ladder rung 0)",
    },
    fixtureLaw: "952 demo prefix + EX9 handler ids on every synthetic identifier; Example-name companies/people; example.com emails only; synthetic records never reference real ECHO parties; secret-scanned",
  },

  /** One meter per operation (seams only at wave zero — spec §7.4). */
  meters: [
    "listManifests",
    "getManifest",
    "createManifest",
    "listFacilities",
    "getFacility",
    "listWorkOrders",
    "createWorkOrder",
    "completeWorkOrder",
    "listScaleTickets",
    "listWasteProfiles",
  ].map((operation) => ({ operation, event: "metering" })),
});

/** The corpora, exported for the worker + manifest. */
export const seed = Object.freeze({ manifests, workOrders, scaleTickets, wasteProfiles, facilities });
