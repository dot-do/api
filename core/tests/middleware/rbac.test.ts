import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import {
  PolicyEngine,
  defaultPolicyEngine,
  rbacMiddleware,
  requirePermission,
  requireRole,
  requireResourceOwner,
  isRoleAtLeast,
  getHighestRole,
  ROLE_HIERARCHY,
  DEFAULT_ROLES,
} from '../../src/middleware/rbac'
import type { RBACUserContext, ResourceContext } from '../../src/middleware/rbac'

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

describe('role hierarchy', () => {
  it('defines correct ordering', () => {
    expect(ROLE_HIERARCHY.guest).toBeLessThan(ROLE_HIERARCHY.viewer)
    expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.agent)
    expect(ROLE_HIERARCHY.agent).toBeLessThan(ROLE_HIERARCHY.member)
    expect(ROLE_HIERARCHY.member).toBeLessThan(ROLE_HIERARCHY.admin)
    expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner)
    expect(ROLE_HIERARCHY.owner).toBeLessThan(ROLE_HIERARCHY.superadmin)
  })

  it('isRoleAtLeast compares correctly', () => {
    expect(isRoleAtLeast('admin', 'member')).toBe(true)
    expect(isRoleAtLeast('member', 'admin')).toBe(false)
    expect(isRoleAtLeast('admin', 'admin')).toBe(true)
    expect(isRoleAtLeast('superadmin', 'owner')).toBe(true)
  })

  it('getHighestRole returns highest', () => {
    expect(getHighestRole(['viewer', 'admin', 'member'])).toBe('admin')
    expect(getHighestRole(['guest'])).toBe('guest')
    expect(getHighestRole([])).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// PolicyEngine
// ---------------------------------------------------------------------------

describe('PolicyEngine', () => {
  it('loads default roles', () => {
    const engine = new PolicyEngine()
    expect(engine.getRolePermissions('superadmin').length).toBeGreaterThan(0)
    expect(engine.getRolePermissions('nonexistent')).toEqual([])
  })

  it('superadmin can do anything', () => {
    const user: RBACUserContext = { id: 'u1', roles: ['superadmin'], tenantId: 'acme' }
    const resource: ResourceContext = { type: 'contact', tenantId: 'acme' }
    const decision = defaultPolicyEngine.check(user, 'delete', resource)
    expect(decision.allowed).toBe(true)
  })

  it('superadmin bypasses tenant isolation', () => {
    const user: RBACUserContext = { id: 'u1', roles: ['superadmin'], tenantId: 'acme' }
    const resource: ResourceContext = { type: 'contact', tenantId: 'other-tenant' }
    const decision = defaultPolicyEngine.check(user, 'read', resource)
    expect(decision.allowed).toBe(true)
  })

  it('admin can manage within own tenant', () => {
    const user: RBACUserContext = { id: 'u1', roles: ['admin'], tenantId: 'acme' }
    const resource: ResourceContext = { type: 'user', tenantId: 'acme' }
    const decision = defaultPolicyEngine.check(user, 'delete', resource)
    expect(decision.allowed).toBe(true)
  })

  it('admin cannot access other tenant', () => {
    const user: RBACUserContext = { id: 'u1', roles: ['admin'], tenantId: 'acme' }
    const resource: ResourceContext = { type: 'contact', tenantId: 'other' }
    const decision = defaultPolicyEngine.check(user, 'read', resource)
    expect(decision.allowed).toBe(false)
  })

  it('member can read and create but not delete', () => {
    const user: RBACUserContext = { id: 'u1', roles: ['member'], tenantId: 'acme' }
    const resource: ResourceContext = { type: 'contact', tenantId: 'acme' }
    expect(defaultPolicyEngine.check(user, 'read', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'create', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'delete', resource).allowed).toBe(false)
  })

  it('viewer can only read', () => {
    const user: RBACUserContext = { id: 'u1', roles: ['viewer'], tenantId: 'acme' }
    const resource: ResourceContext = { type: 'contact', tenantId: 'acme' }
    expect(defaultPolicyEngine.check(user, 'read', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'list', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'create', resource).allowed).toBe(false)
    expect(defaultPolicyEngine.check(user, 'update', resource).allowed).toBe(false)
  })

  it('agent can read/write without tenant condition', () => {
    const user: RBACUserContext = { id: 'agent_abc', roles: ['agent'] }
    const resource: ResourceContext = { type: 'contact' }
    expect(defaultPolicyEngine.check(user, 'read', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'create', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'execute', resource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'delete', resource).allowed).toBe(false)
  })

  it('guest can only read public resources', () => {
    const user: RBACUserContext = { id: 'anon', roles: ['guest'] }
    const publicResource: ResourceContext = { type: 'content', attributes: { public: true } }
    const privateResource: ResourceContext = { type: 'content', attributes: { public: false } }
    expect(defaultPolicyEngine.check(user, 'read', publicResource).allowed).toBe(true)
    expect(defaultPolicyEngine.check(user, 'read', privateResource).allowed).toBe(false)
  })

  it('supports custom roles', () => {
    const engine = new PolicyEngine({
      billing_admin: {
        name: 'billing_admin',
        description: 'Can manage billing resources',
        permissions: [{ resource: 'invoice', action: 'manage' }],
      },
    })
    const user: RBACUserContext = { id: 'u1', roles: ['billing_admin'] }
    const resource: ResourceContext = { type: 'invoice' }
    expect(engine.check(user, 'create', resource).allowed).toBe(true)
    expect(engine.check(user, 'delete', resource).allowed).toBe(true)
    // manage does not include execute
    expect(engine.check(user, 'execute', resource).allowed).toBe(false)
  })

  it('cannot override system roles', () => {
    const engine = new PolicyEngine({
      superadmin: { name: 'superadmin', description: 'Fake', permissions: [] },
    })
    // Should still have original superadmin permissions
    const user: RBACUserContext = { id: 'u1', roles: ['superadmin'] }
    expect(engine.check(user, 'read', { type: 'anything' }).allowed).toBe(true)
  })

  it('addRole throws for system roles', () => {
    const engine = new PolicyEngine()
    expect(() => engine.addRole({ name: 'admin', description: 'x', permissions: [], system: false })).toThrow('Cannot override system role')
  })

  it('supports scope-based permissions', () => {
    const user: RBACUserContext = { id: 'u1', roles: [], permissions: ['contact:read', 'deal:create'] }
    const engine = new PolicyEngine()
    expect(engine.check(user, 'read', { type: 'contact' }).allowed).toBe(true)
    expect(engine.check(user, 'create', { type: 'deal' }).allowed).toBe(true)
    expect(engine.check(user, 'delete', { type: 'contact' }).allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Middleware integration
// ---------------------------------------------------------------------------

function buildApp(userRole: string, userTenantId?: string) {
  const app = new Hono()
  // Simulate auth-levels middleware by setting user context
  app.use('*', async (c, next) => {
    c.set('user' as never, { authenticated: true, role: userRole, org: userTenantId, id: 'user_123' } as never)
    await next()
  })
  app.use('*', rbacMiddleware())
  return app
}

describe('rbacMiddleware', () => {
  it('sets policyEngine and rbacUser on context', async () => {
    const app = buildApp('admin', 'acme')
    app.get('/test', (c) => {
      const engine = c.get('policyEngine' as never)
      const rbacUser = c.get('rbacUser' as never) as RBACUserContext
      return c.json({ hasEngine: !!engine, roles: rbacUser.roles, tenantId: rbacUser.tenantId })
    })
    const res = await app.request('/test')
    const body = await res.json()
    expect(body.hasEngine).toBe(true)
    expect(body.roles).toEqual(['admin'])
    expect(body.tenantId).toBe('acme')
  })
})

describe('requirePermission', () => {
  it('allows admin to access resource in their tenant', async () => {
    const app = buildApp('admin', 'acme')
    app.get('/contacts', requirePermission('contact', 'list'), (c) => c.json({ ok: true }))
    const res = await app.request('/contacts')
    expect(res.status).toBe(200)
  })

  it('denies viewer from creating', async () => {
    const app = buildApp('viewer', 'acme')
    app.post('/contacts', requirePermission('contact', 'create'), (c) => c.json({ ok: true }))
    const res = await app.request('/contacts', { method: 'POST' })
    expect(res.status).toBe(403)
  })

  it('denies guest from non-public resource', async () => {
    const app = buildApp('guest')
    app.get('/contacts', requirePermission('contact', 'read'), (c) => c.json({ ok: true }))
    const res = await app.request('/contacts')
    expect(res.status).toBe(403)
  })
})

describe('requireRole', () => {
  it('allows higher roles', async () => {
    const app = buildApp('admin', 'acme')
    app.get('/admin', requireRole('member'), (c) => c.json({ ok: true }))
    const res = await app.request('/admin')
    expect(res.status).toBe(200)
  })

  it('denies lower roles', async () => {
    const app = buildApp('viewer', 'acme')
    app.get('/admin', requireRole('admin'), (c) => c.json({ ok: true }))
    const res = await app.request('/admin')
    expect(res.status).toBe(403)
  })
})

describe('requireResourceOwner', () => {
  it('allows resource owner', async () => {
    const app = buildApp('member', 'acme')
    app.get(
      '/contacts/:id',
      requireResourceOwner(() => 'user_123'),
      (c) => c.json({ ok: true }),
    )
    const res = await app.request('/contacts/c1')
    expect(res.status).toBe(200)
  })

  it('denies non-owner', async () => {
    const app = buildApp('member', 'acme')
    app.get(
      '/contacts/:id',
      requireResourceOwner(() => 'other_user'),
      (c) => c.json({ ok: true }),
    )
    const res = await app.request('/contacts/c1')
    expect(res.status).toBe(403)
  })

  it('allows admin even if not owner', async () => {
    const app = buildApp('admin', 'acme')
    app.get(
      '/contacts/:id',
      requireResourceOwner(() => 'other_user'),
      (c) => c.json({ ok: true }),
    )
    const res = await app.request('/contacts/c1')
    expect(res.status).toBe(200)
  })
})
