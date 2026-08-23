/**
 * worker.js — the manufacturing wave-zero property: one Workers-shaped
 * worker serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/items, /boms, /passports, /rfqs,
 *                    /quotes, /trading-documents, /crosswalk)
 *   headless face  — the PIM/ERP master-data system-of-record door on the
 *                    SAME collections (POST /items), anon workspaces
 *
 * plus the full machine face (AXP quartet via the vendored generator,
 * carrying the axp-ext/rates-g2 ruled placements: rates[] top-level in the
 * Pricing Document, g2 + links.verify on the card, operationId on every
 * route), the mounted authless MCP door, the 402-shaped payable STUB
 * (labeled; never fake billing), and the §7.4 seams.
 *
 * PLACEHOLDER ADDRESS: this is a GAP register row (zero market-face names
 * held for NAICS 31-33); the substrate is built G3-first per spec §0 and the
 * G4 brand attaches when a name is ruled (#16).
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

// GS1 fixture law for workspace-minted items: demo-prefix 952 GTIN-13 with a
// valid check digit (same routine as the seed generator).
function gtin13(data12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(data12[i]) * (i % 2 === 0 ? 1 : 3);
  return data12 + String((10 - (sum % 10)) % 10);
}
let wsGtinSeq = 900000000; // workspace-minted range, still 952-prefixed
const nextWorkspaceGtin = () => gtin13("952" + String(++wsGtinSeq).padStart(9, "0"));

// Anonymous sandbox workspaces — auto-minted, per-isolate, disclosed retention.
const workspaces = new Map(); // workspaceId -> { items: [] }
const mintId = () => "ws-" + Math.random().toString(36).slice(2, 10);

function listOr(records, filters, searchParams, memberName, emptyNoun) {
  let recs = records;
  let applied = null;
  for (const f of filters) {
    const v = searchParams.get(f.param);
    if (v !== null) {
      recs = recs.filter((r) => (f.has ? (r[f.field] || []).includes(v) : String(r[f.field]) === v));
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

// ── headless face: create item in an anon workspace ────────────────────────
async function createItem(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return envelopeResponse({ type: "BLOCKED", reason: "the request body must be JSON with at least a name member" }, { status: 403 });
  }
  if (!body || typeof body.name !== "string" || body.name.length === 0) {
    return envelopeResponse({ type: "BLOCKED", reason: "an item needs a name — send { name, gpcSegment? }" }, { status: 403 });
  }
  const wsId = request.headers.get("x-workspace") || mintId();
  const ws = workspaces.get(wsId) || { items: [] };
  const rec = {
    id: `item-${wsId}-${ws.items.length + 1}`,
    gtin: nextWorkspaceGtin(), // GS1 demo prefix 952, valid check digit
    name: String(body.name),
    gpcSegment: body.gpcSegment ? String(body.gpcSegment) : null,
    status: "draft",
    workspace: wsId,
    example: true,
    demo_notice: "Record created in an anonymous sandbox workspace (GS1 demo-prefix 952 GTIN). " + RETENTION,
  };
  ws.items.push(rec);
  workspaces.set(wsId, ws);
  emitMeter(request, { operation: "createItem", shape: "anon-sandbox" });
  return json({ type: "OK", items: [rec], workspace: wsId, retention: RETENTION }, { headers: { "x-workspace": wsId } });
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function syndicateItem(request, id) {
  const wsId = request.headers.get("x-workspace");
  const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).items : [];
  const rec = [...seed.items, ...wsRecs].find((r) => r.id === id);
  if (!rec) {
    return envelopeResponse(empty(`no item with id ${id} — nothing to syndicate`, { memberName: "items" }));
  }
  emitMeter(request, { operation: "syndicateItem", shape: "paid-stub" });
  emitMoneyEvent(request, { operation: "syndicateItem", amount: 0.25 });
  emitReceipt(request, { operation: "syndicateItem" });
  return envelopeResponse(
    offer({
      id: "syndicate-item-stub",
      title: `Syndicate verified item ${id} (per-outcome) — STUB: test-mode, no live settlement; nothing is charged`,
      price: { model: "metered", unit: "usd-per-verified-item-syndication", price: 0.25 },
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

    // Headless face FIRST: POST on the collection path is the system-of-record
    // door — same collection, one definition, two plies (the generator would
    // otherwise answer 405 for non-GET on an AXP route).
    if (path === "/items" && method === "POST") return createItem(request);

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === "GET") emitMeter(request, { operation: "listItems", shape: "anon-sandbox" });
      return hit;
    }

    // MCP door (mounted → declared on the card; AUTHLESS — anon-sandbox rung
    // only; bearer-key rungs above the floor are not mounted at wave zero).
    if (path === "/mcp") {
      emitMeter(request, { operation: "mcp:" + (method === "POST" ? "call" : method), shape: "anon-sandbox" });
      return mcp(request);
    }

    // The outcome verb (402 OFFER stub).
    if (method === "POST" && seg.length === 3 && seg[0] === "items" && seg[2] === "syndicate") {
      return syndicateItem(request, seg[1]);
    }

    if (method === "GET" || method === "HEAD") {
      if (path === "/icp.json") return json(ICP_DOC);
      if (path === "/verify") return json(VERIFY_DOC);

      if (seg[0] === "items" && seg.length === 2) {
        emitMeter(request, { operation: "getItem", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).items : [];
        return getOr([...seed.items, ...wsRecs], seg[1], "items", "item");
      }
      if (path === "/boms") {
        emitMeter(request, { operation: "listBoms", shape: "anon-sandbox" });
        return listOr(seed.boms, [{ param: "item", field: "itemId" }], url.searchParams, "boms", "bills of materials");
      }
      if (seg[0] === "boms" && seg.length === 2) {
        emitMeter(request, { operation: "getBom", shape: "anon-sandbox" });
        return getOr(seed.boms, seg[1], "boms", "bill of materials");
      }
      if (path === "/passports") {
        emitMeter(request, { operation: "listPassports", shape: "anon-sandbox" });
        return listOr(seed.passports, [{ param: "item", field: "itemId" }], url.searchParams, "passports", "product passports");
      }
      if (seg[0] === "passports" && seg.length === 2) {
        emitMeter(request, { operation: "getPassport", shape: "anon-sandbox" });
        return getOr(seed.passports, seg[1], "passports", "product passport");
      }
      if (path === "/rfqs") {
        emitMeter(request, { operation: "listRfqs", shape: "anon-sandbox" });
        return listOr(seed.rfqs, [{ param: "status", field: "status" }], url.searchParams, "rfqs", "RFQs");
      }
      if (seg[0] === "rfqs" && seg.length === 2) {
        emitMeter(request, { operation: "getRfq", shape: "anon-sandbox" });
        return getOr(seed.rfqs, seg[1], "rfqs", "RFQ");
      }
      if (path === "/quotes") {
        emitMeter(request, { operation: "listQuotes", shape: "anon-sandbox" });
        return listOr(seed.quotes, [{ param: "rfq", field: "rfqId" }], url.searchParams, "quotes", "quotes");
      }
      if (path === "/trading-documents") {
        emitMeter(request, { operation: "listTradingDocuments", shape: "anon-sandbox" });
        return listOr(
          seed.tradingDocuments,
          [
            { param: "kind", field: "kind" },
            { param: "item", field: "itemIds", has: true },
          ],
          url.searchParams,
          "tradingDocuments",
          "trading documents",
        );
      }
      if (path === "/crosswalk") {
        emitMeter(request, { operation: "listCrosswalkEntries", shape: "anon-sandbox" });
        return listOr(
          seed.crosswalk,
          [
            { param: "unspsc", field: "unspsc" },
            { param: "gpc", field: "gpc" },
          ],
          url.searchParams,
          "crosswalk",
          "crosswalk rows",
        );
      }
    }

    return envelopeResponse(
      empty("no route at this path — nothing here has been deleted; the route was never written", { memberName: "results" }),
      { status: 404 },
    );
  },
};
