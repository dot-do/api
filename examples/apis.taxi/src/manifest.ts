/**
 * manifest.ts — the ONE source of truth every machine face renders from
 * (vendored axp-faces `defineSiteManifest`), assembled from the G3 substrate
 * (./substrate.ts), the §5.2 seed corpus (./seed.ts), and the served G4
 * projection (../projections/apis.taxi.json).
 *
 * The four estate extension members (rate-card `rates[]`, `links.verify`,
 * per-route operationIds, the G2 card object) are NATIVE generator inputs
 * (axp-ext-rates-g2@0.2.0, vendored at axp-faces 0.3.0) — declared here,
 * validated fail-closed at `defineSiteManifest`, emitted at the ruled
 * placements. No bridges, no hand-patched documents.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { defineSiteManifest } from '../axp/manifest.js'
import { RETENTION_NOTE, TRIPS } from './seed'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const ORIGIN = 'https://apis.taxi'

/**
 * The rate card rows (axp-ext-rates-g2 §2, native in the vendored generator):
 * TOP-LEVEL `rates[]` in the Pricing Document, one row per priced operation,
 * keyed by the canonical operationId (§1). Survey-floor vocabulary: a
 * zero-price row IS the free tier (no freeQuota on free rows); `freeQuota`
 * appears only on priced rows, strictly > 0.
 */
export const RATES = [
  { operation: 'listTrips', price: 0, unit: 'usd-per-call' },
  { operation: 'getTrip', price: 0, unit: 'usd-per-call' },
  { operation: 'listReservations', price: 0, unit: 'usd-per-call' },
  { operation: 'getReservation', price: 0, unit: 'usd-per-call' },
  { operation: 'createReservation', price: 0, unit: 'usd-per-call' },
  {
    operation: 'dispatchTrip',
    price: 0.25,
    unit: 'usd-per-dispatched-trip',
    note: 'per-outcome row: price per dispatched trip (a vehicle assigned against a confirmed booking) — never per call; no free quota. Settlement rail not yet activated; the 402 boundary is served, no charge can occur (test-mode).',
  },
  { operation: 'listFares', price: 0, unit: 'usd-per-call' },
  { operation: 'quoteFare', price: 0.001, unit: 'usd-per-call', freeQuota: 250 },
  { operation: 'listVehicles', price: 0, unit: 'usd-per-call' },
  { operation: 'getVehicle', price: 0, unit: 'usd-per-call' },
  { operation: 'listTransitSchedules', price: 0, unit: 'usd-per-call' },
  { operation: 'getTransitSchedule', price: 0, unit: 'usd-per-call' },
] as const

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Introductory metered pricing, not yet bound by published terms: budget against it; do not contract on it. Every per-operation rate — and any free quota — is declared in the rates table; a zero-price row is free without quota.'

const llmsBody = `# apis.taxi — the functions a passenger fleet's systems call

The passenger-mobility substrate's developer face (B2D): trips, bookings
(reservations), a zone-pair fare schedule, the fleet, and GTFS-typed transit
schedules, served as typed collections with OK | EMPTY | BLOCKED | OFFER
envelopes.

The anonymous sandbox is the floor: every collection below answers keyless,
seeded with clearly-labeled synthetic example data — a fictional operator,
"Harborline Livery Co (demo)", in a fictional city (Porthaven), a three-class
fleet (sedan taxi, charter shuttle, wheelchair-accessible NEMT van), two
service days of bookings and trips, and synthetic GTFS-shaped schedules that
are NOT ingested from any real transit feed. ${RETENTION_NOTE}

## Quickstart

\`\`\`sh
curl ${ORIGIN}/trips                              # keyless first value — typed OK
curl "${ORIGIN}/trips?status=completed&date=2026-08-20"
curl "${ORIGIN}/fares/quote?fromZone=airport&toZone=downtown&serviceClass=sedan"
curl ${ORIGIN}/transit-schedules                  # GTFS-typed (synthetic, labeled)
curl ${ORIGIN}/pricing                            # the rate card (per-operation rates)
\`\`\`

## The two plies (one substrate, one definition)

The data face (typed booking/trip/fare records per the register row) and the
headless face (the dispatch + booking/scheduling system-of-record door —
Scheduler⟨passenger-dispatch⟩) are the SAME collections, same envelopes, same
rate-card rows — binding direction differs, the surface does not. Writes
(\`createReservation\`) land in an ephemeral anonymous workspace, disclosed
above. The operator brings the livery license — the headless door carries no
regulatory blocker (spec §3.2).

## Dispatching a trip (outcome grain)

\`POST /reservations/{id}/dispatch\` answers the 402 OFFER boundary with the
rate card's per-outcome row and every alternative. ${PRICING_STATEMENT}

## Held sibling name

apis.limo (zone provisioned, nothing serving yet) is the livery/limo
sub-niche sibling of this face — recorded as a projection of the same
substrate, not a separate API.
`

