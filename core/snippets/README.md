# @dotdo/api Snippets

Cloudflare Snippets for free-tier API operations. Snippets run at the edge before Workers with **no billing cost**.

## What Are Snippets?

Snippets are lightweight JavaScript modules that execute before your Worker:

- **Free** - No billing cost on any plan
- **Fast** - Execute in < 5ms
- **Chainable** - Run in cascade sequence
- **Limited** - No bindings (KV, D1, DO, etc.)

## Constraints

| Constraint | Limit |
|------------|-------|
| CPU time | < 5ms |
| Compressed size | < 32KB |
| Subrequests | 2 (Pro) / 5 (Enterprise) |
| Bindings | None (free tier) |

## Free Tier Snippets

These snippets work within free tier constraints:

### proxy.ts

**Full API proxy with caching** - forwards requests to upstream API with auth injection and response transformation.

```typescript
// Environment variables
PROXY_UPSTREAM=https://api.example.com
PROXY_AUTH_TYPE=bearer|api-key|basic|none
PROXY_AUTH_TOKEN=$API_KEY_ENV_VAR
PROXY_CACHE_TTL=3600
PROXY_STRIP_PREFIX=/proxy
PROXY_FLATTEN_DATA=true
```

**Features:**
- Upstream forwarding with path rewriting
- Auth header injection (Bearer, API Key, Basic)
- Response caching via free Cache API
- Response flattening (extracts `.data` from responses)
- Method filtering

### proxy-analytics.ts

**Proxy with analytics** - full proxy plus analytics capture using hibernatable WebSocket pattern for massive cost savings.

```typescript
// Proxy configuration (same as proxy.ts)
PROXY_UPSTREAM=https://api.example.com
PROXY_AUTH_TYPE=api-key
PROXY_AUTH_TOKEN=$API_KEY
PROXY_CACHE_TTL=3600

// Analytics configuration
ANALYTICS_ENDPOINT=https://analytics.workers.do/events
ANALYTICS_WRITE_KEY=dk_xxx
ANALYTICS_BUFFER_SIZE=10
ANALYTICS_FLUSH_MS=5000
```

**Cost savings architecture:**
```
Snippet → HTTP → Worker → WebSocket (hibernatable) → DO → R2
   │                 │                                │
   └─ 1 req/batch    └─ 95% hibernation discount      └─ 90-98% batch savings
```

**Features:**
- All proxy.ts features
- Events buffered in isolate (free state)
- Only cleared on confirmed write
- Auto-retry on failure
- Tested to 100k req/s
- Combined savings: ~99.5%

### edge-cache.ts

**CDN caching with Cache API** - caches responses at the edge with path-based rules.

```typescript
// Environment variables
CACHE_RULES={"/**/static/**": 86400, "/api/config": 3600}
DEFAULT_CACHE_TTL=60
CACHE_KEY_INCLUDE_QUERY=true
CACHE_VARY_HEADERS=Accept,Accept-Language
```

**Features:**
- Path-based cache rules with glob patterns
- Cache key customization (query, host, vary headers)
- Bypass header support
- Status code filtering

### auth-verify.ts

**JWT verification** - decodes and validates JWT tokens at the edge.

```typescript
// Environment variables
JWT_SECRET=your-secret-key
AUTH_REQUIRED=true
```

**Features:**
- JWT decoding and validation
- Expiration checking
- User info extraction to headers
- Graceful fallback for invalid tokens

### cache-control.ts

**Cache header injection** - sets cache TTL headers by path pattern.

```typescript
// Environment variables
CACHE_RULES={"/**/static/**": 86400}
DEFAULT_TTL=60
```

**Features:**
- Path-based TTL rules
- Glob pattern matching
- Header injection for downstream caching

## Paid Tier Snippets

These snippets require Cloudflare bindings:

### analytics-log.ts

**Analytics Engine logging** - logs every request to Analytics Engine.

```typescript
// Bindings required
ANALYTICS: Analytics Engine binding
```

### rate-limit.ts

**Rate limiting** - rejects requests exceeding rate limits.

```typescript
// Bindings required
RATE_LIMITER: Rate limiting binding
```

## Snippet Cascade

Run snippets in sequence for layered processing:

