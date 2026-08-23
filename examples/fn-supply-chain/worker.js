/**
 * worker.js — the ONE substrate serving BOTH plies of `fn-supply-chain`
 * (template spec §3): the data face (X12/EPCIS-typed record collections) and
 * the headless face (buy-side procurement system-of-record doors — POST on
 * the SAME collections, same envelopes, same rate card). Plus the full §4
 * machine face, generated from ONE manifest by the vendored axp-faces at the
 * PINS.json digest — never hand-rolled.
 *
 * RULED BRIDGE PLACEMENTS (batch-2 watch list, from batch 1's rollup —
 * additive extensions of the GENERATED documents, bridged EXACTLY here until
 * the upstream re-vendor lands; the vendored bytes are never forked):
 *   1. rates[] top-level in the Pricing Document (operationId-keyed, freeQuota
 *      required) — /pricing* intercepted, same faces contract;
 *   2. g2 top-level on the card;
 *   3. links.verify as a card link member;
 *   4. operationId on EVERY route in the OpenAPI document (the bridge throws
 *      at module init on any unmapped route — zero divergence tolerated).
 */
import {
  createAxpRoutes,
  buildPricingDocument,
  buildCard,
  buildOpenapi,
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
import { purchaseOrders, rfqs, quotes, invoices, shipmentNotices, epcisEvents, items, RETENTION_NOTICE } from "./seed.js";
import { meter, moneyEvent, traffic } from "./seams.js";

const manifest = buildManifest();
const axp = createAxpRoutes(manifest);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

/* ── the anon-sandbox ephemeral workspace (§5.1 rung 0) ─────────────────────
   Auto-minted, in-memory, disclosed retention (RETENTION_NOTICE). Seed
   records are tenant #1; writes land here and are labeled mechanically —
   nothing a caller stores in the sandbox can masquerade as real data. */
const workspace = { purchaseOrders: [], rfqs: [], quotes: [] };

function demoLabel(text) {
  const t = String(text || "untitled");
  return t.startsWith("[demo]") ? t : `[demo] ${t}`;
}

/* ── ruled bridge 4: operationId on EVERY route ─────────────────────────────
   The vendored generator emits operationIds for the quartet's own operations
   (listCollection, getPricing, getOffer, getFamilyRegistry) but not for
   manifest routes. The bridge maps every remaining route to its camelCase
   verb and FAILS CLOSED on any unmapped route. */
const OPERATION_ID_BRIDGE = {
  "get /purchase-orders/{id}": "getPurchaseOrder",
  "post /purchase-orders": "createPurchaseOrder",
  "get /rfqs": "listRFQs",
  "post /rfqs": "createRFQ",
  "post /rfqs/{id}/quotes": "submitQuote",
  "get /quotes": "listQuotes",
  "get /invoices": "listInvoices",
  "get /shipment-notices": "listShipmentNotices",
  "get /epcis-events": "listEPCISEvents",
  "get /items": "listItems",
  "get /verify": "getVerify",
  "get /icp.json": "getICP",
};
const openapiDoc = (() => {
  const doc = buildOpenapi(manifest);
  for (const [p, ops] of Object.entries(doc.paths)) {
    for (const op of Object.entries(ops)) {
      const [method, operation] = op;
      if (operation.operationId === undefined) {
        const bridged = OPERATION_ID_BRIDGE[`${method} ${p}`];
        if (bridged === undefined) {
          throw new Error(`route ${method.toUpperCase()} ${p} has no operationId — the ruled bridge tolerates zero divergence`);
        }
        operation.operationId = bridged;
      }
    }
  }
  return doc;
})();

/* ── ruled bridge 1: the extended rate card (/pricing + rates[]) ────────────
   The vendored generator emits the AXP Pricing Document (model, hardCeiling,
   unit, price, binding axis). The template's rate-card wire schema (DRAFT §2)
   adds rates[] — operationId-keyed, freeQuota required — top-level on the
   SAME document. rates[].operation ⊆ the served OpenAPI operationIds (§9.1).
   Every row names a freeQuota or prices from zero; all stub-labeled. */
const pricingDoc = {
  ...buildPricingDocument(manifest),
  rates: [
    { operation: "listCollection", price: 0.001, unit: "usd", freeQuota: 500, note: "the branching /purchase-orders collection — wave-zero 402-shaped stub; every sandbox call is free" },
    { operation: "getPurchaseOrder", price: 0.001, unit: "usd", freeQuota: 500, note: "wave-zero 402-shaped stub — no live settlement" },
    { operation: "createPurchaseOrder", price: 0.005, unit: "usd", freeQuota: 100, note: "headless buy-side door — wave-zero 402-shaped stub; sandbox writes are free and ephemeral" },
    { operation: "createRFQ", price: 0.005, unit: "usd", freeQuota: 100, note: "RFQ fan-out — wave-zero 402-shaped stub" },
    { operation: "submitQuote", price: 0, unit: "usd", freeQuota: 1000, note: "free by design — supply-side quote submission feeds the price-response corpus; contribution is never metered" },
    { operation: "listEPCISEvents", price: 0.001, unit: "usd", freeQuota: 500, note: "wave-zero 402-shaped stub — no live settlement" },
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
prefixes, GS1 demo-prefix-952 GTINs and GLNs, fictional parties only).
${RETENTION_NOTICE}
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
      description: "keyless reads: the quartet, /purchase-orders and its sibling collections, /icp.json, /verify — no key, no account",
    },
    {
      id: "sandbox-transactor",
      description:
        "exercises the headless buy-side doors (POST /purchase-orders, POST /rfqs, POST /rfqs/{id}/quotes) against the ephemeral demo workspace — synthetic labeled state, disclosed retention",
    },
    {
      id: "mcp-caller",
      description: "the same Nouns and verbs over the /mcp JSON-RPC door — one definition, two transports",
    },
  ],
  ladder: manifest.attestationLadder,
};

