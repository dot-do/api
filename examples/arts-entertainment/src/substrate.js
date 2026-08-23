/**
 * substrate.js — Stratum A: the G3 APIProduct instance for register row
 * `arts-entertainment` (NAICS 71; template spec §1,
 * docs/plans/2026-08-23-property-template-spec.md in the studio repo).
 *
 * GAP ROW (spec §0): nothing held names arts/entertainment/recreation at the
 * 2-digit category grain (no api.entertainment / apis.recreation — the held
 * names are all sub-niche tails: apis.golf/casino/theater/hockey,
 * api.hockey/rodeo/bingo/fishing), so this substrate serves under the
 * row-key placeholder origin arts-entertainment.org.ai. The G3 work is not
 * blocked on the name; the G4 brand attaches per #16 when acquired. Held
 * sub-niche tails may carry sub-vertical projections later — recorded in
 * ../projection.json, never asserted as served.
 *
 * One substrate, two plies (§3): the data face serves the typed record
 * collections below; the headless face serves the SAME collections as
 * system-of-record doors for the native-bound Nouns — here the booking
 * system's door (H5 "Schedule: THE BOOKING") is POST /reservations on the
 * same Reservation collection. There is no second API.
 *
 * Every record served from this file is MECHANICALLY GENERATED example data
 * (template §5.2): fictional venues, no real company or person names, every
 * record carries `example: true` and a "[demo]" name/title prefix. The row's
 * source route ("schema.org-typed public event data + first-party booking
 * capture IF PROVISIONED") names no concrete feed, and the register records
 * this consumer-services branch avoid-class (B2A2C free-rider only) — so
 * nothing was probed and nothing real is ingested at wave zero; improvising
 * a class-A route the register does not name is prohibited.
 *
 * BINDINGS, honestly (spec §3.1): Reservation is `native` — first-party
 * capture at the booking system-of-record door is the one route the row
 * names as first-party. Venue / Event / Ticket are `generated` at wave zero
 * (synthetic labeled seed): their target-state bindings (ingested
 * schema.org-typed public event data; native venue-management/ticketing
 * records) ride routes the row leaves unprovisioned, and a `native` label on
 * a synthetic corpus would be a false provenance claim.
 *
 * PRIMACY (batch rule): NO primacy ruling exists in either register for the
 * record types below (grep run 2026-08-23: zero hits). Event / Ticket /
 * Reservation collide BY NAME with other rows' record types
 * (Reservation/booking grain: lodging, passenger-mobility, personal-care,
 * travel-tourism, restaurants-food-service; Ticket: THE TICKET helpdesk
 * record of fn-customer-service and fn-it — this one is an ADMISSION ticket;
 * Event: generic in several rows). These types are therefore defined LOCALLY
 * under this substrate's row key — nothing shared is claimed; the collisions
 * are recorded here and in ../projection.json.
 */

export const SUBSTRATE = 'arts-entertainment'
export const ORIGIN = 'https://arts-entertainment.org.ai' // PLACEHOLDER — GAP row, G4 name pending (#16)

// ---------------------------------------------------------------------------
// §5.2 mechanically produced sandbox seed — fixture law: fictional venue
// names only (no real clubs, casinos, theaters, teams, or people), every
// record labeled. No GS1 identifiers are minted anywhere in this corpus, so
// the 952-demo-prefix rule has nothing to bind (recorded, not skipped).
// Record typing: schema.org Event / Offer(Ticket) / Reservation / Place —
// the row's own generic-fallback anchors (no industry interchange standard
// is cited anywhere in estate docs for NAICS 71; cascade rule 2).
// $type resolves against https://schema.org.ai.
// ---------------------------------------------------------------------------

const DEMO_NOTE = 'example data — synthetic sandbox seed, not a real venue, event, ticket, or booking'

export const venues = [
  { $type: 'Venue', id: 'ven_0001', name: '[demo] Cedar Hollow Golf Club', kind: 'golf-course', city: 'Exampleton', example: true, note: DEMO_NOTE },
  { $type: 'Venue', id: 'ven_0002', name: '[demo] Marlin Bay Playhouse', kind: 'theater', city: 'Exampleton', capacity: 420, example: true, note: DEMO_NOTE },
  { $type: 'Venue', id: 'ven_0003', name: '[demo] Juniper Ice Pavilion', kind: 'rink', city: 'Sampleville', capacity: 1800, example: true, note: DEMO_NOTE },
]

export const events = [
  { $type: 'Event', id: 'evt_0001', venueId: 'ven_0002', title: '[demo] The Lantern Season — evening performance', category: 'performance', status: 'scheduled', startsAt: '2026-09-12T19:30:00Z', example: true, note: DEMO_NOTE },
  { $type: 'Event', id: 'evt_0002', venueId: 'ven_0002', title: '[demo] The Lantern Season — matinee', category: 'performance', status: 'completed', startsAt: '2026-08-15T14:00:00Z', example: true, note: DEMO_NOTE },
  { $type: 'Event', id: 'evt_0003', venueId: 'ven_0003', title: '[demo] Sampleville Winter Classic — exhibition match', category: 'sports', status: 'scheduled', startsAt: '2026-11-02T18:00:00Z', example: true, note: DEMO_NOTE },
  { $type: 'Event', id: 'evt_0004', venueId: 'ven_0001', title: '[demo] Cedar Hollow Member Scramble', category: 'recreation', status: 'scheduled', startsAt: '2026-09-05T08:00:00Z', example: true, note: DEMO_NOTE },
  { $type: 'Event', id: 'evt_0005', venueId: 'ven_0003', title: '[demo] Open Skate Night', category: 'recreation', status: 'completed', startsAt: '2026-08-01T20:00:00Z', example: true, note: DEMO_NOTE },
]

