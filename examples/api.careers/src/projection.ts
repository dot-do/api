/**
 * projection.ts — Stratum B: the G4 projection config for **api.careers**
 * over the `staffing-talent` substrate (spec §2 — content, not code).
 *
 * Non-exclusivity is load-bearing: the fn-hr-talent Function row shares this
 * substrate by design (one cell, two register addresses; the vertical row
 * leads). Other estate faces may project the same substrate with different
 * offer/pricing configs — that is the pricing-experiment mechanism.
 */

export type Motion = 'B2D' | 'B2A' | 'B2A2B' | 'B2A2C'

export interface OfferShape {
  shape: string
  gate: string
  price: string
  status: 'live' | 'stub'
  note?: string
}

export interface ProjectionConfig {
  substrate: string
  brand: string
  domains: string[]
  icp: { companyTypes: string[]; jobTypes: string[] }
  personas: string[]
  motion: Motion
  offer: OfferShape[]
  pricing: { pattern: string; rateCardRef: string }
  account: string
  positioning: string
  mdx: string | null
  experiment: {
    pattern: string
    motion: Motion
    shapes: string[]
    rateCardRef: string
    startDate: string
    hypothesis: string
    rollupKey: string
  }
  counterpartBrand: { gap: boolean; note: string }
}

export const apiCareersProjection: ProjectionConfig = {
  substrate: 'staffing-talent',
  brand: 'api.careers',
  domains: ['api.careers'],

  // G2 coordinates from the register row (both addresses of the one cell).
  icp: {
    companyTypes: [
      'staffing-agency (NAICS 5613)',
      'recruiting-agency',
      'hiring-employer (demand side)',
      'hr-department (fn-hr-talent Function coordinate)',
    ],
    jobTypes: ['recruiter', 'agency-owner', 'hiring-manager', 'hr-ops-lead'],
  },
  personas: ['recruiter', 'agency owner', 'hiring manager', 'HR ops lead'],

  // B2A: careers is the OBJECT the agent calls to get a placement. The buyer
  // is an autonomous agent — no OAuth, no credit card on file; onboarding is
  // the proof-of-work ladder, settlement (when live) is 402 metering against
  // machine identity (id.org.ai). The anon sandbox is the universal floor.
  motion: 'B2A',

  offer: [
    { shape: 'anon-sandbox', gate: 'none — keyless', price: 'free', status: 'live', note: 'universal floor; labeled synthetic seed; auto-minted ephemeral workspace with disclosed retention' },
    { shape: 'earned-credits', gate: '.ax-ledger credits earned via proof-of-work', price: 'earned', status: 'stub', note: 'advertised in the 402 OFFER alternatives; the credit ledger is not wired in this deployment' },
    { shape: 'human-claimed', gate: 'a human claims the agent workspace (attribution → tenure)', price: 'free/earned', status: 'stub', note: 'advertised in the 402 OFFER alternatives; the claim door is not wired in this deployment' },
    { shape: 'paid-402', gate: 'id.org.ai machine identity + 402 metering', price: 'metered', status: 'stub', note: '402 boundary is served and typed; settlement is NOT active — test mode, no billing occurs (pricing.binding: false states this on the wire)' },
  ],

  pricing: {
    pattern: '402-metered-per-call',
    rateCardRef: './manifest.ts — pricing.rates, top-level in the Pricing Document per axp-ext/rates-g2 §2 (operationId-keyed; every row freeQuota or zero price)',
  },

  // §9.1 final box (Face registered in the rail ledger — faces-payable/week
  // denominator): registered via LEDGER.md door A — row in
  // packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio #9
  // alignment pass 2026-08-23); readout
  // https://apis.ax/account/readouts/faces-payable (service built, deploy
  // pending Batch-S).
  account: 'https://apis.ax/account/faces?face=api.careers',

  // Claim-free until the §4.6 worthiness bar attests (conformance + live anon
  // sandbox + verified published suite). "Agent default" is earned, never asserted.
  positioning:
    'the careers object an agent calls to get a placement — Candidate and Placement records typed by O*NET-SOC, the G1 standard itself',

  mdx: null, // custom HTML landing in manifest.home for wave zero; per-brand MDX layer deferred to the shared renderer (§7.3 MAY-defer)

  experiment: {
    pattern: '402-metered-per-call',
    motion: 'B2A',
    shapes: ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-402'],
    rateCardRef: 'manifest pricing.rates (top-level, axp-ext/rates-g2 §2)',
    startDate: '2026-08-23',
    hypothesis:
      'O*NET-typed placement reads convert anonymous agent traffic up the B2A ladder (sandbox → earned credits) at a higher rate than record reads without G1 typing',
    rollupKey: 'staffing-talent',
  },

  // §5.1 B2A2B check: the ICP includes agency owners and hiring managers —
  // non-technical principals. No human-vocabulary counterpart brand is named
  // for this cell; gigs.*/.work names are supply doors, out of api-grammar
  // naming scope. Recorded as a gap; the §9.3 diagnostic (agent-referred
  // human traffic on this developer/agent brand) is armed via the signup and
  // traffic seams the worker emits.
  counterpartBrand: {
    gap: true,
    note: 'counterpart-brand gap recorded: non-technical principals in ICP, no human-vocabulary name held for this cell (gigs.*/.work are supply doors, out of scope); proposal route is the register acquisition list, triggered by the §9.3 signal',
  },
}
