/**
 * Timing utilities for cold start measurements
 *
 * Provides high-resolution timing instrumentation for:
 * - WASM loading
 * - Module initialization
 * - PostgreSQL startup
 * - Query execution
 */

export interface TimingEvent {
  name: string
  startMs: number
  endMs: number
  durationMs: number
  metadata?: Record<string, unknown>
}

export interface ColdStartTimings {
  totalMs: number
  phases: {
    wasmLoad: TimingEvent | null
    dataLoad: TimingEvent | null
    moduleInit: TimingEvent | null
    initdb: TimingEvent | null
    backendStart: TimingEvent | null
    firstQuery: TimingEvent | null
  }
  events: TimingEvent[]
  requestId: string
  timestamp: string
  coldStart: boolean
}

/**
 * Timing collector for tracking cold start phases
 */
export class TimingCollector {
  private startTime: number
  private events: TimingEvent[] = []
  private currentEvent: { name: string; startMs: number; metadata?: Record<string, unknown> } | null = null
  public requestId: string
  public coldStart = true

  constructor(requestId?: string) {
    this.startTime = performance.now()
    // Use crypto.randomUUID() only within request context, not global scope
    this.requestId = requestId || `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }

  /**
   * Start timing an event
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    this.currentEvent = {
      name,
      startMs: performance.now() - this.startTime,
      metadata,
    }
  }

  /**
   * End the current event
   */
  end(additionalMetadata?: Record<string, unknown>): TimingEvent | null {
    if (!this.currentEvent) return null

    const endMs = performance.now() - this.startTime
    const event: TimingEvent = {
      name: this.currentEvent.name,
      startMs: this.currentEvent.startMs,
      endMs,
      durationMs: endMs - this.currentEvent.startMs,
      metadata: { ...this.currentEvent.metadata, ...additionalMetadata },
    }
    this.events.push(event)
    this.currentEvent = null
    return event
  }

  /**
   * Record a point-in-time event
   */
  mark(name: string, metadata?: Record<string, unknown>): void {
    const now = performance.now() - this.startTime
    this.events.push({
      name,
      startMs: now,
      endMs: now,
      durationMs: 0,
      metadata,
    })
  }

  /**
   * Time an async operation
   */
  async time<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.start(name, metadata)
    try {
      const result = await fn()
      this.end({ success: true })
      return result
    } catch (error) {
      this.end({ success: false, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * Get event by name
   */
  getEvent(name: string): TimingEvent | null {
    return this.events.find((e) => e.name === name) || null
  }

  /**
   * Get all collected timings
   */
  getTimings(): ColdStartTimings {
    const totalMs = performance.now() - this.startTime

    return {
      totalMs,
      phases: {
        wasmLoad: this.getEvent('wasm_load'),
        dataLoad: this.getEvent('data_load'),
        moduleInit: this.getEvent('module_init'),
        initdb: this.getEvent('initdb'),
        backendStart: this.getEvent('backend_start'),
        firstQuery: this.getEvent('first_query'),
      },
      events: this.events,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      coldStart: this.coldStart,
    }
  }

  /**
   * Format timings as a string for logging
   */
  toString(): string {
    const timings = this.getTimings()
    const lines = [
      `Cold Start Timings (${timings.requestId})`,
      `  Total: ${timings.totalMs.toFixed(2)}ms`,
      `  Cold Start: ${timings.coldStart}`,
      '',
      'Phases:',
    ]

    for (const [name, event] of Object.entries(timings.phases)) {
      if (event) {
        lines.push(`  ${name}: ${event.durationMs.toFixed(2)}ms`)
      }
    }

    lines.push('', 'All Events:')
    for (const event of timings.events) {
      lines.push(`  [${event.startMs.toFixed(2)}ms] ${event.name}: ${event.durationMs.toFixed(2)}ms`)
    }

    return lines.join('\n')
  }
}

/**
 * Global timing state for module-level tracking
 * Note: crypto.randomUUID() cannot be called in global scope in Workers
 */
export const MODULE_LOAD_TIME = Date.now()

// Generate a simple ID without crypto in global scope
let moduleIdCounter = 0
function generateSimpleId(): string {
  const timestamp = Date.now().toString(36)
  const counter = (moduleIdCounter++).toString(36)
  return `mod-${timestamp}-${counter}`
}

export const MODULE_ID = generateSimpleId()

/**
 * Create timing response headers
 */
export function createTimingHeaders(timings: ColdStartTimings): Headers {
  const headers = new Headers()
  headers.set('X-Cold-Start', String(timings.coldStart))
  headers.set('X-Total-Ms', timings.totalMs.toFixed(2))
  headers.set('X-Request-Id', timings.requestId)

  // Server-Timing header for browser devtools
  const serverTiming = timings.events
    .map((e) => `${e.name.replace(/[^a-zA-Z0-9_-]/g, '_')};dur=${e.durationMs.toFixed(2)}`)
    .join(', ')
  headers.set('Server-Timing', serverTiming)

  return headers
}
