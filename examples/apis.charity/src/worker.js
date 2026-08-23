/**
 * worker.js — apis.charity, wave zero of register row `nonprofits-civic`.
 *
 * One substrate, two plies, one worker (template spec §3):
 *   - data face: /organizations (+ /organizations/{id}), /donors,
 *     /donations, /grants — typed records from the row's schemas
 *     (schema.org generics per cascade rule 2: the row records no industry
 *     interchange standard); ALL seed data labeled synthetic (§5.2 — the
 *     row's candidate ingest route, IRS 990/EO BMF, is unruled and NOT
 *     performed);
 *   - headless face: /workspaces — the donor-CRM system-of-record door over
 *     the SAME Donation noun (native binding), auto-minted, keyless (the
 *     anon sandbox floor, §5.1 rung 0).
 *
 * The AXP quartet is emitted by the vendored axp-faces generator (pinned
 * apis-ax-axp@2.6.0) from ./manifest.js — never hand-rolled — then passed
 * through ./bridge.js, which adds ONLY the four ruled extension placements.
 *
 * Serving note (wave zero): custom worker allowed per §7.1; CNAME to the
 * unified workers.do lane is the extraction target. The apis.charity zone
 * exists (dynadot, cf_zone: y per the surface register); route attachment
 * is a deploy-time act.
 */

