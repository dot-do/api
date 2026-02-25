/**
 * Tenant Resolution
 *
 * Resolves the current tenant from multiple sources with priority:
 * 1. /~tenant/ path prefix (explicit URL)
 * 2. x-tenant header
 * 3. Subdomain (e.g., acme.headless.ly)
 * 4. Auth token tenant claim
 * 5. 'default' fallback
 */

import type { Context } from 'hono'

/**
 * Extract tenant slug from a /~tenant/ path prefix.
 *
 * @param path - The URL path (e.g., '/~acme/contacts')
 * @returns The tenant slug and remaining path, or null if no tenant prefix
 *
 * @example
 * extractTenantFromPath('/~acme/contacts')
 * // => { tenant: 'acme', remainingPath: '/contacts' }
 *
 * @example
 * extractTenantFromPath('/contacts')
 * // => null
 */
export function extractTenantFromPath(path: string): { tenant: string; remainingPath: string } | null {
  // Match /~slug at the start, followed by / or end of string
  const match = path.match(/^\/~([a-zA-Z0-9_-]+)(\/.*)?$/)
  if (!match?.[1]) return null

  return {
    tenant: match[1],
    remainingPath: match[2] || '/',
  }
}

/**
 * Extract tenant from subdomain.
 *
 * Handles patterns like:
 * - acme.headless.ly -> 'acme'
 * - crm.headless.ly -> null (system subdomain, not a tenant)
 * - localhost -> null
 * - headless.ly -> null
 *
 * @param hostname - The request hostname
 * @param baseDomains - Known base domains (e.g., ['headless.ly', 'workers.do'])
 * @param systemSubdomains - Known system subdomains that are NOT tenants
 */
export function extractTenantFromSubdomain(
  hostname: string,
  baseDomains: string[] = ['headless.ly', 'workers.do'],
  systemSubdomains: string[] = [
    'api',
    'www',
    'app',
    'platform',
    'dashboard',
    'docs',
    'agents',
    'db',
    'ch',
    'code',
    'build',
    'launch',
    'grow',
    'scale',
    'sell',
    'crm',
    'ehr',
    'healthcare',
  ],
): string | null {
  // No subdomain possible for bare domains or localhost
  if (!hostname.includes('.') || hostname === 'localhost') return null

  for (const base of baseDomains) {
    if (hostname.endsWith('.' + base)) {
      const subdomain = hostname.slice(0, -(base.length + 1))
      // Skip system subdomains
      if (!subdomain || systemSubdomains.includes(subdomain.toLowerCase())) return null
      // Skip multi-level subdomains (e.g., 'a.b' in 'a.b.headless.ly')
      if (subdomain.includes('.')) return null
      return subdomain
    }
  }

  return null
}

/**
 * Result of tenant resolution
 */
export interface TenantResolution {
  /** The resolved tenant slug */
  tenant: string
  /** Where the tenant was resolved from */
  source: 'path' | 'header' | 'subdomain' | 'token' | 'default'
}

/**
 * Resolve the tenant from a Hono context using priority order:
 * 1. /~tenant/ path prefix
 * 2. x-tenant header
 * 3. Subdomain
 * 4. Auth token tenant claim
 * 5. 'default' fallback
 *
 * @param c - Hono context
 * @param options - Configuration options
 * @returns Resolved tenant info
 */
export function resolveTenant(
  c: Context,
  options?: {
    baseDomains?: string[]
    systemSubdomains?: string[]
  },
): TenantResolution {
  // 1. Path prefix: /~tenant/
  const pathResult = extractTenantFromPath(c.req.path)
  if (pathResult) {
    return { tenant: pathResult.tenant, source: 'path' }
  }

  // 2. x-tenant header
  const headerTenant = c.req.header('x-tenant')
  if (headerTenant) {
    return { tenant: headerTenant, source: 'header' }
  }

  // 3. Subdomain
  const url = new URL(c.req.url)
  const subdomainTenant = extractTenantFromSubdomain(url.hostname, options?.baseDomains, options?.systemSubdomains)
  if (subdomainTenant) {
    return { tenant: subdomainTenant, source: 'subdomain' }
  }

  // 4. Auth token org claim (from user info set by auth middleware)
  const user = c.get('user' as never) as { org?: string } | undefined
  if (user?.org) {
    return { tenant: user.org, source: 'token' }
  }

  // 5. Default fallback
  return { tenant: 'default', source: 'default' }
}
