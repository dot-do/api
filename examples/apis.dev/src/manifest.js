/**
 * manifest.js — the ONE source of truth for apis.dev's machine face: every
 * quartet artifact renders from this via the vendored axp-faces generator
 * (0.3.0; pinned apis-ax-axp@2.6.0, digest a9a1197c…, extension
 * axp-ext-rates-g2@0.2.0 — see ./axp-faces/PINS.json). The four extension
 * members (rates[], operationId, links.verify, g2) are declared natively
 * here at their ruled placements — no site-side bridging.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { apiRecords } from './seed.js'
import { projection } from './projection.js'
import { landingHtml } from './site/landing.js'

export const ORIGIN = 'https://apis.dev'

/** The metered ceiling, named once — the pricing document and the landing
 *  page both read this constant, so the two can never disagree. */
export const HARD_CEILING = 100

const LLMS_BODY = `# apis.dev

Functions agents buy. apis.dev is the build-and-monetize lifecycle face of
the software & IT services substrate: a keyless registry of machine-face API
records, the probe reports behind them, and an auto-minted sandbox workspace
for registering your own.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER — three emptinesses never blend.

## Doors

- \`GET /apis\` — machine-face API records (branching collection; \`?filter=<pricingModel>\`, \`?tag=<$type>\`)
- \`GET /apis/{id}\` — one record by id
- \`GET /actions\` — Action catalog sample (labeled example data)
- \`GET /verification-reports\` — probe outcomes recorded as data
- \`POST /workspaces\` — auto-mint an anonymous sandbox workspace (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /mcp\` — MCP door (JSON-RPC 2.0): the same nouns and verbs as HTTP
- \`GET /verify\` — run our tests: the public-contract checks, runnable by anyone

## Pricing

Metered rate card with a declared hard ceiling. Settlement is a labeled
test-mode stub today: the 402 OFFER boundary is served, no charge is
collected, and the pricing document says so in its own \`statement\` member.

## Data classes

API and VerificationReport records are real, derived from each origin's own
published machine surfaces (provenance stamped on every record). Action
records are labeled example data (\`"example": true\`) over fictional
providers.`

const HOME_MD = `# apis.dev

Functions agents buy.

A keyless registry of machine-face API records over the software & IT
services substrate — with the probe reports behind them and an auto-minted
sandbox workspace.

- Machine card: /.well-known/agents.json
- Contract: /openapi.json · Pricing: /pricing · Agents: /llms.txt
- Records: /apis · /actions · /verification-reports
- Sandbox: POST /workspaces · MCP: POST /mcp · Tests: /verify
- Human faces: / (landing) · /pricing (rate card page) · /dashboard (demo-labeled shell)

API records are real (provenance stamped). Action records are labeled
example data. Settlement is a labeled test-mode stub — the 402 boundary is
served, nothing is charged.`


/** The §5.1 B2A ladder, advertised whole on every 402 OFFER (`alternatives`):
 *  pay / work / claim from one boundary. Unwired rungs say so — stubs are
 *  labeled stubs, never live doors. */
export const LADDER_ALTERNATIVES = [
  {
    rung: 0,
    id: 'anon-sandbox',
    title: 'Anonymous sandbox — keyless and free',
    url: `${ORIGIN}/apis`,
    price: 0,
  },
  {
    rung: 1,
    id: 'earned-credits',
    title: 'Work: earn .ax-ledger credits via proof-of-work',
    status: 'stub — ledger not wired in wave zero; this rung does not settle yet',
  },
  {
    rung: 2,
    id: 'human-claimed',
    title: 'Claim: a human claims this agent workspace (attribution → tenure)',
    status: 'stub — claim door not wired in wave zero',
  },
  {
    rung: 3,
    id: 'paid-402',
    title: 'Pay: metered calls against machine identity (id.org.ai)',
    price: 0.0002,
    unit: 'USD/call',
    status: 'stub — test-mode; no live settlement, no charge is collected',
  },
]

/** The operation rate card (axp-ext/rates-g2 §2) — a TOP-LEVEL array of the
 *  Pricing Document at the ruled placement, native in the generator since
 *  axp-faces 0.2.0 (extension axp-ext-rates-g2, now 0.2.0 — the survey
 *  ADOPT-NOW floor). operationId-keyed; every row names a freeQuota or prices
 *  from zero (§5.1), and every row references an operation this same
 *  manifest declares — the generator refuses anything else, fail-closed. */
export const RATE_ROWS = [
  { operation: 'searchApis', price: 0.0002, unit: 'USD/call', freeQuota: 1000, status: 'stub — test-mode, no live settlement' },
  { operation: 'getPricing', price: 0, unit: 'USD/call' },
  { operation: 'getFamilyRegistry', price: 0, unit: 'USD/call' },
  { operation: 'getOffer', price: 0, unit: 'USD/call' },
]

/** The browser face of `/` — the product landing (site/landing.js), rendered
 *  from the SAME rate rows the pricing document serves. The minimal inline
 *  page it replaces lives in git history (wave zero, §7.3). */
