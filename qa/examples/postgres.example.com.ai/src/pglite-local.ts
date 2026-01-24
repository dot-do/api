/**
 * PGlite Local Workers Implementation
 *
 * This is a local copy of PGliteWorkers that imports the patched
 * pglite-workers.js module directly for Cloudflare Workers compatibility.
 *
 * Key differences from @dotdo/pglite/workers:
 * - Imports patched Emscripten module directly (not via package)
 * - Uses _pgliteCallbacks trampoline for read/write callbacks
 * - Requires pre-compiled WebAssembly.Module from static import
 */

import { Mutex } from 'async-mutex'
// Import pg-protocol directly to avoid @dotdo/pglite URL dependencies
import { Parser as ProtocolParser, serialize } from '@dotdo/pg-protocol'
import type {
  BackendMessage,
  RowDescriptionMessage,
  DataRowMessage,
  CommandCompleteMessage,
  DatabaseError,
} from '@dotdo/pg-protocol/messages'

// Import the patched Emscripten module factory directly
// @ts-ignore - JS module import
import PostgresModFactory from './pglite-patched/pglite-workers.js'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Emscripten module interface with PGlite-specific functions
 */
interface PostgresMod {
  // Standard Emscripten properties
  HEAPU8: Uint8Array
  HEAP8: Int8Array

  // Emscripten filesystem
  FS: {
    mkdir: (path: string, mode?: number) => void
    mkdev: (path: string, dev: number) => void
    makedev: (major: number, minor: number) => number
    registerDevice: (dev: number, ops: unknown) => void
    analyzePath: (path: string) => { exists: boolean }
    readdir: (path: string) => string[]
    rmdir: (path: string) => void
    symlink: (target: string, linkpath: string) => void
    ErrnoError: new (errno: number) => Error
  }

  // PGlite high-level functions (added by Emscripten build)
  _pgl_initdb: () => number
  _pgl_backend: () => void
  _pgl_shutdown: () => void
  _interactive_one: (length: number, peek: number) => void

  // Trampoline callbacks storage
  _pgliteCallbacks?: {
    write: (ptr: number, length: number) => number
    read: (ptr: number, maxLength: number) => number
  }
}

export interface PGliteLocalOptions {
  /**
   * Pre-compiled WASM module (from Wrangler CompiledWasm rule)
   */
  wasmModule: WebAssembly.Module

  /**
   * Filesystem bundle (pglite.data) as ArrayBuffer or ReadableStream
   */
  fsBundle: ArrayBuffer | ReadableStream<Uint8Array>

  /**
   * Database name (default: 'template1')
   */
  database?: string

  /**
   * Username (default: 'postgres')
   */
  username?: string

  /**
   * Enable debug logging
   */
  debug?: boolean
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[]
  affectedRows: number
  fields?: { name: string; dataTypeID: number }[]
}

// =============================================================================
// PGLITE LOCAL IMPLEMENTATION
// =============================================================================

export class PGliteLocal {
  private mod!: PostgresMod
  private protocolParser = new ProtocolParser()
  private queryMutex = new Mutex()

  // State
  private ready = false
  private closed = false
  private debug: boolean

  // I/O buffers
  private outputData: Uint8Array = new Uint8Array(0)
  private readOffset = 0
  private writeOffset = 0
  private inputData = new Uint8Array(1024 * 1024)

  // Results
  private currentResults: BackendMessage[] = []

  private constructor(debug = false) {
    this.debug = debug
  }

