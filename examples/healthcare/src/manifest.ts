/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/healthcare.org.ai.json).
 *
 * The four estate extension members (rate-card `rates[]`, `links.verify`,
 * per-route operationIds, the G2 card object) are NATIVE generator inputs
 * (axp-ext-rates-g2@0.2.0, vendored at axp-faces 0.3.0 from axp.org.ai
 * COMMITTED main @ da9a166) — declared here, validated fail-closed at
 * `defineSiteManifest`, emitted at the ruled placements. No bridges, no
 * hand-patched documents.
 *
 * ORIGIN is the ROW-KEY placeholder face: the name pair (api.hospital vs
 * apis.healthcare) is an open #33 curation item — this build claims NEITHER;
 * renaming is a config edit when the register decides.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { COUNSEL_BOUNDARY, PROVIDERS, RETENTION_NOTE } from './seed'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const ORIGIN = 'https://healthcare.org.ai'

/**
 * The rate card rows (axp-ext-rates-g2 §2, native in the vendored generator):
 * TOP-LEVEL `rates[]` in the Pricing Document, one row per priced operation,
 * keyed by the canonical operationId (§1). Survey-floor vocabulary: a
 * zero-price row IS the free tier (no freeQuota on free rows); `freeQuota`
 * appears only on priced rows, strictly > 0.
 */
