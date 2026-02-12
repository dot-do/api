/**
 * Database Convention Types
 *
 * Schema-driven database that auto-generates:
 * - CRUD REST endpoints
 * - MCP tools
 * - RPC methods
 * - WebSocket subscriptions
 * - Event streaming to lakehouse
 */

// =============================================================================
// Schema Definition Types
// =============================================================================

/**
 * Field type shorthand (IceType-inspired)
 *
 * Examples:
 * - 'string!' - Required string
 * - 'string?' - Optional string
 * - 'string = "default"' - String with default
 * - 'string! #unique' - Required, unique indexed
 * - 'number' - Optional number
 * - 'boolean!' - Required boolean
 * - 'json' - JSON object
 * - 'text' - Full-text searchable
 * - 'timestamp!' - Required timestamp
 * - '-> User' - Forward relation to User
 * - '-> User!' - Required forward relation
 * - '<- Post[]' - Inverse relation (array of Posts)
 * - 'vector[1536]' - Vector embedding
 */
export type FieldDef = string

/**
 * Model definition - maps field names to field definitions
 */
export type ModelDef = Record<string, FieldDef>

/**
 * Schema definition - maps model names to model definitions
 */
export type SchemaDef = Record<string, ModelDef>

/**
 * Parsed field information
 */
export interface ParsedField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'text' | 'timestamp' | 'date' | 'cuid' | 'uuid' | 'vector' | 'relation'
  required: boolean
  unique: boolean
  indexed: boolean
  default?: unknown
  enum?: string[]
  precision?: number
  scale?: number
  format?: string
  array?: boolean
  relation?: {
    type: 'forward' | 'inverse'
    target: string
    many: boolean
    inverseField?: string
  }
  vector?: {
    dimensions: number
  }
}

/**
 * Parsed model information
 */
export interface ParsedModel {
  name: string
  singular: string
  plural: string
  fields: Record<string, ParsedField>
  primaryKey: string
  idStrategy?: string
  nameField?: string
  verbs?: Record<string, string>
  /** CRUD verbs disabled on this model (e.g. ['update', 'delete'] for immutable entities) */
  disabledVerbs?: string[]
}

/**
 * Parsed schema
 */
export interface ParsedSchema {
  models: Record<string, ParsedModel>
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Database event - emitted on every change
 */
export interface DatabaseEvent {
  id: string
  sequence: number
  timestamp: string
  operation: 'create' | 'update' | 'delete'
  model: string
  documentId: string
  data?: Record<string, unknown>
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  userId?: string
  requestId?: string
}

/**
 * Shared fields across all event sink types
 */
interface EventSinkBase {
  batchSize?: number
  flushInterval?: number
}

/**
 * Event sink configuration for streaming events (discriminated union)
 */
export type EventSinkConfig =
  | (EventSinkBase & {
      type: 'webhook'
      /** Webhook endpoint URL */
      url: string
      /**
       * Secret for webhook signature authentication.
       * When provided, an X-Webhook-Signature header is included with an
       * HMAC-SHA256 signature of the request body.
       */
      secret?: string
      /**
       * Custom headers to include in webhook requests.
       * Useful for authentication tokens or custom metadata.
       */
      headers?: Record<string, string>
    })
  | (EventSinkBase & { type: 'lakehouse'; binding: string })
  | (EventSinkBase & { type: 'queue'; binding: string })
  | (EventSinkBase & { type: 'analytics'; binding: string })

// =============================================================================
// Database Configuration
// =============================================================================

/**
 * Database convention configuration
 */
export interface DatabaseConfig {
  /**
   * Schema definition.
   * Required unless `objects` is provided for schema discovery from objects.do.
   */
  schema?: SchemaDef

  /**
   * Service binding name for objects.do (e.g., 'OBJECTS').
   * When set, discovers schema from objects.do via listNouns() RPC
   * instead of requiring a static `schema` in config.
   * Takes priority over `schema` when both are set.
   */
  objects?: string

  /**
   * In-memory noun registry (e.g., () => getAllNouns() from digital-objects).
   * When set, schema is discovered from the in-memory registry instead of objects.do.
   * Takes priority over both `objects` and `schema`.
   */
  nounRegistry?: () => Map<string, unknown>

  /**
   * Database driver type or custom driver instance
   *
   * Built-in drivers:
   * - 'do-sqlite': Durable Object with SQLite (default)
   * - 'pglite': PGLite WASM PostgreSQL
   * - 'postgres': Remote PostgreSQL via postgres.do
   * - 'documentdb': MongoDB-compatible
   *
   * Or provide a custom DatabaseDriver implementation.
   */
  driver?: DatabaseDriverType | DatabaseDriver | DatabaseDriverFactory

  /**
   * @deprecated No longer used. ParqueDB is the only database path.
   */
  binding?: string

  /**
   * ParqueDB service binding name (e.g. 'PARQUEDB').
   * Connects to @dotdo/db ParqueDB Worker via RPC.
   */
  parquedb?: string

