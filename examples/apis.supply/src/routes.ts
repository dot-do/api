/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed X12
 * document collections AND the headless face's order-management/EDI doors are
 * the SAME routes — one definition, one store, typed OK | EMPTY | BLOCKED |
 * OFFER envelopes everywhere. The vendored generator serves the branching
 * collection (/purchase-orders GET); everything else lives here.
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
  run: [
    'git clone the @dotdo/api repo, branch draft/wholesale-distribution-wave0',
    'pnpm install',
    'npx vitest run tests/apis-supply.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law: every rates[].operation ⊆ OpenAPI operationIds; every rate row names its free quota or prices from zero',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome verb',
    'seed fixture law: every record labeled example data; GS1 demo prefix 952 with valid check digits; no real company or person names',
    'document-flow consistency: shipped quantities ≤ ordered; invoice totals equal shipped × unit price',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/apis.supply',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/purchase-orders`,
    shipNotices: `${ORIGIN}/ship-notices`,
    invoices: `${ORIGIN}/invoices`,
    catalogItems: `${ORIGIN}/catalog-items`,
    landedCost: `${ORIGIN}/landed-cost`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  // The agent-native EDI door: submit an 850-typed PO (ephemeral workspace).
  // The keyless branching collection (GET /purchase-orders, served by the
  // vendored generator) lists the SEED corpus; workspace POs are ephemeral
  // and addressable by id — disclosed in the response.
  app.post('/purchase-orders', async (c) => {
    emitMeter('submitPurchaseOrder')
    const input = await c.req.json().catch(() => ({}))
    const result = store.submitPurchaseOrder(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(
      c,
      ok([result.purchaseOrder], {
        memberName: 'purchaseOrders',
        extra: {
          retention: RETENTION_NOTE,
          links: { ...collectionLinks(), self: `${ORIGIN}/purchase-orders/${result.purchaseOrder!.id}` },
          note: 'workspace purchase orders are ephemeral (per-isolate) and addressable by id; the keyless seed collection lists seed documents only',
        },
      }),
      201,
    )
  })

  app.get('/purchase-orders/:id', (c) => {
    emitMeter('getPurchaseOrder')
    const po = store.getPurchaseOrder(ws, c.req.param('id'))
    if (!po) return json(c, empty(`no purchase order '${c.req.param('id')}' — see /purchase-orders`, { memberName: 'purchaseOrders' }), 200)
    const flow = store.documentFlow(po.id)
    return json(
      c,
      ok([po], {
        memberName: 'purchaseOrders',
        extra: {
          links: {
            ...collectionLinks(),
            match: `${ORIGIN}/purchase-orders/${po.id}/match`,
            ...(flow.shipNoticeId && { shipNotice: `${ORIGIN}/ship-notices/${flow.shipNoticeId}` }),
            ...(flow.invoiceId && { invoice: `${ORIGIN}/invoices/${flow.invoiceId}` }),
          },
        },
      }),
    )
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  app.post('/purchase-orders/:id/match', (c) => {
    emitMeter('matchPurchaseOrder', 'self-serve-metered')
    const po = store.getPurchaseOrder(ws, c.req.param('id'))
    if (!po) return json(c, empty(`no purchase order '${c.req.param('id')}' — see /purchase-orders`, { memberName: 'purchaseOrders' }), 200)
    const perOutcome = RATES.find((r) => r.operation === 'matchPurchaseOrder')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Order: verified three-way match for ${po.poNumber}`,
        rate: perOutcome,
        purchaseOrder: po.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/ship-notices', (c) => {
    emitMeter('listShipNotices')
    const poId = c.req.query('po')
    let notices = store.listShipNotices()
    if (poId) notices = notices.filter((s) => s.poId === poId)
    if (notices.length === 0) return json(c, empty('no ship notices match — a truthful empty set, not an error', { memberName: 'shipNotices' }))
    return json(c, ok(notices, { memberName: 'shipNotices', extra: { links: collectionLinks() } }))
  })

  app.get('/ship-notices/:id', (c) => {
    emitMeter('getShipNotice')
    const s = store.getShipNotice(c.req.param('id'))
    if (!s) return json(c, empty(`no ship notice '${c.req.param('id')}' — see /ship-notices`, { memberName: 'shipNotices' }), 200)
    return json(c, ok([s], { memberName: 'shipNotices', extra: { links: { ...collectionLinks(), purchaseOrder: `${ORIGIN}/purchase-orders/${s.poId}` } } }))
  })

  app.get('/invoices', (c) => {
    emitMeter('listInvoices')
    const poId = c.req.query('po')
    let invoices = store.listInvoices()
    if (poId) invoices = invoices.filter((i) => i.poId === poId)
    if (invoices.length === 0) return json(c, empty('no invoices match — a truthful empty set, not an error', { memberName: 'invoices' }))
    return json(c, ok(invoices, { memberName: 'invoices', extra: { links: collectionLinks() } }))
  })

  app.get('/invoices/:id', (c) => {
    emitMeter('getInvoice')
    const inv = store.getInvoice(c.req.param('id'))
    if (!inv) return json(c, empty(`no invoice '${c.req.param('id')}' — see /invoices`, { memberName: 'invoices' }), 200)
    return json(c, ok([inv], { memberName: 'invoices', extra: { links: { ...collectionLinks(), purchaseOrder: `${ORIGIN}/purchase-orders/${inv.poId}` } } }))
  })

  app.get('/catalog-items', (c) => {
    emitMeter('listCatalogItems')
    return json(c, ok(store.listCatalogItems(), { memberName: 'catalogItems', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/catalog-items/:gtin', (c) => {
    emitMeter('getCatalogItem')
    const item = store.getCatalogItem(c.req.param('gtin'))
    if (!item) return json(c, empty(`no catalog item with gtin '${c.req.param('gtin')}' — see /catalog-items`, { memberName: 'catalogItems' }), 200)
    return json(c, ok([item], { memberName: 'catalogItems', extra: { links: { ...collectionLinks(), landedCost: `${ORIGIN}/landed-cost` } } }))
  })

  app.post('/landed-cost', async (c) => {
    emitMeter('quoteLandedCost')
    const input = await c.req.json().catch(() => ({}))
    const result = store.quoteLandedCost(input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.quote], { memberName: 'quotes', extra: { retention: RETENTION_NOTE } }), 201)
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
      md: `# apis.supply — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.supply — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
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
    const key = `supply_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
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
      if (path === '/purchase-orders') emitMeter('listPurchaseOrders')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
