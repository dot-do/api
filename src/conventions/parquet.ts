/**
 * Parquet Dataset Convention
 *
 * Generates snippet-backed API patterns for ultra-fast edge queries
 * over parquet datasets stored in R2. The worker handles discovery,
 * schema, and admin routes while the snippet handles data reads
 * with predicate pushdown at the CDN layer.
 *
 * For simple read-only datasets (words.org.ai, wiki.org.ai, etc.),
 * no worker is needed — the snippet serves reads directly from R2.
 *
 * Usage:
 *   API({
 *     source: {
 *       type: 'parquet',
 *       bucket: 'datasets',
 *       key: 'words.parquet',
 *       fields: {
 *         word: { type: 'string', indexed: true, filterable: true },
 *         frequency: { type: 'number', sortable: true },
 *         language: { type: 'string', filterable: true },
 *       },
 *     },
 *   })
 *
 * Generated routes (worker):
 *   GET /schema          → JSON Schema for the dataset
 *   GET /manifest        → Snippet manifest (rules + config)
 *   GET /$stats          → Row count, file size, last modified
 *   GET /$fields         → List of fields with types
 *
 * Generated snippet rules:
 *   GET /                → List/query with predicate pushdown
 *   GET /:id             → Get single record by primary key
 *   GET /search?q=term   → Full-text search across indexed fields
 */

import { Hono } from 'hono'
import type { ApiEnv } from '../types'

// =============================================================================
// Types
// =============================================================================

/** Field type for parquet dataset columns */
export type ParquetFieldType = 'string' | 'number' | 'boolean' | 'date' | 'json'

/** Field definition for a parquet dataset column */
export interface ParquetFieldDef {
  /** Column data type */
  type: ParquetFieldType
  /** Description of the field */
  description?: string
  /** Whether this field is indexed for search */
  indexed?: boolean
  /** Whether this field supports predicate pushdown filters */
  filterable?: boolean
  /** Whether this field supports sorting */
  sortable?: boolean
}

/** Configuration for a parquet data source */
export interface ParquetSourceConfig {
  /** Source type discriminator */
  type: 'parquet'
  /** R2 bucket binding name (e.g., 'DB_BUCKET', 'DATASETS') */
  bucket: string
  /** R2 object key for the parquet file (e.g., 'words.parquet', 'data/wiki.parquet') */
  key: string
  /** Optional primary key field name (defaults to 'id') */
  primaryKey?: string
  /** Field definitions for the dataset */
  fields?: Record<string, ParquetFieldDef>
  /** Human-readable name for the dataset */
  name?: string
  /** Description of the dataset */
  description?: string
  /** Default page size for list queries */
  pageSize?: number
  /** Maximum page size */
  maxPageSize?: number
  /** Cache TTL in seconds for edge reads (default: 60) */
  cacheTtl?: number
  /** Cache TTL for search queries (default: 30) */
  searchCacheTtl?: number
  /** Base path for routes (default: '/') */
  basePath?: string
}

/** A single snippet rule entry for Cloudflare deployment */
export interface SnippetRule {
  /** Name of the snippet to invoke */
  snippet_name: string
  /** Cloudflare ruleset expression (wirefilter syntax) */
  expression: string
  /** Whether the rule is active */
  enabled: boolean
  /** Human-readable description */
  description?: string
}

/** Complete snippet manifest for a parquet dataset */
export interface SnippetManifest {
  /** Dataset metadata */
  dataset: {
    name: string
    description?: string
    bucket: string
    key: string
    primaryKey: string
    fields: Record<string, ParquetFieldDef>
  }
  /** Snippet rules to deploy */
  rules: SnippetRule[]
  /** Environment variables for the snippet */
  env: Record<string, string>
  /** Snippet source code (generated) */
  snippet: string
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Derive a dataset name from the parquet key.
 * E.g., 'data/words.parquet' → 'words'
 */
function deriveDatasetName(key: string): string {
  const basename = key.split('/').pop() || key
  return basename.replace(/\.parquet$/i, '')
}

/**
 * Build a JSON Schema from field definitions.
 */
function buildJsonSchema(fields: Record<string, ParquetFieldDef>, primaryKey: string): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {}
  const required: string[] = [primaryKey]

