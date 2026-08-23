/**
 * worker.mjs — the api.equipment wave-zero worker: one substrate, two plies.
 *
 * Pipeline: seams → the site's own doors (the sibling Noun collections +
 * EAM/CMMS system-of-record writes, the passport doors, /icp, /verify, /mcp)
 * → the vendored axp-faces mount (card with links.verify + g2, openapi with
 * native operationIds, /pricing with the native top-level rates[], llms,
 * /assets, family, offer, three-faced home) → typed 404 EMPTY.
 *
 * Both plies serve from ONE definition: every collection here reads the same
 * store the branching collection and the MCP tools read; the "headless" doors
 * (registerAsset, openWorkOrder, completeWorkOrder) are CRUD on the SAME
 * collections (template §3). There is no second API.
 */

import { createAxpRoutes } from "./axp/routes.js";
import { collectionDecision, envelopeResponse, offer, ok } from "./axp/envelope.js";
import { serveFace, negotiate } from "./axp/conneg.js";
import { manifest, ORIGIN, NAME, VERSION, LADDER_ALTERNATIVES } from "./manifest.mjs";
import { projection } from "./projection.mjs";
import { records, find, passportForAsset, create, completeWorkOrder, mintWorkspace, RETENTION, SEED_VERSION } from "./store.mjs";
import { handleMcp } from "./mcp.mjs";
import { meter, moneyEvent, receiptSeam, trafficEvent } from "./seams.mjs";

const axp = createAxpRoutes(manifest);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

const mdOfJson = (title, obj) => `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
const htmlOfJson = (title, obj) => {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`;
};

// ── the G2 coordinates document (linked from the card as links.icp) ──────────
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
    { curl: `curl ${ORIGIN}/assets`, expect: "200, type OK, labeled example records (GS1 demo prefix 952)" },
    { curl: `curl '${ORIGIN}/assets?class=none'`, expect: "200, type EMPTY — a truthful empty set" },
    { curl: `curl '${ORIGIN}/assets?scope=admin'`, expect: "403, type BLOCKED — a worded permission boundary" },
    { curl: `curl '${ORIGIN}/assets?spend=101'`, expect: "402, type OFFER — the hard-ceiling re-authorization boundary" },
    { curl: `curl ${ORIGIN}/pricing`, expect: "200 — model, hardCeiling, binding:false + statement, rates[] keyed by operationId" },
    { curl: `curl ${ORIGIN}/assets/ast-demo-005/passport`, expect: "200, type OK — a labeled example Digital Product Passport" },
    { curl: `curl -X POST ${ORIGIN}/passports/order -d '{"assetId":"ast-demo-005"}'`, expect: "402, type OFFER with pay/work/claim alternatives (test mode — no settlement)" },
  ],
  seed: { version: SEED_VERSION, note: "every record served today carries example: true; retention is disclosed on minted records" },
};
const verifyFaces = { json: verifyDoc, md: mdOfJson(`${NAME} — verify`, verifyDoc), html: htmlOfJson(`${NAME} — verify`, verifyDoc) };

// ── the sibling Noun collection (same envelope law, one implementation:
//    a per-noun shim manifest over the vendored collectionDecision) ──────────
function nounShim(path, collection, filters) {
  return {
    collection: {
      path,
      memberName: "results",
      records: records(collection), // live read — the store is the single source
      filters,
      blockedScopes: ["admin", "internal"],
      match: (rec, param, value) => String(rec[param]) === value,
      emptyMessage: (param, value) => `no records match ${param}=${value} — a truthful empty set, not an error`,
      blockedReason: (scope) => `scope '${scope}' is reserved to the platform — not permitted for your agent class`,
    },
    pricing: manifest.pricing,
  };
}