  /**
   * Create a new PGliteLocal instance
   */
  static async create(options: PGliteLocalOptions): Promise<PGliteLocal> {
    const instance = new PGliteLocal(options.debug ?? false)
    await instance.init(options)
    return instance
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[pglite-local]', ...args)
    }
  }

  private async init(options: PGliteLocalOptions): Promise<void> {
    // Verify inputs
    if (!(options.wasmModule instanceof WebAssembly.Module)) {
      throw new Error('wasmModule must be a pre-compiled WebAssembly.Module')
    }

    this.log('Initializing PGlite for Cloudflare Workers')

    // Create Emscripten module using the patched PostgresModFactory
    this.mod = await this.createModule(options)

    // Verify required functions exist
    if (typeof this.mod._pgl_initdb !== 'function') {
      throw new Error('_pgl_initdb is not a function - WASM module may not be fully initialized')
    }

    // Verify the filesystem has the required files (data extraction completed)
    this.verifyFilesystemReady()

    // Create symlink from /PG_PREFIX to /tmp/pglite
    this.log('Creating symlink /PG_PREFIX -> /tmp/pglite')
    try {
      try {
        const contents = this.mod.FS.readdir('/PG_PREFIX')
        if (contents.length <= 2) {
          this.mod.FS.rmdir('/PG_PREFIX')
        }
      } catch {
        // Directory doesn't exist or error reading, that's fine
      }
      this.mod.FS.symlink('/tmp/pglite', '/PG_PREFIX')
    } catch (e: unknown) {
      const err = e as Error
      this.log('Error creating symlink:', err.message)
    }

    // Set up I/O callbacks via trampoline mode
    this.setupCallbacks()

    // Initialize database
    this.log('Calling _pgl_initdb...')
    let idb: number
    try {
      idb = this.mod._pgl_initdb()
    } catch (error) {
      throw error
    }

    if (!idb) {
      throw new Error('INITDB failed')
    }
    if (idb & 0b0001) {
      throw new Error('INITDB: failed to execute')
    }

    // Start backend
    this.mod._pgl_backend()

    this.ready = true

    // Set search path
    await this.exec('SET search_path TO public;')
    this.log('PGlite ready')
  }

  /**
   * Create the Emscripten module using the patched PostgresModFactory with pre-compiled WASM
   */
  private async createModule(options: PGliteLocalOptions): Promise<PostgresMod> {
    const { wasmModule, fsBundle } = options

    // Get the fs bundle as ArrayBuffer
    let fsBundleBuffer: ArrayBuffer
    if (fsBundle instanceof ArrayBuffer) {
      fsBundleBuffer = fsBundle
    } else if (ArrayBuffer.isView(fsBundle)) {
      fsBundleBuffer = (fsBundle as Uint8Array).buffer
    } else if (fsBundle instanceof ReadableStream) {
      fsBundleBuffer = await new Response(fsBundle).arrayBuffer()
    } else {
      fsBundleBuffer = await new Response(fsBundle as unknown as BodyInit).arrayBuffer()
    }

    this.log('Creating Emscripten module...')

    // Configure Emscripten options
    const emscriptenOpts = {
      noExitRuntime: true,
      print: this.debug ? (text: string) => console.log('[PGlite]', text) : () => {},
      printErr: this.debug ? (text: string) => console.error('[PGlite]', text) : () => {},

      // Custom WASM instantiation - use the pre-compiled module from static import
      instantiateWasm: (
        imports: WebAssembly.Imports,
        successCallback: (instance: WebAssembly.Instance, module?: WebAssembly.Module) => void
      ) => {
        this.log('instantiateWasm called...')
        WebAssembly.instantiate(wasmModule, imports)
          .then((instance) => {
            this.log('WASM instance created')
            successCallback(instance, wasmModule)
          })
          .catch((err) => {
            console.error('[pglite-local] WASM instantiation failed:', err)
          })
        return {}
      },

      // Provide pre-loaded data - the Emscripten data loader calls this
      getPreloadedPackage: (remotePackageName: string, _remotePackageSize: number) => {
        this.log('getPreloadedPackage:', remotePackageName)
        if (remotePackageName === 'pglite.data') {
          return fsBundleBuffer
        }
        throw new Error(`Unknown package: ${remotePackageName}`)
      },
    }

    try {
      const mod = await PostgresModFactory(emscriptenOpts)
      this.mod = mod as PostgresMod
      return mod as PostgresMod
    } catch (error) {
      console.error('[pglite-local] PostgresModFactory failed:', error)
      throw error
    }
  }

  private setupCallbacks(): void {
    // TRAMPOLINE MODE: Set up callbacks via direct object assignment
    this.mod._pgliteCallbacks = {
      write: (ptr: number, length: number): number => {
        return this.handleWrite(ptr, length)
      },
      read: (ptr: number, maxLength: number): number => {
        return this.handleRead(ptr, maxLength)
      }
    }
    this.log('Callbacks set up via _pgliteCallbacks trampoline')
  }

  /**
   * Verify that the Emscripten filesystem has been properly populated
   */
  private verifyFilesystemReady(): void {
    const criticalFiles = [
      '/tmp/pglite/share/postgresql/postgres.bki',
      '/tmp/pglite/bin/postgres',
      '/tmp/pglite/bin/initdb',
    ]

    const missingFiles: string[] = []

    for (const file of criticalFiles) {
      try {
        const result = this.mod.FS.analyzePath(file)
        if (!result.exists) {
          missingFiles.push(file)
        }
      } catch {
        missingFiles.push(file)
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(
        `PostgreSQL data files not extracted. Missing: ${missingFiles.join(', ')}.`
      )
    }

    this.log('All critical PostgreSQL files verified')
  }

  private handleWrite(ptr: number, length: number): number {
    if (!this.mod || !this.mod.HEAPU8) {
      return -1
    }

    if (ptr < 0 || length < 0 || ptr + length > this.mod.HEAPU8.length) {
      return -1
    }

    try {
      const bytes = this.mod.HEAPU8.subarray(ptr, ptr + length)

      this.protocolParser.parse(bytes, (msg: BackendMessage) => {
        this.currentResults.push(msg)
      })

      const copied = bytes.slice()
      const requiredSize = this.writeOffset + copied.length

      if (requiredSize > this.inputData.length) {
        const newSize = Math.max(this.inputData.length * 2, requiredSize)
        const newBuffer = new Uint8Array(Math.min(newSize, 1024 * 1024 * 1024))
        newBuffer.set(this.inputData.subarray(0, this.writeOffset))
        this.inputData = newBuffer
      }

      this.inputData.set(copied, this.writeOffset)
      this.writeOffset += copied.length

      return this.inputData.length
    } catch {
      return -1
    }
  }

  private handleRead(ptr: number, maxLength: number): number {
    if (!this.mod || !this.mod.HEAP8) {
      return 0
    }

    try {
      let length = this.outputData.length - this.readOffset
      if (length > maxLength) {
        length = maxLength
      }
      if (length <= 0) {
        return 0
      }

      if (ptr < 0 || ptr + length > this.mod.HEAP8.length) {
        return 0
      }

      this.mod.HEAP8.set(
        this.outputData.subarray(this.readOffset, this.readOffset + length),
        ptr,
      )
      this.readOffset += length

      return length
    } catch {
      return 0
    }
  }

  private execProtocolRawSync(message: Uint8Array): Uint8Array {
    this.readOffset = 0
    this.writeOffset = 0
    this.outputData = message

    if (this.inputData.length !== 1024 * 1024) {
      this.inputData = new Uint8Array(1024 * 1024)
    }

    this.mod._interactive_one(message.length, message[0])

    this.outputData = new Uint8Array(0)

    if (this.writeOffset) {
      return this.inputData.subarray(0, this.writeOffset)
    }
    return new Uint8Array(0)
  }

  async execProtocol(
    message: Uint8Array,
  ): Promise<{ messages: BackendMessage[]; data: Uint8Array }> {
    this.currentResults = []

    const data = this.execProtocolRawSync(message)

    const result = { messages: this.currentResults, data }
    this.currentResults = []

    return result
  }

  /**
   * Execute a SQL query and return parsed results
   */
  async query<T = Record<string, unknown>>(
    sql: string,
  ): Promise<QueryResult<T>> {
    if (!this.ready) {
      throw new Error('PGlite is not ready')
    }

    return this.queryMutex.runExclusive(async () => {
      const message = serialize.query(sql)
      const { messages } = await this.execProtocol(
        new Uint8Array(message.buffer),
      )

      // Parse results
      let rowDescription: RowDescriptionMessage | null = null
      const rows: T[] = []
      let affectedRows = 0
      const fields: { name: string; dataTypeID: number }[] = []

      for (const msg of messages) {
        if (msg.name === 'error') {
          const error = msg as unknown as DatabaseError
          throw new Error(`PostgreSQL error: ${error.message}`)
        }

        if (msg.name === 'rowDescription') {
          rowDescription = msg as RowDescriptionMessage
          for (const field of rowDescription.fields) {
            fields.push({ name: field.name, dataTypeID: field.dataTypeID })
          }
        } else if (msg.name === 'dataRow' && rowDescription) {
          const row: Record<string, unknown> = {}
          const dataRow = msg as DataRowMessage
          for (let i = 0; i < rowDescription.fields.length; i++) {
            const field = rowDescription.fields[i]
            const value = dataRow.fields[i]
            row[field.name] = this.parseValue(value, field.dataTypeID)
          }
          rows.push(row as T)
        } else if (msg.name === 'commandComplete') {
          const cmdMsg = msg as CommandCompleteMessage
          const match = cmdMsg.text.match(/\d+$/)
          if (match) {
            affectedRows = parseInt(match[0], 10)
          }
        }
      }

      return {
        rows,
        affectedRows,
        ...(fields.length > 0 && { fields }),
      }
    })
  }

  private parseValue(value: string | null, dataTypeID: number): unknown {
    if (value === null) return null

    switch (dataTypeID) {
      case 16: // bool
        return value === 't' || value === 'true'
      case 20: // int8 (bigint)
        return BigInt(value)
      case 21: // int2
      case 23: // int4
        return parseInt(value, 10)
      case 700: // float4
      case 701: // float8
      case 1700: // numeric
        return parseFloat(value)
      case 3802: // jsonb
      case 114: // json
        return JSON.parse(value)
      case 1082: // date
      case 1114: // timestamp
      case 1184: // timestamptz
        return new Date(value)
      case 1009: // text[]
      case 1015: // varchar[]
        // Parse PostgreSQL array format: {a,b,c}
        if (value.startsWith('{') && value.endsWith('}')) {
          return value.slice(1, -1).split(',').filter(s => s.length > 0)
        }
        return value
      default:
        return value
    }
  }

  /**
   * Execute SQL without returning results (for DDL/DML)
   */
  async exec(sql: string): Promise<void> {
    await this.query(sql)
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (tx: {
      query: <R = Record<string, unknown>>(sql: string) => Promise<QueryResult<R>>
      exec: (sql: string) => Promise<void>
      rollback: () => Promise<void>
    }) => Promise<T>,
  ): Promise<T> {
    if (!this.ready) {
      throw new Error('PGlite is not ready')
    }

    return this.queryMutex.runExclusive(async () => {
      await this.execInternal('BEGIN')
      let closed = false

      const tx = {
        query: async <R = Record<string, unknown>>(
          sql: string,
        ): Promise<QueryResult<R>> => {
          if (closed) {
            throw new Error('Transaction is closed')
          }
          return await this.queryInternal<R>(sql)
        },
        exec: async (sql: string): Promise<void> => {
          if (closed) {
            throw new Error('Transaction is closed')
          }
          await this.execInternal(sql)
        },
        rollback: async (): Promise<void> => {
          if (closed) {
            throw new Error('Transaction is closed')
          }
          await this.execInternal('ROLLBACK')
          closed = true
        },
      }

      try {
        const result = await callback(tx)
        if (!closed) {
          closed = true
          await this.execInternal('COMMIT')
        }
        return result
      } catch (e) {
        if (!closed) {
          await this.execInternal('ROLLBACK')
        }
        throw e
      }
    })
  }

  private async queryInternal<T = Record<string, unknown>>(
    sql: string,
  ): Promise<QueryResult<T>> {
    const message = serialize.query(sql)
    const { messages } = await this.execProtocol(new Uint8Array(message.buffer))

    let rowDescription: RowDescriptionMessage | null = null
    const rows: T[] = []
    let affectedRows = 0
    const fields: { name: string; dataTypeID: number }[] = []

    for (const msg of messages) {
      if (msg.name === 'error') {
        const error = msg as unknown as DatabaseError
        throw new Error(`PostgreSQL error: ${error.message}`)
      }

      if (msg.name === 'rowDescription') {
        rowDescription = msg as RowDescriptionMessage
        for (const field of rowDescription.fields) {
          fields.push({ name: field.name, dataTypeID: field.dataTypeID })
        }
      } else if (msg.name === 'dataRow' && rowDescription) {
        const row: Record<string, unknown> = {}
        const dataRow = msg as DataRowMessage
        for (let i = 0; i < rowDescription.fields.length; i++) {
          const field = rowDescription.fields[i]
          const value = dataRow.fields[i]
          row[field.name] = this.parseValue(value, field.dataTypeID)
        }
        rows.push(row as T)
      } else if (msg.name === 'commandComplete') {
        const cmdMsg = msg as CommandCompleteMessage
        const match = cmdMsg.text.match(/\d+$/)
        if (match) {
          affectedRows = parseInt(match[0], 10)
        }
      }
    }

    return {
      rows,
      affectedRows,
      ...(fields.length > 0 && { fields }),
    }
  }

  private async execInternal(sql: string): Promise<void> {
    await this.queryInternal(sql)
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.closed) return

    try {
      await this.execProtocol(serialize.end())
      this.mod._pgl_shutdown()

      // Clean up callbacks
      this.mod._pgliteCallbacks = undefined
    } catch (e) {
      const err = e as { name: string; status: number }
      if (err.name !== 'ExitStatus' || err.status !== 0) {
        throw e
      }
    }

    this.closed = true
    this.log('PGlite closed')
  }

  /**
   * Check if database is ready
   */
  get isReady(): boolean {
    return this.ready && !this.closed
  }
}

export default PGliteLocal