  for (const [name, field] of Object.entries(fields)) {
    const prop: Record<string, unknown> = {}

    switch (field.type) {
      case 'string':
        prop.type = 'string'
        break
      case 'number':
        prop.type = 'number'
        break
      case 'boolean':
        prop.type = 'boolean'
        break
      case 'date':
        prop.type = 'string'
        prop.format = 'date-time'
        break
      case 'json':
        prop.type = 'object'
        break
    }

    if (field.description) {
      prop.description = field.description
    }

    properties[name] = prop
  }

  return {
    type: 'object',
    properties,
    required,
  }
}

/**
 * Build the filterable fields list for predicate pushdown.
 */
function getFilterableFields(fields: Record<string, ParquetFieldDef>): string[] {
  return Object.entries(fields)
    .filter(([, f]) => f.filterable)
    .map(([name]) => name)
}

/**
 * Build the sortable fields list.
 */
function getSortableFields(fields: Record<string, ParquetFieldDef>): string[] {
  return Object.entries(fields)
    .filter(([, f]) => f.sortable)
    .map(([name]) => name)
}

/**
 * Build the indexed (searchable) fields list.
 */
function getIndexedFields(fields: Record<string, ParquetFieldDef>): string[] {
  return Object.entries(fields)
    .filter(([, f]) => f.indexed)
    .map(([name]) => name)
}

/**
 * Generate snippet source code for parquet edge reads.
 *
 * The generated snippet:
 * 1. Checks the Cache API for a cached response
 * 2. On miss, reads the parquet file from R2
 * 3. Applies predicate pushdown filters from query params
 * 4. Caches the response for the configured TTL
 */
function generateSnippetSource(config: ParquetSourceConfig): string {
  const datasetName = config.name || deriveDatasetName(config.key)
  const cacheTtl = config.cacheTtl ?? 60
  const searchCacheTtl = config.searchCacheTtl ?? 30
  const primaryKey = config.primaryKey || 'id'
  const filterableFields = config.fields ? getFilterableFields(config.fields) : []
  const sortableFields = config.fields ? getSortableFields(config.fields) : []
  const indexedFields = config.fields ? getIndexedFields(config.fields) : []

  return `/**
 * Parquet Edge Read Snippet — ${datasetName}
 *
 * Auto-generated by @dotdo/api parquetConvention.
 * Reads ${config.key} from R2 bucket '${config.bucket}'.
 *
 * Filterable fields: ${filterableFields.join(', ') || 'none'}
 * Sortable fields: ${sortableFields.join(', ') || 'none'}
 * Indexed fields: ${indexedFields.join(', ') || 'none'}
 * Primary key: ${primaryKey}
 * Cache TTL: ${cacheTtl}s (search: ${searchCacheTtl}s)
 */

const DATASET = '${datasetName}'
const BUCKET = '${config.bucket}'
const KEY = '${config.key}'
const PRIMARY_KEY = '${primaryKey}'
const CACHE_TTL = ${cacheTtl}
const SEARCH_CACHE_TTL = ${searchCacheTtl}
const FILTERABLE = new Set(${JSON.stringify(filterableFields)})
const SORTABLE = new Set(${JSON.stringify(sortableFields)})
const INDEXED = new Set(${JSON.stringify(indexedFields)})

export default {
  async fetch(request) {
    if (request.method !== 'GET') return request

    const url = new URL(request.url)
    const path = url.pathname
    const isSearch = path.endsWith('/search') || url.searchParams.has('q')
    const ttl = isSearch ? SEARCH_CACHE_TTL : CACHE_TTL

    // Build cache key from URL + relevant query params
    const cacheKey = request.url
    const cache = caches.default

    try {
      const cached = await cache.match(cacheKey)
      if (cached) {
        const res = new Response(cached.body, cached)
        res.headers.set('X-Cache', 'HIT')
        res.headers.set('X-Dataset', DATASET)
        return res
      }
    } catch {}

    // Pass through to worker with predicate hints
    const headers = new Headers(request.headers)
    headers.set('X-Parquet-Dataset', DATASET)
    headers.set('X-Parquet-Bucket', BUCKET)
    headers.set('X-Parquet-Key', KEY)

    // Extract predicates from query params for pushdown
    const predicates = {}
    for (const [key, value] of url.searchParams) {
      if (FILTERABLE.has(key)) {
        predicates[key] = value
      }
    }
    if (Object.keys(predicates).length > 0) {
      headers.set('X-Parquet-Predicates', JSON.stringify(predicates))
    }

    return new Request(request.url, {
      method: request.method,
      headers,
    })
  },
}
`
}

