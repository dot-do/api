/**
 * seams.js — the §7.4 seams: this property EMITS metering events, money
 * events, and receipt events at its own boundary; it never contains account
 * UI, key management, invoicing, or payout logic. At wave zero the events go
 * to structured logs (the unified analytics plane is a MAY-defer, §7.3);
 * their SHAPE is the contract — every event carries the §6.4 rollup tags.
 * Operation tags are the canonical camelCase operationIds (one identifier
 * across every face).
 */

const PROJECTION = "trade-customs-placeholder"; // GAP row — G4 brand pending (#16)
const MOTION = "B2A";
const PATTERN = "402-metered"; // experiment registration, projection.json

/** Identity class per §9.3: machine (id.org.ai grain) vs human, + referral. */
export function identityClassOf(request) {
  const ua = request.headers.get("user-agent") || "";
  const machine = /\b(claude|gpt|agent|bot|python-httpx|langchain)\b/i.test(ua) || request.headers.get("x-agent-id") !== null;
  return {
    identityClass: machine ? "machine" : "human",
    idGrain: request.headers.get("x-agent-id") ? "id.org.ai" : "anonymous",
    referralSource: request.headers.get("referer") || request.headers.get("x-agent-session") || null,
  };
}

function emit(kind, fields) {
  // Wave-zero sink: structured log line. The tag set — not the sink — is the seam.
  console.log(JSON.stringify({ seam: kind, ts: Date.now(), ...fields }));
}

export function emitMeter(request, { operation, shape }) {
  emit("meter", {
    substrate: "trade-customs",
    projection: PROJECTION,
    motion: MOTION,
    operation,
    shape,
    pattern: PATTERN,
    ...identityClassOf(request),
  });
}

/** Money-event seam (settlement-worker ledger pattern) — STUB at wave zero:
 *  emitted only from the 402 boundary with settled:false; no live settlement. */
export function emitMoneyEvent(request, { operation, amount }) {
  emit("money", {
    substrate: "trade-customs",
    projection: PROJECTION,
    operation,
    amount,
    settled: false,
    stub: true,
    ...identityClassOf(request),
  });
}

/** Receipt seam (emails.do rail) — STUB: no recipient identity exists on an
 *  anonymous sandbox; the event records that a receipt WOULD issue here. */
export function emitReceipt(request, { operation }) {
  emit("receipt", { substrate: "trade-customs", projection: PROJECTION, operation, stub: true });
}
