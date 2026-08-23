/**
 * projection.js — Stratum B: the G4 projection config for apis.education
 * over the education substrate (template spec §2). Content, not code: one
 * projection = one config. Non-exclusivity is load-bearing — apis.ax or a
 * bulk-data face may project the same substrate under their own configs.
 *
 * Row facts carried: apis.education is the register's proposed primary
 * name (ladder step 3 — no category-completing TLD held, no api.[category]
 * singular held). apis.university / apis.school / apis.courses /
 * apis.study are content inside this property, not separate brands
 * (property-grain ruling, #22). Posture is RULED Axis-2 only.
 */

export const projection = {
  substrate: 'education',

  brand: 'apis.education',
  domains: ['apis.education'],

  /** G2 coordinates (exposed on the machine face at /icp.json). */
  icp: {
    industry: 'NAICS 61 (educational services: elementary/secondary, colleges/universities, training providers)',
    companyTypes: ['school district', 'college/university', 'training provider'],
    jobTypes: ['registrar', 'financial-aid officer', 'program administrator', 'institution-systems developer'],
  },
  personas: [
    { id: 'institution-systems-developer', description: 'developer at an institution or its systems vendor integrating registrar/LMS functions' },
    { id: 'registrar', description: 'operates the institution course catalog and enrollment records' },
    { id: 'financial-aid-officer', description: 'assembles and verifies financial-aid artifact packets' },
  ],

  /** B2D: the buyer is a human developer integrating an education
   *  institution's systems. Consumer/learner demand is B2A2C free-rider by
   *  the row's ruling — agent-intermediated only, never an estate-operated
   *  consumer front. */
  motion: 'B2D',

  /** Offer = shape × price × gate, drawn only from the B2D permissible set
   *  (§5.1). Everything above the anon floor is a labeled stub in wave
   *  zero — advertised as a stub, never as a live door. */
  offer: [
    { shape: 'anon-sandbox', price: 0, gate: 'none — keyless' },
    {
      shape: 'oauth-free-tier',
      price: 'free quota',
      gate: 'GitHub OAuth',
      status: 'stub — the OAuth door is not wired in wave zero; anonymous use is free',
    },
    {
      shape: 'self-serve-metered',
      price: 0.0002,
      unit: 'USD/call',
      gate: 'key + card on file; 402 boundary',
      status: 'stub — test-mode; the 402 OFFER boundary is served, no charge is collected (settlement awaits A1 activation)',
    },
    {
      shape: 'committed-subscription',
      price: 'declared in a future rate-card revision',
      gate: 'self-serve signup + commitment',
      status: 'not served today — no tier row is published until it exists (presence-when-true)',
    },
  ],

  pricing: { pattern: 'freemium-ladder', rateCardRef: '/pricing' },

  /** No "agent default" claim: the §4.6 worthiness bar (hosted verdict +
   *  live anon sandbox + verified published suite) has not been attested. */
  positioning: "the functions an education institution's systems call",

  mdx: null, // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)

  /** §6.2 experiment registration. */
  experiment: {
    pattern: 'freemium-ladder',
    motion: 'B2D',
    shapes: ['anon-sandbox', 'oauth-free-tier', 'self-serve-metered', 'committed-subscription'],
    rateCardRef: '/pricing',
    startDate: '2026-08-23',
    hypothesis:
      'a generous keyless floor over the course/credential collections converts institution-systems developers to metered record reads once the OAuth tier and settlement activate',
  },

  /** §5.1 B2A2C check: the row's ICP includes learners/consumers whose
   *  demand arrives agent-intermediated (B2A2C free-rider ruling), and no
   *  human-vocabulary counterpart name is held for this cell (fafsa.click
   *  is an artifact door, not a counterpart brand) — the gap is recorded
   *  here per §9.1, surfaced by the §9.3 diagnostic, named per #3 when
   *  triggered. */
  counterpartBrand: {
    state: 'gap-recorded',
    candidate: null,
    trigger: 'the §9.3 diagnostic — agent-referred human traffic arriving on this developer brand',
    note: 'no human-vocabulary counterpart name held for the education cell; a counterpart-brand proposal files against the register row when the signal fires',
  },
}