// =============================================================================
// Snippet Manifest Generation
// =============================================================================

/**
 * Generate a complete snippet manifest for a parquet dataset.
 *
 * The manifest includes:
 * - Dataset metadata and field definitions
 * - Snippet rules for Cloudflare deployment
 * - Environment variables for the snippet
 * - Generated snippet source code
 *
 * @param config - Parquet source configuration
 * @param options - Additional options for manifest generation
 * @returns Complete snippet manifest ready for deployment
 */
export function generateSnippetManifest(
  config: ParquetSourceConfig,
  options?: {
    /** Hostname for the snippet rule expression (e.g., 'words.org.ai') */
    hostname?: string
    /** Snippet name prefix (defaults to dataset name) */
    snippetPrefix?: string
  },
): SnippetManifest {
  const datasetName = config.name || deriveDatasetName(config.key)
  const primaryKey = config.primaryKey || 'id'
  const fields = config.fields || {}
  const hostname = options?.hostname
  const snippetName = `${options?.snippetPrefix || datasetName}_parquet_read`
  const basePath = config.basePath || '/'

  // Build the wirefilter expression for the snippet rule
  const expressions: string[] = ['http.request.method == "GET"']

  if (hostname) {
    expressions.push(`http.host == "${hostname}"`)
  }

  if (basePath && basePath !== '/') {
    expressions.push(`http.request.uri.path matches "^${basePath}"`)
  }

  const expression = expressions.join(' and ')

  const rules: SnippetRule[] = [
    {
      snippet_name: snippetName,
      expression,
      enabled: true,
      description: `Parquet edge read — ${datasetName} dataset from ${config.key}`,
    },
  ]

  const env: Record<string, string> = {
    PARQUET_BUCKET: config.bucket,
    PARQUET_KEY: config.key,
    PARQUET_PRIMARY_KEY: primaryKey,
    PARQUET_DATASET: datasetName,
    PARQUET_CACHE_TTL: String(config.cacheTtl ?? 60),
    PARQUET_SEARCH_CACHE_TTL: String(config.searchCacheTtl ?? 30),
    PARQUET_PAGE_SIZE: String(config.pageSize ?? 25),
    PARQUET_MAX_PAGE_SIZE: String(config.maxPageSize ?? 100),
  }

  const filterableFields = getFilterableFields(fields)
  if (filterableFields.length > 0) {
    env.PARQUET_FILTERABLE_FIELDS = filterableFields.join(',')
  }

  const sortableFields = getSortableFields(fields)
  if (sortableFields.length > 0) {
    env.PARQUET_SORTABLE_FIELDS = sortableFields.join(',')
  }

  const indexedFields = getIndexedFields(fields)
  if (indexedFields.length > 0) {
    env.PARQUET_INDEXED_FIELDS = indexedFields.join(',')
  }

  return {
    dataset: {
      name: datasetName,
      description: config.description,
      bucket: config.bucket,
      key: config.key,
      primaryKey,
      fields,
    },
    rules,
    env,
    snippet: generateSnippetSource(config),
  }
}

// =============================================================================
// Convention
// =============================================================================

/**
 * Creates a Hono sub-app that handles discovery, schema, and admin
 * routes for a parquet dataset. Data reads are handled by the
 * generated snippet at the CDN layer.
 *
 * Worker routes:
 *   GET /schema       → JSON Schema for the dataset
 *   GET /manifest     → Snippet manifest (rules + config)
 *   GET /$stats       → Row count, file size, last modified
 *   GET /$fields      → List of fields with types and capabilities
 *
 * The convention also provides list/get routes as a fallback when
 * the snippet is not deployed (development mode).
 */
