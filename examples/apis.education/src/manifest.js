/**
 * manifest.js — the ONE source of truth for apis.education's machine face:
 * every quartet artifact renders from this via the vendored axp-faces
 * generator (0.3.0; pinned apis-ax-axp@2.6.0, digest a9a1197c…, extension
 * axp-ext-rates-g2@0.2.0 — see ./axp-faces/PINS.json). The four extension
 * members (rates[], operationId, links.verify, g2) are declared natively
 * here at their ruled placements — no site-side bridging.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { courseRecords } from './seed.js'
import { projection } from './projection.js'

export const ORIGIN = 'https://apis.education'

const LLMS_BODY = `# apis.education

The functions an education institution's systems call. apis.education is
the machine face of the education substrate (NAICS 61): course and
credential records, financial-aid artifact records, and an auto-minted
catalog door on the LMS system-of-record coordinate.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER — three emptinesses never blend.

## Doors

- \`GET /courses\` — Course records (branching collection; \`?level=<educationalLevel>\`, \`?subject=<subject>\`)
- \`GET /courses/{id}\` — one Course record by id
- \`GET /credentials\` — EducationalOccupationalCredential records
- \`GET /aid-artifacts\` — financial-aid artifact records (FAFSA-class document grain)
- \`POST /catalogs\` — auto-mint an anonymous catalog workspace (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /mcp\` — MCP door (JSON-RPC 2.0): the same nouns and verbs as HTTP
- \`GET /verify\` — run our tests: the public-contract checks, runnable by anyone

## Pricing

Metered rate card with a declared hard ceiling. Settlement is a labeled
test-mode stub today: the 402 OFFER boundary is served, no charge is
collected, and the pricing document says so in its own \`statement\` member.

## Data classes

Every record in the sandbox is labeled synthetic example data
(\`"example": true\`) over fictional institutions, per estate fixture law.
The register row's ingest candidates (IPEDS-class feeds) are [UNVERIFIED],
so no real institution data is served in wave zero — the seed provenance
note in the repository records the in-session probe outcomes.`

const HOME_MD = `# apis.education

The functions an education institution's systems call.

Course and credential records, financial-aid artifact records, and an
auto-minted catalog door on the LMS system-of-record coordinate — the
machine face of the education substrate (NAICS 61).

- Machine card: /.well-known/agents.json
- Contract: /openapi.json · Pricing: /pricing · Agents: /llms.txt
- Records: /courses · /credentials · /aid-artifacts
- Sandbox: POST /catalogs · MCP: POST /mcp · Tests: /verify

Every sandbox record is labeled synthetic example data over fictional
institutions. Settlement is a labeled test-mode stub — the 402 boundary is
served, nothing is charged.`

const HOME_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>apis.education — the functions an education institution's systems call</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.25rem;color:#111;background:#fff}
  h1{font-size:1.6rem;margin:0 0 .25rem} p.tag{color:#555;margin-top:0}
  code{background:#f4f4f4;padding:.1em .35em;border-radius:4px}
  ul{padding-left:1.2rem} li{margin:.35rem 0}
  .note{font-size:.85rem;color:#666;border-top:1px solid #eee;margin-top:2rem;padding-top:1rem}
  @media (prefers-color-scheme:dark){body{background:#111;color:#eee}code{background:#222}p.tag{color:#aaa}.note{color:#999;border-color:#333}}
</style></head>
<body>
<h1>apis.education</h1>
<p class="tag">The functions an education institution&rsquo;s systems call.</p>
<p>Course and credential records, financial-aid artifact records, and an auto-minted catalog door on the LMS system-of-record coordinate &mdash; the machine face of the education substrate (NAICS 61).</p>
<ul>
  <li>Machine card: <code>GET /.well-known/agents.json</code></li>
  <li>Contract: <code>/openapi.json</code> · Pricing: <code>/pricing</code> · Agents: <code>/llms.txt</code></li>
  <li>Records: <code>/courses</code> · <code>/credentials</code> · <code>/aid-artifacts</code></li>
  <li>Sandbox: <code>POST /catalogs</code> · MCP: <code>POST /mcp</code> · Tests: <code>/verify</code></li>
</ul>
<p class="note">Every sandbox record is labeled synthetic example data over fictional institutions, per estate fixture law. Settlement is a labeled test-mode stub: the 402 boundary is served, nothing is charged.</p>
</body></html>`

/** The §5.1 B2D alternatives, advertised on every 402 OFFER: the anon
 *  sandbox floor plus the OAuth free tier and the checkout door — unwired
 *  shapes say so (stubs are labeled stubs, never live doors). */
