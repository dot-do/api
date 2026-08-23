/**
 * manifest.js — the ONE site manifest this property is generated from
 * (vendored axp-faces@0.3.0 at the PINS.json digest; never hand-rolled).
 *
 * Register row `telecom` (NAICS 517) — TRUE-ZERO GAP: zero names held AND
 * zero named acquisition candidates, so the machine face serves at the
 * row-key placeholder address telecom.org.ai (spec §0: a GAP row
 * instantiates everything except the G4 brand config; the placeholder-key
 * G3 build per the D-row precedent; G4 held pending #16).
 *
 *   - branching collection /port-orders = the anon sandbox universal floor
 *     (keyless OK over the labeled synthetic LNP working set);
 *   - /numbering-resources serves REAL ingested public data (the NANPA NPA
 *     report, corpus provenance served with it) — the row's FCC/NANPA-class
 *     source route, probed reachable in-session; the FCC feeds that probed
 *     unreachable (License View 403, broadband map 401) stay on the
 *     enrichment ladder, recorded, never faked;
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
import { portOrders } from "./seed.js";
import { APIProduct } from "./product.js";

export const ORIGIN = "https://telecom.org.ai";

/** G2 coordinates — served at /icp.json, linked from the card, and mirrored
 *  top-level on the card as `g2` (native §4 placement). Register ICP is
 *  [UNVERIFIED] and carried as the row states it. */
export const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  substrate: APIProduct.substrate,
  function:
    "Telecom operations records as a typed surface — numbering, porting, serviceability, rated usage (the OSS/BSS grain for resellers, not the carrier core network)",
  system: APIProduct.systems[0],
  icp: {
    companyTypes: [
      "MVNOs and connectivity resellers (register ICP, marked UNVERIFIED there — carried verbatim)",
      "IT-ops connectivity buyers managing numbers, coverage, and usage across carriers",
    ],
    jobTypes: ["network/IT operations seat", "reseller back-office operator", "provisioning coordinator"],
  },
  personas: [
    { name: "reseller operations lead", kind: "human", wants: "every port order, FOC date, and usage cycle in one tied view" },
    { name: "IT-ops connectivity buyer", kind: "human", wants: "serviceability and numbering facts without carrier-portal archaeology" },
    { name: "provisioning agent", kind: "machine", wants: "typed port/coverage/usage records and real public numbering data it can read keylessly first" },
  ],
  agent_classes: [
    { class: "anonymous", access: "keyless sandbox — labeled synthetic reseller back-office records plus real provenance-labeled NANPA numbering data; the universal floor" },
    { class: "machine-identified", access: "the 402-metered rung against machine identity (id.org.ai grain) — wave-zero labeled stub, no live settlement" },
  ],
};

/** The operation-keyed rate card — NATIVE top-level rates[] in the Pricing
 *  Document (axp-ext-rates-g2 §2, survey-floor vocabulary: `included`
 *  allowances, never string freeQuota; nothing withheld). Every read prices
 *  from zero or names its included allowance; the one positive row is the
 *  per-outcome door, whose free floor is the sandbox itself (note). */
