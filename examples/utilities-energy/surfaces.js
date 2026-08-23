/**
 * surfaces.js — the substrate's supplemental served documents:
 *
 *   /icp.json  — the G2 coordinates of this substrate (ICP + personas; the
 *                row's System cell is EMPTY and is declared as provided),
 *                exposed from the card via links.icp AND carried top-level
 *                on the card as `g2` (axp-ext/rates-g2 §4 — the ruled
 *                placement, generator-native in this vendoring).
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
  systems: product.systems, // [] — the row's actual value, declared as provided
  systemsNote: product.systemsNote,
  anchors: {
    naics: ["221"],
    onet: "line/metering occupations 49-9051 et al. [register: UNVERIFIED code] — carried with the row's own caveat",
    unspsc: "segment 26 (power generation/distribution machinery) [register: UNVERIFIED]",
    espi: "Green Button / NAESB ESPI as the meter-data interchange standard [register: UNVERIFIED — not in estate docs]; typing anchor only on sandbox records",
    queues: "FERC/state interconnection-queue registries (implied by interconnection.click); sandbox queue records are schema-shaped synthetic (ISO-EX-*)",
  },
  depthRuling:
    "SC #21: Axis-2 only, avoid-class 5 — noun-grain properties on the rails, no front. The buyer coordinate is the party filing into the utility, never the utility itself.",
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
    { id: "keyless-first-value", request: { method: "GET", path: "/interval-reads" }, expect: { status: 200, "body.type": "OK" } },
    { id: "known-empty-1", request: { method: "GET", path: "/interval-reads?meter=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-empty-2", request: { method: "GET", path: "/interval-reads?period=none" }, expect: { status: 200, "body.type": "EMPTY" } },
    { id: "known-forbidden-1", request: { method: "GET", path: "/interval-reads?scope=utility-internal" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "known-forbidden-2", request: { method: "GET", path: "/interval-reads?scope=customer-pii" }, expect: { status: 403, "body.type": "BLOCKED" } },
    { id: "pricing-declared", request: { method: "GET", path: "/pricing" }, expect: { status: 200, "body.model": "metered", "body.binding": false } },
    { id: "rates-top-level", request: { method: "GET", path: "/pricing" }, expect: { "body.rates": "non-empty array keyed on canonical operationIds (axp-ext/rates-g2 §2); included allowances, never legacy freeQuota (0.2.0 survey floor)" } },
    { id: "card-g2-and-verify-link", request: { method: "GET", path: "/.well-known/agents.json" }, expect: { "body.g2": "top-level object", "body.links.verify": `${ORIGIN}/verify` } },
    { id: "over-ceiling-offer", request: { method: "GET", path: "/interval-reads?spend=26" }, expect: { status: 402, "body.type": "OFFER" } },
    { id: "half-ceiling-ok", request: { method: "GET", path: "/interval-reads?spend=12" }, expect: { status: 200 } },
    { id: "zero-spend-ok", request: { method: "GET", path: "/interval-reads?spend=0" }, expect: { status: 200 } },
    { id: "submit-offer-stub", request: { method: "POST", path: "/interconnection-requests/icr-ex-1/submit" }, expect: { status: 402, "body.type": "OFFER", "body.stub": true } },
    { id: "seed-labeled", request: { method: "GET", path: "/interval-reads" }, expect: { "body.intervalReads[0].example": true } },
    { id: "headless-door-same-collection", request: { method: "POST", path: "/interconnection-requests" }, expect: { status: 200, "body.type": "OK", "body.workspace": "minted, retention disclosed" } },
    { id: "mcp-tools-listed", request: { method: "POST", path: "/mcp", jsonrpc: "tools/list" }, expect: { "tools.length": 6 } },
  ],
};

export { product };
