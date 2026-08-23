/**
 * product.js — Stratum A: the G3 APIProduct instance for substrate
 * `software-it-services` (template spec §1). Brand, ICP, motion, offer,
 * price and positioning are NOT here — they live in the G4 projection
 * config (./projection.js). One substrate, many non-exclusive projections.
 *
 * The normative APIProduct shape lands in primitives.org.ai
 * `digital-products`; this instance is authored to that shape.
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
  substrate: 'software-it-services',

  /** Canonical Nouns. Every verb listed is served today; nothing aspirational. */
  nouns: [
    {
      name: 'API',
      schema: 'https://schema.org.ai/WebAPI',
      binding: 'federated', // derived from sibling origins' own published machine faces
      verbs: ['list', 'get'],
    },
    {
      name: 'Action',
      schema: 'https://schema.org.ai/Action',
      binding: 'generated', // §5.2 sandbox sample until the first-party catalog is wired
      verbs: ['list'],
    },
    {
      name: 'VerificationReport',
      schema: 'https://schema.org.ai/Report',
      binding: 'federated', // probe observations recorded as data
      verbs: ['list'],
    },
    {
      name: 'Workspace',
      schema: 'https://schema.org.ai/Service',
      binding: 'native', // system-of-record door — the headless ply
      verbs: ['create', 'get'],
    },
    {
      name: 'WorkspaceAPI',
      schema: 'https://schema.org.ai/WebAPI',
      binding: 'native',
      verbs: ['create', 'list'],
    },
  ],

  /** The row's System set actually instantiated here (52-System catalog).
   *  The row also lists PM, issue/work tracking and ITSM/helpdesk; those are
   *  not served by this build and so are not declared (presence-when-true). */
  systems: [{ system: 'APIManagement', coordinates: ['software-publishers', 'developer-portal'] }],

  /** Transports emitted from this one definition. */
  transports: ['REST', 'MCP'],

  /** OpenAPI operationIds — the only things a rate card may price.
   *  These are the ids the vendored generator emits; site routes beyond the
   *  quartet are documented paths without operationIds at this pin. */
  operations: ['listCollection', 'getPricing', 'getFamilyRegistry', 'getOffer'],

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seed: './seed.js',
    floor: 'keyless GET /apis — the universal anon floor (rung 0)',
    workspaces: 'auto-minted via POST /workspaces, no key, no account',
    retention:
      'ephemeral in wave zero: workspaces are in-memory per isolate and may reset at any time; disclosed on every mint',
  },

  /** The published suite (the /verify export). interfaces.testSuite is NOT
   *  declared on the card: declaring arms check-published-test-suite, which
   *  the deployed verifier (autonomous-qa 0.3.0) does not implement — a
   *  declaration today fails closed (api.lawyer precedent). */
  suite: { url: '/verify/suite.json', declaredOnCard: false },

  /** Per-operation usage meters — seams only (§7.4); tags per §6.4. */
  meters: [
    { operation: 'listCollection', event: 'meter' },
    { operation: 'getPricing', event: 'meter' },
    { operation: 'getFamilyRegistry', event: 'meter' },
    { operation: 'getOffer', event: 'meter' },
  ],
}
