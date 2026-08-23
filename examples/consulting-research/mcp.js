/**
 * mcp.js — the mounted MCP door (/mcp, streamable-http JSON-RPC 2.0):
 * the SAME Nouns and verbs as the HTTP face, from the same seed/definition —
 * one definition, two transports (template spec §3.3). Declared on the card
 * because it is mounted (presence-when-true).
 */
import { ok, empty } from "./axp/index.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

export function createMcpHandler(seed, { onCall } = {}) {
  const tools = [
    { name: "listEngagements", description: "List engagement records (labeled example data); optional filters status, sector.", inputSchema: { type: "object", properties: { status: { type: "string" }, sector: { type: "string" } } } },
    { name: "getEngagement", description: "One engagement by id.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listDeliverables", description: "List deliverables (outcome grain); optional filters status, engagement.", inputSchema: { type: "object", properties: { status: { type: "string" }, engagement: { type: "string" } } } },
    { name: "getDeliverable", description: "One deliverable by id.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "listTasks", description: "Task-decomposition grain (synthetic statements, O*NET typing anchor); optional filter engagement.", inputSchema: { type: "object", properties: { engagement: { type: "string" } } } },
    { name: "listProcesses", description: "Process grain (APQC-shaped synthetic ids, labeled).", inputSchema: { type: "object", properties: {} } },
  ];

  function call(name, args = {}) {
    switch (name) {
      case "listEngagements": {
        let recs = seed.engagements;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        if (args.sector) recs = recs.filter((r) => r.sector === args.sector);
        return recs.length ? ok(recs, { memberName: "engagements" }) : empty(`no engagements match the filter — a truthful empty set`, { memberName: "engagements" });
      }
      case "getEngagement": {
        const rec = seed.engagements.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "engagements" }) : empty(`no engagement with id ${args.id}`, { memberName: "engagements" });
      }
      case "listDeliverables": {
        let recs = seed.deliverables;
        if (args.status) recs = recs.filter((r) => r.status === args.status);
        if (args.engagement) recs = recs.filter((r) => r.engagementId === args.engagement);
        return recs.length ? ok(recs, { memberName: "deliverables" }) : empty("no deliverables match the filter — a truthful empty set", { memberName: "deliverables" });
      }
      case "getDeliverable": {
        const rec = seed.deliverables.find((r) => r.id === args.id);
        return rec ? ok([rec], { memberName: "deliverables" }) : empty(`no deliverable with id ${args.id}`, { memberName: "deliverables" });
      }
      case "listTasks": {
        let recs = seed.tasks;
        if (args.engagement) recs = recs.filter((r) => r.engagementId === args.engagement);
        return recs.length ? ok(recs, { memberName: "tasks" }) : empty("no tasks match the filter — a truthful empty set", { memberName: "tasks" });
      }
      case "listProcesses":
        return ok(seed.processes, { memberName: "processes" });
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
          serverInfo: { name: "consulting-research", version: "0.1.0" },
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
