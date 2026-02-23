import type { MiddlewareHandler } from 'hono'
import type { UserContext } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanRate {
  /** Max requests per period */
  limit: number
  /** Period in seconds */
  period: number
}

export interface PlanQuota {
  /** Total requests allowed per billing period */
  requests: number
}

export interface PlanConfig {
  /** Per-second/minute rate limit for this plan */
  rate: { limit: number; period: number }
  /** Total usage quota for this plan (omit for unlimited) */
  quota?: { requests: number }
  /** Entities accessible on this plan. '*' means all, string[] for specific. */
  entities: string[] | '*'
  /** Display price (e.g. '$29/mo') */
  price?: string
}

export interface BillingConfig {
  /** Plan definitions keyed by plan name, in tier order (lowest to highest) */
  plans: Record<string, PlanConfig>
  /** Feature-to-plan mapping: which features each plan unlocks */
  features: Record<string, string[]>
  /** Optional billing portal URL for upgrade links */
  billingUrl?: string
  /**
   * Optional usage tracking callback. Called per-request for authenticated users.
   * Returns the current usage count after incrementing.
   */
  trackUsage?: (userId: string, plan: string) => number | Promise<number>
}

// ---------------------------------------------------------------------------
// Plan ordering helpers
// ---------------------------------------------------------------------------

/**
 * Derive numeric tier ordering from the plans config.
 * Plans are ordered by their position in Object.keys() (insertion order).
 * Unknown plans (e.g. 'enterprise') get a tier above all configured plans.
 */
function buildPlanOrder(plans: Record<string, PlanConfig>): Record<string, number> {
  const order: Record<string, number> = {}
  const keys = Object.keys(plans)
  keys.forEach((key, index) => {
    order[key] = index
  })
  return order
}

function getPlanTier(planName: string, planOrder: Record<string, number>): number {
  if (planName in planOrder) return planOrder[planName]!
  // Unknown plans (e.g. 'enterprise') are treated as highest tier
  const maxTier = Math.max(0, ...Object.values(planOrder))
  return maxTier + 1
}

// ---------------------------------------------------------------------------
// billingMiddleware — enriches user context with plan-specific limits/usage
// ---------------------------------------------------------------------------

export function billingMiddleware(config: BillingConfig): MiddlewareHandler {
  const defaultPlan = Object.keys(config.plans)[0] || 'free'

  return async (c, next) => {
    const user = c.get('user' as never) as UserContext | undefined

    // Unauthenticated requests pass through — no billing context to enrich
    if (!user || !user.authenticated) {
      await next()
      return
    }

    // Resolve the user's plan from context
    // If user's plan is not in config (e.g. 'enterprise'), keep their plan name
    // but use the default plan's config as a fallback for limits.
    const userPlan = user.plan || defaultPlan
    const isKnownPlan = userPlan in config.plans
    const planConfig = config.plans[userPlan] || config.plans[defaultPlan]
    // Keep the user's original plan name — do NOT downgrade unknown plans to default
    const effectivePlan = userPlan

    // Track usage if callback provided
    let currentUsage = user.usage?.requests?.used || 0
    if (config.trackUsage && user.id) {
      const result = config.trackUsage(user.id, effectivePlan)
      currentUsage = result instanceof Promise ? await result : result
    }

    // Resolve quota limit (-1 means unlimited)
    const quotaLimit = planConfig ? (planConfig.quota?.requests ?? -1) : -1

    // Check quota exceeded before proceeding
    if (quotaLimit > 0 && currentUsage > quotaLimit) {
      const billingUrl = config.billingUrl || 'https://billing.do'
      const tenant = user.tenant
      const tenantSuffix = tenant ? `/~${tenant}` : ''

      return c.json(
        {
          error: {
            message: `Usage quota exceeded: ${currentUsage}/${quotaLimit} requests used. Upgrade your plan for higher limits.`,
            code: 'QUOTA_EXCEEDED',
            status: 429,
          },
          links: {
            upgrade: `${billingUrl}${tenantSuffix}/upgrade`,
            usage: `${billingUrl}${tenantSuffix}/usage`,
          },
        },
        429,
      )
    }

    // Resolve allowed entities
    const allowedEntities = planConfig?.entities || '*'

    // Enrich user context with plan-aware data
    const enrichedUser: UserContext & { allowedEntities?: string[] | '*' } = {
      ...user,
      plan: effectivePlan,
      usage: {
        ...user.usage,
        requests: {
          used: currentUsage,
          limit: quotaLimit,
          ...(planConfig?.quota?.requests && { period: 'month' }),
        },
      },
      allowedEntities,
    }

    // Add upgrade link for non-top-tier plans
    const planKeys = Object.keys(config.plans)
    const isTopTier = planKeys.length === 0 || planKeys[planKeys.length - 1] === effectivePlan || !isKnownPlan
    if (!isTopTier) {
      const billingUrl = config.billingUrl || 'https://billing.do'
      const tenant = user.tenant
      const tenantSuffix = tenant ? `/~${tenant}` : ''
      enrichedUser.links = {
        ...enrichedUser.links,
        upgrade: `${billingUrl}${tenantSuffix}/upgrade`,
      }
    }

    c.set('user' as never, enrichedUser as never)

    await next()
  }
}

// ---------------------------------------------------------------------------
// requirePlan — route-level plan guard factory
// ---------------------------------------------------------------------------

