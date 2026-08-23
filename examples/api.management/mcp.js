/**
 * mcp.js — the mounted MCP door (streamable HTTP JSON-RPC, POST /mcp).
 * Same Nouns, same verbs, same seed as HTTP — ONE definition (spec §3.3):
 * every tool resolves through the same collections the REST routes serve,
 * and every call emits the same meter seam.
 */
import { ok, empty } from "./vendor/axp-faces/index.js";
import { meterEvent } from "./seams.js";

const PROTOCOL_VERSION = "2025-06-18";

/** tools/list — mirrors manifest.mcp.tools (asserted equal in the test suite). */
export function toolDefs(seed) {
  return [
    { name: "listProcesses", description: "list the typed process spine (filters: apqc, kind)", run: (a) => filterList(seed.processes, a, ["apqc", "kind"], "processes") },
    { name: "getProcess", description: "get one process record by id", run: (a) => getById(seed.processes, a, "process") },
    { name: "listKPIs", description: "list KPI records (filters: kind, property)", run: (a) => filterList(seed.kpis, a, ["kind", "property"], "kpis") },
    { name: "listObjectives", description: "list OKR records (filters: quarter, status)", run: (a) => filterList(seed.objectives, a, ["quarter", "status"], "objectives") },
    { name: "listProperties", description: "list managed properties (filter: lifecycle)", run: (a) => filterList(seed.properties, a, ["lifecycle"], "properties") },
    { name: "getProperty", description: "get one managed property by id", run: (a) => getById(seed.properties, a, "property") },
  ];
}

function filterList(records, args = {}, filters, memberName) {
  let recs = [...records];
  let applied = null;
  for (const f of filters) {
    if (args[f] !== undefined) {
      recs = recs.filter((r) => String(r[f]) === String(args[f]));
      applied = [f, args[f]];
    }
  }
  if (recs.length === 0) {
    const [param, value] = applied || [filters[0], ""];
    return empty(`no records match ${param}=${value} — a truthful empty set, not an error`, { memberName });
  }
  return ok(recs, { memberName });
}

function getById(records, args = {}, memberName) {
  const rec = records.find((r) => r.id === args.id);
  if (!rec) return empty(`no record with id=${args.id ?? "(missing)"} — a truthful empty result, not an error`, { memberName });
  return ok([rec], { memberName });
}

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Handle one POST /mcp request. Returns a Response. */
export async function handleMcp(request, manifest, seed) {
  let msg;
  try {
    msg = await request.json();
  } catch {
    return json(rpcError(null, -32700, "parse error: body is not JSON"), 400);
  }
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return json(rpcError(msg && msg.id, -32600, "invalid request: expected a JSON-RPC 2.0 message"), 400);
  }

  const tools = toolDefs(seed);

  switch (msg.method) {
    case "initialize":
      return json(
        rpcResult(msg.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: manifest.name, version: manifest.version },
          instructions: `${manifest.name} MCP door — the same Nouns and verbs as the HTTP faces; sandbox data is simulated and labeled ("example": true).`,
        }),
      );
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    case "tools/list":
      return json(
        rpcResult(msg.id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: { type: "object", properties: {}, additionalProperties: true },
          })),
        }),
      );
    case "tools/call": {
      const name = msg.params && msg.params.name;
      const tool = tools.find((t) => t.name === name);
      if (!tool) return json(rpcError(msg.id, -32602, `unknown tool: ${String(name)}`));
      meterEvent(name, { shape: "anon-sandbox" });
      const envelope = tool.run((msg.params && msg.params.arguments) || {});
      return json(
        rpcResult(msg.id, {
          content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
          isError: false,
        }),
      );
    }
    default:
      return json(rpcError(msg.id, -32601, `method not found: ${msg.method}`));
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
