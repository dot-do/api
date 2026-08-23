/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0). One definition: every
 * tool answers from the SAME manifest/seed the HTTP doors serve — the tools
 * are the HTTP nouns and verbs, not a second API (§3.3). Tool names ARE the
 * canonical camelCase operationIds (axp-ext/rates-g2 §1): searchLoanFiles is
 * the /loan-files branching collection, getPricing is GET /pricing — one
 * operation, one identifier, every face.
 */

import { collectionDecision, buildPricingDocument } from './axp-faces/index.js'
import { lenderMarketRecords } from './seed.js'

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
      name: 'searchLoanFiles',
      description:
        'Search the MISMO-typed loan-file records (the same /loan-files collection): purpose = Purchase | Refinance, status = loanStatus. Typed OK | EMPTY | BLOCKED result. Records are labeled example data.',
      inputSchema: {
        type: 'object',
        properties: { purpose: { type: 'string' }, status: { type: 'string' } },
      },
    },
    {
      name: 'getLoanFile',
      description: 'One MISMO-typed loan-file record by id — same records as GET /loan-files/{id}.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    {
      name: 'listLenderMarketRecords',
      description:
        'HMDA-derived lender market records (real public data, FFIEC HMDA Data Browser, query URL stamped on every record) — same records as GET /market-records.',
      inputSchema: {
        type: 'object',
        properties: { state: { type: 'string' }, purpose: { type: 'string' } },
      },
    },
    {
      name: 'getPricing',
      description: 'The Pricing Document (AXP Appendix A.2) — same document as GET /pricing.',
      inputSchema: { type: 'object', properties: {} },
    },
  ]
}

export function filterMarketRecords(args = {}) {
  let recs = lenderMarketRecords
  if (args.state) recs = recs.filter((r) => r.state === String(args.state).toUpperCase())
  if (args.purpose) recs = recs.filter((r) => r.loanPurpose.toLowerCase() === String(args.purpose).toLowerCase())
  return recs
}

function callTool(manifest, name, args = {}) {
  switch (name) {
    case 'searchLoanFiles': {
      const params = new URLSearchParams()
      if (args.purpose) params.set('purpose', String(args.purpose))
      if (args.status) params.set('status', String(args.status))
      return collectionDecision(manifest, params).body
    }
    case 'getLoanFile': {
      const rec = manifest.collection.records.find((r) => r.id === args.id)
      return rec
        ? { type: 'OK', results: [rec] }
        : { type: 'EMPTY', results: [], message: `no loan-file record with id ${args.id}` }
    }
    case 'listLenderMarketRecords': {
      const recs = filterMarketRecords(args)
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: 'no market records match — a truthful empty set' }
    }
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
          serverInfo: { name: 'apis.mortgage', version: manifest.version },
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
