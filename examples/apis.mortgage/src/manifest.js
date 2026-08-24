/**
 * manifest.js — the ONE source of truth for apis.mortgage's machine face:
 * every quartet artifact renders from this via the vendored axp-faces
 * generator (0.3.0; pinned apis-ax-axp@2.6.0, digest a9a1197c…, extension
 * axp-ext-rates-g2@0.2.0 — see ./axp-faces/PINS.json). The four extension
 * members (rates[], operationId, links.verify, g2) are declared natively
 * here at their ruled placements — no site-side bridging.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { loanFiles } from './seed.js'
import { projection } from './projection.js'
import { LANDING_HTML } from './landing.js'

export const ORIGIN = 'https://apis.mortgage'

const LLMS_BODY = `# apis.mortgage

The headless mortgage system of record. apis.mortgage is the machine face
of the mortgage substrate (NAICS 522292): MISMO-typed loan-file records,
HMDA-derived lender market records, and an auto-minted sandbox loan
pipeline — the LOS system-of-record door.

The boundary, stated once (founder ruling 2026-08-23): the software is the
system of record, and the licensed operator — the broker, the lender, the
servicer — is the customer and brings the license. Lender-Reserved acts
(extending credit, taking the Application, negotiating terms, deciding)
stay with the operator. What is served here is software and data, priced
on this property's own rate card.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER — three emptinesses never blend.

## Doors

- \`GET /loan-files\` — MISMO-typed loan-file records (branching collection; \`?purpose=<Purchase|Refinance>\`, \`?status=<loanStatus>\`)
- \`GET /loan-files/{id}\` — one loan file by id
- \`GET /market-records\` — HMDA-derived market records (\`?state=\`, \`?purpose=\`)
- \`POST /pipelines\` — auto-mint an anonymous sandbox loan pipeline (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /mcp\` — MCP door (JSON-RPC 2.0): the same nouns and verbs as HTTP
- \`GET /verify\` — run our tests: the public-contract checks, runnable by anyone
- \`POST /waitlist\` — the register for the ROADMAP surfaces (payoff/lien data, eNote/eVault control state, doc intelligence). Takes \`email\` (required), \`building\`, \`surface\` and \`volume\`, form-encoded or JSON, capped at 16KB. Stores every accepted submission durably and answers 201 with a receipt; refuses with a typed 422 carrying a cure when the reply address is missing or unusable, and with a 503 that says nothing was recorded if the store is unavailable. GET answers a typed 405: this door writes and never lists — no name on this list is published in any form.
- \`GET /healthz\` — liveness of the process; its \`callable\` member names what answers today.

## Pricing

Metered rate card with a declared hard ceiling. Settlement is a labeled
test-mode stub today: the 402 OFFER boundary is served, no charge is
collected, and the pricing document says so in its own \`statement\` member.

## Data classes

Market records are real: each is one aggregation row from the FFIEC HMDA
Data Browser API (public data), with the exact query URL and observation
date stamped on the record. Loan-file records are labeled example data
(\`"example": true\`) — MISMO-flavored synthetic files over fictional
lenders. Borrower personal data is not served on this face, in any class.

## Scope

This is the data, document and pipeline door of the mortgage substrate:
the loan file, the market record, the pipeline. The attested rows —
payoff/lien figures, eNote/eVault control state, doc intelligence — are
ROADMAP: each waits on named events (a written counsel opinion; a licensed
operator on the other side of it; for eNote, a signed eVault agreement)
and posts to the waitlist first. Loan origination, closing, and settlement
money movement are not served here — those are the operator's acts under
the operator's license.`

const HOME_MD = `# apis.mortgage

The headless mortgage system of record: the loan file, the market record
and the pipeline as typed, keyless doors. The licensed operator brings the
license; the software holds the record.

MISMO-typed loan-file records, HMDA-derived lender market records, and an
auto-minted sandbox loan pipeline over the mortgage substrate (NAICS 522292).

- Machine card: /.well-known/agents.json
- Contract: /openapi.json · Pricing: /pricing · Agents: /llms.txt
- Records: /loan-files · /market-records
- Sandbox: POST /pipelines · MCP: POST /mcp · Tests: /verify
- Waitlist for the ROADMAP rows (payoff/lien, eNote/eVault, doc intelligence): POST /waitlist

Market records are real (FFIEC HMDA Data Browser, query URL stamped on every
record). Loan-file records are labeled example data over fictional lenders.
Borrower personal data is not served on this face. Settlement is a labeled
test-mode stub — the 402 boundary is served, nothing is charged.`

/** The browser face is the crafted landing carried over from the
 * pre-cutover waitlist property (src/landing.html, embedded as
 * src/landing.js by scripts/embed-landing.mjs), reframed to the 2026-08-23
 * founder ruling: the software is the system of record; the licensed
 * operator brings the license. The api.insure cutover pattern: keep the
 * human page, add the machine-face footer row. */

/** The §5.1 B2A ladder, advertised whole on every 402 OFFER (`alternatives`):
 *  pay / work / claim from one boundary. Unwired rungs say so — stubs are
 *  labeled stubs, never live doors. */
