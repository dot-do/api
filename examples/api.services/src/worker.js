/**
 * worker.js — the api.services wave-zero worker: one substrate, two plies.
 *
 * Pipeline: seams → the site's own doors (the three sibling Noun collections
 * + system-of-record writes, /icp, /verify, /mcp) → the vendored axp-faces
 * mount (card with links.verify + g2, openapi with native operationIds,
 * /pricing with the native top-level rates[], llms, /services, family,
 * offer, three-faced home) → typed 404 EMPTY.
 *
 * The rates[]/operationId bridges are GONE (axp-ext-rates-g2@0.2.0 is native
 * in the vendored generator, axp-faces 0.3.0): the manifest declares the
 * ruled members and the mount serves them — no site-side document patching.
 *
 * Both plies serve from ONE definition: every collection here reads the same
 * store the branching collection and the MCP tools read; the "headless" doors
 * are CRUD on the SAME collections (template §3).
 */

import { createAxpRoutes } from "./axp/routes.js";
import { collectionDecision, envelopeResponse, offer, ok } from "./axp/envelope.js";
import { serveFace, negotiate } from "./axp/conneg.js";
import { manifest, ORIGIN, NAME, VERSION, LADDER_ALTERNATIVES } from "./manifest.js";
import { projection } from "./projection.js";
import { records, find, create, mintWorkspace, RETENTION, SEED_VERSION } from "./store.js";
import { handleMcp } from "./mcp.js";
import { meter, moneyEvent, receiptSeam, trafficEvent } from "./seams.js";

const axp = createAxpRoutes(manifest);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

const mdOfJson = (title, obj) => `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
const htmlOfJson = (title, obj) => {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`;
};

// ── the G2 coordinates document (stake #6 — linked from the card as links.icp) ──
const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  $id: `${ORIGIN}/icp`,
  substrate: projection.substrate,
  brand: projection.brand,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  positioning: projection.positioning,
};
const icpFaces = { json: icpDoc, md: mdOfJson(`${NAME} — ICP (G2 coordinates)`, icpDoc), html: htmlOfJson(`${NAME} — ICP (G2 coordinates)`, icpDoc) };

// ── the published verify export ("trust us" → "run this") ────────────────────
const verifyDoc = {
  $context: "https://schema.org.ai",
  $type: "VerifyExport",
  $id: `${ORIGIN}/verify`,
  name: `${NAME} — run our tests`,
  description:
    "The public-contract checks for this surface, runnable by anyone. Every probe below is keyless and answers a typed envelope; the conformance gate is the pinned AXP spec the independent verifier (api.qa) judges by.",
  conformance: {
    spec: "apis-ax-axp@2.6.0",
    digest: "sha256:a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d",
    verifier: `https://api.qa/${NAME}`,
  },
  probes: [
    { curl: `curl ${ORIGIN}/services`, expect: "200, type OK, labeled example records" },
    { curl: `curl '${ORIGIN}/services?category=none'`, expect: "200, type EMPTY — a truthful empty set" },
    { curl: `curl '${ORIGIN}/services?scope=admin'`, expect: "403, type BLOCKED — a worded permission boundary" },
    { curl: `curl '${ORIGIN}/services?spend=101'`, expect: "402, type OFFER — the hard-ceiling re-authorization boundary" },
    { curl: `curl ${ORIGIN}/pricing`, expect: "200 — model, hardCeiling, binding:false + statement, rates[] keyed by operationId" },
    { curl: `curl -X POST ${ORIGIN}/outcomes/order -d '{"serviceId":"svc-demo-close-books"}'`, expect: "402, type OFFER with pay/work/claim alternatives (test mode — no settlement)" },
  ],
  seed: { version: SEED_VERSION, note: "every record served today carries example: true; retention is disclosed on minted records" },
};
const verifyFaces = { json: verifyDoc, md: mdOfJson(`${NAME} — verify`, verifyDoc), html: htmlOfJson(`${NAME} — verify`, verifyDoc) };

