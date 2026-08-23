/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces@0.3.0, byte-identical with pins — see axp/VENDORED.json;
 * vendored via `git show` from the axp.org.ai repo's COMMITTED HEAD
 * 523c9ef217d54feefb0b20734a6d2996a6965b79 on branch
 * draft/axp-extension-rates-g2, never the working tree).
 *
 * This vendoring is NATIVE axp-ext/rates-g2@0.2.0 (digest 903e414d…): the
 * four ruled placements emitted by the generator itself, no bridges —
 * `rates[]` TOP-LEVEL in the Pricing Document, `g2` TOP-LEVEL on the
 * capability card, `links.verify` as a card link member, and the canonical
 * camelCase-verb `operationId` on every route — plus the 0.2.0 survey-floor
 * rate-row vocabulary (`included` allowances instead of the legacy
 * freeQuota shorthand; reserved member names refused fail-closed).
 *
 * ORIGIN IS A PLACEHOLDER. GAP register row under a DEPTH RULING (SC #21:
 * Axis-2 only, avoid-class 5 — the binding constraint on this cell).
 * energy.org.ai is a held G2 NAMESPACE, not a market face (register); per
 * template spec §0 the G3 substrate is built under it as a placeholder and
 * the G4 brand attaches if a name is ever ruled (#16) — which the depth
 * ruling itself argues against (register note). Nothing here implies
 * acquisition of any name. This face is the ruled NOUN-GRAIN posture
 * (metering.click + interconnection.click entry-artifact grain): no apex, no
 * data-thesis face.
 */
import { defineSiteManifest } from "./axp/index.js";
import { product } from "./product.js";
import seed from "./seed.json" with { type: "json" };

export const ORIGIN = "https://energy.org.ai"; // PLACEHOLDER — held G2 namespace; GAP row, depth-ruled, G4 name pending (#16)
export const SUBSTRATE = "utilities-energy";

const llmsBody = `# utilities-energy — meter/interval and interconnection records for the parties filing into the utility (NAICS 22)

Noun-grain records on the rails this cell is ruled for (Axis-2 posture, SC
#21): the meter/interval read (the one data abstraction the cascade assigns
this market), public interconnection-queue entries, the applicant-side
interconnection filing, and utility tariff filings. Two faces, one
definition:

- **Data face** — read the typed records: \`/interval-reads\`, \`/meters\`,
  \`/queue-entries\`, \`/interconnection-requests\`, \`/tariffs\`.
- **Headless face** — the applicant-filing door on the SAME collection:
  \`POST /interconnection-requests\` creates a draft filing in your sandbox
  workspace (the interconnection.click grain; the buyer coordinate is the
  party filing into the utility, never the utility itself).

This surface serves under a **placeholder address**: the category has no
ruled brand name, and its register row is depth-ruled to entry artifacts
only — no apex face is claimed. The API contract, sandbox, and pricing
document are real and verifiable today.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/interval-reads                     # typed OK envelope, labeled example data
curl ${ORIGIN}/interval-reads?meter=MTR-EX-1001   # branching on the query
curl ${ORIGIN}/queue-entries                      # public interconnection-queue shape (synthetic, labeled)
curl ${ORIGIN}/pricing                            # the Pricing Document (rates[] top-level)
\`\`\`

All sandbox records are clearly labeled synthetic example data
(\`example: true\` on every record; identifiers are schema-shaped synthetic —
UTIL-EX/MTR-EX/ISO-EX/TRF-EX; Green Button/ESPI appears as a typing anchor
only). Anonymous writes mint an ephemeral workspace (see the \`X-Workspace\`
response header); retention is disclosed in each response. Payment endpoints
are 402-shaped stubs at this stage — the pricing document says so in its own
\`binding\`/\`statement\` members, and nothing is ever charged.
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "energy.org.ai",
  description:
    "Meter/interval reads, public interconnection-queue entries, applicant-side interconnection filings, and utility tariff records for Utilities & Energy (NAICS 22) — noun-grain rails for the party filing into the utility, one definition serving a data face and an applicant-filing headless door.",
  version: "0.1.0",

  // The ONE branching collection (Clauses 4 + 7 on one pathname): the row's
  // one ruled data abstraction — the meter/interval record.
  collection: {
    path: "/interval-reads",
    operationId: "listIntervalReads",
    memberName: "intervalReads",
    summary: "Interval reads (meter/interval records — the row's one ruled data abstraction) — the branching typed collection: OK | EMPTY | BLOCKED on one pathname",
    records: seed.intervalReads,
    filters: ["meter", "period"],
    blockedScopes: ["utility-internal", "customer-pii"],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today,
  // and every route carries its canonical operationId (axp-ext/rates-g2 §1).
  routes: [
    { method: "GET", path: "/meters", operationId: "listMeters", summary: "Meters (EIA-class/ESPI-shaped meter records; ESPI is a typing anchor only — register [UNVERIFIED])", params: [{ name: "utility", description: "filter by utility id (UTIL-EX-*)" }, { name: "serviceKind", description: "electricity | gas | water" }] },
    { method: "GET", path: "/meters/{id}", operationId: "getMeter", summary: "One meter by id, typed envelope" },
    { method: "GET", path: "/queue-entries", operationId: "listQueueEntries", summary: "Public interconnection-queue entries (FERC/ISO queue record shape; synthetic ISO-EX-* queues, labeled)", params: [{ name: "queue", description: "filter by synthetic queue id (ISO-EX-*)" }, { name: "status", description: "active | withdrawn | completed" }] },
    { method: "GET", path: "/queue-entries/{id}", operationId: "getQueueEntry", summary: "One queue entry by id" },
    { method: "GET", path: "/interconnection-requests", operationId: "listInterconnectionRequests", summary: "Applicant-side interconnection filings (the interconnection.click grain)", params: [{ name: "status", description: "draft | submitted | under-review" }] },
    { method: "GET", path: "/interconnection-requests/{id}", operationId: "getInterconnectionRequest", summary: "One interconnection request by id" },
    {
      method: "POST",
      path: "/interconnection-requests",
      operationId: "createInterconnectionRequest",
      summary: "Create a draft interconnection filing in your sandbox workspace (the applicant-filing headless door — same collection, one definition)",
      description:
        "Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). Retention is disclosed in the response body; the sandbox is the real product over labeled example data. The buyer coordinate is the party filing into the utility (the row's ruled ICP), never the utility itself.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["applicant", "systemSizeKwDc"], properties: { applicant: { type: "string" }, systemSizeKwDc: { type: "number" }, utilityId: { type: "string" }, resourceType: { type: "string" } } } } } },
      responses: { 200: { description: "OK envelope with the created draft filing and workspace id" } },
    },
    {
      method: "POST",
      path: "/interconnection-requests/{id}/submit",
      operationId: "submitInterconnectionRequest",
      summary: "Submit a prepared interconnection filing package (outcome verb) — answers a typed 402 OFFER; wave-zero STUB, no live settlement",
      responses: { 402: { description: "OFFER envelope; only the mounted sandbox rung is advertised as live — unmounted rungs are labeled stubs; nothing is charged" } },
    },
    { method: "GET", path: "/tariffs", operationId: "listTariffs", summary: "Utility tariff filings (public filing shape; synthetic content, labeled)", params: [{ name: "utility", description: "filter by utility id" }, { name: "status", description: "effective | pending" }] },
    { method: "GET", path: "/tariffs/{id}", operationId: "getTariff", summary: "One tariff by id" },
    { method: "GET", path: "/icp.json", operationId: "getIcp", summary: "G2 coordinates: ICP + personas of this substrate (the row's System cell is empty — declared as provided)" },
    { method: "GET", path: "/verify", operationId: "getVerifySuite", summary: "The published verification suite document — run our tests" },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js). Tool
  // names ARE the canonical operationIds as STRINGS (axp-ext/rates-g2 §1).
  // The door is AUTHLESS at the anon-sandbox rung (the universal floor); a
  // bearer-key gate applies to rungs above it, and none of those rungs is
  // mounted at wave zero — so no key surface is advertised
  // (presence-when-true).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listIntervalReads", "listMeters", "getMeter", "listQueueEntries", "listInterconnectionRequests", "listTariffs"],
  },

  // Wave-zero pricing: metered SHAPE with the 402 boundary served, honestly
  // declared UNBOUND (stub — no live settlement exists on this placeholder
  // surface; test-mode counts as face-payable, never as billing).
  // `rates` is TOP-LEVEL in the Pricing Document (the ruled placement),
  // operationId-keyed. Survey-floor vocabulary (ext 0.2.0): `included`
  // allowances instead of the legacy freeQuota shorthand; every row prices
  // from zero or names its included allowance.
  pricing: {
    model: "metered",
    hardCeiling: 25,
    unit: "usd-per-month",
    price: 0.002,
    binding: false,
    statement:
      "Wave-zero stub pricing on a placeholder surface: no live settlement exists here and nothing is ever charged. The 402 boundary is test-mode. Rates are stated intent for the category, not terms.",
    rates: [
      { operation: "listIntervalReads", price: 0 },
      { operation: "listMeters", price: 0 },
      { operation: "getMeter", price: 0.002, included: { qty: 100, period: "month" } },
      { operation: "listQueueEntries", price: 0 },
      { operation: "getQueueEntry", price: 0.002, included: { qty: 100, period: "month" } },
      { operation: "listInterconnectionRequests", price: 0 },
      { operation: "getInterconnectionRequest", price: 0 },
      { operation: "createInterconnectionRequest", price: 0, note: "sandbox workspaces — free at the anon floor" },
      {
        operation: "submitInterconnectionRequest",
        price: 0.5,
        unit: "per submitted interconnection filing package (per-outcome)",
        included: { qty: 5, period: "month" },
        note: "402 OFFER boundary is served today; settlement is a stub (test-mode). Per-outcome pricing on the filing package is the row-specific experiment sub-hypothesis (projection.json) — priced only if a G4 name is ever ruled for this depth-ruled cell.",
      },
      { operation: "listTariffs", price: 0 },
      { operation: "getTariff", price: 0.002, included: { qty: 100, period: "month" } },
    ],
    offers: [
      {
        id: "metered-access-stub",
        title: "Metered access (test-mode stub — no live billing)",
        price: { model: "metered", hardCeiling: 25, unit: "usd-per-month", price: 0.002 },
        // MOUNTED-RUNGS RULE: only the anon-sandbox floor is a live door at
        // wave zero, and it is the only alternative advertised as mounted.
        // The other ladder rungs (pay / work / claim) appear for
        // ladder-shape discovery ONLY, each explicitly mounted:false +
        // stub:true — never presented as available doors.
        alternatives: [
          { id: "sandbox", rel: "sandbox", mounted: true, title: "Keyless anon sandbox floor (ladder rung 0) — free, labeled example data; the only mounted rung today." },
          { id: "pay", rel: "payment", mounted: false, stub: true, title: "Pay per call — 402 metering against machine identity (id.org.ai). NOT MOUNTED: test-mode stub, no live settlement; nothing is charged." },
          { id: "work", rel: "proof-of-work", mounted: false, stub: true, title: "Earn credits via proof-of-work tasks. NOT MOUNTED: rung declared for discovery; the credit ledger is not yet live." },
          { id: "claim", rel: "claim", mounted: false, stub: true, title: "Have a human claim this workspace for longer tenure. NOT MOUNTED: the claim door is not yet live." },
        ],
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,

  // axp-ext/rates-g2 §3 — links.verify: the published runnable-suite export.
  verifyUrl: "/verify",

  // axp-ext/rates-g2 §4 — G2/ICP coordinates TOP-LEVEL on the card
  // (generator-native in this vendoring). The row's System cell is EMPTY
  // ('—' in SC #21, the cascade's only empty headless cell) — an empty
  // systems member would declare nothing, so per presence-when-true it is
  // omitted here; /icp.json carries the empty-cell note in full.
  g2: {
    icp: {
      companyTypes: ["solar installer / EPC", "interconnection applicant (project developer / IPP)", "energy-data software vendor"],
      jobTypes: ["interconnection analyst", "project developer", "operations manager", "energy analyst"],
    },
    personas: [
      { id: "operator", description: "interconnection analyst at a solar installer/EPC — the party filing into the utility (the row's ruled buyer coordinate)" },
      { id: "developer", description: "developer at an energy-data software vendor integrating meter/interval and queue records" },
      { id: "agent", description: "autonomous agent monitoring queue positions, assembling interval-read evidence, or preparing filings on an applicant principal's behalf" },
    ],
  },

  // Family: a GAP row has no ruled sibling doors — presence-when-true, so no
  // family registry is emitted. Edges attach if the cell's names are ever
  // ruled. (gigs.solar is a supply door — out of naming scope per #3;
  // metering.click / interconnection.click are held artifacts of THIS row,
  // recorded in projection.json, but neither serves a machine face today —
  // a family edge to a non-serving door would be a ghost surface.)
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>utilities-energy (placeholder address)</title></head>
<body>
<h1>utilities-energy</h1>
<p>Meter/interval reads, public interconnection-queue entries, applicant-side interconnection filings, and utility tariff records for Utilities &amp; Energy (NAICS 22) — noun-grain rails for the party filing into the utility. This is a placeholder address for an unnamed, depth-ruled category; the machine face is live and verifiable. All sandbox data is clearly labeled synthetic example data (schema-shaped synthetic identifiers; ESPI as typing anchor only).</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/verify">verify</a> · <a href="/interval-reads">interval-reads (keyless, labeled example data)</a></p>
</body></html>
`,
    md: `# utilities-energy

Meter/interval, interconnection-queue, applicant-filing, and tariff records for Utilities & Energy (NAICS 22) — placeholder address, live machine face, noun-grain Axis-2 posture. Sandbox data is labeled synthetic (schema-shaped synthetic identifiers).

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
- collection: ${ORIGIN}/interval-reads
`,
  },
});
