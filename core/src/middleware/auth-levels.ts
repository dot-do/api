import type { MiddlewareHandler, Context } from 'hono'
import type { UserContext } from '../types'
import { extractCookieToken } from '../helpers/cookies'

// SECURITY NOTE: This middleware performs NO cryptographic verification.
// It inspects token format to classify auth level (L0-L4).
// It MUST be used after authMiddleware (which verifies via AUTH RPC)
// or behind the auth-identity snippet (which verifies at CDN edge).
// Using this middleware standalone provides NO authentication guarantee.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthLevel = 'claimed' | 'verified' | 'admin' | 'superadmin'

export interface AuthLevelConfig {
  identityUrl?: string
  billingUrl?: string
}

type Level = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'

/** Numeric ordering so we can compare with >= */
const LEVEL_ORDER: Record<Level, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
}

/** Map the friendly requireAuth argument to the minimum Level needed. */
const AUTH_LEVEL_MAP: Record<string, Level> = {
  claimed: 'L2',
  verified: 'L2',
  admin: 'L3',
  superadmin: 'L4',
}

// ---------------------------------------------------------------------------
// Token parsing helpers (no crypto — simple string inspection)
// ---------------------------------------------------------------------------

/**
 * Check whether a raw token string is an API key (vs JWT).
 * Simple heuristic: JWTs contain dots (header.payload.signature), API keys don't.
 */
function isApiKey(token: string): boolean {
  return !token.includes('.')
}

/** Known API key prefixes — stripped to derive a human-friendly agent name. */
const API_KEY_PREFIXES = /^(agent_|sk_live_|sk_test_|oai_|hly_sk_|sk_|ses_)/

/** Strip known API key prefix to derive a short agent name for display. */
function stripKeyPrefix(key: string): string {
  return key.replace(API_KEY_PREFIXES, '')
}

/** Decode a JWT payload segment (base64url → JSON). Returns null on any failure. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Determine auth level from the raw request
// ---------------------------------------------------------------------------
//
// L0 — Anonymous (no token)
// L1 — API key (agent identity)
// L2 — Authenticated user (valid JWT with sub)
// L3 — Org admin (admin/owner role within their org/tenant)
// L4 — Superadmin (platformRole: 'superadmin' — .do org only, minted by AUTH worker)
//

interface DetectedAuth {
  level: Level
  claims: Record<string, unknown> | null
}

function detectAuth(c: Context): DetectedAuth {
  // 0. Fast path: trust cf.actor from auth-identity snippet (tamper-proof)
  const cf = (c.req.raw as unknown as { cf?: { authenticated?: boolean; actor?: { id: string; name: string; email: string; orgId: string; platformRole?: string; roles?: string[] } } }).cf
  if (cf?.authenticated && cf.actor) {
    const isSuperadmin = cf.actor.platformRole === 'superadmin'
    const isOrgAdmin = Array.isArray(cf.actor.roles) && cf.actor.roles.some((r) => /admin|owner/i.test(r))
    const level: Level = isSuperadmin ? 'L4' : isOrgAdmin ? 'L3' : 'L2'
    return {
      level,
      claims: { sub: cf.actor.id, name: cf.actor.name, email: cf.actor.email, orgId: cf.actor.orgId, platformRole: cf.actor.platformRole },
    }
  }

  // 1. Check x-api-key header first — intent is unambiguous, any value is an API key
  const apiKey = c.req.header('x-api-key')
  if (apiKey) {
    return {
      level: 'L1',
      claims: { agentId: apiKey, agentName: stripKeyPrefix(apiKey) },
    }
  }

  // 2. Check Authorization header, then auth cookie
  const authHeader = c.req.header('authorization')
  const cookieToken = !authHeader ? extractCookieToken(c.req.header('cookie')) : undefined
  const rawToken = authHeader?.replace(/^Bearer\s+/i, '').trim() || cookieToken
  if (!rawToken) return { level: 'L0', claims: null }

  const token = rawToken

  // 2a. API key in Authorization header (any non-JWT token)
  if (isApiKey(token)) {
    return {
      level: 'L1',
      claims: { agentId: token, agentName: stripKeyPrefix(token) },
    }
  }

  // 2b. JWT
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.sub) return { level: 'L0', claims: null }

  // L4 — platform superadmin (AUTH worker mints platformRole: 'superadmin' for .do org)
  if (payload.platformRole === 'superadmin') {
    return { level: 'L4', claims: payload }
  }

  // L3 — org admin (admin/owner role in their tenant)
  const roles = payload.roles as string[] | undefined
  if (Array.isArray(roles) && roles.some((r) => /admin|owner/i.test(r))) {
    return { level: 'L3', claims: payload }
  }

  // L2 — authenticated user
  return { level: 'L2', claims: payload }
}

// ---------------------------------------------------------------------------
// buildUserContext — public, exported for direct use and testing
// ---------------------------------------------------------------------------

const DEFAULT_IDENTITY_URL = 'https://id.org.ai'
const DEFAULT_BILLING_URL = 'https://billing.do'

/** Extract org/tenant ID from JWT claims (supports multiple formats) */
function extractTenant(claims: Record<string, unknown> | null): string | undefined {
  if (!claims) return undefined
  const org = claims.org as { id?: string } | undefined
  return (claims.tenant as string) || org?.id || (claims.org_id as string) || (claims.orgId as string) || undefined
}

