/**
 * manifest.js — the ONE site manifest monthend.finance is generated from
 * (vendored axp-faces at the PINS.json digest; never hand-rolled).
 *
 * Property-template spec §2/§4/§5 instantiation for register row fn-finance:
 *   - branching collection /close-deliverables = the anon sandbox universal
 *     floor (keyless OK over labeled synthetic seed);
 *   - metered pricing with binding:false + statement — every payable door is
 *     a labeled 402-shaped stub (test-mode; no live settlement);
 *   - the 402 OFFER alternatives advertise the whole B2A ladder (pay / work /
 *     claim) plus the human counterpart door, per §5.1;
 *   - G2 coordinates (ICP + persona + System coordinate) exposed at /icp.json,
 *     linked from the card (links.icp).
 */

import { defineSiteManifest } from "./axp/index.js";
import { closeDeliverables } from "./seed.js";
import { APIProduct } from "./product.js";

export const ORIGIN = "https://monthend.finance";

/** G2 coordinates — served at /icp.json, linked from the card. */
export const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  substrate: APIProduct.substrate,
  function: "Finance (close, AR/AP, treasury)",
  system: APIProduct.systems[0],
  icp: {
    companyTypes: ["every CompanyType above a size floor — the finance department is a horizontal root"],
    jobTypes: ["controller", "CFO / fractional CFO", "bookkeeper", "accountant"],
  },
  personas: [
    { name: "controller", kind: "human", wants: "the close done, tied, and evidenced" },
    { name: "fractional CFO", kind: "human", wants: "close-as-deliverable across a client portfolio" },
    { name: "finance agent", kind: "machine", wants: "typed close records and an outcome door it can call keylessly first" },
  ],
  agent_classes: [
    { class: "anonymous", access: "keyless sandbox over labeled example data — the universal floor" },
    { class: "machine-identified", access: "the B2A ladder: earned credits, human-claimed tenure, 402-metered calls" },
  ],
};

/** The operation-keyed rate card served at /rates.
 *  NOTE: the rate-card wire schema (rates[] inside /pricing) is Open Question
 *  #1 of the template spec; the vendored pricing builder at the ratified pin
 *  emits the Appendix A.2 document only, so the operation-keyed rows live at
 *  /rates and /pricing's statement names them. Every row names a free quota
 *  or prices from zero (§5.1 law). */
export const rateCard = {
  $context: "https://schema.org.ai",
  $type: "RateCard",
  pricingDocument: `${ORIGIN}/pricing`,
  currency: "USD",
  settlement:
    "STUB — wave zero: 402-shaped payable doors are labeled stubs; no live billing occurs and no payment is collected. Test-mode counts as face-payable; live settlement activation is a platform charter, not this property's.",
  rates: [
    { operation: "GET /close-deliverables", verb: "listCloseDeliverables", price: 0, freeQuota: "unlimited" },
    { operation: "GET /close-deliverables/{id}", verb: "getCloseDeliverable", price: 0.002, freeQuota: "100/day keyless sandbox reads" },
    { operation: "GET /ledgers", verb: "listLedgers", price: 0, freeQuota: "unlimited" },
    { operation: "GET /ledgers/{id}", verb: "getLedger", price: 0.002, freeQuota: "100/day keyless sandbox reads" },
    {
      operation: "POST /orders",
      verb: "orderCloseDeliverable",
      price: 49,
      per: "completed, verified close deliverable (per-outcome)",
      freeQuota: "0 — the sandbox serves completed example deliverables free; ordering is the payable outcome door",
    },
  ],
};

