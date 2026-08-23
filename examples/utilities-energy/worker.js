/**
 * worker.js — the utilities-energy wave-zero property: one Workers-shaped
 * worker serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/interval-reads, /meters,
 *                    /queue-entries, /interconnection-requests, /tariffs)
 *   headless face  — the applicant-filing door on the SAME collection
 *                    (POST /interconnection-requests), anon workspaces —
 *                    the interconnection.click entry-artifact grain, NOT a
 *                    52-System door (the row's headless cell is empty)
 *
 * plus the full machine face (AXP quartet via the vendored axp-faces@0.3.0,
 * NATIVE axp-ext/rates-g2@0.2.0: rates[] top-level in the Pricing Document,
 * g2 + links.verify on the card, operationId on every route — no bridges),
 * the mounted authless MCP door, the 402-shaped payable STUB (labeled;
 * never fake billing), and the §7.4 seams.
 *
 * PLACEHOLDER ADDRESS + DEPTH RULING: GAP register row; SC #21 rules NAICS
 * 22 Axis-2 only (avoid-class 5) — noun-grain rails for the party filing
 * into the utility; no apex face, no data-thesis face is built or claimed.
 */
import { createAxpRoutes, empty, ok, offer, envelopeResponse } from "./axp/index.js";
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
const workspaces = new Map(); // workspaceId -> { requests: [] }
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

