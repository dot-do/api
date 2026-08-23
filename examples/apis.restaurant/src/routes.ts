/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/inventory-counts); everything else lives here.
 */

import type { Hono, Context } from 'hono'
import type { ApiEnv } from '../../../core/src/types'
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
    'The 402 OFFER boundary and this checkout seam are the served product surface; which rail answers is the platform\'s decision, not this property\'s.',
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
  extension: 'axp-ext-rates-g2@0.2.0 (digest sha256:903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5), native in vendored axp-faces 0.3.0',
  vendoredFrom: 'axp.org.ai repo, branch draft/axp-extension-rates-g2, commit 523c9ef217d54feefb0b20734a6d2996a6965b79 (byte-identical, PINS.json-digested)',
  run: [
    'git clone the @dotdo/api repo, branch draft/restaurants-food-service-wave0',
    'cd core && pnpm install --ignore-workspace   # root manifest on this line names absent workspace packages (pre-existing defect, filed upstream)',
    'npx vitest run tests/apis-restaurant.test.ts   # from core/',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome verb',
    'seed fixture law: every record labeled example data; synthetic 00-prefix EINs; GS1 demo-prefix (952) GTINs with valid check digits; no real names',
    'food-cost arithmetic identity (openingValue + purchasesValue − countedValue = usageCost), cycle continuity (July opens on June\'s counted value), invoice/order rollups, and referential integrity',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/apis.restaurant',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/inventory-counts`,
    parLevels: `${ORIGIN}/par-levels`,
    supplierInvoices: `${ORIGIN}/supplier-invoices`,
    orders: `${ORIGIN}/orders`,
    menus: `${ORIGIN}/menus`,
    locations: `${ORIGIN}/locations`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/inventory-counts/:id', (c) => {
    emitMeter('getInventoryCount')
    const count = store.getInventoryCount(ws, c.req.param('id'))
    if (!count) return json(c, empty(`no inventory count '${c.req.param('id')}' — see /inventory-counts`, { memberName: 'inventoryCounts' }), 200)
    return json(c, ok([count], { memberName: 'inventoryCounts', extra: { links: { ...collectionLinks(), reconcile: `${ORIGIN}/inventory-counts/${count.id}/reconcile`, location: `${ORIGIN}/locations/${count.locationId}` } } }))
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  app.post('/inventory-counts/:id/reconcile', (c) => {
    emitMeter('reconcileInventoryCount', 'self-serve-metered')
    const count = store.getInventoryCount(ws, c.req.param('id'))
    if (!count) return json(c, empty(`no inventory count '${c.req.param('id')}' — see /inventory-counts`, { memberName: 'inventoryCounts' }), 200)
    const perOutcome = RATES.find((r) => r.operation === 'reconcileInventoryCount')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Reconcile: inventory count ${count.id} (${count.period})`,
        rate: perOutcome,
        inventoryCount: count.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/par-levels', (c) => {
    emitMeter('listParLevels')
    const locationId = c.req.query('location')
    let ps = store.listParLevels()
    if (locationId) ps = ps.filter((p) => p.locationId === locationId)
    if (ps.length === 0) return json(c, empty('no par levels match — a truthful empty set, not an error', { memberName: 'parLevels' }))
    return json(c, ok(ps, { memberName: 'parLevels', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/par-levels/:id', (c) => {
    emitMeter('getParLevel')
    const p = store.getParLevel(c.req.param('id'))
    if (!p) return json(c, empty(`no par level '${c.req.param('id')}' — see /par-levels`, { memberName: 'parLevels' }), 200)
    return json(c, ok([p], { memberName: 'parLevels', extra: { links: collectionLinks() } }))
  })

  app.get('/supplier-invoices', (c) => {
    emitMeter('listSupplierInvoices')
    const period = c.req.query('period')
    const locationId = c.req.query('location')
    let sis = store.listSupplierInvoices()
    if (period) sis = sis.filter((si) => si.period === period)
    if (locationId) sis = sis.filter((si) => si.locationId === locationId)
    if (sis.length === 0) return json(c, empty('no supplier invoices match — a truthful empty set, not an error', { memberName: 'supplierInvoices' }))
    return json(c, ok(sis, { memberName: 'supplierInvoices', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/supplier-invoices/:id', (c) => {
    emitMeter('getSupplierInvoice')
    const si = store.getSupplierInvoice(c.req.param('id'))
    if (!si) return json(c, empty(`no supplier invoice '${c.req.param('id')}' — see /supplier-invoices`, { memberName: 'supplierInvoices' }), 200)
    return json(c, ok([si], { memberName: 'supplierInvoices', extra: { links: collectionLinks() } }))
  })

  app.get('/orders', (c) => {
    emitMeter('listOrders')
    const period = c.req.query('period')
    const locationId = c.req.query('location')
    let os = store.listOrders()
    if (period) os = os.filter((o) => o.period === period)
    if (locationId) os = os.filter((o) => o.locationId === locationId)
    if (os.length === 0) return json(c, empty('no orders match — a truthful empty set, not an error', { memberName: 'orders' }))
    return json(c, ok(os, { memberName: 'orders', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/orders/:id', (c) => {
    emitMeter('getOrder')
    const o = store.getOrder(c.req.param('id'))
    if (!o) return json(c, empty(`no order '${c.req.param('id')}' — see /orders`, { memberName: 'orders' }), 200)
    return json(c, ok([o], { memberName: 'orders', extra: { links: collectionLinks() } }))
  })

  app.get('/menus', (c) => {
    emitMeter('listMenus')
    const locationId = c.req.query('location')
    let ms = store.listMenus()
    if (locationId) ms = ms.filter((m) => m.locationId === locationId)
    if (ms.length === 0) return json(c, empty('no menus match — a truthful empty set, not an error', { memberName: 'menus' }))
    return json(c, ok(ms, { memberName: 'menus', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/menus/:id', (c) => {
    emitMeter('getMenu')
    const m = store.getMenu(c.req.param('id'))
    if (!m) return json(c, empty(`no menu '${c.req.param('id')}' — see /menus`, { memberName: 'menus' }), 200)
    return json(c, ok([m], { memberName: 'menus', extra: { links: collectionLinks() } }))
  })

  app.get('/locations', (c) => {
    emitMeter('listLocations')
    return json(c, ok(store.listLocations(), { memberName: 'locations', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/locations/:id', (c) => {
    emitMeter('getLocation')
    const l = store.getLocation(c.req.param('id'))
    if (!l) return json(c, empty(`no location '${c.req.param('id')}' — see /locations`, { memberName: 'locations' }), 200)
    return json(c, ok([l], { memberName: 'locations', extra: { links: { ...collectionLinks(), recordInventoryCount: `${ORIGIN}/locations/${l.id}/inventory-counts` } } }))
  })

  app.post('/locations/:id/inventory-counts', async (c) => {
    emitMeter('recordInventoryCount')
    const input = await c.req.json().catch(() => ({}))
    const result = store.recordInventoryCount(ws, c.req.param('id'), input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.count], { memberName: 'inventoryCounts', extra: { retention: RETENTION_NOTE } }), 201)
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
      md: `# apis.restaurant — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n- extension: ${VERIFY_DOC.extension}\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.restaurant — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
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
    const key = `rest_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
    return json(c, ok([{ apiKey: key, tier: 'free' }], {
      memberName: 'keys',
      extra: {
        note: 'DEMO — GitHub OAuth app not configured; this key is random, unpersisted, and not yet enforced. The free tier is currently anonymous.',
      },
    }))
  })

  // ── the machine face + typed 404 floor ───────────────────────────────────

  app.all('*', async (c) => {
    const path = new URL(c.req.url).pathname
    const hit = await axpHandler(c.req.raw)
    if (hit !== undefined) {
      if (path === '/') emitTraffic('visit', c.req.raw)
      if (path === '/inventory-counts') emitMeter('listInventoryCounts')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
