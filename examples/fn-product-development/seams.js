/**
 * seams.js — the §7.4 seams: this property EMITS metering events, money
 * events and receipt events; it never contains account UI, key management,
 * invoicing or payout logic. Wave-zero sink is structured stdout (one JSON
 * line per event) — the unified analytics/billing plane consumes the same
 * shape after extraction (§7.2), so the tags are the contract, not the sink.
 *
 * Every metering event carries the §6.4 rollup grain:
 *   { substrate, projection, motion, operation, shape, pattern }
 * Traffic events additionally carry identity class (human vs machine —
 * id.org.ai grain when presented) and referral source (§9.3 diagnostic feed).
 */
import { SUBSTRATE } from "./apiproduct.js";
import { projection } from "./projection.js";

const BASE = Object.freeze({
  substrate: SUBSTRATE,
  projection: "placeholder", // GAP row — no G4 brand attached (#16)
  motion: projection.motion,
  pattern: projection.experiment.pattern,
});

function emit(seam, payload) {
  // wave-zero sink: structured stdout. Extraction re-points this one function.
  console.log(JSON.stringify({ seam, ts: new Date().toISOString(), ...payload }));
}

/** One meter event per served operation (shape = the ladder rung serving it). */
export function meter(operation, { shape = "anon-sandbox" } = {}) {
  emit("meter", { ...BASE, operation, shape });
}

/** Money events — settlement-worker ledger pattern. Wave zero: the only money
 *  boundary that exists is the 402 OFFER being SERVED (a stub, amount 0, no
 *  settlement). Never a fake charge. */
export function moneyEvent(kind, detail = {}) {
  emit("money", { ...BASE, kind, settled: false, stub: true, ...detail });
}

/** Receipt seam (emails.do rail after extraction). Wave zero: nothing settles,
 *  so nothing is receipted — the seam exists, fail-closed. */
export function receipt(detail) {
  emit("receipt", { ...BASE, settled: false, stub: true, ...detail });
}

/** Signup/traffic events — identity class + referral source (§9.3: agent-
 *  referred HUMAN traffic on a developer face = missing counterpart brand). */
export function traffic(request, { identityClass, operation } = {}) {
  const h = request.headers;
  emit("traffic", {
    ...BASE,
    ...(operation !== undefined && { operation }),
    identityClass: identityClass ?? classifyIdentity(request),
    machineIdentity: h.get("x-id-org-ai") !== null, // id.org.ai grain when presented — never cookies
    referral: h.get("referer") ?? h.get("x-agent-session") ?? null,
    path: new URL(request.url).pathname,
  });
}

/** human (browser) | machine (agent UA / machine identity) | unknown — never cookies, never UA fingerprinting beyond class. */
export function classifyIdentity(request) {
  const h = request.headers;
  if (h.get("x-id-org-ai") !== null) return "machine";
  if (h.get("sec-fetch-mode") !== null || h.get("sec-fetch-dest") !== null) return "human";
  const ua = (h.get("user-agent") || "").toLowerCase();
  if (/(claude|gpt|agent|bot|llm)/.test(ua)) return "machine";
  return "unknown";
}
