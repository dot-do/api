# Tenant Proxy with Connection Pooling: Design Document

## Executive Summary

This document explores an architecture where tenant requests route through a proxy layer that maintains a pool of pre-warmed PGLite instances, dynamically loading tenant state on demand. This is analogous to database connection pooling (like PgBouncer), but for entire PostgreSQL instances running in WebAssembly.

**Key Finding:** This architecture is technically feasible but faces significant challenges around memory constraints and state loading latency. The most viable variant uses a hybrid approach: pooled compute with tenant state in Durable Object SQLite.

---

## 1. Pool Architecture

### 1.1 Conceptual Architecture

```
                              TENANT PROXY POOL ARCHITECTURE
                              ==============================

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           PROXY LAYER                                    │
    │  ┌───────────────────────────────────────────────────────────────────┐  │
    │  │                        Pool Manager                                │  │
    │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
    │  │  │ Instance 1  │  │ Instance 2  │  │ Instance N  │                │  │
    │  │  │ (idle)      │  │ (Tenant-X)  │  │ (idle)      │                │  │
    │  │  │ PGLite ~80MB│  │ PGLite ~80MB│  │ PGLite ~80MB│                │  │
    │  │  └─────────────┘  └─────────────┘  └─────────────┘                │  │
    │  │                                                                     │  │
    │  │  Pool Stats:                                                        │  │
    │  │  - Total: N instances                                               │  │
    │  │  - Idle: M instances                                                │  │
    │  │  - In Use: N-M instances                                            │  │
    │  │  - Memory: N * 80MB                                                 │  │
    │  └───────────────────────────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Request for Tenant X
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                         STATE LOADING                                    │
    │                                                                          │
    │    1. Grab idle instance from pool                                       │
    │    2. Load Tenant X state (from Tenant DO SQLite snapshot)               │
    │    3. Execute query                                                      │
    │    4. Persist changes back to Tenant X DO                                │
    │    5. Return instance to pool (or keep for Tenant X via LRU)             │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                     TENANT DURABLE OBJECTS                               │
    │                                                                          │
    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
    │  │ Tenant A DO   │  │ Tenant B DO   │  │ Tenant X DO   │                │
    │  │ (SQLite)      │  │ (SQLite)      │  │ (SQLite)      │                │
    │  │ Source of     │  │ Source of     │  │ Source of     │                │
    │  │ Truth         │  │ Truth         │  │ Truth         │                │
    │  └───────────────┘  └───────────────┘  └───────────────┘                │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Request Flow

```
                              REQUEST LIFECYCLE
                              =================

    ┌────────────┐
    │  Request   │ Tenant X: SELECT * FROM users WHERE id = 1
    │  Arrives   │
    └─────┬──────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 1: Pool Lookup                                         │
    │                                                              │
    │ Check if Tenant X has an assigned instance (LRU cache)       │
    │                                                              │
    │ if (pool.hasTenant('X')) {                                   │
    │   return pool.getInstance('X')  // ~0ms - instant            │
    │ }                                                            │
    └─────────────────────────────────────────────────────────────┘
          │ Miss
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 2: Acquire Instance                                    │
    │                                                              │
    │ const instance = await pool.acquireIdle()                    │
    │                                                              │
    │ Options:                                                     │
    │ - Idle instance available: ~0ms                              │
    │ - Pool exhausted, evict LRU tenant: ~50ms (persist state)    │
    │ - Pool at max, wait for available: variable                  │
    │ - Create new instance: ~2000ms (PGLite cold start)           │
    └─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 3: Load Tenant State                                   │
    │                                                              │
    │ const tenantDO = env.TENANT_DO.get(tenantX.id)               │
    │ const snapshot = await tenantDO.getSnapshot()                │
    │                                                              │
    │ Option A: Full SQLite snapshot    (~100-500ms for 10MB)      │
    │ Option B: Lazy table loading      (~50-100ms per table)      │
    │ Option C: Delta sync              (~10-50ms for recent)      │
    └─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 4: Apply State to PGLite                               │
    │                                                              │
    │ await instance.loadSnapshot(snapshot)                        │
    │                                                              │
    │ or                                                           │
    │                                                              │
    │ await instance.exec(snapshotSQL) // pg_dump output           │
    └─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 5: Execute Query                                       │
    │                                                              │
    │ const result = await instance.query(sql)                     │
    │                                                              │
    │ ~5-50ms depending on query complexity                        │
    └─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 6: Persist Changes (writes only)                       │
    │                                                              │
    │ if (isWriteQuery) {                                          │
    │   const changes = instance.getChanges() // CDC-like          │
    │   await tenantDO.applyChanges(changes)                       │
    │ }                                                            │
    └─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ STEP 7: Return Instance                                     │
    │                                                              │
    │ Options:                                                     │
    │ - Keep assigned to Tenant X (LRU strategy)                   │
    │ - Reset and return to idle pool                              │
    │ - Destroy if memory pressure                                 │
    └─────────────────────────────────────────────────────────────┘
