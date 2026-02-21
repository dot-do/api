import { expect } from 'vitest'

/**
 * Shared test utilities for @dotdo/api tests.
 *
 * Works in all test tiers: unit (Node), integration (workerd), and E2E (fetch).
 */

/**
 * Create a Request object for testing.
 * Defaults to GET with JSON Accept header.
 */
export function makeRequest(path: string, options?: RequestInit & { baseUrl?: string }): Request {
  const { baseUrl = 'http://test.do', ...init } = options || {}
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
  return new Request(url, {
    headers: {
      Accept: 'application/json',
      ...Object.fromEntries(new Headers(init.headers || {}).entries()),
    },
    ...init,
  })
}

/**
 * Assert that a response body conforms to the standard API response envelope.
 *
 *   { api: { name }, links: { self, home }, data|<key>: ... }
 *
 * Options:
 *   - hasPayload: assert the payload is under this semantic key (e.g. 'widgets')
 *   - hasList: assert the payload is an array
 *   - hasError: assert the envelope contains an error
 */
export function expectResponseShape(
  body: Record<string, unknown>,
  options?: { hasPayload?: string; hasList?: boolean; hasError?: boolean },
) {
  const { hasPayload, hasList, hasError } = options || {}

  // api block is always present
  expect(body.api).toBeDefined()
  expect((body.api as Record<string, unknown>).name).toBeDefined()

  // links block is always present
  expect(body.links).toBeDefined()
  expect((body.links as Record<string, unknown>).self).toBeDefined()
  expect((body.links as Record<string, unknown>).home).toBeDefined()

  // success field should NOT exist in new envelope
  expect(body.success).toBeUndefined()

  if (hasError) {
    expect(body.error).toBeDefined()
    return
  }

  if (hasPayload) {
    expect(body[hasPayload]).toBeDefined()
    if (hasList) {
      expect(Array.isArray(body[hasPayload])).toBe(true)
    }
  } else if (hasList) {
    expect(Array.isArray(body.data)).toBe(true)
  }
}

/**
 * Assert that the links object contains specific keys.
 */
export function expectLinks(links: Record<string, unknown>, expected: string[]) {
  for (const key of expected) {
    expect(links[key], `expected links.${key} to be defined`).toBeDefined()
    expect(typeof links[key], `expected links.${key} to be a string`).toBe('string')
  }
}

/**
 * Assert that an error response has the expected shape.
 */
export function expectErrorShape(body: Record<string, unknown>, status: number, code: string) {
  // success field should NOT exist in new envelope
  expect(body.success).toBeUndefined()
  expect(body.error).toBeDefined()
  const error = body.error as Record<string, unknown>
  expect(error.status).toBe(status)
  expect(error.code).toBe(code)
  expect(error.message).toBeDefined()
  expect(typeof error.message).toBe('string')
}

/**
 * JSON-parse a Response and return the body as a Record.
 */
export async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  expect(res.headers.get('content-type')).toContain('application/json')
  return (await res.json()) as Record<string, unknown>
}
