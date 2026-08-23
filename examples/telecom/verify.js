/**
 * verify.js — the published-verification surfaces: "trust us" → "run this."
 *
 *   GET /verify/suite.json  the digest-pinned public-contract suite — an
 *                           api.qa suite@1 document (declarative GET rows,
 *                           same-origin), runnable by anyone
 *   GET /verify (+faces)    the "Run our tests" page
 *
 * NOTE (P0-ledger honesty, carried from the api.lawyer reference and the
 * batch rulings): the capability card does NOT declare
 * `interfaces.testSuite` — the declaration stays undeclared until the suite
 * is digest-pinned in a dialect that covers the POST doors (/ports, /mcp);
 * the GET-only suite@1 dialect cannot, and a declaration arms strict
 * capability coverage. The suite ships and serves; the declaration lands
 * with an executable (vitest@1) suite.
 */

import { serveFace, negotiate } from "./axp/index.js";
import { ORIGIN } from "./manifest.js";

const suiteDocument = {
  $type: "Suite",
  name: "telecom",
  version: "1",
  description:
    "The telecom (placeholder address) public-contract suite (api.qa/suite@1): declarative GET rows over " +
    "the live doors — the AXP quartet shapes, the branching /port-orders envelope (OK | EMPTY | BLOCKED | " +
    "OFFER on one pathname), the metered Pricing Document with its native top-level operation-keyed rates[] " +
    "and stated-intent binding, the native card placements (top-level g2, links.verify), the REAL " +
    "provenance-labeled NANPA numbering corpus, and the labeled-example-data honesty rows. Runnable by " +
    "anyone: npx autonomous-qa verify https://telecom.org.ai, or plain curl.",
  environments: {
    live: { vars: { baseUrl: "https://telecom.org.ai" } },
  },
  requirements: [
    { id: "llms-front-door", kind: "endpoint", method: "GET", path: "/llms.txt",
      expect: { status: 200, contentTypeIncludes: "text/markdown" } },
    { id: "capability-card", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [
        { path: "name", equals: "telecom.org.ai" },
        { path: "openapi", equals: "https://telecom.org.ai/openapi.json" },
        { path: "probes.pricing.url", equals: "/pricing" },
      ] } },
    { id: "card-g2-top-level", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [
        { path: "g2.systems", exists: true },
        { path: "g2.icp", exists: true },
        { path: "g2.personas", exists: true },
      ] } },
    { id: "card-links-verify", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [{ path: "links.verify", equals: "https://telecom.org.ai/verify" }] } },
    { id: "card-mcp-mounted", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [{ path: "interfaces.mcp.url", equals: "https://telecom.org.ai/mcp" }] } },
    { id: "openapi-contract", kind: "endpoint", method: "GET", path: "/openapi.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "openapi", equals: "3.1.0" }] } },
    { id: "pricing-metered-truth", kind: "endpoint", method: "GET", path: "/pricing",
      expect: { status: 200, paths: [
        { path: "model", equals: "metered" },
        { path: "hardCeiling", equals: 100 },
        { path: "binding", equals: false },
      ] } },
    { id: "pricing-rates-native-top-level", kind: "endpoint", method: "GET", path: "/pricing",
      expect: { status: 200, paths: [{ path: "rates", exists: true }] } },
    { id: "port-orders-keyless-ok", kind: "endpoint", method: "GET", path: "/port-orders",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "port-orders-typed-empty", kind: "endpoint", method: "GET", path: "/port-orders?status=none",
      expect: { status: 200, paths: [{ path: "type", equals: "EMPTY" }] } },
    { id: "port-orders-typed-blocked", kind: "endpoint", method: "GET", path: "/port-orders?scope=tenant",
      expect: { status: 403, paths: [{ path: "type", equals: "BLOCKED" }] } },
    { id: "port-orders-over-ceiling-offer", kind: "endpoint", method: "GET", path: "/port-orders?spend=101",
      expect: { status: 402, paths: [{ path: "type", equals: "OFFER" }] } },
    { id: "port-order-labeled-example", kind: "endpoint", method: "GET", path: "/port-orders/prt_01",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "portOrder.example", equals: true },
      ] } },
    { id: "numbering-real-with-provenance", kind: "endpoint", method: "GET", path: "/numbering-resources",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "provenance.source", exists: true },
      ] } },
    { id: "numbering-record-real-not-example", kind: "endpoint", method: "GET", path: "/numbering-resources/npa_201",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "numberingResource.real", equals: true },
        { path: "provenance.publisher", exists: true },
      ] } },
    { id: "coverage-keyless-ok", kind: "endpoint", method: "GET", path: "/coverage-records",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "usage-keyless-ok", kind: "endpoint", method: "GET", path: "/usage-records",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "cycleSummary.example", equals: true },
      ] } },
    { id: "unknown-id-is-typed", kind: "endpoint", method: "GET", path: "/port-orders/prt_probe_none",
      expect: { status: 404, paths: [{ path: "type", equals: "EMPTY" }] } },
    { id: "offer-door-402", kind: "endpoint", method: "GET", path: "/offer",
      expect: { status: 402, paths: [{ path: "type", equals: "OFFER" }] } },
    { id: "icp-self-classification", kind: "endpoint", method: "GET", path: "/icp.json",
      expect: { status: 200, paths: [{ path: "agent_classes", exists: true }] } },
    { id: "healthz-typed-ok", kind: "endpoint", method: "GET", path: "/healthz",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "home-json-face", kind: "endpoint", method: "GET", path: "/index.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "name", equals: "telecom.org.ai" }] } },
    { id: "home-md-face", kind: "endpoint", method: "GET", path: "/index.md",
      expect: { status: 200, contentTypeIncludes: "text/markdown" } },
    { id: "suite-self-serving", kind: "endpoint", method: "GET", path: "/verify/suite.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "$type", equals: "Suite" }] } },
  ],
};

