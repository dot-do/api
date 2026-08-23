/**
 * mcp.js — the MCP door (POST /mcp, streamable HTTP): the SAME nouns and
 * verbs as the HTTP face, one definition (spec §3.3 / §4.4). Minimal
 * JSON-RPC 2.0 server: initialize, tools/list, tools/call.
 *
 * Auth per the batch-2 ruling: the anonymous-sandbox rung is AUTHLESS; a
 * bearer-key tier arms only when a rung above the sandbox mounts. At wave
 * zero every mounted tool is a sandbox read or the OFFER-terms door, so no
 * bearer check gates anything — and nothing above the sandbox is advertised.
 */

import { registrations, filings, permits, getRegistration, getFiling, getPermit } from "./seed.js";
import { awards, AWARDS_PROVENANCE } from "./seed-awards.js";
import { manifest } from "./manifest.js";
import { emitMeter } from "./seams.js";

const PROTOCOL_VERSION = "2025-06-18";

const id = { id: { type: "string" } };

/** name → { description, inputSchema properties, handler } */
const TOOLS = {
  listRegistrations: {
    description: "List registrations (typed; filter by jurisdiction/status/registry) — labeled synthetic sandbox records",
    input: { jurisdiction: { type: "string" }, status: { type: "string" }, registry: { type: "string" } },
    handler: (i) =>
      registrations
        .filter((r) => (i.jurisdiction ? r.jurisdiction === i.jurisdiction : true))
        .filter((r) => (i.status ? r.status === i.status : true))
        .filter((r) => (i.registry ? r.registry === i.registry : true)),
  },
  getRegistration: {
    description: "One registration by id, with the filings that discharge it",
    input: id,
    handler: (i) => getRegistration(i.id ?? "") ?? { message: "not found" },
  },
  orderRenewal: {
    description:
      "Order a completed, verified registration renewal filing — returns the 402 OFFER terms (settlement rail not yet activated; LABELED STUB, no charge can occur)",
    input: { registrationId: { type: "string" } },
    handler: (i) => {
      const r = getRegistration(i.registrationId ?? "");
      if (!r) return { message: "not found" };
      return {
        type: "OFFER",
        registration: r.id,
        see: "POST /renewals",
        offer: manifest.pricing.offers[0],
        stub: "settlement rail not yet activated — no charge can occur; alternatives list only mounted rungs",
      };
    },
  },
  listFilings: {
    description: "Filings — completed artifacts and open renewal tasks (labeled synthetic sandbox records)",
    input: { status: { type: "string" }, registrationId: { type: "string" } },
    handler: (i) =>
      filings
        .filter((f) => (i.status ? f.status === i.status : true))
        .filter((f) => (i.registrationId ? f.registrationId === i.registrationId : true)),
  },
  getFiling: { description: "One filing by id", input: id, handler: (i) => getFiling(i.id ?? "") ?? { message: "not found" } },
  listAwards: {
    description: "REAL public federal contract awards (USAspending ingest, public domain) — provenance included; not example data",
    input: {},
    handler: () => ({ provenance: AWARDS_PROVENANCE, awards }),
  },
  getAward: {
    description: "One real award record with its full provenance",
    input: id,
    handler: (i) => awards.find((a) => a.id === i.id) ?? { message: "not found" },
  },
  listPermits: {
    description: "Permit records (labeled synthetic sandbox records)",
    input: { status: { type: "string" }, kind: { type: "string" } },
    handler: (i) =>
      permits.filter((p) => (i.status ? p.status === i.status : true)).filter((p) => (i.kind ? p.kind === i.kind : true)),
  },
  getPermit: { description: "One permit by id", input: id, handler: (i) => getPermit(i.id ?? "") ?? { message: "not found" } },
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
            "Authless anonymous-sandbox rung: every tool reads labeled synthetic sandbox records or real provenance-labeled public award data; orderRenewal returns 402 OFFER terms (labeled stub, no charge can occur).",
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
