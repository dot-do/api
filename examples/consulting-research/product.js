/**
 * product.js — the Stratum-A G3 `APIProduct` instance for the
 * `consulting-research` substrate (template spec §1), instantiated from the
 * register row "Consulting & Scientific Services (NAICS 5416-5417)".
 *
 * This is a GAP row: no G4 name is held for this category, so per spec §0 the
 * substrate + sandbox are built G3-first under a placeholder org.ai address
 * and the G4 brand config attaches when a name is ruled. Nothing in this
 * directory implies acquisition of any name.
 *
 * NOT in this stratum (spec §1): brand, ICP, motion, offer, price,
 * positioning — those live in projection.json (Stratum B).
 */

export const product = {
  substrate: "consulting-research",

  // Canonical Nouns — each: schema typing ($type → schema.org.ai), binding
  // direction, served verbs. No settled industry interchange standard exists
  // for 5416-5417 (register row, cascade rule 2) → schema.org generic typing.
  nouns: [
    { name: "Engagement", $type: "https://schema.org.ai/Engagement", binding: "native", verbs: ["list", "get", "create"] },
    { name: "StatementOfWork", $type: "https://schema.org.ai/StatementOfWork", binding: "native", verbs: ["list", "get"] },
    { name: "Milestone", $type: "https://schema.org.ai/Milestone", binding: "native", verbs: ["list"] },
    { name: "Deliverable", $type: "https://schema.org.ai/Deliverable", binding: "native", verbs: ["list", "get", "order"] },
    // The deeper grain the register's lenses converge on: task decomposition.
    // Typing anchors are the G1 spine (O*NET task grain, APQC process grain);
    // wave-zero records are synthetic (source route unruled — see seed.json).
    { name: "Task", $type: "https://schema.org.ai/Task", binding: "generated", verbs: ["list"] },
    { name: "Process", $type: "https://schema.org.ai/Process", binding: "generated", verbs: ["list"] },
  ],

  // The row's System set from the 52-System catalog: PSA/engagement
  // management = the PM System pointed at professional-services firms, plus
  // CRM for pipeline (register row headless ply).
  systems: [
    { system: "ProjectManagement", coordinates: ["professional-services-firms"] },
    { system: "CRM", coordinates: ["consulting-pipeline"] },
  ],

  // Presence-when-true: only the transports actually mounted by this worker.
  transports: ["REST", "MCP"],

  // Canonical operation identifiers (A.8.7.1 grammar): the vendored generator
  // emits explicit operationIds for its own quartet operations and the
  // `openapi:<METHOD> <path>` canonical form for declared site routes. These
  // are the only things the rate card may price.
  operations: [
    "openapi:listCollection", //          GET /engagements (the branching collection)
    "openapi:GET /engagements/{id}",
    "openapi:POST /engagements", //       headless system-of-record door (native binding)
    "openapi:GET /sows",
    "openapi:GET /sows/{id}",
    "openapi:GET /milestones",
    "openapi:GET /deliverables",
    "openapi:GET /deliverables/{id}",
    "openapi:POST /deliverables/{id}/order", // outcome verb — 402 OFFER stub at wave zero
    "openapi:GET /tasks",
    "openapi:GET /processes",
    "openapi:getPricing",
    "openapi:getOffer",
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
