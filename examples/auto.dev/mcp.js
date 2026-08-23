/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true). Tool names ARE the canonical
 * operationIds (axp-ext/rates-g2 §1) — declared as STRINGS on the card.
 *
 * AUTH: this door is AUTHLESS — it serves the anon-sandbox rung (the
 * universal floor) only. The B2D shapes above the floor take keys; none is
 * mounted on THIS face at wave zero, so no key surface is advertised and no
 * Authorization header is required or read (presence-when-true). The
 * production rail's separate keyed MCP server lives at the Drivly stack.
 */
import { ok, empty } from "./axp/index.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

export function createMcpHandler(seed, { onCall } = {}) {
  const tools = [
    { name: "listVehicles", description: "List VIN-keyed vehicle records (labeled example data; EXAMPLE-prefixed VIN-shaped synthetic ids); optional filters make, year.", inputSchema: { type: "object", properties: { make: { type: "string" }, year: { type: "string" } } } },
    { name: "getVehicle", description: "One vehicle by VIN (sandbox corpus).", inputSchema: { type: "object", required: ["vin"], properties: { vin: { type: "string" } } } },
    { name: "decodeVin", description: "Decode a VIN against this sandbox's labeled corpus (the production decoder at api.auto.dev is key-gated).", inputSchema: { type: "object", required: ["vin"], properties: { vin: { type: "string" } } } },
    { name: "listListings", description: "List retail listings (synthetic labeled); optional filters dealer, status.", inputSchema: { type: "object", properties: { dealer: { type: "string" }, status: { type: "string" } } } },
    { name: "listParts", description: "List parts/tires on the GTIN spine (GS1 952 demo GTINs, labeled); optional filters category, gtin.", inputSchema: { type: "object", properties: { category: { type: "string" }, gtin: { type: "string" } } } },
    { name: "listWorkOrders", description: "List 8111 work orders (recon/inspection/maintenance, synthetic labeled); optional filter status.", inputSchema: { type: "object", properties: { status: { type: "string" } } } },
  ];

  function call(name, args = {}) {
    switch (name) {
      case "listVehicles": {
        let recs = seed.vehicles;
        if (args.make) recs = recs.filter((r) => r.make.toLowerCase().includes(String(args.make).toLowerCase()));
        if (args.year) recs = recs.filter((r) => String(r.year) === String(args.year));
        return recs.length ? ok(recs, { memberName: "vehicles" }) : empty("no vehicles match the filter — a truthful empty set", { memberName: "vehicles" });
      }
      case "getVehicle": {
        const rec = seed.vehicles.find((r) => r.vin === args.vin);
        return rec ? ok([rec], { memberName: "vehicles" }) : empty(`no vehicle with VIN ${args.vin} in the sandbox corpus`, { memberName: "vehicles" });
      }
      case "decodeVin": {
        const rec = seed.vehicles.find((r) => r.vin === args.vin);
        return rec
          ? ok([{ vin: rec.vin, make: rec.make, model: rec.model, year: rec.year, bodyStyle: rec.bodyStyle, example: true, demo_notice: rec.demo_notice }], { memberName: "decodes" })
          : empty(`VIN ${args.vin} is not in this sandbox corpus — sandbox decode answers only the labeled synthetic VINs (the production decoder is key-gated)`, { memberName: "decodes" });
      }
      case "listListings": {
        let recs = seed.listings;
        if (args.dealer) recs = recs.filter((r) => r.dealerId === args.dealer);
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        return recs.length ? ok(recs, { memberName: "listings" }) : empty("no listings match the filter — a truthful empty set", { memberName: "listings" });
      }
      case "listParts": {
        let recs = seed.parts;
        if (args.category) recs = recs.filter((r) => r.category === args.category);
        if (args.gtin) recs = recs.filter((r) => r.gtin === args.gtin);
        return recs.length ? ok(recs, { memberName: "parts" }) : empty("no parts match the filter — a truthful empty set", { memberName: "parts" });
      }
      case "listWorkOrders": {
        let recs = seed.workOrders;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        return recs.length ? ok(recs, { memberName: "workOrders" }) : empty("no work orders match the filter — a truthful empty set", { memberName: "workOrders" });
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
          serverInfo: { name: "auto.dev", version: "0.1.0" },
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