const llmsBody = `# monthend.finance

The month-end close as a typed, verifiable surface: one Ledger and ten typed
close deliverables (trial balance through the month-end package), each an
outcome-grain record an agent can list, fetch, and order.

Start keyless: \`GET /close-deliverables\` answers 200 OK to an anonymous
caller with a full, internally consistent example close cycle — synthetic,
clearly labeled example data over a fictional company (the sandbox is the
real product over simulated data, never a faked demo). Filter with
\`?type=\`, \`?period=\`, \`?status=\`; a non-matching filter answers a typed
EMPTY; reserved scopes answer a typed BLOCKED; ordering a deliverable answers
a typed 402 OFFER whose alternatives carry every rung of the ladder: pay
(metered), work (earned credits), claim (human attribution).

Pricing is declared, not negotiated: \`GET /pricing\` (Appendix A.2 document)
and \`GET /rates\` (operation-keyed rows; every row names a free quota or
prices from zero). Wave zero is test-mode: payable doors are labeled stubs
and no billing occurs.

Run our tests: \`GET /verify\` — the digest-pinned public-contract suite,
runnable by anyone against the live doors.`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "monthend.finance",
  description:
    "The month-end close as a typed, verifiable surface: the Ledger and ten typed close deliverables " +
    "(trial balance through month-end package) with honest OK | EMPTY | BLOCKED | OFFER envelopes and a " +
    "keyless sandbox over clearly-labeled synthetic example data.",
  version: "0.1.0",
  collection: {
    path: "/close-deliverables",
    memberName: "deliverables",
    summary: "The close deliverables — one branching keyless collection over the sandbox close cycles",
    records: closeDeliverables,
    filters: ["type", "period", "status"],
    blockedScopes: ["tenant", "internal"],
    blockedReason: (scope) =>
      scope === "tenant"
        ? "tenant-scoped ledgers require a claimed workspace — the anonymous sandbox serves the example tenant only"
        : "scope 'internal' is reserved to the platform — not permitted for your agent class",
  },
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "USD requested spend per call window",
    price: 49,
    binding: false,
    statement:
      "Wave-zero pricing is stated intent, not bound terms: settlement is not live, every payable door is a " +
      "labeled 402-shaped stub, and no billing occurs. The operation-keyed rate card at /rates names a free " +
      "quota or a zero price on every row.",
    offers: [
      {
        id: "close-deliverable-outcome",
        title: "One completed, verified close deliverable (per-outcome)",
        price: { amount: 49, currency: "USD", per: "completed, verified close deliverable", settlement: "stub — test-mode, no live billing" },
        alternatives: [
          { kind: "pay", note: "402-metered against machine identity (id.org.ai grain) — wave-zero stub, no live settlement" },
          { kind: "work", note: "earn ledger credits via proof-of-work tasks — the earned rung of the ladder" },
          { kind: "claim", note: "a human claims this workspace — attribution converts to longer sandbox tenure" },
          { kind: "human", note: "prefer a person handle it end to end? monthend.finance/ is the door in plain language" },
        ],
      },
    ],
  },
  routes: [
    {
      method: "GET",
      path: "/ledgers",
      summary: "List the ledgers visible to this caller (anonymous callers see the labeled example ledger)",
      responses: { 200: { description: "OK envelope; member name 'ledgers'" } },
    },
    {
      method: "GET",
      path: "/ledgers/{id}",
      summary: "One ledger with its full double-entry journal",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY — unknown id is an honest miss, not an error page" } },
    },
    {
      method: "GET",
      path: "/close-deliverables/{id}",
      summary: "One typed close deliverable with its computed content",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "POST",
      path: "/orders",
      summary: "Order a close deliverable (the per-outcome door) — answers a typed 402 OFFER; wave-zero stub, no billing",
      responses: { 402: { description: "OFFER envelope with the full ladder in alternatives" } },
    },
    {
      method: "GET",
      path: "/rates",
      summary: "The operation-keyed rate card — every row names a free quota or prices from zero",
      responses: { 200: { description: "RateCard document" } },
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
      name: "apis.accountants",
      origin: "https://apis.accountants",
      role: "the practice-side sibling — the functions an accounting firm's systems call (accounting-tax vertical)",
    },
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "independent conformance verifier — every claim this surface makes is checked there, never self-graded",
    },
  ],
  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>monthend.finance</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}h1{font-size:2rem;line-height:1.2}small{color:#666}</style></head>
<body>
<h1>Your month-end close, done.</h1>
<p>The trial balance, the reconciliations, the accruals, the package — ten
deliverables, every month, tied to your books.</p>
<p>Browse an <strong>example close</strong> below: two full months for a
fictional company, so you can see exactly what "done" looks like.
<small>All figures on this page are labeled example data — a real close runs
on your books, never on samples.</small></p>
<p><a href="/close-deliverables">See the example close deliverables</a></p>
</body></html>
`,
    md: `# monthend.finance

Your month-end close, done: the Ledger plus ten typed close deliverables
(trial balance through the month-end package), every month.

- Example close (keyless, labeled synthetic data): /close-deliverables
- Machine surfaces: /llms.txt · /.well-known/agents.json · /openapi.json · /pricing · /rates
- Run our tests: /verify
`,
  },
});
