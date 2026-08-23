/**
 * worker.js — the arts-entertainment wave-zero property: one Workers-shaped
 * worker serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/events, /venues, /tickets,
 *                    /reservations)
 *   headless face  — the booking system-of-record door (H5 "Schedule: THE
 *                    BOOKING") on the SAME collection (POST /reservations),
 *                    anon workspaces with disclosed retention
 *
 * plus the full machine face (AXP quartet via the vendored generator), the
 * mounted MCP door (authless anon-sandbox rung), the 402-shaped payable STUB
 * on the outcome verb (labeled; never fake billing), and the §7.4 seams.
 *
 * PLACEHOLDER ADDRESS: this is a GAP register row (nothing held names
 * NAICS 71 at the category grain); the substrate is built G3-first per spec
 * §0 and the G4 brand attaches when a name is ruled (#16).
 */
import { createAxpRoutes, ok, empty, blocked, offer, envelopeResponse } from './src/axp-faces/index.js'
import { manifest } from './src/manifest.js'
import { PRICING_STATEMENT } from './src/manifest.js'
import { ICP_DOC, VERIFY_DOC } from './src/surfaces.js'
import { createMcpHandler } from './src/mcp.js'
import { emitMeter, emitMoneyEvent, emitReceipt } from './src/seams.js'
import { seed, venues } from './src/substrate.js'

const axp = createAxpRoutes(manifest)
const mcp = createMcpHandler()

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }
const json = (obj, init = {}) => new Response(JSON.stringify(obj, null, 2), { status: init.status || 200, headers: { ...JSON_CT, ...(init.headers || {}) } })

const RETENTION =
  'Ephemeral sandbox workspace: per-isolate, may reset at any time; example environment, no durable storage at wave zero.'

// Anonymous sandbox workspaces — auto-minted, per-isolate, disclosed retention.
const workspaces = new Map() // workspaceId -> { reservations: [] }
const mintId = () => 'ws-' + Math.random().toString(36).slice(2, 10)

const RESOURCES = ['tee-time', 'table', 'ice-slot']

function listOr(records, filters, searchParams, memberName, emptyNoun) {
  let recs = records
  let applied = null
  for (const f of filters) {
    const v = searchParams.get(f.param)
    if (v !== null) {
      recs = recs.filter((r) => String(r[f.field]) === v)
      applied = [f.param, v]
    }
  }
  if (recs.length === 0) {
    const [p, v] = applied || [filters[0]?.param || 'filter', '']
    return envelopeResponse(empty(`no ${emptyNoun} match ${p}=${v} — a truthful empty set, not an error`, { memberName }))
  }
  return envelopeResponse(ok(recs, { memberName }))
}

function getOr(records, id, memberName, noun) {
  const rec = records.find((r) => r.id === id)
  if (!rec) return envelopeResponse(empty(`no ${noun} with id ${id} — nothing here has been deleted; that id was never minted`, { memberName }))
  return envelopeResponse(ok([rec], { memberName }))
}

function workspaceReservations(request) {
  const wsId = request.headers.get('x-workspace')
  return wsId && workspaces.get(wsId) ? workspaces.get(wsId).reservations : []
}

