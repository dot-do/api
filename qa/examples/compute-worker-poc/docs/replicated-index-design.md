# Replicated Index DO Cluster Design

## Executive Summary

This document proposes a **Replicated Index DO Cluster** architecture to eliminate round-the-world latency for tenant ID lookups in postgres.do. By maintaining local index replicas in each Cloudflare colo, we can reduce routing latency from 100-300ms to under 10ms.

## The Problem

### Current Flow

```
Request in ORD
    -> idFromName("tenant-123")
    -> ??? (potentially round-trip to coordination layer)
    -> DO might be in SIN
    -> 300ms total
```

While Cloudflare's `idFromName()` is fast for name-to-ID conversion (deterministic hashing), the actual **routing decision** and **DO location discovery** can add significant latency, especially in multi-tenant scenarios where we need to:

1. Determine which tenant the request belongs to
2. Look up any tenant-specific routing metadata (e.g., colo hints, feature flags)
3. Route to the appropriate DO

### Latency Breakdown

| Operation | Latency | Notes |
|-----------|---------|-------|
| `idFromName()` | ~1-2ms | Deterministic hash, very fast |
| DO stub creation | ~1ms | Local operation |
| First request to new DO | 50-300ms | Cold start + potential cross-region |
| Request to existing DO | 5-50ms | Depends on requester location vs DO location |
| Metadata lookup (external) | 50-200ms | If using external DB for tenant metadata |

**Key Insight:** The problem isn't `idFromName()` - it's the metadata lookup and cold DO coordination.

## The Solution: Replicated Index DO Cluster

### Architecture Overview

```
                    ┌─────────────────────────────────────────────────┐
                    │        Replicated Index DO Cluster              │
                    │                                                 │
     ┌──────────────┼──────────────┬──────────────┬──────────────┐   │
     │              │              │              │              │   │
  IndexDO       IndexDO        IndexDO        IndexDO        IndexDO │
   (ORD)         (SIN)          (AMS)          (SJC)          (...)  │
     │              │              │              │              │   │
     └──────────────┴──────────────┴──────────────┴──────────────┘   │
                    │                                                 │
                    │           Eventually Consistent                 │
                    │              Replication                        │
                    └─────────────────────────────────────────────────┘
                                        │
                                        │ Sync via
                                        │ - DO-to-DO gossip
                                        │ - R2 as source of truth
                                        │ - KV for fast reads
                                        ▼
                    ┌─────────────────────────────────────────────────┐
                    │              Primary Index DO                   │
                    │         (Single source of truth)                │
                    │                                                 │
                    │   - Handles writes                              │
                    │   - Broadcasts to replicas                      │
                    │   - Stores authoritative mapping                │
                    └─────────────────────────────────────────────────┘
```

### Request Flow with Replicated Index

```
Request arrives in ORD
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Router Worker (ORD)                                        │
│                                                             │
│  1. Extract colo from request.cf.colo → "ORD"              │
│  2. Get local IndexDO: idFromName("index-ORD")             │
│  3. Query local index: lookup("tenant-123")                │
│     └── 5-8ms (local DO, cached data)                      │
│  4. Get result: { doId: "xyz", coloHint: "SJC" }          │
│  5. Route to tenant DO with locationHint                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Total routing latency: ~10-15ms (vs 100-300ms previously)
```

## Detailed Design

### 1. Index Cache Structure

```typescript
/**
 * Cached index entry for tenant-to-DO mapping
 */
interface IndexEntry {
  /** Tenant identifier */
  tenantId: string

  /** The actual DO ID (hex string) */
  doId: string

  /** Suggested colo for the tenant DO (for locationHint) */
  coloHint?: string

  /** When this entry was cached (epoch ms) */
  cachedAt: number

  /** TTL for this entry (ms) */
  ttl: number

  /** Version number for conflict resolution */
  version: number

  /** Tenant metadata (feature flags, tier, etc.) */
  metadata?: {
    tier?: 'free' | 'pro' | 'enterprise'
    features?: string[]
    maxConnections?: number
    region?: string
  }
}

/**
 * Index DO state
 */
interface IndexState {
  /** Local colo identifier */
  colo: string

  /** Tenant index cache */
  cache: Map<string, IndexEntry>

  /** Last sync timestamp with primary */
  lastSyncAt: number

  /** Sync version (monotonic) */
  syncVersion: number

  /** Statistics */
  stats: {
    hits: number
    misses: number
    staleHits: number  // SWR
    revalidations: number
  }
}
```