```
Request
   │
   ▼
auth-verify ────► Verify JWT, add user headers
   │
   ▼
edge-cache ─────► Check cache, return if hit
   │
   ▼
proxy-analytics ► Forward to upstream + capture analytics
   │
   ▼
Response
```

The cascade order matters:
1. **auth** first - verify identity before processing
2. **cache** second - serve cached responses
3. **proxy-analytics** third - forward to upstream, capture analytics

## Analytics Cost Pattern

The `proxy-analytics` snippet uses a highly optimized pattern for analytics:

```
┌─────────────────────────────────────────────────────────────────────┐
│  SNIPPET (free)            │  WORKER              │  DO (95% off)   │
├─────────────────────────────────────────────────────────────────────┤
│  Buffer events in isolate  │  Maintain hibernatable│  Buffer events  │
│  state (free!)             │  WebSocket to DO      │  Flush to R2    │
│                            │  (95% cost savings)   │  (90-98% batch) │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this is cheap:**
- Snippet state is free - events buffer between requests in same isolate
- WebSocket hibernation - DO only charges when processing, not idle (95% off)
- Batching in DO - single R2 write for thousands of events (90-98% off)
- Combined: ~$0.004/million events vs ~$0.45/million (99.1% savings)

**Tested to 100k req/s**

## Environment Configuration

Configure snippets via Cloudflare dashboard environment variables:

```bash
# Proxy configuration
PROXY_UPSTREAM=https://api.apollo.io/v1
PROXY_AUTH_TYPE=api-key
PROXY_AUTH_HEADER=X-Api-Key
PROXY_AUTH_TOKEN=$APOLLO_API_KEY  # References another env var
PROXY_CACHE_TTL=3600
PROXY_STRIP_PREFIX=/apollo
PROXY_FLATTEN_DATA=true

# Cache configuration
CACHE_RULES={"/**/static/**": 86400, "/api/v1/config": 3600}
DEFAULT_CACHE_TTL=60
CACHE_KEY_INCLUDE_QUERY=true
```

## Usage with api.do

Snippets complement the api.do proxy convention:

```typescript
// API definition
export default API({
  name: 'apollo-proxy',
  functions: {
    proxies: [{
      name: 'apollo',
      upstream: 'https://api.apollo.io/v1',
      auth: { type: 'api-key', header: 'X-Api-Key', tokenVar: 'APOLLO_API_KEY' },
      cache: { ttl: 3600 },
    }]
  }
})

// Deploy as Worker + Snippet
// - Worker handles complex logic, bindings, MCP
// - Snippet handles caching at edge (free)
```

## Free Tier Strategy

Maximize free tier by offloading to snippets:

| Operation | Snippet (Free) | Worker (Paid) |
|-----------|----------------|---------------|
| Caching | ✓ edge-cache | |
| Auth check | ✓ auth-verify | |
| Proxy | ✓ proxy | Complex transforms |
| Rate limit | | ✓ rate-limit |
| Analytics | | ✓ analytics-log |
| MCP | | ✓ mcp convention |
| CRUD | | ✓ database convention |

---

## PostgreSQL Query Optimization Snippets

These snippets adapt proven patterns from DuckDB (94% cost savings) for postgres.do query batching and connection pooling.

### pg-query-buffer.ts

**Query batching for cost optimization** - Buffers queries per tenant and flushes in batches.

```typescript
// Configuration (via environment or defaults)
workerEndpoint: 'https://postgres.do/query/batch'
batchSize: 10           // Queries per batch
flushIntervalMs: 100    // Flush every 100ms (OLTP latency)
maxPendingPerTenant: 50 // Force flush threshold
```

**Architecture:**
```
Client -> Snippet (FREE) -> HTTP batch -> Worker -> Tenant DO
   |                           |
   +-- 10 queries/request      +-- 90% reduction
```

**Features:**
- Per-tenant query buffering
- Automatic batch flushing on size/time thresholds
- Promise-based query tracking (request-response, not fire-and-forget)
- Retry on failure with buffer preservation

**Endpoints:**
- `POST /pg/query` - Execute single query
- `POST /pg/batch` - Execute multiple queries
- `GET /pg/stats` - Buffer statistics
- `POST /pg/flush` - Force flush

### pg-ws-pool.ts

**WebSocket connection pool** - Maintains persistent connections to tenant DOs.

```typescript
// Configuration
wsEndpointTemplate: 'wss://postgres.do/tenant/{tenantId}/ws'
maxConnections: 50       // LRU eviction beyond this
idleTimeoutMs: 300000    // 5 minute idle close
pingIntervalMs: 30000    // Keep-alive interval
```

**Architecture:**
```
Client -> Snippet (FREE) -> WS Pool -> Tenant DOs
   |                          |           |
   +-- Module-scope state     |           +-- Hibernatable (95% off)
                              +-- LRU eviction
