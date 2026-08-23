/**
 * seed.js — the §5.2 sandbox seed corpus for the fn-risk-compliance
 * substrate, produced mechanically against the substrate's record schemas.
 *
 * TWO HONESTY CLASSES, disclosed per record:
 *
 *   1. REFERENCE RECORDS (statutes, check definitions) — class-A facts:
 *      public-law citations and estate-register rows (the 2026-08-23
 *      property-surface register enumerates the 28 held .dev fronts). These
 *      are NOT demo data; each carries a `sourceClass` + `sourceNote` naming
 *      exactly where the fact comes from and what has NOT run (no live
 *      registry fetch at wave zero — no registry-derived value exists here).
 *
 *   2. SYNTHETIC RECORDS (check runs, obligations, any minted subject) —
 *      labeled demo data per fixture law: `example: true`, "[demo]" titles,
 *      fictional companies only, no real person or company names, no real
 *      EINs/license numbers (synthetic 00-prefix patterns only).
 *
 * The seed is versioned with the manifest — reseeding is a build step.
 */

const RETENTION = 'ephemeral — per-isolate memory only; no durability at wave zero'
const NO_REGISTRY =
  'authored from the public-law citation / estate register only; the live registry-fetch pipeline (the row’s ruled source route) has not run at wave zero — no registry-derived value appears on this record'

/** The one fictional tenant (live-demo ruling: real handlers, simulated data). */
export const demoTenant = {
  id: 'org-demo-1',
  name: '[demo] Cassia Fern Contracting (fictional)',
  example: true,
  companyType: 'government contractor (fictional)',
  retention: RETENTION,
}

/**
 * Statutes — the five regulations the register row recites BY NAME as this
 * family's G1 anchors ("G1 here is the statutes themselves"). Public-law
 * citation facts; descriptions state the statute's subject, nothing more.
 */
export const statutes = [
  {
    id: 'davis-bacon',
    $type: 'https://schema.org.ai/Statute',
    title: 'Davis-Bacon Act',
    citation: '40 U.S.C. §§ 3141–3148',
    agency: 'U.S. Department of Labor, Wage and Hour Division',
    subject: 'Prevailing wage requirements on federal and federally assisted construction contracts',
    sourceClass: 'public-law-citation',
    sourceNote: NO_REGISTRY,
  },
  {
    id: 'fifra',
    $type: 'https://schema.org.ai/Statute',
    title: 'Federal Insecticide, Fungicide, and Rodenticide Act (FIFRA)',
    citation: '7 U.S.C. § 136 et seq.',
    agency: 'U.S. Environmental Protection Agency',
    subject: 'Registration, labeling, and distribution requirements for pesticide products',
    sourceClass: 'public-law-citation',
    sourceNote: NO_REGISTRY,
  },
  {
    id: 'neshap',
    $type: 'https://schema.org.ai/Statute',
    title: 'National Emission Standards for Hazardous Air Pollutants (NESHAP)',
    citation: 'Clean Air Act § 112; 40 CFR Parts 61 and 63',
    agency: 'U.S. Environmental Protection Agency',
    subject: 'Emission standards and notification/reporting duties for sources of hazardous air pollutants',
    sourceClass: 'public-law-citation',
    sourceNote: NO_REGISTRY,
  },
  {
    id: 'ffl',
    $type: 'https://schema.org.ai/Statute',
    title: 'Gun Control Act — Federal Firearms Licensee requirements',
    citation: '18 U.S.C. § 923; 27 CFR Part 478',
    agency: 'Bureau of Alcohol, Tobacco, Firearms and Explosives',
    subject: 'Licensing, acquisition/disposition recordkeeping, and conduct-of-business rules for federal firearms licensees',
    sourceClass: 'public-law-citation',
    sourceNote: NO_REGISTRY,
  },
  {
    id: 'x12-834',
    $type: 'https://schema.org.ai/Statute',
    title: 'X12 834 Benefit Enrollment and Maintenance (HIPAA transaction standard)',
    citation: '45 CFR Part 162 (adopted ASC X12N 834)',
    agency: 'U.S. Department of Health and Human Services (standard: ASC X12)',
    subject: 'The adopted electronic interchange standard for benefit enrollment and maintenance transactions',
    sourceClass: 'public-law-citation',
    sourceNote: NO_REGISTRY,
  },
]

