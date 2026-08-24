/**
 * worker.js — api.management wave zero: one worker, both plies, quartet
 * first (generated, never hand-rolled), site routes behind it.
 *
 * Pipeline: seams → vendored axp-faces routes (quartet + branching
 * collection + offer + home) → site routes (noun collections, icp, verify,
 * MCP door) → typed EMPTY 404.
 *
 * DOMAIN NOTE: wrangler.jsonc carries NO routes — api.management is
 * estate-controlled but its registrar paper is [UNVERIFIED]; the domain is
 * wired only after control is confirmed (the G3 build is not blocked on it).
 */
import { createAxpRoutes, ok, empty, blocked, envelopeResponse, serveNegotiated, negotiate, linkAlternates, CONNEG_VARY, buildPricingDocument } from "./vendor/axp-faces/index.js";
import { manifest, seed, ORIGIN } from "./manifest.js";
import { PROJECTION } from "./projection.js";
import { API_PRODUCT } from "./substrate.js";
import { handleMcp } from "./mcp.js";
import { meterEvent, moneyEvent, trafficEvent } from "./seams.js";
import { renderDashboardPage } from "./site/dashboard-template.js";
import { dashboardConfig } from "./site/dashboard-config.js";
import { pricingPageHtml } from "./site/pricing-page.js";
import { renderPage } from "./site/style.js";
import { OG_PNG_BASE64 } from "./site/og.js";

/** Decoded once per isolate: the 1200x630 social card served at /og.png. */
const OG_PNG = Uint8Array.from(atob(OG_PNG_BASE64), (c) => c.charCodeAt(0));

const axp = createAxpRoutes(manifest);

const JSON_CT = { "content-type": "application/json; charset=utf-8" };

/** A noun collection endpoint: same envelope law as the generator's own
 *  branching collection — reserved scopes block, filters branch, no match is
 *  a truthful EMPTY. JSON body (an API endpoint, not a document). */
function nounCollection(records, filters, memberName, url, head) {
  const params = url.searchParams;
  const scope = params.get("scope");
  if (scope !== null && manifest.collection.blockedScopes.includes(scope)) {
    return envelopeResponse(blocked(manifest.collection.blockedReason(scope)), { status: 403, headers: { vary: "accept" } });
  }
  let recs = [...records];
  let applied = null;
  for (const f of [...filters, "id"]) {
    const value = params.get(f);
    if (value !== null) {
      recs = recs.filter((r) => String(r[f]) === value);
      applied = [f, value];
    }
  }
  const body =
    recs.length === 0
      ? empty(`no records match ${applied ? applied.join("=") : "the request"} — a truthful empty set, not an error`, { memberName })
      : ok(recs, { memberName });
  return new Response(head ? null : JSON.stringify(body), { status: 200, headers: { ...JSON_CT, vary: "accept" } });
}

/* ── the three-faced documents this site adds beyond the quartet ────────── */

const icpDoc = {
  $context: "https://schema.org.ai",
  substrate: PROJECTION.substrate,
  projection: PROJECTION.brand,
  motion: PROJECTION.motion,
  icp: PROJECTION.icp,
  personas: PROJECTION.personas,
  systems: API_PRODUCT.systems,
  note: "G2 coordinates of this projection — linked from the capability card (links.icp).",
};

const verifyMd = `# Run our tests — api.management

Claims that can be tests are tests. This surface is built to the pinned AXP
spec (apis-ax-axp@2.6.0, digest a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d)
and you can verify it without asking anyone:

\`\`\`sh
# 1. the probe ladder, by hand — keyless first value:
curl ${ORIGIN}/processes                 # 200 OK, typed, substantive
curl "${ORIGIN}/processes?apqc=none"     # 200 EMPTY — truthful, never faked
curl "${ORIGIN}/processes?scope=tenant"  # 403 BLOCKED — worded reason
curl "${ORIGIN}/processes?spend=101"     # 402 OFFER — the whole B2A ladder in one body
curl ${ORIGIN}/pricing                   # the Pricing Document (test-mode, and it says so)

# 2. the full pinned suite, in-process (this example's repo):
#    examples/api.management/test/conformance.test.js runs every pinned
#    requirement against this worker via autonomous-qa (api.qa's runner):
npm test
\`\`\`

The independent verdict lives at https://api.qa/api.management once the
hosted verifier has run against the deployed origin. The card declares no
\`interfaces.testSuite\` yet — that declaration is made only when a
digest-pinned suite document answers at its address (AXP Appendix A.8.5),
never before.
`;

