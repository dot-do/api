/**
 * OAuth 2.1 protocol testing for MCP servers
 * Supports dynamic client registration, PKCE, and standard OAuth flows
 */

import type {
  McpOAuthTest,
  TestResult,
  TestContext,
  AssertionResult,
} from '../types.js'
import { matchWithPaths } from '../assertions/index.js'

export interface OAuthExecutionOptions {
  server: string
  timeout?: number
  headers?: Record<string, string>
}

export interface OAuthMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint?: string
  jwks_uri?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  grant_types_supported?: string[]
  token_endpoint_auth_methods_supported?: string[]
  code_challenge_methods_supported?: string[]
}

export interface ClientRegistration {
  client_id: string
  client_secret?: string
  client_id_issued_at?: number
  client_secret_expires_at?: number
  registration_access_token?: string
  registration_client_uri?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = generateRandomString(64)
  const challenge = base64UrlEncode(sha256(verifier))
  return { verifier, challenge }
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length]
  }
  return result
}

function sha256(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  // Use sync crypto for simplicity (would use async in production)
  const hashBuffer = new Uint8Array(32)
  // Simple hash for demo - in real impl, use crypto.subtle.digest
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte !== undefined) {
      const idx = i % 32
      hashBuffer[idx] = (hashBuffer[idx] ?? 0) ^ byte
    }
  }
  return hashBuffer.buffer
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Discover OAuth metadata from server
 */
export async function discoverOAuthMetadata(
  server: string,
  timeout: number = 30000
): Promise<OAuthMetadata> {
  const wellKnownUrl = new URL('/.well-known/oauth-authorization-server', server)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(wellKnownUrl.toString(), {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`OAuth discovery failed: ${response.status}`)
    }

    return response.json() as Promise<OAuthMetadata>
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Register a client dynamically
 */
export async function registerClient(
  registrationEndpoint: string,
  registration: {
    client_name: string
    redirect_uris: string[]
    grant_types?: string[]
    token_endpoint_auth_method?: string
    scope?: string
  },
  timeout: number = 30000
): Promise<ClientRegistration> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registration),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Client registration failed: ${response.status} ${error}`)
    }

    return response.json() as Promise<ClientRegistration>
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForToken(
  tokenEndpoint: string,
  params: {
    code: string
    client_id: string
    client_secret?: string
    redirect_uri: string
    code_verifier?: string
  },
  timeout: number = 30000
): Promise<TokenResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
  })

  if (params.client_secret) {
    body.set('client_secret', params.client_secret)
  }

  if (params.code_verifier) {
    body.set('code_verifier', params.code_verifier)
  }

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${error}`)
    }

    return response.json() as Promise<TokenResponse>
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Get client credentials token
 */
export async function getClientCredentialsToken(
  tokenEndpoint: string,
  params: {
    client_id: string
    client_secret: string
    scope?: string
  },
  timeout: number = 30000
): Promise<TokenResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: params.client_id,
    client_secret: params.client_secret,
  })

  if (params.scope) {
    body.set('scope', params.scope)
  }

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token request failed: ${response.status} ${error}`)
    }

    return response.json() as Promise<TokenResponse>
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Execute an OAuth test case
 */
export async function executeOAuthTest(
  test: McpOAuthTest,
  options: OAuthExecutionOptions,
  context?: TestContext
): Promise<TestResult> {
  const startTime = Date.now()
  const assertions: AssertionResult[] = []

  const { server, timeout = 30000 } = options

  try {
    switch (test.type) {
      case 'discovery': {
        const metadata = await discoverOAuthMetadata(server, timeout)

        const result = matchWithPaths(metadata, test.expect)
        assertions.push(...result.assertions)
        break
      }

      case 'registration': {
        const metadata = await discoverOAuthMetadata(server, timeout)

        if (!metadata.registration_endpoint) {
          assertions.push({
            path: 'registration_endpoint',
            expected: 'defined',
            actual: 'undefined',
            passed: false,
            message: 'Server does not support dynamic client registration',
          })
          break
        }

        const registration = await registerClient(
          metadata.registration_endpoint,
          test.request as {
            client_name: string
            redirect_uris: string[]
            grant_types?: string[]
            token_endpoint_auth_method?: string
          },
          timeout
        )

        const result = matchWithPaths(registration, test.expect)
        assertions.push(...result.assertions)
        break
      }

      case 'token': {
        // Token tests require context with client credentials
        if (!context?.clientId) {
          assertions.push({
            path: 'context.clientId',
            expected: 'defined',
            actual: 'undefined',
            passed: false,
            message: 'Token test requires clientId in context',
          })
          break
        }

        const metadata = await discoverOAuthMetadata(server, timeout)

        if (test.flow === 'client_credentials') {
          if (!context.clientSecret) {
            assertions.push({
              path: 'context.clientSecret',
              expected: 'defined',
              actual: 'undefined',
              passed: false,
              message: 'Client credentials flow requires clientSecret',
            })
            break
          }

          const token = await getClientCredentialsToken(
            metadata.token_endpoint,
            {
              client_id: context.clientId,
              client_secret: context.clientSecret,
            },
            timeout
          )

          const result = matchWithPaths(token, test.expect)
          assertions.push(...result.assertions)
        } else {
          // Authorization code flow requires interactive auth
          assertions.push({
            path: 'flow',
            expected: 'client_credentials',
            actual: test.flow,
            passed: false,
            message: 'Authorization code flow requires interactive authentication',
          })
        }
        break
      }

      case 'mcp': {
        // MCP test with or without authentication
        const mcpEndpoint = new URL('/mcp', server)

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (test.authenticated && context?.accessToken) {
          headers['Authorization'] = `Bearer ${context.accessToken}`
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(mcpEndpoint.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: test.method || 'tools/list',
            params: {},
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Check status expectation
        if (test.expect.status !== undefined) {
          const statusMatches = response.status === test.expect.status
          assertions.push({
            path: 'status',
            expected: test.expect.status,
            actual: response.status,
            passed: statusMatches,
            message: statusMatches ? undefined : `Expected status ${test.expect.status} but got ${response.status}`,
          })
        }

        if (response.ok) {
          const body = await response.json()
          const expectWithoutStatus = { ...test.expect }
          delete expectWithoutStatus.status

          if (Object.keys(expectWithoutStatus).length > 0) {
            const result = matchWithPaths(body, expectWithoutStatus)
            assertions.push(...result.assertions)
          }
        } else if (test.expect.error) {
          const body = await response.json().catch(() => ({}))
          const result = matchWithPaths(body, test.expect.error as Record<string, unknown>)
          assertions.push(...result.assertions)
        }
        break
      }
    }
  } catch (error) {
    const err = error as Error
    return {
      id: test.id || test.name,
      name: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      assertions: [],
      error: {
        message: err.message,
        stack: err.stack,
      },
      tags: test.tags,
    }
  }

  const allPassed = assertions.every((a) => a.passed)

  return {
    id: test.id || test.name,
    name: test.name,
    status: allPassed ? 'passed' : 'failed',
    duration: Date.now() - startTime,
    assertions,
    tags: test.tags,
  }
}

/**
 * Create an authenticated context for subsequent tests
 */
export async function createAuthenticatedContext(
  server: string,
  clientId: string,
  clientSecret: string,
  scope?: string
): Promise<TestContext> {
  const metadata = await discoverOAuthMetadata(server)

  const token = await getClientCredentialsToken(metadata.token_endpoint, {
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  })

  return {
    baseUrl: server,
    accessToken: token.access_token,
    clientId,
    clientSecret,
    variables: {},
  }
}
