/**
 * worker.js — the ONE substrate serving BOTH plies of `mining-oil-gas`
 * (template spec §3): the data face (well/operator/violation/disclosure/JIB
 * record collections) and the headless face (the production-accounting/JIB
 * system-of-record door — POST on the SAME /jib-statements collection, same
 * envelopes, same rate card). Plus the full §4 machine face, generated from
 * ONE manifest by the vendored axp-faces at the PINS.json digest — never
 * hand-rolled.
 *
 * GAP row: served under the placeholder org.ai address; no G4 brand
 * (projection.js records the gap). Standard Workers fetch export; also runs
 * in-memory under vitest (test/conformance.test.js) exactly as the hosted
 * verifier would probe it.
 */
import {
  createAxpRoutes,
  ok,
  empty,
  blocked,
  envelopeResponse,
  serveFace,
  negotiate,
} from "./axp/index.js";
import { buildManifest, ORIGIN } from "./manifest.js";
import { apiProduct } from "./apiproduct.js";
import { projection } from "./projection.js";
import { wells, operators, violations, disclosures, jibStatements, RETENTION_NOTICE } from "./seed.js";
import { meter, moneyEvent, traffic } from "./seams.js";

const manifest = buildManifest();
const axp = createAxpRoutes(manifest);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

/* ── the anon-sandbox ephemeral workspace (§5.1 rung 0) ─────────────────────
   Auto-minted, in-memory, disclosed retention (RETENTION_NOTICE). Seed
   records are tenant #1; writes land here and are labeled mechanically —
   nothing a caller stores in the sandbox can masquerade as real data. */
const workspace = { jibStatements: [] };

function demoLabel(text) {
  const t = String(text || "untitled");
  return t.startsWith("[demo]") ? t : `[demo] ${t}`;
}

/* rates[] rides the generated Pricing Document natively (axp-ext-rates-g2,
   vendored axp-faces@0.3.0) — no site-side bridge anywhere in this build. */

