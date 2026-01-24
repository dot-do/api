# @dotdo/api

Convention-driven API framework for Cloudflare Workers. Define your schema, get REST + MCP + Events + Analytics for free.

```typescript
import { API, DatabaseDO, AnalyticsBufferDO } from '@dotdo/api'

export { DatabaseDO, AnalyticsBufferDO }

export default API({
  name: 'my-api',
  database: {
    schema: {
      User: { id: 'cuid!', email: 'string! #unique', name: 'string!' },
      Post: { id: 'cuid!', title: 'string!', author: '-> User!' },
    },
    binding: 'DB',
  },
  analyticsBuffer: { binding: 'ANALYTICS_BUFFER' },
})
```

That's it. You now have a full CRUD API with MCP tools, event streaming, and buffered analytics.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SNIPPETS (free tier)                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐                     │
│  │ auth-verify │→ │ edge-cache  │→ │ proxy-analytics  │                     │
│  └─────────────┘  └─────────────┘  └──────────────────┘                     │
│         │                │                   │                                │
└─────────│────────────────│───────────────────│────────────────────────────────┘
          ▼                ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  WORKER (@dotdo/api)                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Database │  │Functions │  │  Proxy   │  │   MCP    │  │AnalyticsBuf. │  │
│  │Convention│  │Convention│  │Convention│  │Convention│  │  Convention  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
          │                                                        │
          ▼                                                        ▼
┌──────────────────┐                                  ┌─────────────────────┐
│   DatabaseDO     │                                  │ AnalyticsBufferDO   │
│   (per-tenant)   │                                  │ (hibernatable WS)   │
│   Schema→DO→API  │                                  │ Buffer → R2 flush   │
└──────────────────┘                                  └─────────────────────┘
```

## Install

```bash
npm install @dotdo/api
# or
pnpm add @dotdo/api
```

## Conventions

### Database Convention

Schema-driven CRUD with the principle: **Schema defines the DO, DO exposes the API.**

```typescript
export default API({
  name: 'blog-api',
  database: {
    schema: {
      User: {
        id: 'cuid!',
        email: 'string! #unique',
        name: 'string!',
        avatar: 'string?',
        role: 'string = "user"',
        posts: '<- Post[]',          // Inverse relation
      },
      Post: {
        id: 'cuid!',
        title: 'string!',
        content: 'text',             // Full-text searchable
        published: 'boolean = false',
        author: '-> User!',          // Forward relation
        comments: '<- Comment[]',
      },
      Comment: {
        id: 'cuid!',
        content: 'text!',
        author: '-> User!',
        post: '-> Post!',
      },
    },
    binding: 'DB',
    events: [
      { type: 'lakehouse', binding: 'LAKEHOUSE' },
      { type: 'queue', binding: 'EVENTS' },
    ],
  },
})
```

**Auto-generated endpoints:**

```bash
# CRUD
GET    /users                    # List with pagination
GET    /users/:id                # Get by ID
POST   /users                    # Create
PUT    /users/:id                # Update
DELETE /users/:id                # Delete
GET    /users/search?q=alice     # Full-text search
GET    /users/:id/posts          # Related resources

# Events
GET    /events?model=User&since=0  # Event stream
WS     /events/ws?model=Post       # WebSocket subscription

# MCP
POST   /mcp                      # JSON-RPC (tools/list, tools/call)
```

**Schema shorthand syntax:**

| Syntax | Meaning |
|--------|---------|
| `'string!'` | Required string |
| `'string?'` | Optional string |
| `'string = "default"'` | Default value |
| `'string! #unique'` | Unique constraint |
| `'text'` | Full-text searchable |
| `'cuid!'` | Auto-generated CUID |
| `'-> User!'` | Forward relation (required) |
| `'<- Post[]'` | Inverse relation (array) |
| `'boolean = false'` | Boolean with default |

### Functions Convention

Non-CRUD API patterns: actions, proxies, packages, mashups, lookups, pipelines.

```typescript
export default API({
  name: 'services',
  functions: {
    // Service actions
    functions: [{
      name: 'email.send',
      input: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' } } },
      handler: async (input, ctx) => { /* ... */ },
    }],

    // Proxy wrappers
    proxies: [{
      name: 'apollo',
      upstream: 'https://api.apollo.io/v1',
      auth: { type: 'api-key', header: 'X-Api-Key', tokenVar: 'APOLLO_API_KEY' },
      cache: { ttl: 3600 },
    }],

    // NPM packages as APIs
    packages: [{
      name: 'lodash',
      module: 'lodash-es',
      expose: [{ name: 'groupBy' }, { name: 'chunk' }, { name: 'uniq' }],
    }],

    // Multi-source mashups
    mashups: [{
      name: 'company.enrich',
      sources: {
        whois: { url: 'https://whois.do/{domain}' },
        dns: { url: 'https://dns.do/{domain}/records', required: false },
        ssl: { url: 'https://ssl.do/{domain}', required: false },
      },
      cache: { ttl: 86400 },
    }],

    // Reference data lookups
    lookups: [{
      name: 'countries',
      source: { type: 'static', data: [/* ... */] },
      primaryKey: 'code',
      search: { fields: ['code', 'name'] },
      autocomplete: { field: 'name', limit: 10 },
    }],

    // Multi-step pipelines
    pipelines: [{
      name: 'lead.score',
      steps: [
        { name: 'enrich', type: 'function', function: 'contact.enrich' },
        { name: 'score', type: 'transform', transform: (data) => ({ ...data, score: 42 }) },
      ],
    }],
  },
})
```

**Generated endpoints:**

```bash
# Actions
POST /email/send                { "to": "...", "subject": "..." }

