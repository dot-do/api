/**
 * Database Durable Object
 *
 * Schema-driven storage with:
 * - SQLite-backed persistent storage (Durable Object built-in SQLite)
 * - CRUD operations via RPC
 * - Event streaming to lakehouse
 * - WebSocket subscriptions
 *
 * Tables:
 * - entities: All documents across all models (type-discriminated)
 * - events: Persistent event log (bounded, replaces in-memory buffer)
 * - meta: Key-value store for schema, sequence, event sinks config, typeRegistryVersion, maxEvents, minAvailableSequence
 * - failed_events: Dead-letter queue for webhook events that failed after retry exhaustion
 */

import { DurableObject } from 'cloudflare:workers'
import type { Document, DatabaseEvent, ParsedSchema, QueryOptions, EventSinkConfig, RequestContext } from './types'
import { matchesWhere } from './match'

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
 * Retry configuration for webhook delivery
 */
export interface WebhookRetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number
}

const DEFAULT_WEBHOOK_RETRY: Required<WebhookRetryConfig> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Send event to webhook sink with optional signature authentication.
 * Includes exponential backoff retry (3 attempts: 1s, 2s, 4s delays).
 * Throws on permanent failure after all retries are exhausted.
 */
export async function sendToWebhookSink(
  event: DatabaseEvent,
  sink: Extract<EventSinkConfig, { type: 'webhook' }>,
  retryConfig?: WebhookRetryConfig,
): Promise<void> {
  const { maxAttempts, baseDelayMs } = { ...DEFAULT_WEBHOOK_RETRY, ...retryConfig }
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

  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(sink.url, {
        method: 'POST',
        headers,
        body,
      })

      // Treat 2xx as success, 4xx as permanent failure (no retry), 5xx as retryable
      if (response.ok) return

      const statusText = `${response.status} ${response.statusText}`
      if (response.status >= 400 && response.status < 500) {
        // Client error — permanent failure, do not retry
        throw new Error(`Webhook permanently rejected: ${statusText}`)
      }

      lastError = new Error(`Webhook server error: ${statusText}`)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      // If it's a permanent rejection (4xx), re-throw immediately
      if (lastError.message.startsWith('Webhook permanently rejected')) {
        throw lastError
      }
    }

    if (attempt < maxAttempts) {
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) // 1s, 2s, 4s
      console.warn(`[webhook] Retry ${attempt}/${maxAttempts} for ${sink.url} in ${delayMs}ms — ${lastError?.message}`)
      await sleep(delayMs)
    }
  }

  // All retries exhausted
  throw lastError || new Error(`Webhook delivery failed after ${maxAttempts} attempts`)
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

