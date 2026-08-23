/**
 * surfaces.js — the substrate's supplemental served documents:
 *
 *   /icp.json  — the G2 coordinates of this substrate (ICP + personas +
 *                the FSM System coordinate; DMS recorded as deferred per the
 *                row), exposed from the card via links.icp AND carried
 *                top-level on the card as `g2` (axp-ext/rates-g2 §4).
 *   /verify    — the published verification suite document ("run this",
 *                not "trust us"). interfaces.testSuite is NOT declared on
 *                the card at wave zero: declaration arms the strict
 *                digest-pinned check, which belongs after the hosted api.qa
 *                verdict exists. links.verify IS declared (§3) — the
 *                document answers.
 *
 * NOTE: there is NO separate /rates document on this property. The operation
 * rate card rides `rates[]` TOP-LEVEL in the Pricing Document at /pricing —
 * the ruled placement (axp-ext/rates-g2 §2). A second rates address would be
 * divergence.
 */
import { ORIGIN, SUBSTRATE, manifest } from "./manifest.js";
import { product } from "./product.js";

export const ICP_DOC = {
  $context: "https://schema.org.ai",
  $type: "ICP",
  $id: `${ORIGIN}/icp.json`,
  substrate: SUBSTRATE,
  g2: manifest.g2,
  systems: product.systems, // FSM⟨automotive-repair 8111⟩ — the served coordinate
  systemsNote: product.systemsNote, // DMS named by the row, instantiation deferred — declared, never mounted
  anchors: {
    naics: ["441", "8111"],
    vin: "VIN as the G1 identity key — ISO 3779/3780 [register: UNVERIFIED — standard cited from background knowledge, not estate docs]; sandbox VINs are EXAMPLE-prefixed VIN-shaped synthetic, never real",
    unspsc: "segment 25 (vehicles) [register: UNVERIFIED at class level] — typing anchor on parts records",
    onet: "49-3023 automotive service technicians, 41-2022 sales [register: UNVERIFIED specific codes] — carried with the row's own caveat",
    gtin: "parts/tires ride the GTIN/UNSPSC identity spine; sandbox GTINs use the GS1 demo prefix 952 with valid check digits (fixture law)",
  },
  motionNote:
    "the row differentiates motions by brand: auto.dev = B2D (developers, the proven wedge), vin.company = B2B/B2C human-vocabulary counterpart, apis.autos = dealer-group systems (pitch record), B2A = the generalization frontier (apis.ax face, not yet built).",
};

// api.qa/suite@1-SHAPED declarative checks; undeclared on the card as
// interfaces.testSuite (see header) but linked via links.verify.
export const VERIFY_DOC = {
  $context: "https://schema.org.ai",
  $type: "VerificationSuite",
  $id: `${ORIGIN}/verify`,
  substrate: SUBSTRATE,
  statement:
    "Run these against the live surface — every claim on this property that can be a test is a test. The suite is published here; independent verification is api.qa's job and its verdict links from the capability card once hosted.",
  checks: [
    { id: "keyless-first-value", request: { method: "GET", path: "/vehicles" }, expect: { status: 200, "body.type": "OK" } },
    { id: "known-empty-1", request: { method: "GET", path: "/vehicles?make=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-empty-2", request: { method: "GET", path: "/vehicles?year=1900" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-forbidden-1", request: { method: "GET", path: "/vehicles?scope=owner-pii" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "known-forbidden-2", request: { method: "GET", path: "/vehicles?scope=dealer-cost" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "pricing-declared", request: { method: "GET", path: "/pricing" }, expect: { status: 200, "body.model": "metered", "body.binding": false } },
    { id: "rates-top-level", request: { method: "GET", path: "/pricing" }, expect: { "body.rates": "non-empty array keyed on canonical operationIds (axp-ext/rates-g2 §2); included allowances, never legacy freeQuota (0.2.0 survey floor)" } },
    { id: "card-g2-and-verify-link", request: { method: "GET", path: "/.well-known/agents.json" }, expect: { "body.g2": "top-level object", "body.links.verify": `${ORIGIN}/verify` } },
    { id: "over-ceiling-offer", request: { method: "GET", path: "/vehicles?spend=26" }, expect: { status: 402, "body.type": "OFFER" } },
    { id: "half-ceiling-ok", request: { method: "GET", path: "/vehicles?spend=12" }, expect: { status: 200 } },
    { id: "zero-spend-ok", request: { method: "GET", path: "/vehicles?spend=0" }, expect: { status: 200 } },
    { id: "complete-offer-stub", request: { method: "POST", path: "/work-orders/wo-ex-1/complete" }, expect: { status: 402, "body.type": "OFFER", "body.stub": true } },
    { id: "seed-labeled", request: { method: "GET", path: "/vehicles" }, expect: { "body.vehicles[0].example": true } },
    { id: "vin-decode-sandbox", request: { method: "GET", path: "/vin/{any seed VIN}" }, expect: { status: 200, "body.type": "OK", note: "sandbox decode answers only the labeled synthetic corpus" } },
    { id: "headless-door-same-collection", request: { method: "POST", path: "/work-orders" }, expect: { status: 200, "body.type": "OK", "body.workspace": "minted, retention disclosed" } },
    { id: "mcp-tools-listed", request: { method: "POST", path: "/mcp", jsonrpc: "tools/list" }, expect: { "tools.length": 6 } },
  ],
};

export { product };
