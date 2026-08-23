/**
 * manifest.js — ONE defineSiteManifest() call: the single definition both
 * plies, all four quartet faces, the probe manifest, and the MCP declaration
 * are generated from (axp skill law: never hand-roll; vendored axp-faces at
 * the PINS.json digest).
 */
import { defineSiteManifest } from "./vendor/axp-faces/index.js";
import { buildSeed, SEED_VERSION } from "./substrate.js";
import { PROJECTION } from "./projection.js";

export const ORIGIN = "https://api.management";

const seed = buildSeed();

const llmsBody = `# api.management — the operate face of an API estate

The rail a managing agent calls to operate deployed APIs and systems: the
APQC-typed process spine, KPI/OKR records, and the managed-property door —
one definition serving both the data records and the system-of-record verbs.

Keyless first value, right now:

\`\`\`sh
curl ${ORIGIN}/processes            # the typed process spine (branching collection)
curl ${ORIGIN}/kpis                 # KPI records of the operated estate
curl ${ORIGIN}/objectives           # OKR records
curl ${ORIGIN}/properties           # managed properties (the headless operate door)
curl ${ORIGIN}/pricing              # the Pricing Document
\`\`\`

## Sandbox

The anonymous sandbox is the live product over clearly-labeled simulated
data — every seed record carries \`"example": true\` (seed spec ${SEED_VERSION},
reseeded on deploy, retained until the next reseed). It is read-only at wave
zero. No real company or person appears in any record.

## Onboarding (agent-first)

This face is agent-first (B2A): no OAuth, no card on file. The ladder is
anonymous sandbox → earned credits → human-claimed workspace → 402 metering
on machine identity; the 402 OFFER body names every rung. Metering runs in
test mode at wave zero — the Pricing Document says so in its own \`binding\`
and \`statement\` members.

## Verification

Claims that can be tests are tests: /verify explains how to run the
conformance suite against this surface yourself.`;

const homeMd = `# api.management

The operate face of an API estate — process spine, KPI/OKR records, and the
managed-property door, one definition, agent-first.

- Collections: ${ORIGIN}/processes · ${ORIGIN}/kpis · ${ORIGIN}/objectives · ${ORIGIN}/properties
- Machine faces: ${ORIGIN}/llms.txt · ${ORIGIN}/.well-known/agents.json · ${ORIGIN}/openapi.json · ${ORIGIN}/pricing
- Verify it yourself: ${ORIGIN}/verify
- Sandbox data is simulated and labeled (\`"example": true\`) — the product is live, the data is not.
`;

const homeHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>api.management</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; background: Canvas; color: CanvasText; }
  main { max-width: 44rem; margin: 0 auto; padding: 4rem 1.5rem; }
  h1 { font-size: 2rem; letter-spacing: -0.02em; margin: 0 0 .5rem; }
  .sub { opacity: .75; margin: 0 0 2.5rem; }
  h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .08em; opacity: .6; margin: 2.5rem 0 .75rem; }
  code, pre { font: 13px/1.6 ui-monospace, monospace; }
  pre { padding: 1rem; border: 1px solid color-mix(in srgb, CanvasText 15%, transparent); border-radius: 8px; overflow-x: auto; }
  ul { padding-left: 1.2rem; } li { margin: .3rem 0; }
  .note { font-size: .85rem; opacity: .7; border-left: 3px solid color-mix(in srgb, CanvasText 25%, transparent); padding-left: .75rem; }
  a { color: inherit; }
</style></head>
<body><main>
  <h1>api.management</h1>
  <p class="sub">The operate face of an API estate: the process spine, KPI/OKR records, and the managed-property door — one definition, agent-first.</p>
  <h2>Keyless first value</h2>
  <pre>curl ${ORIGIN}/processes
curl ${ORIGIN}/kpis
curl ${ORIGIN}/properties
curl ${ORIGIN}/pricing</pre>
  <h2>Machine faces</h2>
  <ul>
    <li><a href="/llms.txt">/llms.txt</a> — the agent front door</li>
    <li><a href="/.well-known/agents.json">/.well-known/agents.json</a> — capability card + probe manifest</li>
    <li><a href="/openapi.json">/openapi.json</a> — the OpenAPI 3.1 contract (live endpoints only)</li>
    <li><a href="/pricing">/pricing</a> — the Pricing Document</li>
    <li><a href="/verify">/verify</a> — run our tests yourself</li>
  </ul>
  <h2>Sandbox</h2>
  <p class="note">The anonymous sandbox is the live product over simulated data. Every seed record is labeled <code>"example": true</code>; no real company or person appears in any record. Metering runs in test mode — the Pricing Document declares this in its own <code>binding</code> and <code>statement</code> members.</p>
