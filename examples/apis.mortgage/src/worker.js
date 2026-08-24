/**
 * worker.js — apis.mortgage, wave zero of register row `mortgage`
 * (GAP-CLOSURE: the machine face the live waitlist-stage property lacks).
 *
 * One substrate, two plies, one worker (template spec §3):
 *   - data face: /loan-files (+ /loan-files/{id}) — MISMO-typed loan-file
 *     records; /market-records — HMDA-derived lender market records (real
 *     public data, fetched from the FFIEC HMDA Data Browser, provenance
 *     stamped);
 *   - headless face: /pipelines — the LOS system-of-record door over the
 *     SAME LoanFile noun (native binding), auto-minted, keyless (the anon
 *     sandbox floor, §5.1 rung 0).
 *
 * The AXP quartet is emitted by the vendored axp-faces generator (pinned
 * apis-ax-axp@2.6.0) from ./manifest.js — never hand-rolled. Custom routes
 * below serve only what the manifest declares (presence-when-true).
 *
 * Serving note (CUTOVER, 2026-08-23): the #9 founder ruling struck the
 * 'no pricing/MCP while the entity is in formation' posture — apis.mortgage
 * is the headless system of record and the licensed operator is the
 * customer. This worker REPLACES the pre-cutover waitlist worker
 * (`apis-mortgage`, ~/projects/fin/mortgage) at the apis.mortgage route,
 * carrying over whole: the crafted landing (./landing.html, reframed copy +
 * machine-face footer row — the api.insure pattern), the KV-backed
 * POST /waitlist on the SAME namespace (no signup or data path lost), and
 * the /healthz + /robots.txt operational surfaces.
 *
 * Scope boundaries (the row's rulings, encoded): data/document door only —
 * no origination, no closing/settlement money layer, no lender-integration
 * surface. Borrower PII is never served, in any data class.
 */

import { createAxpRoutes, envelopeResponse, serveNegotiated } from './axp-faces/index.js'
import { manifest } from './manifest.js'
import { projection } from './projection.js'
import { lenderMarketRecords } from './seed.js'
import { handleMcpMessage, filterMarketRecords } from './mcp.js'
import { buildSuite, buildVerifyDoc, buildVerifyMd } from './verify.js'
import { emitMeterEvent } from './seams.js'
import { handleWaitlist } from './waitlist.js'

const axpRoutes = createAxpRoutes(manifest)

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

/** Ephemeral pipeline store — wave zero: in-memory per isolate, may reset
 *  at any time. The retention line is disclosed on every mint (§5.1 rung 0). */
const pipelines = new Map()

const RETENTION =
  'ephemeral — this wave-zero sandbox is in-memory and may reset at any time; nothing you store here is durable yet'

function json(body, { status = 200, head = false, headers } = {}) {
  return new Response(head ? null : JSON.stringify(body, null, 2), {
    status,
    headers: { ...JSON_CT, ...(headers || {}) },
  })
}

function methodNotAllowed(path, allow) {
  return envelopeResponse(
    { type: 'BLOCKED', reason: `this address answers ${allow}` },
    { status: 405, headers: { allow } },
  )
}

/** icp.json — the G2 coordinates of this projection, exposed on the machine
 *  face: ICP, personas, agent classes, attestation ladder. */