/**
 * Route-level middleware guard that requires the user to be on a specific
 * plan tier or higher.
 *
 * Plans are ordered by their position in the plans config object.
 * Unknown plans (e.g. 'enterprise') are treated as highest tier.
 */
export function requirePlan(
  requiredPlan: string,
  plans: Record<string, PlanConfig>,
  billingUrl?: string,
): MiddlewareHandler {
  const planOrder = buildPlanOrder(plans)
  const requiredTier = getPlanTier(requiredPlan, planOrder)

  return async (c, next) => {
    const user = c.get('user' as never) as UserContext | undefined

    // Not authenticated at all
    if (!user || !user.authenticated) {
      return c.json(
        {
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
            status: 401,
          },
        },
        401,
      )
    }

    const defaultPlan = Object.keys(plans)[0] || 'free'
    const userPlan = user.plan || defaultPlan
    const userTier = getPlanTier(userPlan, planOrder)

    if (userTier >= requiredTier) {
      await next()
      return
    }

    // User's plan is below required tier
    const upgradeBaseUrl = billingUrl || 'https://billing.do'
    const tenant = user.tenant
    const tenantSuffix = tenant ? `/~${tenant}` : ''
    const planConfig = plans[requiredPlan]
    const priceHint = planConfig?.price ? ` (${planConfig.price})` : ''

    return c.json(
      {
        error: {
          message: `Plan '${requiredPlan}'${priceHint} or higher required. Current plan: '${userPlan}'.`,
          code: 'PLAN_REQUIRED',
          status: 403,
          requiredPlan,
          currentPlan: userPlan,
        },
        links: {
          upgrade: `${upgradeBaseUrl}${tenantSuffix}/upgrade?plan=${requiredPlan}`,
        },
      },
      403,
    )
  }
}

// ---------------------------------------------------------------------------
// requireFeature — feature-based guard
// ---------------------------------------------------------------------------

/**
 * Route-level middleware guard that requires the user's plan to include
 * a specific feature.
 *
 * The `features` config maps plan names to arrays of feature strings.
 * The guard checks if the user's plan (or any plan at or below the user's tier)
 * includes the requested feature.
 */
export function requireFeature(
  featureName: string,
  features: Record<string, string[]>,
  plans: Record<string, PlanConfig>,
  billingUrl?: string,
): MiddlewareHandler {
  const planOrder = buildPlanOrder(plans)

  return async (c, next) => {
    const user = c.get('user' as never) as UserContext | undefined

    // Not authenticated at all
    if (!user || !user.authenticated) {
      return c.json(
        {
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
            status: 401,
          },
        },
        401,
      )
    }

    const defaultPlan = Object.keys(plans)[0] || 'free'
    const userPlan = user.plan || defaultPlan
    // Check if the user's plan includes the feature
    const userFeatures = features[userPlan] || []
    if (userFeatures.includes(featureName)) {
      await next()
      return
    }

    // For plans not in config (e.g. 'enterprise'), grant all features
    if (!(userPlan in planOrder)) {
      await next()
      return
    }

    // Find the lowest plan that has this feature
    const requiredPlan = findLowestPlanForFeature(featureName, features, planOrder)

    const upgradeBaseUrl = billingUrl || 'https://billing.do'
    const tenant = user.tenant
    const tenantSuffix = tenant ? `/~${tenant}` : ''
    const planConfig = requiredPlan ? plans[requiredPlan] : undefined
    const priceHint = planConfig?.price ? ` (${planConfig.price})` : ''

    return c.json(
      {
        error: {
          message: `Feature '${featureName}' requires plan '${requiredPlan || 'unknown'}'${priceHint} or higher.`,
          code: 'FEATURE_REQUIRED',
          status: 403,
          feature: featureName,
          requiredPlan: requiredPlan || undefined,
          currentPlan: userPlan,
        },
        links: {
          upgrade: `${upgradeBaseUrl}${tenantSuffix}/upgrade?feature=${featureName}${requiredPlan ? `&plan=${requiredPlan}` : ''}`,
        },
      },
      403,
    )
  }
}

// ---------------------------------------------------------------------------
// Discovery helpers
// ---------------------------------------------------------------------------

/**
 * Find the lowest-tier plan that includes a given feature.
 */
function findLowestPlanForFeature(
  featureName: string,
  features: Record<string, string[]>,
  planOrder: Record<string, number>,
): string | null {
  let lowestPlan: string | null = null
  let lowestTier = Infinity

  for (const [plan, planFeatures] of Object.entries(features)) {
    if (planFeatures.includes(featureName)) {
      const tier = getPlanTier(plan, planOrder)
      if (tier < lowestTier) {
        lowestTier = tier
        lowestPlan = plan
      }
    }
  }

  return lowestPlan
}

/**
 * Get a map of feature name to the minimum plan required for each feature.
 * Useful for API discovery — gated functions can be marked with their required plan.
 */
export function getFeatureRequirements(
  features: Record<string, string[]>,
  plans: Record<string, PlanConfig>,
): Record<string, string> {
  const planOrder = buildPlanOrder(plans)
  const requirements: Record<string, string> = {}

  // Collect all unique features
  const allFeatures = new Set<string>()
  for (const planFeatures of Object.values(features)) {
    for (const f of planFeatures) {
      allFeatures.add(f)
    }
  }

  // For each feature, find the lowest plan that includes it
  for (const feature of allFeatures) {
    const lowestPlan = findLowestPlanForFeature(feature, features, planOrder)
    if (lowestPlan) {
      requirements[feature] = lowestPlan
    }
  }

  return requirements
}
