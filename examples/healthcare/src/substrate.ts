/**
 * substrate.ts — Stratum A: the G3 substrate `healthcare`, instantiated from
 * the register row (docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key "healthcare") per the property template spec §1.
 *
 * Founder ruling (issue #9, 2026-08-23 evening): the healthcare BUILD gate is
 * LIFTED — same regulation unlock as every regulated cell: the headless system
 * of record carries no regulatory blocker, the licensed operator is the
 * customer. The narrow [COUNSEL] flag survives ONLY on publishing
 * person-anchored public-registry records as data — a data-ply decision,
 * not a build blocker. That boundary is enforced in ./seed.ts (labeled
 * synthetic derivatives only) and stated on every published surface.
 *
 * Row facts this file is built from (never re-derived):
 *   - G1 anchors: NAICS 62 (621 ambulatory, 622 hospitals); FHIR 65 resources
 *     (clinical — regulation-blocked at breadth; only the ADMIN edge is
 *     served here); X12 transaction sets for admin interchange (edi834
 *     enrollment named in the estate regulation-decomposition set; 270/271
 *     eligibility and 278 prior-auth numbers are [UNVERIFIED] in estate
 *     docs and are not restated as verified here); NPPES/PECOS as the
 *     public credentialing registries (SC route 10); O*NET: EHR modal at
 *     190 occupations (contested, no instantiation).
 *   - data ply (ruled): NON-PHI ADMIN ARTIFACTS ONLY — roster/credential
 *     record (NPPES/PECOS-sourced), prior-auth artifact, superbill/EOB,
 *     eligibility records.
 *   - headless ply: credentialing/enrollment system (the derived
 *     instantiation, SC #12) — built FIRST as the least-disputed grain; the
 *     EHR abstraction stays in the 52-System catalog (Epic-class incumbents,
 *     contested — no instantiation); practice-management/scheduling is the
 *     EO-preferred grain of the OPEN entry-grain dispute (recorded in the
 *     served projection config, not resolved here).
 *   - source route: public-licensable ingest — NPPES / PECOS / state boards
 *     (SC route 10, class A: "the rare healthcare door whose source data is
 *     public and whose artifact is not PHI"); enrichment ladder: registry
 *     ingest → unified provider record → enrollment-packet automation →
 *     payer-side roster products. Probed honestly this session (see README);
 *     nothing ingested is published — the [COUNSEL] publishing boundary
 *     keeps the wave-zero corpus a labeled synthetic derivative.
 *
 * The `APIProduct` interface is the spec §1 sketch, defined LOCALLY for now:
 * the normative definition lands in primitives.org.ai `digital-products`
 * (prove-then-extract — this example is a proving instance, not the home).
 *
 * Nothing in this file is brand, ICP, motion, offer, price, or positioning —
 * those are G4 projection fields (../projections/*.json, spec §2). The name
 * pair (api.hospital vs apis.healthcare) is an OPEN #33 curation item: this
 * substrate is keyed on the ROW KEY and claims neither name.
 */

export type NounBinding = 'ingested' | 'generated' | 'native' | 'federated'

export interface NounDef {
  /** canonical Noun name, PascalCase (UPPERCASE acronyms stay uppercase) */
  noun: string
  /** $type → schema.org.ai identity (falls back to schema.org generics per cascade rule 2) */
  schema: string
  binding: NounBinding
  verbs: string[]
  /** why this binding — provenance metadata per the row's source route */
  bindingNote: string
}

export interface SystemCoordinate {
  system: string
  coordinates: string[]
}

export interface OperationDef {
  /** OpenAPI operationId — the only thing a rate card may price */
  operation: string
  method: 'GET' | 'POST'
  path: string
  noun: string
  summary: string
}

export interface APIProduct {
  substrate: string
  nouns: NounDef[]
  systems: SystemCoordinate[]
  transports: string[]
  operations: OperationDef[]
  /** §5.2 sandbox: seed spec is versioned with the manifest; reseed = build step */
  sandbox: { seedModule: string; seedVersion: string; tenancyNote: string }
  /** one meter per operation, tagged per spec §6.4 at emit time */
  meters: { operation: string }[]
}

