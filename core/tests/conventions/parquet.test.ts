/**
 * Parquet Convention Tests
 *
 * Tests for:
 * 1. parquetConvention() — worker routes for schema, manifest, stats, fields
 * 2. generateSnippetManifest() — snippet manifest generation
 * 3. ParquetSourceConfig types and defaults
 */

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { parquetConvention, generateSnippetManifest } from '../../src/conventions/parquet'
import type { ParquetSourceConfig } from '../../src/conventions/parquet'
import type { ApiEnv } from '../../src/types'

// =============================================================================
// Helpers
// =============================================================================

/** Create a test app with the parquet convention mounted */
function createTestApp(config: ParquetSourceConfig, env: Record<string, unknown> = {}) {
  const app = new Hono<ApiEnv>()

  // Mock respond helper (normally provided by API factory)
  app.use('*', async (c, next) => {
    // Initialize c.env if not set (test environment has no worker runtime)
    if (!c.env) {
      ;(c as any).env = {}
    }
    // Inject mock env bindings
    for (const [key, value] of Object.entries(env)) {
      ;(c.env as Record<string, unknown>)[key] = value
    }

    c.set('requestId', 'test-request-id')
    c.set('apiConfig', { name: 'test-api' } as any)
    c.set('respond', (options: { data?: unknown; key?: string; error?: { message: string; code?: string }; status?: number; total?: number; links?: Record<string, string>; options?: Record<string, string> }) => {
      const status = options.status || (options.error ? 500 : 200)
      const body: Record<string, unknown> = {
        api: { name: 'test-api' },
      }
      if (options.error) {
        body.error = options.error
      } else {
        const key = options.key || 'data'
        body[key] = options.data
      }
      if (options.total !== undefined) body.total = options.total
      if (options.links) body.links = options.links
      if (options.options) body.options = options.options
      return c.json(body, status as 200)
    })
    await next()
  })

  app.route('/', parquetConvention(config))
  return app
}

/** Standard test config */
const WORDS_CONFIG: ParquetSourceConfig = {
  type: 'parquet',
  bucket: 'DATASETS',
  key: 'words.parquet',
  name: 'words',
  description: 'English word frequency dataset',
  primaryKey: 'word',
  fields: {
    word: { type: 'string', indexed: true, filterable: true, description: 'The word' },
    frequency: { type: 'number', sortable: true, description: 'Usage frequency count' },
    language: { type: 'string', filterable: true, description: 'Language code' },
    partOfSpeech: { type: 'string', filterable: true, description: 'Part of speech' },
    isCommon: { type: 'boolean', filterable: true, description: 'Whether the word is common' },
  },
  pageSize: 50,
  maxPageSize: 500,
  cacheTtl: 120,
  searchCacheTtl: 60,
}

/** Minimal config (tests defaults) */
const MINIMAL_CONFIG: ParquetSourceConfig = {
  type: 'parquet',
  bucket: 'DB_BUCKET',
  key: 'data/wiki.parquet',
}

// =============================================================================
// 1. Schema Route
// =============================================================================

describe('Schema Route (GET /schema)', () => {
  it('returns JSON Schema with field definitions', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/schema')

    expect(res.status).toBe(200)
    const body = await res.json()
    const schema = body.schema

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.title).toBe('words')
    expect(schema.description).toBe('English word frequency dataset')
    expect(schema.type).toBe('object')
    expect(schema.required).toContain('word')
  })

  it('includes all field properties with correct types', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/schema')
    const body = await res.json()
    const props = body.schema.properties

    expect(props.word.type).toBe('string')
    expect(props.word.description).toBe('The word')
    expect(props.frequency.type).toBe('number')
    expect(props.language.type).toBe('string')
    expect(props.isCommon.type).toBe('boolean')
  })

  it('handles minimal config with empty fields', async () => {
    const app = createTestApp(MINIMAL_CONFIG)
    const res = await app.request('/schema')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schema.title).toBe('wiki')
    expect(body.schema.required).toContain('id')
  })
})

// =============================================================================
// 2. Manifest Route
// =============================================================================

