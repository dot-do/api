# taxi.example.com.ai - NYC Taxi Trip Data at the Edge

A Cloudflare Worker that provides NYC Taxi trip data using PGLite (PostgreSQL WASM) running in Durable Objects.

## Features

- **PGLite in Durable Objects** - Full PostgreSQL running in WASM at the edge
- **Streaming Seed Logic** - Fetches data directly from remote CSV sources (no local downloads)
- **Chunked/Batch Inserts** - Avoids memory issues when loading large datasets
- **Eager-but-non-blocking WASM Loading** - Fast response times for non-query endpoints
- **Comprehensive Query API** - List trips, get statistics, run benchmarks

## Deployment

The worker is deployed at: **https://taxi.example.com.ai/**

## API Endpoints

### Lifecycle & Health

- `GET /` - API info and endpoint documentation
- `GET /ping` - Health check (instant response, doesn't wait for WASM)
- `GET /debug` - Lifecycle information (instance IDs, WASM load status, request counts)

### Data Seeding

- `POST /seed/sample` - Seed with 100 sample trips (fast for testing)
- `POST /seed` - Seed from remote CSV source
  - Body: `{ "month": "YYYY-MM" }` (e.g., `{"month": "2024-01"}`)
  - Note: Falls back to sample data if remote fetch fails
- `GET /seed/status` - Check seeding progress

### Querying

- `GET /trips` - List trips with pagination
  - Query params: `limit` (default: 100), `offset` (default: 0)
- `GET /trips/:id` - Get a specific trip by ID
- `GET /stats` - Aggregated statistics (total trips, avg fare, avg tip, total revenue, etc.)
- `GET /stats/hourly` - Trip count and average fare by hour of day
- `GET /stats/daily` - Trip count and average fare by day of week (0=Sunday, 6=Saturday)

### Performance

- `POST /benchmark` - Run benchmark queries (count, aggregations, filtering, etc.)

## Database Schema

```sql
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  pickup_datetime TIMESTAMP NOT NULL,
  dropoff_datetime TIMESTAMP NOT NULL,
  passenger_count INTEGER NOT NULL,
  trip_distance DECIMAL(10, 2) NOT NULL,
  fare_amount DECIMAL(10, 2) NOT NULL,
  tip_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  pickup_location_id INTEGER,
  dropoff_location_id INTEGER
);

-- Indexes for performance
CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime);
CREATE INDEX idx_trips_dropoff_datetime ON trips(dropoff_datetime);
CREATE INDEX idx_trips_pickup_location ON trips(pickup_location_id);
CREATE INDEX idx_trips_dropoff_location ON trips(dropoff_location_id);
```

## Example Usage

### Seed with Sample Data

```bash
curl -X POST https://taxi.example.com.ai/seed/sample
```

Response:
```json
{
  "success": true,
  "rowsInserted": 100,
  "duration": 0
}
```

### Query Trips

```bash
curl https://taxi.example.com.ai/trips?limit=5
```

Response:
```json
{
  "trips": [
    {
      "id": 1,
      "pickup_datetime": "2025-12-28T14:32:15",
      "dropoff_datetime": "2025-12-28T15:18:42",
      "passenger_count": 2,
      "trip_distance": 15.89,
      "fare_amount": 42.23,
      "tip_amount": 0,
      "total_amount": 42.73,
      "pickup_location_id": 138,
      "dropoff_location_id": 110
    }
    // ... more trips
  ],
  "total": 100,
  "limit": 5,
  "offset": 0,
  "queryMs": 0,
  "doColo": "unknown"
}
```

### Get Statistics

```bash
curl https://taxi.example.com.ai/stats
```

Response:
```json
{
  "stats": {
    "total_trips": 100,
    "avg_fare": 28.30,
    "avg_tip": 3.69,
    "avg_distance": 10.32,
    "avg_passengers": 2.96,
    "total_revenue": 3248.48
  },
  "queryMs": 0,
  "doColo": "unknown"
}
```

### Run Benchmarks

```bash
curl -X POST https://taxi.example.com.ai/benchmark
```

Response:
```json
{
  "benchmarks": [
    {
      "name": "Count all trips",
      "query": "SELECT COUNT(*) FROM trips",
      "durationMs": 0
    },
    {
      "name": "Average fare by hour",
      "query": "SELECT EXTRACT(HOUR FROM pickup_datetime) as hour, AVG(fare_amount) FROM trips GROUP BY hour ORDER BY hour",
      "durationMs": 0
    },
    {
      "name": "Top 10 locations by pickups",
      "query": "SELECT pickup_location_id, COUNT(*) as count FROM trips WHERE pickup_location_id IS NOT NULL GROUP BY pickup_location_id ORDER BY count DESC LIMIT 10",
      "durationMs": 0
    }
    // ... more benchmarks
  ],
  "totalMs": 0,
  "doColo": "unknown"
}
```

## Data Sources

This worker is designed to work with NYC TLC (Taxi & Limousine Commission) trip data:

- **Official Parquet files**: https://d37ci6vzurychx.cloudfront.net/trip-data/
  - Example: `yellow_tripdata_2024-01.parquet`
  - Note: PGLite doesn't natively support Parquet, so CSV conversion is needed

- **Current Implementation**: Uses sample data generation for fast testing
  - Falls back to sample data if remote CSV fetch fails
  - Sample data includes realistic trip patterns, fares, tips, and locations

## Architecture

### WASM Loading Strategy

Uses the **eager-but-non-blocking** pattern:

1. WASM loading starts immediately on Durable Object initialization
2. Non-query endpoints (`/ping`, `/debug`) respond instantly while WASM loads
3. Query endpoints wait only for remaining load time (often near-zero after warmup)
4. WASM instance is hoisted to module scope for reuse across DO reinstantiations

### Memory Optimization

- **Batch Inserts**: Inserts data in batches of 50-100 rows to avoid memory spikes
- **Streaming**: Processes remote CSV data line-by-line without loading entire file
- **PGLite Memory Settings**: Optimized for Cloudflare Workers' 128MB limit
  - `shared_buffers=16MB`
  - `work_mem=2MB`
  - `max_connections=1` (single DO is sole client)

### Persistence

- Data is stored in **Durable Object SQLite** via PGLite
- Each DO gets its own isolated PostgreSQL instance
- Data persists across requests and DO evictions (via DO SQLite storage)

## Development

### Prerequisites

- Node.js 18+
- Wrangler 3.x (Cloudflare Workers CLI)
- Account ID configured in `wrangler.jsonc`

### Setup

```bash
cd /Users/nathanclevenger/projects/api/qa/examples/taxi.example.com.ai
npm install
```

### Deploy

```bash
npx wrangler deploy
```

### Local Development

```bash
npx wrangler dev
```

## Files

- `worker.ts` - Main worker with routing and Durable Object implementation
- `wrangler.jsonc` - Cloudflare Workers configuration
- `src/pglite-local.ts` - PGLite implementation for Workers (with trampoline fix)
- `src/pglite-assets/` - PGLite WASM and data files
- `package.json` - Dependencies and scripts

## Performance Notes

- **Cold Start**: ~1-2 seconds (WASM loading)
- **Warm Start**: <50ms (WASM already loaded)
- **Query Latency**: <10ms for simple queries, <50ms for aggregations (on 100 rows)
- **Seed Performance**: ~1-2ms per batch of 50 rows

## Known Limitations

1. **Parquet Support**: PGLite doesn't natively support Parquet files
   - Solution: Pre-convert to CSV or use sample data
2. **Memory Constraints**: Cloudflare Workers have a 128MB memory limit
   - Solution: Use batch inserts and stream processing
3. **BigInt Serialization**: PostgreSQL bigint types need conversion for JSON
   - Solution: Automatic serialization layer converts BigInt to Number

## Future Enhancements

- [ ] Direct Parquet ingestion (via WASM Parquet parser)
- [ ] Multi-month data loading
- [ ] Real-time data streaming from NYC TLC
- [ ] Advanced analytics (heatmaps, time-series predictions)
- [ ] GraphQL API layer
- [ ] WebSocket support for live query subscriptions
