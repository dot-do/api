/**
 * product.js — Stratum A: the G3 APIProduct instance for substrate
 * `nonprofits-civic` (template spec §1). Brand, ICP, motion, offer, price,
 * and positioning are NOT here — they live in the G4 projection config
 * (./projection.js). One substrate, many non-exclusive projections; the
 * brand carried by this build (apis.charity) rides a weak-confidence
 * curation flag, and NOTHING in this stratum depends on that name.
 *
 * Register honesty: this is the register's least-derived cell — the row
 * marks its data ply, headless ply, and source route as inference /
 * [UNVERIFIED]. This instance therefore serves only what the §5.2 synthetic
 * sandbox can honestly carry, and records the candidate ingest route
 * (IRS 990 / EO BMF) WITHOUT performing it: no route is ruled.
 */

export const SUBSTRATE = 'nonprofits-civic'

export const product = {
  substrate: SUBSTRATE,

  /** Canonical Nouns. Every verb listed is served today; nothing aspirational.
   *  Bindings are wave-zero truth: Organization/Grant/Donation/Donor seed
   *  records are `generated` (§5.2 synthetic — the candidate `ingested`
   *  route, IRS 990/EO BMF, is unruled and NOT performed); the workspace
   *  door writes `native` Donation records (donor-CRM system of record). */
  nouns: [
    {
      name: 'Organization',
      schema: 'https://schema.org.ai/Organization',
      binding: 'generated', // candidate route: IRS 990 / EO BMF ingest — unruled, [UNVERIFIED as applied], not performed
      verbs: ['list', 'get'],
    },
    {
      name: 'Donor',
      schema: 'https://schema.org.ai/Person',
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'Donation',
      schema: 'https://schema.org.ai/DonateAction', // schema.org generic fallback — the row records no industry interchange standard (cascade rule 2)
      binding: 'native', // recorded through the workspace donor-CRM door; sandbox corpus is generated
      verbs: ['list', 'record'],
    },
    {
      name: 'Grant',
      schema: 'https://schema.org.ai/Grant',
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'Workspace',
      schema: 'https://schema.org.ai/Service',
      binding: 'native', // the headless-ply system-of-record door (§3.2)
      verbs: ['create', 'get'],
    },
  ],

  /** The row's System set (52-System catalog): donor CRM / grant management
   *  = the CRM System at the nonprofit coordinate. The row also suggests a
   *  fund-accounting Accounting-System lens; no accounting door is served by
   *  this build, so none is declared (presence-when-true). */
  systems: [{ system: 'CRM', coordinates: ['nonprofits-donor-management', 'grant-management'] }],

  /** Transports emitted from this one definition. */
  transports: ['REST', 'MCP'],

  /** OpenAPI operationIds — the only things a rate card may price. Every
   *  route in the served contract carries one (ruled extension placement;
   *  bridged in ./bridge.js until the upstream re-vendor lands). */
  operations: [
    'listCollection',
    'getPricing',
    'getFamilyRegistry',
    'getOffer',
    'getOrganization',
    'listDonors',
    'listDonations',
    'listGrants',
    'getICP',
    'getVerify',
    'getVerifySuite',
    'createWorkspace',
    'getWorkspace',
    'listWorkspaceDonations',
    'recordDonation',
  ],

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seed: './seed.js',
    floor: 'keyless GET /organizations — the universal anon floor (rung 0)',
    workspaces: 'auto-minted via POST /workspaces, no key, no account',
    retention:
      'ephemeral in wave zero: workspaces are in-memory per isolate and may reset at any time; disclosed on every mint',
  },

  /** The published suite (the /verify export). interfaces.testSuite is NOT
   *  declared on the card: it stays undeclared until the suite document is
   *  digest-pinned (batch-2 ruling; declaring arms the strict
   *  check-published-test-suite — the api.lawyer precedent). */
  suite: { url: '/verify/suite.json', declaredOnCard: false },

  /** Per-operation usage meters — seams only (§7.4); tags per §6.4. */
  meters: [
    'listCollection',
    'getPricing',
    'getFamilyRegistry',
    'getOffer',
    'getOrganization',
    'listDonors',
    'listDonations',
    'listGrants',
    'createWorkspace',
    'getWorkspace',
    'listWorkspaceDonations',
    'recordDonation',
  ].map((operation) => ({ operation, event: 'meter' })),
}
