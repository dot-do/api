/**
 * wiktionary.example.com.ai - Wiktionary Dictionary at the Edge
 *
 * Full dictionary powered by PGLite WASM + Cloudflare Durable Objects.
 * Data streamed from kaikki.org (no local downloads).
 *
 * Features:
 * - Streaming seed from remote source (chunked inserts, memory-safe)
 * - Full-text search with PostgreSQL GIN indexes
 * - Words, definitions, etymology, pronunciations
 * - Eager-but-non-blocking WASM loading
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'
import { PGliteLocal } from './src/pglite-local'

// Static WASM imports - Wrangler pre-compiles these
// @ts-ignore
import pgliteWasm from './src/pglite-assets/pglite.wasm'
// @ts-ignore
import pgliteData from './src/pglite-assets/pglite.data'

// =============================================================================
// Module-Level Instance Tracking
// =============================================================================

let MODULE_LOAD_TIME: number | null = null
const MODULE_INSTANCE_ID = Math.random().toString(36).slice(2, 10)

function getModuleLoadTime(): number {
  if (MODULE_LOAD_TIME === null) {
    MODULE_LOAD_TIME = Date.now()
  }
  return MODULE_LOAD_TIME
}

let moduleRequestCount = 0

// =============================================================================
// Module-Level WASM Hoisting (survives DO class reinstantiation)
// =============================================================================

let hoistedPglite: PGliteLocal | null = null
let hoistedPglitePromise: Promise<PGliteLocal> | null = null
let wasmLoadStartedAt: number | null = null
let wasmLoadedAt: number | null = null

function isWasmLoading(): boolean {
  return hoistedPglitePromise !== null && hoistedPglite === null
}

function startWasmLoadingInBackground(): void {
  if (hoistedPglite || hoistedPglitePromise) return

  wasmLoadStartedAt = Date.now()
  console.log(`[wiktionary] Starting WASM load in background - module: ${MODULE_INSTANCE_ID}`)

  hoistedPglitePromise = PGliteLocal.create({
    wasmModule: pgliteWasm,
    fsBundle: pgliteData,
  }).then((pg) => {
    hoistedPglite = pg
    wasmLoadedAt = Date.now()
    const loadDuration = wasmLoadedAt - (wasmLoadStartedAt ?? wasmLoadedAt)
    console.log(`[wiktionary] WASM LOADED - took ${loadDuration}ms, module: ${MODULE_INSTANCE_ID}`)
    return pg
  }).catch((err) => {
    console.error(`[wiktionary] WASM load failed:`, err)
    hoistedPglitePromise = null
    throw err
  })
}

async function getOrAwaitHoistedPglite(): Promise<PGliteLocal> {
  if (hoistedPglite) return hoistedPglite
  if (hoistedPglitePromise) return hoistedPglitePromise

  startWasmLoadingInBackground()
  return hoistedPglitePromise!
}

// =============================================================================
// Types
// =============================================================================

interface Env {
  WIKTIONARY: DurableObjectNamespace<Wiktionary>
}

interface Word {
  id: number
  word: string
  pos: string
  definitions: unknown
  etymology: string | null
  pronunciations: unknown
  created_at: string
}

interface QueryResult<T = Record<string, unknown>> {
  data: T
  queryMs: number
  doColo: string
}

interface Timing {
  workerColo: string
  doColo: string
  queryMs: number
  rpcMs: number
  totalMs: number
}

interface SeedProgress {
  isSeeding: boolean
  startedAt: string | null
  totalWords: number
  lastBatchAt: string | null
  error: string | null
}

// Kaikki.org word entry format
interface KaikkiWord {
  word: string
  pos?: string
  senses?: Array<{
    glosses?: string[]
    raw_glosses?: string[]
  }>
  etymology_text?: string
  sounds?: Array<{
    ipa?: string
    audio?: string
  }>
}

// Helper to escape SQL strings
const esc = (s: string | null | undefined): string => {
  if (s === null || s === undefined) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

const escJson = (obj: unknown): string => {
  if (obj === null || obj === undefined) return 'NULL'
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`
}

// =============================================================================
// Wiktionary Durable Object
// =============================================================================

export class Wiktionary extends DurableObject {
  private pglite: PGliteLocal | null = null
  private initPromise: Promise<void> | null = null
  private sqlStorage: SqlStorage
  private colo: string = 'unknown'

  // Instance tracking
  private readonly instanceCreatedAt = Date.now()
  private readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  private instanceRequestCount = 0
  private wasmInitializedAt: number | null = null
  private wasmWaitedMs: number | null = null

  // Seed state
  private seedInProgress = false
  private seedStartedAt: number | null = null
  private seedTotalWords = 0
  private seedLastBatchAt: number | null = null
  private seedError: string | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sqlStorage = ctx.storage.sql
    this.colo = (ctx as unknown as { colo?: string }).colo || 'unknown'
    moduleRequestCount++

    // Start WASM loading in background immediately
    startWasmLoadingInBackground()

    if (hoistedPglitePromise) {
      ctx.waitUntil(hoistedPglitePromise.catch(() => {}))
    }
  }

  /**
   * Initialize PGLite and set up the database schema
   */
  private async init(): Promise<void> {
    if (this.pglite) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      // DO SQLite for seed progress tracking
      this.sqlStorage.exec(`
        CREATE TABLE IF NOT EXISTS __seed_progress (
          id INTEGER PRIMARY KEY,
          is_seeding INTEGER DEFAULT 0,
          started_at TEXT,
          total_words INTEGER DEFAULT 0,
          last_batch_at TEXT,
          error TEXT
        )
      `)

      // Ensure progress row exists
      this.sqlStorage.exec(`
        INSERT OR IGNORE INTO __seed_progress (id, is_seeding, total_words)
        VALUES (1, 0, 0)
      `)

      // Fetch DO colo in parallel with WASM loading
      const coloPromise = fetch('https://workers.cloudflare.com/cf.json')
        .then(r => r.json())
        .then((cf: { colo?: string }) => { this.colo = cf.colo || 'unknown' })
        .catch(() => {})

      // Wait for WASM
      const wasmWasAlreadyLoaded = hoistedPglite !== null
      const waitStart = performance.now()

      const [pglite] = await Promise.all([
        getOrAwaitHoistedPglite(),
        coloPromise,
      ])

      const waitMs = performance.now() - waitStart
      this.pglite = pglite
      this.wasmInitializedAt = Date.now()

      if (!wasmWasAlreadyLoaded && waitMs > 1) {
        this.wasmWaitedMs = Math.round(waitMs * 100) / 100
        console.log(`[Wiktionary DO] Query waited ${this.wasmWaitedMs}ms for WASM to finish loading`)
      }

      console.log(`[Wiktionary DO] WASM ${wasmWasAlreadyLoaded ? 'REUSED' : 'LOADED'} - module age: ${Date.now() - (MODULE_LOAD_TIME ?? Date.now())}ms`)

      // Create schema
      await this.pglite.exec(`
        CREATE TABLE IF NOT EXISTS words (
          id SERIAL PRIMARY KEY,
          word TEXT NOT NULL,
          pos TEXT NOT NULL,
          definitions JSONB,
          etymology TEXT,
          pronunciations JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      // Create indexes for search
      await this.pglite.exec(`
        CREATE INDEX IF NOT EXISTS idx_word ON words (word);
        CREATE INDEX IF NOT EXISTS idx_pos ON words (pos);
        CREATE INDEX IF NOT EXISTS idx_word_lower ON words (LOWER(word));
      `)

      this.log('Schema initialized')
    })()

    return this.initPromise
  }

  private log(...args: unknown[]): void {
    console.log('[Wiktionary DO]', ...args)
  }

  // ============================================================================
  // RPC Methods
  // ============================================================================

  async query(sql: string): Promise<QueryResult> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query(sql)
    return {
      data: { rows: result.rows, rowCount: result.rows.length },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  async getWords(limit = 50, offset = 0): Promise<QueryResult<{ words: Word[]; total: number }>> {
    await this.init()
    const start = performance.now()

    const [countResult, wordsResult] = await Promise.all([
      this.pglite!.query<{ count: number }>('SELECT COUNT(*)::int as count FROM words'),
      this.pglite!.query<Word>(`SELECT * FROM words ORDER BY word LIMIT ${limit} OFFSET ${offset}`)
    ])

    return {
      data: {
        words: wordsResult.rows,
        total: countResult.rows[0]?.count ?? 0,
      },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  async getWord(word: string): Promise<QueryResult<Word[] | { error: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<Word>(`SELECT * FROM words WHERE word = ${esc(word)}`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100

    if (result.rows.length === 0) {
      return { data: { error: 'Word not found' }, queryMs, doColo: this.colo }
    }

    return { data: result.rows, queryMs, doColo: this.colo }
  }

  async search(query: string, limit = 20): Promise<QueryResult<{ words: Word[] }>> {
    await this.init()
    const start = performance.now()

    // Simple pattern search (ILIKE) - full-text search may not be available in WASM build
    const result = await this.pglite!.query<Word>(`
      SELECT *
      FROM words
      WHERE word ILIKE ${esc(`%${query}%`)}
         OR etymology ILIKE ${esc(`%${query}%`)}
      ORDER BY
        CASE WHEN word = ${esc(query)} THEN 1
             WHEN word ILIKE ${esc(`${query}%`)} THEN 2
             ELSE 3
        END,
        word
      LIMIT ${limit}
    `)

    return {
      data: { words: result.rows },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  async getStats(): Promise<QueryResult<{
    totalWords: number
    uniqueWords: number
    partsOfSpeech: Array<{ pos: string; count: number }>
  }>> {
    await this.init()
    const start = performance.now()

    const [totalResult, uniqueResult, posResult] = await Promise.all([
      this.pglite!.query<{ count: number }>('SELECT COUNT(*)::int as count FROM words'),
      this.pglite!.query<{ count: number }>('SELECT COUNT(DISTINCT word)::int as count FROM words'),
      this.pglite!.query<{ pos: string; count: number }>(`
        SELECT pos, COUNT(*)::int as count
        FROM words
        GROUP BY pos
        ORDER BY count DESC
        LIMIT 10
      `)
    ])

    return {
      data: {
        totalWords: totalResult.rows[0]?.count ?? 0,
        uniqueWords: uniqueResult.rows[0]?.count ?? 0,
        partsOfSpeech: posResult.rows,
      },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  async getVersion(): Promise<QueryResult<{ version: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<{ version: string }>('SELECT version()')
    return {
      data: result.rows[0],
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  getColo(): string {
    return this.colo
  }

  ping(): {
    ok: boolean
    wasmLoaded: boolean
    wasmLoading: boolean
    doColo: string
    moduleId: string
  } {
    return {
      ok: true,
      wasmLoaded: hoistedPglite !== null,
      wasmLoading: isWasmLoading(),
      doColo: this.colo,
      moduleId: MODULE_INSTANCE_ID,
    }
  }

  getDebugInfo(): {
    module: { id: string; loadedAt: string; ageMs: number; requestCount: number }
    instance: { id: string; createdAt: string; ageMs: number; requestCount: number }
    wasm: {
      loaded: boolean
      loading: boolean
      loadStartedAt: string | null
      loadedAt: string | null
      loadDurationMs: number | null
      timeSinceLoadMs: number | null
    }
    doColo: string
  } {
    this.instanceRequestCount++
    const now = Date.now()
    const moduleLoadTime = getModuleLoadTime()
    return {
      module: {
        id: MODULE_INSTANCE_ID,
        loadedAt: new Date(moduleLoadTime).toISOString(),
        ageMs: now - moduleLoadTime,
        requestCount: moduleRequestCount,
      },
      instance: {
        id: this.instanceId,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        ageMs: now - this.instanceCreatedAt,
        requestCount: this.instanceRequestCount,
      },
      wasm: {
        loaded: hoistedPglite !== null,
        loading: isWasmLoading(),
        loadStartedAt: wasmLoadStartedAt ? new Date(wasmLoadStartedAt).toISOString() : null,
        loadedAt: wasmLoadedAt ? new Date(wasmLoadedAt).toISOString() : null,
        loadDurationMs: wasmLoadStartedAt && wasmLoadedAt ? wasmLoadedAt - wasmLoadStartedAt : null,
        timeSinceLoadMs: wasmLoadedAt !== null ? now - wasmLoadedAt : null,
      },
      doColo: this.colo,
    }
  }

  // ============================================================================
  // Seed Methods - Stream from remote source
  // ============================================================================

  /**
   * Get current seed progress
   */
  getSeedStatus(): SeedProgress {
    const row = this.sqlStorage.exec('SELECT * FROM __seed_progress WHERE id = 1').one()

    if (!row) {
      return {
        isSeeding: false,
        startedAt: null,
        totalWords: 0,
        lastBatchAt: null,
        error: null,
      }
    }

    return {
      isSeeding: row.is_seeding === 1,
      startedAt: row.started_at as string | null,
      totalWords: row.total_words as number,
      lastBatchAt: row.last_batch_at as string | null,
      error: row.error as string | null,
    }
  }

  /**
   * Start seeding from remote source (streaming, chunked inserts)
   */
  async startSeed(language = 'English', batchSize = 100, maxWords = 0): Promise<{ started: boolean; message: string }> {
    await this.init()

    // Check if already seeding
    const status = this.getSeedStatus()
    if (status.isSeeding) {
      return {
        started: false,
        message: `Seeding already in progress since ${status.startedAt}`,
      }
    }

    // Check if already seeded
    const countResult = await this.pglite!.query<{ count: number }>('SELECT COUNT(*)::int as count FROM words')
    if (countResult.rows[0].count > 0) {
      return {
        started: false,
        message: `Database already contains ${countResult.rows[0].count} words. Clear first if needed.`,
      }
    }

    // Start background seeding (don't wait for completion)
    this.ctx.waitUntil(this.runSeedInBackground(language, batchSize, maxWords))

    return {
      started: true,
      message: `Seeding started for ${language}${maxWords > 0 ? ` (max ${maxWords} words)` : ''}. Check /seed/status for progress.`,
    }
  }

  /**
   * Run the seed process in background
   */
  private async runSeedInBackground(language: string, batchSize: number, maxWords: number): Promise<void> {
    const now = new Date().toISOString()

    // Mark as seeding
    this.sqlStorage.exec(
      'UPDATE __seed_progress SET is_seeding = 1, started_at = ?, total_words = 0, error = NULL WHERE id = 1',
      now
    )
    this.seedInProgress = true
    this.seedStartedAt = Date.now()
    this.seedTotalWords = 0
    this.seedError = null

    try {
      const url = `https://kaikki.org/dictionary/${language}/kaikki.org-dictionary-${language}.jsonl`
      this.log(`Fetching dictionary from ${url}${maxWords > 0 ? ` (max ${maxWords} words)` : ''}`)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Stream and parse NDJSON (newline-delimited JSON)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let batch: KaikkiWord[] = []
      let totalProcessed = 0

      while (true) {
        const { done, value } = await reader.read()

        if (value) {
          buffer += decoder.decode(value, { stream: true })

          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines[lines.length - 1] // Keep incomplete line

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            // Check if we've reached maxWords limit
            if (maxWords > 0 && totalProcessed >= maxWords) {
              this.log(`Reached max words limit: ${maxWords}`)
              break
            }

            try {
              const entry = JSON.parse(line) as KaikkiWord
              batch.push(entry)

              // Insert batch when it reaches batchSize
              if (batch.length >= batchSize) {
                await this.insertBatch(batch)
                totalProcessed += batch.length
                this.seedTotalWords = totalProcessed
                this.seedLastBatchAt = Date.now()

                // Update progress in DO SQLite
                this.sqlStorage.exec(
                  'UPDATE __seed_progress SET total_words = ?, last_batch_at = ? WHERE id = 1',
                  totalProcessed,
                  new Date().toISOString()
                )

                this.log(`Processed ${totalProcessed} words...`)
                batch = []

                // Check again after inserting batch
                if (maxWords > 0 && totalProcessed >= maxWords) {
                  break
                }
              }
            } catch (err) {
              this.log('Failed to parse line:', err)
              // Continue with next line
            }
          }

          // Break outer loop if limit reached
          if (maxWords > 0 && totalProcessed >= maxWords) {
            break
          }
        }

        if (done) {
          // Insert remaining batch
          if (batch.length > 0) {
            await this.insertBatch(batch)
            totalProcessed += batch.length
            this.seedTotalWords = totalProcessed
          }
          break
        }
      }

      // Mark as complete
      this.sqlStorage.exec(
        'UPDATE __seed_progress SET is_seeding = 0, total_words = ?, last_batch_at = ? WHERE id = 1',
        totalProcessed,
        new Date().toISOString()
      )
      this.seedInProgress = false
      this.log(`Seeding complete: ${totalProcessed} words`)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.seedError = errorMsg
      this.sqlStorage.exec('UPDATE __seed_progress SET is_seeding = 0, error = ? WHERE id = 1', errorMsg)
      this.seedInProgress = false
      this.log('Seed error:', errorMsg)
      throw error
    }
  }

  /**
   * Insert a batch of words using a single multi-value INSERT
   */
  private async insertBatch(batch: KaikkiWord[]): Promise<void> {
    if (batch.length === 0) return

    // Build multi-value INSERT
    const values = batch.map(entry => {
      const word = entry.word || 'unknown'
      const pos = entry.pos || 'unknown'

      // Extract definitions from senses
      const definitions = entry.senses?.map(sense =>
        sense.glosses || sense.raw_glosses || []
      ).flat() || []

      const etymology = entry.etymology_text || null

      // Extract pronunciations
      const pronunciations = entry.sounds?.map(sound => ({
        ...(sound.ipa && { ipa: sound.ipa }),
        ...(sound.audio && { audio: sound.audio }),
      })) || []

      return `(
        ${esc(word)},
        ${esc(pos)},
        ${escJson(definitions)},
        ${esc(etymology)},
        ${escJson(pronunciations)}
      )`
    }).join(',\n')

    const sql = `
      INSERT INTO words (word, pos, definitions, etymology, pronunciations)
      VALUES ${values}
    `

    await this.pglite!.exec(sql)
  }

  /**
   * Clear all dictionary data
   */
  async clearData(): Promise<QueryResult<{ deleted: number }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<{ count: number }>('DELETE FROM words RETURNING 1')

    // Reset progress
    this.sqlStorage.exec('UPDATE __seed_progress SET total_words = 0, error = NULL WHERE id = 1')

    return {
      data: { deleted: result.affectedRows },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /**
   * Run benchmark queries
   */
  async runBenchmark(): Promise<QueryResult<{
    queries: Array<{ name: string; ms: number; rows: number }>
    totalMs: number
  }>> {
    await this.init()
    const benchStart = performance.now()
    const queries: Array<{ name: string; ms: number; rows: number }> = []

    // Benchmark 1: Simple word lookup
    let start = performance.now()
    let result = await this.pglite!.query(`SELECT * FROM words WHERE word = 'test' LIMIT 1`)
    queries.push({
      name: 'Simple lookup (word = test)',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: result.rows.length,
    })

    // Benchmark 2: ILIKE pattern search
    start = performance.now()
    result = await this.pglite!.query(`
      SELECT * FROM words
      WHERE word ILIKE '%lang%'
      LIMIT 10
    `)
    queries.push({
      name: 'ILIKE pattern search',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: result.rows.length,
    })

    // Benchmark 3: JSONB query
    start = performance.now()
    result = await this.pglite!.query(`
      SELECT word, definitions->0 as first_definition
      FROM words
      WHERE jsonb_array_length(definitions) > 0
      LIMIT 10
    `)
    queries.push({
      name: 'JSONB array query',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: result.rows.length,
    })

    // Benchmark 4: Aggregation by POS
    start = performance.now()
    result = await this.pglite!.query(`
      SELECT pos, COUNT(*)::int as count
      FROM words
      GROUP BY pos
      ORDER BY count DESC
    `)
    queries.push({
      name: 'GROUP BY aggregation',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: result.rows.length,
    })

    // Benchmark 5: LIKE pattern match
    start = performance.now()
    result = await this.pglite!.query(`
      SELECT * FROM words WHERE word LIKE 'dict%' LIMIT 10
    `)
    queries.push({
      name: 'LIKE pattern match',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: result.rows.length,
    })

    return {
      data: {
        queries,
        totalMs: Math.round((performance.now() - benchStart) * 100) / 100,
      },
      queryMs: Math.round((performance.now() - benchStart) * 100) / 100,
      doColo: this.colo,
    }
  }
}

