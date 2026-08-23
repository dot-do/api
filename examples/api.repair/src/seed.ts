/**
 * seed.ts — the §5.2 sandbox seed corpus for `repair-field-services`,
 * produced MECHANICALLY from the register row's G1 anchors (NAICS 811
 * ex-8111: 8112 electronics, 8113 commercial machinery, 8114 personal &
 * household goods) + data-ply record types (work order / estimate /
 * inspection report). Deterministic (no RNG): reseeding is a build step, and
 * the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; labels carry "(demo)"
 *   - fictional operators (no real company or person names; personas are
 *     role labels, never names)
 *   - asset tags use the GS1 demo prefix 952 (fixture law); no real serials
 *   - the row's Class A source route (first-party capture generalizing from
 *     the LIVE Vin recon/inspection/maintenance lanes) is the 8111 instance,
 *     which the register carves to the automotive row — no ex-8111 corpus is
 *     reachable in-session, so per spec §5.2 this labeled synthetic seed is
 *     the wave-zero corpus; the route is recorded, never claimed as serving.
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation — one
 * operator per NAICS subsector, full work-order lifecycles (open →
 * in-progress → completed), estimates with internally consistent line-item
 * totals, and an inspection report behind every estimate-backed job.
 */

import { REPAIR_CLASSES } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

export type RepairClass = (typeof REPAIR_CLASSES)[number]
export type WorkOrderStatus = 'open' | 'in-progress' | 'completed'

export interface SeedOperator {
  $context: string
  $type: 'Organization'
  id: string
  name: string
  naics: string
  repairClass: RepairClass
  example: true
  label: string
}

export interface EstimateLine {
  kind: 'parts' | 'labor'
  description: string
  qty: number
  unitUsd: number
  totalUsd: number
}

export interface SeedEstimate {
  $context: string
  $type: 'Estimate'
  id: string
  workOrderId: string
  operatorId: string
  status: 'draft' | 'approved'
  lines: EstimateLine[]
  totalUsd: number
  example: true
  label: string
}

export interface SeedInspectionReport {
  $context: string
  $type: 'InspectionReport'
  id: string
  workOrderId: string
  operatorId: string
  assetTag: string
  condition: string
  findings: string[]
  inspectedOn: string
  example: true
  label: string
}

export interface SeedWorkOrder extends Record<string, unknown> {
  $context: string
  $type: 'WorkOrder'
  id: string
  operatorId: string
  repairClass: RepairClass
  status: WorkOrderStatus
  assetTag: string
  unit: string
  complaint: string
  openedOn: string
  completedOn?: string
  estimateId?: string
  inspectionReportId?: string
  actualTotalUsd?: number
  example: true
  label: string
}

/** One fictional operator per NAICS 811 ex-8111 subsector. */
export const OPERATORS: SeedOperator[] = [
  { $context: CONTEXT, $type: 'Organization', id: 'op-kestrel', name: 'Kestrel Bench Electronics (demo)', naics: '8112', repairClass: 'electronics', example: true, label: 'fictional operator — example data' },
  { $context: CONTEXT, $type: 'Organization', id: 'op-graniterow', name: 'Granite Row Machinery Service (demo)', naics: '8113', repairClass: 'industrial-machinery', example: true, label: 'fictional operator — example data' },
  { $context: CONTEXT, $type: 'Organization', id: 'op-juniper', name: 'Juniper Appliance Works (demo)', naics: '8114', repairClass: 'appliance', example: true, label: 'fictional operator — example data' },
]

interface JobSpec {
  unit: string
  complaint: string
  parts: [string, number, number] // description, qty, unitUsd
  laborHours: number
  laborRateUsd: number
  finding: string
}

