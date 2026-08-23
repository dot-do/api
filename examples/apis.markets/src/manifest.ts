/**
 * manifest.ts — the ONE site manifest for the apis.markets projection of the
 * `capital-markets` substrate (template spec §2, §4). Every machine face —
 * card, contract, pricing, llms.txt, collection — is generated from this
 * object by the vendored axp-faces generator; nothing is hand-rolled.
 *
 * RULED BRIDGE PLACEMENTS (batch-2 rollup, binding until the upstream
 * axp-faces re-vendor lands — applied in src/worker.ts, never by editing the
 * vendored generator):
 *   1. `rates[]` rides TOP-LEVEL in the Pricing Document (RATES below);
 *   2. `g2` rides TOP-LEVEL on the capability card (G2 below);
 *   3. `links.verify` rides as a card link member;
 *   4. `operationId` on every OpenAPI route (OPERATION_IDS below — the
 *      generator's route normalizer drops unknown route members, so the ids
 *      are grafted onto the built document).
 *
 * Presence-when-true throughout: every route named here answers today in
 * src/worker.ts. interfaces.testSuite is deliberately NOT declared — see the
 * note at the bottom of this file.
 */

// @ts-ignore — vendored byte-identical JS (PINS.json digest-checked); never edited here
import { defineSiteManifest } from './axp-faces/index.js'
import { ORIGIN, instruments } from './substrate.ts'

const envelopeRef = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const jsonContent = (schema: unknown) => ({ 'application/json': { schema } })

/** Ruled bridge 1 — the operationId-keyed rate card, top-level in the served
 *  Pricing Document. Model is free: every row prices from zero (§5.1 —
 *  "every rate row names its free quota or prices from zero"). Operations
 *  reference the BRIDGED OpenAPI operationIds (rates[].operation ⊆
 *  operationIds, §9.1); `listCollection` is the branching /instruments door
 *  (substrate operation listInstruments) until the re-vendor passes
 *  operationId through. */
export const RATES = [
  { operation: 'listCollection', price: 0, note: 'the keyless branching /instruments collection (substrate operation listInstruments)' },
  { operation: 'getInstrument', price: 0 },
  { operation: 'listQuotes', price: 0 },
  { operation: 'listPositions', price: 0 },
  { operation: 'getPosition', price: 0 },
  { operation: 'recordPosition', price: 0, note: 'the PMS system-of-record door; sandbox writes are ephemeral' },
  { operation: 'listPostTradeDocuments', price: 0 },
] as const

/** Ruled bridge 2 — the G2 coordinates carried top-level on the card (same
 *  truth as /icp.json). */
export const G2 = {
  icp: {
    companyType: 'broker-dealers, RIAs, fund administrators, family offices',
    jobTypes: ['operations manager', 'middle-office systems owner', 'portfolio operations analyst'],
  },
  personas: [
    { id: 'market-data-pull-agent', class: 'machine', description: 'an agent pulling reference, market, and position records — a data puller, never a trader' },
    { id: 'post-trade-recon-agent', class: 'machine', description: 'an agent reconciling positions against post-trade documents' },
    { id: 'middle-office-operator', class: 'human', description: 'an operations or middle-office systems owner reading the same records in a browser' },
  ],
} as const

/** Ruled bridge 4 — operationId per (method, path); grafted onto the built
 *  OpenAPI document in src/worker.ts. The generator already stamps its own
 *  doors (listCollection, getPricing). */
export const OPERATION_IDS: Record<string, string> = {
  'GET /instruments/{id}': 'getInstrument',
  'GET /quotes': 'listQuotes',
  'GET /positions': 'listPositions',
  'GET /positions/{id}': 'getPosition',
  'POST /positions': 'recordPosition',
  'GET /post-trade-documents': 'listPostTradeDocuments',
  'GET /icp.json': 'getICP',
  'GET /verify': 'getVerify',
  'GET /verify/suite.json': 'getVerifySuite',
  'GET /offer': 'getOfferStub',
}