  /**
   * Namespace for multi-tenant isolation
   * Can be a string or a function that extracts from context
   */
  namespace?: string | ((c: unknown) => string)

  /**
   * Event sinks for streaming changes
   */
  events?: EventSinkConfig[]

  /**
   * Enable MCP tools generation
   * Default: true
   */
  mcp?:
    | boolean
    | {
        enabled: boolean
        prefix?: string
      }

  /**
   * Enable RPC methods generation
   * Default: true
   */
  rpc?:
    | boolean
    | {
        enabled: boolean
        path?: string
      }

  /**
   * Enable WebSocket subscriptions
   * Default: true
   */
  subscriptions?: boolean

  /**
   * REST endpoint configuration
   */
  rest?: {
    /**
     * Base path for REST endpoints
     * Default: ''
     */
    basePath?: string

    /**
     * Default page size
     * Default: 20
     */
    pageSize?: number

    /**
     * Max page size
     * Default: 100
     */
    maxPageSize?: number
  }

  /**
   * Prefix for meta fields ($id, $type, $version, etc.)
   * Default: '$' (matches headless.ly convention: $type, $id, $context, $version, $createdAt, $createdBy, $updatedAt)
   */
  metaPrefix?: '$' | '_'

  /**
   * ID generation format
   * - 'sqid': {type_prefix}_{sqid} (e.g., contact_V1StG)
   * - 'cuid': compact unique ID
   * - 'ulid': time-sortable unique ID
   * - 'uuid': UUID v4
   * - 'auto': timestamp_random (default)
   */
  idFormat?: 'sqid' | 'cuid' | 'ulid' | 'uuid' | 'auto'

  /**
   * Namespace encoded INTO the sqid (e.g., GitHub org/user numeric ID).
   * This number becomes part of the sqid payload: [typeNum, namespace, timestamp, random].
   * Decode any sqid to know which org created it.
   * Can be a number or a function that extracts from context.
   */
  sqidNamespace?: number | ((c: unknown) => number)

  /**
   * Seed for per-org sqid alphabet shuffling (cosmetic).
   * Different seeds produce different-looking IDs for the same numbers.
   * Can be combined with sqidNamespace for double isolation:
   *   namespace = org ID in the payload, seed = org ID shuffles the alphabet.
   * When not provided, uses a default alphabet.
   */
  sqidSeed?: number | ((c: unknown) => number)

  /**
   * Minimum length for sqid segments.
   * Default: 8
   */
  sqidMinLength?: number

  /**
   * Explicit type registry mapping model names to stable numeric IDs.
   * When not provided, auto-generated from schema in insertion order.
   * Use this for stable IDs across schema changes.
   */
  typeRegistry?: TypeRegistry
}

// =============================================================================
// Type Registry
// =============================================================================

/**
 * Bidirectional map: model name ↔ stable numeric ID.
 * Used by sqid encoding to embed type information in the ID segment.
 *
 * Example:
 * ```typescript
 * const registry: TypeRegistry = {
 *   Noun: 1, Verb: 2, Action: 3, Event: 4,
 *   Organization: 5, Contact: 6, Lead: 7, Deal: 8,
 * }
 * ```
 */
export type TypeRegistry = Record<string, number>

/**
 * Reverse type registry: numeric ID → model name
 */
export type ReverseTypeRegistry = Record<number, string>

/**
 * Decoded sqid components
 */
export interface DecodedSqid {
  /** Model name (e.g., 'Contact') */
  type: string
  /** Numeric type ID from the registry */
  typeNum: number
  /** Namespace (e.g., GitHub org numeric ID), if encoded */
  namespace?: number
  /** Timestamp (milliseconds since epoch) */
  timestamp: number
  /** Random component for uniqueness */
  random: number
}

// =============================================================================
// Storage Types
// =============================================================================

/**
 * Document with metadata
 */
export interface Document {
  id: string
  _version: number
  _createdAt: string
  _createdBy?: string
  _updatedAt: string
  _updatedBy?: string
  _deletedAt?: string
  _deletedBy?: string
  [key: string]: unknown
}

/**
 * Query options for list/search
 */
export interface QueryOptions {
  where?: Record<string, unknown>
  orderBy?: string | { field: string; direction: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
  cursor?: string
  include?: string[]
  select?: string[]
}

/**
 * Query result with pagination
 */
export interface QueryResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  cursor?: string
}

// =============================================================================
// Database Driver Types
// =============================================================================

/**
 * Built-in database driver types
 *
 * - 'do-sqlite': Durable Object with in-memory Map + SQLite checkpoint (default)
 * - 'pglite': PGLite WASM PostgreSQL (requires @electric-sql/pglite)
 * - 'postgres': Remote PostgreSQL via postgres.do (requires postgres.do)
 * - 'documentdb': MongoDB-compatible via DocumentDB (requires @dotdo/documentdb)
 */
export type DatabaseDriverType = 'do-sqlite' | 'pglite' | 'postgres' | 'documentdb'

/**
 * Database driver interface - pluggable storage backend
 *
 * Implement this interface to create custom database drivers.
 * All drivers must support the standard CRUD operations.
 */
export interface DatabaseDriver {
  /** Driver name for identification */
  readonly name: string