export const LADDER_ALTERNATIVES = [
  {
    rung: 0,
    id: 'anon-sandbox',
    title: 'Anonymous sandbox — keyless and free',
    url: `${ORIGIN}/loan-files`,
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
    title: 'Claim: a human claims this agent pipeline (attribution → tenure)',
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
  { operation: 'searchLoanFiles', price: 0.0002, unit: 'USD/call', freeQuota: 1000, status: 'stub — test-mode, no live settlement' },
  { operation: 'getLoanFile', price: 0.0002, unit: 'USD/call', freeQuota: 1000, status: 'stub — test-mode, no live settlement' },
  { operation: 'listLenderMarketRecords', price: 0, unit: 'USD/call' },
  { operation: 'getPricing', price: 0, unit: 'USD/call' },
  { operation: 'getFamilyRegistry', price: 0, unit: 'USD/call' },
  { operation: 'getOffer', price: 0, unit: 'USD/call' },
]

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.mortgage',
  description:
    'The headless mortgage system of record: MISMO-typed loan-file records, HMDA-derived lender market records, and an auto-minted sandbox loan pipeline as typed, keyless doors over the mortgage substrate. The licensed operator brings the license; the software holds the record.',
  version: '0.1.0',

  collection: {
    path: '/loan-files',
    /** axp-ext/rates-g2 §1 — the branching collection's canonical operationId:
     *  the SAME identifier on the OpenAPI contract, the MCP door, and the
     *  rate-card key (the rates[] row above keys on it). */
    operationId: 'searchLoanFiles',
    memberName: 'results',
    summary: 'MISMO-typed loan-file records — typed OK | EMPTY | BLOCKED | OFFER, branching on the query',
    records: loanFiles,
    filters: ['purpose', 'status'],
    blockedScopes: ['borrower-pii', 'servicing'],
    match: (rec, param, value) =>
      param === 'purpose' ? rec.loanPurposeType === value : param === 'status' ? rec.loanStatus === value : false,
    emptyMessage: (param, value) =>
      `no loan-file records match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      scope === 'borrower-pii'
        ? 'borrower personal data is not served on this face, in any data class'
        : `scope '${scope}' is outside this property's data/document door — not served to your agent class`,
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
   *  (axp-ext/rates-g2 §1): the ONE cross-face operation name, passed through
   *  to the OpenAPI contract and shared with the MCP door and metering seams. */
  routes: [
    {
      method: 'GET',
      path: '/loan-files/{id}',
      operationId: 'getLoanFile',
      summary: 'One MISMO-typed loan-file record by id',
      responses: {
        200: { description: 'OK envelope with the record' },
        404: { description: 'EMPTY envelope — no record with that id' },
      },
    },
    {
      method: 'GET',
      path: '/market-records',
      operationId: 'listLenderMarketRecords',
      summary: 'HMDA-derived lender market records — real public data, query URL stamped on every record',
      params: [
        { name: 'state', description: 'filter by two-letter state code' },
        { name: 'purpose', description: 'filter by loan purpose (Home purchase | Refinancing)' },
      ],
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
      path: '/pipelines',
      operationId: 'createPipeline',
      summary:
        'Auto-mint an anonymous sandbox loan pipeline (keyless; ephemeral in wave zero — retention disclosed on mint)',
      responses: { 200: { description: 'OK envelope with the minted pipeline' } },
    },
    {
      method: 'GET',
      path: '/pipelines/{id}',
      operationId: 'getPipeline',
      summary: 'One pipeline — the LOS system-of-record door (headless ply)',
    },
    {
      method: 'GET',
      path: '/pipelines/{id}/loan-files',
      operationId: 'listPipelineLoanFiles',
      summary: 'Loan-file records in a pipeline',
    },
    {
      method: 'POST',
      path: '/pipelines/{id}/loan-files',
      operationId: 'addLoanFile',
      summary: 'Add a loan-file record to a pipeline (native binding — system of record)',
    },
    {
      method: 'POST',
      path: '/waitlist',
      operationId: 'joinWaitlist',
      summary:
        'Join the waitlist for the ROADMAP surfaces (payoff/lien, eNote/eVault, doc intelligence) — durable KV intake carried over from the pre-cutover property, receipt semantics preserved',
      responses: {
        201: { description: 'receipt — the submission was durably recorded' },
        405: { description: 'typed refusal — this door answers POST only and never lists' },
        413: { description: 'typed refusal — body over the 16KB cap; nothing recorded' },
        422: { description: 'typed refusal carrying a cure — reply address missing or unusable; nothing recorded' },
        503: { description: 'typed refusal — store unavailable; nothing recorded, said plainly' },
      },
    },
    {
      method: 'GET',
      path: '/healthz',
      operationId: 'getHealth',
      summary: 'Liveness of the process — the `callable` member names what answers today',
    },
  ],

  /** MCP tool names ARE the canonical operationIds (axp-ext/rates-g2 §1) —
   *  the same camelCase identifier as the OpenAPI contract, one operation,
   *  one name, every face. */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['searchLoanFiles', 'getLoanFile', 'listLenderMarketRecords', 'getPricing'],
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
  conformanceUrl: 'https://api.qa/apis.mortgage',

  family: [
    { name: 'apis.do', origin: 'https://apis.do', role: 'every service, one envelope — the managed implementation layer' },
    { name: 'apis.ax', origin: 'https://apis.ax', role: 'the agent-first API catalog (B2A register)' },
    { name: 'api.qa', origin: 'https://api.qa', role: 'independent conformance verifier' },
    { name: 'api.lawyer', origin: 'https://api.lawyer', role: 'AXP reference implementation' },
  ],

  home: { html: LANDING_HTML, md: HOME_MD },
})
