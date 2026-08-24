/**
 * envelope.js — the typed outcome envelope (AXP Appendix A.1, closed
 * vocabulary OK | EMPTY | BLOCKED | OFFER) plus the ONE branching-collection
 * handler (the api.lawyer /matters pattern): one pathname, three truthful
 * outcomes, branching on its query — never a decoy, never a faked success.
 *
 * Status ↔ type is one-to-one so an agent dispatches on `type` alone:
 *   OK      200   substantive content
 *   EMPTY   200   truthful empty collection (+ message)
 *   BLOCKED 401/403  permission boundary (+ reason)
 *   OFFER   402   payment / ceiling re-authorization boundary (never BLOCKED)
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

/** 200 OK with substantive content. */
export function ok(results, { memberName = "results", extra } = {}) {
  return { type: "OK", [memberName]: results, ...(extra || {}) };
}

/** 200 EMPTY — a truthful empty set, never a bare [] masquerading as data. */
export function empty(message, { memberName = "results" } = {}) {
  return { type: "EMPTY", [memberName]: [], message };
}

/** 401/403 BLOCKED — a permission boundary with a worded reason. */
export function blocked(reason) {
  return { type: "BLOCKED", reason };
}

/** 402 OFFER — an offer to proceed, not a refusal. */
export function offer(o) {
  if (!o || (!o.id && !o.title)) throw new Error("axp-faces offer: an OFFER carries an id or title");
  if (o.price === undefined && o.checkoutUrl === undefined && o.alternatives === undefined) {
    throw new Error("axp-faces offer: an OFFER carries a price, checkoutUrl, or alternatives member");
  }
  return { type: "OFFER", ...o };
}

/** A typed envelope as a Response with the right status for its type. */
export function envelopeResponse(body, { status, headers } = {}) {
  const s =
    status ??
    (body.type === "OK" || body.type === "EMPTY" ? 200 : body.type === "BLOCKED" ? 403 : body.type === "OFFER" ? 402 : 200);
  return new Response(JSON.stringify(body), { status: s, headers: { ...JSON_HEADERS, ...(headers || {}) } });
}

/**
 * The branching collection handler — Clause 4 + 7 on one pathname:
 *
 *   GET <path>?scope=<blocked>   → 403 BLOCKED (typed, worded)
 *   GET <path>?<spendParam>=N    → 402 OFFER when metered and N > hardCeiling
 *                                  (the re-authorization boundary; N <= ceiling
 *                                  falls through and answers like any GET)
 *   GET <path>?<filter>=v        → filters records; no match → 200 EMPTY
 *   GET <path>                   → 200 OK with the (honest, seeded) records
 *
 * Returns a plain (searchParams) => { body, status } decision so the routes
 * layer (or a site's own worker) owns Response construction.
 */
export function collectionDecision(manifest, searchParams) {
  const { collection, pricing } = manifest;

  // permission boundary first — a reserved scope is blocked regardless of spend
  const scope = searchParams.get("scope");
  if (scope !== null && collection.blockedScopes.includes(scope)) {
    return { status: 403, body: blocked(collection.blockedReason(scope)) };
  }

  // the hard ceiling — metered only; the verifier derives the amounts
  if (pricing.model === "metered" && searchParams.has(pricing.spendParam)) {
    const spend = Number(searchParams.get(pricing.spendParam));
    if (Number.isFinite(spend) && spend > pricing.hardCeiling) {
      const first = pricing.offers[0];
      return {
        status: 402,
        body: offer({
          ...(first.id !== undefined && { id: first.id }),
          ...(first.title !== undefined && { title: first.title }),
          ...(first.price !== undefined && { price: first.price }),
          ...(first.checkoutUrl !== undefined && { checkoutUrl: first.checkoutUrl }),
          ...(first.alternatives !== undefined && { alternatives: first.alternatives }),
          message: `requested spend ${spend} exceeds the declared hardCeiling ${pricing.hardCeiling} — explicit re-authorization required`,
        }),
      };
    }
  }

  // filters — a truthful EMPTY when nothing matches
  let recs = [...collection.records];
  let filtered = null;
  for (const param of collection.filters) {
    const value = searchParams.get(param);
    if (value !== null) {
      recs = recs.filter((r) => collection.match(r, param, value));
      filtered = [param, value];
    }
  }
  if (recs.length === 0) {
    const [param, value] = filtered || [collection.filters[0], ""];
    return { status: 200, body: empty(collection.emptyMessage(param, value), { memberName: collection.memberName }) };
  }
  return { status: 200, body: ok(recs, { memberName: collection.memberName }) };
}
