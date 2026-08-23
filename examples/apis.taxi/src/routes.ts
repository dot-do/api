/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/trips); everything else lives here.
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
    'git clone the @dotdo/api repo, branch draft/passenger-mobility-wave0',
    'pnpm install',
    'npx vitest run tests/apis-taxi.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota only on priced rows, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome dispatch verb',
    'seed fixture law: every record labeled example data; DEMO-prefixed synthetic identifiers; fictional operator and city; no real names, no real transit feeds',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/apis.taxi',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/trips`,
    reservations: `${ORIGIN}/reservations`,
    fares: `${ORIGIN}/fares`,
    vehicles: `${ORIGIN}/vehicles`,
    transitSchedules: `${ORIGIN}/transit-schedules`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {
  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/trips/:id', (c) => {
    emitMeter('getTrip')
    const t = store.getTrip(c.req.param('id'))
    if (!t) return json(c, empty(`no trip '${c.req.param('id')}' — see /trips`, { memberName: 'trips' }), 200)
    return json(c, ok([t], { memberName: 'trips', extra: { links: collectionLinks() } }))
  })

  app.get('/reservations', (c) => {
    emitMeter('listReservations')
    const status = c.req.query('status')
    let rs = store.listReservations(ws)
    if (status) rs = rs.filter((r) => r.status === status)
    if (rs.length === 0) return json(c, empty('no reservations match — a truthful empty set, not an error', { memberName: 'reservations' }))
    return json(c, ok(rs, { memberName: 'reservations', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/reservations/:id', (c) => {
    emitMeter('getReservation')
    const r = store.getReservation(ws, c.req.param('id'))
    if (!r) return json(c, empty(`no reservation '${c.req.param('id')}' — see /reservations`, { memberName: 'reservations' }), 200)
    return json(c, ok([r], { memberName: 'reservations', extra: { links: { ...collectionLinks(), dispatch: `${ORIGIN}/reservations/${r.id}/dispatch` } } }))
  })

  app.post('/reservations', async (c) => {
    emitMeter('createReservation')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createReservation(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.reservation], { memberName: 'reservations', extra: { retention: RETENTION_NOTE } }), 201)
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  app.post('/reservations/:id/dispatch', (c) => {
    emitMeter('dispatchTrip', 'self-serve-metered')
    const r = store.getReservation(ws, c.req.param('id'))
    if (!r) return json(c, empty(`no reservation '${c.req.param('id')}' — see /reservations`, { memberName: 'reservations' }), 200)
    const perOutcome = RATES.find((x) => x.operation === 'dispatchTrip')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Dispatch: ${r.fromZone} → ${r.toZone} (${r.serviceClass})`,
        rate: perOutcome,
        reservation: r.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/fares', (c) => {
    emitMeter('listFares')
    const serviceClass = c.req.query('serviceClass')
    let fares = store.listFares()
    if (serviceClass) fares = fares.filter((f) => f.serviceClass === serviceClass)
    if (fares.length === 0) return json(c, empty('no fares match — a truthful empty set, not an error', { memberName: 'fares' }))
    return json(c, ok(fares, { memberName: 'fares', extra: { links: collectionLinks() } }))
  })

  app.get('/fares/quote', (c) => {
    emitMeter('quoteFare')
    const result = store.quoteFare(c.req.query('fromZone') ?? '', c.req.query('toZone') ?? '', c.req.query('serviceClass') ?? '')
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.fare], { memberName: 'fares', extra: { links: collectionLinks() } }))
  })

  app.get('/vehicles', (c) => {
    emitMeter('listVehicles')
    return json(c, ok(store.listVehicles(), { memberName: 'vehicles', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/vehicles/:id', (c) => {
    emitMeter('getVehicle')
    const v = store.getVehicle(c.req.param('id'))
    if (!v) return json(c, empty(`no vehicle '${c.req.param('id')}' — see /vehicles`, { memberName: 'vehicles' }), 200)
    return json(c, ok([v], { memberName: 'vehicles', extra: { links: collectionLinks() } }))
  })

  app.get('/transit-schedules', (c) => {
    emitMeter('listTransitSchedules')
    const routeId = c.req.query('routeId')
    let schedules = store.listTransitSchedules()
    if (routeId) schedules = schedules.filter((s) => s.routeId === routeId)
    if (schedules.length === 0) return json(c, empty('no schedules match — a truthful empty set, not an error', { memberName: 'schedules' }))
    return json(c, ok(schedules, { memberName: 'schedules', extra: { links: collectionLinks() } }))
  })

  app.get('/transit-schedules/:id', (c) => {
    emitMeter('getTransitSchedule')
    const s = store.getTransitSchedule(c.req.param('id'))
    if (!s) return json(c, empty(`no schedule '${c.req.param('id')}' — see /transit-schedules`, { memberName: 'schedules' }), 200)
    return json(c, ok([s], { memberName: 'schedules', extra: { links: collectionLinks() } }))
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
      md: `# apis.taxi — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.taxi — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
    })
  })

  app.get('/checkout', (c) => {
    emitMeter('getCheckout')
    return json(c, ok([CHECKOUT_STUB], { memberName: 'checkout' }))
  })

  // ── the B2D free-tier door (labeled demo mode — the api.ht auth pattern) ──

  app.get('/login', (c) => {
    emitTraffic('signup', c.req.raw)
    const clientId = (c.env as Record<string, unknown> | undefined)?.GITHUB_CLIENT_ID as string | undefined
    if (clientId) {
      const params = new URLSearchParams({ client_id: clientId, redirect_uri: `${ORIGIN}/callback`, scope: 'read:user' })
      return c.redirect(`https://github.com/login/oauth/authorize?${params}`, 302)
    }
    return c.redirect('/callback?demo=1', 302)
  })

  app.get('/callback', (c) => {
    emitTraffic('signup', c.req.raw)
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const key = `taxi_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
    return json(
      c,
      ok([{ apiKey: key, tier: 'free' }], {
        memberName: 'keys',
        extra: {
          note: 'DEMO — GitHub OAuth app not configured; this key is random, unpersisted, and not yet enforced. The free tier is currently anonymous.',
        },
      }),
    )
  })

  // ── the machine face + typed 404 floor ───────────────────────────────────

  app.all('*', async (c) => {
    const path = new URL(c.req.url).pathname
    const hit = await axpHandler(c.req.raw)
    if (hit !== undefined) {
      if (path === '/') emitTraffic('visit', c.req.raw)
      if (path === '/trips') emitMeter('listTrips')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