describe('Manifest Route (GET /manifest)', () => {
  it('returns complete snippet manifest', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/manifest')

    expect(res.status).toBe(200)
    const body = await res.json()
    const manifest = body.manifest

    expect(manifest.dataset.name).toBe('words')
    expect(manifest.dataset.bucket).toBe('DATASETS')
    expect(manifest.dataset.key).toBe('words.parquet')
    expect(manifest.dataset.primaryKey).toBe('word')
    expect(manifest.rules).toBeInstanceOf(Array)
    expect(manifest.rules.length).toBeGreaterThan(0)
    expect(manifest.env).toBeDefined()
    expect(manifest.snippet).toContain('words')
  })

  it('accepts hostname query param for rule expression', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/manifest?hostname=words.org.ai')

    expect(res.status).toBe(200)
    const body = await res.json()
    const rule = body.manifest.rules[0]

    expect(rule.expression).toContain('words.org.ai')
  })

  it('includes env vars for snippet configuration', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/manifest')
    const body = await res.json()
    const env = body.manifest.env

    expect(env.PARQUET_BUCKET).toBe('DATASETS')
    expect(env.PARQUET_KEY).toBe('words.parquet')
    expect(env.PARQUET_PRIMARY_KEY).toBe('word')
    expect(env.PARQUET_CACHE_TTL).toBe('120')
    expect(env.PARQUET_SEARCH_CACHE_TTL).toBe('60')
    expect(env.PARQUET_PAGE_SIZE).toBe('50')
    expect(env.PARQUET_MAX_PAGE_SIZE).toBe('500')
    expect(env.PARQUET_FILTERABLE_FIELDS).toContain('word')
    expect(env.PARQUET_SORTABLE_FIELDS).toContain('frequency')
    expect(env.PARQUET_INDEXED_FIELDS).toContain('word')
  })
})

// =============================================================================
// 3. Fields Route
// =============================================================================

describe('Fields Route (GET /$fields)', () => {
  it('returns field list with capabilities', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/$fields')

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.total).toBe(5)
    expect(body.fields).toBeInstanceOf(Array)
    expect(body.fields.length).toBe(5)

    const wordField = body.fields.find((f: { name: string }) => f.name === 'word')
    expect(wordField).toBeDefined()
    expect(wordField.type).toBe('string')
    expect(wordField.indexed).toBe(true)
    expect(wordField.filterable).toBe(true)
    expect(wordField.sortable).toBe(false)

    const freqField = body.fields.find((f: { name: string }) => f.name === 'frequency')
    expect(freqField.sortable).toBe(true)
    expect(freqField.filterable).toBe(false)
  })

  it('includes options with field categories', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/$fields')
    const body = await res.json()

    expect(body.options).toBeDefined()
    expect(body.options.filterable).toContain('word')
    expect(body.options.sortable).toContain('frequency')
    expect(body.options.indexed).toContain('word')
  })

  it('handles config with no fields', async () => {
    const app = createTestApp(MINIMAL_CONFIG)
    const res = await app.request('/$fields')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(0)
    expect(body.fields).toEqual([])
  })
})

// =============================================================================
// 4. Stats Route
// =============================================================================

describe('Stats Route (GET /$stats)', () => {
  it('returns status when bucket is not bound', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/$stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.status).toBe('bucket_not_bound')
    expect(body.stats.bucket).toBe('DATASETS')
  })

  it('returns file info when bucket is bound and file exists', async () => {
    const mockBucket = {
      head: async (key: string) => ({
        size: 1024 * 1024,
        etag: '"abc123"',
        uploaded: new Date('2025-01-15T00:00:00Z'),
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { rows: '50000' },
      }),
    }

    const app = createTestApp(WORDS_CONFIG, { DATASETS: mockBucket })
    const res = await app.request('/$stats')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.status).toBe('ok')
    expect(body.stats.size).toBe(1024 * 1024)
    expect(body.stats.etag).toBe('"abc123"')
    expect(body.stats.dataset).toBe('words')
  })

  it('returns 404 when file does not exist', async () => {
    const mockBucket = {
      head: async () => null,
    }

    const app = createTestApp(WORDS_CONFIG, { DATASETS: mockBucket })
    const res = await app.request('/$stats')

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.stats.status).toBe('not_found')
  })

  it('handles R2 errors gracefully', async () => {
    const mockBucket = {
      head: async () => {
        throw new Error('R2 service unavailable')
      },
    }

    const app = createTestApp(WORDS_CONFIG, { DATASETS: mockBucket })
    const res = await app.request('/$stats')

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('STATS_ERROR')
    expect(body.error.message).toBe('R2 service unavailable')
  })
})

// =============================================================================
// 5. Root Discovery Route
// =============================================================================

