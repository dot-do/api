/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types. Deterministic (no RNG):
 * reseeding is a build step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; labels carry the demo disclosure
 *   - fictional provider group ("Cascade Ridge Medical Group (demo)") in a
 *     fictional city (Bellhaven); fictional payers; NO real company names
 *   - providers appear as ROLE LABELS ("family-medicine physician (role
 *     label — not a person)"), never as named people — this is the
 *     [COUNSEL] boundary enforced at the fixture layer: NPPES/PECOS-style
 *     person-anchored registry records are NOT published as data; the
 *     sandbox serves labeled synthetic derivatives in the registry RECORD
 *     SHAPE only (see `provenance` on every Provider)
 *   - synthetic identifiers: DEMO- prefixed NPIs, license numbers, plan and
 *     procedure codes — never a real NPI (NPIs issue from a checksummed
 *     10-digit namespace; the DEMO- prefix is outside it by construction),
 *     never a real code set (CPT is licensed; DEMO- codes claim nothing)
 *   - the NPPES public API was probed honestly this session (class A
 *     confirmed — see README); ZERO probed records were ingested into this
 *     corpus or shipped anywhere
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation — a
 * roster spanning ambulatory (621) and hospital (622) grains, credentials in
 * every lifecycle status the filters branch on, enrollment packets across
 * the full PECOS-grain lifecycle (draft/ready/submitted/approved), prior-auth
 * artifacts in every disposition, eligibility records for every payer, and
 * superbills whose line items sum exactly to their totals.
 */

import { CREDENTIAL_KINDS, ENROLLMENT_STATUSES } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

export const COUNSEL_BOUNDARY =
  'Data boundary [COUNSEL]: NPPES/PECOS public credentialing registries are class-A sources and may be ingested, ' +
  'but person-anchored public-registry records are NOT published as a data product on this surface — ' +
  'sandbox exposure is only through clearly-labeled synthetic derivatives in the registry record shape. ' +
  'Non-PHI admin artifacts only; no clinical (FHIR-clinical) resource is served.'

const CONTEXT = 'https://schema.org.ai'

export type CredentialKind = (typeof CREDENTIAL_KINDS)[number]
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export interface SeedProvider {
  $context: string
  $type: 'Provider'
  id: string
  /** role label, NEVER a person's name — the [COUNSEL] fixture rule */
  providerRole: string
  enumerationType: 'individual' | 'organization'
  /** DEMO- namespace: outside the real NPI namespace by construction */
  npi: string
  specialty: string
  state: string
  status: 'active' | 'pending-verification' | 'lapsed'
  provenance: string
  example: true
  label: string
}

export interface SeedCredential {
  $context: string
  $type: 'Credential'
  id: string
  providerId: string
  kind: CredentialKind
  identifier: string
  issuedBy: string
  status: 'active' | 'expiring' | 'expired' | 'pending-verification'
  expiresOn: string
  example: true
  label: string
}

export interface SeedEnrollment {
  $context: string
  $type: 'Enrollment'
  id: string
  providerId: string
  payerId: string
  credentialIds: string[]
  status: EnrollmentStatus
  openedOn: string
  example: true
  label: string
}

export interface SeedPriorAuthArtifact {
  $context: string
  $type: 'PriorAuthArtifact'
  id: string
  providerId: string
  payerId: string
  serviceCode: string
  disposition: 'approved' | 'pended' | 'denied'
  requestedOn: string
  example: true
  label: string
}

export interface SeedEligibilityRecord {
  $context: string
  $type: 'EligibilityRecord'
  id: string
  providerId: string
  payerId: string
  subscriberRole: string
  planCode: string
  coverageActive: boolean
  checkedOn: string
  example: true
  label: string
}

export interface SuperbillLine {
  procedureCode: string
  description: string
  units: number
  charge: number
}

export interface SeedSuperbill {
  $context: string
  $type: 'Superbill'
  id: string
  providerId: string
  payerId: string
  encounterDate: string
  lines: SuperbillLine[]
  total: number
  currency: 'USD'
  example: true
  label: string
}

const SYNTHETIC = `[demo — synthetic example data] ${RETENTION_NOTE}`

const PROVIDER_PROVENANCE =
  'synthetic derivative in the NPPES/PECOS record shape — no real registry record was ingested into or published from this corpus (the [COUNSEL] publishing boundary); schema derived from the public NPPES v2.1 record shape, probed 2026-08-23'

/** The demo tenant — tenant #1 on the production substrate (live-demo ruling). */
export const OPERATOR = {
  $context: CONTEXT,
  $type: 'Organization',
  id: 't-cascade-ridge',
  name: 'Cascade Ridge Medical Group (demo)',
  note: 'fictional multi-specialty provider group in a fictional city (Bellhaven) — the credentialing tenant of this sandbox',
  example: true as const,
  label: SYNTHETIC,
}

