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
 * Cost Savings Pattern (proxy-analytics):
 *   Snippet → HTTP → Worker → WebSocket (hibernatable) → DO → R2
 *     │                  │                                │
 *     └─ 1 req/batch     └─ 95% hibernation discount      └─ 90-98% batch savings
 */

// Free tier snippets (no bindings)
export { default as proxySnippet } from './proxy'
export { default as proxyAnalyticsSnippet } from './proxy-analytics'
export { default as edgeCacheSnippet } from './edge-cache'
export { default as authVerifySnippet } from './auth-verify'
export { default as cacheControlSnippet } from './cache-control'

// Paid tier snippets (require bindings)
export { default as analyticsLogSnippet } from './analytics-log'
export { default as rateLimitSnippet } from './rate-limit'

// Type exports
export type { ProxyEnv } from './proxy'
export type { ProxyAnalyticsEnv } from './proxy-analytics'
export type { CacheEnv } from './edge-cache'
