/**
 * seams.js — §7.4: the property EMITS metering events, money events, and
 * receipt-rail events; it NEVER contains account UI, key management,
 * invoicing, or payout logic. At wave zero the emitter is structured logs
 * (one JSON line per event) — the tags are the contract; the unified
 * analytics plane reads them after extraction (§7.2).
 *
 * Every metering event carries the §6.4 rollup key:
 *   { substrate, projection, motion, operation, shape, pattern }
 * Traffic events carry identity class (human vs machine, id.org.ai grain
 * where the caller presents one) + referral source — the §9.3
 * missing-counterpart-brand diagnostic reads exactly these.
 */
import { AGENT_UA_TOKENS } from "./vendor/axp-faces/index.js";

const BASE = Object.freeze({
  substrate: "fn-business-ops",
  projection: "api.management",
  motion: "B2A",
  pattern: "402-metered",
});

function emit(event) {
  // structured-log seam; replaced by the metering/analytics binding at extraction
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

/** One meter event per operation call. shape ∈ the projection's offer shapes. */
export function meterEvent(operation, { shape = "anon-sandbox" } = {}) {
  emit({ seam: "meter", ...BASE, operation, shape });
}

/** Money events (settlement-worker ledger pattern) — at wave zero only
 *  offer-presented ever fires; settlement activation is A1's charter. */
export function moneyEvent(kind, detail = {}) {
  emit({ seam: "money", ...BASE, kind, mode: "test", ...detail });
}

/** Receipt rail (emails.do) — seam only; fires with settlement, never before. */
export function receiptEvent(kind, detail = {}) {
  emit({ seam: "receipt", ...BASE, kind, rail: "emails.do", mode: "test", ...detail });
}

/** Identity class of a request: machine (agent UA / presented machine identity)
 *  vs human (browser navigation) vs unknown (bare tooling). */
export function identityClass(request) {
  const machineId = request.headers.get("x-org-ai-id");
  if (machineId) return { class: "machine", grain: "id.org.ai", id: machineId };
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (AGENT_UA_TOKENS.some((t) => ua.includes(t))) return { class: "machine", grain: "user-agent" };
  if (request.headers.get("sec-fetch-mode") === "navigate") return { class: "human", grain: "browser-navigation" };
  return { class: "unknown", grain: "user-agent" };
}

/** One traffic event per request — the §9.3 diagnostic's raw feed. */
export function trafficEvent(request, path, status) {
  const who = identityClass(request);
  emit({
    seam: "traffic",
    brand: BASE.projection,
    path,
    status,
    identityClass: who.class,
    identityGrain: who.grain,
    referral: request.headers.get("referer") || null,
  });
}
