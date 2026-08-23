/**
 * manifest.ts — the ONE `defineSiteManifest()` input for api.careers: every
 * machine face (card, openapi, pricing, llms.txt, family registry, home) is
 * generated from this manifest by the vendored axp-faces generator at the
 * PINS.json digest — never hand-rolled.
 *
 * Known generator gaps at axp-faces 0.1.0, recorded (filed upstream, never
 * patched around locally):
 *   1. the Pricing Document has no top-level `rates[]` member (DRAFT §2 wire
 *      schema) — the operationId-keyed rate card rides pricing.offers[0].rates
 *      (offers pass through their members verbatim) until the generator
 *      carries rates natively;
 *   2. manifest.routes entries do not pass `operationId` through to the
 *      OpenAPI paths — the substrate's operation ids are the authority
 *      (./substrate.ts) and the property test suite enforces
 *      rates[].operation ⊆ substrate operation ids;
 *   3. the generated card has no `links.verify` member — /verify is declared
 *      as a live GET route (it lands in interfaces.http) and cross-linked
 *      from llms.txt.
 */

// @ts-ignore — vendored byte-identical JS (PINS.json digest-checked); never edited here
import { defineSiteManifest } from './axp/index.js'
import { staffingTalent } from './substrate.ts'
import { apiCareersProjection } from './projection.ts'
import { placements, SEED_LABEL } from './seed.ts'

export const ORIGIN = 'https://api.careers'

