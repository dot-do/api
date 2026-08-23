/**
 * seed.js — the sandbox seed corpus for apis.estate (register row
 * real-estate), produced per template spec §5.2.
 *
 * DATA CLASS: EVERY record in this file is MECHANICALLY GENERATED, LABELED
 * EXAMPLE DATA (`"example": true`, "[demo]" prefix on every name/title
 * field). Source-route honesty (§7.3): the row's route is public-licensable
 * county recorder/title ingest across ~3,100 counties with NO national
 * interchange standard and no single class-A feed reachable in-session — the
 * register itself records the corpus as county-grained. So wave zero serves
 * the §5.2 labeled synthetic seed, never a pretended ingest. Real-corpus
 * ingest is deferred behind a per-county data-door build.
 *
 * Fixture law: fictional counties (jurisdiction code "ZZ" — no US state),
 * fictional parties and companies (every one marked "(fictional)"), synthetic
 * ZZ-prefixed parcel/instrument identifiers, no real addresses, EINs, or
 * recording numbers. Secret-scan clean by construction.
 *
 * MONEY/ESCROW EXCLUSION (permanent, from the row): no settlement statement,
 * no disbursement, no wire instruction appears in any packet — the money
 * layer is gated on licensure + the A1 settlement module and is not this
 * substrate's to serve.
 *
 * No record here implies a ranking. Collections are alphabetical by id.
 */

const NOTE = 'example data — synthetic sandbox seed, labeled per estate fixture law'

/** ClosingPacket — THE closing packet (SC #10), the row's ruled white-space
 *  record. Each packet's `documents` reference real ids in the lien-waiver /
 *  payoff-letter / deed collections below (internal consistency per §5.2:
 *  a demo packet HAS its documents). */
export const closingPackets = [
  {
    $type: 'ClosingPacket',
    id: 'zz-packet-0001',
    name: '[demo] purchase closing — 100 Example Lane',
    kind: 'purchase',
    county: 'Example County, ZZ',
    property: {
      address: '100 Example Lane, Exampleville, ZZ 00000 (fictional)',
      parcel: 'ZZ-APN-000-0001',
    },
    parties: {
      buyer: '[demo] Avery Example (fictional person)',
      seller: '[demo] Riley Sample (fictional person)',
      titleAgent: '[demo] Alder & Vine Title LLC (fictional company)',
    },
    closingDate: '2026-08-14',
    status: 'assembled',
    documents: ['zz-waiver-0001', 'zz-waiver-0002', 'zz-payoff-0001', 'zz-deed-0001'],
    exclusions: 'no settlement statement, disbursement, or wire instruction — the money/escrow layer is permanently out of scope (licensure + A1 gate)',
    example: true,
    note: NOTE,
  },
  {
    $type: 'ClosingPacket',
    id: 'zz-packet-0002',
    name: '[demo] refinance closing — 22 Sample Court',
    kind: 'refinance',
    county: 'Example County, ZZ',
    property: {
      address: '22 Sample Court, Exampleville, ZZ 00000 (fictional)',
      parcel: 'ZZ-APN-000-0002',
    },
    parties: {
      borrower: '[demo] Kai Placeholder (fictional person)',
      lender: '[demo] Example Mortgage Co. (fictional company)',
      titleAgent: '[demo] Alder & Vine Title LLC (fictional company)',
    },
    closingDate: '2026-08-19',
    status: 'assembled',
    documents: ['zz-payoff-0002', 'zz-deed-0002'],
    exclusions: 'no settlement statement, disbursement, or wire instruction — the money/escrow layer is permanently out of scope (licensure + A1 gate)',
    example: true,
    note: NOTE,
  },
  {
    $type: 'ClosingPacket',
    id: 'zz-packet-0003',
    name: '[demo] purchase closing — 7 Demo Ridge Road',
    kind: 'purchase',
    county: 'Sample County, ZZ',
    property: {
      address: '7 Demo Ridge Road, Sampleton, ZZ 00001 (fictional)',
      parcel: 'ZZ-APN-001-0007',
    },
    parties: {
      buyer: '[demo] Rowan Specimen (fictional person)',
      seller: '[demo] Ash Exemplar (fictional person)',
      titleAgent: '[demo] Meridian Closing Group (fictional company)',
    },
    closingDate: '2026-08-21',
    status: 'in-assembly',
    documents: ['zz-waiver-0003'],
    exclusions: 'no settlement statement, disbursement, or wire instruction — the money/escrow layer is permanently out of scope (licensure + A1 gate)',
    example: true,
    note: NOTE,
  },
]

