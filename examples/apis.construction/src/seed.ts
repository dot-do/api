/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types (permit record + the
 * payment-documentation set: draw package · lien waiver · pay application).
 * Deterministic (no RNG): reseeding is a build step, and the corpus is
 * versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; titles carry a "[demo]" label
 *   - fictional contractor, owner, subcontractors, projects, and jurisdiction
 *     (no real company, person, or place names; personas are role labels)
 *   - synthetic EINs use the 00- prefix (never a valid real EIN range);
 *     permit numbers carry the DEMO- prefix (no real jurisdiction issues them)
 *   - the row's permit-ingest route (public-licensable) was not probed
 *     in-session and its enrichment ladder is register-marked [UNVERIFIED],
 *     so per spec §5.2 this labeled synthetic seed is the wave-zero corpus
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation — three
 * projects across the NAICS 23 grain (236 building, 237 heavy/civil; 238
 * specialty trades enter as subcontractor lien waivers), two full draw cycles
 * per project with internally consistent pay-application arithmetic
 * (completedToDate − retainage − previousPayments = currentPaymentDue), and
 * draw packages whose references all resolve.
 */

import { LIEN_WAIVER_TYPES } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const AI_CONTEXT = 'https://schema.org.ai'
const ORG_CONTEXT = 'https://schema.org'

/** The demo general contractor — tenant #1 on the production substrate (live-demo ruling). */
export const CONTRACTOR = {
  $context: ORG_CONTEXT,
  $type: 'GeneralContractor',
  id: 't-cornerline',
  name: 'Cornerline Builders LLC (demo)',
  ein: '00-1000001',
  naics: '236',
  example: true as const,
  label: '[demo] Fictional general contractor — sandbox seed tenant',
}

/** Fictional specialty-trade subcontractors (NAICS 238 enters here). */
export const SUBCONTRACTORS = [
  { id: 's-ironvale', name: 'Ironvale Steel Erectors LLC (demo)', ein: '00-3000001', naics: '238', trade: 'structural steel' },
  { id: 's-brightline', name: 'Brightline Mechanical Inc (demo)', ein: '00-3000002', naics: '238', trade: 'mechanical/HVAC' },
] as const

export interface SeedProject {
  $context: string
  $type: 'Project'
  id: string
  name: string
  ownerName: string
  naics: '236' | '237'
  contractSum: number
  retainagePct: number
  status: 'active'
  example: true
  label: string
}

export interface SeedPermit {
  $context: string
  $type: 'GovernmentPermit'
  id: string
  projectId: string
  permitNumber: string
  permitType: 'building' | 'right-of-way' | 'mechanical'
  jurisdiction: string
  status: 'issued'
  issuedOn: string
  example: true
  label: string
}

export interface PayApplicationLine {
  description: string
  scheduledValue: number
  thisPeriod: number
}

export interface SeedPayApplication {
  $context: string
  $type: 'PayApplication'
  id: string
  projectId: string
  period: string
  applicationNumber: number
  lines: PayApplicationLine[]
  contractSum: number
  completedToDate: number
  retainageHeld: number
  previousPayments: number
  currentPaymentDue: number
  status: 'paid' | 'submitted'
  example: true
  label: string
}

export interface SeedLienWaiver {
  $context: string
  $type: 'LienWaiver'
  id: string
  projectId: string
  period: string
  waiverType: (typeof LIEN_WAIVER_TYPES)[number]
  claimantName: string
  claimantRole: 'general-contractor' | 'subcontractor'
  claimantNaics: '236' | '238'
  throughAmount: number
  status: 'received' | 'pending'
  example: true
  label: string
}

export interface SeedDrawPackage {
  $context: string
  $type: 'DrawPackage'
  id: string
  projectId: string
  period: string
  drawNumber: number
  payApplicationId: string
  lienWaiverIds: string[]
  permitIds: string[]
  status: 'verified' | 'in-progress'
  title: string
  example: true
  label: string
}

export const PERIODS = ['2026-06', '2026-07'] as const

export const PROJECTS: SeedProject[] = [
  {
    $context: ORG_CONTEXT, $type: 'Project', id: 'p-harborview', name: 'Harborview Flats — Building B (demo)',
    ownerName: 'Meridale Waterfront Partners LLC (demo)', naics: '236', contractSum: 480_000, retainagePct: 5,
    status: 'active', example: true, label: '[demo] Fictional commercial building project',
  },
  {
    $context: ORG_CONTEXT, $type: 'Project', id: 'p-millbrook', name: 'Millbrook Clinic Fit-Out (demo)',
    ownerName: 'Millbrook Health Properties Inc (demo)', naics: '236', contractSum: 960_000, retainagePct: 5,
    status: 'active', example: true, label: '[demo] Fictional interior fit-out project',
  },
  {
    $context: ORG_CONTEXT, $type: 'Project', id: 'p-cedar-ninth', name: 'Cedar & 9th Streetscape (demo)',
    ownerName: 'City of Meridale (demo jurisdiction)', naics: '237', contractSum: 1_440_000, retainagePct: 5,
    status: 'active', example: true, label: '[demo] Fictional heavy/civil streetscape project',
  },
]

const JURISDICTION = 'City of Meridale (demo jurisdiction)'

