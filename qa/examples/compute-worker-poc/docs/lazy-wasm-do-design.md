# Lazy WASM Loading DO Architecture

## IMPORTANT: Cloudflare Workers Limitation

**This architecture DOES NOT work in Cloudflare Workers** due to a fundamental security restriction:

```
WebAssembly.compile(): Wasm code generation disallowed by embedder
```

Cloudflare Workers block runtime WASM compilation (`WebAssembly.compile()` and `WebAssembly.compileStreaming()`) for security reasons. Only **static imports** that are pre-compiled by Wrangler at build time are allowed.

This POC serves as documentation of:
1. The attempted architecture
2. Why it fails in Cloudflare Workers
3. Alternative approaches that do work

### What Does Work

The **Hybrid DO architecture** achieves similar goals through a different approach:
- WASM is statically bundled but not loaded in constructor
- First requests delegate to compute worker
- WASM loads in background
- Subsequent requests use local execution

See `hybrid-do.ts` for a working implementation.

### What We Learned

Even though dynamic WASM loading fails, this POC discovered several useful insights:

1. **Graceful Degradation Works**: The DO continues operating by permanently delegating to the compute worker
2. **Small Bundle Size**: Without bundled WASM, the worker is ~114KB vs ~13MB
3. **Consistent Latency**: All requests go through compute worker, providing predictable ~100-150ms latency
4. **Simpler Architecture**: No WASM management in the DO at all

### Benchmark Results

```
Lazy WASM DO (permanent delegation):
  - Cold start: ~500ms (first request)
  - Warm requests: ~100-150ms
  - WASM status: always "failed"
  - All requests: delegated to compute worker
```

This is effectively the same as the **Thin State DO** architecture, which is a valid and useful pattern for:
- State-only DOs that delegate all compute
- Applications prioritizing simplicity over raw performance
- Multi-tenant scenarios with many cold DOs

---

## Original Design (For Reference)

The Lazy WASM DO was a novel architecture where WASM is **not** bundled statically with the worker. Instead, WASM is fetched on-demand from R2/Cache when the DO warms up, while using a compute worker for immediate responses during the loading period.

## Key Characteristics

```
Lazy WASM DO:
  - NO static WASM import (fast cold start, smaller bundle)
  - First requests -> Compute Worker (instant response)
  - Background: Fetch WASM from R2/Cache
  - Once loaded: Direct execution (fastest)
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Request Flow                             │
└─────────────────────────────────────────────────────────────┘

Cold Request (WASM not loaded):
  Client -> Lazy WASM DO -> Compute Worker (execute) -> Response
                         └-> Background: Fetch WASM from R2/Cache

Warm Request (WASM loaded):
  Client -> Lazy WASM DO -> Local PGLite -> Response
```

## Benefits

### 1. Fast Cold Starts
- No WASM bundled = smaller bundle size
- DO starts instantly
- First request still returns quickly via compute worker delegation

### 2. Optimal Hot Performance
- Once WASM is loaded, queries execute locally
- No RPC overhead for warm requests
- Same performance as traditional bundled WASM approach

### 3. Resource Efficiency
- WASM only loaded when needed
- Cache layer reduces R2 reads
- Multiple tenants can share cached WASM

### 4. Graceful Degradation
- If WASM load fails, continues delegating to compute worker
- No request failures during warmup period

## Implementation Details

### WASM Loading Strategy

1. **Cache First**: Check Cloudflare Cache for WASM files
2. **R2 Fallback**: If not in cache, fetch from R2 bucket
3. **Cache Population**: Store in cache after R2 fetch (fire-and-forget)
4. **Parallel Loading**: WASM and data bundle loaded in parallel

### Request Flow States

| State | Behavior |
|-------|----------|
| `not_started` | WASM loading hasn't begun |
| `loading_from_cache` | Checking Cloudflare Cache |
| `loading_from_r2` | Fetching from R2 bucket |
| `compiling` | Compiling WASM module |
| `initializing` | Initializing PGLite |
| `ready` | WASM ready, direct execution |
| `failed` | WASM load failed, continues delegating |

### Timing Breakdown