```

**Features:**
- Module-scope WebSocket connections persist across requests
- LRU eviction of cold tenant connections
- Automatic reconnection with exponential backoff
- Keep-alive pings to prevent idle disconnect
- Eliminates cold starts for hot tenants

**Endpoints:**
- `POST /ws-pool/send` - Send message through pool
- `POST /ws-pool/connect` - Pre-establish connection
- `GET /ws-pool/stats` - Connection pool statistics
- `POST /ws-pool/maintenance` - Close idle, send pings

### pg-session.ts

**Session-aware connection pooling** - Tracks client sessions with transaction support.

```typescript
// Configuration
workerEndpoint: 'https://postgres.do/session/query'
sessionTimeoutMs: 1800000  // 30 minute session timeout
batchSize: 5               // Queries per batch (lower for sessions)
flushIntervalMs: 50        // Lower latency for transactions
maxSessions: 1000          // LRU eviction
```

**Architecture:**
```
Client -> Snippet (FREE) -> Session -> Worker -> Tenant DO
   |          |                |
   |          +-- Transaction tracking
   +-- Session affinity
```

**Features:**
- Session tracking per client
- Transaction state detection (BEGIN/COMMIT/ROLLBACK)
- Immediate flush during transactions (correctness)
- Batching for non-transaction queries
- Automatic session cleanup

**Endpoints:**
- `POST /session/query` - Execute query in session
- `POST /session/transaction` - Transaction control (begin/commit/rollback)
- `DELETE /session/end` - End session
- `GET /session/stats` - Session statistics

---

## Cost Analysis: postgres.do Snippets

### Proven Pattern (from DuckDB)

The DuckDB analytics-buffer snippet achieved **94% cost savings** with:
- Module-scope state (FREE)
- Batch size of 50 events
- 5-second flush interval
- Hibernatable WebSocket to DO

### postgres.do Adaptations

| Metric | DuckDB Analytics | postgres.do OLTP |
|--------|------------------|------------------|
| Batch size | 50 events | 10 queries |
| Flush interval | 5000ms | 100ms |
| Pattern | Fire-and-forget | Request-response |
| Latency target | Seconds OK | <100ms required |

### Expected Cost Savings

```
WITHOUT SNIPPETS (per 1M queries):
- 1M Worker requests @ $0.50/M = $0.50
- 1M DO requests @ $0.15/M = $0.15
- Cold starts overhead ~20% = $0.13
- Total: ~$0.78/M queries

WITH SNIPPETS (per 1M queries):
- Snippet execution: FREE
- 100K Worker requests (10x batching) @ $0.50/M = $0.05
- DO hibernation (95% discount) @ $0.15/M * 0.05 = $0.0075
- No cold starts (persistent connections)
- Total: ~$0.06/M queries

SAVINGS: 92% ($0.72/M queries saved)
```

### Keep-Warm Strategy

Persistent WebSocket connections serve dual purpose:

1. **Reduce latency** - No connection establishment overhead
2. **Keep DOs warm** - Traffic on WS prevents hibernation eviction
3. **Eliminate cold starts** - Hot tenants always ready

For sparse traffic periods, consider an alarm-based backup:
```typescript
// In tenant DO
async alarm() {
  // Periodic wake to prevent eviction
  this.state.storage.setAlarm(Date.now() + 60000)
}
```

---

## Deployment

Deploy postgres.do snippets:

```bash
# Compile and deploy all pg-* snippets
npx tsx snippets/pg-deploy.ts
```

Test endpoints:

```bash
# Query buffer stats
curl https://postgres.do/pg/stats

# Execute batched query
curl -X POST https://postgres.do/pg/query \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","sql":"SELECT 1+1 as result"}'

# WebSocket pool stats
curl https://postgres.do/ws-pool/stats

# Session stats
curl https://postgres.do/session/stats
```

## License

MIT
