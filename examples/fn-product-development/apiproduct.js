/**
 * apiproduct.js — the G3 APIProduct instance for the `fn-product-development`
 * substrate, authored in the primitives.org.ai digital-products shape
 * (template spec §1). Stratum A only: NO brand, domain, ICP, motion, offer,
 * price or positioning lives here — those are G4 projection fields
 * (projection.js), and this GAP row carries no G4 brand until a
 * product-function name is acquired (#16).
 */
import { buildManifest, ORIGIN } from "./manifest.js";
import { RETENTION_NOTICE } from "./seed.js";

/** Every operation the surface serves — camelCase verbs; the only things a rate card may price. */
export const OPERATIONS = [
  "listProducts", // the branching collection — named natively via collection.operationId (axp-ext-rates-g2 §1)
  "getProduct",
  "createProduct", // headless system-of-record door
  "listRequirements",
  "createRequirement", // headless system-of-record door
  "listReleases",
  "listRoadmapItems",
  "listBOMItems",
  "getICP",
  "getVerify",
  "getPricing",
  "getOffer",
  "getFamilyRegistry",
];

export const SUBSTRATE = "fn-product-development";

export const apiProduct = Object.freeze({
  substrate: SUBSTRATE,

  /** Canonical Nouns — each names its schema, binding direction, and verbs.
   *  Bindings are per-Noun honest at wave zero: Nouns with a mounted write
   *  door are `native` (system-of-record); read-only synthetic-seeded Nouns
   *  are `generated`. The row's target route (usage accretion from headless
   *  PM/PLM instances, consent-at-rail) upgrades these to native as doors mount. */
  nouns: [
    {
      noun: "Product",
      schema: "https://schema.org/Product", // generic fallback — no product-dev interchange standard (register cascade rule 2)
      binding: "native",
      verbs: ["listProducts", "getProduct", "createProduct"],
    },
    {
      noun: "Requirement",
      schema: "https://schema.org.ai/Requirement", // no interchange standard exists (register row, UNVERIFIED) — substrate-typed record
      binding: "native",
      verbs: ["listRequirements", "createRequirement"],
    },
    {
      noun: "Release",
      schema: "https://schema.org.ai/Release",
      binding: "generated",
      verbs: ["listReleases"],
    },
    {
      noun: "RoadmapItem",
      schema: "https://schema.org.ai/RoadmapItem",
      binding: "generated",
      verbs: ["listRoadmapItems"],
    },
    {
      noun: "Item", // BOM line for physical product dev — GS1 GTIN-carrying (demo prefix 952 in the sandbox)
      schema: "https://schema.org/Product",
      binding: "generated",
      verbs: ["listBOMItems"],
    },
  ],

  /** The row's System set from the 52-System catalog — this Function carries
   *  two of the catalog's top-four Systems (register row). */
  systems: [
    { system: "PM", coordinates: ["product-development"] }, // 308 occupations — #2 in the catalog
    { system: "PLM/CAD", coordinates: ["product-development", "physical-products"] }, // 254 occupations
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
    fixtureLaw: "GS1 demo prefix 952 with valid check digits; no real company or person names; every record example:true with a [demo] title prefix; classification codes omitted, never fabricated",
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
    // interfaces.testSuite deliberately NOT declared on the card: no suite
    // document is published at a pinned digest yet (declaring one would arm
    // check-published-test-suite against a 404 — the exact false claim the
    // check exists to catch).
  },

  /** One meter per operation — §6.4 rollup grain. Events are emitted at the
   *  seams (seams.js) tagged { substrate, projection, motion, operation, shape, pattern }. */
  meters: OPERATIONS.map((operation) => ({ operation, event: "meter" })),
});