/** The branching collection satisfies Clauses 4 + 7 on one pathname. */
export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: 'apis.taxi',
    description:
      "The functions a passenger fleet's systems call — trips, bookings, fares, the fleet, and GTFS-typed transit schedules on the passenger-mobility substrate.",
    version: '0.1.0',
    collection: {
      path: '/trips',
      // axp-ext-rates-g2 §1: the branching collection's canonical operationId
      // — the same string the MCP tool and the rate row carry.
      operationId: 'listTrips',
      memberName: 'trips',
      summary: 'The trip collection — typed OK | EMPTY | BLOCKED, branching on status, date, and vehicleId',
      records: TRIPS,
      filters: ['status', 'date', 'vehicleId'],
      blockedScopes: ['tenant-private', 'platform-internal'],
      match: (rec: Record<string, unknown>, param: string, value: string) => String(rec[param]) === value,
      emptyMessage: (param: string, value: string) => `no trips match ${param}=${value} — a truthful empty set, not an error`,
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
              url: `${ORIGIN}/trips`,
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
    routes: OPERATIONS.filter((o) => o.path !== '/trips')
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
    conformanceUrl: 'https://api.qa/apis.taxi',
    family: [
      {
        name: 'apis.ax',
        origin: 'https://apis.ax',
        role: 'the agent-first (B2A) register — this substrate is listed there; agent-default candidate for the category',
        seams: [{ rel: 'substrate', description: 'same passenger-mobility substrate, same operations, B2A onboarding (the proof-of-work ladder) instead of OAuth/card' }],
      },
      {
        name: 'api.qa',
        origin: 'https://api.qa',
        role: 'the independent conformance verifier — this card counts on its verdict, never on deploy',
        seams: [{ rel: 'conformance', description: 'hosted verdict for this surface at https://api.qa/apis.taxi' }],
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.taxi</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}code,pre{background:#f4f4f4;border-radius:4px;padding:.1rem .3rem}pre{padding:.8rem;overflow-x:auto}h1{font-size:1.6rem}.demo{color:#8a5a00;font-size:.9rem}a{color:#0a5}</style></head>
<body>
<h1>apis.taxi</h1>
<p>The functions a passenger fleet's systems call: trips, bookings, a zone-pair fare schedule, the fleet, and GTFS-typed transit schedules.</p>
<p>Keyless first value — no key, no signup:</p>
<pre>curl ${ORIGIN}/trips</pre>
<p class="demo">Sandbox data is clearly-labeled synthetic example data — a fictional operator, Harborline Livery Co (demo), in a fictional city; the GTFS-shaped schedules are synthetic, not any real agency's feed. ${RETENTION_NOTE}</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`
}

function homeMd(): string {
  return `# apis.taxi

The functions a passenger fleet's systems call — same truth as the page, token-cheap.

- collection: ${ORIGIN}/trips (keyless)
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
