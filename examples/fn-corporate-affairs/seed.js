/**
 * seed.js — the §5.2 sandbox seed corpus for the fn-corporate-affairs
 * substrate, mechanically produced against the substrate's record schemas.
 *
 * SYNTHETIC DATA, ALWAYS LABELED: every record carries `example: true`, a
 * "[demo]" title prefix, and belongs to a fictional company. No real company,
 * person, agency, or outlet names appear (fixture law); no financial or
 * registry identifiers are used. The seed is versioned with the manifest —
 * reseeding is a build step.
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation —
 * stakeholders across all four types and both statuses so the branching
 * collection genuinely branches, engagements linked to real seed
 * stakeholders, mentions with substance, and federated-view disclosure
 * stand-ins whose provenance labeling is explicit (the read-layer federation
 * is unwired at wave zero; these records say so on their face).
 */

const RETENTION = 'ephemeral — per-isolate memory only; no durability at wave zero'

/** The one fictional tenant (live-demo ruling: real handlers, simulated data). */
export const demoTenant = {
  id: 'org-demo-1',
  name: '[demo] Larchbeck Amaranth Group (fictional)',
  example: true,
  retention: RETENTION,
}

export const stakeholders = [
  {
    id: 'st-demo-1',
    $type: 'https://schema.org.ai/Stakeholder',
    example: true,
    title: '[demo] Quillstone Harbor Capital (fictional institutional investor)',
    type: 'investor',
    status: 'active',
    relationshipOwner: '[demo] Investor-Relations Officer (fictional role, no person named)',
    interests: ['quarterly disclosure cadence', 'capital-allocation policy'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'st-demo-2',
    $type: 'https://schema.org.ai/Stakeholder',
    example: true,
    title: '[demo] Bramblewick Pension Partners (fictional institutional investor)',
    type: 'investor',
    status: 'dormant',
    relationshipOwner: '[demo] Investor-Relations Officer (fictional role, no person named)',
    interests: ['governance policy'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'st-demo-3',
    $type: 'https://schema.org.ai/Stakeholder',
    example: true,
    title: '[demo] Commission for Fictional Market Oversight (invented regulator — no real agency)',
    type: 'regulator',
    status: 'active',
    relationshipOwner: '[demo] Government-Relations Lead (fictional role, no person named)',
    interests: ['periodic reporting rules', 'market-conduct consultations'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'st-demo-4',
    $type: 'https://schema.org.ai/Stakeholder',
    example: true,
    title: '[demo] Beacon Ledger Journal — trade-press desk (fictional outlet)',
    type: 'media',
    status: 'active',
    relationshipOwner: '[demo] Communications Director (fictional role, no person named)',
    interests: ['sector coverage', 'results-day briefings'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'st-demo-5',
    $type: 'https://schema.org.ai/Stakeholder',
    example: true,
    title: '[demo] Vellum Wire Syndicate — markets desk (fictional outlet)',
    type: 'media',
    status: 'dormant',
    relationshipOwner: '[demo] Communications Director (fictional role, no person named)',
    interests: ['executive commentary'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'st-demo-6',
    $type: 'https://schema.org.ai/Stakeholder',
    example: true,
    title: '[demo] Harborview Civic Alliance (fictional community organization)',
    type: 'community',
    status: 'active',
    relationshipOwner: '[demo] Community-Affairs Manager (fictional role, no person named)',
    interests: ['site-expansion consultation', 'local hiring commitments'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]

export const engagements = [
  {
    id: 'en-demo-1',
    $type: 'https://schema.org.ai/Engagement',
    example: true,
    title: '[demo] Q2 results briefing — investor call (synthetic)',
    stakeholderId: 'st-demo-1',
    kind: 'briefing',
    date: '2026-07-30',
    status: 'completed',
    summary: 'Synthetic engagement record: quarterly results walkthrough with the fictional Quillstone Harbor Capital; two follow-ups logged.',
    followUps: ['send capital-allocation appendix', 'schedule governance-policy session'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'en-demo-2',
    $type: 'https://schema.org.ai/Engagement',
    example: true,
    title: '[demo] Consultation response — market-conduct rulemaking (synthetic)',
    stakeholderId: 'st-demo-3',
    kind: 'consultation-response',
    date: '2026-08-11',
    status: 'submitted',
    summary: 'Synthetic engagement record: written response filed to the invented regulator’s consultation; every fact in this record is fabricated example content.',
    followUps: ['monitor final-rule publication window'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'en-demo-3',
    $type: 'https://schema.org.ai/Engagement',
    example: true,
    title: '[demo] Press inquiry — expansion coverage (synthetic)',
    stakeholderId: 'st-demo-4',
    kind: 'press-inquiry',
    date: '2026-08-18',
    status: 'open',
    summary: 'Synthetic engagement record: inbound inquiry from the fictional Beacon Ledger Journal on the (equally fictional) site expansion; statement in drafting.',
    followUps: ['clear statement with counsel', 'offer background briefing'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]

export const mentions = [
  {
    id: 'mn-demo-1',
    $type: 'https://schema.org.ai/Mention',
    example: true,
    title: '[demo] "Larchbeck Amaranth expands harborside operations" — Beacon Ledger Journal (fictional)',
    outlet: '[demo] Beacon Ledger Journal (fictional outlet)',
    date: '2026-08-19',
    tone: 'neutral',
    summary: 'Synthetic press-mention record generated to exercise the Mention shape; the article, the outlet, and the company are all invented.',
    stakeholderId: 'st-demo-4',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'mn-demo-2',
    $type: 'https://schema.org.ai/Mention',
    example: true,
    title: '[demo] "Pension partners press governance questions" — Vellum Wire Syndicate (fictional)',
    outlet: '[demo] Vellum Wire Syndicate (fictional outlet)',
    date: '2026-08-05',
    tone: 'critical',
    summary: 'Synthetic press-mention record; every quote and figure is fabricated example content.',
    stakeholderId: 'st-demo-5',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]

export const disclosures = [
  {
    id: 'di-demo-1',
    $type: 'https://schema.org.ai/Disclosure',
    example: true,
    title: '[demo] Lobbying-activity disclosure, 2026-Q2 (synthetic stand-in)',
    kind: 'lobbying-disclosure',
    period: '2026-Q2',
    federation: {
      binding: 'federated',
      note:
        'DECOMPOSITION: the public-record read-layer convergent owns the filing corpus; this substrate serves a corporate-affairs view only. ' +
        'The federation is UNWIRED at wave zero and the source route is register inference [UNVERIFIED] — this record is a labeled synthetic stand-in, not a filing.',
    },
    summary: 'Synthetic stand-in shaped like a lobbying-activity disclosure for the fictional Larchbeck Amaranth Group; no real registry, filer, or issue codes.',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'di-demo-2',
    $type: 'https://schema.org.ai/Disclosure',
    example: true,
    title: '[demo] Annual-meeting proxy summary, FY2026 (synthetic stand-in)',
    kind: 'proxy-summary',
    period: 'FY2026',
    federation: {
      binding: 'federated',
      note:
        'DECOMPOSITION: governance artifacts themselves (minutes, resolutions, consents) belong to the entity back-office convergent (holdings-corporate-mgmt) and are NOT served here; ' +
        'this is the corporate-affairs disclosure view only, synthetic and unwired at wave zero.',
    },
    summary: 'Synthetic stand-in shaped like a proxy-statement summary for the fictional tenant; every item and vote count is invented example content.',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]
