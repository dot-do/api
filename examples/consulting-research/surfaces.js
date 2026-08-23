/**
 * surfaces.js — the substrate's supplemental served documents:
 *
 *   /icp.json  — the G2 coordinates of this substrate (ICP + personas +
 *                System coordinates), exposed from the card via links.icp.
 *   /rates     — the operation-keyed rate card (rates[]), supplementing the
 *                closed AXP Pricing Document at /pricing. The rate-card
 *                extension shape inside /pricing itself is an OPEN founder
 *                question (template spec, Open Q1); until ruled, the rates
 *                document is served at its own address and linked.
 *   /verify    — the published verification suite document ("run this",
 *                not "trust us"). interfaces.testSuite is NOT declared on
 *                the card at wave zero: declaration arms the strict
 *                digest-pinned check, which belongs after the hosted api.qa
 *                verdict exists for this (placeholder) domain.
 */
import { ORIGIN, SUBSTRATE } from "./manifest.js";
import { product } from "./product.js";

export const ICP_DOC = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  $id: `${ORIGIN}/icp.json`,
  substrate: SUBSTRATE,
  g2: {
    icp: {
      companyTypes: ["consulting firm", "research lab", "agency of record"],
      jobTypes: ["management analyst", "researcher", "engagement manager"],
    },
    personas: [
      { id: "operator", description: "engagement manager or partner at a professional-services firm running engagements as records" },
      { id: "developer", description: "developer at a professional-services systems vendor integrating engagement/PSA records" },
      { id: "agent", description: "autonomous agent purchasing completed, verified analysis deliverables (outcome grain)" },
    ],
  },
  systems: product.systems,
  anchors: {
    naics: ["5416", "5417"],
    onet: ["13-1111.00"],
    unspsc: ["80"],
    napcs: "NAPCS services catalog types the sellable engagement outcomes",
  },
};

// Every rate row names a freeQuota or prices from zero (template spec §5.1).
// binding mirrors /pricing: stated intent, stub — nothing is ever charged here.
export const RATES_DOC = {
  $context: "https://schema.org.ai",
  $type: "RateCard",
  $id: `${ORIGIN}/rates`,
  substrate: SUBSTRATE,
  pricingDocument: `${ORIGIN}/pricing`,
  binding: false,
  statement:
    "Wave-zero stub rate card on a placeholder surface: stated intent for the category, not terms. No live settlement exists; nothing is ever charged. Operation keys use the AXP A.8.7.1 canonical identifier grammar.",
  currency: "USD",
  rates: [
    { operation: "openapi:listCollection", path: "GET /engagements", price: 0, freeQuota: "unlimited" },
    { operation: "openapi:GET /engagements/{id}", price: 0.002, freeQuota: 100 },
    { operation: "openapi:POST /engagements", price: 0, freeQuota: "unlimited (sandbox workspaces)" },
    { operation: "openapi:GET /sows", price: 0, freeQuota: "unlimited" },
    { operation: "openapi:GET /sows/{id}", price: 0, freeQuota: "unlimited" },
    { operation: "openapi:GET /milestones", price: 0, freeQuota: "unlimited" },
    { operation: "openapi:GET /deliverables", price: 0, freeQuota: "unlimited" },
    { operation: "openapi:GET /deliverables/{id}", price: 0.002, freeQuota: 100 },
    {
      operation: "openapi:POST /deliverables/{id}/order",
      price: 25.0,
      unit: "per completed verified deliverable (per-outcome)",
      freeQuota: 1,
      stub: true,
      note: "402 OFFER boundary is served today; settlement is a stub (test-mode). The OFFER body advertises the pay / work / claim ladder.",
    },
    { operation: "openapi:GET /tasks", price: 0, freeQuota: "unlimited" },
    { operation: "openapi:GET /processes", price: 0, freeQuota: "unlimited" },
  ],
};

// api.qa/suite@1-SHAPED declarative checks; undeclared on the card (see header).
export const VERIFY_DOC = {
  $context: "https://schema.org.ai",
  $type: "VerificationSuite",
  $id: `${ORIGIN}/verify`,
  substrate: SUBSTRATE,
  statement:
    "Run these against the live surface — every claim on this property that can be a test is a test. The suite is published here; independent verification is api.qa's job and its verdict, once this surface has a ruled domain, links from the capability card.",
  checks: [
    { id: "keyless-first-value", request: { method: "GET", path: "/engagements" }, expect: { status: 200, "body.type": "OK" } },
    { id: "known-empty-1", request: { method: "GET", path: "/engagements?status=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-empty-2", request: { method: "GET", path: "/engagements?sector=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-forbidden-1", request: { method: "GET", path: "/engagements?scope=internal" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "known-forbidden-2", request: { method: "GET", path: "/engagements?scope=partner-billing" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "pricing-declared", request: { method: "GET", path: "/pricing" }, expect: { status: 200, "body.model": "metered", "body.binding": false } },
    { id: "over-ceiling-offer", request: { method: "GET", path: "/engagements?spend=26" }, expect: { status: 402, "body.type": "OFFER" } },
    { id: "half-ceiling-ok", request: { method: "GET", path: "/engagements?spend=12" }, expect: { status: 200 } },
    { id: "zero-spend-ok", request: { method: "GET", path: "/engagements?spend=0" }, expect: { status: 200 } },
    { id: "order-offer-stub", request: { method: "POST", path: "/deliverables/del-ex-1/order" }, expect: { status: 402, "body.type": "OFFER", "body.stub": true } },
    { id: "seed-labeled", request: { method: "GET", path: "/engagements" }, expect: { "body.engagements[0].example": true } },
    { id: "mcp-tools-listed", request: { method: "POST", path: "/mcp", jsonrpc: "tools/list" }, expect: { "tools.length": 6 } },
  ],
};
