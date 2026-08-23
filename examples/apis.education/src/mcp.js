/**
 * mcp.js — the MCP door (POST /mcp, JSON-RPC 2.0). One definition: every
 * tool answers from the SAME manifest/seed the HTTP doors serve — the tools
 * are the HTTP nouns and verbs, not a second API (§3.3). Tool names ARE the
 * canonical camelCase operationIds (axp-ext/rates-g2 §1): searchCourses is
 * the /courses branching collection, getPricing is GET /pricing — one
 * operation, one identifier, every face.
 *
 * The door is authless at the anon-sandbox rung only; no keyed rung is
 * mounted in wave zero (presence-when-true).
 */

import { collectionDecision, buildPricingDocument } from './axp-faces/index.js'
import { credentialRecords, aidArtifactRecords } from './seed.js'

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
      name: 'searchCourses',
      description:
        'Search the Course records (the same /courses collection): level = educationalLevel, subject = subject. Typed OK | EMPTY | BLOCKED result.',
      inputSchema: {
        type: 'object',
        properties: { level: { type: 'string' }, subject: { type: 'string' } },
      },
    },
    {
      name: 'getCourse',
      description: 'One Course record by id — same records as GET /courses/{id}.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    {
      name: 'listCredentials',
      description: 'EducationalOccupationalCredential records — labeled synthetic example data over fictional institutions.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'listAidArtifacts',
      description: 'Financial-aid artifact records (FAFSA-class document grain) — labeled synthetic example data.',
      inputSchema: { type: 'object', properties: { documentClass: { type: 'string' } } },
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
    case 'searchCourses': {
      const params = new URLSearchParams()
      if (args.level) params.set('level', String(args.level))
      if (args.subject) params.set('subject', String(args.subject))
      return collectionDecision(manifest, params).body
    }
    case 'getCourse': {
      const rec = manifest.collection.records.find((r) => r.id === args.id)
      return rec
        ? { type: 'OK', results: [rec] }
        : { type: 'EMPTY', results: [], message: `no Course record with id ${args.id}` }
    }
    case 'listCredentials':
      return { type: 'OK', results: credentialRecords }
    case 'listAidArtifacts': {
      const recs = args.documentClass
        ? aidArtifactRecords.filter((r) => r.documentClass === args.documentClass)
        : aidArtifactRecords
      return recs.length > 0
        ? { type: 'OK', results: recs }
        : { type: 'EMPTY', results: [], message: `no aid artifacts with documentClass ${args.documentClass}` }
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
          serverInfo: { name: 'apis.education', version: manifest.version },
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