/** Row shape returned from the entities table */
interface EntityRow {
  id: string
  type: string
  data: string
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Row shape returned from the events table */
interface EventRow {
  id: string
  sequence: number
  timestamp: string
  operation: string
  model: string
  document_id: string
  data: string | null
  before_data: string | null
  after_data: string | null
  user_id: string | null
  request_id: string | null
}

/** Row shape returned from the meta table */
interface MetaRow {
  key: string
  value: string
}

// =============================================================================
// Database DO
// =============================================================================

export class DatabaseDO extends DurableObject<Env> {
  private sql: SqlStorage
  private schema: ParsedSchema | null = null
  private initialized = false
  private sequence = 0
  private subscriptions: Set<Subscription> = new Set()
  private eventSinks: EventSinkConfig[] = []
  /** Configurable max events to retain in the events table (default: 10000) */
  private maxEvents = 10000

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.sql = state.storage.sql
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private ensureInitialized(): void {
    if (this.initialized) return

    // Create tables if they don't exist
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        PRIMARY KEY (id, type)
      );
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
      CREATE INDEX IF NOT EXISTS idx_entities_type_deleted ON entities(type, deleted_at);

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        sequence INTEGER NOT NULL UNIQUE,
        timestamp TEXT NOT NULL,
        operation TEXT NOT NULL,
        model TEXT NOT NULL,
        document_id TEXT NOT NULL,
        data TEXT,
        before_data TEXT,
        after_data TEXT,
        user_id TEXT,
        request_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(sequence);
      CREATE INDEX IF NOT EXISTS idx_events_model ON events(model);

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS failed_events (
        id TEXT PRIMARY KEY,
        event_data TEXT NOT NULL,
        sink_type TEXT NOT NULL,
        sink_url TEXT,
        error TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_attempt_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_failed_events_created ON failed_events(created_at);
    `)

    // Load schema from meta
    const schemaRows = this.sql.exec('SELECT value FROM meta WHERE key = ?', 'schema').toArray() as unknown as MetaRow[]
    if (schemaRows.length > 0 && schemaRows[0]) {
      this.schema = JSON.parse(schemaRows[0].value)
    }

    // Load sequence from meta
    const seqRows = this.sql.exec('SELECT value FROM meta WHERE key = ?', 'sequence').toArray() as unknown as MetaRow[]
    if (seqRows.length > 0 && seqRows[0]) {
      this.sequence = parseInt(seqRows[0].value, 10)
    }

    // Load event sinks from meta
    const sinksRows = this.sql.exec('SELECT value FROM meta WHERE key = ?', 'eventSinks').toArray() as unknown as MetaRow[]
    if (sinksRows.length > 0 && sinksRows[0]) {
      this.eventSinks = JSON.parse(sinksRows[0].value)
    }

    // Load configurable maxEvents from meta
    const maxEventsRows = this.sql.exec('SELECT value FROM meta WHERE key = ?', 'maxEvents').toArray() as unknown as MetaRow[]
    if (maxEventsRows.length > 0 && maxEventsRows[0]) {
      this.maxEvents = parseInt(maxEventsRows[0].value, 10)
    }

    this.initialized = true
  }

  /**
   * Persist a meta key-value pair
   */
  private setMeta(key: string, value: unknown): void {
    const json = JSON.stringify(value)
    this.sql.exec(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      key,
      json
    )
  }

  // ===========================================================================
  // HTTP Handler
  // ===========================================================================

  async fetch(request: Request): Promise<Response> {
    this.ensureInitialized()

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

      const events = this.getEvents({ since, limit, model })
      const meta = events._meta

      return Response.json({
        events,
        ...(meta ? { _meta: meta } : {}),
      })
    }

    // Failed events (dead-letter queue) endpoint
    if (url.pathname === '/failed-events') {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10)
      const failedEvents = this.getFailedEvents(limit)
      return Response.json({ failedEvents })
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
          return { result: await this.setSchema(req.params.schema as ParsedSchema, req.params.typeRegistryVersion as string | undefined) }

        case 'getTypeRegistryVersion':
          return { result: this.getTypeRegistryVersion() }

        case 'create':
          return { result: await this.create(req.params.model as string, req.params.data as Record<string, unknown>, req.params.ctx as RequestContext | undefined) }

        case 'get':
          return { result: await this.get(req.params.model as string, req.params.id as string, req.params.options as { include?: string[] } | undefined) }

        case 'update':
          return { result: await this.update(req.params.model as string, req.params.id as string, req.params.data as Record<string, unknown>, req.params.ctx as RequestContext | undefined) }

        case 'delete':
          await this.delete(req.params.model as string, req.params.id as string, req.params.ctx as RequestContext | undefined)
          return { result: { deleted: true } }

        case 'list':
          return { result: await this.list(req.params.model as string, req.params.options as QueryOptions | undefined) }

        case 'search':
          return { result: await this.search(req.params.model as string, req.params.query as string, req.params.options as QueryOptions | undefined) }

        case 'count':
          return { result: await this.count(req.params.model as string, req.params.where as Record<string, unknown> | undefined) }

        case 'configureEvents':
          return { result: await this.configureEvents(req.params.sinks as EventSinkConfig[]) }

        case 'configureMaxEvents':
          return { result: await this.configureMaxEvents(req.params.maxEvents as number) }

        case 'getFailedEvents':
          return { result: this.getFailedEvents(req.params.limit as number | undefined) }

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

  private async setSchema(schema: ParsedSchema, typeRegistryVersion?: string): Promise<{ success: boolean }> {
    this.schema = schema
    this.setMeta('schema', schema)
    if (typeRegistryVersion) {
      this.setMeta('typeRegistryVersion', typeRegistryVersion)
    }
    return { success: true }
  }

  /**
   * Get the stored type registry version from meta.
   * Returns null if no version has been stored yet.
   */
  private getTypeRegistryVersion(): string | null {
    const rows = this.sql.exec('SELECT value FROM meta WHERE key = ?', 'typeRegistryVersion').toArray() as unknown as MetaRow[]
    if (rows.length > 0 && rows[0]) {
      return JSON.parse(rows[0].value)
    }
    return null
  }

  // ===========================================================================
  // SQLite Entity Helpers
  // ===========================================================================

  /**
   * Deserialize an entity row from SQLite into a Document
   */
  private rowToDocument(row: EntityRow): Document {
    const parsed = JSON.parse(row.data) as Record<string, unknown>
    return {
      id: row.id,
      ...parsed,
      _version: row.version,
      _createdAt: row.created_at,
      _updatedAt: row.updated_at,
      ...(row.deleted_at ? { _deletedAt: row.deleted_at } : {}),
    } as Document
  }

  /**
   * Serialize a Document's user data (excluding meta fields) to JSON for storage
   */
  private documentToDataJson(doc: Document): string {
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(doc)) {
      // Skip id and internal meta fields — these are stored in dedicated columns
      if (key === 'id' || key === '_version' || key === '_createdAt' || key === '_createdBy' || key === '_updatedAt' || key === '_updatedBy' || key === '_deletedAt' || key === '_deletedBy') {
        continue
      }
      data[key] = value
    }
    // Store _createdBy and _updatedBy and _deletedBy inside the data JSON
    // since they are part of the document but not separate columns
    if (doc._createdBy !== undefined) data._createdBy = doc._createdBy
    if (doc._updatedBy !== undefined) data._updatedBy = doc._updatedBy
    if (doc._deletedBy !== undefined) data._deletedBy = doc._deletedBy
    return JSON.stringify(data)
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  private async emitEvent(event: Omit<DatabaseEvent, 'id' | 'sequence' | 'timestamp'>): Promise<void> {
    this.sequence++
    const fullEvent: DatabaseEvent = {
      id: `evt_${this.sequence}`,
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
      ...event,
    }

    // Persist event to SQLite
    this.sql.exec(
      `INSERT INTO events (id, sequence, timestamp, operation, model, document_id, data, before_data, after_data, user_id, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      fullEvent.id,
      fullEvent.sequence,
      fullEvent.timestamp,
      fullEvent.operation,
      fullEvent.model,
      fullEvent.documentId,
      fullEvent.data ? JSON.stringify(fullEvent.data) : null,
      fullEvent.before ? JSON.stringify(fullEvent.before) : null,
      fullEvent.after ? JSON.stringify(fullEvent.after) : null,
      fullEvent.userId || null,
      fullEvent.requestId || null
    )

    // Persist sequence
    this.setMeta('sequence', this.sequence)

    // Prune old events — keep last maxEvents (configurable, default 10000)
    const pruneThreshold = this.sequence - this.maxEvents
    if (pruneThreshold > 0) {
      const pruneResult = this.sql.exec(
        `DELETE FROM events WHERE sequence <= ?`,
        pruneThreshold
      )
      // Check how many rows were pruned
      const prunedCount = pruneResult.rowsWritten
      if (prunedCount > 0) {
        console.warn(`[events] Pruned ${prunedCount} events (sequence <= ${pruneThreshold}). maxEvents=${this.maxEvents}. CDC subscribers polling below this sequence will miss events.`)
        // Store the lowest available sequence so CDC consumers can detect gaps
        this.setMeta('minAvailableSequence', pruneThreshold + 1)
      }
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

  /**
   * Query persisted events from SQLite.
   * Returns events and metadata about whether the requested cursor is still available.
   */
  private getEvents(options: { since?: number; limit?: number; model?: string }): DatabaseEvent[] & { _meta?: { gapDetected: boolean; minAvailableSequence: number } } {
    const since = options.since || 0
    const limit = options.limit || 100
    const model = options.model

    // Check if the requested cursor has been pruned
    const minSeqRows = this.sql.exec('SELECT value FROM meta WHERE key = ?', 'minAvailableSequence').toArray() as unknown as MetaRow[]
    const minAvailableSequence = minSeqRows.length > 0 && minSeqRows[0] ? parseInt(minSeqRows[0].value, 10) : 0
    const gapDetected = since > 0 && since < minAvailableSequence

    if (gapDetected) {
      console.warn(`[events] CDC gap detected: subscriber requested since=${since} but minAvailableSequence=${minAvailableSequence}. Events have been pruned.`)
    }

    let rows: EventRow[]
    if (model) {
      rows = this.sql.exec(
        'SELECT * FROM events WHERE sequence > ? AND model = ? ORDER BY sequence ASC LIMIT ?',
        since,
        model,
        limit
      ).toArray() as unknown as EventRow[]
    } else {
      rows = this.sql.exec(
        'SELECT * FROM events WHERE sequence > ? ORDER BY sequence ASC LIMIT ?',
        since,
        limit
      ).toArray() as unknown as EventRow[]
    }

    const events = rows.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      timestamp: row.timestamp,
      operation: row.operation as DatabaseEvent['operation'],
      model: row.model,
      documentId: row.document_id,
      data: row.data ? JSON.parse(row.data) : undefined,
      before: row.before_data ? JSON.parse(row.before_data) : undefined,
      after: row.after_data ? JSON.parse(row.after_data) : undefined,
      userId: row.user_id || undefined,
      requestId: row.request_id || undefined,
    })) as DatabaseEvent[] & { _meta?: { gapDetected: boolean; minAvailableSequence: number } }

