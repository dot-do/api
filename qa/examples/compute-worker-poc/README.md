# Compute Worker POC: Stateful DO + Stateless Compute Worker

## TL;DR - Key Multi-Tenant Findings

The hypothesis that "shared compute workers stay warm from aggregate traffic" is **only partially supported**:

| Test | Finding |
|------|---------|
| Same-tenant repeat request | **100% warm** (supports hypothesis) |
| Cross-tenant after warmup | **15% warm** (limited by isolate routing) |
| Cold start comparison | New arch is **~700ms slower** |
| RPC overhead | **~40ms** per request |

**Conclusion**: The multi-tenant benefit is limited because Cloudflare routes service binding requests to different worker isolates. The new architecture is **NOT recommended** for most cases due to slower cold starts and RPC overhead. It may be useful for same-tenant high-volume scenarios or memory-constrained DOs.

---

This POC tests a new architecture pattern for running PGLite in Cloudflare Workers:

```
Client -> Router Worker -> DO (state only, NO WASM) -> Compute Worker (WASM) via RPC -> DO persists -> Response
```

## The Problem

Traditional architecture puts PGLite WASM inside the Durable Object:
- **Cold start**: ~1-3 seconds (WASM loading + PostgreSQL initialization)
- **Hot query**: Fast (~5-20ms)

The problem: Cold starts are slow. Every new DO instance must load and initialize WASM.

## The Solution

Separate state from compute:
- **State DO**: Owns persistence (DO SQLite), instant cold start (~10-50ms)
- **Compute Worker**: Holds PGLite WASM, stays warm in Cloudflare's pool

The insight: Cloudflare keeps Workers warm in a pool. The Compute Worker stays warm and ready, while DOs can cold-start instantly without WASM.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEW ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐                │
│  │ Client  │───>│ Router       │───>│ State DO        │                │
│  └─────────┘    │ Worker       │    │ (NO WASM)       │                │
│                 └──────────────┘    │ - Instant start │                │
│                                     │ - DO SQLite     │                │
│                                     └────────┬────────┘                │
│                                              │                         │
│                                     RPC via  │ Service                 │
│                                     Binding  │                         │
│                                              ▼                         │
│                                     ┌─────────────────┐                │
│                                     │ Compute Worker  │                │
│                                     │ (WASM)          │                │
│                                     │ - PGLite        │                │
│                                     │ - Stays warm    │                │
│                                     └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      TRADITIONAL ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐                │
│  │ Client  │───>│ Router       │───>│ Traditional DO  │                │
│  └─────────┘    │ Worker       │    │ (WASM inside)   │                │
│                 └──────────────┘    │ - Slow cold     │                │
│                                     │   start (~1-3s) │                │
│                                     │ - Fast hot      │                │
│                                     │   queries       │                │
│                                     └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Files

```
compute-worker-poc/
├── wrangler.router.toml      # Router worker config
├── wrangler.compute.toml     # Compute worker config (WASM)
├── wrangler.state.toml       # State DO config (no WASM)
├── wrangler.traditional.toml # Traditional DO config (baseline)
├── package.json
├── tsconfig.json
├── src/
│   ├── router-worker.ts      # Routes requests, benchmark endpoints
│   ├── compute-worker.ts     # PGLite WASM, RPC endpoints
│   ├── state-do.ts           # Stateful DO, no WASM
│   ├── traditional-do.ts     # Traditional DO with WASM
│   ├── pglite-local.ts       # PGLite implementation
│   └── shared/
│       ├── types.ts          # Shared types
│       └── timing.ts         # Timing utilities
├── scripts/
│   └── benchmark.mjs         # Benchmark script
└── README.md
```

## Deployment

Deploy workers in order (Compute Worker must exist before State DO):

```bash
# Install dependencies
pnpm install

# Deploy all workers
npm run deploy:all

# Or deploy individually
npm run deploy:compute      # First: Compute Worker
npm run deploy:state        # Second: State DO (depends on Compute)
npm run deploy:traditional  # Third: Traditional DO
npm run deploy:router       # Last: Router (depends on all)
```

## Benchmarks

### Run Benchmarks

```bash
# Run full benchmark suite
npm run benchmark

# Or use the deployed router directly
curl -X POST https://compute-worker-poc-router.dotdo.workers.dev/benchmark/compare \
  -H "Content-Type: application/json" \
  -d '{"iterations": 5}'
```

### Benchmark Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /benchmark/cold-start` | Compare cold start times (forces new DO instances) |
| `POST /benchmark/hot-query` | Compare hot query latency |
| `POST /benchmark/write` | Compare write path performance |
| `POST /benchmark/compare` | Run comprehensive comparison |