### 2. IndexDO Implementation

```typescript
/**
 * Replicated Index Durable Object
 *
 * Each colo has one IndexDO that caches tenant mappings locally.
 * Uses SWR (Stale-While-Revalidate) for optimal latency.
 */
export class IndexDO implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private cache: Map<string, IndexEntry> = new Map()
  private colo: string
  private lastSyncAt: number = 0
  private syncVersion: number = 0

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    revalidations: 0,
  }

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.colo = 'unknown' // Set from first request

    // Restore cache from DO storage on wake
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Map<string, IndexEntry>>('cache')
      if (stored) {
        this.cache = new Map(stored)
      }
      this.lastSyncAt = await this.state.storage.get<number>('lastSyncAt') ?? 0
      this.syncVersion = await this.state.storage.get<number>('syncVersion') ?? 0
    })

    // Schedule keep-warm alarm
    this.scheduleKeepWarm()
  }

  /**
   * Lookup a tenant in the local cache
   *
   * Implements SWR:
   * 1. Fresh cache hit → return immediately
   * 2. Stale cache hit → return stale, revalidate in background
   * 3. Cache miss → fetch from primary, cache, and return
   */
  async lookup(
    tenantId: string,
    ctx: ExecutionContext
  ): Promise<{ doId: string; coloHint?: string; metadata?: IndexEntry['metadata'] } | null> {
    const now = Date.now()
    const entry = this.cache.get(tenantId)

    // Case 1: Fresh cache hit
    if (entry && now - entry.cachedAt < entry.ttl) {
      this.stats.hits++
      return {
        doId: entry.doId,
        coloHint: entry.coloHint,
        metadata: entry.metadata,
      }
    }

    // Case 2: Stale cache hit (SWR)
    if (entry) {
      this.stats.staleHits++

      // Return stale data immediately
      const result = {
        doId: entry.doId,
        coloHint: entry.coloHint,
        metadata: entry.metadata,
      }

      // Revalidate in background
      ctx.waitUntil(this.revalidate(tenantId))

      return result
    }

    // Case 3: Cache miss - fetch from primary
    this.stats.misses++
    return await this.fetchFromPrimary(tenantId)
  }

  /**
   * Revalidate a single entry from primary
   */
  private async revalidate(tenantId: string): Promise<void> {
    this.stats.revalidations++

    try {
      const entry = await this.fetchFromPrimary(tenantId)
      if (entry) {
        // fetchFromPrimary already caches the entry
      }
    } catch (error) {
      console.error(`Revalidation failed for ${tenantId}:`, error)
    }
  }

  /**
   * Fetch entry from primary index
   */
  private async fetchFromPrimary(tenantId: string): Promise<{
    doId: string
    coloHint?: string
    metadata?: IndexEntry['metadata']
  } | null> {
    // Option 1: Query primary IndexDO
    const primaryId = this.env.INDEX_DO.idFromName('primary')
    const primaryStub = this.env.INDEX_DO.get(primaryId)

    const response = await primaryStub.fetch(
      new Request('https://internal/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
    )

    if (!response.ok) {
      return null
    }

    const entry = await response.json() as IndexEntry | null

    if (entry) {
      // Cache locally
      this.cache.set(tenantId, {
        ...entry,
        cachedAt: Date.now(),
      })

      // Persist to storage (debounced)
      this.schedulePersist()
    }

    return entry ? {
      doId: entry.doId,
      coloHint: entry.coloHint,
      metadata: entry.metadata,
    } : null
  }

  /**
   * Register a new tenant mapping (called by primary)
   */
  async register(entry: IndexEntry): Promise<void> {
    this.cache.set(entry.tenantId, {
      ...entry,
      cachedAt: Date.now(),
    })
    this.schedulePersist()
  }

  /**
   * Bulk sync from primary (called periodically or on wake)
   */
  async sync(): Promise<void> {
    const primaryId = this.env.INDEX_DO.idFromName('primary')
    const primaryStub = this.env.INDEX_DO.get(primaryId)

    const response = await primaryStub.fetch(
      new Request('https://internal/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colo: this.colo,
          since: this.syncVersion,
        }),
      })
    )

    if (!response.ok) {
      console.error('Sync failed:', await response.text())
      return
    }

    const { entries, version } = await response.json() as {
      entries: IndexEntry[]
      version: number
    }

    // Apply updates
    for (const entry of entries) {
      this.cache.set(entry.tenantId, {
        ...entry,
        cachedAt: Date.now(),
      })
    }

    this.syncVersion = version
    this.lastSyncAt = Date.now()
    this.schedulePersist()
  }

  /**
   * Keep-warm alarm - prevents DO from sleeping
   */
  async alarm(): Promise<void> {
    // Sync with primary
    await this.sync()

    // Schedule next alarm
    this.scheduleKeepWarm()
  }

  private scheduleKeepWarm(): void {
    // Keep-warm every 20 seconds (before 30s idle timeout)
    const alarmTime = Date.now() + 20_000
    this.state.storage.setAlarm(alarmTime)
  }

  private persistTimeout: ReturnType<typeof setTimeout> | null = null

  private schedulePersist(): void {
    // Debounce persistence to avoid excessive writes
    if (this.persistTimeout) return

    this.persistTimeout = setTimeout(async () => {
      this.persistTimeout = null
      await this.state.storage.put('cache', this.cache)
      await this.state.storage.put('lastSyncAt', this.lastSyncAt)
      await this.state.storage.put('syncVersion', this.syncVersion)
    }, 1000)
  }

  /**
   * HTTP handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Set colo from request if not set
    if (this.colo === 'unknown') {
      this.colo = (request as any).cf?.colo ?? 'unknown'
    }

    switch (url.pathname) {
      case '/lookup':
        return this.handleLookup(request)
      case '/register':
        return this.handleRegister(request)
      case '/sync':
        return this.handleSync(request)
      case '/stats':
        return this.handleStats()
      case '/status':
        return this.handleStatus()
      default:
        return new Response('Not Found', { status: 404 })
    }
  }

  private async handleLookup(request: Request): Promise<Response> {
    const { tenantId } = await request.json() as { tenantId: string }

    // Create a mock ExecutionContext for background revalidation
    const ctx: ExecutionContext = {
      waitUntil: (promise) => {
        // In a real implementation, this would use state.waitUntil
        promise.catch(console.error)
      },
      passThroughOnException: () => {},
    }

    const result = await this.lookup(tenantId, ctx)

    if (!result) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json(result)
  }

  private async handleRegister(request: Request): Promise<Response> {
    const entry = await request.json() as IndexEntry
    await this.register(entry)
    return Response.json({ success: true })
  }

  private async handleSync(request: Request): Promise<Response> {
    // This endpoint is for primary to push updates to replicas
    // In a replica, this is used to receive sync data
    const { entries, version } = await request.json() as {
      entries: IndexEntry[]
      version: number
    }

    for (const entry of entries) {
      this.cache.set(entry.tenantId, {
        ...entry,
        cachedAt: Date.now(),
      })
    }

    this.syncVersion = version
    this.schedulePersist()

    return Response.json({ success: true, synced: entries.length })
  }

  private handleStats(): Response {
    const totalRequests = this.stats.hits + this.stats.misses + this.stats.staleHits
    return Response.json({
      colo: this.colo,
      cacheSize: this.cache.size,
      lastSyncAt: this.lastSyncAt,
      syncVersion: this.syncVersion,
      stats: {
        ...this.stats,
        hitRatio: totalRequests > 0
          ? ((this.stats.hits + this.stats.staleHits) / totalRequests).toFixed(4)
          : 0,
      },
    })
  }

  private handleStatus(): Response {
    return Response.json({
      ok: true,
      colo: this.colo,
      cacheSize: this.cache.size,
      lastSyncAt: this.lastSyncAt,
    })
  }
}
```

