/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces 0.3.0 with axp-ext-rates-g2@0.2.0, byte-identical with
 * pins — see axp/VENDORED.json for the committed HEAD it was vendored from).
 *
 * ORIGIN IS A PLACEHOLDER. This is a GAP register row (nothing held for
 * NAICS 325; api.chemicals / apis.chemicals availability [UNVERIFIED]): per
 * template spec §0 the G3 substrate is built under a placeholder org.ai
 * address and the G4 brand attaches when a name is ruled. Nothing here
 * implies acquisition of any name.
 */
import { defineSiteManifest } from "./axp/index.js";
import seed from "./seed.json" with { type: "json" };

export const ORIGIN = "https://chemicals-materials.org.ai"; // PLACEHOLDER — GAP row, G4 name pending
export const SUBSTRATE = "chemicals-materials";

/**
 * G2 coordinates (axp-ext/rates-g2@0.2.0 §4) — carried VERBATIM onto the
 * agents.json card as the top-level `g2` object, and reused by /icp.json
 * (surfaces.js), which remains the linked long-form document via links.icp.
 */
export const G2 = {
  icp: {
    companyTypes: ["chemical manufacturer", "chemical distributor", "downstream receiving establishment"],
    jobTypes: ["EHS manager", "hazmat shipping coordinator", "compliance officer"],
  },
  personas: [
    { id: "operator", description: "EHS/compliance manager maintaining SDS access and chemical inventory under HazCom at a manufacturer, distributor, or receiving establishment" },
    { id: "developer", description: "developer at an EHS/chemical-inventory or freight-systems vendor integrating SDS and hazmat-declaration records" },
    { id: "agent", description: "autonomous agent assembling the per-shipment hazmat documentation packet (shipping papers) on a transaction edge" },
  ],
  motion: "B2A",
};

