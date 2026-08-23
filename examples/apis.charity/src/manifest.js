/**
 * manifest.js — the ONE source of truth for the apis.charity machine face:
 * every quartet artifact renders from this via the vendored axp-faces
 * generator (pinned apis-ax-axp@2.6.0, digest a9a1197c… — see
 * ./axp-faces/PINS.json), then passes through ./bridge.js, which adds ONLY
 * the four ruled extension placements the generator does not emit yet.
 *
 * RENAMEABLE SURFACE: the brand string is imported from ./projection.js
 * (single definition) — the register's weak-confidence flag on 'charity'
 * means this face may be renamed by changing BRAND/ORIGIN in one place.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { organizations } from './seed.js'
import { BRAND, ORIGIN } from './projection.js'

export { BRAND, ORIGIN }

const LLMS_BODY = `# ${BRAND}

The systems a nonprofit back office runs on. ${BRAND} serves org-level,
donor, donation, and grant records over the nonprofits-civic substrate
(NAICS 813) — with a keyless sandbox and an auto-minted donor-CRM workspace.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER — three emptinesses never blend.

## Doors

- \`GET /organizations\` — org-level records (branching collection; \`?subsection=\`, \`?ntee=\`)
- \`GET /organizations/{id}\` — one organization by id
- \`GET /donors\` — donor records (labeled example data)
- \`GET /donations\` — donation records (\`?org=\` filters; labeled example data)
- \`GET /grants\` — grant-cycle records (\`?org=\` filters; labeled example data)
- \`POST /workspaces\` — auto-mint an anonymous donor-CRM sandbox workspace (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /workspaces/{id}/donations\` — record a donation in your workspace (the system-of-record door)
- \`POST /mcp\` — MCP door (JSON-RPC 2.0, authless at the anonymous-sandbox rung): the same nouns and verbs as HTTP
- \`GET /verify\` — run our tests: the public-contract checks, runnable by anyone

## Pricing

Metered rate card with a declared hard ceiling and generous free quotas.
Settlement is a labeled test-mode stub today: the 402 OFFER boundary is
served, no charge is collected, and the pricing document says so in its own
\`statement\` member.

## Data classes

ALL seed records are labeled synthetic example data (\`"example": true\` on
every record): fictional organizations and people, synthetic 00-prefix EINs.
Nothing here is derived from IRS 990 / EO BMF or any real filing — that
ingest route is a recorded candidate, not a performed one. Records you write
into a workspace are yours, held ephemerally (disclosed on mint).`

const HOME_MD = `# ${BRAND}

The systems a nonprofit back office runs on.

Org-level, donor, donation, and grant records over the nonprofits-civic
substrate (NAICS 813) — keyless sandbox, auto-minted donor-CRM workspace.

- Machine card: /.well-known/agents.json
- Contract: /openapi.json · Pricing: /pricing · Agents: /llms.txt
- Records: /organizations · /donors · /donations · /grants
- Sandbox: POST /workspaces · MCP: POST /mcp · Tests: /verify

All seed records are labeled synthetic example data (fictional organizations
and people, synthetic EINs) — no real filing is ingested. Settlement is a
labeled test-mode stub: the 402 boundary is served, nothing is charged.`

const HOME_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${BRAND} — the systems a nonprofit back office runs on</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.25rem;color:#111;background:#fff}
  h1{font-size:1.6rem;margin:0 0 .25rem} p.tag{color:#555;margin-top:0}
  code{background:#f4f4f4;padding:.1em .35em;border-radius:4px}
  ul{padding-left:1.2rem} li{margin:.35rem 0}
  .note{font-size:.85rem;color:#666;border-top:1px solid #eee;margin-top:2rem;padding-top:1rem}
  @media (prefers-color-scheme:dark){body{background:#111;color:#eee}code{background:#222}p.tag{color:#aaa}.note{color:#999;border-color:#333}}
</style></head>
<body>
<h1>${BRAND}</h1>
<p class="tag">The systems a nonprofit back office runs on.</p>
<p>Org-level, donor, donation, and grant records over the nonprofits-civic substrate (NAICS 813) &mdash; keyless sandbox, auto-minted donor-CRM workspace.</p>
<ul>
  <li>Machine card: <code>GET /.well-known/agents.json</code></li>
  <li>Contract: <code>/openapi.json</code> · Pricing: <code>/pricing</code> · Agents: <code>/llms.txt</code></li>
  <li>Records: <code>/organizations</code> · <code>/donors</code> · <code>/donations</code> · <code>/grants</code></li>
  <li>Sandbox: <code>POST /workspaces</code> · MCP: <code>POST /mcp</code> · Tests: <code>/verify</code></li>
</ul>
<p class="note">All seed records are <strong>labeled synthetic example data</strong> &mdash; fictional organizations and people, synthetic 00-prefix EINs; no real IRS filing is ingested. Settlement is a labeled test-mode stub: the 402 boundary is served, nothing is charged.</p>
</body></html>`

/** The 402 OFFER `alternatives` member — MOUNTED rungs only (batch-2
 *  ruling): the anonymous sandbox floor (rung 0, live) and the paid rung
 *  this offer itself is (rung 3, served as a labeled 402-shaped test-mode
 *  stub). The #17 work and claim rungs are NOT mounted on this origin and
 *  are named in the statement, never advertised as doors. */