### 3. Primary Index DO

```typescript
/**
 * Primary Index DO - Single source of truth for tenant mappings
 *
 * Responsibilities:
 * - Handle all write operations (new tenant registration)
 * - Broadcast updates to replica IndexDOs
 * - Serve as fallback for cache misses
 */
export class PrimaryIndexDO implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private index: Map<string, IndexEntry> = new Map()
  private version: number = 0
  private changeLog: Array<{ version: number; entry: IndexEntry }> = []
  private replicaColos: Set<string> = new Set()

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env

    // Restore from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Map<string, IndexEntry>>('index')
      if (stored) {
        this.index = new Map(stored)
      }
      this.version = await this.state.storage.get<number>('version') ?? 0

      // Keep limited change log for incremental sync
      const log = await this.state.storage.get<typeof this.changeLog>('changeLog')
      if (log) {
        this.changeLog = log.slice(-10000) // Keep last 10k changes
      }
    })
  }

  /**
   * Register a new tenant
   */
  async register(
    tenantId: string,
    coloHint?: string,
    metadata?: IndexEntry['metadata']
  ): Promise<IndexEntry> {
    // Generate deterministic DO ID
    const doId = this.env.TENANT_DO.idFromName(tenantId).toString()

    const entry: IndexEntry = {
      tenantId,
      doId,
      coloHint,
      cachedAt: Date.now(),
      ttl: 60_000, // 1 minute default TTL
      version: ++this.version,
      metadata,
    }

    // Store in primary index
    this.index.set(tenantId, entry)
    this.changeLog.push({ version: entry.version, entry })

    // Persist
    await this.state.storage.put('index', this.index)
    await this.state.storage.put('version', this.version)
    await this.state.storage.put('changeLog', this.changeLog.slice(-10000))

    // Broadcast to known replicas (fire-and-forget)
    this.broadcastUpdate(entry)

    return entry
  }

  /**
   * Lookup a tenant
   */
  lookup(tenantId: string): IndexEntry | null {
    return this.index.get(tenantId) ?? null
  }

  /**
   * Get changes since a version for incremental sync
   */
  getChangesSince(sinceVersion: number): { entries: IndexEntry[]; version: number } {
    const changes = this.changeLog
      .filter(c => c.version > sinceVersion)
      .map(c => c.entry)

    return {
      entries: changes,
      version: this.version,
    }
  }

  /**
   * Full sync - return all entries
   */
  getFullSync(): { entries: IndexEntry[]; version: number } {
    return {
      entries: Array.from(this.index.values()),
      version: this.version,
    }
  }

  /**
   * Broadcast update to all replica colos
   */
  private broadcastUpdate(entry: IndexEntry): void {
    for (const colo of this.replicaColos) {
      // Fire-and-forget broadcast to each replica
      const replicaId = this.env.INDEX_DO.idFromName(`index-${colo}`)
      const replicaStub = this.env.INDEX_DO.get(replicaId)

      replicaStub.fetch(
        new Request('https://internal/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
      ).catch(err => {
        console.error(`Failed to broadcast to ${colo}:`, err)
      })
    }
  }

  /**
   * Register a replica colo (called when replica first syncs)
   */
  registerReplica(colo: string): void {
    this.replicaColos.add(colo)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    switch (url.pathname) {
      case '/register': {
        const { tenantId, coloHint, metadata } = await request.json() as {
          tenantId: string
          coloHint?: string
          metadata?: IndexEntry['metadata']
        }
        const entry = await this.register(tenantId, coloHint, metadata)
        return Response.json(entry)
      }

      case '/lookup': {
        const { tenantId } = await request.json() as { tenantId: string }
        const entry = this.lookup(tenantId)
        if (!entry) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        return Response.json(entry)
      }

      case '/sync': {
        const { colo, since } = await request.json() as { colo: string; since: number }

        // Register this replica
        this.registerReplica(colo)

        // Return changes since version, or full sync if too old
        const result = since > 0 && since > this.version - 10000
          ? this.getChangesSince(since)
          : this.getFullSync()

        return Response.json(result)
      }

      case '/stats': {
        return Response.json({
          indexSize: this.index.size,
          version: this.version,
          replicaCount: this.replicaColos.size,
          replicas: Array.from(this.replicaColos),
        })
      }

      default:
        return new Response('Not Found', { status: 404 })
    }
  }
}
```

