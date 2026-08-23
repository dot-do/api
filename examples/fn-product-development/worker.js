/**
 * worker.js — the ONE substrate serving BOTH plies of `fn-product-development`
 * (template spec §3): the data face (typed record collections) and the
 * headless face (PM/PLM system-of-record doors — POST on the SAME
 * collections, same envelopes, same rate card). Plus the full §4 machine
 * face, generated from ONE manifest by the vendored axp-faces at the
 * PINS.json digest — never hand-rolled.
 *
 * GAP row: served under the placeholder org.ai address; no G4 brand
 * (projection.js records the gap). Standard Workers fetch export; also runs
 * in-memory under vitest (test/conformance.test.js) exactly as the hosted
 * verifier would probe it.
 */
import {
  createAxpRoutes,
  buildPricingDocument,
  ok,
  empty,
  blocked,
  envelopeResponse,
  collectionDecision,
  serveFace,
  negotiate,
} from "./axp/index.js";
import { buildManifest, ORIGIN } from "./manifest.js";
import { apiProduct } from "./apiproduct.js";
import { projection } from "./projection.js";
import { products, requirements, releases, roadmapItems, bomItems, RETENTION_NOTICE } from "./seed.js";
import { meter, moneyEvent, traffic } from "./seams.js";

const manifest = buildManifest();
const axp = createAxpRoutes(manifest);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

/* ── the anon-sandbox ephemeral workspace (§5.1 rung 0) ─────────────────────
   Auto-minted, in-memory, disclosed retention (RETENTION_NOTICE). Seed
   records are tenant #1; writes land here and are labeled mechanically —
   nothing a caller stores in the sandbox can masquerade as real data. */
const workspace = { products: [], requirements: [] };

function demoLabel(title) {
  const t = String(title || "untitled");
  return t.startsWith("[demo]") ? t : `[demo] ${t}`;
}

/* ── the extended rate card (/pricing + rates[]) ────────────────────────────
   The vendored generator emits the AXP Pricing Document (model, hardCeiling,
   unit, price, binding axis). The template's rate-card wire schema adds
   rates[] (operationId-keyed, freeQuota required) — added here as DESCRIPTIVE
   members on the same document (the binding-axis precedent: additive members
   on an orthogonal axis; `pricing-declared` reads `model` and is untouched).
   rates[].operation ⊆ the OpenAPI operationIds (§9.1). Carried upstream: the
   generator should own rates[] (spec Open Question 1 — rate-card extension
   shape); this site never forks the vendored bytes. */
