/**
 * seed.js — the sandbox seed corpus for apis.mortgage (register row
 * `mortgage`), produced per template spec §5.2.
 *
 * DATA CLASS, per record set:
 *
 *   - LenderMarketRecord records: REAL. Each record is one aggregation row
 *     from the FFIEC HMDA Data Browser API (the row's ruled Class A
 *     public-licensable ingest), fetched live in-session on 2026-08-23 —
 *     the exact query URL is stamped on every record. HMDA is public data
 *     published by the FFIEC/CFPB; nothing is restated beyond what the API
 *     itself returned.
 *   - LoanFile records: LABELED EXAMPLE DATA (`"example": true`) — MISMO-
 *     flavored typed loan files over fictional lenders, per estate fixture
 *     law (no real company or person names; borrower PII is never on this
 *     face at all — synthetic or otherwise). Consented-file parsing is not
 *     wired in wave zero, so the loan-file corpus is the §5.2 mechanically
 *     produced sandbox seed.
 *
 * No record here implies a ranking. Collections are ordered by id.
 */

const HMDA_API = 'https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations'
const OBSERVED = '2026-08-23'

function hmdaRecord({ state, purpose, purposeCode, count, volumeUSD }) {
  return {
    $type: 'LenderMarketRecord',
    id: `hmda-2024-${state.toLowerCase()}-${purpose.toLowerCase().replace(/\s+/g, '-')}`,
    state,
    year: 2024,
    actionTaken: 'originated',
    loanPurpose: purpose,
    originationCount: count,
    loanVolumeUSD: volumeUSD,
    binding: 'ingested',
    provenance: {
      source: 'FFIEC HMDA Data Browser API — aggregations (public data)',
      url: `${HMDA_API}?states=${state}&years=2024&actions_taken=1&loan_purposes=${purposeCode}`,
      observedAt: OBSERVED,
    },
  }
}

/** REAL HMDA-derived market records — 2024 originations, by state × purpose.
 *  Values are exactly what the Data Browser API returned in-session. */
export const lenderMarketRecords = [
  hmdaRecord({ state: 'CA', purpose: 'Home purchase', purposeCode: 1, count: 261993, volumeUSD: 182895805000 }),
  hmdaRecord({ state: 'CA', purpose: 'Refinancing', purposeCode: 31, count: 62335, volumeUSD: 50129165000 }),
  hmdaRecord({ state: 'FL', purpose: 'Home purchase', purposeCode: 1, count: 299894, volumeUSD: 120232870000 }),
  hmdaRecord({ state: 'FL', purpose: 'Refinancing', purposeCode: 31, count: 35203, volumeUSD: 18213075000 }),
  hmdaRecord({ state: 'ID', purpose: 'Home purchase', purposeCode: 1, count: 25840, volumeUSD: 9986030000 }),
  hmdaRecord({ state: 'ID', purpose: 'Refinancing', purposeCode: 31, count: 4430, volumeUSD: 1733400000 }),
  hmdaRecord({ state: 'NY', purpose: 'Home purchase', purposeCode: 1, count: 115407, volumeUSD: 56326435000 }),
  hmdaRecord({ state: 'NY', purpose: 'Refinancing', purposeCode: 31, count: 19878, volumeUSD: 17308210000 }),
  hmdaRecord({ state: 'TX', purpose: 'Home purchase', purposeCode: 1, count: 360296, volumeUSD: 129215850000 }),
  hmdaRecord({ state: 'TX', purpose: 'Refinancing', purposeCode: 31, count: 40917, volumeUSD: 21189015000 }),
]

const EXAMPLE_NOTE = 'example data — synthetic MISMO-flavored sandbox seed over fictional lenders, labeled per estate fixture law'

/** LoanFile records — the row's data-ply record type: THE LOAN FILE,
 *  MISMO-typed. LABELED SYNTHETIC (see header). Field names follow the
 *  MISMO v3 vocabulary (LoanIdentifier/ULI, LoanPurposeType, NoteRatePercent,
 *  AmortizationType, PropertyUsageType). Identifiers are clearly synthetic
 *  (EXAMPLE-prefixed, non-conformant with any real LEI); no borrower fields
 *  exist on this face at all. */
export const loanFiles = [
  {
    $type: 'LoanFile',
    id: 'lf-0001',
    loanIdentifier: 'EXAMPLEULI0000000000LF0001',
    lender: { name: 'Example Mortgage Bank (fictional demo lender)' },
    loanPurposeType: 'Purchase',
    loanStatus: 'Application',
    baseLoanAmountUSD: 412000,
    noteRatePercent: 6.375,
    amortizationType: 'Fixed',
    loanTermMonths: 360,
    propertyUsageType: 'PrimaryResidence',
    propertyState: 'ID',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'LoanFile',
    id: 'lf-0002',
    loanIdentifier: 'EXAMPLEULI0000000000LF0002',
    lender: { name: 'Example Mortgage Bank (fictional demo lender)' },
    loanPurposeType: 'Purchase',
    loanStatus: 'Processing',
    baseLoanAmountUSD: 287500,
    noteRatePercent: 6.5,
    amortizationType: 'Fixed',
    loanTermMonths: 360,
    propertyUsageType: 'PrimaryResidence',
    propertyState: 'TX',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'LoanFile',
    id: 'lf-0003',
    loanIdentifier: 'EXAMPLEULI0000000000LF0003',
    lender: { name: 'Example Home Loans (fictional demo lender)' },
    loanPurposeType: 'Purchase',
    loanStatus: 'Underwriting',
    baseLoanAmountUSD: 655000,
    noteRatePercent: 6.125,
    amortizationType: 'AdjustableRate',
    adjustmentPeriod: '5/1',
    loanTermMonths: 360,
    propertyUsageType: 'SecondHome',
    propertyState: 'FL',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'LoanFile',
    id: 'lf-0004',
    loanIdentifier: 'EXAMPLEULI0000000000LF0004',
    lender: { name: 'Example Home Loans (fictional demo lender)' },
    loanPurposeType: 'Refinance',
    loanStatus: 'ClearToClose',
    baseLoanAmountUSD: 331000,
    noteRatePercent: 5.99,
    amortizationType: 'Fixed',
    loanTermMonths: 240,
    propertyUsageType: 'PrimaryResidence',
    propertyState: 'CA',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'LoanFile',
    id: 'lf-0005',
    loanIdentifier: 'EXAMPLEULI0000000000LF0005',
    lender: { name: 'Example Correspondent Funding (fictional demo lender)' },
    loanPurposeType: 'Refinance',
    loanStatus: 'Closed',
    baseLoanAmountUSD: 198750,
    noteRatePercent: 6.25,
    amortizationType: 'Fixed',
    loanTermMonths: 180,
    propertyUsageType: 'Investment',
    propertyState: 'NY',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'LoanFile',
    id: 'lf-0006',
    loanIdentifier: 'EXAMPLEULI0000000000LF0006',
    lender: { name: 'Example Correspondent Funding (fictional demo lender)' },
    loanPurposeType: 'Purchase',
    loanStatus: 'Closed',
    baseLoanAmountUSD: 523000,
    noteRatePercent: 6.625,
    amortizationType: 'Fixed',
    loanTermMonths: 360,
    propertyUsageType: 'PrimaryResidence',
    propertyState: 'CA',
    example: true,
    note: EXAMPLE_NOTE,
  },
]
