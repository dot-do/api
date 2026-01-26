/**
 * @dotdo/api Snippets
 *
 * Cloudflare Snippets for free-tier API operations.
 * Snippets run before Workers with no billing cost.
 *
 * Free Tier Snippets (no bindings required):
 *   - proxy: API proxy with upstream forwarding and caching
 *   - proxy-analytics: Proxy with fire-and-forget analytics to hibernatable DO
 *   - edge-cache: CDN caching with Cache API
 *   - auth-verify: JWT verification (decodes without crypto)
 *   - cache-control: Sets cache headers by path pattern
 *
 * PostgreSQL Optimization Snippets (adapted from DuckDB 94% savings pattern):
 *   - pg-query-buffer: Query batching for cost optimization (10 queries/batch)
 *   - pg-ws-pool: WebSocket connection pool for tenant DOs
 *   - pg-session: Session-aware connection pooling with transaction support
 *
 * Paid Tier Snippets (require bindings):
 *   - analytics-log: Analytics Engine logging
 *   - rate-limit: Rate limiting binding
 *
 * Snippet Constraints:
 *   - < 5ms CPU time
 *   - < 32KB compressed size
 *   - 2 subrequests (Pro) / 5 subrequests (Enterprise)
 *   - No bindings for free tier
 *
 * Cost Savings Pattern (proxy-analytics, pg-query-buffer):
 *   Snippet → HTTP → Worker → WebSocket (hibernatable) → DO → R2
 *     │                  │                                │
 *     └─ 1 req/batch     └─ 95% hibernation discount      └─ 90-98% batch savings
 *
 * Expected savings for postgres.do: ~92% ($0.72/M queries saved)
 */

// Free tier snippets (no bindings)
export { default as proxySnippet } from './proxy'
export { default as proxyAnalyticsSnippet } from './proxy-analytics'
export { default as edgeCacheSnippet } from './edge-cache'
export { default as authVerifySnippet } from './auth-verify'
export { default as cacheControlSnippet } from './cache-control'

// PostgreSQL optimization snippets (adapted from DuckDB patterns)
export { default as pgQueryBufferSnippet } from './pg-query-buffer'
export { default as pgWsPoolSnippet } from './pg-ws-pool'
export { default as pgSessionSnippet } from './pg-session'

// Paid tier snippets (require bindings)
export { default as analyticsLogSnippet } from './analytics-log'
export { default as rateLimitSnippet } from './rate-limit'

// Type exports
export type { ProxyEnv } from './proxy'
export type { ProxyAnalyticsEnv } from './proxy-analytics'
export type { CacheEnv } from './edge-cache'
