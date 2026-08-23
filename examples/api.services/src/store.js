/**
 * store.js — the anon-sandbox store: the seed corpus plus caller-created
 * sandbox records, in-memory per isolate (retention disclosed on every
 * record — template §5.2 / #17 rung 0). The sandbox is the real product
 * surface over simulated data: the same handlers serve seed and (future)
 * live tenants; the seed tenant is tenant #1 on this substrate.
 */

import { services, engagements, workOrders, outcomes, RETENTION, SEED_VERSION } from "./seed.js";

export { RETENTION, SEED_VERSION };

const state = {
  services: [...services],
  engagements: [...engagements],
  "work-orders": [...workOrders],
  outcomes: [...outcomes],
};

export function records(collection) {
  return state[collection] || [];
}

export function find(collection, id) {
  return records(collection).find((r) => r.id === id);
}

/** Auto-mint an anon workspace (#17 rung 0). */
export function mintWorkspace(existing) {
  if (typeof existing === "string" && /^ws-[a-z0-9-]{4,64}$/.test(existing)) return existing;
  return `ws-${crypto.randomUUID()}`;
}

/** Create a sandbox record on the system-of-record door (headless ply write).
 *  Every created record is labeled sandbox data with disclosed retention. */
export function create(collection, type, body, workspace) {
  const record = {
    id: `${collection === "work-orders" ? "wo" : collection.slice(0, 3)}-sbx-${crypto.randomUUID().slice(0, 8)}`,
    $type: type,
    sandbox: true,
    example: true,
    workspace,
    ...body,
    retention: RETENTION,
    createdAt: new Date().toISOString(),
  };
  state[collection].push(record);
  return record;
}
