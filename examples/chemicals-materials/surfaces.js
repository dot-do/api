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
 * axp-ext-rates-g2 (extension 0.2.0, axp-faces 0.3.0). No side doors.
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
    naics: ["325"],
    unspsc: ["12 [UNVERIFIED — register hedge carried]"],
    documentSchema: "GHS 16-section SDS (OSHA HazCom 2012) [UNVERIFIED cite — standard is real, cite not in estate docs]",
    identitySpine: "CAS registry numbers [UNVERIFIED]; sandbox ids are CAS-shaped synthetic",
    shippingGrain: "UN dangerous-goods numbers + 49 CFR hazmat shipping papers [UNVERIFIED]",
  },
  rowHedge:
    "Single-lens candidate (VC #25 only), artifact depth, marked [H] with an explicit probe-before-build flag — the anchor's [UNVERIFIED] tag is the operative fact of the register row and is carried on every anchor above.",
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
    { id: "keyless-first-value", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets" }, expect: { status: 200, "body.type": "OK" } },
    { id: "known-empty-1", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?hazardClass=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-empty-2", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?supplier=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-forbidden-1", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?scope=trade-secret" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "known-forbidden-2", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?scope=supplier-pricing" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "pricing-declared", operation: "getPricing", request: { method: "GET", path: "/pricing" }, expect: { status: 200, "body.model": "metered", "body.binding": false } },
    { id: "over-ceiling-offer", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?spend=26" }, expect: { status: 402, "body.type": "OFFER" } },
    { id: "half-ceiling-ok", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?spend=12" }, expect: { status: 200 } },
    { id: "zero-spend-ok", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets?spend=0" }, expect: { status: 200 } },
    { id: "issue-offer-stub", operation: "issueShippingDeclaration", request: { method: "POST", path: "/shipping-declarations/dec-ex-1/issue" }, expect: { status: 402, "body.type": "OFFER", "body.stub": true } },
    { id: "seed-labeled", operation: "listSafetyDataSheets", request: { method: "GET", path: "/safety-data-sheets" }, expect: { "body.safetyDataSheets[0].example": true } },
    { id: "sds-sixteen-sections", operation: "getSafetyDataSheet", request: { method: "GET", path: "/safety-data-sheets/sds-ex-1" }, expect: { "body.safetyDataSheets[0].sections.length": 16 } },
    { id: "mcp-tools-listed", operation: "listSafetyDataSheets", request: { method: "POST", path: "/mcp", jsonrpc: "tools/list" }, expect: { "tools.length": 6 } },
  ],
};
