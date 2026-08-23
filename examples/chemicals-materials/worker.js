/**
 * worker.js — the chemicals-materials wave-zero property: one Workers-shaped
 * worker serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/substances, /safety-data-sheets,
 *                    /shipping-declarations, /facilities)
 *   headless face  — the chemical-inventory system-of-record door on the
 *                    SAME collections (POST /substances), anon workspaces
 *
 * plus the full machine face (AXP quartet via the vendored generator), the
 * mounted MCP door, the 402-shaped payable STUB (labeled; never fake
 * billing), and the §7.4 seams.
 *
 * PLACEHOLDER ADDRESS: this is a GAP register row (no name held for NAICS
 * 325; api.chemicals / apis.chemicals availability [UNVERIFIED]); the
 * substrate is built G3-first per spec §0 and the G4 brand attaches when a
 * name is ruled.
 */
import { createAxpRoutes, ok, empty, offer, envelopeResponse } from "./axp/index.js";
import { manifest } from "./manifest.js";
import { ICP_DOC, VERIFY_DOC } from "./surfaces.js";
import { createMcpHandler } from "./mcp.js";
import { emitMeter, emitMoneyEvent, emitReceipt } from "./seams.js";
import seed from "./seed.json" with { type: "json" };

const axp = createAxpRoutes(manifest);
const mcp = createMcpHandler(seed, { onCall: () => {} });

const JSON_CT = { "content-type": "application/json; charset=utf-8" };
const json = (obj, init = {}) => new Response(JSON.stringify(obj, null, 2), { status: init.status || 200, headers: { ...JSON_CT, ...(init.headers || {}) } });

const RETENTION =
  "Ephemeral sandbox workspace: per-isolate, may reset at any time; example environment, no durable storage at wave zero.";

// Anonymous sandbox workspaces — auto-minted, per-isolate, disclosed retention.
const workspaces = new Map(); // workspaceId -> { substances: [] }
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

// ── headless face: register a substance in an anon workspace inventory ─────
async function createSubstance(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return envelopeResponse({ type: "BLOCKED", reason: "the request body must be JSON with at least a name member" }, { status: 403 });
  }
  if (!body || typeof body.name !== "string" || body.name.length === 0) {
    return envelopeResponse({ type: "BLOCKED", reason: "a substance needs a name — send { name, physicalState?, hazardClass? }" }, { status: 403 });
  }
  const wsId = request.headers.get("x-workspace") || mintId();
  const ws = workspaces.get(wsId) || { substances: [] };
  const rec = {
    id: `sub-${wsId}-${ws.substances.length + 1}`,
    name: String(body.name),
    physicalState: body.physicalState ? String(body.physicalState) : null,
    hazardClass: body.hazardClass ? String(body.hazardClass) : "not-classified",
    casShapedId: null,
    casNote: "workspace-registered substance — no CAS-shaped id minted; real CAS registry numbers never appear on this sandbox",
    workspace: wsId,
    example: true,
    demo_notice: "Record created in an anonymous sandbox workspace. " + RETENTION,
  };
  ws.substances.push(rec);
  workspaces.set(wsId, ws);
  emitMeter(request, { operation: "createSubstance", shape: "anon-sandbox" });
  return json({ type: "OK", substances: [rec], workspace: wsId, retention: RETENTION }, { headers: { "x-workspace": wsId } });
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function issueShippingDeclaration(request, id) {
  const rec = seed.shippingDeclarations.find((r) => r.id === id);
  if (!rec) {
    return envelopeResponse(empty(`no shipping declaration with id ${id} — nothing to issue`, { memberName: "shippingDeclarations" }));
  }
  emitMeter(request, { operation: "issueShippingDeclaration", shape: "paid-stub" });
  emitMoneyEvent(request, { operation: "issueShippingDeclaration", amount: 2.5 });
  emitReceipt(request, { operation: "issueShippingDeclaration" });
  return envelopeResponse(
    offer({
      id: "issue-shipping-declaration-stub",
      title: `Issue shipping-papers packet for ${id} (per-outcome) — STUB: test-mode, no live settlement; nothing is charged`,
      price: { model: "metered", unit: "usd-per-issued-declaration", price: 2.5 },
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

    // Headless face FIRST: POST /substances is the system-of-record door —
    // same collection, one definition, two plies (the generator would
    // otherwise answer 405 for non-GET on an AXP route).
    if (path === "/substances" && method === "POST") return createSubstance(request);

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === "GET") emitMeter(request, { operation: "listSafetyDataSheets", shape: "anon-sandbox" });
      return hit;
    }

    // MCP door (mounted → declared on the card).
    if (path === "/mcp") {
      emitMeter(request, { operation: "mcp:" + (method === "POST" ? "call" : method), shape: "anon-sandbox" });
      return mcp(request);
    }

    // The outcome verb (402 OFFER stub).
    if (method === "POST" && seg.length === 3 && seg[0] === "shipping-declarations" && seg[2] === "issue") {
      return issueShippingDeclaration(request, seg[1]);
    }

    if (method === "GET" || method === "HEAD") {
      if (path === "/icp.json") return json(ICP_DOC);
      if (path === "/verify") return json(VERIFY_DOC);

      if (seg[0] === "safety-data-sheets" && seg.length === 2) {
        emitMeter(request, { operation: "getSafetyDataSheet", shape: "anon-sandbox" });
        return getOr(seed.safetyDataSheets, seg[1], "safetyDataSheets", "safety data sheet");
      }
      if (path === "/substances") {
        emitMeter(request, { operation: "listSubstances", shape: "anon-sandbox" });
        return listOr(
          seed.substances,
          [
            { param: "hazardClass", field: "hazardClass" },
            { param: "physicalState", field: "physicalState" },
          ],
          url.searchParams,
          "substances",
          "substances",
        );
      }
      if (seg[0] === "substances" && seg.length === 2) {
        emitMeter(request, { operation: "getSubstance", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).substances : [];
        return getOr([...seed.substances, ...wsRecs], seg[1], "substances", "substance");
      }
      if (path === "/shipping-declarations") {
        emitMeter(request, { operation: "listShippingDeclarations", shape: "anon-sandbox" });
        return listOr(
          seed.shippingDeclarations,
          [
            { param: "status", field: "status" },
            { param: "substance", field: "substanceId" },
          ],
          url.searchParams,
          "shippingDeclarations",
          "shipping declarations",
        );
      }
      if (seg[0] === "shipping-declarations" && seg.length === 2) {
        emitMeter(request, { operation: "getShippingDeclaration", shape: "anon-sandbox" });
        return getOr(seed.shippingDeclarations, seg[1], "shippingDeclarations", "shipping declaration");
      }
      if (path === "/facilities") {
        emitMeter(request, { operation: "listFacilities", shape: "anon-sandbox" });
        return envelopeResponse(ok(seed.facilities, { memberName: "facilities" }));
      }
      if (seg[0] === "facilities" && seg.length === 2) {
        emitMeter(request, { operation: "getFacility", shape: "anon-sandbox" });
        return getOr(seed.facilities, seg[1], "facilities", "facility");
      }
    }

    return envelopeResponse(
      empty("no route at this path — nothing here has been deleted; the route was never written", { memberName: "results" }),
      { status: 404 },
    );
  },
};
