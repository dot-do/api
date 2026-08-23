/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/close-deliverables); everything else lives here.
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
    'git clone the @dotdo/api repo, branch draft/accounting-tax-wave0',
    'pnpm install',
    'npx vitest run tests/apis-accountants.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome verb',
    'seed fixture law: every record labeled example data; synthetic 00-prefix EINs; no real names',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/apis.accountants',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/close-deliverables`,
    ledgers: `${ORIGIN}/ledgers`,
    returns: `${ORIGIN}/returns`,
    clients: `${ORIGIN}/clients`,
    engagements: `${ORIGIN}/engagements`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/ledgers', (c) => {
    emitMeter('listLedgers')
    const ledgers = store.listLedgers(ws).map((l) => ({ ...l, entries: undefined, entryCount: l.entries.length, href: `${ORIGIN}/ledgers/${l.id}` }))
    return json(c, ok(ledgers, { memberName: 'ledgers', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/ledgers/:id', (c) => {
    emitMeter('getLedger')
    const ledger = store.getLedger(ws, c.req.param('id'))
    if (!ledger) return json(c, empty(`no ledger '${c.req.param('id')}' — see /ledgers`, { memberName: 'ledgers' }), 200)
    return json(c, ok([ledger], { memberName: 'ledgers', extra: { links: { ...collectionLinks(), postEntry: `${ORIGIN}/ledgers/${ledger.id}/entries` } } }))
  })

  app.post('/ledgers/:id/entries', async (c) => {
    emitMeter('postEntry')
    const input = await c.req.json().catch(() => ({}))
    const result = store.postEntry(ws, c.req.param('id'), input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.entry], { memberName: 'entries', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/close-deliverables/:id', (c) => {
    emitMeter('getCloseDeliverable')
    const d = store.getCloseDeliverable(c.req.param('id'))
    if (!d) return json(c, empty(`no close deliverable '${c.req.param('id')}' — see /close-deliverables`, { memberName: 'deliverables' }), 200)
    return json(c, ok([d], { memberName: 'deliverables', extra: { links: { ...collectionLinks(), order: `${ORIGIN}/close-deliverables/${d.id}/order` } } }))
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  app.post('/close-deliverables/:id/order', (c) => {
    emitMeter('orderCloseDeliverable', 'self-serve-metered')
    const d = store.getCloseDeliverable(c.req.param('id'))
    if (!d) return json(c, empty(`no close deliverable '${c.req.param('id')}' — see /close-deliverables`, { memberName: 'deliverables' }), 200)
    const perOutcome = RATES.find((r) => r.operation === 'orderCloseDeliverable')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Order: ${d.title}`,
        rate: perOutcome,
        deliverable: d.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/returns', (c) => {
    emitMeter('listReturns')
    const year = c.req.query('year')
    const clientId = c.req.query('client')
    let rs = store.listReturns()
    if (year) rs = rs.filter((r) => String(r.year) === year)
    if (clientId) rs = rs.filter((r) => r.clientId === clientId)
    if (rs.length === 0) return json(c, empty('no returns match — a truthful empty set, not an error', { memberName: 'returns' }))
    return json(c, ok(rs, { memberName: 'returns', extra: { links: collectionLinks() } }))
  })

  app.get('/returns/:id', (c) => {
    emitMeter('getReturn')
    const r = store.getReturn(c.req.param('id'))
    if (!r) return json(c, empty(`no return '${c.req.param('id')}' — see /returns`, { memberName: 'returns' }), 200)
    return json(c, ok([r], { memberName: 'returns', extra: { links: collectionLinks() } }))
  })

  app.get('/clients', (c) => {
    emitMeter('listClients')
    return json(c, ok(store.listClients(), { memberName: 'clients', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/engagements', (c) => {
    emitMeter('listEngagements')
    return json(c, ok(store.listEngagements(ws), { memberName: 'engagements', extra: { links: collectionLinks() } }))
  })

  app.post('/engagements', async (c) => {
    emitMeter('createEngagement')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createEngagement(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.engagement], { memberName: 'engagements', extra: { retention: RETENTION_NOTE } }), 201)
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
      md: `# apis.accountants — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.accountants — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
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
    const key = `acct_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
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
      if (path === '/close-deliverables') emitMeter('listCloseDeliverables')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
