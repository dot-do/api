# Per-Colo Shared DO Pool Architecture

Design document for cold start optimization in postgres.do using colo-aware Durable Object pools.

## Executive Summary

This document explores an architecture where **pre-warmed PGLite Durable Objects are distributed across Cloudflare colos** to serve as compute proxies, eliminating cold start latency for tenant database operations. Instead of a single shared compute worker (which proved ineffective due to isolate routing), we propose a **pool of SharedComputeDOs per colo** that are kept warm with PGLite WASM.

## Problem Statement

From our [Compute Worker POC benchmarks](../README.md), we learned:

| Issue | Details |
|-------|---------|
| Cross-tenant warm sharing | Only ~15% of requests hit warm isolates |
| Isolate routing | Service bindings route to different isolates unpredictably |
| Cold start overhead | ~2.8s for WASM initialization regardless of architecture |
| RPC overhead | ~20ms added latency for DO-to-Worker calls |

**The core insight**: Service bindings to Workers don't provide predictable warm instances because Cloudflare's isolate pool is opaque. However, **Durable Objects are addressable by ID**, meaning we can deterministically route to specific warm instances.

## The Per-Colo Pool Idea

```
Request (colo: ORD)
      |
      v
Router Worker (detects colo via request.cf.colo)
      |
      v
Get SharedComputeDO for ORD
  - ID: "shared-compute-ord-0" (or from pool: 0-N)
  - locationHint: "enam" (for ORD)
      |
      v
SharedComputeDO (pre-warmed PGLite in ORD)
  - Executes query
  - Returns result
      |
      v
TenantDO (ORD) persists state
```

## Research Findings

### 1. Colo Detection via request.cf.colo

**How it works**: The `request.cf` object contains metadata about the request, including the three-letter IATA airport code of the Cloudflare PoP handling the request.

```typescript
// In a Worker fetch handler
export default {
  async fetch(request: Request, env: Env) {
    const colo = request.cf?.colo // e.g., "ORD", "LHR", "NRT"
    // ...
  }
}
```

**Reliability considerations**:
- Available on HTTP requests, not on scheduled events or alarm handlers
- Represents the colo serving the **incoming request**, not necessarily where a DO is located
- Free tier traffic may sometimes route through non-local colos
- Enterprise plans get highest priority for local colo routing

