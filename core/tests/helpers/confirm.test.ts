import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateConfirmHash,
  validateConfirmHash,
  buildConfirmUrl,
  buildConfirmPreview,
  type ConfirmParams,
} from '../../src/helpers/confirm'

describe('Confirm helper', () => {
  // ============================================================================
  // generateConfirmHash
  // ============================================================================
  describe('generateConfirmHash', () => {
    it('produces a 6-char hex string', async () => {
      const hash = await generateConfirmHash({
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      })
      expect(hash).toMatch(/^[0-9a-f]{6}$/)
    })

    it('produces consistent output for same params', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice', email: 'alice@acme.com' },
        secret: 'test-secret',
        tenant: 'acme',
        userId: 'user_123',
      }
      const hash1 = await generateConfirmHash(params)
      const hash2 = await generateConfirmHash(params)
      expect(hash1).toBe(hash2)
    })

    it('produces different output for different actions', async () => {
      const base: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const hash1 = await generateConfirmHash(base)
      const hash2 = await generateConfirmHash({ ...base, action: 'delete' })
      expect(hash1).not.toBe(hash2)
    })

    it('produces different output for different data', async () => {
      const base: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const hash1 = await generateConfirmHash(base)
      const hash2 = await generateConfirmHash({ ...base, data: { name: 'Bob' } })
      expect(hash1).not.toBe(hash2)
    })

    it('produces different output for different secrets', async () => {
      const base: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'secret-1',
      }
      const hash1 = await generateConfirmHash(base)
      const hash2 = await generateConfirmHash({ ...base, secret: 'secret-2' })
      expect(hash1).not.toBe(hash2)
    })

    it('produces different output for different tenants', async () => {
      const base: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
        tenant: 'acme',
      }
      const hash1 = await generateConfirmHash(base)
      const hash2 = await generateConfirmHash({ ...base, tenant: 'globex' })
      expect(hash1).not.toBe(hash2)
    })

    it('produces different output for different users', async () => {
      const base: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
        userId: 'user_1',
      }
      const hash1 = await generateConfirmHash(base)
      const hash2 = await generateConfirmHash({ ...base, userId: 'user_2' })
      expect(hash1).not.toBe(hash2)
    })

    it('includes timestamp bucket for time-based expiry', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
        ttl: 300000, // 5 min
      }

      // Two calls at the same time bucket should match
      const hash1 = await generateConfirmHash(params)
      const hash2 = await generateConfirmHash(params)
      expect(hash1).toBe(hash2)
    })

    it('handles empty data object', async () => {
      const hash = await generateConfirmHash({
        action: 'delete',
        data: {},
        secret: 'test-secret',
      })
      expect(hash).toMatch(/^[0-9a-f]{6}$/)
    })

    it('handles type in params', async () => {
      const base: ConfirmParams = {
        action: 'create',
        type: 'Contact',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const hash1 = await generateConfirmHash(base)
      const hash2 = await generateConfirmHash({ ...base, type: 'Lead' })
      expect(hash1).not.toBe(hash2)
    })
  })

  // ============================================================================
  // validateConfirmHash
  // ============================================================================
  describe('validateConfirmHash', () => {
    it('succeeds for a valid hash within TTL', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
        ttl: 300000, // 5 min
      }
      const hash = await generateConfirmHash(params)
      const valid = await validateConfirmHash(hash, params)
      expect(valid).toBe(true)
    })

    it('fails for wrong hash', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const valid = await validateConfirmHash('ffffff', params)
      expect(valid).toBe(false)
    })

    it('fails when data differs', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const hash = await generateConfirmHash(params)
      const valid = await validateConfirmHash(hash, { ...params, data: { name: 'Bob' } })
      expect(valid).toBe(false)
    })

    it('fails when action differs', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const hash = await generateConfirmHash(params)
      const valid = await validateConfirmHash(hash, { ...params, action: 'update' })
      expect(valid).toBe(false)
    })

    it('fails after TTL expires', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
        ttl: 60000, // 1 minute
      }

      // Generate hash at an earlier time bucket
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      const hash = await generateConfirmHash(params)

      // Move time forward past TTL (2 full buckets ahead to guarantee bucket change)
      vi.spyOn(Date, 'now').mockReturnValue(now + 120001)
      const valid = await validateConfirmHash(hash, params)
      expect(valid).toBe(false)

      vi.restoreAllMocks()
    })

    it('succeeds within the current and previous time bucket', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
        ttl: 300000, // 5 min
      }

      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      const hash = await generateConfirmHash(params)

      // Move time to just under one TTL bucket
      vi.spyOn(Date, 'now').mockReturnValue(now + 299999)
      const valid = await validateConfirmHash(hash, params)
      expect(valid).toBe(true)

      vi.restoreAllMocks()
    })

    it('uses default TTL of 5 minutes when not specified', async () => {
      const params: ConfirmParams = {
        action: 'create',
        data: { name: 'Alice' },
        secret: 'test-secret',
      }
      const hash = await generateConfirmHash(params)
      // Should validate with default TTL
      const valid = await validateConfirmHash(hash, params)
      expect(valid).toBe(true)
    })
  })

  // ============================================================================
  // buildConfirmUrl
  // ============================================================================
  describe('buildConfirmUrl', () => {
    it('appends confirm hash to URL with existing params', () => {
      const url = buildConfirmUrl(
        'https://crm.do/~acme/contacts/create?name=Alice&email=alice@acme.com',
        'a8f3e2',
      )
      expect(url).toBe('https://crm.do/~acme/contacts/create?name=Alice&email=alice%40acme.com&confirm=a8f3e2')
    })

    it('appends confirm hash to URL without existing params', () => {
      const url = buildConfirmUrl('https://crm.do/~acme/contact_abc/delete', 'b2c4d6')
      expect(url).toBe('https://crm.do/~acme/contact_abc/delete?confirm=b2c4d6')
    })

    it('handles URL with trailing slash', () => {
      const url = buildConfirmUrl('https://crm.do/~acme/contacts/create?name=Alice', 'abc123')
      expect(url).toContain('confirm=abc123')
    })
  })

  // ============================================================================
  // buildConfirmPreview
  // ============================================================================
  describe('buildConfirmPreview', () => {
    it('builds correct confirm block for create', () => {
      const preview = buildConfirmPreview({
        action: 'create',
        type: 'Contact',
        data: { name: 'Alice Johnson', email: 'alice@acme.com' },
        baseUrl: 'https://crm.do/~acme/contacts/create?name=Alice+Johnson&email=alice@acme.com',
        cancelUrl: 'https://crm.do/~acme/contacts',
        hash: 'a8f3e2',
      })

      expect(preview.action).toBe('create')
      expect(preview.type).toBe('Contact')
      expect(preview.preview).toEqual({ name: 'Alice Johnson', email: 'alice@acme.com' })
      expect(preview.execute).toContain('confirm=a8f3e2')
      expect(preview.cancel).toBe('https://crm.do/~acme/contacts')
    })

    it('builds correct confirm block for update', () => {
      const preview = buildConfirmPreview({
        action: 'update',
        type: 'Contact',
        data: { status: 'Qualified' },
        baseUrl: 'https://crm.do/~acme/contact_abc/update?status=Qualified',
        cancelUrl: 'https://crm.do/~acme/contact_abc',
        hash: 'b2c4d6',
      })

      expect(preview.action).toBe('update')
      expect(preview.type).toBe('Contact')
      expect(preview.preview).toEqual({ status: 'Qualified' })
      expect(preview.execute).toContain('confirm=b2c4d6')
      expect(preview.cancel).toBe('https://crm.do/~acme/contact_abc')
    })

    it('builds correct confirm block for verb action', () => {
      const preview = buildConfirmPreview({
        action: 'qualify',
        type: 'Contact',
        data: {},
        baseUrl: 'https://crm.do/~acme/contact_abc/qualify',
        cancelUrl: 'https://crm.do/~acme/contact_abc',
        hash: 'c3d5e7',
      })

      expect(preview.action).toBe('qualify')
      expect(preview.type).toBe('Contact')
      expect(preview.preview).toEqual({})
      expect(preview.execute).toContain('confirm=c3d5e7')
      expect(preview.cancel).toBe('https://crm.do/~acme/contact_abc')
    })

    it('builds correct confirm block for delete', () => {
      const preview = buildConfirmPreview({
        action: 'delete',
        type: 'Contact',
        data: {},
        baseUrl: 'https://crm.do/~acme/contact_abc/delete',
        cancelUrl: 'https://crm.do/~acme/contact_abc',
        hash: 'd4e6f8',
      })

      expect(preview.action).toBe('delete')
      expect(preview.type).toBe('Contact')
      expect(preview.execute).toContain('confirm=d4e6f8')
      expect(preview.cancel).toBe('https://crm.do/~acme/contact_abc')
    })

    it('builds correct confirm block for revert', () => {
      const preview = buildConfirmPreview({
        action: 'revert',
        type: 'Contact',
        data: { to: 'v3' },
        baseUrl: 'https://crm.do/~acme/contact_abc/revert?to=v3',
        cancelUrl: 'https://crm.do/~acme/contact_abc',
        hash: 'e5f7a9',
      })

      expect(preview.action).toBe('revert')
      expect(preview.type).toBe('Contact')
      expect(preview.preview).toEqual({ to: 'v3' })
      expect(preview.execute).toContain('confirm=e5f7a9')
      expect(preview.cancel).toBe('https://crm.do/~acme/contact_abc')
    })
  })
})
