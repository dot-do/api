/**
 * product.js — Stratum A: the G3 APIProduct instance for substrate
 * `engineering-architecture` (template spec §1). Brand, ICP, motion, offer,
 * price and positioning are NOT here — they live in the G4 projection
 * config (./projection.js). One substrate, many non-exclusive projections.
 *
 * Register-row facts this instance is built from (2026-08-23 register):
 *   - data ply: drawing / spec / submittal record. No settled interchange
 *     standard is cited in estate docs for this cell — schema.org generics
 *     per cascade rule 2. (BIM/IFC is background knowledge only, [UNVERIFIED]
 *     in the estate record, and is deliberately NOT cited as an anchor.)
 *   - headless ply: CAD/PLM (254-occupation System) with project-management
 *     adjacency; the door served here is the project/submittal
 *     system-of-record slice.
 *   - boundary kept: the draw / lien-waiver paperwork family belongs to
 *     Construction (NAICS 23), not this cell (NAICS 5413) — nothing of it
 *     is served or declared here.
 *   - licensure floor: PE-stamped artifacts are RESERVED — the licensed
 *     professional signs under their own credential (mirrors the legal
 *     reserved-acts structure). This face serves records and assembly,
 *     never stamps; the `stamped` scope answers BLOCKED by construction.
 *
 * NAME COLLISION, recorded (no projection-primacy ruling found in the
 * register): ~/projects/ax/packages/api.engineering is an ADR-0020
 * directory data home on the SINGULAR twin (api.engineering — the same-x
 * pair's other face, #3 rule 1: inbound demand rail vs outbound subject
 * layer). This build claims ONLY the row key face apis.engineering and
 * does not serve, redirect, or speak for api.engineering.
 */

export const product = {
  substrate: 'engineering-architecture',

  /** Canonical Nouns. Every verb listed is served today; nothing aspirational.
   *  All record bindings are `generated` in wave zero: the row names no
   *  reachable ingest corpus (source-route depth has not been derived for
   *  this cell), so the §5.2 labeled synthetic sandbox seed is the honest
   *  data class. Native bindings are the project system-of-record door. */
  nouns: [
    {
      name: 'Drawing',
      schema: 'https://schema.org.ai/Drawing',
      binding: 'generated', // §5.2 labeled synthetic seed — no ingest corpus named for this row
      verbs: ['list', 'get'],
    },
    {
      name: 'Specification',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'Submittal',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'Project',
      schema: 'https://schema.org.ai/Project',
      binding: 'native', // system-of-record door — the headless ply
      verbs: ['create', 'get'],
    },
    {
      name: 'ProjectSubmittal',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'native',
      verbs: ['assemble', 'list'],
    },
  ],

  /** The row's System set actually instantiated here (52-System catalog).
   *  The row also lists CAD authoring itself and full PLM change management;
   *  those are not served by this build and so are not declared
   *  (presence-when-true). */
  systems: [{ system: 'CAD/PLM', coordinates: ['engineering-architecture-firms', 'submittal-assembly'] }],

  /** Transports emitted from this one definition. */
  transports: ['REST', 'MCP'],

  /** Canonical operationIds (axp-ext/rates-g2 §1) — the only things a rate
   *  card may price. Every route carries its operationId natively
   *  (routes[].operationId passthrough; the branching collection is
   *  site-named searchDrawings) and MCP tool names are the same
   *  identifiers — one operation, one name, every face. */
  operations: [
    'searchDrawings',
    'getPricing',
    'getFamilyRegistry',
    'getOffer',
    'getDrawing',
    'listSpecifications',
    'listSubmittals',
    'getICP',
    'getVerify',
    'getVerifySuite',
    'createProject',
    'getProject',
    'listProjectSubmittals',
    'assembleSubmittal',
  ],

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seed: './seed.js',
    floor: 'keyless GET /drawings — the universal anon floor (rung 0)',
    projects: 'auto-minted via POST /projects, no key, no account',
    retention:
      'ephemeral in wave zero: projects are in-memory per isolate and may reset at any time; disclosed on every mint',
  },

  /** The published suite (the /verify export). interfaces.testSuite is NOT
   *  declared on the card: declaring arms check-published-test-suite, which
   *  the deployed verifier (autonomous-qa 0.3.0) does not implement — a
   *  declaration today fails closed (api.lawyer precedent). */
  suite: { url: '/verify/suite.json', declaredOnCard: false },

  /** Per-operation usage meters — seams only (§7.4); tags per §6.4. */
  meters: [
    { operation: 'searchDrawings', event: 'meter' },
    { operation: 'getPricing', event: 'meter' },
    { operation: 'getFamilyRegistry', event: 'meter' },
    { operation: 'getOffer', event: 'meter' },
  ],
}