/** Every scheduled event carries a ticket set across tiers so the seed has
 *  the §5.2 "realistic depth", not a token row. */
export const tickets = [
  { $type: 'Ticket', id: 'tkt_0001', eventId: 'evt_0001', tier: 'general', priceUsd: 24, status: 'available', example: true, note: DEMO_NOTE },
  { $type: 'Ticket', id: 'tkt_0002', eventId: 'evt_0001', tier: 'reserved', priceUsd: 42, status: 'available', example: true, note: DEMO_NOTE },
  { $type: 'Ticket', id: 'tkt_0003', eventId: 'evt_0001', tier: 'box', priceUsd: 90, status: 'sold', example: true, note: DEMO_NOTE },
  { $type: 'Ticket', id: 'tkt_0004', eventId: 'evt_0002', tier: 'general', priceUsd: 18, status: 'sold', example: true, note: DEMO_NOTE },
  { $type: 'Ticket', id: 'tkt_0005', eventId: 'evt_0003', tier: 'general', priceUsd: 15, status: 'available', example: true, note: DEMO_NOTE },
  { $type: 'Ticket', id: 'tkt_0006', eventId: 'evt_0003', tier: 'reserved', priceUsd: 28, status: 'available', example: true, note: DEMO_NOTE },
]

export const seedReservations = [
  { $type: 'Reservation', id: 'rsv_0001', venueId: 'ven_0001', resource: 'tee-time', startsAt: '2026-09-06T07:40:00Z', partySize: 4, status: 'confirmed', example: true, note: DEMO_NOTE },
  { $type: 'Reservation', id: 'rsv_0002', venueId: 'ven_0001', resource: 'tee-time', startsAt: '2026-08-20T09:10:00Z', partySize: 2, status: 'completed', example: true, note: DEMO_NOTE },
  { $type: 'Reservation', id: 'rsv_0003', venueId: 'ven_0003', resource: 'ice-slot', startsAt: '2026-09-14T06:00:00Z', partySize: 18, status: 'confirmed', example: true, note: DEMO_NOTE },
]

export const seed = { venues, events, tickets, reservations: seedReservations }

// ---------------------------------------------------------------------------
// The G3 APIProduct instance (template §1 shape). Brandless by law: no ICP,
// no motion, no offer, no positioning here — those are G4 fields in
// ../projection.json. The APIProduct interface is local for now; its
// normative home is primitives.org.ai `digital-products` (prove-then-extract).
// ---------------------------------------------------------------------------

/** The canonical camelCase operationIds (axp-ext-rates-g2 §1) — ONE name per
 *  operation across route, MCP tool, suite ref, meter tag, and rate-card key
 *  (the five-surface invariant). Real verbs for collections. */
export const OPERATIONS = [
  'listEvents',
  'getEvent',
  'listVenues',
  'getVenue',
  'listTickets',
  'listReservations',
  'getReservation',
  'createReservation',
  'confirmReservation',
]

export const apiProduct = {
  substrate: SUBSTRATE,
  nouns: [
    { name: 'Event', schema: { $type: 'Event', $context: 'https://schema.org.ai', anchor: 'schema.org/Event' }, binding: 'generated', verbs: ['listEvents', 'getEvent'] },
    { name: 'Venue', schema: { $type: 'Venue', $context: 'https://schema.org.ai', anchor: 'schema.org/Place' }, binding: 'generated', verbs: ['listVenues', 'getVenue'] },
    // ADMISSION ticket (schema.org/Ticket) — NOT the fn-customer-service /
    // fn-it helpdesk Ticket (collision recorded, nothing shared).
    { name: 'Ticket', schema: { $type: 'Ticket', $context: 'https://schema.org.ai', anchor: 'schema.org/Ticket' }, binding: 'generated', verbs: ['listTickets'] },
    // The one native-bound Noun: first-party capture at the booking door.
    { name: 'Reservation', schema: { $type: 'Reservation', $context: 'https://schema.org.ai', anchor: 'schema.org/Reservation' }, binding: 'native', verbs: ['listReservations', 'getReservation', 'createReservation', 'confirmReservation'] },
  ],
  systems: [
    // Headless ply (§3.2): the row names the booking/scheduling system —
    // H5 "Schedule: THE BOOKING" — at this row's coordinate. The row's
    // venue/club-management and ticketing systems are marked [UNVERIFIED —
    // inferred] in the register; an unverified coordinate is not declared
    // (presence-when-true) — hedge carried here and in ../projection.json.
    { system: 'Schedule', coordinates: ['venue-booking'], note: 'H5 "Schedule: THE BOOKING — scheduling" rail, vertical lens. The row\'s venue/club-management + ticketing systems are [UNVERIFIED — inferred, not in the 52-System catalog excerpts on record] and are NOT declared.' },
  ],
  transports: ['REST', 'MCP'], // live-only: the transports this worker actually mounts
  operations: OPERATIONS,
  sandbox: {
    seedVersion: '2026-08-23.2',
    corpus: { venues: 3, events: 5, tickets: 6, reservations: 3 },
    law: 'template §5.2 — mechanically generated, labeled example data; fictional venue names only; no GS1 identifiers minted (952 rule has nothing to bind); reseed is a build step (this module is the versioned seed spec)',
    retention: 'sandbox writes (createReservation) are ephemeral: per-isolate memory, discarded on isolate recycle',
  },
  suite: { url: '/verify', runner: 'api.qa/suite@1-shaped (published undeclared — see surfaces.js)' },
  // one meter per operation — seams only at wave zero (§7.4)
  meters: OPERATIONS,
}