/** LienWaiver — SHARED FACE with the construction row (SC #10/#13); built
 *  under the real-estate row key, collision recorded in ../REGISTER-NOTE.md. */
export const lienWaivers = [
  {
    $type: 'LienWaiver',
    id: 'zz-waiver-0001',
    name: '[demo] conditional progress lien waiver — framing',
    kind: 'conditional',
    stage: 'progress',
    claimant: '[demo] Cornerstone Framing Co. (fictional company)',
    parcel: 'ZZ-APN-000-0001',
    amount: 12500,
    currency: 'USD',
    throughDate: '2026-07-31',
    example: true,
    note: NOTE,
  },
  {
    $type: 'LienWaiver',
    id: 'zz-waiver-0002',
    name: '[demo] unconditional final lien waiver — roofing',
    kind: 'unconditional',
    stage: 'final',
    claimant: '[demo] Ridgeline Roofing LLC (fictional company)',
    parcel: 'ZZ-APN-000-0001',
    amount: 8400,
    currency: 'USD',
    throughDate: '2026-08-08',
    example: true,
    note: NOTE,
  },
  {
    $type: 'LienWaiver',
    id: 'zz-waiver-0003',
    name: '[demo] conditional final lien waiver — sitework',
    kind: 'conditional',
    stage: 'final',
    claimant: '[demo] Broadstone Sitework Inc. (fictional company)',
    parcel: 'ZZ-APN-001-0007',
    amount: 21900,
    currency: 'USD',
    throughDate: '2026-08-15',
    example: true,
    note: NOTE,
  },
]

/** PayoffLetter — lender payoff statements at the document grain (figures are
 *  demo figures on fictional loans; nothing here moves money). */
export const payoffLetters = [
  {
    $type: 'PayoffLetter',
    id: 'zz-payoff-0001',
    name: '[demo] payoff letter — loan ZZ-LN-000481',
    lender: '[demo] Example Mortgage Co. (fictional company)',
    loanNumber: 'ZZ-LN-000481',
    parcel: 'ZZ-APN-000-0001',
    payoffAmount: 184211.17,
    perDiem: 21.4,
    currency: 'USD',
    goodThrough: '2026-08-31',
    example: true,
    note: NOTE,
  },
  {
    $type: 'PayoffLetter',
    id: 'zz-payoff-0002',
    name: '[demo] payoff letter — loan ZZ-LN-002207',
    lender: '[demo] Placeholder Savings Bank (fictional company)',
    loanNumber: 'ZZ-LN-002207',
    parcel: 'ZZ-APN-000-0002',
    payoffAmount: 96450.02,
    perDiem: 11.05,
    currency: 'USD',
    goodThrough: '2026-09-05',
    example: true,
    note: NOTE,
  },
]

/** Deed — the county-recorder grain (book/page/instrument synthetic). */
export const deeds = [
  {
    $type: 'Deed',
    id: 'zz-deed-0001',
    name: '[demo] warranty deed — 100 Example Lane',
    kind: 'warranty',
    grantor: '[demo] Riley Sample (fictional person)',
    grantee: '[demo] Avery Example (fictional person)',
    parcel: 'ZZ-APN-000-0001',
    recording: { county: 'Example County, ZZ', book: 'ZZ-0042', page: '117', instrument: 'ZZ-2026-000123' },
    recordedAt: '2026-08-14',
    example: true,
    note: NOTE,
  },
  {
    $type: 'Deed',
    id: 'zz-deed-0002',
    name: '[demo] deed of trust — 22 Sample Court',
    kind: 'deed-of-trust',
    grantor: '[demo] Kai Placeholder (fictional person)',
    grantee: '[demo] Example Mortgage Co. (fictional company)',
    parcel: 'ZZ-APN-000-0002',
    recording: { county: 'Example County, ZZ', book: 'ZZ-0042', page: '203', instrument: 'ZZ-2026-000124' },
    recordedAt: '2026-08-19',
    example: true,
    note: NOTE,
  },
]
