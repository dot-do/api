/**
 * worker.mjs — the wave-zero worker for register row `waste-remediation`:
 * vendored axp-faces generator first (quartet + branching collection +
 * offer + home), site doors after it. One substrate definition serves both
 * plies: the data face (record reads) and the headless route/dispatch face
 * (create/complete on the SAME collections, same envelopes, same rate rows).
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
import { FACILITIES_PROVENANCE } from "./facilities.real.mjs";

const axp = createAxpRoutes(manifest);

/* ── seams (emitted, never settled — spec §7.4) ─────────────────────────── */
const TAGS = Object.freeze({
  substrate: "waste-remediation",
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
  "ephemeral anonymous sandbox workspace — isolate-lifetime retention at wave zero; this record is not durable and has no statutory effect";
const manifestWorkspace = new Map(); // id → manifest (per-isolate, disclosed above)
const workOrderWorkspace = new Map(); // id → work order
const scaleTicketWorkspace = new Map(); // id → scale ticket
let anonManifestSeq = 0;
let anonOrderSeq = 0;

/* ── shared data functions (one definition — HTTP and MCP both call these) ─ */
function listManifestsFiltered(params) {
  let out = [...seed.manifests, ...manifestWorkspace.values()];
  for (const key of ["status", "wasteCode"]) {
    const v = params?.get?.(key);
    if (v) out = out.filter((m) => String(m[key]) === v);
  }
  return out;
}
function getManifestById(id) {
  return seed.manifests.find((m) => m.id === id) || manifestWorkspace.get(id);
}
function listFacilitiesFiltered(params) {
  let out = seed.facilities;
  const universe = params?.get?.("universe");
  const state = params?.get?.("state");
  if (universe) out = out.filter((f) => String(f.universe) === universe);
  if (state) out = out.filter((f) => String(f.state) === state);
  return out;
}
function getFacilityByHandlerId(handlerId) {
  return seed.facilities.find((f) => f.handlerId === handlerId);
}
function listWorkOrdersFiltered(params) {
  let out = [...seed.workOrders, ...workOrderWorkspace.values()];
  const status = params?.get?.("status");
  if (status) out = out.filter((w) => String(w.status) === status);
  return out;
}
function listScaleTicketsFiltered(params) {
  let out = [...seed.scaleTickets, ...scaleTicketWorkspace.values()];
  const workOrder = params?.get?.("workOrder");
  if (workOrder) out = out.filter((t) => String(t.workOrder) === workOrder);
  return out;
}
function listWasteProfilesFiltered(params) {
  let out = seed.wasteProfiles;
  const wasteCode = params?.get?.("wasteCode");
  if (wasteCode) out = out.filter((p) => String(p.wasteCode) === wasteCode);
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
const verifyMd = `# Run our tests — waste-remediation (placeholder address)

Every claim on this surface is a probe you can run yourself, keyless. Nothing
below requires an account, a key, or a conversation.

\`\`\`sh
curl -s ${ORIGIN}/manifests | jq .type                        # "OK"    — keyless first value
curl -s "${ORIGIN}/manifests?status=none" | jq .type          # "EMPTY" — a truthful empty set
curl -s "${ORIGIN}/manifests?scope=admin" | jq .type          # "BLOCKED" (403) — a worded boundary
curl -s "${ORIGIN}/manifests?spend=26" | jq .type             # "OFFER" (402) — the ceiling boundary (stub: nothing bills)
curl -s ${ORIGIN}/pricing | jq .model                         # "metered" + the stub statement
curl -s ${ORIGIN}/manifests/MAN-952-0001 | jq .type           # "OK" — one labeled example Manifest
curl -s "${ORIGIN}/facilities?universe=VSQG" | jq .type       # "OK" — REAL EPA ECHO records, provenance on each
curl -s "${ORIGIN}/waste-profiles?wasteCode=D001" | jq .type  # "OK" — the generated profile corpus
curl -s ${ORIGIN}/openapi.json | jq .openapi                  # "3.1.0" — live routes only
\`\`\`

Full conformance: this face builds against the pinned AXP spec
(apis-ax-axp@2.6.0) with a fail-closed local gate (see check.mjs in the
source tree), and its hosted verdict will live at the card's
links.conformance address once this substrate leaves its placeholder origin.

Synthetic sandbox records are labeled example data — simulated, never a real
manifest or company. Facility records are REAL public EPA ECHO data,
ingested with provenance (public domain).
`;
const verifyFaces = {
  md: verifyMd,
  json: {
    $context: "https://schema.org.ai",
    $type: "VerifyPage",
    name: "waste-remediation — runnable public-contract probes",
    probes: [
      { probe: "keyless OK", cmd: `curl -s ${ORIGIN}/manifests`, expect: { type: "OK", status: 200 } },
      { probe: "known empty", cmd: `curl -s "${ORIGIN}/manifests?status=none"`, expect: { type: "EMPTY", status: 200 } },
      { probe: "known forbidden", cmd: `curl -s "${ORIGIN}/manifests?scope=admin"`, expect: { type: "BLOCKED", status: 403 } },
      { probe: "over ceiling", cmd: `curl -s "${ORIGIN}/manifests?spend=26"`, expect: { type: "OFFER", status: 402 } },
      { probe: "pricing declared", cmd: `curl -s ${ORIGIN}/pricing`, expect: { model: "metered" } },
      { probe: "record read", cmd: `curl -s ${ORIGIN}/manifests/MAN-952-0001`, expect: { type: "OK", status: 200 } },
      { probe: "real ingested corpus", cmd: `curl -s "${ORIGIN}/facilities?universe=VSQG"`, expect: { type: "OK", status: 200 } },
      { probe: "generated profile corpus", cmd: `curl -s "${ORIGIN}/waste-profiles?wasteCode=D001"`, expect: { type: "OK", status: 200 } },
    ],
    note: "interfaces.testSuite is intentionally undeclared until a digest-pinned suite document is published (a declared suite that cannot be strictly verified is a false machine-readable claim).",
  },
  html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Run our tests — waste-remediation</title></head><body><pre>${verifyMd.replace(/</g, "&lt;")}</pre></body></html>\n`,
};

/* ── MCP — same nouns/verbs as HTTP, one definition (spec §4.4) ─────────── */
const MCP_TOOLS = [
  {
    name: "listManifests",
    description: "List/filter the hazardous-waste Manifest collection — same records and envelope truth as GET /manifests",
    inputSchema: { type: "object", properties: { status: { type: "string" }, wasteCode: { type: "string" } } },
  },
  {
    name: "getManifest",
    description: "One Manifest record by id (seed ids look like MAN-952-0001)",
    inputSchema: { type: "object", required: ["manifestId"], properties: { manifestId: { type: "string" } } },
  },
  {
    name: "listFacilities",
    description: "List/filter REAL RCRA handler records ingested from EPA ECHO (public domain, provenance on every record)",
    inputSchema: { type: "object", properties: { universe: { type: "string" }, state: { type: "string" } } },
  },
  {
    name: "listWasteProfiles",
    description: "List/filter the generated waste-profile corpus by RCRA waste code",
    inputSchema: { type: "object", properties: { wasteCode: { type: "string" } } },
  },
];
function mcpToolCall(name, args = {}) {
  const p = new URLSearchParams(Object.entries(args).filter(([, v]) => v != null));
  if (name === "listManifests") {
    const results = listManifestsFiltered(p);
    return results.length ? ok(results, { memberName: "manifests" }) : empty("no manifests match — a truthful empty set", { memberName: "manifests" });
  }
  if (name === "getManifest") {
    const m = getManifestById(String(args.manifestId || ""));
    return m ? ok([m], { memberName: "manifests" }) : empty(`no manifest ${args.manifestId} — nothing was deleted; it never existed`, { memberName: "manifests" });
  }
  if (name === "listFacilities") {
    const results = listFacilitiesFiltered(p);
    return results.length
      ? ok(results, { memberName: "facilities", extra: { provenance: FACILITIES_PROVENANCE } })
      : empty("no facilities match in the ingested corpus", { memberName: "facilities" });
  }
  if (name === "listWasteProfiles") {
    const results = listWasteProfilesFiltered(p);
    return results.length ? ok(results, { memberName: "wasteProfiles" }) : empty("no waste profiles match", { memberName: "wasteProfiles" });
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
     * own paths, and createManifest lives at the collection pathname. */
    if (path === "/manifests" && request.method === "POST") {
      let input;
      try {
        input = await request.json();
      } catch {
        input = null;
      }
      if (!input || typeof input.wasteCode !== "string" || typeof input.wasteDescription !== "string") {
        return respond(request, empty("createManifest needs a JSON body with `wasteCode` and `wasteDescription` strings", { memberName: "manifests" }), { status: 400 });
      }
      const id = `MAN-ANON-${++anonManifestSeq}`;
      const now = new Date().toISOString();
      const record = {
        $type: "https://schema.org.ai/HazardousWasteManifest",
        id,
        status: "scheduled",
        wasteCode: String(input.wasteCode).slice(0, 8),
        wasteDescription: String(input.wasteDescription).slice(0, 200),
        quantityTons: typeof input.quantityTons === "number" && input.quantityTons >= 0 ? input.quantityTons : 0,
        workspace: "anon-ephemeral",
        retention: WORKSPACE_RETENTION,
        createdAt: now,
        updatedAt: now,
      };
      manifestWorkspace.set(id, record);
      meter(request, "createManifest");
      return respond(request, ok([record], { memberName: "manifests", extra: { retention: WORKSPACE_RETENTION } }));
    }

    if (path === "/work-orders" && request.method === "POST") {
      let input;
      try {
        input = await request.json();
      } catch {
        input = null;
      }
      if (!input || typeof input.instructions !== "string" || input.instructions.length === 0) {
        return respond(request, empty("createWorkOrder needs a JSON body with an `instructions` string", { memberName: "workOrders" }), { status: 400 });
      }
      const id = `WO-ANON-${++anonOrderSeq}`;
      const now = new Date().toISOString();
      const order = {
        $type: "https://schema.org.ai/WorkOrder",
        id,
        status: "scheduled",
        instructions: String(input.instructions).slice(0, 300),
        manifest: typeof input.manifest === "string" ? input.manifest.slice(0, 40) : null,
        workspace: "anon-ephemeral",
        retention: WORKSPACE_RETENTION,
        createdAt: now,
        updatedAt: now,
      };
      workOrderWorkspace.set(id, order);
      meter(request, "createWorkOrder");
      return respond(request, ok([order], { memberName: "workOrders", extra: { retention: WORKSPACE_RETENTION } }));
    }

    const completeMatch = path.match(/^\/work-orders\/([A-Za-z0-9-]+)\/complete$/);
    if (completeMatch && request.method === "POST") {
      const id = completeMatch[1];
      if (seed.workOrders.some((w) => w.id === id)) {
        return respond(request, blocked("the seed tenant is read-only — labeled example records cannot be completed; create a work order first (POST /work-orders)"));
      }
      const order = workOrderWorkspace.get(id);
      if (!order) {
        return respond(request, empty(`no work order ${id} in your workspace — nothing was deleted; it never existed`, { memberName: "workOrders" }), { status: 404 });
      }
      let input = null;
      try {
        input = await request.json();
      } catch {
        /* body optional */
      }
      const now = new Date().toISOString();
      order.status = "completed";
      order.completedAt = now;
      order.updatedAt = now;
      const netTons = input && typeof input.netTons === "number" && input.netTons >= 0 ? input.netTons : 1.0;
      const ticket = {
        $type: "https://schema.org.ai/ScaleTicket",
        id: `SCL-ANON-${anonOrderSeq}-${id}`,
        workOrder: id,
        manifest: order.manifest,
        grossTons: +(14.2 + netTons).toFixed(1),
        tareTons: 14.2,
        netTons,
        weighedAt: now,
        workspace: "anon-ephemeral",
        retention: WORKSPACE_RETENTION,
      };
      order.scaleTicket = ticket.id;
      scaleTicketWorkspace.set(ticket.id, ticket);
      meter(request, "completeWorkOrder");
      return respond(request, ok([order, ticket], { memberName: "workOrders", extra: { retention: WORKSPACE_RETENTION } }));
    }

    /* the generated machine face (quartet, collection, offer, home) */
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && (request.method === "GET" || request.method === "HEAD")) {
        meter(request, "listManifests");
        if (hit.status === 402) {
          emitMoneyEvent(request, { event: "offer-presented", operation: "listManifests", boundary: "hard-ceiling" });
          emitReceipt(request, { event: "offer-receipt", operation: "listManifests", note: "stub — no charge occurred" });
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

    const manifestMatch = path.match(/^\/manifests\/([A-Za-z0-9-]+)$/);
    if (manifestMatch) {
      const m = getManifestById(manifestMatch[1]);
      meter(request, "getManifest");
      return m
        ? respond(request, ok([m], { memberName: "manifests" }))
        : respond(request, empty(`no manifest ${manifestMatch[1]} — nothing was deleted; it never existed`, { memberName: "manifests" }), { status: 404 });
    }

    if (path === "/facilities") {
      const results = listFacilitiesFiltered(url.searchParams);
      meter(request, "listFacilities");
      return results.length
        ? respond(request, ok(results, { memberName: "facilities", extra: { provenance: FACILITIES_PROVENANCE } }))
        : respond(request, empty("no facilities match in the ingested corpus — a truthful empty set", { memberName: "facilities" }));
    }

    const facilityMatch = path.match(/^\/facilities\/([A-Za-z0-9]+)$/);
    if (facilityMatch) {
      const f = getFacilityByHandlerId(facilityMatch[1]);
      meter(request, "getFacility");
      return f
        ? respond(request, ok([f], { memberName: "facilities" }))
        : respond(request, empty(`no handler ${facilityMatch[1]} in the ingested corpus — the wave-zero ingest is one state, one page (see provenance)`, { memberName: "facilities" }), { status: 404 });
    }

    if (path === "/work-orders") {
      const results = listWorkOrdersFiltered(url.searchParams);
      meter(request, "listWorkOrders");
      return results.length
        ? respond(request, ok(results, { memberName: "workOrders" }))
        : respond(request, empty("no work orders match — a truthful empty set", { memberName: "workOrders" }));
    }

    if (path === "/scale-tickets") {
      const results = listScaleTicketsFiltered(url.searchParams);
      meter(request, "listScaleTickets");
      return results.length
        ? respond(request, ok(results, { memberName: "scaleTickets" }))
        : respond(request, empty("no scale tickets match — a truthful empty set", { memberName: "scaleTickets" }));
    }

    if (path === "/waste-profiles") {
      const results = listWasteProfilesFiltered(url.searchParams);
      meter(request, "listWasteProfiles");
      return results.length
        ? respond(request, ok(results, { memberName: "wasteProfiles" }))
        : respond(request, empty("no waste profiles match — a truthful empty set", { memberName: "wasteProfiles" }));
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
