# ClickBench Worker

Cloudflare Worker implementation of the ClickBench analytics dataset benchmark using PGLite.

## Overview

ClickBench is a benchmark for analytical databases, containing 43 queries testing various analytical workloads:

- **Count queries**: Simple aggregations
- **GroupBy queries**: Complex grouping and aggregations
- **Filter queries**: Point lookups and range scans
- **String queries**: LIKE patterns and regex operations
- **Sort queries**: ORDER BY operations
- **Complex queries**: JOINs, HAVING, CASE statements

## Features

- **PGLite in Workers**: Full PostgreSQL in WebAssembly running in Cloudflare Durable Objects
- **Eager-but-non-blocking WASM**: Fast startup with non-blocking initialization
- **Synthetic data generation**: Generate sample data without large downloads
- **All 43 ClickBench queries**: Complete benchmark implementation
- **Streaming seed**: Memory-efficient batch inserts

## Quick Start

### Install Dependencies

```bash
pnpm install
```

### Deploy

```bash
pnpm run deploy
```

### Local Development

```bash
pnpm run dev
```

## API Endpoints

### Health & Info

- `GET /` - API documentation
- `GET /ping` - Health check (instant, no WASM wait)
- `GET /debug` - DO lifecycle info (instant, no WASM wait)

### Data Seeding

- `POST /seed/sample` - Seed sample data
  ```bash
  curl -X POST https://clickbench.example.com.ai/seed/sample \
    -H "Content-Type: application/json" \
    -d '{"count": 10000}'
  ```

- `GET /seed/status` - Get seed progress
  ```bash
  curl https://clickbench.example.com.ai/seed/status
  ```

### Data Access

- `GET /hits?limit=10&offset=0` - List hits with pagination
- `GET /stats` - Get basic statistics

### Queries

- `GET /queries` - List all 43 queries
- `GET /queries/categories` - Get queries by category
- `POST /query/:id` - Run specific query (0-42)
  ```bash
  # Q0: Count all rows
  curl -X POST https://clickbench.example.com.ai/query/0

  # Q7: Group by AdvEngineID
  curl -X POST https://clickbench.example.com.ai/query/7

  # Q20: LIKE pattern on URL
  curl -X POST https://clickbench.example.com.ai/query/20
  ```

### Benchmarks

- `POST /benchmark` - Run all 43 queries
  ```bash
  curl -X POST https://clickbench.example.com.ai/benchmark
  ```

- `POST /benchmark/quick` - Run 5 representative queries
  ```bash
  curl -X POST https://clickbench.example.com.ai/benchmark/quick
  ```

## Query Categories

### Count (Q0-Q1)
- Q0: `SELECT COUNT(*) FROM hits`
- Q1: `SELECT COUNT(*) FROM hits WHERE AdvEngineID <> 0`

### Aggregation (Q2-Q6, Q29)
- Q2: Multiple aggregations (SUM, COUNT, AVG)
- Q3: AVG on large integers
- Q4: COUNT(DISTINCT UserID)
- Q5: COUNT(DISTINCT SearchPhrase)
- Q6: MIN/MAX dates
- Q29: Multiple SUM expressions

### GroupBy (Q7-Q18, Q30-Q35)
- Q7: GROUP BY with filter and ORDER BY
- Q8: GROUP BY with DISTINCT count
- Q12: Top search phrases
- Q15: Top users by hit count
- Q33: GROUP BY URL

### Filter (Q19)
- Q19: Point lookup by UserID

### String (Q20-Q23)
- Q20: URL LIKE pattern
- Q21: LIKE with GROUP BY
- Q22: Complex LIKE conditions
- Q23: Full row SELECT with LIKE

### Sort (Q24-Q26)
- Q24: ORDER BY EventTime
- Q25: ORDER BY SearchPhrase
- Q26: Two-column sort

### Complex (Q27-Q28, Q36-Q42)
- Q27: HAVING with LENGTH function
- Q28: REGEXP_REPLACE with aggregation
- Q36-Q38: Date range filters with multiple conditions
- Q39: CASE expressions
- Q40-Q42: Hash filters and DATE_TRUNC

## Schema

The `hits` table contains 105 columns representing web analytics data:

