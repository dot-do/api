/**
 * product.js — Stratum A: the G3 APIProduct instance for the
 * `fn-service-delivery` substrate (property template §1), authored in the
 * primitives.org.ai digital-products shape. This module is the ONE definition
 * both plies, the MCP door, the OpenAPI contract, and the rate card derive
 * from — nothing else defines a Noun or an operation.
 *
 * Register row: docs/plans/registers/2026-08-23-full-economy-property-register.json
 * → key "fn-service-delivery" (horizontal; APQC 5.0 "Deliver Services";
 * NAPCS sellable-outcome register; O*NET task decomposition;
 * schema.org Service/Offer nouns).
 *
 * NOTE (G3/G4 separation, template §1): nothing in this file names a brand,
 * domain, ICP, motion, offer, or price. Those live in projection.js (§2).
 */

export const SUBSTRATE = "fn-service-delivery";

/**
 * Canonical Nouns. Each: schema ($type resolving under schema.org.ai),
 * binding (ingested | generated | native | federated), verbs (camelCase),
 * and the collection pathname both plies serve it at.
 *
 * Binding notes (row source route): NAPCS + O*NET are free public typed
 * vocabularies (class A), but no real NAPCS ingestion has run for this
 * surface yet — the Service corpus is GENERATED against the NAPCS-shaped
 * schema per template §5.2 and labeled example data throughout. The
 * enrichment ladder's first rung is replacing that generated corpus with the
 * ingested NAPCS register. Engagement / WorkOrder / Outcome are NATIVE:
 * the headless ply (PSA/FSM system of record) is their system of record.
 */
export const nouns = [
  {
    name: "Service",
    plural: "services",
    path: "/services",
    schema: { $type: "Service", $context: "https://schema.org.ai" },
    register: "NAPCS — the sellable-outcome grain",
    binding: "generated",
    verbs: ["listServices", "getService"],
  },
  {
    name: "Engagement",
    plural: "engagements",
    path: "/engagements",
    schema: { $type: "Engagement", $context: "https://schema.org.ai" },
    register: "schema.org Service/Offer generics (cascade rule 2 — no industry interchange standard recorded for this row)",
    binding: "native",
    verbs: ["listEngagements", "getEngagement", "createEngagement"],
  },
  {
    name: "WorkOrder",
    plural: "work-orders",
    path: "/work-orders",
    schema: { $type: "WorkOrder", $context: "https://schema.org.ai" },
    register: "O*NET task grain — the delivery decomposition (FSM work-order instance)",
    binding: "native",
    verbs: ["listWorkOrders", "getWorkOrder", "createWorkOrder"],
  },
  {
    name: "Outcome",
    plural: "outcomes",
    path: "/outcomes",
    schema: { $type: "Outcome", $context: "https://schema.org.ai" },
    register: "the completed-verified-outcome record; a completed Outcome references the VerificationReport rail (fn-it) — the verify-then-settle seam",
    binding: "native",
    verbs: ["listOutcomes", "getOutcome", "orderOutcome"],
  },
];

/**
 * The row's System set from the 52-System catalog, at this row's coordinate
 * (headless ply, template §3.2): PSA + FSM as the function's system pair.
 * The system-of-record doors are CRUD + verbs on the SAME collections above —
 * there is no second API.
 */
export const systems = [
  { system: "PSA", coordinates: ["fn-service-delivery", "professional-services"] },
  { system: "FSM", coordinates: ["fn-service-delivery", "field-services"] },
];

/**
 * Transports actually served by this worker (presence-when-true — the full
 * REST | RPC | CapnWeb | MCP | HATEOAS set arrives with the shared serving
 * lane, template §7.2; declaring unserved transports would be a ghost surface).
 */
export const transports = ["REST", "MCP"];

/**
 * Canonical operationIds — the ONLY things the rate card may price
 * (axp-ext-rates-g2 §1: the ONE cross-face operation name). The generator
 * gap this list used to be bridged around is CLOSED (axp-ext-rates-g2@0.2.0,
 * native in vendored axp-faces 0.3.0): the manifest declares each id
 * natively (collection.operationId / routes[].operationId) and the generator
 * enforces shape, uniqueness, and rates[].operation ⊆ this declared set —
 * fail-closed at defineSiteManifest. This register stays the G3 truth the
 * manifest is written against.
 */
export const operations = [
  "listCollection", // GET /services — the branching keyless collection (generator id)
  "getService", // GET /services/{id}
  "listEngagements", // GET /engagements
  "getEngagement", // GET /engagements/{id}
  "createEngagement", // POST /engagements (sandbox system-of-record door)
  "listWorkOrders", // GET /work-orders
  "getWorkOrder", // GET /work-orders/{id}
  "createWorkOrder", // POST /work-orders (sandbox system-of-record door)
  "listOutcomes", // GET /outcomes
  "getOutcome", // GET /outcomes/{id}
  "orderOutcome", // POST /outcomes/order — the outcome verb; answers 402 OFFER (payable stub, test mode)
  "getPricing", // GET /pricing (generator)
  "getFamilyRegistry", // GET /family.json (generator)
  "getOffer", // GET /offer (generator, 402 OFFER)
  "getICP", // GET /icp — the G2 coordinates document
  "getVerify", // GET /verify — the published verify export
];

/** Sandbox spec (§5.2) — the seed module IS the versioned seed spec. */
export const sandbox = {
  seedModule: "./seed.js",
  floor: "anon — rung 0 of the B2A ladder (#17): keyless, auto-minted workspace, disclosed retention",
  retention: "ephemeral, in-memory per isolate — state may reset at any time; example data only",
};

/** The published suite (§4.3): served at /verify. interfaces.testSuite stays
 *  UNDECLARED until the suite document is authored in a pinned api.qa dialect
 *  (declaring a suite the verifier cannot admit would be a machine-readable
 *  false claim — manifest.js enforces this posture). */
export const suite = {
  verifyPath: "/verify",
  declared: false,
};

/** One meter per operation (§6.4 tag set is applied at the seam — seams.js). */
export const meters = operations.map((operation) => ({ operation, event: "metering" }));

export const product = { substrate: SUBSTRATE, nouns, systems, transports, operations, sandbox, suite, meters };