```

---

## 2. State Loading Strategies

### 2.1 Strategy Comparison

| Strategy | Load Time | Memory | Consistency | Complexity |
|----------|-----------|--------|-------------|------------|
| **A: Full Snapshot** | 100-500ms | 2x during load | Strong | Low |
| **B: Lazy Tables** | 50-100ms/table | Variable | Eventual | Medium |
| **C: LRU Cache** | ~0ms (hit) | N tenants in pool | Strong | Medium |
| **D: Delta Sync** | 10-50ms | Minimal | Eventual | High |

### 2.2 Option A: Full SQLite Snapshot

```
    ┌─────────────────────────────────────────────────────────────┐
    │                    FULL SNAPSHOT STRATEGY                    │
    │                                                              │
    │  Tenant DO                        PGLite Instance            │
    │  ┌─────────────┐                  ┌─────────────┐            │
    │  │ SQLite DB   │ ──────────────▶  │ Load entire │            │
    │  │ (10-50MB)   │   Serialize      │ snapshot    │            │
    │  └─────────────┘   pg_dump        └─────────────┘            │
    │                                                              │
    │  Timeline:                                                   │
    │  ├── 0ms: Request arrives                                    │
    │  ├── 50ms: Serialize SQLite to pg_dump format                │
    │  ├── 150ms: Transfer to Worker (via RPC)                     │
    │  ├── 300ms: Execute pg_restore in PGLite                     │
    │  └── 350ms: Ready for query                                  │
    │                                                              │
    │  Pros:                                                       │
    │  - Strong consistency (point-in-time snapshot)               │
    │  - Simple mental model                                       │
    │  - Works with any query                                      │
    │                                                              │
    │  Cons:                                                       │
    │  - High latency for large databases                          │
    │  - 2x memory during load (old + new state)                   │
    │  - Transfer overhead for each request (without caching)      │
    └─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// In Tenant DO
async getSnapshot(): Promise<Uint8Array> {
  // Use PGLite's dumpDataDir or equivalent
  const dump = await this.pg.dumpDataDir('gzip')
  return new Uint8Array(await dump.arrayBuffer())
}

// In Pool Instance
async loadSnapshot(snapshot: Uint8Array): Promise<void> {
  // Reset instance state
  await this.reset()

  // Load the snapshot
  await this.pg.loadDataDir(new Blob([snapshot]))
}
```

### 2.3 Option B: Lazy Table Loading

```
    ┌─────────────────────────────────────────────────────────────┐
    │                   LAZY TABLE LOADING                         │
    │                                                              │
    │  Query: SELECT * FROM users WHERE active = true              │
    │                                                              │
    │  ┌─────────────┐                                             │
    │  │ Parse Query │──▶ Tables needed: [users]                   │
    │  └─────────────┘                                             │
    │         │                                                    │
    │         ▼                                                    │
    │  ┌─────────────┐                                             │
    │  │ Check Cache │──▶ users table loaded? No                   │
    │  └─────────────┘                                             │
    │         │                                                    │
    │         ▼                                                    │
    │  ┌─────────────┐      ┌─────────────┐                        │
    │  │ Fetch Table │──────│ Tenant DO   │                        │
    │  │ Data        │◀─────│ SELECT *    │                        │
    │  └─────────────┘      │ FROM users  │                        │
    │         │              └─────────────┘                        │
    │         ▼                                                    │
    │  ┌─────────────┐                                             │
    │  │ Create Table│                                             │
    │  │ + Insert    │                                             │
    │  └─────────────┘                                             │
    │         │                                                    │
    │         ▼                                                    │
    │  ┌─────────────┐                                             │
    │  │ Execute     │                                             │
    │  │ Original    │                                             │
    │  │ Query       │                                             │
    │  └─────────────┘                                             │
    │                                                              │
    │  Pros:                                                       │
    │  - Load only what's needed                                   │
    │  - Better for large databases with many tables               │
    │  - Progressive warming                                       │
    │                                                              │
    │  Cons:                                                       │
    │  - Complex query parsing required                            │
    │  - Foreign keys may require loading related tables           │
    │  - Eventual consistency issues                               │
    │  - JOIN queries can trigger cascading loads                  │
    └─────────────────────────────────────────────────────────────┘
