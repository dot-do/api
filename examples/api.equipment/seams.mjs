/**
 * seams.mjs — the wave-zero seams (template §7.3/§7.4: seams EMITTED, planes
 * deferred). The property emits structured events; it contains no account UI,
 * key management, invoicing, or payout logic. At wave zero the emission
 * channel is structured console output (readable in `wrangler tail` / test
 * captures); the unified analytics plane (§7.2) attaches after extraction.
 *
 * Every metering event carries the §6.4 tag set:
 *   { substrate, projection, motion, operation, shape, pattern }
 */

import { projection } from "./projection.mjs";

const BASE = Object.freeze({
  substrate: projection.substrate,
  projection: projection.brand,
  motion: projection.motion,
  pattern: projection.experiment.pattern,
});

function emit(event) {
  // Wave-zero channel: structured stdout. One line, one JSON event.
  console.log(JSON.stringify({ $seam: event.seam, at: new Date().toISOString(), ...event }));
}

/** Per-operation usage meter (§6.4). shape: which offer rung served the call. */
export function meter(operation, { shape = "anon-sandbox", status } = {}) {
  emit({ seam: "metering", ...BASE, operation, shape, ...(status !== undefined && { status }) });
}

/** Money event (settlement-worker ledger pattern) — wave zero: stubs only,
 *  emitted when a 402 OFFER boundary is served; no settlement occurs. */
export function moneyEvent(operation, detail) {
  emit({ seam: "money", ...BASE, operation, event: "offer-served", settlement: "none — wave-zero stub, test mode", ...detail });
}

/** Transactional receipt seam (emails.do rail) — wave zero: seam only. */
export function receiptSeam(operation) {
  emit({ seam: "receipt", ...BASE, operation, rail: "emails.do", status: "seam-only — no send at wave zero" });
}

/** Signup/traffic event: identity class (human vs machine, id.org.ai grain
 *  where presented) × referral source — the §9.3 diagnostic's raw feed. */
export function trafficEvent(request, path) {
  const ua = request.headers.get("user-agent") || "";
  const agentId = request.headers.get("x-agent-id") || undefined; // id.org.ai grain where presented
  const secFetch = request.headers.get("sec-fetch-mode");
  const identityClass = agentId
    ? "machine-identified"
    : /claude|gpt|agent|bot|llm/i.test(ua)
      ? "machine-agent-ua"
      : secFetch || /mozilla/i.test(ua)
        ? "human-browser"
        : "machine-anonymous";
  const referral = request.headers.get("referer") || undefined;
  emit({
    seam: "traffic",
    ...BASE,
    path,
    identityClass,
    ...(agentId !== undefined && { agentId }),
    ...(referral !== undefined && { referral }),
  });
}
