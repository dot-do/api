/**
 * worker.mjs — the wave-zero worker for register row `lodging` (property
 * api.villas): vendored axp-faces generator first (quartet + branching
 * collection + offer + home), site doors after it. One substrate definition
 * serves both plies: the data face (record reads) and the headless
 * Booking/PMS face (create/cancel bookings + run the night audit on the
 * SAME collections, same envelopes, same rate rows).
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
  substrate: "lodging",
  projection: "api.villas",
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
  "ephemeral anonymous sandbox workspace — isolate-lifetime retention at wave zero; this record is not durable and reserves no real stay";
const bookingWorkspace = new Map(); // id → booking (per-isolate, disclosed above)
const auditWorkspace = new Map(); // id → night-audit report
let anonBookingSeq = 0;
let anonAuditSeq = 0;

/* ── shared data functions (one definition — HTTP and MCP both call these) ─ */
function listBookingsFiltered(params) {
  let out = [...seed.bookings, ...bookingWorkspace.values()];
  for (const key of ["status", "property"]) {
    const v = params?.get?.(key);
    if (v) out = out.filter((b) => String(b[key]) === v);
  }
  return out;
}
function getBookingById(id) {
  return seed.bookings.find((b) => b.id === id) || bookingWorkspace.get(id);
}
function listPropertiesFiltered(params) {
  let out = seed.properties;
  const type = params?.get?.("type");
  if (type) out = out.filter((p) => String(p.type) === type);
  return out;
}
function getPropertyById(id) {
  return seed.properties.find((p) => p.id === id);
}
function listNightAuditReportsFiltered(params) {
  let out = [...seed.nightAuditReports, ...auditWorkspace.values()];
  const businessDate = params?.get?.("businessDate");
  if (businessDate) out = out.filter((r) => String(r.businessDate) === businessDate);
  return out;
}
function getNightAuditReportById(id) {
  return seed.nightAuditReports.find((r) => r.id === id) || auditWorkspace.get(id);
}
function listFoliosFiltered(params) {
  let out = seed.folios;
  const booking = params?.get?.("booking");
  if (booking) out = out.filter((f) => String(f.booking) === booking);
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
const verifyMd = `# Run our tests — api.villas

Every claim on this surface is a probe you can run yourself, keyless. Nothing
below requires an account, a key, or a conversation.

\`\`\`sh
curl -s ${ORIGIN}/bookings | jq .type                          # "OK"    — keyless first value
curl -s "${ORIGIN}/bookings?status=none" | jq .type            # "EMPTY" — a truthful empty set
curl -s "${ORIGIN}/bookings?scope=admin" | jq .type            # "BLOCKED" (403) — a worded boundary
curl -s "${ORIGIN}/bookings?spend=26" | jq .type               # "OFFER" (402) — the ceiling boundary (stub: nothing bills)
curl -s ${ORIGIN}/pricing | jq .model                          # "metered" + the stub statement
curl -s ${ORIGIN}/bookings/BKG-952-0001 | jq .type             # "OK" — one labeled example Booking
curl -s "${ORIGIN}/properties?type=villa" | jq .type           # "OK" — the short-stay inventory grain (labeled demo units)
curl -s "${ORIGIN}/night-audit-reports?businessDate=2026-08-15" | jq .type  # "OK" — the generated wedge artifact
curl -s ${ORIGIN}/openapi.json | jq .openapi                   # "3.1.0" — live routes only
\`\`\`

This face builds against the pinned AXP spec (apis-ax-axp@2.6.0); the
hosted verdict lives at the card's links.conformance address.

EVERY record on this sandbox is labeled example data — simulated, never a
real property, booking, guest, or market rate. The row's route is
first-party capture at the rail (not yet built); no public rate data is
ingested or republished here.
`;
const verifyFaces = {
  md: verifyMd,
  json: {
    $context: "https://schema.org.ai",
    $type: "VerifyPage",
    name: "api.villas — runnable public-contract probes",
    probes: [
      { probe: "keyless OK", cmd: `curl -s ${ORIGIN}/bookings`, expect: { type: "OK", status: 200 } },
      { probe: "known empty", cmd: `curl -s "${ORIGIN}/bookings?status=none"`, expect: { type: "EMPTY", status: 200 } },
      { probe: "known forbidden", cmd: `curl -s "${ORIGIN}/bookings?scope=admin"`, expect: { type: "BLOCKED", status: 403 } },
      { probe: "over ceiling", cmd: `curl -s "${ORIGIN}/bookings?spend=26"`, expect: { type: "OFFER", status: 402 } },
      { probe: "pricing declared", cmd: `curl -s ${ORIGIN}/pricing`, expect: { model: "metered" } },
      { probe: "record read", cmd: `curl -s ${ORIGIN}/bookings/BKG-952-0001`, expect: { type: "OK", status: 200 } },
      { probe: "inventory grain", cmd: `curl -s "${ORIGIN}/properties?type=villa"`, expect: { type: "OK", status: 200 } },
      { probe: "generated wedge artifact", cmd: `curl -s "${ORIGIN}/night-audit-reports?businessDate=2026-08-15"`, expect: { type: "OK", status: 200 } },
    ],
    note: "interfaces.testSuite is intentionally undeclared until a digest-pinned suite document is published (a declared suite that cannot be strictly verified is a false machine-readable claim).",
  },
  html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Run our tests — api.villas</title></head><body><pre>${verifyMd.replace(/</g, "&lt;")}</pre></body></html>\n`,
};

/* ── MCP — same nouns/verbs as HTTP, one definition (spec §4.4) ─────────── */
/* The MCP door is AUTHLESS — it serves the anon-sandbox rung only. Keyed
   access sits above this rung and is not mounted at wave zero, so no keyed
   tool is declared (presence-when-true). */
const MCP_TOOLS = [
  {
    name: "listBookings",
    description: "List/filter the Booking collection — same records and envelope truth as GET /bookings",
    inputSchema: { type: "object", properties: { status: { type: "string" }, property: { type: "string" } } },
  },
  {
    name: "getBooking",
    description: "One Booking record by id (seed ids look like BKG-952-0001)",
    inputSchema: { type: "object", required: ["bookingId"], properties: { bookingId: { type: "string" } } },
  },
  {
    name: "listProperties",
    description: "List/filter the villa/short-stay Property inventory (labeled demo units)",
    inputSchema: { type: "object", properties: { type: { type: "string" } } },
  },
  {
    name: "listNightAuditReports",
    description: "List/filter night-audit reports (the generated wedge artifact) by business date",
    inputSchema: { type: "object", properties: { businessDate: { type: "string" } } },
  },
];
function mcpToolCall(name, args = {}) {
  const p = new URLSearchParams(Object.entries(args).filter(([, v]) => v != null));
  if (name === "listBookings") {
    const results = listBookingsFiltered(p);
    return results.length ? ok(results, { memberName: "bookings" }) : empty("no bookings match — a truthful empty set", { memberName: "bookings" });
  }
  if (name === "getBooking") {
    const b = getBookingById(String(args.bookingId || ""));
    return b ? ok([b], { memberName: "bookings" }) : empty(`no booking ${args.bookingId} — nothing was deleted; it never existed`, { memberName: "bookings" });
  }
  if (name === "listProperties") {
    const results = listPropertiesFiltered(p);
    return results.length ? ok(results, { memberName: "properties" }) : empty("no properties match", { memberName: "properties" });
  }
  if (name === "listNightAuditReports") {
    const results = listNightAuditReportsFiltered(p);
    return results.length ? ok(results, { memberName: "nightAuditReports" }) : empty("no night-audit reports match", { memberName: "nightAuditReports" });
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
     * own paths, and createBooking lives at the collection pathname. */
    if (path === "/bookings" && request.method === "POST") {
      let input;
      try {
        input = await request.json();
      } catch {
        input = null;
      }
      const nights = input?.nights;
      if (
        !input ||
        typeof input.property !== "string" ||
        typeof input.guestName !== "string" ||
        typeof input.checkIn !== "string" ||
        !Number.isInteger(nights) ||
        nights < 1
      ) {
        return respond(
          request,
          empty("createBooking needs a JSON body with `property`, `guestName`, `checkIn` strings and an integer `nights` >= 1", { memberName: "bookings" }),
          { status: 400 },
        );
      }
      const property = getPropertyById(String(input.property));
      if (!property) {
        return respond(request, empty(`no property ${input.property} — list /properties for the labeled demo units`, { memberName: "bookings" }), { status: 400 });
      }
      const id = `BKG-ANON-${++anonBookingSeq}`;
      const now = new Date().toISOString();
      const checkIn = String(input.checkIn).slice(0, 24);
      const record = {
        $type: "https://schema.org/LodgingReservation",
        id,
        status: "confirmed",
        property: property.id,
        propertyName: property.name,
        guest: { name: String(input.guestName).slice(0, 80) },
        checkIn,
        nights,
        nightlyRate: property.nightlyRate,
        roomTotal: property.nightlyRate * nights,
        currency: "USD",
        workspace: "anon-ephemeral",
        retention: WORKSPACE_RETENTION,
        createdAt: now,
        updatedAt: now,
      };
      bookingWorkspace.set(id, record);
      meter(request, "createBooking");
      return respond(request, ok([record], { memberName: "bookings", extra: { retention: WORKSPACE_RETENTION } }));
    }

    const cancelMatch = path.match(/^\/bookings\/([A-Za-z0-9-]+)\/cancel$/);
    if (cancelMatch && request.method === "POST") {
      const id = cancelMatch[1];
      if (seed.bookings.some((b) => b.id === id)) {
        return respond(request, blocked("the seed tenant is read-only — labeled example records cannot be cancelled; create a booking first (POST /bookings)"));
      }
      const booking = bookingWorkspace.get(id);
      if (!booking) {
        return respond(request, empty(`no booking ${id} in your workspace — nothing was deleted; it never existed`, { memberName: "bookings" }), { status: 404 });
      }
      const now = new Date().toISOString();
      booking.status = "cancelled";
      booking.cancelledAt = now;
      booking.updatedAt = now;
      meter(request, "cancelBooking");
      return respond(request, ok([booking], { memberName: "bookings", extra: { retention: WORKSPACE_RETENTION } }));
    }

    if (path === "/night-audit-reports" && request.method === "POST") {
      let input;
      try {
        input = await request.json();
      } catch {
        input = null;
      }
      if (!input || typeof input.businessDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.businessDate)) {
        return respond(
          request,
          empty("runNightAudit needs a JSON body with a `businessDate` string (YYYY-MM-DD)", { memberName: "nightAuditReports" }),
          { status: 400 },
        );
      }
      const businessDate = input.businessDate;
      const night = new Date(`${businessDate}T23:59:00Z`).getTime();
      const workspaceBookings = [...bookingWorkspace.values()];
      const inHouse = workspaceBookings.filter((b) => {
        if (b.status === "cancelled") return false;
        const inMs = new Date(b.checkIn).getTime();
        if (Number.isNaN(inMs)) return false;
        const outMs = inMs + b.nights * 86400000;
        return inMs <= night && outMs > night;
      });
      const roomRevenue = +inHouse.reduce((t, b) => t + b.nightlyRate, 0).toFixed(2);
      const now = new Date().toISOString();
      const report = {
        $type: "https://schema.org.ai/NightAuditReport",
        id: `NAR-ANON-${++anonAuditSeq}`,
        businessDate,
        scope: "your ephemeral workspace bookings only (the seed tenant's reports are read-only records — list GET /night-audit-reports)",
        occupiedUnits: inHouse.length,
        bookingsAudited: workspaceBookings.length,
        roomRevenue,
        adr: inHouse.length ? +(roomRevenue / inHouse.length).toFixed(2) : 0,
        outOfBalance: 0,
        workspace: "anon-ephemeral",
        retention: WORKSPACE_RETENTION,
        generatedAt: now,
      };
      auditWorkspace.set(report.id, report);
      meter(request, "runNightAudit");
      return respond(request, ok([report], { memberName: "nightAuditReports", extra: { retention: WORKSPACE_RETENTION } }));
    }

    /* the generated machine face (quartet, collection, offer, home) */
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && (request.method === "GET" || request.method === "HEAD")) {
        meter(request, "listBookings");
        if (hit.status === 402) {
          emitMoneyEvent(request, { event: "offer-presented", operation: "listBookings", boundary: "hard-ceiling" });
          emitReceipt(request, { event: "offer-receipt", operation: "listBookings", note: "stub — no charge occurred" });
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

    const bookingMatch = path.match(/^\/bookings\/([A-Za-z0-9-]+)$/);
    if (bookingMatch) {
      const b = getBookingById(bookingMatch[1]);
      meter(request, "getBooking");
      return b
        ? respond(request, ok([b], { memberName: "bookings" }))
        : respond(request, empty(`no booking ${bookingMatch[1]} — nothing was deleted; it never existed`, { memberName: "bookings" }), { status: 404 });
    }

    if (path === "/properties") {
      const results = listPropertiesFiltered(url.searchParams);
      meter(request, "listProperties");
      return results.length
        ? respond(request, ok(results, { memberName: "properties" }))
        : respond(request, empty("no properties match — a truthful empty set", { memberName: "properties" }));
    }

    const propertyMatch = path.match(/^\/properties\/([A-Za-z0-9-]+)$/);
    if (propertyMatch) {
      const p = getPropertyById(propertyMatch[1]);
      meter(request, "getProperty");
      return p
        ? respond(request, ok([p], { memberName: "properties" }))
        : respond(request, empty(`no property ${propertyMatch[1]} — the wave-zero inventory is the three labeled demo units`, { memberName: "properties" }), { status: 404 });
    }

    if (path === "/night-audit-reports") {
      const results = listNightAuditReportsFiltered(url.searchParams);
      meter(request, "listNightAuditReports");
      return results.length
        ? respond(request, ok(results, { memberName: "nightAuditReports" }))
        : respond(request, empty("no night-audit reports match — a truthful empty set", { memberName: "nightAuditReports" }));
    }

    const reportMatch = path.match(/^\/night-audit-reports\/([A-Za-z0-9-]+)$/);
    if (reportMatch) {
      const r = getNightAuditReportById(reportMatch[1]);
      meter(request, "getNightAuditReport");
      return r
        ? respond(request, ok([r], { memberName: "nightAuditReports" }))
        : respond(request, empty(`no night-audit report ${reportMatch[1]} — nothing was deleted; it never existed`, { memberName: "nightAuditReports" }), { status: 404 });
    }

    if (path === "/folios") {
      const results = listFoliosFiltered(url.searchParams);
      meter(request, "listFolios");
      return results.length
        ? respond(request, ok(results, { memberName: "folios" }))
        : respond(request, empty("no folios match — a truthful empty set", { memberName: "folios" }));
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