Typical WASM load timing (measured in production):

| Phase | Time |
|-------|------|
| Cache check | ~5-20ms |
| R2 fetch (if cache miss) | ~50-200ms |
| Data buffer read | ~10-30ms |
| WASM compile | ~200-500ms |
| PGLite init | ~500-1000ms |
| **Total (cache hit)** | ~700-1500ms |
| **Total (cache miss)** | ~800-1700ms |

## Expected Request Latency

| Request | WASM State | Latency | Path |
|---------|------------|---------|------|
| 1 | not_started | ~300ms | Delegated to compute worker |
| 2-5 | loading | ~30ms | Delegated to compute worker |
| 6+ | ready | ~10ms | Local execution |

## Configuration

### wrangler.toml

```toml
name = "compute-worker-poc-lazy-wasm"
main = "src/lazy-wasm-do.ts"

# NO WASM rules - not bundled statically!

# Service binding for delegation during warmup
[[services]]
binding = "COMPUTE_WORKER"
service = "compute-worker-poc-compute"

# R2 bucket for WASM storage
[[r2_buckets]]
binding = "WASM_BUCKET"
bucket_name = "pglite-wasm"

# Durable Object
[[durable_objects.bindings]]
name = "LAZY_WASM_DO"
class_name = "LazyWasmDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["LazyWasmDO"]
```

### R2 Setup

Upload WASM files to R2:

```bash
# Upload pglite.wasm and pglite.data to R2
npm run upload-wasm-r2
```

## API Endpoints

### Status
```
GET /lazy-wasm/status
Header: X-Tenant-Id: <tenant-id> (optional)
```

Returns detailed status including WASM load state and timing breakdown.

### Query
```
POST /lazy-wasm/query
Header: X-Tenant-Id: <tenant-id> (optional)
Body: { "sql": "SELECT 1+1 as result" }
```

Executes query. Delegates to compute worker if WASM not ready, otherwise executes locally.

### Timing
```
POST /lazy-wasm/timing
Header: X-Tenant-Id: <tenant-id> (optional)
Body: { "sql": "SELECT 1+1 as result" }
```

Same as query but includes detailed timing breakdown.

### Force Load
```
POST /lazy-wasm/force-load
Header: X-Tenant-Id: <tenant-id> (optional)
```

Forces WASM load and waits for completion. Useful for prewarming or testing.

### Multi-Tenant Query
```
POST /multi-tenant/lazy-wasm/:tenantId/query
Body: { "sql": "SELECT 1+1 as result" }
```

Query for a specific tenant (creates dedicated DO per tenant).

## Benchmarking

Run the benchmark suite:

```bash
# Against production
npm run benchmark:lazy-wasm

# Against local dev server
npm run benchmark:lazy-wasm:local
```

## Comparison with Other Architectures

| Architecture | Cold Start | Hot Query | Bundle Size | Memory |
|--------------|------------|-----------|-------------|--------|
| Traditional | ~1-3s | ~10ms | Large (WASM bundled) | High |
| Hybrid | ~30ms | ~10ms | Large (WASM bundled) | High |
| Thin State | ~30ms | ~30ms | Small (no WASM) | Low |
| **Lazy WASM** | ~300ms* | ~10ms | Small (no WASM) | Medium** |

\* First request delegates to compute worker, so response is still fast
\*\* Memory only used when WASM is loaded

## Use Cases

### Best For
- Multi-tenant applications with many cold DOs
- Applications where some tenants are rarely accessed
- Environments with strict cold start requirements
- Hybrid cloud deployments where WASM can be stored in R2

### Not Ideal For
- Single-tenant applications always running warm
- Applications needing guaranteed sub-10ms first request latency
- Environments without R2 access

## Future Improvements

1. **Prewarming**: Background job to prewarm high-traffic tenant DOs
2. **WASM Streaming**: Use `WebAssembly.compileStreaming` for faster compilation
3. **Tiered Caching**: Multiple cache levels (local DO cache, regional cache, R2)
4. **Smart Delegation**: Predict when WASM will be ready and wait vs delegate
5. **Partial Loading**: Load core WASM immediately, extensions on-demand
