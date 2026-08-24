/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/providers); everything else lives here.
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
import { COUNSEL_BOUNDARY, RETENTION_NOTE } from './seed'

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
    'git clone the @dotdo/api repo, branch draft/healthcare-wave0',
    'cd core && pnpm install --ignore-workspace',
    'npx vitest run tests/healthcare.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs)',
    'rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota only on priced rows, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary on the per-outcome enrollment-submit verb',
    'seed fixture law: every record labeled example data; DEMO-namespace synthetic identifiers; role labels never person names; the [COUNSEL] boundary — no person-anchored public-registry record published as data',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/healthcare.org.ai',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/providers`,
    credentials: `${ORIGIN}/credentials`,
    enrollments: `${ORIGIN}/enrollments`,
    priorAuthArtifacts: `${ORIGIN}/prior-auth-artifacts`,
    eligibilityRecords: `${ORIGIN}/eligibility-records`,
    superbills: `${ORIGIN}/superbills`,
    pricing: `${ORIGIN}/pricing`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {
  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/providers/:id', (c) => {
    emitMeter('getProvider')
    const p = store.getProvider(c.req.param('id'))
    if (!p) return json(c, empty(`no provider '${c.req.param('id')}' — see /providers`, { memberName: 'providers' }), 200)
    return json(c, ok([p], { memberName: 'providers', extra: { links: collectionLinks(), boundary: COUNSEL_BOUNDARY } }))
  })

  app.get('/credentials', (c) => {
    emitMeter('listCredentials')
    const providerId = c.req.query('providerId')
    const status = c.req.query('status')
    let cs = store.listCredentials(ws)
    if (providerId) cs = cs.filter((x) => x.providerId === providerId)
    if (status) cs = cs.filter((x) => x.status === status)
    if (cs.length === 0) return json(c, empty('no credentials match — a truthful empty set, not an error', { memberName: 'credentials' }))
    return json(c, ok(cs, { memberName: 'credentials', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/credentials/:id', (c) => {
    emitMeter('getCredential')
    const cr = store.getCredential(ws, c.req.param('id'))
    if (!cr) return json(c, empty(`no credential '${c.req.param('id')}' — see /credentials`, { memberName: 'credentials' }), 200)
    return json(c, ok([cr], { memberName: 'credentials', extra: { links: collectionLinks() } }))
  })

  app.post('/credentials', async (c) => {
    emitMeter('addCredential')
    const input = await c.req.json().catch(() => ({}))
    const result = store.addCredential(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.credential], { memberName: 'credentials', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.get('/enrollments', (c) => {
    emitMeter('listEnrollments')
    const status = c.req.query('status')
    let es = store.listEnrollments(ws)
    if (status) es = es.filter((e) => e.status === status)
    if (es.length === 0) return json(c, empty('no enrollment packets match — a truthful empty set, not an error', { memberName: 'enrollments' }))
    return json(c, ok(es, { memberName: 'enrollments', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/enrollments/:id', (c) => {
    emitMeter('getEnrollment')
    const e = store.getEnrollment(ws, c.req.param('id'))
    if (!e) return json(c, empty(`no enrollment '${c.req.param('id')}' — see /enrollments`, { memberName: 'enrollments' }), 200)
    return json(c, ok([e], { memberName: 'enrollments', extra: { links: { ...collectionLinks(), submit: `${ORIGIN}/enrollments/${e.id}/submit` } } }))
  })

  app.post('/enrollments', async (c) => {
    emitMeter('createEnrollment')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createEnrollment(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.enrollment], { memberName: 'enrollments', extra: { retention: RETENTION_NOTE } }), 201)
  })

  // The per-outcome verb: always answers the 402 OFFER boundary at wave zero
  // (settlement rail not activated — the OFFER is real, the charge cannot be).
  app.post('/enrollments/:id/submit', (c) => {
    emitMeter('submitEnrollment', 'self-serve-metered')
    const e = store.getEnrollment(ws, c.req.param('id'))
    if (!e) return json(c, empty(`no enrollment '${c.req.param('id')}' — see /enrollments`, { memberName: 'enrollments' }), 200)
    const perOutcome = RATES.find((x) => x.operation === 'submitEnrollment')
    const base = (manifest as { pricing: { offers: Record<string, unknown>[] } }).pricing.offers[0]
    return envelopeResponse(
      offer({
        ...base,
        title: `Submit enrollment: ${e.providerId} → ${e.payerId} (${e.credentialIds.length} credentials attached)`,
        rate: perOutcome,
        enrollment: e.id,
        statement: PRICING_STATEMENT,
        stub: 'LABELED STUB — settlement rail not yet activated; following checkoutUrl cannot take payment (see /checkout). No packet leaves this sandbox.',
      }),
      { status: 402 },
    )
  })

  app.get('/prior-auth-artifacts', (c) => {
    emitMeter('listPriorAuthArtifacts')
    const disposition = c.req.query('disposition')
    let as_ = store.listPriorAuthArtifacts()
    if (disposition) as_ = as_.filter((a) => a.disposition === disposition)
    if (as_.length === 0) return json(c, empty('no prior-auth artifacts match — a truthful empty set, not an error', { memberName: 'priorAuthArtifacts' }))
    return json(c, ok(as_, { memberName: 'priorAuthArtifacts', extra: { links: collectionLinks() } }))
  })

  app.get('/prior-auth-artifacts/:id', (c) => {
    emitMeter('getPriorAuthArtifact')
    const a = store.getPriorAuthArtifact(c.req.param('id'))
    if (!a) return json(c, empty(`no prior-auth artifact '${c.req.param('id')}' — see /prior-auth-artifacts`, { memberName: 'priorAuthArtifacts' }), 200)
    return json(c, ok([a], { memberName: 'priorAuthArtifacts', extra: { links: collectionLinks() } }))
  })

  // /eligibility-records/check MUST mount before /eligibility-records/:id
  app.get('/eligibility-records/check', (c) => {
    emitMeter('checkEligibility')
    const result = store.checkEligibility(c.req.query('providerId') ?? '', c.req.query('payerId') ?? '')
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.record], { memberName: 'eligibilityRecords', extra: { links: collectionLinks() } }))
  })

  app.get('/eligibility-records', (c) => {
    emitMeter('listEligibilityRecords')
    const payerId = c.req.query('payerId')
    let es = store.listEligibilityRecords()
    if (payerId) es = es.filter((e) => e.payerId === payerId)
    if (es.length === 0) return json(c, empty('no eligibility records match — a truthful empty set, not an error', { memberName: 'eligibilityRecords' }))
    return json(c, ok(es, { memberName: 'eligibilityRecords', extra: { links: collectionLinks() } }))
  })

  app.get('/eligibility-records/:id', (c) => {
    emitMeter('getEligibilityRecord')
    const e = store.getEligibilityRecord(c.req.param('id'))
    if (!e) return json(c, empty(`no eligibility record '${c.req.param('id')}' — see /eligibility-records`, { memberName: 'eligibilityRecords' }), 200)
    return json(c, ok([e], { memberName: 'eligibilityRecords', extra: { links: collectionLinks() } }))
  })

  app.get('/superbills', (c) => {
    emitMeter('listSuperbills')
    const providerId = c.req.query('providerId')
    let ss = store.listSuperbills()
    if (providerId) ss = ss.filter((s) => s.providerId === providerId)
    if (ss.length === 0) return json(c, empty('no superbills match — a truthful empty set, not an error', { memberName: 'superbills' }))
    return json(c, ok(ss, { memberName: 'superbills', extra: { links: collectionLinks() } }))
  })

  app.get('/superbills/:id', (c) => {
    emitMeter('getSuperbill')
    const s = store.getSuperbill(c.req.param('id'))
    if (!s) return json(c, empty(`no superbill '${c.req.param('id')}' — see /superbills`, { memberName: 'superbills' }), 200)
    return json(c, ok([s], { memberName: 'superbills', extra: { links: collectionLinks() } }))
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
      md: `# healthcare — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>healthcare — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
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
    const key = `healthcare_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
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
      if (path === '/providers') emitMeter('listProviders')
      return hit
    }
    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  })
}
