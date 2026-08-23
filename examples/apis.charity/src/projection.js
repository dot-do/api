/**
 * projection.js — Stratum B: the G4 projection config for apis.charity over
 * the nonprofits-civic substrate (template spec §2). Content, not code: one
 * projection = one config. Non-exclusivity is load-bearing.
 *
 * NAME FLAG (register, verbatim): apis.charity carries a WEAK-CONFIDENCE
 * curation flag — 'charity' does not cover all of NAICS 813 (civic leagues,
 * HOAs, religious orgs), and no thesis exists on any of the row's three held
 * names; the curated register may prefer a GAP verdict + a better name over
 * stretching a grammar-completion tail. This build is held-name-carrying but
 * RENAMEABLE BY CONSTRUCTION: the brand string lives in ONE place
 * (BRAND/ORIGIN below, imported everywhere), and the G3 substrate
 * (./product.js) has no dependence on it.
 */

import { SUBSTRATE } from './product.js'

export const BRAND = 'apis.charity'
export const ORIGIN = `https://${BRAND}`

export const projection = {
  substrate: SUBSTRATE,

  brand: BRAND,
  domains: [BRAND],

  /** §9.1 final box (face registered in the rail ledger): registered via
   *  LEDGER.md door A — row in packages/rail-ledger/registry/faces.json @
   *  draft/rail-ledger-v1 (studio #9 alignment pass 2026-08-23); readout
   *  https://ledger.apis.ax/readouts/faces-payable (service built, deploy
   *  pending Batch-S). */
  railLedger: `https://ledger.apis.ax/faces?face=${BRAND}`,

  /** G2 coordinates (exposed on the machine face at /icp.json and as the
   *  card's top-level g2 member — ruled placement). */
  icp: {
    industry: 'NAICS 813 — religious (8131), grantmaking/giving (8132), civic/social organizations (8134)',
    companyTypes: ['nonprofit', 'church', 'civic or social organization', 'grantmaking foundation'],
    jobTypes: ['executive director', 'development director', 'treasurer (volunteer)'],
  },
  personas: [
    {
      id: 'admin-agent',
      description:
        'an autonomous agent running a volunteer-heavy back office — donor records, receipts, grant reports (the register row: a structural fit for agent-run administration)',
    },
    { id: 'systems-developer', description: 'a developer integrating nonprofit CRM / grant tooling' },
    { id: 'grants-analyst', description: 'reads org-level and grant-cycle records across the sector' },
  ],

  /** B2A: the row rules a free-with-proof-of-work posture natively
   *  appropriate (mirroring the access-to-justice set) and its back offices
   *  are volunteer-thin — the first-class buyer is the agent doing the org's
   *  administration. No OAuth, no credit card on file; onboarding is the
   *  #17 ladder exclusively. */
  motion: 'B2A',

  /** Offer = shape × price × gate, from the B2A permissible set (§5.1).
   *  Batch-2 ruling: only MOUNTED rungs are advertised on the wire. The
   *  ladder's work (rung 1) and claim (rung 2) doors are not mounted on this
   *  origin and are therefore recorded here for the experiment config but
   *  never advertised as alternatives; the paid rung is served only as a
   *  402-shaped, labeled test-mode stub. */
  offer: [
    { shape: 'anon-sandbox', rung: 0, price: 0, gate: 'none — keyless', mounted: true },
    {
      shape: 'earned-credits',
      rung: 1,
      price: 'earned',
      gate: '.ax-ledger proof-of-work (#17)',
      mounted: false,
      status: 'not mounted in wave zero — not advertised on the wire (batch-2 ruling)',
    },
    {
      shape: 'human-claimed',
      rung: 2,
      price: 0,
      gate: 'human claims the agent workspace',
      mounted: false,
      status: 'not mounted in wave zero — not advertised on the wire (batch-2 ruling)',
    },
    {
      shape: 'paid-metered',
      rung: 3,
      price: 0.0002,
      unit: 'USD/call',
      gate: '402 metering on machine identity (id.org.ai)',
      mounted: true,
      status: 'stub — test-mode; the 402-shaped boundary is served and labeled, no live settlement, no charge collected',
    },
  ],

  pricing: { pattern: '402-metered-per-call', rateCardRef: '/pricing' },

  /** No "agent default" claim anywhere: the §4.6 worthiness bar (hosted
   *  verdict + live anon sandbox + verified published suite) is not attested. */
  positioning:
    'the systems a nonprofit back office runs on — donor, donation, and grant records with a keyless sandbox, over the nonprofits-civic substrate',

  mdx: null, // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)

  /** §6.2 experiment registration. */
  experiment: {
    pattern: '402-metered-per-call',
    motion: 'B2A',
    shapes: ['anon-sandbox', 'paid-metered'],
    rateCardRef: '/pricing',
    startDate: '2026-08-23',
    hypothesis:
      'a generous keyless floor (the row rules free-with-proof-of-work natively appropriate) converts returning agent identities doing back-office administration to metered writes once settlement and the earned-credits rung activate',
  },

  /** §5.1 B2A2B / §9.3 — COUNTERPART-BRAND GAP, recorded: the ICP is
   *  non-technical principals (executive directors, development directors,
   *  volunteer treasurers) who do not know what an API is; NO
   *  human-vocabulary counterpart name is held for 813 (the row holds only
   *  apis.charity/church/community — all machine-face grammar). Agent-referred
   *  human traffic on this developer-vocabulary brand is the §9.3 signal;
   *  the response is a counterpart-brand proposal filed against the register
   *  row (named per #3), never API-vocabulary patches here. */
  counterpartBrand: {
    gap: true,
    reason:
      'ICP includes non-technical principals (executive director, development director, volunteer treasurer); no human-vocabulary name held for NAICS 813',
    diagnostic: 'signup/traffic seams carry identityClass × referral source (§9.3); threshold/cadence are harness parameters',
  },
}
