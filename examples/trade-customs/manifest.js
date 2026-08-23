/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces, byte-identical with pins — see axp/VENDORED.json).
 *
 * ORIGIN IS A PLACEHOLDER. This is a GAP register row (nothing held for
 * cross-border trade & customs, NAICS 481-483 + customs): per template spec
 * §0 the G3 substrate is built under a placeholder org.ai address and the G4
 * brand attaches when a name is ruled. The candidates on record (api.trade†,
 * api.customs†, tradedocs†) are ALL availability-unverified; nothing here
 * implies acquisition of any name.
 */
import { defineSiteManifest } from "./axp/index.js";
import seed from "./seed.json" with { type: "json" };

export const ORIGIN = "https://trade-customs.org.ai"; // PLACEHOLDER — GAP row, G4 name pending (#16)
export const SUBSTRATE = "trade-customs";

/**
 * G2 coordinates (axp-ext/rates-g2@0.2.0 §4) — carried VERBATIM onto the
 * agents.json card as the top-level `g2` object, and reused by /icp.json
 * (surfaces.js), which remains the linked long-form document via links.icp.
 */
export const G2 = {
  icp: {
    companyTypes: ["freight forwarder", "exporter / importer (trade-compliance and documentation ops)", "customs broker (licensed operator on the headless layer — never the estate's own regulated face)"],
    jobTypes: ["trade compliance manager", "documentation specialist", "freight forwarder operations", "customs broker"],
  },
  personas: [
    { id: "operator", description: "documentation lead at a freight forwarder assembling the cross-border packet per shipment" },
    { id: "developer", description: "developer at a forwarder-TMS or trade-documentation vendor integrating typed document records" },
    { id: "agent", description: "autonomous agent assembling and verifying trade-document packets on behalf of shippers" },
  ],
  motion: "B2A",
};

