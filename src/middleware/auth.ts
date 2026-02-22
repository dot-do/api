import type { MiddlewareHandler } from 'hono'
import type { ApiConfig, ApiEnv, UserInfo } from '../types'

export function authMiddleware(config: ApiConfig): MiddlewareHandler<ApiEnv> {
  const authConfig = config.auth || { mode: 'none' }

  return async (c, next) => {
    if (authConfig.mode === 'none') {
      await next()
      return
    }

    // Check snippet headers first (CDN-layer pre-verification)
    if (authConfig.trustSnippets) {
      const snippetValid = c.req.header('x-snippet-auth-valid')
      if (snippetValid === 'true') {
        const user: UserInfo = {
          id: c.req.header('x-snippet-user-id'),
          email: c.req.header('x-snippet-user-email'),
          name: c.req.header('x-snippet-user-name'),
        }
        c.set('user', user)
        await next()
        return
      }
    }

    // Try Authorization header, then auth cookie
    const authHeader = c.req.header('authorization')
    const cookieToken = !authHeader ? extractCookieToken(c.req.header('cookie')) : undefined
    const tokenSource = authHeader || (cookieToken ? `Bearer ${cookieToken}` : undefined)

    if (tokenSource) {
      const result = await verifyToken(tokenSource, config, c.env as Record<string, unknown>)
      if (result.user) {
        c.set('user', result.user)
        await next()
        return
      }

      // If token was provided but couldn't be verified
      if (authConfig.mode === 'required') {
        return c.json({ error: { message: 'Invalid authentication token', code: 'INVALID_TOKEN', status: 401 } }, 401)
      }
      // For optional auth with an invalid token, do NOT set user - proceed without authentication
    } else if (authConfig.mode === 'required') {
      return c.json({ error: { message: 'Authentication required', code: 'AUTH_REQUIRED', status: 401 } }, 401)
    }

    await next()
  }
}

/** Extract token from auth cookie (oauth.do convention) or wos-session (WorkOS AuthKit) */
function extractCookieToken(cookie?: string): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/) || cookie.match(/(?:^|;\s*)wos-session=([^;]+)/)
  return match?.[1]
}

interface VerifyResult {
  user: UserInfo | null
  verified: boolean
}

async function verifyToken(authHeader: string, config: ApiConfig, env?: Record<string, unknown>): Promise<VerifyResult> {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null, verified: false }

  const authConfig = config.auth || { mode: 'none' }

  try {
    // 1. Try AUTH service binding (id.org.ai AuthService via Workers RPC)
    // This is the primary auth path — verifies ses_*, oai_*/hly_sk_*, and WorkOS JWTs.
    const authBinding = env?.AUTH as { verifyToken?: (token: string) => Promise<{ valid: boolean; user?: UserInfo; error?: string }> } | undefined
    if (authBinding && typeof authBinding.verifyToken === 'function') {
      const result = await authBinding.verifyToken(token)
      if (result.valid && result.user) {
        return { user: result.user, verified: true }
      }
    }

    // 2. Last resort: decode JWT without verification if explicitly enabled.
    // SECURITY: This is INSECURE and should only be used in controlled environments
    // where tokens have been verified upstream (e.g., by a CDN snippet or trusted edge layer).
    if (authConfig.trustUnverified === true) {
      console.warn(
        'SECURITY WARNING: Using trustUnverified fallback to decode JWT without signature verification. ' +
          'This is INSECURE and should only be used when tokens are verified by an upstream layer.'
      )

      const parts = token.split('.')
      const payloadPart = parts[1]
      if (parts.length === 3 && payloadPart) {
        const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))
        return {
          user: {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
          },
          verified: false,
        }
      }
    }
  } catch {
    // Token verification/decode failed
  }

  return { user: null, verified: false }
}