/* ── /verify — the published "run this" page (three faces) ──────────────── */
const verifyMd = `# Verify this surface yourself

"Trust us" is not the contract — "run this" is. This surface is built to
apis-ax-axp@2.6.0 (digest a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d).

## Hosted verdict

    https://api.qa/${new URL(ORIGIN).hostname}

(The card's links.conformance points there. The verdict is independent —
this property counts on the verdict, never on its own deploy.)

## Run the same gate locally

    npx autonomous-qa ${ORIGIN}

Or in-repo: \`pnpm test\` in this example runs the fail-closed, digest-pinned
conformance gate (test/conformance.test.js) against the worker in memory.

## What is probed

Keyless collection (200 OK, labeled seed) · 2× knownEmpty · 2× knownForbidden ·
/pricing · over-ceiling → 402 OFFER · the quartet · typed envelopes.

All sandbox data is SYNTHETIC EXAMPLE DATA (\`example: true\`, "[demo]"
prefixes, synthetic 00-prefix well API numbers; regulatory classification
codes omitted, never fabricated). ${RETENTION_NOTICE}
`;
const verifyFaces = {
  json: {
    $context: "https://schema.org.ai",
    $type: "VerificationInstructions",
    $id: `${ORIGIN}/verify`,
    spec: "apis-ax-axp@2.6.0",
    digest: "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d",
    hosted: `https://api.qa/${new URL(ORIGIN).hostname}`,
    local: `npx autonomous-qa ${ORIGIN}`,
  },
  md: verifyMd,
  html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Verify — ${manifest.name}</title></head>\n<body><h1>Verify this surface yourself</h1><pre>${verifyMd.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></body></html>\n`,
};

/* ── /icp.json — the G2 coordinates + agent self-classification ─────────── */
const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  $id: `${ORIGIN}/icp.json`,
  substrate: apiProduct.substrate,
  icp: projection.icp,
  personas: projection.personas,
  motion: projection.motion,
  systems: apiProduct.systems,
  /** Classes the surface actually distinguishes today — nothing aspirational. */
  agent_classes: [
    {
      id: "reader-agent",
      description: "keyless reads: the quartet, /wells and its sibling collections, /icp.json, /verify — no key, no account",
    },
    {
      id: "sandbox-writer",
      description: "exercises the headless production-accounting door (POST /jib-statements) against the ephemeral demo workspace — synthetic labeled state, disclosed retention",
    },
  ],
  ladder: manifest.attestationLadder,
};

/* ── list endpoints: seed + workspace, filterable, truthfully EMPTY ──────── */
function listEnvelope(records, searchParams, filters, memberName) {
  let recs = [...records];
  let filtered = null;
  for (const param of filters) {
    const value = searchParams.get(param);
    if (value !== null) {
      recs = recs.filter((r) => String(r[param]) === value);
      filtered = [param, value];
    }
  }
  if (recs.length === 0) {
    const [param, value] = filtered || [filters[0], ""];
    return empty(`no records match ${param}=${value} — a truthful empty set, not an error`, { memberName });
  }
  return ok(recs, { memberName });
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const allJIBStatements = () => [...jibStatements, ...workspace.jibStatements];

/* ── the MCP door (mounted — declared on the card because it answers) ─────
   Minimal streamable-http JSON-RPC server, AUTHLESS at the anon-sandbox rung
   (the only rung this deployment honors; bearer-key doors arrive with the
   higher rungs). The tools are the SAME Nouns and verbs as HTTP — one
   definition, not a second API. */
const MCP_TOOLS = [
  { name: "listWells", description: "List Well records (branching: status, operatorId). Synthetic labeled demo data.", inputSchema: { type: "object", properties: { status: { type: "string" }, operatorId: { type: "string" } } } },
  { name: "getWell", description: "Get one Well record by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "listOperators", description: "List Operator / working-interest-holder records (filter: kind).", inputSchema: { type: "object", properties: { kind: { type: "string" } } } },
  { name: "listViolations", description: "List MSHA-class Violation records (filters: mineId, severity). Standard cites omitted, never fabricated.", inputSchema: { type: "object", properties: { mineId: { type: "string" }, severity: { type: "string" } } } },
  { name: "listDisclosures", description: "List FracFocus-class Disclosure records (filter: wellId). CAS numbers omitted, never fabricated.", inputSchema: { type: "object", properties: { wellId: { type: "string" } } } },
  { name: "listJIBStatements", description: "List JIBStatement records (filters: wellId, partnerId). Share arithmetic internally consistent.", inputSchema: { type: "object", properties: { wellId: { type: "string" }, partnerId: { type: "string" } } } },
];

function mcpToolResult(name, args) {
  const params = new URLSearchParams(Object.entries(args || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
  switch (name) {
    case "listWells":
      return listEnvelope(wells, params, ["status", "operatorId"], "wells");
    case "getWell": {
      const rec = wells.find((w) => w.id === args?.id);
      return rec ? ok([rec], { memberName: "wells" }) : empty(`no well with id ${args?.id}`, { memberName: "wells" });
    }
    case "listOperators":
      return listEnvelope(operators, params, ["kind"], "operators");
    case "listViolations":
      return listEnvelope(violations, params, ["mineId", "severity"], "violations");
    case "listDisclosures":
      return listEnvelope(disclosures, params, ["wellId"], "disclosures");
    case "listJIBStatements":
      return listEnvelope(allJIBStatements(), params, ["wellId", "partnerId"], "jibStatements");
    default:
      return null;
  }
}

async function handleMcp(request) {
  if (request.method !== "POST") {
    return envelopeResponse(blocked("the MCP door answers JSON-RPC over POST (streamable-http); GET streams are not mounted"), {
      status: 405,
      headers: { allow: "POST" },
    });
  }
  const rpc = await readJsonBody(request);
  if (rpc === null || typeof rpc !== "object" || rpc.jsonrpc !== "2.0") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error: expected a JSON-RPC 2.0 request" } }), { status: 400, headers: JSON_CT });
  }
  const reply = (result) => new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id ?? null, result }), { status: 200, headers: JSON_CT });
  switch (rpc.method) {
    case "initialize":
      return reply({
        protocolVersion: rpc.params?.protocolVersion || "2025-03-26",
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
      const name = rpc.params?.name;
      meter(name || "tools/call");
      const envelope = mcpToolResult(name, rpc.params?.arguments);
      if (envelope === null) {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32602, message: `unknown tool ${JSON.stringify(name)} — tools/list names the six that answer` } }), { status: 200, headers: JSON_CT });
      }
      return reply({ content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }], isError: false });
    }
    default:
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32601, message: `method ${JSON.stringify(rpc.method)} not served` } }), { status: 200, headers: JSON_CT });
  }
}

/* ── the fetch pipeline ─────────────────────────────────────────────────── */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    traffic(request);

    // headless system-of-record door (native binding) — mounted BEFORE the
    // generated face because the collection pathname is shared: GET
    // /jib-statements is the data face, POST /jib-statements is the headless
    // production-accounting door (one substrate, two plies, one pathname — §3)
    if (path === "/jib-statements" && request.method === "POST") {
      meter("createJIBStatement");
      const body = await readJsonBody(request);
      const gross = typeof body?.grossBilled === "number" && Number.isFinite(body.grossBilled) && body.grossBilled > 0 ? body.grossBilled : null;
      const share = typeof body?.workingInterestShare === "number" && body.workingInterestShare > 0 && body.workingInterestShare <= 1 ? body.workingInterestShare : null;
      if (body === null || typeof body.wellId !== "string" || body.wellId.length === 0 || typeof body.partnerId !== "string" || body.partnerId.length === 0 || gross === null || share === null) {
        return envelopeResponse(blocked("createJIBStatement requires a JSON body with wellId, partnerId, grossBilled > 0 and workingInterestShare in (0, 1]"), { status: 403 });
      }
      const rec = {
        $type: "https://schema.org.ai/JIBStatement",
        id: `jib-demo-ws-${workspace.jibStatements.length + 1}`,
        example: true, // mechanical labeling law — everything in the sandbox is demo data
        wellId: body.wellId,
        operatorId: typeof body.operatorId === "string" ? body.operatorId : "op-demo-001",
        partnerId: body.partnerId,
        period: typeof body.period === "string" ? body.period : "2026-08",
        memo: demoLabel(body.memo || "JIB statement"),
        grossBilled: gross,
        workingInterestShare: share,
        netDue: Math.round(gross * share * 100) / 100, // computed server-side — share arithmetic stays honest
        status: "issued",
        retention: RETENTION_NOTICE,
      };
      workspace.jibStatements.push(rec);
      return envelopeResponse(ok([rec], { memberName: "jibStatements" }), { status: 201 });
    }

    // the generated machine face (quartet + branching collection + offer + family + home)
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path) meter("listWells");
      if (path === "/pricing" || path === "/pricing.json" || path === "/pricing.md" || path === "/pricing.html") meter("getPricing");
      if (path === manifest.pricing.offerPath) {
        meter("getOffer");
        moneyEvent("offer-served", { operation: "getOffer", shape: "paid" });
      }
      if (path === manifest.familyPath) meter("getFamilyRegistry");
      return hit;
    }

    // ── the substrate's own doors (both plies, one definition) ────────────
    if (path === "/verify" && (request.method === "GET" || request.method === "HEAD")) {
      meter("getVerify");
      const { face } = negotiate(request, path, {});
      return serveFace(request, url, verifyFaces, face, { cleanPath: "/verify" });
    }

    if (path === "/icp.json" && (request.method === "GET" || request.method === "HEAD")) {
      meter("getICP");
      return new Response(request.method === "HEAD" ? null : JSON.stringify(icpDoc, null, 2), { status: 200, headers: JSON_CT });
    }

    if (path === "/mcp") return handleMcp(request);

    const wellById = path.match(/^\/wells\/([^/]+)$/);
    if (wellById && request.method === "GET") {
      meter("getWell");
      const rec = wells.find((w) => w.id === decodeURIComponent(wellById[1]));
      if (rec === undefined) {
        return envelopeResponse(empty(`no well with id ${decodeURIComponent(wellById[1])} — a truthful miss, not an error`, { memberName: "wells" }));
      }
      return envelopeResponse(ok([rec], { memberName: "wells" }));
    }

    if (path === "/operators" && request.method === "GET") {
      meter("listOperators");
      return envelopeResponse(listEnvelope(operators, url.searchParams, ["kind"], "operators"));
    }

    if (path === "/violations" && request.method === "GET") {
      meter("listViolations");
      return envelopeResponse(listEnvelope(violations, url.searchParams, ["mineId", "severity"], "violations"));
    }

    if (path === "/disclosures" && request.method === "GET") {
      meter("listDisclosures");
      return envelopeResponse(listEnvelope(disclosures, url.searchParams, ["wellId"], "disclosures"));
    }

    if (path === "/jib-statements" && request.method === "GET") {
      meter("listJIBStatements");
      return envelopeResponse(listEnvelope(allJIBStatements(), url.searchParams, ["wellId", "partnerId"], "jibStatements"));
    }

    const jibById = path.match(/^\/jib-statements\/([^/]+)$/);
    if (jibById && request.method === "GET") {
      meter("getJIBStatement");
      const rec = allJIBStatements().find((j) => j.id === decodeURIComponent(jibById[1]));
      if (rec === undefined) {
        return envelopeResponse(empty(`no JIB statement with id ${decodeURIComponent(jibById[1])} — a truthful miss, not an error`, { memberName: "jibStatements" }));
      }
      return envelopeResponse(ok([rec], { memberName: "jibStatements" }));
    }

    // nothing is declared here that doesn't serve — and nothing serves here
    // that isn't declared; a miss is a plain typed 404 pointing at the card
    return new Response(
      JSON.stringify({ error: `nothing serves at ${path}`, card: `${ORIGIN}/.well-known/agents.json`, llms: `${ORIGIN}/llms.txt` }),
      { status: 404, headers: JSON_CT },
    );
  },
};
