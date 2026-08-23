/**
 * manifest.js — the ONE site manifest apis.finance is generated from
 * (vendored axp-faces at the PINS.json digest; never hand-rolled).
 *
 * Property-template spec §2/§4/§5 instantiation for register row
 * banking-payments:
 *   - branching collection /payment-messages = the anon sandbox universal
 *     floor (keyless OK over labeled synthetic ISO 20022 records);
 *   - metered pricing with binding:false + statement — every payable door is
 *     a labeled 402-shaped stub (test-mode; no live settlement; settlement
 *     primitives are payments.do platform modules this property CONSUMES,
 *     not contains);
 *   - the 402 OFFER alternatives advertise ONLY MOUNTED rungs (batch-2
 *     ruling): the keyless sandbox and this stub pay door. Unmounted rungs
 *     (earned credits, human-claimed, OAuth free tier, checkout) are NOT
 *     advertised — they land with the credit ledger / claim door / billing
 *     lane and the note below says so;
 *   - G2 coordinates served at /icp.json AND bridged top-level onto the card
 *     as `g2` (batch-2 ruled placement, bridge.js).
 */

import { defineSiteManifest } from "./axp/index.js";
import { paymentMessages } from "./seed.js";
import { APIProduct } from "./product.js";

export const ORIGIN = "https://apis.finance";

/** G2 coordinates — served at /icp.json and bridged top-level onto the card. */
export const icpDoc = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  substrate: APIProduct.substrate,
  vertical: "Banking, Lending & Payments (NAICS 521-522 ex-mortgage)",
  system: APIProduct.systems[0],
  icp: {
    companyTypes: ["banks", "credit unions", "non-bank lenders", "fintech loan servicers"],
    jobTypes: ["lending-operations owner", "loan-servicing systems owner", "integration developer"],
  },
  personas: [
    { name: "lending-operations systems owner", kind: "human", wants: "the lender's integration surface typed, verifiable, and callable" },
    { name: "loan-servicing systems owner", kind: "human", wants: "ISO 20022 servicing records and loan state without screen-scraping a core" },
    { name: "integration developer", kind: "human", wants: "a keyless sandbox first, a rate card second, a key third" },
    { name: "lending agent", kind: "machine", wants: "typed payment/loan/credit-file records it can pull keylessly before any commitment (the B2A leg rides apis.ax)" },
  ],
  agent_classes: [
    { class: "anonymous", access: "keyless sandbox over labeled example data — the universal floor" },
    { class: "machine-identified", access: "402-metered doors against machine identity — wave-zero labeled stubs; no live settlement" },
  ],
};

/** The operation-keyed rate rows — bridged TOP-LEVEL into the Pricing
 *  Document as `rates[]` (batch-2 ruled placement; bridge.js). Every row
 *  names a freeQuota or prices from zero (§5.1 law), and every `operation`
 *  is an OpenAPI operationId the bridged contract actually emits (§9.1). */
