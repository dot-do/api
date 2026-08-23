/**
 * verify.js — the published-verification surfaces: "trust us" → "run this."
 *
 *   GET /verify/suite.json  the digest-pinned public-contract suite — an
 *                           api.qa suite@1 document (declarative GET rows,
 *                           same-origin), runnable by anyone
 *   GET /verify (+faces)    the "Run our tests" page
 *
 * NOTE (batch-2 ruling, carried): the capability card does NOT declare
 * `interfaces.testSuite` — it stays undeclared until digest-pinned as an
 * executable suite. Declaring it today would arm check-published-test-suite
 * AND check-capability-coverage, and this contract's payable doors
 * (POST /credit-files/pulls, POST /originations) and the MCP door cannot be
 * covered by the GET-only suite@1 dialect — a declaration would fail closed
 * on coverage. The suite ships and serves; the declaration lands with an
 * executable (vitest@1) suite.
 */

import { serveFace, negotiate } from "./axp/index.js";
import { ORIGIN } from "./manifest.js";

const suiteDocument = {
  $type: "Suite",
  name: "apis-finance",
  version: "1",
  description:
    "The apis.finance public-contract suite (api.qa/suite@1): declarative GET rows over the live doors — " +
    "the AXP quartet shapes, the branching /payment-messages envelope (OK | EMPTY | BLOCKED | OFFER on one " +
    "pathname), the metered Pricing Document with top-level operation-keyed rates[] and its stated-intent " +
    "binding, the bridged card members (g2, links.verify), operationId-bearing OpenAPI routes, the G2 " +
    "self-classification surface, and the labeled-example-data honesty rows. Runnable by anyone: " +
    "npx autonomous-qa verify https://apis.finance, or plain curl.",
  environments: {
    live: { vars: { baseUrl: "https://apis.finance" } },
  },
  requirements: [
    { id: "llms-front-door", kind: "endpoint", method: "GET", path: "/llms.txt",
      expect: { status: 200, contentTypeIncludes: "text/markdown" } },
    { id: "capability-card", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [
        { path: "name", equals: "apis.finance" },
        { path: "openapi", equals: "https://apis.finance/openapi.json" },
        { path: "probes.pricing.url", equals: "/pricing" },
      ] } },
    { id: "card-g2-top-level", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [
        { path: "g2.$type", equals: "ICP" },
        { path: "g2.substrate", equals: "banking-payments" },
      ] } },
    { id: "card-links-verify", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [{ path: "links.verify", equals: "https://apis.finance/verify" }] } },
    { id: "card-mcp-mounted", kind: "endpoint", method: "GET", path: "/.well-known/agents.json",
      expect: { status: 200, paths: [{ path: "interfaces.mcp.url", equals: "https://apis.finance/mcp" }] } },
    { id: "openapi-contract", kind: "endpoint", method: "GET", path: "/openapi.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "openapi", equals: "3.1.0" }] } },
    { id: "openapi-operationid-on-routes", kind: "endpoint", method: "GET", path: "/openapi.json",
      expect: { status: 200, paths: [
        { path: "paths./loans.get.operationId", equals: "listLoans" },
        { path: "paths./originations.post.operationId", equals: "submitOrigination" },
        { path: "paths./healthz.get.operationId", equals: "getHealth" },
      ] } },
    { id: "pricing-metered-truth", kind: "endpoint", method: "GET", path: "/pricing",
      expect: { status: 200, paths: [
        { path: "model", equals: "metered" },
        { path: "hardCeiling", equals: 100 },
        { path: "binding", equals: false },
      ] } },
    { id: "pricing-rates-top-level", kind: "endpoint", method: "GET", path: "/pricing",
      expect: { status: 200, paths: [
        { path: "rates", exists: true },
        { path: "rates.0.operation", equals: "listCollection" },
      ] } },
    { id: "messages-keyless-ok", kind: "endpoint", method: "GET", path: "/payment-messages",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "messages-typed-empty", kind: "endpoint", method: "GET", path: "/payment-messages?type=none",
      expect: { status: 200, paths: [{ path: "type", equals: "EMPTY" }] } },
    { id: "messages-typed-blocked", kind: "endpoint", method: "GET", path: "/payment-messages?scope=tenant",
      expect: { status: 403, paths: [{ path: "type", equals: "BLOCKED" }] } },
    { id: "messages-over-ceiling-offer", kind: "endpoint", method: "GET", path: "/payment-messages?spend=101",
      expect: { status: 402, paths: [{ path: "type", equals: "OFFER" }] } },
    { id: "message-record-labeled-example", kind: "endpoint", method: "GET", path: "/payment-messages/pm_camt053_2026-08",
      expect: { status: 200, paths: [
        { path: "type", equals: "OK" },
        { path: "message.example", equals: true },
      ] } },
    { id: "loans-keyless-ok", kind: "endpoint", method: "GET", path: "/loans",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "loan-unknown-is-typed", kind: "endpoint", method: "GET", path: "/loans/loan_probe_none",
      expect: { status: 404, paths: [{ path: "type", equals: "EMPTY" }] } },
    { id: "credit-files-keyless-ok", kind: "endpoint", method: "GET", path: "/credit-files",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "lenders-keyless-ok", kind: "endpoint", method: "GET", path: "/lenders",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "offer-door-402", kind: "endpoint", method: "GET", path: "/offer",
      expect: { status: 402, paths: [{ path: "type", equals: "OFFER" }] } },
    { id: "icp-self-classification", kind: "endpoint", method: "GET", path: "/icp.json",
      expect: { status: 200, paths: [{ path: "agent_classes", exists: true }] } },
    { id: "healthz-typed-ok", kind: "endpoint", method: "GET", path: "/healthz",
      expect: { status: 200, paths: [{ path: "type", equals: "OK" }] } },
    { id: "home-json-face", kind: "endpoint", method: "GET", path: "/index.json",
      expect: { status: 200, contentTypeIncludes: "application/json", paths: [{ path: "name", equals: "apis.finance" }] } },
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
  "contract — the typed envelopes, the branching collection, the pricing truth with its top-level rate rows, " +
  "the bridged card members, the labeled example data — and the digest pins its bytes: a suite that changed " +
  "is a suite you can see changed.";

function verifyMd(digest) {
  return `# apis.finance — run our tests

${verifyIntro}

## The suite

- Document: ${ORIGIN}/verify/suite.json (api.qa/suite@1 — declarative GET rows, same-origin)
- Digest: \`${digest}\` (sha256 over the exact served bytes)

## Run it

\`\`\`sh
# the independent verifier (hosted verdict: https://api.qa/apis.finance)
npx autonomous-qa verify https://apis.finance

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
    name: "apis.finance — run our tests",
    description: verifyIntro,
    suite: `${ORIGIN}/verify/suite.json`,
    digest,
    runner: "api.qa/suite@1",
    hostedVerdict: "https://api.qa/apis.finance",
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
<html lang="en"><head><meta charset="utf-8"><title>apis.finance — run our tests</title></head>
<body>
<h1>Run our tests</h1>
<p>${esc(verifyIntro)}</p>
<ul>
<li>Document: <a href="/verify/suite.json">${esc(ORIGIN)}/verify/suite.json</a> (api.qa/suite@1)</li>
<li>Digest: <code>${esc(digest)}</code></li>
<li>Hosted verdict: <a href="https://api.qa/apis.finance">https://api.qa/apis.finance</a></li>
</ul>
<pre>npx autonomous-qa verify https://apis.finance
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
