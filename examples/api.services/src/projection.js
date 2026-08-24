/**
 * projection.js — Stratum B: the G4 projection config for api.services over
 * the fn-service-delivery substrate (property template §2). One projection =
 * one config (content, not code). Non-exclusive by design: apis.ax and data
 * faces may project the same substrate with different offer/pricing configs.
 */

export const projection = {
  substrate: "fn-service-delivery",

  brand: "api.services",
  domains: ["api.services"],

  /** Rail-ledger address of record (LEDGER.md door A). */
  account: "https://apis.ax/account/faces?face=api.services",

  /** G2 coordinates (ICP + Persona) — from the register row, exposed on the
   *  machine face at /icp and linked from the card (links.icp). */
  icp: {
    companyTypes: [
      "professional-services firms (providers)",
      "business-services firms (providers)",
      "any CompanyType whose agents buy completed, verified outcomes (demand side)",
    ],
    jobTypes: ["service-delivery lead", "operations manager", "field-service dispatcher", "engagement manager"],
    coordinates: {
      function: "Service Delivery (one of the 13 APQC Functions)",
      span: "horizontal — Function: Service Delivery × every vertical's service occupations",
    },
  },
  personas: [
    { id: "agent-buyer", kind: "machine", description: "an autonomous agent buying a completed, verified outcome (B2A demand side; id.org.ai identity grain)" },
    { id: "provider-operator", kind: "human", description: "a service firm's delivery lead whose systems the PSA/FSM doors serve" },
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
    { rung: 3, shape: "paid", gate: "402 metering against machine identity (id.org.ai)", price: "metered units per the rate card", status: "402 boundary served and typed; settlement NOT activated (stub, test mode)" },
  ],

  pricing: {
    pattern: "402-metered-per-call",
    rateCard: "/pricing",
  },

  /** No agent-default claim: the §4.6 worthiness bar is not passed (no hosted
   *  api.qa verdict yet, suite not continuously verified). Positioning is the
   *  row's recorded brand thesis, claim-free. */
  positioning:
    "the generic demand rail of the api.* singular family — the front door where the as-a-Service spectrum resolves for machine callers",

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
      "a generic service-delivery demand rail converts anon sandbox agents to the paid rung on outcome orders (orderOutcome) faster than on record reads",
  },

  /** §5.1 B2A2B / §9.3: the row's ICP includes business principals who do not
   *  know what an API is; no human-vocabulary counterpart brand is named on
   *  the register for this cell. Recorded as a gap, per the checklist —
   *  triggered response is a counterpart-brand proposal against the register
   *  row, never API-vocabulary patches here. */
  counterpartBrandGap: {
    recorded: true,
    note: "no human-vocabulary counterpart brand named for fn-service-delivery; watch the §9.3 signal (agent-referred human traffic on this developer/agent surface)",
  },
};
