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

import { portOrders, coverageRecords, usageRecords, usageCycleSummary, getPortOrder, getCoverageRecord, getUsageRecord } from "./seed.js";
import { numberingResources, NUMBERING_PROVENANCE, getNumberingResource } from "./seed-numbering.js";
import { manifest } from "./manifest.js";
import { emitMeter } from "./seams.js";

const PROTOCOL_VERSION = "2025-06-18";

const id = { id: { type: "string" } };

/** name (= operationId) → { description, inputSchema properties, handler } */
const TOOLS = {
  listPortOrders: {
    description: "List port orders (typed; filter by status/direction/npa) — labeled synthetic sandbox records",
    input: { status: { type: "string" }, direction: { type: "string" }, npa: { type: "string" } },
    handler: (i) =>
      portOrders
        .filter((p) => (i.status ? p.status === i.status : true))
        .filter((p) => (i.direction ? p.direction === i.direction : true))
        .filter((p) => (i.npa ? p.npa === i.npa : true)),
  },
  getPortOrder: {
    description: "One port order by id, with its LOA reference and FOC state",
    input: id,
    handler: (i) => getPortOrder(i.id ?? "") ?? { message: "not found" },
  },
  orderNumberPort: {
    description:
      "Order a completed, verified number port (LOA-backed) — returns the 402 OFFER terms (settlement rail not yet activated; LABELED STUB, no charge can occur)",
    input: { subscriberNumber: { type: "string" } },
    handler: (i) => ({
      type: "OFFER",
      subscriberNumber: i.subscriberNumber,
      see: "POST /ports",
      offer: manifest.pricing.offers[0],
      stub: "settlement rail not yet activated — no charge can occur; alternatives list only mounted rungs",
    }),
  },
  listNumberingResources: {
    description: "REAL public NANPA area-code (NPA) registry data — corpus provenance included; not example data",
    input: { npa: { type: "string" }, location: { type: "string" }, inJeopardy: { type: "boolean" } },
    handler: (i) => ({
      provenance: NUMBERING_PROVENANCE,
      numberingResources: numberingResources
        .filter((r) => (i.npa ? r.npa === i.npa : true))
        .filter((r) => (i.location ? r.location === i.location : true))
        .filter((r) => (i.inJeopardy !== undefined ? r.inJeopardy === i.inJeopardy : true)),
    }),
  },
  getNumberingResource: {
    description: "One real numbering resource (by npa_### id or bare NPA) with the corpus provenance",
    input: id,
    handler: (i) => {
      const r = getNumberingResource(i.id ?? "");
      return r ? { provenance: NUMBERING_PROVENANCE, numberingResource: r } : { message: "not found" };
    },
  },
  listCoverageRecords: {
    description: "Serviceability records at the address grain (labeled synthetic sandbox records)",
    input: { technology: { type: "string" }, served: { type: "boolean" } },
    handler: (i) =>
      coverageRecords
        .filter((c) => (i.technology ? c.technology === i.technology : true))
        .filter((c) => (i.served !== undefined ? c.served === i.served : true)),
  },
  getCoverageRecord: { description: "One coverage record by id", input: id, handler: (i) => getCoverageRecord(i.id ?? "") ?? { message: "not found" } },
  listUsageRecords: {
    description: "Rated usage at the CDR grain plus the derived cycle summary (labeled synthetic sandbox records)",
    input: { subscriberNumber: { type: "string" }, kind: { type: "string" } },
    handler: (i) => ({
      cycleSummary: usageCycleSummary,
      usageRecords: usageRecords
        .filter((u) => (i.subscriberNumber ? u.subscriberNumber === i.subscriberNumber : true))
        .filter((u) => (i.kind ? u.kind === i.kind : true)),
    }),
  },
  getUsageRecord: {
    description: "One usage record (or the cycle summary by its id)",
    input: id,
    handler: (i) => getUsageRecord(i.id ?? "") ?? { message: "not found" },
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
            "Authless anonymous-sandbox rung: every tool reads labeled synthetic sandbox records or real provenance-labeled public NANPA numbering data; orderNumberPort returns 402 OFFER terms (labeled stub, no charge can occur).",
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