// ── the sibling Noun collections (same envelope law, one implementation:
//    per-noun shim manifests over the vendored collectionDecision) ───────────
function nounShim(path, memberName, collection) {
  return {
    collection: {
      path,
      memberName,
      records: records(collection), // live read — the store is the single source
      filters: ["status", "workspace"],
      blockedScopes: ["admin", "internal"],
      match: (rec, param, value) => String(rec[param]) === value,
      emptyMessage: (param, value) => `no records match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope) => `scope '${scope}' is reserved to the platform — not permitted for your agent class`,
    },
    pricing: manifest.pricing,
  };
}

const COLLECTIONS = {
  "/engagements": { store: "engagements", type: "Engagement", listOp: "listEngagements", getOp: "getEngagement", createOp: "createEngagement" },
  "/work-orders": { store: "work-orders", type: "WorkOrder", listOp: "listWorkOrders", getOp: "getWorkOrder", createOp: "createWorkOrder" },
  "/outcomes": { store: "outcomes", type: "Outcome", listOp: "listOutcomes", getOp: "getOutcome" },
};

/** Operation ids for the paths the axp mount serves (metering seam mapping). */
const AXP_OPERATIONS = {
  "/services": "listCollection",
  "/pricing": "getPricing",
  "/pricing.json": "getPricing",
  "/pricing.md": "getPricing",
  "/pricing.html": "getPricing",
  "/family.json": "getFamilyRegistry",
  "/offer": "getOffer",
};

function methodNotAllowed(path, allow) {
  return envelopeResponse(
    { type: "BLOCKED", reason: `method not served at ${path} — this address answers ${allow}` },
    { status: 405, headers: { allow } },
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const head = request.method === "HEAD";
    trafficEvent(request, path);

    // ── MCP door (one definition — tools read the same store) ──────────────
    // (/pricing — native rates[] — and /openapi.json — native operationIds —
    //  are served by the vendored axp mount below; no site-side faces.)
    if (path === "/mcp") {
      return handleMcp(request, { name: NAME, version: VERSION });
    }

    // ── G2 coordinates + verify export (conneg, three faces) ───────────────
    if (/^\/icp(\.(json|md|html))?$/.test(path)) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      meter("getICP");
      const { face } = negotiate(request, path, {});
      return serveFace(request, url, icpFaces, face, { cleanPath: "/icp" });
    }
    if (/^\/verify(\.(json|md|html))?$/.test(path)) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      meter("getVerify");
      const { face } = negotiate(request, path, {});
      return serveFace(request, url, verifyFaces, face, { cleanPath: "/verify" });
    }

    // ── the outcome verb: 402 OFFER — the whole B2A ladder in one boundary ──
    if (path === "/outcomes/order") {
      if (request.method !== "POST") return methodNotAllowed(path, "POST");
      let body = {};
      try {
        body = await request.json();
      } catch {
        /* an empty order still answers the boundary — the OFFER is the contract */
      }
      const rate = manifest.pricing.rates.find((r) => r.operation === "orderOutcome");
      meter("orderOutcome", { status: "offer-served" });
      moneyEvent("orderOutcome", { serviceId: body?.serviceId });
      receiptSeam("orderOutcome");
      return envelopeResponse(
        offer({
          id: "order-outcome",
          title: "Order a completed, verified outcome",
          price: { unit: rate.unit, price: rate.price, binding: false, note: "stated intent — settlement not activated at wave zero (test-mode stub); no charge is collected" },
          alternatives: LADDER_ALTERNATIVES,
          message: body?.serviceId
            ? `ordering against service ${body.serviceId}: choose a rung — pay (402 metering, test mode), work (earned credits), or claim (human attribution)`
            : "choose a rung — pay (402 metering, test mode), work (earned credits), or claim (human attribution)",
        }),
        { status: 402 },
      );
    }

    // ── the sibling Noun collections + per-id + system-of-record writes ────
    for (const [base, cfg] of Object.entries(COLLECTIONS)) {
      if (path === base) {
        if (request.method === "GET" || head) {
          meter(cfg.listOp);
          const { status, body } = collectionDecision(nounShim(base, "results", cfg.store), url.searchParams);
          return new Response(head ? null : JSON.stringify(body), { status, headers: { ...JSON_CT, vary: "accept" } });
        }
        if (request.method === "POST" && cfg.createOp) {
          let body = {};
          try {
            body = await request.json();
          } catch {
            return envelopeResponse({ type: "BLOCKED", reason: "the create door takes a JSON body" }, { status: 400 });
          }
          const workspace = mintWorkspace(body.workspace);
          const { workspace: _drop, ...fields } = body;
          const record = create(cfg.store, cfg.type, fields, workspace);
          meter(cfg.createOp, { status: "created" });
          return new Response(JSON.stringify({ ...ok([record]), workspace, retention: RETENTION }), { status: 201, headers: JSON_CT });
        }
        return methodNotAllowed(base, cfg.createOp ? "GET, HEAD, POST" : "GET, HEAD");
      }
      if (path.startsWith(`${base}/`)) {
        if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
        const id = decodeURIComponent(path.slice(base.length + 1));
        meter(cfg.getOp);
        const rec = find(cfg.store, id);
        if (rec === undefined) {
          return envelopeResponse({ type: "EMPTY", results: [], message: `no ${cfg.type} with id ${id} — nothing here was deleted; it never existed` }, { status: 404 });
        }
        return new Response(head ? null : JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
      }
    }

    // /services/{id} — the branching collection's per-record door
    if (path.startsWith("/services/")) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      const id = decodeURIComponent(path.slice("/services/".length));
      meter("getService");
      const rec = find("services", id);
      if (rec === undefined) {
        return envelopeResponse({ type: "EMPTY", results: [], message: `no Service with id ${id} — nothing here was deleted; it never existed` }, { status: 404 });
      }
      return new Response(head ? null : JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
    }

    // ── the vendored axp-faces mount (card, llms, /services, family, offer, home) ──
    const hit = await axp(request, env);
    if (hit !== undefined) {
      const op = AXP_OPERATIONS[path];
      if (op !== undefined) meter(op, hit.status === 402 ? { status: "offer-served" } : undefined);
      if (hit.status === 402) {
        moneyEvent(op || "unknown");
        receiptSeam(op || "unknown");
      }
      return hit;
    }

    return envelopeResponse(
      { type: "EMPTY", results: [], message: "no route at this path — nothing here has been deleted; the route was never written" },
      { status: 404 },
    );
  },
};