export const RATES = [
  { operation: "listPortOrders", price: 0, included: "unlimited", note: "the keyless branching collection — the anon sandbox universal floor" },
  { operation: "getPortOrder", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  { operation: "listNumberingResources", price: 0, included: "unlimited", note: "real public NANPA registry data stays free to list" },
  { operation: "getNumberingResource", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  { operation: "listCoverageRecords", price: 0, included: "unlimited" },
  { operation: "getCoverageRecord", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  { operation: "listUsageRecords", price: 0, included: "unlimited" },
  { operation: "getUsageRecord", price: 0.002, included: { qty: 100, period: "day", at_limit: "block" }, unit: "record read" },
  {
    operation: "orderNumberPort",
    price: 79,
    unit: "completed, verified number port (per-outcome)",
    meter: { aggregation: "sum", basis: "consumed" },
    note: "the payable outcome door — its read counterparts price from zero and the sandbox serves completed example port orders free; wave-zero labeled 402 stub, no live settlement",
  },
];

export const PRICING_STATEMENT =
  "Wave-zero pricing is stated intent, not bound terms: settlement is not live, every payable door is a " +
  "labeled 402-shaped stub, and no billing occurs. The operation-keyed rates[] in this document price every " +
  "read from zero (with its included allowance named); the one positive row is the per-outcome port door.";

const llmsBody = `# telecom (placeholder address — true-zero GAP row, name pending)

The reseller's telecom back office as a typed, verifiable surface: number
port orders (LNP/LOA grain) with FOC dates, serviceability records at the
address grain, rated usage at the CDR grain — plus REAL public numbering
data ingested from the NANPA NPA report with provenance on the corpus.

Start keyless: \`GET /port-orders\` answers 200 OK to an anonymous caller
with a full, internally consistent example LNP working set — fictional
carriers, every synthetic record labeled example data (the sandbox is the
real product over simulated data, never a faked demo). Filter with
\`?status=\`, \`?direction=\`, \`?npa=\`; a non-matching filter answers a
typed EMPTY; reserved scopes answer a typed BLOCKED. \`GET
/numbering-resources\` serves real, public NANPA area-code registry data —
not examples, and labeled with its source and retrieval time instead.

Ordering a completed, verified number port (\`POST /ports\`) answers a
typed 402 OFFER. Its alternatives list only mounted rungs: stay on the free
keyless floor, or the pay rung — which at wave zero is a LABELED STUB with
no live settlement.

Pricing is declared, not negotiated: \`GET /pricing\` carries the Pricing
Document with the operation-keyed \`rates[]\` top-level; every read prices
from zero with its included allowance named. MCP: POST /mcp (streamable
HTTP, authless — the anonymous sandbox rung; a bearer-key tier arms only
when a rung above the sandbox mounts).

Run our tests: \`GET /verify\` — the digest-pinned public-contract suite,
runnable by anyone against the live doors.`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "telecom.org.ai",
  description:
    "The reseller's telecom back office as a typed, verifiable surface: port orders, serviceability, and rated " +
    "usage over a labeled synthetic sandbox, plus real provenance-labeled NANPA numbering data, with honest " +
    "OK | EMPTY | BLOCKED | OFFER envelopes at a keyless floor.",
  version: "0.1.0",
  collection: {
    path: "/port-orders",
    operationId: "listPortOrders", // native §1 — the real verb, never the generator default
    memberName: "portOrders",
    summary: "The port orders — one branching keyless collection over the sandbox LNP working set",
    records: portOrders,
    filters: ["status", "direction", "npa"],
    blockedScopes: ["tenant", "internal"],
    blockedReason: (scope) =>
      scope === "tenant"
        ? "tenant-scoped port orders require a claimed workspace — the anonymous sandbox serves the example tenant only"
        : "scope 'internal' is reserved to the platform — not permitted for your agent class",
  },
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "USD requested spend per call window",
    price: 79,
    binding: false,
    statement: PRICING_STATEMENT,
    rates: RATES,
    offers: [
      {
        id: "number-port-outcome",
        title: "One completed, verified number port (LOA-backed, per-outcome)",
        price: {
          amount: 79,
          currency: "USD",
          per: "completed, verified number port",
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
      path: "/port-orders/{id}",
      operationId: "getPortOrder",
      summary: "One port order with its LOA reference and FOC state",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY — unknown id is an honest miss, not an error page" } },
    },
    {
      method: "GET",
      path: "/numbering-resources",
      operationId: "listNumberingResources",
      summary: "REAL public NANPA area-code (NPA) registry data — corpus provenance served with it; not example data",
      responses: { 200: { description: "OK envelope; member name 'numberingResources'; corpus provenance in extra" } },
    },
    {
      method: "GET",
      path: "/numbering-resources/{id}",
      operationId: "getNumberingResource",
      summary: "One real numbering resource (by npa_### id or bare NPA)",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/coverage-records",
      operationId: "listCoverageRecords",
      summary: "Serviceability records at the address grain (labeled synthetic sandbox records)",
      responses: { 200: { description: "OK envelope; member name 'coverageRecords'" } },
    },
    {
      method: "GET",
      path: "/coverage-records/{id}",
      operationId: "getCoverageRecord",
      summary: "One coverage record",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/usage-records",
      operationId: "listUsageRecords",
      summary: "Rated usage at the CDR grain plus the derived cycle summary (labeled synthetic sandbox records)",
      responses: { 200: { description: "OK envelope; member name 'usageRecords'; cycle summary in extra" } },
    },
    {
      method: "GET",
      path: "/usage-records/{id}",
      operationId: "getUsageRecord",
      summary: "One usage record (or the cycle summary by its id)",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "POST",
      path: "/ports",
      operationId: "orderNumberPort",
      summary: "Order a completed, verified number port (the per-outcome door) — answers a typed 402 OFFER; wave-zero stub, no billing",
      responses: { 402: { description: "OFFER envelope; alternatives list only mounted rungs" } },
    },
    {
      method: "GET",
      path: "/icp.json",
      operationId: "getIcp",
      summary: "G2 coordinates: ICP, personas, agent classes, and the System coordinate this surface serves",
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
      role: "independent conformance verifier — every claim this surface makes is checked there, never self-graded",
    },
  ],
  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The reseller's telecom back office</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}h1{font-size:2rem;line-height:1.2}small{color:#666}</style></head>
<body>
<h1>Every number, every port, every FOC date — one tied view.</h1>
<p>Port orders with their LOAs, serviceability at the address grain, rated
usage at the CDR grain — the reseller back office as one typed surface,
plus the public numbering registry underneath it.</p>
<p>Browse an <strong>example back office</strong> below: fictional carriers
with their port orders, coverage records, and a full usage cycle.
<small>All carrier and subscriber records on this page are labeled example
data — a real back office runs on your ports and usage, never on samples.
The numbering data at /numbering-resources is real public NANPA registry
data, labeled with its source.</small></p>
<p><a href="/port-orders">See the example port orders</a> ·
<a href="/numbering-resources">Real NANPA numbering data</a></p>
</body></html>
`,
    md: `# The reseller's telecom back office

Port orders, serviceability, rated usage, and real public numbering data —
the OSS/BSS record grain for resellers, as one typed surface.

- Example back office (keyless, labeled synthetic data): /port-orders
- Real NANPA numbering data (public registry, provenance-labeled): /numbering-resources
- Machine surfaces: /llms.txt · /.well-known/agents.json · /openapi.json · /pricing · /mcp
- Run our tests: /verify
`,
  },
});
