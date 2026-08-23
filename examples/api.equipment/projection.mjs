/**
 * projection.mjs — Stratum B: the G4 projection config for api.equipment over
 * the fn-facilities-assets substrate (property template §2). One projection =
 * one config (content, not code). Non-exclusive by design: apis.ax and data
 * faces may project the same substrate with different offer/pricing configs.
 */

export const projection = {
  substrate: "fn-facilities-assets",

  brand: "api.equipment",
  domains: ["api.equipment"],

  /** Rail-ledger address of record (LEDGER.md door A — batch watch list). */
  railLedger: "https://ledger.apis.ax/faces?face=api.equipment",

  /** G2 coordinates (ICP + Persona) — from the register row (horizontal
   *  Function root: present in every company above a size floor), exposed on
   *  the machine face at /icp and linked from the card (links.icp). */
  icp: {
    companyTypes: [
      "every CompanyType above a size floor — Facilities & Assets is a horizontal Function root (the two-rooted tree's horizontal logic)",
    ],
    jobTypes: ["facility manager", "maintenance planner", "asset manager", "procurement manager"],
    coordinates: {
      function: "Facilities & Assets (one of the 13 APQC Functions)",
      departments: ["facilities", "maintenance", "procurement"],
    },
  },
  personas: [
    {
      id: "facilities-agent",
      kind: "machine",
      description:
        "an autonomous agent acting for a facilities/maintenance department — registering assets, opening and completing work orders, resolving equipment identity (B2A demand side; id.org.ai identity grain)",
    },
    {
      id: "maintenance-planner",
      kind: "human",
      description: "the maintenance planner whose EAM/CMMS system of record the headless doors serve",
    },
  ],

  /** The projection's primary motion (§5.1). B2A: the buyer is an autonomous
   *  agent — no OAuth, no credit card on file; onboarding is the #17
   *  proof-of-work ladder exclusively; identity via id.org.ai; settlement via
   *  402 metering (test-mode stubs at wave zero — see pricing.statement). */
  motion: "B2A",

  /** Offer = shape × price × gate, drawn only from the B2A permissible set. */
  offer: [
    { rung: 0, shape: "anon-sandbox", gate: "none — keyless", price: "free", status: "LIVE (this worker)" },
    { rung: 1, shape: "earned-credits", gate: ".ax-ledger credits earned via proof-of-work (#17)", price: "earned", status: "advertised in the 402 OFFER alternatives; ledger integration not yet live" },
    { rung: 2, shape: "human-claimed", gate: "a human claims the agent's workspace (attribution → tenure)", price: "free/earned, longer tenure", status: "advertised in the 402 OFFER alternatives; claim door not yet live" },
    { rung: 3, shape: "paid", gate: "402 metering against machine identity (id.org.ai)", price: "metered units per the rate card; per-outcome on orderPassport", status: "402 boundary served and typed; settlement NOT activated (stub, test mode)" },
  ],

  pricing: {
    pattern: "402-metered-per-call",
    rateCard: "/pricing",
  },

  /** No agent-default claim: the §4.6 worthiness bar is not passed (no hosted
   *  api.qa verdict yet, suite not continuously verified). Positioning is the
   *  register row's recorded thesis, claim-free. */
  positioning:
    "the rail an agent calls to get equipment — asset registry, maintenance work orders, and product-passport records for the Facilities & Assets function (procurement, rental, and maintenance act on the asset class)",

  /** Custom faces at wave zero (template §7.1, prove-then-extract); no shared
   *  MDX layer yet. */
  mdx: null,

  /** §6.2 experiment registration. */
  experiment: {
    pattern: "402-metered-per-call",
    motion: "B2A",
    shapes: ["anon-sandbox", "earned-credits", "human-claimed", "paid"],
    rateCardRef: "/pricing",
    startDate: "2026-08-23",
    hypothesis:
      "asset-registry reads convert anon sandbox agents to the paid rung on passport compilation (orderPassport) ahead of the 2027-02-18 EU battery DPP statutory clock, faster than on record reads",
  },

  /** §5.1 B2A2B / §9.3: the row's ICP includes facilities principals who do
   *  not know what an API is (facility managers, procurement managers), and
   *  the register row holds NO human-vocabulary counterpart name (api.furniture
   *  and apis.lighting are machine-grammar tails with no thesis on record).
   *  Recorded as a counterpart-brand gap per the checklist — the triggered
   *  response is a counterpart-brand proposal against the register row (named
   *  per #3), never API-vocabulary patches on this surface. */
  counterpartBrandGap: {
    recorded: true,
    note: "no human-vocabulary counterpart brand named for fn-facilities-assets; watch the §9.3 signal (agent-referred human traffic on this developer/agent surface)",
  },

  /** PRIMACY RECORD (batch watch list — no primacy ruling exists in the
   *  register): the FSM work-order grain is named on facilities-services,
   *  repair-field-services, AND this row; sibling wave-zero substrates
   *  (fn-service-delivery, waste-remediation, repair-field-services) define
   *  work-order-shaped records under their own row keys. This projection's
   *  MaintenanceWorkOrder and Asset are defined under THIS row key
   *  (fn-facilities-assets) only; the collisions are recorded and NOTHING
   *  shared is claimed — no shared abstraction, no cross-row type reference. */
  primacy: {
    ruling: "none on record",
    collisions: [
      { recordType: "work order (FSM grain)", rows: ["facilities-services", "repair-field-services", "fn-service-delivery (built: WorkOrder)", "waste-remediation (built)"] },
      { recordType: "asset registry record", rows: ["other Vindex-pattern asset-class rows (VC #32 generalization)"] },
    ],
    builtAs: ["MaintenanceWorkOrder under fn-facilities-assets", "Asset under fn-facilities-assets"],
    sharedClaims: "none",
  },
};