### 4. Router Worker Integration

```typescript
/**
 * Router Worker with Replicated Index
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const timing = new TimingCollector()

    // 1. Get colo from request
    timing.start('get_colo')
    const colo = (request as any).cf?.colo ?? 'unknown'
    timing.end()

    // 2. Extract tenant ID from request
    timing.start('extract_tenant')
    const tenantId = extractTenantId(request) // Your existing logic
    if (!tenantId) {
      return new Response('Tenant not found', { status: 400 })
    }
    timing.end()

    // 3. Get local index DO
    timing.start('get_index_stub')
    const indexId = env.INDEX_DO.idFromName(`index-${colo}`)
    const indexStub = env.INDEX_DO.get(indexId, { locationHint: colo })
    timing.end()

    // 4. Lookup tenant in local index (5-8ms expected)
    timing.start('index_lookup')
    const lookupResponse = await indexStub.fetch(
      new Request('https://internal/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
    )
    timing.end()

    if (!lookupResponse.ok) {
      // Tenant not registered - either register or reject
      return new Response('Tenant not found', { status: 404 })
    }

    const { doId, coloHint, metadata } = await lookupResponse.json() as {
      doId: string
      coloHint?: string
      metadata?: Record<string, unknown>
    }

    // 5. Get tenant DO stub with location hint
    timing.start('get_tenant_stub')
    const tenantDoId = env.TENANT_DO.idFromString(doId)
    const tenantStub = env.TENANT_DO.get(tenantDoId, {
      locationHint: coloHint ?? colo,
    })
    timing.end()

    // 6. Forward request to tenant DO
    timing.start('tenant_request')
    const response = await tenantStub.fetch(request)
    timing.end()

    // Add timing headers
    const timings = timing.getTimings()
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('X-Index-Lookup-Ms', String(timing.getDuration('index_lookup')))
    newResponse.headers.set('X-Total-Routing-Ms', String(timings.totalMs))
    newResponse.headers.set('X-Colo', colo)

    return newResponse
  },
}
```