export function buildUserContext(
  claims: Record<string, unknown> | null,
  level: Level,
  config?: AuthLevelConfig,
): UserContext {
  const identityUrl = config?.identityUrl || DEFAULT_IDENTITY_URL
  const billingUrl = config?.billingUrl || DEFAULT_BILLING_URL

  switch (level) {
    case 'L0':
      return {
        authenticated: false,
        level: 'L0',
        links: {
          register: `${identityUrl}/register`,
          login: `${identityUrl}/login`,
        },
      }

    case 'L1': {
      const agentId = (claims?.agentId as string) || 'unknown'
      const agentName = (claims?.agentName as string) || agentId
      return {
        authenticated: true,
        level: 'L1',
        agent: { id: agentId, name: agentName },
        plan: 'free',
        links: {
          claim: `${identityUrl}/claim`,
          upgrade: `${billingUrl}/upgrade`,
        },
      }
    }

    case 'L2': {
      const tenant = extractTenant(claims)
      const tenantSuffix = tenant ? `/~${tenant}` : ''
      return {
        authenticated: true,
        level: 'L2',
        id: claims?.sub as string | undefined,
        name: claims?.name as string | undefined,
        email: claims?.email as string | undefined,
        tenant,
        plan: (claims?.plan as string) || 'free',
        links: {
          billing: `${billingUrl}${tenantSuffix}`,
          settings: `${identityUrl}${tenantSuffix}/settings`,
        },
      }
    }

    case 'L3': {
      const tenant = extractTenant(claims)
      const tenantSuffix = tenant ? `/~${tenant}` : ''
      return {
        authenticated: true,
        level: 'L3',
        id: claims?.sub as string | undefined,
        name: claims?.name as string | undefined,
        email: claims?.email as string | undefined,
        tenant,
        plan: (claims?.plan as string) || 'pro',
        links: {
          billing: `${billingUrl}${tenantSuffix}`,
          settings: `${identityUrl}${tenantSuffix}/settings`,
          team: `${identityUrl}${tenantSuffix}/team`,
        },
      }
    }

    case 'L4': {
      const tenant = extractTenant(claims)
      const tenantSuffix = tenant ? `/~${tenant}` : ''
      return {
        authenticated: true,
        level: 'L4',
        id: claims?.sub as string | undefined,
        name: claims?.name as string | undefined,
        email: claims?.email as string | undefined,
        tenant,
        plan: 'enterprise',
        links: {
          billing: `${billingUrl}${tenantSuffix}`,
          settings: `${identityUrl}${tenantSuffix}/settings`,
          team: `${identityUrl}${tenantSuffix}/team`,
          sso: `${identityUrl}${tenantSuffix}/sso`,
          admin: `${identityUrl}/admin`,
        },
      }
    }
  }
}

// ---------------------------------------------------------------------------
// authLevelMiddleware — sets `user` on context for every request
// ---------------------------------------------------------------------------

export function authLevelMiddleware(config?: AuthLevelConfig): MiddlewareHandler {
  return async (c, next) => {
    const { level, claims } = detectAuth(c)
    const user = buildUserContext(claims, level, config)
    c.set('user' as never, user as never)
    await next()
  }
}

// ---------------------------------------------------------------------------
// requireAuth — route-level guard factory
// ---------------------------------------------------------------------------

/**
 * Route-level guard middleware.
 *
 * - `requireAuth()`              → L1+ (any authenticated)
 * - `requireAuth('claimed')`     → L2+ (authenticated user)
 * - `requireAuth('admin')`       → L3+ (org admin)
 * - `requireAuth('superadmin')`  → L4  (platform superadmin)
 */
export function requireAuth(level?: AuthLevel): MiddlewareHandler {
  const minLevel: Level = level ? (AUTH_LEVEL_MAP[level] ?? 'L1') : 'L1'
  const minOrder = LEVEL_ORDER[minLevel]

  return async (c, next) => {
    const user = c.get('user' as never) as UserContext | undefined
    const currentLevel = (user?.level || 'L0') as Level
    const currentOrder = LEVEL_ORDER[currentLevel]

    if (currentOrder >= minOrder) {
      await next()
      return
    }

    const url = new URL(c.req.url)
    const baseUrl = url.origin
    const loginUrl = `${baseUrl}/login`
    const signupUrl = `${baseUrl}/signup`

    // Browser detection — redirect to login instead of returning JSON
    const accept = c.req.header('accept') || ''
    const isBrowser = accept.includes('text/html')

    // Not authenticated at all → 401 (or redirect for browsers)
    if (!user?.authenticated) {
      if (isBrowser) {
        const redirectUrl = `${loginUrl}?redirect=${encodeURIComponent(url.toString())}`
        return c.redirect(redirectUrl, 302)
      }

      // Use c.var.respond if available for full envelope, otherwise bare JSON
      const respond = c.var?.respond
      if (respond) {
        return respond({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 },
          links: { login: loginUrl, signup: signupUrl, ...(user?.links || {}) },
          status: 401,
        })
      }

      return c.json(
        {
          error: { message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 },
          links: { login: loginUrl, signup: signupUrl, ...(user?.links || {}) },
        },
        401,
      )
    }

    // Authenticated but insufficient level → 403
    const links: Record<string, string> = { ...(user.links || {}) }

    // Add contextual upgrade links based on what's needed
    if (minLevel === 'L2') {
      if (!links.claim) links.claim = `${DEFAULT_IDENTITY_URL}/claim`
    } else if (minLevel === 'L3') {
      if (!links.upgrade) links.upgrade = `${DEFAULT_BILLING_URL}/upgrade`
    }

    const respond = c.var?.respond
    if (respond) {
      return respond({
        error: { message: `Insufficient auth level: requires ${minLevel}, current is ${currentLevel}`, code: 'FORBIDDEN', status: 403 },
        links,
        status: 403,
      })
    }

    return c.json(
      {
        error: { message: `Insufficient auth level: requires ${minLevel}, current is ${currentLevel}`, code: 'FORBIDDEN', status: 403 },
        links,
      },
      403,
    )
  }
}