/** Credential kinds the credentialing system of record tracks (admin, non-PHI). */
export const CREDENTIAL_KINDS = ['state-license', 'board-certification', 'controlled-substance-registration'] as const

/** Enrollment packet statuses (PECOS-grain payer-enrollment lifecycle). */
export const ENROLLMENT_STATUSES = ['draft', 'ready', 'submitted', 'approved'] as const

export const OPERATIONS: OperationDef[] = [
  { operation: 'listProviders', method: 'GET', path: '/providers', noun: 'Provider', summary: 'The branching provider-roster collection — typed OK | EMPTY | BLOCKED on one pathname, branching on specialty, state, and status' },
  { operation: 'getProvider', method: 'GET', path: '/providers/{id}', noun: 'Provider', summary: 'One provider roster record by id' },
  { operation: 'listCredentials', method: 'GET', path: '/credentials', noun: 'Credential', summary: 'Credential records (licenses, board certifications, registrations) — the credentialing system-of-record door' },
  { operation: 'getCredential', method: 'GET', path: '/credentials/{id}', noun: 'Credential', summary: 'One credential record by id' },
  { operation: 'addCredential', method: 'POST', path: '/credentials', noun: 'Credential', summary: 'Attach a credential record to a provider (sandbox: ephemeral workspace)' },
  { operation: 'listEnrollments', method: 'GET', path: '/enrollments', noun: 'Enrollment', summary: 'Payer-enrollment packets (PECOS-grain lifecycle: draft → ready → submitted → approved)' },
  { operation: 'getEnrollment', method: 'GET', path: '/enrollments/{id}', noun: 'Enrollment', summary: 'One enrollment packet by id' },
  { operation: 'createEnrollment', method: 'POST', path: '/enrollments', noun: 'Enrollment', summary: 'Open a payer-enrollment packet for a provider (sandbox: ephemeral workspace)' },
  { operation: 'submitEnrollment', method: 'POST', path: '/enrollments/{id}/submit', noun: 'Enrollment', summary: 'Submit a ready enrollment packet to a payer (outcome grain — the enrollment-packet-automation rung) — answers the 402 OFFER boundary' },
  { operation: 'listPriorAuthArtifacts', method: 'GET', path: '/prior-auth-artifacts', noun: 'PriorAuthArtifact', summary: 'Prior-authorization artifacts (X12 278-shaped admin records; a disputed entry grain served as data only)' },
  { operation: 'getPriorAuthArtifact', method: 'GET', path: '/prior-auth-artifacts/{id}', noun: 'PriorAuthArtifact', summary: 'One prior-auth artifact by id' },
  { operation: 'listEligibilityRecords', method: 'GET', path: '/eligibility-records', noun: 'EligibilityRecord', summary: 'Eligibility records (X12 270/271-shaped admin records)' },
  { operation: 'getEligibilityRecord', method: 'GET', path: '/eligibility-records/{id}', noun: 'EligibilityRecord', summary: 'One eligibility record by id' },
  { operation: 'checkEligibility', method: 'GET', path: '/eligibility-records/check', noun: 'EligibilityRecord', summary: 'Check coverage for a provider × payer pair against the sandbox corpus (270/271-style inquiry)' },
  { operation: 'listSuperbills', method: 'GET', path: '/superbills', noun: 'Superbill', summary: 'Superbill/EOB artifacts (line-itemed encounter billing records, non-PHI demo shape)' },
  { operation: 'getSuperbill', method: 'GET', path: '/superbills/{id}', noun: 'Superbill', summary: 'One superbill by id' },
]