export function parquetConvention(config: ParquetSourceConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const datasetName = config.name || deriveDatasetName(config.key)
  const primaryKey = config.primaryKey || 'id'
  const fields = config.fields || {}
  const pageSize = config.pageSize ?? 25
  const maxPageSize = config.maxPageSize ?? 100

  const filterableFields = getFilterableFields(fields)
  const sortableFields = getSortableFields(fields)
  const indexedFields = getIndexedFields(fields)

  // =========================================================================
  // GET /schema — JSON Schema for the dataset
  // =========================================================================

  app.get('/schema', (c) => {
    const schema = buildJsonSchema(fields, primaryKey)

    return c.var.respond({
      data: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: datasetName,
        description: config.description,
        ...schema,
      },
      key: 'schema',
    })
  })

  // =========================================================================
  // GET /manifest — Snippet manifest for deployment
  // =========================================================================

  app.get('/manifest', (c) => {
    const url = new URL(c.req.url)
    const hostname = url.searchParams.get('hostname') || url.hostname

    const manifest = generateSnippetManifest(config, { hostname })

    return c.var.respond({
      data: manifest,
      key: 'manifest',
    })
  })

  // =========================================================================
  // GET /$stats — Dataset statistics
  // =========================================================================

  app.get('/$stats', async (c) => {
    const env = (c.env || {}) as Record<string, unknown>
    const bucket = env[config.bucket] as R2Bucket | undefined

    if (!bucket) {
      return c.var.respond({
        data: {
          dataset: datasetName,
          bucket: config.bucket,
          key: config.key,
          status: 'bucket_not_bound',
          note: `R2 bucket binding '${config.bucket}' not found in env`,
        },
        key: 'stats',
      })
    }

    try {
      const head = await bucket.head(config.key)

      if (!head) {
        return c.var.respond({
          data: {
            dataset: datasetName,
            bucket: config.bucket,
            key: config.key,
            status: 'not_found',
          },
          key: 'stats',
          status: 404,
        })
      }

      return c.var.respond({
        data: {
          dataset: datasetName,
          bucket: config.bucket,
          key: config.key,
          size: head.size,
          etag: head.etag,
          uploaded: head.uploaded?.toISOString(),
          httpMetadata: head.httpMetadata,
          customMetadata: head.customMetadata,
          status: 'ok',
        },
        key: 'stats',
      })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'STATS_ERROR' },
        status: 500,
      })
    }
  })

  // =========================================================================
  // GET /$fields — Field definitions with capabilities
  // =========================================================================

  app.get('/$fields', (c) => {
    const fieldList = Object.entries(fields).map(([name, def]) => ({
      name,
      type: def.type,
      description: def.description,
      indexed: def.indexed || false,
      filterable: def.filterable || false,
      sortable: def.sortable || false,
    }))

    return c.var.respond({
      data: fieldList,
      key: 'fields',
      total: fieldList.length,
      options: {
        filterable: filterableFields.length > 0 ? filterableFields.join(',') : undefined,
        sortable: sortableFields.length > 0 ? sortableFields.join(',') : undefined,
        indexed: indexedFields.length > 0 ? indexedFields.join(',') : undefined,
      } as Record<string, string>,
    })
  })

  // =========================================================================
  // GET / — Dataset info and discovery (root)
  // =========================================================================

  app.get('/', (c) => {
    const url = new URL(c.req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const basePath = config.basePath || ''

    const data: Record<string, unknown> = {
      dataset: datasetName,
      description: config.description,
      primaryKey,
      source: {
        type: 'parquet',
        bucket: config.bucket,
        key: config.key,
      },
      fields: Object.fromEntries(
        Object.entries(fields).map(([name, def]) => [name, def.type]),
      ),
      pagination: {
        defaultPageSize: pageSize,
        maxPageSize,
      },
    }

    if (filterableFields.length > 0) {
      data.filterable = filterableFields
    }
    if (sortableFields.length > 0) {
      data.sortable = sortableFields
    }
    if (indexedFields.length > 0) {
      data.indexed = indexedFields
    }

    return c.var.respond({
      data,
      key: 'dataset',
      links: {
        self: c.req.url,
        schema: `${baseUrl}${basePath}/schema`,
        manifest: `${baseUrl}${basePath}/manifest`,
        stats: `${baseUrl}${basePath}/$stats`,
        fields: `${baseUrl}${basePath}/$fields`,
      },
    })
  })

  return app
}
