/**
 * manifest.ts — the ONE site manifest for the apis.productions projection of
 * the `media-entertainment` substrate (template spec §2, §4). Every machine
 * face — card, contract, pricing, llms.txt, collection — is generated from
 * this object by the vendored axp-faces generator; nothing is hand-rolled.
 *
 * Presence-when-true throughout: every route named here answers today in
 * src/worker.ts. interfaces.testSuite is deliberately NOT declared — see the
 * note at the bottom of this file.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { SUBSTRATE, ORIGIN, productions } from './substrate.ts'

const envelopeRef = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const jsonContent = (schema: unknown) => ({ 'application/json': { schema } })

/**
 * G2 coordinates (template §2; stake #6) — facts about who this projection
 * serves, no positioning, no claims. ONE truth, two ruled placements: carried
 * verbatim as the card's top-level `g2` object (axp-ext-rates-g2 §4) and
 * served at /icp.json (links.icp) by src/worker.ts.
 */
export const G2 = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  substrate: SUBSTRATE,
  projection: 'apis.productions',
  motion: 'B2A',
  icp: {
    companyType: 'first-party content operation (the studio itself)',
    jobTypes: ['producer', 'content lead', 'brand operator'],
  },
  personas: [
    { id: 'film-program-agent', class: 'machine', description: 'an agent operating a launch-film program against these records' },
    { id: 'deck-factory-agent', class: 'machine', description: 'an agent producing and releasing deck suites' },
    { id: 'content-operator', class: 'human', description: 'a producer or content lead reading the same records in a browser' },
  ],
} as const