/** Fictional payers — the roster-product buyer side of the row ICP. */
export const PAYERS = [
  { $context: CONTEXT, $type: 'Payer', id: 'payer-bellhaven-mutual', name: 'Bellhaven Mutual Health (demo)', example: true as const, label: SYNTHETIC },
  { $context: CONTEXT, $type: 'Payer', id: 'payer-harborstone', name: 'Harborstone Benefit Plans (demo)', example: true as const, label: SYNTHETIC },
] as const

const provider = (
  n: number,
  providerRole: string,
  enumerationType: SeedProvider['enumerationType'],
  specialty: string,
  status: SeedProvider['status'],
): SeedProvider => ({
  $context: CONTEXT,
  $type: 'Provider',
  id: `prov-${n}`,
  providerRole: `${providerRole} (role label — not a person)`,
  enumerationType,
  npi: `DEMO-${String(n).padStart(10, '0')}`,
  specialty,
  state: 'Bellhaven (demo jurisdiction)',
  status,
  provenance: PROVIDER_PROVENANCE,
  example: true,
  label: SYNTHETIC,
})

/**
 * The roster: spans the row's 621 (ambulatory) and 622 (hospital) grains and
 * every status the branching collection filters on. prov-1 is the NPI-2
 * organization record — note the NPPES org record shape itself carries
 * person-anchored authorized-official fields; the synthetic derivative
 * deliberately does not reproduce them (the [COUNSEL] boundary).
 */
export const PROVIDERS: SeedProvider[] = [
  provider(1, 'multi-specialty group practice (organization record)', 'organization', 'multi-specialty', 'active'),
  provider(2, 'family-medicine physician', 'individual', 'family-medicine', 'active'),
  provider(3, 'cardiologist', 'individual', 'cardiology', 'active'),
  provider(4, 'general dentist', 'individual', 'dental-general', 'active'),
  provider(5, 'nurse practitioner', 'individual', 'family-medicine', 'pending-verification'),
  provider(6, 'physical therapist', 'individual', 'physical-therapy', 'active'),
  provider(7, 'hospitalist (622 grain)', 'individual', 'hospital-medicine', 'active'),
  provider(8, 'general surgeon', 'individual', 'surgery-general', 'lapsed'),
]

const credential = (
  n: number,
  providerId: string,
  kind: CredentialKind,
  status: SeedCredential['status'],
  expiresOn: string,
): SeedCredential => ({
  $context: CONTEXT,
  $type: 'Credential',
  id: `cred-${n}`,
  providerId,
  kind,
  identifier: `DEMO-${kind === 'state-license' ? 'LIC' : kind === 'board-certification' ? 'CERT' : 'REG'}-${String(n).padStart(4, '0')}`,
  issuedBy:
    kind === 'state-license'
      ? 'Bellhaven Board of Medicine (demo)'
      : kind === 'board-certification'
        ? 'Demo Specialty Board (fictional)'
        : 'Demo Registration Authority (fictional)',
  status,
  expiresOn,
  example: true,
  label: SYNTHETIC,
})

/** Every lifecycle status is present; every provider carries >= 1 credential. */
export const CREDENTIALS: SeedCredential[] = [
  credential(1, 'prov-1', 'state-license', 'active', '2027-06-30'),
  credential(2, 'prov-2', 'state-license', 'active', '2027-03-31'),
  credential(3, 'prov-2', 'board-certification', 'active', '2028-12-31'),
  credential(4, 'prov-3', 'state-license', 'active', '2027-09-30'),
  credential(5, 'prov-3', 'board-certification', 'expiring', '2026-10-31'),
  credential(6, 'prov-3', 'controlled-substance-registration', 'active', '2027-01-31'),
  credential(7, 'prov-4', 'state-license', 'active', '2027-05-31'),
  credential(8, 'prov-5', 'state-license', 'pending-verification', '2027-08-31'),
  credential(9, 'prov-6', 'state-license', 'active', '2027-11-30'),
  credential(10, 'prov-7', 'state-license', 'active', '2027-02-28'),
  credential(11, 'prov-7', 'board-certification', 'active', '2029-06-30'),
  credential(12, 'prov-8', 'state-license', 'expired', '2026-04-30'),
]

const enrollment = (n: number, providerId: string, payerId: string, credentialIds: string[], status: EnrollmentStatus): SeedEnrollment => ({
  $context: CONTEXT,
  $type: 'Enrollment',
  id: `enr-${n}`,
  providerId,
  payerId,
  credentialIds,
  status,
  openedOn: `2026-0${Math.min(8, n + 2)}-01`,
  example: true,
  label: SYNTHETIC,
})

