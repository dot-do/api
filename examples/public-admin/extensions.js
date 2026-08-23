/**
 * extensions.js — the machine face: vendored axp-faces generator output PLUS
 * the four batch-2 RULED extension placements the generator does not carry
 * yet. Each is a bridge landing EXACTLY where the ruling put it, to be fixed
 * in axp.org.ai and re-vendored — never patched into the vendored files:
 *
 *   1. `rates[]` TOP-LEVEL in the Pricing Document (/pricing) — the
 *      operation-keyed rate card inline (unknown members are ignored by the
 *      verifier — conformant by construction);
 *   2. `g2` TOP-LEVEL on the capability card — the row's G2 coordinates
 *      (ICP + personas + System coordinate); the full document stays at
 *      /icp.json (card links.icp);
 *   3. `links.verify` as a card LINK MEMBER → the published suite page;
 *   4. `operationId` on EVERY route in the OpenAPI document (the rate card
 *      may only price operationIds the contract declares).
 *
 * Everything else — collection, llms.txt, family, offer, home faces — is the
 * vendored generator, untouched (byte-identical, PINS.json-digested).
 */

import { buildCard, buildOpenapi, buildPricingDocument, createAxpRoutes, serveFace, negotiate, envelopeResponse } from "./axp/index.js";
import { manifest, icpDoc, RATES, ORIGIN } from "./manifest.js";
import { APIProduct } from "./product.js";

/** #4 — operationIds for every declared route (method+path → operationId). */
const OPERATION_IDS = {
  ...Object.fromEntries(APIProduct.operations.map((o) => [o.wire, o.operationId || o.verb])),
  "GET /icp.json": "getIcp",
  "GET /verify": "getVerify",
  "GET /verify/suite.json": "getVerifySuite",
  "GET /healthz": "getHealthz",
};

/** Fallback id so no route is ever emitted without an operationId. */
function derivedOperationId(method, path) {
  const words = path.replace(/[{}]/g, "").split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const tail = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
  return `${method.toLowerCase()}${tail ? tail[0].toUpperCase() + tail.slice(1) : "Root"}`;
}

function extendOpenapi(doc) {
  for (const [path, methods] of Object.entries(doc.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (typeof op !== "object" || op === null) continue;
      const key = `${method.toUpperCase()} ${path}`;
      op.operationId = OPERATION_IDS[key] || op.operationId || derivedOperationId(method, path);
    }
  }
  return doc;
}

/** #2 + #3 — the extended capability card. */
export const card = (() => {
  const base = buildCard(manifest);
  return {
    ...base,
    links: { ...base.links, verify: `${ORIGIN}/verify` },
    g2: {
      icp: icpDoc.icp,
      personas: icpDoc.personas,
      systems: APIProduct.systems,
    },
  };
})();

/** #1 — the Pricing Document with the operation-keyed rates[] inline. */
export const pricingDoc = (() => {
  const base = buildPricingDocument(manifest);
  return { ...base, rates: RATES };
})();

export const openapiDoc = extendOpenapi(buildOpenapi(manifest));

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

function jsonResponse(obj, head) {
  return new Response(head ? null : JSON.stringify(obj, null, 2), { status: 200, headers: JSON_CT });
}

function mdOfJson(title, obj) {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
}

function htmlOfJson(title, obj) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`;
}

const pricingFaces = {
  json: pricingDoc,
  md: mdOfJson("public-admin — pricing (rates[] inline)", pricingDoc),
  html: htmlOfJson("public-admin — pricing (rates[] inline)", pricingDoc),
};

const generatorRoutes = createAxpRoutes(manifest);

const OVERRIDDEN = new Set(["/.well-known/agents.json", "/openapi.json", "/pricing", "/pricing.json", "/pricing.md", "/pricing.html"]);

/**
 * The machine-face handler: extended documents first, then the vendored
 * generator for everything it serves. Returns undefined on fall-through.
 */
export async function axpHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (OVERRIDDEN.has(path)) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return envelopeResponse(
        { type: "BLOCKED", reason: `method ${request.method} is not served at ${path} — this address answers GET and HEAD` },
        { status: 405, headers: { allow: "GET, HEAD" } },
      );
    }
    const head = request.method === "HEAD";
    if (path === "/.well-known/agents.json") return jsonResponse(card, head);
    if (path === "/openapi.json") return jsonResponse(openapiDoc, head);
    const { face } = negotiate(request, path);
    return serveFace(request, url, pricingFaces, face, { cleanPath: "/pricing" });
  }

  return generatorRoutes(request, env);
}