// =============================================================================
// Router
// =============================================================================

const router = AutoRouter()

const db = (env: Env) => env.WIKTIONARY.get(env.WIKTIONARY.idFromName('default'))

const withTiming = <T>(
  workerColo: string,
  result: QueryResult<T>,
  rpcMs: number,
  totalMs: number,
  status = 200
): Response => {
  const timing: Timing = {
    workerColo,
    doColo: result.doColo,
    queryMs: result.queryMs,
    rpcMs: Math.round(rpcMs * 100) / 100,
    totalMs: Math.round(totalMs * 100) / 100,
  }
  const body = {
    ...result.data as object,
    timing,
  }
  return Response.json(body, { status })
}

const getColo = (req: Request): string => {
  const cf = (req as unknown as { cf?: { colo?: string } }).cf
  return cf?.colo || 'unknown'
}

// API Info
router.get('/', (req) => {
  const base = new URL(req.url).origin
  const workerColo = getColo(req)

  return {
    name: 'wiktionary.example.com.ai',
    description: 'Wiktionary Dictionary at the Edge - Full dictionary with PGLite WASM + Durable Objects',
    workerColo,
    dataSource: 'kaikki.org dictionary dumps (streamed, not downloaded locally)',
    links: {
      'Health Check': `${base}/ping (instant, no WASM wait)`,
      'Debug': `${base}/debug (lifecycle info)`,
      'List Words': `${base}/words (paginated)`,
      'Get Word': `${base}/words/:word (e.g., /words/dictionary)`,
      'Search': `${base}/search?q=term (full-text search)`,
      'Statistics': `${base}/stats`,
      'PostgreSQL Version': `${base}/version`,
      'Start Seed': `${base}/seed (POST to start streaming seed)`,
      'Seed Status': `${base}/seed/status`,
      'Clear Data': `${base}/clear (POST to clear all words)`,
      'Benchmark': `${base}/benchmark (POST to run benchmark queries)`,
      'Raw Query': `${base}/query (POST with {"sql": "SELECT ..."})`,
    },
    timing: {
      note: 'All endpoints return detailed timing info via DO RPC',
      fields: {
        workerColo: 'Cloudflare datacenter running the Worker',
        doColo: 'Cloudflare datacenter running the Durable Object',
        queryMs: 'PostgreSQL query execution time (ms)',
        rpcMs: 'Worker to DO RPC call time (ms)',
        totalMs: 'Total request latency (ms)',
      },
    },
  }
})

