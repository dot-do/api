/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/api.cleaning.json).
 *
 * The four estate extension members (rate-card `rates[]`, `links.verify`,
 * per-route operationIds, the G2 card object) are NATIVE generator inputs
 * (axp-ext-rates-g2@0.2.0, vendored at axp-faces 0.3.0 — the survey floor):
 * declared here, validated fail-closed at `defineSiteManifest`, emitted at
 * the ruled placements. No site-side wrappers or bridges.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { WORK_ORDERS, RETENTION_NOTE } from './seed'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const ORIGIN = 'https://api.cleaning'

/**
 * The rate card rows (axp-ext-rates-g2 §2, native in the vendored generator):
 * TOP-LEVEL `rates[]` in the Pricing Document, one row per priced operation,
 * keyed by the canonical operationId (§1). Row law, enforced fail-closed at
 * defineSiteManifest: price is a finite number >= 0; `freeQuota`, when
 * present, is a number strictly > 0 (a zero-price row IS the unlimited
 * quota); every operation ⊆ the operationIds this same manifest declares.
 */
export const RATES = [
  { operation: 'listWorkOrders', price: 0, unit: 'usd-per-call' },
  { operation: 'getWorkOrder', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createWorkOrder', price: 0, unit: 'usd-per-call' },
  { operation: 'dispatchWorkOrder', price: 19, unit: 'usd-per-dispatched-work-order', note: 'per dispatched work order, never per call. LABELED STUB at wave zero: the supply-side dispatch rail is not yet built and the settlement rail is not activated — the 402 OFFER boundary is served, no dispatch occurs and no charge can occur (test-mode).' },
  { operation: 'logServiceVisit', price: 0, unit: 'usd-per-call' },
  { operation: 'listServiceVisits', price: 0, unit: 'usd-per-call' },
  { operation: 'listSchedules', price: 0, unit: 'usd-per-call' },
  { operation: 'getSchedule', price: 0, unit: 'usd-per-call' },
  { operation: 'createSchedule', price: 0, unit: 'usd-per-call' },
  { operation: 'listVendors', price: 0, unit: 'usd-per-call' },
  { operation: 'getVendor', price: 0, unit: 'usd-per-call' },
  { operation: 'listFacilities', price: 0, unit: 'usd-per-call' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every per-operation rate — and any free quota — is declared in the rates table; a zero-price row is free without quota.'

const llmsBody = `# api.cleaning — the rail an agent calls to get cleaning

The facilities-services substrate's agent-first face (B2A): work orders,
service visits, recurring-service schedules, building-services vendors, and
facilities, served as typed collections with OK | EMPTY | BLOCKED | OFFER
envelopes.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data (a fictional workspace,
"Harborview Facilities Group (demo)": three vendors across janitorial /
landscaping / pest control, three facilities, five recurring schedules, two
full service periods of work orders). The first-party capture rail this row's
source route names is not yet built — nothing here is claimed as real data.
${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/work-orders                        # keyless first value — typed OK
curl "${ORIGIN}/work-orders?status=completed&service=janitorial"
curl ${ORIGIN}/schedules                          # the recurring-service grain
curl ${ORIGIN}/pricing                            # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed work-order / visit / schedule records) and the headless
face (the FSM system's system-of-record door at coordinate
⟨building-services⟩, plus the Scheduler rail for recurring booking) are the
SAME collections, same envelopes, same rate-card rows — binding direction
differs, the surface does not. Writes (\`createWorkOrder\`, \`createSchedule\`,
\`logServiceVisit\`) land in an ephemeral anonymous workspace, disclosed above.

## The B2A ladder

Onboarding is the proof-of-work ladder, never OAuth or a card on file:
anon sandbox (this floor) → earned credits (.ax ledger) → human-claimed →
paid (402 metering on machine identity). Every 402 OFFER advertises all
three doors (pay / work / claim) in its \`alternatives\`. ${PRICING_STATEMENT}
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'api.cleaning',
    description:
      'The rail an agent calls to get cleaning — work orders, service visits, recurring-service schedules, vendors, and facilities on the facilities-services substrate.',
    version: '0.1.0',
    collection: {
      path: '/work-orders',
      // axp-ext-rates-g2 §1: the branching collection's canonical operationId
      // — the same string the MCP tool and the rate row carry.
      operationId: 'listWorkOrders',
      memberName: 'workOrders',
      summary: 'The work-order collection — typed OK | EMPTY | BLOCKED, branching on status, service, and period',
      records: WORK_ORDERS,
      filters: ['status', 'service', 'period'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) =>
        `no work orders match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope: string) =>
        `scope '${scope}' is tenant-scoped — not permitted for an anonymous agent class`,
    },
    pricing: {
      model: 'metered',
      hardCeiling: 100,
      unit: 'usd-per-month',
      price: 0.002,
      // axp-ext-rates-g2 §2 — native input: TOP-LEVEL rates[] in the served
      // Pricing Document (the ruled placement), validated fail-closed.
      rates: RATES as unknown as Record<string, unknown>[],
      binding: false,
      statement: PRICING_STATEMENT,
      offers: [
        {
          id: 'metered-402',
          title: 'Metered access (B2A paid rung — 402 metering on machine identity)',
          price: { model: 'metered', hardCeiling: 100, unit: 'usd-per-month' },
          checkoutUrl: `${ORIGIN}/checkout`,
          // The whole B2A ladder in one place (spec §5.1): pay / work / claim.
          alternatives: [
            {
              id: 'anon-sandbox',
              title: 'Anonymous sandbox (the free floor — rung 0)',
              url: `${ORIGIN}/work-orders`,
              note: 'keyless, labeled example data; every free quota declared in the rate card; disclosed ephemeral retention',
            },
            {
              id: 'earned-credits',
              title: 'Work: earned .ax-ledger credits (rung 1)',
              url: 'https://ledger.apis.ax/',
              note: 'proof-of-work route (#17): credits earned via tasks and object generations, spent here; machine identity via id.org.ai — never OAuth, never a card',
            },
            {
              id: 'human-claimed',
              title: 'Claim: a human claims this agent workspace (rung 2)',
              url: `${ORIGIN}/llms.txt`,
              note: 'attribution → longer tenure; claiming is documented on the face — no account UI lives on this property (spec §7.4)',
            },
          ],
        },
      ],
      offerPath: '/offer',
      spendParam: 'spend',
    },
    // axp-ext-rates-g2 §1 — native input: every route carries its canonical
    // camelCase operationId (route = MCP tool = suite reference = rate key),
    // passthrough into the OpenAPI contract, uniqueness enforced.
    routes: OPERATIONS.filter((o) => !(o.path === '/work-orders' && o.method === 'GET'))
      .map((o) => ({
        method: o.method,
        path: o.path,
        operationId: o.operation,
        summary: o.summary,
      }))
      .concat([
        { method: 'GET', path: '/icp.json', operationId: 'getIcp', summary: 'G2 coordinates: ICP (CompanyType × JobTypes), personas, and the System coordinate this substrate serves' },
        { method: 'GET', path: '/verify', operationId: 'getVerify', summary: 'Run our tests — the published public-contract suite for this surface' },
        { method: 'GET', path: '/checkout', operationId: 'getCheckout', summary: 'The checkout seam — a labeled stub until the settlement rail is activated (no charge can occur)' },
      ]),
    llms: { body: llmsBody },
    // presence-when-true: the MCP door IS mounted in this worker (@dotdo/api
    // mcpConvention at /mcp) — same nouns/verbs as HTTP, one definition.
    // The MCP door is authless AT THE SANDBOX RUNG ONLY; rungs above the
    // floor are keyed (the B2A ladder), and no keyed rung is declared until
    // it is mounted (mounted-rungs-only).
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: 'http',
      tools: OPERATIONS.map((o) => o.operation),
    },
    icpUrl: `${ORIGIN}/icp.json`,
    // axp-ext-rates-g2 §3 — native input: links.verify on the card, beside
    // links.conformance (the verdict) and links.icp (independent, kept).
    verifyUrl: `${ORIGIN}/verify`,
    // axp-ext-rates-g2 §4 — native input: the row's G2/ICP coordinates as a
    // TOP-LEVEL card object, carried verbatim (stake #6); /icp.json remains
    // the full document.
    g2: {
      icp: icp.icp,
      personas: icp.personas,
      systems: substrate.systems,
    },
    conformanceUrl: 'https://api.qa/api.cleaning',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there',
        seams: [{ rel: 'substrate', description: 'same facilities-services substrate, same operations; the universal agent-first register face' }],
      },
      {
        name: 'api.repair',
        origin: 'https://api.repair',
        role: 'sibling vertical (repair-field-services) — the other lens of the (811, 5617) FSM span; the shared work-order record type awaits a primacy ruling (collision recorded, nothing shared claimed)',
        seams: [],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/api.cleaning' }],
      },
    ],
    home: {
      html: homeHtml(),
      md: homeMd(),
    },
  })
}

function homeHtml(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>api.cleaning</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>api.cleaning</h1>
<p>The rail an agent calls to get cleaning: work orders, service visits, recurring-service schedules, building-services vendors, and facilities.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/work-orders</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data (a fictional workspace, Harborview Facilities Group (demo), fictional vendors and facilities). The first-party capture rail is not yet built — nothing here is real data. ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# api.cleaning

The rail an agent calls to get cleaning — same truth as the page, token-cheap.

- collection: ${ORIGIN}/work-orders (keyless)
- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing (rate card): ${ORIGIN}/pricing
- icp (G2 coordinates): ${ORIGIN}/icp.json
- run our tests: ${ORIGIN}/verify

Sandbox data is labeled synthetic example data (the capture rail is not yet built). ${RETENTION_NOTE}
${PRICING_STATEMENT}
`
}