/**
 * Check definitions — the family register at the family grain: ONE row per
 * held per-statute .dev front, exactly as the 2026-08-23 property-surface
 * register enumerates them (28 rows, family ".dev-instrument", substrate
 * "fn-risk-compliance"). Front→statute bindings exist ONLY where the
 * full-economy register row recites the statute (five fronts); every other
 * binding is null with the row's own [UNVERIFIED] flag kept — the register
 * says the full list beyond the five recited is "[UNVERIFIED] at name
 * level", and binding a front to a statute is a curation act, not a build
 * act. Nothing below improvises a statute for an unbound front.
 */
const SURFACE_REGISTER = 'estate-register fact — 2026-08-23 property-surface register (.dev-instrument family, substrate fn-risk-compliance)'
const UNBOUND = 'statute binding not recited by the full-economy register row — [UNVERIFIED], left to #16/#3 curation; never improvised here'

function checkDef(front, state, statuteId, boundNote) {
  const id = front.replace(/\.dev$/, '')
  return {
    id,
    $type: 'https://schema.org.ai/CheckDefinition',
    front,
    frontState: `${state} (held, not serving)`,
    statuteId,
    statuteNote: statuteId ? `bound — recited by the register row (${SURFACE_REGISTER})` : UNBOUND,
    subject: boundNote || null,
    sourceClass: 'estate-register',
    sourceNote: `${SURFACE_REGISTER}; ${NO_REGISTRY}`,
  }
}

export const checkDefinitions = [
  // The five fronts the full-economy register row recites, bound to their statutes:
  checkDef('davisbacon.dev', 'zone-only', 'davis-bacon', 'Is this contract/work subject to Davis-Bacon prevailing-wage requirements?'),
  checkDef('fifra.dev', 'zone-only', 'fifra', 'Does this pesticide product carry the FIFRA registration/labeling duties?'),
  checkDef('neshap.dev', 'zone-only', 'neshap', 'Do NESHAP notification/reporting duties attach to this source?'),
  checkDef('fflcheck.dev', 'zone-only', 'ffl', 'FFL status and recordkeeping duty check for a federal firearms licensee'),
  checkDef('edi834.dev', 'name-only', 'x12-834', 'Does this benefit-enrollment interchange conform to the adopted 834 standard?'),
  // The remaining 23 enumerated fronts — held names, statute bindings unrecited:
  checkDef('batterycheck.dev', 'zone-only', null),
  checkDef('bottledeposit.dev', 'zone-only', null),
  checkDef('carriercomp.dev', 'zone-only', null),
  checkDef('ciac.dev', 'zone-only', null),
  checkDef('cleantruck.dev', 'zone-only', null),
  checkDef('datecode.dev', 'zone-only', null),
  checkDef('dirreg.dev', 'zone-only', null),
  checkDef('emrcheck.dev', 'zone-only', null),
  checkDef('hospicecap.dev', 'zone-only', null),
  checkDef('jointcheck.dev', 'zone-only', null),
  checkDef('lawlabel.dev', 'zone-only', null),
  checkDef('ld2.dev', 'zone-only', null),
  checkDef('mattressfee.dev', 'zone-only', null),
  checkDef('minesafety.dev', 'zone-only', null),
  checkDef('payonscan.dev', 'zone-only', null),
  checkDef('pilotrecords.dev', 'zone-only', null),
  checkDef('regf.dev', 'zone-only', null),
  checkDef('rxverify.dev', 'zone-only', null),
  checkDef('snfcb.dev', 'zone-only', null),
  checkDef('tankcheck.dev', 'zone-only', null),
  checkDef('taxhome.dev', 'zone-only', null),
  checkDef('tirefee.dev', 'zone-only', null),
  checkDef('trustnotice.dev', 'zone-only', null),
]

/**
 * Check runs — SYNTHETIC, labeled. The check-runner executed over the
 * fictional tenant; findings are invented example content. `attested: false`
 * everywhere: attested output is typed to ride the api.qa verification rail
 * (consumption edge, LIVE), and no verdict URL is fabricated at wave zero.
 */
