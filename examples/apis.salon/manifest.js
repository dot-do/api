/**
 * manifest.js — the ONE site manifest this property is generated from
 * (vendored axp-faces@0.3.0 at the PINS.json digest; never hand-rolled).
 *
 * Register row `personal-care` (NAICS 812, 8121 core) at its ruled primary
 * name apis.salon (spec §2; the register's ladder rung 3 — held; apis.beauty
 * is the recorded alternative, expiring 2026-10-22, a Batch-S admin fact).
 *
 *   - branching collection /bookings = the anon sandbox universal floor
 *     (keyless OK over the labeled synthetic salon working set);
 *   - /establishment-licenses serves REAL ingested public data (TDLR
 *     full-service-salon licenses for Travis County, corpus provenance and
 *     the disclosed withheld-fields curation served with it) — the row's
 *     public-licensure supply-side ingest, probed reachable in-session; the
 *     NY registry guess that probed 404 stays recorded, never faked;
 *   - metered pricing with binding:false + statement — every payable door is
 *     a labeled 402-shaped stub (test-mode; no live settlement);
 *   - the 402 OFFER alternatives advertise ONLY MOUNTED rungs (batch ruling):
 *     the keyless sandbox floor and the pay rung (labeled stub). The
 *     work/claim rungs are not mounted and therefore not advertised.
 *
 * NATIVE axp-ext-rates-g2@0.2.0 (digest 903e414d…) — no bridges: rates[]
 * top-level in the Pricing Document, g2 top-level on the card, links.verify
 * as a card link member, operationId on every route, MCP tools as string
 * operationIds — all emitted by the vendored generator from this manifest.
 */

import { defineSiteManifest } from "./axp/index.js";
import { bookings } from "./seed.js";
import { APIProduct } from "./product.js";

export const ORIGIN = "https://apis.salon";

/** G2 coordinates — served at /icp.json, linked from the card, and mirrored
 *  top-level on the card as `g2` (native §4 placement). */
export const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  substrate: APIProduct.substrate,
  function:
    "The salon back office as a typed surface — bookings, the service menu, POS sale records (the C-class booking/POS first-party grain), plus the public establishment-license registry underneath it",
  system: APIProduct.systems[0],
  icp: {
    companyTypes: [
      "salon/spa owner-operators (NAICS 8121 core: hair, nail, skin)",
      "pet-grooming operators (81291 adjacency, register ICP)",
      "booth-renters / independent practitioners",
    ],
    jobTypes: ["owner-operator", "front desk", "booth-renter practitioner"],
  },
  personas: [
    { name: "salon owner-operator", kind: "human", wants: "the book, the menu, and the day's sales in one tied view" },
    { name: "front desk", kind: "human", wants: "every appointment's status without paging through a paper book" },
    { name: "scheduling agent", kind: "machine", wants: "typed booking/menu/sale records it can read keylessly first — and a booking door it can exercise on a person's behalf (the cell's native B2A2C shape)" },
  ],
  agent_classes: [
    { class: "anonymous", access: "keyless sandbox — labeled synthetic salon back-office records plus real provenance-labeled TDLR establishment-license data; the universal floor" },
    { class: "machine-identified", access: "the 402-metered rung against machine identity (id.org.ai grain) — wave-zero labeled stub, no live settlement" },
  ],
};

/** The operation-keyed rate card — NATIVE top-level rates[] in the Pricing
 *  Document (axp-ext-rates-g2 §2, survey-floor vocabulary: `included`
 *  allowances, never freeQuota; nothing withheld). Every read prices from
 *  zero or names its included allowance; the one positive row is the
 *  per-outcome booking door, whose free floor is the sandbox itself (note). */
