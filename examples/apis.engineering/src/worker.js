/**
 * worker.js — apis.engineering, wave zero of register row
 * `engineering-architecture`.
 *
 * One substrate, two plies, one worker (template spec §3):
 *   - data face: /drawings (+ /drawings/{id}), /specifications, /submittals —
 *     typed records from the row's schemas (schema.org generics, cascade
 *     rule 2 — no settled interchange standard is cited for this cell);
 *   - headless face: /projects — the CAD/PLM-adjacent project
 *     system-of-record door over the SAME nouns (native binding):
 *     auto-minted, keyless (the anon sandbox floor, §5.1 rung 0), with
 *     submittal assembly (POST /projects/{id}/submittals).
 *
 * The AXP quartet is emitted by the vendored axp-faces generator (pinned
 * apis-ax-axp@2.6.0) from ./manifest.js — never hand-rolled. Custom routes
 * below serve only what the manifest declares (presence-when-true).
 *
 * Serving note (wave zero): custom worker allowed per §7.1; CNAME to the
 * unified workers.do lane is the extraction target, not a wave-zero
 * requirement. No Cloudflare zone exists for apis.engineering today
 * (surface register: cf_zone = n) — zone creation and DNS are deploy-time
 * founder acts, recorded in wrangler.jsonc.
 */

import { createAxpRoutes, envelopeResponse, serveNegotiated } from './axp-faces/index.js'
import { manifest } from './manifest.js'
import { projection } from './projection.js'
import { specificationRecords, submittalRecords } from './seed.js'
import { handleMcpMessage } from './mcp.js'
import { buildSuite, buildVerifyDoc, buildVerifyMd } from './verify.js'
import { emitMeterEvent } from './seams.js'

const axpRoutes = createAxpRoutes(manifest)

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

/** Ephemeral project store — wave zero: in-memory per isolate, may reset
 *  at any time. The retention line is disclosed on every mint (§5.1 rung 0). */
const projects = new Map()

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
  property: 'apis.engineering',
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  counterpartBrand: projection.counterpartBrand,
  agent_classes: [
    {
      id: 'reader-agent',
      description: 'keyless reads: the quartet, /drawings, /specifications, /submittals, /verify — no key, no account',
    },
    {
      id: 'sandbox-transactor',
      description: 'auto-mints an ephemeral project (POST /projects) and assembles submittal packages against it',
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

    // ── data face: one record by id ─────────────────────────────────────────
    const drawingById = path.match(/^\/drawings\/([^/]+)$/)
    if (drawingById) {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getDrawing', shape: 'anon-sandbox' })
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(drawingById[1]))
      if (!rec) {
        return json(
          { type: 'EMPTY', results: [], message: `no drawing record with id ${drawingById[1]}` },
          { status: 404, head },
        )
      }
      return json({ type: 'OK', results: [rec] }, { head })
    }

    if (path === '/specifications') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listSpecifications', shape: 'anon-sandbox' })
      return json(
        {
          type: 'OK',
          results: specificationRecords,
          note: 'example data — labeled synthetic sandbox seed over fictional firms, per estate fixture law',
        },
        { head },
      )
    }

    if (path === '/submittals') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listSubmittals', shape: 'anon-sandbox' })
      const project = url.searchParams.get('project')
      const recs = project ? submittalRecords.filter((r) => r.project === project) : submittalRecords
      if (recs.length === 0) {
        return json(
          { type: 'EMPTY', results: [], message: `no submittal packages for project=${project} — a truthful empty set` },
          { head },
        )
      }
      return json(
        {
          type: 'OK',
          results: recs,
          note: 'example data — labeled synthetic sandbox seed over fictional firms, per estate fixture law',
        },
        { head },
      )
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
        html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.engineering — run our tests</title></head><body><pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`,
      }, { cleanPath: '/verify' })
    }

    if (path === '/verify/suite.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(buildSuite(manifest), { head })
    }

    // ── headless face: the project system-of-record door (native) ─────────
    if (path === '/projects') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      const id = crypto.randomUUID()
      const proj = { $type: 'Project', id, createdAt: new Date().toISOString(), retention: RETENTION, submittals: [] }
      projects.set(id, proj)
      emitMeterEvent(env, ctx, request, { operation: 'createProject', shape: 'anon-sandbox' })
      return json({ type: 'OK', results: [{ id: proj.id, createdAt: proj.createdAt, retention: proj.retention }] })
    }

    const projMatch = path.match(/^\/projects\/([^/]+)(\/submittals)?$/)
    if (projMatch) {
      const proj = projects.get(projMatch[1])
      if (!proj) {
        return json(
          { type: 'EMPTY', results: [], message: `no project ${projMatch[1]} — wave-zero projects are ${RETENTION}` },
          { status: 404, head },
        )
      }
      if (!projMatch[2]) {
        if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
        return json({ type: 'OK', results: [{ id: proj.id, createdAt: proj.createdAt, retention: proj.retention, submittals: proj.submittals.length }] }, { head })
      }
      if (request.method === 'GET' || head) {
        emitMeterEvent(env, ctx, request, { operation: 'listProjectSubmittals', shape: 'anon-sandbox' })
        return proj.submittals.length === 0
          ? json({ type: 'EMPTY', results: [], message: 'no submittal packages assembled in this project yet' }, { head })
          : json({ type: 'OK', results: proj.submittals }, { head })
      }
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json({ type: 'BLOCKED', reason: 'the request body must be a JSON submittal spec with at least { name } and drawing/spec reference arrays' }, { status: 400 })
        }
        if (!body || typeof body.name !== 'string') {
          return json({ type: 'BLOCKED', reason: 'a submittal package carries at least { name }; reference drawings/specifications by id in items[]' }, { status: 400 })
        }
        const rec = {
          $type: 'DigitalDocument',
          kind: 'Submittal',
          id: crypto.randomUUID(),
          name: body.name,
          items: Array.isArray(body.items) ? body.items : [],
          status: 'assembled',
          stamped: false,
          stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
          binding: 'native',
          project: proj.id,
          assembledAt: new Date().toISOString(),
        }
        proj.submittals.push(rec)
        emitMeterEvent(env, ctx, request, { operation: 'assembleSubmittal', shape: 'anon-sandbox' })
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
