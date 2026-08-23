/**
 * worker.js — apis.estate, wave zero of register row `real-estate`.
 *
 * One substrate, two plies, one worker (template spec §3):
 *   - data face: /closing-packets (+ /closing-packets/{id}), /lien-waivers,
 *     /payoff-letters, /deeds — typed records from the row's schemas
 *     (labeled synthetic seed per §5.2);
 *   - headless face: /transaction-files — the transaction-management
 *     system-of-record door over the SAME noun family (native binding):
 *     mint a file keyless, assemble PacketDocuments into its packet
 *     (the anon sandbox floor, §5.1 rung 0).
 *
 * PERMANENT EXCLUSION: no door here holds, moves, disburses, or instructs
 * the movement of funds — the money/escrow layer is gated on licensure +
 * the A1 settlement module and is not this substrate's to serve. The
 * `escrow` query scope answers BLOCKED by construction.
 *
 * The AXP quartet is emitted by the vendored axp-faces generator (pinned
 * apis-ax-axp@2.6.0, extension axp-ext-rates-g2@0.2.0) from ./manifest.js —
 * never hand-rolled. Custom routes below serve only what the manifest
 * declares (presence-when-true).
 *
 * Serving note (wave zero): custom worker allowed per §7.1; CNAME to the
 * unified workers.do lane is the extraction target, not a wave-zero
 * requirement. The apis.estate name has NO Cloudflare zone today (surface
 * register: cf_zone n) — route attachment is a deploy-time founder act,
 * recorded in wrangler.jsonc.
 */

import { createAxpRoutes, envelopeResponse, serveNegotiated } from './axp-faces/index.js'
import { manifest } from './manifest.js'
import { projection } from './projection.js'
import { lienWaivers, payoffLetters, deeds } from './seed.js'
import { handleMcpMessage } from './mcp.js'
import { buildSuite, buildVerifyDoc, buildVerifyMd } from './verify.js'
import { emitMeterEvent } from './seams.js'

const axpRoutes = createAxpRoutes(manifest)

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

/** Ephemeral transaction-file store — wave zero: in-memory per isolate, may
 *  reset at any time. The retention line is disclosed on every mint (§5.1
 *  rung 0). */
const transactionFiles = new Map()

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
  property: 'apis.estate',
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  counterpartBrand: projection.counterpartBrand,
  agent_classes: [
    {
      id: 'reader-agent',
      description:
        'keyless reads: the quartet, /closing-packets, /lien-waivers, /payoff-letters, /deeds, /verify — no key, no account',
    },
    {
      id: 'packet-assembler',
      description:
        'auto-mints an ephemeral transaction file (POST /transaction-files) and assembles packet documents against it — documents only, never funds',
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

    // ── data face: one closing packet by id ────────────────────────────────
    const packetById = path.match(/^\/closing-packets\/([^/]+)$/)
    if (packetById) {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'getClosingPacket', shape: 'anon-sandbox' })
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(packetById[1]))
      if (!rec) {
        return json(
          { type: 'EMPTY', results: [], message: `no closing-packet record with id ${packetById[1]}` },
          { status: 404, head },
        )
      }
      return json({ type: 'OK', results: [rec] }, { head })
    }

    if (path === '/lien-waivers') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listLienWaivers', shape: 'anon-sandbox' })
      const kind = url.searchParams.get('kind')
      const recs = kind ? lienWaivers.filter((r) => r.kind === kind) : lienWaivers
      if (recs.length === 0) {
        return json(
          { type: 'EMPTY', results: [], message: `no lien-waiver records of kind=${kind} — a truthful empty set` },
          { head },
        )
      }
      return json(
        {
          type: 'OK',
          results: recs,
          note: 'example data — synthetic sandbox seed; record type shared with the construction row (collision on record, built under the real-estate row key)',
        },
        { head },
      )
    }

    if (path === '/payoff-letters') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listPayoffLetters', shape: 'anon-sandbox' })
      return json(
        {
          type: 'OK',
          results: payoffLetters,
          note: 'example data — synthetic sandbox seed; document grain only, no funds move here',
        },
        { head },
      )
    }

    if (path === '/deeds') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      emitMeterEvent(env, ctx, request, { operation: 'listDeeds', shape: 'anon-sandbox' })
      return json(
        {
          type: 'OK',
          results: deeds,
          note: 'example data — synthetic sandbox seed; synthetic recording identifiers, fictional counties',
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
        html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>apis.estate — run our tests</title></head><body><pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`,
      }, { cleanPath: '/verify' })
    }

    if (path === '/verify/suite.json') {
      if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
      return json(buildSuite(manifest), { head })
    }

    // ── headless face: the transaction-file system-of-record door (native) ─
    if (path === '/transaction-files') {
      if (request.method !== 'POST') return methodNotAllowed(path, 'POST')
      const id = crypto.randomUUID()
      const tf = { $type: 'TransactionFile', id, createdAt: new Date().toISOString(), retention: RETENTION, documents: [] }
      transactionFiles.set(id, tf)
      emitMeterEvent(env, ctx, request, { operation: 'createTransactionFile', shape: 'anon-sandbox' })
      return json({ type: 'OK', results: [{ id: tf.id, createdAt: tf.createdAt, retention: tf.retention }] })
    }

    const tfMatch = path.match(/^\/transaction-files\/([^/]+)(\/documents)?$/)
    if (tfMatch) {
      const tf = transactionFiles.get(tfMatch[1])
      if (!tf) {
        return json(
          { type: 'EMPTY', results: [], message: `no transaction file ${tfMatch[1]} — wave-zero transaction files are ${RETENTION}` },
          { status: 404, head },
        )
      }
      if (!tfMatch[2]) {
        if (request.method !== 'GET' && !head) return methodNotAllowed(path, 'GET, HEAD')
        emitMeterEvent(env, ctx, request, { operation: 'getTransactionFile', shape: 'anon-sandbox' })
        return json(
          { type: 'OK', results: [{ id: tf.id, createdAt: tf.createdAt, retention: tf.retention, documents: tf.documents.length }] },
          { head },
        )
      }
      if (request.method === 'GET' || head) {
        emitMeterEvent(env, ctx, request, { operation: 'listPacketDocuments', shape: 'anon-sandbox' })
        return tf.documents.length === 0
          ? json({ type: 'EMPTY', results: [], message: 'no documents assembled into this transaction file yet' }, { head })
          : json({ type: 'OK', results: tf.documents }, { head })
      }
      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json({ type: 'BLOCKED', reason: 'the request body must be a JSON packet document with at least { id, kind }' }, { status: 400 })
        }
        if (!body || typeof body.id !== 'string' || typeof body.kind !== 'string') {
          return json({ type: 'BLOCKED', reason: 'a packet document carries at least { id, kind }' }, { status: 400 })
        }
        if (/escrow|disbursement|wire/i.test(body.kind)) {
          return json(
            {
              type: 'BLOCKED',
              reason:
                'money/escrow documents are permanently out of scope on this substrate (licensure + A1 settlement gate) — the packet carries documents, never funds or instructions to move them',
            },
            { status: 403 },
          )
        }
        const rec = { $type: 'PacketDocument', ...body, binding: 'native', assembledAt: new Date().toISOString() }
        tf.documents.push(rec)
        emitMeterEvent(env, ctx, request, { operation: 'addPacketDocument', shape: 'anon-sandbox' })
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
