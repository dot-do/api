/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0). One definition: every
 * tool answers from the SAME manifest/seed the HTTP doors serve — the tools
 * are the HTTP nouns and verbs, not a second API (§3.3).
 *
 * Auth (batch-2 ruling): AUTHLESS at the anonymous-sandbox rung — the only
 * rung mounted on this origin. Bearer-key auth appears on this door when a
 * keyed rung above the floor mounts, and not before (presence-when-true).
 */

import { collectionDecision } from './axp-faces/index.js'
import { bridgedPricing } from './bridge.js'
import { donors, donations, grants } from './seed.js'

const PROTOCOL_VERSION = '2025-06-18'

function toolResult(id, payload) {
  return {
    jsonrpc: '2.0',
    id,
    result: { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] },
  }
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

export function buildTools() {
  return [
    {
      name: 'search_organizations',
      description:
        'Search org-level records (the same /organizations collection): subsection = IRS subsection (e.g. 501(c)(3)), ntee = NTEE code. Typed OK | EMPTY | BLOCKED result. Labeled synthetic example data.',
      inputSchema: {
        type: 'object',
        properties: { subsection: { type: 'string' }, ntee: { type: 'string' } },
      },
    },
    {
      name: 'get_organization',
      description: 'One organization record by id — same records as GET /organizations/{id}.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    {
      name: 'list_donors',
      description: 'Donor records — labeled synthetic example data (fictional people).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_donations',
      description: 'Donation records (pledge → received → receipted) — same records as GET /donations; org filters.',
      inputSchema: { type: 'object', properties: { org: { type: 'string' } } },
    },
    {
      name: 'list_grants',
      description: 'Grant-cycle records (application → award → disbursement) — same records as GET /grants; org filters by grantee.',
      inputSchema: { type: 'object', properties: { org: { type: 'string' } } },
    },
    {
      name: 'get_pricing',
      description: 'The Pricing Document (AXP Appendix A.2, with the top-level operationId-keyed rates[]) — same document as GET /pricing.',
      inputSchema: { type: 'object', properties: {} },
    },
  ]
}

function callTool(manifest, name, args = {}) {
  switch (name) {
    case 'search_organizations': {
      const params = new URLSearchParams()
      if (args.subsection) params.set('subsection', String(args.subsection))
      if (args.ntee) params.set('ntee', String(args.ntee))
      return collectionDecision(manifest, params).body
    }
    case 'get_organization': {
      const rec = manifest.collection.records.find((r) => r.id === args.id)
      return rec
        ? { type: 'OK', results: [rec] }
        : { type: 'EMPTY', results: [], message: `no organization record with id ${args.id}` }
    }
    case 'list_donors':
      return { type: 'OK', results: donors }
    case 'list_donations': {
      const recs = args.org ? donations.filter((r) => r.org === args.org) : donations
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: `no donations for org ${args.org} — a truthful empty set` }
    }
    case 'list_grants': {
      const recs = args.org ? grants.filter((r) => r.grantee === args.org) : grants
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: `no grants for org ${args.org} — a truthful empty set` }
    }
    case 'get_pricing':
      return bridgedPricing
    default:
      return undefined
  }
}

/** Handle one JSON-RPC message body; returns the response object or null
 *  (notifications get no response). */
export function handleMcpMessage(manifest, msg) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return rpcError(msg && msg.id, -32600, 'invalid JSON-RPC 2.0 request')
  }
  const { id, method, params } = msg
  if (id === undefined) return null // notification
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: manifest.name, version: manifest.version },
        },
      }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: buildTools() } }
    case 'tools/call': {
      const name = params && params.name
      const result = callTool(manifest, name, (params && params.arguments) || {})
      if (result === undefined) return rpcError(id, -32602, `unknown tool: ${name}`)
      return toolResult(id, result)
    }
    default:
      return rpcError(id, -32601, `method not found: ${method}`)
  }
}
