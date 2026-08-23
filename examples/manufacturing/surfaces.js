/**
 * surfaces.js — the substrate's supplemental served documents:
 *
 *   /icp.json  — the G2 coordinates of this substrate (ICP + personas +
 *                System coordinates), exposed from the card via links.icp
 *                AND carried top-level on the card as `g2` (axp-ext/rates-g2
 *                §4 — the ruled placement, generator-native in this
 *                vendoring).
 *   /verify    — the published verification suite document ("run this",
 *                not "trust us"). interfaces.testSuite is NOT declared on
 *                the card at wave zero: declaration arms the strict
 *                digest-pinned check, which belongs after the hosted api.qa
 *                verdict exists for this (placeholder) domain. links.verify
 *                IS declared (axp-ext/rates-g2 §3) — the document answers.
 *
 * NOTE: there is NO separate /rates document on this property. The
 * operation rate card rides `rates[]` TOP-LEVEL in the Pricing Document at
 * /pricing — the ruled placement (axp-ext/rates-g2 §2). A second rates
 * address would be divergence.
 */
import { ORIGIN, SUBSTRATE, manifest } from "./manifest.js";
import { product } from "./product.js";

export const ICP_DOC = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  $id: `${ORIGIN}/icp.json`,
  substrate: SUBSTRATE,
  g2: manifest.g2,
  anchors: {
    naics: ["31", "32", "33"],
    onet: "ERP is the O*NET-modal system for this market (381 occupations — top row of the ~52-System catalog); CAD/PLM at 254 occupations",
    gs1: "GTIN / GPC / Digital Link product identity (typing anchors; sandbox GTINs use the GS1 demo prefix 952)",
    unspsc: "4-level product classification — the UNSPSC↔GPC↔HTS crosswalk is the identity spine this row rides (schema-shaped synthetic rows at wave zero)",
    x12: "850/856/810 on the wholesale trading edge (typing anchors; synthetic content)",
  },
};

// api.qa/suite@1-SHAPED declarative checks; undeclared on the card as
// interfaces.testSuite (see header) but linked via links.verify.
export const VERIFY_DOC = {
  $context: "https://schema.org.ai",
  $type: "VerificationSuite",
  $id: `${ORIGIN}/verify`,
  substrate: SUBSTRATE,
  statement:
    "Run these against the live surface — every claim on this property that can be a test is a test. The suite is published here; independent verification is api.qa's job and its verdict, once this surface has a ruled domain, links from the capability card.",
  checks: [
    { id: "keyless-first-value", request: { method: "GET", path: "/items" }, expect: { status: 200, "body.type": "OK" } },
    { id: "known-empty-1", request: { method: "GET", path: "/items?status=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-empty-2", request: { method: "GET", path: "/items?gpcSegment=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-forbidden-1", request: { method: "GET", path: "/items?scope=internal" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "known-forbidden-2", request: { method: "GET", path: "/items?scope=partner-pricing" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "pricing-declared", request: { method: "GET", path: "/pricing" }, expect: { status: 200, "body.model": "metered", "body.binding": false } },
    { id: "rates-top-level", request: { method: "GET", path: "/pricing" }, expect: { "body.rates": "non-empty array keyed on canonical operationIds (axp-ext/rates-g2 §2)" } },
    { id: "card-g2-and-verify-link", request: { method: "GET", path: "/.well-known/agents.json" }, expect: { "body.g2": "top-level object", "body.links.verify": `${ORIGIN}/verify` } },
    { id: "over-ceiling-offer", request: { method: "GET", path: "/items?spend=26" }, expect: { status: 402, "body.type": "OFFER" } },
    { id: "half-ceiling-ok", request: { method: "GET", path: "/items?spend=12" }, expect: { status: 200 } },
    { id: "zero-spend-ok", request: { method: "GET", path: "/items?spend=0" }, expect: { status: 200 } },
    { id: "syndicate-offer-stub", request: { method: "POST", path: "/items/item-ex-1/syndicate" }, expect: { status: 402, "body.type": "OFFER", "body.stub": true } },
    { id: "seed-labeled", request: { method: "GET", path: "/items" }, expect: { "body.items[0].example": true } },
    { id: "gtin-demo-prefix", request: { method: "GET", path: "/items" }, expect: { "body.items[*].gtin": "starts with GS1 demo prefix 952, valid GTIN-13 check digit" } },
    { id: "mcp-tools-listed", request: { method: "POST", path: "/mcp", jsonrpc: "tools/list" }, expect: { "tools.length": 6 } },
  ],
};

export { product };