describe('Root Discovery (GET /)', () => {
  it('returns dataset info with discovery links', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json()
    const dataset = body.dataset

    expect(dataset.dataset).toBe('words')
    expect(dataset.description).toBe('English word frequency dataset')
    expect(dataset.primaryKey).toBe('word')
    expect(dataset.source.type).toBe('parquet')
    expect(dataset.source.bucket).toBe('DATASETS')
    expect(dataset.source.key).toBe('words.parquet')
    expect(dataset.fields.word).toBe('string')
    expect(dataset.fields.frequency).toBe('number')
    expect(dataset.pagination.defaultPageSize).toBe(50)
    expect(dataset.pagination.maxPageSize).toBe(500)
  })

  it('includes filterable, sortable, and indexed lists', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('/')
    const body = await res.json()
    const dataset = body.dataset

    expect(dataset.filterable).toContain('word')
    expect(dataset.filterable).toContain('language')
    expect(dataset.sortable).toContain('frequency')
    expect(dataset.indexed).toContain('word')
  })

  it('includes links to schema, manifest, stats, fields', async () => {
    const app = createTestApp(WORDS_CONFIG)
    const res = await app.request('http://localhost/') // need proper URL
    const body = await res.json()

    expect(body.links).toBeDefined()
    expect(body.links.schema).toContain('/schema')
    expect(body.links.manifest).toContain('/manifest')
    expect(body.links.stats).toContain('/$stats')
    expect(body.links.fields).toContain('/$fields')
  })

  it('handles minimal config with defaults', async () => {
    const app = createTestApp(MINIMAL_CONFIG)
    const res = await app.request('/')
    const body = await res.json()
    const dataset = body.dataset

    expect(dataset.dataset).toBe('wiki')
    expect(dataset.primaryKey).toBe('id')
    expect(dataset.pagination.defaultPageSize).toBe(25)
    expect(dataset.pagination.maxPageSize).toBe(100)
    // No filterable/sortable/indexed when fields are empty
    expect(dataset.filterable).toBeUndefined()
    expect(dataset.sortable).toBeUndefined()
    expect(dataset.indexed).toBeUndefined()
  })
})

// =============================================================================
// 6. generateSnippetManifest() — standalone function
// =============================================================================

describe('generateSnippetManifest()', () => {
  it('generates manifest from config', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG)

    expect(manifest.dataset.name).toBe('words')
    expect(manifest.dataset.bucket).toBe('DATASETS')
    expect(manifest.dataset.key).toBe('words.parquet')
    expect(manifest.dataset.primaryKey).toBe('word')
    expect(manifest.dataset.fields).toBeDefined()
    expect(manifest.rules).toHaveLength(1)
    expect(manifest.env.PARQUET_BUCKET).toBe('DATASETS')
    expect(manifest.snippet).toContain('words')
  })

  it('generates correct rule expression without hostname', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG)
    const rule = manifest.rules[0]

    expect(rule.snippet_name).toBe('words_parquet_read')
    expect(rule.expression).toBe('http.request.method == "GET"')
    expect(rule.enabled).toBe(true)
    expect(rule.description).toContain('words')
  })

  it('includes hostname in rule expression when provided', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG, {
      hostname: 'words.org.ai',
    })
    const rule = manifest.rules[0]

    expect(rule.expression).toContain('http.host == "words.org.ai"')
    expect(rule.expression).toContain('http.request.method == "GET"')
  })

  it('includes basePath in rule expression', () => {
    const configWithPath: ParquetSourceConfig = {
      ...WORDS_CONFIG,
      basePath: '/api/v1/words',
    }

    const manifest = generateSnippetManifest(configWithPath)
    const rule = manifest.rules[0]

    expect(rule.expression).toContain('/api/v1/words')
  })

  it('uses custom snippet prefix', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG, {
      snippetPrefix: 'orgai',
    })

    expect(manifest.rules[0].snippet_name).toBe('orgai_parquet_read')
  })

  it('derives dataset name from key when name not provided', () => {
    const manifest = generateSnippetManifest(MINIMAL_CONFIG)

    expect(manifest.dataset.name).toBe('wiki')
    expect(manifest.rules[0].snippet_name).toBe('wiki_parquet_read')
  })

  it('generates snippet source with correct constants', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG)
    const snippet = manifest.snippet

    expect(snippet).toContain("const DATASET = 'words'")
    expect(snippet).toContain("const BUCKET = 'DATASETS'")
    expect(snippet).toContain("const KEY = 'words.parquet'")
    expect(snippet).toContain("const PRIMARY_KEY = 'word'")
    expect(snippet).toContain('const CACHE_TTL = 120')
    expect(snippet).toContain('const SEARCH_CACHE_TTL = 60')
    expect(snippet).toContain('"word"')
    expect(snippet).toContain('"language"')
  })

  it('generates snippet with filterable/sortable/indexed sets', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG)
    const snippet = manifest.snippet

    // Filterable fields
    expect(snippet).toContain('FILTERABLE')
    expect(snippet).toContain('"word"')
    expect(snippet).toContain('"language"')
    expect(snippet).toContain('"partOfSpeech"')
    expect(snippet).toContain('"isCommon"')

    // Sortable fields
    expect(snippet).toContain('SORTABLE')
    expect(snippet).toContain('"frequency"')

    // Indexed fields
    expect(snippet).toContain('INDEXED')
  })

  it('includes predicate pushdown in snippet source', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG)
    const snippet = manifest.snippet

    expect(snippet).toContain('X-Parquet-Predicates')
    expect(snippet).toContain('X-Parquet-Dataset')
    expect(snippet).toContain('X-Parquet-Bucket')
    expect(snippet).toContain('X-Parquet-Key')
  })

  it('includes cache logic in snippet source', () => {
    const manifest = generateSnippetManifest(WORDS_CONFIG)
    const snippet = manifest.snippet

    expect(snippet).toContain('caches.default')
    expect(snippet).toContain('X-Cache')
    expect(snippet).toContain('HIT')
    expect(snippet).toContain('X-Dataset')
  })

  it('uses default values for minimal config', () => {
    const manifest = generateSnippetManifest(MINIMAL_CONFIG)

    expect(manifest.env.PARQUET_PRIMARY_KEY).toBe('id')
    expect(manifest.env.PARQUET_CACHE_TTL).toBe('60')
    expect(manifest.env.PARQUET_SEARCH_CACHE_TTL).toBe('30')
    expect(manifest.env.PARQUET_PAGE_SIZE).toBe('25')
    expect(manifest.env.PARQUET_MAX_PAGE_SIZE).toBe('100')
    // No filterable/sortable/indexed env vars when no fields defined
    expect(manifest.env.PARQUET_FILTERABLE_FIELDS).toBeUndefined()
    expect(manifest.env.PARQUET_SORTABLE_FIELDS).toBeUndefined()
    expect(manifest.env.PARQUET_INDEXED_FIELDS).toBeUndefined()
  })
})

