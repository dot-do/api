import type { MiddlewareHandler } from 'hono'
import type { ApiConfig, ApiEnv, UserInfo } from '../types'
import { extractCookieToken } from '../helpers/cookies'

export function authMiddleware(config: ApiConfig): MiddlewareHandler<ApiEnv> {
  const authConfig = config.auth || { mode: 'none' }

  return async (c, next) => {
    if (authConfig.mode === 'none') {
      await next()
      return
    }

    // NOTE: When used alongside authLevelMiddleware, that middleware will
    // overwrite the 'user' context variable with a richer UserContext object.
    // This middleware's UserInfo is sufficient for simple auth checks.

    // Fast path: trust cf.actor set by auth-identity snippet (tamper-proof —
    // external clients cannot set request.cf). Skips the AUTH RPC binding
    // call entirely, saving 5-10ms of latency per request.
    const cf = (c.req.raw as unknown as { cf?: { authenticated?: boolean; actor?: { id: string; name: string; email: string; orgId: string } } }).cf
    if (cf?.authenticated && cf.actor) {
      const user: UserInfo = {
        id: cf.actor.id,
        email: cf.actor.email,
        name: cf.actor.name,
        orgId: cf.actor.orgId,
      }
      c.set('user', user)
      c.set('verifiedUser' as never, user as never)
      await next()
      return
    }

    // Try x-api-key header first, then Authorization header, then auth cookie
    const apiKeyHeader = c.req.header('x-api-key')
    const authHeader = c.req.header('authorization')
    const cookieToken = !authHeader && !apiKeyHeader ? extractCookieToken(c.req.header('cookie')) : undefined
    const tokenSource = apiKeyHeader ? `Bearer ${apiKeyHeader}` : authHeader || (cookieToken ? `Bearer ${cookieToken}` : undefined)

    if (tokenSource) {
      const t0 = performance.now()
      const result = await verifyToken(tokenSource, config, c.env as Record<string, unknown>)
      const ms = Math.round(performance.now() - t0)
      if (ms > 5) console.log(`[timing] verifyToken: ${ms}ms (verified: ${result.verified})`)
      if (result.user) {
        c.set('user', result.user)
        c.set('verifiedUser' as never, result.user as never)
        await next()
        return
      }

      // trustUnverified fallback — decode JWT claims without verification.
      // SECURITY WARNING: Only use when tokens are verified upstream (CDN/edge).
      if (authConfig.trustUnverified && !result.verified) {
        const token = tokenSource.replace(/^Bearer\s+/i, '').trim()
        const user = decodeJwtToUser(token)
        if (user) {
          console.warn(`SECURITY WARNING: trustUnverified — accepting unverified token for ${user.id || 'unknown'}`)
          c.set('user', user)
          c.set('verifiedUser' as never, user as never)
          await next()
          return
        }
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

/** Decode a JWT payload to UserInfo without any signature verification. */
function decodeJwtToUser(token: string): UserInfo | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const payload = JSON.parse(json) as Record<string, unknown>
    if (!payload.sub && !payload.email) return null
    return {
      id: payload.sub as string | undefined,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      ...(payload.orgId ? { orgId: payload.orgId as string } : {}),
      ...(payload.organizationId ? { organizationId: payload.organizationId as string } : {}),
    }
  } catch {
    return null
  }
}

async function verifyToken(authHeader: string, _config: ApiConfig, env?: Record<string, unknown>): Promise<VerifyResult> {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null, verified: false }

  try {
    // AUTH service binding (id.org.ai AuthService via Workers RPC)
    // Single source of truth — verifies ses_*, oai_*/hly_sk_*, and WorkOS JWTs.
    const authBinding = env?.AUTH as { verifyToken?: (token: string) => Promise<{ valid: boolean; user?: UserInfo; error?: string }> } | undefined
    if (authBinding && typeof authBinding.verifyToken === 'function') {
      const result = await authBinding.verifyToken(token)
      if (result.valid && result.user) {
        return { user: result.user, verified: true }
      }
    }
  } catch {
    // AUTH binding call failed
  }

  return { user: null, verified: false }
}
