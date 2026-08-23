/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces, byte-identical with pins — see axp/VENDORED.json).
 *
 * ORIGIN IS A PLACEHOLDER. This is a GAP register row (nothing held for
 * NAICS 5416-5417): per template spec §0 the G3 substrate is built under a
 * placeholder org.ai address and the G4 brand attaches when a name is ruled.
 * Nothing here implies acquisition of any name.
 */
import { defineSiteManifest } from "./axp/index.js";
import seed from "./seed.json" with { type: "json" };

export const ORIGIN = "https://consulting-research.org.ai"; // PLACEHOLDER — GAP row, G4 name pending
export const SUBSTRATE = "consulting-research";

const llmsBody = `# consulting-research — engagement records and verified deliverables for consulting & scientific services (NAICS 5416-5417)

Typed engagement records (Engagement, StatementOfWork, Milestone, Deliverable)
and the task-decomposition grain beneath them (Task, Process — typed on the
O*NET task / APQC process spine). Two faces, one definition:

- **Data face** — read the typed records: \`/engagements\`, \`/deliverables\`,
  \`/tasks\`, \`/processes\`.
- **Headless face** — the engagement-management system-of-record door on the
  SAME collections: \`POST /engagements\` creates a record in your sandbox
  workspace.

This surface serves under a **placeholder address**: the category has no
ruled brand name yet. The API contract, sandbox, and pricing document are
real and verifiable today.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/engagements                 # typed OK envelope, labeled example data
curl ${ORIGIN}/engagements?status=active   # branching on the query
curl ${ORIGIN}/deliverables                # the outcome grain
curl ${ORIGIN}/pricing                     # the Pricing Document
\`\`\`

All sandbox records are clearly labeled synthetic example data
(\`example: true\` on every record). Anonymous writes mint an ephemeral
workspace (see the \`X-Workspace\` response header); retention is disclosed in
each response. Payment endpoints are 402-shaped stubs at this stage — the
pricing document says so in its own \`binding\`/\`statement\` members, and
nothing is ever charged.
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "consulting-research.org.ai",
  description:
    "Typed engagement, SOW, milestone, and verified-deliverable records for consulting & scientific services (NAICS 5416-5417), with the O*NET/APQC task-decomposition grain beneath them — one definition serving a data face and a headless engagement-management face.",
  version: "0.1.0",

  // The ONE branching collection (Clauses 4 + 7 on one pathname).
  collection: {
    path: "/engagements",
    memberName: "engagements",
    summary: "Engagements — the branching typed collection: OK | EMPTY | BLOCKED on one pathname",
    records: seed.engagements,
    filters: ["status", "sector"],
    blockedScopes: ["internal", "partner-billing"],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today.
  routes: [
    { method: "GET", path: "/engagements/{id}", summary: "One engagement by id, typed envelope" },
    {
      method: "POST",
      path: "/engagements",
      summary: "Create an engagement in your sandbox workspace (headless system-of-record door)",
      description:
        "Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). Retention is disclosed in the response body; the sandbox is the real product over labeled example data.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, sector: { type: "string" } } } } } },
      responses: { 200: { description: "OK envelope with the created record and workspace id" } },
    },
    { method: "GET", path: "/sows", summary: "Statements of Work, typed envelope" },
    { method: "GET", path: "/sows/{id}", summary: "One Statement of Work by id" },
    { method: "GET", path: "/milestones", summary: "Milestones across engagements", params: [{ name: "engagement", description: "filter by engagement id" }] },
    { method: "GET", path: "/deliverables", summary: "Deliverables — the outcome grain", params: [{ name: "status", description: "draft | in-review | verified" }, { name: "engagement", description: "filter by engagement id" }] },
    { method: "GET", path: "/deliverables/{id}", summary: "One deliverable by id" },
    {
      method: "POST",
      path: "/deliverables/{id}/order",
      summary: "Order a verified deliverable (outcome verb) — answers a typed 402 OFFER; wave-zero STUB, no live settlement",
      responses: { 402: { description: "OFFER envelope advertising the pay / work / claim ladder; stub: true — nothing is charged" } },
    },
    { method: "GET", path: "/tasks", summary: "Task-decomposition grain (O*NET task typing anchor; synthetic statements, labeled)", params: [{ name: "engagement", description: "filter by engagement id" }] },
    { method: "GET", path: "/processes", summary: "Process grain (APQC-shaped synthetic ids, labeled)" },
    { method: "GET", path: "/icp.json", summary: "G2 coordinates: ICP + personas + System coordinates of this substrate" },
    { method: "GET", path: "/rates", summary: "Rate card (operation-keyed rates[]; supplements /pricing — every row free-quota'd or zero-priced; stub, not bound)" },
    { method: "GET", path: "/verify", summary: "The published verification suite document — run our tests" },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listEngagements", "getEngagement", "listDeliverables", "getDeliverable", "listTasks", "listProcesses"],
  },

  // Wave-zero pricing: metered SHAPE with the 402 boundary served, honestly
  // declared UNBOUND (stub — no live settlement exists on this placeholder
  // surface; test-mode counts as face-payable, never as billing).
  pricing: {
    model: "metered",
    hardCeiling: 25,
    unit: "usd-per-month",
    price: 0.002,
    binding: false,
    statement:
      "Wave-zero stub pricing on a placeholder surface: no live settlement exists here and nothing is ever charged. The 402 boundary is test-mode. Rates are stated intent for the category, not terms.",
    offers: [
      {
        id: "metered-access-stub",
        title: "Metered access (test-mode stub — no live billing)",
        price: { model: "metered", hardCeiling: 25, unit: "usd-per-month", price: 0.002 },
        alternatives: [
          { id: "pay", title: "Pay per call — 402 metering against machine identity (id.org.ai). STUB: test-mode, no live settlement.", rel: "payment" },
          { id: "work", title: "Earn credits via proof-of-work tasks. STUB: rung declared; the credit ledger is not yet live.", rel: "proof-of-work" },
          { id: "claim", title: "Have a human claim this workspace for longer tenure. STUB: the claim door is not yet live.", rel: "claim" },
        ],
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,

  // Family: a GAP row has no ruled sibling doors — presence-when-true, so no
  // family registry is emitted. Edges attach when the cell's names are ruled.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>consulting-research (placeholder address)</title></head>
<body>
<h1>consulting-research</h1>
<p>Typed engagement and verified-deliverable records for consulting &amp; scientific services (NAICS 5416-5417). This is a placeholder address for an unnamed category; the machine face is live and verifiable.</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/engagements">engagements (keyless, labeled example data)</a></p>
</body></html>
`,
    md: `# consulting-research

Typed engagement and verified-deliverable records for consulting & scientific services (NAICS 5416-5417) — placeholder address, live machine face.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- collection: ${ORIGIN}/engagements
`,
  },
});
