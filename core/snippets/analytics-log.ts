/**
 * CDN-layer snippet: Analytics Engine logging
 *
 * Logs every request to Analytics Engine at the CDN layer (zero worker cost).
 * Captures method, path, status, IP, country, and user agent.
 *
 * Configuration variables (set in CF dashboard):
 *   - ANALYTICS_DATASET: Dataset name (default: "requests")
 *
 * Bindings required:
 *   - ANALYTICS: Analytics Engine binding
 */
export default {
  async fetch(request: Request, env: Record<string, string> & { ANALYTICS?: AnalyticsEngine }): Promise<Request> {
    if (env.ANALYTICS) {
      const url = new URL(request.url)
      env.ANALYTICS.writeDataPoint({
        blobs: [
          request.method,
          url.pathname,
          request.headers.get('cf-connecting-ip') || '',
          (request as unknown as { cf?: { country?: string } }).cf?.country || '',
          request.headers.get('user-agent') || '',
        ],
        doubles: [Date.now()],
        indexes: [env.ANALYTICS_DATASET || 'requests'],
      })
    }

    return request
  },
}

interface AnalyticsEngine {
  writeDataPoint(data: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void
}
