/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/travel-tourism.org.ai.json — the D-row
 * placeholder face; the 5615 apex name is a recorded GAP, #16).
 *
 * The four estate extensions (rate-card `rates[]`, `links.verify`, per-route
 * operationIds, the G2 card object) are NATIVE generator inputs since
 * axp-faces 0.2.0 (axp-ext-rates-g2, ratified 2026-08-23; vendored here at
 * 0.3.0 / extension 0.2.0 — the survey floor) — declared here, validated
 * fail-closed at `defineSiteManifest`, emitted at the ruled placements.
 * No site-level wrappers, no bridges.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { BOOKINGS, RETENTION_NOTE } from './seed'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const ORIGIN = 'https://travel-tourism.org.ai'

/**
 * The rate card rows (axp-ext-rates-g2 §2, native in the vendored generator):
 * TOP-LEVEL `rates[]` in the Pricing Document, one row per priced operation,
 * keyed by the canonical operationId (§1). Row law, enforced fail-closed at
 * defineSiteManifest: price is a finite number >= 0; `freeQuota`, when
 * present, is a number strictly > 0; every operation ⊆ the operationIds this
 * same manifest declares.
 */
export const RATES = [
  { operation: 'listBookings', price: 0, unit: 'usd-per-call' },
  { operation: 'getBooking', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
  { operation: 'createBooking', price: 0, unit: 'usd-per-call' },
  { operation: 'confirmBooking', price: 2, unit: 'usd-per-confirmed-booking', note: 'per-outcome row: price per CONFIRMED booking — never per call; no free quota. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test-mode).' },
  { operation: 'listTrips', price: 0, unit: 'usd-per-call' },
  { operation: 'getTrip', price: 0, unit: 'usd-per-call' },
  { operation: 'listSailings', price: 0, unit: 'usd-per-call' },
  { operation: 'getSailing', price: 0, unit: 'usd-per-call' },
  { operation: 'listCampSessions', price: 0, unit: 'usd-per-call' },
  { operation: 'getCampSession', price: 0, unit: 'usd-per-call' },
  { operation: 'enrollCamper', price: 0, unit: 'usd-per-call' },
  { operation: 'listOperators', price: 0, unit: 'usd-per-call' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every per-operation rate — and any free quota — is declared in the rates table; a zero-price row is free without quota.'

const llmsBody = `# travel-tourism.org.ai — the unserved travel sub-verticals' booking substrate

The travel-tourism substrate's placeholder face (D-row: the 5615 apex name is
a recorded GAP; the ruled posture is per-sub-vertical properties on the held
names — apis.cruises, apis.voyage, apis.camp). Bookings, trips, sailings/
charter manifests, and camp-session rosters, served as typed collections with
OK | EMPTY | BLOCKED | OFFER envelopes. Fare/availability data is deliberately
absent — the row rules it the crowded lane.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data (fictional operators —
Sable Line Coastal Cruises (demo), Harborlight Charters LLC (demo),
Cedar Knoll Summer Camp (demo), Waypoint & Fern Travel Co (demo)).
${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/bookings                        # keyless first value — typed OK
curl "${ORIGIN}/bookings?status=confirmed&subVertical=charter"
curl ${ORIGIN}/sailings                        # charter/cruise manifests
curl ${ORIGIN}/camp-sessions                   # rosters (camp sub-vertical)
curl ${ORIGIN}/pricing                         # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed Reservation/Trip records) and the headless face (the
Booking system's system-of-record doors at coordinates ⟨tour-operators⟩,
⟨charter-operators⟩, ⟨camp-operators⟩) are the SAME collections, same
envelopes, same rate-card rows — binding direction differs, the surface does
not. Writes (\`createBooking\`, \`enrollCamper\`) land in an ephemeral
anonymous workspace, disclosed above.

## Confirming a booking (outcome grain)

\`POST /bookings/{id}/confirm\` answers the 402 OFFER boundary with the rate
card's per-outcome row and every alternative (pay / work / claim — the B2A
ladder). ${PRICING_STATEMENT}
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'travel-tourism.org.ai',
    description:
      'The travel-tourism substrate (placeholder face — 5615 apex GAP): bookings, trips, sailings/charter manifests, and camp-session rosters for the unserved travel sub-verticals, on one typed definition.',
    version: '0.1.0',
    collection: {
      path: '/bookings',
      // axp-ext-rates-g2 §1: the branching collection's canonical operationId
      // — the same string the MCP tool and the rate row carry.
      operationId: 'listBookings',
      memberName: 'bookings',
      summary: 'The booking collection — typed OK | EMPTY | BLOCKED, branching on status and subVertical',
      records: BOOKINGS,
      filters: ['status', 'subVertical'],
      blockedScopes: ['operator-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) =>
        `no bookings match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope: string) =>
        `scope '${scope}' is operator-scoped — not permitted for an anonymous agent class`,
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
          title: 'Metered access (B2A: 402 against machine identity)',
          price: { model: 'metered', hardCeiling: 100, unit: 'usd-per-month' },
          checkoutUrl: `${ORIGIN}/checkout`,
          // B2A projection: the OFFER's alternatives advertise the whole #17
          // ladder — pay / work / claim — in one place (spec §5.1, §9.1).
          alternatives: [
            {
              id: 'anon-sandbox',
              title: 'Anonymous sandbox (the free floor — rung 0)',
              url: `${ORIGIN}/bookings`,
              note: 'keyless, labeled example data; every free quota declared in the rate card',
            },
            {
              id: 'earned-credits',
              title: 'Earned credits (work — rung 1)',
              url: 'https://apis.ax/account/',
              note: 'STUB, disclosed: .ax-ledger credits earned via proof-of-work (#17); the earn route is declared here before the credit rail is live so agents discover the whole ladder from one 402',
            },
            {
              id: 'human-claimed',
              title: 'Human-claimed workspace (claim — rung 2)',
              url: `${ORIGIN}/verify`,
              note: 'STUB, disclosed: a human claims the agent workspace (attribution → tenure); the claim door is not yet live',
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
    routes: OPERATIONS.filter((o) => !(o.path === '/bookings' && o.method === 'GET'))
      .map((o) => ({
        method: o.method,
        path: o.path,
        operationId: o.operation,
        summary: o.summary,
      }))
      .concat([
        { method: 'GET', path: '/icp.json', operationId: 'getIcp', summary: 'G2 coordinates: ICP (CompanyType × JobTypes), personas, and the System coordinates this substrate serves' },
        { method: 'GET', path: '/verify', operationId: 'getVerify', summary: 'Run our tests — the published public-contract suite for this surface' },
        { method: 'GET', path: '/checkout', operationId: 'getCheckout', summary: 'The checkout seam — a labeled stub until the settlement rail is activated (no charge can occur)' },
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
    conformanceUrl: 'https://api.qa/travel-tourism.org.ai',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there',
        seams: [{ rel: 'substrate', description: 'same travel-tourism substrate, same operations; the #17 proof-of-work ladder is the onboarding path' }],
      },
      {
        name: 'apis.accountants',
        origin: 'https://apis.accountants',
        role: 'sibling vertical property (accounting-tax) — the template spec §10 worked example',
        seams: [],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/travel-tourism.org.ai' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>travel-tourism.org.ai</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>travel-tourism.org.ai</h1>
<p>The travel-tourism booking substrate for the unserved sub-verticals — bookings, trips, sailings/charter manifests, and camp-session rosters. Placeholder face: the category-apex name is a recorded gap; the sub-vertical rails (apis.cruises, apis.voyage, apis.camp) project this same substrate.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/bookings</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data (fictional operators: Sable Line Coastal Cruises (demo), Harborlight Charters LLC (demo), Cedar Knoll Summer Camp (demo), Waypoint &amp; Fern Travel Co (demo)). ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# travel-tourism.org.ai

The travel-tourism booking substrate for the unserved sub-verticals — same truth as the page, token-cheap.

- collection: ${ORIGIN}/bookings (keyless)
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
