/**
 * site/inventory.js — the console's dogfood inventory: the estate's own
 * wave-zero register, 52 built rows of 53 (freight-logistics is the one
 * gated start — operator gate, standing ruling).
 *
 * Every branch/commit/gate value is REAL, cited from the build log:
 * https://github.com/StartupsStudio/studio/issues/9 (batch rollups 1–4,
 * the rail-ledger alignment pass, the barcoding.dev re-vendor, the
 * healthcare gate-lift build, and the §9.2 hosted-verdict first run of
 * 2026-08-23). This is data ABOUT the estate, not §5.2 synthetic seed —
 * the demo label on the console applies to the console chrome, not to
 * these rows. Verdicts appear ONLY where an attested api.qa run exists.
 *
 * state vocabulary: "live" = deployed and serving at the named domain;
 * "built" = wave-zero branch committed + self-verified, deploy pending
 * (Batch S / naming / founder call — the honest majority state).
 */

/** @typedef {{face:string, gap?:boolean, row:string, branch:string, commit:string, repo?:string, gate:string, state:'live'|'built', verdict?:{grade:string, ax:number, attested:boolean}}} InventoryRow */

/** @type {InventoryRow[]} */
export const INVENTORY = [
  // batch 1 (2026-08-23 rollup)
  { face: "apis.accountants", row: "accounting-tax", branch: "draft/accounting-tax-wave0", commit: "4286e2d", gate: "15/16", state: "built" },
  { face: "consulting-research.org.ai", gap: true, row: "consulting-research", branch: "draft/consulting-research-wave0", commit: "9becf8c", gate: "13/15", state: "built" },
  { face: "api.management", row: "fn-business-ops", branch: "draft/fn-business-ops-wave0", commit: "7814f93", gate: "13/16", state: "built" },
  { face: "fn-customer-service.example.com.ai", gap: true, row: "fn-customer-service", branch: "draft/fn-customer-service-wave0", commit: "d5b8bc5", gate: "13/16", state: "built" },
  { face: "monthend.finance", row: "fn-finance", branch: "draft/fn-finance-wave0", commit: "4fb8422", gate: "15/16", state: "built" },
  { face: "api.careers", row: "fn-hr-talent", branch: "draft/fn-hr-talent-wave0", commit: "3e59ccf", gate: "15/16", state: "built" },
  { face: "api.qa", row: "fn-it", branch: "draft/fn-it-wave0", commit: "cd9b4fa", repo: "dot-do/api.qa", gate: "14/16", state: "live", verdict: { grade: "A+", ax: 10, attested: true } },
  { face: "fn-product-development.org.ai", gap: true, row: "fn-product-development", branch: "draft/fn-product-development-wave0", commit: "c09d5b2", gate: "15/16", state: "built" },
  { face: "api.forsale", row: "fn-sales-marketing", branch: "draft/fn-sales-marketing-wave0", commit: "ba0a9cb", repo: "dot-do/sales", gate: "14/16", state: "built" },
  { face: "api.services", row: "fn-service-delivery", branch: "draft/fn-service-delivery-wave0", commit: "3a9fcb3", gate: "15/16", state: "built" },
  { face: "fn-strategy.org.ai", gap: true, row: "fn-strategy", branch: "draft/fn-strategy-wave0", commit: "e76c4bb", gate: "14/16", state: "built" },
  { face: "headless.marketing", row: "marketing-services", branch: "draft/marketing-services-wave0", commit: "f81f9ed", repo: "dot-do/headless.ly", gate: "14/16", state: "built" },
  { face: "apis.productions", row: "media-entertainment", branch: "draft/media-entertainment-wave0", commit: "1803f91", gate: "14/16", state: "built" },
  { face: "apis.dev", row: "software-it-services", branch: "draft/software-it-services-wave0", commit: "6436c0e", gate: "14/16", state: "built" },
  { face: "api.careers", row: "staffing-talent", branch: "draft/staffing-talent-wave0", commit: "d482e5a", gate: "14/16", state: "built" },
  // batch 2
  { face: "api.holdings", row: "holdings-corporate-mgmt", branch: "draft/holdings-corporate-mgmt-wave0", commit: "981fc4c", gate: "15/16", state: "built" },
  { face: "api.lawyer", row: "legal", branch: "draft/legal-wave0", commit: "940d86e", repo: "dot-do/ax", gate: "8/16", state: "built" },
  { face: "apis.charity", row: "nonprofits-civic", branch: "draft/nonprofits-civic-wave0", commit: "8e40cd2", gate: "15/16", state: "built" },
  { face: "apis.farm", row: "agriculture-food", branch: "draft/agriculture-food-wave0", commit: "8b411ec", gate: "15/16", state: "built" },
  { face: "apis.finance", row: "banking-payments", branch: "draft/banking-payments-wave0", commit: "21e4cdc", gate: "15/16", state: "built" },
  { face: "apis.markets", row: "capital-markets", branch: "draft/capital-markets-wave0", commit: "17de6af", gate: "15/16", state: "built" },
  { face: "apis.shop", row: "retail-ecommerce", branch: "draft/retail-ecommerce-wave0", commit: "c3881b0", gate: "15/16", state: "built" },
  { face: "fn-supply-chain.org.ai", gap: true, row: "fn-supply-chain", branch: "draft/fn-supply-chain-wave0", commit: "720b091", gate: "15/16", state: "built" },
  { face: "apis.supply", row: "wholesale-distribution", branch: "draft/wholesale-distribution-wave0", commit: "b4603a7", gate: "15/16", state: "built" },
  { face: "barcoding.dev", row: "warehousing-traceability", branch: "draft/warehousing-traceability-wave0", commit: "b2c5878", repo: "dot-do/barcoding.dev", gate: "24/24 axp-gate", state: "built" },
  { face: "fn-corporate-affairs.org.ai", gap: true, row: "fn-corporate-affairs", branch: "draft/fn-corporate-affairs-wave0", commit: "7d57e1b", gate: "15/16", state: "built" },
  { face: "manufacturing.org.ai", gap: true, row: "manufacturing", branch: "draft/manufacturing-wave0", commit: "691e708", gate: "13/16", state: "built" },
  { face: "public-admin.org.ai", gap: true, row: "public-admin", branch: "draft/public-admin-wave0", commit: "e4100d1", gate: "15/16", state: "built" },
  // batch 3
  { face: "chemicals-materials.org.ai", gap: true, row: "chemicals-materials", branch: "draft/chemicals-materials-wave0", commit: "ebde750", gate: "13/16", state: "built" },
  { face: "apis.construction", row: "construction", branch: "draft/construction-wave0", commit: "9df52ba", gate: "15/16", state: "built" },
  { face: "apis.education", row: "education", branch: "draft/education-wave0", commit: "2c96364", gate: "15/16", state: "built" },
  { face: "apis.engineering", row: "engineering-architecture", branch: "draft/engineering-architecture-wave0", commit: "99e781c", gate: "15/16", state: "built" },
  { face: "api.insure", row: "insurance", branch: "draft/insurance-wave0", commit: "6278e39", repo: "dot-do/ins", gate: "14/16", state: "live", verdict: { grade: "B", ax: 8, attested: true } },
  { face: "mining-oil-gas.org.ai", gap: true, row: "mining-oil-gas", branch: "draft/mining-oil-gas-wave0", commit: "2b79f03", gate: "15/16", state: "built" },
  { face: "apis.mortgage", row: "mortgage", branch: "draft/mortgage-wave0", commit: "cbc7093", gate: "15/16", state: "built" },
  { face: "apis.taxi", row: "passenger-mobility", branch: "draft/passenger-mobility-wave0", commit: "84d3b0f", gate: "15/16", state: "built" },
  { face: "apis.estate", row: "real-estate", branch: "draft/real-estate-wave0", commit: "a2ad448", gate: "15/16", state: "built" },
  { face: "telecom.org.ai", gap: true, row: "telecom", branch: "draft/telecom-wave0", commit: "acd4cbe", gate: "15/16", state: "built" },
  { face: "trade-customs.org.ai", gap: true, row: "trade-customs", branch: "draft/trade-customs-wave0", commit: "aabcfd9", gate: "13/16", state: "built" },
  { face: "utilities-energy.org.ai", gap: true, row: "utilities-energy", branch: "draft/utilities-energy-wave0", commit: "9634897", gate: "13/16", state: "built" },
  { face: "waste-remediation.org.ai", gap: true, row: "waste-remediation", branch: "draft/waste-remediation-wave0", commit: "9f4668d", gate: "15/16", state: "built" },
  // batch 4
  { face: "arts-entertainment.org.ai", gap: true, row: "arts-entertainment", branch: "draft/arts-entertainment-wave0", commit: "5bf75d1", gate: "16/16", state: "built" },
  { face: "auto.dev", row: "automotive", branch: "draft/automotive-wave0", commit: "4986a99", gate: "15/16", state: "built", verdict: { grade: "F", ax: 0, attested: true } },
  { face: "api.cleaning", row: "facilities-services", branch: "draft/facilities-services-wave0", commit: "4addde2", gate: "16/16", state: "built" },
  { face: "api.equipment", row: "fn-facilities-assets", branch: "draft/fn-facilities-assets-wave0", commit: "fbdf8d9", gate: "16/16", state: "built" },
  { face: "fn-risk-compliance.org.ai", gap: true, row: "fn-risk-compliance", branch: "draft/fn-risk-compliance-wave0", commit: "bc18ac6", gate: "16/16", state: "built" },
  { face: "api.villas", row: "lodging", branch: "draft/lodging-wave0", commit: "1804aa3", gate: "16/16", state: "built" },
  { face: "apis.salon", row: "personal-care", branch: "draft/personal-care-wave0", commit: "59dfb10", gate: "16/16", state: "built" },
  { face: "api.repair", row: "repair-field-services", branch: "draft/repair-field-services-wave0", commit: "bf0d69c", gate: "16/16", state: "built" },
  { face: "apis.restaurant", row: "restaurants-food-service", branch: "draft/restaurants-food-service-wave0", commit: "7707a11", gate: "16/16", state: "built" },
  { face: "travel-tourism.org.ai", gap: true, row: "travel-tourism", branch: "draft/travel-tourism-wave0", commit: "3373889", gate: "16/16", state: "built" },
  // gate-lift build (2026-08-24)
  { face: "healthcare.org.ai", gap: true, row: "healthcare", branch: "draft/healthcare-wave0", commit: "226e9b8", gate: "16/16", state: "built" },
];

/** The §9.2 hosted-verdict lane, FIRST RUN (2026-08-23) — the only four
 *  attested api.qa reports in existence. Receipts: https://api.qa/{host}.
 *  api.ht is a multiplier-host apex, not a register row — included because
 *  the run was run; omitting an F would be curation. */
export const VERDICTS = [
  { host: "api.insure", grade: "B", ax: 8, note: "pinned 2.6.0 verify PASS 21/0/3 from public origin; worthiness bar ATTESTS" },
  { host: "api.qa", grade: "A+", ax: 10, note: "pinned verify FAIL — no probes manifest declared, /verify 404; closer staged on draft/fn-it-wave0" },
  { host: "api.ht", grade: "F", ax: 1, note: "conneg passes; llms.txt, agents.json, openapi.json all 404 at the apex" },
  { host: "auto.dev", grade: "F", ax: 0, note: "wave-zero face built but unadopted at the live rail; adoption is a recorded founder call" },
];

export const REGISTER_TOTAL = 53; // category-register rows
export const GATED_ROWS = ["freight-logistics"]; // operator gate H2 2027+, standing ruling
export const SOURCE = "https://github.com/StartupsStudio/studio/issues/9";