export const LADDER_ALTERNATIVES = [
  {
    rung: 0,
    id: 'anon-sandbox',
    title: 'Anonymous sandbox — keyless and free',
    url: `${ORIGIN}/organizations`,
    price: 0,
  },
  {
    rung: 3,
    id: 'paid-402',
    title: 'Pay: metered calls against machine identity (id.org.ai)',
    price: 0.0002,
    unit: 'USD/call',
    status: 'stub — test-mode; the 402-shaped boundary is served and labeled, no live settlement, no charge is collected',
  },
]

const LADDER_STATEMENT =
  'B2A ladder disclosure: the #17 proof-of-work (earned credits) and human-claim rungs exist in doctrine but are NOT mounted on this origin yet; per ruling, only mounted rungs are advertised — they will appear here when their doors answer (presence-when-true).'

/** The operationId-keyed rate card — every row has a freeQuota or a zero
 *  price (§5.1: every rate row names its free quota or prices from zero).
 *  Rows reference only operationIds the served OpenAPI contract carries
 *  (bridged onto every route — ruled placement). */
export const RATE_ROWS = [
  { operation: 'listCollection', price: 0.0002, unit: 'USD/call', freeQuota: 5000, status: 'stub — test-mode, no live settlement' },
  { operation: 'getOrganization', price: 0.0002, unit: 'USD/call', freeQuota: 5000, status: 'stub — test-mode, no live settlement' },
  { operation: 'listDonations', price: 0.0002, unit: 'USD/call', freeQuota: 5000, status: 'stub — test-mode, no live settlement' },
  { operation: 'listGrants', price: 0.0002, unit: 'USD/call', freeQuota: 5000, status: 'stub — test-mode, no live settlement' },
  { operation: 'recordDonation', price: 0.001, unit: 'USD/call', freeQuota: 1000, status: 'stub — test-mode, no live settlement' },
  { operation: 'listDonors', price: 0, unit: 'USD/call' },
  { operation: 'createWorkspace', price: 0, unit: 'USD/call' },
  { operation: 'getWorkspace', price: 0, unit: 'USD/call' },
  { operation: 'listWorkspaceDonations', price: 0, unit: 'USD/call' },
  { operation: 'getPricing', price: 0, unit: 'USD/call' },
  { operation: 'getFamilyRegistry', price: 0, unit: 'USD/call' },
  { operation: 'getOffer', price: 0, unit: 'USD/call' },
  { operation: 'getICP', price: 0, unit: 'USD/call' },
  { operation: 'getVerify', price: 0, unit: 'USD/call' },
  { operation: 'getVerifySuite', price: 0, unit: 'USD/call' },
]

/** operationId per served route (ruled placement: operationId on EVERY
 *  route; bridged into the generated OpenAPI in ./bridge.js until the
 *  upstream re-vendor lands). Keyed `METHOD path`. The quartet/collection/
 *  family/offer ids are emitted by the generator itself. */