/** The exact served bytes — the digest is over THIS string. */
export const suiteText = JSON.stringify(suiteDocument, null, 2);
export { suiteDocument };

let cachedDigest;

/** sha256 over the served suite bytes, "sha256:<64 hex>". */
export async function suiteDigest() {
  if (cachedDigest) return cachedDigest;
  const bytes = new TextEncoder().encode(suiteText);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  cachedDigest = `sha256:${hex}`;
  return cachedDigest;
}

const verifyIntro =
  "Every claim this surface makes in copy is a claim you can run. The suite below discloses the public " +
  "contract — the typed envelopes, the branching collection, the pricing truth with native top-level rates[], " +
  "the native card placements, the real provenance-labeled numbering corpus, the labeled example data — and " +
  "the digest pins its bytes: a suite that changed is a suite you can see changed.";

function verifyMd(digest) {
  return `# telecom — run our tests

${verifyIntro}

## The suite

- Document: ${ORIGIN}/verify/suite.json (api.qa/suite@1 — declarative GET rows, same-origin)
- Digest: \`${digest}\` (sha256 over the exact served bytes)

## Run it

\`\`\`sh
# the independent verifier (hosted verdict: https://api.qa/telecom.org.ai)
npx autonomous-qa verify https://telecom.org.ai

# plain curl — every row is one keyless GET
curl ${ORIGIN}/verify/suite.json
\`\`\`

## The AXP conformance gate

The build gates on the pinned AXP spec (apis-ax-axp@2.6.0, digest
a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d) — the same
digest-locked requirements the deployed verifier at https://api.qa runs.
`;
}

function verifyJsonDoc(digest) {
  return {
    $context: "https://schema.org.ai",
    $type: "VerificationInstructions",
    name: "telecom — run our tests",
    description: verifyIntro,
    suite: `${ORIGIN}/verify/suite.json`,
    digest,
    runner: "api.qa/suite@1",
    hostedVerdict: "https://api.qa/telecom.org.ai",
    pinnedSpec: {
      name: "apis-ax-axp",
      version: "2.6.0",
      digest: "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d",
    },
  };
}

function verifyHtml(digest) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>telecom — run our tests</title></head>
<body>
<h1>Run our tests</h1>
<p>${esc(verifyIntro)}</p>
<ul>
<li>Document: <a href="/verify/suite.json">${esc(ORIGIN)}/verify/suite.json</a> (api.qa/suite@1)</li>
<li>Digest: <code>${esc(digest)}</code></li>
<li>Hosted verdict: <a href="https://api.qa/telecom.org.ai">https://api.qa/telecom.org.ai</a></li>
</ul>
<pre>npx autonomous-qa verify https://telecom.org.ai
curl ${esc(ORIGIN)}/verify/suite.json</pre>
</body></html>
`;
}

/** Handle GET/HEAD for /verify, /verify.(html|json|md), /verify/suite.json — else undefined. */
export async function verifyRoutes(request, url) {
  const path = url.pathname;
  const head = request.method === "HEAD";
  if (path === "/verify/suite.json") {
    return new Response(head ? null : suiteText, { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
  }
  if (path === "/verify" || path === "/verify.html" || path === "/verify.json" || path === "/verify.md") {
    const digest = await suiteDigest();
    const faces = { html: verifyHtml(digest), md: verifyMd(digest), json: verifyJsonDoc(digest) };
    const { face } = negotiate(request, path);
    return serveFace(request, url, faces, face, { cleanPath: "/verify" });
  }
  return undefined;
}
