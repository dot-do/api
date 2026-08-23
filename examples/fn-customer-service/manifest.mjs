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

const rates = [
  { operation: "listCollection", method: "GET", path: "/tickets", unit: "usd-per-call", pricePerCall: 0, note: "free, unlimited — the keyless universal floor" },
  { operation: "getTicket", method: "GET", path: "/tickets/{ticketId}", unit: "usd-per-call", pricePerCall: 0.001, freeQuota: 1000 },
  { operation: "createTicket", method: "POST", path: "/tickets", unit: "usd-per-call", pricePerCall: 0, note: "free — writes land in the ephemeral anonymous sandbox workspace" },
  { operation: "resolveTicket", method: "POST", path: "/tickets/{ticketId}/resolve", unit: "usd-per-call", pricePerCall: 0.002, freeQuota: 500 },
  { operation: "listConversations", method: "GET", path: "/conversations", unit: "usd-per-call", pricePerCall: 0.001, freeQuota: 1000 },
  { operation: "searchDeflections", method: "GET", path: "/deflections", unit: "usd-per-call", pricePerCall: 0.001, freeQuota: 1000 },
];

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
    memberName: "tickets",
    summary: "Support tickets — the branching Ticket collection: typed OK | EMPTY | BLOCKED | OFFER on one pathname",
    records: seed.tickets,
    filters: ["status", "priority"],
  },

  routes: [
    {
      method: "GET",
      path: "/tickets/{ticketId}",
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
      summary: "listConversations — conversation and resolution-event records, filterable by ticket",
      params: [{ name: "ticket", description: "a Ticket id; omitted lists all seed conversation events" }],
    },
    {
      method: "GET",
      path: "/deflections",
      summary: "searchDeflections — the deflection-article corpus (generated binding: derived from the owned ticket corpus, CompanyType grain)",
      params: [
        { name: "topic", description: "topic key, e.g. metering, access" },
        { name: "companyType", description: "CompanyType grain, e.g. saas" },
      ],
    },
    {
      method: "GET",
      path: "/icp.json",
      summary: "the G2 coordinates this substrate's default projection targets (ICP + persona) — also linked from the card as links.icp",
    },
    {
      method: "GET",
      path: "/substrate.json",
      summary: "the G3 APIProduct instance: Nouns with schema + binding + verbs, System coordinate, operations, sandbox spec, meters",
    },
    {
      method: "GET",
      path: "/verify",
      summary: "the published public-contract test page — every claim on this surface as a runnable probe, not an adjective",
    },
  ],

  pricing: {
    model: "metered",
    hardCeiling: 25,
    unit: "usd-per-month",
    price: 0.001,
    binding: false,
    statement:
      "Wave-zero 402-shaped stub under a placeholder address: the OFFER boundary and rate rows are real and typed, but no billing occurs, no payment method exists, and nothing is charged — every rate row prices from zero or carries a free quota. This document states intent; no terms bind it.",
    offers: [
      {
        id: "b2a-metered-stub",
        title: "Metered access (402-shaped stub — no live settlement at wave zero)",
        price: { model: "metered", hardCeiling: 25, unit: "usd-per-month" },
        rates,
        $comment:
          "rates[] rows are keyed by substrate operation name; the vendored generator emits operationIds only for its own routes (listCollection et al), so route-level operationId emission is a filed axp-faces gap, not a per-site patch.",
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: [
      { name: "listTickets", description: "list/filter the Ticket collection (same records, same envelope truth as GET /tickets)" },
      { name: "getTicket", description: "one Ticket by id" },
      { name: "searchDeflections", description: "search the deflection-article corpus" },
    ],
  },

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
