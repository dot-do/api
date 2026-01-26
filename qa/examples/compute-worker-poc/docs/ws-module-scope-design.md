# WebSocket Module Scope Architecture for Cold Start Optimization

## Executive Summary

This document explores an alternative architecture for postgres.do cold start optimization using **WebSocket connections held in Worker module scope**. The goal is to keep Durable Objects (DOs) or shared compute workers warm by maintaining persistent WebSocket connections from the Worker layer.

**Verdict: Not recommended for this use case.** While technically possible, the approach has fundamental limitations that make it unsuitable for reliable cold start optimization. The RPC-based approach in the current POC is more appropriate, with keep-warm strategies being the better optimization path.

---

## 1. Feasibility Analysis

### 1.1 Can Workers Hold WebSocket Connections in Module Scope?

**Yes, but with critical limitations.**

Cloudflare Workers can hold WebSocket connections as module-level variables:

```typescript
// Module scope - persists between requests in the same isolate
let wsConnection: WebSocket | null = null

export default {
  async fetch(request: Request, env: Env) {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      wsConnection = new WebSocket('wss://target-do.example.com')
      // Set up handlers...
    }
    // Use wsConnection for requests
  }
}
```

**However, this comes with significant caveats:**

### 1.2 Isolate Lifecycle Limitations

| Behavior | Implication |
|----------|-------------|
| **No routing guarantee** | Two requests may hit different Worker instances |
| **Unpredictable eviction** | Isolates can be evicted at any time for resource constraints |
| **Runtime updates** | Cloudflare updates Workers runtime several times per week, terminating connections |
| **30-second grace period** | In-flight requests get 30 seconds during runtime updates |

From Cloudflare documentation:
> "It is generally advised that you not store mutable state in your global scope unless you have accounted for this contingency."

### 1.3 WebSocket-Specific Limitations

| Limitation | Impact |
|------------|--------|
| **No hibernation for outgoing WS** | Durable Objects cannot hibernate while maintaining outgoing connections |
| **Continuous billing** | DO stays active (and billable) for entire WS connection duration |
| **Connection drops on updates** | WebSockets terminate when Cloudflare updates the runtime |

From Cloudflare documentation:
> "Hibernation is only supported when a Durable Object acts as a WebSocket server. Currently, outgoing WebSockets cannot hibernate."

---

## 2. Architecture Options

### Option A: Worker Module Scope WS to Shared Compute DO

```
                              ┌─────────────────────────────────┐
                              │         Cloudflare Edge         │
                              │                                 │
  ┌──────────┐                │  ┌───────────────────────────┐  │
  │  Client  │───HTTP/WS─────────│      Router Worker        │  │
  └──────────┘                │  │                           │  │
                              │  │  Module Scope:            │  │
                              │  │  ┌─────────────────────┐  │  │
                              │  │  │ wsPool: Map<colo,WS>│  │  │
                              │  │  └─────────┬───────────┘  │  │
                              │  └────────────│──────────────┘  │
                              │               │                 │
                              │               │ WS Connection   │
                              │               │ (module scope)  │
                              │               ▼                 │
                              │  ┌───────────────────────────┐  │
                              │  │   Shared Compute DO       │  │
                              │  │   (per colo)              │  │
                              │  │                           │  │
                              │  │   - PGLite WASM           │  │
                              │  │   - Accepts WS from       │  │
                              │  │     router workers        │  │
                              │  │   - Stays warm from       │  │
                              │  │     aggregate traffic     │  │
                              │  └───────────────────────────┘  │
                              └─────────────────────────────────┘
```

**Flow:**
1. Router Worker maintains WebSocket connections to Shared Compute DO in module scope
2. Requests use existing WS connection (no cold start if same isolate)
3. Shared Compute DO accepts WS, can hibernate (server-side)
4. All tenants benefit from shared warm DO