const verifyDoc = {
  page: "run-our-tests",
  pinnedSpec: "apis-ax-axp@2.6.0",
  pinnedSpecDigest: "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d",
  localGate: "examples/api.management/test/conformance.test.js (fail-closed, digest-checked)",
  hostedVerdict: "https://api.qa/api.management",
  probes: ["/processes", "/processes?apqc=none", "/processes?scope=tenant", "/processes?spend=101", "/pricing"],
  testSuiteDeclaration: "withheld until a digest-pinned suite document answers (AXP A.8.5)",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mdOfJson = (title, obj) => `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
const htmlOfJson = (title, obj) =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`;
const icpFaces = { json: icpDoc, md: mdOfJson("api.management — G2 coordinates", icpDoc), html: htmlOfJson("api.management — G2 coordinates", icpDoc) };
// Title is brand-first — the family title order (apis.dev: "apis.dev — run our tests").
// The browser face of /verify wears the site chrome (renderPage) — the
// document itself stays the markdown, set as a plate.
const verifyFaces = {
  json: verifyDoc,
  md: verifyMd,
  html: renderPage({
    title: "api.management — run our tests",
    description: "The /verify export: the pinned conformance spec, the probes, and the commands to run the gate yourself.",
    path: "/verify",
    body: `<main><div class="wrap"><pre class="verify-pre">${esc(verifyMd)}</pre></div></main>`,
  }),
};

const ICP_PATHS = new Set(["/icp", "/icp.json", "/icp.md", "/icp.html"]);
const VERIFY_PATHS = new Set(["/verify", "/verify.json", "/verify.md", "/verify.html"]);
const NOUN_ROUTES = {
  "/kpis": { records: seed.kpis, filters: ["kind", "property"], memberName: "kpis", operation: "listKPIs" },
  "/objectives": { records: seed.objectives, filters: ["quarter", "status"], memberName: "objectives", operation: "listObjectives" },
  "/properties": { records: seed.properties, filters: ["lifecycle"], memberName: "properties", operation: "listProperties" },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const respond = (response) => {
      trafficEvent(request, path, response.status);
      if (response.status === 402) moneyEvent("offer-presented", { path });
      return response;
    };

    // 0 — the /e analytics beacon (the workers.do zone injects an analytics
    // snippet into HTML responses on this custom hostname; it POSTs here).
    // Accept and drop — 204, nothing stored — so every pageview does not log
    // a 405 in the browser console. Not an API operation; not on the card.
    if (path === "/e" && request.method === "POST") {
      return new Response(null, { status: 204 });
    }

    // 0.5 — /pricing, html register only: the designed rate-card page
    // (site/pricing-page.js — family anatomy shared with apis.dev). The
    // machine registers (/pricing json + md) stay generator-emitted and
    // untouched: only the browser-negotiated html face is intercepted, and
    // the page renders the SAME buildPricingDocument output the json face
    // serves — one truth, two registers. Conneg law holds: Link alternates
    // + Vary sent, HEAD mirrors GET.
    if ((path === "/pricing" || path === "/pricing.html") && (request.method === "GET" || request.method === "HEAD")) {
      const { face } = negotiate(request, path);
      if (face === "html") {
        const html = pricingPageHtml(buildPricingDocument(manifest), manifest.pricing);
        return respond(
          new Response(request.method === "HEAD" ? null : html, {
            headers: { "content-type": "text/html; charset=utf-8", link: linkAlternates("/pricing"), vary: CONNEG_VARY },
          }),
        );
      }
    }

    // 1 — the generated AXP faces (quartet, branching collection, offer, home)
    const hit = await axp(request, env);
    if (hit !== undefined) {
      if (path === manifest.collection.path && (request.method === "GET" || request.method === "HEAD") && hit.status === 200) {
        meterEvent("listProcesses", { shape: "anon-sandbox" });
      }
      return respond(hit);
    }

    // 2 — the MCP door (declared on the card because it is mounted here)
    if (path === "/mcp") {
      if (request.method !== "POST") {
        return respond(
          envelopeResponse(blocked(`method ${request.method} is not served at /mcp — the MCP door answers POST (JSON-RPC 2.0)`), {
            status: 405,
            headers: { allow: "POST" },
          }),
        );
      }
      return respond(await handleMcp(request, manifest, seed));
    }

    // 3 — site routes: GET/HEAD only past here
    if (request.method !== "GET" && request.method !== "HEAD") {
      return respond(
        envelopeResponse(blocked(`method ${request.method} is not served at ${path} — this address answers GET and HEAD`), {
          status: 405,
          headers: { allow: "GET, HEAD" },
        }),
      );
    }
    const head = request.method === "HEAD";

    const noun = NOUN_ROUTES[path];
    if (noun) {
      const res = nounCollection(noun.records, noun.filters, noun.memberName, url, head);
      if (res.status === 200) meterEvent(noun.operation, { shape: "anon-sandbox" });
      return respond(res);
    }

    // The social card (family og pattern — scripts/gen-og.mjs renders it
    // from the site's own dark tokens; base64-inlined, no static assets).
    if (path === "/og.png") {
      return respond(
        new Response(head ? null : OG_PNG, {
          status: 200,
          headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
        }),
      );
    }

    if (ICP_PATHS.has(path)) return respond(await serveNegotiated(request, url, icpFaces));
    if (VERIFY_PATHS.has(path)) return respond(await serveNegotiated(request, url, verifyFaces));

    // The management console (browser face, v1) — the api.management
    // instance of the abstract dashboard template shared with apis.dev
    // (examples/DASHBOARD-FAMILY.md). Chrome is demo-labeled in the page;
    // the inventory ledger is the estate's real register. Deliberately NOT
    // a declared API operation: a human document like the home page, not a
    // priced machine op (no operationId, no rate row).
    if (path === "/console") {
      return respond(
        new Response(head ? null : renderDashboardPage(dashboardConfig), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
    // Family alias: apis.dev mounts the template at /dashboard; here the
    // operative noun is /console (recorded in DASHBOARD-FAMILY.md).
    if (path === "/dashboard") {
      return respond(new Response(null, { status: 301, headers: { location: "/console" } }));
    }

    // 4 — typed EMPTY 404: nothing here has been deleted; the route was never written
    return respond(
      envelopeResponse(empty(`no route at ${path} — nothing here has been deleted; the route was never written`), { status: 404 }),
    );
  },
};