const HOME_HTML = landingHtml({ rates: RATE_ROWS, hardCeiling: HARD_CEILING })

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.dev',
  description:
    'Functions agents buy: a keyless registry of machine-face API records over the software & IT services substrate, with probe reports, an Action catalog sample, and auto-minted sandbox workspaces.',
  version: '0.1.0',

  collection: {
    path: '/apis',
    /** axp-ext/rates-g2 §1 — the branching collection's canonical operationId:
     *  the SAME identifier on the OpenAPI contract, the MCP door, and the
     *  rate-card key (the rates[] row above keys on it). */
    operationId: 'searchApis',
    memberName: 'results',
    summary: 'Machine-face API records — typed OK | EMPTY | BLOCKED | OFFER, branching on the query',
    records: apiRecords,
    filters: ['filter', 'tag'],
    blockedScopes: ['admin', 'internal'],
    match: (rec, param, value) =>
      param === 'filter' ? rec.pricingModel === value : param === 'tag' ? rec.$type === value : false,
    emptyMessage: (param, value) =>
      `no API records match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      `scope '${scope}' is reserved to the platform — not served to your agent class`,
  },

  pricing: {
    model: 'metered',
    hardCeiling: HARD_CEILING,
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
        alternatives: LADDER_ALTERNATIVES,
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  /** Live routes beyond the quartet — presence-when-true: everything listed
   *  here answers today. Each carries its canonical camelCase operationId
   *  (axp-ext/rates-g2 §1): the ONE cross-face operation name, passed through
   *  to the OpenAPI contract and shared with the MCP door and metering seams. */
  routes: [
    {
      method: 'GET',
      path: '/apis/{id}',
      operationId: 'getAPI',
      summary: 'One machine-face API record by id (its domain)',
      responses: {
        200: { description: 'OK envelope with the record' },
        404: { description: 'EMPTY envelope — no record with that id' },
      },
    },
    {
      method: 'GET',
      path: '/actions',
      operationId: 'listActions',
      summary: 'Action catalog sample — labeled example data over fictional providers',
    },
    {
      method: 'GET',
      path: '/verification-reports',
      operationId: 'listVerificationReports',
      summary: 'Probe outcomes recorded as data (real observations, provenance stamped)',
      params: [{ name: 'subject', description: 'filter by probed domain' }],
    },
    {
      method: 'GET',
      path: '/icp.json',
      operationId: 'getICP',
      summary: 'G2 coordinates: ICP, personas, agent classes, and the attestation ladder',
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
      path: '/workspaces',
      operationId: 'createWorkspace',
      summary:
        'Auto-mint an anonymous sandbox workspace (keyless; ephemeral in wave zero — retention disclosed on mint)',
      responses: { 200: { description: 'OK envelope with the minted workspace' } },
    },
    {
      method: 'GET',
      path: '/workspaces/{id}',
      operationId: 'getWorkspace',
      summary: 'One workspace — the system-of-record door (headless ply)',
    },
    {
      method: 'GET',
      path: '/workspaces/{id}/apis',
      operationId: 'listWorkspaceAPIs',
      summary: 'API records registered in a workspace',
    },
    {
      method: 'POST',
      path: '/workspaces/{id}/apis',
      operationId: 'registerWorkspaceAPI',
      summary: 'Register an API record in a workspace (native binding — system of record)',
    },
  ],

  /** MCP tool names ARE the canonical operationIds (axp-ext/rates-g2 §1) —
   *  the same camelCase identifier as the OpenAPI contract, one operation,
   *  one name, every face. */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['searchApis', 'getAPI', 'listActions', 'listVerificationReports', 'getPricing'],
  },

  llms: { body: LLMS_BODY },

  docsUrl: `${ORIGIN}/llms.txt`,
  icpUrl: `${ORIGIN}/icp.json`,
  /** links.verify (axp-ext/rates-g2 §3) — the published runnable-suite export,
   *  native on the card since axp-faces 0.2.0. */
  verifyUrl: '/verify',
  /** g2 (axp-ext/rates-g2 §4) — the property's G2/ICP coordinates, TOP-LEVEL
   *  on the card, carried verbatim from the projection config (the fuller
   *  /icp.json document stays linked beside it via links.icp). */
  g2: {
    substrate: projection.substrate,
    motion: projection.motion,
    icp: projection.icp,
    personas: projection.personas,
  },
  conformanceUrl: 'https://api.qa/apis.dev',

  family: [
    { name: 'apis.do', origin: 'https://apis.do', role: 'every service, one envelope — the managed implementation layer' },
    { name: 'apis.ax', origin: 'https://apis.ax', role: 'the agent-first API catalog (B2A register)' },
    { name: 'api.qa', origin: 'https://api.qa', role: 'independent conformance verifier' },
    { name: 'api.lawyer', origin: 'https://api.lawyer', role: 'AXP reference implementation' },
    { name: 'apis.directory', origin: 'https://apis.directory', role: 'the register of the family — brands, capabilities, offerings' },
    { name: 'api.management', origin: 'https://api.management', role: 'the manage/operate door of the same provider abstraction (sibling of apis.dev)' },
  ],

  home: { html: HOME_HTML, md: HOME_MD },
})
