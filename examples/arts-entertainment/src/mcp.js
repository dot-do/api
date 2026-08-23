/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true). Tool names are string
 * canonical operationIds — the five-surface invariant (route = MCP tool =
 * suite ref = meter tag = rates key).
 *
 * Gate note (MCP ladder): the anon-sandbox rung is AUTHLESS — these six
 * read tools answer keyless. Rungs above the floor gate on a bearer key;
 * no tool above the floor is mounted at wave zero, so no bearer-gated tool
 * is declared (presence-when-true, never a ghost).
 */
import { ok, empty } from './axp-faces/index.js'
import { seed } from './substrate.js'

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

export function createMcpHandler({ onCall } = {}) {
  const tools = [
    { name: 'listEvents', description: 'List events (labeled synthetic example data); optional filters category (performance | sports | recreation), status (scheduled | completed).', inputSchema: { type: 'object', properties: { category: { type: 'string' }, status: { type: 'string' } } } },
    { name: 'getEvent', description: 'One event by id.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
    { name: 'listVenues', description: 'List venues (fictional, labeled); optional filters kind, city.', inputSchema: { type: 'object', properties: { kind: { type: 'string' }, city: { type: 'string' } } } },
    { name: 'getVenue', description: 'One venue by id.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
    { name: 'listTickets', description: 'List admission tickets (schema.org/Ticket grain — NOT helpdesk tickets); optional filters eventId, status.', inputSchema: { type: 'object', properties: { eventId: { type: 'string' }, status: { type: 'string' } } } },
    { name: 'listReservations', description: 'List seed bookings of venue inventory (tee times, tables, ice slots); optional filters status, resource.', inputSchema: { type: 'object', properties: { status: { type: 'string' }, resource: { type: 'string' } } } },
  ]

  function call(name, args = {}) {
    switch (name) {
      case 'listEvents': {
        let recs = seed.events
        if (args.category) recs = recs.filter((r) => r.category === args.category)
        if (args.status) recs = recs.filter((r) => r.status === args.status)
        return recs.length ? ok(recs, { memberName: 'events' }) : empty('no events match the filter — a truthful empty set', { memberName: 'events' })
      }
      case 'getEvent': {
        const rec = seed.events.find((r) => r.id === args.id)
        return rec ? ok([rec], { memberName: 'events' }) : empty(`no event with id ${args.id}`, { memberName: 'events' })
      }
      case 'listVenues': {
        let recs = seed.venues
        if (args.kind) recs = recs.filter((r) => r.kind === args.kind)
        if (args.city) recs = recs.filter((r) => r.city === args.city)
        return recs.length ? ok(recs, { memberName: 'venues' }) : empty('no venues match the filter — a truthful empty set', { memberName: 'venues' })
      }
      case 'getVenue': {
        const rec = seed.venues.find((r) => r.id === args.id)
        return rec ? ok([rec], { memberName: 'venues' }) : empty(`no venue with id ${args.id}`, { memberName: 'venues' })
      }
      case 'listTickets': {
        let recs = seed.tickets
        if (args.eventId) recs = recs.filter((r) => r.eventId === args.eventId)
        if (args.status) recs = recs.filter((r) => r.status === args.status)
        return recs.length ? ok(recs, { memberName: 'tickets' }) : empty('no tickets match the filter — a truthful empty set', { memberName: 'tickets' })
      }
      case 'listReservations': {
        let recs = seed.reservations
        if (args.status) recs = recs.filter((r) => r.status === args.status)
        if (args.resource) recs = recs.filter((r) => r.resource === args.resource)
        return recs.length ? ok(recs, { memberName: 'reservations' }) : empty('no reservations match the filter — a truthful empty set', { memberName: 'reservations' })
      }
      default:
        return null
    }
  }

  const rpcError = (id, code, message) =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }), { status: 200, headers: JSON_CT })
  const rpcResult = (id, result) =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), { status: 200, headers: JSON_CT })

  return async function handleMcp(request) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ type: 'BLOCKED', reason: 'the MCP door answers JSON-RPC 2.0 over POST' }), {
        status: 405,
        headers: { ...JSON_CT, allow: 'POST' },
      })
    }
    let msg
    try {
      msg = await request.json()
    } catch {
      return rpcError(null, -32700, 'parse error — the body must be a JSON-RPC 2.0 message')
    }
    const { id, method, params } = msg || {}
    switch (method) {
      case 'initialize':
        return rpcResult(id, {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'arts-entertainment', version: '0.1.0' },
        })
      case 'notifications/initialized':
        return new Response(null, { status: 202 })
      case 'tools/list':
        return rpcResult(id, { tools })
      case 'tools/call': {
        const name = params?.name
        const result = call(name, params?.arguments || {})
        if (result === null) return rpcError(id, -32602, `unknown tool ${JSON.stringify(name)} — tools/list names the six that exist`)
        if (onCall) onCall(name)
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false })
      }
      default:
        return rpcError(id, -32601, `method ${JSON.stringify(method)} not found — this door serves initialize, tools/list, tools/call`)
    }
  }
}
