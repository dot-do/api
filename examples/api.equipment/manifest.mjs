/**
 * manifest.mjs — the ONE site manifest: every machine face (card, openapi,
 * pricing, llms.txt, family registry, branching collection, offer boundary,
 * three-faced home) is generated from this via the vendored axp-faces at the
 * PINS.json digest (axp-faces 0.3.0, apis-ax-axp@2.6.0 +
 * axp-ext-rates-g2@0.2.0 — vendored from axp.org.ai COMMITTED HEAD
 * 523c9ef217d54feefb0b20734a6d2996a6965b79, recorded in axp/VENDORED.json).
 * Nouns/operations come from substrate.mjs (G3); brand/motion/offer posture
 * from projection.mjs (G4).
 *
 * The four ratified extension members are NATIVE manifest inputs at their
 * ruled placements (no site-side bridges): pricing.rates (top-level rates[]
 * in the Pricing Document, survey-floor vocabulary), routes[].operationId +
 * collection.operationId (the ONE cross-face operation name — a REAL verb on
 * the collection, per the batch watch list), verifyUrl (card links.verify),
 * and g2 (top-level card object, carried verbatim from the projection).
 */

import { defineSiteManifest } from "./axp/index.js";
import { records } from "./store.mjs";
import { tools } from "./mcp.mjs";
import { projection } from "./projection.mjs";

export const ORIGIN = "https://api.equipment";
export const NAME = "api.equipment";
export const VERSION = "0.1.0";

const DESCRIPTION =
  "The Facilities & Assets function rail: Asset registry records (GIAI/GTIN identity spine), MaintenanceWorkOrder records, EquipmentModel catalog identity, and Digital Product Passport records — one typed, keyless-first surface for machine callers, with EAM/CMMS system-of-record doors on the same collections.";

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

const llmsBody = `# api.equipment — the Facilities & Assets function rail

Machine face for the Facilities & Assets function (one of the 13 APQC
Functions): Asset registry records at the serialized-individual grain
(GIAI/GTIN identity spine), MaintenanceWorkOrder records, EquipmentModel
catalog identity, and Digital Product Passport records (EU battery DPP
statutory clock: 2027-02-18). The EAM/CMMS system-of-record doors are the
SAME collections — one definition, two plies.

All data on this surface today is a labeled example corpus (every record
carries \`example: true\`; GS1 demo prefix 952 on every identifier); the
sandbox is the real product over simulated data, keyless, with disclosed
retention. No manufacturer feed is claimed at wave zero — the model catalog
is labeled synthetic seed.

## Quickstart (keyless — the anon sandbox is the floor)

\`\`\`sh
curl ${ORIGIN}/assets                # typed OK envelope, labeled example data
curl ${ORIGIN}/assets?class=hvac
curl ${ORIGIN}/assets/ast-demo-005/passport   # a Digital Product Passport record
curl ${ORIGIN}/work-orders           # EAM/CMMS system-of-record collection
curl ${ORIGIN}/models?class=lighting # catalog identity (labeled synthetic seed)
curl ${ORIGIN}/pricing               # the rate card (rates[] keyed by operationId)
curl -X POST ${ORIGIN}/passports/order -d '{"assetId":"ast-demo-005"}'   # 402 OFFER — the whole B2A ladder in one boundary
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>api.equipment</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.25rem;color:#111;background:#fff}code,pre{background:#f4f4f4;border-radius:4px;padding:.1em .35em}pre{padding:1em;overflow-x:auto}h1{font-size:1.6rem}a{color:#0645ad}.note{color:#555;font-size:.9em}</style></head>
<body>
<h1>api.equipment</h1>
<p>The Facilities &amp; Assets function rail: <code>Asset</code>, <code>MaintenanceWorkOrder</code>, <code>EquipmentModel</code>, and <code>ProductPassport</code> records — one typed, keyless-first surface for machine callers.</p>
<pre>curl ${ORIGIN}/assets
curl ${ORIGIN}/pricing</pre>
<p>Machine faces: <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/llms.txt">llms.txt</a> · <a href="/verify">verify</a></p>
<p class="note">Everything served today is a labeled example corpus (every record carries <code>example: true</code>; GS1 demo prefix 952 on every identifier) — the live product surface over simulated data, never a faked demo. Prices are stated intent (<code>binding: false</code>); settlement is not activated.</p>
</body></html>
`;