```

**Challenges:**

1. **Query Parsing:** Must parse SQL to identify required tables
2. **Foreign Keys:** Loading `orders` may require `users` for referential integrity
3. **Views:** Must trace view definitions to underlying tables
4. **Stored Procedures:** May reference any table
5. **Triggers:** Side effects may touch other tables

### 2.4 Option C: LRU Tenant Cache (Recommended for Multi-Tenant)

```
    ┌─────────────────────────────────────────────────────────────┐
    │                    LRU TENANT CACHE                          │
    │                                                              │
    │  Pool maintains tenant-to-instance mapping with LRU eviction │
    │                                                              │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                      LRU Cache                           │ │
    │  │  ┌────────────────────────────────────────────────────┐  │ │
    │  │  │ Head (Most Recent)              Tail (Evict Next)  │  │ │
    │  │  │                                                    │  │ │
    │  │  │ Tenant-X ◀──▶ Tenant-Y ◀──▶ Tenant-Z ◀──▶ Tenant-A │  │ │
    │  │  │ Instance-1    Instance-2    Instance-3    Instance-4│  │ │
    │  │  └────────────────────────────────────────────────────┘  │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Request for Tenant-X:                                       │
    │  1. Check cache → HIT (Instance-1 has Tenant-X state)        │
    │  2. Move to head of LRU                                      │
    │  3. Execute query (~5-50ms)                                  │
    │                                                              │
    │  Request for Tenant-B (not in cache):                        │
    │  1. Check cache → MISS                                       │
    │  2. Evict Tenant-A from Instance-4 (persist state first)     │
    │  3. Load Tenant-B state into Instance-4                      │
    │  4. Add to head of LRU                                       │
    │  5. Execute query                                            │
    │                                                              │
    │  Eviction Process:                                           │
    │  ├── Persist dirty state to Tenant-A DO                      │
    │  ├── Clear PGLite instance (DROP all tables or reset)        │
    │  └── Load Tenant-B snapshot                                  │
    │                                                              │
    │  Hit Rates (estimated):                                      │
    │  - 4 instances, 20 tenants: ~20% hit rate                    │
    │  - 4 instances, 4 tenants: 100% hit rate (sticky routing)    │
    │  - Follows power law: 20% of tenants = 80% of traffic        │
    └─────────────────────────────────────────────────────────────┘
```

**This strategy works best when:**
- Traffic follows power law distribution (few active tenants)
- Pool size roughly matches active tenant count
- Requests can be routed to specific pool instances (sticky sessions)

### 2.5 Option D: Delta Sync (Most Complex)

```
    ┌─────────────────────────────────────────────────────────────┐
    │                      DELTA SYNC                              │
    │                                                              │
    │  Similar to database replication: track changes since last   │
    │  sync and apply only the deltas.                             │
    │                                                              │
    │  Tenant DO maintains:                                        │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │ Change Log (WAL-like)                                    │ │
    │  │ ┌─────────────────────────────────────────────────────┐  │ │
    │  │ │ LSN=1: INSERT INTO users (id, name) VALUES (1, 'A') │  │ │
    │  │ │ LSN=2: UPDATE users SET name = 'B' WHERE id = 1     │  │ │
    │  │ │ LSN=3: DELETE FROM orders WHERE id = 5              │  │ │
    │  │ └─────────────────────────────────────────────────────┘  │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Pool Instance tracks:                                       │
    │  - Last synced LSN per tenant                                │
    │  - Current state reflects LSN=2                              │
    │                                                              │
    │  Sync Process:                                               │
    │  1. Get changes since LSN=2 from Tenant DO                   │
    │  2. Apply LSN=3 (DELETE FROM orders WHERE id = 5)            │
    │  3. Update last synced LSN to 3                              │
    │  4. Execute query                                            │
    │                                                              │
    │  Pros:                                                       │
    │  - Minimal data transfer                                     │
    │  - Fast for recent tenants                                   │
    │  - Supports write-back efficiently                           │
    │                                                              │
    │  Cons:                                                       │
    │  - Requires change tracking in Tenant DO                     │
    │  - Complex conflict resolution                               │
    │  - Log retention/compaction needed                           │
    │  - Full sync fallback for large deltas                       │
    └─────────────────────────────────────────────────────────────┘
