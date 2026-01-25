/**
 * wiktionary.example.com.ai - Wiktionary Dictionary at the Edge
 *
 * Full dictionary powered by Cloudflare Durable Objects.
 * Data streamed from kaikki.org (no local downloads).
 *
 * Storage Strategy:
 * - Primary storage: DO SQLite (persists across DO resets)
 * - Optional: PGLite WASM for complex PostgreSQL queries
 *
 * Features:
 * - Streaming seed from remote source (chunked inserts, memory-safe)
 * - Full-text search with SQLite FTS5
 * - Words, definitions, etymology, pronunciations
 * - Resumable seeding with byte offset tracking
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
  bytesProcessed: number
  estimatedTotalBytes: number
  progressPercent: number
  wordsPerSecond: number
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
  private seedBytesProcessed = 0
  private seedEstimatedTotalBytes = 0

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
          error TEXT,
          bytes_processed INTEGER DEFAULT 0,
          estimated_total_bytes INTEGER DEFAULT 0
        )
      `)

      // Ensure progress row exists
      const progressExists = this.sqlStorage.exec('SELECT COUNT(*) as count FROM __seed_progress').one()
      if (!progressExists || (progressExists.count as number) === 0) {
        this.sqlStorage.exec(`
          INSERT INTO __seed_progress (id, is_seeding, total_words, bytes_processed, estimated_total_bytes)
          VALUES (1, 0, 0, 0, 0)
        `)
      }

      // DO SQLite for words (persistent storage)
      this.sqlStorage.exec(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL,
          pos TEXT NOT NULL,
          definitions TEXT,
          etymology TEXT,
          pronunciations TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes for search
      this.sqlStorage.exec(`CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)`)
      this.sqlStorage.exec(`CREATE INDEX IF NOT EXISTS idx_words_pos ON words(pos)`)

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

  async getWords(limit = 50, offset = 0): Promise<QueryResult<{ words: Word[]; total: number }> | { autoSeeding: true }> {
    await this.init()
    const start = performance.now()

    // Use DO SQLite for persistent storage
    const countRow = this.sqlStorage.exec('SELECT COUNT(*) as count FROM words').one()
    const total = (countRow?.count as number) ?? 0

    // Auto-seed if database is empty
    if (total === 0) {
      this.ctx.waitUntil(this.runSeedInBackground('English', 500, 5000))
      return { autoSeeding: true }
    }

    const wordsRows = this.sqlStorage.exec(
      'SELECT * FROM words ORDER BY word LIMIT ? OFFSET ?',
      limit, offset
    ).toArray()

    const words = wordsRows.map(row => ({
      id: row.id as number,
      word: row.word as string,
      pos: row.pos as string,
      definitions: row.definitions ? JSON.parse(row.definitions as string) : [],
      etymology: row.etymology as string | null,
      pronunciations: row.pronunciations ? JSON.parse(row.pronunciations as string) : [],
      created_at: row.created_at as string,
    }))

    return {
      data: {
        words,
        total,
      },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  async getWord(word: string): Promise<QueryResult<Word[] | { error: string }>> {
    await this.init()
    const start = performance.now()

    // Use DO SQLite
    const rows = this.sqlStorage.exec('SELECT * FROM words WHERE word = ?', word).toArray()
    const queryMs = Math.round((performance.now() - start) * 100) / 100

    if (rows.length === 0) {
      return { data: { error: 'Word not found' }, queryMs, doColo: this.colo }
    }

    const words = rows.map(row => ({
      id: row.id as number,
      word: row.word as string,
      pos: row.pos as string,
      definitions: row.definitions ? JSON.parse(row.definitions as string) : [],
      etymology: row.etymology as string | null,
      pronunciations: row.pronunciations ? JSON.parse(row.pronunciations as string) : [],
      created_at: row.created_at as string,
    }))

    return { data: words, queryMs, doColo: this.colo }
  }

  async search(query: string, limit = 20): Promise<QueryResult<{ words: Word[] }> | { autoSeeding: true }> {
    await this.init()
    const start = performance.now()

    // Check if database is empty
    const countRow = this.sqlStorage.exec('SELECT COUNT(*) as count FROM words').one()
    const total = (countRow?.count as number) ?? 0

    // Auto-seed if database is empty
    if (total === 0) {
      this.ctx.waitUntil(this.runSeedInBackground('English', 500, 5000))
      return { autoSeeding: true }
    }

    // SQLite LIKE search (case-insensitive with LOWER)
    const searchPattern = `%${query}%`
    const rows = this.sqlStorage.exec(`
      SELECT *
      FROM words
      WHERE word LIKE ? COLLATE NOCASE
         OR etymology LIKE ? COLLATE NOCASE
      ORDER BY
        CASE WHEN word = ? THEN 1
             WHEN word LIKE ? COLLATE NOCASE THEN 2
             ELSE 3
        END,
        word
      LIMIT ?
    `, searchPattern, searchPattern, query, `${query}%`, limit).toArray()

    const words = rows.map(row => ({
      id: row.id as number,
      word: row.word as string,
      pos: row.pos as string,
      definitions: row.definitions ? JSON.parse(row.definitions as string) : [],
      etymology: row.etymology as string | null,
      pronunciations: row.pronunciations ? JSON.parse(row.pronunciations as string) : [],
      created_at: row.created_at as string,
    }))

    return {
      data: { words },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  async getStats(): Promise<QueryResult<{
    totalWords: number
    uniqueWords: number
    partsOfSpeech: Array<{ pos: string; count: number }>
  }> | { autoSeeding: true }> {
    await this.init()
    const start = performance.now()

    // Use DO SQLite
    const totalRow = this.sqlStorage.exec('SELECT COUNT(*) as count FROM words').one()
    const totalWords = (totalRow?.count as number) ?? 0

    // Auto-seed if database is empty
    if (totalWords === 0) {
      this.ctx.waitUntil(this.runSeedInBackground('English', 500, 5000))
      return { autoSeeding: true }
    }

    const uniqueRow = this.sqlStorage.exec('SELECT COUNT(DISTINCT word) as count FROM words').one()
    const posRows = this.sqlStorage.exec(`
      SELECT pos, COUNT(*) as count
      FROM words
      GROUP BY pos
      ORDER BY count DESC
      LIMIT 10
    `).toArray()

    return {
      data: {
        totalWords,
        uniqueWords: (uniqueRow?.count as number) ?? 0,
        partsOfSpeech: posRows.map(row => ({
          pos: row.pos as string,
          count: row.count as number,
        })),
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
        bytesProcessed: 0,
        estimatedTotalBytes: 0,
        progressPercent: 0,
        wordsPerSecond: 0,
      }
    }

    const startedAt = row.started_at as string | null
    const totalWords = row.total_words as number
    const bytesProcessed = (row.bytes_processed as number) || 0
    const estimatedTotalBytes = (row.estimated_total_bytes as number) || 0

    // Calculate progress percentage
    const progressPercent = estimatedTotalBytes > 0
      ? Math.round((bytesProcessed / estimatedTotalBytes) * 100 * 10) / 10
      : 0

    // Calculate words per second
    let wordsPerSecond = 0
    if (startedAt && row.is_seeding === 1) {
      const elapsedSec = (Date.now() - new Date(startedAt).getTime()) / 1000
      if (elapsedSec > 0) {
        wordsPerSecond = Math.round(totalWords / elapsedSec)
      }
    }

    return {
      isSeeding: row.is_seeding === 1,
      startedAt,
      totalWords,
      lastBatchAt: row.last_batch_at as string | null,
      error: row.error as string | null,
      bytesProcessed,
      estimatedTotalBytes,
      progressPercent,
      wordsPerSecond,
    }
  }

  /**
   * Start seeding from remote source (streaming, chunked inserts)
   * @param language - Language to seed (default: English)
   * @param batchSize - Number of words per INSERT batch (default: 250 for performance)
   * @param maxWords - Maximum words to seed, 0 = unlimited (default: 0 for FULL dictionary)
   */
  async startSeed(language = 'English', batchSize = 250, maxWords = 0): Promise<{ started: boolean; message: string }> {
    await this.init()

    // Check if already seeding
    const status = this.getSeedStatus()
    if (status.isSeeding) {
      return {
        started: false,
        message: `Seeding already in progress since ${status.startedAt}. Progress: ${status.totalWords.toLocaleString()} words, ${status.progressPercent}%`,
      }
    }

    // Check if already seeded (using DO SQLite)
    const countRow = this.sqlStorage.exec('SELECT COUNT(*) as count FROM words').one()
    const count = (countRow?.count as number) ?? 0
    if (count > 0) {
      return {
        started: false,
        message: `Database already contains ${count.toLocaleString()} words. POST to /clear first if you want to reseed.`,
      }
    }

    // Start background seeding (don't wait for completion)
    this.ctx.waitUntil(this.runSeedInBackground(language, batchSize, maxWords))

    return {
      started: true,
      message: `Seeding started for FULL ${language} dictionary (${maxWords > 0 ? `max ${maxWords.toLocaleString()} words` : 'ALL ~1M words'}). Batch size: ${batchSize}. Check /seed/status for progress.`,
    }
  }

  /**
   * Run the seed process - streams and processes as much as possible
   * within a single DO session. For full dictionary, call multiple times
   * and it will continue from where it left off (uses line count tracking).
   */
  private async runSeedInBackground(language: string, batchSize: number, maxWords: number): Promise<void> {
    // Check if already seeding
    const status = this.getSeedStatus()
    if (status.isSeeding) {
      this.log('Seeding already in progress, skipping')
      return
    }

    // Check if database already has words (using DO SQLite)
    const countRow = this.sqlStorage.exec('SELECT COUNT(*) as count FROM words').one()
    if ((countRow?.count as number) > 0) {
      this.log('Database already has words, skipping auto-seed')
      return
    }

    const now = new Date().toISOString()

    // Mark as seeding
    this.sqlStorage.exec(
      'UPDATE __seed_progress SET is_seeding = 1, started_at = ?, total_words = 0, error = NULL, bytes_processed = 0, estimated_total_bytes = 0 WHERE id = 1',
      now
    )
    this.seedInProgress = true
    this.seedStartedAt = Date.now()
    this.seedTotalWords = 0
    this.seedError = null
    this.seedBytesProcessed = 0
    this.seedEstimatedTotalBytes = 0

    try {
      const url = `https://kaikki.org/dictionary/${language}/kaikki.org-dictionary-${language}.jsonl.gz`
      this.log(`Fetching ${language} dictionary from ${url}${maxWords > 0 ? ` (max ${maxWords} words)` : ' (ALL WORDS)'}`)
      this.log(`Streaming gzip decompression, batch size: ${batchSize}`)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Get content length for progress tracking
      const contentLength = parseInt(response.headers.get('content-length') || '0')
      this.seedEstimatedTotalBytes = contentLength
      if (contentLength > 0) {
        this.log(`Compressed file size: ${(contentLength / 1024 / 1024).toFixed(1)} MB`)
        this.sqlStorage.exec('UPDATE __seed_progress SET estimated_total_bytes = ? WHERE id = 1', contentLength)
      }

      // Track compressed bytes
      let compressedBytesRead = 0
      const compressedReader = response.body.getReader()
      const trackedStream = new ReadableStream({
        pull: async (controller) => {
          const { done, value } = await compressedReader.read()
          if (done) {
            controller.close()
            return
          }
          compressedBytesRead += value.length
          this.seedBytesProcessed = compressedBytesRead
          controller.enqueue(value)
        }
      })

      // Decompress
      const decompressed = trackedStream.pipeThrough(new DecompressionStream('gzip'))
      const reader = decompressed.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let batch: KaikkiWord[] = []
      let totalProcessed = 0
      let lastProgressLog = Date.now()
      let parseErrors = 0

      while (true) {
        const { done, value } = await reader.read()

        if (value) {
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines[lines.length - 1]

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            // Check max words limit
            if (maxWords > 0 && totalProcessed >= maxWords) {
              this.log(`Reached max words limit: ${maxWords}`)
              break
            }

            try {
              const entry = JSON.parse(line) as KaikkiWord
              if (entry.word) {
                batch.push(entry)
              }

              if (batch.length >= batchSize) {
                this.insertBatch(batch)
                totalProcessed += batch.length
                this.seedTotalWords = totalProcessed
                this.seedLastBatchAt = Date.now()

                // Update progress in DO SQLite
                this.sqlStorage.exec(
                  'UPDATE __seed_progress SET total_words = ?, last_batch_at = ?, bytes_processed = ? WHERE id = 1',
                  totalProcessed, new Date().toISOString(), compressedBytesRead
                )

                // Log progress every 5 seconds
                if (Date.now() - lastProgressLog > 5000) {
                  const elapsedSec = (Date.now() - this.seedStartedAt!) / 1000
                  const wordsPerSec = Math.round(totalProcessed / elapsedSec)
                  const progressPct = contentLength > 0
                    ? ((compressedBytesRead / contentLength) * 100).toFixed(1)
                    : '?'
                  this.log(`Progress: ${totalProcessed.toLocaleString()} words, ${progressPct}% of file, ${wordsPerSec} words/sec`)
                  lastProgressLog = Date.now()
                }

                batch = []

                if (maxWords > 0 && totalProcessed >= maxWords) {
                  break
                }
              }
            } catch {
              parseErrors++
            }
          }

          if (maxWords > 0 && totalProcessed >= maxWords) {
            break
          }
        }

        if (done) {
          if (batch.length > 0) {
            this.insertBatch(batch)
            totalProcessed += batch.length
            this.seedTotalWords = totalProcessed
          }
          break
        }
      }

      // Mark as complete
      const elapsedSec = (Date.now() - this.seedStartedAt!) / 1000
      const finalWordsPerSec = Math.round(totalProcessed / elapsedSec)
      this.sqlStorage.exec(
        'UPDATE __seed_progress SET is_seeding = 0, total_words = ?, last_batch_at = ?, bytes_processed = ? WHERE id = 1',
        totalProcessed, new Date().toISOString(), compressedBytesRead
      )
      this.seedInProgress = false
      this.log(`Seeding complete: ${totalProcessed.toLocaleString()} words in ${elapsedSec.toFixed(1)}s (${finalWordsPerSec} words/sec), ${parseErrors} parse errors`)

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
   * Manually continue seeding (for compatibility, though not resumable with gzip)
   */
  async runSeedChunk(): Promise<{ complete: boolean; wordsInChunk: number; totalWords: number; error?: string }> {
    return { complete: true, wordsInChunk: 0, totalWords: 0, error: 'Chunked seeding not supported with gzip compression - use full seed instead' }
  }

  /**
   * Handle DO alarm - not currently used for seeding
   */
  async alarm(): Promise<void> {
    this.log('Alarm triggered but no action configured')
  }

  /**
   * Insert a batch of words using DO SQLite
   */
  private insertBatch(batch: KaikkiWord[]): void {
    if (batch.length === 0) return

    // Use a transaction for better performance
    this.sqlStorage.exec('BEGIN TRANSACTION')

    try {
      for (const entry of batch) {
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

        this.sqlStorage.exec(
          'INSERT INTO words (word, pos, definitions, etymology, pronunciations) VALUES (?, ?, ?, ?, ?)',
          word,
          pos,
          JSON.stringify(definitions),
          etymology,
          JSON.stringify(pronunciations)
        )
      }

      this.sqlStorage.exec('COMMIT')
    } catch (error) {
      this.sqlStorage.exec('ROLLBACK')
      throw error
    }
  }

  /**
   * Manually continue seeding - useful if alarms aren't working
   */
  async continueSeed(): Promise<{ complete: boolean; wordsInChunk: number; totalWords: number; error?: string }> {
    const status = this.getSeedStatus()
    if (!status.isSeeding) {
      return { complete: true, wordsInChunk: 0, totalWords: status.totalWords, error: 'Not currently seeding' }
    }
    return await this.runSeedChunk()
  }

  /**
   * Clear all dictionary data
   */
  async clearData(): Promise<QueryResult<{ deleted: number }>> {
    await this.init()
    const start = performance.now()

    // Get count before delete
    const countRow = this.sqlStorage.exec('SELECT COUNT(*) as count FROM words').one()
    const count = (countRow?.count as number) ?? 0

    // Clear DO SQLite
    this.sqlStorage.exec('DELETE FROM words')

    // Reset progress
    this.sqlStorage.exec('UPDATE __seed_progress SET total_words = 0, error = NULL, bytes_processed = 0, is_seeding = 0 WHERE id = 1')

    return {
      data: { deleted: count },
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
    let rows = this.sqlStorage.exec(`SELECT * FROM words WHERE word = 'test' LIMIT 1`).toArray()
    queries.push({
      name: 'Simple lookup (word = test)',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: rows.length,
    })

    // Benchmark 2: LIKE pattern search
    start = performance.now()
    rows = this.sqlStorage.exec(`
      SELECT * FROM words
      WHERE word LIKE '%lang%' COLLATE NOCASE
      LIMIT 10
    `).toArray()
    queries.push({
      name: 'LIKE pattern search',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: rows.length,
    })

    // Benchmark 3: JSON extraction
    start = performance.now()
    rows = this.sqlStorage.exec(`
      SELECT word, json_extract(definitions, '$[0]') as first_definition
      FROM words
      WHERE json_array_length(definitions) > 0
      LIMIT 10
    `).toArray()
    queries.push({
      name: 'JSON extraction',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: rows.length,
    })

    // Benchmark 4: Aggregation by POS
    start = performance.now()
    rows = this.sqlStorage.exec(`
      SELECT pos, COUNT(*) as count
      FROM words
      GROUP BY pos
      ORDER BY count DESC
    `).toArray()
    queries.push({
      name: 'GROUP BY aggregation',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: rows.length,
    })

    // Benchmark 5: LIKE pattern match
    start = performance.now()
    rows = this.sqlStorage.exec(`
      SELECT * FROM words WHERE word LIKE 'dict%' LIMIT 10
    `).toArray()
    queries.push({
      name: 'LIKE prefix match',
      ms: Math.round((performance.now() - start) * 100) / 100,
      rows: rows.length,
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

  return Response.json({
    name: 'wiktionary.example.com.ai',
    description: 'FULL Wiktionary Dictionary at the Edge - ~1M words with PGLite WASM + Durable Objects',
    workerColo,
    dataSource: 'kaikki.org English dictionary (~250MB gzip, ~1.5GB uncompressed, ~1M entries)',
    streaming: 'Streams compressed data with gzip decompression - memory safe for any size',
    autoSeeding: 'Automatically seeds 5000 words when empty. POST to /seed for FULL dictionary.',
    links: {
      'Health Check': `${base}/ping`,
      'Debug': `${base}/debug`,
      'List Words': `${base}/words`,
      'Get Word': `${base}/words/dictionary`,
      'Search': `${base}/search?q=language`,
      'Statistics': `${base}/stats`,
      'PostgreSQL Version': `${base}/version`,
      'Start FULL Seed': `${base}/seed (POST with optional {"batchSize": 250, "maxWords": 0})`,
      'Seed Status': `${base}/seed/status`,
      'Clear Data': `${base}/clear (POST)`,
      'Benchmark': `${base}/benchmark (POST)`,
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
  })
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
router.get('/words', async (req, env: Env, ctx: ExecutionContext) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const rpcStart = performance.now()
  const result = await db(env).getWords(limit, offset)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  // Check if auto-seeding was triggered
  if ('autoSeeding' in result) {
    return Response.json({
      message: 'Database is empty. Auto-seeding 5000 words in the background.',
      checkStatus: `${new URL(req.url).origin}/seed/status`,
      timing: {
        workerColo,
        rpcMs: Math.round(rpcMs * 100) / 100,
        totalMs: Math.round(totalMs * 100) / 100,
      },
    }, { status: 202 })
  }

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
router.get('/search', async (req, env: Env, ctx: ExecutionContext) => {
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

  // Check if auto-seeding was triggered
  if ('autoSeeding' in result) {
    return Response.json({
      message: 'Database is empty. Auto-seeding 5000 words in the background.',
      checkStatus: `${new URL(req.url).origin}/seed/status`,
      timing: {
        workerColo,
        rpcMs: Math.round(rpcMs * 100) / 100,
        totalMs: Math.round(totalMs * 100) / 100,
      },
    }, { status: 202 })
  }

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Statistics
router.get('/stats', async (req, env: Env, ctx: ExecutionContext) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getStats()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  // Check if auto-seeding was triggered
  if ('autoSeeding' in result) {
    return Response.json({
      message: 'Database is empty. Auto-seeding 5000 words in the background.',
      checkStatus: `${new URL(req.url).origin}/seed/status`,
      timing: {
        workerColo,
        rpcMs: Math.round(rpcMs * 100) / 100,
        totalMs: Math.round(totalMs * 100) / 100,
      },
    }, { status: 202 })
  }

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Start seed handler (shared by GET and POST)
const handleSeed = async (req: Request, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const url = new URL(req.url)

  // Defaults for FULL dictionary seed
  let language = 'English'
  let batchSize = 250  // Larger batches for better performance
  let maxWords = 0     // 0 = no limit = FULL dictionary

  // Parse from query params (GET) or body (POST)
  if (req.method === 'GET') {
    language = url.searchParams.get('language') || language
    batchSize = parseInt(url.searchParams.get('batchSize') || '') || batchSize
    maxWords = parseInt(url.searchParams.get('maxWords') || '') || maxWords
  } else {
    try {
      const body = await req.json() as { language?: string; batchSize?: number; maxWords?: number }
      language = body.language || language
      batchSize = body.batchSize || batchSize
      maxWords = body.maxWords ?? maxWords  // Use ?? to allow explicit 0
    } catch {
      // Use defaults
    }
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
}

// Start seed (GET for easy browser trigger)
router.get('/seed', handleSeed)

// Start seed (POST with optional body)
router.post('/seed', handleSeed)

// Seed status (instant - reads from DO SQLite)
router.get('/seed/status', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const status = await db(env).getSeedStatus()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  // Format bytes for display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return Response.json({
    ...status,
    bytesProcessedFormatted: formatBytes(status.bytesProcessed),
    estimatedTotalBytesFormatted: formatBytes(status.estimatedTotalBytes),
    timing: {
      workerColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
  })
})

// Continue seed (POST) - manually trigger next chunk
router.post('/seed/continue', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).continueSeed()
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
