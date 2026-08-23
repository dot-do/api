/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0). One definition: every
 * tool answers from the SAME manifest/seed the HTTP doors serve — the tools
 * are the HTTP nouns and verbs, not a second API (§3.3). Tool names ARE the
 * canonical camelCase operationIds (axp-ext/rates-g2 §1): searchClosingPackets
 * is the /closing-packets branching collection, getPricing is GET /pricing —
 * one operation, one identifier, every face.
 *
 * Auth: authless — only the anon-sandbox rung is mounted (mounted-rungs-only
 * ruling); the bearer-key tier arrives with rung 1+.
 */

import { collectionDecision, buildPricingDocument } from './axp-faces/index.js'
import { lienWaivers, payoffLetters, deeds } from './seed.js'

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

export function buildTools(manifest) {
  return [
    {
      name: 'searchClosingPackets',
      description:
        'Search the closing-packet records (the same /closing-packets collection): county = county name, kind = purchase | refinance. Typed OK | EMPTY | BLOCKED result. All records labeled example data.',
      inputSchema: {
        type: 'object',
        properties: { county: { type: 'string' }, kind: { type: 'string' } },
      },
    },
    {
      name: 'getClosingPacket',
      description: 'One closing-packet record by id — same records as GET /closing-packets/{id}.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    {
      name: 'listLienWaivers',
      description:
        'Lien-waiver records (labeled example data). Record type shared with the construction row — collision on record, built under the real-estate row key.',
      inputSchema: { type: 'object', properties: { kind: { type: 'string' } } },
    },
    {
      name: 'listPayoffLetters',
      description: 'Payoff-letter records (labeled example data) — document grain only; no funds move here.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'listDeeds',
      description: 'Deed records at the county-recorder grain (labeled example data, synthetic recording identifiers).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'getPricing',
      description: 'The Pricing Document (AXP Appendix A.2) — same document as GET /pricing.',
      inputSchema: { type: 'object', properties: {} },
    },
  ]
}

function callTool(manifest, name, args = {}) {
  switch (name) {
    case 'searchClosingPackets': {
      const params = new URLSearchParams()
      if (args.county) params.set('county', String(args.county))
      if (args.kind) params.set('kind', String(args.kind))
      return collectionDecision(manifest, params).body
    }
    case 'getClosingPacket': {
      const rec = manifest.collection.records.find((r) => r.id === args.id)
      return rec
        ? { type: 'OK', results: [rec] }
        : { type: 'EMPTY', results: [], message: `no closing-packet record with id ${args.id}` }
    }
    case 'listLienWaivers': {
      const recs = args.kind ? lienWaivers.filter((r) => r.kind === args.kind) : lienWaivers
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: `no lien-waiver records of kind ${args.kind}` }
    }
    case 'listPayoffLetters':
      return { type: 'OK', results: payoffLetters }
    case 'listDeeds':
      return { type: 'OK', results: deeds }
    case 'getPricing':
      return buildPricingDocument(manifest)
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
          serverInfo: { name: 'apis.estate', version: manifest.version },
        },
      }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: buildTools(manifest) } }
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