export const RATES = [
  { operation: 'listProviders', price: 0, unit: 'usd-per-call' },
  { operation: 'getProvider', price: 0, unit: 'usd-per-call' },
  { operation: 'listCredentials', price: 0, unit: 'usd-per-call' },
  { operation: 'getCredential', price: 0, unit: 'usd-per-call' },
  { operation: 'addCredential', price: 0, unit: 'usd-per-call' },
  { operation: 'listEnrollments', price: 0, unit: 'usd-per-call' },
  { operation: 'getEnrollment', price: 0, unit: 'usd-per-call' },
  { operation: 'createEnrollment', price: 0, unit: 'usd-per-call' },
  {
    operation: 'submitEnrollment',
    price: 4.0,
    unit: 'usd-per-submitted-enrollment-packet',
    note: 'per-outcome row: price per enrollment packet submitted to a payer (the enrollment-packet-automation rung of the row ladder) — never per call; no free quota. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test-mode).',
  },
  { operation: 'listPriorAuthArtifacts', price: 0, unit: 'usd-per-call' },
  { operation: 'getPriorAuthArtifact', price: 0, unit: 'usd-per-call' },
  { operation: 'listEligibilityRecords', price: 0, unit: 'usd-per-call' },
  { operation: 'getEligibilityRecord', price: 0, unit: 'usd-per-call' },
  { operation: 'checkEligibility', price: 0.001, unit: 'usd-per-call', freeQuota: 250 },
  { operation: 'listSuperbills', price: 0, unit: 'usd-per-call' },
  { operation: 'getSuperbill', price: 0, unit: 'usd-per-call' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every per-operation rate — and any free quota — is declared in the rates table; a zero-price row is free without quota.'

const llmsBody = `# healthcare — the credentialing and enrollment functions a provider organization's systems call

The healthcare substrate's developer face (B2D), served on the ROW-KEY
placeholder origin: the name pair (api.hospital vs apis.healthcare) is an
open curation item (#33) and this face claims neither. Non-PHI admin
artifacts only: a provider roster, credentials (licenses, board
certifications, registrations), payer-enrollment packets, prior-auth
artifacts, eligibility records, and superbills — typed collections with
OK | EMPTY | BLOCKED | OFFER envelopes.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data — a fictional provider
group, "Cascade Ridge Medical Group (demo)", in a fictional city (Bellhaven),
${PROVIDERS.length} roster records spanning the ambulatory (621) and hospital (622) grains,
credentials in every lifecycle status, the full enrollment lifecycle, and
DEMO-namespace identifiers throughout. ${RETENTION_NOTE}

${COUNSEL_BOUNDARY}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/providers                          # keyless first value — typed OK
curl "${ORIGIN}/providers?specialty=cardiology&status=active"
curl "${ORIGIN}/eligibility-records/check?providerId=prov-2&payerId=payer-bellhaven-mutual"
curl ${ORIGIN}/enrollments                        # PECOS-grain packet lifecycle
curl ${ORIGIN}/pricing                            # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (roster/credential, prior-auth, eligibility, and superbill
records per the register row) and the headless face (the credentialing/
enrollment system-of-record door — Credentialing⟨healthcare-provider-
organizations⟩) are the SAME collections, same envelopes, same rate-card
rows — binding direction differs, the surface does not. Writes
(\`addCredential\`, \`createEnrollment\`) land in an ephemeral anonymous
workspace, disclosed above. The operator brings the license — the headless
system of record carries no regulatory blocker; the licensed operator is the
customer (the #9 regulation unlock).

The sector's entry-grain dispute (credentialing vs prior-auth vs
scheduling/eligibility) is OPEN and recorded: this face builds the
credentialing System first as the least-disputed grain and serves the other
two grains as data-ply record collections only.

## Submitting an enrollment packet (outcome grain)

\`POST /enrollments/{id}/submit\` answers the 402 OFFER boundary with the
rate card's per-outcome row and every alternative. ${PRICING_STATEMENT}

## Held sibling names (claimed by NOBODY here)

api.hospital (held, no zone) and apis.healthcare / apis.doctor / apis.dental /
apis.dentist are the row's held names — the primary-name pair is an open
register curation item; this face is the row-key placeholder until it rules.
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'healthcare',
    description:
      "The credentialing and enrollment functions a provider organization's systems call — provider roster, credentials, payer-enrollment packets, prior-auth artifacts, eligibility records, and superbills on the healthcare substrate (non-PHI admin artifacts only).",
    version: '0.1.0',
    collection: {
      path: '/providers',
      // axp-ext-rates-g2 §1: the branching collection's canonical operationId
      // — the same string the MCP tool and the rate row carry.
      operationId: 'listProviders',
      memberName: 'providers',
      summary: 'The provider-roster collection — typed OK | EMPTY | BLOCKED, branching on specialty, state, and status',
      records: PROVIDERS,
      filters: ['specialty', 'state', 'status'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) => `no providers match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope: string) => `scope '${scope}' is tenant-scoped — not permitted for an anonymous agent class`,
    },
    pricing: {
      model: 'metered',
      hardCeiling: 100,
      unit: 'usd-per-month',
      price: 0.001,
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
              url: `${ORIGIN}/providers`,
              note: 'keyless, labeled synthetic example data; every free quota declared in the rate card',
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
    routes: OPERATIONS.filter((o) => o.path !== '/providers')
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
    // mcpConvention at /mcp) — same nouns/verbs as HTTP, one definition; the
    // door is the AUTHLESS SANDBOX RUNG only (mounted-rungs-only: keyed rungs
    // sit above it, not on this door).
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
    conformanceUrl: 'https://api.qa/healthcare.org.ai',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there; agent-default candidate for the category',
        seams: [{ rel: 'substrate', description: 'same healthcare substrate, same operations, B2A onboarding (the proof-of-work ladder) instead of OAuth/card' }],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/healthcare.org.ai' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>healthcare — credentialing &amp; enrollment functions</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>healthcare</h1>
<p>The credentialing and enrollment functions a provider organization's systems call: a provider roster, credentials, payer-enrollment packets, prior-auth artifacts, eligibility records, and superbills. Non-PHI admin artifacts only. The operator brings the license — this is a headless system of record.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/providers</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data — a fictional provider group, Cascade Ridge Medical Group (demo), in a fictional city; identifiers are DEMO-namespace. ${RETENTION_NOTE}</p>
<p class="demo">${COUNSEL_BOUNDARY}</p>
<p>${PRICING_STATEMENT}</p>
<p>This face serves the register row key: the name pair (api.hospital vs apis.healthcare) is an open register curation item and neither name is claimed here.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# healthcare

The credentialing and enrollment functions a provider organization's systems call — same truth as the page, token-cheap. Non-PHI admin artifacts only.

- collection: ${ORIGIN}/providers (keyless)
- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing (rate card): ${ORIGIN}/pricing
- icp (G2 coordinates): ${ORIGIN}/icp.json
- run our tests: ${ORIGIN}/verify

Sandbox data is labeled synthetic example data. ${RETENTION_NOTE}
${COUNSEL_BOUNDARY}
${PRICING_STATEMENT}
`
}
