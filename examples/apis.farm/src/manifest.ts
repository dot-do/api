/**
 * manifest.ts — the ONE site manifest for the apis.farm projection of the
 * `agriculture-food` substrate (template spec §2, §4). Every machine face —
 * card, contract, pricing, llms.txt, collection — is generated from this
 * object by the vendored axp-faces generator; nothing is hand-rolled. The
 * four ruled estate extensions the generator does not carry yet (rates[],
 * card g2, links.verify, per-route operationIds) are bridged in src/axp.ts —
 * EXACTLY there, never patched into the vendored files.
 *
 * Presence-when-true throughout: every route named here answers today in
 * src/worker.ts. interfaces.testSuite is deliberately NOT declared — see the
 * note at the bottom of this file.
 */

import { defineSiteManifest } from './axp-faces/index.js'
import { ORIGIN, RAIL, lots } from './substrate.ts'

const envelopeRef = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const jsonContent = (schema: unknown) => ({ 'application/json': { schema } })

const llmsBody = `# apis.farm — the functions a food producer's systems call

Typed records for the agriculture-and-food vertical — TraceabilityLot
(FSMA-204 KDE grain, riding the EPCIS rail), Product (GTIN-identified),
Facility (GLN-identified), and ComplianceArtifact (FSMA-204 deliverables) —
served as one AXP-conformant surface.

The traceability EVENT grain is not here by design: EPCIS events live on the
rail (${RAIL}); lot records here carry \`cteRefs\` that reference rail
events. One rail, two rows.

Every record on this origin is labeled example data: a synthetic sandbox
seed (each record carries \`example: true\`, a "[demo]" name prefix, and GS1
demo-prefix-952 identifiers). Nothing here is a live lot, product, facility,
or filing.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/lots                       # keyless first value — a typed OK envelope
curl "${ORIGIN}/lots?status=received"     # the collection branches on its query
curl ${ORIGIN}/lots/lot_0003              # one lot — chain-of-custody via inputLotIds + cteRefs
curl ${ORIGIN}/pricing                    # the Pricing Document (free; rates[] per operation)
curl ${ORIGIN}/verify                     # run our tests
\`\`\`

The MCP door is mounted at ${ORIGIN}/mcp (streamable HTTP, authless at the
anon-sandbox rung; the same verbs as the HTTP doors — one definition, two
transports).
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'apis.farm',
  description:
    'Typed agriculture-and-food records — TraceabilityLot (FSMA-204 grain via the EPCIS rail), Product, Facility, ComplianceArtifact — one AXP surface: keyless branching collection over a labeled example-data seed, free Pricing Document with per-operation rates, MCP door.',
  version: '0.1.0',

  // The one branching collection (Clauses 4 + 7 on one pathname).
  collection: {
    path: '/lots',
    records: [...lots],
    memberName: 'results',
    summary:
      'TraceabilityLot records (FSMA-204 KDE grain; EPCIS events referenced on the rail, never re-served here) — typed OK | EMPTY | BLOCKED, branching on status/gtin; every record is labeled example data',
    filters: ['status', 'gtin'],
    blockedScopes: ['admin', 'internal'],
    match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
    emptyMessage: (param: string, value: string) =>
      `no lots match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope: string) =>
      `scope '${scope}' is reserved to the platform — not permitted for your agent class`,
  },

  // The no-ask-zone law, mechanical: free, with the binding axis declared
  // honestly — a stated intent, since no published terms document exists.
  // src/axp.ts extends the served document with the ruled rates[] member
  // (every operation priced from zero, freeQuota unlimited).
  pricing: {
    model: 'free',
    binding: false,
    statement:
      'Every door on this origin is free. This is a stated intent, not a bound term: no published terms document exists for this surface.',
  },

  // The MCP door — mounted at /mcp in src/worker.ts; same verbs as HTTP.
  // Authless: the only mounted rung is the anon sandbox (bearer-key arrives
  // with the first rung above it, per the estate MCP auth ruling).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['listLots', 'getLot', 'listProducts', 'registerProduct', 'listFacilities', 'listComplianceArtifacts'],
  },

  // G2 coordinates document (card links.icp; card-top-level g2 is bridged in src/axp.ts).
  icpUrl: `${ORIGIN}/icp.json`,

  // Extra LIVE routes (all answer in src/worker.ts today).
  routes: [
    {
      method: 'GET',
      path: '/lots/{id}',
      summary: 'One TraceabilityLot by id — 200 OK envelope; an unknown id answers 404 EMPTY. Chain-of-custody walks inputLotIds; EPCIS events dereference at the rail via cteRefs',
      params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'OK envelope with the record', content: jsonContent(envelopeRef('OkEnvelope')) },
        404: { description: 'EMPTY envelope — no record with this id', content: jsonContent(envelopeRef('EmptyEnvelope')) },
      },
    },
    {
      method: 'GET',
      path: '/products',
      summary: 'Product records (GTIN-identified, GS1 demo prefix 952) — filterable by ftl and category; includes sandbox-registered products',
      params: [{ name: 'ftl' }, { name: 'category' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'POST',
      path: '/products',
      summary:
        'registerProduct — the headless system-of-record door (master-data ply) on the same collection. Sandbox writes are ephemeral (per-isolate memory, discarded on isolate recycle), demand the GS1 demo prefix 952 with a valid check digit, and the created record says so',
      requestBody: {
        required: true,
        content: jsonContent({
          type: 'object',
          required: ['gtin', 'name', 'category'],
          properties: {
            gtin: { type: 'string', description: 'GTIN-13, sandbox demands demo prefix 952 with a valid check digit' },
            name: { type: 'string' },
            category: { type: 'string' },
            ftl: { type: 'boolean' },
          },
        }),
      },
      responses: {
        201: { description: 'OK envelope with the created (labeled, ephemeral) record', content: jsonContent(envelopeRef('OkEnvelope')) },
        400: { description: 'BLOCKED envelope — the body failed validation or the GTIN violates sandbox fixture law', content: jsonContent(envelopeRef('BlockedEnvelope')) },
      },
    },
    {
      method: 'GET',
      path: '/facilities',
      summary: 'Facility records (GLN-identified, GS1 demo prefix 952) — filterable by role',
      params: [{ name: 'role' }],
      responses: {
        200: { description: 'OK or EMPTY envelope', content: jsonContent({ oneOf: [envelopeRef('OkEnvelope'), envelopeRef('EmptyEnvelope')] }) },
      },
    },
    {
      method: 'GET',
      path: '/compliance-artifacts',
      summary: 'ComplianceArtifact records — FSMA-204 deliverables (traceability plan, sortable sheet) derived from the lot chain; filterable by kind and facilityGln',
      params: [{ name: 'kind' }, { name: 'facilityGln' }],
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

  // Family registry: the register's sibling name for this substrate
  // (gigs.farm) serves nothing today — presence-when-true keeps it out
  // until it answers.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.farm</title></head>
<body>
<h1>apis.farm</h1>
<p>Typed agriculture-and-food records — TraceabilityLot (FSMA-204 grain), Product, Facility, ComplianceArtifact — served as one AXP-conformant surface. EPCIS events live on the rail (epcis.dev); lot records here reference them.</p>
<p>Every record on this origin is labeled example data (a synthetic sandbox seed with GS1 demo-prefix-952 identifiers); nothing here is a live lot, product, facility, or filing.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> · <a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# apis.farm

Typed agriculture-and-food records — same truth as the page, token-cheap.
EPCIS events live on the rail (epcis.dev); lot records here reference them.
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
 * WHY interfaces.testSuite IS NOT DECLARED (deliberate, not an omission —
 * and per the batch rollup it stays undeclared until digest-pinned AND the
 * coverage story is honest): declaring it arms TWO strictly-judged checks at
 * apis-ax-axp@2.6.0 — check-published-test-suite AND check-capability-coverage
 * (A.8.7). Coverage demands a PASSING suite row per declared capability,
 * including every MCP tool and the POST registerProduct door; the declarative
 * api.qa/suite@1 dialect is GET/HEAD-only, so those capabilities cannot be
 * honestly covered by it. The suite is still published and runnable at
 * /verify (omission is full conformance — A.8.5), and card links.verify
 * names it. Declaration lands when either the vitest@1 runner is live
 * verifier-side or the GET-only surface is the whole declared surface.
 */
