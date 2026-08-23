/**
 * projection.js — Stratum B: the G4 projection config for api.management
 * over the fn-business-ops substrate (property-template spec §2).
 *
 * G4 = G2(ICP + Persona) + G3(Product/Service) + Brand + Domain(s) + Offer +
 *      Price(s) + Positioning + Differentiation.
 *
 * Config is content, not code: this object IS the projection. Non-exclusivity
 * is load-bearing — other projections (apis.ax register entry, data.mt bulk
 * face) may serve the same substrate with different offer/pricing configs.
 *
 * DOMAIN CONTROL NOTE (from the register row, verbatim in substance):
 * api.management is estate-CONTROLLED but irregular — CF zone in the
 * Semantics.dev account, Vercel-verified on team longtailstudio, registrar
 * paper [UNVERIFIED] (RDAP says Sav.com; absent from the stale Sav export).
 * The G3 build is not blocked on it, but the domain is NOT wired here
 * (wrangler.jsonc carries no routes) until registrar control is confirmed.
 * apis.management is NOT held (third-party Gandi, exp 2026-10-30) — demoted
 * to opportunistic acquisition per the #3 ruling.
 */

export const PROJECTION = {
  substrate: "fn-business-ops",
  brand: "api.management",
  domains: {
    primary: "api.management",
    heldAlternates: ["sdk.management"],
    notHeld: [{ name: "apis.management", holder: "third-party (Gandi SAS)", expiry: "2026-10-30", ruling: "opportunistic acquisition per #3" }],
    wired: false, // registrar paper [UNVERIFIED] — confirm control before wiring
  },

  // G2 coordinates (exposed on the card via links.icp → /icp.json)
  icp: {
    companyTypes: ["API-estate operators", "agent-fleet operators", "portfolio back-offices"],
    jobTypes: ["operations lead", "platform operator", "portfolio operator"],
    internalFirstCustomer: "the estate itself — every minted startup needs the operate face",
  },
  personas: [
    { id: "operator", class: "human", role: "ops lead operating a portfolio of deployed properties" },
    { id: "managing-agent", class: "agent", role: "the autonomous agent that operates an estate on an operator's behalf", identity: "id.org.ai" },
  ],

  // Motion selects onboarding path + permissible shapes (§5.1)
  motion: "B2A", // the buyer is the managing agent: no OAuth, no card on file — the #17 ladder exclusively

  // Offer = shape × price × gate, drawn only from the B2A set
  offer: [
    { shape: "anon-sandbox", rung: 0, gate: "none — keyless", price: "free", status: "live (read-only at wave zero; auto-mint workspaces deferred)" },
    { shape: "earned-credits", rung: 1, gate: ".ax-ledger credits earned via proof-of-work (#17)", price: "earned", status: "stub — door not mounted" },
    { shape: "human-claimed", rung: 2, gate: "a human claims the agent's workspace", price: "free/earned, longer tenure", status: "stub — door not mounted" },
    { shape: "paid", rung: 3, gate: "402 metering against id.org.ai machine identity", price: "metered", status: "stub — 402 boundary live in test mode; settlement not activated (A1's charter)" },
  ],

  pricing: {
    pattern: "402-metered-per-call",
    rateCard: "/pricing",
    binding: false, // stated intent, declared in the Pricing Document itself
    perOperationRates:
      "served — rates[] rides TOP-LEVEL in the Pricing Document at /pricing (axp-ext-rates-g2@0.1.0 §2, native in the vendored axp-faces 0.2.0), one row per metered operation keyed by canonical operationId; declared in manifest.js pricing.rates, generated, never hand-rolled",
  },

  /** §9.1 final box (Face registered in the rail ledger — faces-payable/week
   *  denominator): registered via LEDGER.md door A — row in
   *  packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio
   *  #9 alignment pass 2026-08-23); readout
   *  https://ledger.apis.ax/readouts/faces-payable (service built, deploy
   *  pending Batch-S). */
  railLedger: "https://ledger.apis.ax/faces?face=api.management",

  positioning:
    "The manage/operate face of an API estate — the lifecycle counterpart of the build face. Agent-default claim WITHHELD until the §4.6 worthiness bar passes (conformance verdict + live anon sandbox + verified published suite).",

  differentiation: "one substrate serves both plies: the records an operator reads and the system doors an agent operates are the same collections",

  mdx: null, // custom landing at wave zero (prove-then-extract, §7.1); CNAME → workers.do is the extraction target

  experiment: {
    pattern: "402-metered",
    motion: "B2A",
    shapes: ["anon-sandbox", "earned-credits", "human-claimed", "paid"],
    rateCardRef: "/pricing",
    startDate: "2026-08-23",
    hypothesis:
      "managing agents adopt the operate rail from the anon sandbox without human onboarding; 402 metering converts rung 0 to rung 3 without OAuth or card gates",
  },

  counterpartBrand: {
    required: false,
    note: "B2A primary; the wave-zero ICP has no non-technical principal. The §9.3 diagnostic (agent-referred human traffic) is armed at the seams; a signal files a counterpart-brand proposal against the register row, never API-vocabulary patches here.",
  },

  guardrail: {
    agentDefaultClaimed: false,
    note: "no agent-default claim carried, so the §5.3 same-shape price guardrail is trivially satisfied at wave zero; re-check on every experiment assignment change",
  },
};
