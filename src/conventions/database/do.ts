/**
 * Database Durable Object
 *
 * Schema-driven storage with:
 * - In-memory data with SQLite checkpoint
 * - CRUD operations via RPC
 * - Event streaming to lakehouse
 * - WebSocket subscriptions
 */

import { DurableObject } from 'cloudflare:workers'
import type { Document, DatabaseEvent, ParsedSchema, QueryOptions, EventSinkConfig } from './types'

// =============================================================================
// Webhook Signature Utilities
// =============================================================================

// Type for Node.js crypto module createHmac function
interface NodeCryptoModule {
  createHmac: (algorithm: string, key: string) => {
    update: (data: string) => {
      digest: (encoding: string) => string
    }
  }
}

// Cache for Node.js crypto module (loaded dynamically)
let nodeCrypto: NodeCryptoModule | null = null
let nodeCryptoChecked = false

/**
 * Try to load Node.js crypto module for synchronous signature generation
 */
async function loadNodeCrypto(): Promise<NodeCryptoModule | null> {
  if (nodeCryptoChecked) return nodeCrypto
  nodeCryptoChecked = true
  try {
    // Dynamic import for Node.js environments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeCrypto = await (Function('return import("crypto")')() as Promise<any>)
  } catch {
    nodeCrypto = null
  }
  return nodeCrypto
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * Uses Web Crypto API for Cloudflare Workers compatibility
 */
export async function generateWebhookSignatureAsync(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const bodyData = encoder.encode(body)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, bodyData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Synchronous signature generation for Node.js environments (testing)
 * Uses cached Node.js crypto module if available
 */
export function generateWebhookSignature(body: string, secret: string): string {
  // Use cached Node.js crypto module if available
  if (nodeCrypto) {
    return nodeCrypto.createHmac('sha256', secret).update(body).digest('hex')
  }
  throw new Error('Synchronous signature generation not available. Use generateWebhookSignatureAsync or call loadNodeCrypto() first.')
}

/**
 * Send event to webhook sink with optional signature authentication
 */
export async function sendToWebhookSink(
  event: DatabaseEvent,
  sink: EventSinkConfig
): Promise<void> {
  if (!sink.url) return

  const body = JSON.stringify(event)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add custom headers if configured
  if (sink.headers) {
    for (const [key, value] of Object.entries(sink.headers)) {
      headers[key] = value
    }
  }

  // Add signature header if secret is configured
  if (sink.secret) {
    // Try to load Node.js crypto for sync signature, fall back to async Web Crypto
    const cryptoModule = await loadNodeCrypto()
    let signature: string
    if (cryptoModule) {
      signature = generateWebhookSignature(body, sink.secret)
    } else {
      signature = await generateWebhookSignatureAsync(body, sink.secret)
    }
    headers['X-Webhook-Signature'] = signature
  }

  await fetch(sink.url, {
    method: 'POST',
    headers,
    body,
  })
}

// =============================================================================
// Types
// =============================================================================

interface Env {
  LAKEHOUSE?: DurableObjectNamespace
  EVENTS?: Queue
  [key: string]: unknown
}

interface RpcRequest {
  method: string
  params: Record<string, unknown>
}

interface RpcResponse {
  result?: unknown
  error?: { message: string; code?: string }
}

interface Subscription {
  ws: WebSocket
  model?: string
  filter?: Record<string, unknown>
}

// =============================================================================
// Database DO
// =============================================================================

export class DatabaseDO extends DurableObject<Env> {
  private storage: DurableObjectStorage
  private schema: ParsedSchema | null = null
  private collections: Map<string, Map<string, Document>> = new Map()
  private sequence = 0
  private dirty = false
  private subscriptions: Set<Subscription> = new Set()
  private eventBuffer: DatabaseEvent[] = []
  private eventSinks: EventSinkConfig[] = []

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.storage = state.storage
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private async ensureInitialized(): Promise<void> {
    if (this.schema) return

    // Load schema from storage
    const schemaData = await this.storage.get<ParsedSchema>('schema')
    if (schemaData) {
      this.schema = schemaData
    }

    // Load sequence
    this.sequence = (await this.storage.get<number>('sequence')) || 0

    // Load event sinks config
    this.eventSinks = (await this.storage.get<EventSinkConfig[]>('eventSinks')) || []

    // Load collections from checkpoint
    const checkpoint = await this.storage.get<Record<string, Document[]>>('checkpoint')
    if (checkpoint) {
      for (const [model, docs] of Object.entries(checkpoint)) {
        const map = new Map<string, Document>()
        for (const doc of docs) {
          map.set(doc.id, doc)
        }
        this.collections.set(model, map)
      }
    }
  }

  private async checkpoint(): Promise<void> {
    if (!this.dirty) return

    const checkpoint: Record<string, Document[]> = {}
    for (const [model, docs] of this.collections) {
      checkpoint[model] = Array.from(docs.values())
    }

    await this.storage.put({
      checkpoint,
      sequence: this.sequence,
      schema: this.schema,
      eventSinks: this.eventSinks,
    })

    this.dirty = false
  }

  // ===========================================================================
  // HTTP Handler
  // ===========================================================================

  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized()

    const url = new URL(request.url)

    // WebSocket upgrade for subscriptions
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }

    // RPC endpoint
    if (url.pathname === '/rpc' && request.method === 'POST') {
      const body = await request.json() as RpcRequest
      const response = await this.handleRpc(body)
      return Response.json(response)
    }

    // Schema endpoint
    if (url.pathname === '/schema') {
      return Response.json({ schema: this.schema })
    }

    // Events endpoint
    if (url.pathname === '/events') {
      const since = parseInt(url.searchParams.get('since') || '0', 10)
      const limit = parseInt(url.searchParams.get('limit') || '100', 10)
      const model = url.searchParams.get('model') || undefined

      const events = this.eventBuffer
        .filter((e) => e.sequence > since)
        .filter((e) => !model || e.model === model)
        .slice(0, limit)

      return Response.json({ events })
    }

    return new Response('Not found', { status: 404 })
  }

  // ===========================================================================
  // RPC Handler
  // ===========================================================================

  private async handleRpc(req: RpcRequest): Promise<RpcResponse> {
    try {
      switch (req.method) {
        case 'setSchema':
          return { result: await this.setSchema(req.params.schema as ParsedSchema) }

        case 'create':
          return { result: await this.create(req.params.model as string, req.params.data as Record<string, unknown>, req.params.ctx as { userId?: string; requestId?: string } | undefined) }

        case 'get':
          return { result: await this.get(req.params.model as string, req.params.id as string, req.params.options as { include?: string[] } | undefined) }

        case 'update':
          return { result: await this.update(req.params.model as string, req.params.id as string, req.params.data as Record<string, unknown>, req.params.ctx as { userId?: string; requestId?: string } | undefined) }

        case 'delete':
          await this.delete(req.params.model as string, req.params.id as string, req.params.ctx as { userId?: string; requestId?: string } | undefined)
          return { result: { deleted: true } }

        case 'list':
          return { result: await this.list(req.params.model as string, req.params.options as QueryOptions | undefined) }

        case 'search':
          return { result: await this.search(req.params.model as string, req.params.query as string, req.params.options as QueryOptions | undefined) }

        case 'configureEvents':
          return { result: await this.configureEvents(req.params.sinks as EventSinkConfig[]) }

        default:
          return { error: { message: `Unknown method: ${req.method}`, code: 'METHOD_NOT_FOUND' } }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return { error: { message: err.message } }
    }
  }

  // ===========================================================================
  // Schema
  // ===========================================================================

  private async setSchema(schema: ParsedSchema): Promise<{ success: boolean }> {
    this.schema = schema
    this.dirty = true
    await this.checkpoint()
    return { success: true }
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  private getCollection(model: string): Map<string, Document> {
    if (!this.collections.has(model)) {
      this.collections.set(model, new Map())
    }
    return this.collections.get(model)!
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  private async emitEvent(event: Omit<DatabaseEvent, 'id' | 'sequence' | 'timestamp'>): Promise<void> {
    this.sequence++
    const fullEvent: DatabaseEvent = {
      id: `evt_${this.sequence}`,
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
      ...event,
    }

    // Buffer event
    this.eventBuffer.push(fullEvent)

    // Keep buffer bounded (last 10000 events)
    if (this.eventBuffer.length > 10000) {
      this.eventBuffer = this.eventBuffer.slice(-10000)
    }

    // Notify WebSocket subscribers
    for (const sub of this.subscriptions) {
      if (!sub.model || sub.model === event.model) {
        try {
          sub.ws.send(JSON.stringify(fullEvent))
        } catch {
          this.subscriptions.delete(sub)
        }
      }
    }

    // Send to event sinks
    await this.flushToSinks(fullEvent)
  }

  private async flushToSinks(event: DatabaseEvent): Promise<void> {
    for (const sink of this.eventSinks) {
      try {
        switch (sink.type) {
          case 'lakehouse':
            if (this.env.LAKEHOUSE) {
              const doId = this.env.LAKEHOUSE.idFromName('events')
              const stub = this.env.LAKEHOUSE.get(doId)
              await stub.fetch('http://do/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: [event] }),
              })
            }
            break

          case 'queue':
            if (this.env.EVENTS) {
              await this.env.EVENTS.send(event)
            }
            break

          case 'webhook':
            await sendToWebhookSink(event, sink)
            break

          case 'analytics':
            // Would use Analytics Engine binding
            break
        }
      } catch (e) {
        console.error(`Failed to send to sink ${sink.type}:`, e)
      }
    }
  }

  async create(model: string, data: Record<string, unknown>, ctx?: { userId?: string; requestId?: string }): Promise<Document> {
    const collection = this.getCollection(model)
    const id = (data.id as string) || this.generateId()
    const now = new Date().toISOString()

    const doc: Document = {
      id,
      ...data,
      _version: 1,
      _createdAt: now,
      _createdBy: ctx?.userId,
      _updatedAt: now,
      _updatedBy: ctx?.userId,
    }

    collection.set(id, doc)
    this.dirty = true

    await this.emitEvent({
      operation: 'create',
      model,
      documentId: id,
      after: doc,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    })

    // Schedule checkpoint
    this.ctx.waitUntil(this.checkpoint())

    return doc
  }

  async get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null> {
    const collection = this.getCollection(model)
    const doc = collection.get(id)

    if (!doc || doc._deletedAt) return null

    // Handle includes (relations)
    if (options?.include && this.schema) {
      const modelSchema = this.schema.models[model]
      if (modelSchema) {
        for (const fieldName of options.include) {
          const field = modelSchema.fields[fieldName]
          if (field?.relation) {
            if (field.relation.type === 'forward') {
              // Get the related document
              const relatedId = doc[fieldName] as string
              if (relatedId) {
                const related = await this.get(field.relation.target, relatedId)
                if (related) {
                  doc[fieldName] = related
                }
              }
            } else if (field.relation.type === 'inverse') {
              // Find all documents that reference this one
              const targetCollection = this.getCollection(field.relation.target)
              const related: Document[] = []
              for (const targetDoc of targetCollection.values()) {
                if (!targetDoc._deletedAt) {
                  // Find the field that references this model
                  const targetSchema = this.schema.models[field.relation.target]
                  if (targetSchema) {
                    for (const [targetFieldName, targetField] of Object.entries(targetSchema.fields)) {
                      if (targetField.relation?.type === 'forward' && targetField.relation.target === model) {
                        if (targetDoc[targetFieldName] === id) {
                          related.push(targetDoc)
                        }
                      }
                    }
                  }
                }
              }
              doc[fieldName] = related
            }
          }
        }
      }
    }

    return doc
  }

  async update(model: string, id: string, data: Record<string, unknown>, ctx?: { userId?: string; requestId?: string }): Promise<Document> {
    const collection = this.getCollection(model)
    const existing = collection.get(id)

    if (!existing || existing._deletedAt) {
      throw new Error(`${model} ${id} not found`)
    }

    const before = { ...existing }
    const doc: Document = {
      ...existing,
      ...data,
      id: existing.id,
      _version: existing._version + 1,
      _createdAt: existing._createdAt,
      _createdBy: existing._createdBy,
      _updatedAt: new Date().toISOString(),
      _updatedBy: ctx?.userId,
    }

    collection.set(id, doc)
    this.dirty = true

    await this.emitEvent({
      operation: 'update',
      model,
      documentId: id,
      before,
      after: doc,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    })

    this.ctx.waitUntil(this.checkpoint())

    return doc
  }

  async delete(model: string, id: string, ctx?: { userId?: string; requestId?: string }): Promise<void> {
    const collection = this.getCollection(model)
    const existing = collection.get(id)

    if (!existing || existing._deletedAt) return

    const before = { ...existing }

    // Soft delete
    existing._deletedAt = new Date().toISOString()
    existing._deletedBy = ctx?.userId
    existing._version++

    collection.set(id, existing)
    this.dirty = true

    await this.emitEvent({
      operation: 'delete',
      model,
      documentId: id,
      before,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    })

    this.ctx.waitUntil(this.checkpoint())
  }

  async list(model: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }> {
    const collection = this.getCollection(model)
    let docs = Array.from(collection.values()).filter((d) => !d._deletedAt)

    // Apply where filter
    if (options?.where) {
      docs = docs.filter((doc) => {
        for (const [key, value] of Object.entries(options.where!)) {
          if (doc[key] !== value) return false
        }
        return true
      })
    }

    // Apply orderBy
    if (options?.orderBy) {
      const orders = typeof options.orderBy === 'string'
        ? [{ field: options.orderBy, direction: 'asc' as const }]
        : options.orderBy
      docs.sort((a, b) => {
        for (const { field, direction } of orders) {
          const aVal = String(a[field] || '')
          const bVal = String(b[field] || '')
          const cmp = aVal.localeCompare(bVal)
          if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
        }
        return 0
      })
    }

    // Apply select
    if (options?.select) {
      docs = docs.map((doc) => {
        const selected: Document = { id: doc.id, _version: doc._version, _createdAt: doc._createdAt, _updatedAt: doc._updatedAt }
        for (const field of options.select!) {
          if (field in doc) selected[field] = doc[field]
        }
        return selected
      })
    }

    const total = docs.length
    const limit = options?.limit || 20
    const offset = options?.offset || 0
    docs = docs.slice(offset, offset + limit)

    return {
      data: docs,
      total,
      limit,
      offset,
      hasMore: offset + docs.length < total,
    }
  }

  async search(model: string, query: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }> {
    const collection = this.getCollection(model)
    const q = query.toLowerCase()
    let docs = Array.from(collection.values()).filter((d) => !d._deletedAt)

    // Simple text search
    docs = docs.filter((doc) => {
      for (const value of Object.values(doc)) {
        if (typeof value === 'string' && value.toLowerCase().includes(q)) {
          return true
        }
      }
      return false
    })

    const total = docs.length
    const limit = options?.limit || 20
    const offset = options?.offset || 0
    docs = docs.slice(offset, offset + limit)

    return {
      data: docs,
      total,
      limit,
      offset,
      hasMore: offset + docs.length < total,
    }
  }

  // ===========================================================================
  // Event Configuration
  // ===========================================================================

  async configureEvents(sinks: EventSinkConfig[]): Promise<{ success: boolean }> {
    this.eventSinks = sinks
    this.dirty = true
    await this.checkpoint()
    return { success: true }
  }

  // ===========================================================================
  // WebSocket Subscriptions
  // ===========================================================================

  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

    const url = new URL(request.url)
    const model = url.searchParams.get('model') || undefined

    const subscription: Subscription = { ws: server, model }
    this.subscriptions.add(subscription)

    server.accept()

    server.addEventListener('close', () => {
      this.subscriptions.delete(subscription)
    })

    server.addEventListener('message', async (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        if (msg.type === 'subscribe') {
          subscription.model = msg.model
          subscription.filter = msg.filter
        }
      } catch {
        // Ignore invalid messages
      }
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  // ===========================================================================
  // Alarm for periodic checkpoint
  // ===========================================================================

  async alarm(): Promise<void> {
    await this.checkpoint()
  }
}
