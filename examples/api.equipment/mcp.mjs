/**
 * mcp.mjs — the mounted MCP door (template §4.4): same Nouns, same verbs, one
 * definition — every tool below reads the SAME store the HTTP collections
 * serve, so the two transports cannot diverge. Minimal streamable-HTTP
 * JSON-RPC: POST /mcp (initialize, tools/list, tools/call); GET answers 405
 * (this server does not open a server-push stream).
 *
 * Ladder posture (batch watch list): the MCP door is the AUTHLESS SANDBOX
 * rung — every tool serves the keyless floor over labeled example data; the
 * keyed/paid rungs sit above it and are advertised by the 402 OFFER
 * boundary on the HTTP faces, never gated here.
 *
 * axp-ext-rates-g2 §1: each tool NAME below IS the canonical operationId
 * (the card declares the names as strings; descriptions and input schemas
 * are served live by tools/list).
 */

import { records, find, passportForAsset } from "./store.mjs";
import { assets as seedAssets } from "./seed.mjs";

const PROTOCOL_VERSION = "2025-06-18";

/** Read-only tools over the Noun collections (one definition: substrate.mjs). */
export const tools = [
  {
    name: "listAssets",
    description: "List Asset registry records (serialized individuals, GIAI/GTIN identity spine). Optional filters: class, status, site.",
    inputSchema: {
      type: "object",
      properties: { class: { type: "string" }, status: { type: "string" }, site: { type: "string" } },
    },
  },
  {
    name: "getAsset",
    description: "Get one Asset registry record by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "getPassport",
    description: "Get the Digital Product Passport record for an asset (labeled example artifacts; EU battery DPP statutory clock 2027-02-18).",
    inputSchema: { type: "object", properties: { assetId: { type: "string" } }, required: ["assetId"] },
  },
  {
    name: "listWorkOrders",
    description: "List MaintenanceWorkOrder records (the EAM/CMMS system-of-record collection). Optional filter: status.",
    inputSchema: { type: "object", properties: { status: { type: "string" } } },
  },
  {
    name: "getWorkOrder",
    description: "Get one MaintenanceWorkOrder record by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "searchModels",
    description: "Search the EquipmentModel catalog (labeled synthetic seed — no manufacturer feed is claimed at wave zero). Optional filters: class, q.",
    inputSchema: { type: "object", properties: { class: { type: "string" }, q: { type: "string" } } },
  },
];

function callTool(name, args = {}) {
  switch (name) {
    case "listAssets": {
      // Serves the SAME truth as the HTTP branching collection: the generator
      // freezes a copy of the seed-tenant records at defineSiteManifest, so
      // the /assets listing is the seed registry snapshot on BOTH transports;
      // sandbox-minted records are workspace-scoped and reachable by id on
      // both transports (getAsset), never listed on either.
      let recs = seedAssets;
      for (const k of ["class", "status", "site"]) if (args[k]) recs = recs.filter((r) => String(r[k]) === args[k]);
      return { type: recs.length ? "OK" : "EMPTY", results: recs };
    }
    case "getAsset": {
      const rec = find("assets", args.id);
      return rec ? { type: "OK", results: [rec] } : { type: "EMPTY", results: [], message: `no Asset ${args.id}` };
    }
    case "getPassport": {
      const rec = passportForAsset(args.assetId);
      return rec
        ? { type: "OK", results: [rec] }
        : { type: "EMPTY", results: [], message: `no ProductPassport for asset ${args.assetId} — passports exist only where composed; nothing here was deleted` };
    }
    case "listWorkOrders": {
      let recs = records("work-orders");
      if (args.status) recs = recs.filter((r) => r.status === args.status);
      return { type: recs.length ? "OK" : "EMPTY", results: recs };
    }
    case "getWorkOrder": {
      const rec = find("work-orders", args.id);
      return rec ? { type: "OK", results: [rec] } : { type: "EMPTY", results: [], message: `no MaintenanceWorkOrder ${args.id}` };
    }
    case "searchModels": {
      let recs = records("models");
      if (args.class) recs = recs.filter((r) => r.class === args.class);
      if (args.q) recs = recs.filter((r) => JSON.stringify(r).toLowerCase().includes(String(args.q).toLowerCase()));
      return { type: recs.length ? "OK" : "EMPTY", results: recs };
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
