/**
 * Type synonym resolution for self-describing entity IDs.
 *
 * Short prefixes only when truly unambiguous across the entire platform.
 * Full noun name otherwise.
 */

/** Short -> canonical type mapping. Only add short forms when unambiguous. */
export const TYPE_SYNONYMS: Record<string, string> = {
  org: 'organization',
  req: 'request',
  organization: 'organization',
  request: 'request',
}

/** Resolve a type prefix to its canonical form. Unknown types pass through. */
export function resolveType(type: string): string {
  return TYPE_SYNONYMS[type] ?? type
}

/** Stripe-native ID prefixes (foreign IDs, routed to PAYMENTS) */
export const STRIPE_PREFIXES = new Set([
  'cus', 'sub', 'inv', 'pi', 'pm', 'price', 'prod', 'si', 'il', 'ch', 'txn',
])

/**
 * Stripe prefixes payments.do can read by id → the PaymentsInternal RPC
 * method that does it (src/payments-rpc.ts). Prefixes in STRIPE_PREFIXES
 * but not here (pi, pm, si, il, txn) have no read operation on payments.do.
 */
export const PAYMENTS_RETRIEVE: Record<string, 'getCustomer' | 'getSubscription' | 'getInvoice' | 'getCharge' | 'getProduct' | 'getPrice'> = {
  cus: 'getCustomer',
  sub: 'getSubscription',
  inv: 'getInvoice',
  ch: 'getCharge',
  prod: 'getProduct',
  price: 'getPrice',
}

/**
 * Maps canonical entity types to their authoritative source binding.
 * Types not listed here use the DATABASE binding (default).
 */
export const SOURCE_ROUTES: Record<string, string> = {
  organization: 'AUTH',
  user: 'AUTH',
  request: 'EVENTS',
  repo: 'GITHUB',
  issue: 'GITHUB',
  pr: 'GITHUB',
  pull_request: 'GITHUB',
  domain: 'CLOUDFLARE',
  custom_hostname: 'CLOUDFLARE',
  worker: 'CLOUDFLARE',
  dns_record: 'CLOUDFLARE',
}
