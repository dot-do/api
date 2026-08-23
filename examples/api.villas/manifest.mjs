/**
 * manifest.mjs — the ONE site manifest the entire machine face is generated
 * from (vendored axp-faces 0.3.0 at the PINS.json pin, apis-ax-axp@2.6.0,
 * digest a9a1197c…, with the ratified generator extension
 * axp-ext-rates-g2@0.2.0, digest 903e414d…). Docs cannot drift because docs
 * render from this.
 *
 * ORIGIN: api.villas — the row's proposed primary name, HELD (porkbun,
 * 2027-07-26) but with NO Cloudflare zone yet (surface register: state
 * name-only, cf_zone n; the face sibling apis.villas is also name-only —
 * hold-pair rule). Binding the hostname is a wrangler routes change when
 * the zone lands; nothing else moves. The row's sub-niche caveat and the
 * 7211 apex GAP are recorded in REGISTER-NOTE.md per the register — a
 * register note, not a build blocker.
 */
import { defineSiteManifest } from "./axp/manifest.js";
import { substrate, seed } from "./substrate.mjs";

export const ORIGIN = "https://api.villas";

/* The operation rate card (axp-ext-rates-g2 §2, at the 0.2.0 survey-floor
 * vocabulary) — TOP-LEVEL `rates[]` in the Pricing Document, one row per
 * operation, keyed by the canonical operationId (§1: route operationId =
 * MCP tool name = suite coverage reference = SDK method = this key).
 * Native generator members since axp-faces 0.2.0. Every row prices from
 * zero or carries a free quota (`freeQuota` is the 0.2.0-legal legacy
 * shorthand — never combined with `included`); no reserved §2.9 member is
 * used. */