**Problems:**
1. **Router Worker isolate routing**: No guarantee requests hit same isolate with the WS
2. **Multiple WS connections**: Each isolate would create its own connection
3. **Connection explosion**: N isolates x M colos = many redundant connections
4. **DO cannot hibernate**: DO holding incoming WS CAN hibernate (good), but...
5. **Isolate eviction**: WS drops when router isolate evicted

### Option B: Worker Module Scope WS Pool to Tenant DOs

```
                              ┌─────────────────────────────────┐
                              │         Cloudflare Edge         │
                              │                                 │
  ┌──────────┐                │  ┌───────────────────────────┐  │
  │  Client  │───HTTP─────────────│      Router Worker        │  │
  └──────────┘                │  │                           │  │
                              │  │  Module Scope:            │  │
                              │  │  ┌─────────────────────┐  │  │
                              │  │  │ wsPool: LRU<        │  │  │
                              │  │  │   tenantId,         │  │  │
                              │  │  │   WebSocket         │  │  │
                              │  │  │ >                   │  │  │
                              │  │  └─────────┬───────────┘  │  │
                              │  └────────────│──────────────┘  │
                              │               │                 │
                              │     ┌─────────┴─────────┐       │
                              │     │    WS Pool        │       │
                              │     │  (LRU, module     │       │
                              │     │   scope)          │       │
                              │     └───┬─────┬─────┬───┘       │
                              │         │     │     │           │
                              │         ▼     ▼     ▼           │
                              │  ┌─────────────────────────┐    │
                              │  │  Tenant DOs             │    │
                              │  │  ┌─────┐ ┌─────┐ ┌─────┐│    │
                              │  │  │ A   │ │ B   │ │ C   ││    │
                              │  │  │     │ │     │ │     ││    │
                              │  │  │WASM │ │WASM │ │WASM ││    │
                              │  │  └─────┘ └─────┘ └─────┘│    │
                              │  └─────────────────────────┘    │
                              └─────────────────────────────────┘
```

**Flow:**
1. Router Worker maintains LRU pool of WS connections to hot tenant DOs
2. Frequently accessed tenants stay in pool, remain warm
3. Cold tenants fall out of LRU, experience cold start

**Problems:**
1. **Same isolate routing issue**: LRU pool not shared across isolates
2. **Each isolate has different LRU state**: Inconsistent warmth
3. **Tenant DO cannot hibernate**: Outgoing WS from DO cannot hibernate
4. **Connection overhead**: Each WS connection has memory overhead
5. **Eviction complexity**: Need to handle WS cleanup on isolate eviction

---

## 3. Code Sketches

### 3.1 Option A: Shared Compute DO with WS Server

```typescript
// router-worker.ts - Module Scope WS Connection
let computeWS: WebSocket | null = null
let lastPingAt = 0

async function getComputeConnection(env: Env): Promise<WebSocket> {
  // Check if existing connection is usable
  if (computeWS && computeWS.readyState === WebSocket.OPEN) {
    return computeWS
  }

  // Create new connection to Shared Compute DO
  const doId = env.SHARED_COMPUTE_DO.idFromName('compute-primary')
  const stub = env.SHARED_COMPUTE_DO.get(doId)

  const response = await stub.fetch('https://internal/websocket', {
    headers: { 'Upgrade': 'websocket' }
  })

  const ws = response.webSocket
  if (!ws) throw new Error('Failed to establish WebSocket')

  ws.accept()

  // Handle connection events
  ws.addEventListener('close', () => {
    computeWS = null
  })

  ws.addEventListener('error', () => {
    computeWS = null
  })

  computeWS = ws
  return ws
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/query') {
      const body = await request.json() as { sql: string }

      try {
        const ws = await getComputeConnection(env)

        // Send query over WS
        const requestId = crypto.randomUUID()
        ws.send(JSON.stringify({
          type: 'query',
          requestId,
          sql: body.sql
        }))

        // Wait for response (would need promise tracking)
        const result = await waitForResponse(ws, requestId)
        return Response.json(result)

      } catch (error) {
        // Fallback to HTTP if WS fails
        return fallbackToHttp(env, body.sql)
      }
    }
  }
}
```