export const PERMITS: SeedPermit[] = PROJECTS.flatMap((p, ix): SeedPermit[] => [
  {
    $context: ORG_CONTEXT, $type: 'GovernmentPermit', id: `pm-${p.id.slice(2)}-1`, projectId: p.id,
    permitNumber: `DEMO-2026-${1000 + ix * 10 + 1}`, permitType: p.naics === '237' ? 'right-of-way' : 'building',
    jurisdiction: JURISDICTION, status: 'issued', issuedOn: '2026-04-15', example: true,
    label: `[demo] Synthetic permit record — ${p.name}`,
  },
  {
    $context: ORG_CONTEXT, $type: 'GovernmentPermit', id: `pm-${p.id.slice(2)}-2`, projectId: p.id,
    permitNumber: `DEMO-2026-${1000 + ix * 10 + 2}`, permitType: 'mechanical',
    jurisdiction: JURISDICTION, status: 'issued', issuedOn: '2026-05-02', example: true,
    label: `[demo] Synthetic permit record — ${p.name}`,
  },
])

/**
 * Deterministic, internally consistent draw-cycle arithmetic per project.
 * base = 10% of contract sum. June (draw 1): thisPeriod = base. July (draw 2):
 * thisPeriod = 1.2 × base. Retainage 5% of completed-to-date, cumulative.
 * The identity completedToDate − retainageHeld − previousPayments =
 * currentPaymentDue holds on every application (tested).
 */
function payAppFor(p: SeedProject, period: (typeof PERIODS)[number]): SeedPayApplication {
  const base = p.contractSum / 10
  const isJune = period === '2026-06'
  const thisPeriod = isJune ? base : base * 1.2
  const completedToDate = isJune ? base : base * 2.2
  const retainageHeld = completedToDate * (p.retainagePct / 100)
  const previousPayments = isJune ? 0 : base - base * 0.05 // June's currentPaymentDue
  const currentPaymentDue = completedToDate - retainageHeld - previousPayments
  return {
    $context: AI_CONTEXT,
    $type: 'PayApplication',
    id: `pa-${p.id.slice(2)}-${period}`,
    projectId: p.id,
    period,
    applicationNumber: isJune ? 1 : 2,
    lines: [
      { description: 'Concrete & structure', scheduledValue: p.contractSum * 0.5, thisPeriod: thisPeriod * 0.5 },
      { description: 'Finishes', scheduledValue: p.contractSum * 0.3, thisPeriod: thisPeriod * 0.3 },
      { description: 'Electrical & mechanical', scheduledValue: p.contractSum * 0.2, thisPeriod: thisPeriod * 0.2 },
    ],
    contractSum: p.contractSum,
    completedToDate,
    retainageHeld,
    previousPayments,
    currentPaymentDue,
    status: isJune ? 'paid' : 'submitted',
    example: true,
    label: `[demo] Pay application #${isJune ? 1 : 2} — ${p.name}, ${period}`,
  }
}

export const PAY_APPLICATIONS: SeedPayApplication[] = PROJECTS.flatMap((p) => PERIODS.map((period) => payAppFor(p, period)))

/**
 * Three waivers per project-period: the GC plus two specialty-trade subs.
 * June's draw is paid → unconditional-progress, received; July's is pending
 * payment → conditional-progress, pending. The waiverType filter genuinely
 * branches. (conditional-final / unconditional-final are part of the record
 * grammar — no final waiver exists in a two-draw in-flight cycle, honestly.)
 */
export const LIEN_WAIVERS: SeedLienWaiver[] = PROJECTS.flatMap((p) =>
  PERIODS.flatMap((period): SeedLienWaiver[] => {
    const pa = PAY_APPLICATIONS.find((x) => x.projectId === p.id && x.period === period)!
    const isJune = period === '2026-06'
    const waiverType = isJune ? 'unconditional-progress' : 'conditional-progress'
    const status = isJune ? 'received' : 'pending'
    const claimants = [
      { name: CONTRACTOR.name, role: 'general-contractor' as const, naics: '236' as const, share: 0.6, key: 'gc' },
      { name: SUBCONTRACTORS[0].name, role: 'subcontractor' as const, naics: '238' as const, share: 0.25, key: SUBCONTRACTORS[0].id.slice(2) },
      { name: SUBCONTRACTORS[1].name, role: 'subcontractor' as const, naics: '238' as const, share: 0.15, key: SUBCONTRACTORS[1].id.slice(2) },
    ]
    return claimants.map((cl) => ({
      $context: AI_CONTEXT,
      $type: 'LienWaiver',
      id: `lw-${p.id.slice(2)}-${period}-${cl.key}`,
      projectId: p.id,
      period,
      waiverType,
      claimantName: cl.name,
      claimantRole: cl.role,
      claimantNaics: cl.naics,
      throughAmount: pa.currentPaymentDue * cl.share,
      status,
      example: true,
      label: `[demo] ${waiverType} lien waiver — ${cl.name}, ${p.name}, through ${period}`,
    }))
  }),
)

/**
 * One draw package per project-period, assembling the pay application, its
 * lien waivers, and the project permits. June's cycle is verified; July's is
 * in progress — the `status` filter genuinely branches (OK / EMPTY /
 * narrower OK).
 */
export const DRAW_PACKAGES: SeedDrawPackage[] = PROJECTS.flatMap((p) =>
  PERIODS.map((period): SeedDrawPackage => {
    const isJune = period === '2026-06'
    return {
      $context: AI_CONTEXT,
      $type: 'DrawPackage',
      id: `dp-${p.id.slice(2)}-${period}`,
      projectId: p.id,
      period,
      drawNumber: isJune ? 1 : 2,
      payApplicationId: `pa-${p.id.slice(2)}-${period}`,
      lienWaiverIds: LIEN_WAIVERS.filter((w) => w.projectId === p.id && w.period === period).map((w) => w.id),
      permitIds: PERMITS.filter((x) => x.projectId === p.id).map((x) => x.id),
      status: isJune ? 'verified' : 'in-progress',
      title: `[demo] Draw package #${isJune ? 1 : 2} — ${p.name}, ${period}`,
      example: true,
      label: RETENTION_NOTE,
    }
  }),
)
