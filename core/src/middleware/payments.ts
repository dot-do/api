import type { MiddlewareHandler } from 'hono'
import type { UserContext } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported blockchain networks for x402 payments */
export type PaymentNetwork = 'base' | 'base-sepolia' | 'ethereum' | 'solana' | 'arbitrum' | 'optimism' | 'polygon'

/** Supported payment assets */
export type PaymentAsset = 'USDC' | 'USDT' | 'DAI' | 'ETH'

/** Pricing scheme — 'exact' means a fixed amount per call */
export type PaymentScheme = 'exact'

/** Per-endpoint pricing configuration */
export interface PricedEndpoint {
  /** URL path pattern (e.g. '/contacts', '/contacts/:id', '*') */
  path: string
  /** HTTP method(s) this pricing applies to. Defaults to all methods. */
  methods?: string[]
  /** Price in the smallest denomination (e.g. cents for USDC) as a string to avoid floating-point issues */
  amount: string
  /** Human-readable description of what this endpoint charges for */
  description?: string
}

/** Configuration for a priced resource in x402 format */
export interface PaymentRequirements {
  /** Payment scheme (e.g. 'exact') */
  scheme: PaymentScheme
  /** Blockchain network */
  network: PaymentNetwork
  /** Payment asset (e.g. 'USDC') */
  asset: PaymentAsset
  /** Amount in smallest denomination as string */
  amount: string
  /** Wallet address to pay to */
  payTo: string
  /** Maximum timeout in seconds for payment settlement */
  maxTimeoutSeconds: number
  /** Additional scheme-specific data */
  extra?: Record<string, unknown>
}

/** x402 payment block returned in 402 responses */
export interface PaymentBlock {
  /** Protocol version */
  x402Version: 1
  /** Resource being requested */
  resource: {
    url: string
    description?: string
    mimeType?: string
  }
  /** Accepted payment methods */
  accepts: PaymentRequirements[]
  /** Optional error message */
  error?: string
}

/** Decoded payment payload from PAYMENT-SIGNATURE header */
export interface PaymentPayload {
  /** Protocol version */
  x402Version: 1
  /** Resource URL being paid for */
  resource: string
  /** The accepted payment requirements this payment satisfies */
  accepted: PaymentRequirements
  /** Scheme-specific signed payment data (e.g. signed transaction) */
  payload: string
}

/** Configuration for the payments middleware */
export interface PaymentConfig {
  /** Wallet address to receive payments */
  payTo: string
  /** Per-endpoint pricing rules. Evaluated in order; first match wins. */
  endpoints: PricedEndpoint[]
  /** Accepted blockchain networks. Defaults to ['base']. */
  networks?: PaymentNetwork[]
  /** Accepted payment assets. Defaults to ['USDC']. */
  assets?: PaymentAsset[]
  /** Payment scheme. Defaults to 'exact'. */
  scheme?: PaymentScheme
  /** Maximum timeout in seconds for payment settlement. Defaults to 60. */
  maxTimeoutSeconds?: number
  /** Facilitator URL for payment verification */
  facilitatorUrl?: string
  /** Billing portal URL for subscription upgrade links */
  billingUrl?: string
  /**
   * Optional callback to verify a payment payload.
   * When provided, the middleware calls this to validate the PAYMENT-SIGNATURE header.
   * Should return true if payment is valid and settled.
   * When omitted, any structurally valid payment payload is accepted (useful for testing).
   */
  verifyPayment?: (payload: PaymentPayload) => boolean | Promise<boolean>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Match a request path against a PricedEndpoint pattern.
 * Supports:
 *   - Exact match: '/contacts'
 *   - Wildcard: '*' or '/contacts/*'
 *   - Parameter segments: '/contacts/:id'
 */
function matchEndpoint(endpoint: PricedEndpoint, method: string, path: string): boolean {
  // Check method filter
  if (endpoint.methods && endpoint.methods.length > 0) {
    const upperMethods = endpoint.methods.map((m) => m.toUpperCase())
    if (!upperMethods.includes(method.toUpperCase())) return false
  }

  const pattern = endpoint.path

  // Global wildcard
  if (pattern === '*') return true

  // Normalize paths — strip trailing slash for comparison
  const normPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
  const normPattern = pattern.endsWith('/') && pattern.length > 1 ? pattern.slice(0, -1) : pattern

  // Trailing wildcard: '/foo/*' matches '/foo/bar', '/foo/bar/baz'
  if (normPattern.endsWith('/*')) {
    const prefix = normPattern.slice(0, -2)
    return normPath === prefix || normPath.startsWith(prefix + '/')
  }

  // Segment-by-segment match supporting :param placeholders
  const patternParts = normPattern.split('/')
  const pathParts = normPath.split('/')

  if (patternParts.length !== pathParts.length) return false

  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]!
    if (pp.startsWith(':')) continue // parameter segment — matches anything
    if (pp !== pathParts[i]) return false
  }

  return true
}

/**
 * Find the first matching priced endpoint for a given request.
 */
function findPricedEndpoint(endpoints: PricedEndpoint[], method: string, path: string): PricedEndpoint | undefined {
  return endpoints.find((ep) => matchEndpoint(ep, method, path))
}

/**
 * Build a PaymentBlock for a 402 response.
 */