```typescript
// shared-compute-do.ts - WS Server with Hibernation
export class SharedComputeDO implements DurableObject {
  private pg: PGliteLocal | null = null

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      // Use hibernation API for incoming connections
      this.state.acceptWebSocket(server)

      return new Response(null, {
        status: 101,
        webSocket: client
      })
    }

    // Regular HTTP fallback
    // ...
  }

  // Hibernation handler - runs when WS message arrives
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const msg = JSON.parse(message as string)

    if (msg.type === 'query') {
      // Ensure PGLite is ready
      if (!this.pg) {
        this.pg = await PGliteLocal.create({ /* ... */ })
      }

      const result = await this.pg.query(msg.sql)

      ws.send(JSON.stringify({
        type: 'result',
        requestId: msg.requestId,
        result
      }))
    }
  }

  async webSocketClose(ws: WebSocket) {
    // Connection closed, DO can hibernate if no other connections
  }
}
```

### 3.2 Option B: Tenant DO Pool (NOT RECOMMENDED)

```typescript
// router-worker.ts - LRU WebSocket Pool (Problematic)
import { LRUCache } from 'lru-cache'

// Module scope - but NOT shared across isolates!
const wsPool = new LRUCache<string, WebSocket>({
  max: 50, // Keep 50 tenant connections warm
  ttl: 1000 * 60 * 5, // 5 minute TTL
  dispose: (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close()
    }
  }
})

async function getTenantConnection(env: Env, tenantId: string): Promise<WebSocket> {
  let ws = wsPool.get(tenantId)

  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws
  }

  // Create new connection
  const doId = env.TENANT_DO.idFromName(tenantId)
  const stub = env.TENANT_DO.get(doId)

  const response = await stub.fetch('https://internal/websocket', {
    headers: { 'Upgrade': 'websocket' }
  })

  ws = response.webSocket!
  ws.accept()

  ws.addEventListener('close', () => wsPool.delete(tenantId))
  ws.addEventListener('error', () => wsPool.delete(tenantId))

  wsPool.set(tenantId, ws)
  return ws
}

// WARNING: This pool is per-isolate, not global!
// Different requests may hit different isolates with different pools
```

---

## 4. Cloudflare Snippets Consideration

### Can Snippets Hold Module-Scope State?

**Yes, Snippets work the same as Workers** - they can hold module-scope state, but with the same limitations.

From Cloudflare:
> "Snippets are just Workers so yes, they work the same."

### Snippets Limitations for This Use Case

| Limitation | Impact |
|------------|--------|
| No Durable Objects integration | Cannot bind to DOs from Snippets |
| No waitUntil (historically) | Cannot do background work |
| Lightweight focus | Not designed for persistent connections |
| Execution time limits | Shorter than Workers |

**Verdict: Snippets are not suitable** for this architecture. They lack the DO bindings needed to establish WebSocket connections to Durable Objects.

---

## 5. Comparison: WS Module Scope vs RPC Approach

### Current RPC Architecture (from POC)

```
Client -> Router -> State DO (no WASM) -> Compute Worker (WASM) -> Response
                         └── RPC via Service Binding ──┘
```

### Proposed WS Module Scope Architecture

```
Client -> Router (WS in module scope) -> Shared Compute DO -> Response
               └── WebSocket connection ──┘
```

### Comparison Table

| Aspect | RPC (Current) | WS Module Scope |
|--------|---------------|-----------------|
| **Connection reliability** | Fresh per-request | Depends on isolate persistence |
| **Cold start benefit** | Relies on Worker pool warmth | Relies on WS staying open |
| **Routing consistency** | N/A (stateless) | No guarantee same isolate |
| **DO hibernation** | N/A | Works for incoming WS (server) |
| **Implementation complexity** | Simple HTTP/RPC | Complex WS lifecycle management |
| **Failure handling** | Natural retry | Need fallback to HTTP |
| **Debugging** | Standard HTTP traces | WS debugging harder |
| **Multi-isolate behavior** | Works correctly | Connection per isolate (wasteful) |