const llmsBody = `# apis.productions — media & content records

Typed records for produced content — Production (schema.org/CreativeWork
grain), MediaAsset (schema.org/MediaObject grain), Page (the Content ply's
page record), and AudienceSignal (distribution-exhaust measurement) — served
as one AXP-conformant surface.

Every record on this origin is labeled example data: a synthetic sandbox
seed (each record carries \`example: true\` and a "[demo]" title prefix).
Nothing here is a live production record.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/productions              # keyless first value — a typed OK envelope
curl "${ORIGIN}/productions?kind=film"  # the collection branches on its query
curl ${ORIGIN}/productions/prod_0001    # one record by id
curl ${ORIGIN}/pricing                  # the Pricing Document (free)
curl ${ORIGIN}/verify                   # run our tests
\`\`\`

The MCP door is mounted at ${ORIGIN}/mcp (streamable HTTP; the same verbs as
the HTTP doors — one definition, two transports).
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.productions',
  description:
    'Typed media-and-content records — Production, MediaAsset, Page, AudienceSignal — one AXP surface: keyless branching collection over a labeled example-data seed, free Pricing Document, MCP door.',
  version: '0.1.0',

  // The one branching collection (Clauses 4 + 7 on one pathname).
  collection: {
    path: '/productions',
    // axp-ext-rates-g2 §1: the ONE cross-face name for the collection
    // operation — the same string as the MCP tool, the suite coverage
    // reference, and the rates[] key.
    operationId: 'listProductions',
    records: [...productions],
    memberName: 'results',
    summary: 'Production records (schema.org/CreativeWork grain) — typed OK | EMPTY | BLOCKED, branching on kind/status; every record is labeled example data',
    filters: ['kind', 'status'],
    blockedScopes: ['admin', 'internal'],
    match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
    emptyMessage: (param: string, value: string) =>
      `no productions match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope: string) =>
      `scope '${scope}' is reserved to the platform — not permitted for your agent class`,
  },

  // The no-ask-zone law, mechanical: free, with the binding axis declared
  // honestly — a stated intent, since no published terms document exists.
  // rates[] (axp-ext-rates-g2 §2, TOP-LEVEL in the Pricing Document): the
  // operationId-keyed rate card — scalar zero rows only, the one honest rate
  // card a free surface may publish (0.2.0 survey-floor law).
  pricing: {
    model: 'free',
    binding: false,
    statement:
      'Every door on this origin is free. This is a stated intent, not a bound term: no published terms document exists for this surface.',
    rates: [
      { operation: 'listProductions', price: 0, unit: 'usd-per-call' },
      { operation: 'getProduction', price: 0, unit: 'usd-per-call' },
      { operation: 'listAssets', price: 0, unit: 'usd-per-call' },
      { operation: 'listPages', price: 0, unit: 'usd-per-call' },
      { operation: 'createPage', price: 0, unit: 'usd-per-call' },
      { operation: 'listAudienceSignals', price: 0, unit: 'usd-per-call' },
    ],
  },

  // The MCP door — mounted at /mcp in src/worker.ts; same verbs as HTTP.
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['listProductions', 'getProduction', 'listAssets', 'listPages', 'createPage', 'listAudienceSignals'],
  },

  // G2 coordinates: native on the card as top-level `g2` (axp-ext-rates-g2
  // §4, verbatim) AND addressable at links.icp → /icp.json — both legal,
  // one truth (the G2 const above).
  g2: G2,
  icpUrl: `${ORIGIN}/icp.json`,

  // links.verify (axp-ext-rates-g2 §3): the published runnable-suite export —
  // the instrument beside the verdict (links.conformance).
  verifyUrl: '/verify',

  // Extra LIVE routes (all answer in src/worker.ts today). Every route
  // carries its canonical operationId (axp-ext-rates-g2 §1) — the one name
  // shared with the MCP tool registry, the suite coverage tags, and rates[].
  routes: [
    {
      method: 'GET',
      path: '/productions/{id}',
      operationId: 'getProduction',
      summary: 'One Production by id — 200 OK envelope; an unknown id answers 404 EMPTY',
      params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'OK envelope with the record', content: jsonContent(envelopeRef('OkEnvelope')) },
        404: { description: 'EMPTY envelope — no record with this id', content: jsonContent(envelopeRef('EmptyEnvelope')) },
      },
    },
    {
      method: 'GET',
      path: '/assets',
      operationId: 'listAssets',
      summary: 'MediaAsset records (schema.org/MediaObject grain) — filterable by productionId and role',
      params: [{ name: 'productionId' }, { name: 'role' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'GET',
      path: '/pages',
      operationId: 'listPages',
      summary: 'Page records (the Content ply) — filterable by productionId; includes sandbox-created pages',
      params: [{ name: 'productionId' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'POST',
      path: '/pages',
      operationId: 'createPage',
      summary:
        'createPage — the headless system-of-record door (CMS ply) on the same collection. Sandbox writes are ephemeral (per-isolate memory, discarded on isolate recycle) and the created record says so',
      requestBody: {
        required: true,
        content: jsonContent({
          type: 'object',
          required: ['slug', 'title', 'body'],
          properties: { slug: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, productionId: { type: 'string' } },
        }),
      },
      responses: {
        201: { description: 'OK envelope with the created (labeled, ephemeral) record', content: jsonContent(envelopeRef('OkEnvelope')) },
        400: { description: 'BLOCKED envelope — the body failed validation', content: jsonContent(envelopeRef('BlockedEnvelope')) },
      },
    },
    {
      method: 'GET',
      path: '/audience-signals',
      operationId: 'listAudienceSignals',
      summary: 'AudienceSignal records — unordered usage counts from distribution exhaust; no ranking implied',
      params: [{ name: 'productionId' }, { name: 'period' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'GET',
      path: '/icp.json',
      operationId: 'getIcp',
      summary: 'G2 coordinates — the ICP and persona classes this projection serves (JSON-LD)',
      responses: { 200: { description: 'the ICP document', content: jsonContent({ type: 'object' }) } },
    },
    {
      method: 'GET',
      path: '/verify',
      operationId: 'getVerify',
      summary: 'Run our tests — the published public-contract suite and how to run it against this origin',
      responses: { 200: { description: 'the verify document', content: jsonContent({ type: 'object' }) } },
    },
    {
      method: 'GET',
      path: '/verify/suite.json',
      operationId: 'getVerifySuite',
      summary: 'The api.qa/suite@1 declarative suite document — exact pinned bytes; the digest is printed by /verify',
      responses: { 200: { description: 'the suite document', content: jsonContent({ type: 'object' }) } },
    },
    {
      method: 'GET',
      path: '/offer',
      operationId: 'getOffer',
      summary:
        'Payable stub — always answers a typed 402 OFFER labeled as a stub. Nothing on this origin is billable today (see /pricing: free); no billing exists behind this door',
      responses: {
        402: { description: 'OFFER envelope (labeled stub)', content: jsonContent(envelopeRef('OfferEnvelope')) },
      },
    },
  ],

  llms: { body: llmsBody },

  // Family registry: the register's sibling names for this substrate
  // (apis.photos, apis.photography) serve nothing today — presence-when-true
  // keeps them out until they answer.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.productions</title></head>
<body>
<h1>apis.productions</h1>
<p>Typed media-and-content records — Production, MediaAsset, Page, AudienceSignal — served as one AXP-conformant surface.</p>
<p>Every record on this origin is labeled example data (a synthetic sandbox seed); nothing here is a live production record.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> · <a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# apis.productions

Typed media-and-content records — same truth as the page, token-cheap.
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
 * tool and the POST createPage door; the declarative api.qa/suite@1 dialect
 * is GET/HEAD-only, so those capabilities cannot be honestly covered by it.
 * The suite is still published and runnable at /verify (omission is full
 * conformance — A.8.5). Declaration lands when either the vitest@1 runner is
 * live verifier-side or the GET-only surface is the whole declared surface.
 */
