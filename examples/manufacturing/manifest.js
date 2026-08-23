/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces, byte-identical with pins — see axp/VENDORED.json).
 *
 * This vendoring carries axp-ext/rates-g2@0.1.0 (the ruled extension
 * placements, generator-native — no local bridge needed): `rates[]` TOP-LEVEL
 * in the Pricing Document, `g2` TOP-LEVEL on the capability card,
 * `links.verify` as a card link member, and the canonical camelCase-verb
 * `operationId` on every route.
 *
 * ORIGIN IS A PLACEHOLDER. This is a GAP register row — the register's
 * largest naming vacuum: zero market-face names held for NAICS 31-33.
 * manufacturing.org.ai is a held G2 NAMESPACE, not a market face; per
 * template spec §0 the G3 substrate is built under it as a placeholder and
 * the G4 brand attaches when a name is ruled (#16 acquisition lane).
 * Nothing here implies acquisition of any name.
 */
import { defineSiteManifest } from "./axp/index.js";
import { product } from "./product.js";
import seed from "./seed.json" with { type: "json" };

export const ORIGIN = "https://manufacturing.org.ai"; // PLACEHOLDER — held G2 namespace; GAP row, G4 name pending
export const SUBSTRATE = "manufacturing";

const llmsBody = `# manufacturing — item/BOM/GTIN product master data for manufacturers (NAICS 31-33)

Typed product-master records (Item, BillOfMaterials, ProductPassport) on the
GS1 GTIN/GPC + UNSPSC identity spine, the buyer-side RFQ grain (RFQ, Quote),
and X12 850/856/810 typing anchors on the trading edge. Two faces, one
definition:

- **Data face** — read the typed records: \`/items\`, \`/boms\`, \`/passports\`,
  \`/rfqs\`, \`/quotes\`, \`/trading-documents\`, \`/crosswalk\`.
- **Headless face** — the PIM/ERP master-data system-of-record door on the
  SAME collections: \`POST /items\` creates an item (with a 952-prefixed demo
  GTIN) in your sandbox workspace.

This surface serves under a **placeholder address**: the category has no
ruled brand name yet. The API contract, sandbox, and pricing document are
real and verifiable today.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/items                          # typed OK envelope, labeled example data
curl ${ORIGIN}/items?gpcSegment=electrical-example  # branching on the query
curl ${ORIGIN}/passports                      # Digital Product Passport grain (battery DPP, statutory 2027-02-18)
curl ${ORIGIN}/pricing                        # the Pricing Document (rates[] top-level)
\`\`\`

All sandbox records are clearly labeled synthetic example data
(\`example: true\` on every record; GTINs use the GS1 demo prefix 952 with
valid check digits; classification codes are schema-shaped synthetic).
Anonymous writes mint an ephemeral workspace (see the \`X-Workspace\` response
header); retention is disclosed in each response. Payment endpoints are
402-shaped stubs at this stage — the pricing document says so in its own
\`binding\`/\`statement\` members, and nothing is ever charged.
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "manufacturing.org.ai",
  description:
    "Item, BOM, and GTIN-grain product master data for manufacturing (NAICS 31-33) on the GS1/UNSPSC identity spine, with the RFQ grain and X12 trading-edge typing anchors — one definition serving a data face and a headless PIM/ERP master-data face.",
  version: "0.1.0",

  // The ONE branching collection (Clauses 4 + 7 on one pathname).
  collection: {
    path: "/items",
    operationId: "listItems",
    memberName: "items",
    summary: "Items (product master records) — the branching typed collection: OK | EMPTY | BLOCKED on one pathname",
    records: seed.items,
    filters: ["status", "gpcSegment"],
    blockedScopes: ["internal", "partner-pricing"],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today,
  // and every route carries its canonical operationId (axp-ext/rates-g2 §1).
  routes: [
    { method: "GET", path: "/items/{id}", operationId: "getItem", summary: "One item by id, typed envelope" },
    {
      method: "POST",
      path: "/items",
      operationId: "createItem",
      summary: "Create an item in your sandbox workspace (headless PIM/ERP master-data door)",
      description:
        "Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). The created item gets a GS1 demo-prefix (952) GTIN with a valid check digit. Retention is disclosed in the response body; the sandbox is the real product over labeled example data.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, gpcSegment: { type: "string" } } } } } },
      responses: { 200: { description: "OK envelope with the created record and workspace id" } },
    },
    {
      method: "POST",
      path: "/items/{id}/syndicate",
      operationId: "syndicateItem",
      summary: "Syndicate a verified item master record to a channel (outcome verb) — answers a typed 402 OFFER; wave-zero STUB, no live settlement",
      responses: { 402: { description: "OFFER envelope; only the mounted sandbox rung is advertised as live — unmounted rungs are labeled stubs; nothing is charged" } },
    },
    { method: "GET", path: "/boms", operationId: "listBoms", summary: "Bills of materials", params: [{ name: "item", description: "filter by parent item id" }] },
    { method: "GET", path: "/boms/{id}", operationId: "getBom", summary: "One BOM by id" },
    { method: "GET", path: "/passports", operationId: "listPassports", summary: "Digital Product Passports (EU battery-regulation DPP grain, statutory 2027-02-18; synthetic labeled records)", params: [{ name: "item", description: "filter by item id" }] },
    { method: "GET", path: "/passports/{id}", operationId: "getPassport", summary: "One Digital Product Passport by id" },
    { method: "GET", path: "/rfqs", operationId: "listRfqs", summary: "RFQs — the buyer-side manufacturing RFQ grain", params: [{ name: "status", description: "open | closed" }] },
    { method: "GET", path: "/rfqs/{id}", operationId: "getRfq", summary: "One RFQ by id" },
    { method: "GET", path: "/quotes", operationId: "listQuotes", summary: "Quote responses to RFQs", params: [{ name: "rfq", description: "filter by RFQ id" }] },
    { method: "GET", path: "/trading-documents", operationId: "listTradingDocuments", summary: "X12 trading-edge documents (850 PO / 856 ASN / 810 Invoice typing anchors; synthetic content, labeled)", params: [{ name: "kind", description: "850 | 856 | 810" }, { name: "item", description: "filter by item id" }] },
    { method: "GET", path: "/crosswalk", operationId: "listCrosswalkEntries", summary: "UNSPSC↔GPC↔HTS crosswalk rows (the identity spine; schema-shaped synthetic codes, labeled)", params: [{ name: "unspsc", description: "filter by synthetic UNSPSC-EX code" }, { name: "gpc", description: "filter by synthetic GPC-EX code" }] },
    { method: "GET", path: "/icp.json", operationId: "getIcp", summary: "G2 coordinates: ICP + personas + System coordinates of this substrate" },
    { method: "GET", path: "/verify", operationId: "getVerifySuite", summary: "The published verification suite document — run our tests" },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js). Tool
  // names ARE the canonical operationIds (axp-ext/rates-g2 §1). The door is
  // AUTHLESS at the anon-sandbox rung (the universal floor); a bearer-key
  // gate applies to rungs above it, and none of those rungs is mounted at
  // wave zero — so no key surface is advertised (presence-when-true).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listItems", "getItem", "listBoms", "listPassports", "listTradingDocuments", "listCrosswalkEntries"],
  },

  // Wave-zero pricing: metered SHAPE with the 402 boundary served, honestly
  // declared UNBOUND (stub — no live settlement exists on this placeholder
  // surface; test-mode counts as face-payable, never as billing).
  // `rates` is TOP-LEVEL in the Pricing Document (the ruled placement),
  // operationId-keyed; every row names a freeQuota or prices from zero.
  pricing: {
    model: "metered",
    hardCeiling: 25,
    unit: "usd-per-month",
    price: 0.002,
    binding: false,
    statement:
      "Wave-zero stub pricing on a placeholder surface: no live settlement exists here and nothing is ever charged. The 402 boundary is test-mode. Rates are stated intent for the category, not terms.",
    rates: [
      { operation: "listItems", price: 0 },
      { operation: "getItem", price: 0.002, freeQuota: 100 },
      { operation: "createItem", price: 0, note: "sandbox workspaces — free at the anon floor" },
      {
        operation: "syndicateItem",
        price: 0.25,
        unit: "per verified item syndication (per-outcome)",
        freeQuota: 25,
        note: "402 OFFER boundary is served today; settlement is a stub (test-mode). Free-with-proof-of-work syndication is the row's structural axis (register SC #15, HYPOTHESIS) — the work rung arrives when the credit ledger mounts.",
      },
      { operation: "listBoms", price: 0 },
      { operation: "getBom", price: 0.002, freeQuota: 100 },
      { operation: "listPassports", price: 0 },
      { operation: "getPassport", price: 0.002, freeQuota: 100 },
      { operation: "listRfqs", price: 0 },
      { operation: "getRfq", price: 0 },
      { operation: "listQuotes", price: 0 },
      { operation: "listTradingDocuments", price: 0 },
      { operation: "listCrosswalkEntries", price: 0 },
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

  // axp-ext/rates-g2 §4 — G2/ICP coordinates TOP-LEVEL on the card.
  g2: {
    icp: {
      companyTypes: ["manufacturer (discrete)", "manufacturer (process)", "industrial distributor"],
      jobTypes: ["product-data / e-commerce ops manager", "master-data specialist", "engineering document control", "procurement"],
    },
    personas: [
      { id: "operator", description: "product-data operations lead at a manufacturer (master-data grain buyer)" },
      { id: "developer", description: "developer at a PIM/ERP/PLM systems vendor integrating item-master records" },
      { id: "agent", description: "autonomous agent validating, enriching, or syndicating product master data, or issuing RFQs on a principal's behalf" },
    ],
    systems: product.systems,
  },

  // Family: a GAP row has no ruled sibling doors — presence-when-true, so no
  // family registry is emitted. Edges attach when the cell's names are ruled.
  // (The GS1-adjacent holdings epcis.dev/barcoding.dev belong to the
  // warehousing-traceability row, NOT this one — register row note.)
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>manufacturing (placeholder address)</title></head>
<body>
<h1>manufacturing</h1>
<p>Item, BOM, and GTIN-grain product master data for manufacturing (NAICS 31-33) on the GS1/UNSPSC identity spine. This is a placeholder address for an unnamed category; the machine face is live and verifiable. All sandbox data is clearly labeled synthetic example data (GS1 demo prefix 952).</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/verify">verify</a> · <a href="/items">items (keyless, labeled example data)</a></p>
</body></html>
`,
    md: `# manufacturing

Item, BOM, and GTIN-grain product master data for manufacturing (NAICS 31-33) — placeholder address, live machine face. Sandbox data is labeled synthetic (GS1 demo prefix 952).

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
- collection: ${ORIGIN}/items
`,
  },
});
