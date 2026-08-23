/**
 * mcp.js — the mounted MCP door (template §4.4): same Nouns, same verbs, one
 * definition — every tool below reads the SAME store the HTTP collections
 * serve, so the two transports cannot diverge. Minimal streamable-HTTP
 * JSON-RPC: POST /mcp (initialize, tools/list, tools/call); GET answers 405
 * (this server does not open a server-push stream).
 */

import { records, find } from "./store.js";

const PROTOCOL_VERSION = "2025-06-18";

/** Read-only tools over the four Noun collections (one definition: product.js). */
export const tools = [
  {
    name: "listServices",
    description: "List the Service records (NAPCS sellable-outcome grain). Optional filters: category, tag.",
    inputSchema: {
      type: "object",
      properties: { category: { type: "string" }, tag: { type: "string" } },
    },
  },
  {
    name: "getService",
    description: "Get one Service record by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "listEngagements",
    description: "List Engagement (SOW) records — the PSA system-of-record collection.",
    inputSchema: { type: "object", properties: { status: { type: "string" } } },
  },
  {
    name: "listWorkOrders",
    description: "List WorkOrder records — the FSM delivery decomposition (O*NET task grain).",
    inputSchema: { type: "object", properties: { status: { type: "string" } } },
  },
  {
    name: "listOutcomes",
    description: "List Outcome records — completed, verified deliverables (verify-then-settle seam).",
    inputSchema: { type: "object", properties: { status: { type: "string" } } },
  },
  {
    name: "getOutcome",
    description: "Get one Outcome record by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
];

function callTool(name, args = {}) {
  switch (name) {
    case "listServices": {
      let recs = records("services");
      if (args.category) recs = recs.filter((r) => r.category === args.category);
      if (args.tag) recs = recs.filter((r) => r.tag === args.tag);
      return { type: recs.length ? "OK" : "EMPTY", results: recs };
    }
    case "getService": {
      const rec = find("services", args.id);
      return rec ? { type: "OK", results: [rec] } : { type: "EMPTY", results: [], message: `no Service ${args.id}` };
    }
    case "listEngagements":
    case "listWorkOrders":
    case "listOutcomes": {
      const collection = name === "listEngagements" ? "engagements" : name === "listWorkOrders" ? "work-orders" : "outcomes";
      let recs = records(collection);
      if (args.status) recs = recs.filter((r) => r.status === args.status);
      return { type: recs.length ? "OK" : "EMPTY", results: recs };
    }
    case "getOutcome": {
      const rec = find("outcomes", args.id);
      return rec ? { type: "OK", results: [rec] } : { type: "EMPTY", results: [], message: `no Outcome ${args.id}` };
    }
    default:
      return null;
  }
}

const JSON_CT = { "content-type": "application/json; charset=utf-8" };
const rpcResult = (id, result) => new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status: 200, headers: JSON_CT });
const rpcError = (id, code, message) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }), { status: 200, headers: JSON_CT });

/** Handle POST /mcp. Returns a Response. */
export async function handleMcp(request, { name, version }) {
  if (request.method === "GET" || request.method === "HEAD") {
    return new Response(
      JSON.stringify({ type: "BLOCKED", reason: "the MCP door answers JSON-RPC over POST; this server opens no server-push stream" }),
      { status: 405, headers: { ...JSON_CT, allow: "POST" } },
    );
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ type: "BLOCKED", reason: `method ${request.method} not served at /mcp` }), {
      status: 405,
      headers: { ...JSON_CT, allow: "POST" },
    });
  }
  let msg;
  try {
    msg = await request.json();
  } catch {
    return rpcError(null, -32700, "parse error — the MCP door speaks JSON-RPC 2.0");
  }
  const { id, method, params } = msg || {};
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name, version },
      });
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools });
    case "tools/call": {
      const envelope = callTool(params?.name, params?.arguments);
      if (envelope === null) return rpcError(id, -32602, `unknown tool ${params?.name}`);
      return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(envelope) }], isError: false });
    }
    default:
      return rpcError(id, -32601, `method ${method} not found`);
  }
}
