/**
 * worker.js — the consulting-research wave-zero property: one Workers-shaped
 * worker serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/engagements, /sows, /milestones,
 *                    /deliverables, /tasks, /processes)
 *   headless face  — the engagement-management system-of-record door on the
 *                    SAME collections (POST /engagements), anon workspaces
 *
 * plus the full machine face (AXP quartet via the vendored generator), the
 * mounted MCP door, the 402-shaped payable STUB (labeled; never fake
 * billing), and the §7.4 seams.
 *
 * PLACEHOLDER ADDRESS: this is a GAP register row (no name held for NAICS
 * 5416-5417); the substrate is built G3-first per spec §0 and the G4 brand
 * attaches when a name is ruled.
 */
import { createAxpRoutes, ok, empty, offer, envelopeResponse } from "./axp/index.js";
import { manifest } from "./manifest.js";
import { ICP_DOC, VERIFY_DOC } from "./surfaces.js";
import { createMcpHandler } from "./mcp.js";
import { emitMeter, emitMoneyEvent, emitReceipt } from "./seams.js";
import seed from "./seed.json" with { type: "json" };

const axp = createAxpRoutes(manifest);
const mcp = createMcpHandler(seed);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };
const json = (obj, init = {}) => new Response(JSON.stringify(obj, null, 2), { status: init.status || 200, headers: { ...JSON_CT, ...(init.headers || {}) } });

const RETENTION =
  "Ephemeral sandbox workspace: per-isolate, may reset at any time; example environment, no durable storage at wave zero.";

// Anonymous sandbox workspaces — auto-minted, per-isolate, disclosed retention.
const workspaces = new Map(); // workspaceId -> { engagements: [] }
const mintId = () => "ws-" + Math.random().toString(36).slice(2, 10);

function listOr(records, filters, searchParams, memberName, emptyNoun) {
  let recs = records;
  let applied = null;
  for (const f of filters) {
    const v = searchParams.get(f.param);
    if (v !== null) {
      recs = recs.filter((r) => String(r[f.field]) === v);
      applied = [f.param, v];
    }
  }
  if (recs.length === 0) {
    const [p, v] = applied || [filters[0]?.param || "filter", ""];
    return envelopeResponse(empty(`no ${emptyNoun} match ${p}=${v} — a truthful empty set, not an error`, { memberName }));
  }
  return envelopeResponse(ok(recs, { memberName }));
}

function getOr(records, id, memberName, noun) {
  const rec = records.find((r) => r.id === id);
  if (!rec) return envelopeResponse(empty(`no ${noun} with id ${id} — nothing here has been deleted; that id was never minted`, { memberName }));
  return envelopeResponse(ok([rec], { memberName }));
}