  /** Initialize the driver with schema */
  init(schema: ParsedSchema, env: Record<string, unknown>): Promise<void>

  /** Create a document */
  create(model: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>

  /** Get a document by ID */
  get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null>

  /** Update a document */
  update(model: string, id: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>

  /** Delete a document (soft delete) */
  delete(model: string, id: string, ctx?: RequestContext): Promise<void>

  /** List documents with pagination */
  list(model: string, options?: QueryOptions): Promise<QueryResult<Document>>

  /** Full-text search */
  search(model: string, query: string, options?: QueryOptions): Promise<QueryResult<Document>>

  /** Count documents matching criteria */
  count(model: string, where?: Record<string, unknown>): Promise<number>

  /** Get events since sequence number */
  getEvents?(options: { since?: number; limit?: number; model?: string }): Promise<DatabaseEvent[]>

  /** Close/cleanup driver resources */
  close?(): Promise<void>
}

/**
 * Driver factory function type
 */
export type DatabaseDriverFactory = (config: DatabaseConfig, env: Record<string, unknown>) => DatabaseDriver | Promise<DatabaseDriver>

// =============================================================================
// DO RPC Types
// =============================================================================

/**
 * Database DO RPC methods
 */
export interface DatabaseRpc {
  // CRUD
  create(model: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>
  get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null>
  update(model: string, id: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>
  delete(model: string, id: string, ctx?: RequestContext): Promise<void>

  // Query
  list(model: string, options?: QueryOptions): Promise<QueryResult<Document>>
  search(model: string, query: string, options?: QueryOptions): Promise<QueryResult<Document>>
  count(model: string, where?: Record<string, unknown>): Promise<number>

  // Relations
  link(model: string, id: string, relation: string, targetId: string, ctx?: RequestContext): Promise<void>
  unlink(model: string, id: string, relation: string, targetId: string, ctx?: RequestContext): Promise<void>

  // Batch
  batch(operations: BatchOperation[]): Promise<BatchResult[]>

  // Subscriptions
  subscribe(model: string, filter?: Record<string, unknown>): AsyncIterable<DatabaseEvent>
}

/**
 * Request context for audit trail
 */
export interface RequestContext {
  userId?: string
  requestId?: string
}

/**
 * Batch operation
 */
export interface BatchOperation {
  operation: 'create' | 'update' | 'delete'
  model: string
  id?: string
  data?: Record<string, unknown>
}

/**
 * Batch result
 */
export interface BatchResult {
  success: boolean
  document?: Document
  error?: string
}

// =============================================================================
// Webhook Signature Verification
// =============================================================================

/**
 * Example: Verifying webhook signatures on the receiving end
 *
 * When you configure a webhook event sink with a secret, the database
 * will include an X-Webhook-Signature header containing an HMAC-SHA256
 * signature of the request body.
 *
 * @example Node.js webhook receiver
 * ```typescript
 * import { createHmac, timingSafeEqual } from 'crypto'
 *
 * function verifyWebhookSignature(
 *   body: string,
 *   signature: string,
 *   secret: string
 * ): boolean {
 *   const expected = createHmac('sha256', secret)
 *     .update(body)
 *     .digest('hex')
 *
 *   // Use constant-time comparison to prevent timing attacks
 *   if (signature.length !== expected.length) return false
 *
 *   return timingSafeEqual(
 *     Buffer.from(signature),
 *     Buffer.from(expected)
 *   )
 * }
 *
 * // In your webhook handler:
 * app.post('/webhook', (req, res) => {
 *   const signature = req.headers['x-webhook-signature']
 *   const rawBody = req.rawBody // Make sure to capture raw body
 *
 *   if (!verifyWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
 *     return res.status(401).json({ error: 'Invalid signature' })
 *   }
 *
 *   const event = JSON.parse(rawBody)
 *   // Process the verified event...
 * })
 * ```
 *
 * @example Cloudflare Worker webhook receiver
 * ```typescript
 * async function verifyWebhookSignature(
 *   body: string,
 *   signature: string,
 *   secret: string
 * ): Promise<boolean> {
 *   const encoder = new TextEncoder()
 *   const key = await crypto.subtle.importKey(
 *     'raw',
 *     encoder.encode(secret),
 *     { name: 'HMAC', hash: 'SHA-256' },
 *     false,
 *     ['sign']
 *   )
 *
 *   const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
 *   const expected = Array.from(new Uint8Array(sig))
 *     .map(b => b.toString(16).padStart(2, '0'))
 *     .join('')
 *
 *   // Constant-time comparison
 *   if (signature.length !== expected.length) return false
 *   let result = 0
 *   for (let i = 0; i < signature.length; i++) {
 *     result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
 *   }
 *   return result === 0
 * }
 * ```
 */
