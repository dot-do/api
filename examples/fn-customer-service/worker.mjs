/**
 * worker.mjs — the wave-zero worker for register row `fn-customer-service`:
 * vendored axp-faces generator first (quartet + branching collection +
 * offer + home), site doors after it. One substrate definition serves both
 * plies: the data face (record reads) and the headless helpdesk face
 * (create/resolve on the SAME collections, same envelopes, same rate rows).
 *
 * Seams (spec §7.4): this worker EMITS metering / money / receipt events as
 * structured logs tagged {substrate, projection, motion, operation, shape,
 * pattern} and identity class + referral source. It contains no account UI,
 * no key management, no invoicing, no payout logic — and no billing: the
 * 402 boundary is a labeled stub (see /pricing statement).
 */
import { createAxpRoutes } from "./axp/routes.js";
import { ok, empty, blocked, envelopeResponse } from "./axp/envelope.js";
import { serveNegotiated } from "./axp/conneg.js";
import { manifest, substrate, seed, ORIGIN, g2 } from "./manifest.mjs";

const axp = createAxpRoutes(manifest);

/* ── seams (emitted, never settled — spec §7.4) ─────────────────────────── */
const TAGS = Object.freeze({
  substrate: "fn-customer-service",
  projection: "placeholder", // GAP row: no G4 brand until a name is acquired (#16)
  motion: "B2A",
  pattern: "402-metered-stub",
});
function identityClass(request) {
  if (request.headers.get("x-id-org-ai")) return "machine (id.org.ai grain)";
  return request.headers.get("sec-fetch-mode") ? "human (browser)" : "machine (unattributed)";
}
function emitSeam(event, request, fields) {
  console.log(
    JSON.stringify({
      seam: event,
      ...TAGS,
      ...fields,
      identityClass: identityClass(request),
      referral: request.headers.get("referer") || request.headers.get("x-agent-session") || null,
      at: new Date().toISOString(),
    }),
  );
}
const meter = (request, operation, shape = "anon-sandbox") => emitSeam("metering", request, { operation, shape });
const emitMoneyEvent = (request, fields) => emitSeam("money", request, fields); // ledger-pattern seam; nothing settles at wave zero
const emitReceipt = (request, fields) => emitSeam("receipt", request, fields); // receipts rail seam (emails.do door absent — presence-when-true)

/* ── the ephemeral anonymous workspace (#17 rung 0) ─────────────────────── */
const WORKSPACE_RETENTION =
  "ephemeral anonymous sandbox workspace — isolate-lifetime retention at wave zero; this record is not durable";
const workspace = new Map(); // id → ticket (per-isolate, disclosed above)
let anonSeq = 0;

/* ── shared data functions (one definition — HTTP and MCP both call these) ─ */
function getTicketById(id) {
  return seed.tickets.find((t) => t.id === id) || workspace.get(id);
}
function filterConversations(ticketId) {
  return ticketId ? seed.conversations.filter((c) => c.ticket === ticketId) : seed.conversations;
}
function filterDeflections(params) {
  let out = seed.deflections;
  const topic = params.get("topic");
  const companyType = params.get("companyType");
  if (topic) out = out.filter((d) => d.topic === topic);
  if (companyType) out = out.filter((d) => d.companyType === companyType);
  return out;
}
function listTicketsFiltered(params) {
  let out = [...seed.tickets, ...workspace.values()];
  for (const key of ["status", "priority"]) {
    const v = params?.get?.(key);
    if (v) out = out.filter((t) => String(t[key]) === v);
  }
  return out;
}

/* ── the G2 coordinates (links.icp target) ──────────────────────────────── */
/* ONE definition: the same G2 projection the card carries top-level (the
   axp-ext-rates-g2 §4 `g2` member, declared in manifest.mjs) is projected
   here as the /icp.json document — links.icp and g2 cannot drift. */
const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  substrate: g2.substrate,
  coordinates: g2.icp,
  personas: g2.personas,
  firstCustomer: g2.firstCustomer,
};