/** Operation ids for the paths the axp mount serves (metering seam mapping). */
const AXP_OPERATIONS = {
  "/assets": "listAssets",
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

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const head = request.method === "HEAD";
    trafficEvent(request, path);

    // ── MCP door (one definition — tools read the same store) ──────────────
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
    if (path === "/passports/order") {
      if (request.method !== "POST") return methodNotAllowed(path, "POST");
      const body = (await readJson(request)) ?? {};
      const rate = manifest.pricing.rates.find((r) => r.operation === "orderPassport");
      meter("orderPassport", { status: "offer-served" });
      moneyEvent("orderPassport", { assetId: body?.assetId });
      receiptSeam("orderPassport");
      return envelopeResponse(
        offer({
          id: "order-passport",
          title: "Order a compiled, verified Digital Product Passport dossier",
          price: { unit: rate.unit, price: rate.price, binding: false, note: "stated intent — settlement not activated at wave zero (test-mode stub); no charge is collected" },
          alternatives: LADDER_ALTERNATIVES,
          message: body?.assetId
            ? `ordering a passport dossier for asset ${body.assetId}: choose a rung — pay (402 metering, test mode), work (earned credits), or claim (human attribution). Free path: GET /assets/{assetId}/passport serves labeled example passports keyless.`
            : "choose a rung — pay (402 metering, test mode), work (earned credits), or claim (human attribution). Free path: GET /assets/{assetId}/passport serves labeled example passports keyless.",
        }),
        { status: 402 },
      );
    }

    // ── the Asset registry doors (branching collection GET rides the axp mount) ──
    if (path === "/assets" && request.method === "POST") {
      const body = await readJson(request);
      if (body === undefined) return envelopeResponse({ type: "BLOCKED", reason: "the register door takes a JSON body" }, { status: 400 });
      const workspace = mintWorkspace(body.workspace);
      const { workspace: _drop, ...fields } = body;
      const record = create("assets", "Asset", fields, workspace);
      meter("registerAsset", { status: "created" });
      return new Response(JSON.stringify({ ...ok([record]), workspace, retention: RETENTION }), { status: 201, headers: JSON_CT });
    }

    const passportMatch = path.match(/^\/assets\/([^/]+)\/passport$/);
    if (passportMatch) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      const assetId = decodeURIComponent(passportMatch[1]);
      meter("getPassport");
      const rec = passportForAsset(assetId);
      if (rec === undefined) {
        return envelopeResponse(
          { type: "EMPTY", results: [], message: `no ProductPassport for asset ${assetId} — passports exist only where composed; nothing here was deleted` },
          { status: 404 },
        );
      }
      return new Response(head ? null : JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
    }

    const assetMatch = path.match(/^\/assets\/([^/]+)$/);
    if (assetMatch) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      const id = decodeURIComponent(assetMatch[1]);
      meter("getAsset");
      const rec = find("assets", id);
      if (rec === undefined) {
        return envelopeResponse({ type: "EMPTY", results: [], message: `no Asset with id ${id} — nothing here was deleted; it never existed` }, { status: 404 });
      }
      return new Response(head ? null : JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
    }

    // ── the MaintenanceWorkOrder collection + system-of-record verbs ────────
    if (path === "/work-orders") {
      if (request.method === "GET" || head) {
        meter("listWorkOrders");
        const { status, body } = collectionDecision(nounShim(path, "work-orders", ["status", "workspace"]), url.searchParams);
        return new Response(head ? null : JSON.stringify(body), { status, headers: { ...JSON_CT, vary: "accept" } });
      }
      if (request.method === "POST") {
        const body = await readJson(request);
        if (body === undefined) return envelopeResponse({ type: "BLOCKED", reason: "the open door takes a JSON body" }, { status: 400 });
        const workspace = mintWorkspace(body.workspace);
        const { workspace: _drop, ...fields } = body;
        const record = create("work-orders", "MaintenanceWorkOrder", { status: "open", ...fields }, workspace);
        meter("openWorkOrder", { status: "created" });
        return new Response(JSON.stringify({ ...ok([record]), workspace, retention: RETENTION }), { status: 201, headers: JSON_CT });
      }
      return methodNotAllowed(path, "GET, HEAD, POST");
    }

    const completeMatch = path.match(/^\/work-orders\/([^/]+)\/complete$/);
    if (completeMatch) {
      if (request.method !== "POST") return methodNotAllowed(path, "POST");
      const id = decodeURIComponent(completeMatch[1]);
      meter("completeWorkOrder");
      const rec = completeWorkOrder(id);
      if (rec === undefined) {
        return envelopeResponse({ type: "EMPTY", results: [], message: `no MaintenanceWorkOrder with id ${id} — nothing to complete` }, { status: 404 });
      }
      return new Response(JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
    }

    const woMatch = path.match(/^\/work-orders\/([^/]+)$/);
    if (woMatch) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      const id = decodeURIComponent(woMatch[1]);
      meter("getWorkOrder");
      const rec = find("work-orders", id);
      if (rec === undefined) {
        return envelopeResponse({ type: "EMPTY", results: [], message: `no MaintenanceWorkOrder with id ${id} — nothing here was deleted; it never existed` }, { status: 404 });
      }
      return new Response(head ? null : JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
    }

    // ── the EquipmentModel catalog (labeled synthetic seed — HONESTY note in seed.mjs) ──
    if (path === "/models") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      meter("searchModels");
      let recs = records("models");
      const cls = url.searchParams.get("class");
      const q = url.searchParams.get("q");
      if (cls) recs = recs.filter((r) => r.class === cls);
      if (q) recs = recs.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
      const envelope = recs.length
        ? ok(recs)
        : { type: "EMPTY", results: [], message: "no models match the query — a truthful empty set, not an error" };
      return new Response(head ? null : JSON.stringify(envelope), { status: 200, headers: { ...JSON_CT, vary: "accept" } });
    }

    const modelMatch = path.match(/^\/models\/([^/]+)$/);
    if (modelMatch) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      const id = decodeURIComponent(modelMatch[1]);
      meter("getModel");
      const rec = find("models", id);
      if (rec === undefined) {
        return envelopeResponse({ type: "EMPTY", results: [], message: `no EquipmentModel with id ${id} — nothing here was deleted; it never existed` }, { status: 404 });
      }
      return new Response(head ? null : JSON.stringify(ok([rec])), { status: 200, headers: JSON_CT });
    }

    // ── the vendored axp-faces mount (card, llms, /assets, family, offer, home) ──
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
