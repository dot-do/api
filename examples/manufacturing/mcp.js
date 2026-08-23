/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true). Tool names ARE the canonical
 * operationIds (axp-ext/rates-g2 §1).
 *
 * AUTH: this door is AUTHLESS — it serves the anon-sandbox rung (the
 * universal floor) only. The ladder rungs above the floor take a bearer key;
 * none of them is mounted at wave zero, so no key surface is advertised and
 * no Authorization header is required or read (presence-when-true).
 */
import { ok, empty } from "./axp/index.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

export function createMcpHandler(seed, { onCall } = {}) {
  const tools = [
    { name: "listItems", description: "List product master records (labeled example data; GS1 demo-prefix 952 GTINs); optional filters status, gpcSegment.", inputSchema: { type: "object", properties: { status: { type: "string" }, gpcSegment: { type: "string" } } } },
    { name: "getItem", description: "One item by id.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listBoms", description: "List bills of materials; optional filter item (parent item id).", inputSchema: { type: "object", properties: { item: { type: "string" } } } },
    { name: "listPassports", description: "List Digital Product Passports (EU battery-DPP grain, statutory 2027-02-18; synthetic labeled records); optional filter item.", inputSchema: { type: "object", properties: { item: { type: "string" } } } },
    { name: "listTradingDocuments", description: "List X12 trading-edge documents (850/856/810 typing anchors; synthetic content); optional filters kind, item.", inputSchema: { type: "object", properties: { kind: { type: "string" }, item: { type: "string" } } } },
    { name: "listCrosswalkEntries", description: "List UNSPSC↔GPC↔HTS crosswalk rows (schema-shaped synthetic codes, labeled); optional filters unspsc, gpc.", inputSchema: { type: "object", properties: { unspsc: { type: "string" }, gpc: { type: "string" } } } },
  ];

  function call(name, args = {}) {
    switch (name) {
      case "listItems": {
        let recs = seed.items;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        if (args.gpcSegment) recs = recs.filter((r) => r.gpcSegment === args.gpcSegment);
        return recs.length ? ok(recs, { memberName: "items" }) : empty("no items match the filter — a truthful empty set", { memberName: "items" });
      }
      case "getItem": {
        const rec = seed.items.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "items" }) : empty(`no item with id ${args.id}`, { memberName: "items" });
      }
      case "listBoms": {
        let recs = seed.boms;
        if (args.item) recs = recs.filter((r) => r.itemId === args.item);
        return recs.length ? ok(recs, { memberName: "boms" }) : empty("no BOMs match the filter — a truthful empty set", { memberName: "boms" });
      }
      case "listPassports": {
        let recs = seed.passports;
        if (args.item) recs = recs.filter((r) => r.itemId === args.item);
        return recs.length ? ok(recs, { memberName: "passports" }) : empty("no passports match the filter — a truthful empty set", { memberName: "passports" });
      }
      case "listTradingDocuments": {
        let recs = seed.tradingDocuments;
        if (args.kind) recs = recs.filter((r) => r.kind === args.kind);
        if (args.item) recs = recs.filter((r) => r.itemIds.includes(args.item));
        return recs.length ? ok(recs, { memberName: "tradingDocuments" }) : empty("no trading documents match the filter — a truthful empty set", { memberName: "tradingDocuments" });
      }
      case "listCrosswalkEntries": {
        let recs = seed.crosswalk;
        if (args.unspsc) recs = recs.filter((r) => r.unspsc === args.unspsc);
        if (args.gpc) recs = recs.filter((r) => r.gpc === args.gpc);
        return recs.length ? ok(recs, { memberName: "crosswalk" }) : empty("no crosswalk rows match the filter — a truthful empty set", { memberName: "crosswalk" });
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
          serverInfo: { name: "manufacturing", version: "0.1.0" },
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