/** Six deterministic jobs per operator — generic units, no brand names. */
const JOBS: Record<string, JobSpec[]> = {
  'op-kestrel': [
    { unit: 'bench power supply', complaint: 'no output on channel B', parts: ['output MOSFET pair', 2, 14], laborHours: 1.5, laborRateUsd: 95, finding: 'failed output stage; thermal stress on heatsink pad' },
    { unit: 'oscilloscope', complaint: 'display flickers then blanks', parts: ['LCD backlight inverter', 1, 62], laborHours: 2, laborRateUsd: 95, finding: 'inverter rail sag under load' },
    { unit: 'audio mixing console', complaint: 'channel 7 fader dead', parts: ['motorized fader assembly', 1, 88], laborHours: 1, laborRateUsd: 95, finding: 'worn fader track; dust ingress' },
    { unit: 'two-way radio base station', complaint: 'intermittent transmit', parts: ['PA driver module', 1, 120], laborHours: 2.5, laborRateUsd: 95, finding: 'cracked solder at PA driver' },
    { unit: 'laboratory centrifuge controller', complaint: 'E-14 overspeed fault', parts: ['hall sensor', 1, 33], laborHours: 1.5, laborRateUsd: 95, finding: 'sensor drift beyond calibration window' },
    { unit: 'point-of-sale terminal', complaint: 'card reader not detected', parts: ['reader ribbon harness', 1, 21], laborHours: 0.5, laborRateUsd: 95, finding: 'harness pinched at hinge' },
  ],
  'op-graniterow': [
    { unit: 'CNC spindle drive', complaint: 'trips on acceleration', parts: ['DC bus capacitor bank', 1, 340], laborHours: 4, laborRateUsd: 125, finding: 'bus capacitance below spec; ripple over threshold' },
    { unit: 'packaging line conveyor gearbox', complaint: 'grinding under load', parts: ['input shaft bearing set', 1, 190], laborHours: 3, laborRateUsd: 125, finding: 'spalled bearing race; lubricant contamination' },
    { unit: 'industrial air compressor', complaint: 'fails to hold pressure', parts: ['unloader valve kit', 1, 85], laborHours: 2, laborRateUsd: 125, finding: 'unloader seat erosion' },
    { unit: 'forklift hydraulic pump', complaint: 'slow mast lift', parts: ['pump cartridge', 1, 410], laborHours: 3.5, laborRateUsd: 125, finding: 'internal bypass past worn cartridge' },
    { unit: 'welding power source', complaint: 'arc instability', parts: ['output rectifier diode set', 3, 45], laborHours: 2, laborRateUsd: 125, finding: 'one rectifier leg open under load' },
    { unit: 'grain auger drive motor', complaint: 'overheats in 10 minutes', parts: ['motor fan + shroud', 1, 60], laborHours: 1.5, laborRateUsd: 125, finding: 'blocked cooling path; fan blade sheared' },
  ],
  'op-juniper': [
    { unit: 'front-load washer', complaint: 'drum will not spin', parts: ['drive belt + tensioner', 1, 48], laborHours: 1, laborRateUsd: 85, finding: 'belt glazed and slipping; tensioner spring fatigued' },
    { unit: 'refrigerator', complaint: 'warm fresh-food section', parts: ['evaporator fan motor', 1, 74], laborHours: 1.5, laborRateUsd: 85, finding: 'fan motor seized; frost pattern consistent with airflow loss' },
    { unit: 'gas range', complaint: 'igniter clicks, no flame', parts: ['spark module', 1, 56], laborHours: 1, laborRateUsd: 85, finding: 'weak spark under load; module output low' },
    { unit: 'dishwasher', complaint: 'standing water after cycle', parts: ['drain pump', 1, 89], laborHours: 1, laborRateUsd: 85, finding: 'pump impeller fouled and cracked' },
    { unit: 'clothes dryer', complaint: 'no heat on any cycle', parts: ['heating element + thermal fuse', 1, 65], laborHours: 1, laborRateUsd: 85, finding: 'element open; fuse blown secondary to lint restriction' },
    { unit: 'upright vacuum', complaint: 'brush roll stalls', parts: ['brush motor', 1, 39], laborHours: 0.5, laborRateUsd: 85, finding: 'motor brushes worn to limit' },
  ],
}

/** Deterministic lifecycle per job index: 0-1 open, 2-3 in-progress, 4-5 completed. */
function statusFor(i: number): WorkOrderStatus {
  return i < 2 ? 'open' : i < 4 ? 'in-progress' : 'completed'
}

function money(n: number): number {
  return Math.round(n * 100) / 100
}

const workOrders: SeedWorkOrder[] = []
const estimates: SeedEstimate[] = []
const inspectionReports: SeedInspectionReport[] = []

for (const op of OPERATORS) {
  const jobs = JOBS[op.id]!
  jobs.forEach((job, i) => {
    const n = i + 1
    const woId = `wo-${op.id.slice(3)}-${n}`
    const assetTag = `952-${op.naics}-${String(n).padStart(4, '0')}` // GS1 demo prefix 952 (fixture law)
    const status = statusFor(i)
    const openedOn = `2026-07-${String(2 + i * 3).padStart(2, '0')}`
    const partsTotal = money(job.parts[1] * job.parts[2])
    const laborTotal = money(job.laborHours * job.laborRateUsd)
    const total = money(partsTotal + laborTotal)

    const wo: SeedWorkOrder = {
      $context: CONTEXT,
      $type: 'WorkOrder',
      id: woId,
      operatorId: op.id,
      repairClass: op.repairClass,
      status,
      assetTag,
      unit: job.unit,
      complaint: job.complaint,
      openedOn,
      example: true,
      label: 'synthetic example record — see /llms.txt for the retention note',
    }

    // in-progress and completed jobs carry an approved estimate + inspection report
    if (status !== 'open') {
      const estId = `est-${op.id.slice(3)}-${n}`
      const irId = `ir-${op.id.slice(3)}-${n}`
      estimates.push({
        $context: CONTEXT,
        $type: 'Estimate',
        id: estId,
        workOrderId: woId,
        operatorId: op.id,
        status: 'approved',
        lines: [
          { kind: 'parts', description: job.parts[0], qty: job.parts[1], unitUsd: job.parts[2], totalUsd: partsTotal },
          { kind: 'labor', description: `bench/field labor @ $${job.laborRateUsd}/hr`, qty: job.laborHours, unitUsd: job.laborRateUsd, totalUsd: laborTotal },
        ],
        totalUsd: total,
        example: true,
        label: 'synthetic example record',
      })
      inspectionReports.push({
        $context: CONTEXT,
        $type: 'InspectionReport',
        id: irId,
        workOrderId: woId,
        operatorId: op.id,
        assetTag,
        condition: status === 'completed' ? 'repaired-verified' : 'diagnosed',
        findings: [job.finding],
        inspectedOn: openedOn,
        example: true,
        label: 'synthetic example record',
      })
      wo.estimateId = estId
      wo.inspectionReportId = irId
    }
    if (status === 'completed') {
      wo.completedOn = `2026-08-${String(1 + i).padStart(2, '0')}`
      wo.actualTotalUsd = total // actuals reconcile to the approved estimate — internally consistent
    }
    workOrders.push(wo)
  })
}

export const WORK_ORDERS: readonly SeedWorkOrder[] = workOrders
export const ESTIMATES: readonly SeedEstimate[] = estimates
export const INSPECTION_REPORTS: readonly SeedInspectionReport[] = inspectionReports