// =============================================================================
// 7. Field Type Handling
// =============================================================================

describe('Field Type Handling', () => {
  it('maps date type to string with format', async () => {
    const config: ParquetSourceConfig = {
      type: 'parquet',
      bucket: 'BUCKET',
      key: 'events.parquet',
      fields: {
        timestamp: { type: 'date', description: 'Event timestamp' },
      },
    }

    const app = createTestApp(config)
    const res = await app.request('/schema')
    const body = await res.json()

    expect(body.schema.properties.timestamp.type).toBe('string')
    expect(body.schema.properties.timestamp.format).toBe('date-time')
  })

  it('maps json type to object', async () => {
    const config: ParquetSourceConfig = {
      type: 'parquet',
      bucket: 'BUCKET',
      key: 'entities.parquet',
      fields: {
        metadata: { type: 'json', description: 'Metadata blob' },
      },
    }

    const app = createTestApp(config)
    const res = await app.request('/schema')
    const body = await res.json()

    expect(body.schema.properties.metadata.type).toBe('object')
  })
})

// =============================================================================
// 8. Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('derives name from nested key path', () => {
    const config: ParquetSourceConfig = {
      type: 'parquet',
      bucket: 'BUCKET',
      key: 'data/processed/industries.parquet',
    }

    const manifest = generateSnippetManifest(config)
    expect(manifest.dataset.name).toBe('industries')
  })

  it('handles key without .parquet extension', () => {
    const config: ParquetSourceConfig = {
      type: 'parquet',
      bucket: 'BUCKET',
      key: 'places',
    }

    const manifest = generateSnippetManifest(config)
    expect(manifest.dataset.name).toBe('places')
  })

  it('handles all field types in schema generation', async () => {
    const config: ParquetSourceConfig = {
      type: 'parquet',
      bucket: 'BUCKET',
      key: 'test.parquet',
      fields: {
        str: { type: 'string' },
        num: { type: 'number' },
        bool: { type: 'boolean' },
        dt: { type: 'date' },
        obj: { type: 'json' },
      },
    }

    const app = createTestApp(config)
    const res = await app.request('/schema')
    const body = await res.json()
    const props = body.schema.properties

    expect(props.str.type).toBe('string')
    expect(props.num.type).toBe('number')
    expect(props.bool.type).toBe('boolean')
    expect(props.dt.type).toBe('string')
    expect(props.dt.format).toBe('date-time')
    expect(props.obj.type).toBe('object')
  })

  it('combines hostname and basePath in rule expression', () => {
    const config: ParquetSourceConfig = {
      ...WORDS_CONFIG,
      basePath: '/v2/data',
    }

    const manifest = generateSnippetManifest(config, {
      hostname: 'api.example.com',
    })
    const expr = manifest.rules[0].expression

    expect(expr).toContain('http.request.method == "GET"')
    expect(expr).toContain('http.host == "api.example.com"')
    expect(expr).toContain('/v2/data')
  })
})
