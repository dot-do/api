/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true). Tool name strings are the
 * canonical camelCase operationIds — one identifier across every face.
 */
import { ok, empty } from "./axp/index.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

export function createMcpHandler(seed, { onCall } = {}) {
  const tools = [
    { name: "listShipments", description: "List shipment records (labeled example data); optional filters status, mode.", inputSchema: { type: "object", properties: { status: { type: "string" }, mode: { type: "string" } } } },
    { name: "getShipment", description: "One shipment by id, with its packet document refs.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listBillsOfLading", description: "List electronic bills of lading (DCSA-spec typing; synthetic values, labeled); optional filters shipment, status.", inputSchema: { type: "object", properties: { shipment: { type: "string" }, status: { type: "string" } } } },
    { name: "getBillOfLading", description: "One eBL by id.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listCertificatesOfOrigin", description: "List certificates of origin (UN/CEFACT-typed; synthetic values, labeled); optional filter shipment.", inputSchema: { type: "object", properties: { shipment: { type: "string" } } } },
    { name: "listCustomsEntries", description: "List customs entry records (synthetic HTS-shaped keys, labeled); optional filters shipment, status.", inputSchema: { type: "object", properties: { shipment: { type: "string" }, status: { type: "string" } } } },
  ];

  function call(name, args = {}) {
    switch (name) {
      case "listShipments": {
        let recs = seed.shipments;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        if (args.mode) recs = recs.filter((r) => r.mode === args.mode);
        return recs.length ? ok(recs, { memberName: "shipments" }) : empty("no shipments match the filter — a truthful empty set", { memberName: "shipments" });
      }
      case "getShipment": {
        const rec = seed.shipments.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "shipments" }) : empty(`no shipment with id ${args.id}`, { memberName: "shipments" });
      }
      case "listBillsOfLading": {
        let recs = seed.billsOfLading;
        if (args.shipment) recs = recs.filter((r) => r.shipmentId === args.shipment);
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        return recs.length ? ok(recs, { memberName: "billsOfLading" }) : empty("no bills of lading match the filter — a truthful empty set", { memberName: "billsOfLading" });
      }
      case "getBillOfLading": {
        const rec = seed.billsOfLading.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "billsOfLading" }) : empty(`no bill of lading with id ${args.id}`, { memberName: "billsOfLading" });
      }
      case "listCertificatesOfOrigin": {
        let recs = seed.certificatesOfOrigin;
        if (args.shipment) recs = recs.filter((r) => r.shipmentId === args.shipment);
        return recs.length ? ok(recs, { memberName: "certificatesOfOrigin" }) : empty("no certificates of origin match the filter — a truthful empty set", { memberName: "certificatesOfOrigin" });
      }
      case "listCustomsEntries": {
        let recs = seed.customsEntries;
        if (args.shipment) recs = recs.filter((r) => r.shipmentId === args.shipment);
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        return recs.length ? ok(recs, { memberName: "customsEntries" }) : empty("no customs entries match the filter — a truthful empty set", { memberName: "customsEntries" });
      }
      default:
        return null;
    }
  }

  const rpcError = (id, code, message) =>
    new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }), { status: 200, headers: JSON_CT });
  const rpcResult = (id, result) =>
    new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status: 200, headers: JSON_CT });

  return async function handleMcp(request) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ type: "BLOCKED", reason: "the MCP door answers JSON-RPC 2.0 over POST" }), {
        status: 405,
        headers: { ...JSON_CT, allow: "POST" },
      });
    }
    let msg;
    try {
      msg = await request.json();
    } catch {
      return rpcError(null, -32700, "parse error — the body must be a JSON-RPC 2.0 message");
    }
    const { id, method, params } = msg || {};
    switch (method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: params?.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "trade-customs", version: "0.1.0" },
        });
      case "notifications/initialized":
        return new Response(null, { status: 202 });
      case "tools/list":
        return rpcResult(id, { tools });
      case "tools/call": {
        const name = params?.name;
        const result = call(name, params?.arguments || {});
        if (result === null) return rpcError(id, -32602, `unknown tool ${JSON.stringify(name)} — tools/list names the six that exist`);
        if (onCall) onCall(name);
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(result) }], isError: false });
      }
      default:
        return rpcError(id, -32601, `method ${JSON.stringify(method)} not found — this door serves initialize, tools/list, tools/call`);
    }
  };
}
