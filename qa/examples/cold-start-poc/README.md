# Cold Start POC - Service Bindings for PGLite

This POC explores reducing PGLite cold start times from 1-4 seconds to near 0 using Cloudflare service bindings and shared infrastructure.

## The Problem

When a Durable Object is completely cold, it takes 1-4 seconds to:
1. Load the WASM module (~8.5MB)
2. Load the data bundle (~4.7MB)
3. Initialize PostgreSQL (initdb, backend startup)

This cold start penalty applies every time a DO is evicted and restarted.

## Approaches Being Tested

### 1. Factory Worker with Service Binding
A central worker pre-initializes PGLite and serves queries via service binding.

**Hypothesis**: If the factory worker stays warm, consumers can avoid cold starts by calling it.

**Reality Check**: Service bindings create separate isolates. WASM cannot be shared.

### 2. Factory DO Pattern
A Durable Object that caches initialized PGLite instances.

**Hypothesis**: A single warm DO can serve multiple tenants.

**Reality Check**: DO state is per-instance. Each DO has its own WASM heap.

### 3. Warm Proxy Worker (No DO)
Keep PGLite warm at the worker (module) level, bypassing DOs entirely.

**Hypothesis**: Workers stay warm longer than DOs due to more traffic.

**Best for**: Read-heavy workloads that don't need persistence.

**Tradeoffs**:
- No persistence (state lost on worker restart)
- Per-isolate (not shared across colos)
- Not suitable for writes requiring durability

