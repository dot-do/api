/**
 * manifest.mjs — the ONE site manifest the entire machine face is generated
 * from (vendored axp-faces at the PINS.json pin, apis-ax-axp@2.6.0,
 * digest a9a1197c…). Docs cannot drift because docs render from this.
 *
 * PLACEHOLDER ADDRESS. Register row `fn-customer-service` is a GAP row:
 * no api-grammar name is held for the customer-service function (api.support
 * is grammar-implied, NOT held; gigs.support is a supply door, not a
 * candidate). Per spec §0 the G3 substrate + sandbox are instantiated under
 * this placeholder origin and the G4 brand config waits for acquisition
 * (#16). When a name lands, this origin string is the only line that moves.
 */
import { defineSiteManifest } from "./axp/manifest.js";
import { substrate, seed } from "./substrate.mjs";

export const ORIGIN = "https://fn-customer-service.example.com.ai";

/* The operation rate card (axp-ext-rates-g2@0.1.0 §2) — TOP-LEVEL `rates[]`
 * in the Pricing Document, one row per operation, keyed by the canonical
 * operationId (§1: route operationId = MCP tool name = suite coverage
 * reference = SDK method = this key). Native generator members since
 * axp-faces 0.2.0 — the former in-offer bridge placement is gone. */
const rates = [
  { operation: "listTickets", price: 0, unit: "usd-per-call", note: "free, unlimited — the keyless universal floor" },
  { operation: "getTicket", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "createTicket", price: 0, unit: "usd-per-call", note: "free — writes land in the ephemeral anonymous sandbox workspace" },
  { operation: "resolveTicket", price: 0.002, unit: "usd-per-call", freeQuota: 500 },
  { operation: "listConversations", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "searchDeflections", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
];

/* The row's G2 projection (axp-ext-rates-g2@0.1.0 §4) — machine-readable
 * go-to-market coordinates, carried verbatim onto the card as the TOP-LEVEL
 * `g2` object. One definition: the worker's /icp.json (links.icp) serves the
 * same truth. Name-independent by construction (GAP row). */
export const g2 = Object.freeze({
  $context: "https://schema.org.ai",
  $type: "G2",
  substrate: "fn-customer-service",
  motion: "B2A",
  icp: {
    companyTypes: "all — the horizontal Function × Department × Process root: every CompanyType's support/CX department",
    departments: ["support", "customer-experience"],
    jobTypes: ["support lead", "CX manager", "customer service representative"],
  },
  personas: [
    { role: "support lead", reads: "ticket queues, resolution cycles", buys: "nothing here yet — wave zero" },
    { role: "CX manager", reads: "deflection corpus at CompanyType grain", buys: "nothing here yet — wave zero" },
    { role: "autonomous agent", reads: "everything on this face, keyless", onboarding: "B2A — no OAuth, no card; 402-shaped boundary (stub)" },
  ],
  agentClasses: ["machine (id.org.ai grain)", "machine (unattributed)"],
  firstCustomer: "internal — the estate's own portfolio properties run the same Ticket before any external motion",
});

const llmsBody = `# fn-customer-service — the customer-service function's machine face (placeholder address)

The Ticket record and helpdesk system-of-record doors for the customer-service
function, served as one substrate with two plies: read the record collections
(data face) or operate the same collections as a system of record (headless
face). Same envelopes, same rate rows, one definition.

This surface runs under a PLACEHOLDER address: the category's api-grammar name
is not yet held. Everything below answers today, keyless. All records in the
anonymous sandbox are labeled example data (simulated, never live customers).

## Quickstart

\`\`\`sh
curl ${ORIGIN}/tickets                 # keyless first value — typed OK envelope
curl ${ORIGIN}/tickets?status=open     # branch on the query
curl ${ORIGIN}/deflections?topic=metering
curl ${ORIGIN}/pricing                 # the Pricing Document (402-shaped stub — no billing occurs)
\`\`\`

## Faces

- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- icp: ${ORIGIN}/icp.json
- substrate: ${ORIGIN}/substrate.json
- verify: ${ORIGIN}/verify
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "fn-customer-service.example.com.ai",
  description:
    "Customer-service function substrate: the Ticket record, conversation/resolution events, and the deflection corpus — data face and helpdesk system-of-record face from one definition, anonymous sandbox as the universal floor. Wave-zero surface under a placeholder address.",
  version: "0.1.0",

  collection: {
    path: "/tickets",
    /* axp-ext-rates-g2 §1: the branching collection's canonical operationId —
       the same string is the MCP tool name and the rates[] key. */
    operationId: "listTickets",
    memberName: "tickets",
    summary: "Support tickets — the branching Ticket collection: typed OK | EMPTY | BLOCKED | OFFER on one pathname",
    records: seed.tickets,
    filters: ["status", "priority"],
  },

  routes: [
    {
      method: "GET",
      path: "/tickets/{ticketId}",
      operationId: "getTicket",
      summary: "getTicket — one Ticket record by id (data face read; same row the headless face operates on)",
      params: [{ name: "ticketId", in: "path", required: true, description: "the Ticket id (seed ids look like TCK-952-0001)" }],
      responses: {
        200: { description: "OK envelope with the ticket" },
        404: { description: "EMPTY envelope — no such ticket" },
      },
    },
    {
      method: "POST",
      path: "/tickets",
      operationId: "createTicket",
      summary: "createTicket — headless system-of-record door: create a Ticket in the ephemeral anonymous sandbox workspace (isolate-lifetime retention, disclosed on every response)",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["subject"], properties: { subject: { type: "string" }, priority: { type: "string" }, category: { type: "string" } } } } },
      },
      responses: { 200: { description: "OK envelope with the created (ephemeral, labeled) ticket" } },
    },
    {
      method: "POST",
      path: "/tickets/{ticketId}/resolve",
      operationId: "resolveTicket",
      summary: "resolveTicket — headless verb on the same collection: resolve a workspace ticket (seed-tenant records are read-only and answer BLOCKED)",
      params: [{ name: "ticketId", in: "path", required: true, description: "the Ticket id" }],
      responses: {
        200: { description: "OK envelope with the resolved ticket" },
        403: { description: "BLOCKED envelope — the seed tenant is read-only" },
      },
    },
    {
      method: "GET",
      path: "/conversations",
      operationId: "listConversations",
      summary: "listConversations — conversation and resolution-event records, filterable by ticket",
      params: [{ name: "ticket", description: "a Ticket id; omitted lists all seed conversation events" }],
    },
    {
      method: "GET",
      path: "/deflections",
      operationId: "searchDeflections",
      summary: "searchDeflections — the deflection-article corpus (generated binding: derived from the owned ticket corpus, CompanyType grain)",
      params: [
        { name: "topic", description: "topic key, e.g. metering, access" },
        { name: "companyType", description: "CompanyType grain, e.g. saas" },
      ],
    },
    {
      method: "GET",
      path: "/icp.json",
      operationId: "getIcp",
      summary: "the G2 coordinates this substrate's default projection targets (ICP + persona) — also linked from the card as links.icp",
    },
    {
      method: "GET",
      path: "/substrate.json",
      operationId: "getSubstrate",
      summary: "the G3 APIProduct instance: Nouns with schema + binding + verbs, System coordinate, operations, sandbox spec, meters",
    },
    {
      method: "GET",
      path: "/verify",
      operationId: "getVerify",
      summary: "the published public-contract test page — every claim on this surface as a runnable probe, not an adjective",
    },
  ],

  pricing: {
    model: "metered",
    hardCeiling: 25,
    unit: "usd-per-month",
    price: 0.001,
    /* axp-ext-rates-g2 §2 — the ruled placement: top-level rates[] in the
       Pricing Document, native since axp-faces 0.2.0 (the in-offer bridge and
       the filed generator gap are closed). */
    rates,
    binding: false,
    statement:
      "Wave-zero 402-shaped stub under a placeholder address: the OFFER boundary and rate rows are real and typed, but no billing occurs, no payment method exists, and nothing is charged — every rate row prices from zero or carries a free quota. This document states intent; no terms bind it.",
    offers: [
      {
        id: "b2a-metered-stub",
        title: "Metered access (402-shaped stub — no live settlement at wave zero)",
        price: { model: "metered", hardCeiling: 25, unit: "usd-per-month" },
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    /* axp-ext-rates-g2 §1: MCP tools are declared BY NAME as strings — each
       name IS the canonical operationId (descriptions and input schemas are
       served live by tools/list in worker.mjs). */
    tools: ["listTickets", "getTicket", "searchDeflections"],
  },

  /* axp-ext-rates-g2 §3 — links.verify: the published runnable-probe door
     (the /verify page the worker serves), absolutized by the generator. */
  verifyUrl: "/verify",

  /* axp-ext-rates-g2 §4 — the TOP-LEVEL g2 card object, carried verbatim;
     links.icp (icpUrl) remains independent and legal beside it. */
  g2,

  icpUrl: `${ORIGIN}/icp.json`,
  llms: { body: llmsBody },

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>fn-customer-service (placeholder)</title></head>
<body><h1>Customer-service function — machine face (placeholder address)</h1>
<p>The Ticket record and helpdesk system-of-record doors, one substrate, two plies. Anonymous sandbox is the floor; every sandbox record is labeled example data (simulated, never a live customer).</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> · <a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# fn-customer-service — machine face (placeholder address)

The Ticket record and helpdesk system-of-record doors, one substrate, two plies.
Anonymous sandbox is the floor; all sandbox records are labeled example data.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
});

export { substrate, seed };
