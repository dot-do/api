/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/apis.shop.json).
 *
 * Estate extensions the vendored generator does not carry yet (rate-card
 * `rates[]` top-level on the Pricing Document, card `links.verify`, card `g2`,
 * per-route operationIds) are applied as wrappers in ./axp.ts — never by
 * editing the vendored files — at the ruled placements, until the upstream
 * re-vendor lands.
 *
 * Ladder rule (batch ruling): the 402 OFFER advertises only MOUNTED rungs.
 * At wave zero the only mounted rung is the anonymous sandbox — the
 * earned-credits and human-claimed rungs are recorded in the projection
 * config as deferred, and deliberately NOT advertised here.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { PRODUCTS, RETENTION_NOTE, SEED_LABEL } from './seed'
import { OPERATIONS } from './substrate'

export const ORIGIN = 'https://apis.shop'

/**
 * The rate card rows (DRAFT §2 estate extension): every row names its free
 * quota or prices from zero; operations ⊆ OpenAPI operationIds (enforced by
 * tests/apis-shop.test.ts).
 */
export const RATES = [
  { operation: 'listProducts', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getProduct', price: 0.001, unit: 'usd-per-call', freeQuota: 250 },
  { operation: 'createProduct', price: 0.005, unit: 'usd-per-call', freeQuota: 50 },
  { operation: 'resolveDigitalLink', price: 0.001, unit: 'usd-per-call', freeQuota: 250, note: 'the identity spine: GS1 Digital Link + the 4-lens GTIN/GPC/UNSPSC/HTS crosswalk' },
  { operation: 'listOffers', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getOffer', price: 0.001, unit: 'usd-per-call', freeQuota: 250 },
  { operation: 'createOffer', price: 0.005, unit: 'usd-per-call', freeQuota: 50 },
  { operation: 'listOrders', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getOrder', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createOrder', price: 0.02, unit: 'usd-per-call', freeQuota: 25, note: 'order capture at the commerce rail — metered per captured order. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test mode).' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Test mode: this rate card is a stated intent, not bound terms — settlement is not active on this deployment, 402 responses are typed offer boundaries served as labeled stubs, and no billing occurs. Keyless sandbox reads are free within the published quotas.'

const llmsBody = `# apis.shop — the functions a shop's systems call

The retail-ecommerce substrate (NAICS 44-45 ex-441) as a payable machine
face: Product / Offer / Order records on the schema.org commerce grain with
GS1 GTIN identity, plus GS1 Digital Link resolution and the 4-lens product
identity crosswalk (GTIN / GPC / UNSPSC / HTS) — typed collections with
OK | EMPTY | BLOCKED | OFFER envelopes.

The anonymous sandbox is the floor: every collection answers keyless, seeded
with clearly-labeled synthetic example data (fictional merchants, GTINs in
the GS1 demo-952 space with valid check digits). Merchant product feeds are
Class B (agreements) — until they land, the whole catalog is labeled
synthetic. ${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/products                            # keyless first value — typed OK
curl "${ORIGIN}/products?category=pantry"
curl ${ORIGIN}/digital-links/9520001001012         # GS1 Digital Link + crosswalk
curl ${ORIGIN}/offers                              # price + availability per GTIN
curl ${ORIGIN}/pricing                             # the rate card (per-operation rates)
curl -X POST ${ORIGIN}/orders -H 'content-type: application/json' \\
  -d '{"lines":[{"gtin":"9520001001012","quantity":1}]}'   # the agents-as-buyers door
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed Product/Offer/Order records) and the headless face (the
OMS/storefront system-of-record doors at coordinates ⟨online-retailers⟩ and
⟨multichannel-merchants, marketplace-sellers⟩) are the SAME collections, same
envelopes, same rate-card rows — binding direction differs, the surface does
not. Writes land in an ephemeral anonymous workspace, disclosed above.

## Onboarding (B2A)

This face onboards agents, not accounts: no OAuth, no credit card. The
anonymous sandbox is free and keyless — it is the only ladder rung mounted
today, and the only one advertised (rungs are advertised only once they are
mounted). MCP at /mcp is authless on the sandbox rung; a bearer key becomes
required on rungs above it when they mount. ${PRICING_STATEMENT}

## Verify, don't trust

GET /verify names the runnable public-contract suites for this property,
including the digest-pinned AXP conformance gate (apis-ax-axp@2.6.0).
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'apis.shop',
    description:
      "The functions a shop's systems call — Product, Offer, and Order records on the schema.org commerce grain with GS1 GTIN identity, Digital Link resolution, and the 4-lens product identity crosswalk, on the retail-ecommerce substrate.",
    version: '0.1.0',
    collection: {
      path: '/products',
      memberName: 'products',
      summary: 'The product collection — typed OK | EMPTY | BLOCKED, branching on category and brand; GTIN-identified',
      records: PRODUCTS,
      filters: ['category', 'brand'],
      blockedScopes: ['merchant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) => `no products match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope: string) => `scope '${scope}' is merchant-scoped — not permitted for an anonymous agent class`,
    },
    pricing: {
      model: 'metered',
      hardCeiling: 25,
      unit: 'usd-per-month',
      price: 0.001,
      binding: false,
      statement: PRICING_STATEMENT,
      offers: [
        {
          id: 'metered-access',
          title: 'Metered access (test mode — settlement not active)',
          price: { model: 'metered', hardCeiling: 25, unit: 'usd-per-month' },
          stub: true,
          alternatives: [
            {
              id: 'anon-sandbox',
              title: 'Anonymous sandbox (the free floor — the only rung mounted today)',
              url: `${ORIGIN}/products`,
              note: `keyless, labeled example data; every free quota declared in the rate card. ${RETENTION_NOTE}`,
            },
            // Ladder rule: earned-credits / human-claimed rungs are NOT
            // advertised until mounted (see ../projections/apis.shop.json).
          ],
        },
      ],
      offerPath: '/offer',
      spendParam: 'spend',
    },
    routes: OPERATIONS.filter((o) => o.path !== '/products' || o.method !== 'GET')
      .map((o) => ({
        method: o.method,
        path: o.path,
        summary: o.summary,
      }))
      .concat([
        { method: 'GET', path: '/icp.json', summary: 'G2 coordinates: ICP (CompanyType × JobTypes), personas, and the System coordinates this substrate serves' },
        { method: 'GET', path: '/verify', summary: 'Run our tests — the published public-contract suite for this surface' },
      ]),
    llms: { body: llmsBody },
    // presence-when-true: the MCP door IS mounted in this worker (@dotdo/api
    // mcpConvention at /mcp) — same nouns/verbs as HTTP, one definition.
    // Auth policy (batch ruling): authless on the anon-sandbox rung (all that
    // is mounted today); bearer-key on rungs above once they mount.
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: 'http',
      tools: OPERATIONS.map((o) => o.operation),
    },
    icpUrl: `${ORIGIN}/icp.json`,
    conformanceUrl: 'https://api.qa/apis.shop',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there',
        seams: [{ rel: 'substrate', description: 'same retail-ecommerce substrate, same operations; the universal agent-first register face' }],
      },
      {
        name: 'api.forsale',
        origin: 'https://api.forsale',
        role: 'adjacent live commerce rail (BUILT) — the horizontal Offer/Order sell rail the row names as the actual entry',
        seams: [{ rel: 'rail', description: 'the Offer/Order grain enters horizontally via the sell/commerce rails; this vertical face and that rail share the record grain' }],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/apis.shop' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.shop</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>apis.shop</h1>
<p>The functions a shop's systems call: Product, Offer, and Order records on the schema.org commerce grain with GS1 GTIN identity, Digital Link resolution, and the 4-lens product identity crosswalk (GTIN / GPC / UNSPSC / HTS).</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/products</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data: fictional merchants (Bramble &amp; Vale Mercantile (demo) and friends), GTINs in the GS1 demo-952 space with valid check digits. ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# apis.shop

The functions a shop's systems call — same truth as the page, token-cheap.

- collection: ${ORIGIN}/products (keyless)
- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing (rate card): ${ORIGIN}/pricing
- icp (G2 coordinates): ${ORIGIN}/icp.json
- run our tests: ${ORIGIN}/verify

Sandbox data is labeled synthetic example data (${SEED_LABEL}). ${RETENTION_NOTE}
${PRICING_STATEMENT}
`
}
