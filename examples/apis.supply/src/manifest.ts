/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/apis.supply.json).
 *
 * Estate extensions the vendored generator does not carry yet (rate-card
 * `rates[]`, `links.verify`, per-route operationIds, G2 card exposure) are
 * applied as wrappers in ./axp.ts — never by editing the vendored files.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { PURCHASE_ORDERS, RETENTION_NOTE } from './seed'
import { OPERATIONS } from './substrate'

export const ORIGIN = 'https://apis.supply'

/**
 * The rate card rows (DRAFT §2 estate extension, spec §4/§10.3): every row
 * names its free quota or prices from zero; operations ⊆ OpenAPI operationIds
 * (enforced by tests/apis-supply.test.ts).
 */
export const RATES = [
  { operation: 'listPurchaseOrders', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getPurchaseOrder', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'submitPurchaseOrder', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited', note: 'sandbox door: writes land in an ephemeral anonymous workspace' },
  { operation: 'matchPurchaseOrder', price: 0.25, unit: 'usd-per-verified-match', freeQuota: 0, note: 'per-outcome row: price per completed, VERIFIED three-way match (850 ↔ 856 ↔ 810) — never per call. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test-mode).' },
  { operation: 'listShipNotices', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getShipNotice', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'listInvoices', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getInvoice', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'listCatalogItems', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getCatalogItem', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'quoteLandedCost', price: 0.01, unit: 'usd-per-quote', freeQuota: 50, note: 'sandbox serves a labeled demo formula (synthetic freight/duty factors), not real rates' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every free quota is declared per operation in the rates table.'

const llmsBody = `# apis.supply — the functions a distributor's systems call

The wholesale-distribution substrate's developer face (B2D): the X12 document
rail — 850-typed purchase orders, 856-typed advance ship notices, 810-typed
invoices — plus the GTIN/UNSPSC-keyed catalog and landed-cost quotes, served
as typed collections with OK | EMPTY | BLOCKED | OFFER envelopes.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data (a fictional distributor,
"Harborline Distribution Co (demo)", and three fictional trading partners —
complete 850 → 856 → 810 document flows with internally consistent
quantities and totals, one deliberate short-ship variance, GS1 demo prefix
952 with valid check digits). ${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/purchase-orders                    # keyless first value — typed OK
curl "${ORIGIN}/purchase-orders?status=matched&partner=p-cobblepine"
curl ${ORIGIN}/catalog-items                      # the GTIN/UNSPSC-keyed catalog
curl ${ORIGIN}/pricing                            # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed X12 document records) and the headless face (the
OrderManagement/EDI-pipeline system-of-record door at coordinate
⟨wholesale-distribution⟩) are the SAME collections, same envelopes, same
rate-card rows — binding direction differs, the surface does not. Writes
(\`submitPurchaseOrder\`) land in an ephemeral anonymous workspace, disclosed
above. The document rail rides the transactions.dev germ (agent-native EDI,
documents captured first-party, consent-at-rail).

## Ordering a verified three-way match (outcome grain)

\`POST /purchase-orders/{id}/match\` answers the 402 OFFER boundary with the
rate card's per-outcome row and every alternative. ${PRICING_STATEMENT}
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'apis.supply',
    description:
      "The functions a distributor's systems call — the X12 850/856/810 document rail, the GTIN/UNSPSC-keyed catalog, and landed-cost quotes on the wholesale-distribution substrate.",
    version: '0.1.0',
    collection: {
      path: '/purchase-orders',
      memberName: 'purchaseOrders',
      summary: 'The purchase-order collection (X12 850-typed) — typed OK | EMPTY | BLOCKED, branching on status and partner',
      records: PURCHASE_ORDERS,
      filters: ['status', 'partner'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) =>
        `no purchase orders match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope: string) =>
        `scope '${scope}' is tenant-scoped — not permitted for an anonymous agent class`,
    },
    pricing: {
      model: 'metered',
      hardCeiling: 100,
      unit: 'usd-per-month',
      price: 0.002,
      binding: false,
      statement: PRICING_STATEMENT,
      offers: [
        {
          id: 'metered-access',
          title: 'Self-serve metered access',
          price: { model: 'metered', hardCeiling: 100, unit: 'usd-per-month' },
          checkoutUrl: `${ORIGIN}/checkout`,
          alternatives: [
            {
              id: 'anon-sandbox',
              title: 'Anonymous sandbox (the free floor)',
              url: `${ORIGIN}/purchase-orders`,
              note: 'keyless, labeled example data; every free quota declared in the rate card',
            },
            {
              id: 'oauth-free-tier',
              title: 'GitHub OAuth free tier',
              url: `${ORIGIN}/login`,
              note: 'DEMO MODE until OAuth credentials are configured: keys are random, unpersisted, and not yet enforced — anonymous use is free',
            },
          ],
        },
      ],
      offerPath: '/offer',
      spendParam: 'spend',
    },
    routes: OPERATIONS.filter((o) => !(o.method === 'GET' && o.path === '/purchase-orders'))
      .map((o) => ({
        method: o.method,
        path: o.path,
        summary: o.summary,
      }))
      .concat([
        { method: 'GET', path: '/icp.json', summary: 'G2 coordinates: ICP (CompanyType × JobTypes), personas, and the System coordinate this substrate serves' },
        { method: 'GET', path: '/verify', summary: 'Run our tests — the published public-contract suite for this surface' },
        { method: 'GET', path: '/checkout', summary: 'The checkout seam — a labeled stub until the settlement rail is activated (no charge can occur)' },
        // /login and /callback are served (labeled demo mode) but deliberately
        // not declared as contract routes: a redirect door is a flow, not a
        // probeable 200-OK endpoint (the card's http entries may be probed).
      ]),
    llms: { body: llmsBody },
    // presence-when-true: the MCP door IS mounted in this worker (@dotdo/api
    // mcpConvention at /mcp) — same nouns/verbs as HTTP, one definition.
    // Auth per the ruled ladder: authless at the anon-sandbox rung (the only
    // rung served today); bearer-key arrives with the rungs above.
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: 'http',
      tools: OPERATIONS.map((o) => o.operation),
    },
    icpUrl: `${ORIGIN}/icp.json`,
    conformanceUrl: 'https://api.qa/apis.supply',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there; agent-default candidate for the category',
        seams: [{ rel: 'substrate', description: 'same wholesale-distribution substrate, same operations, B2A onboarding (the proof-of-work ladder) instead of OAuth/card' }],
      },
      {
        name: 'transactions.dev',
        origin: 'https://transactions.dev',
        role: 'the agent-native EDI germ — the first-party document rail this property\'s X12 850/856/810 corpus rides (consent-at-rail)',
        seams: [{ rel: 'source-route', description: 'owned-by-construction document capture: the enrichment ladder starts at this rail' }],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/apis.supply' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.supply</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>apis.supply</h1>
<p>The functions a distributor's systems call: the X12 850/856/810 document rail (purchase orders, ship notices, invoices), the GTIN/UNSPSC-keyed catalog, and landed-cost quotes.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/purchase-orders</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data (a fictional distributor, Harborline Distribution Co (demo), and three fictional trading partners; GS1 demo prefix 952). ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# apis.supply

The functions a distributor's systems call — same truth as the page, token-cheap.

- collection: ${ORIGIN}/purchase-orders (keyless)
- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing (rate card): ${ORIGIN}/pricing
- icp (G2 coordinates): ${ORIGIN}/icp.json
- run our tests: ${ORIGIN}/verify

Sandbox data is labeled synthetic example data. ${RETENTION_NOTE}
${PRICING_STATEMENT}
`
}
