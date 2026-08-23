/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces 0.3.0 `defineSiteManifest`, axp-ext-rates-g2@0.2.0 —
 * the survey floor), assembled from the G3 substrate (./substrate.ts), the
 * §5.2 seed corpus (./seed.ts), and the served G4 projection
 * (../projections/api.repair.json).
 *
 * The four estate extension members are NATIVE generator inputs (no
 * site-side bridges, per the batch watch list): top-level `rates[]` in the
 * Pricing Document, `links.verify` on the card, the top-level `g2` card
 * object, and per-route canonical operationIds (route = MCP tool = suite
 * reference = rate key), all validated fail-closed at `defineSiteManifest`.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { RETENTION_NOTE, WORK_ORDERS } from './seed'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const ORIGIN = 'https://api.repair'

/**
 * The rate card rows (axp-ext-rates-g2@0.2.0 §2, native): TOP-LEVEL
 * `rates[]`, one row per operation, keyed by the canonical operationId.
 * B2A 402-metered-per-call: reads of THE record are metered above a free
 * quota; list reads are free; system-of-record writes are metered above a
 * smaller quota. Every row has freeQuota or a zero price.
 */
export const RATES = [
  { operation: 'listWorkOrders', price: 0, unit: 'usd-per-call', note: 'free reads of the branching collection' },
  { operation: 'getWorkOrder', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createWorkOrder', price: 0.02, unit: 'usd-per-call', freeQuota: 25 },
  { operation: 'completeWorkOrder', price: 0.02, unit: 'usd-per-call', freeQuota: 25 },
  { operation: 'listEstimates', price: 0, unit: 'usd-per-call' },
  { operation: 'getEstimate', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'approveEstimate', price: 0.02, unit: 'usd-per-call', freeQuota: 25 },
  { operation: 'listInspectionReports', price: 0, unit: 'usd-per-call' },
  { operation: 'getInspectionReport', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Test mode: this rate card is a stated intent, not bound terms. Settlement is not active on this deployment — 402 responses are typed offer boundaries served as labeled stubs and no billing occurs. Keyless sandbox reads are free within the published quotas.'

const llmsBody = `# api.repair — the rail an agent calls to get repair

Repair & field services (NAICS 811 ex-8111: electronics, commercial
machinery, personal & household goods) as a payable machine face: THE work
order, its estimate, and its inspection report — typed collections with
OK | EMPTY | BLOCKED | OFFER envelopes. Entry is the record, not the truck.

The anonymous sandbox is the floor: every collection answers keyless, seeded
with clearly-labeled synthetic example data (three fictional operators — one
per NAICS subsector — with full work-order lifecycles, internally consistent
estimate totals, and 952-prefixed demo asset tags). ${RETENTION_NOTE}

## Quickstart (keyless — the anon sandbox is the floor)

\`\`\`sh
curl ${ORIGIN}/work-orders                          # keyless first value — typed OK
curl "${ORIGIN}/work-orders?status=completed&repairClass=appliance"
curl ${ORIGIN}/estimates                            # line-item estimates
curl ${ORIGIN}/inspection-reports                   # the condition record
curl ${ORIGIN}/pricing                              # the rate card (per-operation rates)
curl -X POST ${ORIGIN}/work-orders -H 'content-type: application/json' \\
  -d '{"operatorId":"op-juniper","unit":"chest freezer","complaint":"not holding temp"}'
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed work-order / estimate / inspection-report records) and
the headless face (the FSM system-of-record door at coordinate
⟨repair-field-services⟩) are the SAME collections, same envelopes, same
rate-card rows — binding direction differs, the surface does not. Writes
(\`createWorkOrder\`, \`completeWorkOrder\`, \`approveEstimate\`) land in an
ephemeral anonymous workspace, disclosed above.

## The B2A ladder

This face onboards agents, not accounts: no OAuth, no credit card. The anon
sandbox is free and keyless. The 402 OFFER boundary (GET /offer) advertises
the whole ladder in one place — pay (metered against machine identity, test
mode today), work (credits earned via proof-of-work), claim (a human claims
your workspace). ${PRICING_STATEMENT}

## Verify, don't trust

GET /verify names the runnable public-contract suite for this surface,
including the digest-pinned AXP conformance gate (apis-ax-axp@2.6.0).
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'api.repair',
    description:
      'The rail an agent calls to get repair — THE work order, its estimate, and its inspection report for NAICS 811 ex-8111 (electronics, commercial machinery, appliance repair), on the repair-field-services substrate.',
    version: '0.1.0',
    collection: {
      path: '/work-orders',
      // axp-ext-rates-g2 §1: the branching collection's canonical operationId
      // — the same string the MCP tool and the rate row carry.
      operationId: 'listWorkOrders',
      memberName: 'workOrders',
      summary: 'The work-order collection — typed OK | EMPTY | BLOCKED, branching on status and repairClass',
      records: WORK_ORDERS as unknown as Record<string, unknown>[],
      filters: ['status', 'repairClass'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) =>
        `no work orders match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope: string) =>
        `scope '${scope}' is tenant-scoped — not permitted for an anonymous agent class`,
    },
    pricing: {
      model: 'metered',
      hardCeiling: 25,
      unit: 'usd-per-month',
      price: 0.002,
      // axp-ext-rates-g2 §2 — native input: TOP-LEVEL rates[] in the served
      // Pricing Document (the ruled placement), validated fail-closed at the
      // survey-floor vocabulary.
      rates: RATES as unknown as Record<string, unknown>[],
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
              title: 'Anonymous sandbox (the free floor)',
              url: `${ORIGIN}/work-orders`,
              note: 'keyless, labeled example data; every free quota declared in the rate card',
            },
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
                'credits earned by completing published tasks — the B2A ladder rung above the anon sandbox; the credit ledger is not wired on this deployment.',
            },
            {
              id: 'claim-workspace',
              title: 'Human claims this workspace (stub)',
              description:
                'a human claims the agent-minted workspace for attribution and longer tenure; the claim door is not wired on this deployment.',
            },
          ],
        },
      ],
      offerPath: '/offer',
      spendParam: 'spend',
    },
    // axp-ext-rates-g2 §1 — native input: every route carries its canonical
    // camelCase operationId, passthrough into the OpenAPI contract,
    // uniqueness enforced. Live-only: every path here answers in the worker.
    routes: OPERATIONS.filter((o) => o.operation !== 'listWorkOrders') // the GET collection is declared above; POST /work-orders stays a route (the api.careers precedent)
      .map((o) => ({
        method: o.method,
        path: o.path,
        operationId: o.operation,
        summary: o.summary,
      }))
      .concat([
        { method: 'GET', path: '/icp.json', operationId: 'getIcp', summary: 'G2 coordinates: ICP (CompanyType × JobTypes), personas, motion, and the System coordinate this substrate serves' },
        { method: 'GET', path: '/verify', operationId: 'getVerify', summary: 'Run our tests — the published public-contract suite for this surface' },
      ]),
    llms: { body: llmsBody },
    // presence-when-true: the MCP door IS mounted in this worker (@dotdo/api
    // mcpConvention at /mcp) — same nouns/verbs as HTTP, one definition.
    // Authless at the sandbox rung; keyed rungs sit above it (B2A ladder).
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: 'http',
      tools: OPERATIONS.map((o) => o.operation),
    },
    icpUrl: `${ORIGIN}/icp.json`,
    // axp-ext-rates-g2 §3 — native input: links.verify on the card.
    verifyUrl: `${ORIGIN}/verify`,
    // axp-ext-rates-g2 §4 — native input: the row's G2/ICP coordinates as a
    // TOP-LEVEL card object, carried verbatim (stake #6); /icp.json remains
    // the full document.
    g2: {
      icp: icp.icp,
      personas: icp.personas,
      systems: substrate.systems,
      motion: icp.motion,
      register: icp.register,
    },
    conformanceUrl: 'https://api.qa/api.repair',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there',
        seams: [{ rel: 'substrate', description: 'same repair-field-services substrate, same operations; the universal agent-first register face' }],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/api.repair' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>api.repair</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>api.repair</h1>
<p>The rail an agent calls to get repair: the work order, its estimate, and its inspection report — electronics, commercial machinery, and appliance repair (NAICS 811 ex-8111). Entry is the record, not the truck.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/work-orders</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data (three fictional operators; demo asset tags use the GS1 952 prefix). ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# api.repair

The rail an agent calls to get repair — same truth as the page, token-cheap.

- collection: ${ORIGIN}/work-orders (keyless)
- estimates: ${ORIGIN}/estimates
- inspection reports: ${ORIGIN}/inspection-reports
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