### Direct Access Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /new/status` | State DO status |
| `POST /new/query` | Query via new architecture |
| `POST /new/timing` | Query with detailed timings |
| `GET /traditional/status` | Traditional DO status |
| `POST /traditional/query` | Query via traditional architecture |
| `GET /compute/status` | Compute Worker status |

## Multi-Tenant Testing

The key hypothesis is that a **shared compute worker pool stays warm** because it aggregates traffic from many DOs, while traditional architecture has O(N) cold start problems.

### The Multi-Tenant Problem

In a multi-tenant service like postgres.do:
- **Traditional**: Each tenant's DO loads its own WASM (cold start per tenant = O(N) cold starts)
- **New Architecture**: Shared compute worker serves ALL tenants -> stays warm from aggregate traffic

### Multi-Tenant Benchmark Scenarios

#### Scenario A: Burst Traffic
- 100 unique tenants
- Each makes 1 request in quick succession
- Measures: How many cold starts in each architecture?

#### Scenario B: Sustained Traffic
- 50 unique tenants
- Requests spread over 2 minutes (realistic traffic pattern)
- Measures: Cold start rate over time

#### Scenario C: Sparse Traffic with Keep-Warm
- 20 unique tenants
- Requests every 30 seconds (sparse)
- Keep-warm signal to compute worker every 10 seconds
- Measures: Does the alarm strategy work?

### Running Multi-Tenant Benchmarks

```bash
# Run all scenarios
npm run benchmark:multi-tenant

# Run individual scenarios
npm run benchmark:burst      # Scenario A
npm run benchmark:sustained  # Scenario B
npm run benchmark:sparse     # Scenario C
```

### Multi-Tenant Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /multi-tenant/new/:tenantId/query` | Query via new architecture for specific tenant |
| `POST /multi-tenant/traditional/:tenantId/query` | Query via traditional architecture for specific tenant |
| `POST /benchmark/multi-tenant/burst` | Run burst test with N tenants |
| `POST /compute/keep-warm` | Trigger keep-warm request to compute worker |

### Actual Benchmark Results (Production)

From real production benchmarks on Cloudflare Workers:

| Scenario | Traditional Cold Starts | New Arch Cold Starts | Compute Worker Warm Hits |
|----------|------------------------|---------------------|--------------------------|
| Burst (100 tenants) | 100 (100%) | 100 (100%) | 7 (7%) |
| Cross-Tenant Warm | 20/20 | 20/20 | 3/20 (15%) |
| Second Request Warm | N/A | N/A | 20/20 (100%) |

**Key Finding**: Service bindings route to different worker isolates, so warming one isolate doesn't guarantee subsequent requests hit the same warm isolate. **However, the SAME tenant's second request ALWAYS hits warm (20/20)**.

### What the Data Shows

1. **Same-tenant second request**: 100% warm hits (110ms vs 2889ms cold start)
2. **Cross-tenant after warmup**: Only ~15% warm hits (Cloudflare isolate routing)
3. **Burst cold starts**: Both architectures have similar cold start rates

### The Real Trade-off

| Metric | New Architecture | Traditional |
|--------|------------------|-------------|
| Cold start (first request) | ~2900ms | ~2150ms |
| Warm request (same tenant) | ~110ms | ~70ms |
| RPC overhead (warm) | ~40ms | 0ms |
| Compute Worker warm hit rate | ~15% (cross-tenant) | N/A |

### Why This Matters

The multi-tenant advantage is **LIMITED by Cloudflare's isolate routing**:
- Warming a compute worker doesn't guarantee other requests hit that isolate
- The benefit is primarily for **same-tenant subsequent requests**
- Cross-tenant warm sharing only works ~15% of the time

However, there ARE still benefits:
1. **Same-tenant warm path**: Subsequent requests from same tenant are fast
2. **Memory isolation**: DO memory stays small (no WASM), compute worker has more headroom
3. **Higher traffic** eventually leads to more warm isolates in the pool

## Actual Results (Production Benchmarks)

### Cold Start

| Architecture | Avg Time | Min | Max | Notes |
|-------------|----------|-----|-----|-------|
| New (DO + Worker) | ~2.8s | 2.3s | 3.5s | Depends on Compute Worker warmth |
| Traditional | ~2.9s | 2.2s | 3.5s | WASM init inside DO |

**Key Finding**: Cold start times are similar because BOTH architectures need to initialize PGLite WASM. The Compute Worker may hit a cold isolate.