## Replication Strategies

### Option 1: DO-to-DO Gossip (Recommended)

**Pros:**
- Lowest latency for updates
- Uses existing DO infrastructure
- Simple implementation

**Cons:**
- Limited to active replicas
- Potential consistency windows

**Implementation:**
- Primary broadcasts to known replicas on write
- Replicas register with primary on first sync
- Periodic full sync for missed updates

### Option 2: R2 as Source of Truth

**Pros:**
- Durable storage
- Works even if primary is down
- Supports disaster recovery

**Cons:**
- Higher latency for writes
- Additional storage costs
- More complex implementation

**Implementation:**
```typescript
// On primary write
await env.R2_INDEX.put(`index/${tenantId}.json`, JSON.stringify(entry))
await env.R2_INDEX.put('manifest.json', JSON.stringify({ version, updatedAt }))

// On replica sync
const manifest = await env.R2_INDEX.get('manifest.json')
if (manifest.version > localVersion) {
  // Pull updated entries
}
```

### Option 3: Workers KV (Hybrid)

**Pros:**
- FREE reads from edge
- ~0ms read latency from cache
- Built-in eventual consistency

**Cons:**
- ~60s propagation delay
- Limited to simple key-value
- Cannot do range queries

**Implementation:**
```typescript
// On primary write
await env.TENANT_INDEX_KV.put(`tenant:${tenantId}`, JSON.stringify(entry))

// On lookup (fast path)
const kvEntry = await env.TENANT_INDEX_KV.get(`tenant:${tenantId}`, { type: 'json' })
if (kvEntry) {
  return kvEntry // ~0ms from edge cache
}

// Fallback to DO for consistency
return lookupFromIndexDO(tenantId)
```

### Recommended: Hybrid Approach

```
Write Path:
  1. Write to Primary IndexDO
  2. Primary broadcasts to replicas (async)
  3. Primary writes to KV (async, for DR)
  4. Primary writes to R2 (async, for full backup)

Read Path (fast):
  1. Check local IndexDO cache (5-8ms)
  2. If stale, return stale + revalidate in background (SWR)

Read Path (miss):
  1. Check KV (~0ms from edge)
  2. If miss, query primary IndexDO
  3. Cache locally
```

## Latency Analysis

### Before (Current Architecture)

| Step | Latency | Notes |
|------|---------|-------|
| Extract tenant | ~1ms | Parse request |
| idFromName | ~1ms | Deterministic hash |
| Metadata lookup | 50-200ms | External DB or primary DO |
| Get DO stub | ~1ms | Local |
| DO request | 5-300ms | Depends on location |
| **Total** | **60-500ms** | **Highly variable** |

### After (Replicated Index)

| Step | Latency | Notes |
|------|---------|-------|
| Extract tenant | ~1ms | Parse request |
| Get local IndexDO | ~1ms | idFromName + get |
| Index lookup | 5-8ms | Local DO, SWR cache |
| Get tenant DO stub | ~1ms | With locationHint |
| DO request | 5-50ms | Optimized routing |
| **Total** | **13-60ms** | **Consistent, predictable** |

### Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| P50 latency | ~150ms | ~25ms | **6x faster** |
| P95 latency | ~400ms | ~50ms | **8x faster** |
| P99 latency | ~500ms | ~60ms | **8x faster** |
| Cache hit rate | N/A | ~95% | New capability |

