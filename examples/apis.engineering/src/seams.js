/**
 * seams.js — §7.4: the property EMITS metering events, money events, and
 * receipt events; it never contains account UI, key management, invoicing,
 * or payout logic. Events are tagged per §6.4 so the pricing-experiment
 * rollup can read them at the substrate grain.
 *
 * Wave zero: events go to an Analytics Engine dataset when the binding is
 * present, and always to structured logs (the seam is the event shape, not
 * the transport). Money events fire only on settlement — none fires today,
 * because settlement is a labeled stub.
 */

import { AGENT_UA_TOKENS } from './axp-faces/index.js'

const TAGS = Object.freeze({
  substrate: 'engineering-architecture',
  projection: 'apis.engineering',
  motion: 'B2A',
  pattern: '402-metered-per-call',
})

/** Identity class at the traffic seam (§9.1): human vs machine, plus the
 *  referral source — the §9.3 missing-counterpart-brand diagnostic reads
 *  exactly these two fields (and this projection has a RECORDED
 *  counterpart-brand gap, so the diagnostic is armed from day one).
 *  id.org.ai grain when that plane is wired. */
export function classifyCaller(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase()
  const secFetch = request.headers.get('sec-fetch-mode')
  const identityClass = secFetch
    ? 'human-browser'
    : AGENT_UA_TOKENS.some((t) => ua.includes(t))
      ? 'machine-agent-ua'
      : 'unattributed'
  return { identityClass, referrer: request.headers.get('referer') || undefined }
}

/** Per-operation usage meter. */
export function emitMeterEvent(env, ctx, request, { operation, shape }) {
  const event = {
    kind: 'meter',
    ...TAGS,
    operation,
    shape,
    ...classifyCaller(request),
    at: new Date().toISOString(),
  }
  try {
    if (env && env.METERS && typeof env.METERS.writeDataPoint === 'function') {
      env.METERS.writeDataPoint({
        blobs: [event.projection, event.operation, event.shape, event.identityClass],
        indexes: [event.substrate],
      })
    }
  } catch {
    /* the seam never breaks the request */
  }
  console.log(JSON.stringify(event))
}

/** Money event — settlement-worker ledger pattern. Nothing calls this in
 *  wave zero: settlement is a labeled stub, and a money event that did not
 *  move money would be a fake record. The seam exists; the ledger activates
 *  with A1's charter. */
export function emitMoneyEvent(env, event) {
  console.log(JSON.stringify({ kind: 'money', ...TAGS, ...event, at: new Date().toISOString() }))
}

/** Receipt event — the emails.do transactional rail. Fires with settlement. */
export function emitReceiptEvent(env, event) {
  console.log(JSON.stringify({ kind: 'receipt', ...TAGS, ...event, at: new Date().toISOString() }))
}
