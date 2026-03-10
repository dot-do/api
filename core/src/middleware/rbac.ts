/**
 * Role-Based Access Control (RBAC) middleware for @dotdo/api
 *
 * Provides tenant-scoped roles with hierarchical permissions:
 *   guest < viewer < agent < member < admin < owner < superadmin
 *
 * Integrates with the existing auth-levels middleware:
 *   authMiddleware → authLevelMiddleware → rbacMiddleware
 */
import type { MiddlewareHandler, Context } from 'hono'
import type { UserContext } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BuiltInRole = 'superadmin' | 'owner' | 'admin' | 'member' | 'agent' | 'viewer' | 'guest'

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'list' | 'execute' | 'manage' | '*'

export interface Permission {
  resource: string
  action: PermissionAction | string
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'exists'
  value: string | string[] | boolean
}

export interface RoleDefinition {
  name: string
  description: string
  permissions: Permission[]
  inherits?: string[]
  system?: boolean
}

export interface PolicyDecision {
  allowed: boolean
  reason: string
  matchedPermission?: Permission
}

export interface ResourceContext {
  type: string
  id?: string
  ownerId?: string
  tenantId?: string
  attributes?: Record<string, unknown>
}

export interface RBACUserContext {
  id: string
  roles: string[]
  permissions?: string[]
  tenantId?: string
}

// ---------------------------------------------------------------------------
// Role Hierarchy
// ---------------------------------------------------------------------------

export const ROLE_HIERARCHY: Record<BuiltInRole, number> = {
  guest: 0,
  viewer: 10,
  agent: 20,
  member: 30,
  admin: 50,
  owner: 60,
  superadmin: 100,
}

export function isRoleAtLeast(roleA: string, roleB: string): boolean {
  const levelA = ROLE_HIERARCHY[roleA as BuiltInRole] ?? -1
  const levelB = ROLE_HIERARCHY[roleB as BuiltInRole] ?? -1
  return levelA >= levelB
}

export function getHighestRole(roles: string[]): string | undefined {
  let highest: string | undefined
  let highestLevel = -1
  for (const role of roles) {
    const level = ROLE_HIERARCHY[role as BuiltInRole] ?? -1
    if (level > highestLevel) {
      highestLevel = level
      highest = role
    }
  }
  return highest
}

// ---------------------------------------------------------------------------
// Default Role Definitions
// ---------------------------------------------------------------------------