/** The full PECOS-grain lifecycle; enr-2 is the 'ready' packet the 402 test submits. */
export const ENROLLMENTS: SeedEnrollment[] = [
  enrollment(1, 'prov-2', 'payer-bellhaven-mutual', ['cred-2', 'cred-3'], 'approved'),
  enrollment(2, 'prov-3', 'payer-bellhaven-mutual', ['cred-4', 'cred-5', 'cred-6'], 'ready'),
  enrollment(3, 'prov-4', 'payer-harborstone', ['cred-7'], 'submitted'),
  enrollment(4, 'prov-5', 'payer-harborstone', ['cred-8'], 'draft'),
  enrollment(5, 'prov-6', 'payer-bellhaven-mutual', ['cred-9'], 'approved'),
  enrollment(6, 'prov-7', 'payer-harborstone', ['cred-10', 'cred-11'], 'ready'),
]

const priorAuth = (n: number, providerId: string, payerId: string, disposition: SeedPriorAuthArtifact['disposition']): SeedPriorAuthArtifact => ({
  $context: CONTEXT,
  $type: 'PriorAuthArtifact',
  id: `pa-${n}`,
  providerId,
  payerId,
  serviceCode: `DEMO-SVC-${String(n).padStart(3, '0')}`,
  disposition,
  requestedOn: `2026-08-0${n}`,
  example: true,
  label: `${SYNTHETIC} X12 278-shaped admin artifact — synthetic, no real transaction`,
})

export const PRIOR_AUTH_ARTIFACTS: SeedPriorAuthArtifact[] = [
  priorAuth(1, 'prov-3', 'payer-bellhaven-mutual', 'approved'),
  priorAuth(2, 'prov-3', 'payer-harborstone', 'pended'),
  priorAuth(3, 'prov-6', 'payer-bellhaven-mutual', 'approved'),
  priorAuth(4, 'prov-7', 'payer-harborstone', 'denied'),
  priorAuth(5, 'prov-2', 'payer-bellhaven-mutual', 'approved'),
]

const eligibility = (n: number, providerId: string, payerId: string, coverageActive: boolean): SeedEligibilityRecord => ({
  $context: CONTEXT,
  $type: 'EligibilityRecord',
  id: `elig-${n}`,
  providerId,
  payerId,
  subscriberRole: 'demo subscriber (role label — not a person)',
  planCode: `DEMO-PLAN-${String(n).padStart(3, '0')}`,
  coverageActive,
  checkedOn: '2026-08-22',
  example: true,
  label: `${SYNTHETIC} X12 270/271-shaped admin record — synthetic, no real inquiry`,
})

export const ELIGIBILITY_RECORDS: SeedEligibilityRecord[] = [
  eligibility(1, 'prov-2', 'payer-bellhaven-mutual', true),
  eligibility(2, 'prov-3', 'payer-bellhaven-mutual', true),
  eligibility(3, 'prov-4', 'payer-harborstone', true),
  eligibility(4, 'prov-5', 'payer-harborstone', false),
  eligibility(5, 'prov-6', 'payer-bellhaven-mutual', true),
  eligibility(6, 'prov-7', 'payer-harborstone', true),
]

const superbill = (n: number, providerId: string, payerId: string, encounterDate: string, lines: SuperbillLine[]): SeedSuperbill => ({
  $context: CONTEXT,
  $type: 'Superbill',
  id: `sb-${n}`,
  providerId,
  payerId,
  encounterDate,
  lines,
  total: Math.round(lines.reduce((sum, l) => sum + l.units * l.charge, 0) * 100) / 100,
  currency: 'USD',
  example: true,
  label: `${SYNTHETIC} DEMO- procedure codes — no real code set (CPT is licensed) is reproduced or claimed`,
})

/** Line items sum EXACTLY to totals (internal-consistency law, tested). */
export const SUPERBILLS: SeedSuperbill[] = [
  superbill(1, 'prov-2', 'payer-bellhaven-mutual', '2026-08-10', [
    { procedureCode: 'DEMO-99213', description: 'established patient visit, level 3 (demo)', units: 1, charge: 145.0 },
    { procedureCode: 'DEMO-36415', description: 'specimen collection (demo)', units: 1, charge: 18.5 },
  ]),
  superbill(2, 'prov-3', 'payer-bellhaven-mutual', '2026-08-11', [
    { procedureCode: 'DEMO-93000', description: 'electrocardiogram with interpretation (demo)', units: 1, charge: 210.0 },
    { procedureCode: 'DEMO-99214', description: 'established patient visit, level 4 (demo)', units: 1, charge: 205.75 },
  ]),
  superbill(3, 'prov-4', 'payer-harborstone', '2026-08-12', [
    { procedureCode: 'DEMO-D0120', description: 'periodic oral evaluation (demo)', units: 1, charge: 85.0 },
    { procedureCode: 'DEMO-D1110', description: 'prophylaxis, adult (demo)', units: 1, charge: 130.0 },
  ]),
  superbill(4, 'prov-6', 'payer-bellhaven-mutual', '2026-08-14', [
    { procedureCode: 'DEMO-97110', description: 'therapeutic exercise, 15 min (demo)', units: 4, charge: 62.25 },
  ]),
]