    // Attach metadata so callers can detect pruned gaps
    events._meta = { gapDetected, minAvailableSequence }

    return events
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
            try {
              await sendToWebhookSink(event, sink)
            } catch (webhookError) {
              // All retries exhausted — store in dead-letter queue
              const errMsg = webhookError instanceof Error ? webhookError.message : String(webhookError)
              console.error(`[webhook] Permanent failure for ${sink.url}: ${errMsg}. Storing event ${event.id} in dead-letter queue.`)
              this.storeFailedEvent(event, sink, errMsg)
            }
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

  /**
   * Store a failed event in the dead-letter queue (failed_events SQLite table).
   * These can be inspected and retried via the /failed-events endpoint.
   */
  private storeFailedEvent(
    event: DatabaseEvent,
    sink: EventSinkConfig,
    error: string,
  ): void {
    const failedId = `fail_${event.id}_${Date.now()}`
    const sinkUrl = sink.type === 'webhook' ? sink.url : undefined
    this.sql.exec(
      `INSERT INTO failed_events (id, event_data, sink_type, sink_url, error, attempts, created_at, last_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      failedId,
      JSON.stringify(event),
      sink.type,
      sinkUrl || null,
      error,
      3, // Already exhausted 3 retry attempts
    )
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  async create(model: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document> {
    this.ensureInitialized()
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

    const dataJson = this.documentToDataJson(doc)

    this.sql.exec(
      `INSERT OR REPLACE INTO entities (id, type, data, version, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      id,
      model,
      dataJson,
      1,
      now,
      now
    )

    await this.emitEvent({
      operation: 'create',
      model,
      documentId: id,
      after: doc,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    })

    return doc
  }

  async get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null> {
    this.ensureInitialized()
    const rows = this.sql.exec(
      'SELECT * FROM entities WHERE id = ? AND type = ? AND deleted_at IS NULL',
      id,
      model
    ).toArray() as unknown as EntityRow[]

    if (rows.length === 0 || !rows[0]) return null
    const row = rows[0]

    const doc = this.rowToDocument(row)

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
              // Query all non-deleted entities of the target type
              const targetRows = this.sql.exec(
                'SELECT * FROM entities WHERE type = ? AND deleted_at IS NULL',
                field.relation.target
              ).toArray() as unknown as EntityRow[]

              const related: Document[] = []
              const targetSchema = this.schema.models[field.relation.target]
              if (targetSchema) {
                for (const targetRow of targetRows) {
                  const targetDoc = this.rowToDocument(targetRow)
                  for (const [targetFieldName, targetField] of Object.entries(targetSchema.fields)) {
                    if (targetField.relation?.type === 'forward' && targetField.relation.target === model) {
                      if (targetDoc[targetFieldName] === id) {
                        related.push(targetDoc)
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

  async update(model: string, id: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document> {
    this.ensureInitialized()
    const existingRows = this.sql.exec(
      'SELECT * FROM entities WHERE id = ? AND type = ? AND deleted_at IS NULL',
      id,
      model
    ).toArray() as unknown as EntityRow[]

    if (existingRows.length === 0 || !existingRows[0]) {
      throw new Error(`${model} ${id} not found`)
    }
    const existingRow = existingRows[0]

    const existing = this.rowToDocument(existingRow)
    const before = { ...existing }
    const now = new Date().toISOString()

    const doc: Document = {
      ...existing,
      ...data,
      id: existing.id,
      _version: existing._version + 1,
      _createdAt: existing._createdAt,
      _createdBy: existing._createdBy,
      _updatedAt: now,
      _updatedBy: ctx?.userId,
    }

    const dataJson = this.documentToDataJson(doc)

    this.sql.exec(
      `UPDATE entities SET data = ?, version = ?, updated_at = ? WHERE id = ? AND type = ?`,
      dataJson,
      doc._version,
      now,
      id,
      model
    )

    await this.emitEvent({
      operation: 'update',
      model,
      documentId: id,
      before,
      after: doc,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    })

    return doc
  }

  async delete(model: string, id: string, ctx?: RequestContext): Promise<void> {
    this.ensureInitialized()
    const existingRows = this.sql.exec(
      'SELECT * FROM entities WHERE id = ? AND type = ? AND deleted_at IS NULL',
      id,
      model
    ).toArray() as unknown as EntityRow[]

    if (existingRows.length === 0 || !existingRows[0]) return
    const existingRow = existingRows[0]

    const existing = this.rowToDocument(existingRow)
    const before = { ...existing }
    const now = new Date().toISOString()

    // Soft delete — set deleted_at and bump version
    this.sql.exec(
      `UPDATE entities SET deleted_at = ?, version = version + 1, data = json_set(data, '$._deletedBy', ?), updated_at = ? WHERE id = ? AND type = ?`,
      now,
      ctx?.userId || null,
      now,
      id,
      model
    )

    await this.emitEvent({
      operation: 'delete',
      model,
      documentId: id,
      before,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    })
  }

  async list(model: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }> {
    this.ensureInitialized()
    // Fetch all non-deleted entities of this type from SQLite
    const rows = this.sql.exec(
      'SELECT * FROM entities WHERE type = ? AND deleted_at IS NULL',
      model
    ).toArray() as unknown as EntityRow[]

    let docs = rows.map((row) => this.rowToDocument(row))

    // Apply where filter (full MongoDB-style operator support — in-memory for now)
    if (options?.where) {
      docs = docs.filter((doc) => matchesWhere(doc, options.where!))
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
    this.ensureInitialized()
    // Use SQLite LIKE for initial filtering, then refine in-memory
    // The LIKE search checks the JSON data column for the query string
    const q = query.toLowerCase()

    const rows = this.sql.exec(
      'SELECT * FROM entities WHERE type = ? AND deleted_at IS NULL AND LOWER(data) LIKE ?',
      model,
      `%${q}%`
    ).toArray() as unknown as EntityRow[]

    // Deserialize and do precise field-level text matching
    let docs = rows.map((row) => this.rowToDocument(row)).filter((doc) => {
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

  async count(model: string, where?: Record<string, unknown>): Promise<number> {
    this.ensureInitialized()
    if (!where) {
      // Fast path: use SQL COUNT (always returns exactly 1 row)
      const result = this.sql.exec(
        'SELECT COUNT(*) as cnt FROM entities WHERE type = ? AND deleted_at IS NULL',
        model
      ).one() as unknown as { cnt: number }
      return result.cnt
    }

    // With where filter: fetch and filter in-memory (matches current behavior)
    const rows = this.sql.exec(
      'SELECT * FROM entities WHERE type = ? AND deleted_at IS NULL',
      model
    ).toArray() as unknown as EntityRow[]

    let docs = rows.map((row) => this.rowToDocument(row))
    docs = docs.filter((doc) => matchesWhere(doc, where))

    return docs.length
  }

  // ===========================================================================
  // RPC Aliases (match ParqueDBDOStub interface for createDOParqueDBService)
  // ===========================================================================

  /**
   * Alias for list() — matches ParqueDBDOStub.find() interface.
   * Returns { items, total, hasMore } instead of { data, total, hasMore }.
   */
  async find(
    model: string,
    filter?: Record<string, unknown>,
    options?: { limit?: number; offset?: number; sort?: Record<string, 1 | -1> },
  ): Promise<{ items: Record<string, unknown>[]; total: number; hasMore: boolean }> {
    const orderBy = options?.sort
      ? Object.entries(options.sort).map(([field, dir]) => ({ field, direction: dir === 1 ? 'asc' as const : 'desc' as const }))
      : undefined
    const result = await this.list(model, { where: filter, limit: options?.limit, offset: options?.offset, orderBy })
    return { items: result.data, total: result.total, hasMore: result.hasMore }
  }

  /**
   * Alias for count() — matches ParqueDBDOStub.countEntities() interface.
   */
  async countEntities(model: string): Promise<number> {
    return this.count(model)
  }

  // ===========================================================================
  // Event Configuration
  // ===========================================================================

  async configureEvents(sinks: EventSinkConfig[]): Promise<{ success: boolean }> {
    this.eventSinks = sinks
    this.setMeta('eventSinks', sinks)
    return { success: true }
  }

  /**
   * Configure the maximum number of events to retain in the events table.
   * Events beyond this limit are pruned on each new event emission.
   */
  async configureMaxEvents(maxEvents: number): Promise<{ success: boolean; maxEvents: number }> {
    if (maxEvents < 100) {
      throw new Error('maxEvents must be at least 100')
    }
    this.maxEvents = maxEvents
    this.setMeta('maxEvents', maxEvents)
    return { success: true, maxEvents }
  }

  /**
   * Retrieve failed events from the dead-letter queue for inspection/retry.
   */
  private getFailedEvents(limit?: number): { id: string; event: DatabaseEvent; sinkType: string; sinkUrl: string | null; error: string; attempts: number; createdAt: string; lastAttemptAt: string }[] {
    const effectiveLimit = limit || 50
    const rows = this.sql.exec(
      'SELECT * FROM failed_events ORDER BY created_at DESC LIMIT ?',
      effectiveLimit
    ).toArray() as unknown as { id: string; event_data: string; sink_type: string; sink_url: string | null; error: string; attempts: number; created_at: string; last_attempt_at: string }[]

    return rows.map((row) => ({
      id: row.id,
      event: JSON.parse(row.event_data) as DatabaseEvent,
      sinkType: row.sink_type,
      sinkUrl: row.sink_url,
      error: row.error,
      attempts: row.attempts,
      createdAt: row.created_at,
      lastAttemptAt: row.last_attempt_at,
    }))
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
  // Alarm (no longer needed for checkpointing — SQLite is durable)
  // ===========================================================================

  async alarm(): Promise<void> {
    // No-op: SQLite persists automatically. Kept for interface compatibility.
  }
}
