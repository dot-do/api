/**
 * seams.js — the §7.4 seams: this property EMITS metering events, money
 * events, and receipt events; it NEVER contains account UI, key management,
 * invoicing, or payout logic (settlement/billing/escrow are payments.do
 * platform modules this property CONSUMES, not contains — consumption blocks
 * the monetized-serving stage only, never the face). Events flow to the
 * Analytics Engine binding when one is bound (env.SEAMS); without a binding
 * they are constructed and dropped — the seam exists either way, so the
 * unified analytics plane can attach after extraction without touching this
 * property.
 *
 * Every metering event carries the §6.4 rollup tags:
 *   { substrate, projection, motion, operation, shape, pattern }
 */

const BASE = Object.freeze({
  substrate: "banking-payments",
  projection: "apis.finance",
  motion: "B2D",
  pattern: "402-metered-per-call",
});

function write(env, kind, fields) {
  const event = { kind, at: new Date().toISOString(), ...BASE, ...fields };
  try {
    // Analytics Engine seam (bound in wrangler as SEAMS when the plane exists)
    env?.SEAMS?.writeDataPoint?.({
      blobs: [event.kind, event.operation || "", event.shape || "", event.identityClass || "", event.referral || ""],
      indexes: [BASE.projection],
    });
  } catch {
    /* the seam never breaks the request */
  }
  return event;
}

/** One metered call. `shape` per §5.1 (anon-sandbox | paid-402 | …). */
export function emitMeter(env, { operation, shape = "anon-sandbox" }) {
  return write(env, "meter", { operation, shape });
}

/** A money event — wave zero emits only STUB events (no live settlement). */
export function emitMoneyEvent(env, { operation, amount, currency = "USD" }) {
  return write(env, "money", { operation, amount, currency, settlement: "stub" });
}

/** A receipt seam — references the receipts rail; wave zero emits the event only. */
export function emitReceipt(env, { operation, offerId }) {
  return write(env, "receipt", { operation, offerId, rail: "receipts (emails.do seam)", settlement: "stub" });
}

/** Signup/traffic signal — identity class (human vs machine) + referral source,
 *  the §9.3 missing-counterpart-brand diagnostic's raw feed. */
export function emitSignal(env, request, { surface }) {
  const ua = request.headers.get("user-agent") || "";
  const identityClass = /bot|agent|claude|gpt|llm|python|curl|node/i.test(ua) ? "machine" : "human";
  const referral = request.headers.get("referer") || "";
  return write(env, "signal", { surface, identityClass, referral, shape: "anon-sandbox" });
}
