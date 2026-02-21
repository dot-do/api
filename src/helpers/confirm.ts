/**
 * Confirmation flow helpers for GET mutations.
 *
 * Since the DB is immutable (all changes are events), mutations can be safely
 * performed via GET with a confirmation step. This enables agent-human handoff
 * via clickable URLs.
 *
 * Flow:
 * 1. GET without confirm hash → returns preview with `confirm` block
 * 2. GET with `?confirm=hash` → executes the mutation
 * 3. POST → direct execution (no confirmation needed)
 */

// =============================================================================
// Types
// =============================================================================

export interface ConfirmParams {
  /** The mutation action (create, update, delete, revert, or a verb like qualify) */
  action: string
  /** The entity type (e.g. Contact, Lead) */
  type?: string
  /** The mutation data from query params */
  data: Record<string, unknown>
  /** Tenant slug */
  tenant?: string
  /** User ID or IP for session binding */
  userId?: string
  /** Secret key for HMAC signing */
  secret: string
  /** TTL in milliseconds (default: 5 minutes) */
  ttl?: number
}

export interface ConfirmPreview {
  /** The mutation action */
  action: string
  /** The entity type */
  type?: string
  /** Preview of the data that will be written */
  preview: Record<string, unknown>
  /** URL to execute the mutation (includes confirm hash) */
  execute: string
  /** URL to cancel / go back */
  cancel: string
}

export interface BuildConfirmPreviewOptions {
  action: string
  type?: string
  data: Record<string, unknown>
  baseUrl: string
  cancelUrl: string
  hash: string
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TTL = 300000 // 5 minutes in ms
const HASH_LENGTH = 6

// =============================================================================
// Hash Generation
// =============================================================================

/**
 * Generate a short confirmation hash using Web Crypto API (SubtleCrypto).
 *
 * The hash is derived from:
 * - action + type + sorted data keys/values + tenant + userId + secret
 * - A time bucket (floor(now / ttl)) so hashes expire naturally
 *
 * Returns a 6-character hex string.
 */
export async function generateConfirmHash(params: ConfirmParams): Promise<string> {
  const ttl = params.ttl ?? DEFAULT_TTL
  const timeBucket = Math.floor(Date.now() / Math.max(ttl, 1))

  const payload = buildHashPayload(params, timeBucket)
  return await hmacHex(payload, params.secret)
}

/**
 * Validate a confirmation hash against the current and previous time buckets.
 *
 * Checks both the current bucket and the immediately previous one to handle
 * edge cases where the hash was generated right before a bucket boundary.
 */
export async function validateConfirmHash(hash: string, params: ConfirmParams): Promise<boolean> {
  const ttl = params.ttl ?? DEFAULT_TTL
  const currentBucket = Math.floor(Date.now() / Math.max(ttl, 1))

  // Check current time bucket
  const currentPayload = buildHashPayload(params, currentBucket)
  const currentHash = await hmacHex(currentPayload, params.secret)
  if (hash === currentHash) return true

  // Check previous time bucket (for edge-case where hash was generated
  // just before a bucket boundary)
  const prevPayload = buildHashPayload(params, currentBucket - 1)
  const prevHash = await hmacHex(prevPayload, params.secret)
  return hash === prevHash
}

// =============================================================================
// URL Building
// =============================================================================

/**
 * Build a confirmation URL by appending `?confirm=hash` to the base URL.
 */
export function buildConfirmUrl(baseUrl: string, hash: string): string {
  const url = new URL(baseUrl)
  url.searchParams.set('confirm', hash)
  return url.toString()
}

// =============================================================================
// Preview Building
// =============================================================================

/**
 * Build the `confirm` block for the confirmation preview response.
 */
export function buildConfirmPreview(opts: BuildConfirmPreviewOptions): ConfirmPreview {
  const preview: ConfirmPreview = {
    action: opts.action,
    preview: opts.data,
    execute: buildConfirmUrl(opts.baseUrl, opts.hash),
    cancel: opts.cancelUrl,
  }

  if (opts.type) {
    preview.type = opts.type
  }

  return preview
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Build the string payload that gets HMAC-signed.
 * Deterministic: sorts data keys to ensure consistency.
 */
function buildHashPayload(params: ConfirmParams, timeBucket: number): string {
  const parts: string[] = [
    params.action,
    params.type ?? '',
    serializeData(params.data),
    params.tenant ?? '',
    params.userId ?? '',
    String(timeBucket),
  ]
  return parts.join('|')
}

/**
 * Serialize data object deterministically (sorted keys).
 */
function serializeData(data: Record<string, unknown>): string {
  const sorted = Object.keys(data).sort()
  return sorted.map((k) => `${k}=${String(data[k] ?? '')}`).join('&')
}

/**
 * Compute HMAC-SHA256 and return the first HASH_LENGTH hex characters.
 * Uses the Web Crypto API (SubtleCrypto) available in Workers.
 */
async function hmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(message)

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signature = await crypto.subtle.sign('HMAC', key, msgData)

  // Convert ArrayBuffer to hex and take first HASH_LENGTH chars
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex.slice(0, HASH_LENGTH)
}
