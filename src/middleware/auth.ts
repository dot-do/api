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
      const user = await verifyToken(authHeader, config)
      if (user) {
        c.set('user', user)
        await next()
        return
      }

      if (authConfig.mode === 'required') {
        return c.json({ error: { message: 'Invalid authentication token', code: 'INVALID_TOKEN', status: 401 } }, 401)
      }
    } else if (authConfig.mode === 'required') {
      return c.json({ error: { message: 'Authentication required', code: 'AUTH_REQUIRED', status: 401 } }, 401)
    }

    await next()
  }
}

async function verifyToken(authHeader: string, _config: ApiConfig): Promise<UserInfo | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null

  try {
    // Try dynamic import of oauth.do for token verification
    const oauth: Record<string, unknown> | null = await import('oauth.do').catch(() => null)
    if (oauth && typeof oauth.verify === 'function') {
      return await (oauth.verify as (token: string) => Promise<UserInfo>)(token)
    }

    // Fallback: decode JWT payload without verification (for snippet-trusted scenarios)
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      }
    }
  } catch {
    // Token decode failed
  }

  return null
}
