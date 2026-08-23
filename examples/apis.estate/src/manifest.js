/**
 * manifest.js — the ONE source of truth for apis.estate's machine face:
 * every quartet artifact renders from this via the vendored axp-faces
 * generator (0.3.0; pinned apis-ax-axp@2.6.0, digest a9a1197c…, extension
 * axp-ext-rates-g2@0.2.0, digest 903e414d… — see ./axp-faces/PINS.json,
 * vendored from the axp.org.ai repo's committed HEAD 523c9ef on
 * draft/axp-extension-rates-g2). The four extension members (rates[],
 * operationId, links.verify, g2) are declared natively here at their ruled
 * placements — no site-side bridging.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { closingPackets } from './seed.js'
import { projection } from './projection.js'

export const ORIGIN = 'https://apis.estate'

const LLMS_BODY = `# apis.estate

The closing-document layer of the real-estate substrate (NAICS 53) as typed
records: closing packets, lien waivers, payoff letters, deeds — plus a
keyless transaction-file sandbox for assembling packets.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER — three emptinesses never blend.

## Doors

- \`GET /closing-packets\` — closing-packet records (branching collection; \`?county=\`, \`?kind=\`)
- \`GET /closing-packets/{id}\` — one packet by id
- \`GET /lien-waivers\` — lien-waiver records (record type shared with the construction row; collision on record)
- \`GET /payoff-letters\` — payoff-letter records
- \`GET /deeds\` — deed records (county-recorder grain)
- \`POST /transaction-files\` — auto-mint an anonymous sandbox transaction file (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /mcp\` — MCP door (JSON-RPC 2.0): the same nouns and verbs as HTTP
- \`GET /verify\` — run our tests: the public-contract checks, runnable by anyone

## Out of scope, permanently

The money/escrow layer: no door here holds, moves, disburses, or instructs
the movement of funds (licensure + the A1 settlement-module gate). The
\`escrow\` query scope answers BLOCKED by construction.

## Pricing

Metered rate card with a declared hard ceiling. Settlement is a labeled
test-mode stub today: the 402 OFFER boundary is served, no charge is
collected, and the pricing document says so in its own \`statement\` member.
Only the mounted ladder rung (the keyless anon sandbox) is advertised.

## Data classes

EVERY record served today is labeled example data (\`"example": true\`,
"[demo]"-prefixed names) — a mechanically generated synthetic seed over
fictional counties, parties, and parcels. The row's real corpus is
county-recorder ingest across ~3,100 counties with no national interchange
standard; that ingest is deferred, never pretended.`

const HOME_MD = `# apis.estate

The closing-document layer of the real-estate substrate as typed records.

Closing packets, lien waivers, payoff letters, deeds — keyless, typed
OK | EMPTY | BLOCKED | OFFER — plus an auto-minted transaction-file sandbox.

- Machine card: /.well-known/agents.json
- Contract: /openapi.json · Pricing: /pricing · Agents: /llms.txt
- Records: /closing-packets · /lien-waivers · /payoff-letters · /deeds
- Sandbox: POST /transaction-files · MCP: POST /mcp · Tests: /verify

Every record is labeled example data (synthetic seed, fictional parties).
The money/escrow layer is permanently out of scope. Settlement is a labeled
test-mode stub — the 402 boundary is served, nothing is charged.`

const HOME_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>apis.estate — the closing-document layer, typed</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.25rem;color:#111;background:#fff}
  h1{font-size:1.6rem;margin:0 0 .25rem} p.tag{color:#555;margin-top:0}
  code{background:#f4f4f4;padding:.1em .35em;border-radius:4px}
  ul{padding-left:1.2rem} li{margin:.35rem 0}
  .note{font-size:.85rem;color:#666;border-top:1px solid #eee;margin-top:2rem;padding-top:1rem}
  @media (prefers-color-scheme:dark){body{background:#111;color:#eee}code{background:#222}p.tag{color:#aaa}.note{color:#999;border-color:#333}}
</style></head>
<body>
<h1>apis.estate</h1>
<p class="tag">The closing-document layer of the real-estate substrate, as typed records.</p>
<p>Closing packets, lien waivers, payoff letters, and deeds — keyless typed collections — plus an auto-minted transaction-file sandbox for assembling packets.</p>
<ul>
  <li>Machine card: <code>GET /.well-known/agents.json</code></li>
  <li>Contract: <code>/openapi.json</code> · Pricing: <code>/pricing</code> · Agents: <code>/llms.txt</code></li>
  <li>Records: <code>/closing-packets</code> · <code>/lien-waivers</code> · <code>/payoff-letters</code> · <code>/deeds</code></li>
  <li>Sandbox: <code>POST /transaction-files</code> · MCP: <code>POST /mcp</code> · Tests: <code>/verify</code></li>
</ul>
<p class="note">Every record served today is labeled example data — a synthetic seed over fictional counties, parties, and parcels. The money/escrow layer is permanently out of scope (licensure + settlement-module gate). Settlement is a labeled test-mode stub: the 402 boundary is served, nothing is charged.</p>
</body></html>`

/** MOUNTED-RUNGS-ONLY (batch watch list): only the rungs that are actually
 *  mounted are advertised on an OFFER body. Today that is rung 0 alone —
 *  the keyless anon sandbox. Rungs 1–3 (earned credits / human-claimed /
 *  paid 402 settlement) are RECORDED in the projection config and appear
 *  here when — and only when — they mount. */