**Sources**: [Cloudflare Community - Fetch the COLO within a Worker](https://community.cloudflare.com/t/fetch-the-colo-within-a-worker/192637)

### 2. LocationHint API

**How it works**: When calling `namespace.get(id, { locationHint })`, you can suggest where a new DO should be created.

```typescript
// Request a DO in Eastern North America
const stub = env.SHARED_COMPUTE.get(
  env.SHARED_COMPUTE.idFromName("shared-compute-ord-0"),
  { locationHint: "enam" }
)
```

**Available location hints** (8 regional codes):

| Code | Region | Notes |
|------|--------|-------|
| `wnam` | Western North America | SEA, LAX, SJC, DEN |
| `enam` | Eastern North America | ORD, DFW, EWR, MIA |
| `sam` | South America | *Spawns in enam (no DO support)* |
| `weur` | Western Europe | LHR, CDG, AMS, MAD, LIS |
| `eeur` | Eastern Europe | FRA, PRG, VIE, WAW, ZRH, ARN, MRS, MXP |
| `apac` | Asia-Pacific | SIN, HKG, NRT, KIX, ICN |
| `oc` | Oceania | SYD, MEL, BNE, AKL |
| `afr` | Africa | *Spawns in eeur (no DO support)* |
| `me` | Middle East | *Spawns in eeur (no DO support)* |

**Critical limitations**:
1. **Hints are best-effort, not guarantees** - Cloudflare selects a nearby DC that minimizes latency
2. **Only the first `get()` respects the hint** - Once created, a DO stays in its location
3. **Not all colos support DOs** - Only ~29 out of 250+ PoPs have DO capability

**Sources**: [Cloudflare Durable Objects - Data Location](https://developers.cloudflare.com/durable-objects/reference/data-location/)

### 3. DO-Capable Colos

According to [where.durableobjects.live](https://where.durableobjects.live/), only **11.55% of Cloudflare PoPs** support Durable Objects:

**North America (8)**: ORD, DFW, DEN, LAX, MIA, EWR, SJC, SEA

**Europe (12)**: AMS, FRA, LHR, MAD, CDG, PRG, ARN, VIE, WAW, ZRH, LIS, MRS, MXP

**Asia-Pacific (8)**: AKL, BNE, HKG, MEL, KIX, ICN, SIN, SYD, NRT

This means we cannot have a SharedComputeDO in every colo - we need to map request colos to the nearest DO-capable colo.

### 4. DO-to-DO Latency Characteristics

**Same-colo DO-to-DO communication**:
- When two DOs are in the same colo, communication is extremely fast (~1-5ms)
- Storage operations are "zero-latency" as SQLite runs in the same thread
- No network hop required for same-colo communication

**Cross-colo DO-to-DO communication**:
- Requires network round-trip (10-100ms+ depending on distance)
- No different from Worker-to-DO latency fundamentally

**Key insight**: If we can ensure the SharedComputeDO is in the **same colo** as the TenantDO, inter-DO communication is nearly free.

**Sources**: [Cloudflare Blog - Zero-latency SQLite in Durable Objects](https://blog.cloudflare.com/sqlite-in-durable-objects/), [Durable Objects Rules](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)

### 5. Alarms for Keep-Warm

**How alarms work**:
- Each DO can have one active alarm at a time via `setAlarm(scheduledTimeMs)`
- When the alarm fires, the `alarm()` handler is invoked
- Alarms guarantee at-least-once execution with automatic retry (up to 6 times)

**Keep-warm pattern**:
```typescript
export class SharedComputeDO {
  async alarm() {
    // Run a simple query to keep PGLite warm
    await this.pg.query('SELECT 1')

    // Schedule next alarm (every 30 seconds)
    await this.state.storage.setAlarm(Date.now() + 30_000)
  }

  async init() {
    // Start the keep-warm cycle
    await this.state.storage.setAlarm(Date.now() + 30_000)
  }
}
```

**Alarm billing**: Each `setAlarm()` is billed as a single row write.

**Sources**: [Cloudflare Durable Objects - Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)

## Architecture Design

### Colo-to-Region Mapping

Since we can't have DOs in every colo, we map request colos to the nearest DO-capable region:

```typescript
const COLO_TO_REGION: Record<string, string> = {
  // Western North America
  'SEA': 'wnam', 'LAX': 'wnam', 'SJC': 'wnam', 'DEN': 'wnam',
  'SFO': 'wnam', 'PDX': 'wnam', 'PHX': 'wnam', 'SLC': 'wnam',

  // Eastern North America
  'ORD': 'enam', 'DFW': 'enam', 'EWR': 'enam', 'MIA': 'enam',
  'ATL': 'enam', 'IAD': 'enam', 'BOS': 'enam', 'YYZ': 'enam',

  // Western Europe
  'LHR': 'weur', 'CDG': 'weur', 'AMS': 'weur', 'MAD': 'weur',
  'LIS': 'weur', 'DUB': 'weur', 'BRU': 'weur',

  // Eastern Europe
  'FRA': 'eeur', 'PRG': 'eeur', 'VIE': 'eeur', 'WAW': 'eeur',
  'ZRH': 'eeur', 'ARN': 'eeur', 'MRS': 'eeur', 'MXP': 'eeur',
  'HEL': 'eeur', 'CPH': 'eeur', 'OSL': 'eeur',

  // Asia-Pacific
  'NRT': 'apac', 'KIX': 'apac', 'HKG': 'apac', 'SIN': 'apac',
  'ICN': 'apac', 'BKK': 'apac', 'KUL': 'apac', 'TPE': 'apac',

  // Oceania
  'SYD': 'oc', 'MEL': 'oc', 'BNE': 'oc', 'AKL': 'oc',
  'PER': 'oc',

  // South America -> Eastern North America (no DO support in SAM)
  'GRU': 'enam', 'GIG': 'enam', 'EZE': 'enam', 'SCL': 'enam',
  'BOG': 'enam', 'LIM': 'enam',

  // Africa -> Eastern Europe (no DO support in AFR)
  'JNB': 'eeur', 'CPT': 'eeur', 'NBO': 'eeur', 'LOS': 'eeur',

  // Middle East -> Eastern Europe (no DO support in ME)
  'DXB': 'eeur', 'DOH': 'eeur', 'TLV': 'eeur', 'BAH': 'eeur',
}

function getRegionForColo(colo: string): string {
  return COLO_TO_REGION[colo] || 'enam' // Default to Eastern NA
}
```

### Pool Structure

Each region has a pool of SharedComputeDOs:

```typescript
interface PoolConfig {
  region: string
  poolSize: number
  keepWarmIntervalMs: number
}

const POOL_CONFIGS: PoolConfig[] = [
  { region: 'wnam', poolSize: 3, keepWarmIntervalMs: 30_000 },
  { region: 'enam', poolSize: 5, keepWarmIntervalMs: 30_000 },
  { region: 'weur', poolSize: 4, keepWarmIntervalMs: 30_000 },
  { region: 'eeur', poolSize: 3, keepWarmIntervalMs: 30_000 },
  { region: 'apac', poolSize: 4, keepWarmIntervalMs: 30_000 },
  { region: 'oc',   poolSize: 2, keepWarmIntervalMs: 30_000 },
]
// Total: 21 SharedComputeDOs globally
```

### DO ID Naming Convention

```typescript
function getSharedComputeId(region: string, index: number): string {
  return `shared-compute-${region}-${index}`
}

// Examples:
// "shared-compute-enam-0"
// "shared-compute-weur-2"
// "shared-compute-apac-1"
```

### Load Balancing Within a Pool

Simple round-robin based on request timestamp:

```typescript
function selectPoolMember(region: string, poolSize: number): number {
  // Use current second to distribute across pool
  const second = Math.floor(Date.now() / 1000)
  return second % poolSize
}

// Or: hash-based for sticky routing per tenant
function selectPoolMemberForTenant(
  region: string,
  poolSize: number,
  tenantId: string
): number {
  const hash = simpleHash(tenantId)
  return hash % poolSize
}
```

## Implementation Sketch

### Router Worker

```typescript
import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

app.post('/query/:tenantId', async (c) => {
  const tenantId = c.req.param('tenantId')
  const colo = c.req.raw.cf?.colo || 'EWR'
  const sql = (await c.req.json<{ sql: string }>()).sql

  // 1. Map colo to region
  const region = getRegionForColo(colo)
  const poolSize = getPoolSizeForRegion(region)

  // 2. Select a SharedComputeDO from the pool
  const poolIndex = selectPoolMemberForTenant(region, poolSize, tenantId)
  const computeDoId = c.env.SHARED_COMPUTE.idFromName(
    `shared-compute-${region}-${poolIndex}`
  )

  // 3. Get stub with location hint (only matters on first creation)
  const computeStub = c.env.SHARED_COMPUTE.get(computeDoId, {
    locationHint: region
  })

  // 4. Forward query to SharedComputeDO
  const result = await computeStub.executeQuery(tenantId, sql)

  return c.json(result)
})
```

### SharedComputeDO

```typescript
export class SharedComputeDO {
  private pg: PGlite | null = null
  private lastActivity = 0
  private requestCount = 0

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    switch (url.pathname) {
      case '/execute':
        return this.handleExecute(request)
      case '/status':
        return this.handleStatus()
      case '/keep-warm':
        return this.handleKeepWarm()
      default:
        return new Response('Not Found', { status: 404 })
    }
  }

  async alarm(): Promise<void> {
    // Keep PGLite warm
    await this.ensurePGLite()
    await this.pg!.query('SELECT 1')

    // Schedule next alarm
    await this.state.storage.setAlarm(Date.now() + 30_000)
  }

  private async ensurePGLite(): Promise<PGlite> {
    if (!this.pg) {
      this.pg = await PGlite.create({
        wasmModule: PGLITE_WASM,
        fsBundle: PGLITE_DATA,
      })
    }
    return this.pg
  }

  private async handleExecute(request: Request): Promise<Response> {
    this.lastActivity = Date.now()
    this.requestCount++

    const { tenantId, sql, params } = await request.json<{
      tenantId: string
      sql: string
      params?: unknown[]
    }>()

    const start = performance.now()
    const pg = await this.ensurePGLite()
    const initMs = performance.now() - start

    const queryStart = performance.now()
    const result = await pg.query(sql, params)
    const queryMs = performance.now() - queryStart

    return new Response(JSON.stringify({
      success: true,
      result,
      timings: { initMs, queryMs },
      doInfo: {
        requestCount: this.requestCount,
        instanceAge: Date.now() - this.state.id.toString(), // approximate
      }
    }))
  }

  private async handleKeepWarm(): Promise<Response> {
    const start = performance.now()
    await this.ensurePGLite()
    await this.pg!.query('SELECT 1')

    return new Response(JSON.stringify({
      success: true,
      warmTimeMs: performance.now() - start,
      requestCount: this.requestCount,
    }))
  }

  private handleStatus(): Response {
    return new Response(JSON.stringify({
      initialized: this.pg !== null,
      lastActivity: this.lastActivity,
      requestCount: this.requestCount,
    }))
  }
}
```

### Pool Initialization Worker

A scheduled worker to initialize all pool members on deployment:

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const initPromises: Promise<void>[] = []

    for (const config of POOL_CONFIGS) {
      for (let i = 0; i < config.poolSize; i++) {
        const doId = env.SHARED_COMPUTE.idFromName(
          `shared-compute-${config.region}-${i}`
        )
        const stub = env.SHARED_COMPUTE.get(doId, {
          locationHint: config.region
        })

        initPromises.push(
          stub.fetch('https://internal/keep-warm', { method: 'POST' })
            .then(() => console.log(`Warmed ${config.region}-${i}`))
            .catch(err => console.error(`Failed to warm ${config.region}-${i}:`, err))
        )
      }
    }

    await Promise.all(initPromises)
  }
}
```

## Cost Analysis

### Keep-Warm Strategy Costs

Assuming 21 SharedComputeDOs with 30-second alarm intervals:

```
Per DO per month:
- Alarms: (60/30) * 60 * 24 * 30 = 86,400 alarms
- Each alarm = 1 row write = $1.00/million writes
- Cost per DO: 86,400 / 1,000,000 * $1.00 = $0.086/month

Total alarm writes: 21 DOs * 86,400 = 1,814,400/month
Cost: $1.81/month for alarm writes
```

### Request Costs

```
Per DO request: $0.15/million
Duration: $12.50/million GB-seconds

Assuming 10,000 requests/day across all pools:
- Requests: 10,000 * 30 = 300,000/month = $0.045
- Duration: ~1GB-second per request (128MB * ~8s avg)
  = 300,000 GB-s = $3.75/month
```

### Storage Costs

Each SharedComputeDO with PGLite data:
- Initial WASM memory: ~15MB
- Runtime growth: ~64MB
- No persistent storage needed (stateless compute)

### Total Monthly Cost Estimate

| Component | Cost |
|-----------|------|
| Alarm writes | $1.81 |
| Request fees | $0.05 |
| Duration | $3.75 |
| **Total** | **~$5.61/month** |

This is **minimal** compared to the cold start savings for a production workload.

## Latency Expectations

### Best Case: Same-Colo SharedComputeDO

```
User Request
  |
  v
Router Worker (1-5ms)
  |
  v
SharedComputeDO (same colo)
  - DO stub creation: 0ms
  - PGLite warm: 0ms
  - Query execution: 5-20ms
  |
  v
Total: 10-30ms
```

### Typical Case: Regional SharedComputeDO

```
User Request (from non-DO colo)
  |
  v
Router Worker (1-5ms)
  |
  v
SharedComputeDO (nearest DO-capable colo)
  - Cross-colo latency: 10-50ms
  - PGLite warm: 0ms
  - Query execution: 5-20ms
  |
  v
Total: 20-80ms
```

### Worst Case: Cold SharedComputeDO

```
User Request
  |
  v
Router Worker (1-5ms)
  |
  v
SharedComputeDO (cold - alarm failed or first request)
  - DO instantiation: 10-50ms
  - PGLite WASM init: 2000-3000ms
  - Query execution: 5-20ms
  |
  v
Total: 2500-3500ms
```

With keep-warm alarms, worst case should be rare (<1% of requests).

## Comparison: Per-Colo Pool vs Single Compute Worker

| Metric | Single Compute Worker | Per-Colo DO Pool |
|--------|----------------------|------------------|
| Warm hit rate (cross-tenant) | ~15% | ~99% (with alarms) |
| Cold start latency | ~2.8s | ~2.8s (when cold) |
| Warm latency | ~100ms | ~20-50ms |
| RPC overhead | ~20ms (service binding) | ~5ms (DO-to-DO same colo) |
| Predictability | Low (isolate routing) | High (deterministic IDs) |
| Monthly cost | ~$5/month | ~$5.61/month |
| Complexity | Simple | Moderate |
| Geographic coverage | Single region | Multi-region |

### Key Advantages of Per-Colo Pool

1. **Deterministic routing**: DO IDs guarantee you hit the same warm instance
2. **Regional distribution**: Users worldwide get low-latency access
3. **Better warm ratio**: Alarms keep DOs warm, unlike isolate pools
4. **Lower inter-component latency**: Same-colo DO-to-DO is faster than Worker-to-DO

### Key Disadvantages

1. **Complexity**: More infrastructure to manage
2. **Region mapping**: Need to maintain colo-to-region mapping
3. **Pool sizing**: Need to tune pool sizes per region
4. **DO limitations**: Only ~29 colos support DOs (11.55% of PoPs)

## Open Questions

### 1. How do we handle DO eviction during keep-warm?

If a SharedComputeDO is evicted between alarm fires, the next request will hit a cold DO. Options:
- Accept occasional cold starts (~1-2% of requests)
- Use shorter alarm intervals (15s instead of 30s)
- Implement redundancy within each pool

### 2. What if locationHint doesn't work as expected?

Location hints are "best effort." If a DO ends up in a different colo than hinted:
- The first request will be slower (cross-colo)
- Subsequent requests benefit from warm cache
- Monitor DO locations via `/cdn-cgi/trace` or similar

### 3. How do we monitor pool health?

Implement a health check endpoint that reports:
- DO location (actual colo)
- PGLite initialization status
- Request count and latency percentiles
- Time since last activity

### 4. Should TenantDOs also use locationHint?

For best performance, TenantDOs should be in the same colo as their SharedComputeDO:
```typescript
const tenantDoId = env.TENANT.idFromName(tenantId)
const tenantStub = env.TENANT.get(tenantDoId, { locationHint: region })
```

This ensures minimal latency for DO-to-DO communication.

## Recommendations

### Phase 1: Proof of Concept

1. Implement SharedComputeDO with PGLite
2. Deploy to 3 regions: enam, weur, apac
3. Pool size: 2 per region (6 total)
4. Measure latency and warm hit rate

### Phase 2: Production Rollout

1. Expand to all 6 regions
2. Dynamic pool sizing based on traffic
3. Implement health monitoring
4. Add fallback to cold TenantDO execution

### Phase 3: Optimization

1. Analyze actual colo distribution of traffic
2. Tune pool sizes per region
3. Consider sticky routing per tenant
4. Evaluate hybrid approach (SharedComputeDO for read-heavy, TenantDO for write-heavy)

## Conclusion

The per-colo shared DO pool architecture offers significant advantages over the single compute worker approach:

- **99%+ warm hit rate** vs ~15% with service bindings
- **Deterministic routing** via DO IDs
- **Multi-region coverage** with low latency globally
- **Minimal additional cost** (~$5.61/month)

The main trade-off is increased complexity in managing the pool infrastructure. However, for a production service like postgres.do, this complexity is justified by the dramatic improvement in cold start reduction and latency consistency.

---

## References

- [Cloudflare Durable Objects - Data Location](https://developers.cloudflare.com/durable-objects/reference/data-location/)
- [Cloudflare Durable Objects - Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)
- [Cloudflare Durable Objects - Namespace API](https://developers.cloudflare.com/durable-objects/api/namespace/)
- [Cloudflare Durable Objects - Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Where Durable Objects Live](https://where.durableobjects.live/)
- [Zero-latency SQLite in Durable Objects](https://blog.cloudflare.com/sqlite-in-durable-objects/)
- [Cloudflare Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement/)
- [Compute Worker POC Results](../README.md)