export const B2D_ALTERNATIVES = [
  {
    id: 'anon-sandbox',
    title: 'Anonymous sandbox — keyless and free',
    url: `${ORIGIN}/courses`,
    price: 0,
  },
  {
    id: 'oauth-free-tier',
    title: 'GitHub OAuth free tier',
    status: 'stub — the OAuth door is not wired in wave zero; anonymous use is free',
  },
  {
    id: 'checkout-metered',
    title: 'Checkout: self-serve metered calls (key + card on file)',
    price: 0.0002,
    unit: 'USD/call',
    status: 'stub — test-mode; no live settlement, no charge is collected',
  },
]

/** The operation rate card (axp-ext/rates-g2 §2) — a TOP-LEVEL array of the
 *  Pricing Document at the ruled placement, native in the generator since
 *  axp-faces 0.2.0. operationId-keyed; every row names a freeQuota or
 *  prices from zero (§5.1), and every row references an operation this
 *  same manifest declares — the generator refuses anything else. */
export const RATE_ROWS = [
  { operation: 'searchCourses', price: 0.0002, unit: 'USD/call', freeQuota: 1000, status: 'stub — test-mode, no live settlement' },
  { operation: 'getCourse', price: 0, unit: 'USD/call' },
  { operation: 'listCredentials', price: 0, unit: 'USD/call' },
  { operation: 'listAidArtifacts', price: 0, unit: 'USD/call' },
  { operation: 'getPricing', price: 0, unit: 'USD/call' },
  { operation: 'getFamilyRegistry', price: 0, unit: 'USD/call' },
  { operation: 'getOffer', price: 0, unit: 'USD/call' },
]

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.education',
  description:
    "The functions an education institution's systems call: course and credential records, financial-aid artifact records, and an auto-minted catalog door on the LMS system-of-record coordinate — every sandbox record labeled synthetic example data.",
  version: '0.1.0',

  collection: {
    path: '/courses',
    /** axp-ext/rates-g2 §1 — the branching collection's canonical
     *  operationId: the SAME identifier on the OpenAPI contract, the MCP
     *  door, and the rate-card key. */
    operationId: 'searchCourses',
    memberName: 'results',
    summary: 'Course records — typed OK | EMPTY | BLOCKED | OFFER, branching on the query',
    records: courseRecords,
    filters: ['level', 'subject'],
    blockedScopes: ['registrar', 'internal'],
    match: (rec, param, value) =>
      param === 'level' ? rec.educationalLevel === value : param === 'subject' ? rec.subject === value : false,
    emptyMessage: (param, value) =>
      `no Course records match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      `scope '${scope}' is reserved to the institution operator — not served to your agent class`,
  },

  pricing: {
    model: 'metered',
    hardCeiling: 100,
    unit: 'USD',
    price: 0.0002,
    binding: false,
    statement:
      'Test-mode rate card: metering seams are live, settlement is a labeled stub — no charge is collected today. Prices are the stated intent of the wave-zero pricing experiment, not bound terms.',
    /** TOP-LEVEL in the Pricing Document — the axp-ext/rates-g2 §2 ruled
     *  placement, never nested under an offer. */
    rates: RATE_ROWS,
    offers: [
      {
        id: 'metered-calls',
        title: 'Metered calls (test-mode stub — no live settlement)',
        price: 0.0002,
        unit: 'USD/call',
        status: 'stub — the 402 boundary is served; no charge is collected',
        alternatives: B2D_ALTERNATIVES,
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  /** Live routes beyond the quartet — presence-when-true: everything listed
   *  here answers today. Each carries its canonical camelCase operationId
   *  (axp-ext/rates-g2 §1). */
  routes: [
    {
      method: 'GET',
      path: '/courses/{id}',
      operationId: 'getCourse',
      summary: 'One Course record by id',
      responses: {
        200: { description: 'OK envelope with the record' },
        404: { description: 'EMPTY envelope — no record with that id' },
      },
    },
    {
      method: 'GET',
      path: '/credentials',
      operationId: 'listCredentials',
      summary: 'EducationalOccupationalCredential records — labeled synthetic example data',
    },
    {
      method: 'GET',
      path: '/aid-artifacts',
      operationId: 'listAidArtifacts',
      summary: 'Financial-aid artifact records (FAFSA-class document grain) — labeled synthetic example data',
      params: [{ name: 'documentClass', description: 'filter by artifact class (award-letter, isir-summary, verification-worksheet)' }],
    },
    {
      method: 'GET',
      path: '/icp.json',
      operationId: 'getICP',
      summary: 'G2 coordinates: ICP, personas, agent classes, and the identity ladder',
    },
    {
      method: 'GET',
      path: '/verify',
      operationId: 'getVerify',
      summary: 'Run our tests — the public-contract checks, runnable by anyone',
    },
    {
      method: 'GET',
      path: '/verify/suite.json',
      operationId: 'getVerifySuite',
      summary: 'The declarative check suite behind /verify',
    },
    {
      method: 'POST',
      path: '/catalogs',
      operationId: 'createCatalog',
      summary:
        'Auto-mint an anonymous catalog workspace (keyless; ephemeral in wave zero — retention disclosed on mint)',
      responses: { 200: { description: 'OK envelope with the minted catalog' } },
    },
    {
      method: 'GET',
      path: '/catalogs/{id}',
      operationId: 'getCatalog',
      summary: 'One catalog — the LMS system-of-record door (headless ply)',
    },
    {
      method: 'GET',
      path: '/catalogs/{id}/courses',
      operationId: 'listCatalogCourses',
      summary: 'Course records registered in a catalog',
    },
    {
      method: 'POST',
      path: '/catalogs/{id}/courses',
      operationId: 'registerCatalogCourse',
      summary: 'Register a Course record in a catalog (native binding — system of record)',
    },
  ],

  /** MCP tool names ARE the canonical operationIds (axp-ext/rates-g2 §1) —
   *  one operation, one name, every face. The door is authless at the
   *  anon-sandbox rung only; no keyed rung is mounted in wave zero
   *  (presence-when-true). */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['searchCourses', 'getCourse', 'listCredentials', 'listAidArtifacts', 'getPricing'],
  },

  llms: { body: LLMS_BODY },

  docsUrl: `${ORIGIN}/llms.txt`,
  icpUrl: `${ORIGIN}/icp.json`,
  /** links.verify (axp-ext/rates-g2 §3) — the published runnable-suite
   *  export, native on the card. */
  verifyUrl: '/verify',
  /** g2 (axp-ext/rates-g2 §4) — the property's G2/ICP coordinates,
   *  TOP-LEVEL on the card, carried verbatim from the projection config. */
  g2: {
    substrate: projection.substrate,
    motion: projection.motion,
    icp: projection.icp,
    personas: projection.personas,
  },
  conformanceUrl: 'https://api.qa/apis.education',

  family: [
    { name: 'apis.do', origin: 'https://apis.do', role: 'every service, one envelope — the managed implementation layer' },
    { name: 'apis.ax', origin: 'https://apis.ax', role: 'the agent-first API catalog (B2A register)' },
    { name: 'api.qa', origin: 'https://api.qa', role: 'independent conformance verifier' },
    { name: 'api.lawyer', origin: 'https://api.lawyer', role: 'AXP reference implementation' },
  ],

  home: { html: HOME_HTML, md: HOME_MD },
})