const rates = [
  { operation: "listBookings", price: 0, unit: "usd-per-call", note: "free — the keyless universal floor, no cap on the included allowance at wave zero" },
  { operation: "getBooking", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "createBooking", price: 0, unit: "usd-per-call", note: "free — writes land in the ephemeral anonymous sandbox workspace" },
  { operation: "cancelBooking", price: 0, unit: "usd-per-call", note: "free — operates only on ephemeral workspace bookings; the seed tenant is read-only" },
  { operation: "listProperties", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "getProperty", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "listNightAuditReports", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "getNightAuditReport", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
  { operation: "runNightAudit", price: 0.002, unit: "usd-per-call", freeQuota: 500, note: "the wedge artifact door — runs a night audit over the caller's workspace bookings" },
  { operation: "listFolios", price: 0.001, unit: "usd-per-call", freeQuota: 1000 },
];

/* The row's G2 projection (axp-ext-rates-g2 §4) — machine-readable
 * go-to-market coordinates, carried verbatim onto the card as the TOP-LEVEL
 * `g2` object. One definition: the worker's /icp.json (links.icp) serves
 * the same truth. */
export const g2 = Object.freeze({
  $context: "https://schema.org.ai",
  $type: "G2",
  substrate: "lodging",
  motion: "B2A",
  icp: {
    companyTypes: ["villa/vacation-rental manager", "small independent hotel"],
    industries: ["NAICS 721 (7211 traveler accommodation)"],
    jobTypes: ["property manager", "night auditor", "revenue manager"],
    demandSide:
      "agent-intermediated stays: guest-side demand reaches this rail through agents (B2A2C free-rider), below the chain/OTA incumbency line [register row ICP hint, verbatim in substance]",
  },
  personas: [
    { role: "property manager", reads: "properties, bookings, folios", buys: "nothing here yet — wave zero" },
    { role: "night auditor", reads: "night-audit reports, folios", buys: "nothing here yet — wave zero" },
    { role: "revenue manager", reads: "night-audit reports (occupancy, ADR, room revenue)", buys: "nothing here yet — wave zero" },
    { role: "autonomous agent", reads: "everything on this face, keyless", onboarding: "B2A — no OAuth, no card; 402-shaped boundary (stub)" },
  ],
  agentClasses: ["machine (id.org.ai grain)", "machine (unattributed)"],
  firstCustomer:
    "none claimable — the first-party capture rail is not built at wave zero (C-class, batch 7); the sandbox corpus is labeled synthetic seed, not a customer",
});

const llmsBody = `# api.villas — the villa & short-stay lodging rail's machine face

The Booking record (schema.org Offer/Reservation grain), the villa/short-stay
Property inventory, night-audit reports, and guest folios for independent
lodging operators (NAICS 721 sub-niche), served as one substrate with two
plies: read the record collections (data face) or operate the same
collections as a Booking/PMS system of record (headless face). Same
envelopes, same rate rows, one definition.

Everything below answers today, keyless. EVERY record on this sandbox is
labeled example data (simulated): the row's route is first-party
booking/night-audit capture at the rail, that rail is not yet built, and
public rate data is a lane this property deliberately does not touch — so
nothing here is, or pretends to be, real market inventory.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/bookings                        # keyless first value — typed OK envelope
curl ${ORIGIN}/bookings?status=checked-in      # branch on the query
curl ${ORIGIN}/properties?type=villa           # the short-stay inventory grain (labeled demo units)
curl ${ORIGIN}/night-audit-reports             # the typed operational artifact (the sector wedge)
curl ${ORIGIN}/pricing                         # the Pricing Document (402-shaped stub — no billing occurs)
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
  name: "api.villas",
  description:
    "Lodging & Accommodation (NAICS 721, villa/short-stay sub-niche) substrate: the Booking record (schema.org Offer/Reservation), villa/short-stay Property inventory, night-audit reports, and guest folios — data face and headless Booking/PMS face from one definition, anonymous sandbox as the universal floor. Wave-zero surface; every sandbox record is labeled example data.",
  version: "0.1.0",

  collection: {
    path: "/bookings",
    /* axp-ext-rates-g2 §1: the branching collection's canonical operationId —
       the same string is the MCP tool name and the rates[] key. */
    operationId: "listBookings",
    memberName: "bookings",
    summary:
      "Bookings — the branching Booking collection (the row's schema.org Offer/Reservation record position): typed OK | EMPTY | BLOCKED | OFFER on one pathname",
    records: seed.bookings,
    filters: ["status", "property"],
  },

  routes: [
    {
      method: "GET",
      path: "/bookings/{bookingId}",
      operationId: "getBooking",
      summary: "getBooking — one Booking record by id (data face read; same row the headless face operates on; seed ids look like BKG-952-0001)",
      params: [{ name: "bookingId", in: "path", required: true, description: "the Booking id (seed ids look like BKG-952-0001)" }],
      responses: {
        200: { description: "OK envelope with the booking" },
        404: { description: "EMPTY envelope — no such booking" },
      },
    },
    {
      method: "POST",
      path: "/bookings",
      operationId: "createBooking",
      summary:
        "createBooking — headless Booking/PMS door: capture a booking in the ephemeral anonymous sandbox workspace (isolate-lifetime retention, disclosed on every response; no real stay is reserved)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["property", "guestName", "checkIn", "nights"],
              properties: {
                property: { type: "string", description: "a Property id, e.g. PRP-952-0001" },
                guestName: { type: "string" },
                checkIn: { type: "string", description: "ISO date" },
                nights: { type: "integer", minimum: 1 },
              },
            },
          },
        },
      },
      responses: { 200: { description: "OK envelope with the created (ephemeral, labeled) booking" } },
    },
    {
      method: "POST",
      path: "/bookings/{bookingId}/cancel",
      operationId: "cancelBooking",
      summary:
        "cancelBooking — headless verb on the same collection: cancel a workspace booking (seed-tenant records are read-only and answer BLOCKED)",
      params: [{ name: "bookingId", in: "path", required: true, description: "the Booking id" }],
      responses: {
        200: { description: "OK envelope with the cancelled booking" },
        403: { description: "BLOCKED envelope — the seed tenant is read-only" },
      },
    },
    {
      method: "GET",
      path: "/properties",
      operationId: "listProperties",
      summary:
        "listProperties — the villa/short-stay inventory grain (labeled demo units; native binding — first-party inventory, never scraped rate data), filterable by type",
      params: [{ name: "type", description: "villa | guesthouse" }],
    },
    {
      method: "GET",
      path: "/properties/{propertyId}",
      operationId: "getProperty",
      summary: "getProperty — one Property record by id (seed ids look like PRP-952-0001)",
      params: [{ name: "propertyId", in: "path", required: true, description: "the Property id" }],
      responses: {
        200: { description: "OK envelope with the property" },
        404: { description: "EMPTY envelope — no such property" },
      },
    },
    {
      method: "GET",
      path: "/night-audit-reports",
      operationId: "listNightAuditReports",
      summary:
        "listNightAuditReports — the typed operational artifact (generated binding: derived from the booking/folio corpus; the sector's wedge document), filterable by business date",
      params: [{ name: "businessDate", description: "YYYY-MM-DD" }],
    },
    {
      method: "GET",
      path: "/night-audit-reports/{reportId}",
      operationId: "getNightAuditReport",
      summary: "getNightAuditReport — one NightAuditReport by id (seed ids look like NAR-952-0001)",
      params: [{ name: "reportId", in: "path", required: true, description: "the NightAuditReport id" }],
      responses: {
        200: { description: "OK envelope with the report" },
        404: { description: "EMPTY envelope — no such report" },
      },
    },
    {
      method: "POST",
      path: "/night-audit-reports",
      operationId: "runNightAudit",
      summary:
        "runNightAudit — headless PMS door: run the night audit over the caller's ephemeral workspace bookings for a business date and mint the report (the process the PMS ply automates)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["businessDate"],
              properties: { businessDate: { type: "string", description: "YYYY-MM-DD" } },
            },
          },
        },
      },
      responses: { 200: { description: "OK envelope with the minted (ephemeral, labeled) night-audit report" } },
    },
    {
      method: "GET",
      path: "/folios",
      operationId: "listFolios",
      summary:
        "listFolios — guest folio / guest-ledger records ([UNVERIFIED — inferred] data-ply item, flag carried from the row), filterable by booking",
      params: [{ name: "booking", description: "a Booking id; omitted lists all folios" }],
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
      summary: "the G3 APIProduct instance: Nouns with schema + binding + verbs, the BookingPMS System coordinate, operations, sandbox spec, meters",
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
      "Wave-zero 402-shaped stub: the OFFER boundary and rate rows are real and typed, but no billing occurs, no payment method exists, and nothing is charged — every rate row prices from zero or carries a free quota. This document states intent; no terms bind it.",
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
       served live by tools/list in worker.mjs). The MCP door is the authless
       anon-sandbox rung; keyed access sits above it and is NOT mounted at
       wave zero (presence-when-true — no keyed tools are declared). */
    tools: ["listBookings", "getBooking", "listProperties", "listNightAuditReports"],
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
<html lang="en"><head><meta charset="utf-8"><title>api.villas</title></head>
<body><h1>api.villas — the villa &amp; short-stay lodging rail (NAICS 721 sub-niche)</h1>
<p>The Booking record (schema.org Offer/Reservation grain), villa/short-stay Property inventory, night-audit reports, and guest folios — one substrate, two plies (data face + headless Booking/PMS face). Anonymous sandbox is the floor; every sandbox record is labeled example data (simulated — never a real property, booking, guest, or market rate).</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> · <a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# api.villas — machine face

The Booking record (schema.org Offer/Reservation grain), villa/short-stay
Property inventory, night-audit reports, and guest folios — one substrate,
two plies (data face + headless Booking/PMS face). Anonymous sandbox is the
floor; every sandbox record is labeled example data.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
});

export { substrate, seed };