function buildPaymentBlock(config: PaymentConfig, endpoint: PricedEndpoint, requestUrl: string): PaymentBlock {
  const networks = config.networks || ['base']
  const assets = config.assets || ['USDC']
  const scheme = config.scheme || 'exact'
  const maxTimeoutSeconds = config.maxTimeoutSeconds || 60

  const accepts: PaymentRequirements[] = []
  for (const network of networks) {
    for (const asset of assets) {
      accepts.push({
        scheme,
        network,
        asset,
        amount: endpoint.amount,
        payTo: config.payTo,
        maxTimeoutSeconds,
      })
    }
  }

  return {
    x402Version: 1,
    resource: {
      url: requestUrl,
      description: endpoint.description,
    },
    accepts,
  }
}

/**
 * Decode and parse a PAYMENT-SIGNATURE header value.
 * The header contains a Base64-encoded JSON PaymentPayload.
 */
function decodePaymentSignature(header: string): PaymentPayload | null {
  try {
    const json = atob(header)
    const payload = JSON.parse(json) as PaymentPayload
    if (!payload || payload.x402Version !== 1 || !payload.resource || !payload.accepted || !payload.payload) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// paymentsMiddleware — checks for payment requirements on priced endpoints
// ---------------------------------------------------------------------------

/**
 * Hono middleware that implements the x402 HTTP-native micropayments protocol.
 *
 * For each request, checks if the endpoint has a price configured. If so:
 * 1. If the user is on a subscription plan that covers the endpoint, passes through.
 * 2. If a valid PAYMENT-SIGNATURE header is present, verifies and passes through.
 * 3. Otherwise, returns a 402 Payment Required with an x402 payment block.
 *
 * The middleware integrates with the billing system: users on paid subscription
 * plans bypass per-call payment requirements. The `paygo` plan type is treated
 * as requiring per-call payment.
 */
export function paymentsMiddleware(config: PaymentConfig): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method
    const path = new URL(c.req.url).pathname

    // Find matching priced endpoint
    const endpoint = findPricedEndpoint(config.endpoints, method, path)

    // No pricing configured for this endpoint — pass through
    if (!endpoint) {
      await next()
      return
    }

    // Check if user is on a subscription plan that covers this endpoint
    const user = c.get('user' as never) as UserContext | undefined
    if (user?.authenticated && user.plan && user.plan !== 'free' && user.plan !== 'paygo') {
      // Subscribed users on paid plans bypass per-call payments
      await next()
      return
    }

    // Check for PAYMENT-SIGNATURE header (autonomous agent payment)
    const paymentHeader = c.req.header('payment-signature')
    if (paymentHeader) {
      const payload = decodePaymentSignature(paymentHeader)

      if (!payload) {
        return c.json(
          {
            error: {
              message: 'Invalid PAYMENT-SIGNATURE header: could not decode payment payload',
              code: 'INVALID_PAYMENT',
              status: 400,
            },
          },
          400,
        )
      }

      // Verify the payment if a verifier is configured
      if (config.verifyPayment) {
        const result = config.verifyPayment(payload)
        const isValid = result instanceof Promise ? await result : result

        if (!isValid) {
          return c.json(
            {
              error: {
                message: 'Payment verification failed: the payment could not be settled',
                code: 'PAYMENT_FAILED',
                status: 402,
              },
            },
            402,
          )
        }
      }

      // Payment accepted — pass through
      await next()
      return
    }

    // No payment and no qualifying subscription — return 402
    const requestUrl = c.req.url
    const paymentBlock = buildPaymentBlock(config, endpoint, requestUrl)

    // Build upgrade links for subscription plans
    const billingUrl = config.billingUrl || 'https://billing.do'
    const org = user?.org
    const orgSuffix = org ? `/~${org}` : ''

    const paymentRequiredHeader = btoa(JSON.stringify(paymentBlock))

    return c.json(
      {
        error: {
          message: `Payment required: ${endpoint.amount} ${(config.assets || ['USDC'])[0]} per call`,
          code: 'PAYMENT_REQUIRED',
          status: 402,
        },
        payment: paymentBlock,
        links: {
          upgrade: `${billingUrl}${orgSuffix}/upgrade`,
          pricing: `${billingUrl}${orgSuffix}/pricing`,
          ...(config.facilitatorUrl && { facilitator: config.facilitatorUrl }),
        },
      },
      { status: 402, headers: { 'PAYMENT-REQUIRED': paymentRequiredHeader } },
    )
  }
}

// ---------------------------------------------------------------------------
// requirePayment — route-level payment guard
// ---------------------------------------------------------------------------

/**
 * Route-level middleware that requires payment for a specific endpoint.
 * Use this to add per-call pricing to individual routes.
 *
 * Example:
 * ```ts
 * app.get('/expensive', requirePayment({ amount: '100', payTo: '0x...' }), handler)
 * ```
 */
export function requirePayment(
  options: {
    amount: string
    payTo: string
    description?: string
    networks?: PaymentNetwork[]
    assets?: PaymentAsset[]
    scheme?: PaymentScheme
    maxTimeoutSeconds?: number
    facilitatorUrl?: string
    billingUrl?: string
    verifyPayment?: (payload: PaymentPayload) => boolean | Promise<boolean>
  },
): MiddlewareHandler {
  const config: PaymentConfig = {
    payTo: options.payTo,
    endpoints: [{ path: '*', amount: options.amount, description: options.description }],
    networks: options.networks,
    assets: options.assets,
    scheme: options.scheme,
    maxTimeoutSeconds: options.maxTimeoutSeconds,
    facilitatorUrl: options.facilitatorUrl,
    billingUrl: options.billingUrl,
    verifyPayment: options.verifyPayment,
  }

  return paymentsMiddleware(config)
}