const llmsBody = `# chemicals-materials — GHS 16-section SDS records and hazmat shipping declarations for chemicals & materials (NAICS 325)

Typed substance records (CAS-shaped synthetic ids at wave zero), GHS
16-section Safety Data Sheet documents, hazmat shipping declarations
(49 CFR shipping-papers grain), and the facility right-to-know inventory
join. Two faces, one definition:

- **Data face** — read the typed records: \`/substances\`,
  \`/safety-data-sheets\`, \`/shipping-declarations\`, \`/facilities\`.
- **Headless face** — the chemical-inventory system-of-record door on the
  SAME collections: \`POST /substances\` registers a substance in your
  sandbox workspace inventory.

This surface serves under a **placeholder address**: the category has no
ruled brand name yet, and the register row is a single-lens candidate with
an explicit probe-before-build flag — the API contract, sandbox, and pricing
document are real and verifiable today; every unproven anchor stays marked.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/safety-data-sheets                       # typed OK envelope, labeled example data
curl ${ORIGIN}/safety-data-sheets?hazardClass=flammable-liquid  # branching on the query
curl ${ORIGIN}/shipping-declarations                    # the per-edge compliance artifact grain
curl ${ORIGIN}/pricing                                  # the Pricing Document
\`\`\`

All sandbox records are clearly labeled synthetic example data
(\`example: true\` on every record) — substance ids are CAS-SHAPED synthetic,
never real registry numbers. Anonymous writes mint an ephemeral workspace
(see the \`X-Workspace\` response header); retention is disclosed in each
response. Payment endpoints are 402-shaped stubs at this stage — the pricing
document says so in its own \`binding\`/\`statement\` members, and nothing is
ever charged.
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "chemicals-materials.org.ai",
  description:
    "GHS 16-section Safety Data Sheet records, CAS-shaped substance records, hazmat shipping declarations, and the facility right-to-know inventory join for chemicals & materials (NAICS 325) — one definition serving a data face and a headless chemical-inventory face. Placeholder address for a GAP register row; synthetic labeled sandbox data.",
  version: "0.1.0",

  // The ONE branching collection (Clauses 4 + 7 on one pathname) — the SDS
  // document grain, the row's settled artifact.
  collection: {
    path: "/safety-data-sheets",
    // The canonical camelCase name of the collection operation — the SAME
    // string as the MCP tool, the suite ref, and the rate-card key.
    operationId: "listSafetyDataSheets",
    memberName: "safetyDataSheets",
    summary: "Safety Data Sheets (GHS 16-section) — the branching typed collection: OK | EMPTY | BLOCKED on one pathname",
    records: seed.safetyDataSheets,
    filters: ["hazardClass", "supplier"],
    blockedScopes: ["trade-secret", "supplier-pricing"],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today,
  // each carrying its canonical camelCase operationId (one operation, one
  // name across contract, MCP door, meters, and rate card).
  routes: [
    { method: "GET", path: "/safety-data-sheets/{id}", operationId: "getSafetyDataSheet", summary: "One SDS by id — all 16 GHS sections, typed envelope" },
    { method: "GET", path: "/substances", operationId: "listSubstances", summary: "Substance records (CAS-shaped synthetic ids, labeled)", params: [{ name: "hazardClass", description: "filter by GHS hazard class slug" }, { name: "physicalState", description: "solid | liquid | gas" }] },
    { method: "GET", path: "/substances/{id}", operationId: "getSubstance", summary: "One substance by id" },
    {
      method: "POST",
      path: "/substances",
      operationId: "createSubstance",
      summary: "Register a substance in your sandbox workspace inventory (headless chemical-inventory system-of-record door)",
      description:
        "Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). Retention is disclosed in the response body; the sandbox is the real product over labeled example data.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, physicalState: { type: "string" }, hazardClass: { type: "string" } } } } } },
      responses: { 200: { description: "OK envelope with the created record and workspace id" } },
    },
    { method: "GET", path: "/shipping-declarations", operationId: "listShippingDeclarations", summary: "Hazmat shipping declarations (49 CFR shipping-papers grain; synthetic, labeled)", params: [{ name: "status", description: "draft | issued" }, { name: "substance", description: "filter by substance id" }] },
    { method: "GET", path: "/shipping-declarations/{id}", operationId: "getShippingDeclaration", summary: "One shipping declaration by id" },
    {
      method: "POST",
      path: "/shipping-declarations/{id}/issue",
      operationId: "issueShippingDeclaration",
      summary: "Issue the completed shipping-papers packet (outcome verb) — answers a typed 402 OFFER; wave-zero STUB, no live settlement",
      responses: { 402: { description: "OFFER envelope advertising the pay / work / claim ladder; stub: true — nothing is charged" } },
    },
    { method: "GET", path: "/facilities", operationId: "listFacilities", summary: "Facilities — the right-to-know inventory join (synthetic, labeled)" },
    { method: "GET", path: "/facilities/{id}", operationId: "getFacility", summary: "One facility by id, with its substance inventory" },
    { method: "GET", path: "/icp.json", operationId: "getIcp", summary: "G2 coordinates: ICP + personas + System coordinates of this substrate" },
    { method: "GET", path: "/verify", operationId: "getVerify", summary: "The published verification suite document — run our tests" },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js). Tool
  // names are the SAME canonical operationId strings (five-surface invariant).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listSafetyDataSheets", "getSafetyDataSheet", "listSubstances", "getSubstance", "listShippingDeclarations", "listFacilities"],
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
    // The operation rate card (axp-ext/rates-g2@0.2.0 §2) — TOP-LEVEL rates[]
    // in the Pricing Document, keyed by the canonical operationId; every row
    // has freeQuota or prices from zero (survey-floor vocabulary).
    // binding:false above covers these rows too: stated intent, never terms.
    rates: [
      { operation: "listSafetyDataSheets", price: 0 },
      { operation: "getSafetyDataSheet", price: 0.002, freeQuota: 100 },
      { operation: "listSubstances", price: 0 },
      { operation: "getSubstance", price: 0.002, freeQuota: 100 },
      { operation: "createSubstance", price: 0, note: "anonymous sandbox workspaces — unmetered at wave zero" },
      { operation: "listShippingDeclarations", price: 0 },
      { operation: "getShippingDeclaration", price: 0 },
      {
        operation: "issueShippingDeclaration",
        price: 2.5,
        unit: "usd-per-issued-declaration",
        freeQuota: 1,
        stub: true,
        note: "Per completed shipping-papers packet (per-outcome, the per-edge compliance artifact). The 402 OFFER boundary is served today; settlement is a stub (test-mode) advertising the pay / work / claim ladder — nothing is charged.",
      },
      { operation: "listFacilities", price: 0 },
      { operation: "getFacility", price: 0 },
    ],
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

  // axp-ext/rates-g2 §3: the card's links.verify — the published runnable
  // suite anyone can run against the live surface ("run this", not "trust us").
  verifyUrl: "/verify",

  // axp-ext/rates-g2 §4: G2/ICP coordinates TOP-LEVEL on the card, verbatim.
  // links.icp (icpUrl) stays legal and declared beside it — the long form.
  g2: G2,
  icpUrl: `${ORIGIN}/icp.json`,

  // Family: a GAP row has no ruled sibling doors — presence-when-true, so no
  // family registry is emitted. Edges attach when the cell's names are ruled.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>chemicals-materials (placeholder address)</title></head>
<body>
<h1>chemicals-materials</h1>
<p>GHS 16-section Safety Data Sheet records, substance records, and hazmat shipping declarations for chemicals &amp; materials (NAICS 325). This is a placeholder address for an unnamed category; the machine face is live and verifiable. All records are labeled synthetic example data.</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/safety-data-sheets">safety-data-sheets (keyless, labeled example data)</a></p>
</body></html>
`,
    md: `# chemicals-materials

GHS 16-section SDS records, substance records, and hazmat shipping declarations for chemicals & materials (NAICS 325) — placeholder address, live machine face, labeled synthetic sandbox data.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- collection: ${ORIGIN}/safety-data-sheets
`,
  },
});
