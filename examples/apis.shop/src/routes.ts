/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's OMS/storefront system-of-record doors
 * are the SAME routes — one definition, one store, typed
 * OK | EMPTY | BLOCKED | OFFER envelopes everywhere. The vendored generator
 * serves the branching collection (/products); everything else lives here.
 *
 * B2A motion law: there is NO OAuth door and NO checkout/credit-card door on
 * this face — onboarding is the ladder, and the only rung mounted at wave
 * zero is the anonymous sandbox.
 */

import type { Hono, Context } from 'hono'
import type { ApiEnv } from '../../../src/types'
// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { ok, empty, blocked, envelopeResponse } from '../axp/envelope.js'
// @ts-ignore vendored
import { serveNegotiated } from '../axp/conneg.js'
import { axpHandler } from './axp'
import { ORIGIN } from './manifest'
import * as store from './store'
import { emitMeter, emitTraffic } from './seams'
import icp from './icp'
import { RETENTION_NOTE } from './seed'

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

function json(c: Context<ApiEnv>, body: unknown, status = 200): Response {
  void c
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...JSON_CT, vary: 'accept' } })
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
    'git clone the @dotdo/api repo, branch draft/retail-ecommerce-wave0',
    'pnpm install',
    'npx vitest run tests/apis-shop.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law: every rates[].operation ⊆ OpenAPI operationIds; every rate row names its free quota or prices from zero',
    'GS1 fixture law: every seed GTIN sits in the demo-952 space with a valid check digit; every record labeled example data; no real merchant or person names',
    'envelope typing on every data route; the 402 OFFER boundary at the declared offer path; only mounted ladder rungs advertised',
    'B2A motion law: no OAuth door, no checkout/credit-card door on this face',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/apis.shop',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/products`,
    offers: `${ORIGIN}/offers`,
    orders: `${ORIGIN}/orders`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/products/:gtin', (c) => {
    emitMeter('getProduct')
    const gtin = c.req.param('gtin')
    const product = store.getProduct(ws, gtin)
    if (!product) return json(c, empty(`no product with GTIN '${gtin}' — see /products`, { memberName: 'products' }), 200)
    return json(c, ok([product], { memberName: 'products', extra: { links: { ...collectionLinks(), digitalLink: `${ORIGIN}/digital-links/${gtin}` } } }))
  })

  app.post('/products', async (c) => {
    emitMeter('createProduct')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createProduct(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.product], { memberName: 'products', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/digital-links/:gtin', (c) => {
    emitMeter('resolveDigitalLink')
    const gtin = c.req.param('gtin')
    const identity = store.resolveIdentity(ws, gtin)
    if (!identity) return json(c, empty(`no product with GTIN '${gtin}' in this catalog — see /products`, { memberName: 'identities' }), 200)
    return json(c, ok([identity], { memberName: 'identities', extra: { links: { ...collectionLinks(), product: `${ORIGIN}/products/${gtin}` } } }))
  })

  app.get('/offers', (c) => {
    emitMeter('listOffers')
    const gtin = c.req.query('gtin')
    const availability = c.req.query('availability')
    let offers = store.listOffers(ws)
    if (gtin) offers = offers.filter((o) => o.gtin === gtin)
    if (availability) offers = offers.filter((o) => o.availability === availability)
    if (offers.length === 0) return json(c, empty('no offers match — a truthful empty set, not an error', { memberName: 'offers' }))
    return json(c, ok(offers, { memberName: 'offers', extra: { links: collectionLinks() } }))
  })

  app.get('/offers/:id', (c) => {
    emitMeter('getOffer')
    const offerRec = store.getOffer(ws, c.req.param('id'))
    if (!offerRec) return json(c, empty(`no offer '${c.req.param('id')}' — see /offers`, { memberName: 'offers' }), 200)
    return json(c, ok([offerRec], { memberName: 'offers', extra: { links: { ...collectionLinks(), product: `${ORIGIN}/products/${offerRec.gtin}` } } }))
  })

  app.post('/offers', async (c) => {
    emitMeter('createOffer')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createOffer(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.offer], { memberName: 'offers', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/orders', (c) => {
    emitMeter('listOrders')
    const status = c.req.query('status')
    let orders = store.listOrders(ws)
    if (status) orders = orders.filter((o) => o.status === status)
    if (orders.length === 0) return json(c, empty('no orders match — a truthful empty set, not an error', { memberName: 'orders' }))
    return json(c, ok(orders, { memberName: 'orders', extra: { links: collectionLinks() } }))
  })

  app.get('/orders/:id', (c) => {
    emitMeter('getOrder')
    const order = store.getOrder(ws, c.req.param('id'))
    if (!order) return json(c, empty(`no order '${c.req.param('id')}' — see /orders`, { memberName: 'orders' }), 200)
    return json(c, ok([order], { memberName: 'orders', extra: { links: collectionLinks() } }))
  })

  // The agents-as-buyers door: order capture at the commerce rail. Sandbox
  // rung — the order is minted into the ephemeral workspace; no payment
  // occurs anywhere (settlement rail not activated; a fake charge is fake
  // billing, so there is none).
  app.post('/orders', async (c) => {
    emitMeter('createOrder')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createOrder(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.order], { memberName: 'orders', extra: { retention: RETENTION_NOTE } }), 201)
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
      md: `# apis.shop — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.shop — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
    })
  })

  // ── the machine face + typed 404 floor ───────────────────────────────────

  app.all('*', async (c) => {
    const path = new URL(c.req.url).pathname
    const hit = await axpHandler(c.req.raw)
    if (hit !== undefined) {
      if (path === '/') emitTraffic('visit', c.req.raw)
      if (path === '/products') emitMeter('listProducts')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