```

---

## 3. Consistency Model

### 3.1 Consistency Guarantees

```
    ┌─────────────────────────────────────────────────────────────┐
    │                  CONSISTENCY MODEL                           │
    │                                                              │
    │  SOURCE OF TRUTH: Tenant Durable Object (DO SQLite)          │
    │                                                              │
    │  The pool instances are EPHEMERAL COMPUTE - they can be      │
    │  discarded at any time. All durable state lives in the DO.   │
    │                                                              │
    │  Read Path:                                                  │
    │  ┌─────────┐      ┌─────────┐      ┌─────────┐              │
    │  │ Request │ ──▶  │ Pool    │ ──▶  │ Return  │              │
    │  │         │      │Instance │      │ Result  │              │
    │  └─────────┘      └─────────┘      └─────────┘              │
    │                        ▲                                     │
    │                        │ State loaded from                   │
    │                   ┌────┴─────┐                               │
    │                   │ Tenant   │                               │
    │                   │ DO       │                               │
    │                   └──────────┘                               │
    │                                                              │
    │  Write Path:                                                 │
    │  ┌─────────┐      ┌─────────┐      ┌─────────┐              │
    │  │ Request │ ──▶  │ Pool    │ ──▶  │ Persist │ ──▶ Response │
    │  │         │      │Instance │      │ to DO   │              │
    │  └─────────┘      └─────────┘      └─────────┘              │
    │                        │                 │                   │
    │                        │                 ▼                   │
    │                        │           ┌──────────┐              │
    │                        └──────────▶│ Tenant   │              │
    │                          Write     │ DO       │              │
    │                          Changes   └──────────┘              │
    │                                                              │
    │  CRITICAL: Write is only confirmed AFTER DO persistence      │
    └─────────────────────────────────────────────────────────────┘
```

### 3.2 Failure Scenarios

```
    ┌─────────────────────────────────────────────────────────────┐
    │                  FAILURE SCENARIOS                           │
    │                                                              │
    │  Scenario 1: Instance Crash Mid-Transaction                  │
    │  ───────────────────────────────────────────────────────────│
    │  State: Query executed in pool, DO not yet updated           │
    │  Result: Transaction LOST (DO is source of truth)            │
    │  Recovery: Client retries, new instance loads clean DO state │
    │                                                              │
    │  Scenario 2: DO Persistence Failure                          │
    │  ───────────────────────────────────────────────────────────│
    │  State: Query executed, persistence to DO fails              │
    │  Result: Return error to client, pool state is dirty         │
    │  Recovery: Must reload from DO before next request           │
    │                                                              │
    │  Scenario 3: Network Partition (Pool ↔ DO)                   │
    │  ───────────────────────────────────────────────────────────│
    │  State: Pool cannot reach Tenant DO                          │
    │  Result: Fail fast - no stale reads allowed                  │
    │  Alternative: Read-only mode with stale data flag            │
    │                                                              │
    │  Scenario 4: Concurrent Writes (Multiple Instances)          │
    │  ───────────────────────────────────────────────────────────│
    │  State: Two pool instances have same tenant loaded           │
    │  Result: Last write wins at DO level                         │
    │  Prevention: Single-instance-per-tenant constraint           │
    │             (sticky routing or distributed lock)             │
    └─────────────────────────────────────────────────────────────┘
```

### 3.3 Write-Back Strategies

```
    ┌─────────────────────────────────────────────────────────────┐
    │                 WRITE-BACK STRATEGIES                        │
    │                                                              │
    │  Strategy A: Synchronous (Strong Consistency)                │
    │  ─────────────────────────────────────────────               │
    │  1. Execute query in pool instance                           │
    │  2. Wait for DO persistence confirmation                     │
    │  3. Return result to client                                  │
    │                                                              │
    │  Latency: +50-100ms for DO round-trip                        │
    │  Guarantee: Strong consistency                               │
    │                                                              │
    │  Strategy B: Async with WAL (Durability Trade-off)           │
    │  ─────────────────────────────────────────────               │
    │  1. Execute query in pool instance                           │
    │  2. Write to local WAL buffer                                │
    │  3. Return result to client                                  │
    │  4. Background: Flush WAL to DO periodically                 │
    │                                                              │
    │  Latency: Same as single instance                            │
    │  Guarantee: May lose last N seconds on crash                 │
    │                                                              │
    │  Strategy C: Change Data Capture (CDC)                       │
    │  ─────────────────────────────────────────────               │
    │  1. Execute query in pool instance                           │
    │  2. Capture row-level changes (INSERT/UPDATE/DELETE)         │
    │  3. Stream changes to DO (apply as SQL or row data)          │
    │                                                              │
    │  Latency: Depends on batch size                              │
    │  Guarantee: At-least-once delivery                           │
    └─────────────────────────────────────────────────────────────┘