/* ── ruled bridges 2 + 3: the card — generator truth + g2 top-level +
   links.verify. Additive extension of the GENERATED card; the quartet itself
   stays generator-emitted. */
const card = (() => {
  const c = buildCard(manifest);
  return {
    ...c,
    g2: {
      url: `${ORIGIN}/icp.json`,
      icp: projection.icp,
      personas: projection.personas,
      motion: projection.motion,
    },
    links: { ...c.links, verify: `${ORIGIN}/verify` },
  };
})();

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
  { name: "listPurchaseOrders", description: "List PurchaseOrder records (X12 850-typed; branching: status, supplier). Synthetic labeled demo data.", inputSchema: { type: "object", properties: { status: { type: "string" }, supplier: { type: "string" } } } },
  { name: "getPurchaseOrder", description: "Get one PurchaseOrder record by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "listRFQs", description: "List RFQ records (filters: status, category).", inputSchema: { type: "object", properties: { status: { type: "string" }, category: { type: "string" } } } },
  { name: "listQuotes", description: "List Quote records — RFQ price responses (filters: rfq, supplier).", inputSchema: { type: "object", properties: { rfq: { type: "string" }, supplier: { type: "string" } } } },
  { name: "listInvoices", description: "List Invoice records (X12 810-typed; filters: purchaseOrder, status).", inputSchema: { type: "object", properties: { purchaseOrder: { type: "string" }, status: { type: "string" } } } },
  { name: "listShipmentNotices", description: "List ShipmentNotice records (X12 856 ASN; filter: purchaseOrder). GS1 demo-prefix-952 GLNs and GTINs.", inputSchema: { type: "object", properties: { purchaseOrder: { type: "string" } } } },
  { name: "listEPCISEvents", description: "List EPCIS 2.0-shaped ObjectEvents (filters: bizStep, shipmentNotice).", inputSchema: { type: "object", properties: { bizStep: { type: "string" }, shipmentNotice: { type: "string" } } } },
  { name: "listItems", description: "List GS1-identified Item records (GTIN spine, demo prefix 952; filter: supplier).", inputSchema: { type: "object", properties: { supplier: { type: "string" } } } },
];

