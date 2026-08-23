/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types (NAICS 55; record grain:
 * registration/filing — SAM/UEI, SoS, BOI). Deterministic (no RNG):
 * reseeding is a build step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; names and labels carry "(demo)"/"[demo]"
 *   - fictional holding company and subsidiaries (no real company or person
 *     names; ownership counterparties are role labels, never names)
 *   - synthetic EINs use the 00- prefix (never a valid real EIN range);
 *     synthetic UEIs and filing numbers use the DEMO prefix
 *   - BOI records are FILING-STATUS records only: beneficial-owner personal
 *     data is never held in the sandbox corpus
 *   - the row's source route (public-licensable ingest: SoS registries,
 *     SAM/USAspending, BOI/UEI feeds) is not reachable keyless in-session at
 *     typed grain, so per spec §5.2 this labeled synthetic seed is the
 *     wave-zero corpus. The internal-first-customer corpus (a studio-shaped
 *     multi-entity structure) accretes behind auth as tenants — it never
 *     appears in a public seed.
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation — a
 * four-entity holding structure with a formation per entity, registry mirror
 * rows across three registries, BOI status per entity, agents of record in
 * two jurisdictions, a renewal calendar spanning due/filed/overdue in three
 * jurisdictions, and the full ownership edge set.
 */

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

export interface SeedEntity {
  $context: string
  $type: 'Entity'
  id: string
  name: string
  ein: string
  entityType: 'LLC' | 'C-Corp'
  jurisdiction: 'DE' | 'TX'
  status: 'active'
  formedOn: string
  registeredAgentId: string
  parentId?: string
  example: true
  label: string
}

export interface SeedFormation {
  $context: string
  $type: 'Formation'
  id: string
  entityId: string
  jurisdiction: 'DE' | 'TX'
  filingNumber: string
  filedOn: string
  documentType: 'certificate-of-formation' | 'certificate-of-incorporation'
  example: true
  label: string
}

export interface SeedRegistration {
  $context: string
  $type: 'Registration'
  id: string
  entityId: string
  registry: 'sam-uei' | 'sos' | 'usaspending'
  identifier: string
  status: 'active' | 'good-standing'
  asOf: string
  example: true
  label: string
}

export interface SeedBOIReport {
  $context: string
  $type: 'BOIReport'
  id: string
  entityId: string
  status: 'filed' | 'exempt'
  filedOn?: string
  note: string
  example: true
  label: string
}

export interface SeedRegisteredAgent {
  $context: string
  $type: 'RegisteredAgent'
  id: string
  name: string
  jurisdiction: 'DE' | 'TX'
  entityIds: string[]
  example: true
  label: string
}

export interface SeedRenewal {
  $context: string
  $type: 'Renewal'
  id: string
  entityId: string
  obligation: string
  jurisdiction: 'DE' | 'TX' | 'US-federal'
  registry: 'sos' | 'sam-uei' | 'registered-agent'
  dueOn: string
  status: 'due' | 'filed' | 'overdue'
  example: true
  label: string
}

export interface SeedOwnershipStake {
  $context: string
  $type: 'OwnershipStake'
  id: string
  parentId: string
  entityId: string
  percent: number
  holderRole: string
  example: true
  label: string
}

/** The demo holding structure — tenant #1 on the production substrate (live-demo ruling). */
export const ENTITIES: SeedEntity[] = [
  { $context: CONTEXT, $type: 'Entity', id: 'ent-northgate', name: 'Northgate Holdings LLC (demo)', ein: '00-3000001', entityType: 'LLC', jurisdiction: 'DE', status: 'active', formedOn: '2021-02-08', registeredAgentId: 'ra-harbor-de', example: true, label: '[demo] Fictional holding company — sandbox seed tenant' },
  { $context: CONTEXT, $type: 'Entity', id: 'ent-fleetline', name: 'Fleetline Services Inc (demo)', ein: '00-3000002', entityType: 'C-Corp', jurisdiction: 'DE', status: 'active', formedOn: '2022-06-14', registeredAgentId: 'ra-harbor-de', parentId: 'ent-northgate', example: true, label: '[demo] Fictional operating subsidiary' },
  { $context: CONTEXT, $type: 'Entity', id: 'ent-harborline', name: 'Harborline Agency LLC (demo)', ein: '00-3000003', entityType: 'LLC', jurisdiction: 'TX', status: 'active', formedOn: '2023-01-30', registeredAgentId: 'ra-lonestar-tx', parentId: 'ent-northgate', example: true, label: '[demo] Fictional operating subsidiary' },
  { $context: CONTEXT, $type: 'Entity', id: 'ent-quillstone', name: 'Quillstone Labs Inc (demo)', ein: '00-3000004', entityType: 'C-Corp', jurisdiction: 'DE', status: 'active', formedOn: '2024-09-03', registeredAgentId: 'ra-harbor-de', parentId: 'ent-northgate', example: true, label: '[demo] Fictional operating subsidiary' },
]