```

---

## 4. Memory Analysis

### 4.1 Single Instance Memory Breakdown

```
    ┌─────────────────────────────────────────────────────────────┐
    │             PGLITE INSTANCE MEMORY BREAKDOWN                 │
    │                                                              │
    │  Component              Size        Notes                    │
    │  ──────────────────────────────────────────────────────────  │
    │  pglite.wasm           ~12 MB      Pre-compiled WASM binary  │
    │  pglite.data           ~5 MB       PostgreSQL data files     │
    │  JS Runtime            ~3 MB       Emscripten + JS code      │
    │  ──────────────────────────────────────────────────────────  │
    │  Static Total          ~20 MB      Before PostgreSQL init    │
    │                                                              │
    │  PostgreSQL Runtime:                                         │
    │  ──────────────────────────────────────────────────────────  │
    │  shared_buffers        16 MB       Buffer pool               │
    │  wal_buffers           1 MB        Write-ahead log           │
    │  work_mem              2 MB        Per-operation memory      │
    │  temp_buffers          2 MB        Temp table memory         │
    │  Catalog/metadata      ~10 MB      System catalogs           │
    │  ──────────────────────────────────────────────────────────  │
    │  Runtime Total         ~31 MB                                │
    │                                                              │
    │  User Data:                                                  │
    │  ──────────────────────────────────────────────────────────  │
    │  Tables/Indexes        Variable    Tenant-dependent          │
    │  Query Results         Variable    Per-query                 │
    │  ──────────────────────────────────────────────────────────  │
    │                                                              │
    │  TYPICAL TOTAL:        64-100 MB   (empty to moderate data)  │
    │                                                              │
    │  CLOUDFLARE LIMIT:     128 MB      Worker/DO memory limit    │
    └─────────────────────────────────────────────────────────────┘
```

### 4.2 Pool Size Analysis

```
    ┌─────────────────────────────────────────────────────────────┐
    │                    POOL SIZE ANALYSIS                        │
    │                                                              │
    │  Question: How many PGLite instances can fit in one Worker?  │
    │                                                              │
    │  Cloudflare Worker Memory Limit: 128 MB                      │
    │  PGLite Instance (minimal):      ~64 MB                      │
    │                                                              │
    │  Answer: ONE instance per Worker.                            │
    │                                                              │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                    IMPLICATION                           │ │
    │  │                                                          │ │
    │  │  A "pool" in Cloudflare Workers means:                   │ │
    │  │  - Multiple Worker ISOLATES, not multiple instances      │ │
    │  │    within one Worker                                     │ │
    │  │  - Each isolate has 1 PGLite instance                    │ │
    │  │  - Cloudflare manages the isolate pool                   │ │
    │  │  - Routing determines which isolate handles request      │ │
    │  │                                                          │ │
    │  │  This is the SAME as the current Compute Worker          │ │
    │  │  architecture, just with tenant state loading added.     │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Durable Object Memory:                                      │
    │  ──────────────────────────────────────────────────────────  │
    │  - DOs also have 128 MB limit                                │
    │  - SQLite storage is NOT counted against memory limit        │
    │  - SQLite is persisted separately (Cloudflare infrastructure)│
    │  - Perfect for tenant state storage                          │
    │                                                              │
    │  Revised Architecture:                                       │
    │  ──────────────────────────────────────────────────────────  │
    │  - Compute Workers: Each has 1 PGLite instance               │
    │  - Tenant DOs: Store state in SQLite, no PGLite              │
    │  - Cloudflare: Manages Worker isolate pool                   │
    └─────────────────────────────────────────────────────────────┘
