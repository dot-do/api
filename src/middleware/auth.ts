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

    // Try Authorization header
    const authHeader = c.req.header('authorization')
    if (authHeader) {
      const result = await verifyToken(authHeader, config)
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

interface VerifyResult {
  user: UserInfo | null
  verified: boolean
}

async function verifyToken(authHeader: string, config: ApiConfig): Promise<VerifyResult> {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null, verified: false }

  const authConfig = config.auth || { mode: 'none' }

  try {
    // Try dynamic import of oauth.do for token verification
    const oauth: Record<string, unknown> | null = await import('oauth.do').catch(() => null)
    if (oauth && typeof oauth.verify === 'function') {
      const user = await (oauth.verify as (token: string) => Promise<UserInfo>)(token)
      return { user, verified: true }
    }

    // SECURITY: Only decode JWT without verification if explicitly enabled via trustUnverified flag.
    // This is INSECURE and should only be used in controlled environments where tokens have been
    // verified upstream (e.g., by a CDN snippet or trusted edge layer).
    //
    // WARNING: Enabling trustUnverified allows ANY attacker who can craft a JWT-like string to
    // impersonate any user. Only enable this if you fully understand the security implications.
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
    // Token decode failed
  }

  return { user: null, verified: false }
}
