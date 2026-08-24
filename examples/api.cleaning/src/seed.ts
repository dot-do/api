/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types. Deterministic (no RNG):
 * reseeding is a build step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; titles carry a "[demo]" label
 *   - fictional vendors and facilities (no real company or person names;
 *     personas are role labels, never names)
 *   - synthetic EINs use the 00- prefix (never a valid real EIN range)
 *   - the row's source route is FIRST-PARTY work-order/schedule capture at
 *     the rail, and the rail is NOT yet built (C-class): per spec §5.2 the
 *     wave-zero corpus is this labeled synthetic seed — no class-A status is
 *     claimed or improvised. Real first-party capture accretes when the rail
 *     exists; public-registry supply enrichment is register-flagged
 *     UNVERIFIED and is not ingested.
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation —
 * three vendors across the row's three NAICS 5617 service classes, three
 * facilities, five recurring schedules, two full service periods of work
 * orders (completed orders carry service visits), so every filter genuinely
 * branches (OK / EMPTY / narrower OK).
 */

import { SERVICE_CLASSES } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

export type ServiceClass = (typeof SERVICE_CLASSES)[number]

export interface SeedVendor {
  $context: string
  $type: 'Vendor'
  id: string
  name: string
  service: ServiceClass
  naics: string
  ein: string
  onboarding: {
    w9OnFile: boolean
    coiOnFile: boolean
    coiExpires: string
    coiNote: string
    bankingOnFile: boolean
  }
  example: true
  label: string
}

export interface SeedFacility {
  $context: string
  $type: 'Facility'
  id: string
  name: string
  kind: 'office' | 'warehouse' | 'medical-office'
  sqft: number
  example: true
  label: string
}

export interface SeedSchedule {
  $context: string
  $type: 'ServiceSchedule'
  id: string
  facilityId: string
  vendorId: string
  service: ServiceClass
  cadence: string
  startedOn: string
  status: 'active'
  example: true
  label: string
}

export interface SeedServiceVisit {
  $context: string
  $type: 'ServiceVisit'
  id: string
  workOrderId: string
  date: string
  crewRole: string
  minutes: number
  outcome: 'completed'
  example: true
  label: string
}

export interface SeedWorkOrder {
  $context: string
  $type: 'WorkOrder'
  id: string
  facilityId: string
  vendorId: string
  scheduleId?: string
  service: ServiceClass
  period: string
  status: 'completed' | 'scheduled' | 'in-progress'
  naics: string
  estimate: { amount: number; currency: 'USD'; basis: string }
  title: string
  example: true
  label: string
}

/** The demo workspace — tenant #1 on the production substrate (live-demo ruling). */
export const WORKSPACE = {
  $context: CONTEXT,
  $type: 'Workspace',
  id: 't-harborview-facilities',
  name: 'Harborview Facilities Group (demo)',
  example: true as const,
  label: '[demo] Fictional facility-management workspace — sandbox seed tenant',
}

const NAICS_BY_SERVICE: Record<ServiceClass, string> = {
  janitorial: '56172',
  landscaping: '56173',
  'pest-control': '56171',
}

export const VENDORS: SeedVendor[] = [
  {
    $context: CONTEXT, $type: 'Vendor', id: 'v-brightline', name: 'Brightline Janitorial Services LLC (demo)',
    service: 'janitorial', naics: '56172', ein: '00-3000001',
    onboarding: { w9OnFile: true, coiOnFile: true, coiExpires: '2027-03-31', coiNote: '[demo] fictional carrier — synthetic certificate of insurance, ties to the insurance document grain', bankingOnFile: true },
    example: true, label: '[demo] Fictional janitorial vendor',
  },
  {
    $context: CONTEXT, $type: 'Vendor', id: 'v-sagegate', name: 'Sagegate Grounds & Landscape LLC (demo)',
    service: 'landscaping', naics: '56173', ein: '00-3000002',
    onboarding: { w9OnFile: true, coiOnFile: true, coiExpires: '2026-12-31', coiNote: '[demo] fictional carrier — synthetic certificate of insurance', bankingOnFile: false },
    example: true, label: '[demo] Fictional landscaping vendor',
  },
  {
    $context: CONTEXT, $type: 'Vendor', id: 'v-oldmill', name: 'Old Mill Pest Solutions Inc (demo)',
    service: 'pest-control', naics: '56171', ein: '00-3000003',
    onboarding: { w9OnFile: true, coiOnFile: false, coiExpires: '', coiNote: '[demo] COI not yet on file — onboarding-packet gap', bankingOnFile: true },
    example: true, label: '[demo] Fictional pest-control vendor',
  },
]

export const FACILITIES: SeedFacility[] = [
  { $context: CONTEXT, $type: 'Facility', id: 'f-commerce-center', name: 'Harborview Commerce Center (demo)', kind: 'office', sqft: 84000, example: true, label: '[demo] Fictional office facility' },
  { $context: CONTEXT, $type: 'Facility', id: 'f-gatehouse-depot', name: 'Gatehouse Distribution Depot (demo)', kind: 'warehouse', sqft: 220000, example: true, label: '[demo] Fictional warehouse facility' },
  { $context: CONTEXT, $type: 'Facility', id: 'f-larkspur-medical', name: 'Larkspur Medical Pavilion (demo)', kind: 'medical-office', sqft: 46000, example: true, label: '[demo] Fictional medical-office facility' },
]

export const PERIODS = ['2026-07', '2026-08'] as const

