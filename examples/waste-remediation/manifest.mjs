/**
 * manifest.mjs — the ONE site manifest the entire machine face is generated
 * from (vendored axp-faces 0.3.0 at the PINS.json pin, apis-ax-axp@2.6.0,
 * digest a9a1197c…, with the ratified generator extension
 * axp-ext-rates-g2@0.2.0). Docs cannot drift because docs render from this.
 *
 * PLACEHOLDER ADDRESS. Register row `waste-remediation` is a GAP row —
 * the register's own verdict: "GAP — zero names held anywhere in the
 * estate" (coverage C.1 lists the category among those with no named
 * candidate at all). Per spec §0 the G3 substrate + sandbox are
 * instantiated under this placeholder origin and the G4 brand config waits
 * for acquisition (#16). When a name lands, this origin string is the only
 * line that moves.
 */
import { defineSiteManifest } from "./axp/manifest.js";
import { substrate, seed } from "./substrate.mjs";

export const ORIGIN = "https://waste-remediation.example.com.ai";

/* The operation rate card (axp-ext-rates-g2 §2) — TOP-LEVEL `rates[]` in the
 * Pricing Document, one row per operation, keyed by the canonical
 * operationId (§1: route operationId = MCP tool name = suite coverage
 * reference = SDK method = this key). Native generator members since
 * axp-faces 0.2.0. Every row prices from zero or carries a free quota. */
