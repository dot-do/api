/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/work-orders); everything else lives here.
 *
 * B2A projection: there is deliberately NO /login or OAuth door here — the
 * onboarding path is the proof-of-work ladder (anon sandbox → earned credits
 * → human-claimed → paid via 402 metering on machine identity), and every
 * 402 OFFER advertises the whole ladder in `alternatives`.
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
    'git clone the @dotdo/api repo, branch draft/facilities-services-wave0',
    'pnpm install',
    'npx vitest run tests/api-cleaning.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the dispatch verb, advertising the full B2A ladder (pay / work / claim)',
    'seed fixture law: every record labeled example data; synthetic 00-prefix EINs; no real names; the not-yet-built capture rail is disclosed, never claimed',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/api.cleaning',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/work-orders`,
    serviceVisits: `${ORIGIN}/service-visits`,
    schedules: `${ORIGIN}/schedules`,
    vendors: `${ORIGIN}/vendors`,
    facilities: `${ORIGIN}/facilities`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.post('/work-orders', async (c) => {
    emitMeter('createWorkOrder')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createWorkOrder(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.workOrder], { memberName: 'workOrders', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/work-orders/:id', (c) => {
    emitMeter('getWorkOrder')
    const w = store.getWorkOrder(ws, c.req.param('id'))
    if (!w) return json(c, empty(`no work order '${c.req.param('id')}' — see /work-orders`, { memberName: 'workOrders' }), 200)
    const visits = store.visitsFor(ws, w.id)
    return json(c, ok([{ ...w, visits }], { memberName: 'workOrders', extra: { links: { ...collectionLinks(), dispatch: `${ORIGIN}/work-orders/${w.id}/dispatch` } } }))
  })

  // The dispatch verb: always answers the 402 OFFER boundary at wave zero
  // (dispatch rail not built, settlement rail not activated — the OFFER is
  // real, the dispatch and the charge cannot be; both facts are in the body).
  app.post('/work-orders/:id/dispatch', (c) => {
    emitMeter('dispatchWorkOrder', 'paid-402')
    const w = store.getWorkOrder(ws, c.req.param('id'))
    if (!w) return json(c, empty(`no work order '${c.req.param('id')}' — see /work-orders`, { memberName: 'workOrders' }), 200)
    const perDispatch = RATES.find((r) => r.operation === 'dispatchWorkOrder')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Dispatch: ${w.title}`,
        rate: perDispatch,
        workOrder: w.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — the supply-side dispatch rail is not yet built and the settlement rail is not activated; no dispatch occurs, following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.post('/work-orders/:id/visits', async (c) => {
    emitMeter('logServiceVisit')
    const input = await c.req.json().catch(() => ({}))
    const result = store.logServiceVisit(ws, c.req.param('id'), input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.visit], { memberName: 'visits', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/service-visits', (c) => {
    emitMeter('listServiceVisits')
    const workOrderId = c.req.query('workOrder')
    let vs = store.listServiceVisits(ws)
    if (workOrderId) vs = vs.filter((v) => v.workOrderId === workOrderId)
    if (vs.length === 0) return json(c, empty('no service visits match — a truthful empty set, not an error', { memberName: 'visits' }))
    return json(c, ok(vs, { memberName: 'visits', extra: { links: collectionLinks() } }))
  })

  app.get('/schedules', (c) => {
    emitMeter('listSchedules')
    const service = c.req.query('service')
    const facilityId = c.req.query('facility')
    let ss = store.listSchedules(ws)
    if (service) ss = ss.filter((s) => s.service === service)
    if (facilityId) ss = ss.filter((s) => s.facilityId === facilityId)
    if (ss.length === 0) return json(c, empty('no schedules match — a truthful empty set, not an error', { memberName: 'schedules' }))
    return json(c, ok(ss, { memberName: 'schedules', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/schedules/:id', (c) => {
    emitMeter('getSchedule')
    const s = store.getSchedule(ws, c.req.param('id'))
    if (!s) return json(c, empty(`no schedule '${c.req.param('id')}' — see /schedules`, { memberName: 'schedules' }), 200)
    return json(c, ok([s], { memberName: 'schedules', extra: { links: collectionLinks() } }))
  })

  app.post('/schedules', async (c) => {
    emitMeter('createSchedule')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createSchedule(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.schedule], { memberName: 'schedules', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/vendors', (c) => {
    emitMeter('listVendors')
    return json(c, ok(store.listVendors(), { memberName: 'vendors', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/vendors/:id', (c) => {
    emitMeter('getVendor')
    const v = store.getVendor(c.req.param('id'))
    if (!v) return json(c, empty(`no vendor '${c.req.param('id')}' — see /vendors`, { memberName: 'vendors' }), 200)
    return json(c, ok([v], { memberName: 'vendors', extra: { links: collectionLinks() } }))
  })

  app.get('/facilities', (c) => {
    emitMeter('listFacilities')
    return json(c, ok(store.listFacilities(), { memberName: 'facilities', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
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
      md: `# api.cleaning — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>api.cleaning — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
    })
  })

  app.get('/checkout', (c) => {
    emitMeter('getCheckout')
    return json(c, ok([CHECKOUT_STUB], { memberName: 'checkout' }))
  })

  // ── the machine face + typed 404 floor ───────────────────────────────────

  app.all('*', async (c) => {
    const path = new URL(c.req.url).pathname
    const hit = await axpHandler(c.req.raw)
    if (hit !== undefined) {
      if (path === '/') emitTraffic('visit', c.req.raw)
      if (path === '/work-orders') emitMeter('listWorkOrders')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
