/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/api.holdings.json).
 *
 * Estate extensions the vendored generator does not carry yet (rate-card
 * `rates[]`, `links.verify`, per-route operationIds, G2 card exposure) are
 * applied as wrappers in ./axp.ts — never by editing the vendored files.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { RENEWALS, RETENTION_NOTE } from './seed'
import { OPERATIONS } from './substrate'

export const ORIGIN = 'https://api.holdings'

/**
 * The rate card rows (DRAFT §2 estate extension, spec §10.3): every row names
 * its free quota or prices from zero; operations ⊆ OpenAPI operationIds
 * (enforced by tests/api-holdings.test.ts).
 */
export const RATES = [
  { operation: 'listRenewals', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getRenewal', price: 0.001, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'orderRenewalFiling', price: 99, unit: 'usd-per-verified-filing', freeQuota: 0, note: 'per-outcome row: price per completed, VERIFIED renewal filing (the apply/renew transaction layer), exclusive of government/registry fees — never per call. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test-mode).' },
  { operation: 'listEntities', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getEntity', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createEntity', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'listFormations', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getFormation', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'listRegistrations', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'getRegistration', price: 0.001, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'listBOIReports', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'listRegisteredAgents', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
  { operation: 'listOwnershipStakes', price: 0, unit: 'usd-per-call', freeQuota: 'unlimited' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every free quota is declared per operation in the rates table.'

const llmsBody = `# api.holdings — the rail an agent calls to act on holdings and entities

The holdings-corporate-mgmt substrate's developer face (B2D): unified entity
records, typed formation / registration / BOI-status / registered-agent
records, the renewal/compliance calendar, and the ownership structure as
typed edges — served as typed collections with OK | EMPTY | BLOCKED | OFFER
envelopes.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data (a fictional holding
structure, "Northgate Holdings LLC (demo)", and three fictional subsidiaries
across DE / TX / US-federal obligations). ${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/renewals                       # keyless first value — typed OK
curl "${ORIGIN}/renewals?status=due&jurisdiction=DE"
curl ${ORIGIN}/entities                       # the unified entity records
curl ${ORIGIN}/pricing                        # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed registration/filing records) and the headless face (the
entity back-office system-of-record door, registration module) are the SAME
collections, same envelopes, same rate-card rows — binding direction differs,
the surface does not. Writes (\`createEntity\`) land in an ephemeral anonymous
workspace, disclosed above.

## Ordering a renewal filing (outcome grain)

\`POST /renewals/{id}/order\` answers the 402 OFFER boundary with the rate
card's per-outcome row and every alternative. ${PRICING_STATEMENT}
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'api.holdings',
    description:
      'The rail an agent calls to act on holdings and entities — unified entity records, formation/registration/BOI/registered-agent records, the renewal calendar, and ownership structure on the holdings-corporate-mgmt substrate.',
    version: '0.1.0',
    collection: {
      path: '/renewals',
      memberName: 'renewals',
      summary: 'The renewal/compliance-calendar collection — typed OK | EMPTY | BLOCKED, branching on status and jurisdiction',
      records: RENEWALS,
      filters: ['status', 'jurisdiction'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) =>
        `no renewals match ${param}=${value} — a truthful empty set, not an error`,
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
              url: `${ORIGIN}/renewals`,
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
    routes: OPERATIONS.filter((o) => o.path !== '/renewals')
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
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: 'http',
      tools: OPERATIONS.map((o) => o.operation),
    },
    icpUrl: `${ORIGIN}/icp.json`,
    conformanceUrl: 'https://api.qa/api.holdings',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there; agent-default candidate for the category',
        seams: [{ rel: 'substrate', description: 'same holdings-corporate-mgmt substrate, same operations, B2A onboarding (the proof-of-work ladder) instead of OAuth/card' }],
      },
      {
        name: 'api.lawyer',
        origin: 'https://api.lawyer',
        role: 'sibling vertical property (legal) — the AXP reference implementation',
        seams: [],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/api.holdings' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>api.holdings</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>api.holdings</h1>
<p>The rail an agent calls to act on holdings and entities: unified entity records, formation / registration / BOI-status / registered-agent records, the renewal calendar, and ownership structure as typed edges.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/renewals</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data (a fictional holding structure, Northgate Holdings LLC (demo), and three fictional subsidiaries). ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# api.holdings

The rail an agent calls to act on holdings and entities — same truth as the page, token-cheap.

- collection: ${ORIGIN}/renewals (keyless)
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