export const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  superadmin: {
    name: 'superadmin',
    description: 'Platform superadmin — full access across all tenants',
    permissions: [{ resource: '*', action: '*' }],
    system: true,
  },

  owner: {
    name: 'owner',
    description: 'Tenant owner — full access within their tenant',
    permissions: [{ resource: '*', action: '*', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] }],
    inherits: ['admin'],
    system: true,
  },

  admin: {
    name: 'admin',
    description: 'Org admin — manage users, settings, and all resources within tenant',
    permissions: [
      { resource: 'user', action: 'manage', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: 'apikey', action: 'manage', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'read', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'list', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'create', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'update', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'delete', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
    ],
    inherits: ['member'],
    system: true,
  },

  member: {
    name: 'member',
    description: 'Authenticated team member — CRUD on most resources',
    permissions: [
      { resource: '*', action: 'read', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'list', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'create', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'update', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
    ],
    inherits: ['viewer'],
    system: true,
  },

  agent: {
    name: 'agent',
    description: 'API agent — read/write via API key, scoped to tenant',
    permissions: [
      { resource: '*', action: 'read' },
      { resource: '*', action: 'list' },
      { resource: '*', action: 'create' },
      { resource: '*', action: 'update' },
      { resource: '*', action: 'execute' },
    ],
    system: true,
  },

  viewer: {
    name: 'viewer',
    description: 'Read-only access within tenant',
    permissions: [
      { resource: '*', action: 'read', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
      { resource: '*', action: 'list', conditions: [{ field: 'tenantId', operator: 'eq', value: '$user.tenantId' }] },
    ],
    system: true,
  },

  guest: {
    name: 'guest',
    description: 'Unauthenticated — public read-only',
    permissions: [
      { resource: '*', action: 'read', conditions: [{ field: 'public', operator: 'eq', value: true }] },
      { resource: '*', action: 'list', conditions: [{ field: 'public', operator: 'eq', value: true }] },
    ],
    system: true,
  },
}

// ---------------------------------------------------------------------------
// Policy Engine
// ---------------------------------------------------------------------------

export class PolicyEngine {
  private roles: Map<string, RoleDefinition>
  private cache: Map<string, Permission[]>

  constructor(customRoles: Record<string, RoleDefinition> = {}) {
    this.roles = new Map()
    this.cache = new Map()
    for (const [name, role] of Object.entries(DEFAULT_ROLES)) {
      this.roles.set(name, role)
    }
    for (const [name, role] of Object.entries(customRoles)) {
      if (this.roles.get(name)?.system && !role.system) continue
      this.roles.set(name, role)
    }
  }

  getRolePermissions(roleName: string): Permission[] {
    const cached = this.cache.get(roleName)
    if (cached) return cached

    const role = this.roles.get(roleName)
    if (!role) return []

    const perms = [...role.permissions]
    if (role.inherits) {
      for (const parent of role.inherits) {
        perms.push(...this.getRolePermissions(parent))
      }
    }

    this.cache.set(roleName, perms)
    return perms
  }

  getUserPermissions(user: RBACUserContext): Permission[] {
    const perms: Permission[] = []
    for (const role of user.roles) {
      perms.push(...this.getRolePermissions(role))
    }
    if (user.permissions) {
      for (const scope of user.permissions) {
        const [resource, action] = scope.split(':')
        if (resource && action) perms.push({ resource, action })
      }
    }
    return perms
  }

  check(user: RBACUserContext, action: string, resource: ResourceContext): PolicyDecision {
    // Tenant isolation first (superadmin bypasses)
    if (resource.tenantId && user.tenantId && user.tenantId !== resource.tenantId) {
      if (!user.roles.includes('superadmin')) {
        return { allowed: false, reason: `Tenant isolation: ${user.tenantId} cannot access ${resource.tenantId}` }
      }
    }

    const perms = this.getUserPermissions(user)
    for (const perm of perms) {
      if (!this.matchesAction(perm, resource.type, action)) continue
      if (!perm.conditions || perm.conditions.length === 0) {
        return { allowed: true, reason: `${perm.resource}:${perm.action}`, matchedPermission: perm }
      }
      if (perm.conditions.every((c) => this.evalCondition(c, resource, user))) {
        return { allowed: true, reason: `${perm.resource}:${perm.action} (conditional)`, matchedPermission: perm }
      }
    }

    return { allowed: false, reason: `No permission for ${action} on ${resource.type}` }
  }

  addRole(role: RoleDefinition): void {
    if (this.roles.get(role.name)?.system) throw new Error(`Cannot override system role: ${role.name}`)
    this.roles.set(role.name, role)
    this.cache.clear()
  }

  private matchesAction(perm: Permission, resourceType: string, action: string): boolean {
    if (perm.resource !== '*' && perm.resource !== resourceType) return false
    if (perm.action === '*') return true
    if (perm.action === 'manage') {
      return ['create', 'read', 'update', 'delete', 'list'].includes(action)
    }
    return perm.action === action
  }

  private evalCondition(cond: PermissionCondition, resource: ResourceContext, user: RBACUserContext): boolean {
    let actual: unknown
    if (cond.field === 'tenantId') actual = resource.tenantId
    else if (cond.field === 'ownerId') actual = resource.ownerId
    else actual = resource.attributes?.[cond.field]

    let expected: unknown = cond.value
    if (typeof expected === 'string') {
      if (expected === '$user.id') expected = user.id
      else if (expected === '$user.tenantId') expected = user.tenantId
    }

    switch (cond.operator) {
      case 'eq':
        return actual === expected
      case 'ne':
        return actual !== expected
      case 'in':
        return Array.isArray(expected) && expected.includes(actual as string)
      case 'nin':
        return !Array.isArray(expected) || !expected.includes(actual as string)
      case 'exists':
        return expected ? actual != null : actual == null
      default:
        return false
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const defaultPolicyEngine = new PolicyEngine()

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export interface RBACConfig {
  customRoles?: Record<string, RoleDefinition>
  getTenantId?: (c: Context) => string | undefined
}

/**
 * RBAC middleware — bridges auth-levels UserContext to RBAC PolicyEngine.
 * Must be used AFTER authLevelMiddleware.
 */
export function rbacMiddleware(config?: RBACConfig): MiddlewareHandler {
  const engine = config?.customRoles ? new PolicyEngine(config.customRoles) : defaultPolicyEngine

  return async (c, next) => {
    c.set('policyEngine' as never, engine as never)

    const user = c.get('user' as never) as UserContext | undefined
    const tenantId = config?.getTenantId?.(c) ?? user?.org

    const rbacUser: RBACUserContext = {
      id: user?.id || (user?.agent?.id ?? 'anonymous'),
      roles: user?.role ? [user.role] : ['guest'],
      tenantId,
    }

    c.set('rbacUser' as never, rbacUser as never)
    await next()
  }
}

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/**
 * Require a specific permission on a resource type.
 *
 * @example
 * ```typescript
 * app.get('/contacts', requirePermission('contact', 'list'), handler)
 * app.post('/contacts', requirePermission('contact', 'create'), handler)
 * app.delete('/contacts/:id', requirePermission('contact', 'delete'), handler)
 * ```
 */
export function requirePermission(
  resource: string,
  action: PermissionAction | string,
  getResourceContext?: (c: Context) => ResourceContext | Promise<ResourceContext>,
): MiddlewareHandler {
  return async (c, next) => {
    const engine = c.get('policyEngine' as never) as PolicyEngine | undefined
    const rbacUser = c.get('rbacUser' as never) as RBACUserContext | undefined

    if (!engine || !rbacUser) {
      return c.json({ error: { message: 'RBAC middleware not initialized', code: 'INTERNAL_ERROR', status: 500 } }, 500)
    }

    let resourceCtx: ResourceContext
    if (getResourceContext) {
      resourceCtx = await getResourceContext(c)
    } else {
      resourceCtx = {
        type: resource,
        id: c.req.param('id'),
        tenantId: rbacUser.tenantId,
      }
    }

    const decision = engine.check(rbacUser, action, resourceCtx)
    if (!decision.allowed) {
      const respond = c.var?.respond
      if (respond) {
        return (respond as (opts: Record<string, unknown>) => Response)({
          error: { message: decision.reason, code: 'FORBIDDEN', status: 403 },
          status: 403,
        })
      }
      return c.json({ error: { message: decision.reason, code: 'FORBIDDEN', status: 403 } }, 403)
    }

    await next()
  }
}

/**
 * Require minimum role level using the hierarchy.
 *
 * @example
 * ```typescript
 * app.use('/admin/*', requireRole('admin'))
 * ```
 */
export function requireRole(minimumRole: BuiltInRole | string): MiddlewareHandler {
  return async (c, next) => {
    const rbacUser = c.get('rbacUser' as never) as RBACUserContext | undefined
    if (!rbacUser) {
      return c.json({ error: { message: 'RBAC middleware not initialized', code: 'INTERNAL_ERROR', status: 500 } }, 500)
    }

    const highest = getHighestRole(rbacUser.roles)
    if (!highest || !isRoleAtLeast(highest, minimumRole)) {
      return c.json({ error: { message: `Required role: ${minimumRole} or higher`, code: 'FORBIDDEN', status: 403 } }, 403)
    }

    await next()
  }
}

/**
 * Require the user to be the resource owner (admins bypass).
 */
export function requireResourceOwner(getOwnerId: (c: Context) => string | Promise<string | undefined> | undefined): MiddlewareHandler {
  return async (c, next) => {
    const rbacUser = c.get('rbacUser' as never) as RBACUserContext | undefined
    if (!rbacUser) {
      return c.json({ error: { message: 'RBAC middleware not initialized', code: 'INTERNAL_ERROR', status: 500 } }, 500)
    }

    if (rbacUser.roles.includes('superadmin') || rbacUser.roles.includes('admin') || rbacUser.roles.includes('owner')) {
      await next()
      return
    }

    const ownerId = await getOwnerId(c)
    if (!ownerId) {
      return c.json({ error: { message: 'Resource not found', code: 'NOT_FOUND', status: 404 } }, 404)
    }

    if (rbacUser.id !== ownerId) {
      return c.json({ error: { message: 'Access denied — not resource owner', code: 'FORBIDDEN', status: 403 } }, 403)
    }

    await next()
  }
}
