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
  relation?: {
    type: 'forward' | 'inverse'
    target: string
    many: boolean
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
 * Event sink configuration for streaming events
 */
export interface EventSinkConfig {
  type: 'lakehouse' | 'queue' | 'webhook' | 'analytics'
  binding?: string
  url?: string
  batchSize?: number
  flushInterval?: number
}

// =============================================================================
// Database Configuration
// =============================================================================

/**
 * Database convention configuration
 */
export interface DatabaseConfig {
  /**
   * Schema definition
   */
  schema: SchemaDef

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
   * Durable Object binding name for the database DO
   * Used when driver is 'do-sqlite' (default)
   */
  binding?: string

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
  mcp?: boolean | {
    enabled: boolean
    prefix?: string
  }

  /**
   * Enable RPC methods generation
   * Default: true
   */
  rpc?: boolean | {
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
  getEvents?(since: number, limit?: number, model?: string): Promise<DatabaseEvent[]>

  /** Close/cleanup driver resources */
  close?(): Promise<void>
}

/**
 * Driver factory function type
 */
export type DatabaseDriverFactory = (
  config: DatabaseConfig,
  env: Record<string, unknown>
) => DatabaseDriver | Promise<DatabaseDriver>

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