// ── headless face: create engagement in an anon workspace ──────────────────
async function createEngagement(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return envelopeResponse({ type: "BLOCKED", reason: "the request body must be JSON with at least a title member" }, { status: 403 });
  }
  if (!body || typeof body.title !== "string" || body.title.length === 0) {
    return envelopeResponse({ type: "BLOCKED", reason: "an engagement needs a title — send { title, sector? }" }, { status: 403 });
  }
  const wsId = request.headers.get("x-workspace") || mintId();
  const ws = workspaces.get(wsId) || { engagements: [] };
  const rec = {
    id: `eng-${wsId}-${ws.engagements.length + 1}`,
    title: String(body.title),
    sector: body.sector ? String(body.sector) : null,
    status: "proposed",
    workspace: wsId,
    example: true,
    demo_notice: "Record created in an anonymous sandbox workspace. " + RETENTION,
  };
  ws.engagements.push(rec);
  workspaces.set(wsId, ws);
  emitMeter(request, { operation: "openapi:createEngagement", shape: "anon-sandbox" });
  return json({ type: "OK", engagements: [rec], workspace: wsId, retention: RETENTION }, { headers: { "x-workspace": wsId } });
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function orderDeliverable(request, id) {
  const rec = seed.deliverables.find((r) => r.id === id);
  if (!rec) {
    return envelopeResponse(empty(`no deliverable with id ${id} — nothing to order`, { memberName: "deliverables" }));
  }
  emitMeter(request, { operation: "openapi:orderDeliverable", shape: "paid-stub" });
  emitMoneyEvent(request, { operation: "openapi:orderDeliverable", amount: 25.0 });
  emitReceipt(request, { operation: "openapi:orderDeliverable" });
  return envelopeResponse(
    offer({
      id: "order-deliverable-stub",
      title: `Order verified deliverable ${id} (per-outcome) — STUB: test-mode, no live settlement; nothing is charged`,
      price: { model: "metered", unit: "usd-per-verified-deliverable", price: 25.0 },
      alternatives: manifest.pricing.offers[0].alternatives,
      stub: true,
      message:
        "This 402 is the OFFER boundary of the outcome verb. At wave zero it is a labeled stub: the ladder (pay / work / claim) is advertised, settlement is not live, and no billing occurs.",
    }),
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const seg = path.split("/").filter(Boolean);

    // Headless face FIRST: POST on the collection path is the system-of-record
    // door — same collection, one definition, two plies (the generator would
    // otherwise answer 405 for non-GET on an AXP route).
    if (path === "/engagements" && method === "POST") return createEngagement(request);

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === "GET") emitMeter(request, { operation: "openapi:listEngagements", shape: "anon-sandbox" });
      return hit;
    }

    // MCP door (mounted → declared on the card).
    if (path === "/mcp") {
      emitMeter(request, { operation: "mcp:" + (method === "POST" ? "call" : method), shape: "anon-sandbox" });
      return mcp(request);
    }

    // The outcome verb (402 OFFER stub).
    if (method === "POST" && seg.length === 3 && seg[0] === "deliverables" && seg[2] === "order") {
      return orderDeliverable(request, seg[1]);
    }

    if (method === "GET" || method === "HEAD") {
      if (path === "/icp.json") return json(ICP_DOC);
      // /rates side door RETIRED: rates[] rides top-level in /pricing
      // (axp-ext-rates-g2 — the ruled placement; served by the generator).
      if (path === "/verify") return json(VERIFY_DOC);

      if (seg[0] === "engagements" && seg.length === 2) {
        emitMeter(request, { operation: "openapi:getEngagement", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).engagements : [];
        return getOr([...seed.engagements, ...wsRecs], seg[1], "engagements", "engagement");
      }
      if (path === "/sows") {
        emitMeter(request, { operation: "openapi:listSows", shape: "anon-sandbox" });
        return listOr(seed.sows, [{ param: "engagement", field: "engagementId" }], url.searchParams, "sows", "statements of work");
      }
      if (seg[0] === "sows" && seg.length === 2) {
        emitMeter(request, { operation: "openapi:getSow", shape: "anon-sandbox" });
        return getOr(seed.sows, seg[1], "sows", "statement of work");
      }
      if (path === "/milestones") {
        emitMeter(request, { operation: "openapi:listMilestones", shape: "anon-sandbox" });
        return listOr(seed.milestones, [{ param: "engagement", field: "engagementId" }], url.searchParams, "milestones", "milestones");
      }
      if (path === "/deliverables") {
        emitMeter(request, { operation: "openapi:listDeliverables", shape: "anon-sandbox" });
        return listOr(
          seed.deliverables,
          [
            { param: "status", field: "status" },
            { param: "engagement", field: "engagementId" },
          ],
          url.searchParams,
          "deliverables",
          "deliverables",
        );
      }
      if (seg[0] === "deliverables" && seg.length === 2) {
        emitMeter(request, { operation: "openapi:getDeliverable", shape: "anon-sandbox" });
        return getOr(seed.deliverables, seg[1], "deliverables", "deliverable");
      }
      if (path === "/tasks") {
        emitMeter(request, { operation: "openapi:listTasks", shape: "anon-sandbox" });
        return listOr(seed.tasks, [{ param: "engagement", field: "engagementId" }], url.searchParams, "tasks", "tasks");
      }
      if (path === "/processes") {
        emitMeter(request, { operation: "openapi:listProcesses", shape: "anon-sandbox" });
        return envelopeResponse(ok(seed.processes, { memberName: "processes" }));
      }
    }

    return envelopeResponse(
      empty("no route at this path — nothing here has been deleted; the route was never written", { memberName: "results" }),
      { status: 404 },
    );
  },
};