### Hot Query

| Architecture | Avg Time | Min | P50 | P95 | Notes |
|-------------|----------|-----|-----|-----|-------|
| New (DO + Worker) | ~97ms | 70ms | 81ms | 167ms | RPC overhead to Compute Worker |
| Traditional | ~78ms | 44ms | 57ms | 334ms | Direct execution |

**Key Finding**: ~19ms RPC overhead for the new architecture (DO -> Compute Worker -> DO).

### Trade-offs

**New Architecture Wins When:**
- Cold starts are frequent (multi-tenant, many DOs)
- DO count is high (each DO would need WASM)
- Cold start latency matters more than hot query latency

**Traditional Architecture Wins When:**
- Single long-lived DO
- Hot query latency is critical
- Cold starts are rare (DO stays warm)

## Key Questions Answered

### 1. How much faster is cold start without WASM in DO?

**Actual Result**: Similar cold start times (~2.8s vs ~2.9s)

The State DO itself is instant (~17ms startup), BUT:
- The Compute Worker still needs to initialize PGLite WASM
- Each new Compute Worker isolate requires WASM initialization
- Cloudflare's service binding may route to a cold isolate

**The hypothesis was partially wrong**: Moving WASM out of the DO doesn't eliminate cold starts - it moves them to the Compute Worker.

### 2. What's the RPC overhead for hot queries?

**Actual Result**: ~19-22ms overhead

The new architecture adds a network hop:
- DO -> Compute Worker (service binding)
- Compute Worker -> DO (response)

This is the "tax" you pay for the architecture separation.

### 3. Is the trade-off worth it?

**In the current implementation, no.** The new architecture:
- Does NOT significantly improve cold starts (WASM still needs to init somewhere)
- ADDS ~20ms latency to every request

**However, there may be scenarios where this pattern helps:**

1. **Pre-warmed Compute Pool**: If you can keep Compute Workers warm with synthetic traffic
2. **Memory Pressure**: DOs have tighter memory limits than Workers
3. **Isolation**: Separate security domains for compute vs. state
4. **Horizontal Scaling**: Multiple Compute Workers can serve many DOs

## Design Notes

### Why Service Bindings?

Service bindings provide low-latency RPC between Workers:
- Same datacenter routing
- No external network hop
- Type-safe interface possible

### Why DO SQLite for State?

DO SQLite provides:
- Synchronous access (fast)
- Automatic persistence
- Transactional guarantees
- No external dependencies

### What About Transactions?

For this POC, each query is independent. For real transactions:
- Option 1: Compute Worker handles transaction, returns changeset
- Option 2: State DO batches mutations, applies atomically
- Option 3: Use DO SQLite for actual writes, Compute Worker for reads/computation

### Future Optimizations

1. **Connection Pooling**: Multiple Compute Worker instances for parallel queries
2. **Query Caching**: Cache common queries in State DO
3. **Schema Sync**: Sync schema between DO SQLite and PGLite
4. **Streaming**: Stream large results instead of buffering

## Lessons Learned

### The Compute Worker Doesn't Eliminate Cold Starts

The original hypothesis was that keeping WASM in a separate Worker would eliminate DO cold starts. This is **partially true** - the DO itself starts instantly (~17ms) - but the overall request still needs to wait for PGLite initialization in the Compute Worker.

### Service Bindings Don't Share Warm State

When a DO calls the Compute Worker via service binding, Cloudflare may route to:
- A warm isolate with PGLite already initialized (fast)
- A cold isolate that needs to initialize PGLite (slow)

This means **each request path can hit different isolates**.

### Memory Isolation May Be Valuable

While cold starts aren't faster, there are potential benefits:

1. **DO Memory Limits**: DOs have 128MB limit. Workers may have more headroom.
2. **DO Pricing**: DO usage is metered differently than Worker usage.
3. **Isolation**: Compute failures don't crash the DO.

### When This Pattern Makes Sense

1. **Pre-warmed Compute Pool**: Use scheduled Workers to keep Compute Workers warm
2. **Read Replicas**: DOs own writes, Workers serve reads from cached state
3. **Heavy Computation**: Complex queries run on dedicated compute workers
4. **Multi-tenant**: Many DOs share a pool of compute workers

### Alternative Approaches to Explore

1. **Worker with Durable Object Storage Only**: Skip the DO-to-Worker RPC, use DO just for storage
2. **PGLite in Memory + DO for WAL**: Stream WAL entries to DO for durability
3. **Hybrid**: First request initializes WASM in DO, subsequent use Worker pool