export const RATES = [
  { operation: "listBookings", price: 0, included: "unlimited", note: "the keyless branching collection — the anon sandbox universal floor" },
  { operation: "getBooking", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  { operation: "listServiceOffers", price: 0, included: "unlimited", note: "the service menu stays free to list — it is the offer surface" },
  { operation: "getServiceOffer", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  { operation: "listSaleRecords", price: 0, included: "unlimited" },
  { operation: "getSaleRecord", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  { operation: "listEstablishmentLicenses", price: 0, included: "unlimited", note: "real public TDLR licensure registry data stays free to list" },
  { operation: "getEstablishmentLicense", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  {
    operation: "requestBooking",
    price: 3,
    unit: "confirmed booking placed with the salon (per-outcome)",
    meter: { aggregation: "sum", basis: "consumed" },
    note: "the payable outcome door — its read counterparts price from zero and the sandbox serves completed example bookings free; wave-zero labeled 402 stub, no live settlement",
  },
];

export const PRICING_STATEMENT =
  "Wave-zero pricing is stated intent, not bound terms: settlement is not live, every payable door is a " +
  "labeled 402-shaped stub, and no billing occurs. The operation-keyed rates[] in this document price every " +
  "read from zero (with its included allowance named); the one positive row is the per-outcome booking door.";

const llmsBody = `# apis.salon — the functions a salon's systems call

The salon back office as a typed, verifiable surface: bookings at the
appointment grain (schema.org Reservation, vertically lensed), the service
menu at the Offer grain, POS sale records that settle completed bookings —
plus REAL public establishment-license data ingested from the Texas TDLR
open dataset with provenance on the corpus.

Start keyless: \`GET /bookings\` answers 200 OK to an anonymous caller with
a full, internally consistent example salon working set — one fictional
salon, every synthetic record labeled example data (the sandbox is the real
product over simulated data, never a faked demo). Filter with \`?status=\`,
\`?category=\`, \`?practitionerId=\`; a non-matching filter answers a typed
EMPTY; reserved scopes answer a typed BLOCKED. \`GET
/establishment-licenses\` serves real, public TDLR salon-license registry
data — not examples, and labeled with its source, scope, and the disclosed
withheld-fields curation instead.

Requesting a confirmed booking (\`POST /bookings\`) answers a typed 402
OFFER. Its alternatives list only mounted rungs: stay on the free keyless
floor, or the pay rung — which at wave zero is a LABELED STUB with no live
settlement.

Pricing is declared, not negotiated: \`GET /pricing\` carries the Pricing
Document with the operation-keyed \`rates[]\` top-level; every read prices
from zero with its included allowance named. MCP: POST /mcp (streamable
HTTP, authless — the anonymous sandbox rung; a bearer-key tier arms only
when a rung above the sandbox mounts).

Run our tests: \`GET /verify\` — the digest-pinned public-contract suite,
runnable by anyone against the live doors.`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "apis.salon",
  description:
    "The salon back office as a typed, verifiable surface: bookings, the service menu, and POS sale records " +
    "over a labeled synthetic sandbox, plus real provenance-labeled TDLR establishment-license data, with " +
    "typed OK | EMPTY | BLOCKED | OFFER envelopes at a keyless floor.",
  version: "0.1.0",
  collection: {
    path: "/bookings",
    operationId: "listBookings", // native §1 — the real verb, never the generator default
    memberName: "bookings",
    summary: "The bookings — one branching keyless collection over the sandbox salon working set",
    records: bookings,
    filters: ["status", "category", "practitionerId"],
    blockedScopes: ["tenant", "internal"],
    blockedReason: (scope) =>
      scope === "tenant"
        ? "tenant-scoped bookings require a claimed workspace — the anonymous sandbox serves the example salon only"
        : "scope 'internal' is reserved to the platform — not permitted for your agent class",
  },
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "USD requested spend per call window",
    price: 3,
    binding: false,
    statement: PRICING_STATEMENT,
    rates: RATES,
    offers: [
      {
        id: "confirmed-booking-outcome",
        title: "One confirmed booking placed with the salon (per-outcome)",
        price: {
          amount: 3,
          currency: "USD",
          per: "confirmed booking placed",
          settlement: "stub — test-mode, no live billing",
        },
        alternatives: [
          { kind: "sandbox", note: "continue keyless on the anonymous sandbox floor — reads stay free" },
          {
            kind: "pay",
            note: "402-metered against machine identity (id.org.ai grain) — wave-zero LABELED STUB: settlement is not live and no charge can occur",
          },
        ],
      },
    ],
  },
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    auth: "none — the anonymous sandbox rung is authless; a bearer-key tier arms only when a rung above the sandbox mounts",
    // native §1: STRING tool names = the canonical operationIds
    tools: APIProduct.operations.map((o) => o.verb),
  },
  routes: [
    {
      method: "GET",
      path: "/bookings/{id}",
      operationId: "getBooking",
      summary: "One booking with its service, practitioner, and derived status",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY envelope for an unknown id" } },
    },
    {
      method: "GET",
      path: "/service-offers",
      operationId: "listServiceOffers",
      summary: "The service menu at the Offer grain (labeled synthetic sandbox records)",
      responses: { 200: { description: "OK envelope; member name 'serviceOffers'" } },
    },
    {
      method: "GET",
      path: "/service-offers/{id}",
      operationId: "getServiceOffer",
      summary: "One service-menu offer",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/sale-records",
      operationId: "listSaleRecords",
      summary: "POS sale records settling completed bookings, plus the derived period summary (labeled synthetic sandbox records)",
      responses: { 200: { description: "OK envelope; member name 'saleRecords'; period summary in extra" } },
    },
    {
      method: "GET",
      path: "/sale-records/{id}",
      operationId: "getSaleRecord",
      summary: "One sale record (or the period summary by its id)",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/establishment-licenses",
      operationId: "listEstablishmentLicenses",
      summary: "REAL public TDLR salon establishment-license registry data — corpus provenance and disclosed curation served with it; not example data",
      responses: { 200: { description: "OK envelope; member name 'establishmentLicenses'; corpus provenance in extra" } },
    },
    {
      method: "GET",
      path: "/establishment-licenses/{id}",
      operationId: "getEstablishmentLicense",
      summary: "One real establishment license (by lic_### id or bare license number)",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "POST",
      path: "/bookings",
      operationId: "requestBooking",
      summary: "Request a confirmed booking (the per-outcome door) — answers a typed 402 OFFER; wave-zero stub, no billing",
      responses: { 402: { description: "OFFER envelope; alternatives list only mounted rungs" } },
    },
    {
      method: "GET",
      path: "/icp.json",
      operationId: "getIcp",
      summary: "G2 coordinates: ICP, personas, agent classes, and the System coordinates this surface serves",
      responses: { 200: { description: "ICP document" } },
    },
    {
      method: "GET",
      path: "/verify",
      operationId: "getVerify",
      summary: "Run our tests — the digest-pinned public-contract suite and how to run it",
      responses: { 200: { description: "verification instructions (three faces)" } },
    },
    {
      method: "GET",
      path: "/verify/suite.json",
      operationId: "getVerifySuite",
      summary: "The suite document itself (api.qa/suite@1) — digest printed on /verify",
      responses: { 200: { description: "Suite document" } },
    },
    {
      method: "GET",
      path: "/healthz",
      operationId: "getHealthz",
      summary: "Typed liveness — a 200 OK envelope",
      responses: { 200: { description: "OK envelope" } },
    },
  ],
  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,
  verifyUrl: "/verify", // native §3 — links.verify on the card
  g2: {
    // native §4 — carried verbatim onto the card, never generator-authored
    icp: icpDoc.icp,
    personas: icpDoc.personas,
    systems: APIProduct.systems,
  },
  family: [
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "independent conformance verifier",
    },
  ],
  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The salon back office, as an API</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}h1{font-size:2rem;line-height:1.2}small{color:#666}</style></head>
<body>
<h1>The book, the menu, and the day's sales — one tied view.</h1>
<p>Bookings at the appointment grain, the service menu, POS sale records
that settle completed appointments — the salon back office as one typed
surface, plus the public license registry underneath it.</p>
<p>Browse an <strong>example salon</strong> below: one fictional salon with
its practitioners, bookings, and settled sales.
<small>All salon, practitioner, and client records on this page are labeled
example data — a real back office runs on your book and your sales, never
on samples. The license data at /establishment-licenses is real public TDLR
registry data, labeled with its source and scope.</small></p>
<p><a href="/bookings">See the example bookings</a> ·
<a href="/establishment-licenses">Real TDLR license data</a></p>
</body></html>
`,
    md: `# The salon back office, as an API

Bookings, the service menu, POS sale records, and real public
establishment-license data — the booking/POS record grain for salons, as
one typed surface.

- Example salon (keyless, labeled synthetic data): /bookings
- Real TDLR license data (public registry, provenance-labeled): /establishment-licenses
- Machine surfaces: /llms.txt · /.well-known/agents.json · /openapi.json · /pricing · /mcp
- Run our tests: /verify
`,
  },
});
