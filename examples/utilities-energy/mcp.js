/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true). Tool names ARE the canonical
 * operationIds (axp-ext/rates-g2 §1) — declared as STRINGS on the card.
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
    { name: "listIntervalReads", description: "List meter/interval reads (labeled example data; ESPI typing anchor only); optional filters meter, period.", inputSchema: { type: "object", properties: { meter: { type: "string" }, period: { type: "string" } } } },
    { name: "listMeters", description: "List meters (EIA-class/ESPI-shaped records, synthetic labeled); optional filters utility, serviceKind.", inputSchema: { type: "object", properties: { utility: { type: "string" }, serviceKind: { type: "string" } } } },
    { name: "getMeter", description: "One meter by id.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listQueueEntries", description: "List public interconnection-queue entries (synthetic ISO-EX-* queues, labeled); optional filters queue, status.", inputSchema: { type: "object", properties: { queue: { type: "string" }, status: { type: "string" } } } },
    { name: "listInterconnectionRequests", description: "List applicant-side interconnection filings (the interconnection.click grain; synthetic labeled); optional filter status.", inputSchema: { type: "object", properties: { status: { type: "string" } } } },
    { name: "listTariffs", description: "List utility tariff filings (synthetic labeled); optional filters utility, status.", inputSchema: { type: "object", properties: { utility: { type: "string" }, status: { type: "string" } } } },
  ];

  function call(name, args = {}) {
    switch (name) {
      case "listIntervalReads": {
        let recs = seed.intervalReads;
        if (args.meter) recs = recs.filter((r) => r.meter === args.meter);
        if (args.period) recs = recs.filter((r) => r.period === args.period);
        return recs.length ? ok(recs, { memberName: "intervalReads" }) : empty("no interval reads match the filter — a truthful empty set", { memberName: "intervalReads" });
      }
      case "listMeters": {
        let recs = seed.meters;
        if (args.utility) recs = recs.filter((r) => r.utilityId === args.utility);
        if (args.serviceKind) recs = recs.filter((r) => r.serviceKind === args.serviceKind);
        return recs.length ? ok(recs, { memberName: "meters" }) : empty("no meters match the filter — a truthful empty set", { memberName: "meters" });
      }
      case "getMeter": {
        const rec = seed.meters.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "meters" }) : empty(`no meter with id ${args.id}`, { memberName: "meters" });
      }
      case "listQueueEntries": {
        let recs = seed.queueEntries;
        if (args.queue) recs = recs.filter((r) => r.queue === args.queue);
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        return recs.length ? ok(recs, { memberName: "queueEntries" }) : empty("no queue entries match the filter — a truthful empty set", { memberName: "queueEntries" });
      }
      case "listInterconnectionRequests": {
        let recs = seed.interconnectionRequests;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        return recs.length ? ok(recs, { memberName: "interconnectionRequests" }) : empty("no interconnection requests match the filter — a truthful empty set", { memberName: "interconnectionRequests" });
      }
      case "listTariffs": {
        let recs = seed.tariffs;
        if (args.utility) recs = recs.filter((r) => r.utilityId === args.utility);
        if (args.status) recs = recs.filter((r) => r.filingStatus === args.status);
        return recs.length ? ok(recs, { memberName: "tariffs" }) : empty("no tariffs match the filter — a truthful empty set", { memberName: "tariffs" });
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
          serverInfo: { name: "utilities-energy", version: "0.1.0" },
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
