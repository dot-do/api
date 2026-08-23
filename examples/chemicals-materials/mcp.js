/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true). Tool names are string
 * canonical operationIds — the five-surface invariant (route = MCP tool =
 * suite ref = SDK functionName = rates key).
 *
 * Gate note (MCP ladder): the anon-sandbox rung is AUTHLESS — these six
 * read tools answer keyless. Rungs above the floor gate on a bearer key;
 * no tool above the floor is mounted at wave zero, so no bearer-gated tool
 * is declared (presence-when-true, never a ghost).
 */
import { ok, empty } from "./axp/index.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

export function createMcpHandler(seed, { onCall } = {}) {
  const tools = [
    { name: "listSafetyDataSheets", description: "List GHS 16-section SDS records (labeled synthetic example data); optional filters hazardClass, supplier.", inputSchema: { type: "object", properties: { hazardClass: { type: "string" }, supplier: { type: "string" } } } },
    { name: "getSafetyDataSheet", description: "One SDS by id — all 16 GHS sections.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listSubstances", description: "List substance records (CAS-shaped synthetic ids, labeled); optional filters hazardClass, physicalState.", inputSchema: { type: "object", properties: { hazardClass: { type: "string" }, physicalState: { type: "string" } } } },
    { name: "getSubstance", description: "One substance by id.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listShippingDeclarations", description: "List hazmat shipping declarations (49 CFR shipping-papers grain; synthetic, labeled); optional filters status, substance.", inputSchema: { type: "object", properties: { status: { type: "string" }, substance: { type: "string" } } } },
    { name: "listFacilities", description: "List facilities with their right-to-know substance inventory (synthetic, labeled).", inputSchema: { type: "object", properties: {} } },
  ];

  function call(name, args = {}) {
    switch (name) {
      case "listSafetyDataSheets": {
        let recs = seed.safetyDataSheets;
        if (args.hazardClass) recs = recs.filter((r) => r.hazardClass === args.hazardClass);
        if (args.supplier) recs = recs.filter((r) => r.supplier === args.supplier);
        return recs.length ? ok(recs, { memberName: "safetyDataSheets" }) : empty("no safety data sheets match the filter — a truthful empty set", { memberName: "safetyDataSheets" });
      }
      case "getSafetyDataSheet": {
        const rec = seed.safetyDataSheets.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "safetyDataSheets" }) : empty(`no safety data sheet with id ${args.id}`, { memberName: "safetyDataSheets" });
      }
      case "listSubstances": {
        let recs = seed.substances;
        if (args.hazardClass) recs = recs.filter((r) => r.hazardClass === args.hazardClass);
        if (args.physicalState) recs = recs.filter((r) => r.physicalState === args.physicalState);
        return recs.length ? ok(recs, { memberName: "substances" }) : empty("no substances match the filter — a truthful empty set", { memberName: "substances" });
      }
      case "getSubstance": {
        const rec = seed.substances.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "substances" }) : empty(`no substance with id ${args.id}`, { memberName: "substances" });
      }
      case "listShippingDeclarations": {
        let recs = seed.shippingDeclarations;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        if (args.substance) recs = recs.filter((r) => r.substanceId === args.substance);
        return recs.length ? ok(recs, { memberName: "shippingDeclarations" }) : empty("no shipping declarations match the filter — a truthful empty set", { memberName: "shippingDeclarations" });
      }
      case "listFacilities":
        return ok(seed.facilities, { memberName: "facilities" });
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
          serverInfo: { name: "chemicals-materials", version: "0.1.0" },
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
