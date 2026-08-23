/**
 * substrate.js — the G3 APIProduct instance for register row
 * `fn-risk-compliance` (Function: Risk & Compliance — one of the 13
 * horizontal Function families).
 *
 * Instantiated per the property-template spec (studio
 * docs/plans/2026-08-23-property-template-spec.md §1) from the full-economy
 * register row, AT THE FAMILY GRAIN: the row is structurally the inverse of
 * every other row — held at the narrowest grain (28 per-statute .dev fronts,
 * enumerated by the 2026-08-23 property-surface register) with a GAP at the
 * property grain (no api-grammar umbrella name; compliance.do is
 * convention-barred — .do = primitives, never startup brands). Per the
 * register's own words the family is "batch-provisionable as a family (one
 * pipeline, ~20 fronts)": ONE substrate, one check-runner shape, one
 * register of check definitions; each held .dev front attaches later as a
 * projection config change, not a rebuild. The umbrella name rides the #16
 * lane; no phantom umbrella is named anywhere here.
 *
 * G1 anchors (from the row, verbatim flags kept):
 *   - APQC PCF "Manage Enterprise Risk, Compliance, Remediation and
 *     Resiliency" [UNVERIFIED numeric category code]
 *   - G1 here is the statutes themselves — Davis-Bacon, FIFRA, NESHAP,
 *     FFL/ATF rules, X12 834 (edi834) — each .dev name binds one regulation
 *     (the DC lens's regulation-decomposition grammar)
 */

export const substrate = {
  substrate: 'fn-risk-compliance',

  nouns: [
    {
      noun: 'Statute',
      schema: { $type: 'https://schema.org.ai/Statute' },
      // The register spine: public-law citations authored from the statutes
      // the row recites. Provenance is honest on every record: citation-grade
      // public-law facts only; the live registry-fetch pipeline (the row's
      // cheapest ruled source route) has NOT run at wave zero and no
      // registry-derived value appears anywhere.
      binding: 'ingested',
      verbs: ['list', 'get'],
    },
    {
      noun: 'CheckDefinition',
      schema: { $type: 'https://schema.org.ai/CheckDefinition' },
      // The family register itself: one row per held per-statute .dev front
      // (28 enumerated by the surface register). Estate-register facts,
      // class A — the surface register is the source and is cited per row.
      // Front→statute bindings exist ONLY for the five statutes the register
      // row recites; every other binding is left null with the row's own
      // [UNVERIFIED] flag — binding is a curation act, not a build act.
      binding: 'native',
      verbs: ['list', 'get'],
    },
    {
      noun: 'CheckRun',
      schema: { $type: 'https://schema.org.ai/CheckRun' },
      // The check-runner door (headless ply). Wave zero: runs execute the
      // real handler over LABELED SYNTHETIC subjects/results (§5.2) — no
      // live registry is consulted and no result pretends otherwise.
      // Attested-check output is TYPED to ride the api.qa verification rail
      // (VerificationReport abstraction, H4 — LIVE; a consumption edge):
      // every run carries `attested: false` at wave zero and no verdict URL
      // is fabricated.
      binding: 'native',
      verbs: ['run', 'list', 'get'],
    },
    {
      noun: 'Obligation',
      schema: { $type: 'https://schema.org.ai/Obligation' },
      // The compliance-calendar data ply (EO #29 — V(data) [H]): which
      // obligations bind which CompanyType on which dates. Wave zero:
      // generated synthetic records for a fictional tenant, clearly labeled.
      binding: 'generated',
      verbs: ['list', 'get'],
    },
  ],

  systems: [
    {
      system: 'ComplianceManagement',
      coordinates: ['Function=Risk&Compliance', 'Department=Compliance'],
      // Row flag kept verbatim: GRC/compliance-management system of record
      // [UNVERIFIED — not a named row in the 52-System catalog excerpts read;
      // the catalog's derivation method would compute it, but that
      // computation is not on record for this function]. The per-check
      // family needs only the shared check-runner + register pattern, which
      // the api.qa/VerificationReport abstraction (H4, LIVE) already types.
    },
  ],

  transports: ['REST', 'MCP'], // live-only: the two transports this worker actually serves

  /**
   * Operations — live-only (presence-when-true), camelCase verbs, one
   * canonical operationId across all five surfaces (OpenAPI operationId =
   * MCP tool name = rate-card key = suite reference = meter tag).
   */
  operations: [
    { operation: 'listStatutes', method: 'GET', path: '/statutes' },
    { operation: 'getStatute', method: 'GET', path: '/statutes/{statuteId}' },
    { operation: 'listChecks', method: 'GET', path: '/checks' }, // the branching collection
    { operation: 'getCheck', method: 'GET', path: '/checks/{checkId}' },
    { operation: 'runCheck', method: 'POST', path: '/checks/{checkId}/runs' },
    { operation: 'listCheckRuns', method: 'GET', path: '/check-runs' },
    { operation: 'getCheckRun', method: 'GET', path: '/check-runs/{runId}' },
    { operation: 'listObligations', method: 'GET', path: '/obligations' },
    { operation: 'getObligation', method: 'GET', path: '/obligations/{obligationId}' },
  ],

  sandbox: {
    // Template §5.2: the anon sandbox is the universal floor. Statute and
    // check-definition records are honest register/public-law facts; every
    // run result and every calendar entry is mechanically produced synthetic
    // data, labeled on the record (see ./seed.js). The row's class-A source
    // route (public registries + statutory texts, batch pipeline) is not run
    // in-session at wave zero and its absence is disclosed, never papered over.
    seedModule: './seed.js',
    autoMint: {
      workspace: 'anon',
      retention: 'ephemeral — per-isolate memory only; no durability at wave zero; state resets whenever the isolate recycles',
    },
  },

  suite: {
    // Published at /verify + /verify/suite.json (links.verify on the card).
    // interfaces.testSuite is deliberately NOT declared on the card:
    // declaring it arms check-capability-coverage, which the deployed
    // verifier (autonomous-qa 0.3.0) does not implement — the api.lawyer
    // reference posture.
    verifyPath: '/verify',
    documentPath: '/verify/suite.json',
  },

  meters: [
    ...['listStatutes', 'getStatute', 'listChecks', 'getCheck', 'runCheck', 'listCheckRuns', 'getCheckRun', 'listObligations', 'getObligation'].map(
      (operation) => ({ operation, event: 'meter' }),
    ),
  ],
}

/** Template §6.4 tag set stamped on every seam event this worker emits. */
export const seamTags = {
  substrate: 'fn-risk-compliance',
  projection: 'fn-risk-compliance-family', // family-grain placeholder projection, not a brand
  motion: 'B2A',
  pattern: '402-metered',
}