### When WS Might Win

WS module scope could theoretically reduce latency IF:
1. Requests consistently hit the same isolate
2. WS connection stays open for extended periods
3. WS message overhead < HTTP request overhead

**In practice, none of these are guaranteed.**

---

## 6. Pros and Cons Summary

### WebSocket Module Scope Approach

**Pros:**
1. Lower per-message overhead once connected
2. DO can hibernate with incoming WS connections (Hibernation API)
3. Bidirectional communication possible
4. Potential for real-time push notifications

**Cons:**
1. **Critical: No isolate routing guarantee** - different requests may hit different isolates
2. **Isolates are evicted unpredictably** - connection drops
3. **Connection explosion** - each isolate creates its own connections
4. **Complexity** - must handle reconnection, message queuing, fallback
5. **Runtime updates terminate connections** - several times per week
6. **Debugging difficulty** - WS issues harder to trace than HTTP
7. **No cross-isolate state** - cannot share connection pool

### RPC/HTTP Approach (Current POC)

**Pros:**
1. **Stateless** - no isolate affinity needed
2. **Reliable** - each request is independent
3. **Simple** - standard HTTP patterns
4. **Debuggable** - clear request/response traces
5. **Works with Worker pool** - benefits from Cloudflare's natural warming

**Cons:**
1. HTTP overhead per request (~10-20ms)
2. Compute Worker may still cold start
3. No persistent connection benefits

---

## 7. Recommendation

### Do Not Use WebSocket Module Scope for Cold Start Optimization

The WebSocket module scope approach is **not recommended** for postgres.do cold start optimization because:

1. **Fundamental mismatch**: Workers are designed to be stateless. Fighting this design leads to complexity and unreliability.

2. **No routing guarantee**: The core assumption (WS stays open, requests use it) fails because requests may hit different isolates.

3. **Marginal benefit**: Even if WS worked, the latency savings (~10ms) don't justify the complexity.

4. **Better alternatives exist**: Keep-warm strategies with RPC are simpler and more reliable.

### Recommended Approach: Enhanced Keep-Warm Strategy

Instead of WS module scope, improve the existing RPC architecture with:

```typescript
// Keep-warm via Cron Trigger (recommended)
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Ping shared compute worker every minute
    await env.COMPUTE_WORKER.fetch('https://compute/keep-warm', {
      method: 'POST'
    })

    // Optionally ping hot tenant DOs
    const hotTenants = await getHotTenants(env)
    await Promise.all(
      hotTenants.map(tenantId =>
        env.STATE_DO.get(env.STATE_DO.idFromName(tenantId))
          .fetch('https://internal/keep-warm')
      )
    )
  }
}
```

### When WS Module Scope Would Be Appropriate

WebSocket connections in Workers are appropriate for:
- **Proxying WebSocket traffic** (client WS through Worker to backend)
- **Real-time applications** where DO acts as WS server (chat, games)
- **Push notifications** where clients maintain connections to DO

They are NOT appropriate for:
- Keep-alive / warmth strategies
- Connection pooling across requests
- State that needs to persist reliably

---

## 8. Future Considerations

### Potential Cloudflare Improvements

If Cloudflare added these features, the calculus might change:

1. **Outgoing WS hibernation** - Would allow DOs to maintain cheap persistent connections
2. **Shared module state across isolates** - Would enable true connection pooling
3. **Isolate affinity** - Would guarantee requests hit same isolate

### Monitor These Developments

- [Feature Request: Outgoing WS Hibernation](https://github.com/cloudflare/workerd/issues/4864)
- Cloudflare Workers documentation for new features

---

## References

- [Cloudflare Workers WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Durable Objects WebSocket Best Practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [How Workers Works](https://developers.cloudflare.com/workers/reference/how-workers-works/)
- [Cloudflare Snippets](https://developers.cloudflare.com/rules/snippets/)
- [Workers Global Variables Discussion](https://community.cloudflare.com/t/workers-global-variables-concurrency/129275)
