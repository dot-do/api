/**
 * projection.js — Stratum B: the G4 projection config for apis.estate over
 * the real-estate substrate (template spec §2). Content, not code: one
 * projection = one config. Non-exclusivity is load-bearing — apis.ax and a
 * future closings.services face may project the same substrate under their
 * own configs.
 *
 * Property grain (register ruling): apis.apartments, apis.house,
 * apis.rentals, apis.lease and apis.land are sub-audience rails WITHIN this
 * property — content, not separate brands. They serve nothing today, so they
 * are linked nowhere (presence-when-true); this config records them.
 */

export const projection = {
  substrate: 'real-estate',

  brand: 'apis.estate',
  domains: ['apis.estate'],
  subAudienceRails: ['apis.apartments', 'apis.house', 'apis.rentals', 'apis.lease', 'apis.land'], // serve nothing today

  /** G2 coordinates (exposed on the machine face at /icp.json). */
  icp: {
    industry: 'NAICS 53 (531 real estate; title/escrow adjacency)',
    companyTypes: ['title agency', 'escrow/closing company', 'brokerage', 'property manager', 'landlord'],
    jobTypes: ['transaction coordinator', 'closer', 'PM ops'],
  },
  personas: [
    { id: 'closing-agent-caller', description: 'an autonomous agent assembling closing packets B2A (the row persona)' },
    { id: 'transaction-coordinator', description: 'coordinates a closing end to end — the closings.services human face' },
    { id: 'pm-ops', description: 'property-management operations; the rental-artifact record consumer' },
  ],

  /** The row's agent-side motion: agent callers assembling closing packets.
   *  B2A: no OAuth, no credit card on file; the #17 ladder is the only path. */
  motion: 'B2A',

  /** Offer = shape × price × gate, drawn only from the B2A permissible set
   *  (§5.1). MOUNTED-RUNGS-ONLY (batch watch list): only rung 0 is mounted
   *  today, so only rung 0 is advertised on any OFFER body; rungs 1–3 are
   *  RECORDED here — never advertised as doors until they mount. */
  offer: [
    { shape: 'anon-sandbox', rung: 0, price: 0, gate: 'none — keyless', mounted: true },
    {
      shape: 'earned-credits',
      rung: 1,
      price: 'earned',
      gate: '.ax-ledger proof-of-work',
      mounted: false,
      status: 'unmounted — recorded only; not advertised (mounted-rungs-only ruling)',
    },
    {
      shape: 'human-claimed',
      rung: 2,
      price: 0,
      gate: 'human claims the agent transaction file',
      mounted: false,
      status: 'unmounted — recorded only; not advertised (mounted-rungs-only ruling)',
    },
    {
      shape: 'paid-metered',
      rung: 3,
      price: 0.0002,
      unit: 'USD/call',
      gate: '402 metering on machine identity (id.org.ai)',
      mounted: false,
      status: 'unmounted stub — test-mode; the 402-shaped boundary is served and labeled, no live settlement',
    },
  ],

  pricing: { pattern: '402-metered-per-call', rateCardRef: '/pricing' },

  /** No "agent default" claim: the §4.6 worthiness bar (hosted verdict +
   *  live anon sandbox + verified published suite) has not been attested. */
  positioning:
    'the closing-document layer of the real-estate substrate as typed records — closing packets, lien waivers, payoff letters, deeds; the money/escrow layer is permanently out of scope',

  mdx: null, // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)

  /** §6.2 experiment registration. */
  experiment: {
    pattern: '402-metered-per-call',
    motion: 'B2A',
    shapes: ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-metered'],
    rateCardRef: '/pricing',
    startDate: '2026-08-23',
    hypothesis:
      'a keyless typed-record floor over the closing packet converts returning agent identities to metered document calls once settlement activates',
  },

  /** §5.1 B2A2B check: the ICP includes non-technical principals
   *  (transaction coordinators, closers, PM ops, landlords) — the
   *  human-vocabulary counterpart brand is NAMED BY THE REGISTER ROW:
   *  closings.services (owned, STAGED — not serving, INV §1.4), the named
   *  front of the closing-packet layer, zero API/agent vocabulary on its
   *  surfaces per the Marlow jargon-ban law. Not a counterpart-brand gap;
   *  a staged counterpart on record. */
  counterpartBrand: {
    name: 'closings.services',
    status: 'staged, not serving (register INV §1.4) — recorded, not linked (presence-when-true)',
    vocabularyLaw: 'zero API/agent vocabulary on its surfaces (Marlow jargon ban)',
  },
}