// Health check - instant response
router.get('/ping', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).ping()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...result,
    timing: {
      workerColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
  })
})

// Debug info - instant response
router.get('/debug', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const debugInfo = await db(env).getDebugInfo()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...debugInfo,
    timing: {
      workerColo,
      doColo: debugInfo.doColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
  })
})

// PostgreSQL version
router.get('/version', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getVersion()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// List words with pagination
router.get('/words', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const rpcStart = performance.now()
  const result = await db(env).getWords(limit, offset)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Get word by name
router.get('/words/:word', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const word = decodeURIComponent(req.params.word)

  const rpcStart = performance.now()
  const result = await db(env).getWord(word)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 404 : 200)
})

// Full-text search
router.get('/search', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const url = new URL(req.url)
  const query = url.searchParams.get('q')
  const limit = parseInt(url.searchParams.get('limit') || '20')

  if (!query) {
    return Response.json({ error: 'Query parameter "q" required' }, { status: 400 })
  }

  const rpcStart = performance.now()
  const result = await db(env).search(query, limit)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Statistics
router.get('/stats', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getStats()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Start seed (POST)
router.post('/seed', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  let language = 'English'
  let batchSize = 100
  let maxWords = 0

  try {
    const body = await req.json() as { language?: string; batchSize?: number; maxWords?: number }
    language = body.language || language
    batchSize = body.batchSize || batchSize
    maxWords = body.maxWords || maxWords
  } catch {
    // Use defaults
  }

  const rpcStart = performance.now()
  const result = await db(env).startSeed(language, batchSize, maxWords)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...result,
    timing: {
      workerColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
  })
})

// Seed status (instant - reads from DO SQLite)
router.get('/seed/status', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const status = await db(env).getSeedStatus()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...status,
    timing: {
      workerColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
  })
})

// Clear data (POST)
router.post('/clear', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).clearData()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Benchmark (POST)
router.post('/benchmark', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).runBenchmark()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Raw query (POST)
router.post('/query', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { sql } = await req.json() as { sql: string }

  try {
    const rpcStart = performance.now()
    const result = await db(env).query(sql)
    const rpcMs = performance.now() - rpcStart
    const totalMs = performance.now() - requestStart

    return withTiming(workerColo, result, rpcMs, totalMs)
  } catch (error) {
    const totalMs = performance.now() - requestStart
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        workerColo,
        doColo: 'unknown',
        queryMs: 0,
        rpcMs: 0,
        totalMs: Math.round(totalMs * 100) / 100,
      },
    }, { status: 500 })
  }
})

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.fetch(request, env, ctx)
  },
}
