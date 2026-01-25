/**
 * PGLite wrapper for Cloudflare Workers
 * Uses PGliteLocal for proper Workers compatibility
 */

import { PGliteLocal, type QueryResult as PGLocalQueryResult } from './pglite-local'

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'

export interface QueryResult {
  rows: Record<string, unknown>[]
  fields?: Array<{ name: string; dataTypeID: number }>
}

export class PGLiteWrapper {
  private pg: PGliteLocal | null = null
  private ready = false

  static async create(): Promise<PGLiteWrapper> {
    const wrapper = new PGLiteWrapper()
    await wrapper.init()
    return wrapper
  }

  private async init() {
    try {
      // Create PGliteLocal instance with static WASM and data
      this.pg = await PGliteLocal.create({
        wasmModule: pgliteWasm,
        fsBundle: pgliteData,
        debug: false,
      })
      this.ready = true
    } catch (error) {
      console.error('PGLite initialization error:', error)
      throw error
    }
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    if (!this.ready || !this.pg) {
      throw new Error('PGLite not initialized')
    }

    try {
      // PGliteLocal doesn't support parameterized queries yet, so we'll just ignore params
      const result: PGLocalQueryResult<T> = await this.pg.query<T>(sql)
      return { rows: result.rows }
    } catch (error) {
      console.error('Query error:', error, 'SQL:', sql)
      throw error
    }
  }

  async exec(sql: string): Promise<void> {
    if (!this.ready || !this.pg) {
      throw new Error('PGLite not initialized')
    }

    try {
      await this.pg.exec(sql)
    } catch (error) {
      console.error('Exec error:', error, 'SQL:', sql)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.pg && this.ready) {
      await this.pg.close()
      this.ready = false
    }
  }
}
