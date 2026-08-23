/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0). One definition: every
 * tool answers from the SAME manifest/seed the HTTP doors serve — the tools
 * are the HTTP nouns and verbs, not a second API (§3.3). Tool names ARE the
 * canonical camelCase operationIds (axp-ext/rates-g2 §1): searchApis is the
 * /apis branching collection, getPricing is GET /pricing — one operation,
 * one identifier, every face.
 */

import { collectionDecision, buildPricingDocument } from './axp-faces/index.js'
import { actionRecords, verificationReports } from './seed.js'

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
      name: 'searchApis',
      description:
        'Search the machine-face API records (the same /apis collection): filter = pricingModel, tag = $type. Typed OK | EMPTY | BLOCKED result.',
      inputSchema: {
        type: 'object',
        properties: { filter: { type: 'string' }, tag: { type: 'string' } },
      },
    },
    {
      name: 'getAPI',
      description: 'One machine-face API record by id (its domain) — same records as GET /apis/{id}.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    {
      name: 'listActions',
      description: 'The Action catalog sample — labeled example data over fictional providers.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'listVerificationReports',
      description: 'Probe outcomes recorded as data (real observations, provenance stamped).',
      inputSchema: { type: 'object', properties: { subject: { type: 'string' } } },
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
    case 'searchApis': {
      const params = new URLSearchParams()
      if (args.filter) params.set('filter', String(args.filter))
      if (args.tag) params.set('tag', String(args.tag))
      return collectionDecision(manifest, params).body
    }
    case 'getAPI': {
      const rec = manifest.collection.records.find((r) => r.id === args.id)
      return rec
        ? { type: 'OK', results: [rec] }
        : { type: 'EMPTY', results: [], message: `no API record with id ${args.id}` }
    }
    case 'listActions':
      return { type: 'OK', results: actionRecords }
    case 'listVerificationReports': {
      const recs = args.subject
        ? verificationReports.filter((r) => r.subject === args.subject)
        : verificationReports
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: `no reports for subject ${args.subject}` }
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
          serverInfo: { name: 'apis.dev', version: manifest.version },
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
