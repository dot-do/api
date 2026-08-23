/**
 * surfaces.js — the substrate's supplemental served documents:
 *
 *   /icp.json  — the G2 coordinates of this substrate (ICP + personas +
 *                System coordinates), exposed from the card via links.icp
 *                and carried top-level on the card as `g2` (both from the
 *                one G2 object in manifest.js — axp-ext/rates-g2 §4).
 *   /verify    — the published verification suite document ("run this",
 *                not "trust us"), linked from the card via links.verify
 *                (axp-ext/rates-g2 §3). interfaces.testSuite is NOT declared
 *                on the card at wave zero: declaration arms the strict
 *                digest-pinned check, which belongs after the hosted api.qa
 *                verdict exists for this (placeholder) domain.
 *
 * The rate card rides TOP-LEVEL as rates[] in the Pricing Document at
 * /pricing — the ruled placement, native in the generator since
 * axp-ext-rates-g2@0.2.0 (axp-faces 0.3.0). No /rates side door exists.
 */
import { ORIGIN, SUBSTRATE, G2 } from "./manifest.js";
import { product } from "./product.js";

export const ICP_DOC = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  $id: `${ORIGIN}/icp.json`,
  substrate: SUBSTRATE,
  g2: G2,
  systems: product.systems,
  anchors: {
    naics: ["481", "482", "483"],
    regulatedAct: "customs brokerage, 19 CFR 111 — performed by licensed operators on the headless layer, never by this property",
    interchange: ["UN/CEFACT", "DCSA eBL"],
    statutoryClock: "MLETR/ETDA adoption spread (electronic transferable records gain legal equivalence per jurisdiction)",
    classification: "WCO HS / HTS spine [UNVERIFIED — flagged so in the register row; sandbox uses synthetic HTS-shaped codes only]",
  },
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
    { id: "keyless-first-value", operation: "listShipments", request: { method: "GET", path: "/shipments" }, expect: { status: 200, "body.type": "OK" } },
    { id: "known-empty-1", operation: "listShipments", request: { method: "GET", path: "/shipments?status=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-empty-2", operation: "listShipments", request: { method: "GET", path: "/shipments?mode=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-forbidden-1", operation: "listShipments", request: { method: "GET", path: "/shipments?scope=broker-entries" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "known-forbidden-2", operation: "listShipments", request: { method: "GET", path: "/shipments?scope=carrier-contracts" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "pricing-declared", operation: "getPricing", request: { method: "GET", path: "/pricing" }, expect: { status: 200, "body.model": "metered", "body.binding": false } },
    { id: "over-ceiling-offer", operation: "listShipments", request: { method: "GET", path: "/shipments?spend=26" }, expect: { status: 402, "body.type": "OFFER" } },
    { id: "half-ceiling-ok", operation: "listShipments", request: { method: "GET", path: "/shipments?spend=12" }, expect: { status: 200 } },
    { id: "zero-spend-ok", operation: "listShipments", request: { method: "GET", path: "/shipments?spend=0" }, expect: { status: 200 } },
    { id: "assemble-offer-stub", operation: "assemblePacket", request: { method: "POST", path: "/shipments/shp-ex-1/assemble-packet" }, expect: { status: 402, "body.type": "OFFER", "body.stub": true } },
    { id: "seed-labeled", operation: "listShipments", request: { method: "GET", path: "/shipments" }, expect: { "body.shipments[0].example": true } },
    { id: "mcp-tools-listed", operation: "mcp", request: { method: "POST", path: "/mcp", jsonrpc: "tools/list" }, expect: { "tools.length": 6 } },
  ],
};
