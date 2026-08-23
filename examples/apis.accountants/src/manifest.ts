/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/apis.accountants.json).
 *
 * The four estate extensions this example once bridged site-side (rate-card
 * `rates[]`, `links.verify`, per-route operationIds, the G2 card object) are
 * NATIVE generator inputs since axp-faces 0.2.0 (axp-ext-rates-g2@0.1.0,
 * ratified 2026-08-23) — declared here, validated fail-closed at
 * `defineSiteManifest`, emitted at the ruled placements. No wrappers remain.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { CLOSE_DELIVERABLES, RETENTION_NOTE } from './seed'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const ORIGIN = 'https://apis.accountants'

/**
 * The rate card rows (axp-ext-rates-g2@0.1.0 §2, native in the vendored
 * generator): TOP-LEVEL `rates[]` in the Pricing Document, one row per priced
 * operation, keyed by the canonical operationId (§1). Row law, enforced
 * fail-closed at defineSiteManifest: price is a finite number >= 0;
 * `freeQuota`, when present, is a number strictly > 0 (a zero or unlimited
 * quota is the row without it — a zero-price row IS the unlimited quota);
 * every operation ⊆ the operationIds this same manifest declares.
 */
export const RATES = [
  { operation: 'listCloseDeliverables', price: 0, unit: 'usd-per-call' },
  { operation: 'getCloseDeliverable', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'orderCloseDeliverable', price: 49, unit: 'usd-per-verified-deliverable', note: 'per-outcome row: price per completed, VERIFIED close deliverable — never per call; no free quota. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test-mode).' },
  { operation: 'listLedgers', price: 0, unit: 'usd-per-call' },
  { operation: 'getLedger', price: 0, unit: 'usd-per-call' },
  { operation: 'postEntry', price: 0, unit: 'usd-per-call' },
  { operation: 'listReturns', price: 0, unit: 'usd-per-call' },
  { operation: 'getReturn', price: 0, unit: 'usd-per-call' },
  { operation: 'listClients', price: 0, unit: 'usd-per-call' },
  { operation: 'listEngagements', price: 0, unit: 'usd-per-call' },
  { operation: 'createEngagement', price: 0, unit: 'usd-per-call' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every per-operation rate — and any free quota — is declared in the rates table; a zero-price row is free without quota.'

const llmsBody = `# apis.accountants — the functions an accounting firm's systems call

The accounting-tax substrate's developer face (B2D): ledgers, ten typed close
deliverables (trial balance → month-end), and year-keyed returns, served as
typed collections with OK | EMPTY | BLOCKED | OFFER envelopes.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data (a fictional firm,
"Meridian & Cole LLP (demo)", and three fictional SMB clients — two full
close cycles, internally consistent double-entry). ${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/close-deliverables                 # keyless first value — typed OK
curl "${ORIGIN}/close-deliverables?status=verified&period=2026-06"
curl ${ORIGIN}/ledgers                            # the Ledger noun (system-of-record door)
curl ${ORIGIN}/pricing                            # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed records) and the headless face (the Accounting system's
system-of-record door at coordinate ⟨accounting-firms⟩) are the SAME
collections, same envelopes, same rate-card rows — binding direction differs,
the surface does not. Writes (\`postEntry\`, \`createEngagement\`) land in an
ephemeral anonymous workspace, disclosed above.

## Ordering a close deliverable (outcome grain)

\`POST /close-deliverables/{id}/order\` answers the 402 OFFER boundary with the
rate card's per-outcome row and every alternative. ${PRICING_STATEMENT}
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'apis.accountants',
    description:
      "The functions an accounting firm's systems call — ledgers, ten typed close deliverables (trial balance → month-end), and year-keyed returns on the accounting-tax substrate.",
    version: '0.1.0',
    collection: {
      path: '/close-deliverables',
      // axp-ext-rates-g2 §1: the branching collection's canonical operationId
      // — the same string the MCP tool and the rate row carry.
      operationId: 'listCloseDeliverables',
      memberName: 'deliverables',
      summary: 'The close-deliverable collection — typed OK | EMPTY | BLOCKED, branching on status and period',
      records: CLOSE_DELIVERABLES,
      filters: ['status', 'period'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) =>
        `no close deliverables match ${param}=${value} — a truthful empty set, not an error`,
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
          id: 'metered-access',
          title: 'Self-serve metered access',
          price: { model: 'metered', hardCeiling: 100, unit: 'usd-per-month' },
          checkoutUrl: `${ORIGIN}/checkout`,
          alternatives: [
            {
              id: 'anon-sandbox',
              title: 'Anonymous sandbox (the free floor)',
              url: `${ORIGIN}/close-deliverables`,
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
    // axp-ext-rates-g2 §1 — native input: every route carries its canonical
    // camelCase operationId (route = MCP tool = suite reference = rate key),
    // passthrough into the OpenAPI contract, uniqueness enforced.
    routes: OPERATIONS.filter((o) => o.path !== '/close-deliverables')
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
    conformanceUrl: 'https://api.qa/apis.accountants',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there; agent-default candidate for the category',
        seams: [{ rel: 'substrate', description: 'same accounting-tax substrate, same operations, B2A onboarding (the proof-of-work ladder) instead of OAuth/card' }],
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
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/apis.accountants' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.accountants</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>apis.accountants</h1>
<p>The functions an accounting firm's systems call: ledgers, ten typed close deliverables (trial balance → month-end), and year-keyed returns.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/close-deliverables</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data (a fictional firm, Meridian &amp; Cole LLP (demo), and three fictional clients). ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# apis.accountants

The functions an accounting firm's systems call — same truth as the page, token-cheap.

- collection: ${ORIGIN}/close-deliverables (keyless)
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
