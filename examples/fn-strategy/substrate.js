/**
 * substrate.js — the G3 APIProduct instance for register row `fn-strategy`
 * (Function: Strategy — one of the 13 horizontal Function families).
 *
 * Instantiated per the property-template spec (studio
 * docs/plans/2026-08-23-property-template-spec.md §1) from the full-economy
 * register row. This row is a GAP row: no api-grammar name is held, so per
 * spec §0 the G3 substrate is built under a PLACEHOLDER org.ai address and
 * NO G4 brand config exists. The placeholder is not a brand and carries no
 * positioning claim.
 *
 * G1 anchors (from the row, verbatim flags kept):
 *   - APQC PCF category 1.0 "Develop Vision and Strategy" [UNVERIFIED code]
 *   - One of the 13 Function families [ONT]
 *   - O*NET 11-1011 / 13-1111-adjacent strategy occupations [UNVERIFIED codes]
 *
 * Record-schema note (cascade rule 2): no interchange standard exists for
 * strategy records and schema.org has no strategy noun — these are
 * schema.org.ai generic typed records, greenfield territory per the row.
 */

export const substrate = {
  substrate: 'fn-strategy',

  nouns: [
    {
      noun: 'Plan',
      schema: { $type: 'https://schema.org.ai/Plan' },
      binding: 'native', // system-of-record door: the strategic-planning/OKR system (headless ply)
      verbs: ['list', 'get'],
    },
    {
      noun: 'Objective',
      schema: { $type: 'https://schema.org.ai/Objective' },
      binding: 'native',
      verbs: ['list', 'get', 'create'],
    },
    {
      noun: 'KeyResult',
      schema: { $type: 'https://schema.org.ai/KeyResult' },
      binding: 'native', // nested under Objective; progress is the headless verb
      verbs: ['progress'],
    },
    {
      noun: 'Analysis',
      schema: { $type: 'https://schema.org.ai/Analysis' },
      // The row's load-bearing datasets (ontology API, firmographic world-state,
      // public-record read layer) are platform-side G3 modules per the
      // no-third-root ruling — NOT reachable from this substrate in-session,
      // so wave-zero Analysis records are generated synthetic sandbox seed
      // (template §5.2), clearly labeled.
      binding: 'generated',
      verbs: ['list', 'get'],
    },
  ],

  systems: [
    {
      system: 'StrategicPlanning',
      coordinates: ['Function=Strategy', 'Department=Executive'],
      // Row flag kept verbatim: [UNVERIFIED whether strategic-planning/OKR or
      // corporate performance management appears in the O*NET-derived
      // ~52-System catalog — needs the catalog read-off]. Declared here as the
      // row's named headless-ply system, not as a catalog citation.
    },
  ],

  transports: ['REST', 'MCP'], // live-only: the two transports this worker actually serves

  /**
   * Operations — live-only (presence-when-true). `listObjectives` is served by
   * the vendored generator's branching collection whose OpenAPI operationId is
   * `listCollection`; the alias is recorded so meters and rate rows can key on
   * either name without a ghost operation appearing anywhere.
   */
  operations: [
    { operation: 'listPlans', method: 'GET', path: '/plans' },
    { operation: 'getPlan', method: 'GET', path: '/plans/{planId}' },
    { operation: 'listObjectives', method: 'GET', path: '/objectives', openapiOperationId: 'listCollection' },
    { operation: 'getObjective', method: 'GET', path: '/objectives/{objectiveId}' },
    { operation: 'createObjective', method: 'POST', path: '/objectives' },
    { operation: 'recordKeyResultProgress', method: 'POST', path: '/key-results/{keyResultId}/progress' },
    { operation: 'listAnalyses', method: 'GET', path: '/analyses' },
    { operation: 'getAnalysis', method: 'GET', path: '/analyses/{analysisId}' },
  ],

  sandbox: {
    // Template §5.2: the anon sandbox is the universal floor. Seed is
    // mechanically produced synthetic data (see ./seed.js), labeled on every
    // record; the row's class-A source route (owned corpus via the estate
    // atlas) is platform-side and not reachable in-session at wave zero.
    seedModule: './seed.js',
    autoMint: {
      // #17 anon-tenure rules as wave zero honestly serves them: mutations
      // land in per-isolate memory only. Nothing pretends to be durable.
      workspace: 'anon',
      retention: 'ephemeral — per-isolate memory only; no durability at wave zero; state resets whenever the isolate recycles',
    },
  },

  suite: {
    // Published at /verify + /verify/suite.json (links.verify on the card).
    // interfaces.testSuite is deliberately NOT declared on the card: declaring
    // it arms check-capability-coverage, which the deployed verifier
    // (autonomous-qa 0.3.0) does not implement — the same landing-order
    // posture as the api.lawyer reference implementation.
    verifyPath: '/verify',
    documentPath: '/verify/suite.json',
  },

  meters: [
    // One meter per operation; every event carries the template §6.4 tags.
    ...['listPlans', 'getPlan', 'listObjectives', 'getObjective', 'createObjective', 'recordKeyResultProgress', 'listAnalyses', 'getAnalysis'].map(
      (operation) => ({ operation, event: 'meter' }),
    ),
  ],
}

/** Template §6.4 tag set stamped on every seam event this worker emits. */
export const seamTags = {
  substrate: 'fn-strategy',
  projection: 'fn-strategy-placeholder', // GAP row: placeholder projection, not a brand
  motion: 'B2A',
  pattern: '402-metered',
}
