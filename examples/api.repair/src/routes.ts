/**
 * routes.ts — the two-ply API surface (spec §3): the data face's typed record
 * collections AND the headless face's FSM system-of-record doors are the SAME
 * routes — one definition, one store, typed OK | EMPTY | BLOCKED | OFFER
 * envelopes everywhere. The vendored generator serves the branching
 * collection (/work-orders GET); everything else lives here.
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
    'git clone the @dotdo/api repo, branch draft/repair-field-services-wave0',
    'pnpm install',
    'npx vitest run tests/api-repair.test.ts',
  ],
  covers: [
    'AXP conformance at the pinned digest (fail-closed, in-memory dispatch — the same requirement implementations the hosted verifier runs). DISCLOSED: describeConformance is absent from vendored axp-faces 0.3.0, so the probe ladder runs in-process via the digest-pinned autonomous-qa gate instead of a generator-local probe walk.',
    'rate-card law (axp-ext-rates-g2 §1/§2, survey-floor vocabulary): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0',
    'envelope typing on every data route; the 402 OFFER boundary (over-ceiling and /offer) advertising the full B2A ladder (pay / work / claim)',
    'seed fixture law: every record labeled example data; 952-prefix demo asset tags; no real company or person names; internally consistent estimate totals',
  ],
  note:
    'interfaces.testSuite is deliberately NOT declared on the card yet: declaring arms strict byte-digest verification of a suite document in an api.qa dialect, ' +
    'and this property has not authored one — omission is full conformance; a wrong declaration is a machine-readable false claim.',
  conformance: 'https://api.qa/api.repair',
}

function collectionLinks(): Record<string, string> {
  return {
    collection: `${ORIGIN}/work-orders`,
    estimates: `${ORIGIN}/estimates`,
    inspectionReports: `${ORIGIN}/inspection-reports`,
    pricing: `${ORIGIN}/pricing`,
    offer: `${ORIGIN}/offer`,
  }
}

export function mountRoutes(app: Hono<ApiEnv>, ws: store.Workspace): void {

  // ── data + headless doors (one definition; §3.1 = §3.2) ─────────────────

  app.get('/work-orders/:id', (c) => {
    emitMeter('getWorkOrder')
    const w = store.getWorkOrder(ws, c.req.param('id'))
    if (!w) return json(c, empty(`no work order '${c.req.param('id')}' — see /work-orders`, { memberName: 'workOrders' }), 200)
    const links: Record<string, string> = { ...collectionLinks(), complete: `${ORIGIN}/work-orders/${w.id}/complete` }
    if (w.estimateId) links.estimate = `${ORIGIN}/estimates/${w.estimateId}`
    if (w.inspectionReportId) links.inspectionReport = `${ORIGIN}/inspection-reports/${w.inspectionReportId}`
    return json(c, ok([w], { memberName: 'workOrders', extra: { links } }))
  })

  // The FSM system-of-record door: open a work order. Keyless writes land in
  // the ephemeral anonymous workspace (disclosed retention).
  app.post('/work-orders', async (c) => {
    emitMeter('createWorkOrder')
    const input = await c.req.json().catch(() => ({}))
    const result = store.createWorkOrder(ws, input)
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.workOrder], { memberName: 'workOrders', extra: { retention: RETENTION_NOTE } }), 201)
  })

  app.post('/work-orders/:id/complete', (c) => {
    emitMeter('completeWorkOrder')
    const result = store.completeWorkOrder(ws, c.req.param('id'))
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.workOrder], { memberName: 'workOrders', extra: { retention: RETENTION_NOTE } }))
  })

  app.get('/estimates', (c) => {
    emitMeter('listEstimates')
    const status = c.req.query('status')
    const workOrderId = c.req.query('workOrder')
    let es = store.listEstimates(ws)
    if (status) es = es.filter((e) => e.status === status)
    if (workOrderId) es = es.filter((e) => e.workOrderId === workOrderId)
    if (es.length === 0) return json(c, empty('no estimates match — a truthful empty set, not an error', { memberName: 'estimates' }))
    return json(c, ok(es, { memberName: 'estimates', extra: { links: collectionLinks(), retention: RETENTION_NOTE } }))
  })

  app.get('/estimates/:id', (c) => {
    emitMeter('getEstimate')
    const e = store.getEstimate(ws, c.req.param('id'))
    if (!e) return json(c, empty(`no estimate '${c.req.param('id')}' — see /estimates`, { memberName: 'estimates' }), 200)
    return json(c, ok([e], { memberName: 'estimates', extra: { links: { ...collectionLinks(), approve: `${ORIGIN}/estimates/${e.id}/approve`, workOrder: `${ORIGIN}/work-orders/${e.workOrderId}` } } }))
  })

  app.post('/estimates/:id/approve', (c) => {
    emitMeter('approveEstimate')
    const result = store.approveEstimate(ws, c.req.param('id'))
    if (result.error) return json(c, blocked(result.error), 400)
    return json(c, ok([result.estimate], { memberName: 'estimates', extra: { retention: RETENTION_NOTE } }))
  })

  app.get('/inspection-reports', (c) => {
    emitMeter('listInspectionReports')
    const workOrderId = c.req.query('workOrder')
    let rs = [...store.listInspectionReports()]
    if (workOrderId) rs = rs.filter((r) => r.workOrderId === workOrderId)
    if (rs.length === 0) return json(c, empty('no inspection reports match — a truthful empty set, not an error', { memberName: 'inspectionReports' }))
    return json(c, ok(rs, { memberName: 'inspectionReports', extra: { links: collectionLinks() } }))
  })

  app.get('/inspection-reports/:id', (c) => {
    emitMeter('getInspectionReport')
    const r = store.getInspectionReport(c.req.param('id'))
    if (!r) return json(c, empty(`no inspection report '${c.req.param('id')}' — see /inspection-reports`, { memberName: 'inspectionReports' }), 200)
    return json(c, ok([r], { memberName: 'inspectionReports', extra: { links: { ...collectionLinks(), workOrder: `${ORIGIN}/work-orders/${r.workOrderId}` } } }))
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
      md: `# api.repair — run our tests\n\n${VERIFY_DOC.summary}\n\n- pinned spec: ${VERIFY_DOC.pinnedSpec} (${VERIFY_DOC.pinnedSpecDigest})\n${VERIFY_DOC.run.map((s) => `- ${s}`).join('\n')}\n`,
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>api.repair — run our tests</title></head><body><h1>Run our tests</h1><p>${VERIFY_DOC.summary}</p><pre>${VERIFY_DOC.run.join('\n')}</pre><p><a href="${VERIFY_DOC.conformance}">Independent verdict at api.qa</a></p></body></html>\n`,
    })
  })

  // NOTE (motion law, spec §9.1): this projection is B2A — there is NO
  // /login, NO OAuth door, and NO checkout page on this face. Onboarding
  // above the anon sandbox is the #17 ladder (pay / work / claim), advertised
  // by every 402 OFFER's alternatives.

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