export const checkRuns = [
  {
    id: 'run-demo-1',
    $type: 'https://schema.org.ai/CheckRun',
    example: true,
    title: '[demo] Davis-Bacon applicability check — Cassia Fern Contracting (fictional)',
    checkId: 'davisbacon',
    statuteId: 'davis-bacon',
    subject: { company: demoTenant.name, contract: '[demo] fictional federal renovation subcontract, synthetic figure set' },
    verdict: 'applicable',
    findings: [
      { claim: 'Contract type falls in the checked category', support: 'synthetic example determination — no live registry or wage determination consulted' },
    ],
    attested: false,
    attestationRail: 'api.qa VerificationReport (consumption edge; no attestation attached at wave zero — no verdict URL is fabricated)',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'run-demo-2',
    $type: 'https://schema.org.ai/CheckRun',
    example: true,
    title: '[demo] FFL recordkeeping duty check — Bluewick Array Ltd. (fictional)',
    checkId: 'fflcheck',
    statuteId: 'ffl',
    subject: { company: '[demo] Bluewick Array Ltd. (fictional)', license: '[demo] synthetic 00-prefix pattern 0-00-000-00-0000 — not a real FFL number' },
    verdict: 'duty-attaches',
    findings: [
      { claim: 'Acquisition/disposition recordkeeping duty attaches to the checked activity class', support: 'synthetic example determination — no ATF registry consulted' },
    ],
    attested: false,
    attestationRail: 'api.qa VerificationReport (consumption edge; no attestation attached at wave zero — no verdict URL is fabricated)',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'run-demo-3',
    $type: 'https://schema.org.ai/CheckRun',
    example: true,
    title: '[demo] 834 interchange shape check — synthetic enrollment file',
    checkId: 'edi834',
    statuteId: 'x12-834',
    subject: { file: '[demo] synthetic 834 envelope, invented control numbers only' },
    verdict: 'fail',
    findings: [
      { claim: 'Member-level detail loop missing a required segment in the synthetic file', support: 'synthetic example finding — generated fixture, not a real enrollment file' },
    ],
    attested: false,
    attestationRail: 'api.qa VerificationReport (consumption edge; no attestation attached at wave zero — no verdict URL is fabricated)',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]

/**
 * Obligations — the compliance-calendar data ply (which obligations bind
 * which CompanyType on which dates). SYNTHETIC, labeled: the obligation
 * KINDS name real statutory duties; every date, assignment, and status below
 * is invented for the fictional tenant.
 */
export const obligations = [
  {
    id: 'ob-demo-1',
    $type: 'https://schema.org.ai/Obligation',
    example: true,
    title: '[demo] Weekly certified payroll (WH-347) — Davis-Bacon covered contract',
    statuteId: 'davis-bacon',
    companyType: 'government contractor',
    cadence: 'weekly',
    nextDue: '2026-08-28',
    status: 'upcoming',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'ob-demo-2',
    $type: 'https://schema.org.ai/Obligation',
    example: true,
    title: '[demo] NESHAP semiannual compliance report — synthetic source',
    statuteId: 'neshap',
    companyType: 'manufacturer (fictional source category)',
    cadence: 'semiannual',
    nextDue: '2027-01-31',
    status: 'upcoming',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'ob-demo-3',
    $type: 'https://schema.org.ai/Obligation',
    example: true,
    title: '[demo] FFL acquisition/disposition bound-book review — fictional licensee',
    statuteId: 'ffl',
    companyType: 'FFL dealer',
    cadence: 'monthly',
    nextDue: '2026-09-01',
    status: 'upcoming',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'ob-demo-4',
    $type: 'https://schema.org.ai/Obligation',
    example: true,
    title: '[demo] Monthly 834 enrollment reconciliation — fictional benefits administrator',
    statuteId: 'x12-834',
    companyType: 'benefits administrator',
    cadence: 'monthly',
    nextDue: '2026-09-05',
    status: 'upcoming',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'ob-demo-5',
    $type: 'https://schema.org.ai/Obligation',
    example: true,
    title: '[demo] FIFRA product registration renewal — fictional pesticide product',
    statuteId: 'fifra',
    companyType: 'pesticide registrant',
    cadence: 'annual',
    nextDue: '2026-12-15',
    status: 'done',
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]