# Proxies
POST /apollo/people/search      { "person_titles": ["CEO"] }
POST /openai/chat/completions   { "model": "gpt-4", "messages": [...] }

# Packages
POST /lodash/groupBy            { "args": [[...], "key"] }
POST /lodash/chunk              { "args": [[1,2,3,4,5], 2] }

# Mashups
GET  /company/enrich?domain=example.com

# Lookups
GET  /countries                 List all
GET  /countries/US              Get by ID
GET  /countries/search?q=united Full-text search
GET  /countries/autocomplete?q=uni  Typeahead

# Pipelines
POST /lead/score                { "email": "ceo@bigcorp.com" }
```

### Analytics Buffer Convention

Hibernatable WebSocket pattern for high-throughput analytics at minimal cost.

```typescript
export default API({
  name: 'my-api',
  analyticsBuffer: {
    binding: 'ANALYTICS_BUFFER',      // DO namespace
    r2Binding: 'ANALYTICS_BUCKET',    // R2 for persistence
    maxBufferSize: 1000,              // Flush at 1000 events
    maxBufferAge: 30000,              // Or every 30 seconds
  },
})
```

**Cost savings:**

```
Snippet → HTTP → Worker → WebSocket (hibernatable) → DO → R2
   │                │                                  │
   └─ 1 req/batch   └─ 95% hibernation discount        └─ 90-98% batch savings
```

- **Combined: ~99.5% cost reduction** vs per-request HTTP
- Tested to **100k req/s**
- $0.004/million events vs $0.45/million (HTTP-only)

### Proxy Convention

Basic API proxy with auth injection.

```typescript
export default API({
  name: 'api-gateway',
  proxy: {
    upstream: 'https://api.example.com',
    auth: { type: 'bearer', tokenVar: 'API_KEY' },
  },
})
```

### MCP Convention

Model Context Protocol tools for AI assistants.

```typescript
export default API({
  name: 'tools-api',
  mcp: {
    tools: [{
      name: 'weather.get',
      description: 'Get weather for a location',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } } },
      handler: async (args) => { /* ... */ },
    }],
  },
})
```

### RPC Convention

Type-safe RPC with auto-generated client.

```typescript
export default API({
  name: 'rpc-api',
  rpc: {
    methods: {
      'math.add': { handler: async ({ a, b }) => a + b },
      'math.multiply': { handler: async ({ a, b }) => a * b },
    },
  },
})
```

## Snippets

Cloudflare Snippets run before Workers at **zero cost**. Use them for caching, auth, and proxy operations within free tier constraints (5ms CPU, 32KB, no bindings).

### proxy-analytics.ts

Full proxy with analytics buffering. Events stay in isolate memory until confirmed written:

```bash
# Proxy config
PROXY_UPSTREAM=https://api.apollo.io/v1
PROXY_AUTH_TYPE=api-key
PROXY_AUTH_HEADER=X-Api-Key
PROXY_AUTH_TOKEN=$APOLLO_API_KEY
PROXY_CACHE_TTL=3600
PROXY_STRIP_PREFIX=/apollo
PROXY_FLATTEN_DATA=true

# Analytics config
ANALYTICS_ENDPOINT=https://my-api.workers.dev/events
ANALYTICS_WRITE_KEY=dk_xxx
ANALYTICS_BUFFER_SIZE=10
```

### edge-cache.ts

CDN caching with free Cache API and path-based rules:

```bash
CACHE_RULES={"/**/static/**": 86400, "/api/config": 3600}
DEFAULT_CACHE_TTL=60
CACHE_KEY_INCLUDE_QUERY=true
CACHE_VARY_HEADERS=Accept,Accept-Language
```

### proxy.ts

Lightweight proxy without analytics:

```bash
PROXY_UPSTREAM=https://api.example.com
PROXY_AUTH_TYPE=bearer
PROXY_AUTH_TOKEN=$API_KEY
PROXY_CACHE_TTL=3600
```

### auth-verify.ts

JWT verification at the edge.

### Snippet Cascade

Run snippets in sequence for layered processing:

```
Request → auth-verify → edge-cache → proxy-analytics → Response
              │              │              │
         verify JWT    check cache     upstream + analytics
