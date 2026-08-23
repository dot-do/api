/**
 * manifest.js — the ONE source of truth for apis.engineering's machine face:
 * every quartet artifact renders from this via the vendored axp-faces
 * generator (0.3.0; pinned apis-ax-axp@2.6.0, digest a9a1197c…, extension
 * axp-ext-rates-g2@0.2.0, digest 903e414d… — see ./axp-faces/PINS.json,
 * vendored from axp.org.ai committed HEAD 523c9ef2 on branch
 * draft/axp-extension-rates-g2; ./axp-faces/VENDORED.json). The four
 * extension members (rates[], operationId, links.verify, g2) are declared
 * natively here at their ruled placements — no site-side bridging.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { drawingRecords } from './seed.js'
import { projection } from './projection.js'

export const ORIGIN = 'https://apis.engineering'

const LLMS_BODY = `# apis.engineering

Drawing, spec, and submittal records for the engineering & architecture
substrate (NAICS 5413). Typed records answer keyless; an auto-minted project
door assembles submittal packages from drawing and spec references.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER — three emptinesses never blend.

## Doors

- \`GET /drawings\` — drawing records (branching collection; \`?discipline=<civil|structural|architectural>\`, \`?tag=<$type>\`)
- \`GET /drawings/{id}\` — one record by id
- \`GET /specifications\` — specification records
- \`GET /submittals\` — submittal packages (\`?project=<id>\`)
- \`POST /projects\` — auto-mint an anonymous sandbox project (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /projects/{id}/submittals\` — assemble a submittal package from drawing/spec references (native system-of-record door)
- \`POST /mcp\` — MCP door (JSON-RPC 2.0): the same nouns and verbs as HTTP
- \`GET /verify\` — run our tests: the public-contract checks, runnable by anyone

## Boundaries, stated plainly

Stamped artifacts are reserved acts: a PE or registered architect signs
under their own credential. This API serves records and assembly, never
stamps — the \`stamped\` scope answers BLOCKED by design. Draw and
lien-waiver paperwork belongs to the construction category and is not
served here.

## Pricing

Metered rate card with a declared hard ceiling. Settlement is a labeled
test-mode stub today: the 402 OFFER boundary is served, no charge is
collected, and the pricing document says so in its own \`statement\` member.

## Data class

ALL records are labeled synthetic example data (\`"example": true\`) over
fictional firms and a fictional project, generated per the sandbox seed
spec — no ingest corpus exists for this cell yet and none is implied.`

const HOME_MD = `# apis.engineering

Drawing, spec, and submittal records for the engineering & architecture
substrate — keyless typed records and an auto-minted project door for
submittal assembly.

- Machine card: /.well-known/agents.json
- Contract: /openapi.json · Pricing: /pricing · Agents: /llms.txt
- Records: /drawings · /specifications · /submittals
- Sandbox: POST /projects · MCP: POST /mcp · Tests: /verify

ALL records are labeled synthetic example data over fictional firms and a
fictional project. Stamped artifacts are reserved to licensed
professionals and are not served. Settlement is a labeled test-mode stub —
the 402 boundary is served, nothing is charged.`

const HOME_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>apis.engineering — drawing, spec, and submittal records</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.25rem;color:#111}
  h1{font-size:1.6rem;margin:0 0 .25rem} p.tag{color:#555;margin-top:0}
  code{background:#f4f4f4;padding:.1em .35em;border-radius:4px}
  ul{padding-left:1.2rem} li{margin:.35rem 0}
  .note{font-size:.85rem;color:#666;border-top:1px solid #eee;margin-top:2rem;padding-top:1rem}
  @media (prefers-color-scheme:dark){body{background:#111;color:#eee}code{background:#222}p.tag{color:#aaa}.note{color:#999;border-color:#333}}
</style></head>
<body>
<h1>apis.engineering</h1>
<p class="tag">Drawing, spec, and submittal records for the engineering &amp; architecture substrate.</p>
<p>Keyless typed records over the discipline&rsquo;s document grain — drawings, specifications, submittal packages — with an auto-minted project door that assembles submittals from drawing and spec references.</p>
<ul>
  <li>Machine card: <code>GET /.well-known/agents.json</code></li>
  <li>Contract: <code>/openapi.json</code> · Pricing: <code>/pricing</code> · Agents: <code>/llms.txt</code></li>
  <li>Records: <code>/drawings</code> · <code>/specifications</code> · <code>/submittals</code></li>
  <li>Sandbox: <code>POST /projects</code> · MCP: <code>POST /mcp</code> · Tests: <code>/verify</code></li>
</ul>
<p class="note">ALL records on this origin are labeled synthetic example data over fictional firms and a fictional project — no ingest corpus exists for this cell yet. Stamped artifacts are reserved acts of licensed professionals (PE / registered architect) and are not served. Settlement is a labeled test-mode stub: the 402 boundary is served, nothing is charged.</p>
</body></html>`

/** The §5.1 B2A ladder, advertised whole on every 402 OFFER (`alternatives`):
 *  pay / work / claim from one boundary. Unwired rungs say so — stubs are
 *  labeled stubs, never live doors. */
