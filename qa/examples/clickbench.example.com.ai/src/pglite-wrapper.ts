/**
 * Simple PGLite wrapper for Cloudflare Workers
 * Uses the compiled WASM/JS directly
 */

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'
// @ts-ignore - Wrangler handles these imports
import { default as createPGlite } from './pglite-assets/pglite.js'

export interface QueryResult {
  rows: Record<string, unknown>[]
  fields: Array<{ name: string; dataTypeID: number }>
}

export class PGLiteWrapper {
  private pg: any = null
  private ready = false

  static async create(): Promise<PGLiteWrapper> {
    const wrapper = new PGLiteWrapper()
    await wrapper.init()
    return wrapper
  }

  private async init() {
    try {
      // Create PGLite Module with static WASM and data
      this.pg = await createPGlite({
        wasmModule: pgliteWasm,
        fsBundle: new Blob([pgliteData]),
      })
      this.ready = true
    } catch (error) {
      console.error('PGLite initialization error:', error)
      throw error
    }
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    if (!this.ready) {
      throw new Error('PGLite not initialized')
    }

    try {
      const result = await this.pg.query(sql, params)
      return { rows: result.rows as T[] }
    } catch (error) {
      console.error('Query error:', error, 'SQL:', sql)
      throw error
    }
  }

  async exec(sql: string): Promise<void> {
    if (!this.ready) {
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