```

### Available Snippets

| Snippet | Tier | Purpose |
|---------|------|---------|
| `proxy-analytics.ts` | Free | Proxy + buffered analytics |
| `proxy.ts` | Free | Basic proxy |
| `edge-cache.ts` | Free | CDN caching via Cache API |
| `auth-verify.ts` | Free | JWT verification |
| `cache-control.ts` | Free | Cache header injection |
| `analytics-log.ts` | Paid | Analytics Engine logging |
| `rate-limit.ts` | Paid | Rate limiting |

## Middleware

Built-in middleware stack (applied in order):

1. **CORS** - Cross-origin headers
2. **Context** - Request ID, geo info
3. **Response** - Envelope formatting
4. **Auth** - Bearer/API key verification
5. **Rate Limit** - Per-key request limiting
6. **Analytics** - Request logging

```typescript
export default API({
  name: 'my-api',
  auth: {
    mode: 'required',        // 'required' | 'optional' | 'none'
    providers: ['bearer'],
  },
  rateLimit: {
    limit: 100,
    window: 60,
  },
})
```

## Response Envelope

All responses follow a consistent envelope:

```json
{
  "api": { "name": "my-api", "version": "1.0.0" },
  "data": { "id": "usr_123", "name": "Alice" },
  "links": { "self": "/users/usr_123", "next": "/users?cursor=abc" },
  "meta": { "total": 42, "limit": 20 },
  "user": { "id": "auth_user_id" }
}
```

## Durable Objects

Export DO classes in your worker for wrangler bindings:

```typescript
import { API, DatabaseDO, AnalyticsBufferDO } from '@dotdo/api'

export { DatabaseDO, AnalyticsBufferDO }
export default API({ /* ... */ })
```

**wrangler.jsonc:**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-api",
  "main": "worker.ts",
  "compatibility_date": "2026-01-24",
  "compatibility_flags": ["nodejs_compat"],

  "observability": { "enabled": true, "head_sampling_rate": 1 },

  "durable_objects": {
    "bindings": [
      { "name": "DB", "class_name": "DatabaseDO" },
      { "name": "ANALYTICS_BUFFER", "class_name": "AnalyticsBufferDO" }
    ]
  },

  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["DatabaseDO", "AnalyticsBufferDO"] }
  ],

  "r2_buckets": [
    { "binding": "ANALYTICS_BUCKET", "bucket_name": "analytics" }
  ]
}
```

## Event Streaming

The database convention emits CDC events:

```json
{
  "id": "evt_1",
  "sequence": 1,
  "timestamp": "2026-01-24T12:00:00.000Z",
  "operation": "create",
  "model": "User",
  "documentId": "usr_123",
  "after": { "id": "usr_123", "email": "alice@example.com" }
}
```

**Sink types:**
- `lakehouse` - R2 bucket (Parquet/NDJSON)
- `queue` - Cloudflare Queue
- `webhook` - HTTP POST to external URL

## Free Tier Strategy

Maximize Cloudflare's free tier by offloading to snippets:

| Operation | Snippet (Free) | Worker (Paid) |
|-----------|----------------|---------------|
| Caching | edge-cache | |
| Auth check | auth-verify | |
| Proxy | proxy / proxy-analytics | Complex transforms |
| Analytics | Buffer in isolate | AnalyticsBufferDO |
| Rate limit | | rate-limit binding |
| CRUD | | DatabaseDO |
| MCP | | mcp convention |

## API Pattern Taxonomy

| Pattern | Convention | Example |
|---------|-----------|---------|
| CRUD | `database` | Blog with users, posts, comments |
| Actions | `functions.functions` | Send email, resize image, shorten URL |
| Proxies | `functions.proxies` | Wrap Apollo, OpenAI, Stripe |
| Packages | `functions.packages` | Expose lodash, date-fns as HTTP |
| Mashups | `functions.mashups` | WHOIS + DNS + SSL enrichment |
| Lookups | `functions.lookups` | Countries, timezones, NAICS codes |
| Pipelines | `functions.pipelines` | Lead scoring, ETL workflows |

## Exports

```typescript
// Core
import { API } from '@dotdo/api'

// Durable Objects
import { DatabaseDO, AnalyticsBufferDO } from '@dotdo/api'

// Conventions (for custom composition)
import {
  databaseConvention,
  functionsConvention,
  analyticsBufferRoutes,
  crudConvention,
  proxyConvention,
  rpcConvention,
  mcpConvention,
} from '@dotdo/api'

// Schema utilities
import { parseSchema, parseField, parseModel, generateJsonSchema } from '@dotdo/api'

// Helpers
import { buildPagination, createLinkBuilder } from '@dotdo/api'
import { notFound, badRequest, unauthorized, forbidden } from '@dotdo/api'

// Types
import type {
  ApiConfig, AnalyticsBufferConfig, BufferEvent,
  ParsedSchema, ParsedModel, ParsedField, Document, DatabaseEvent,
  FunctionsConfig, ProxyDef, MashupDef, LookupDef, PipelineDef,
} from '@dotdo/api'
```

## License

MIT
