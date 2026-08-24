/**
 * projection.js — Stratum B: the G4 projection config for apis.mortgage over
 * the `mortgage` substrate (template spec §2). Content, not code: one
 * projection = one config. Non-exclusivity is load-bearing — apis.ax and
 * data-face siblings may project the same substrate under their own configs.
 *
 * Posture (2026-08-23 founder ruling, #9): the pre-cutover 'entity-gated,
 * no pricing/MCP while in formation' posture is STRUCK. apis.mortgage is
 * the headless system of record; the licensed operator (broker, lender,
 * servicer) is the customer and brings the license. This projection is the
 * machine face of the data/document/pipeline door; the attested ROADMAP
 * rows (payoff/lien, eNote/eVault, doc intelligence) wait on their named
 * events and post to the carried-over waitlist first.
 */

export const projection = {
  substrate: 'mortgage',

  brand: 'apis.mortgage',
  domains: ['apis.mortgage'],

  /** G2 coordinates (exposed on the machine face at /icp.json). */
  icp: {
    industry: 'NAICS 522292 (real estate credit / mortgage banking)',
    companyTypes: ['independent mortgage bank', 'mortgage broker', 'servicer', 'correspondent lender'],
    jobTypes: ['lender ops / secondary marketing', 'loan processor', 'closer', 'developer at a lender-systems vendor'],
  },
  personas: [
    { id: 'record-agent', description: 'an autonomous agent pulling MISMO-typed loan-file records and HMDA market records mid-task' },
    { id: 'secondary-marketing', description: 'lender ops / secondary-marketing analyst reading market records by state, year, and purpose' },
    { id: 'lender-systems-developer', description: 'integrates loan-file records into lender or vendor systems' },
  ],

  /** The row's named agent motion: "agents pulling loan-file and market
   *  records (B2A)". B2A: no OAuth, no credit card on file; the #17 ladder
   *  is the only path. Machine identity via id.org.ai; settlement via 402. */
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
      gate: 'human claims the agent pipeline',
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

  /** No "agent default" claim: the §4.6 worthiness bar (hosted verdict +
   *  live anon sandbox + verified published suite) has not been attested. */
  positioning:
    'the loan file and the mortgage market record as typed keyless doors — MISMO-typed documents and HMDA-derived market data over the mortgage substrate',

  mdx: null, // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)

  /** §6.2 experiment registration. */
  experiment: {
    pattern: '402-metered-per-call',
    motion: 'B2A',
    shapes: ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-metered'],
    rateCardRef: '/pricing',
    startDate: '2026-08-23',
    hypothesis:
      'a keyless MISMO/HMDA record floor with a 402-shaped paid rung converts returning agent identities to metered calls once settlement activates',
    /** §9.1 box 16 — door-A registration (own act): one row in
     *  packages/rail-ledger/registry/faces.json on ax draft/rail-ledger-v1
     *  @ ef4d688 ({apis.mortgage, mortgage, B2A, 402-metered-per-call,
     *  test-mode}); readout at the live ledger. */
    account: 'https://apis.ax/account/faces?face=apis.mortgage',
  },

  /** §5.1 B2A2B check: the row's ICP includes non-technical principals
   *  (processors, closers, lender ops). The register already HOLDS
   *  human-vocabulary counterpart names for exactly those occupations —
   *  recorded here as candidates, never asserted; activation is triggered by
   *  the §9.3 agent-referred-human-traffic signal, named per #3. */
  counterpartBrand: {
    candidates: ['closers.mortgage', 'processors.mortgage'],
    status:
      'candidates recorded — held occupational doors, nothing serving today; triggered by the §9.3 diagnostic, not pre-launched',
  },

  /** Shared-face collision record (no projection-primacy ruling found):
   *  ~/projects/ax/packages/api.mortgage is an ADR-0020 directory data home
   *  on the singular twin. This projection claims only apis.mortgage. */
  collisions: [
    {
      name: 'api.mortgage',
      where: '~/projects/ax/packages/api.mortgage',
      nature: 'ADR-0020 directory data home on the singular twin; api.mortgage (singular) is not held per the register',
      resolution: 'built under row key `mortgage` as apis.mortgage; the shared face is not claimed',
    },
  ],
}