export const FORMATIONS: SeedFormation[] = ENTITIES.map((e, ix) => ({
  $context: CONTEXT,
  $type: 'Formation',
  id: `f-${e.id.slice(4)}`,
  entityId: e.id,
  jurisdiction: e.jurisdiction,
  filingNumber: `DEMO-${e.jurisdiction}-${String(1001 + ix)}`,
  filedOn: e.formedOn,
  documentType: e.entityType === 'LLC' ? 'certificate-of-formation' : 'certificate-of-incorporation',
  example: true,
  label: `[demo] Formation record — ${e.name} (synthetic filing number, no real SoS filing)`,
}))

export const REGISTRATIONS: SeedRegistration[] = [
  // SoS good-standing mirror row per entity
  ...ENTITIES.map((e, ix): SeedRegistration => ({
    $context: CONTEXT,
    $type: 'Registration',
    id: `reg-sos-${e.id.slice(4)}`,
    entityId: e.id,
    registry: 'sos',
    identifier: `DEMO-${e.jurisdiction}-${String(1001 + ix)}`,
    status: 'good-standing',
    asOf: '2026-08-01',
    example: true,
    label: `[demo] SoS good-standing mirror row — ${e.name}`,
  })),
  // SAM/UEI rows for the two entities that contract federally in the demo world
  { $context: CONTEXT, $type: 'Registration', id: 'reg-sam-northgate', entityId: 'ent-northgate', registry: 'sam-uei', identifier: 'DEMO00000001', status: 'active', asOf: '2026-07-15', example: true, label: '[demo] SAM registration mirror row — synthetic UEI (DEMO prefix, not a real UEI)' },
  { $context: CONTEXT, $type: 'Registration', id: 'reg-sam-fleetline', entityId: 'ent-fleetline', registry: 'sam-uei', identifier: 'DEMO00000002', status: 'active', asOf: '2026-07-15', example: true, label: '[demo] SAM registration mirror row — synthetic UEI (DEMO prefix, not a real UEI)' },
  // one USAspending-grain award-recipient row
  { $context: CONTEXT, $type: 'Registration', id: 'reg-usasp-fleetline', entityId: 'ent-fleetline', registry: 'usaspending', identifier: 'DEMO-AWARD-0001', status: 'active', asOf: '2026-06-30', example: true, label: '[demo] USAspending recipient mirror row — synthetic award id' },
]

export const BOI_REPORTS: SeedBOIReport[] = ENTITIES.map((e) => ({
  $context: CONTEXT,
  $type: 'BOIReport',
  id: `boi-${e.id.slice(4)}`,
  entityId: e.id,
  status: e.id === 'ent-quillstone' ? 'exempt' : 'filed',
  filedOn: e.id === 'ent-quillstone' ? undefined : '2026-01-15',
  note: 'Filing-status record only — beneficial-owner personal data is never held in this corpus.',
  example: true,
  label: `[demo] BOI filing status — ${e.name} (no real FinCEN filing)`,
}))

export const REGISTERED_AGENTS: SeedRegisteredAgent[] = [
  { $context: CONTEXT, $type: 'RegisteredAgent', id: 'ra-harbor-de', name: 'Harbor Registered Agents LLC (demo)', jurisdiction: 'DE', entityIds: ['ent-northgate', 'ent-fleetline', 'ent-quillstone'], example: true, label: '[demo] Fictional Delaware agent of record' },
  { $context: CONTEXT, $type: 'RegisteredAgent', id: 'ra-lonestar-tx', name: 'Lone Star Agent Services LLC (demo)', jurisdiction: 'TX', entityIds: ['ent-harborline'], example: true, label: '[demo] Fictional Texas agent of record' },
]

