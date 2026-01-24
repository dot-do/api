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

## License

MIT
