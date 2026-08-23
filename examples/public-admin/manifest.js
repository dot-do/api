/**
 * manifest.js — the ONE site manifest this property is generated from
 * (vendored axp-faces at the PINS.json digest; never hand-rolled).
 *
 * Register row `public-admin` (NAICS 92) — GAP AT APEX: no api./apis. name
 * is held, so the machine face serves at the row-key placeholder address
 * public-admin.org.ai (spec §0: a GAP row instantiates everything except the
 * G4 brand config; open question #4's placeholder-org.ai route). The owned
 * artifact doors (permits.works, permits.casa, permitti.ng, filings.click,
 * bids.contractors, dmv.vin) are recorded in projection.config.json as the
 * human-vocabulary counterpart candidates — none of them serves yet, so none
 * is advertised anywhere on this surface (presence-when-true).
 *
 *   - branching collection /registrations = the anon sandbox universal floor
 *     (keyless OK over labeled synthetic back-office seed);
 *   - /awards serves REAL ingested public data (USAspending, provenance on
 *     every record) — the row's Class-A source route, end to end;
 *   - metered pricing with binding:false + statement — every payable door is
 *     a labeled 402-shaped stub (test-mode; no live settlement);
 *   - the 402 OFFER alternatives advertise ONLY MOUNTED rungs (batch-2
 *     ruling): the keyless sandbox floor and the pay rung (labeled stub).
 *     The work/claim rungs are not mounted and therefore not advertised.
 */

import { defineSiteManifest } from "./axp/index.js";
import { registrations } from "./seed.js";
import { APIProduct } from "./product.js";

export const ORIGIN = "https://public-admin.org.ai";

/** G2 coordinates — served at /icp.json, linked from the card, and mirrored
 *  top-level on the card as `g2` (batch-2 ruled placement). */
export const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  substrate: APIProduct.substrate,
  function: "Public administration touchpoints — registrations, filings, permits, procurement (the buyer is never the government)",
  system: APIProduct.systems[0],
  icp: {
    companyTypes: [
      "every CompanyType that must register or renew (SAM/UEI, BOI, state SoS) — the universal back-office ICP",
      "contractors and property owners at the permit grain",
      "government sellers needing public opportunity and award data",
    ],
    jobTypes: ["ops/compliance seat at the registrant", "bidding contractor", "permit expediter"],
  },
  personas: [
    { name: "compliance ops lead", kind: "human", wants: "every registration, renewal date, and filing obligation in one tied calendar" },
    { name: "bidding contractor", kind: "human", wants: "award history and permit standing without portal archaeology" },
    { name: "back-office agent", kind: "machine", wants: "typed registration/filing/permit records and real public award data it can read keylessly first" },
  ],
  agent_classes: [
    { class: "anonymous", access: "keyless sandbox — labeled synthetic back-office records plus real provenance-labeled public award data; the universal floor" },
    { class: "machine-identified", access: "the 402-metered rung against machine identity (id.org.ai grain) — wave-zero labeled stub, no live settlement" },
  ],
};

/** The operation-keyed rate card. Batch-2 ruled placement: these rows are
 *  served as top-level `rates[]` INSIDE the Pricing Document (/pricing) —
 *  the bridge until the upstream generator re-vendor lands. Every row names
 *  a free quota or prices from zero (§5.1 law); every operation is an
 *  OpenAPI operationId. */
export const RATES = [
  { operation: "listCollection", verb: "listRegistrations", wire: "GET /registrations", price: 0, freeQuota: "unlimited" },
  { operation: "getRegistration", wire: "GET /registrations/{id}", price: 0.002, freeQuota: "100/day keyless sandbox reads" },
  { operation: "listFilings", wire: "GET /filings", price: 0, freeQuota: "unlimited" },
  { operation: "getFiling", wire: "GET /filings/{id}", price: 0.002, freeQuota: "100/day keyless sandbox reads" },
  { operation: "listAwards", wire: "GET /awards", price: 0, freeQuota: "unlimited — real public-domain data stays free to list" },
  { operation: "getAward", wire: "GET /awards/{id}", price: 0.002, freeQuota: "100/day keyless sandbox reads" },
  { operation: "listPermits", wire: "GET /permits", price: 0, freeQuota: "unlimited" },
  { operation: "getPermit", wire: "GET /permits/{id}", price: 0.002, freeQuota: "100/day keyless sandbox reads" },
  {
    operation: "orderRenewal",
    wire: "POST /renewals",
    price: 149,
    per: "completed, verified registration renewal filing (per-outcome)",
    freeQuota: "0 — the sandbox serves completed example filings free; ordering a renewal is the payable outcome door",
  },
];

export const PRICING_STATEMENT =
  "Wave-zero pricing is stated intent, not bound terms: settlement is not live, every payable door is a " +
  "labeled 402-shaped stub, and no billing occurs. The operation-keyed rates[] in this document name a free " +
  "quota or a zero price on every row.";

const llmsBody = `# public-admin (placeholder address — apex name pending)

The registrant's back office as a typed, verifiable surface: registrations
across the registries a company must stand in (SAM/UEI, state SoS, FinCEN
BOI, county licenses), the filings that discharge them, permit records, and
REAL public federal award data ingested from USAspending with provenance on
every record.

Start keyless: \`GET /registrations\` answers 200 OK to an anonymous caller
with a full, internally consistent example back office — three fictional
companies, every synthetic record labeled example data (the sandbox is the
real product over simulated data, never a faked demo). Filter with
\`?jurisdiction=\`, \`?status=\`, \`?registry=\`; a non-matching filter answers
a typed EMPTY; reserved scopes answer a typed BLOCKED. \`GET /awards\` serves
real, public-domain USAspending contract awards — not examples, and labeled
with their source and retrieval time instead.

Ordering a completed registration renewal (\`POST /renewals\`) answers a
typed 402 OFFER. Its alternatives list only mounted rungs: stay on the free
keyless floor, or the pay rung — which at wave zero is a LABELED STUB with
no live settlement.

Pricing is declared, not negotiated: \`GET /pricing\` carries the Pricing
Document with the operation-keyed \`rates[]\` inline; every row names a free
quota or prices from zero. MCP: POST /mcp (streamable HTTP, authless — the
anonymous sandbox rung; a bearer-key tier arms only when a rung above the
sandbox mounts).

Run our tests: \`GET /verify\` — the digest-pinned public-contract suite,
runnable by anyone against the live doors.`;