function mcpToolResult(name, args) {
  const params = new URLSearchParams(Object.entries(args || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
  switch (name) {
    case "listPurchaseOrders":
      return listEnvelope([...purchaseOrders, ...workspace.purchaseOrders], params, ["status", "supplier"], "purchaseOrders");
    case "getPurchaseOrder": {
      const rec = [...purchaseOrders, ...workspace.purchaseOrders].find((p) => p.id === args?.id);
      return rec ? ok([rec], { memberName: "purchaseOrders" }) : empty(`no purchase order with id ${args?.id}`, { memberName: "purchaseOrders" });
    }
    case "listRFQs":
      return listEnvelope([...rfqs, ...workspace.rfqs], params, ["status", "category"], "rfqs");
    case "listQuotes":
      return listEnvelope([...quotes, ...workspace.quotes], params, ["rfq", "supplier"], "quotes");
    case "listInvoices":
      return listEnvelope(invoices, params, ["purchaseOrder", "status"], "invoices");
    case "listShipmentNotices":
      return listEnvelope(shipmentNotices, params, ["purchaseOrder"], "shipmentNotices");
    case "listEPCISEvents":
      return listEnvelope(epcisEvents, params, ["bizStep", "shipmentNotice"], "epcisEvents");
    case "listItems":
      return listEnvelope(items, params, ["supplier"], "items");
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
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32602, message: `unknown tool ${JSON.stringify(name)} — tools/list names the eight that answer` } }), { status: 200, headers: JSON_CT });
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

    // ruled bridge 2+3: the extended card intercepts the card address
    if (path === "/.well-known/agents.json") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return envelopeResponse(blocked(`method ${request.method} is not served at ${path} — this address answers GET and HEAD`), { status: 405, headers: { allow: "GET, HEAD" } });
      }
      return new Response(request.method === "HEAD" ? null : JSON.stringify(card, null, 2), { status: 200, headers: JSON_CT });
    }

    // ruled bridge 4: the operationId-complete OpenAPI document
    if (path === "/openapi.json") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return envelopeResponse(blocked(`method ${request.method} is not served at ${path} — this address answers GET and HEAD`), { status: 405, headers: { allow: "GET, HEAD" } });
      }
      return new Response(request.method === "HEAD" ? null : JSON.stringify(openapiDoc, null, 2), { status: 200, headers: JSON_CT });
    }

    // ruled bridge 1: the extended rate card intercepts the pricing addresses
    // (same conneg law, same faces contract) so rates[] rides the one Pricing Document
    if (path === "/pricing" || path === "/pricing.json" || path === "/pricing.md" || path === "/pricing.html") {
      meter("getPricing");
      if (request.method !== "GET" && request.method !== "HEAD") {
        return envelopeResponse(blocked(`method ${request.method} is not served at ${path} — this address answers GET and HEAD`), { status: 405, headers: { allow: "GET, HEAD" } });
      }
      const { face } = negotiate(request, path, {});
      return serveFace(request, url, pricingFaces, face, { cleanPath: "/pricing" });
    }

    // headless system-of-record doors (native binding) — mounted BEFORE the
    // generated face because the collection pathname is shared: GET
    // /purchase-orders is the data face, POST /purchase-orders is the
    // headless door (one substrate, two plies, one pathname — §3)
    if (path === "/purchase-orders" && request.method === "POST") {
      meter("createPurchaseOrder");
      const body = await readJsonBody(request);
      if (body === null || typeof body.supplier !== "string" || body.supplier.length === 0 || !Array.isArray(body.lines) || body.lines.length === 0) {
        return envelopeResponse(blocked("createPurchaseOrder requires a JSON body with a non-empty supplier and a non-empty lines array of { gtin, qty }"), { status: 403 });
      }
      const rec = {
        $type: "https://schema.org/Order",
        id: `po-demo-ws-${workspace.purchaseOrders.length + 1}`,
        example: true, // mechanical labeling law — everything in the sandbox is demo data
        x12: "850",
        status: "open",
        supplier: demoLabel(body.supplier),
        buyer: "[demo] anon sandbox workspace",
        currency: typeof body.currency === "string" ? body.currency : "usd",
        orderedAt: new Date().toISOString().slice(0, 10),
        lines: body.lines.map((l) => ({ gtin: String(l.gtin ?? ""), qty: Number(l.qty ?? 0), ...(l.unitPrice !== undefined && { unitPrice: Number(l.unitPrice) }) })),
        retention: RETENTION_NOTICE,
      };
      workspace.purchaseOrders.push(rec);
      return envelopeResponse(ok([rec], { memberName: "purchaseOrders" }), { status: 201 });
    }

    if (path === "/rfqs" && request.method === "POST") {
      meter("createRFQ");
      const body = await readJsonBody(request);
      if (body === null || typeof body.title !== "string" || body.title.length === 0 || typeof body.category !== "string" || body.category.length === 0) {
        return envelopeResponse(blocked("createRFQ requires a JSON body with a non-empty title and category"), { status: 403 });
      }
      const rec = {
        id: `rfq-demo-ws-${workspace.rfqs.length + 1}`,
        example: true,
        title: demoLabel(body.title),
        status: "open",
        category: body.category,
        ...(body.quantity !== undefined && { quantity: Number(body.quantity) }),
        ...(typeof body.neededBy === "string" && { neededBy: body.neededBy }),
        retention: RETENTION_NOTICE,
      };
      workspace.rfqs.push(rec);
      return envelopeResponse(ok([rec], { memberName: "rfqs" }), { status: 201 });
    }

    const quoteDoor = path.match(/^\/rfqs\/([^/]+)\/quotes$/);
    if (quoteDoor && request.method === "POST") {
      meter("submitQuote");
      const rfqId = decodeURIComponent(quoteDoor[1]);
      const body = await readJsonBody(request);
      if (body === null || typeof body.supplier !== "string" || body.supplier.length === 0 || typeof body.unitPrice !== "number") {
        return envelopeResponse(blocked("submitQuote requires a JSON body with a non-empty supplier and a numeric unitPrice"), { status: 403 });
      }
      const parent = [...rfqs, ...workspace.rfqs].find((r) => r.id === rfqId);
      if (parent === undefined) {
        return envelopeResponse(blocked(`no RFQ with id ${rfqId} — list them at /rfqs or fan one out with POST /rfqs first`), { status: 403 });
      }
      const rec = {
        $type: "https://schema.org/Offer",
        id: `quo-demo-ws-${workspace.quotes.length + 1}`,
        example: true,
        rfq: rfqId,
        supplier: demoLabel(body.supplier),
        unitPrice: body.unitPrice,
        currency: typeof body.currency === "string" ? body.currency : "usd",
        ...(body.leadTimeDays !== undefined && { leadTimeDays: Number(body.leadTimeDays) }),
        retention: RETENTION_NOTICE,
      };
      workspace.quotes.push(rec);
      return envelopeResponse(ok([rec], { memberName: "quotes" }), { status: 201 });
    }

    // the branching collection with the live workspace folded in — the SAME
    // collectionDecision the generator uses (identical branching semantics),
    // over seed + workspace so a record written through the headless door
    // reads back through the data face (one collection, two plies)
    if (path === manifest.collection.path && (request.method === "GET" || request.method === "HEAD") && workspace.purchaseOrders.length > 0) {
      meter("listPurchaseOrders");
      const merged = { ...manifest, collection: { ...manifest.collection, records: [...manifest.collection.records, ...workspace.purchaseOrders] } };
      const { status, body } = collectionDecision(merged, url.searchParams);
      return new Response(request.method === "HEAD" ? null : JSON.stringify(body), { status, headers: { ...JSON_CT, vary: "accept" } });
    }

    // the generated machine face (quartet + branching collection + offer + family + home)
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path) meter("listPurchaseOrders");
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

    const poById = path.match(/^\/purchase-orders\/([^/]+)$/);
    if (poById && request.method === "GET") {
      meter("getPurchaseOrder");
      const rec = [...purchaseOrders, ...workspace.purchaseOrders].find((p) => p.id === decodeURIComponent(poById[1]));
      if (rec === undefined) {
        return envelopeResponse(empty(`no purchase order with id ${decodeURIComponent(poById[1])} — a truthful miss, not an error`, { memberName: "purchaseOrders" }));
      }
      return envelopeResponse(ok([rec], { memberName: "purchaseOrders" }));
    }

    if (path === "/rfqs" && request.method === "GET") {
      meter("listRFQs");
      return envelopeResponse(listEnvelope([...rfqs, ...workspace.rfqs], url.searchParams, ["status", "category"], "rfqs"));
    }

    if (path === "/quotes" && request.method === "GET") {
      meter("listQuotes");
      return envelopeResponse(listEnvelope([...quotes, ...workspace.quotes], url.searchParams, ["rfq", "supplier"], "quotes"));
    }

    if (path === "/invoices" && request.method === "GET") {
      meter("listInvoices");
      return envelopeResponse(listEnvelope(invoices, url.searchParams, ["purchaseOrder", "status"], "invoices"));
    }

    if (path === "/shipment-notices" && request.method === "GET") {
      meter("listShipmentNotices");
      return envelopeResponse(listEnvelope(shipmentNotices, url.searchParams, ["purchaseOrder"], "shipmentNotices"));
    }

    if (path === "/epcis-events" && request.method === "GET") {
      meter("listEPCISEvents");
      return envelopeResponse(listEnvelope(epcisEvents, url.searchParams, ["bizStep", "shipmentNotice"], "epcisEvents"));
    }

    if (path === "/items" && request.method === "GET") {
      meter("listItems");
      return envelopeResponse(listEnvelope(items, url.searchParams, ["supplier"], "items"));
    }

    // nothing is declared here that doesn't serve — and nothing serves here
    // that isn't declared; a miss is a plain typed 404 pointing at the card
    return new Response(
      JSON.stringify({ error: `nothing serves at ${path}`, card: `${ORIGIN}/.well-known/agents.json`, llms: `${ORIGIN}/llms.txt` }),
      { status: 404, headers: JSON_CT },
    );
  },
};
