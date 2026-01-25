# wiktionary.example.com.ai

Wiktionary Dictionary at the Edge - Full dictionary powered by PGLite WASM + Cloudflare Durable Objects.

## Features

- **Streaming Seed**: Fetches data directly from kaikki.org (no local downloads)
- **Chunked Inserts**: Batch processing to avoid memory issues
- **Full Dictionary**: Words, definitions, etymology, pronunciations
- **Pattern Search**: ILIKE-based search (full-text search not available in WASM build)
- **Eager WASM Loading**: Starts loading in constructor, non-query endpoints respond instantly
- **DO SQLite Persistence**: Seed progress tracked in DO storage

## Data Source

Dictionary data from [kaikki.org](https://kaikki.org/dictionary/) - machine-readable Wiktionary dumps in JSONL format.

- English dictionary: ~2.6GB JSONL file
- Supports other languages via API parameter
- Streamed directly from source (not downloaded locally)

## API Endpoints

### GET /

API info and available endpoints.

```bash
curl https://wiktionary.example.com.ai/
```

### GET /ping

Health check - responds instantly without waiting for WASM.

```bash
curl https://wiktionary.example.com.ai/ping
```

### GET /debug

Lifecycle info - responds instantly with current state.

```bash
curl https://wiktionary.example.com.ai/debug
```

### POST /seed

Start streaming seed from kaikki.org.

```bash
# Seed 1000 words (for testing)
curl -X POST https://wiktionary.example.com.ai/seed \
  -H "Content-Type: application/json" \
  -d '{"language":"English","batchSize":50,"maxWords":1000}'

# Seed full dictionary (warning: 2.6GB, may take a while)
curl -X POST https://wiktionary.example.com.ai/seed \
  -H "Content-Type: application/json" \
  -d '{"language":"English","batchSize":100}'
```

Parameters:
- `language` - Dictionary language (default: "English")
- `batchSize` - Number of words per batch insert (default: 100)
- `maxWords` - Maximum words to seed, 0 for unlimited (default: 0)

### GET /seed/status

Check seeding progress (instant - reads from DO SQLite).

```bash
curl https://wiktionary.example.com.ai/seed/status
```

Response:
```json
{
  "isSeeding": false,
  "startedAt": "2026-01-25T14:19:32.810Z",
  "totalWords": 1000,
  "lastBatchAt": "2026-01-25T14:19:33.863Z",
  "error": null
}
```

### GET /words

List words with pagination.

```bash
# First 50 words
curl https://wiktionary.example.com.ai/words

# Custom pagination
curl "https://wiktionary.example.com.ai/words?limit=20&offset=100"
```

### GET /words/:word

Get word definition(s).

```bash
curl https://wiktionary.example.com.ai/words/dictionary
```

Response includes all parts of speech for the word:
```json
{
  "0": {
    "id": 1,
    "word": "dictionary",
    "pos": "noun",
    "definitions": ["A reference work listing words..."],
    "etymology": "From Middle English dixionare...",
    "pronunciations": [{"ipa": "/ˈdɪk.ʃə.nə.ɹi/"}]
  },
  "1": {
    "id": 2,
    "word": "dictionary",
    "pos": "verb",
    "definitions": ["To look up in a dictionary..."]
  }
}
```

### GET /search?q=term

Search for words (ILIKE pattern matching).

```bash
curl "https://wiktionary.example.com.ai/search?q=abandon&limit=5"
```

### GET /stats

Dictionary statistics.

```bash
curl https://wiktionary.example.com.ai/stats
```

Response:
```json
{
  "totalWords": 1000,
  "uniqueWords": 676,
  "partsOfSpeech": [
    {"pos": "noun", "count": 472},
    {"pos": "adj", "count": 214},
    {"pos": "verb", "count": 173}
  ]
}
```

### POST /benchmark

Run benchmark queries.

```bash
curl -X POST https://wiktionary.example.com.ai/benchmark
```

### POST /clear

Clear all dictionary data.

```bash
curl -X POST https://wiktionary.example.com.ai/clear
```

### POST /query

Execute raw SQL query.

```bash
curl -X POST https://wiktionary.example.com.ai/query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT word, pos, definitions FROM words WHERE word = '\''language'\'' LIMIT 5"}'
```

## Schema

```sql
CREATE TABLE words (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  pos TEXT NOT NULL,
  definitions JSONB,
  etymology TEXT,
  pronunciations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

CREATE INDEX idx_word ON words (word);
CREATE INDEX idx_pos ON words (pos);
CREATE INDEX idx_word_lower ON words (LOWER(word));
```

## Timing Information

All endpoints return detailed timing information:

```json
{
  "timing": {
    "workerColo": "MSP",        // Worker datacenter
    "doColo": "ORD",            // Durable Object datacenter
    "queryMs": 0,               // PostgreSQL query time
    "rpcMs": 22,                // Worker -> DO RPC time
    "totalMs": 22               // Total request time
  }
}
```

## WASM Loading Strategy

This worker uses the "eager-but-non-blocking" pattern:

1. WASM loading starts **immediately** in DO constructor
2. Non-query endpoints (`/ping`, `/debug`, `/seed/status`) respond **instantly**
3. Query endpoints wait only for **remaining load time** (often near-zero on warm starts)
4. WASM instance is **hoisted to module scope**, surviving DO class reinstantiation

## Memory Optimization

- Streaming seed (doesn't load full 2.6GB into memory)
- Chunked batch inserts (configurable batch size)
- Optional `maxWords` limit for testing/constrained environments
- PostgreSQL memory optimized for Cloudflare Workers (128MB limit)

## Development

```bash
# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Or use wrangler directly
npx wrangler deploy
```

## Example Usage

```bash
# 1. Check health
curl https://wiktionary.example.com.ai/ping

# 2. Seed 5000 words for testing
curl -X POST https://wiktionary.example.com.ai/seed \
  -H "Content-Type: application/json" \
  -d '{"maxWords":5000,"batchSize":100}'

# 3. Monitor progress
curl https://wiktionary.example.com.ai/seed/status

# 4. Check stats
curl https://wiktionary.example.com.ai/stats

# 5. Search for words
curl "https://wiktionary.example.com.ai/search?q=abandon"

# 6. Get specific word
curl https://wiktionary.example.com.ai/words/dictionary

# 7. Run benchmarks
curl -X POST https://wiktionary.example.com.ai/benchmark
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker (wiktionary.example.com.ai)              │
│ - itty-router for routing                                   │
│ - RPC calls to Durable Object                              │
│ - Detailed timing metrics                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ RPC (DO stub)
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Wiktionary Durable Object                                   │
│ - PGLite WASM (hoisted to module scope)                    │
│ - DO SQLite for seed progress tracking                     │
│ - Streaming seed from kaikki.org                           │
│ - Batch inserts (configurable size)                        │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- Full-text search (GIN indexes) not available in PGLite WASM build - uses ILIKE pattern matching instead
- PostgreSQL version: 17.5 compiled with Emscripten
- WASM size: ~7.6MB, data bundle: ~4.7MB
- Total upload: ~13MB (gzipped: ~4.3MB)

## Links

- [kaikki.org Dictionary Downloads](https://kaikki.org/dictionary/rawdata.html)
- [Wiktextract Documentation](https://github.com/tatuylonen/wiktextract)
- [PGLite Documentation](https://github.com/electric-sql/pglite)
