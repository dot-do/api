/**
 * bridge.js — the batch-2 RULED EXTENSION PLACEMENTS, bridged exactly here
 * until the upstream axp-faces re-vendor lands (zero divergence tolerated):
 *
 *   1. `rates[]` TOP-LEVEL in the Pricing Document (operation-keyed rows;
 *      every row names a freeQuota or prices from zero);
 *   2. `g2` TOP-LEVEL on the capability card (the G2 ICP/persona/System
 *      coordinates document);
 *   3. `links.verify` as a card link member (→ the published-suite page);
 *   4. `operationId` on EVERY route of the OpenAPI contract.
 *
 * The vendored generator files are NEVER edited (their bytes stay at the
 * PINS.json digest); this module EXTENDS the documents the vendored builders
 * emit. Fail-closed: if after bridging any OpenAPI operation still lacks an
 * operationId, module init throws — a build gate, not a runtime surprise.
 */

import { buildCard, buildOpenapi, buildPricingDocument } from "./axp/index.js";
import { manifest, icpDoc, RATE_ROWS, ORIGIN } from "./manifest.js";
import { APIProduct } from "./product.js";

// ── 1 + 2 + 3: the extended card ─────────────────────────────────────────────
const baseCard = buildCard(manifest);
export const card = {
  ...baseCard,
  g2: icpDoc, // ruled placement: G2 coordinates top-level on the card
  links: {
    ...baseCard.links,
    verify: `${ORIGIN}/verify`, // ruled placement: the published-suite page as a card link member
  },
};

// ── 1: the extended Pricing Document (rates[] top-level) ─────────────────────
const basePricing = buildPricingDocument(manifest);
for (const row of RATE_ROWS) {
  if (row.freeQuota === undefined && row.price !== 0) {
    throw new Error(`bridge gate: rate row ${row.operation} names no freeQuota and does not price from zero (§5.1 law)`);
  }
}
export const pricingDoc = {
  ...basePricing,
  rates: RATE_ROWS, // ruled placement: operation-keyed rate rows top-level in the Pricing Document
};

// ── 4: operationId on every route ────────────────────────────────────────────
/** wire → operationId, from the G3 operations table (product.js) plus the
 *  generator-served faces this property also prices. */
const OPERATION_IDS = new Map([
  ...APIProduct.operations.map((op) => [op.wire, op.operationId]),
  ["GET /icp.json", "getICP"],
  ["GET /verify", "getVerify"],
  ["GET /verify/suite.json", "getVerifySuite"],
  ["GET /healthz", "getHealth"],
]);

const baseOpenapi = buildOpenapi(manifest);
export const openapiDoc = (() => {
  const doc = JSON.parse(JSON.stringify(baseOpenapi));
  for (const [path, ops] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (op.operationId === undefined) {
        const wire = `${method.toUpperCase()} ${path}`;
        const id = OPERATION_IDS.get(wire);
        if (id === undefined) throw new Error(`bridge gate: no operationId mapped for ${wire} — every route carries one (batch-2 ruling)`);
        op.operationId = id;
      }
    }
  }
  // fail-closed re-check + rate-card containment (§9.1: rates[].operation ⊆ operationIds)
  const ids = new Set();
  for (const ops of Object.values(doc.paths)) {
    for (const op of Object.values(ops)) {
      if (op.operationId === undefined) throw new Error("bridge gate: an OpenAPI operation lacks operationId after bridging");
      ids.add(op.operationId);
    }
  }
  for (const row of RATE_ROWS) {
    if (!ids.has(row.operation)) {
      throw new Error(`bridge gate: rate row '${row.operation}' is not an OpenAPI operationId of the bridged contract`);
    }
  }
  return doc;
})();

// ── serving the bridged documents (same faces law as the vendored routes) ────
import { serveFace, negotiate } from "./axp/index.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

function mdOfJson(title, obj) {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
}

function htmlOfJson(title, obj) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`;
}

const pricingFaces = {
  json: pricingDoc,
  md: mdOfJson(`${manifest.name} — pricing`, pricingDoc),
  html: htmlOfJson(`${manifest.name} — pricing`, pricingDoc),
};

const BRIDGED_PATHS = new Set([
  "/.well-known/agents.json",
  "/openapi.json",
  "/pricing",
  "/pricing.json",
  "/pricing.md",
  "/pricing.html",
]);

/** Serve the bridged documents; undefined = not a bridged path.
 *  MUST run BEFORE the vendored createAxpRoutes handler in the worker, so
 *  the extended documents shadow the unextended generator output. */
export function bridgedRoutes(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!BRIDGED_PATHS.has(path)) return undefined;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(
      JSON.stringify({ type: "BLOCKED", reason: `method ${request.method} is not served at ${path} — this address answers GET and HEAD` }),
      { status: 405, headers: { ...JSON_CT, allow: "GET, HEAD" } },
    );
  }
  const head = request.method === "HEAD";

  if (path === "/.well-known/agents.json") {
    return new Response(head ? null : JSON.stringify(card, null, 2), { status: 200, headers: JSON_CT });
  }
  if (path === "/openapi.json") {
    return new Response(head ? null : JSON.stringify(openapiDoc, null, 2), { status: 200, headers: JSON_CT });
  }
  // the four pricing addresses: /pricing negotiates, extensions force (A.7.2)
  const { face } = negotiate(request, path);
  return serveFace(request, url, pricingFaces, face, { cleanPath: "/pricing" });
}
