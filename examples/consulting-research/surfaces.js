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
 * The former /rates side door is RETIRED: the rate card rides TOP-LEVEL as
 * rates[] in the Pricing Document at /pricing — the ruled placement, native
 * in the generator since axp-ext-rates-g2@0.2.0 (axp-faces 0.3.0).
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
    naics: ["5416", "5417"],
    onet: ["13-1111.00"],
    unspsc: ["80"],
    napcs: "NAPCS services catalog types the sellable engagement outcomes",
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
