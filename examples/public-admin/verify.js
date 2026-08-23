/**
 * verify.js — the published-verification surfaces: "trust us" → "run this."
 *
 *   GET /verify/suite.json  the digest-pinned public-contract suite — an
 *                           api.qa suite@1 document (declarative GET rows,
 *                           same-origin), runnable by anyone
 *   GET /verify (+faces)    the "Run our tests" page
 *
 * NOTE (P0-ledger honesty, carried from the api.lawyer reference and the
 * batch-2 ruling): the capability card does NOT declare
 * `interfaces.testSuite` — the declaration stays undeclared until the suite
 * is digest-pinned in a dialect that covers the POST doors (/renewals,
 * /mcp); the GET-only suite@1 dialect cannot, and a declaration arms strict
 * capability coverage. The suite ships and serves; the declaration lands
 * with an executable (vitest@1) suite.
 */

import { serveFace, negotiate } from "./axp/index.js";
import { ORIGIN } from "./manifest.js";

const suiteDocument = {
  $type: "Suite",
  name: "public-admin",
  version: "1",
  description:
    "The public-admin (placeholder address) public-contract suite (api.qa/suite@1): declarative GET rows over " +
    "the live doors — the AXP quartet shapes, the branching /registrations envelope (OK | EMPTY | BLOCKED | " +
    "OFFER on one pathname), the metered Pricing Document with its inline operation-keyed rates[] and " +
    "stated-intent binding, the batch-2 ruled card placements (top-level g2, links.verify), the REAL " +
    "provenance-labeled USAspending award corpus, and the labeled-example-data honesty rows. Runnable by " +
    "anyone: npx autonomous-qa verify https://public-admin.org.ai, or plain curl.",
  environments: {
    live: { vars: { baseUrl: "https://public-admin.org.ai" } },
  },
  requirements: [
    { id: "llms-front-door", kind: "endpoint", method: "GET", path: "/llms.txt",
      expect: { status: 200, contentTypeIncludes: "text/markdown" } },
    { id: "capability-card", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [
        { path: "name", equals: "public-admin.org.ai" },
        { path: "openapi", equals: "https://public-admin.org.ai/openapi.json" },
        { path: "probes.pricing.url", equals: "/pricing" },
      ] } },
    { id: "card-g2-top-level", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [
        { path: "g2.systems", exists: true },
        { path: "g2.icp", exists: true },
        { path: "g2.personas", exists: true },
      ] } },
    { id: "card-links-verify", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [{ path: "links.verify", equals: "https://public-admin.org.ai/verify" }] } },
    { id: "card-mcp-mounted", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [{ path: "interfaces.mcp.url", equals: "https://public-admin.org.ai/mcp" }] } },
    { id: "openapi-contract", kind: "endpoint", method: "GET", path: "/openapi.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "openapi", equals: "3.1.0" }] } },
    { id: "pricing-metered-truth", kind: "endpoint", method: "GET", path: "/pricing",
      expect: { status: 200, paths: [
        { path: "model", equals: "metered" },
        { path: "hardCeiling", equals: 100 },
        { path: "binding", equals: false },
      ] } },
    { id: "pricing-rates-inline", kind: "endpoint", method: "GET", path: "/pricing",
      expect: { status: 200, paths: [{ path: "rates", exists: true }] } },
    { id: "registrations-keyless-ok", kind: "endpoint", method: "GET", path: "/registrations",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "registrations-typed-empty", kind: "endpoint", method: "GET", path: "/registrations?jurisdiction=none",
      expect: { status: 200, paths: [{ path: "type", equals: "EMPTY" }] } },
    { id: "registrations-typed-blocked", kind: "endpoint", method: "GET", path: "/registrations?scope=tenant",
      expect: { status: 403, paths: [{ path: "type", equals: "BLOCKED" }] } },
    { id: "registrations-over-ceiling-offer", kind: "endpoint", method: "GET", path: "/registrations?spend=101",
      expect: { status: 402, paths: [{ path: "type", equals: "OFFER" }] } },
    { id: "registration-record-labeled-example", kind: "endpoint", method: "GET", path: "/registrations/reg_01_cobbleharbor_sam-uei",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "registration.example", equals: true },
      ] } },
    { id: "filings-keyless-ok", kind: "endpoint", method: "GET", path: "/filings",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "awards-real-with-provenance", kind: "endpoint", method: "GET", path: "/awards",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "provenance.source", exists: true },
      ] } },
    { id: "award-record-real-not-example", kind: "endpoint", method: "GET", path: "/awards/awd_usaspending_01",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "award.real", equals: true },
        { path: "award.provenance.license", exists: true },
      ] } },
    { id: "permits-keyless-ok", kind: "endpoint", method: "GET", path: "/permits",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "unknown-id-is-typed", kind: "endpoint", method: "GET", path: "/registrations/reg_probe_none",
      expect: { status: 404, paths: [{ path: "type", equals: "EMPTY" }] } },
    { id: "offer-door-402", kind: "endpoint", method: "GET", path: "/offer",
      expect: { status: 402, paths: [{ path: "type", equals: "OFFER" }] } },
    { id: "icp-self-classification", kind: "endpoint", method: "GET", path: "/icp.json",
      expect: { status: 200, paths: [{ path: "agent_classes", exists: true }] } },
    { id: "healthz-typed-ok", kind: "endpoint", method: "GET", path: "/healthz",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "home-json-face", kind: "endpoint", method: "GET", path: "/index.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "name", equals: "public-admin.org.ai" }] } },
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
  "contract — the typed envelopes, the branching collection, the pricing truth with inline rates[], the " +
  "ruled card placements, the real provenance-labeled award corpus, the labeled example data — and the " +
  "digest pins its bytes: a suite that changed is a suite you can see changed.";

function verifyMd(digest) {
  return `# public-admin — run our tests

${verifyIntro}

## The suite

- Document: ${ORIGIN}/verify/suite.json (api.qa/suite@1 — declarative GET rows, same-origin)
- Digest: \`${digest}\` (sha256 over the exact served bytes)

## Run it

\`\`\`sh
# the independent verifier (hosted verdict: https://api.qa/public-admin.org.ai)
npx autonomous-qa verify https://public-admin.org.ai

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
    name: "public-admin — run our tests",
    description: verifyIntro,
    suite: `${ORIGIN}/verify/suite.json`,
    digest,
    runner: "api.qa/suite@1",
    hostedVerdict: "https://api.qa/public-admin.org.ai",
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
<html lang="en"><head><meta charset="utf-8"><title>public-admin — run our tests</title></head>
<body>
<h1>Run our tests</h1>
<p>${esc(verifyIntro)}</p>
<ul>
<li>Document: <a href="/verify/suite.json">${esc(ORIGIN)}/verify/suite.json</a> (api.qa/suite@1)</li>
<li>Digest: <code>${esc(digest)}</code></li>
<li>Hosted verdict: <a href="https://api.qa/public-admin.org.ai">https://api.qa/public-admin.org.ai</a></li>
</ul>
<pre>npx autonomous-qa verify https://public-admin.org.ai
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