## Multi-Tenant Architecture Recommendations

Based on multi-tenant benchmark testing, here are our **revised** recommendations:

### Critical Finding: Isolate Routing Limits Cross-Tenant Benefits

Cloudflare's service binding routes requests to **different worker isolates**. This means:
- Warming one isolate doesn't guarantee other requests hit that isolate
- Cross-tenant warm sharing only works ~15% of the time
- The "shared warm pool" hypothesis is only partially supported

### When New Architecture Wins

1. **High same-tenant request volume** - subsequent requests to same tenant are fast
2. **Memory-constrained DOs** - keep WASM out of DO to reduce memory pressure
3. **Large number of tenants with repeat traffic** - eventually warms multiple isolates
4. **Compute isolation** - separate compute failures from state persistence

### When Traditional Architecture Wins (Recommended for Most Cases)

1. **Cold start latency matters** - traditional is ~700ms faster on cold starts
2. **Hot path latency matters** - ~40ms less overhead per request
3. **Simple deployments** - no service binding complexity
4. **First request matters** - every tenant's first request has similar cold start

### Keep-Warm Strategy (Limited Effectiveness)

Keep-warm helps but doesn't guarantee warm hits for other tenants:

```javascript
// Only warms ONE isolate - other requests may hit different isolates
export default {
  async scheduled(event, env, ctx) {
    // This keeps ONE isolate warm, not all of them
    await fetch('https://compute-worker/keep-warm', { method: 'POST' })
  }
}
```

**Better strategy**: Accept that first request per tenant will be slow, optimize the warm path.

### Key Metrics from Real Benchmarks

| Metric | Measured Value | Notes |
|--------|----------------|-------|
| Compute Worker warm hit rate (cross-tenant) | ~15% | Low due to isolate routing |
| Compute Worker warm hit rate (same-tenant) | 100% | Always warm |
| Cold start (new arch) | ~2900ms | Includes State DO + Compute Worker |
| Cold start (traditional) | ~2150ms | Just the DO with WASM |
| Warm request (new arch) | ~110ms | RPC overhead included |
| Warm request (traditional) | ~70ms | Direct execution |
| RPC overhead | ~40ms | Service binding cost |

### Recommendation for postgres.do

Given the benchmark results, we recommend:

1. **Start with Traditional Architecture** for simplicity
2. **Monitor cold start rates** in production
3. **Consider New Architecture** only if:
   - DO memory limits become a problem
   - Same-tenant request volume is high (benefits from warm compute)
   - You need compute isolation from state

### Production Deployment Checklist

- [ ] Deploy compute worker first (others depend on it)
- [ ] Monitor compute worker warm hit rate
- [ ] Track cold start latency per tenant
- [ ] Configure appropriate memory limits
- [ ] Evaluate based on actual traffic patterns (not theoretical benefits)

---

## Answering the Key Question

> **In a multi-tenant service with N tenants, does the shared compute pool eliminate the O(N) cold start problem?**

**Answer: No, not as originally hypothesized.**

### Why Not?

1. **Cloudflare Isolate Routing**: Service bindings don't guarantee requests hit the same worker isolate. Warming one isolate (~15% chance of subsequent requests hitting it) doesn't warm the entire pool.

2. **Cold Start Comparison**: The new architecture actually has **slower** cold starts (~2900ms vs ~2150ms) because it cold-starts BOTH the State DO AND potentially a cold Compute Worker isolate.

3. **RPC Overhead**: Every request pays ~40ms RPC overhead, regardless of warm/cold state.

### What DOES Work

1. **Same-Tenant Warm Path**: Subsequent requests from the **same tenant** (same DO) consistently hit warm compute worker (100% of the time in our tests). This is the real benefit.

2. **Memory Isolation**: Keeping WASM out of DOs reduces DO memory footprint.

3. **High-Volume Traffic**: At very high traffic levels, more isolates stay warm, improving the cross-tenant warm hit rate.

### Is the ~20ms RPC Overhead Worth It?

**No, for most cases.**

- The cold start savings don't materialize (new arch is actually slower)
- Cross-tenant warm sharing only works ~15% of the time
- Traditional architecture is simpler and faster

**Maybe, in specific scenarios:**

- Same-tenant high-volume traffic (warm path benefit)
- Memory-constrained DOs (WASM isolation)
- Need for compute isolation from state

### Final Recommendation

**Use traditional architecture (WASM in DO)** unless you have a specific reason to separate state and compute. The multi-tenant warm-sharing hypothesis is not supported by Cloudflare's current isolate routing behavior.

## License

MIT
