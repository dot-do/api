/**
 * mcp.js — the MCP door (POST /mcp, streamable HTTP): the SAME nouns and
 * verbs as the HTTP face, one definition (spec §3.3 / §4.4). Minimal
 * JSON-RPC 2.0 server: initialize, tools/list, tools/call. Tool names ARE
 * the canonical operationIds (axp-ext-rates-g2 §1 — one identifier, five
 * surfaces).
 *
 * Auth per the batch ruling: the anonymous-sandbox rung is AUTHLESS; a
 * bearer-key tier arms only when a rung above the sandbox mounts. At wave
 * zero every mounted tool is a sandbox read or the OFFER-terms door, so no
 * bearer check gates anything — and nothing above the sandbox is advertised.
 */

import { bookings, serviceOffers, saleRecords, posSummary, getBooking, getServiceOffer, getSaleRecord } from "./seed.js";
import { establishmentLicenses, LICENSE_PROVENANCE, getEstablishmentLicense } from "./seed-licenses.js";
import { manifest } from "./manifest.js";
import { emitMeter } from "./seams.js";

const PROTOCOL_VERSION = "2025-06-18";

const id = { id: { type: "string" } };

/** name (= operationId) → { description, inputSchema properties, handler } */
const TOOLS = {
  listBookings: {
    description: "List bookings (typed; filter by status/category/practitionerId) — labeled synthetic sandbox records",
    input: { status: { type: "string" }, category: { type: "string" }, practitionerId: { type: "string" } },
    handler: (i) =>
      bookings
        .filter((b) => (i.status ? b.status === i.status : true))
        .filter((b) => (i.category ? b.category === i.category : true))
        .filter((b) => (i.practitionerId ? b.practitionerId === i.practitionerId : true)),
  },
  getBooking: {
    description: "One booking by id, with its service, practitioner, and derived status",
    input: id,
    handler: (i) => getBooking(i.id ?? "") ?? { message: "not found" },
  },
  requestBooking: {
    description:
      "Request a confirmed booking (per-outcome) — returns the 402 OFFER terms (settlement rail not yet activated; LABELED STUB, no charge can occur)",
    input: { serviceOfferId: { type: "string" }, startAt: { type: "string" } },
    handler: (i) => ({
      type: "OFFER",
      serviceOfferId: i.serviceOfferId,
      startAt: i.startAt,
      see: "POST /bookings",
      offer: manifest.pricing.offers[0],
      stub: "settlement rail not yet activated — no charge can occur; alternatives list only mounted rungs",
    }),
  },
  listServiceOffers: {
    description: "The service menu at the Offer grain (labeled synthetic sandbox records)",
    input: { category: { type: "string" }, practitionerId: { type: "string" } },
    handler: (i) =>
      serviceOffers
        .filter((s) => (i.category ? s.category === i.category : true))
        .filter((s) => (i.practitionerId ? s.practitionerId === i.practitionerId : true)),
  },
  getServiceOffer: { description: "One service-menu offer by id", input: id, handler: (i) => getServiceOffer(i.id ?? "") ?? { message: "not found" } },
  listSaleRecords: {
    description: "POS sale records settling completed bookings, plus the derived period summary (labeled synthetic sandbox records)",
    input: { practitionerId: { type: "string" } },
    handler: (i) => ({
      posSummary,
      saleRecords: saleRecords.filter((s) => (i.practitionerId ? s.practitionerId === i.practitionerId : true)),
    }),
  },
  getSaleRecord: {
    description: "One sale record (or the period summary by its id)",
    input: id,
    handler: (i) => getSaleRecord(i.id ?? "") ?? { message: "not found" },
  },
  listEstablishmentLicenses: {
    description:
      "REAL public TDLR salon establishment-license registry data (Travis County full-service salons) — corpus provenance and disclosed curation included; not example data",
    input: { licenseNumber: { type: "string" }, cityStateZip: { type: "string" } },
    handler: (i) => ({
      provenance: LICENSE_PROVENANCE,
      establishmentLicenses: establishmentLicenses
        .filter((r) => (i.licenseNumber ? r.licenseNumber === i.licenseNumber : true))
        .filter((r) => (i.cityStateZip ? (r.cityStateZip || "").includes(i.cityStateZip) : true))
        .slice(0, 100),
      note: "list capped at 100 rows per call over MCP — the HTTP face serves the full corpus",
    }),
  },
  getEstablishmentLicense: {
    description: "One real establishment license (by lic_### id or bare license number) with the corpus provenance",
    input: id,
    handler: (i) => {
      const r = getEstablishmentLicense(i.id ?? "");
      return r ? { provenance: LICENSE_PROVENANCE, establishmentLicense: r } : { message: "not found" };
    },
  },
};

function rpcResult(reqId, result) {
  return { jsonrpc: "2.0", id: reqId, result };
}

function rpcError(reqId, code, message) {
  return { jsonrpc: "2.0", id: reqId ?? null, error: { code, message } };
}

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

/** Handle /mcp. Returns undefined when the path is not /mcp. */
export async function mcpHandler(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/mcp") return undefined;

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ type: "BLOCKED", reason: "the MCP door answers JSON-RPC over POST (streamable HTTP); GET streams are not mounted at wave zero" }, null, 2),
      { status: 405, headers: { ...JSON_CT, allow: "POST" } },
    );
  }

  let msg;
  try {
    msg = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "parse error — the body must be a JSON-RPC 2.0 message"), null, 2), {
      status: 400,
      headers: JSON_CT,
    });
  }

  // notifications carry no id and get no body
  if (msg && typeof msg === "object" && msg.id === undefined && typeof msg.method === "string") {
    return new Response(null, { status: 202 });
  }

  const { id: reqId, method, params } = msg || {};

  if (method === "initialize") {
    return new Response(
      JSON.stringify(
        rpcResult(reqId, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: manifest.name, version: manifest.version },
          instructions:
            "Authless anonymous-sandbox rung: every tool reads labeled synthetic sandbox records or real provenance-labeled public TDLR license data; requestBooking returns 402 OFFER terms (labeled stub, no charge can occur).",
        }),
        null,
        2,
      ),
      { status: 200, headers: JSON_CT },
    );
  }

  if (method === "tools/list") {
    const tools = Object.entries(TOOLS).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: { type: "object", properties: t.input },
    }));
    return new Response(JSON.stringify(rpcResult(reqId, { tools }), null, 2), { status: 200, headers: JSON_CT });
  }

  if (method === "tools/call") {
    const name = params?.name;
    const tool = TOOLS[name];
    if (!tool) {
      return new Response(JSON.stringify(rpcError(reqId, -32602, `unknown tool '${name}' — tools/list names every mounted tool`), null, 2), {
        status: 200,
        headers: JSON_CT,
      });
    }
    emitMeter(env, { operation: name });
    const result = tool.handler(params?.arguments ?? {});
    return new Response(
      JSON.stringify(rpcResult(reqId, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }), null, 2),
      { status: 200, headers: JSON_CT },
    );
  }

  return new Response(JSON.stringify(rpcError(reqId, -32601, `method '${method}' is not served — initialize, tools/list, tools/call`), null, 2), {
    status: 200,
    headers: JSON_CT,
  });
}
