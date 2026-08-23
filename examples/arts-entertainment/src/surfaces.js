/**
 * surfaces.js — the substrate's supplemental served documents:
 *
 *   /icp.json  — the G2 coordinates of this substrate (ICP + personas +
 *                System coordinates), exposed from the card via links.icp
 *                and carried top-level on the card as `g2` (both from the
 *                one G2 object in manifest.js — axp-ext/rates-g2 §4).
 *   /verify    — the published verification suite document ("run this",
 *                not "trust us"), linked from the card via links.verify
 *                (axp-ext/rates-g2 §3). interfaces.testSuite is NOT declared
 *                on the card at wave zero: declaration arms the strict
 *                digest-pinned check, which belongs after the hosted api.qa
 *                verdict exists for this (placeholder) domain.
 */
import { ORIGIN, SUBSTRATE, G2 } from './manifest.js'
import { apiProduct } from './substrate.js'

export const ICP_DOC = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  $id: `${ORIGIN}/icp.json`,
  substrate: SUBSTRATE,
  g2: G2,
  systems: apiProduct.systems,
  anchors: {
    naics: ['71 (711 performing arts & spectator sports, 712 museums, 713 amusement/gambling/recreation [UNVERIFIED sub-codes — standard NAICS structure not restated in estate docs])'],
    recordTyping: 'schema.org Event / Offer / Reservation — the generic-fallback rule (no industry interchange standard cited anywhere in estate docs for NAICS 71; cascade rule 2)',
    onet: '27-xxxx arts/entertainment occupation family [UNVERIFIED code — register hedge carried]',
  },
  rowHedge:
    "The register row's defining fact is a recorded THESIS GAP: the held names were bought as grammar completion and no entry thesis exists; the consumer-services branch is avoid-class (B2A2C free-rider only). This build instantiates the G3 substrate per spec §0 and hardens nothing the register left open.",
}

// api.qa/suite@1-SHAPED declarative checks; undeclared on the card (see header).
export const VERIFY_DOC = {
  $context: 'https://schema.org.ai',
  $type: 'VerificationSuite',
  $id: `${ORIGIN}/verify`,
  substrate: SUBSTRATE,
  statement:
    "Run these against the live surface — every claim on this property that can be a test is a test. The suite is published here; independent verification is api.qa's job and its verdict, once this surface has a ruled domain, links from the capability card.",
  checks: [
    { id: 'keyless-first-value', operation: 'listEvents', request: { method: 'GET', path: '/events' }, expect: { status: 200, 'body.type': 'OK' } },
    { id: 'known-empty-1', operation: 'listEvents', request: { method: 'GET', path: '/events?category=none' }, expect: { status: 200, 'body.type': 'EMPTY' } },
    { id: 'known-empty-2', operation: 'listEvents', request: { method: 'GET', path: '/events?status=none' }, expect: { status: 200, 'body.type': 'EMPTY' } },
    { id: 'known-forbidden-1', operation: 'listEvents', request: { method: 'GET', path: '/events?scope=venue-private' }, expect: { status: 403, 'body.type': 'BLOCKED' } },
    { id: 'known-forbidden-2', operation: 'listEvents', request: { method: 'GET', path: '/events?scope=platform-internal' }, expect: { status: 403, 'body.type': 'BLOCKED' } },
    { id: 'pricing-declared', operation: 'getPricing', request: { method: 'GET', path: '/pricing' }, expect: { status: 200, 'body.model': 'metered', 'body.binding': false } },
    { id: 'over-ceiling-offer', operation: 'listEvents', request: { method: 'GET', path: '/events?spend=26' }, expect: { status: 402, 'body.type': 'OFFER' } },
    { id: 'half-ceiling-ok', operation: 'listEvents', request: { method: 'GET', path: '/events?spend=12' }, expect: { status: 200 } },
    { id: 'zero-spend-ok', operation: 'listEvents', request: { method: 'GET', path: '/events?spend=0' }, expect: { status: 200 } },
    { id: 'confirm-offer-stub', operation: 'confirmReservation', request: { method: 'POST', path: '/reservations/rsv_0001/confirm' }, expect: { status: 402, 'body.type': 'OFFER', 'body.stub': true } },
    { id: 'booking-door', operation: 'createReservation', request: { method: 'POST', path: '/reservations', body: { venueId: 'ven_0001', resource: 'tee-time', startsAt: '2026-09-07T08:00:00Z' } }, expect: { status: 201, 'body.type': 'OK' } },
    { id: 'seed-labeled', operation: 'listEvents', request: { method: 'GET', path: '/events' }, expect: { 'body.events[0].example': true } },
    { id: 'mcp-tools-listed', operation: 'listEvents', request: { method: 'POST', path: '/mcp', jsonrpc: 'tools/list' }, expect: { 'tools.length': 6 } },
  ],
}