```

### 4.3 WASM Module Sharing

```
    ┌─────────────────────────────────────────────────────────────┐
    │               WASM MODULE SHARING ANALYSIS                   │
    │                                                              │
    │  Question: Can multiple PGLite instances share WASM?         │
    │                                                              │
    │  WebAssembly Architecture:                                   │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                                                          │ │
    │  │  WebAssembly.Module   ──▶ Compiled code (SHAREABLE)      │ │
    │  │         │                                                 │ │
    │  │         ▼                                                 │ │
    │  │  WebAssembly.Instance ──▶ Runtime state (NOT shared)     │ │
    │  │         │                                                 │ │
    │  │         ▼                                                 │ │
    │  │  Linear Memory        ──▶ Instance-specific heap         │ │
    │  │                                                          │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Theory: Multiple instances from same module                 │
    │  ──────────────────────────────────────────────────────────  │
    │  const module = await WebAssembly.compile(wasmBytes)         │
    │  const instance1 = await WebAssembly.instantiate(module)     │
    │  const instance2 = await WebAssembly.instantiate(module)     │
    │                                                              │
    │  Each instance gets:                                         │
    │  - Own linear memory (64+ MB each)                           │
    │  - Own globals                                               │
    │  - Own table                                                 │
    │                                                              │
    │  Shared between instances:                                   │
    │  - Compiled code in module (~12 MB)                          │
    │                                                              │
    │  Savings: 12 MB per additional instance                      │
    │                                                              │
    │  BUT: Cloudflare's 128 MB limit per isolate means:           │
    │  - 2 instances = 12 + 64 + 64 = 140 MB > 128 MB (FAIL)       │
    │  - Module sharing doesn't help within single Worker          │
    │                                                              │
    │  CONCLUSION: WASM sharing only helps across isolates, and    │
    │  Cloudflare already handles this through static imports.     │
    └─────────────────────────────────────────────────────────────┘
```

---

## 5. Comparison to Database Connection Pooling

### 5.1 PgBouncer vs PGLite Pool

```
    ┌─────────────────────────────────────────────────────────────┐
    │            PGBOUNCER VS PGLITE POOL COMPARISON               │
    │                                                              │
    │  Aspect              PgBouncer           PGLite Pool         │
    │  ────────────────────────────────────────────────────────── │
    │  Pooled Resource     TCP connections     Entire PG instance  │
    │  Resource Cost       ~1 MB/connection    ~80 MB/instance     │
    │  Pool Size           100s of connections 1 per isolate       │
    │  State               Stateless (mostly)  Full database state │
    │  Client Assignment   Transaction/Session Tenant ID           │
    │  Eviction            Close connection    Serialize & swap    │
    │  Overhead            ~0.1ms              ~100-500ms (swap)   │
    │  Failure Impact      Reconnect           Reload state        │
    │                                                              │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                  KEY DIFFERENCES                         │ │
    │  │                                                          │ │
    │  │  1. STATE MANAGEMENT                                     │ │
    │  │     PgBouncer: Connections are stateless (server holds)  │ │
    │  │     PGLite Pool: Instance IS the state (must serialize)  │ │
    │  │                                                          │ │
    │  │  2. COST OF CONTEXT SWITCH                               │ │
    │  │     PgBouncer: ~0.1ms (SET commands)                     │ │
    │  │     PGLite Pool: 100-500ms (load entire database)        │ │
    │  │                                                          │ │
    │  │  3. POOL DENSITY                                         │ │
    │  │     PgBouncer: 1000s of connections per server           │ │
    │  │     PGLite Pool: 1 instance per 128 MB memory            │ │
    │  │                                                          │ │
    │  │  CONCLUSION: PGLite pooling is more like VM pooling      │ │
    │  │  than connection pooling. The cost model is different.   │ │
    │  └─────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────┘
```

### 5.2 Better Analogy: Kubernetes Pod Pooling

```
    ┌─────────────────────────────────────────────────────────────┐
    │              KUBERNETES POD POOLING ANALOGY                  │
    │                                                              │
    │  PGLite Pool is more similar to:                             │
    │  - Kubernetes pod prewarming                                 │
    │  - AWS Lambda provisioned concurrency                        │
    │  - Cloudflare Workers warm isolate pools                     │
    │                                                              │
    │  Common Pattern:                                             │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                                                          │ │
    │  │  Pre-warm Phase:                                         │ │
    │  │  1. Start N containers/isolates/instances                │ │
    │  │  2. Initialize runtime (JVM, Node, WASM)                 │ │
    │  │  3. Keep warm in pool                                    │ │
    │  │                                                          │ │
    │  │  Request Phase:                                          │ │
    │  │  1. Route request to warm instance                       │ │
    │  │  2. Load tenant-specific state (config, data)            │ │
    │  │  3. Execute request                                      │ │
    │  │  4. Return to pool (or evict)                            │ │
    │  │                                                          │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Key Insight: Cloudflare ALREADY does this for Workers.      │
    │  The Compute Worker POC leverages this existing pool.        │
    │  Adding tenant state loading is the new contribution.        │
    └─────────────────────────────────────────────────────────────┘
