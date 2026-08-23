/**
 * worker.js — apis.education, wave zero of register row `education`.
 *
 * One substrate, two plies, one worker (template spec §3):
 *   - data face: /courses (+ /courses/{id}), /credentials, /aid-artifacts —
 *     typed records from the row's schemas (schema.org generic fallback —
 *     no settled industry interchange standard on record);
 *   - headless face: /catalogs — the LMS system-of-record door over the
 *     SAME Course noun (native binding), auto-minted, keyless (the anon
 *     sandbox floor, §5.1 rung 0). Row posture is RULED Axis-2 only: this
 *     is a headless-kit face, not a data-thesis play.
 *
 * The AXP quartet is emitted by the vendored axp-faces generator (pinned
 * apis-ax-axp@2.6.0) from ./manifest.js — never hand-rolled. Custom routes
 * below serve only what the manifest declares (presence-when-true).
 *
 * Serving note (wave zero): custom worker allowed per §7.1; CNAME to the
 * unified workers.do lane is the extraction target, not a wave-zero
 * requirement. apis.education has NO Cloudflare zone today — zone
 * provisioning is a deploy-time act, recorded in wrangler.jsonc.
 */

import { createAxpRoutes, envelopeResponse, serveNegotiated } from './axp-faces/index.js'
import { manifest } from './manifest.js'
import { projection } from './projection.js'
import { credentialRecords, aidArtifactRecords } from './seed.js'
import { handleMcpMessage } from './mcp.js'
import { buildSuite, buildVerifyDoc, buildVerifyMd } from './verify.js'
import { emitMeterEvent } from './seams.js'

const axpRoutes = createAxpRoutes(manifest)

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

/** Ephemeral catalog store — wave zero: in-memory per isolate, may reset
 *  at any time. The retention line is disclosed on every mint (§5.1 rung 0). */
const catalogs = new Map()

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
 *  face: ICP, personas, agent classes, identity ladder. */
const icpDocument = {
  $context: 'https://schema.org.ai',
  property: 'apis.education',
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  agent_classes: [
    {
      id: 'reader-agent',
      description:
        'keyless reads: the quartet, /courses, /credentials, /aid-artifacts, /verify — no key, no account',
    },
    {
      id: 'sandbox-transactor',
      description: 'auto-mints an ephemeral catalog (POST /catalogs) and registers Course records against it',
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

    // ── data face: one Course record by id ─────────────────────────────────
    const courseById = path.match(/^\/courses\/([^/]+)$/)
    if (courseById) {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getCourse', shape: 'anon-sandbox' })
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(courseById[1]))
      if (!rec) {
        return json(
          { type: 'EMPTY', results: [], message: `no Course record with id ${courseById[1]}` },
          { status: 404, head },
        )
      }
      return json({ type: 'OK', results: [rec] }, { head })
    }

    if (path === '/credentials') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listCredentials', shape: 'anon-sandbox' })
      return json(
        {
          type: 'OK',
          results: credentialRecords,
          note: 'example data — synthetic sandbox records over fictional institutions, labeled per estate fixture law',
        },
        { head },
      )
    }

    if (path === '/aid-artifacts') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listAidArtifacts', shape: 'anon-sandbox' })
      const documentClass = url.searchParams.get('documentClass')
      const recs = documentClass
        ? aidArtifactRecords.filter((r) => r.documentClass === documentClass)
        : aidArtifactRecords
      if (recs.length === 0) {
        return json(
          {
            type: 'EMPTY',
            results: [],
            message: `no aid artifacts with documentClass=${documentClass} — a truthful empty set`,
          },
          { head },
        )
      }
      return json(
        {
          type: 'OK',
          results: recs,
          note: 'example data — synthetic sandbox records over fictional institutions, labeled per estate fixture law',
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
      return serveNegotiated(
        request,
        url,
        {
          json: doc,
          md,
          html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.education — run our tests</title></head><body><pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`,
        },
        { cleanPath: '/verify' },
      )
    }

    if (path === '/verify/suite.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(buildSuite(manifest), { head })
    }

    // ── headless face: the catalog system-of-record door (native, LMS) ─────
    if (path === '/catalogs') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      const id = crypto.randomUUID()
      const cat = { $type: 'DataCatalog', id, createdAt: new Date().toISOString(), retention: RETENTION, courses: [] }
      catalogs.set(id, cat)
      emitMeterEvent(env, ctx, request, { operation: 'createCatalog', shape: 'anon-sandbox' })
      return json({ type: 'OK', results: [{ id: cat.id, createdAt: cat.createdAt, retention: cat.retention }] })
    }

    const catMatch = path.match(/^\/catalogs\/([^/]+)(\/courses)?$/)
    if (catMatch) {
      const cat = catalogs.get(catMatch[1])
      if (!cat) {
        return json(
          { type: 'EMPTY', results: [], message: `no catalog ${catMatch[1]} — wave-zero catalogs are ${RETENTION}` },
          { status: 404, head },
        )
      }
      if (!catMatch[2]) {
        if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
        emitMeterEvent(env, ctx, request, { operation: 'getCatalog', shape: 'anon-sandbox' })
        return json(
          { type: 'OK', results: [{ id: cat.id, createdAt: cat.createdAt, retention: cat.retention, courses: cat.courses.length }] },
          { head },
        )
      }
      if (request.method === 'GET' || head) {
        emitMeterEvent(env, ctx, request, { operation: 'listCatalogCourses', shape: 'anon-sandbox' })
        return cat.courses.length === 0
          ? json({ type: 'EMPTY', results: [], message: 'no Course records registered in this catalog yet' }, { head })
          : json({ type: 'OK', results: cat.courses }, { head })
      }
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json(
            { type: 'BLOCKED', reason: 'the request body must be a JSON Course record with at least { id, name }' },
            { status: 400 },
          )
        }
        if (!body || typeof body.id !== 'string' || typeof body.name !== 'string') {
          return json({ type: 'BLOCKED', reason: 'a Course record carries at least { id, name }' }, { status: 400 })
        }
        const rec = { $type: 'Course', ...body, binding: 'native', registeredAt: new Date().toISOString() }
        cat.courses.push(rec)
        emitMeterEvent(env, ctx, request, { operation: 'registerCatalogCourse', shape: 'anon-sandbox' })
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
