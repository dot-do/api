/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/draw-packages); everything else lives here.
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
  extension: 'axp-ext-rates-g2@0.2.0 (digest sha256:903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5), native in vendored axp-faces 0.3.0',
  vendoredFrom: 'axp.org.ai repo, branch draft/axp-extension-rates-g2, commit 523c9ef217d54feefb0b20734a6d2996a6965b79 (byte-identical, PINS.json-digested)',
  run: [
    'git clone the @dotdo/api repo, branch draft/construction-wave0',
    'pnpm install',
    'npx vitest run tests/apis-construction.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome verb',
    'seed fixture law: every record labeled example data; synthetic 00-prefix EINs and DEMO- permit numbers; no real names or jurisdictions',
    'pay-application arithmetic identity (completedToDate − retainage − previousPayments = currentPaymentDue) and draw-package referential integrity',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/apis.construction',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/draw-packages`,
    payApplications: `${ORIGIN}/pay-applications`,
    lienWaivers: `${ORIGIN}/lien-waivers`,
    permits: `${ORIGIN}/permits`,
    projects: `${ORIGIN}/projects`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/draw-packages/:id', (c) => {
    emitMeter('getDrawPackage')
    const d = store.getDrawPackage(c.req.param('id'))
    if (!d) return json(c, empty(`no draw package '${c.req.param('id')}' — see /draw-packages`, { memberName: 'drawPackages' }), 200)
    return json(c, ok([d], { memberName: 'drawPackages', extra: { links: { ...collectionLinks(), order: `${ORIGIN}/draw-packages/${d.id}/order`, payApplication: `${ORIGIN}/pay-applications/${d.payApplicationId}` } } }))
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  app.post('/draw-packages/:id/order', (c) => {
    emitMeter('orderDrawPackage', 'self-serve-metered')
    const d = store.getDrawPackage(c.req.param('id'))
    if (!d) return json(c, empty(`no draw package '${c.req.param('id')}' — see /draw-packages`, { memberName: 'drawPackages' }), 200)
    const perOutcome = RATES.find((r) => r.operation === 'orderDrawPackage')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Order: ${d.title}`,
        rate: perOutcome,
        drawPackage: d.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout).',
      }),
      { status: 402 },
    )
  })

  app.get('/pay-applications', (c) => {
    emitMeter('listPayApplications')
    const period = c.req.query('period')
    const projectId = c.req.query('project')
    let as = store.listPayApplications(ws)
    if (period) as = as.filter((a) => a.period === period)
    if (projectId) as = as.filter((a) => a.projectId === projectId)
    if (as.length === 0) return json(c, empty('no pay applications match — a truthful empty set, not an error', { memberName: 'payApplications' }))
    return json(c, ok(as, { memberName: 'payApplications', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/pay-applications/:id', (c) => {
    emitMeter('getPayApplication')
    const a = store.getPayApplication(ws, c.req.param('id'))
    if (!a) return json(c, empty(`no pay application '${c.req.param('id')}' — see /pay-applications`, { memberName: 'payApplications' }), 200)
    return json(c, ok([a], { memberName: 'payApplications', extra: { links: collectionLinks() } }))
  })

  app.post('/projects/:id/pay-applications', async (c) => {
    emitMeter('submitPayApplication')
    const input = await c.req.json().catch(() => ({}))
    const result = store.submitPayApplication(ws, c.req.param('id'), input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.application], { memberName: 'payApplications', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/lien-waivers', (c) => {
    emitMeter('listLienWaivers')
    const waiverType = c.req.query('waiverType')
    const projectId = c.req.query('project')
    let wsv = store.listLienWaivers()
    if (waiverType) wsv = wsv.filter((w) => w.waiverType === waiverType)
    if (projectId) wsv = wsv.filter((w) => w.projectId === projectId)
    if (wsv.length === 0) return json(c, empty('no lien waivers match — a truthful empty set, not an error', { memberName: 'lienWaivers' }))
    return json(c, ok(wsv, { memberName: 'lienWaivers', extra: { links: collectionLinks() } }))
  })

  app.get('/lien-waivers/:id', (c) => {
    emitMeter('getLienWaiver')
    const w = store.getLienWaiver(c.req.param('id'))
    if (!w) return json(c, empty(`no lien waiver '${c.req.param('id')}' — see /lien-waivers`, { memberName: 'lienWaivers' }), 200)
    return json(c, ok([w], { memberName: 'lienWaivers', extra: { links: collectionLinks() } }))
  })

  app.get('/permits', (c) => {
    emitMeter('listPermits')
    const projectId = c.req.query('project')
    let ps = store.listPermits()
    if (projectId) ps = ps.filter((p) => p.projectId === projectId)
    if (ps.length === 0) return json(c, empty('no permits match — a truthful empty set, not an error', { memberName: 'permits' }))
    return json(c, ok(ps, { memberName: 'permits', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/permits/:id', (c) => {
    emitMeter('getPermit')
    const p = store.getPermit(c.req.param('id'))
    if (!p) return json(c, empty(`no permit '${c.req.param('id')}' — see /permits`, { memberName: 'permits' }), 200)
    return json(c, ok([p], { memberName: 'permits', extra: { links: collectionLinks() } }))
  })

  app.get('/projects', (c) => {
    emitMeter('listProjects')
    return json(c, ok(store.listProjects(), { memberName: 'projects', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/projects/:id', (c) => {
    emitMeter('getProject')
    const p = store.getProject(c.req.param('id'))
    if (!p) return json(c, empty(`no project '${c.req.param('id')}' — see /projects`, { memberName: 'projects' }), 200)
    return json(c, ok([p], { memberName: 'projects', extra: { links: { ...collectionLinks(), submitPayApplication: `${ORIGIN}/projects/${p.id}/pay-applications` } } }))
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
      md: `# apis.construction — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n- extension: ${VERIFY_DOC.extension}\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.construction — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
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
    const key = `constr_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
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
      if (path === '/draw-packages') emitMeter('listDrawPackages')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