const llmsBody = `# apis.markets — securities & capital-markets records

Typed records for the capital-markets cell (NAICS 523) — Instrument
(reference data), Quote (end-of-session reference quotes), Position (the PMS
system-of-record grain), and PostTradeDocument (confirmations, statements) —
served as one AXP-conformant surface.

Scope, permanent: execution and custody are OUT OF SCOPE. No door here
places, routes, amends, or cancels an order, and none holds assets. Agents at
this face are data pullers, never traders.

Every record on this origin is labeled example data: a synthetic sandbox
seed (each record carries \`example: true\`, ZZ-prefixed demo symbols, no
real issuer/ticker/ISIN). Nothing here is a live market record.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/instruments                    # keyless first value — a typed OK envelope
curl "${ORIGIN}/instruments?assetClass=bond"  # the collection branches on its query
curl ${ORIGIN}/instruments/ins_0001           # one record by id
curl ${ORIGIN}/positions                      # position records (PMS grain)
curl ${ORIGIN}/pricing                        # the Pricing Document (free; rates[] from zero)
curl ${ORIGIN}/verify                         # run our tests
\`\`\`

The MCP door is mounted at ${ORIGIN}/mcp (streamable HTTP, keyless — the anon
sandbox is the only rung mounted today; the same verbs as the HTTP doors —
one definition, two transports).

apis.trading, apis.investments, and apis.broker are sub-audience rails of
THIS property (content within it, not separate brands); they serve nothing
today and so are linked nowhere (presence-when-true).
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.markets',
  description:
    'Typed securities and capital-markets records — Instrument, Quote, Position, PostTradeDocument — one AXP surface: keyless branching collection over a labeled example-data seed, free Pricing Document with a zero-priced rate card, MCP door. Execution and custody permanently out of scope.',
  version: '0.1.0',

  // The one branching collection (Clauses 4 + 7 on one pathname).
  collection: {
    path: '/instruments',
    records: [...instruments],
    memberName: 'results',
    summary:
      'Instrument reference records (schema.org/FinancialProduct grain) — typed OK | EMPTY | BLOCKED, branching on assetClass/status; every record is labeled example data with a synthetic ZZ-prefixed symbol',
    filters: ['assetClass', 'status'],
    blockedScopes: ['admin', 'internal'],
    match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
    emptyMessage: (param: string, value: string) => `no instruments match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope: string) => `scope '${scope}' is reserved to the platform — not permitted for your agent class`,
  },

  // The no-ask-zone law, mechanical: free, binding axis declared honestly.
  // The ruled top-level rates[] bridge rides on the served document
  // (src/worker.ts); the generator's own free-model document is unchanged.
  pricing: {
    model: 'free',
    binding: false,
    statement:
      'Every door on this origin is free (every rate row prices from zero). This is a stated intent, not a bound term: no published terms document exists for this surface.',
  },

  // The MCP door — mounted at /mcp in src/worker.ts; same verbs as HTTP.
  // Keyless: the anon sandbox is the only ladder rung mounted at wave zero,
  // so no bearer tier is declared (advertise only mounted rungs).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['listInstruments', 'getInstrument', 'listQuotes', 'listPositions', 'getPosition', 'recordPosition', 'listPostTradeDocuments'],
  },

  // G2 coordinates on the card (links.icp) — served at /icp.json.
  icpUrl: `${ORIGIN}/icp.json`,

  // Extra LIVE routes (all answer in src/worker.ts today).
  routes: [
    {
      method: 'GET',
      path: '/instruments/{id}',
      summary: 'One Instrument by id — 200 OK envelope; an unknown id answers 404 EMPTY',
      params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'OK envelope with the record', content: jsonContent(envelopeRef('OkEnvelope')) },
        404: { description: 'EMPTY envelope — no record with this id', content: jsonContent(envelopeRef('EmptyEnvelope')) },
      },
    },
    {
      method: 'GET',
      path: '/quotes',
      summary: 'End-of-session reference Quote records — filterable by instrumentId and session; never an execution feed',
      params: [{ name: 'instrumentId' }, { name: 'session' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'GET',
      path: '/positions',
      summary: 'Position records (PMS system-of-record grain) — filterable by accountId and instrumentId; includes sandbox-recorded positions',
      params: [{ name: 'accountId' }, { name: 'instrumentId' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'GET',
      path: '/positions/{id}',
      summary: 'One Position by id — 200 OK envelope; an unknown id answers 404 EMPTY',
      params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'OK envelope with the record', content: jsonContent(envelopeRef('OkEnvelope')) },
        404: { description: 'EMPTY envelope — no record with this id', content: jsonContent(envelopeRef('EmptyEnvelope')) },
      },
    },
    {
      method: 'POST',
      path: '/positions',
      summary:
        'recordPosition — the PMS system-of-record door on the same collection: records an already-held position snapshot. RECORDING, NEVER EXECUTION — no order is placed and no asset moves. Sandbox writes are ephemeral (per-isolate memory, discarded on isolate recycle) and the created record says so',
      requestBody: {
        required: true,
        content: jsonContent({
          type: 'object',
          required: ['accountId', 'instrumentId', 'quantity', 'costBasis'],
          properties: {
            accountId: { type: 'string' },
            instrumentId: { type: 'string' },
            quantity: { type: 'number' },
            costBasis: { type: 'number' },
            asOf: { type: 'string' },
          },
        }),
      },
      responses: {
        201: { description: 'OK envelope with the recorded (labeled, ephemeral) record', content: jsonContent(envelopeRef('OkEnvelope')) },
        400: { description: 'BLOCKED envelope — the body failed validation', content: jsonContent(envelopeRef('BlockedEnvelope')) },
      },
    },
    {
      method: 'GET',
      path: '/post-trade-documents',
      summary: 'PostTradeDocument records (confirmations, statements) — the read-only OMS-side post-trade door; filterable by kind and accountId',
      params: [{ name: 'kind' }, { name: 'accountId' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'GET',
      path: '/icp.json',
      summary: 'G2 coordinates — the ICP and persona classes this projection serves (JSON-LD)',
      responses: { 200: { description: 'the ICP document', content: jsonContent({ type: 'object' }) } },
    },
    {
      method: 'GET',
      path: '/verify',
      summary: 'Run our tests — the published public-contract suite and how to run it against this origin',
      responses: { 200: { description: 'the verify document', content: jsonContent({ type: 'object' }) } },
    },
    {
      method: 'GET',
      path: '/verify/suite.json',
      summary: 'The api.qa/suite@1 declarative suite document — exact pinned bytes; the digest is printed by /verify',
      responses: { 200: { description: 'the suite document', content: jsonContent({ type: 'object' }) } },
    },
    {
      method: 'GET',
      path: '/offer',
      summary:
        'Payable stub — always answers a typed 402 OFFER labeled as a stub. Nothing on this origin is billable today (see /pricing: free); no billing exists behind this door',
      responses: {
        402: { description: 'OFFER envelope (labeled stub)', content: jsonContent(envelopeRef('OfferEnvelope')) },
      },
    },
  ],

  llms: { body: llmsBody },

  // Family registry: the property's sub-audience rails (apis.trading,
  // apis.investments, apis.broker) are content WITHIN this property, and
  // serve nothing today — presence-when-true keeps them out until they
  // answer.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.markets</title></head>
<body>
<h1>apis.markets</h1>
<p>Typed securities and capital-markets records — Instrument, Quote, Position, PostTradeDocument — served as one AXP-conformant surface.</p>
<p>Execution and custody are permanently out of scope: no door here places an order or holds an asset. Agents at this face are data pullers, never traders.</p>
<p>Every record on this origin is labeled example data (a synthetic sandbox seed); nothing here is a live market record.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> · <a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# apis.markets

Typed securities and capital-markets records — same truth as the page, token-cheap.
Execution and custody are permanently out of scope; data pullers, never traders.
Every record on this origin is labeled example data (synthetic sandbox seed).

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
})

/*
 * WHY interfaces.testSuite IS NOT DECLARED (deliberate, not an omission):
 * declaring it arms TWO strictly-judged checks at apis-ax-axp@2.6.0 —
 * check-published-test-suite AND check-capability-coverage (A.8.7). Coverage
 * demands a PASSING suite row per declared capability, including every MCP
 * tool and the POST recordPosition door; the declarative api.qa/suite@1
 * dialect is GET/HEAD-only, so those capabilities cannot be honestly covered
 * by it. The suite is still published and runnable at /verify (omission is
 * full conformance — A.8.5). Declaration lands when either the vitest@1
 * runner is live verifier-side or the GET-only surface is the whole declared
 * surface — and stays undeclared until digest-pinned (batch-2 rollup rule).
 */