## Keep-Warm Strategy

### Problem
DOs sleep after 30 seconds of inactivity. A sleeping IndexDO requires cold start.

### Solution: Alarm-based Keep-Warm

```typescript
// In IndexDO constructor
constructor(state: DurableObjectState, env: Env) {
  // ...
  this.scheduleKeepWarm()
}

private scheduleKeepWarm(): void {
  // Set alarm for 20 seconds (before 30s sleep)
  const alarmTime = Date.now() + 20_000
  this.state.storage.setAlarm(alarmTime)
}

async alarm(): Promise<void> {
  // Do useful work while we're awake
  await this.sync() // Sync with primary

  // Schedule next alarm
  this.scheduleKeepWarm()
}
```

### Traffic-Based Warm

For high-traffic colos, the IndexDO stays warm naturally:

```
Traffic pattern:
  - ORD: 1000 req/min → Always warm
  - SIN: 500 req/min → Always warm
  - Small colo: 5 req/min → Needs alarm keep-warm
```

### Cost Implications

| Component | Cost | Notes |
|-----------|------|-------|
| IndexDO requests | $0.15/million | Index lookups |
| IndexDO duration | $12.50/million GB-s | Keep-warm alarms |
| KV reads | FREE (first 10M/day) | Fast fallback |
| R2 storage | $0.015/GB/month | Backup storage |

**Estimated monthly cost for 100 colos:**
- Keep-warm alarms: ~43,200/day/colo = 4.32M/day = $0.65/day = **$19.50/month**
- Index lookups: Depends on traffic, but minimal compared to actual DO requests

## Integration with Compute Worker Architecture

The Replicated Index complements the Compute Worker POC:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FULL ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐                │
│  │ Client  │───>│ Router       │───>│ Local IndexDO   │                │
│  └─────────┘    │ Worker       │    │ (5-8ms lookup)  │                │
│                 └──────────────┘    └────────┬────────┘                │
│                                              │                         │
│                                    ┌─────────┴─────────┐               │
│                                    ▼                   ▼               │
│                           ┌───────────────┐   ┌───────────────┐        │
│                           │ State DO      │   │ Tenant DO     │        │
│                           │ (no WASM)     │   │ (traditional) │        │
│                           └───────┬───────┘   └───────────────┘        │
│                                   │                                    │
│                                   ▼                                    │
│                           ┌───────────────┐                            │
│                           │ Compute Worker│                            │
│                           │ (WASM)        │                            │
│                           └───────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

Benefits:
1. **Routing latency** reduced by IndexDO local cache
2. **Cold start** mitigated by Compute Worker pool
3. **Combined savings**: 6-8x faster P95 latency

## Implementation Phases

### Phase 1: Single Primary (Week 1)
- Implement PrimaryIndexDO
- Basic registration/lookup
- Integration with Router Worker

### Phase 2: Replica IndexDOs (Week 2)
- Deploy IndexDO per colo
- Implement sync mechanism
- Add SWR caching

### Phase 3: Keep-Warm (Week 3)
- Alarm-based keep-warm
- Monitor and tune intervals
- Cost optimization

### Phase 4: Hybrid Storage (Week 4)
- Add KV fallback
- R2 backup for DR
- Full test coverage

## Monitoring and Observability

### Metrics to Track

```typescript
interface IndexMetrics {
  // Latency
  lookupLatencyP50: number
  lookupLatencyP95: number
  lookupLatencyP99: number

  // Cache
  cacheHitRate: number
  staleHitRate: number
  missRate: number

  // Sync
  syncLatency: number
  syncVersion: number
  replicationLag: number

  // Health
  activeReplicas: number
  warmReplicas: number
  coldStartsPerMinute: number
}
```

### Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High miss rate | >10% misses | Check primary health |
| Replication lag | >5 minutes | Check network/DO health |
| Cold starts spike | >10/min | Increase keep-warm frequency |
| High latency | P95 >50ms | Scale or optimize |

## Conclusion

The Replicated Index DO Cluster provides:

1. **Sub-10ms routing latency** via local colo caching
2. **95%+ cache hit rate** with SWR pattern
3. **Consistent performance** across all colos
4. **Fault tolerance** via replication
5. **Cost efficiency** using existing DO infrastructure

This architecture transforms tenant routing from a variable-latency operation into a predictable, low-latency lookup, enabling true edge-native performance for postgres.do.