const llmsBody = `# trade-customs — typed cross-border trade documents and headless packet assembly (NAICS 481-483, customs)

The trade document set as typed records — electronic bill of lading
(DCSA-spec typing), certificate of origin, phytosanitary certificate,
commercial invoice — plus HTS-keyed customs entries, and the shipment grain
that ties a packet together. The packet is mandatory on every cross-border
edge; MLETR/ETDA adoption is converting paper documents into typed-data
demand jurisdiction by jurisdiction. Two faces, one definition:

- **Data face** — read the typed records: \`/shipments\`, \`/bills-of-lading\`,
  \`/certificates-of-origin\`, \`/phytosanitary-certificates\`,
  \`/commercial-invoices\`, \`/customs-entries\`.
- **Headless face** — the document-pipeline system-of-record door on the
  SAME collections: \`POST /shipments\` starts a packet in your sandbox
  workspace.

The regulated act (customs brokerage, 19 CFR 111) is separated from this
document layer by construction: the operator brings the license; broker-side
scopes answer BLOCKED here.

This surface serves under a **placeholder address**: the category has no
ruled brand name yet. The API contract, sandbox, and pricing document are
real and verifiable today.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/shipments                  # typed OK envelope, labeled example data
curl ${ORIGIN}/shipments?mode=ocean       # branching on the query
curl ${ORIGIN}/bills-of-lading            # the eBL grain (DCSA-spec typing)
curl ${ORIGIN}/pricing                    # the Pricing Document
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
  name: "trade-customs.org.ai",
  description:
    "Typed cross-border trade documents — DCSA-spec eBL, certificate of origin, phytosanitary certificate, commercial invoice — with HTS-keyed customs entries and shipment-grain packet assembly (NAICS 481-483 + customs), one definition serving a data face and a headless forwarder-grade document-pipeline face. The regulated brokerage act stays with licensed operators.",
  version: "0.1.0",

  // The ONE branching collection (Clauses 4 + 7 on one pathname).
  collection: {
    path: "/shipments",
    // axp-ext/rates-g2 §1: the canonical name of the collection operation —
    // the SAME string as the MCP tool (one operation, one identifier).
    operationId: "listShipments",
    memberName: "shipments",
    summary: "Shipments — the branching typed collection: OK | EMPTY | BLOCKED on one pathname",
    records: seed.shipments,
    filters: ["status", "mode"],
    // Broker-side practice scopes are regulation-blocked as an operated face
    // (19 CFR 111 — the operator brings the license); carrier contract rates
    // are counterpart-confidential. Both answer BLOCKED, honestly.
    blockedScopes: ["broker-entries", "carrier-contracts"],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today.
  // axp-ext/rates-g2 §1: each carries its canonical camelCase operationId —
  // the ONE cross-face name (OpenAPI = MCP tool = coverage ref = rate key).
  routes: [
    { method: "GET", path: "/shipments/{id}", operationId: "getShipment", summary: "One shipment by id, typed envelope, with its packet document refs" },
    {
      method: "POST",
      path: "/shipments",
      operationId: "createShipment",
      summary: "Start a shipment packet in your sandbox workspace (headless document-pipeline door)",
      description:
        "Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). Retention is disclosed in the response body; the sandbox is the real product over labeled example data.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["reference"], properties: { reference: { type: "string" }, mode: { type: "string", enum: ["ocean", "air", "rail"] }, originCountry: { type: "string" }, destinationCountry: { type: "string" } } } } } },
      responses: { 200: { description: "OK envelope with the created shipment and workspace id" } },
    },
    {
      method: "POST",
      path: "/shipments/{id}/assemble-packet",
      operationId: "assemblePacket",
      summary: "Assemble the full cross-border document packet for a shipment (outcome verb) — answers a typed 402 OFFER; wave-zero STUB, no live settlement",
      responses: { 402: { description: "OFFER envelope advertising the pay / work / claim ladder; stub: true — nothing is charged" } },
    },
    { method: "GET", path: "/bills-of-lading", operationId: "listBillsOfLading", summary: "Electronic bills of lading (DCSA-spec typing; MLETR transferable-record flag)", params: [{ name: "shipment", description: "filter by shipment id" }, { name: "status", description: "draft | issued | surrendered" }] },
    { method: "GET", path: "/bills-of-lading/{id}", operationId: "getBillOfLading", summary: "One eBL by id" },
    { method: "GET", path: "/certificates-of-origin", operationId: "listCertificatesOfOrigin", summary: "Certificates of origin (UN/CEFACT-typed)", params: [{ name: "shipment", description: "filter by shipment id" }] },
    { method: "GET", path: "/phytosanitary-certificates", operationId: "listPhytosanitaryCertificates", summary: "Phytosanitary certificates (agri shipments only — presence is honest, not padded)", params: [{ name: "shipment", description: "filter by shipment id" }] },
    { method: "GET", path: "/commercial-invoices", operationId: "listCommercialInvoices", summary: "Commercial invoices (UN/CEFACT-typed)", params: [{ name: "shipment", description: "filter by shipment id" }] },
    { method: "GET", path: "/commercial-invoices/{id}", operationId: "getCommercialInvoice", summary: "One commercial invoice by id" },
    { method: "GET", path: "/customs-entries", operationId: "listCustomsEntries", summary: "Customs entry / classification records (synthetic HTS-shaped keys, labeled; the row flags this grain [UNVERIFIED])", params: [{ name: "shipment", description: "filter by shipment id" }, { name: "status", description: "filed | released" }] },
    { method: "GET", path: "/customs-entries/{id}", operationId: "getCustomsEntry", summary: "One customs entry by id" },
    { method: "GET", path: "/icp.json", operationId: "getIcp", summary: "G2 coordinates: ICP + personas + System coordinates of this substrate" },
    { method: "GET", path: "/verify", operationId: "getVerify", summary: "The published verification suite document — run our tests" },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js).
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listShipments", "getShipment", "listBillsOfLading", "getBillOfLading", "listCertificatesOfOrigin", "listCustomsEntries"],
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
    // in the Pricing Document, keyed by the canonical operationId (survey
    // floor: every row zero-priced or carrying freeQuota; no reserved member
    // names). binding:false above covers these rows too: stated intent,
    // never terms.
    rates: [
      { operation: "listShipments", price: 0 },
      { operation: "getShipment", price: 0.002, freeQuota: 100 },
      { operation: "createShipment", price: 0, note: "anonymous sandbox workspaces — unmetered at wave zero" },
      { operation: "listBillsOfLading", price: 0 },
      { operation: "getBillOfLading", price: 0.002, freeQuota: 100 },
      { operation: "listCertificatesOfOrigin", price: 0 },
      { operation: "listPhytosanitaryCertificates", price: 0 },
      { operation: "listCommercialInvoices", price: 0 },
      { operation: "getCommercialInvoice", price: 0 },
      { operation: "listCustomsEntries", price: 0 },
      { operation: "getCustomsEntry", price: 0.002, freeQuota: 100 },
      {
        operation: "assemblePacket",
        price: 5.0,
        unit: "usd-per-assembled-packet",
        freeQuota: 1,
        stub: true,
        note: "Per completed assembled document packet (per-outcome). The 402 OFFER boundary is served today; settlement is a stub (test-mode) advertising the pay / work / claim ladder — nothing is charged.",
      },
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
<html lang="en"><head><meta charset="utf-8"><title>trade-customs (placeholder address)</title></head>
<body>
<h1>trade-customs</h1>
<p>Typed cross-border trade documents — eBL (DCSA-spec typing), certificate of origin, phytosanitary certificate, commercial invoice — with HTS-keyed customs entries and shipment-grain packet assembly (NAICS 481-483 + customs). This is a placeholder address for an unnamed category; the machine face is live and verifiable. The regulated brokerage act (19 CFR 111) stays with licensed operators.</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/shipments">shipments (keyless, labeled example data)</a></p>
</body></html>
`,
    md: `# trade-customs

Typed cross-border trade documents and headless packet assembly (NAICS 481-483 + customs) — placeholder address, live machine face.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- collection: ${ORIGIN}/shipments
`,
  },
});
