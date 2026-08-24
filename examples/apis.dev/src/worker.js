/**
 * worker.js — apis.dev, wave zero of register row `software-it-services`.
 *
 * One substrate, two plies, one worker (template spec §3):
 *   - data face: /apis (+ /apis/{id}), /actions, /verification-reports —
 *     typed records from the row's schemas;
 *   - headless face: /workspaces — the API-management system-of-record door
 *     over the SAME nouns (native binding), auto-minted, keyless (the anon
 *     sandbox floor, §5.1 rung 0).
 *
 * The AXP quartet is emitted by the vendored axp-faces generator (pinned
 * apis-ax-axp@2.6.0) from ./manifest.js — never hand-rolled. Custom routes
 * below serve only what the manifest declares (presence-when-true).
 *
 * Serving note (wave zero): custom worker allowed per §7.1; CNAME to the
 * unified workers.do lane is the extraction target, not a wave-zero
 * requirement. The apis.dev zone currently points at a legacy Vercel
 * deployment that answers 500 — DNS cutover is a deploy-time act, recorded
 * in wrangler.jsonc.
 */

import {
  createAxpRoutes,
  envelopeResponse,
  serveNegotiated,
  negotiate,
  linkAlternates,
  CONNEG_VARY,
  buildPricingDocument,
} from './axp-faces/index.js'
import { pricingPageHtml } from './site/pricing-page.js'
import { renderDashboardPage } from './site/dashboard-template.js'
import { dashboardConfig } from './site/dashboard-config.js'
import { manifest } from './manifest.js'
import { projection } from './projection.js'
import { actionRecords, verificationReports } from './seed.js'
import { handleMcpMessage } from './mcp.js'
import { buildSuite, buildVerifyDoc, buildVerifyMd } from './verify.js'
import { emitMeterEvent } from './seams.js'

const axpRoutes = createAxpRoutes(manifest)

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

/** Ephemeral workspace store — wave zero: in-memory per isolate, may reset
 *  at any time. The retention line is disclosed on every mint (§5.1 rung 0). */
const workspaces = new Map()

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
 *  face (stake #6): ICP, personas, agent classes, attestation ladder. */
const icpDocument = {
  $context: 'https://schema.org.ai',
  property: 'apis.dev',
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  agent_classes: [
    {
      id: 'reader-agent',
      description: 'keyless reads: the quartet, /apis, /actions, /verification-reports, /verify — no key, no account',
    },
    {
      id: 'sandbox-transactor',
      description: 'auto-mints an ephemeral workspace (POST /workspaces) and registers API records against it',
    },
    {
      id: 'catalog-integrator',
      description: 'consumes the registry through the MCP door (POST /mcp) — the same nouns and verbs as HTTP',
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

    // ── /pricing, html register only: the designed rate-card page ─────────
    // The machine faces stay generator-emitted and untouched (/pricing json +
    // md, POST → typed 405): only the browser-negotiated html face is
    // intercepted, and the page renders the SAME buildPricingDocument output
    // the json face serves — one truth, two registers. Conneg law holds:
    // Link alternates + Vary are sent, HEAD mirrors GET.
    if ((path === '/pricing' || path === '/pricing.html') && (request.method === 'GET' || head)) {
      const { face } = negotiate(request, path)
      if (face === 'html') {
        emitMeterEvent(env, ctx, request, { operation: 'getPricing', shape: 'anon-sandbox' })
        const html = pricingPageHtml(buildPricingDocument(manifest), manifest.pricing)
        return new Response(head ? null : html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            link: linkAlternates('/pricing'),
            vary: CONNEG_VARY,
          },
        })
      }
    }

    // ── /dashboard: the developer dashboard v1 (human face, demo-labeled) ──
    // First instance of the abstract-dashboard template (#30 apps.ax) — see
    // ./site/dashboard-template.js. Not an API operation: html only, not
    // declared on the contract or card.
    if (path === '/dashboard') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      const html = renderDashboardPage(dashboardConfig)
      return new Response(head ? null : html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
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

    // ── data face: one record by id ─────────────────────────────────────────
    const apiById = path.match(/^\/apis\/([^/]+)$/)
    if (apiById) {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getAPI', shape: 'anon-sandbox' })
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(apiById[1]))
      if (!rec) {
        return json(
          { type: 'EMPTY', results: [], message: `no API record with id ${apiById[1]}` },
          { status: 404, head },
        )
      }
      return json({ type: 'OK', results: [rec] }, { head })
    }

    if (path === '/actions') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listActions', shape: 'anon-sandbox' })
      return json(
        {
          type: 'OK',
          results: actionRecords,
          note: 'example data — synthetic sandbox sample over fictional providers, labeled per estate fixture law',
        },
        { head },
      )
    }

    if (path === '/verification-reports') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listVerificationReports', shape: 'anon-sandbox' })
      const subject = url.searchParams.get('subject')
      const recs = subject ? verificationReports.filter((r) => r.subject === subject) : verificationReports
      if (recs.length === 0) {
        return json(
          { type: 'EMPTY', results: [], message: `no reports for subject=${subject} — a truthful empty set` },
          { head },
        )
      }
      return json({ type: 'OK', results: recs }, { head })
    }

    // ── the G2 coordinates (stake #6) ───────────────────────────────────────
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
        html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.dev — run our tests</title></head><body><pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`,
      }, { cleanPath: '/verify' })
    }

    if (path === '/verify/suite.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(buildSuite(manifest), { head })
    }

    // ── headless face: the workspace system-of-record door (native) ────────
    if (path === '/workspaces') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      const id = crypto.randomUUID()
      const ws = { $type: 'Service', id, createdAt: new Date().toISOString(), retention: RETENTION, apis: [] }
      workspaces.set(id, ws)
      emitMeterEvent(env, ctx, request, { operation: 'createWorkspace', shape: 'anon-sandbox' })
      return json({ type: 'OK', results: [{ id: ws.id, createdAt: ws.createdAt, retention: ws.retention }] })
    }

    const wsMatch = path.match(/^\/workspaces\/([^/]+)(\/apis)?$/)
    if (wsMatch) {
      const ws = workspaces.get(wsMatch[1])
      if (!ws) {
        return json(
          { type: 'EMPTY', results: [], message: `no workspace ${wsMatch[1]} — wave-zero workspaces are ${RETENTION}` },
          { status: 404, head },
        )
      }
      if (!wsMatch[2]) {
        if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
        return json({ type: 'OK', results: [{ id: ws.id, createdAt: ws.createdAt, retention: ws.retention, apis: ws.apis.length }] }, { head })
      }
      if (request.method === 'GET' || head) {
        emitMeterEvent(env, ctx, request, { operation: 'listWorkspaceAPIs', shape: 'anon-sandbox' })
        return ws.apis.length === 0
          ? json({ type: 'EMPTY', results: [], message: 'no API records registered in this workspace yet' }, { head })
          : json({ type: 'OK', results: ws.apis }, { head })
      }
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json({ type: 'BLOCKED', reason: 'the request body must be a JSON API record with at least { id, name }' }, { status: 400 })
        }
        if (!body || typeof body.id !== 'string' || typeof body.name !== 'string') {
          return json({ type: 'BLOCKED', reason: 'an API record carries at least { id, name }' }, { status: 400 })
        }
        const rec = { $type: 'WebAPI', ...body, binding: 'native', registeredAt: new Date().toISOString() }
        ws.apis.push(rec)
        emitMeterEvent(env, ctx, request, { operation: 'registerWorkspaceAPI', shape: 'anon-sandbox' })
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
