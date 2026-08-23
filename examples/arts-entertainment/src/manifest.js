/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces 0.3.0 with axp-ext-rates-g2@0.2.0, byte-identical with
 * pins — see src/axp-faces/VENDORED.json for the committed HEAD it was
 * vendored from: axp.org.ai draft/axp-extension-rates-g2 @ 523c9ef2).
 *
 * ORIGIN IS A PLACEHOLDER. This is a GAP register row (nothing held names
 * NAICS 71 at the category grain; the held names are sub-niche tails): per
 * template spec §0 the G3 substrate is built under a placeholder org.ai
 * address and the G4 brand attaches when a name is ruled (#16). Nothing here
 * implies acquisition of any name.
 *
 * The four estate extension members — top-level `rates[]`, top-level `g2`,
 * `links.verify`, per-route operationIds — are NATIVE generator inputs
 * (axp-ext-rates-g2@0.2.0): declared here, validated fail-closed at
 * `defineSiteManifest`, emitted at the ruled placements. No bridges, no
 * hand-patched documents.
 */
import { defineSiteManifest } from './axp-faces/index.js'
import { ORIGIN, SUBSTRATE, events, apiProduct } from './substrate.js'

export { ORIGIN, SUBSTRATE }

/**
 * G2 coordinates (axp-ext/rates-g2 §4) — carried VERBATIM onto the
 * agents.json card as the top-level `g2` object, and reused by /icp.json
 * (surfaces.js), which remains the linked long-form document via links.icp.
 */
export const G2 = {
  icp: {
    companyTypes: ['golf course / club operator', 'theater / performing-arts venue', 'rink / recreation facility', 'casino / amusement operator'],
    jobTypes: ['general manager', 'box-office / booking manager'],
  },
  personas: [
    { id: 'operator-gm', description: 'venue/club/attraction general manager whose booking calendar is the system of record' },
    { id: 'operator-booking', description: 'box-office / booking manager managing event, ticket, and reservation inventory' },
    { id: 'agent', description: 'autonomous agent booking venue inventory (tee times, tables, ice slots, seats) on behalf of a principal — the row rules consumer demand agent-intermediated ONLY (B2A2C free-rider posture)' },
  ],
  motion: 'B2A',
}

/** The words the human page uses too (the binding:false statement rule). */
export const PRICING_STATEMENT =
  'Wave-zero stub pricing on a placeholder surface: no live settlement exists here and nothing is ever charged. The 402 boundary is test-mode. Rates are stated intent for the category, not terms. Every per-operation rate — and any free quota — is declared in the rates table; a zero-price row is free without quota.'

const llmsBody = `# arts-entertainment — events, venues, admission tickets, and bookings for arts, entertainment & recreation (NAICS 71)

Typed Event / Venue / Ticket / Reservation records (schema.org generic
typing — the row's own anchor: no industry interchange standard is cited for
this sector) served as typed collections with OK | EMPTY | BLOCKED | OFFER
envelopes. Two faces, one definition:

- **Data face** — read the typed records: \`/events\`, \`/venues\`,
  \`/tickets\`, \`/reservations\`.
- **Headless face** — the booking system-of-record door (H5 "Schedule: THE
  BOOKING") on the SAME collection: \`POST /reservations\` books venue
  inventory (tee time, table, ice slot) into your sandbox workspace.

This surface serves under a **placeholder address**: the category has no
ruled brand name (a GAP register row — the held names are sub-niche tails
like apis.golf and apis.theater, recorded but not served). The API contract,
sandbox, and pricing document are real and verifiable today.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/events                          # keyless first value — typed OK
curl "${ORIGIN}/events?category=performance"   # branching on the query
curl "${ORIGIN}/events?status=scheduled"
curl ${ORIGIN}/venues
curl ${ORIGIN}/pricing                         # the rate card (rates[] per operation)
\`\`\`

All sandbox records are clearly labeled synthetic example data
(\`example: true\` and a "[demo]" prefix on every record) — fictional venues
in fictional cities; no real club, casino, theater, team, or person appears.
Anonymous writes mint an ephemeral workspace (see the \`X-Workspace\`
response header); retention is disclosed in each response. Payment endpoints
are 402-shaped stubs at this stage — the pricing document says so in its own
\`binding\`/\`statement\` members, and nothing is ever charged.
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'arts-entertainment.org.ai',
  description:
    'Typed Event, Venue, admission-Ticket, and Reservation records for arts, entertainment & recreation (NAICS 71) — one definition serving a data face and a headless booking system-of-record face. Placeholder address for a GAP register row; synthetic labeled sandbox data.',
  version: '0.1.0',

  // The ONE branching collection (Clauses 4 + 7 on one pathname) — the
  // schema.org Event grain, the row's own typed record.
  collection: {
    path: '/events',
    operationId: 'listEvents',
    memberName: 'events',
    summary: 'Events (performances, matches, recreation sessions) — the branching typed collection: OK | EMPTY | BLOCKED on one pathname',
    records: events,
    filters: ['category', 'status'],
    blockedScopes: ['venue-private', 'platform-internal'],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today,
  // each carrying its canonical camelCase operationId (five-surface invariant).
  routes: [
    { method: 'GET', path: '/events/{id}', operationId: 'getEvent', summary: 'One event by id — typed envelope' },
    { method: 'GET', path: '/venues', operationId: 'listVenues', summary: 'Venues (fictional, labeled example data)', params: [{ name: 'kind', description: 'golf-course | theater | rink | casino' }, { name: 'city', description: 'filter by city' }] },
    { method: 'GET', path: '/venues/{id}', operationId: 'getVenue', summary: 'One venue by id' },
    { method: 'GET', path: '/tickets', operationId: 'listTickets', summary: 'Admission tickets per event and tier (synthetic, labeled) — the schema.org/Ticket grain, NOT a helpdesk ticket', params: [{ name: 'eventId', description: 'filter by event' }, { name: 'status', description: 'available | sold' }] },
    { method: 'GET', path: '/reservations', operationId: 'listReservations', summary: 'Bookings of venue inventory — tee times, tables, ice slots (seed + your sandbox workspace)', params: [{ name: 'status', description: 'confirmed | completed | cancelled' }, { name: 'resource', description: 'tee-time | table | ice-slot' }] },
    { method: 'GET', path: '/reservations/{id}', operationId: 'getReservation', summary: 'One reservation by id' },
    {
      method: 'POST',
      path: '/reservations',
      operationId: 'createReservation',
      summary: 'Book venue inventory into your sandbox workspace (the headless booking system-of-record door — H5 Schedule⟨venue-booking⟩)',
      description:
        'Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). Retention is disclosed in the response body; the sandbox is the real product over labeled example data.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['venueId', 'resource', 'startsAt'], properties: { venueId: { type: 'string' }, resource: { type: 'string' }, startsAt: { type: 'string' }, partySize: { type: 'number' } } } } } },
      responses: { 201: { description: 'OK envelope with the created reservation and workspace id' } },
    },
    {
      method: 'POST',
      path: '/reservations/{id}/confirm',
      operationId: 'confirmReservation',
      summary: 'Confirm a booking against venue inventory (outcome verb) — answers a typed 402 OFFER; wave-zero STUB, no live settlement',
      responses: { 402: { description: 'OFFER envelope advertising the pay / work / claim ladder; stub: true — nothing is charged' } },
    },
    { method: 'GET', path: '/icp.json', operationId: 'getIcp', summary: 'G2 coordinates: ICP + personas + System coordinates of this substrate' },
    { method: 'GET', path: '/verify', operationId: 'getVerify', summary: 'The published verification suite document — run our tests' },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js), on the
  // AUTHLESS anon-sandbox rung. Tool names are the SAME canonical
  // operationId strings (five-surface invariant). Rungs above the floor
  // would gate on a key; no keyed tool is mounted at wave zero, so none is
  // declared (presence-when-true, never a ghost).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    tools: ['listEvents', 'getEvent', 'listVenues', 'getVenue', 'listTickets', 'listReservations'],
  },

  // Wave-zero pricing: metered SHAPE with the 402 boundary served, honestly
  // declared UNBOUND (stub — no live settlement on this placeholder surface;
  // test-mode counts as face-payable, never as billing).
  pricing: {
    model: 'metered',
    hardCeiling: 25,
    unit: 'usd-per-month',
    price: 0.001,
    binding: false,
    statement: PRICING_STATEMENT,
    // The operation rate card (axp-ext/rates-g2 §2) — TOP-LEVEL rates[] in
    // the Pricing Document, keyed by the canonical operationId; every row
    // has freeQuota or prices from zero (survey-floor vocabulary).
    rates: [
      { operation: 'listEvents', price: 0 },
      { operation: 'getEvent', price: 0.001, freeQuota: 250 },
      { operation: 'listVenues', price: 0 },
      { operation: 'getVenue', price: 0 },
      { operation: 'listTickets', price: 0 },
      { operation: 'listReservations', price: 0 },
      { operation: 'getReservation', price: 0 },
      { operation: 'createReservation', price: 0, note: 'anonymous sandbox workspace bookings — unmetered at wave zero' },
      {
        operation: 'confirmReservation',
        price: 0.15,
        unit: 'usd-per-confirmed-booking',
        freeQuota: 1,
        stub: true,
        note: 'Per confirmed booking (per-outcome — the first-party booking-capture grain, the one route the register row names as first-party "if provisioned"). The 402 OFFER boundary is served today; settlement is a stub (test-mode) advertising the pay / work / claim ladder — nothing is charged.',
      },
    ],
    offers: [
      {
        id: 'metered-access-stub',
        title: 'Metered access (test-mode stub — no live billing)',
        price: { model: 'metered', hardCeiling: 25, unit: 'usd-per-month', price: 0.001 },
        alternatives: [
          { id: 'pay', title: 'Pay per call — 402 metering against machine identity (id.org.ai). STUB: test-mode, no live settlement.', rel: 'payment' },
          { id: 'work', title: 'Earn credits via proof-of-work tasks (.ax ledger). STUB: rung declared; the credit ledger service is not yet deployed.', rel: 'proof-of-work' },
          { id: 'claim', title: 'Have a human claim this workspace for longer tenure. STUB: the claim door is not yet live.', rel: 'claim' },
        ],
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  llms: { body: llmsBody },

  // axp-ext/rates-g2 §3: the card's links.verify — the published runnable
  // suite anyone can run against the live surface ("run this", not "trust us").
  verifyUrl: '/verify',

  // axp-ext/rates-g2 §4: G2/ICP coordinates TOP-LEVEL on the card, verbatim.
  // links.icp (icpUrl) stays declared beside it — the long form.
  g2: { ...G2, systems: apiProduct.systems },
  icpUrl: `${ORIGIN}/icp.json`,

  conformanceUrl: 'https://api.qa/arts-entertainment.org.ai',

  // Family: a GAP row has no ruled, serving sibling doors — presence-when-
  // true, so no family registry is emitted. The held sub-niche tails
  // (apis.golf, apis.theater, …) are recorded in ../projection.json, not on
  // the wire: a family edge to an origin that serves nothing is a ghost.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>arts-entertainment (placeholder address)</title></head>
<body>
<h1>arts-entertainment</h1>
<p>Typed Event, Venue, admission-Ticket, and Reservation records for arts, entertainment &amp; recreation (NAICS 71) — a data face and a headless booking door from one definition. This is a placeholder address for an unnamed category; the machine face is live and verifiable. All records are labeled synthetic example data (fictional venues, no real names).</p>
<p>${PRICING_STATEMENT}</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/events">events (keyless, labeled example data)</a> · <a href="/icp.json">icp.json</a> · <a href="/verify">verify</a></p>
</body></html>
`,
    md: `# arts-entertainment

Typed Event / Venue / Ticket / Reservation records for arts, entertainment & recreation (NAICS 71) — placeholder address, live machine face, labeled synthetic sandbox data.

- collection: ${ORIGIN}/events (keyless)
- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing (rate card): ${ORIGIN}/pricing
- icp (G2 coordinates): ${ORIGIN}/icp.json
- run our tests: ${ORIGIN}/verify

${PRICING_STATEMENT}
`,
  },
})