// ── headless face: book venue inventory into an anon workspace ─────────────
async function createReservation(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return envelopeResponse(blocked('the request body must be JSON with venueId, resource, and startsAt members'))
  }
  if (!body || typeof body.venueId !== 'string' || typeof body.resource !== 'string' || typeof body.startsAt !== 'string') {
    return envelopeResponse(blocked('a booking needs { venueId, resource, startsAt, partySize? }'))
  }
  if (!venues.some((v) => v.id === body.venueId)) {
    return envelopeResponse(empty(`no venue with id ${body.venueId} — see /venues`, { memberName: 'reservations' }))
  }
  if (!RESOURCES.includes(body.resource)) {
    return envelopeResponse(blocked(`resource must be one of ${RESOURCES.join(' | ')}`))
  }
  const wsId = request.headers.get('x-workspace') || mintId()
  const ws = workspaces.get(wsId) || { reservations: [] }
  const rec = {
    $type: 'Reservation',
    id: `rsv-${wsId}-${ws.reservations.length + 1}`,
    venueId: body.venueId,
    resource: body.resource,
    startsAt: String(body.startsAt),
    partySize: typeof body.partySize === 'number' ? body.partySize : 1,
    status: 'confirmed',
    workspace: wsId,
    example: true,
    note: 'Record created in an anonymous sandbox workspace. ' + RETENTION,
  }
  ws.reservations.push(rec)
  workspaces.set(wsId, ws)
  emitMeter(request, { operation: 'createReservation', shape: 'anon-sandbox' })
  return json({ type: 'OK', reservations: [rec], workspace: wsId, retention: RETENTION }, { status: 201, headers: { 'x-workspace': wsId } })
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function confirmReservation(request, id) {
  const rec = [...seed.reservations, ...workspaceReservations(request)].find((r) => r.id === id)
  if (!rec) {
    return envelopeResponse(empty(`no reservation with id ${id} — nothing to confirm`, { memberName: 'reservations' }))
  }
  emitMeter(request, { operation: 'confirmReservation', shape: 'paid-stub' })
  emitMoneyEvent(request, { operation: 'confirmReservation', amount: 0.15 })
  emitReceipt(request, { operation: 'confirmReservation' })
  return envelopeResponse(
    offer({
      id: 'confirm-reservation-stub',
      title: `Confirm booking ${id} (${rec.resource} at ${rec.venueId}, per-outcome) — STUB: test-mode, no live settlement; nothing is charged`,
      price: { model: 'metered', unit: 'usd-per-confirmed-booking', price: 0.15 },
      alternatives: manifest.pricing.offers[0].alternatives,
      stub: true,
      statement: PRICING_STATEMENT,
      message:
        'This 402 is the OFFER boundary of the outcome verb. At wave zero it is a labeled stub: the ladder (pay / work / claim) is advertised, settlement is not live, and no billing occurs.',
    }),
  )
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method
    const seg = path.split('/').filter(Boolean)

    // Headless face FIRST: POST /reservations is the system-of-record door —
    // same collection, one definition, two plies.
    if (path === '/reservations' && method === 'POST') return createReservation(request)

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env)
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === 'GET') emitMeter(request, { operation: 'listEvents', shape: 'anon-sandbox' })
      return hit
    }

    // MCP door (mounted → declared on the card; authless anon-sandbox rung).
    if (path === '/mcp') {
      emitMeter(request, { operation: 'mcp:' + (method === 'POST' ? 'call' : method), shape: 'anon-sandbox' })
      return mcp(request)
    }

    // The outcome verb (402 OFFER stub).
    if (method === 'POST' && seg.length === 3 && seg[0] === 'reservations' && seg[2] === 'confirm') {
      return confirmReservation(request, seg[1])
    }

    if (method === 'GET' || method === 'HEAD') {
      if (path === '/icp.json') {
        emitMeter(request, { operation: 'getIcp', shape: 'anon-sandbox' })
        return json(ICP_DOC)
      }
      if (path === '/verify') {
        emitMeter(request, { operation: 'getVerify', shape: 'anon-sandbox' })
        return json(VERIFY_DOC)
      }

      if (seg[0] === 'events' && seg.length === 2) {
        emitMeter(request, { operation: 'getEvent', shape: 'anon-sandbox' })
        return getOr(seed.events, seg[1], 'events', 'event')
      }
      if (path === '/venues') {
        emitMeter(request, { operation: 'listVenues', shape: 'anon-sandbox' })
        return listOr(
          seed.venues,
          [
            { param: 'kind', field: 'kind' },
            { param: 'city', field: 'city' },
          ],
          url.searchParams,
          'venues',
          'venues',
        )
      }
      if (seg[0] === 'venues' && seg.length === 2) {
        emitMeter(request, { operation: 'getVenue', shape: 'anon-sandbox' })
        return getOr(seed.venues, seg[1], 'venues', 'venue')
      }
      if (path === '/tickets') {
        emitMeter(request, { operation: 'listTickets', shape: 'anon-sandbox' })
        return listOr(
          seed.tickets,
          [
            { param: 'eventId', field: 'eventId' },
            { param: 'status', field: 'status' },
          ],
          url.searchParams,
          'tickets',
          'admission tickets',
        )
      }
      if (path === '/reservations') {
        emitMeter(request, { operation: 'listReservations', shape: 'anon-sandbox' })
        return listOr(
          [...seed.reservations, ...workspaceReservations(request)],
          [
            { param: 'status', field: 'status' },
            { param: 'resource', field: 'resource' },
          ],
          url.searchParams,
          'reservations',
          'reservations',
        )
      }
      if (seg[0] === 'reservations' && seg.length === 2) {
        emitMeter(request, { operation: 'getReservation', shape: 'anon-sandbox' })
        return getOr([...seed.reservations, ...workspaceReservations(request)], seg[1], 'reservations', 'reservation')
      }
    }

    return envelopeResponse(
      empty('no route at this path — nothing here has been deleted; the route was never written', { memberName: 'results' }),
      { status: 404 },
    )
  },
}