/** MCP tool declarations — same nouns/verbs as HTTP, one definition. */
const MCP_TOOLS = APIProduct.operations.map((o) => ({
  name: o.verb,
  description: `${o.verb} — same operation as ${o.wire}; typed envelopes, anonymous sandbox rung`,
}));

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "public-admin.org.ai",
  description:
    "The registrant's back office as a typed, verifiable surface: registrations, filings, and permits over a " +
    "labeled synthetic sandbox, plus real provenance-labeled USAspending award data, with honest " +
    "OK | EMPTY | BLOCKED | OFFER envelopes at a keyless floor.",
  version: "0.1.0",
  collection: {
    path: "/registrations",
    memberName: "registrations",
    summary: "The registrations — one branching keyless collection over the sandbox back office",
    records: registrations,
    filters: ["jurisdiction", "status", "registry"],
    blockedScopes: ["tenant", "internal"],
    blockedReason: (scope) =>
      scope === "tenant"
        ? "tenant-scoped registrations require a claimed workspace — the anonymous sandbox serves the example tenant only"
        : "scope 'internal' is reserved to the platform — not permitted for your agent class",
  },
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "USD requested spend per call window",
    price: 149,
    binding: false,
    statement: PRICING_STATEMENT,
    offers: [
      {
        id: "registration-renewal-outcome",
        title: "One completed, verified registration renewal filing (per-outcome)",
        price: {
          amount: 149,
          currency: "USD",
          per: "completed, verified registration renewal filing",
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
    tools: MCP_TOOLS,
  },
  routes: [
    {
      method: "GET",
      path: "/registrations/{id}",
      summary: "One registration with the filings that discharge it",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY — unknown id is an honest miss, not an error page" } },
    },
    {
      method: "GET",
      path: "/filings",
      summary: "Filings — completed artifacts and open renewal tasks, derived from the registrations they discharge",
      responses: { 200: { description: "OK envelope; member name 'filings'" } },
    },
    {
      method: "GET",
      path: "/filings/{id}",
      summary: "One filing artifact or open filing task",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/awards",
      summary: "REAL public federal contract awards ingested from USAspending — provenance on every record; not example data",
      responses: { 200: { description: "OK envelope; member name 'awards'; corpus provenance in extra" } },
    },
    {
      method: "GET",
      path: "/awards/{id}",
      summary: "One real award record with its full provenance",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/permits",
      summary: "Permit records at the permit grain (building, electrical, right-of-way, signage)",
      responses: { 200: { description: "OK envelope; member name 'permits'" } },
    },
    {
      method: "GET",
      path: "/permits/{id}",
      summary: "One permit record",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "POST",
      path: "/renewals",
      summary: "Order a completed registration renewal filing (the per-outcome door) — answers a typed 402 OFFER; wave-zero stub, no billing",
      responses: { 402: { description: "OFFER envelope; alternatives list only mounted rungs" } },
    },
    {
      method: "GET",
      path: "/icp.json",
      summary: "G2 coordinates: ICP, personas, agent classes, and the System coordinate this surface serves",
      responses: { 200: { description: "ICP document" } },
    },
    {
      method: "GET",
      path: "/verify",
      summary: "Run our tests — the digest-pinned public-contract suite and how to run it",
      responses: { 200: { description: "verification instructions (three faces)" } },
    },
    {
      method: "GET",
      path: "/verify/suite.json",
      summary: "The suite document itself (api.qa/suite@1) — digest printed on /verify",
      responses: { 200: { description: "Suite document" } },
    },
    {
      method: "GET",
      path: "/healthz",
      summary: "Typed liveness — a 200 OK envelope",
      responses: { 200: { description: "OK envelope" } },
    },
  ],
  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,
  family: [
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "independent conformance verifier — every claim this surface makes is checked there, never self-graded",
    },
  ],
  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The registrant's back office</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}h1{font-size:2rem;line-height:1.2}small{color:#666}</style></head>
<body>
<h1>Every registration, every renewal, one calendar.</h1>
<p>SAM, state filings, ownership reports, licenses, permits — every registry
your company must stand in, with the renewal dates and filings that keep it
standing.</p>
<p>Browse an <strong>example back office</strong> below: three fictional
companies with their registrations, filings, and permits.
<small>All company records on this page are labeled example data — a real
back office runs on your registrations, never on samples. The award data at
/awards is real public USAspending data, labeled with its source.</small></p>
<p><a href="/registrations">See the example registrations</a> ·
<a href="/awards">Real federal award data</a></p>
</body></html>
`,
    md: `# The registrant's back office

Registrations, filings, permits, and real public award data — every registry
a company must stand in, as one typed surface.

- Example back office (keyless, labeled synthetic data): /registrations
- Real USAspending award data (public domain, provenance-labeled): /awards
- Machine surfaces: /llms.txt · /.well-known/agents.json · /openapi.json · /pricing · /mcp
- Run our tests: /verify
`,
  },
});
