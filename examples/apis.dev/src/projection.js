/**
 * projection.js — Stratum B: the G4 projection config for apis.dev over the
 * software-it-services substrate (template spec §2). Content, not code: one
 * projection = one config. Non-exclusivity is load-bearing — apis.ax and
 * apis.do project the same substrate under their own configs.
 */

export const projection = {
  substrate: 'software-it-services',

  brand: 'apis.dev',
  domains: ['apis.dev'],

  /** G2 coordinates (exposed on the machine face at /icp.json per stake #6). */
  icp: {
    industry: 'NAICS 5112 (software publishers) · 518 (data processing/hosting) · 5415 (computer systems design)',
    companyTypes: ['software publisher', 'hosting/data-processing provider', 'IT services & consulting firm'],
    jobTypes: ['developer', 'CTO / engineering lead', 'agency or consultancy operator'],
  },
  personas: [
    { id: 'developer', description: 'the recorded G2 ICP of apis.dev — builds and monetizes functions' },
    { id: 'buying-agent', description: 'an autonomous agent purchasing function calls mid-task' },
    { id: 'eng-lead', description: 'selects and verifies APIs for a product or client build' },
  ],

  /** The row's distinctive motion: agents themselves are first-class buyers
   *  of functions here ("functions agents buy" — the ratified brand pitch).
   *  B2A: no OAuth, no credit card on file; the #17 ladder is the only path. */
  motion: 'B2A',

  /** Offer = shape × price × gate, drawn only from the B2A permissible set
   *  (§5.1). Rungs 1–3 are 402-shaped stubs in wave zero — advertised as
   *  stubs on the OFFER body, never as live doors. */
  offer: [
    { shape: 'anon-sandbox', rung: 0, price: 0, gate: 'none — keyless' },
    {
      shape: 'earned-credits',
      rung: 1,
      price: 'earned',
      gate: '.ax-ledger proof-of-work',
      status: 'stub — ledger not wired in wave zero',
    },
    {
      shape: 'human-claimed',
      rung: 2,
      price: 0,
      gate: 'human claims the agent workspace',
      status: 'stub — claim door not wired in wave zero',
    },
    {
      shape: 'paid-metered',
      rung: 3,
      price: 0.0002,
      unit: 'USD/call',
      gate: '402 metering on machine identity (id.org.ai)',
      status: 'stub — test-mode; 402-shaped boundary served, no live settlement',
    },
  ],

  pricing: { pattern: '402-metered-per-call', rateCardRef: '/pricing' },

  /** §9.1 final box (Face registered in the rail ledger — faces-payable/week
   *  denominator): registered via LEDGER.md door A — row in
   *  packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio
   *  #9 alignment pass 2026-08-23); readout
   *  https://apis.ax/account/readouts/faces-payable (service built, deploy
   *  pending Batch-S). */
  account: 'https://apis.ax/account/faces?face=apis.dev',

  /** No "agent default" claim: the §4.6 worthiness bar (hosted verdict +
   *  live anon sandbox + verified published suite) has not been attested. */
  positioning:
    'functions agents buy — the build-and-monetize lifecycle face of the software & IT services substrate',

  mdx: null, // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)

  /** §6.2 experiment registration. */
  experiment: {
    pattern: '402-metered-per-call',
    motion: 'B2A',
    shapes: ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-metered'],
    rateCardRef: '/pricing',
    startDate: '2026-08-23',
    hypothesis:
      'a keyless registry floor with a 402-shaped paid rung converts returning agent identities to metered calls once settlement activates',
  },

  /** §5.1 B2A2B/C check: the ICP is technical (developers, eng leads,
   *  agencies); no non-technical principal in the coordinate — no
   *  counterpart-brand gap recorded for this projection. */
  counterpartBrand: null,
}