```sql
CREATE TABLE hits (
    WatchID BIGINT,
    JavaEnable SMALLINT,
    Title TEXT,
    GoodEvent SMALLINT,
    EventTime TIMESTAMP,
    EventDate Date,
    CounterID INTEGER,
    ClientIP INTEGER,
    RegionID INTEGER,
    UserID BIGINT,
    URL TEXT,
    Referer TEXT,
    SearchPhrase TEXT,
    AdvEngineID SMALLINT,
    ResolutionWidth SMALLINT,
    ResolutionHeight SMALLINT,
    -- ... 89 more columns
);
```

## Sample Data

The worker generates synthetic data instead of downloading the full 14GB dataset. Each row contains:

- Random UserID and WatchID
- Rotating URLs, referers, search phrases
- Varied screen resolutions
- Date range: July 2013
- CounterID variations

## Example Workflow

```bash
# 1. Seed 50K sample rows
curl -X POST https://clickbench.example.com.ai/seed/sample \
  -H "Content-Type: application/json" \
  -d '{"count": 50000}'

# 2. Check seed status
curl https://clickbench.example.com.ai/seed/status

# 3. Get statistics
curl https://clickbench.example.com.ai/stats

# 4. Run quick benchmark (5 queries)
curl -X POST https://clickbench.example.com.ai/benchmark/quick

# 5. Run specific query
curl -X POST https://clickbench.example.com.ai/query/12

# 6. List hits
curl "https://clickbench.example.com.ai/hits?limit=5&offset=0"
```

## Performance Notes

### Memory Considerations

- PGLite WASM: ~15MB (WASM + data bundle)
- PostgreSQL buffers: Optimized for Cloudflare's 128MB limit
- Batch inserts: 100 rows per batch to avoid memory spikes

### Seeding Performance

- **10K rows**: ~2-5 seconds
- **50K rows**: ~10-20 seconds
- **100K rows**: ~20-40 seconds

Larger datasets may hit Worker CPU limits. Consider multiple seed batches.

### Query Performance

Query performance depends on:
- Dataset size
- Indexes (optional, can be added after seeding)
- Query complexity (GROUP BY, DISTINCT are slower)

Expected ranges:
- Simple counts: 1-10ms
- GROUP BY: 10-100ms
- DISTINCT counts: 50-200ms
- Complex queries: 100-500ms

## Architecture

```
Worker (Hono)
    ↓
Durable Object (ClickBenchDO)
    ↓
PGLite (PostgreSQL WASM)
    ↓
Durable Object Storage
```

### Eager-but-non-blocking Pattern

1. **Constructor**: Starts WASM loading immediately
2. **Instant endpoints** (`/ping`, `/debug`): Return without waiting
3. **Data endpoints**: Wait for WASM initialization

### PGLite Integration

Uses static imports for WASM and data:

```typescript
import pgliteWasm from './pglite-assets/pglite.wasm'
import pgliteData from './pglite-assets/pglite.data'

const db = await PGlite.create({
  wasmModule: pgliteWasm,
  fsBundle: new Blob([pgliteData]),
})
```

## Development

### Project Structure

```
clickbench.example.com.ai/
├── src/
│   ├── worker.ts           # Main Worker entry point
│   ├── clickbench-do.ts    # Durable Object with PGLite
│   ├── schema.ts           # hits table schema
│   ├── queries.ts          # All 43 ClickBench queries
│   └── pglite-assets/      # WASM and data files
├── wrangler.toml           # Worker configuration
├── package.json
└── tsconfig.json
```

### Adding Custom Queries

Add to `src/queries.ts`:

```typescript
{
  id: 43,
  name: 'custom_query',
  description: 'My custom query',
  category: 'aggregation',
  query: `SELECT COUNT(*) FROM hits WHERE ...`,
}
```

### Testing Locally

```bash
# Start dev server
pnpm run dev

# Test endpoints
curl http://localhost:8787/

# Seed data
curl -X POST http://localhost:8787/seed/sample \
  -H "Content-Type: application/json" \
  -d '{"count": 1000}'

# Run query
curl -X POST http://localhost:8787/query/0
```

## References

- [ClickBench Official](https://github.com/ClickHouse/ClickBench)
- [PGLite](https://github.com/electric-sql/pglite)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)

## License

MIT