// ── headless face: create a draft interconnection filing in an anon workspace ─
async function createInterconnectionRequest(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return envelopeResponse({ type: "BLOCKED", reason: "the request body must be JSON with at least applicant and systemSizeKwDc members" }, { status: 403 });
  }
  if (!body || typeof body.applicant !== "string" || body.applicant.length === 0 || typeof body.systemSizeKwDc !== "number") {
    return envelopeResponse({ type: "BLOCKED", reason: "a filing needs an applicant and a system size — send { applicant, systemSizeKwDc, utilityId?, resourceType? }" }, { status: 403 });
  }
  const wsId = request.headers.get("x-workspace") || mintId();
  const ws = workspaces.get(wsId) || { requests: [] };
  const rec = {
    id: `icr-${wsId}-${ws.requests.length + 1}`,
    applicant: String(body.applicant),
    utilityId: body.utilityId ? String(body.utilityId) : null,
    resourceType: body.resourceType ? String(body.resourceType) : "solar",
    systemSizeKwDc: body.systemSizeKwDc,
    status: "draft",
    workspace: wsId,
    example: true,
    demo_notice: "Draft filing created in an anonymous sandbox workspace (synthetic example data). " + RETENTION,
  };
  ws.requests.push(rec);
  workspaces.set(wsId, ws);
  emitMeter(request, { operation: "createInterconnectionRequest", shape: "anon-sandbox" });
  return json({ type: "OK", interconnectionRequests: [rec], workspace: wsId, retention: RETENTION }, { headers: { "x-workspace": wsId } });
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function submitInterconnectionRequest(request, id) {
  const wsId = request.headers.get("x-workspace");
  const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).requests : [];
  const rec = [...seed.interconnectionRequests, ...wsRecs].find((r) => r.id === id);
  if (!rec) {
    return envelopeResponse(empty(`no interconnection request with id ${id} — nothing to submit`, { memberName: "interconnectionRequests" }));
  }
  emitMeter(request, { operation: "submitInterconnectionRequest", shape: "paid-stub" });
  emitMoneyEvent(request, { operation: "submitInterconnectionRequest", amount: 0.5 });
  emitReceipt(request, { operation: "submitInterconnectionRequest" });
  return envelopeResponse(
    offer({
      id: "submit-interconnection-request-stub",
      title: `Submit interconnection filing package ${id} (per-outcome) — STUB: test-mode, no live settlement; nothing is charged`,
      price: { model: "metered", unit: "usd-per-submitted-filing-package", price: 0.5 },
      alternatives: manifest.pricing.offers[0].alternatives,
      stub: true,
      message:
        "This 402 is the OFFER boundary of the outcome verb. At wave zero it is a labeled stub: only the anon-sandbox rung is mounted (and is the only alternative marked mounted:true); the pay/work/claim rungs are declared for ladder-shape discovery with mounted:false, settlement is not live, and no billing occurs.",
    }),
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const seg = path.split("/").filter(Boolean);

    // Headless face FIRST: POST on the collection is the applicant-filing
    // door — same collection, one definition, two plies (the generator would
    // otherwise answer 405 for non-GET on an AXP route).
    if (path === "/interconnection-requests" && method === "POST") return createInterconnectionRequest(request);

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === "GET") emitMeter(request, { operation: "listIntervalReads", shape: "anon-sandbox" });
      return hit;
    }

    // MCP door (mounted → declared on the card; AUTHLESS — anon-sandbox rung
    // only; bearer-key rungs above the floor are not mounted at wave zero).
    if (path === "/mcp") {
      emitMeter(request, { operation: "mcp:" + (method === "POST" ? "call" : method), shape: "anon-sandbox" });
      return mcp(request);
    }

    // The outcome verb (402 OFFER stub).
    if (method === "POST" && seg.length === 3 && seg[0] === "interconnection-requests" && seg[2] === "submit") {
      return submitInterconnectionRequest(request, seg[1]);
    }

    if (method === "GET" || method === "HEAD") {
      if (path === "/icp.json") return json(ICP_DOC);
      if (path === "/verify") return json(VERIFY_DOC);

      if (path === "/meters") {
        emitMeter(request, { operation: "listMeters", shape: "anon-sandbox" });
        return listOr(
          seed.meters,
          [
            { param: "utility", field: "utilityId" },
            { param: "serviceKind", field: "serviceKind" },
          ],
          url.searchParams,
          "meters",
          "meters",
        );
      }
      if (seg[0] === "meters" && seg.length === 2) {
        emitMeter(request, { operation: "getMeter", shape: "anon-sandbox" });
        return getOr(seed.meters, seg[1], "meters", "meter");
      }
      if (path === "/queue-entries") {
        emitMeter(request, { operation: "listQueueEntries", shape: "anon-sandbox" });
        return listOr(
          seed.queueEntries,
          [
            { param: "queue", field: "queue" },
            { param: "status", field: "status" },
          ],
          url.searchParams,
          "queueEntries",
          "queue entries",
        );
      }
      if (seg[0] === "queue-entries" && seg.length === 2) {
        emitMeter(request, { operation: "getQueueEntry", shape: "anon-sandbox" });
        return getOr(seed.queueEntries, seg[1], "queueEntries", "queue entry");
      }
      if (path === "/interconnection-requests") {
        emitMeter(request, { operation: "listInterconnectionRequests", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).requests : [];
        return listOr([...seed.interconnectionRequests, ...wsRecs], [{ param: "status", field: "status" }], url.searchParams, "interconnectionRequests", "interconnection requests");
      }
      if (seg[0] === "interconnection-requests" && seg.length === 2) {
        emitMeter(request, { operation: "getInterconnectionRequest", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).requests : [];
        return getOr([...seed.interconnectionRequests, ...wsRecs], seg[1], "interconnectionRequests", "interconnection request");
      }
      if (path === "/tariffs") {
        emitMeter(request, { operation: "listTariffs", shape: "anon-sandbox" });
        return listOr(
          seed.tariffs,
          [
            { param: "utility", field: "utilityId" },
            { param: "status", field: "filingStatus" },
          ],
          url.searchParams,
          "tariffs",
          "tariffs",
        );
      }
      if (seg[0] === "tariffs" && seg.length === 2) {
        emitMeter(request, { operation: "getTariff", shape: "anon-sandbox" });
        return getOr(seed.tariffs, seg[1], "tariffs", "tariff");
      }
    }

    return envelopeResponse(
      empty("no route at this path — nothing here has been deleted; the route was never written", { memberName: "results" }),
      { status: 404 },
    );
  },
};