/* ── /verify — claims as runnable probes, three faces ───────────────────── */
const verifyMd = `# Run our tests — fn-customer-service (placeholder address)

Every claim on this surface is a probe you can run yourself, keyless. Nothing
below requires an account, a key, or a conversation.

\`\`\`sh
curl -s ${ORIGIN}/tickets | jq .type                       # "OK"    — keyless first value
curl -s "${ORIGIN}/tickets?status=none" | jq .type         # "EMPTY" — a truthful empty set
curl -s "${ORIGIN}/tickets?scope=admin" | jq .type         # "BLOCKED" (403) — a worded boundary
curl -s "${ORIGIN}/tickets?spend=26" | jq .type            # "OFFER" (402) — the ceiling boundary (stub: nothing bills)
curl -s ${ORIGIN}/pricing | jq .model                      # "metered" + the stub statement
curl -s ${ORIGIN}/tickets/TCK-952-0001 | jq .type          # "OK" — one Ticket record
curl -s "${ORIGIN}/deflections?topic=metering" | jq .type  # "OK" — the deflection corpus
curl -s ${ORIGIN}/openapi.json | jq .openapi               # "3.1.0" — live routes only
\`\`\`

Full conformance: this face builds against the pinned AXP spec
(apis-ax-axp@2.6.0) with a fail-closed local gate (see check.mjs in the
source tree), and its hosted verdict will live at the card's
links.conformance address once this substrate leaves its placeholder origin.

All sandbox records are labeled example data — simulated, never a live customer.
`;
const verifyFaces = {
  md: verifyMd,
  json: {
    $context: "https://schema.org.ai",
    $type: "VerifyPage",
    name: "fn-customer-service — runnable public-contract probes",
    probes: [
      { probe: "keyless OK", cmd: `curl -s ${ORIGIN}/tickets`, expect: { type: "OK", status: 200 } },
      { probe: "known empty", cmd: `curl -s "${ORIGIN}/tickets?status=none"`, expect: { type: "EMPTY", status: 200 } },
      { probe: "known forbidden", cmd: `curl -s "${ORIGIN}/tickets?scope=admin"`, expect: { type: "BLOCKED", status: 403 } },
      { probe: "over ceiling", cmd: `curl -s "${ORIGIN}/tickets?spend=26"`, expect: { type: "OFFER", status: 402 } },
      { probe: "pricing declared", cmd: `curl -s ${ORIGIN}/pricing`, expect: { model: "metered" } },
      { probe: "record read", cmd: `curl -s ${ORIGIN}/tickets/TCK-952-0001`, expect: { type: "OK", status: 200 } },
      { probe: "deflection corpus", cmd: `curl -s "${ORIGIN}/deflections?topic=metering"`, expect: { type: "OK", status: 200 } },
    ],
    note: "interfaces.testSuite is intentionally undeclared until a digest-pinned suite document is published (a declared suite that cannot be strictly verified is a false machine-readable claim).",
  },
  html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Run our tests — fn-customer-service</title></head><body><pre>${verifyMd.replace(/</g, "&lt;")}</pre></body></html>\n`,
};

/* ── MCP — same nouns/verbs as HTTP, one definition (spec §4.4) ─────────── */
const MCP_TOOLS = [
  {
    name: "listTickets",
    description: "List/filter the Ticket collection — same records and envelope truth as GET /tickets",
    inputSchema: { type: "object", properties: { status: { type: "string" }, priority: { type: "string" } } },
  },
  {
    name: "getTicket",
    description: "One Ticket record by id (seed ids look like TCK-952-0001)",
    inputSchema: { type: "object", required: ["ticketId"], properties: { ticketId: { type: "string" } } },
  },
  {
    name: "searchDeflections",
    description: "Search the deflection-article corpus by topic and/or companyType",
    inputSchema: { type: "object", properties: { topic: { type: "string" }, companyType: { type: "string" } } },
  },
];
function mcpToolCall(name, args = {}) {
  if (name === "listTickets") {
    const p = new URLSearchParams(Object.entries(args).filter(([, v]) => v != null));
    const results = listTicketsFiltered(p);
    return results.length ? ok(results, { memberName: "tickets" }) : empty("no tickets match — a truthful empty set", { memberName: "tickets" });
  }
  if (name === "getTicket") {
    const t = getTicketById(String(args.ticketId || ""));
    return t ? ok([t], { memberName: "tickets" }) : empty(`no ticket ${args.ticketId} — nothing was deleted; it never existed`, { memberName: "tickets" });
  }
  if (name === "searchDeflections") {
    const p = new URLSearchParams(Object.entries(args).filter(([, v]) => v != null));
    const results = filterDeflections(p);
    return results.length ? ok(results, { memberName: "articles" }) : empty("no deflection articles match", { memberName: "articles" });
  }
  return null;
}
async function handleMcp(request) {
  if (request.method !== "POST") {
    return envelopeResponse(blocked("the MCP door answers POST (JSON-RPC 2.0, streamable-http) — GET is not served here"), {
      status: 405,
      headers: { allow: "POST" },
    });
  }
  let rpc;
  try {
    rpc = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 });
  }
  const reply = (result) => Response.json({ jsonrpc: "2.0", id: rpc.id ?? null, result });
  switch (rpc.method) {
    case "initialize":
      return reply({
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: manifest.name, version: manifest.version },
      });
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: MCP_TOOLS });
    case "tools/call": {
      const envelope = mcpToolCall(rpc.params?.name, rpc.params?.arguments);
      if (envelope === null) {
        return Response.json({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32602, message: `unknown tool ${rpc.params?.name}` } });
      }
      meter(request, rpc.params.name); // the MCP tool name IS the canonical operationId (axp-ext-rates-g2 §1)
      return reply({ content: [{ type: "text", text: JSON.stringify(envelope) }], isError: false });
    }
    default:
      return Response.json({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32601, message: `method ${rpc.method} not found` } });
  }
}

/* ── HTTP dispatch ──────────────────────────────────────────────────────── */
const respond = (request, body, opts) => {
  const r = envelopeResponse(body, opts);
  return request.method === "HEAD" ? new Response(null, { status: r.status, headers: r.headers }) : r;
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    /* headless doors first — the generator answers 405 for non-GET on its
     * own paths, and createTicket lives at the collection pathname. */
    if (path === "/tickets" && request.method === "POST") {
      let input;
      try {
        input = await request.json();
      } catch {
        input = null;
      }
      if (!input || typeof input.subject !== "string" || input.subject.length === 0) {
        return respond(request, empty("createTicket needs a JSON body with a `subject` string", { memberName: "tickets" }), { status: 400 });
      }
      const id = `TCK-ANON-${++anonSeq}`;
      const now = new Date().toISOString();
      const ticket = {
        $type: "https://schema.org/Ticket",
        id,
        subject: String(input.subject).slice(0, 200),
        status: "open",
        priority: ["low", "normal", "high", "urgent"].includes(input.priority) ? input.priority : "normal",
        category: typeof input.category === "string" ? input.category.slice(0, 60) : "general",
        channel: "api",
        workspace: "anon-ephemeral",
        retention: WORKSPACE_RETENTION,
        createdAt: now,
        updatedAt: now,
      };
      workspace.set(id, ticket);
      meter(request, "createTicket");
      return respond(request, ok([ticket], { memberName: "tickets", extra: { retention: WORKSPACE_RETENTION } }));
    }

    const resolveMatch = path.match(/^\/tickets\/([A-Za-z0-9-]+)\/resolve$/);
    if (resolveMatch && request.method === "POST") {
      const id = resolveMatch[1];
      if (seed.tickets.some((t) => t.id === id)) {
        return respond(request, blocked("the seed tenant is read-only — labeled example records cannot be resolved; create a ticket first (POST /tickets)"));
      }
      const t = workspace.get(id);
      if (!t) return respond(request, empty(`no ticket ${id} in your workspace — nothing was deleted; it never existed`, { memberName: "tickets" }), { status: 404 });
      t.status = "resolved";
      t.updatedAt = new Date().toISOString();
      t.resolution = { code: "fixed", summary: "resolved via resolveTicket on the ephemeral workspace", resolvedAt: t.updatedAt };
      meter(request, "resolveTicket");
      return respond(request, ok([t], { memberName: "tickets" }));
    }

    /* the generated machine face (quartet, collection, offer, home) */
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && (request.method === "GET" || request.method === "HEAD")) {
        meter(request, "listTickets");
        if (hit.status === 402) {
          emitMoneyEvent(request, { event: "offer-presented", operation: "listTickets", boundary: "hard-ceiling" });
          emitReceipt(request, { event: "offer-receipt", operation: "listTickets", note: "stub — no charge occurred" });
        }
      }
      return hit;
    }

    if (path === "/mcp") {
      return handleMcp(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return respond(request, blocked(`method ${request.method} is not served at ${path}`), { status: 405, headers: { allow: "GET, HEAD" } });
    }

    const ticketMatch = path.match(/^\/tickets\/([A-Za-z0-9-]+)$/);
    if (ticketMatch) {
      const t = getTicketById(ticketMatch[1]);
      meter(request, "getTicket");
      return t
        ? respond(request, ok([t], { memberName: "tickets" }))
        : respond(request, empty(`no ticket ${ticketMatch[1]} — nothing was deleted; it never existed`, { memberName: "tickets" }), { status: 404 });
    }

    if (path === "/conversations") {
      const results = filterConversations(url.searchParams.get("ticket"));
      meter(request, "listConversations");
      return results.length
        ? respond(request, ok(results, { memberName: "events" }))
        : respond(request, empty("no conversation events match — a truthful empty set", { memberName: "events" }));
    }

    if (path === "/deflections") {
      const results = filterDeflections(url.searchParams);
      meter(request, "searchDeflections");
      return results.length
        ? respond(request, ok(results, { memberName: "articles" }))
        : respond(request, empty("no deflection articles match — a truthful empty set", { memberName: "articles" }));
    }

    if (path === "/icp.json") {
      return Response.json(icpDoc);
    }

    if (path === "/substrate.json") {
      return Response.json({ $context: "https://schema.org.ai", $type: "APIProduct", ...substrate });
    }

    if (path === "/verify" || path === "/verify.md" || path === "/verify.json" || path === "/verify.html") {
      return serveNegotiated(request, url, verifyFaces, { cleanPath: "/verify" });
    }

    return respond(request, empty("no route at this path — nothing here has been deleted; the route was never written"), { status: 404 });
  },
};