```

---

## 6. Feasibility Assessment

### 6.1 Technical Feasibility Matrix

| Aspect | Feasibility | Confidence | Notes |
|--------|-------------|------------|-------|
| Pre-warmed PGLite pool | **HIGH** | 95% | Already proven in Compute Worker POC |
| State serialization | **MEDIUM** | 80% | dumpDataDir exists, needs optimization |
| State loading | **MEDIUM** | 75% | loadDataDir exists, 100-500ms latency |
| Tenant routing | **HIGH** | 90% | Standard routing pattern |
| Write-back | **MEDIUM** | 70% | CDC approach viable but complex |
| Memory constraints | **LOW** | 90% | 1 instance per isolate is the limit |
| Consistency | **MEDIUM** | 75% | Requires careful design |

### 6.2 Viability Summary

```
    ┌─────────────────────────────────────────────────────────────┐
    │                  VIABILITY ASSESSMENT                        │
    │                                                              │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                    VERDICT: PARTIALLY VIABLE             │ │
    │  │                                                          │ │
    │  │  The tenant proxy pool concept is viable, but not in     │ │
    │  │  the form originally conceived. Key constraints:         │ │
    │  │                                                          │ │
    │  │  1. MEMORY: Only 1 PGLite instance per Worker isolate    │ │
    │  │     - Pool is distributed across isolates, not within    │ │
    │  │     - Cloudflare already manages this pool               │ │
    │  │                                                          │ │
    │  │  2. STATE LOADING: 100-500ms per tenant swap             │ │
    │  │     - Too slow for per-request loading                   │ │
    │  │     - LRU caching essential (keep tenant in instance)    │ │
    │  │     - Sticky routing reduces swaps                       │ │
    │  │                                                          │ │
    │  │  3. ARCHITECTURE OVERLAP: This is essentially the        │ │
    │  │     existing Compute Worker + State DO architecture      │ │
    │  │     with more sophisticated state management.            │ │
    │  │                                                          │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  RECOMMENDED APPROACH:                                       │
    │  ─────────────────────                                       │
    │  Use the existing Compute Worker architecture, enhanced     │
    │  with:                                                       │
    │                                                              │
    │  1. Sticky Routing: Route tenant X always to same isolate   │
    │  2. LRU Cache: Keep tenant state loaded, evict on pressure  │
    │  3. Delta Sync: For write-back, use CDC not full snapshots  │
    │  4. Pre-warming: Use keep-warm to maintain isolate pool     │
    │                                                              │
    │  This is NOT a "connection pool" - it's a "compute pool     │
    │  with stateful routing".                                     │
    └─────────────────────────────────────────────────────────────┘
```

### 6.3 Alternative: Hybrid Compute + DO SQLite

```
    ┌─────────────────────────────────────────────────────────────┐
    │           RECOMMENDED HYBRID ARCHITECTURE                    │
    │                                                              │
    │  Instead of loading full PG state, use:                      │
    │  - PGLite for COMPUTE (queries, transformations)             │
    │  - DO SQLite for STORAGE (source of truth)                   │
    │                                                              │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                                                          │ │
    │  │  Request: SELECT SUM(amount) FROM orders WHERE year=2024 │ │
    │  │                                                          │ │
    │  │  1. Route to Compute Worker with PGLite (warm)           │ │
    │  │                                                          │ │
    │  │  2. PGLite rewrites query for DO:                        │ │
    │  │     "SELECT amount FROM orders WHERE year=2024"          │ │
    │  │                                                          │ │
    │  │  3. Tenant DO executes on SQLite:                        │ │
    │  │     Returns: [{amount: 100}, {amount: 200}, ...]         │ │
    │  │                                                          │ │
    │  │  4. PGLite aggregates:                                   │ │
    │  │     SUM(100, 200, ...) = 300                             │ │
    │  │                                                          │ │
    │  │  5. Return: { sum: 300 }                                 │ │
    │  │                                                          │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Benefits:                                                   │
    │  - No full state loading (only query data transferred)       │
    │  - SQLite in DO is fast (synchronous access)                 │
    │  - PGLite provides PostgreSQL semantics                      │
    │  - Scales to large databases (only query data moves)         │
    │                                                              │
    │  Challenges:                                                 │
    │  - Query decomposition is complex                            │
    │  - Some queries may not be splittable                        │
    │  - JOIN optimization across DO/PGLite boundary               │
    │                                                              │
    │  This is the "federated query" pattern, similar to:          │
    │  - Presto/Trino across data sources                          │
    │  - Foreign Data Wrappers in PostgreSQL                       │
    └─────────────────────────────────────────────────────────────┘