export const substrate: APIProduct = {
  substrate: 'healthcare',
  nouns: [
    {
      noun: 'Provider',
      schema: 'https://schema.org.ai/Practitioner',
      binding: 'generated',
      verbs: ['list', 'get'],
      bindingNote:
        'FHIR Practitioner-typed ADMIN record (FHIR is the sector-settled schema per the row; clinical resources are regulation-blocked at breadth — only the admin edge is served). The source route is ruled class A (NPPES/PECOS, SC route 10) and was probed honestly this session, but the surviving [COUNSEL] flag bars publishing person-anchored public-registry records as a data product — so the wave-zero corpus is a labeled SYNTHETIC DERIVATIVE in NPPES record shape (role labels, DEMO-namespace identifiers, no real registry record shipped). Flipping to `ingested` is gated on counsel sign-off on the PUBLISHING boundary, never on the build.',
    },
    {
      noun: 'Credential',
      schema: 'https://schema.org.ai/Credential',
      binding: 'native',
      verbs: ['list', 'get', 'add'],
      bindingNote:
        'the credentialing system-of-record door (row headless ply, SC #12 derived instantiation — the LEAST-DISPUTED grain of the open entry-grain dispute, built first). FHIR Practitioner.qualification grain, admin-only. The operator (practice, group, hospital) brings the license — headless systems of record carry no regulatory blocker (spec §3.2 regulation unlock, the #9 founder ruling).',
    },
    {
      noun: 'Enrollment',
      schema: 'https://schema.org.ai/Enrollment',
      binding: 'native',
      verbs: ['list', 'get', 'create', 'submit'],
      bindingNote:
        'payer-enrollment packet (PECOS grain) — the enrollment-packet-automation rung of the row enrichment ladder (registry ingest → unified provider record → enrollment-packet automation → payer-side roster products). X12 834 is the enrollment interchange named in the estate regulation-decomposition set; no packet leaves this sandbox (submit answers the 402 OFFER boundary; settlement rail not activated).',
    },
    {
      noun: 'PriorAuthArtifact',
      schema: 'https://schema.org.ai/PriorAuthArtifact',
      binding: 'generated',
      verbs: ['list', 'get'],
      bindingNote:
        'X12 278-shaped prior-authorization admin artifact (the 278 designation is [UNVERIFIED] in estate docs and not restated as verified). This is the DC-preferred entry grain of the OPEN grain dispute — served here as data-ply records only; no prior-auth System is instantiated or claimed. Labeled synthetic corpus; the artifact-door name priorauth is held by the estate and not claimed by this build.',
    },
    {
      noun: 'EligibilityRecord',
      schema: 'https://schema.org.ai/EligibilityRecord',
      binding: 'generated',
      verbs: ['list', 'get', 'check'],
      bindingNote:
        'X12 270/271-shaped eligibility admin record ([UNVERIFIED] set numbers, per row). Eligibility/scheduling is the EO-preferred entry grain of the OPEN dispute — served as data-ply records + a check inquiry against the sandbox corpus only; no scheduling System is instantiated or claimed.',
    },
    {
      noun: 'Superbill',
      schema: 'https://schema.org.ai/Superbill',
      binding: 'generated',
      verbs: ['list', 'get'],
      bindingNote:
        'superbill/EOB billing artifact (row data ply; the artifact-door names superbill/soapnotes are held by the estate and not claimed by this build). Labeled synthetic line-item records with DEMO-namespace procedure codes — no real code-set (CPT is licensed) is reproduced or claimed.',
    },
  ],
  systems: [
    // Row headless ply: the credentialing/enrollment system — the SC #12
    // derived instantiation, chosen FIRST because it is the least-disputed
    // grain of the open entry-grain dispute (credentialing vs prior-auth vs
    // scheduling — recorded in ../projections/healthcare.org.ai.json).
    // The EHR abstraction (O*NET-modal at 190 occupations, Epic-class
    // incumbents) stays in the 52-System catalog: no instantiation here.
    { system: 'Credentialing', coordinates: ['healthcare-provider-organizations'] },
  ],
  transports: ['REST', 'MCP'], // live-only: RPC / CapnWeb / HATEOAS-full arrive with the workers.do lane (spec §7.2); nothing unbuilt is declared
  operations: OPERATIONS,
  sandbox: {
    seedModule: './seed.ts',
    seedVersion: '1.0.0',
    tenancyNote:
      'seed tenant = tenant #1 on the same handlers as product (live-demo ruling: real product over simulated data, never a faked demo); anonymous writes are ephemeral (in-memory, per-isolate) with disclosed retention; every seed record is a labeled synthetic derivative — the [COUNSEL] boundary keeps person-anchored public-registry records out of the published corpus',
  },
  meters: OPERATIONS.map((o) => ({ operation: o.operation })),
}
