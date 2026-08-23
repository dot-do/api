/**
 * manifest.js — the ONE site manifest: every machine face (card, openapi,
 * pricing, llms.txt, family registry, branching collection, offer boundary,
 * three-faced home) is generated from this via the vendored axp-faces at the
 * PINS.json digest (axp-faces 0.2.0, apis-ax-axp@2.6.0 +
 * axp-ext-rates-g2@0.1.0). Nouns/operations come from product.js (G3);
 * brand/motion/offer posture from projection.js (G4).
 *
 * The four ratified extension members are NATIVE manifest inputs at their
 * ruled placements (no site-side bridges): pricing.rates (top-level rates[]
 * in the Pricing Document), routes[].operationId + collection.operationId
 * (the ONE cross-face operation name), verifyUrl (card links.verify), and
 * g2 (top-level card object, carried verbatim).
 */

import { defineSiteManifest } from "./axp/index.js";
import { records } from "./store.js";
import { tools } from "./mcp.js";
import { projection } from "./projection.js";

export const ORIGIN = "https://api.services";
export const NAME = "api.services";
export const VERSION = "0.1.0";

const DESCRIPTION =
  "The service-delivery demand rail: Service, Engagement, WorkOrder, and completed verified Outcome records — one typed, keyless-first surface for machine callers, with PSA/FSM system-of-record doors on the same collections.";

/** The whole B2A ladder in one OFFER (template §5.1) — every non-live rung is
 *  labeled as such: stubs, never fake billing. */
export const LADDER_ALTERNATIVES = [
  {
    kind: "pay",
    description:
      "402 metering against machine identity (id.org.ai grain) at the /pricing rate card. Wave zero: the boundary is served and typed, settlement is NOT activated — no charge is collected (test-mode stub).",
    pricing: `${ORIGIN}/pricing`,
  },
  {
    kind: "work",
    description: "earn .ax-ledger credits via proof-of-work (ladder rung 1). Not yet live — advertised for discovery; nothing is charged.",
  },
  {
    kind: "claim",
    description: "a human claims this agent workspace; attribution extends tenure (ladder rung 2). Not yet live.",
  },
];

const llmsBody = `# api.services — the service-delivery demand rail

Machine face for the Service Delivery function (one of the 13 APQC Functions):
Service records at the NAPCS sellable-outcome grain, Engagement (SOW),
WorkOrder (O*NET task grain), and completed verified Outcome records. The
PSA/FSM system-of-record doors are the SAME collections — one definition,
two plies.

All data on this surface today is a labeled example corpus (every record
carries \`example: true\`); the sandbox is the real product over simulated
data, keyless, with disclosed retention.

## Quickstart (keyless — the anon sandbox is the floor)

\`\`\`sh
curl ${ORIGIN}/services              # typed OK envelope, labeled example data
curl ${ORIGIN}/services?category=field
curl ${ORIGIN}/engagements           # PSA system-of-record collection
curl ${ORIGIN}/work-orders           # FSM delivery decomposition
curl ${ORIGIN}/outcomes              # completed, verified deliverables
curl ${ORIGIN}/pricing               # the rate card (rates[] keyed by operationId)
curl -X POST ${ORIGIN}/outcomes/order -d '{"serviceId":"svc-demo-close-books"}'   # 402 OFFER — the whole B2A ladder in one boundary
\`\`\`

## Doors

- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- icp (G2 coordinates): ${ORIGIN}/icp
- verify (run our tests): ${ORIGIN}/verify
- mcp: POST ${ORIGIN}/mcp (JSON-RPC: initialize, tools/list, tools/call)

## Family

- apis.ax — the agent-first register: https://apis.ax/llms.txt
- api.qa — the independent verifier: https://api.qa
`;

const homeHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>api.services</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.25rem;color:#111;background:#fff}code,pre{background:#f4f4f4;border-radius:4px;padding:.1em .35em}pre{padding:1em;overflow-x:auto}h1{font-size:1.6rem}a{color:#0645ad}.note{color:#555;font-size:.9em}</style></head>
<body>
<h1>api.services</h1>
<p>The service-delivery demand rail: <code>Service</code>, <code>Engagement</code>, <code>WorkOrder</code>, and completed verified <code>Outcome</code> records — one typed, keyless-first surface for machine callers.</p>
<pre>curl ${ORIGIN}/services
curl ${ORIGIN}/pricing</pre>
<p>Machine faces: <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/llms.txt">llms.txt</a> · <a href="/verify">verify</a></p>
<p class="note">Everything served today is a labeled example corpus (every record carries <code>example: true</code>) — the live product surface over simulated data, never a faked demo. Prices are stated intent (<code>binding: false</code>); settlement is not activated.</p>
</body></html>
`;

const homeMd = `# api.services

The service-delivery demand rail — same truth as the page, token-cheap.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify

All records served today are labeled example data (\`example: true\`).
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: NAME,
  version: VERSION,
  description: DESCRIPTION,

  // The ONE branching collection (Clauses 4 + 7): keyless OK with labeled
  // seed substance; ?category=none / ?tag=none → EMPTY; ?scope=admin|internal → BLOCKED.
  collection: {
    path: "/services",
    // axp-ext-rates-g2 §1: the branching collection's canonical operationId
    // (the generator default, declared explicitly because a rate row keys on it).
    operationId: "listCollection",
    memberName: "results",
    summary: "Service records at the NAPCS sellable-outcome grain — typed OK | EMPTY | BLOCKED | OFFER, branching on the query",
    records: records("services"),
    filters: ["category", "tag"],
    match: (rec, param, value) => String(rec[param]) === value,
  },

  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "usd-per-month",
    price: 0.001,
    binding: false,
    statement:
      "Wave-zero surface: every 402 boundary is served and typed, but settlement is not activated — no charge is collected today. Prices are stated intent, not bound terms; the anon sandbox floor is free: every operation is exercisable keyless against labeled example data at no charge.",

    // The operation rate card (axp-ext-rates-g2@0.2.0 §2) — NATIVE manifest
    // input; the generator emits it TOP-LEVEL in the Pricing Document and
    // validates every row (operation ⊆ declared operationIds, price >= 0,
    // included/freeQuota per §2.5, reserved names refused). Zero-price rows
    // carry included: "unlimited" (the §2.5 allowance form); freeQuota is the
    // legacy monthly shorthand on the metered rows.
    rates: [
      { operation: "listCollection", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getService", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "listEngagements", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "getEngagement", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "createEngagement", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
      { operation: "listWorkOrders", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "getWorkOrder", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "createWorkOrder", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
      { operation: "listOutcomes", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "getOutcome", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      {
        operation: "orderOutcome",
        unit: "usd-per-outcome",
        price: 25,
        note: "per completed, verified outcome — no free quota; quoted in the 402 OFFER; stated intent (binding: false), settlement not activated at wave zero",
      },
      { operation: "getPricing", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getFamilyRegistry", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getOffer", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getICP", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getVerify", unit: "usd-per-call", price: 0, included: "unlimited" },
    ],

    offers: [
      {
        id: "b2a-metered",
        title: "Metered access (agent-first)",
        price: { model: "metered", hardCeiling: 100, unit: "usd-per-month" },
        alternatives: LADDER_ALTERNATIVES,
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  // Extra LIVE routes (presence-when-true — every one is served in worker.js).
  // axp-ext-rates-g2 §1: each route carries its canonical camelCase-verb
  // operationId NATIVELY — the generator passes it through to the OpenAPI
  // contract and cross-checks the rate card against the declared set.
  routes: [
    { method: "GET", path: "/services/{id}", operationId: "getService", summary: "One Service record by id" },
    {
      method: "GET",
      path: "/engagements",
      operationId: "listEngagements",
      summary: "Engagement (SOW) records — the PSA system-of-record collection (headless ply, same substrate)",
      params: [{ name: "status", description: "filter by engagement status" }, { name: "workspace", description: "filter by sandbox workspace" }],
    },
    { method: "GET", path: "/engagements/{id}", operationId: "getEngagement", summary: "One Engagement record by id" },
    {
      method: "POST",
      path: "/engagements",
      operationId: "createEngagement",
      summary: "Create a sandbox Engagement (system-of-record door; anon workspace auto-minted, retention disclosed)",
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, serviceId: { type: "string" }, workspace: { type: "string" } } } } } },
      responses: { 201: { description: "the created, labeled sandbox record" } },
    },
    {
      method: "GET",
      path: "/work-orders",
      operationId: "listWorkOrders",
      summary: "WorkOrder records — the FSM delivery decomposition (O*NET task grain)",
      params: [{ name: "status", description: "filter by work-order status" }, { name: "workspace", description: "filter by sandbox workspace" }],
    },
    { method: "GET", path: "/work-orders/{id}", operationId: "getWorkOrder", summary: "One WorkOrder record by id" },
    {
      method: "POST",
      path: "/work-orders",
      operationId: "createWorkOrder",
      summary: "Create a sandbox WorkOrder (system-of-record door; anon workspace auto-minted, retention disclosed)",
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, engagementId: { type: "string" }, tasks: { type: "array" }, workspace: { type: "string" } } } } } },
      responses: { 201: { description: "the created, labeled sandbox record" } },
    },
    {
      method: "GET",
      path: "/outcomes",
      operationId: "listOutcomes",
      summary: "Outcome records — completed, verified deliverables (verify-then-settle seam to the verification rail)",
      params: [{ name: "status", description: "filter by outcome status" }],
    },
    { method: "GET", path: "/outcomes/{id}", operationId: "getOutcome", summary: "One Outcome record by id" },
    {
      method: "POST",
      path: "/outcomes/order",
      operationId: "orderOutcome",
      summary: "Order a completed, verified outcome — answers 402 OFFER with the whole B2A ladder (pay / work / claim). Wave zero: payable stub, settlement not activated.",
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { serviceId: { type: "string" } } } } } },
      responses: { 402: { description: "OFFER envelope — the machine-readable start of the paid conversation (test mode)" } },
    },
    { method: "GET", path: "/icp", operationId: "getICP", summary: "The G2 coordinates document: ICP (CompanyType × JobTypes), personas, motion" },
    { method: "GET", path: "/verify", operationId: "getVerify", summary: "The published verify export — how to run this property's public-contract tests" },
  ],

  llms: { body: llmsBody },

  // Mounted MCP door (same Nouns/verbs as HTTP — one definition, mcp.js reads
  // the same store the collections serve). axp-ext-rates-g2 §1: tools are
  // declared BY NAME as strings — each name IS the canonical operationId;
  // descriptions and input schemas are served live by tools/list.
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: tools.map((t) => t.name),
  },

  // axp-ext-rates-g2 §3 (links.verify): the published runnable-suite export —
  // the /verify door this worker serves; the generator absolutizes it onto
  // the card's links object beside links.conformance.
  verifyUrl: "/verify",

  // axp-ext-rates-g2 §4 (g2, TOP-LEVEL card object): the property's G2/ICP
  // coordinates, carried VERBATIM from the G4 projection — the same truth
  // /icp serves; links.icp (icpUrl) stays legal and declared beside it.
  g2: {
    substrate: projection.substrate,
    brand: projection.brand,
    motion: projection.motion,
    icp: projection.icp,
    personas: projection.personas,
    positioning: projection.positioning,
  },

  icpUrl: `${ORIGIN}/icp`,

  family: [
    {
      name: "apis.ax",
      origin: "https://apis.ax",
      role: "the cross-cutting agent-first register (B2A) — this substrate's universal agent door",
      seams: [{ rel: "register", description: "the fn-service-delivery substrate is listed in the agent-first register" }],
    },
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "the independent verifier",
      seams: [
        { rel: "conformance", description: `hosted verdict for this surface at https://api.qa/${NAME}` },
        { rel: "verification", description: "completed Outcomes reference VerificationReport records produced on the verification rail — the verify-then-settle seam" },
      ],
    },
  ],

  home: { html: homeHtml, md: homeMd },
});

// interfaces.testSuite deliberately UNDECLARED (product.js suite.declared =
// false): the /verify export is served, but declaring a suite the verifier
// cannot yet admit in a pinned dialect would be a machine-readable false claim.

export { projection };