```

---

## 7. Recommendations

### 7.1 Short-Term (Current Architecture Enhancement)

1. **Continue with Compute Worker + State DO separation**
   - Already validated in POC
   - Cloudflare manages Worker pool
   - State in DO SQLite

2. **Add keep-warm infrastructure**
   - Scheduled triggers every 30 seconds
   - Maintains warm PGLite instances

3. **Implement sticky routing**
   - Route tenant to consistent Worker/DO pair
   - Reduces state loading overhead

### 7.2 Medium-Term (State Loading Optimization)

1. **Implement memory snapshots**
   - Use the MemorySnapshot interface
   - Pre-initialized PGLite for faster cold starts

2. **Build CDC pipeline**
   - Track changes in Tenant DO
   - Efficient write-back from Compute Worker

3. **LRU tenant caching**
   - Keep tenant state in Worker memory
   - Evict on pressure, persist to DO

### 7.3 Long-Term (Federated Query Architecture)

1. **Query decomposition engine**
   - Parse queries to identify data dependencies
   - Execute storage queries on DO SQLite
   - Aggregate/transform in PGLite

2. **Materialized views in DO**
   - Pre-compute common aggregations
   - Reduce cross-boundary data transfer

3. **Distributed query optimization**
   - Push predicates to DO SQLite
   - Minimize data movement

---

## 8. Conclusion

The tenant proxy pool concept is valid but constrained by Cloudflare's memory limits. The practical implementation is:

1. **Pool = Cloudflare's Worker isolate pool** (they manage it)
2. **State loading = LRU tenant cache per isolate** (minimize swaps)
3. **Source of truth = Tenant DO SQLite** (durable storage)
4. **Compute = Pre-warmed PGLite** (PostgreSQL semantics)

This is less like a "connection pool" and more like "compute-as-a-service with stateful routing." The key innovation is the state loading/unloading mechanism, not the pool itself.

---

## Appendix: Implementation Sketch

```typescript
// Pool Manager (lives in Worker)
class TenantPoolManager {
  private currentTenant: string | null = null
  private pg: PGliteLocal | null = null
  private lastAccess: number = 0

  async executeForTenant(
    tenantId: string,
    sql: string,
    tenantDO: DurableObjectStub
  ): Promise<QueryResult> {
    // Check if already loaded
    if (this.currentTenant !== tenantId) {
      await this.swapTenant(tenantId, tenantDO)
    }

    this.lastAccess = Date.now()
    return this.pg!.query(sql)
  }

  private async swapTenant(
    newTenantId: string,
    newTenantDO: DurableObjectStub
  ): Promise<void> {
    // 1. Persist current tenant (if any) to their DO
    if (this.currentTenant && this.pg) {
      const currentDO = this.getCurrentTenantDO()
      await this.persistState(currentDO)
    }

    // 2. Reset PGLite or create new instance
    await this.resetInstance()

    // 3. Load new tenant state
    const snapshot = await newTenantDO.fetch('/snapshot').then(r => r.arrayBuffer())
    await this.loadState(snapshot)

    this.currentTenant = newTenantId
  }

  private async persistState(tenantDO: DurableObjectStub): Promise<void> {
    const dump = await this.pg!.dumpDataDir('gzip')
    await tenantDO.fetch('/persist', {
      method: 'POST',
      body: dump
    })
  }

  private async loadState(snapshot: ArrayBuffer): Promise<void> {
    // Implementation depends on PGLite's loadDataDir or equivalent
  }
}
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-25*
*Author: Architecture Research Team*
