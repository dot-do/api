/**
 * product.js — Stratum A: the G3 APIProduct instance for substrate
 * `education` (template spec §1). Brand, ICP, motion, offer, price and
 * positioning are NOT here — they live in the G4 projection config
 * (./projection.js). One substrate, many non-exclusive projections.
 *
 * The normative APIProduct shape lands in primitives.org.ai
 * `digital-products`; this instance is authored to that shape.
 *
 * Register-row facts this instance is bound by (education, NAICS 61):
 *   - posture RULED Axis-2 only (SC #20, avoid-class 5): this is a
 *     headless-kit face, not a data-thesis play — no front, no
 *     founder-decision budget, no consumer-facing surface;
 *   - data ply: Course/credential record, schema.org-typed (generic
 *     fallback — no settled industry interchange standard on record);
 *     FAFSA/financial-aid artifact records;
 *   - headless ply: LMS ("abstraction exists in catalog; no
 *     instantiation" — SC #20 verbatim); SIS/registrar is [UNVERIFIED]
 *     in the row and therefore NOT declared here (presence-when-true);
 *   - source route: IPEDS / College Scorecard are [UNVERIFIED]
 *     candidates, so the sandbox is §5.2 labeled synthetic seed
 *     (provenance note in ./seed.js).
 *
 * @typedef {Object} NounDef
 * @property {string} name        PascalCase Noun
 * @property {string} schema      $type → schema.org.ai
 * @property {'ingested'|'generated'|'native'|'federated'} binding
 * @property {string[]} verbs     camelCase verbs actually served (presence-when-true)
 *
 * @typedef {Object} SystemCoordinate
 * @property {string} system      one of the 52-System catalog
 * @property {string[]} coordinates
 */

export const product = {
  substrate: 'education',

  /** Canonical Nouns. Every verb listed is served today; nothing aspirational. */
  nouns: [
    {
      name: 'Course',
      schema: 'https://schema.org.ai/Course',
      binding: 'generated', // §5.2 labeled synthetic sandbox seed — row source route [UNVERIFIED]
      verbs: ['list', 'get'],
    },
    {
      name: 'Credential',
      schema: 'https://schema.org.ai/EducationalOccupationalCredential',
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'AidArtifact',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'generated', // FAFSA-class financial-aid artifact records (fafsa.click door grain)
      verbs: ['list'],
    },
    {
      name: 'Catalog',
      schema: 'https://schema.org.ai/DataCatalog',
      binding: 'native', // system-of-record door — the headless ply (LMS coordinate)
      verbs: ['create', 'get'],
    },
    {
      name: 'CatalogCourse',
      schema: 'https://schema.org.ai/Course',
      binding: 'native', // the SAME Course noun through the system-of-record door
      verbs: ['create', 'list'],
    },
  ],

  /** The row's System set actually instantiated here (52-System catalog).
   *  The row names LMS as the catalog abstraction; SIS/registrar is
   *  [UNVERIFIED — inferred] in the row and is not declared
   *  (presence-when-true). */
  systems: [{ system: 'LMS', coordinates: ['education-institutions'] }],

  /** Transports emitted from this one definition. */
  transports: ['REST', 'MCP'],

  /** Canonical operationIds (axp-ext/rates-g2 §1) — the only things a rate
   *  card may price. One camelCase identifier per operation on every face:
   *  route = MCP tool = suite reference = rate-card key. */
  operations: [
    'searchCourses',
    'getCourse',
    'listCredentials',
    'listAidArtifacts',
    'getPricing',
    'getFamilyRegistry',
    'getOffer',
    'getICP',
    'getVerify',
    'getVerifySuite',
    'createCatalog',
    'getCatalog',
    'listCatalogCourses',
    'registerCatalogCourse',
  ],

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seed: './seed.js',
    floor: 'keyless GET /courses — the universal anon floor (rung 0)',
    catalogs: 'auto-minted via POST /catalogs, no key, no account',
    retention:
      'ephemeral in wave zero: catalogs are in-memory per isolate and may reset at any time; disclosed on every mint',
  },

  /** The published suite (the /verify export). interfaces.testSuite is NOT
   *  declared on the card: declaring arms check-published-test-suite, which
   *  the deployed verifier does not implement — a declaration today fails
   *  closed (api.lawyer precedent). */
  suite: { url: '/verify/suite.json', declaredOnCard: false },

  /** Per-operation usage meters — seams only (§7.4); tags per §6.4. */
  meters: [
    { operation: 'searchCourses', event: 'meter' },
    { operation: 'getCourse', event: 'meter' },
    { operation: 'listCredentials', event: 'meter' },
    { operation: 'listAidArtifacts', event: 'meter' },
    { operation: 'getPricing', event: 'meter' },
    { operation: 'getFamilyRegistry', event: 'meter' },
    { operation: 'getOffer', event: 'meter' },
    { operation: 'createCatalog', event: 'meter' },
    { operation: 'getCatalog', event: 'meter' },
    { operation: 'listCatalogCourses', event: 'meter' },
    { operation: 'registerCatalogCourse', event: 'meter' },
  ],
}