export const OPERATION_IDS = {
  'GET /organizations/{id}': 'getOrganization',
  'GET /donors': 'listDonors',
  'GET /donations': 'listDonations',
  'GET /grants': 'listGrants',
  'GET /icp.json': 'getICP',
  'GET /verify': 'getVerify',
  'GET /verify/suite.json': 'getVerifySuite',
  'POST /workspaces': 'createWorkspace',
  'GET /workspaces/{id}': 'getWorkspace',
  'GET /workspaces/{id}/donations': 'listWorkspaceDonations',
  'POST /workspaces/{id}/donations': 'recordDonation',
}

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: BRAND,
  description:
    'The systems a nonprofit back office runs on: org-level, donor, donation, and grant records over the nonprofits-civic substrate (NAICS 813), with a keyless sandbox and auto-minted donor-CRM workspaces. All seed data is labeled synthetic example data.',
  version: '0.1.0',

  collection: {
    path: '/organizations',
    memberName: 'results',
    summary:
      'Org-level records for NAICS 813 — typed OK | EMPTY | BLOCKED | OFFER, branching on the query (?subsection=, ?ntee=)',
    records: organizations,
    filters: ['subsection', 'ntee'],
    blockedScopes: ['admin', 'internal'],
    match: (rec, param, value) =>
      param === 'subsection'
        ? String(rec.subsection).toLowerCase().startsWith(String(value).toLowerCase())
        : param === 'ntee'
          ? String(rec.ntee).toUpperCase() === String(value).toUpperCase()
          : false,
    emptyMessage: (param, value) =>
      `no organizations match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      `scope '${scope}' is reserved to the platform — not served to your agent class`,
  },

  pricing: {
    model: 'metered',
    hardCeiling: 25,
    unit: 'USD',
    price: 0.0002,
    binding: false,
    statement:
      'Test-mode rate card: metering seams are live, settlement is a labeled stub — no charge is collected today. Prices are the stated intent of the wave-zero pricing experiment, not bound terms. ' +
      LADDER_STATEMENT,
    offers: [
      {
        id: 'metered-calls',
        title: 'Metered calls (test-mode stub — no live settlement)',
        price: 0.0002,
        unit: 'USD/call',
        status: 'stub — the 402-shaped boundary is served; no charge is collected',
        statement: LADDER_STATEMENT,
        rates: RATE_ROWS,
        alternatives: LADDER_ALTERNATIVES,
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  /** Live routes beyond the quartet — presence-when-true: everything listed
   *  here answers today. */
  routes: [
    {
      method: 'GET',
      path: '/organizations/{id}',
      summary: 'One organization record by id',
      responses: {
        200: { description: 'OK envelope with the record' },
        404: { description: 'EMPTY envelope — no record with that id' },
      },
    },
    {
      method: 'GET',
      path: '/donors',
      summary: 'Donor records — labeled synthetic example data (fictional people)',
    },
    {
      method: 'GET',
      path: '/donations',
      summary: 'Donation records: pledge → received → receipted — labeled synthetic example data',
      params: [{ name: 'org', description: 'filter by organization id' }],
    },
    {
      method: 'GET',
      path: '/grants',
      summary: 'Grant-cycle records: application → award → disbursement — labeled synthetic example data',
      params: [{ name: 'org', description: 'filter by grantee organization id' }],
    },
    {
      method: 'GET',
      path: '/icp.json',
      summary: 'G2 coordinates: ICP, personas, agent classes, and the attestation ladder',
    },
    {
      method: 'GET',
      path: '/verify',
      summary: 'Run our tests — the public-contract checks, runnable by anyone',
    },
    {
      method: 'GET',
      path: '/verify/suite.json',
      summary: 'The declarative check suite behind /verify',
    },
    {
      method: 'POST',
      path: '/workspaces',
      summary:
        'Auto-mint an anonymous donor-CRM sandbox workspace (keyless; ephemeral in wave zero — retention disclosed on mint)',
      responses: { 200: { description: 'OK envelope with the minted workspace' } },
    },
    {
      method: 'GET',
      path: '/workspaces/{id}',
      summary: 'One workspace — the system-of-record door (headless ply)',
    },
    {
      method: 'GET',
      path: '/workspaces/{id}/donations',
      summary: 'Donation records recorded in a workspace',
    },
    {
      method: 'POST',
      path: '/workspaces/{id}/donations',
      summary: 'Record a donation in a workspace (native binding — the donor-CRM system of record)',
    },
  ],

  /** MCP door — authless at the anonymous-sandbox rung (batch-2 ruling:
   *  authless anon-sandbox rung, bearer-key above; no keyed rung is mounted
   *  on this origin yet, so no auth is declared). */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['search_organizations', 'get_organization', 'list_donors', 'list_donations', 'list_grants', 'get_pricing'],
  },

  llms: { body: LLMS_BODY },

  docsUrl: `${ORIGIN}/llms.txt`,
  icpUrl: `${ORIGIN}/icp.json`,
  conformanceUrl: `https://api.qa/${BRAND}`,

  /** Serving siblings only (presence-when-true): apis.church and
   *  apis.community share this substrate on the register but serve nothing —
   *  they are not edges until they answer. */
  family: [
    { name: 'apis.do', origin: 'https://apis.do', role: 'every service, one envelope — the managed implementation layer' },
    { name: 'apis.ax', origin: 'https://apis.ax', role: 'the agent-first API catalog (B2A register)' },
    { name: 'api.qa', origin: 'https://api.qa', role: 'independent conformance verifier' },
    { name: 'api.lawyer', origin: 'https://api.lawyer', role: 'AXP reference implementation' },
  ],

  home: { html: HOME_HTML, md: HOME_MD },
})
