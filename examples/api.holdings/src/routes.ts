/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/renewals); everything else lives here.
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
    'git clone the @dotdo/api repo, branch draft/holdings-corporate-mgmt-wave0',
    'pnpm install',
    'npx vitest run tests/api-holdings.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law: every rates[].operation ⊆ OpenAPI operationIds; every rate row names its free quota or prices from zero',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome verb',
    'seed fixture law: every record labeled example data; synthetic 00-prefix EINs and DEMO-prefix UEIs/filing numbers; no real names; BOI records are status-only',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/api.holdings',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/renewals`,
    entities: `${ORIGIN}/entities`,
    formations: `${ORIGIN}/formations`,
    registrations: `${ORIGIN}/registrations`,
    boiReports: `${ORIGIN}/boi-reports`,
    registeredAgents: `${ORIGIN}/registered-agents`,
    ownershipStakes: `${ORIGIN}/ownership-stakes`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/entities', (c) => {
    emitMeter('listEntities')
    const entities = store.listEntities(ws).map((e) => ({ ...e, href: `${ORIGIN}/entities/${e.id}` }))
    return json(c, ok(entities, { memberName: 'entities', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/entities/:id', (c) => {
    emitMeter('getEntity')
    const entity = store.getEntityUnified(ws, c.req.param('id'))
    if (!entity) return json(c, empty(`no entity '${c.req.param('id')}' — see /entities`, { memberName: 'entities' }), 200)
    return json(c, ok([entity], { memberName: 'entities', extra: { links: collectionLinks() } }))
  })

  app.post('/entities', async (c) => {
    emitMeter('createEntity')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createEntity(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.entity], { memberName: 'entities', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/renewals/:id', (c) => {
    emitMeter('getRenewal')
    const r = store.getRenewal(c.req.param('id'))
    if (!r) return json(c, empty(`no renewal '${c.req.param('id')}' — see /renewals`, { memberName: 'renewals' }), 200)
    return json(c, ok([r], { memberName: 'renewals', extra: { links: { ...collectionLinks(), order: `${ORIGIN}/renewals/${r.id}/order` } } }))
  })

  // The per-outcome verb (the apply/renew transaction layer): always answers
  // the 402 OFFER boundary at wave zero (settlement rail not activated — the
  // OFFER is real, the charge cannot be).
  app.post('/renewals/:id/order', (c) => {
    emitMeter('orderRenewalFiling', 'self-serve-metered')
    const r = store.getRenewal(c.req.param('id'))
    if (!r) return json(c, empty(`no renewal '${c.req.param('id')}' — see /renewals`, { memberName: 'renewals' }), 200)
    const perOutcome = RATES.find((x) => x.operation === 'orderRenewalFiling')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Order: ${r.obligation} — ${r.entityId}`,
        rate: perOutcome,
        renewal: r.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/formations', (c) => {
    emitMeter('listFormations')
    return json(c, ok(store.listFormations(), { memberName: 'formations', extra: { links: collectionLinks() } }))
  })

  app.get('/formations/:id', (c) => {
    emitMeter('getFormation')
    const f = store.getFormation(c.req.param('id'))
    if (!f) return json(c, empty(`no formation '${c.req.param('id')}' — see /formations`, { memberName: 'formations' }), 200)
    return json(c, ok([f], { memberName: 'formations', extra: { links: collectionLinks() } }))
  })

  app.get('/registrations', (c) => {
    emitMeter('listRegistrations')
    const registry = c.req.query('registry')
    const entityId = c.req.query('entity')
    let rs = store.listRegistrations()
    if (registry) rs = rs.filter((r) => r.registry === registry)
    if (entityId) rs = rs.filter((r) => r.entityId === entityId)
    if (rs.length === 0) return json(c, empty('no registrations match — a truthful empty set, not an error', { memberName: 'registrations' }))
    return json(c, ok(rs, { memberName: 'registrations', extra: { links: collectionLinks() } }))
  })

  app.get('/registrations/:id', (c) => {
    emitMeter('getRegistration')
    const r = store.getRegistration(c.req.param('id'))
    if (!r) return json(c, empty(`no registration '${c.req.param('id')}' — see /registrations`, { memberName: 'registrations' }), 200)
    return json(c, ok([r], { memberName: 'registrations', extra: { links: collectionLinks() } }))
  })

  app.get('/boi-reports', (c) => {
    emitMeter('listBOIReports')
    return json(c, ok(store.listBOIReports(), { memberName: 'boiReports', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/registered-agents', (c) => {
    emitMeter('listRegisteredAgents')
    return json(c, ok(store.listRegisteredAgents(), { memberName: 'registeredAgents', extra: { links: collectionLinks() } }))
  })

  app.get('/ownership-stakes', (c) => {
    emitMeter('listOwnershipStakes')
    return json(c, ok(store.listOwnershipStakes(), { memberName: 'ownershipStakes', extra: { links: collectionLinks() } }))
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
      md: `# api.holdings — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>api.holdings — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
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
    const key = `hold_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
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
      if (path === '/renewals') emitMeter('listRenewals')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