export const RATE_ROWS = [
  { operation: "listCollection", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getPaymentMessage", price: 0.0002, unit: "USD/call", freeQuota: "1000/day keyless sandbox reads" },
  { operation: "listLoans", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getLoan", price: 0.0002, unit: "USD/call", freeQuota: "1000/day keyless sandbox reads" },
  { operation: "listCreditFiles", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getCreditFile", price: 0.0005, unit: "USD/call", freeQuota: "250/day keyless sandbox reads" },
  {
    operation: "pullCreditFile",
    price: 1.5,
    unit: "USD per consented commercial credit-file pull",
    freeQuota: "0 — the sandbox serves labeled example files free at GET /credit-files; the pull door is the payable records floor",
    status: "stub — test-mode; no live settlement, no consented pull is performed at wave zero",
  },
  { operation: "listLenders", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getLender", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  {
    operation: "submitOrigination",
    price: 25,
    unit: "USD per origination submission routed to a licensed Lender (per-outcome door; the licensed Lender, not this property, grants credit)",
    freeQuota: "0 — the sandbox serves labeled example loans free at GET /loans; submission is the payable door",
    status: "stub — test-mode; no live settlement, no submission is routed at wave zero",
  },
  { operation: "mintWorkspace", price: 0, unit: "USD/call", freeQuota: "unlimited (ephemeral at wave zero — disclosed on mint)" },
  { operation: "getWorkspace", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "registerLoanRecord", price: 0, unit: "USD/call", freeQuota: "unlimited (ephemeral at wave zero — disclosed on response)" },
  { operation: "getPricing", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getOffer", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getFamilyRegistry", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getICP", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getVerify", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getVerifySuite", price: 0, unit: "USD/call", freeQuota: "unlimited" },
  { operation: "getHealth", price: 0, unit: "USD/call", freeQuota: "unlimited" },
];

const llmsBody = `# apis.finance

The functions a lending system calls: ISO 20022 payment messages
(pain.001 / pacs.008 / camt.053), loans at the door grain, commercial
credit files (the records floor — agents can't grant credit; they can pull
the file), and lender/product market records. The data/functions layer,
never the payment rails.

Start keyless: \`GET /payment-messages\` answers 200 OK to an anonymous
caller with a full, internally consistent servicing corpus — three
amortizing loans, their disbursement and installment messages, and chained
monthly statements, all synthetic and clearly labeled example data over a
fictional lender (the sandbox is the real product over simulated data,
never a faked demo). Filter with \`?type=\` (message type) and \`?period=\`;
a non-matching filter answers a typed EMPTY; reserved scopes answer a typed
BLOCKED; over-ceiling spend answers a typed 402 OFFER.

Payable doors — \`POST /credit-files/pulls\` (consented file pull) and
\`POST /originations\` (submission routed to a licensed Lender) — answer
typed 402 OFFERs. Wave zero is test-mode: these are labeled stubs and no
billing occurs. Only mounted rungs are advertised in an OFFER's
alternatives.

Pricing is declared, not negotiated: \`GET /pricing\` carries the Pricing
Document with its operation-keyed \`rates[]\` — every row names a free quota
or prices from zero.

MCP door: \`POST /mcp\` (streamable-http JSON-RPC). Sandbox read tools are
authless; payable tools require a bearer key and answer typed offers.

Run our tests: \`GET /verify\` — the digest-pinned public-contract suite,
runnable by anyone against the live doors.`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "apis.finance",
  description:
    "The functions a lending system calls: ISO 20022 payment messages, loans at the door grain, commercial " +
    "credit files, and lender/product market records — typed OK | EMPTY | BLOCKED | OFFER envelopes over a " +
    "keyless sandbox of clearly-labeled synthetic example data. The data/functions layer, never the rails.",
  version: "0.1.0",
  collection: {
    path: "/payment-messages",
    memberName: "messages",
    summary: "ISO 20022 payment messages — one branching keyless collection over the sandbox servicing corpus",
    records: paymentMessages,
    filters: ["type", "period"],
    blockedScopes: ["tenant", "internal"],
    match: (rec, param, value) =>
      param === "type"
        ? String(rec.msgType).startsWith(value)
        : param === "period"
          ? String(rec.valueDate).startsWith(value) || rec.period === value
          : false,
    emptyMessage: (param, value) => `no payment messages match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason: (scope) =>
      scope === "tenant"
        ? "tenant-scoped servicing records require a claimed workspace — the anonymous sandbox serves the example tenant only"
        : "scope 'internal' is reserved to the platform — not permitted for your agent class",
  },
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "USD requested spend per call window",
    price: 0.0002,
    binding: false,
    statement:
      "Wave-zero pricing is stated intent, not bound terms: settlement is not live (settlement/billing " +
      "primitives are platform modules this property consumes, not contains), every payable door is a " +
      "labeled 402-shaped stub, and no billing occurs. The operation-keyed rates[] in this document names " +
      "a free quota or a zero price on every row.",
    offers: [
      {
        id: "lending-system-calls",
        title: "Metered calls + payable doors: credit-file pull ($1.50, consented) and origination submission ($25, routed to a licensed Lender) — test-mode stubs, no live settlement",
        price: 0.0002,
        unit: "USD/call",
        status: "stub — the 402 boundary is served; no charge is collected at wave zero",
        alternatives: [
          {
            rung: 0,
            kind: "sandbox",
            note: "keyless anon sandbox over labeled example data — mounted and free; the universal floor",
          },
          {
            kind: "pay",
            note: "this 402-metered door against the declared rate rows — wave-zero labeled stub; no charge is collected",
          },
        ],
        ladderNote:
          "Only MOUNTED rungs are advertised (estate ruling). Unmounted rungs — earned .ax-ledger credits (work), " +
          "human-claimed tenure (claim), OAuth free tier, and checkout — are not listed here and will appear " +
          "exactly when their doors mount.",
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },
  routes: [
    {
      method: "GET",
      path: "/payment-messages/{id}",
      summary: "One ISO 20022 payment message by id",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY — unknown id is an honest miss, not an error page" } },
    },
    {
      method: "GET",
      path: "/loans",
      summary: "The loans visible to this caller (anonymous callers see the labeled example loans, door grain)",
      responses: { 200: { description: "OK envelope; member name 'loans'" } },
    },
    {
      method: "GET",
      path: "/loans/{id}",
      summary: "One loan with its amortization schedule to date",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "GET",
      path: "/credit-files",
      summary: "Commercial credit files (the records floor) — labeled example files for the sandbox tenant",
      responses: { 200: { description: "OK envelope; member name 'files'" } },
    },
    {
      method: "GET",
      path: "/credit-files/{id}",
      summary: "One credit file with tradelines that tie to the loan corpus by construction",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "POST",
      path: "/credit-files/pulls",
      summary: "Pull a consented commercial credit file (the payable records-floor door) — typed 402 OFFER; wave-zero stub, no billing",
      responses: { 402: { description: "OFFER envelope — mounted rungs only in alternatives" } },
    },
    {
      method: "GET",
      path: "/lenders",
      summary: "Lender/product market records (labeled synthetic; the public-ingest enrichment route is unruled and deferred)",
      responses: { 200: { description: "OK envelope; member name 'lenders'" } },
    },
    {
      method: "GET",
      path: "/lenders/{id}",
      summary: "One lender/product market record",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY" } },
    },
    {
      method: "POST",
      path: "/originations",
      summary: "Submit a loan origination for routing to a licensed Lender (the standing door — the Lender, not this property, grants credit) — typed 402 OFFER; wave-zero stub",
      responses: { 402: { description: "OFFER envelope — mounted rungs only in alternatives" } },
    },
    {
      method: "POST",
      path: "/workspaces",
      summary: "Auto-mint an anonymous sandbox workspace (keyless; EPHEMERAL at wave zero — retention disclosed on mint)",
      responses: { 200: { description: "OK envelope with the minted workspace" } },
    },
    {
      method: "GET",
      path: "/workspaces/{id}",
      summary: "One workspace — the core-banking system-of-record door (headless ply); ephemeral at wave zero, so lookups answer a typed EMPTY that says so",
      params: [{ name: "id", in: "path", required: true }],
      responses: { 200: { description: "OK envelope" }, 404: { description: "typed EMPTY — workspaces do not persist at wave zero" } },
    },
    {
      method: "POST",
      path: "/workspaces/{id}/loans",
      summary: "Register a loan record in a workspace (native binding — the system-of-record verb); validated and echoed typed; persistence lands with the durable workspace and the response discloses it",
      responses: { 200: { description: "OK envelope with the validated record, persisted:false disclosed" } },
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
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: [
      "search_payment_messages",
      "get_payment_message",
      "list_loans",
      "get_loan",
      "list_credit_files",
      "get_credit_file",
      "list_lenders",
      "get_pricing",
      "pull_credit_file",
      "submit_origination",
    ],
    auth: {
      scheme: "bearer",
      note: "sandbox read tools are authless (the anon-sandbox rung); payable tools (pull_credit_file, submit_origination) require a bearer key and answer typed offers — wave-zero stubs, no live settlement",
    },
  },
  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,
  family: [
    {
      name: "apis.credit",
      origin: "https://apis.credit",
      role: "same-property sub-rail (recorded name, not yet serving): the credit-file records floor — 'Agents can't grant credit. They can pull the file.'",
    },
    {
      name: "apis.loans",
      origin: "https://apis.loans",
      role: "same-property sub-rail (recorded name, not yet serving): the standing door for origination via licensed Lenders",
    },
    {
      name: "api.qa",
      origin: "https://api.qa",
      role: "independent conformance verifier — every claim this surface makes is checked there, never self-graded",
    },
  ],
  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>apis.finance</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}h1{font-size:2rem;line-height:1.2}small{color:#666}code{background:#f4f4f4;padding:.1em .3em;border-radius:3px}</style></head>
<body>
<h1>The functions a lending system calls.</h1>
<p>ISO 20022 payment messages, loans at the door grain, commercial credit
files, and lender records — typed, verifiable, and callable keylessly
before any commitment. The data and functions layer, never the payment
rails.</p>
<p>Browse the <strong>example servicing corpus</strong>: three amortizing
loans, their disbursements, installments, and chained monthly statements.
<small>Everything on this page is labeled example data over a fictional
lender — a real integration runs on your records, never on samples.</small></p>
<p><a href="/payment-messages">See the example payment messages</a> ·
<a href="/loans">loans</a> · <a href="/credit-files">credit files</a></p>
</body></html>
`,
    md: `# apis.finance

The functions a lending system calls: ISO 20022 payment messages, loans at
the door grain, commercial credit files, and lender/product market records.

- Example servicing corpus (keyless, labeled synthetic data): /payment-messages · /loans · /credit-files · /lenders
- Machine surfaces: /llms.txt · /.well-known/agents.json · /openapi.json · /pricing
- MCP door: POST /mcp (sandbox reads authless; payable tools bearer-keyed)
- Run our tests: /verify
`,
  },
});
