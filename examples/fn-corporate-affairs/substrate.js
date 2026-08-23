/**
 * substrate.js — the G3 APIProduct instance for register row
 * `fn-corporate-affairs` (Function: Corporate Affairs — one of the 13
 * horizontal Function families).
 *
 * Instantiated per the property-template spec (studio
 * docs/plans/2026-08-23-property-template-spec.md §1) from the full-economy
 * register row. This row is a GAP row — one of the two Function rows (with
 * Strategy) holding literally ZERO estate names — so per spec §0 the G3
 * substrate is built under a PLACEHOLDER org.ai address and NO G4 brand
 * config exists. The placeholder is not a brand and carries no positioning
 * claim.
 *
 * G1 anchors (from the row, verbatim flags kept):
 *   - APQC PCF "Manage External Relationships" [UNVERIFIED numeric category
 *     code] — investor relations, government/regulatory relations, public
 *     relations, community affairs, board/governance support
 *   - One of the 13 Function families [ONT]
 *
 * DECOMPOSITION RULING APPLIED (the row's own note + the batch instruction):
 * the row warns that its record grain may decompose into records other
 * properties already own. Checked before minting, and honored here:
 *
 *   - Board/governance artifacts (minutes, resolutions, consents): NOT minted
 *     here. That slice belongs to the entity back-office convergent
 *     (holdings-corporate-mgmt substrate / api.holdings register row). This
 *     substrate holds no GovernanceArtifact Noun by design.
 *   - Public filings (lobbying disclosures, proxy/IR corpora): NOT owned
 *     here. That corpus belongs to the public-record read-layer convergent.
 *     This substrate carries a `Disclosure` Noun bound `federated` — a
 *     corporate-affairs VIEW of records the read layer owns — never a second
 *     system of record. Source route is register inference only [UNVERIFIED];
 *     at wave zero the federated view is served from labeled synthetic seed.
 *   - What remains distinctly corporate-affairs is the STAKEHOLDER grain:
 *     the relationship register (investors, regulators, media, community)
 *     and the engagement log against it — the stakeholder/IR-CRM slice no
 *     other row owns. Those are the native Nouns.
 *
 * Record-schema note (cascade rule 2): no interchange standard is named by
 * the row for stakeholder/engagement records and schema.org has no
 * corporate-affairs nouns — these are schema.org.ai generic typed records.
 */

export const substrate = {
  substrate: 'fn-corporate-affairs',

  nouns: [
    {
      noun: 'Stakeholder',
      schema: { $type: 'https://schema.org.ai/Stakeholder' },
      binding: 'native', // system-of-record door: the stakeholder/IR-CRM system (headless ply)
      verbs: ['list', 'get', 'create'],
    },
    {
      noun: 'Engagement',
      schema: { $type: 'https://schema.org.ai/Engagement' },
      binding: 'native', // the engagement log on the same CRM — log is the headless verb
      verbs: ['list', 'get', 'log'],
    },
    {
      noun: 'Mention',
      schema: { $type: 'https://schema.org.ai/Mention' },
      // Press/mention records: the row's source route (press indices) is a
      // register inference only [UNVERIFIED] and not reachable in-session, so
      // wave-zero Mentions are generated synthetic sandbox seed (template
      // §5.2), clearly labeled.
      binding: 'generated',
      verbs: ['list', 'get'],
    },
    {
      noun: 'Disclosure',
      schema: { $type: 'https://schema.org.ai/Disclosure' },
      // Federated by decomposition ruling (header note): the public-record
      // read-layer convergent owns the filing corpus; this substrate serves a
      // corporate-affairs view of it. Wave zero: labeled synthetic stand-ins;
      // the federation itself is unwired (route [UNVERIFIED]).
      binding: 'federated',
      verbs: ['list', 'get'],
    },
  ],

  systems: [
    {
      system: 'StakeholderRelations',
      coordinates: ['Function=CorporateAffairs', 'Department=Communications/IR/GovRelations'],
      // Row flag kept verbatim: [UNVERIFIED] no system-of-record is named for
      // this function in the 52-System catalog excerpts; candidates by analogy
      // (stakeholder/IR CRM, board-management system, PR/monitoring platform)
      // are background knowledge only. Declared here as the row's
      // candidate-by-analogy headless-ply system, not as a catalog citation.
      // The board-management candidate is deliberately NOT taken — that slice
      // decomposed to holdings-corporate-mgmt (header note).
    },
  ],

  transports: ['REST', 'MCP'], // live-only: the two transports this worker actually serves

  /**
   * Operations — live-only (presence-when-true). `listStakeholders` is served
   * by the vendored generator's branching collection whose OpenAPI operationId
   * is `listCollection`; the alias is recorded so meters and rate rows can key
   * on either name without a ghost operation appearing anywhere.
   */
  operations: [
    { operation: 'listStakeholders', method: 'GET', path: '/stakeholders', openapiOperationId: 'listCollection' },
    { operation: 'getStakeholder', method: 'GET', path: '/stakeholders/{stakeholderId}' },
    { operation: 'createStakeholder', method: 'POST', path: '/stakeholders' },
    { operation: 'listEngagements', method: 'GET', path: '/engagements' },
    { operation: 'getEngagement', method: 'GET', path: '/engagements/{engagementId}' },
    { operation: 'logEngagement', method: 'POST', path: '/engagements' },
    { operation: 'listMentions', method: 'GET', path: '/mentions' },
    { operation: 'getMention', method: 'GET', path: '/mentions/{mentionId}' },
    { operation: 'listDisclosures', method: 'GET', path: '/disclosures' },
    { operation: 'getDisclosure', method: 'GET', path: '/disclosures/{disclosureId}' },
  ],

  sandbox: {
    // Template §5.2: the anon sandbox is the universal floor. Seed is
    // mechanically produced synthetic data (see ./seed.js), labeled on every
    // record; the row's source route (public filings/press indices) is a
    // register inference only [UNVERIFIED] — not class A, not reachable
    // in-session — so the §5.2 labeled synthetic path applies by rule.
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
    // posture as the api.lawyer reference implementation. It stays undeclared
    // until digest-pinned (batch-2 rollup rule).
    verifyPath: '/verify',
    documentPath: '/verify/suite.json',
  },

  meters: [
    // One meter per operation; every event carries the template §6.4 tags.
    ...[
      'listStakeholders',
      'getStakeholder',
      'createStakeholder',
      'listEngagements',
      'getEngagement',
      'logEngagement',
      'listMentions',
      'getMention',
      'listDisclosures',
      'getDisclosure',
    ].map((operation) => ({ operation, event: 'meter' })),
  ],
}

/** Template §6.4 tag set stamped on every seam event this worker emits. */
export const seamTags = {
  substrate: 'fn-corporate-affairs',
  projection: 'fn-corporate-affairs-placeholder', // GAP row: placeholder projection, not a brand
  motion: 'B2A',
  pattern: '402-metered',
}
