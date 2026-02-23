import { vi } from 'vitest'

/**
 * Mock rate limiter interface matching Cloudflare's Rate Limiting API
 */
export interface MockRateLimiter {
  limit: ReturnType<typeof vi.fn>
}

/**
 * Rate limit result matching Cloudflare's Rate Limiting API response
 */
export interface RateLimitResult {
  success: boolean
  remaining?: number
  reset?: number
}

/**
 * Options for creating a mock rate limiter
 */
export interface MockRateLimiterOptions {
  /**
   * If true, limit() returns { success: false } (rate limited)
   * @default false
   */
  shouldLimit?: boolean
  /**
   * Optional array to capture limit() call arguments for assertions
   */
  limitCalls?: Array<{ key: string }>
  /**
   * Custom limit handler for complex scenarios
   */
  customHandler?: (options: { key: string }) => Promise<RateLimitResult>
}

/**
 * Creates a mock rate limiter binding for testing.
 *
 * @example Basic usage - allows all requests
 * ```ts
 * const mockRateLimiter = createMockRateLimiter()
 * const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })
 * ```
 *
 * @example Block all requests (rate limited)
 * ```ts
 * const mockRateLimiter = createMockRateLimiter({ shouldLimit: true })
 * ```
 *
 * @example Capture calls for assertions
 * ```ts
 * const limitCalls: Array<{ key: string }> = []
 * const mockRateLimiter = createMockRateLimiter({ limitCalls })
 * await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })
 * expect(limitCalls[0].key).toBe('expected-key')
 * ```
 *
 * @example Custom handler for complex scenarios
 * ```ts
 * let callCount = 0
 * const mockRateLimiter = createMockRateLimiter({
 *   customHandler: async () => ({ success: ++callCount <= 3 })
 * })
 * ```
 */
export function createMockRateLimiter(options: MockRateLimiterOptions = {}): MockRateLimiter {
  const { shouldLimit = false, limitCalls, customHandler } = options

  return {
    limit: vi.fn(async (opts: { key: string }) => {
      if (limitCalls) {
        limitCalls.push(opts)
      }
      if (customHandler) {
        return customHandler(opts)
      }
      return { success: !shouldLimit }
    }),
  }
}
