/**
 * seams.ts — the §7.4 seams: the property EMITS metering events, money
 * events, and receipt events; it NEVER contains account UI, key management,
 * invoicing, or payout logic. At wave zero the emission target is structured
 * worker logs (observability-visible); the unified analytics plane consumes
 * the same shapes after extraction (spec §7.2).
 *
 * Every metering event carries the §6.4 rollup tags:
 *   { substrate, projection, motion, operation, shape, pattern }
 */

// @ts-ignore vendored conneg carries the A.7.4 agent-UA token list
import { AGENT_UA_TOKENS } from '../axp/conneg.js'

const BASE = {
  substrate: 'accounting-tax',
  projection: 'apis.accountants',
  motion: 'B2D',
  pattern: 'per-outcome',
} as const

function emit(seam: string, fields: Record<string, unknown>): void {
  // Structured log line = the wave-zero seam. No PII, no payloads — tags only.
  console.log(JSON.stringify({ seam, ...BASE, ...fields, ts: new Date().toISOString() }))
}

/** One meter event per operation call (spec §1 `meters`, §6.4 tags). */
export function emitMeter(operation: string, shape: string = 'anon-sandbox'): void {
  emit('meter', { operation, shape })
}

/**
 * Money events follow the settlement-worker ledger pattern and are emitted
 * ONLY when a real settlement occurs. The settlement rail is not activated
 * (A1's charter); until then this seam exists and is never called with a
 * fabricated event — a fake money event is fake billing.
 */
export function emitMoneyEvent(event: { operation: string; amount: number; unit: string; settlementRef: string }): void {
  emit('money', event)
}

/** Receipt seam (emails.do rail) — same activation rule as money events. */
export function emitReceipt(event: { settlementRef: string; to: string }): void {
  emit('receipt', { settlementRef: event.settlementRef })
}

/**
 * Signup/traffic seam — the §9.3 standing diagnostic's raw signal: identity
 * class (human vs machine, id.org.ai grain when wired) × referral source ×
 * brand. Agent-referred HUMAN traffic on this developer brand = a missing
 * human-counterpart brand in the cell (candidate on record:
 * monthend.finance — see ../projections/apis.accountants.json).
 */
export function emitTraffic(kind: 'signup' | 'visit', request: Request): void {
  const ua = (request.headers.get('user-agent') ?? '').toLowerCase()
  const identityClass = AGENT_UA_TOKENS.some((t: string) => ua.includes(t)) ? 'machine' : 'human'
  emit('traffic', {
    kind,
    identityClass,
    referralSource: request.headers.get('referer') ?? undefined,
    secFetchMode: request.headers.get('sec-fetch-mode') ?? undefined,
  })
}
