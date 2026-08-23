/**
 * seed.ts — the §5.2 sandbox seed corpus for the `staffing-talent` substrate,
 * produced mechanically from the register row's G1 anchors (NAICS 5613,
 * O*NET-SOC as the skills-typing standard).
 *
 * PROVENANCE, per record class:
 *
 *   - Occupation records are an EXCERPT OF THE REAL O*NET-SOC TAXONOMY
 *     (O*NET 29.0, U.S. Department of Labor, CC BY 4.0). The codes and titles
 *     are the standard's own — this is the one register row whose record
 *     schema is literally a G1 standard, and the vocabulary is served as
 *     ingested reference data, not synthetic.
 *
 *   - Candidate / JobOrder / Placement records are SYNTHETIC EXAMPLE DATA.
 *     The row's class-A source route (the studio's own recruiting engine) is
 *     not reachable from this build — and candidate records are personal data
 *     regardless — so the sandbox is seeded per estate fixture law: fictional
 *     person and company names (collision-checked against no real entity by
 *     intent), no real EINs/SSNs/emails, every record labeled
 *     `"example": true`. The sandbox is the real product over simulated
 *     data — never a faked demo.
 *
 * The corpus exercises every declared operation and gives each Noun honest
 * depth: placements carry full lifecycle states including a fell-off record,
 * because a seed corpus in which every placement succeeds is not world-class
 * example data, it is advertising.
 */

export const SEED_LABEL =
  'example data — synthetic sandbox seed for the api.careers anon sandbox; not real candidates, employers, or placements'

export const RETENTION_NOTE =
  'anonymous sandbox workspace: records you mint are held in ephemeral worker memory only and vanish on isolate recycle — no account, no retention, no billing'

export interface OccupationRecord {
  id: string // O*NET-SOC code
  title: string
  source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt'
  skills: string[]
}

export interface CandidateRecord {
  id: string
  example: true
  label: string
  name: string
  onetCode: string // O*NET-SOC typing — the G1 anchor on the record itself
  skills: string[]
  status: 'available' | 'placed'
  metro: string
}

export interface JobOrderRecord {
  id: string
  example: true
  label: string
  client: string
  title: string
  onetCode: string
  status: 'open' | 'filled'
  billRateUsdHour: number
}

export interface PlacementRecord {
  id: string
  example: true
  label: string
  candidateId: string
  jobOrderId: string
  onetCode: string
  startDate: string
  status: 'active' | 'completed' | 'ended-early'
  feeModel: 'perm-fee' | 'contract-markup' | 'contract-to-hire'
  ninetyDay: { validated: boolean; outcome: 'retained' | 'pending' | 'attrited' | 'converted' }
}

/** O*NET-SOC excerpt — real G1 vocabulary, ingested (staffing-relevant slice). */
export const occupations: OccupationRecord[] = [
  { id: '15-1252.00', title: 'Software Developers', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['application development', 'version control', 'debugging'] },
  { id: '15-1232.00', title: 'Computer User Support Specialists', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['help desk', 'ticketing systems', 'troubleshooting'] },
  { id: '29-1141.00', title: 'Registered Nurses', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['patient care', 'clinical documentation', 'medication administration'] },
  { id: '43-4051.00', title: 'Customer Service Representatives', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['customer support', 'CRM systems', 'conflict resolution'] },
  { id: '41-2031.00', title: 'Retail Salespersons', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['point of sale', 'merchandising', 'customer engagement'] },
  { id: '13-2011.00', title: 'Accountants and Auditors', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['general ledger', 'reconciliation', 'financial reporting'] },
  { id: '43-6014.00', title: 'Secretaries and Administrative Assistants', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['scheduling', 'correspondence', 'records management'] },
  { id: '53-7062.00', title: 'Laborers and Freight, Stock, and Material Movers', source: 'O*NET 29.0 (U.S. Department of Labor, CC BY 4.0) — excerpt', skills: ['warehouse operations', 'inventory handling', 'safety compliance'] },
]