/** The operationId-keyed rate card — every row has freeQuota or a zero price. */
export const rates = [
  { operation: 'listPlacements', price: 0, note: 'free reads of the branching collection' },
  { operation: 'getPlacement', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createPlacement', price: 0.02, unit: 'usd-per-call', freeQuota: 25 },
  { operation: 'listCandidates', price: 0 },
  { operation: 'getCandidate', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createCandidate', price: 0.02, unit: 'usd-per-call', freeQuota: 25 },
  { operation: 'listJobOrders', price: 0 },
  { operation: 'getJobOrder', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createJobOrder', price: 0.02, unit: 'usd-per-call', freeQuota: 25 },
  { operation: 'listOccupations', price: 0, note: 'O*NET-SOC vocabulary is free G1 reference data' },
  { operation: 'getOccupation', price: 0 },
] as const

const llmsBody = `# api.careers — the careers object an agent calls to get a placement

Staffing & talent placement (NAICS 5613) as a payable machine face. Candidate
and Placement records are typed by O*NET-SOC — the G1 standard itself — and
the placement record carries a 90-day-validatable outcome.

## Quickstart (keyless — the anon sandbox is the floor)

\`\`\`sh
curl ${ORIGIN}/placements                     # typed OK envelope, labeled example data
curl ${ORIGIN}/placements?status=completed    # branching on the query
curl ${ORIGIN}/occupations                    # O*NET-SOC vocabulary excerpt (real G1 reference data)
curl ${ORIGIN}/pricing                        # the Pricing Document (test mode; binding: false)
curl -X POST ${ORIGIN}/candidates -H 'content-type: application/json' \\
  -d '{"name":"Vesper Corven","onetCode":"15-1252.00"}'   # auto-mints an ephemeral workspace
\`\`\`

## What is real and what is example data

Occupation records are a real excerpt of O*NET-SOC 29.0 (U.S. Department of
Labor, CC BY 4.0). Candidate, JobOrder, and Placement seed records are
synthetic example data, labeled \`"example": true\` on every record — the
sandbox is the real product over simulated data, never a faked demo.

## The B2A ladder

This face onboards agents, not accounts: no OAuth, no credit card. The anon
sandbox is free and keyless. The 402 OFFER boundary (GET /offer) advertises
the whole ladder in one place — pay (metered, test mode today), work (earned
credits via proof-of-work), claim (a human claims your workspace). Settlement
is not active on this deployment; 402 responses are typed boundaries served
as labeled stubs and no billing occurs.

## Verify, don't trust

GET /verify lists the runnable suites for this property, including the
digest-pinned AXP conformance gate (apis-ax-axp@2.6.0).
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'api.careers',
  description:
    'Staffing & talent placement as a payable machine face: O*NET-typed Candidate and Placement records, job orders, and the O*NET-SOC occupation vocabulary — anon sandbox floor, typed envelopes, agent-first (B2A) onboarding.',
  version: '0.1.0',

  // Clauses 4 + 7 on one pathname: keyless OK, knownEmpty ×2, knownForbidden ×2.
  collection: {
    path: '/placements',
    memberName: 'placements',
    summary: 'Placements — the branching typed collection (O*NET-typed, 90-day-validatable outcomes; labeled example seed)',
    records: [...placements],
    filters: ['status', 'occupation'],
    match: (rec: Record<string, unknown>, param: string, value: string) =>
      param === 'occupation' ? String(rec.onetCode) === value : String(rec[param]) === value,
    blockedScopes: ['admin', 'internal'],
  },

  pricing: {
    model: 'metered',
    hardCeiling: 25,
    unit: 'usd-per-month',
    price: 0.002,
    binding: false,
    statement:
      'Test mode: this rate card is a stated intent, not bound terms. Settlement is not active on this deployment — 402 responses are typed offer boundaries served as labeled stubs and no billing occurs. Keyless sandbox reads are free within the published quotas.',
    offers: [
      {
        id: 'metered-access',
        title: 'Metered access (test mode — settlement not active)',
        price: { model: 'metered', hardCeiling: 25, unit: 'usd-per-month' },
        stub: true,
        alternatives: [
          {
            id: 'pay-402',
            title: 'Pay per call (stub — settlement not active)',
            description:
              '402 metering against machine identity (id.org.ai) once settlement activates; served today as a labeled stub — no billing occurs.',
            price: { model: 'metered', hardCeiling: 25, unit: 'usd-per-month' },
          },
          {
            id: 'work-earned-credits',
            title: 'Earn credits via proof-of-work (stub)',
            description:
              'credits earned by completing published tasks — the B2A ladder rung above the anon sandbox; the credit ledger is not wired in this deployment.',
          },
          {
            id: 'claim-workspace',
            title: 'Human claims this workspace (stub)',
            description:
              'a human claims the agent-minted workspace for attribution and longer tenure; the claim door is not wired in this deployment.',
          },
        ],
        rates,
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  // Live extra routes — presence-when-true: every path here answers in worker.ts.
  routes: [
    { method: 'GET', path: '/placements/{id}', summary: 'Get one placement (typed envelope; 404 EMPTY when the id was never minted)' },
    { method: 'POST', path: '/placements', summary: 'Record a placement — headless ATS door; keyless calls auto-mint an ephemeral sandbox workspace', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['candidateId', 'jobOrderId', 'onetCode'], properties: { candidateId: { type: 'string' }, jobOrderId: { type: 'string' }, onetCode: { type: 'string' }, startDate: { type: 'string' }, feeModel: { type: 'string' } } } } } }, responses: { 201: { description: 'OK envelope with the minted record, workspace id, and retention disclosure' }, 400: { description: 'BLOCKED envelope — missing required members' } } },
    { method: 'GET', path: '/candidates', summary: 'List candidates (O*NET-typed skills; labeled example seed + your workspace records)', params: [{ name: 'status', description: 'filter by candidate status' }, { name: 'occupation', description: 'filter by O*NET-SOC code' }] },
    { method: 'GET', path: '/candidates/{id}', summary: 'Get one candidate' },
    { method: 'POST', path: '/candidates', summary: 'Create a candidate — headless ATS door; keyless calls auto-mint an ephemeral sandbox workspace', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name', 'onetCode'], properties: { name: { type: 'string' }, onetCode: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } }, metro: { type: 'string' } } } } } }, responses: { 201: { description: 'OK envelope with the minted record, workspace id, and retention disclosure' }, 400: { description: 'BLOCKED envelope — missing required members' } } },
    { method: 'GET', path: '/job-orders', summary: 'List job orders', params: [{ name: 'status', description: 'filter by job-order status' }, { name: 'occupation', description: 'filter by O*NET-SOC code' }] },
    { method: 'GET', path: '/job-orders/{id}', summary: 'Get one job order' },
    { method: 'POST', path: '/job-orders', summary: 'Create a job order — headless ATS door; keyless calls auto-mint an ephemeral sandbox workspace', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['client', 'title', 'onetCode'], properties: { client: { type: 'string' }, title: { type: 'string' }, onetCode: { type: 'string' }, billRateUsdHour: { type: 'number' } } } } } }, responses: { 201: { description: 'OK envelope with the minted record, workspace id, and retention disclosure' }, 400: { description: 'BLOCKED envelope — missing required members' } } },
    { method: 'GET', path: '/occupations', summary: 'List the O*NET-SOC occupation vocabulary excerpt — real G1 reference data (U.S. DOL, CC BY 4.0)' },
    { method: 'GET', path: '/occupations/{id}', summary: 'Get one O*NET-SOC occupation by code' },
    { method: 'GET', path: '/icp.json', summary: 'G2 coordinates of this projection: ICP company/job types, personas, motion, agent classes' },
    { method: 'GET', path: '/verify', summary: 'The published runnable suites for this property — the /verify export' },
  ],

  // MCP door — mounted at /mcp in worker.ts; same nouns/verbs, one definition.
  // Tools are declared BY NAME (the verifier's card parser reads string
  // entries); descriptions + input schemas are served live by tools/list.
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: staffingTalent.operations.map((op) => op.id),
  },

  llms: { body: llmsBody },

  icpUrl: `${ORIGIN}/icp.json`,

  family: [
    {
      name: 'apis.do',
      origin: 'https://apis.do',
      role: 'sibling estate face — the API gateway',
      seams: [{ rel: 'sibling', description: 'one estate; a substrate may be projected by more than one face, non-exclusively' }],
    },
  ],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>api.careers</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1.25rem;color:#111}h1{font-size:1.6rem}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .35rem}pre{padding:.75rem;overflow-x:auto}small{color:#555}</style></head>
<body>
<h1>api.careers</h1>
<p>The careers object an agent calls to get a placement. Candidate and Placement records typed by O*NET-SOC — the standard itself.</p>
<pre>curl ${ORIGIN}/placements</pre>
<p>Keyless. Typed envelopes. The sandbox is the real product over clearly labeled example data.</p>
<p>Machine faces: <code>/llms.txt</code> · <code>/.well-known/agents.json</code> · <code>/openapi.json</code> · <code>/pricing</code> · <code>/verify</code></p>
<small>Seed records are synthetic example data (labeled). Occupation vocabulary: O*NET-SOC 29.0 excerpt, U.S. Department of Labor, CC BY 4.0.</small>
</body></html>
`,
    md: `# api.careers

The careers object an agent calls to get a placement. Candidate and Placement records typed by O*NET-SOC.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
- collection: ${ORIGIN}/placements

Seed records are synthetic example data (labeled \`"example": true\`). Occupation vocabulary is a real O*NET-SOC 29.0 excerpt (U.S. DOL, CC BY 4.0).
`,
  },
})

/** Guardrail input (§5.3): the seed label every published example record carries. */
export { SEED_LABEL }
