/**
 * seed.js — the sandbox seed corpus for apis.education (register row
 * `education`), produced per template spec §5.2.
 *
 * DATA CLASS: every record here is LABELED SYNTHETIC EXAMPLE DATA
 * (`"example": true`) over FICTIONAL institutions, per estate fixture law
 * (no real company or person names, no real identifiers, secret-scan
 * clean). The live-demo ruling applies: this is the real product over
 * simulated data — the demo routes and the product routes are the same
 * handlers — never a faked demo.
 *
 * WHY SYNTHETIC (source-route honesty, probed 2026-08-23 in-session):
 *   - the register row's ingest candidates are flagged [UNVERIFIED — not
 *     named in estate docs]: IPEDS / College Scorecard;
 *   - College Scorecard API: probed keyless → 403 API_KEY_MISSING (keyed,
 *     not reachable keyless in-session);
 *   - IPEDS bulk (nces.ed.gov datacenter HD2023.zip): probed → 200. The
 *     feed answers, but the row's source route remains [UNVERIFIED] and
 *     unruled — a real-ingest decision is a register-level source-route
 *     verification, not a build-agent improvisation (§0: a row missing a
 *     field is a register defect, filed upstream).
 *   So wave zero ships the §5.2 labeled synthetic sandbox seed and records
 *   the probe outcomes here as provenance.
 *
 * No record here implies a ranking. Collections are alphabetical by id.
 */

const EXAMPLE_NOTE =
  'example data — synthetic sandbox record over fictional institutions, labeled per estate fixture law'

/** Fictional institutions (fixture law: no real-name collisions found in a
 *  reasonable-effort check; both names are deliberately implausible as
 *  legal names and carry the fictional marker). */
export const institutions = [
  {
    $type: 'EducationalOrganization',
    id: 'cobalt-harbor-cc',
    name: 'Cobalt Harbor Community College (fictional)',
    example: true,
  },
  {
    $type: 'EducationalOrganization',
    id: 'windrose-technical-institute',
    name: 'Windrose Technical Institute (fictional)',
    example: true,
  },
]

/** Course records — the row's data-ply record type (SC #20:
 *  "Course/credential record (schema.org-typed)"; generic fallback, no
 *  settled industry interchange standard on record). */
export const courseRecords = [
  {
    $type: 'Course',
    id: 'chcc-acct-101',
    courseCode: 'ACCT-101',
    name: 'Introduction to Bookkeeping',
    description: 'Double-entry fundamentals through a full monthly close cycle.',
    provider: institutions[0].name,
    educationalLevel: 'certificate',
    subject: 'business',
    timeRequired: 'P11W',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Course',
    id: 'chcc-bio-110',
    courseCode: 'BIO-110',
    name: 'General Biology I',
    description: 'Cell structure, genetics, and evolution with a weekly lab section.',
    provider: institutions[0].name,
    educationalLevel: 'associate',
    subject: 'science',
    timeRequired: 'P16W',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Course',
    id: 'chcc-eng-201',
    courseCode: 'ENG-201',
    name: 'Technical Writing',
    description: 'Documentation, specifications, and instructional text for working professionals.',
    provider: institutions[0].name,
    educationalLevel: 'associate',
    subject: 'humanities',
    timeRequired: 'P16W',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Course',
    id: 'chcc-mth-140',
    courseCode: 'MTH-140',
    name: 'College Algebra',
    description: 'Functions, polynomials, and exponential models; placement-exam preparation.',
    provider: institutions[0].name,
    educationalLevel: 'associate',
    subject: 'mathematics',
    timeRequired: 'P16W',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Course',
    id: 'wti-cyb-210',
    courseCode: 'CYB-210',
    name: 'Network Defense Fundamentals',
    description: 'Segmentation, monitoring, and incident-response drills on a lab network.',
    provider: institutions[1].name,
    educationalLevel: 'certificate',
    subject: 'information-technology',
    timeRequired: 'P12W',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Course',
    id: 'wti-hvc-105',
    courseCode: 'HVC-105',
    name: 'HVAC Systems I',
    description: 'Refrigeration cycle, load calculation, and safe handling practice.',
    provider: institutions[1].name,
    educationalLevel: 'certificate',
    subject: 'skilled-trades',
    timeRequired: 'P14W',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Course',
    id: 'wti-wld-120',
    courseCode: 'WLD-120',
    name: 'Structural Welding',
    description: 'SMAW and GMAW technique to plate-certification test standards.',
    provider: institutions[1].name,
    educationalLevel: 'certificate',
    subject: 'skilled-trades',
    timeRequired: 'P14W',
    example: true,
    note: EXAMPLE_NOTE,
  },
]

/** Credential records — EducationalOccupationalCredential, tied to the
 *  courses above. */
export const credentialRecords = [
  {
    $type: 'EducationalOccupationalCredential',
    id: 'cred-chcc-bookkeeping-certificate',
    name: 'Bookkeeping Certificate',
    credentialCategory: 'certificate',
    provider: institutions[0].name,
    courses: ['chcc-acct-101'],
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'EducationalOccupationalCredential',
    id: 'cred-chcc-general-studies-aa',
    name: 'Associate of Arts, General Studies',
    credentialCategory: 'degree',
    provider: institutions[0].name,
    courses: ['chcc-bio-110', 'chcc-eng-201', 'chcc-mth-140'],
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'EducationalOccupationalCredential',
    id: 'cred-wti-network-defense-certificate',
    name: 'Network Defense Certificate',
    credentialCategory: 'certificate',
    provider: institutions[1].name,
    courses: ['wti-cyb-210'],
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'EducationalOccupationalCredential',
    id: 'cred-wti-welding-certificate',
    name: 'Structural Welding Certificate',
    credentialCategory: 'certificate',
    provider: institutions[1].name,
    courses: ['wti-wld-120'],
    example: true,
    note: EXAMPLE_NOTE,
  },
]

/** Financial-aid artifact records — the row's FAFSA-class artifact grain
 *  (the fafsa.click door), DigitalDocument-typed. All identifiers are
 *  synthetic; no SSN-like or EIN-like values appear anywhere. */
export const aidArtifactRecords = [
  {
    $type: 'DigitalDocument',
    id: 'aid-award-letter-2026-demo-001',
    name: 'Financial aid award letter (demo)',
    documentClass: 'award-letter',
    provider: institutions[0].name,
    awardYear: '2026-27',
    student: 'Demo Student A (fictional)',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    id: 'aid-isir-summary-2026-demo-001',
    name: 'ISIR summary (demo)',
    documentClass: 'isir-summary',
    provider: institutions[0].name,
    awardYear: '2026-27',
    student: 'Demo Student A (fictional)',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    id: 'aid-verification-worksheet-2026-demo-002',
    name: 'Verification worksheet (demo)',
    documentClass: 'verification-worksheet',
    provider: institutions[1].name,
    awardYear: '2026-27',
    student: 'Demo Student B (fictional)',
    example: true,
    note: EXAMPLE_NOTE,
  },
]
