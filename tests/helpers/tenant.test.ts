import { describe, it, expect } from 'vitest'
import { extractTenantFromPath, extractTenantFromSubdomain } from '../../src/helpers/tenant'

describe('Tenant Resolution', () => {
  describe('extractTenantFromPath', () => {
    it('extracts tenant from /~slug/ prefix', () => {
      const result = extractTenantFromPath('/~acme/contacts')
      expect(result).toEqual({
        tenant: 'acme',
        remainingPath: '/contacts',
      })
    })

    it('extracts tenant with remaining nested path', () => {
      const result = extractTenantFromPath('/~org123/contacts/create')
      expect(result).toEqual({
        tenant: 'org123',
        remainingPath: '/contacts/create',
      })
    })

    it('handles tenant prefix without trailing path', () => {
      const result = extractTenantFromPath('/~acme')
      expect(result).toEqual({
        tenant: 'acme',
        remainingPath: '/',
      })
    })

    it('handles tenant with trailing slash', () => {
      const result = extractTenantFromPath('/~acme/')
      expect(result).toEqual({
        tenant: 'acme',
        remainingPath: '/',
      })
    })

    it('returns null for paths without tenant prefix', () => {
      expect(extractTenantFromPath('/contacts')).toBeNull()
      expect(extractTenantFromPath('/')).toBeNull()
      expect(extractTenantFromPath('/api/users')).toBeNull()
    })

    it('returns null for malformed tenant prefix', () => {
      expect(extractTenantFromPath('/~')).toBeNull()
      expect(extractTenantFromPath('/~/contacts')).toBeNull()
    })

    it('supports hyphenated tenant slugs', () => {
      const result = extractTenantFromPath('/~my-org/contacts')
      expect(result).toEqual({
        tenant: 'my-org',
        remainingPath: '/contacts',
      })
    })

    it('supports underscored tenant slugs', () => {
      const result = extractTenantFromPath('/~my_org/contacts')
      expect(result).toEqual({
        tenant: 'my_org',
        remainingPath: '/contacts',
      })
    })
  })

  describe('extractTenantFromSubdomain', () => {
    it('extracts tenant from subdomain', () => {
      expect(extractTenantFromSubdomain('acme.headless.ly')).toBe('acme')
    })

    it('extracts tenant from workers.do subdomain', () => {
      expect(extractTenantFromSubdomain('acme.workers.do')).toBe('acme')
    })

    it('returns null for bare domain', () => {
      expect(extractTenantFromSubdomain('headless.ly')).toBeNull()
    })

    it('returns null for localhost', () => {
      expect(extractTenantFromSubdomain('localhost')).toBeNull()
    })

    it('returns null for system subdomains', () => {
      expect(extractTenantFromSubdomain('api.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('www.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('platform.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('dashboard.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('docs.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('agents.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('db.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('ch.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('code.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('crm.headless.ly')).toBeNull()
    })

    it('returns null for journey subdomains', () => {
      expect(extractTenantFromSubdomain('build.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('launch.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('grow.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('scale.headless.ly')).toBeNull()
    })

    it('returns null for multi-level subdomains', () => {
      expect(extractTenantFromSubdomain('a.b.headless.ly')).toBeNull()
    })

    it('is case-insensitive for system subdomains', () => {
      expect(extractTenantFromSubdomain('API.headless.ly')).toBeNull()
      expect(extractTenantFromSubdomain('CRM.headless.ly')).toBeNull()
    })

    it('returns null for unknown base domains', () => {
      expect(extractTenantFromSubdomain('acme.example.com')).toBeNull()
    })

    it('supports custom base domains', () => {
      expect(extractTenantFromSubdomain('acme.custom.io', ['custom.io'])).toBe('acme')
    })

    it('supports custom system subdomains', () => {
      expect(extractTenantFromSubdomain('admin.headless.ly', ['headless.ly'], ['admin'])).toBeNull()
      expect(extractTenantFromSubdomain('myorg.headless.ly', ['headless.ly'], ['admin'])).toBe('myorg')
    })
  })
})