const icpDocument = {
  $context: 'https://schema.org.ai',
  property: 'apis.mortgage',
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  agent_classes: [
    {
      id: 'reader-agent',
      description:
        'keyless reads: the quartet, /loan-files, /market-records, /verify — no key, no account',
    },
    {
      id: 'sandbox-transactor',
      description: 'auto-mints an ephemeral pipeline (POST /pipelines) and adds loan-file records to it',
    },
    {
      id: 'catalog-integrator',
      description: 'consumes the records through the MCP door (POST /mcp) — the same nouns and verbs as HTTP',
    },
  ],
  /** anonymous only: the id.org.ai identity plane is not wired in this
   *  deployment (presence-when-true — the identified rung appears when it is). */
  ladder: [
    {
      rung: 'anonymous',
      description: 'no identity required; every collection and the sandbox floor answer keyless',
    },
  ],
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname
    const head = request.method === 'HEAD'

    // ── the waitlist register (carried over at cutover — durable KV intake) ─
    if (path === '/waitlist') {
      emitMeterEvent(env, ctx, request, { operation: 'joinWaitlist', shape: 'anon-sandbox' })
      return handleWaitlist(request, env)
    }

    // ── operational surfaces (carried over at cutover) ─────────────────────
    if (path === '/healthz') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(
        {
          served: true,
          callable: { dataDoors: true, pipelines: true, mcp: true, waitlist: true, roadmapRows: false },
          property: 'apis.mortgage',
          status: 'LIVE',
          note: 'Liveness of the process. The machine face is live: loan-file, market-record and pipeline doors answer keyless, priced on a test-mode rate card, with MCP at POST /mcp. The ROADMAP rows (payoff/lien, eNote/eVault, doc intelligence) are not callable and post to the waitlist first.',
          waitlist: 'https://apis.mortgage/waitlist',
        },
        { head, headers: { 'cache-control': 'no-store' } },
      )
    }
    if (path === '/robots.txt') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return new Response(head ? null : 'User-agent: *\nAllow: /\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      })
    }

    // ── generated AXP faces first (quartet, collection, offer, family, home)
    const hit = await axpRoutes(request, env)
    if (hit !== undefined) {
      emitMeterEvent(env, ctx, request, {
        operation:
          path === manifest.collection.path
            ? manifest.collection.operationId
            : path === '/pricing'
              ? 'getPricing'
              : path === manifest.familyPath
                ? 'getFamilyRegistry'
                : path === manifest.pricing.offerPath
                  ? 'getOffer'
                  : 'face',
        shape: 'anon-sandbox',
      })
      return hit
    }

    // ── data face: one loan file by id ─────────────────────────────────────
    const fileById = path.match(/^\/loan-files\/([^/]+)$/)
    if (fileById) {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getLoanFile', shape: 'anon-sandbox' })
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(fileById[1]))
      if (!rec) {
        return json(
          { type: 'EMPTY', results: [], message: `no loan-file record with id ${fileById[1]}` },
          { status: 404, head },
        )
      }
      return json({ type: 'OK', results: [rec] }, { head })
    }

    // ── data face: HMDA-derived market records (real, provenance stamped) ──
    if (path === '/market-records') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listLenderMarketRecords', shape: 'anon-sandbox' })
      const recs = filterMarketRecords({
        state: url.searchParams.get('state') || undefined,
        purpose: url.searchParams.get('purpose') || undefined,
      })
      if (recs.length === 0) {
        return json(
          {
            type: 'EMPTY',
            results: [],
            message:
              'no market records match — a truthful empty set; this seed carries 2024 originations for CA, FL, ID, NY, TX',
          },
          { head },
        )
      }
      return json(
        {
          type: 'OK',
          results: recs,
          note: 'real public data — FFIEC HMDA Data Browser aggregations; the exact query URL and observation date are stamped on every record',
        },
        { head },
      )
    }

    // ── the G2 coordinates ──────────────────────────────────────────────────
    if (path === '/icp.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(icpDocument, { head })
    }

    // ── the /verify export ──────────────────────────────────────────────────
    if (path === '/verify' || path === '/verify.json' || path === '/verify.md' || path === '/verify.html') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      const doc = buildVerifyDoc(manifest)
      const md = buildVerifyMd(manifest)
      return serveNegotiated(request, url, {
        json: doc,
        md,
        html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.mortgage — run our tests</title></head><body><pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`,
      }, { cleanPath: '/verify' })
    }

    if (path === '/verify/suite.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(buildSuite(manifest), { head })
    }

    // ── headless face: the pipeline system-of-record door (native, LOS) ────
    if (path === '/pipelines') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      const id = crypto.randomUUID()
      const pl = { $type: 'Service', id, createdAt: new Date().toISOString(), retention: RETENTION, loanFiles: [] }
      pipelines.set(id, pl)
      emitMeterEvent(env, ctx, request, { operation: 'createPipeline', shape: 'anon-sandbox' })
      return json({ type: 'OK', results: [{ id: pl.id, createdAt: pl.createdAt, retention: pl.retention }] })
    }

    const plMatch = path.match(/^\/pipelines\/([^/]+)(\/loan-files)?$/)
    if (plMatch) {
      const pl = pipelines.get(plMatch[1])
      if (!pl) {
        return json(
          { type: 'EMPTY', results: [], message: `no pipeline ${plMatch[1]} — wave-zero pipelines are ${RETENTION}` },
          { status: 404, head },
        )
      }
      if (!plMatch[2]) {
        if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
        emitMeterEvent(env, ctx, request, { operation: 'getPipeline', shape: 'anon-sandbox' })
        return json(
          { type: 'OK', results: [{ id: pl.id, createdAt: pl.createdAt, retention: pl.retention, loanFiles: pl.loanFiles.length }] },
          { head },
        )
      }
      if (request.method === 'GET' || head) {
        emitMeterEvent(env, ctx, request, { operation: 'listPipelineLoanFiles', shape: 'anon-sandbox' })
        return pl.loanFiles.length === 0
          ? json({ type: 'EMPTY', results: [], message: 'no loan-file records in this pipeline yet' }, { head })
          : json({ type: 'OK', results: pl.loanFiles }, { head })
      }
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json(
            { type: 'BLOCKED', reason: 'the request body must be a JSON loan-file record with at least { loanIdentifier, loanPurposeType }' },
            { status: 400 },
          )
        }
        if (!body || typeof body.loanIdentifier !== 'string' || typeof body.loanPurposeType !== 'string') {
          return json(
            { type: 'BLOCKED', reason: 'a loan-file record carries at least { loanIdentifier, loanPurposeType }' },
            { status: 400 },
          )
        }
        const rec = { $type: 'LoanFile', ...body, binding: 'native', addedAt: new Date().toISOString() }
        pl.loanFiles.push(rec)
        emitMeterEvent(env, ctx, request, { operation: 'addLoanFile', shape: 'anon-sandbox' })
        return json({ type: 'OK', results: [rec] })
      }
      return methodNotAllowed(path, 'GET, HEAD, POST')
    }

    // ── the MCP door — same nouns and verbs as HTTP (§3.3) ─────────────────
    if (path === '/mcp') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      let msg
      try {
        msg = await request.json()
      } catch {
        return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, { status: 400 })
      }
      emitMeterEvent(env, ctx, request, { operation: 'mcp', shape: 'anon-sandbox' })
      const responses = Array.isArray(msg)
        ? msg.map((m) => handleMcpMessage(manifest, m)).filter((r) => r !== null)
        : handleMcpMessage(manifest, msg)
      if (responses === null) return new Response(null, { status: 202 })
      return json(responses)
    }

    // ── no ghost surfaces: everything else is a truthful 404 ───────────────
    return json(
      {
        type: 'EMPTY',
        results: [],
        message: `no address ${path} on this origin — the capability card at /.well-known/agents.json lists every door`,
      },
      { status: 404, head },
    )
  },
}
