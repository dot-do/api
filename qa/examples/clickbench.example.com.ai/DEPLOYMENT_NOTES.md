# Deployment Notes

## Current Status

The ClickBench worker has been created and deployed at:
**https://clickbench-worker.dotdo.workers.dev**

However, it requires a custom PGLite build that is compatible with Cloudflare Workers.

## Issue

The standard `@electric-sql/pglite` package expects browser APIs like `XMLHttpRequest` that are not available in Cloudflare Workers. The error encountered:

```
Aborted(ReferenceError: XMLHttpRequest is not defined)
```

## Solution

Use the custom PGLite build from `/Users/nathanclevenger/projects/postgres/packages/pglite` which has been modified to work in Cloudflare Workers with:

1. **EM_JS trampolines** - Eliminates runtime WASM bytecode generation
2. **Workers API compatibility** - No browser-only APIs
3. **Static imports** - Pre-compiled WASM modules

## Required Changes

### Option 1: Use Custom PGLite Package (Recommended)

Update `package.json`:
```json
{
  "dependencies": {
    "@dotdo/pglite": "file:../../../postgres/packages/pglite/packages/pglite",
    "hono": "^4.6.0"
  }
}
```

Update `src/clickbench-do.ts`:
```typescript
import { PGlite } from '@dotdo/pglite'

// Use the custom build with static imports
import pgliteWasm from '@dotdo/pglite/dist/postgres.wasm'
import pgliteData from '@dotdo/pglite/dist/postgres.data'
```

### Option 2: Build Custom PGLite

Follow the build instructions in `/Users/nathanclevenger/projects/postgres/packages/pglite/README.md`:

```bash
cd /Users/nathanclevenger/projects/postgres/packages/pglite
./build-with-docker.sh
cd packages/pglite
pnpm build
```

Then copy the built files to this worker's `src/pglite-assets/` directory.

## Alternative: Mock Implementation

For testing/demo purposes, implement a mock PGLite that stores data in Durable Object storage directly without WASM. This would allow the API to work but without actual PostgreSQL SQL processing.

## Worker Structure

The worker is fully implemented with:

- ✅ Hono HTTP router
- ✅ Durable Object with lifecycle tracking
- ✅ All 43 ClickBench queries defined
- ✅ Seed logic for synthetic data generation
- ✅ Batch insert implementation
- ✅ Query execution endpoints
- ✅ Benchmark endpoints
- ⚠️ PGLite integration (requires custom build)

## Files Created

```
/Users/nathanclevenger/projects/api/qa/examples/clickbench.example.com.ai/
├── src/
│   ├── worker.ts              # Main Worker entry point ✅
│   ├── clickbench-do.ts       # Durable Object ✅
│   ├── schema.ts              # hits table schema ✅
│   ├── queries.ts             # All 43 ClickBench queries ✅
│   ├── pglite-wrapper.ts      # PGLite wrapper ✅
│   └── pglite-assets/         # WASM files (standard build, not Workers-compatible) ⚠️
├── wrangler.toml              # Worker config ✅
├── package.json               # Dependencies ✅
├── tsconfig.json              # TypeScript config ✅
├── README.md                  # Full documentation ✅
└── DEPLOYMENT_NOTES.md        # This file ✅
```

## Next Steps

1. **Build custom PGLite** with Workers compatibility
2. **Copy assets** to `src/pglite-assets/`
3. **Update imports** in `src/pglite-wrapper.ts` or `src/clickbench-do.ts`
4. **Redeploy** with `npx wrangler deploy`
5. **Test endpoints** as documented in README.md

## Testing Without PGLite

You can test the Worker structure without PGLite working:

```bash
# API documentation (works)
curl https://clickbench-worker.dotdo.workers.dev/

# Health check (works)
curl https://clickbench-worker.dotdo.workers.dev/ping

# Debug info (works)
curl https://clickbench-worker.dotdo.workers.dev/debug

# List queries (works - doesn't need DB)
curl https://clickbench-worker.dotdo.workers.dev/queries

# Seed/query endpoints (require PGLite fix)
curl -X POST https://clickbench-worker.dotdo.workers.dev/seed/sample
```

## Contact

For questions about the custom PGLite build, refer to:
- `/Users/nathanclevenger/projects/postgres/CLAUDE.md` - PGLite WASM architecture docs
- `/Users/nathanclevenger/projects/postgres/benchmarks/workers/benchmark-worker/` - Working example
