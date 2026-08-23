/**
 * store.mjs — the anon-sandbox store: the labeled seed corpus plus
 * caller-created sandbox records, in-memory per isolate (retention disclosed
 * on every minted record — template §5.2 / #17 rung 0). The sandbox is the
 * real product surface over simulated data: the same handlers will serve live
 * tenants; the seed tenant is tenant #1 on this substrate.
 */

import { assets, workOrders, models, passports, RETENTION, SEED_VERSION } from "./seed.mjs";

export { RETENTION, SEED_VERSION };

const state = {
  assets: [...assets],
  "work-orders": [...workOrders],
  models: [...models],
  passports: [...passports],
};

export function records(collection) {
  return state[collection] || [];
}

export function find(collection, id) {
  return records(collection).find((r) => r.id === id);
}

export function passportForAsset(assetId) {
  return records("passports").find((p) => p.assetId === assetId);
}

/** Auto-mint an anon workspace (#17 rung 0). */
export function mintWorkspace(existing) {
  if (typeof existing === "string" && /^ws-[a-z0-9-]{4,64}$/.test(existing)) return existing;
  return `ws-${crypto.randomUUID()}`;
}

/** Create a sandbox record on the system-of-record door (headless EAM/CMMS
 *  ply write). Every created record is labeled sandbox data with disclosed
 *  retention — the write lands on the SAME collection the data face reads. */
export function create(collection, type, body, workspace) {
  const prefix = collection === "work-orders" ? "wo" : collection.slice(0, 3);
  const record = {
    id: `${prefix}-sbx-${crypto.randomUUID().slice(0, 8)}`,
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

/** Complete a work order (the CMMS system-of-record verb) — mutates the SAME
 *  record the data face serves; sandbox-scope only at wave zero. */
export function completeWorkOrder(id) {
  const rec = find("work-orders", id);
  if (rec === undefined) return undefined;
  rec.status = "completed";
  rec.completedAt = new Date().toISOString();
  return rec;
}
