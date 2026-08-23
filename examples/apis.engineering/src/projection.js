/**
 * projection.js — Stratum B: the G4 projection config for apis.engineering
 * over the engineering-architecture substrate (template spec §2). Content,
 * not code: one projection = one config. Non-exclusivity is load-bearing —
 * apis.ax and any later sibling face project the same substrate under their
 * own configs.
 *
 * Name notes (register, 2026-08-23): apis.engineering is the ruled primary
 * (category-scope subject; matches the NAICS 5413 category name);
 * apis.engineer stays the occupation-subject variant, not served here.
 * The singular twin api.engineering is an ADR-0020 data home in ~/projects/ax
 * — a different face on the same-x pair; no projection-primacy ruling exists,
 * so this build claims only its own row-key face (collision recorded in
 * product.js and README).
 */

export const projection = {
  substrate: 'engineering-architecture',

  brand: 'apis.engineering',
  domains: ['apis.engineering'],

  /** G2 coordinates (exposed on the machine face at /icp.json per stake #6). */
  icp: {
    industry: 'NAICS 5413 (541310 architecture · 541330 engineering)',
    companyTypes: ['engineering firm', 'architecture firm', 'multidisciplinary A/E practice'],
    jobTypes: ['PE (professional engineer)', 'architect', 'drafter', 'BIM manager'],
  },
  personas: [
    { id: 'submittal-agent', description: 'an autonomous agent assembling a submittal-ready package from drawing and spec records mid-task' },
    { id: 'bim-manager', description: 'runs the firm’s drawing/spec systems; integrates records across projects' },
    { id: 'firm-systems-developer', description: 'a developer at an A/E-systems vendor consuming typed records' },
  ],

  /** The row's recorded demand: agents needing submittal-ready or stamped
   *  artifacts. The stamped half is licensure-gated (PE reserved acts —
   *  mirrors the legal reserved-acts structure) and is NOT served; the
   *  record/assembly half is agent-first. B2A: no OAuth, no credit card on
   *  file; the #17 ladder is the only path. */
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
      gate: 'human claims the agent project workspace',
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
    'drawing, spec, and submittal records for the engineering & architecture substrate — keyless typed records and an auto-minted project door for submittal assembly; stamped artifacts stay with licensed professionals',

  mdx: null, // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)

  /** §6.2 experiment registration. */
  experiment: {
    pattern: '402-metered-per-call',
    motion: 'B2A',
    shapes: ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-metered'],
    rateCardRef: '/pricing',
    startDate: '2026-08-23',
    hypothesis:
      'a keyless drawing/spec/submittal record floor with a 402-shaped paid rung converts returning agent identities to metered calls once settlement activates',
  },

  /** §5.1 B2A2B check — COUNTERPART-BRAND GAP RECORDED: the cell's ICP
   *  includes firm principals (PEs, architects) who are licensed
   *  professionals, not API buyers; agents assembling submittals on a
   *  firm's behalf would surface as agent-referred human traffic here
   *  (the §9.3 diagnostic). No human-vocabulary name is held for this
   *  cell (register: no category-completing TLD, no api. singular held).
   *  Gap recorded per §9.1; counterpart naming routes to the register
   *  per #3, never to API-vocabulary patches on this surface. */
  counterpartBrand: {
    gap: true,
    note: 'no human-vocabulary counterpart name held for engineering-architecture; ICP includes non-API-buying licensed principals — §9.3 diagnostic armed at the traffic seams',
  },
}
