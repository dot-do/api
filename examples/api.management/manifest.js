/**
 * manifest.js — ONE defineSiteManifest() call: the single definition both
 * plies, all four quartet faces, the probe manifest, and the MCP declaration
 * are generated from (axp skill law: never hand-roll; vendored axp-faces at
 * the PINS.json digest).
 */
import { defineSiteManifest } from "./vendor/axp-faces/index.js";
import { buildSeed, SEED_VERSION, API_PRODUCT } from "./substrate.js";
import { PROJECTION } from "./projection.js";
import { renderLanding } from "./site/pages.js";

export const ORIGIN = "https://api.management";

const seed = buildSeed();

const llmsBody = `# api.management — the operate face of an API portfolio

The rail a managing agent calls to operate deployed APIs and systems: the
APQC-typed process spine, KPI/OKR records, and the managed-property door —
one definition serving both the data records and the system-of-record verbs.

Keyless first value, right now:

\`\`\`sh
curl ${ORIGIN}/processes            # the typed process spine (branching collection)
curl ${ORIGIN}/kpis                 # KPI records of the operated portfolio
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
conformance suite against this surface yourself.

## Console

${ORIGIN}/console is the management console (browser face, v1): the API
inventory ledger — seeded with the platform's own 52 built wave-zero rows —
plus the attested api.qa verdict panels. The console chrome is demo-labeled;
the register data in it is real and cited.`;

const homeMd = `# api.management

Management and monitoring for API portfolios — the APIs this platform serves and
the APIs you already run. Conformance is judged by api.qa (the independent
verifier); this face carries the process spine, KPI/OKR records, and the
managed-property door — one definition, agent-first.

- Console (browser face): ${ORIGIN}/console — inventory ledger + attested verdict panels
- Collections: ${ORIGIN}/processes · ${ORIGIN}/kpis · ${ORIGIN}/objectives · ${ORIGIN}/properties
- Machine faces: ${ORIGIN}/llms.txt · ${ORIGIN}/.well-known/agents.json · ${ORIGIN}/openapi.json · ${ORIGIN}/pricing
- Verify it yourself: ${ORIGIN}/verify
- Sandbox data is simulated and labeled (\`"example": true\`) — the product is live, the data is not.
- Family: api.qa verifies · apis.ax offers · apis.directory registers · apis.dev builds · api.management operates.
`;

// The browser home is the product landing (site/pages.js — family idiom per
// examples/DASHBOARD-FAMILY.md); agents negotiating markdown get homeMd above.
const homeHtml = renderLanding();

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "api.management",
  description:
    "The operate face of an API portfolio: APQC-typed process spine, KPI/OKR records, and the managed-property system door — one substrate serving both the data ply and the headless ply, agent-first (B2A).",
  version: "0.1.0",

  // The one branching collection (Clauses 4 + 7 on one pathname): the typed
  // process spine. Filters branch, reserved scopes block, spend over the
  // ceiling answers 402 OFFER.
  collection: {
    path: "/processes",
    // axp-ext-rates-g2 §1: the branching collection's canonical operationId —
    // the same identifier the MCP tool carries and the rate row keys on.
    operationId: "listProcesses",
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
    // axp-ext-rates-g2 §2: the operation rate card, TOP-LEVEL in the Pricing
    // Document at its ruled placement — one row per metered noun operation,
    // keyed by the canonical operationId (contract op or MCP tool name).
    // Same test-mode label as the document: binding:false + statement above.
    rates: [
      { operation: "listProcesses", price: 0.002, unit: "usd-per-call" },
      { operation: "getProcess", price: 0.002, unit: "usd-per-call" },
      { operation: "listKPIs", price: 0.002, unit: "usd-per-call" },
      { operation: "listObjectives", price: 0.002, unit: "usd-per-call" },
      { operation: "listProperties", price: 0.002, unit: "usd-per-call" },
      { operation: "getProperty", price: 0.002, unit: "usd-per-call" },
    ],
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

  // Extra LIVE routes (presence-when-true — every one of these answers in
  // worker.js). Each business route carries its canonical camelCase
  // operationId (axp-ext-rates-g2 §1): route = MCP tool = rate key.
  routes: [
    {
      method: "GET",
      path: "/kpis",
      operationId: "listKPIs",
      summary: "KPI records of the operated portfolio (data ply) — typed OK | EMPTY | BLOCKED, branching on kind/property/id",
      params: [
        { name: "kind", description: "filter by KPI kind (availability, p95-latency-ms, metered-calls, …)" },
        { name: "property", description: "filter by operated property domain" },
        { name: "id", description: "select one record by id" },
      ],
    },
    {
      method: "GET",
      path: "/objectives",
      operationId: "listObjectives",
      summary: "Objective (OKR) records of the operated portfolio — typed envelopes, branching on quarter/status/id",
      params: [
        { name: "quarter", description: "filter by quarter (e.g. 2026-Q3)" },
        { name: "status", description: "filter by status (active | closed)" },
        { name: "id", description: "select one record by id" },
      ],
    },
    {
      method: "GET",
      path: "/properties",
      operationId: "listProperties",
      summary: "ManagedProperty records — the headless operate door over deployed properties (system of record: ERP⟨management-operations⟩); same collections, same envelopes as the data ply",
      params: [
        { name: "lifecycle", description: "filter by lifecycle state (live | building | sunset-review)" },
        { name: "id", description: "select one record by id" },
      ],
    },
    {
      method: "GET",
      path: "/icp.json",
      operationId: "getICP",
      summary: "G2 coordinates of this projection: ICP (CompanyTypes × JobTypes), personas, System coordinates, motion",
    },
    {
      method: "GET",
      path: "/verify",
      operationId: "getVerify",
      summary: "Run our tests — how to verify this surface yourself against the pinned conformance spec (claims that can be tests are tests)",
    },
    {
      method: "POST",
      path: "/mcp",
      summary: "The MCP door (streamable HTTP JSON-RPC): initialize, tools/list, tools/call — the same Nouns and verbs as HTTP, from the same definition",
      responses: { 200: { description: "JSON-RPC 2.0 response envelope" } },
    },
  ],

  // MCP declared on the card ONLY because the door is mounted (worker.js /mcp).
  // Tools are STRING names — each name IS the canonical operationId
  // (axp-ext-rates-g2 §1); descriptions and input schemas are served live by
  // tools/list (mcp.js toolDefs).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listProcesses", "getProcess", "listKPIs", "listObjectives", "listProperties", "getProperty"],
  },

  llms: { body: llmsBody },

  // axp-ext-rates-g2 §3: the card's links.verify — the run-our-tests door.
  verifyUrl: "/verify",

  // axp-ext-rates-g2 §4: G2/ICP coordinates TOP-LEVEL on the card, carried
  // verbatim from the projection (the register row's G2 projection).
  // links.icp (the same truth at /icp.json) stays legal beside it.
  g2: {
    substrate: PROJECTION.substrate,
    projection: PROJECTION.brand,
    motion: PROJECTION.motion,
    icp: PROJECTION.icp,
    personas: PROJECTION.personas,
    systems: API_PRODUCT.systems,
  },
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
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "the independent verifier — the conformance engine this console consumes; api.management can read verdicts, never mint them",
      seams: [{ rel: "verifier", description: "attested Ed25519-signed VerificationReports at api.qa/{domain}; the console's verdict column is those reports" }],
    },
  ],

  home: { html: homeHtml, md: homeMd },
});

export { seed };
export const projection = PROJECTION;
