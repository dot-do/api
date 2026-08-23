/**
 * routes.js — mount the AXP quartet (and its supporting faces) on a Workers
 * fetch pipeline from ONE manifest:
 *
 *   GET /.well-known/agents.json   the capability card + probe manifest (Clause 6)
 *   GET /openapi.json              the OpenAPI 3.1 contract (Clause 1)
 *   GET /pricing (+ .json/.md/.html faces)  the Pricing Document (Clause 5)
 *   GET <collection.path>          the branching typed collection (Clauses 4 + 7)
 *   GET /llms.txt                  markdown front door (Clause 2) — only when
 *                                  manifest.llms.body is declared; otherwise the
 *                                  site keeps serving its static llms.txt
 *   GET <familyPath>               the family registry (typed sibling edges)
 *   GET <offerPath>                402 OFFER (metered only, Appendix A.5)
 *   GET / (+ /index.html|json|md)  the three-faced home — only when
 *                                  manifest.home is declared; otherwise the
 *                                  site wires its own root with the conneg
 *                                  helpers from ./conneg.js
 *
 * Usage in a site worker (first in the fetch pipeline, fall through on
 * undefined):
 *
 *   import { defineSiteManifest, createAxpRoutes } from "./axp/index.js";
 *   const axp = createAxpRoutes(defineSiteManifest({ ... }));
 *   export default { async fetch(request, env) {
 *     const hit = await axp(request, env);
 *     if (hit !== undefined) return withSiteHeaders(hit);
 *     ... existing site pipeline ...
 *   } };
 *
 * Every response here is deterministic, same-origin, storage-free.
 * HEAD answers wherever GET answers (A.7.3); non-GET on an AXP route answers
 * 405 with Allow, typed.
 */

import { buildCard } from "./card.js";
import { buildOpenapi } from "./openapi.js";
import { buildPricingDocument } from "./pricing.js";
import { buildLlmsTxt } from "./llms.js";
import { buildFamilyRegistry } from "./family.js";
import { collectionDecision, envelopeResponse, offer } from "./envelope.js";
import { serveFace, negotiate, CONNEG_VARY } from "./conneg.js";

const JSON_CT = { "content-type": "application/json; charset=utf-8" };
const MD_CT = { "content-type": "text/markdown; charset=utf-8" };

function jsonResponse(obj, { head = false, status = 200, headers } = {}) {
  return new Response(head ? null : JSON.stringify(obj, null, 2), { status, headers: { ...JSON_CT, ...(headers || {}) } });
}

/** Markdown face of a JSON document — the token-cheap register of the same truth. */
function mdOfJson(title, obj) {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
}

/** Minimal HTML face of a JSON document — same truth, page register. */
function htmlOfJson(title, obj) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`;
}

/**
 * createAxpRoutes(manifest, opts) → async (request, env) => Response | undefined
 *
 * opts.unfurlHtml — pass the HTML face to link-unfurl scrapers on * / *
 *                   (house extension, default true).
 */
export function createAxpRoutes(manifest, opts = {}) {
  // generated once — the manifest is frozen, so these cannot drift apart
  const card = buildCard(manifest);
  const openapiDoc = buildOpenapi(manifest);
  const pricingDoc = buildPricingDocument(manifest);
  const familyDoc = manifest.family.length > 0 ? buildFamilyRegistry(manifest) : undefined;
  const llmsTxt = manifest.llms ? buildLlmsTxt(manifest) : undefined;

  const routePaths = new Set([
    "/.well-known/agents.json",
    "/openapi.json",
    "/pricing",
    "/pricing.json",
    "/pricing.md",
    "/pricing.html",
    manifest.collection.path,
    ...(llmsTxt !== undefined ? ["/llms.txt"] : []),
    ...(familyDoc !== undefined ? [manifest.familyPath] : []),
    ...(manifest.pricing.model === "metered" ? [manifest.pricing.offerPath] : []),
    ...(manifest.home !== undefined ? ["/", "/index.html", "/index.json", "/index.md"] : []),
  ]);

  const pricingFaces = {
    json: pricingDoc,
    md: mdOfJson(`${manifest.name} — pricing`, pricingDoc),
    html: htmlOfJson(`${manifest.name} — pricing`, pricingDoc),
  };

  return async function axpRoutes(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!routePaths.has(path)) return undefined;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return envelopeResponse(
        { type: "BLOCKED", reason: `method ${request.method} is not served at ${path} — this address answers GET and HEAD` },
        { status: 405, headers: { allow: "GET, HEAD" } },
      );
    }
    const head = request.method === "HEAD";

    switch (path) {
      case "/.well-known/agents.json":
        return jsonResponse(card, { head });

      case "/openapi.json":
        return jsonResponse(openapiDoc, { head });

      case "/pricing":
      case "/pricing.json":
      case "/pricing.md":
      case "/pricing.html": {
        // three faces of the one Pricing Document; /pricing negotiates,
        // the face addresses force (A.7.2 — the address wins over Accept)
        const { face } = negotiate(request, path, opts);
        return serveFace(request, url, pricingFaces, face, { cleanPath: "/pricing" });
      }

      case "/llms.txt":
        return new Response(head ? null : llmsTxt, { status: 200, headers: MD_CT });

      case manifest.collection.path: {
        const { status, body } = collectionDecision(manifest, url.searchParams);
        return new Response(head ? null : JSON.stringify(body), { status, headers: { ...JSON_CT, vary: "accept" } });
      }
    }

    if (familyDoc !== undefined && path === manifest.familyPath) {
      return jsonResponse(familyDoc, { head });
    }

    if (manifest.pricing.model === "metered" && path === manifest.pricing.offerPath) {
      const body = offer({ ...manifest.pricing.offers[0] });
      return new Response(head ? null : JSON.stringify(body), { status: 402, headers: JSON_CT });
    }

    // ── the three-faced home (only when the manifest declares its faces) ────
    if (manifest.home !== undefined) {
      const homeFaces = normalizeHomeFaces(manifest);
      if (path === "/") {
        const { face } = negotiate(request, "/", opts);
        return serveFace(request, url, homeFaces, face, { cleanPath: "/" });
      }
      const forced = path === "/index.html" ? "html" : path === "/index.json" ? "json" : "md";
      return serveFace(request, url, homeFaces, forced, { cleanPath: "/" });
    }

    return undefined;
  };

  function normalizeHomeFaces(m) {
    const h = m.home;
    return {
      html: h.html,
      md: h.md,
      json:
        h.json !== undefined
          ? h.json
          : {
              // the JSON face SHOULD be JSON-LD with a resolvable context (A.7.1)
              $context: m.homeContext,
              $type: "API",
              $id: `${m.origin}/`,
              name: m.name,
              description: m.description,
              llms: `${m.origin}/llms.txt`,
              card: `${m.origin}/.well-known/agents.json`,
              openapi: `${m.origin}/openapi.json`,
              pricing: `${m.origin}/pricing`,
              collection: `${m.origin}${m.collection.path}`,
            },
    };
  }
}
