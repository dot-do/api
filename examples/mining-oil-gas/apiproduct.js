/**
 * apiproduct.js — the G3 APIProduct instance for the `mining-oil-gas`
 * substrate, authored in the primitives.org.ai digital-products shape
 * (template spec §1). Stratum A only: NO brand, domain, ICP, motion, offer,
 * price or positioning lives here — those are G4 projection fields
 * (projection.js), and this GAP row carries no G4 brand until an apex name
 * is acquired (#16).
 *
 * Register honesty note: the mining-oil-gas row is analysis-thin by its own
 * statement ("everything beyond the three artifact names is inference").
 * Every Noun below is derived from what the row DOES state — the artifact
 * grammars (jib.claims, minesafety.dev) and the named public feeds (state
 * well registries, MSHA, FracFocus) — and nothing else; claims are kept
 * minimal and inference is marked where the row marks it.
 */
import { buildManifest, ORIGIN } from "./manifest.js";
import { RETENTION_NOTICE } from "./seed.js";

/** Every operation the surface serves — camelCase verbs (UPPERCASE acronyms
 *  ride inside: listJIBStatements); the only things a rate card may price. */
export const OPERATIONS = [
  "listWells", // the branching collection — named natively via collection.operationId (axp-ext-rates-g2 §1)
  "getWell",
  "listOperators",
  "listViolations",
  "listDisclosures",
  "listJIBStatements",
  "getJIBStatement",
  "createJIBStatement", // headless production-accounting system-of-record door
  "getICP",
  "getVerify",
  "getPricing",
  "getOffer",
  "getFamilyRegistry",
];

export const SUBSTRATE = "mining-oil-gas";

export const apiProduct = Object.freeze({
  substrate: SUBSTRATE,

  /** Canonical Nouns — each names its schema, binding direction, and verbs.
   *  Bindings are per-Noun honest at wave zero: the registry/feed-shaped
   *  Nouns are `generated` (synthetic labeled seed — the row's ingest route
   *  is [UNVERIFIED, unrated], so no real feed is bound; the enrichment
   *  ladder hypothesis upgrades them to `ingested` when the route is probed
   *  and rated). The JIB statement carries a mounted write door and is
   *  `native` (system-of-record). */
  nouns: [
    {
      noun: "Well",
      schema: "https://schema.org.ai/Well", // no verified interchange standard on the row (PIDX [UNVERIFIED]) — substrate-typed record
      binding: "generated", // target: ingested (state well registries) once the route is probed/rated
      verbs: ["listWells", "getWell"],
    },
    {
      noun: "Operator",
      schema: "https://schema.org/Organization", // generic fallback — cascade rule 2
      binding: "generated",
      verbs: ["listOperators"],
    },
    {
      noun: "Violation", // MSHA-class mine-safety violation (minesafety.dev artifact grammar)
      schema: "https://schema.org.ai/Violation",
      binding: "generated", // target: ingested (MSHA open data) once the route is probed/rated
      verbs: ["listViolations"],
    },
    {
      noun: "Disclosure", // FracFocus-class chemical disclosure
      schema: "https://schema.org.ai/Disclosure",
      binding: "generated", // target: ingested (FracFocus) once the route is probed/rated
      verbs: ["listDisclosures"],
    },
    {
      noun: "JIBStatement", // joint-interest billing — the jib.claims document grammar; between-parties record
      schema: "https://schema.org.ai/JIBStatement",
      binding: "native", // the production-accounting/JIB system-of-record door is mounted (POST /jib-statements)
      verbs: ["listJIBStatements", "getJIBStatement", "createJIBStatement"],
    },
  ],

  /** System coordinates — the row's headless ply is inference throughout
   *  ("[UNVERIFIED — no O*NET modal-system computation on record for NAICS
   *  21]"): production accounting/JIB, land management, EAM/maintenance.
   *  Only the two systems this surface actually touches are declared; both
   *  carry the row's UNVERIFIED flag. */
  systems: [
    { system: "Accounting", coordinates: ["production-accounting", "joint-interest-billing"] }, // row: "production accounting/JIB system" [UNVERIFIED]
    { system: "EAM", coordinates: ["mining-oil-gas", "heavy-assets"] }, // row: "EAM/maintenance for heavy assets" [UNVERIFIED]; no door mounted at wave zero — listed as the row's stated set, not a served surface
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
      "synthetic 00-prefix well API numbers (00 is not a real state code); no real company, person, mine or well names; every record example:true with [demo] name prefixes; regulatory classification codes (30 CFR cites, CAS numbers) omitted, never fabricated; JIB share arithmetic internally consistent",
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
