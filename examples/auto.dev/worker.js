/**
 * worker.js — the automotive wave-zero property: one Workers-shaped worker
 * serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/vehicles, /vin/{vin}, /listings,
 *                    /parts, /work-orders)
 *   headless face  — the FSM system-of-record door on the SAME collection
 *                    (POST /work-orders), anon workspaces — the row's 8111
 *                    work-order grain (recon | inspection | maintenance)
 *
 * plus the full machine face (AXP quartet via the vendored axp-faces@0.3.0,
 * NATIVE axp-ext/rates-g2@0.2.0: rates[] top-level in the Pricing Document,
 * g2 + links.verify on the card, operationId on every route — no bridges),
 * the mounted authless MCP door, the 402-shaped payable STUB (labeled; never
 * fake billing), and the §7.4 seams.
 *
 * CLASS A, LIVE-REVENUE ROW — but THIS worker is the wave-zero machine-face
 * instantiation in dot-do/api examples, not the production rail (api.auto.dev,
 * Drivly, Inc. stack, key-gated — entity boundary; probes in product.js).
 * Sandbox records are labeled synthetic, typed to the live rail's shapes.
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
const workspaces = new Map(); // workspaceId -> { workOrders: [] }
const mintId = () => "ws-" + Math.random().toString(36).slice(2, 10);

function listOr(records, filters, searchParams, memberName, emptyNoun) {
  let recs = records;
  let applied = null;
  for (const f of filters) {
    const v = searchParams.get(f.param);
    if (v !== null) {
      recs = recs.filter(f.pred ? (r) => f.pred(r, v) : (r) => String(r[f.field]) === v);
      applied = [f.param, v];
    }
  }
  if (recs.length === 0) {
    const [p, v] = applied || [filters[0]?.param || "filter", ""];
    return envelopeResponse(empty(`no ${emptyNoun} match ${p}=${v} — a truthful empty set, not an error`, { memberName }));
  }
  return envelopeResponse(ok(recs, { memberName }));
}

function getOr(records, key, id, memberName, noun) {
  const rec = records.find((r) => r[key] === id);
  if (!rec) return envelopeResponse(empty(`no ${noun} with ${key} ${id} — nothing here has been deleted; that ${key} was never minted`, { memberName }));
  return envelopeResponse(ok([rec], { memberName }));
}

// ── headless face: create a draft work order in an anon workspace ───────────
async function createWorkOrder(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return envelopeResponse({ type: "BLOCKED", reason: "the request body must be JSON with at least kind and vin members" }, { status: 403 });
  }
  const kinds = ["recon", "inspection", "maintenance"];
  if (!body || !kinds.includes(body.kind) || typeof body.vin !== "string" || body.vin.length === 0) {
    return envelopeResponse({ type: "BLOCKED", reason: "a work order needs a kind (recon | inspection | maintenance) and a vin — send { kind, vin, operatorId?, lineItems? }" }, { status: 403 });
  }
  const wsId = request.headers.get("x-workspace") || mintId();
  const ws = workspaces.get(wsId) || { workOrders: [] };
  const rec = {
    id: `wo-${wsId}-${ws.workOrders.length + 1}`,
    kind: body.kind,
    vin: String(body.vin),
    operatorId: body.operatorId ? String(body.operatorId) : null,
    lineItems: Array.isArray(body.lineItems) ? body.lineItems : [],
    status: "draft",
    workspace: wsId,
    example: true,
    demo_notice: "Draft work order created in an anonymous sandbox workspace (synthetic example data). " + RETENTION,
  };
  ws.workOrders.push(rec);
  workspaces.set(wsId, ws);
  emitMeter(request, { operation: "createWorkOrder", shape: "anon-sandbox" });
  return json({ type: "OK", workOrders: [rec], workspace: wsId, retention: RETENTION }, { headers: { "x-workspace": wsId } });
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function completeWorkOrder(request, id) {
  const wsId = request.headers.get("x-workspace");
  const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).workOrders : [];
  const rec = [...seed.workOrders, ...wsRecs].find((r) => r.id === id);
  if (!rec) {
    return envelopeResponse(empty(`no work order with id ${id} — nothing to complete`, { memberName: "workOrders" }));
  }
  emitMeter(request, { operation: "completeWorkOrder", shape: "paid-stub" });
  emitMoneyEvent(request, { operation: "completeWorkOrder", amount: 2.5 });
  emitReceipt(request, { operation: "completeWorkOrder" });
  return envelopeResponse(
    offer({
      id: "complete-work-order-stub",
      title: `Complete work order ${id} as a verified deliverable (per-outcome) — STUB on this face: test-mode, no settlement wired; nothing is charged here`,
      price: { model: "metered", unit: "usd-per-completed-work-order-deliverable", price: 2.5 },
      alternatives: manifest.pricing.offers[0].alternatives,
      stub: true,
      message:
        "This 402 is the OFFER boundary of the outcome verb. On this wave-zero face it is a labeled stub: only the anon-sandbox floor is mounted (and is the only alternative marked mounted:true); the B2D shapes above it (GitHub OAuth free tier, checkout, subscription) are declared for shape discovery with mounted:false, settlement is not wired here, and no billing occurs. The production rail's keys and plans live at the Drivly stack.",
    }),
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const seg = path.split("/").filter(Boolean);

    // Headless face FIRST: POST on the collection is the FSM work-order door
    // — same collection, one definition, two plies (the generator would
    // otherwise answer 405 for non-GET on an AXP route).
    if (path === "/work-orders" && method === "POST") return createWorkOrder(request);

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === "GET") emitMeter(request, { operation: "listVehicles", shape: "anon-sandbox" });
      return hit;
    }

    // MCP door (mounted → declared on the card; AUTHLESS — anon-sandbox rung
    // only; keyed shapes above the floor are not mounted on this face).
    if (path === "/mcp") {
      emitMeter(request, { operation: "mcp:" + (method === "POST" ? "call" : method), shape: "anon-sandbox" });
      return mcp(request);
    }

    // The outcome verb (402 OFFER stub).
    if (method === "POST" && seg.length === 3 && seg[0] === "work-orders" && seg[2] === "complete") {
      return completeWorkOrder(request, seg[1]);
    }

    if (method === "GET" || method === "HEAD") {
      if (path === "/icp.json") return json(ICP_DOC);
      if (path === "/verify") return json(VERIFY_DOC);

      // /vehicles/{vin} — the collection itself is served by the generator.
      if (seg[0] === "vehicles" && seg.length === 2) {
        emitMeter(request, { operation: "getVehicle", shape: "anon-sandbox" });
        return getOr(seed.vehicles, "vin", seg[1], "vehicles", "vehicle");
      }
      // /vin/{vin} — sandbox decode over the labeled corpus.
      if (seg[0] === "vin" && seg.length === 2) {
        emitMeter(request, { operation: "decodeVin", shape: "anon-sandbox" });
        const rec = seed.vehicles.find((r) => r.vin === seg[1]);
        if (!rec)
          return envelopeResponse(
            empty(`VIN ${seg[1]} is not in this sandbox corpus — sandbox decode answers only the labeled synthetic VINs (the production decoder at api.auto.dev is key-gated)`, { memberName: "decodes" }),
          );
        return envelopeResponse(ok([{ vin: rec.vin, make: rec.make, model: rec.model, year: rec.year, bodyStyle: rec.bodyStyle, example: true, demo_notice: rec.demo_notice }], { memberName: "decodes" }));
      }
      if (path === "/listings") {
        emitMeter(request, { operation: "listListings", shape: "anon-sandbox" });
        return listOr(
          seed.listings,
          [
            { param: "dealer", field: "dealerId" },
            { param: "status", field: "status" },
          ],
          url.searchParams,
          "listings",
          "listings",
        );
      }
      if (seg[0] === "listings" && seg.length === 2) {
        emitMeter(request, { operation: "getListing", shape: "anon-sandbox" });
        return getOr(seed.listings, "id", seg[1], "listings", "listing");
      }
      if (path === "/parts") {
        emitMeter(request, { operation: "listParts", shape: "anon-sandbox" });
        return listOr(
          seed.parts,
          [
            { param: "category", field: "category" },
            { param: "gtin", field: "gtin" },
          ],
          url.searchParams,
          "parts",
          "parts",
        );
      }
      if (seg[0] === "parts" && seg.length === 2) {
        emitMeter(request, { operation: "getPart", shape: "anon-sandbox" });
        return getOr(seed.parts, "id", seg[1], "parts", "part");
      }
      if (path === "/work-orders") {
        emitMeter(request, { operation: "listWorkOrders", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).workOrders : [];
        return listOr([...seed.workOrders, ...wsRecs], [{ param: "status", field: "status" }], url.searchParams, "workOrders", "work orders");
      }
      if (seg[0] === "work-orders" && seg.length === 2) {
        emitMeter(request, { operation: "getWorkOrder", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).workOrders : [];
        return getOr([...seed.workOrders, ...wsRecs], "id", seg[1], "workOrders", "work order");
      }
    }

    return envelopeResponse(
      empty("no route at this path — nothing here has been deleted; the route was never written", { memberName: "results" }),
      { status: 404 },
    );
  },
};
