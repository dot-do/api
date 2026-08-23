/**
 * worker.js — the trade-customs wave-zero property: one Workers-shaped
 * worker serving BOTH plies from one definition (template spec §3):
 *
 *   data face      — typed record reads (/shipments, /bills-of-lading,
 *                    /certificates-of-origin, /phytosanitary-certificates,
 *                    /commercial-invoices, /customs-entries)
 *   headless face  — the forwarder-grade document-pipeline system-of-record
 *                    door on the SAME collection (POST /shipments), anon
 *                    workspaces
 *
 * plus the full machine face (AXP quartet via the vendored generator), the
 * mounted MCP door, the 402-shaped payable STUB (labeled; never fake
 * billing), and the §7.4 seams.
 *
 * PLACEHOLDER ADDRESS: this is a GAP register row (no name held for
 * cross-border trade & customs); the substrate is built G3-first per spec §0
 * and the G4 brand attaches when a name is ruled. The regulated act (customs
 * brokerage, 19 CFR 111) is not performed here — the operator brings the
 * license; broker-side scopes answer BLOCKED.
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
const workspaces = new Map(); // workspaceId -> { shipments: [] }
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

// ── headless face: start a shipment packet in an anon workspace ────────────
async function createShipment(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return envelopeResponse({ type: "BLOCKED", reason: "the request body must be JSON with at least a reference member" }, { status: 403 });
  }
  if (!body || typeof body.reference !== "string" || body.reference.length === 0) {
    return envelopeResponse({ type: "BLOCKED", reason: "a shipment needs a reference — send { reference, mode?, originCountry?, destinationCountry? }" }, { status: 403 });
  }
  const wsId = request.headers.get("x-workspace") || mintId();
  const ws = workspaces.get(wsId) || { shipments: [] };
  const rec = {
    id: `shp-${wsId}-${ws.shipments.length + 1}`,
    reference: String(body.reference),
    mode: ["ocean", "air", "rail"].includes(body.mode) ? body.mode : null,
    originCountry: body.originCountry ? String(body.originCountry) : null,
    destinationCountry: body.destinationCountry ? String(body.destinationCountry) : null,
    status: "assembling",
    packetDocumentIds: [],
    workspace: wsId,
    example: true,
    demo_notice: "Record created in an anonymous sandbox workspace. " + RETENTION,
  };
  ws.shipments.push(rec);
  workspaces.set(wsId, ws);
  emitMeter(request, { operation: "createShipment", shape: "anon-sandbox" });
  return json({ type: "OK", shipments: [rec], workspace: wsId, retention: RETENTION }, { headers: { "x-workspace": wsId } });
}

// ── the outcome verb: 402-shaped payable STUB (labeled; never fake billing) ─
function assemblePacket(request, id) {
  const wsId = request.headers.get("x-workspace");
  const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).shipments : [];
  const rec = [...seed.shipments, ...wsRecs].find((r) => r.id === id);
  if (!rec) {
    return envelopeResponse(empty(`no shipment with id ${id} — nothing to assemble`, { memberName: "shipments" }));
  }
  emitMeter(request, { operation: "assemblePacket", shape: "paid-stub" });
  emitMoneyEvent(request, { operation: "assemblePacket", amount: 5.0 });
  emitReceipt(request, { operation: "assemblePacket" });
  return envelopeResponse(
    offer({
      id: "assemble-packet-stub",
      title: `Assemble the cross-border document packet for shipment ${id} (per-outcome) — STUB: test-mode, no live settlement; nothing is charged`,
      price: { model: "metered", unit: "usd-per-assembled-packet", price: 5.0 },
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
    if (path === "/shipments" && method === "POST") return createShipment(request);

    // The machine face (quartet, branching collection, offer, home).
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && method === "GET") emitMeter(request, { operation: "listShipments", shape: "anon-sandbox" });
      return hit;
    }

    // MCP door (mounted → declared on the card).
    if (path === "/mcp") {
      emitMeter(request, { operation: "mcp:" + (method === "POST" ? "call" : method), shape: "anon-sandbox" });
      return mcp(request);
    }

    // The outcome verb (402 OFFER stub).
    if (method === "POST" && seg.length === 3 && seg[0] === "shipments" && seg[2] === "assemble-packet") {
      return assemblePacket(request, seg[1]);
    }

    if (method === "GET" || method === "HEAD") {
      if (path === "/icp.json") return json(ICP_DOC);
      // No /rates side door: rates[] rides top-level in /pricing
      // (axp-ext-rates-g2 — the ruled placement; served by the generator).
      if (path === "/verify") return json(VERIFY_DOC);

      if (seg[0] === "shipments" && seg.length === 2) {
        emitMeter(request, { operation: "getShipment", shape: "anon-sandbox" });
        const wsId = request.headers.get("x-workspace");
        const wsRecs = wsId && workspaces.get(wsId) ? workspaces.get(wsId).shipments : [];
        return getOr([...seed.shipments, ...wsRecs], seg[1], "shipments", "shipment");
      }
      if (path === "/bills-of-lading") {
        emitMeter(request, { operation: "listBillsOfLading", shape: "anon-sandbox" });
        return listOr(
          seed.billsOfLading,
          [
            { param: "shipment", field: "shipmentId" },
            { param: "status", field: "status" },
          ],
          url.searchParams,
          "billsOfLading",
          "bills of lading",
        );
      }
      if (seg[0] === "bills-of-lading" && seg.length === 2) {
        emitMeter(request, { operation: "getBillOfLading", shape: "anon-sandbox" });
        return getOr(seed.billsOfLading, seg[1], "billsOfLading", "bill of lading");
      }
      if (path === "/certificates-of-origin") {
        emitMeter(request, { operation: "listCertificatesOfOrigin", shape: "anon-sandbox" });
        return listOr(seed.certificatesOfOrigin, [{ param: "shipment", field: "shipmentId" }], url.searchParams, "certificatesOfOrigin", "certificates of origin");
      }
      if (path === "/phytosanitary-certificates") {
        emitMeter(request, { operation: "listPhytosanitaryCertificates", shape: "anon-sandbox" });
        return listOr(seed.phytosanitaryCertificates, [{ param: "shipment", field: "shipmentId" }], url.searchParams, "phytosanitaryCertificates", "phytosanitary certificates");
      }
      if (path === "/commercial-invoices") {
        emitMeter(request, { operation: "listCommercialInvoices", shape: "anon-sandbox" });
        return listOr(seed.commercialInvoices, [{ param: "shipment", field: "shipmentId" }], url.searchParams, "commercialInvoices", "commercial invoices");
      }
      if (seg[0] === "commercial-invoices" && seg.length === 2) {
        emitMeter(request, { operation: "getCommercialInvoice", shape: "anon-sandbox" });
        return getOr(seed.commercialInvoices, seg[1], "commercialInvoices", "commercial invoice");
      }
      if (path === "/customs-entries") {
        emitMeter(request, { operation: "listCustomsEntries", shape: "anon-sandbox" });
        return listOr(
          seed.customsEntries,
          [
            { param: "shipment", field: "shipmentId" },
            { param: "status", field: "status" },
          ],
          url.searchParams,
          "customsEntries",
          "customs entries",
        );
      }
      if (seg[0] === "customs-entries" && seg.length === 2) {
        emitMeter(request, { operation: "getCustomsEntry", shape: "anon-sandbox" });
        return getOr(seed.customsEntries, seg[1], "customsEntries", "customs entry");
      }
    }

    return envelopeResponse(
      empty("no route at this path — nothing here has been deleted; the route was never written", { memberName: "results" }),
      { status: 404 },
    );
  },
};
