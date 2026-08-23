/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (GET /bookings); everything else lives here.
 */

import type { Hono, Context } from 'hono'
import type { ApiEnv } from '../../../src/types'
// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { ok, empty, blocked, offer, envelopeResponse } from '../axp/envelope.js'
// @ts-ignore vendored
import { serveNegotiated } from '../axp/conneg.js'
import { manifest, axpHandler } from './axp'
import { ORIGIN, RATES, PRICING_STATEMENT } from './manifest'
import * as store from './store'
import { emitMeter, emitTraffic } from './seams'
import icp from './icp'
import { RETENTION_NOTE } from './seed'

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

function json(c: Context<ApiEnv>, body: unknown, status = 200): Response {
  void c
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...JSON_CT, vary: 'accept' } })
}

const CHECKOUT_STUB = {
  $type: 'CheckoutSeam',
  status: 'stub',
  note:
    'LABELED STUB — the settlement rail is not yet activated (A1 charter); no payment can be taken here and no charge can occur. ' +
    "The 402 OFFER boundary and this checkout seam are the served product surface; which rail answers is the platform's decision, not this property's.",
  pricing: `${ORIGIN}/pricing`,
  statement: PRICING_STATEMENT,
}

const VERIFY_DOC = {
  $type: 'VerifyExport',
  title: 'Run our tests',
  summary:
    'The public-contract suite for this surface: the digest-pinned AXP conformance gate plus the contract tests, runnable by anyone from the open repo. ' +
    '"Trust us" → "run this."',
  pinnedSpec: 'apis-ax-axp@2.6.0',
  pinnedSpecDigest: 'sha256:a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d',
  run: [
    'git clone the @dotdo/api repo, branch draft/travel-tourism-wave0',
    'pnpm install',
    'npx vitest run tests/travel-tourism.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome verb, advertising the whole B2A ladder (pay / work / claim)',
    'seed fixture law: every record labeled example data; fictional operators/vessels/ports; 00-prefix registration ids; travelers as role labels, never names',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/travel-tourism.org.ai',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/bookings`,
    trips: `${ORIGIN}/trips`,
    sailings: `${ORIGIN}/sailings`,
    campSessions: `${ORIGIN}/camp-sessions`,
    operators: `${ORIGIN}/operators`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.post('/bookings', async (c) => {
    emitMeter('createBooking')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createBooking(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.booking], { memberName: 'bookings', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/bookings/:id', (c) => {
    emitMeter('getBooking')
    const b = store.getBooking(ws, c.req.param('id'))
    if (!b) return json(c, empty(`no booking '${c.req.param('id')}' — see /bookings`, { memberName: 'bookings' }), 200)
    return json(c, ok([b], { memberName: 'bookings', extra: { links: { ...collectionLinks(), confirm: `${ORIGIN}/bookings/${b.id}/confirm` } } }))
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  // B2A projection: the alternatives advertise the whole #17 ladder.
  app.post('/bookings/:id/confirm', (c) => {
    emitMeter('confirmBooking', 'paid')
    const b = store.getBooking(ws, c.req.param('id'))
    if (!b) return json(c, empty(`no booking '${c.req.param('id')}' — see /bookings`, { memberName: 'bookings' }), 200)
    const perOutcome = RATES.find((r) => r.operation === 'confirmBooking')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Confirm booking ${b.id} (${b.subVertical})`,
        rate: perOutcome,
        booking: b.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/trips', (c) => {
    emitMeter('listTrips')
    return json(c, ok(store.listTrips(), { memberName: 'trips', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/trips/:id', (c) => {
    emitMeter('getTrip')
    const t = store.getTrip(c.req.param('id'))
    if (!t) return json(c, empty(`no trip '${c.req.param('id')}' — see /trips`, { memberName: 'trips' }), 200)
    return json(c, ok([t], { memberName: 'trips', extra: { links: collectionLinks() } }))
  })

  app.get('/sailings', (c) => {
    emitMeter('listSailings')
    const sub = c.req.query('subVertical')
    let s = store.listSailings()
    if (sub) s = s.filter((x) => x.subVertical === sub)
    if (s.length === 0) return json(c, empty('no sailings match — a truthful empty set, not an error', { memberName: 'sailings' }))
    return json(c, ok(s.map((x) => ({ ...x, href: `${ORIGIN}/sailings/${x.id}` })), { memberName: 'sailings', extra: { links: collectionLinks() } }))
  })

  app.get('/sailings/:id', (c) => {
    emitMeter('getSailing')
    const s = store.getSailing(c.req.param('id'))
    if (!s) return json(c, empty(`no sailing '${c.req.param('id')}' — see /sailings`, { memberName: 'sailings' }), 200)
    return json(c, ok([s], { memberName: 'sailings', extra: { links: collectionLinks() } }))
  })

  app.get('/camp-sessions', (c) => {
    emitMeter('listCampSessions')
    return json(c, ok(store.listCampSessions(ws).map((x) => ({ ...x, href: `${ORIGIN}/camp-sessions/${x.id}` })), { memberName: 'sessions', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/camp-sessions/:id', (c) => {
    emitMeter('getCampSession')
    const s = store.getCampSession(ws, c.req.param('id'))
    if (!s) return json(c, empty(`no camp session '${c.req.param('id')}' — see /camp-sessions`, { memberName: 'sessions' }), 200)
    return json(c, ok([s], { memberName: 'sessions', extra: { links: { ...collectionLinks(), enroll: `${ORIGIN}/camp-sessions/${s.id}/enrollments` } } }))
  })

  app.post('/camp-sessions/:id/enrollments', async (c) => {
    emitMeter('enrollCamper')
    const input = await c.req.json().catch(() => ({}))
    const result = store.enrollCamper(ws, c.req.param('id'), input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.enrollment], { memberName: 'enrollments', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/operators', (c) => {
    emitMeter('listOperators')
    return json(c, ok(store.listOperators(), { memberName: 'operators', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  // ── auxiliary machine faces ──────────────────────────────────────────────

  app.get('/icp.json', (c) => {
    emitMeter('getIcp')
    return json(c, icp)
  })

  app.get('/verify', (c) => {
    emitMeter('getVerify')
    const url = new URL(c.req.url)
    return serveNegotiated(c.req.raw, url, {
      json: VERIFY_DOC,
      md: `# travel-tourism.org.ai — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>travel-tourism.org.ai — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
    })
  })

  app.get('/checkout', (c) => {
    emitMeter('getCheckout')
    return json(c, ok([CHECKOUT_STUB], { memberName: 'checkout' }))
  })

  // ── the machine face + typed 404 floor ───────────────────────────────────
  // B2A placeholder face: no OAuth/CC door is mounted (spec §9.1 — B2A
  // projections use machine identity + 402, never OAuth/CC gates). The #17
  // ladder rungs above the sandbox floor are declared as labeled stubs in
  // the 402 OFFER alternatives; no /login exists here by design.

  app.all('*', async (c) => {
    const path = new URL(c.req.url).pathname
    const hit = await axpHandler(c.req.raw)
    if (hit !== undefined) {
      if (path === '/') emitTraffic('visit', c.req.raw)
      if (path === '/bookings') emitMeter('listBookings')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