import { createAxpRoutes, envelopeResponse, serveNegotiated } from './axp-faces/index.js'
import { manifest, ORIGIN, BRAND } from './manifest.js'
import { bridgedRoutes } from './bridge.js'
import { projection } from './projection.js'
import { donors, donations, grants } from './seed.js'
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
  property: BRAND,
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  counterpartBrand: projection.counterpartBrand, // the recorded §9.3 gap — non-technical principals, no human-vocabulary name held for 813
  agent_classes: [
    {
      id: 'reader-agent',
      description:
        'keyless reads: the quartet, /organizations, /donors, /donations, /grants, /verify — no key, no account',
    },
    {
      id: 'back-office-agent',
      description:
        'auto-mints an ephemeral donor-CRM workspace (POST /workspaces) and records donations against it',
    },
    {
      id: 'catalog-integrator',
      description: 'consumes the records through the MCP door (POST /mcp, authless at the sandbox rung) — the same nouns and verbs as HTTP',
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

    // ── ruled extension placements first: card / openapi / pricing (bridged)
    const bridged = bridgedRoutes(request)
    if (bridged !== undefined) {
      emitMeterEvent(env, ctx, request, {
        operation:
          path === '/.well-known/agents.json' ? 'getCard' : path.startsWith('/pricing') ? 'getPricing' : 'getOpenapi',
        shape: 'anon-sandbox',
      })
      return bridged
    }

    // ── generated AXP faces (collection, offer, family, llms, home) ────────
    const hit = await axpRoutes(request, env)
    if (hit !== undefined) {
      emitMeterEvent(env, ctx, request, {
        operation:
          path === manifest.collection.path
            ? 'listCollection'
            : path === manifest.familyPath
              ? 'getFamilyRegistry'
              : path === manifest.pricing.offerPath
                ? 'getOffer'
                : 'face',
        shape: 'anon-sandbox',
      })
      return hit
    }

    // ── data face: one organization by id ──────────────────────────────────
    const orgById = path.match(/^\/organizations\/([^/]+)$/)
    if (orgById) {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getOrganization', shape: 'anon-sandbox' })
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(orgById[1]))
      if (!rec) {
        return json(
          { type: 'EMPTY', results: [], message: `no organization record with id ${orgById[1]}` },
          { status: 404, head },
        )
      }
      return json({ type: 'OK', results: [rec] }, { head })
    }

    if (path === '/donors') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listDonors', shape: 'anon-sandbox' })
      return json(
        {
          type: 'OK',
          results: donors,
          note: 'example data — synthetic donor records over fictional people, labeled per estate fixture law',
        },
        { head },
      )
    }

    if (path === '/donations') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listDonations', shape: 'anon-sandbox' })
      const org = url.searchParams.get('org')
      const recs = org ? donations.filter((r) => r.org === org) : donations
      if (recs.length === 0) {
        return json(
          { type: 'EMPTY', results: [], message: `no donations for org=${org} — a truthful empty set` },
          { head },
        )
      }
      return json({ type: 'OK', results: recs }, { head })
    }

    if (path === '/grants') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listGrants', shape: 'anon-sandbox' })
      const org = url.searchParams.get('org')
      const recs = org ? grants.filter((r) => r.grantee === org) : grants
      if (recs.length === 0) {
        return json(
          { type: 'EMPTY', results: [], message: `no grants for org=${org} — a truthful empty set` },
          { head },
        )
      }
      return json({ type: 'OK', results: recs }, { head })
    }

    // ── the G2 coordinates (stake #6) ───────────────────────────────────────
    if (path === '/icp.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getICP', shape: 'anon-sandbox' })
      return json(icpDocument, { head })
    }

    // ── the /verify export ──────────────────────────────────────────────────
    if (path === '/verify' || path === '/verify.json' || path === '/verify.md' || path === '/verify.html') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getVerify', shape: 'anon-sandbox' })
      const doc = buildVerifyDoc(manifest)
      const md = buildVerifyMd(manifest)
      return serveNegotiated(
        request,
        url,
        {
          json: doc,
          md,
          html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${BRAND} — run our tests</title></head><body><pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`,
        },
        { cleanPath: '/verify' },
      )
    }

    if (path === '/verify/suite.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getVerifySuite', shape: 'anon-sandbox' })
      return json(buildSuite(manifest), { head })
    }

    // ── headless face: the donor-CRM system-of-record door (native) ────────
    if (path === '/workspaces') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      const id = crypto.randomUUID()
      const ws = { $type: 'Service', id, createdAt: new Date().toISOString(), retention: RETENTION, donations: [] }
      workspaces.set(id, ws)
      emitMeterEvent(env, ctx, request, { operation: 'createWorkspace', shape: 'anon-sandbox' })
      return json({ type: 'OK', results: [{ id: ws.id, createdAt: ws.createdAt, retention: ws.retention }] })
    }

    const wsMatch = path.match(/^\/workspaces\/([^/]+)(\/donations)?$/)
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
        emitMeterEvent(env, ctx, request, { operation: 'getWorkspace', shape: 'anon-sandbox' })
        return json(
          { type: 'OK', results: [{ id: ws.id, createdAt: ws.createdAt, retention: ws.retention, donations: ws.donations.length }] },
          { head },
        )
      }
      if (request.method === 'GET' || head) {
        emitMeterEvent(env, ctx, request, { operation: 'listWorkspaceDonations', shape: 'anon-sandbox' })
        return ws.donations.length === 0
          ? json({ type: 'EMPTY', results: [], message: 'no donations recorded in this workspace yet' }, { head })
          : json({ type: 'OK', results: ws.donations }, { head })
      }
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json(
            { type: 'BLOCKED', reason: 'the request body must be a JSON donation record with at least { donor, amount }' },
            { status: 400 },
          )
        }
        if (!body || typeof body.donor !== 'string' || typeof body.amount !== 'number' || !(body.amount > 0)) {
          return json(
            { type: 'BLOCKED', reason: 'a donation record carries at least { donor: string, amount: number > 0 }' },
            { status: 400 },
          )
        }
        const rec = {
          $type: 'DonateAction',
          id: `don-ws-${ws.donations.length + 1}`,
          ...body,
          binding: 'native',
          status: body.status === 'pledged' ? 'pledged' : 'received',
          recordedAt: new Date().toISOString(),
        }
        ws.donations.push(rec)
        emitMeterEvent(env, ctx, request, { operation: 'recordDonation', shape: 'anon-sandbox' })
        return json({ type: 'OK', results: [rec] })
      }
      return methodNotAllowed(path, 'GET, HEAD, POST')
    }

    // ── the MCP door — same nouns and verbs as HTTP (§3.3); authless at the
    //    anon-sandbox rung (batch-2 ruling; bearer-key above, when mounted) ──
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
