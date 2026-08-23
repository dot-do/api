/**
 * rates.js — the rate card (property template §7.3: "/pricing + rates[]",
 * operationId-keyed, every row carries freeQuota or prices from zero) plus
 * the two face extensions this site applies over the generated documents:
 *
 *   - extendPricing(doc): adds rates[] (and the sandbox note) to the
 *     generator's Pricing Document. Additive descriptive members only — the
 *     pinned `pricing-declared` requirement reads `model`, which is untouched
 *     (the `binding` member precedent, axp-faces pricing.js).
 *   - extendOpenapi(doc): patches operationIds onto the manifest-declared
 *     extra routes, which the generator emits without ids. Ids come from
 *     product.operations, so rates[].operation ⊆ OpenAPI operationIds holds
 *     by construction.
 *
 * Generator gap, recorded: the rate-card extension shape is the template's
 * carried open question #1 — when axp-faces grows a rates[] member, these
 * extensions are deleted and the manifest carries the rows.
 */

import { operations } from "./product.js";

/** Every row: operation ∈ product.operations; freeQuota named or price 0. */
export const rates = [
  { operation: "listCollection", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
  { operation: "getService", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
  { operation: "listEngagements", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
  { operation: "getEngagement", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
  { operation: "createEngagement", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
  { operation: "listWorkOrders", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
  { operation: "getWorkOrder", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
  { operation: "createWorkOrder", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
  { operation: "listOutcomes", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
  { operation: "getOutcome", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
  {
    operation: "orderOutcome",
    unit: "usd-per-outcome",
    price: 25,
    freeQuota: 0,
    note: "per completed, verified outcome — quoted in the 402 OFFER; stated intent (binding: false), settlement not activated at wave zero",
  },
  { operation: "getPricing", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
  { operation: "getFamilyRegistry", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
  { operation: "getOffer", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
  { operation: "getICP", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
  { operation: "getVerify", unit: "usd-per-call", price: 0, freeQuota: "unlimited" },
];

for (const r of rates) {
  if (!operations.includes(r.operation)) throw new Error(`rate row prices unknown operation ${r.operation}`);
  if (r.price !== 0 && r.freeQuota === undefined) throw new Error(`rate row ${r.operation} needs freeQuota or zero price`);
}

/** Additive: rates[] + the anon-sandbox floor note on the Pricing Document. */
export function extendPricing(doc) {
  return {
    ...doc,
    rates,
    sandbox: {
      floor: "anon sandbox (keyless) — the universal floor; every operation is exercisable against labeled example data at no charge",
    },
  };
}

/** operationIds for the routes the generator emits without one, keyed by
 *  "METHOD path". Every id ∈ product.operations. */
const ROUTE_OPERATION_IDS = {
  "GET /services/{id}": "getService",
  "GET /engagements": "listEngagements",
  "GET /engagements/{id}": "getEngagement",
  "POST /engagements": "createEngagement",
  "GET /work-orders": "listWorkOrders",
  "GET /work-orders/{id}": "getWorkOrder",
  "POST /work-orders": "createWorkOrder",
  "GET /outcomes": "listOutcomes",
  "GET /outcomes/{id}": "getOutcome",
  "POST /outcomes/order": "orderOutcome",
  "GET /icp": "getICP",
  "GET /verify": "getVerify",
};

export function extendOpenapi(doc) {
  const out = JSON.parse(JSON.stringify(doc));
  for (const [key, operationId] of Object.entries(ROUTE_OPERATION_IDS)) {
    const [method, path] = key.split(" ");
    const op = out.paths?.[path]?.[method.toLowerCase()];
    if (op && op.operationId === undefined) {
      if (!operations.includes(operationId)) throw new Error(`patched id ${operationId} not in product.operations`);
      op.operationId = operationId;
    }
  }
  return out;
}
