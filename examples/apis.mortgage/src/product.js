/**
 * product.js — Stratum A: the G3 APIProduct instance for substrate
 * `mortgage` (template spec §1, register row `mortgage` / NAICS 522292).
 * Brand, ICP, motion, offer, price and positioning are NOT here — they live
 * in the G4 projection config (./projection.js). One substrate, many
 * non-exclusive projections.
 *
 * ROW BOUNDARIES (encoded, not prose): the row's verdict is data/document
 * door only — THE LOAN FILE (MISMO-typed) + the HMDA-enriched market record.
 * Lending breadth is burned (estate research doctrine: virtual dealer ≠
 * tier-1 lenders — never re-tread); the closing/settlement money layer is
 * excluded (licensure + platform.do A1 dependency). MISMO is the settled
 * interchange standard for the loan file; HMDA is the ruled public-
 * licensable ingest (SC §4 #6).
 *
 * SHARED-FACE COLLISION (recorded, no primacy ruling found in the register):
 * ~/projects/ax/packages/api.mortgage is an ADR-0020 directory data home on
 * the SINGULAR twin (api.mortgage — a name the register records as not
 * held). This build lives under the row key `mortgage` as apis.mortgage and
 * never claims api.mortgage.
 *
 * @typedef {Object} NounDef
 * @property {string} name        PascalCase Noun
 * @property {string} schema      $type → schema.org.ai
 * @property {'ingested'|'generated'|'native'|'federated'} binding
 * @property {string[]} verbs     camelCase verbs actually served (presence-when-true)
 */

export const product = {
  substrate: 'mortgage',

  /** Canonical Nouns. Every verb listed is served today; nothing aspirational. */
  nouns: [
    {
      name: 'LoanFile',
      schema: 'https://schema.org.ai/LoanOrCredit',
      binding: 'generated', // §5.2 labeled synthetic sandbox seed — consented-file parsing is not wired in wave zero
      verbs: ['list', 'get'],
    },
    {
      name: 'LenderMarketRecord',
      schema: 'https://schema.org.ai/Dataset',
      binding: 'ingested', // REAL: FFIEC HMDA Data Browser aggregations, fetched live in-session (Class A public-licensable ingest — the row's ruled route)
      verbs: ['list'],
    },
    {
      name: 'Pipeline',
      schema: 'https://schema.org.ai/Service',
      binding: 'native', // the LOS system-of-record door — the headless ply
      verbs: ['create', 'get'],
    },
    {
      name: 'PipelineLoanFile',
      schema: 'https://schema.org.ai/LoanOrCredit',
      binding: 'native', // same Noun shape as LoanFile, CRUD'd through the LOS door
      verbs: ['create', 'list'],
    },
  ],

  /** The row's System set (52-System catalog): LOS — the SC tree's named
   *  system-of-record for NAICS 522292. The closing/settlement money layer
   *  is excluded by the row and so not declared (presence-when-true). */
  systems: [{ system: 'LOS', coordinates: ['independent-mortgage-banks', 'loan-pipeline'] }],

  /** Transports emitted from this one definition. */
  transports: ['REST', 'MCP'],

  /** Canonical operationIds (axp-ext/rates-g2 §1) — the only things a rate
   *  card may price. One camelCase identifier per operation across all five
   *  surfaces: route, OpenAPI contract, MCP tool name, suite ref, SDK
   *  functionName. Collections carry real verbs (searchLoanFiles, never
   *  listCollection). */
  operations: [
    'searchLoanFiles',
    'getLoanFile',
    'listLenderMarketRecords',
    'getPricing',
    'getFamilyRegistry',
    'getOffer',
    'getICP',
    'getVerify',
    'getVerifySuite',
    'createPipeline',
    'getPipeline',
    'listPipelineLoanFiles',
    'addLoanFile',
  ],

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seed: './seed.js',
    floor: 'keyless GET /loan-files — the universal anon floor (rung 0)',
    pipelines: 'auto-minted via POST /pipelines, no key, no account',
    retention:
      'ephemeral in wave zero: pipelines are in-memory per isolate and may reset at any time; disclosed on every mint',
  },

  /** The published suite (the /verify export). interfaces.testSuite is NOT
   *  declared on the card: declaring arms check-published-test-suite, which
   *  the deployed verifier (autonomous-qa 0.3.0) does not implement — a
   *  declaration today fails closed (api.lawyer precedent). Declared only
   *  when digest-pinned and the verifier can judge it. */
  suite: { url: '/verify/suite.json', declaredOnCard: false },

  /** Per-operation usage meters — seams only (§7.4); tags per §6.4. */
  meters: [
    { operation: 'searchLoanFiles', event: 'meter' },
    { operation: 'getLoanFile', event: 'meter' },
    { operation: 'listLenderMarketRecords', event: 'meter' },
    { operation: 'getPricing', event: 'meter' },
    { operation: 'getFamilyRegistry', event: 'meter' },
    { operation: 'getOffer', event: 'meter' },
  ],
}