const homeMd = `# api.equipment

The Facilities & Assets function rail — same truth as the page, token-cheap.

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
  // seed substance; ?class=none / ?status=none → EMPTY; ?scope=admin|internal → BLOCKED.
  // axp-ext-rates-g2 §1 + batch watch list: the collection's canonical
  // operationId is a REAL verb (listAssets), never the listCollection default.
  collection: {
    path: "/assets",
    operationId: "listAssets",
    memberName: "results",
    summary: "Asset registry records (serialized individuals, GIAI/GTIN identity spine) — typed OK | EMPTY | BLOCKED | OFFER, branching on the query",
    records: records("assets"),
    filters: ["class", "status", "site"],
    blockedScopes: ["admin", "internal"],
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

    // The operation rate card (axp-ext-rates-g2@0.2.0 §2 — the survey-floor
    // vocabulary) — NATIVE manifest input; the generator emits it TOP-LEVEL
    // in the Pricing Document and validates every row (operation ⊆ declared
    // operationIds, §2.5 allowance forms, §2.9 reserved names refused).
    // Zero-price rows carry included: "unlimited" (the §2.5 allowance form);
    // freeQuota is the legacy monthly shorthand on the metered rows.
    rates: [
      { operation: "listAssets", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getAsset", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "registerAsset", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
      { operation: "getPassport", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      {
        operation: "orderPassport",
        unit: "usd-per-outcome",
        price: 15,
        note: "per compiled, verified Digital Product Passport dossier — no free quota on the outcome door (the sandbox serves example passports free at getPassport); quoted in the 402 OFFER; stated intent (binding: false), settlement not activated at wave zero",
      },
      { operation: "listWorkOrders", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "getWorkOrder", unit: "usd-per-call", price: 0.001, freeQuota: 1000 },
      { operation: "openWorkOrder", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
      { operation: "completeWorkOrder", unit: "usd-per-call", price: 0.002, freeQuota: 100 },
      { operation: "searchModels", unit: "usd-per-call", price: 0, included: "unlimited" },
      { operation: "getModel", unit: "usd-per-call", price: 0, included: "unlimited" },
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

  // Extra LIVE routes (presence-when-true — every one is served in worker.mjs).
  routes: [
    { method: "GET", path: "/assets/{assetId}", operationId: "getAsset", summary: "One Asset registry record by id" },
    {
      method: "POST",
      path: "/assets",
      operationId: "registerAsset",
      summary: "Register a sandbox Asset (EAM/CMMS system-of-record door; anon workspace auto-minted, retention disclosed)",
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, modelId: { type: "string" }, class: { type: "string" }, site: { type: "string" }, workspace: { type: "string" } } } } } },
      responses: { 201: { description: "the created, labeled sandbox record" } },
    },
    {
      method: "GET",
      path: "/assets/{assetId}/passport",
      operationId: "getPassport",
      summary: "The Digital Product Passport record for an asset (labeled example artifacts; EU battery DPP statutory clock 2027-02-18)",
    },
    {
      method: "POST",
      path: "/passports/order",
      operationId: "orderPassport",
      summary: "Order a compiled, verified Digital Product Passport dossier — answers 402 OFFER with the whole B2A ladder (pay / work / claim). Wave zero: payable stub, settlement not activated.",
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { assetId: { type: "string" } } } } } },
      responses: { 402: { description: "OFFER envelope — the machine-readable start of the paid conversation (test mode)" } },
    },
    {
      method: "GET",
      path: "/work-orders",
      operationId: "listWorkOrders",
      summary: "MaintenanceWorkOrder records — the EAM/CMMS system-of-record collection (headless ply, same substrate)",
      params: [{ name: "status", description: "filter by work-order status" }, { name: "workspace", description: "filter by sandbox workspace" }],
    },
    { method: "GET", path: "/work-orders/{workOrderId}", operationId: "getWorkOrder", summary: "One MaintenanceWorkOrder record by id" },
    {
      method: "POST",
      path: "/work-orders",
      operationId: "openWorkOrder",
      summary: "Open a sandbox MaintenanceWorkOrder (system-of-record door; anon workspace auto-minted, retention disclosed)",
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { assetId: { type: "string" }, summary: { type: "string" }, task: { type: "string" }, workspace: { type: "string" } } } } } },
      responses: { 201: { description: "the created, labeled sandbox record" } },
    },
    {
      method: "POST",
      path: "/work-orders/{workOrderId}/complete",
      operationId: "completeWorkOrder",
      summary: "Complete a MaintenanceWorkOrder (system-of-record verb on the SAME collection — sandbox scope at wave zero)",
      responses: { 200: { description: "the completed, labeled record" } },
    },
    {
      method: "GET",
      path: "/models",
      operationId: "searchModels",
      summary: "Search the EquipmentModel catalog (labeled synthetic seed — no manufacturer feed claimed at wave zero)",
      params: [{ name: "class", description: "filter by asset class" }, { name: "q", description: "substring search" }],
    },
    { method: "GET", path: "/models/{modelId}", operationId: "getModel", summary: "One EquipmentModel catalog record by id" },
    { method: "GET", path: "/icp", operationId: "getICP", summary: "The G2 coordinates document: ICP (CompanyType × JobTypes), personas, motion" },
    { method: "GET", path: "/verify", operationId: "getVerify", summary: "The published verify export — how to run this property's public-contract tests" },
  ],

  llms: { body: llmsBody },

  // Mounted MCP door (same Nouns/verbs as HTTP — one definition, mcp.mjs reads
  // the same store the collections serve). axp-ext-rates-g2 §1: tools are
  // declared BY NAME as strings — each name IS the canonical operationId;
  // descriptions and input schemas are served live by tools/list. Ladder
  // posture: the door is the authless sandbox rung; keyed rungs sit above.
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: tools.map((t) => t.name),
  },

  // axp-ext-rates-g2 §3 (links.verify): the published runnable-suite export.
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
      seams: [{ rel: "register", description: "the fn-facilities-assets substrate is listed in the agent-first register" }],
    },
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "the independent verifier",
      seams: [{ rel: "conformance", description: `hosted verdict for this surface at https://api.qa/${NAME}` }],
    },
  ],

  home: { html: homeHtml, md: homeMd },
});

// interfaces.testSuite deliberately UNDECLARED (batch watch list): the /verify
// export is served, but declaring a suite the verifier cannot yet admit in a
// pinned dialect would be a machine-readable false claim.

export { projection };
