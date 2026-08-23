/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0). One definition: every
 * tool answers from the SAME manifest/seed the HTTP doors serve — the tools
 * are the HTTP nouns and verbs, not a second API (§3.3). Tool names ARE the
 * canonical camelCase operationIds (axp-ext/rates-g2 §1): searchDrawings is
 * the /drawings branching collection, getPricing is GET /pricing — one
 * operation, one identifier, every face.
 */

import { collectionDecision, buildPricingDocument } from './axp-faces/index.js'
import { specificationRecords, submittalRecords } from './seed.js'

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
      name: 'searchDrawings',
      description:
        'Search the drawing records (the same /drawings collection): discipline = civil|structural|architectural, tag = $type. Typed OK | EMPTY | BLOCKED result. All records are labeled synthetic example data.',
      inputSchema: {
        type: 'object',
        properties: { discipline: { type: 'string' }, tag: { type: 'string' } },
      },
    },
    {
      name: 'getDrawing',
      description: 'One drawing record by id — same records as GET /drawings/{id}.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    {
      name: 'listSpecifications',
      description: 'Specification records — labeled synthetic example data over fictional firms.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'listSubmittals',
      description: 'Submittal packages (items reference drawing and spec ids) — labeled synthetic example data.',
      inputSchema: { type: 'object', properties: { project: { type: 'string' } } },
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
    case 'searchDrawings': {
      const params = new URLSearchParams()
      if (args.discipline) params.set('discipline', String(args.discipline))
      if (args.tag) params.set('tag', String(args.tag))
      return collectionDecision(manifest, params).body
    }
    case 'getDrawing': {
      const rec = manifest.collection.records.find((r) => r.id === args.id)
      return rec
        ? { type: 'OK', results: [rec] }
        : { type: 'EMPTY', results: [], message: `no drawing record with id ${args.id}` }
    }
    case 'listSpecifications':
      return { type: 'OK', results: specificationRecords }
    case 'listSubmittals': {
      const recs = args.project
        ? submittalRecords.filter((r) => r.project === args.project)
        : submittalRecords
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: `no submittal packages for project ${args.project}` }
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
          serverInfo: { name: 'apis.engineering', version: manifest.version },
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