### 4. Eager Initialization
Start WASM loading in DO constructor (don't block constructor).

**This is already implemented** in the current codebase.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    Service    ┌─────────────────────────┐  │
│  │ Consumer Worker │───Binding────▶│    Factory Worker       │  │
│  │                 │               │   (Always Warm)         │  │
│  └────────┬────────┘               │                         │  │
│           │                        │  ┌─────────────────┐    │  │
│           │ DO RPC                 │  │ Factory DO      │    │  │
│           │                        │  │ (Warm PGLite)   │    │  │
│           ▼                        │  └─────────────────┘    │  │
│  ┌─────────────────┐               └─────────────────────────┘  │
│  │  Consumer DO    │                                            │
│  │  (Own PGLite)   │               ┌─────────────────────────┐  │
│  └─────────────────┘               │   Warm Proxy Worker     │  │
│                                    │   (Worker-level PGLite) │  │
│                                    │   No DO - fastest       │  │
│                                    └─────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment

```bash
# Install dependencies
pnpm install

# Deploy all workers
npm run deploy:all

# Or deploy individually
npm run deploy:factory
npm run deploy:consumer
npm run deploy:warm-proxy
```

## Endpoints

### Factory Worker (`cold-start-factory.dotdo.workers.dev`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/ping` | GET | Health check |
| `/status` | GET | Factory status |
| `/warmup` | POST | Trigger warmup |
| `/query` | POST | Execute query |
| `/timing` | POST | Query with detailed timings |
| `/cold-start` | POST | Force cold start (new DO) |

### Consumer Worker (`cold-start-consumer.dotdo.workers.dev`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/direct` | POST | Query via consumer's own DO |
| `/factory` | POST | Query via factory service binding |
| `/compare` | POST | Run both and compare timings |
| `/cold-direct` | POST | Force cold start (new consumer DO) |
| `/cold-factory` | POST | Force cold start via factory |

### Warm Proxy Worker (`cold-start-warm-proxy.dotdo.workers.dev`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/ping` | GET | Health check |
| `/status` | GET | Worker and PGLite status |
| `/query` | POST | Execute query (worker-level PGLite) |
| `/timing` | POST | Query with detailed timings |

## Benchmarking

```bash
# Run comprehensive benchmark
npm run benchmark

# With custom URLs
FACTORY_URL=https://... CONSUMER_URL=https://... npm run benchmark
```

## Actual Results (Production Measurements)

### Cold Start Times

| Approach | Time | Notes |
|----------|------|-------|
| Factory DO (new instance) | 3.38s | Creates new unique DO |
| Consumer DO (direct cold) | 3.52s | Baseline cold start |
| Warm Proxy (first request) | 3.37s | Worker-level cold start |
| **Warm Proxy (subsequent)** | **0.37s** | **~9x faster when warm** |

### Warm Query Times

When all instances are warm, latencies are similar:

| Mode | Average | Range |
|------|---------|-------|
| Factory DO | ~310ms | 260-320ms |
| Consumer DO | ~330ms | 180-460ms |
| Warm Proxy | ~300ms | 240-400ms |

Note: Network latency from client to Cloudflare edge accounts for ~200ms of this.

### Key Finding: Warm Factory vs Cold Consumer

When factory is warm and consumer is cold:
- **Factory via service binding**: 418ms
- **Consumer direct (cold)**: 2964ms
- **Improvement**: 85.9% faster

This demonstrates the value of keeping a central DO warm to serve multiple cold consumers.

## Key Findings

### Service Bindings Do NOT Share WASM

- Each service binding call creates a new isolate
- WASM modules are compiled per-isolate
- You cannot "share" a warm PGLite instance across workers

### DO Instances Cannot Share State

- Each DO has its own memory space
- WASM heap is tied to the DO instance
- No way to transfer initialized state between DOs

### What Actually Helps

1. **Eager Initialization**: Start WASM loading in constructor
2. **Keep DOs Warm**: Regular traffic prevents eviction
3. **Worker-Level Caching**: For stateless reads, skip the DO entirely
4. **Smaller WASM**: Use pglite-tiny for memory-constrained scenarios

### Potential Future Optimizations

1. **WASM Module Caching**: If Cloudflare adds cross-isolate module sharing
2. **Hibernation Snapshots**: If we could snapshot and restore WASM state
3. **Lazy Extension Loading**: Load extensions only when needed
4. **Tiered Initialization**: Basic SQL first, full features later

## Files

| File | Description |
|------|-------------|
| `src/factory-worker.ts` | Factory worker with DO for warm pool |
| `src/factory-do.ts` | Factory DO with pre-warmed PGLite |
| `src/consumer-worker.ts` | Consumer using service bindings |
| `src/consumer-do.ts` | Consumer DO for baseline comparison |
| `src/warm-proxy-worker.ts` | Worker-level PGLite (no DO) |
| `src/pglite-local.ts` | PGLite implementation for Workers |
| `src/timing.ts` | Timing utilities |
| `scripts/benchmark.mjs` | Benchmark runner |

## Conclusions

### What Works

1. **Warm Proxy Pattern**: A stateless worker that keeps PGLite warm can serve queries in ~300ms vs ~3.3s for cold starts (9x improvement).

2. **Shared Factory DO**: A single warm factory DO can serve multiple consumers faster than each consumer having its own cold DO (85% faster in testing).

3. **Eager Initialization**: Starting WASM loading in the DO constructor helps, but the full initialization still takes ~3s.

### What Doesn't Work

1. **Service Bindings Don't Share WASM**: Each isolate has its own WASM instance. Service bindings just route requests, they don't share memory.

2. **DOs Get Evicted Quickly**: Even with traffic, DOs can be evicted and relocated. You can't guarantee a DO stays warm.

3. **Global Scope Limitations**: Can't start async operations (like WASM loading) in global scope in Workers.

### Recommendations

1. **For read-heavy workloads**: Use the warm proxy pattern (no DO). Accept that state won't persist.

2. **For multi-tenant scenarios**: Route through a shared "read replica" DO that stays warm with synthetic traffic.

3. **For individual tenant isolation**: Accept cold start penalty or implement progressive loading (show loading state, then results).

4. **Future**: Monitor Cloudflare announcements for cross-isolate WASM sharing or hibernation snapshots.