export const LADDER_ALTERNATIVES = [
  {
    rung: 0,
    id: 'anon-sandbox',
    title: 'Anonymous sandbox — keyless and free',
    url: `${ORIGIN}/drawings`,
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
    title: 'Claim: a human claims this agent project workspace (attribution → tenure)',
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
 *  axp-faces 0.2.0. operationId-keyed; every row names a freeQuota or prices
 *  from zero (§5.1), and every row references an operation this same
 *  manifest declares — the generator refuses anything else, fail-closed. */
export const RATE_ROWS = [
  { operation: 'searchDrawings', price: 0.0002, unit: 'USD/call', freeQuota: 1000, status: 'stub — test-mode, no live settlement' },
  { operation: 'getPricing', price: 0, unit: 'USD/call' },
  { operation: 'getFamilyRegistry', price: 0, unit: 'USD/call' },
  { operation: 'getOffer', price: 0, unit: 'USD/call' },
]

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.engineering',
  description:
    'Drawing, spec, and submittal records for the engineering & architecture substrate (NAICS 5413): keyless typed records over the discipline’s document grain, with auto-minted sandbox projects for submittal assembly. All records are labeled synthetic example data in wave zero.',
  version: '0.1.0',

  collection: {
    path: '/drawings',
    /** axp-ext/rates-g2 §1 — the branching collection's canonical operationId:
     *  the SAME identifier on the OpenAPI contract, the MCP door, and the
     *  rate-card key (the rates[] row above keys on it). */
    operationId: 'searchDrawings',
    memberName: 'results',
    summary: 'Drawing records — typed OK | EMPTY | BLOCKED | OFFER, branching on the query',
    records: drawingRecords,
    filters: ['discipline', 'tag'],
    blockedScopes: ['stamped', 'internal'],
    match: (rec, param, value) =>
      param === 'discipline' ? rec.discipline === value : param === 'tag' ? rec.$type === value : false,
    emptyMessage: (param, value) =>
      `no drawing records match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      scope === 'stamped'
        ? "scope 'stamped' is reserved — PE/RA-stamped artifacts are reserved acts of independent licensed professionals and are not served to your agent class"
        : `scope '${scope}' is reserved to the platform — not served to your agent class`,
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
        alternatives: LADDER_ALTERNATIVES,
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
      path: '/drawings/{id}',
      operationId: 'getDrawing',
      summary: 'One drawing record by id',
      responses: {
        200: { description: 'OK envelope with the record' },
        404: { description: 'EMPTY envelope — no record with that id' },
      },
    },
    {
      method: 'GET',
      path: '/specifications',
      operationId: 'listSpecifications',
      summary: 'Specification records — labeled synthetic example data over fictional firms',
    },
    {
      method: 'GET',
      path: '/submittals',
      operationId: 'listSubmittals',
      summary: 'Submittal packages — labeled synthetic example data; items reference drawing and spec ids',
      params: [{ name: 'project', description: 'filter by project id' }],
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
      path: '/projects',
      operationId: 'createProject',
      summary:
        'Auto-mint an anonymous sandbox project (keyless; ephemeral in wave zero — retention disclosed on mint)',
      responses: { 200: { description: 'OK envelope with the minted project' } },
    },
    {
      method: 'GET',
      path: '/projects/{id}',
      operationId: 'getProject',
      summary: 'One project — the system-of-record door (headless ply)',
    },
    {
      method: 'GET',
      path: '/projects/{id}/submittals',
      operationId: 'listProjectSubmittals',
      summary: 'Submittal packages assembled in a project',
    },
    {
      method: 'POST',
      path: '/projects/{id}/submittals',
      operationId: 'assembleSubmittal',
      summary: 'Assemble a submittal package from drawing/spec references (native binding — system of record)',
    },
  ],

  /** MCP tool names ARE the canonical operationIds (axp-ext/rates-g2 §1) —
   *  the same camelCase identifier as the OpenAPI contract, one operation,
   *  one name, every face. */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['searchDrawings', 'getDrawing', 'listSpecifications', 'listSubmittals', 'getPricing'],
  },

  llms: { body: LLMS_BODY },

  docsUrl: `${ORIGIN}/llms.txt`,
  icpUrl: `${ORIGIN}/icp.json`,
  /** links.verify (axp-ext/rates-g2 §3) — the published runnable-suite export,
   *  native on the card. */
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
  conformanceUrl: 'https://api.qa/apis.engineering',

  family: [
    { name: 'apis.do', origin: 'https://apis.do', role: 'every service, one envelope — the managed implementation layer' },
    { name: 'apis.ax', origin: 'https://apis.ax', role: 'the agent-first API catalog (B2A register)' },
    { name: 'api.qa', origin: 'https://api.qa', role: 'independent conformance verifier' },
    { name: 'api.lawyer', origin: 'https://api.lawyer', role: 'AXP reference implementation' },
  ],

  home: { html: HOME_HTML, md: HOME_MD },
})