export const LADDER_ALTERNATIVES = [
  {
    rung: 0,
    id: 'anon-sandbox',
    title: 'Anonymous sandbox — keyless and free',
    url: `${ORIGIN}/closing-packets`,
    price: 0,
  },
]

/** The operation rate card (axp-ext/rates-g2 §2) — a TOP-LEVEL array of the
 *  Pricing Document at the ruled placement, native in the generator.
 *  operationId-keyed; every row names a freeQuota or prices from zero
 *  (§5.1), and every row references an operation this same manifest
 *  declares — the generator refuses anything else, fail-closed. */
export const RATE_ROWS = [
  { operation: 'searchClosingPackets', price: 0.0002, unit: 'USD/call', freeQuota: 1000, note: 'stub — test-mode, no live settlement' },
  { operation: 'getClosingPacket', price: 0, unit: 'USD/call' },
  { operation: 'getPricing', price: 0, unit: 'USD/call' },
  { operation: 'getFamilyRegistry', price: 0, unit: 'USD/call' },
  { operation: 'getOffer', price: 0, unit: 'USD/call' },
]

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.estate',
  description:
    'The closing-document layer of the real-estate substrate as typed records: closing packets, lien waivers, payoff letters, and deeds (labeled synthetic seed), plus keyless auto-minted transaction files for assembling packets. The money/escrow layer is permanently out of scope.',
  version: '0.1.0',

  collection: {
    path: '/closing-packets',
    /** axp-ext/rates-g2 §1 — the branching collection's canonical operationId:
     *  the SAME identifier on the OpenAPI contract, the MCP door, and the
     *  rate-card key (the rates[] row above keys on it). */
    operationId: 'searchClosingPackets',
    memberName: 'results',
    summary: 'Closing-packet records — typed OK | EMPTY | BLOCKED | OFFER, branching on the query',
    records: closingPackets,
    filters: ['county', 'kind'],
    blockedScopes: ['escrow', 'admin'],
    match: (rec, param, value) =>
      param === 'county' ? rec.county === value : param === 'kind' ? rec.kind === value : false,
    emptyMessage: (param, value) =>
      `no closing-packet records match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      scope === 'escrow'
        ? 'the money/escrow layer is permanently out of scope on this substrate (licensure + A1 settlement gate) — no funds are held, moved, or disbursed here'
        : `scope '${scope}' is reserved to the platform — not served to your agent class`,
  },

  pricing: {
    model: 'metered',
    hardCeiling: 100,
    unit: 'USD',
    price: 0.0002,
    binding: false,
    statement:
      'Test-mode rate card: metering seams are live, settlement is a labeled stub — no charge is collected today. Prices are the stated intent of the wave-zero pricing experiment, not bound terms. Only the mounted ladder rung (keyless anon sandbox) is advertised.',
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
        ladderNote:
          'mounted-rungs-only: the anon sandbox is the only mounted rung and the only one advertised; unmounted rungs are recorded in the projection config, never sold as doors',
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
      path: '/closing-packets/{id}',
      operationId: 'getClosingPacket',
      summary: 'One closing-packet record by id',
      responses: {
        200: { description: 'OK envelope with the record' },
        404: { description: 'EMPTY envelope — no record with that id' },
      },
    },
    {
      method: 'GET',
      path: '/lien-waivers',
      operationId: 'listLienWaivers',
      summary:
        'Lien-waiver records — labeled example data; record type shared with the construction row (collision on record, built under the real-estate row key)',
      params: [{ name: 'kind', description: 'filter by waiver kind (conditional | unconditional)' }],
    },
    {
      method: 'GET',
      path: '/payoff-letters',
      operationId: 'listPayoffLetters',
      summary: 'Payoff-letter records — labeled example data; document grain only, no funds move here',
    },
    {
      method: 'GET',
      path: '/deeds',
      operationId: 'listDeeds',
      summary: 'Deed records at the county-recorder grain — labeled example data, synthetic recording identifiers',
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
      path: '/transaction-files',
      operationId: 'createTransactionFile',
      summary:
        'Auto-mint an anonymous sandbox transaction file (keyless; ephemeral in wave zero — retention disclosed on mint)',
      responses: { 200: { description: 'OK envelope with the minted transaction file' } },
    },
    {
      method: 'GET',
      path: '/transaction-files/{id}',
      operationId: 'getTransactionFile',
      summary: 'One transaction file — the system-of-record door (headless ply)',
    },
    {
      method: 'GET',
      path: '/transaction-files/{id}/documents',
      operationId: 'listPacketDocuments',
      summary: 'Documents assembled into a transaction file’s closing packet',
    },
    {
      method: 'POST',
      path: '/transaction-files/{id}/documents',
      operationId: 'addPacketDocument',
      summary: 'Assemble a document into a transaction file’s packet (native binding — system of record)',
    },
  ],

  /** MCP tool names ARE the canonical operationIds (axp-ext/rates-g2 §1) —
   *  the same camelCase identifier as the OpenAPI contract, one operation,
   *  one name, every face. Authless: only the anon-sandbox rung is mounted,
   *  so no bearer tier exists to demand (bearer-key arrives with rung 1+). */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['searchClosingPackets', 'getClosingPacket', 'listLienWaivers', 'listPayoffLetters', 'listDeeds', 'getPricing'],
  },

  llms: { body: LLMS_BODY },

  docsUrl: `${ORIGIN}/llms.txt`,
  icpUrl: `${ORIGIN}/icp.json`,
  /** links.verify (axp-ext/rates-g2 §3) — the published runnable-suite
   *  export, native on the card. */
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
  conformanceUrl: 'https://api.qa/apis.estate',

  /** Family: only origins that SERVE today (presence-when-true).
   *  closings.services is staged, not serving — recorded in the projection
   *  config, linked nowhere. The sub-audience rails (apis.apartments/house/
   *  rentals/lease/land) serve nothing and are likewise not linked. */
  family: [
    { name: 'apis.ax', origin: 'https://apis.ax', role: 'the agent-first API catalog (B2A register)' },
    { name: 'api.qa', origin: 'https://api.qa', role: 'independent conformance verifier' },
    { name: 'api.lawyer', origin: 'https://api.lawyer', role: 'AXP reference implementation' },
  ],

  home: { html: HOME_HTML, md: HOME_MD },
})