/** Synthetic candidates — fictional names, O*NET-typed skills, labeled. */
export const candidates: CandidateRecord[] = [
  { id: 'cand_0001', example: true, label: SEED_LABEL, name: 'Avery Quill', onetCode: '15-1252.00', skills: ['application development', 'version control'], status: 'placed', metro: 'Denver' },
  { id: 'cand_0002', example: true, label: SEED_LABEL, name: 'Rowan Hollis', onetCode: '29-1141.00', skills: ['patient care', 'clinical documentation'], status: 'placed', metro: 'Columbus' },
  { id: 'cand_0003', example: true, label: SEED_LABEL, name: 'Mika Tanaver', onetCode: '43-4051.00', skills: ['customer support', 'CRM systems'], status: 'available', metro: 'Phoenix' },
  { id: 'cand_0004', example: true, label: SEED_LABEL, name: 'Sol Bramwell', onetCode: '13-2011.00', skills: ['general ledger', 'reconciliation'], status: 'placed', metro: 'Charlotte' },
  { id: 'cand_0005', example: true, label: SEED_LABEL, name: 'Ida Ferrow', onetCode: '53-7062.00', skills: ['warehouse operations', 'safety compliance'], status: 'placed', metro: 'Memphis' },
  { id: 'cand_0006', example: true, label: SEED_LABEL, name: 'Nico Alderyn', onetCode: '15-1232.00', skills: ['help desk', 'troubleshooting'], status: 'available', metro: 'Tampa' },
]

/** Synthetic job orders — fictional client employers, labeled. */
export const jobOrders: JobOrderRecord[] = [
  { id: 'job_0001', example: true, label: SEED_LABEL, client: 'Cobalt Ridge Manufacturing (fictional)', title: 'Software Developer, plant systems', onetCode: '15-1252.00', status: 'filled', billRateUsdHour: 98 },
  { id: 'job_0002', example: true, label: SEED_LABEL, client: 'Juniper Health Clinic (fictional)', title: 'Registered Nurse, outpatient', onetCode: '29-1141.00', status: 'filled', billRateUsdHour: 74 },
  { id: 'job_0003', example: true, label: SEED_LABEL, client: 'Larkspur Financial Group (fictional)', title: 'Staff Accountant', onetCode: '13-2011.00', status: 'filled', billRateUsdHour: 52 },
  { id: 'job_0004', example: true, label: SEED_LABEL, client: 'Harborline Distribution (fictional)', title: 'Warehouse Associate', onetCode: '53-7062.00', status: 'open', billRateUsdHour: 24 },
]

/**
 * Synthetic placements — full lifecycle depth: retained past 90 days,
 * pending, attrited before 90 days, and a contract-to-hire conversion.
 * The 90-day-validatable outcome is the row's recorded product grain.
 */
export const placements: PlacementRecord[] = [
  { id: 'plc_0001', example: true, label: SEED_LABEL, candidateId: 'cand_0001', jobOrderId: 'job_0001', onetCode: '15-1252.00', startDate: '2026-04-06', status: 'completed', feeModel: 'perm-fee', ninetyDay: { validated: true, outcome: 'retained' } },
  { id: 'plc_0002', example: true, label: SEED_LABEL, candidateId: 'cand_0002', jobOrderId: 'job_0002', onetCode: '29-1141.00', startDate: '2026-05-11', status: 'completed', feeModel: 'contract-markup', ninetyDay: { validated: true, outcome: 'retained' } },
  { id: 'plc_0003', example: true, label: SEED_LABEL, candidateId: 'cand_0004', jobOrderId: 'job_0003', onetCode: '13-2011.00', startDate: '2026-07-27', status: 'active', feeModel: 'perm-fee', ninetyDay: { validated: false, outcome: 'pending' } },
  { id: 'plc_0004', example: true, label: SEED_LABEL, candidateId: 'cand_0005', jobOrderId: 'job_0004', onetCode: '53-7062.00', startDate: '2026-06-01', status: 'ended-early', feeModel: 'contract-markup', ninetyDay: { validated: true, outcome: 'attrited' } },
  { id: 'plc_0005', example: true, label: SEED_LABEL, candidateId: 'cand_0001', jobOrderId: 'job_0001', onetCode: '15-1252.00', startDate: '2026-01-12', status: 'completed', feeModel: 'contract-to-hire', ninetyDay: { validated: true, outcome: 'converted' } },
]