</main></body></html>
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "api.management",
  description:
    "The operate face of an API estate: APQC-typed process spine, KPI/OKR records, and the managed-property system door — one substrate serving both the data ply and the headless ply, agent-first (B2A).",
  version: "0.1.0",

  // The one branching collection (Clauses 4 + 7 on one pathname): the typed
  // process spine. Filters branch, reserved scopes block, spend over the
  // ceiling answers 402 OFFER.
  collection: {
    path: "/processes",
    memberName: "processes",
    summary: "The APQC-typed process spine plus the demo tenant's process-state records — typed OK | EMPTY | BLOCKED, branching on apqc/kind",
    records: seed.processes,
    filters: ["apqc", "kind"],
    blockedScopes: ["tenant", "internal"],
    blockedReason: (scope) => `scope '${scope}' is tenant- or platform-reserved — not served to an anonymous agent class`,
  },

  // Rate card (§7.3 MUST): metered SHAPE, test-mode STUB — never fake billing.
  // binding:false + statement is the label; no checkoutUrl exists anywhere.
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "usd-per-month",
    price: 0.002,
    binding: false,
    statement:
      "Wave-zero stub: metering runs in test mode only — no live settlement, no invoice will issue. Prices are the stated intent of the registered pricing experiment (pattern: 402-metered, motion: B2A), not bound terms. The anonymous sandbox floor is free.",
    offers: [
      {
        id: "b2a-metered-402-stub",
        title: "Metered access — wave-zero test-mode stub (no live settlement)",
        price: { model: "metered", hardCeiling: 100, unit: "usd-per-month" },
        alternatives: [
          { id: "pay", summary: "402 metering against id.org.ai machine identity — test-mode stub at wave zero; settlement not activated", status: "stub" },
          { id: "work", summary: "earn .ax-ledger credits via proof-of-work (#17 ladder rung 1) — door not mounted at wave zero", status: "stub" },
          { id: "claim", summary: "a human claims this agent's workspace for attribution and longer tenure (rung 2) — door not mounted at wave zero", status: "stub" },
        ],
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  // Extra LIVE routes (presence-when-true — every one of these answers in worker.js)
  routes: [
    {
      method: "GET",
      path: "/kpis",
      summary: "KPI records of the operated estate (data ply) — typed OK | EMPTY | BLOCKED, branching on kind/property/id",
      params: [
        { name: "kind", description: "filter by KPI kind (availability, p95-latency-ms, metered-calls, …)" },
        { name: "property", description: "filter by operated property domain" },
        { name: "id", description: "select one record by id" },
      ],
    },
    {
      method: "GET",
      path: "/objectives",
      summary: "Objective (OKR) records of the operated estate — typed envelopes, branching on quarter/status/id",
      params: [
        { name: "quarter", description: "filter by quarter (e.g. 2026-Q3)" },
        { name: "status", description: "filter by status (active | closed)" },
        { name: "id", description: "select one record by id" },
      ],
    },
    {
      method: "GET",
      path: "/properties",
      summary: "ManagedProperty records — the headless operate door over deployed properties (system of record: ERP⟨management-operations⟩); same collections, same envelopes as the data ply",
      params: [
        { name: "lifecycle", description: "filter by lifecycle state (live | building | sunset-review)" },
        { name: "id", description: "select one record by id" },
      ],
    },
    {
      method: "GET",
      path: "/icp.json",
      summary: "G2 coordinates of this projection: ICP (CompanyTypes × JobTypes), personas, System coordinates, motion",
    },
    {
      method: "GET",
      path: "/verify",
      summary: "Run our tests — how to verify this surface yourself against the pinned conformance spec (claims that can be tests are tests)",
    },
    {
      method: "POST",
      path: "/mcp",
      summary: "The MCP door (streamable HTTP JSON-RPC): initialize, tools/list, tools/call — the same Nouns and verbs as HTTP, from the same definition",
      responses: { 200: { description: "JSON-RPC 2.0 response envelope" } },
    },
  ],

  // MCP declared on the card ONLY because the door is mounted (worker.js /mcp)
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: [
      { name: "listProcesses", description: "list the typed process spine (filters: apqc, kind)" },
      { name: "getProcess", description: "get one process record by id" },
      { name: "listKPIs", description: "list KPI records (filters: kind, property)" },
      { name: "listObjectives", description: "list OKR records (filters: quarter, status)" },
      { name: "listProperties", description: "list managed properties (filter: lifecycle)" },
      { name: "getProperty", description: "get one managed property by id" },
    ],
  },

  llms: { body: llmsBody },

  // G2 coordinates exposed on the card (links.icp)
  icpUrl: `${ORIGIN}/icp.json`,

  // Typed sibling edges — only doors verified serving (presence-when-true):
  // apis.ax answered at build time; apis.do/llms.txt did not and is omitted.
  family: [
    {
      name: "apis.ax",
      origin: "https://apis.ax",
      role: "the agent-first register and the AXP standard this face is built to",
      llms: "https://apis.ax/llms.txt",
      seams: [{ rel: "standard", description: "this face conforms to apis-ax-axp and is independently verified at api.qa" }],
    },
  ],

  home: { html: homeHtml, md: homeMd },
});

export { seed };
export const projection = PROJECTION;