export const SCHEDULES: SeedSchedule[] = [
  { $context: CONTEXT, $type: 'ServiceSchedule', id: 's-cc-janitorial', facilityId: 'f-commerce-center', vendorId: 'v-brightline', service: 'janitorial', cadence: 'nightly-5x-week', startedOn: '2026-05-01', status: 'active', example: true, label: '[demo] Nightly janitorial — Harborview Commerce Center (demo)' },
  { $context: CONTEXT, $type: 'ServiceSchedule', id: 's-lm-janitorial', facilityId: 'f-larkspur-medical', vendorId: 'v-brightline', service: 'janitorial', cadence: 'nightly-7x-week', startedOn: '2026-05-01', status: 'active', example: true, label: '[demo] Nightly janitorial — Larkspur Medical Pavilion (demo)' },
  { $context: CONTEXT, $type: 'ServiceSchedule', id: 's-cc-landscaping', facilityId: 'f-commerce-center', vendorId: 'v-sagegate', service: 'landscaping', cadence: 'biweekly', startedOn: '2026-04-15', status: 'active', example: true, label: '[demo] Biweekly grounds — Harborview Commerce Center (demo)' },
  { $context: CONTEXT, $type: 'ServiceSchedule', id: 's-gd-pest', facilityId: 'f-gatehouse-depot', vendorId: 'v-oldmill', service: 'pest-control', cadence: 'monthly', startedOn: '2026-05-15', status: 'active', example: true, label: '[demo] Monthly pest program — Gatehouse Distribution Depot (demo)' },
  { $context: CONTEXT, $type: 'ServiceSchedule', id: 's-lm-pest', facilityId: 'f-larkspur-medical', vendorId: 'v-oldmill', service: 'pest-control', cadence: 'monthly', startedOn: '2026-06-01', status: 'active', example: true, label: '[demo] Monthly pest program — Larkspur Medical Pavilion (demo)' },
]

/** Deterministic estimate basis per service class (synthetic rates, labeled). */
function estimateFor(service: ServiceClass, sqft: number): { amount: number; currency: 'USD'; basis: string } {
  const rate = service === 'janitorial' ? 0.11 : service === 'landscaping' ? 0.04 : 0.02
  return { amount: Math.round(sqft * rate), currency: 'USD', basis: `[demo] synthetic per-sqft estimate basis (${rate}/sqft) — example data, not a market rate` }
}

function scheduleWorkOrders(): SeedWorkOrder[] {
  const orders: SeedWorkOrder[] = []
  for (const s of SCHEDULES) {
    const facility = FACILITIES.find((f) => f.id === s.facilityId)!
    for (const [pi, period] of PERIODS.entries()) {
      for (const occurrence of [1, 2]) {
        const id = `wo-${s.id.slice(2)}-${period}-${occurrence}`
        // 2026-07 fully completed; 2026-08 first occurrence in progress,
        // second still scheduled — so the `status` filter genuinely branches.
        const status: SeedWorkOrder['status'] = pi === 0 ? 'completed' : occurrence === 1 ? 'in-progress' : 'scheduled'
        orders.push({
          $context: CONTEXT,
          $type: 'WorkOrder',
          id,
          facilityId: s.facilityId,
          vendorId: s.vendorId,
          scheduleId: s.id,
          service: s.service,
          period,
          status,
          naics: NAICS_BY_SERVICE[s.service],
          estimate: estimateFor(s.service, facility.sqft),
          title: `[demo] ${s.service} — ${facility.name}, ${period} #${occurrence}`,
          example: true,
          label: RETENTION_NOTE,
        })
      }
    }
  }
  return orders
}

const adHoc: SeedWorkOrder[] = [
  {
    $context: CONTEXT, $type: 'WorkOrder', id: 'wo-adhoc-cc-strip-wax-2026-07', facilityId: 'f-commerce-center', vendorId: 'v-brightline',
    service: 'janitorial', period: '2026-07', status: 'completed', naics: '56172',
    estimate: { amount: 3400, currency: 'USD', basis: '[demo] synthetic flat estimate — example data' },
    title: '[demo] One-time floor strip & wax — Harborview Commerce Center (demo), 2026-07', example: true, label: RETENTION_NOTE,
  },
  {
    $context: CONTEXT, $type: 'WorkOrder', id: 'wo-adhoc-gd-lot-cleanup-2026-08', facilityId: 'f-gatehouse-depot', vendorId: 'v-sagegate',
    service: 'landscaping', period: '2026-08', status: 'scheduled', naics: '56173',
    estimate: { amount: 1800, currency: 'USD', basis: '[demo] synthetic flat estimate — example data' },
    title: '[demo] One-time lot & perimeter cleanup — Gatehouse Distribution Depot (demo), 2026-08', example: true, label: RETENTION_NOTE,
  },
]

export const WORK_ORDERS: SeedWorkOrder[] = [...scheduleWorkOrders(), ...adHoc]

/** Every completed work order carries service visits (crew roles, never names). */
export const SERVICE_VISITS: SeedServiceVisit[] = WORK_ORDERS.filter((w) => w.status === 'completed').flatMap((w) => {
  const minutes = w.service === 'janitorial' ? 180 : w.service === 'landscaping' ? 240 : 90
  return [
    {
      $context: CONTEXT,
      $type: 'ServiceVisit' as const,
      id: `sv-${w.id.slice(3)}-1`,
      workOrderId: w.id,
      date: `${w.period}-14`,
      crewRole: w.service === 'janitorial' ? 'night-crew-lead' : w.service === 'landscaping' ? 'grounds-crew-lead' : 'licensed-applicator',
      minutes,
      outcome: 'completed' as const,
      example: true as const,
      label: `[demo] Service visit for ${w.id}`,
    },
  ]
})