/**
 * The renewal/compliance calendar. Statuses deliberately span
 * due | filed | overdue and jurisdictions span DE | TX | US-federal, so the
 * branching collection's `status` and `jurisdiction` filters genuinely
 * branch (OK / narrower OK / EMPTY).
 */
export const RENEWALS: SeedRenewal[] = [
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-northgate-de-2026', entityId: 'ent-northgate', obligation: 'DE annual franchise tax report', jurisdiction: 'DE', registry: 'sos', dueOn: '2026-06-01', status: 'filed', example: true, label: '[demo] Renewal — Northgate Holdings LLC (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-fleetline-de-2027', entityId: 'ent-fleetline', obligation: 'DE annual report + franchise tax', jurisdiction: 'DE', registry: 'sos', dueOn: '2027-03-01', status: 'due', example: true, label: '[demo] Renewal — Fleetline Services Inc (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-quillstone-de-2026', entityId: 'ent-quillstone', obligation: 'DE annual report + franchise tax', jurisdiction: 'DE', registry: 'sos', dueOn: '2026-03-01', status: 'overdue', example: true, label: '[demo] Renewal — Quillstone Labs Inc (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-harborline-tx-2026', entityId: 'ent-harborline', obligation: 'TX franchise tax report', jurisdiction: 'TX', registry: 'sos', dueOn: '2026-05-15', status: 'filed', example: true, label: '[demo] Renewal — Harborline Agency LLC (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-northgate-ra-2026', entityId: 'ent-northgate', obligation: 'Registered agent annual renewal', jurisdiction: 'DE', registry: 'registered-agent', dueOn: '2026-11-01', status: 'due', example: true, label: '[demo] Renewal — Northgate Holdings LLC (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-fleetline-ra-2026', entityId: 'ent-fleetline', obligation: 'Registered agent annual renewal', jurisdiction: 'DE', registry: 'registered-agent', dueOn: '2026-07-01', status: 'filed', example: true, label: '[demo] Renewal — Fleetline Services Inc (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-quillstone-ra-2026', entityId: 'ent-quillstone', obligation: 'Registered agent annual renewal', jurisdiction: 'DE', registry: 'registered-agent', dueOn: '2026-10-01', status: 'due', example: true, label: '[demo] Renewal — Quillstone Labs Inc (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-harborline-ra-2026', entityId: 'ent-harborline', obligation: 'Registered agent annual renewal', jurisdiction: 'TX', registry: 'registered-agent', dueOn: '2026-09-15', status: 'due', example: true, label: '[demo] Renewal — Harborline Agency LLC (demo)' },
  { $context: CONTEXT, $type: 'Renewal', id: 'ren-northgate-sam-2027', entityId: 'ent-northgate', obligation: 'SAM registration annual renewal', jurisdiction: 'US-federal', registry: 'sam-uei', dueOn: '2027-07-15', status: 'due', example: true, label: '[demo] Renewal — Northgate Holdings LLC (demo)' },
]

export const OWNERSHIP_STAKES: SeedOwnershipStake[] = [
  { $context: CONTEXT, $type: 'OwnershipStake', id: 'own-northgate-fleetline', parentId: 'ent-northgate', entityId: 'ent-fleetline', percent: 100, holderRole: 'parent holding company', example: true, label: '[demo] Ownership edge' },
  { $context: CONTEXT, $type: 'OwnershipStake', id: 'own-northgate-harborline', parentId: 'ent-northgate', entityId: 'ent-harborline', percent: 100, holderRole: 'parent holding company', example: true, label: '[demo] Ownership edge' },
  { $context: CONTEXT, $type: 'OwnershipStake', id: 'own-northgate-quillstone', parentId: 'ent-northgate', entityId: 'ent-quillstone', percent: 80, holderRole: 'parent holding company', example: true, label: '[demo] Ownership edge' },
  { $context: CONTEXT, $type: 'OwnershipStake', id: 'own-minority-quillstone', parentId: 'external', entityId: 'ent-quillstone', percent: 20, holderRole: 'unaffiliated minority holder (role label — counterparties below reporting grain are never named)', example: true, label: '[demo] Ownership edge' },
]