const pricingDoc = {
  ...buildPricingDocument(manifest),
  rates: [
    {
      operation: "listCollection", // the branching /products collection
      price: 0.002,
      unit: "usd",
      freeQuota: 100,
      note: "wave-zero 402-shaped stub — no live settlement; every sandbox call is free",
    },
  ],
};
const pricingFaces = {
  json: pricingDoc,
  md: `# ${manifest.name} — pricing\n\n\`\`\`json\n${JSON.stringify(pricingDoc, null, 2)}\n\`\`\`\n`,
  html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${manifest.name} — pricing</title></head>\n<body><h1>${manifest.name} — pricing</h1><pre>${JSON.stringify(pricingDoc, null, 2).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></body></html>\n`,
};

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
prefixes, GS1 demo-prefix-952 GTINs). ${RETENTION_NOTICE}
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
      description: "keyless reads: the quartet, /products and its sibling collections, /icp.json, /verify — no key, no account",
    },
    {
      id: "sandbox-writer",
      description: "exercises the headless system-of-record doors (POST /products, POST /requirements) against the ephemeral demo workspace — synthetic labeled state, disclosed retention",
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

/* ── the MCP door (mounted — declared on the card because it answers) ─────
   Minimal streamable-http JSON-RPC server; the tools are the SAME Nouns and
   verbs as HTTP — one definition, not a second API. */
const MCP_TOOLS = [
  { name: "listProducts", description: "List Product records (branching: stage, kind). Synthetic labeled demo data.", inputSchema: { type: "object", properties: { stage: { type: "string" }, kind: { type: "string" } } } },
  { name: "getProduct", description: "Get one Product record by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "listRequirements", description: "List Requirement records (filters: product, status).", inputSchema: { type: "object", properties: { product: { type: "string" }, status: { type: "string" } } } },
  { name: "listReleases", description: "List Release records (filters: product, channel).", inputSchema: { type: "object", properties: { product: { type: "string" }, channel: { type: "string" } } } },
  { name: "listRoadmapItems", description: "List RoadmapItem records (filters: product, horizon).", inputSchema: { type: "object", properties: { product: { type: "string" }, horizon: { type: "string" } } } },
  { name: "listBOMItems", description: "List BOM Item records for physical products (filter: product). GS1 demo-prefix-952 GTINs.", inputSchema: { type: "object", properties: { product: { type: "string" } } } },
];

function mcpToolResult(name, args) {
  const params = new URLSearchParams(Object.entries(args || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
  switch (name) {
    case "listProducts":
      return listEnvelope([...products, ...workspace.products], params, ["stage", "kind"], "products");
    case "getProduct": {
      const rec = [...products, ...workspace.products].find((p) => p.id === args?.id);
      return rec ? ok([rec], { memberName: "products" }) : empty(`no product with id ${args?.id}`, { memberName: "products" });
    }
    case "listRequirements":
      return listEnvelope([...requirements, ...workspace.requirements], params, ["product", "status"], "requirements");
    case "listReleases":
      return listEnvelope(releases, params, ["product", "channel"], "releases");
    case "listRoadmapItems":
      return listEnvelope(roadmapItems, params, ["product", "horizon"], "roadmapItems");
    case "listBOMItems":
      return listEnvelope(bomItems, params, ["product"], "bomItems");
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

    // the extended rate card intercepts the pricing addresses (same conneg
    // law, same faces contract) so rates[] rides the one Pricing Document
    if (path === "/pricing" || path === "/pricing.json" || path === "/pricing.md" || path === "/pricing.html") {
      meter("getPricing");
      if (request.method !== "GET" && request.method !== "HEAD") {
        return envelopeResponse(blocked(`method ${request.method} is not served at ${path} — this address answers GET and HEAD`), { status: 405, headers: { allow: "GET, HEAD" } });
      }
      const { face } = negotiate(request, path, {});
      return serveFace(request, url, pricingFaces, face, { cleanPath: "/pricing" });
    }

    // headless system-of-record doors (native binding) — mounted BEFORE the
    // generated face because the collection pathname is shared: GET /products
    // is the data face, POST /products is the headless door (one substrate,
    // two plies, one pathname — §3)
    if (path === "/products" && request.method === "POST") {
      meter("createProduct");
      const body = await readJsonBody(request);
      if (body === null || typeof body.title !== "string" || body.title.length === 0) {
        return envelopeResponse(blocked("createProduct requires a JSON body with a non-empty title"), { status: 403 });
      }
      const rec = {
        $type: "https://schema.org/Product",
        id: `prod-demo-ws-${workspace.products.length + 1}`,
        example: true, // mechanical labeling law — everything in the sandbox is demo data
        title: demoLabel(body.title),
        kind: body.kind === "physical" ? "physical" : "software",
        stage: typeof body.stage === "string" ? body.stage : "concept",
        summary: typeof body.summary === "string" ? body.summary : "",
        retention: RETENTION_NOTICE,
      };
      workspace.products.push(rec);
      return envelopeResponse(ok([rec], { memberName: "products" }), { status: 201 });
    }

    if (path === "/requirements" && request.method === "POST") {
      meter("createRequirement");
      const body = await readJsonBody(request);
      if (body === null || typeof body.title !== "string" || body.title.length === 0 || typeof body.product !== "string") {
        return envelopeResponse(blocked("createRequirement requires a JSON body with a non-empty title and a product id"), { status: 403 });
      }
      const rec = {
        id: `req-demo-ws-${workspace.requirements.length + 1}`,
        example: true,
        product: body.product,
        title: demoLabel(body.title),
        status: typeof body.status === "string" ? body.status : "proposed",
        priority: typeof body.priority === "string" ? body.priority : "p2",
        retention: RETENTION_NOTICE,
      };
      workspace.requirements.push(rec);
      return envelopeResponse(ok([rec], { memberName: "requirements" }), { status: 201 });
    }

    // the branching collection with the live workspace folded in — the SAME
    // collectionDecision the generator uses (identical branching semantics),
    // over seed + workspace so a record written through the headless door
    // reads back through the data face (one collection, two plies)
    if (path === manifest.collection.path && (request.method === "GET" || request.method === "HEAD") && workspace.products.length > 0) {
      meter("listProducts");
      const merged = { ...manifest, collection: { ...manifest.collection, records: [...manifest.collection.records, ...workspace.products] } };
      const { status, body } = collectionDecision(merged, url.searchParams);
      return new Response(request.method === "HEAD" ? null : JSON.stringify(body), { status, headers: { ...JSON_CT, vary: "accept" } });
    }

    // the generated machine face (quartet + branching collection + offer + family + home)
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path) meter("listProducts");
      if (path === manifest.pricing.offerPath) {
        meter("getOffer");
        moneyEvent("offer-served", { operation: "getOffer", shape: "paid" });
      }
      if (path === manifest.familyPath) meter("getFamilyRegistry");
      return hit;
    }

    // ── the substrate's own doors (both plies, one definition) ────────────
    if (path === "/verify" && (request.method === "GET" || request.method === "HEAD")) {
      const { face } = negotiate(request, path, {});
      return serveFace(request, url, verifyFaces, face, { cleanPath: "/verify" });
    }

    if (path === "/icp.json" && (request.method === "GET" || request.method === "HEAD")) {
      meter("getICP");
      return new Response(request.method === "HEAD" ? null : JSON.stringify(icpDoc, null, 2), { status: 200, headers: JSON_CT });
    }

    if (path === "/mcp") return handleMcp(request);

    const productById = path.match(/^\/products\/([^/]+)$/);
    if (productById && request.method === "GET") {
      meter("getProduct");
      const rec = [...products, ...workspace.products].find((p) => p.id === decodeURIComponent(productById[1]));
      if (rec === undefined) {
        return envelopeResponse(empty(`no product with id ${decodeURIComponent(productById[1])} — a truthful miss, not an error`, { memberName: "products" }));
      }
      return envelopeResponse(ok([rec], { memberName: "products" }));
    }

    if (path === "/requirements" && request.method === "GET") {
      meter("listRequirements");
      return envelopeResponse(listEnvelope([...requirements, ...workspace.requirements], url.searchParams, ["product", "status"], "requirements"));
    }

    if (path === "/releases" && request.method === "GET") {
      meter("listReleases");
      return envelopeResponse(listEnvelope(releases, url.searchParams, ["product", "channel"], "releases"));
    }

    if (path === "/roadmap" && request.method === "GET") {
      meter("listRoadmapItems");
      return envelopeResponse(listEnvelope(roadmapItems, url.searchParams, ["product", "horizon"], "roadmapItems"));
    }

    if (path === "/bom-items" && request.method === "GET") {
      meter("listBOMItems");
      return envelopeResponse(listEnvelope(bomItems, url.searchParams, ["product"], "bomItems"));
    }

    // nothing is declared here that doesn't serve — and nothing serves here
    // that isn't declared; a miss is a plain typed 404 pointing at the card
    return new Response(
      JSON.stringify({ error: `nothing serves at ${path}`, card: `${ORIGIN}/.well-known/agents.json`, llms: `${ORIGIN}/llms.txt` }),
      { status: 404, headers: JSON_CT },
    );
  },
};