const rates = [
  { operation: "listManifests", price: 0, unit: "usd-per-call", note: "free — the keyless universal floor, no cap on the included allowance at wave zero" },
  { operation: "getManifest", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "createManifest", price: 0, unit: "usd-per-call", note: "free — writes land in the ephemeral anonymous sandbox workspace" },
  { operation: "listFacilities", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "getFacility", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "listWorkOrders", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "createWorkOrder", price: 0, unit: "usd-per-call", note: "free — writes land in the ephemeral anonymous sandbox workspace" },
  { operation: "completeWorkOrder", price: 0.002, unit: "usd-per-call", freeQuota: 500 },
  { operation: "listScaleTickets", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "listWasteProfiles", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
];

/* The row's G2 projection (axp-ext-rates-g2 §4) — machine-readable
 * go-to-market coordinates, carried verbatim onto the card as the TOP-LEVEL
 * `g2` object. One definition: the worker's /icp.json (links.icp) serves the
 * same truth. Name-independent by construction (GAP row). */
export const g2 = Object.freeze({
  $context: "https://schema.org.ai",
  $type: "G2",
  substrate: "waste-remediation",
  motion: "B2A",
  icp: {
    companyTypes: ["hauler", "transfer/disposal facility", "remediation contractor"],
    industries: ["NAICS 562"],
    jobTypes: ["compliance manager", "route/dispatch manager"],
    demandSide:
      "universal-input-row shaped: every manufacturer and construction site is a waste generator with manifest obligations [UNVERIFIED inference carried from the register row]",
  },
  personas: [
    { role: "compliance manager", reads: "manifest lifecycle, waste profiles, facility compliance status", buys: "nothing here yet — wave zero" },
    { role: "route/dispatch manager", reads: "work orders, scale tickets", buys: "nothing here yet — wave zero" },
    { role: "autonomous agent", reads: "everything on this face, keyless", onboarding: "B2A — no OAuth, no card; 402-shaped boundary (stub)" },
  ],
  agentClasses: ["machine (id.org.ai grain)", "machine (unattributed)"],
  firstCustomer: "none claimable — GAP row under a placeholder address; the demand thesis (generator-side manifest obligations) is a register inference, not a customer",
});

const llmsBody = `# waste-remediation — the waste & remediation category's machine face (placeholder address)

The hazardous-waste Manifest record, the REAL EPA RCRA facility corpus, and
route/dispatch system-of-record doors for NAICS 562, served as one substrate
with two plies: read the record collections (data face) or operate the same
collections as a dispatch system of record (headless face). Same envelopes,
same rate rows, one definition.

This surface runs under a PLACEHOLDER address: the category holds zero names
anywhere in the estate (register GAP row). Everything below answers today,
keyless. Manifests, work orders, scale tickets, and waste profiles in the
anonymous sandbox are labeled example data (simulated). Facilities are REAL
public EPA ECHO records, ingested with provenance (public domain).

## Quickstart

\`\`\`sh
curl ${ORIGIN}/manifests                    # keyless first value — typed OK envelope
curl ${ORIGIN}/manifests?status=in-transit  # branch on the query
curl ${ORIGIN}/facilities?universe=VSQG     # REAL RCRA handler records (EPA ECHO, with provenance)
curl ${ORIGIN}/waste-profiles?wasteCode=D001
curl ${ORIGIN}/pricing                      # the Pricing Document (402-shaped stub — no billing occurs)
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
  name: "waste-remediation.example.com.ai",
  description:
    "Waste Management & Remediation (NAICS 562) substrate: the hazardous-waste Manifest record, the real EPA RCRA facility corpus (ingested, public domain), and route/dispatch work-order doors — data face and headless dispatch face from one definition, anonymous sandbox as the universal floor. Wave-zero surface under a placeholder address.",
  version: "0.1.0",

  collection: {
    path: "/manifests",
    /* axp-ext-rates-g2 §1: the branching collection's canonical operationId —
       the same string is the MCP tool name and the rates[] key. */
    operationId: "listManifests",
    memberName: "manifests",
    summary:
      "Hazardous-waste manifests — the branching Manifest collection (the row's statutory-record position): typed OK | EMPTY | BLOCKED | OFFER on one pathname",
    records: seed.manifests,
    filters: ["status", "wasteCode"],
  },

  routes: [
    {
      method: "GET",
      path: "/manifests/{manifestId}",
      operationId: "getManifest",
      summary: "getManifest — one Manifest record by id (data face read; same row the headless face operates on; seed ids look like MAN-952-0001)",
      params: [{ name: "manifestId", in: "path", required: true, description: "the Manifest id (seed ids look like MAN-952-0001)" }],
      responses: {
        200: { description: "OK envelope with the manifest" },
        404: { description: "EMPTY envelope — no such manifest" },
      },
    },
    {
      method: "POST",
      path: "/manifests",
      operationId: "createManifest",
      summary:
        "createManifest — system-of-record door: create a Manifest in the ephemeral anonymous sandbox workspace (isolate-lifetime retention, disclosed on every response; no statutory effect)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["wasteCode", "wasteDescription"],
              properties: {
                wasteCode: { type: "string" },
                wasteDescription: { type: "string" },
                quantityTons: { type: "number" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "OK envelope with the created (ephemeral, labeled) manifest" } },
    },
    {
      method: "GET",
      path: "/facilities",
      operationId: "listFacilities",
      summary:
        "listFacilities — REAL RCRA handler records ingested from EPA ECHO (public domain, provenance on every record; ingested binding, Class-A source probed keyless in-session)",
      params: [
        { name: "universe", description: "RCRA universe, e.g. Transporter, SQG, VSQG" },
        { name: "state", description: "two-letter state code (the wave-zero corpus is TX)" },
      ],
    },
    {
      method: "GET",
      path: "/facilities/{handlerId}",
      operationId: "getFacility",
      summary: "getFacility — one real RCRA handler record by EPA handler id (ids look like TXR000068346)",
      params: [{ name: "handlerId", in: "path", required: true, description: "the EPA RCRA handler id" }],
      responses: {
        200: { description: "OK envelope with the facility" },
        404: { description: "EMPTY envelope — no such handler in the ingested corpus" },
      },
    },
    {
      method: "GET",
      path: "/work-orders",
      operationId: "listWorkOrders",
      summary: "listWorkOrders — service/pickup work orders (the headless route/dispatch ply), filterable by status",
      params: [{ name: "status", description: "scheduled | en-route | completed" }],
    },
    {
      method: "POST",
      path: "/work-orders",
      operationId: "createWorkOrder",
      summary:
        "createWorkOrder — headless dispatch door: create a work order in the ephemeral anonymous sandbox workspace (isolate-lifetime retention, disclosed on every response)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["instructions"],
              properties: {
                instructions: { type: "string" },
                manifest: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: { description: "OK envelope with the created (ephemeral, labeled) work order" } },
    },
    {
      method: "POST",
      path: "/work-orders/{workOrderId}/complete",
      operationId: "completeWorkOrder",
      summary:
        "completeWorkOrder — headless verb on the same collection: complete a workspace work order and mint its scale ticket (seed-tenant records are read-only and answer BLOCKED)",
      params: [{ name: "workOrderId", in: "path", required: true, description: "the WorkOrder id" }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { type: "object", properties: { netTons: { type: "number" } } },
          },
        },
      },
      responses: {
        200: { description: "OK envelope with the completed work order + minted scale ticket" },
        403: { description: "BLOCKED envelope — the seed tenant is read-only" },
      },
    },
    {
      method: "GET",
      path: "/scale-tickets",
      operationId: "listScaleTickets",
      summary: "listScaleTickets — scale/weight tickets minted by the dispatch system on completion, filterable by work order",
      params: [{ name: "workOrder", description: "a WorkOrder id; omitted lists all tickets" }],
    },
    {
      method: "GET",
      path: "/waste-profiles",
      operationId: "listWasteProfiles",
      summary: "listWasteProfiles — waste-profile records (generated binding: mechanically derived from the manifest corpus), filterable by waste code",
      params: [{ name: "wasteCode", description: "RCRA waste code, e.g. D001, F006" }],
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
      summary: "the G3 APIProduct instance: Nouns with schema + binding + verbs, System coordinates, operations, sandbox spec, meters",
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
       Pricing Document, native since axp-faces 0.2.0. */
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
    tools: ["listManifests", "getManifest", "listFacilities", "listWasteProfiles"],
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
<html lang="en"><head><meta charset="utf-8"><title>waste-remediation (placeholder)</title></head>
<body><h1>Waste Management &amp; Remediation (NAICS 562) — machine face (placeholder address)</h1>
<p>The hazardous-waste Manifest record, the real EPA RCRA facility corpus (ingested, public domain, with provenance), and route/dispatch work-order doors — one substrate, two plies. Anonymous sandbox is the floor; every synthetic sandbox record is labeled example data (simulated, never a real manifest or company).</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> · <a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# waste-remediation — machine face (placeholder address)

The hazardous-waste Manifest record, the real EPA RCRA facility corpus
(ingested, public domain, with provenance), and route/dispatch work-order
doors — one substrate, two plies. Anonymous sandbox is the floor; synthetic
sandbox records are labeled example data.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
});

export { substrate, seed };
