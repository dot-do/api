/**
 * seed.js — the §5.2 sandbox seed for register row `banking-payments`,
 * produced mechanically from the row's record schemas (ISO 20022 interchange
 * spine). EVERY record is synthetic and labeled: fictional lender, fictional
 * borrowers, fictional BIC-like identifiers, no real routing numbers or EINs,
 * `example: true` on every record.
 *
 * The corpus is generated deterministically from three amortizing loans, so
 * everything TIES BY CONSTRUCTION and is re-derived (never trusted) by the
 * self-verify gate:
 *   - each installment pacs.008 equals the loan's level payment;
 *   - each monthly camt.053 statement's entries sum to its balance movement
 *     and the closing balance chains to the next month's opening;
 *   - each credit-file tradeline's current balance equals the amortized
 *     outstanding balance of the loan it reports.
 * "Premium, world-class example data" is a property of the generator, not of
 * hand-typed numbers.
 */

export const EXAMPLE_NOTE =
  "Example data — synthetic sandbox seed over a fictional lender (Harborview Community Lending Co.) and " +
  "fictional borrowers. No real company, person, account, BIC, or routing number appears here; identifiers " +
  "are fictional by construction. Anonymous sandbox: stateless reads; nothing you send is stored at wave " +
  "zero; the seed regenerates on every deploy.";

/** All money in integer cents internally; serialized as decimal USD. */
const usd = (cents) => Math.round(cents) / 100;

const LENDER = Object.freeze({
  id: "lender_example_harborview",
  name: "Harborview Community Lending Co. (fictional)",
  bic: "HRBVZZ00", // fictional BIC-like id — ZZ is not a real country code
  servicingAccount: "acct_example_servicing",
});

/** The three seeded loans (fictional borrowers; terms chosen for realistic depth). */
const LOAN_SPECS = [
  {
    id: "loan_example_alderpoint",
    borrower: "Alder Point Bakery LLC (fictional)",
    borrowerBic: "ALDPZZ00",
    principalCents: 12000000, // $120,000.00
    annualRatePct: 7.25,
    termMonths: 60,
    originated: "2026-05-15",
    product: "small-business-term-loan",
    paymentsMade: 3, // 2026-06-15, 2026-07-15, 2026-08-15
  },
  {
    id: "loan_example_cypressrow",
    borrower: "Cypress Row Books Ltd (fictional)",
    borrowerBic: "CYPRZZ00",
    principalCents: 4500000, // $45,000.00
    annualRatePct: 8.1,
    termMonths: 36,
    originated: "2026-06-01",
    product: "working-capital-loan",
    paymentsMade: 2, // 2026-07-01, 2026-08-01
  },
  {
    id: "loan_example_juniperfield",
    borrower: "Juniper Field Landscaping Inc (fictional)",
    borrowerBic: "JNPFZZ00",
    principalCents: 25000000, // $250,000.00
    annualRatePct: 6.8,
    termMonths: 84,
    originated: "2026-06-20",
    product: "equipment-loan",
    paymentsMade: 2, // 2026-07-20, 2026-08-20
  },
];

/** Level payment in cents: P * r / (1 - (1+r)^-n). */
function levelPaymentCents(principalCents, annualRatePct, termMonths) {
  const r = annualRatePct / 100 / 12;
  return Math.round((principalCents * r) / (1 - Math.pow(1 + r, -termMonths)));
}

function addMonths(isoDate, n) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Amortize one spec: schedule rows for payments made + outstanding balance. */
function amortize(spec) {
  const payment = levelPaymentCents(spec.principalCents, spec.annualRatePct, spec.termMonths);
  const r = spec.annualRatePct / 100 / 12;
  let balance = spec.principalCents;
  const rows = [];
  for (let i = 1; i <= spec.paymentsMade; i++) {
    const interest = Math.round(balance * r);
    const principal = payment - interest;
    if (principal <= 0) throw new Error(`seed defect: non-amortizing payment on ${spec.id}`);
    balance -= principal;
    rows.push({ n: i, date: addMonths(spec.originated, i), paymentCents: payment, interestCents: interest, principalCents: principal, balanceCents: balance });
  }
  if (balance < 0) throw new Error(`seed defect: negative balance on ${spec.id}`);
  return { paymentCents: payment, rows, outstandingCents: balance };
}

const AMORT = new Map(LOAN_SPECS.map((s) => [s.id, amortize(s)]));

/** The Loan records (the door-grain Noun the /loans collection serves). */
export const loans = LOAN_SPECS.map((s) => {
  const a = AMORT.get(s.id);
  return {
    $type: "Loan",
    id: s.id,
    lenderId: LENDER.id,
    borrower: s.borrower,
    product: s.product,
    currency: "USD",
    principal: usd(s.principalCents),
    annualRatePct: s.annualRatePct,
    termMonths: s.termMonths,
    originated: s.originated,
    monthlyPayment: usd(a.paymentCents),
    paymentsMade: s.paymentsMade,
    outstandingBalance: usd(a.outstandingCents),
    schedule: a.rows.map((row) => ({
      n: row.n,
      date: row.date,
      payment: usd(row.paymentCents),
      interest: usd(row.interestCents),
      principal: usd(row.principalCents),
      balance: usd(row.balanceCents),
    })),
    status: "current",
    example: true,
    exampleNote: EXAMPLE_NOTE,
  };
});

/** Deterministic fictional UETR-shaped id (clearly synthetic, valid v4 shape). */
function uetr(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/** The PaymentMessage records — the ISO 20022 interchange spine. */
export const paymentMessages = (() => {
  const out = [];
  let seq = 0;
  for (const s of LOAN_SPECS) {
    const a = AMORT.get(s.id);
    // disbursement instruction (pain.001) + settlement (pacs.008), lender → borrower
    out.push({
      $type: "PaymentMessage",
      id: `pm_pain001_${s.id.replace("loan_example_", "")}`,
      msgType: "pain.001.001.09",
      direction: "outbound",
      purpose: "loan-disbursement-initiation",
      loanId: s.id,
      debtor: { name: LENDER.name, bic: LENDER.bic, account: LENDER.servicingAccount },
      creditor: { name: s.borrower, bic: s.borrowerBic, account: `acct_example_${s.borrowerBic.toLowerCase()}` },
      amount: usd(s.principalCents),
      currency: "USD",
      valueDate: s.originated,
      endToEndId: `E2E-${s.id.replace("loan_example_", "").toUpperCase()}-000`,
      uetr: uetr(++seq),
      example: true,
      exampleNote: EXAMPLE_NOTE,
    });
    out.push({
      $type: "PaymentMessage",
      id: `pm_pacs008_${s.id.replace("loan_example_", "")}_disb`,
      msgType: "pacs.008.001.08",
      direction: "outbound",
      purpose: "loan-disbursement-settlement",
      loanId: s.id,
      debtor: { name: LENDER.name, bic: LENDER.bic, account: LENDER.servicingAccount },
      creditor: { name: s.borrower, bic: s.borrowerBic, account: `acct_example_${s.borrowerBic.toLowerCase()}` },
      amount: usd(s.principalCents),
      currency: "USD",
      valueDate: s.originated,
      endToEndId: `E2E-${s.id.replace("loan_example_", "").toUpperCase()}-000`,
      uetr: uetr(++seq),
      example: true,
      exampleNote: EXAMPLE_NOTE,
    });
    // one pacs.008 per installment received, borrower → lender
    for (const row of a.rows) {
      out.push({
        $type: "PaymentMessage",
        id: `pm_pacs008_${s.id.replace("loan_example_", "")}_${String(row.n).padStart(2, "0")}`,
        msgType: "pacs.008.001.08",
        direction: "inbound",
        purpose: "loan-installment",
        loanId: s.id,
        installment: row.n,
        debtor: { name: s.borrower, bic: s.borrowerBic, account: `acct_example_${s.borrowerBic.toLowerCase()}` },
        creditor: { name: LENDER.name, bic: LENDER.bic, account: LENDER.servicingAccount },
        amount: usd(row.paymentCents),
        currency: "USD",
        valueDate: row.date,
        endToEndId: `E2E-${s.id.replace("loan_example_", "").toUpperCase()}-${String(row.n).padStart(3, "0")}`,
        uetr: uetr(++seq),
        example: true,
        exampleNote: EXAMPLE_NOTE,
      });
    }
  }
  // monthly camt.053 statements over the servicing account, chained balances
  const months = ["2026-05", "2026-06", "2026-07", "2026-08"];
  let openingCents = 0;
  for (const month of months) {
    const inMonth = out.filter((m) => m.msgType === "pacs.008.001.08" && m.valueDate.startsWith(month));
    const entries = inMonth.map((m) => ({
      messageId: m.id,
      creditDebit: m.direction === "inbound" ? "CRDT" : "DBIT",
      amount: m.amount,
      valueDate: m.valueDate,
      endToEndId: m.endToEndId,
    }));
    const movementCents = entries.reduce(
      (sum, e) => sum + Math.round(e.amount * 100) * (e.creditDebit === "CRDT" ? 1 : -1),
      0,
    );
    const closingCents = openingCents + movementCents;
    out.push({
      $type: "PaymentMessage",
      id: `pm_camt053_${month}`,
      msgType: "camt.053.001.08",
      direction: "inbound",
      purpose: "servicing-account-statement",
      account: LENDER.servicingAccount,
      period: month,
      valueDate: `${month}-28`,
      currency: "USD",
      openingBalance: usd(openingCents),
      closingBalance: usd(closingCents),
      entryCount: entries.length,
      entries,
      example: true,
      exampleNote: EXAMPLE_NOTE,
    });
    openingCents = closingCents;
  }
  return out;
})();

/** The CreditFile records — the apis.credit records floor; tradelines derive
 *  from the loan model, so the file agrees with the ledger by construction. */
export const creditFiles = LOAN_SPECS.map((s) => {
  const a = AMORT.get(s.id);
  return {
    $type: "CreditFile",
    id: `cf_example_${s.borrowerBic.toLowerCase()}`,
    subject: s.borrower,
    kind: "commercial",
    pulledAt: "2026-08-23",
    scoreBand: "example-band-B", // synthetic label, not a real bureau score
    tradelines: [
      {
        loanId: s.id,
        lender: LENDER.name,
        product: s.product,
        opened: s.originated,
        originalAmount: usd(s.principalCents),
        currentBalance: usd(a.outstandingCents),
        monthsReviewed: s.paymentsMade,
        paymentHistory: Array(s.paymentsMade).fill("on-time"),
      },
    ],
    example: true,
    exampleNote: EXAMPLE_NOTE,
  };
});

/** Lender/product market records — the [UNVERIFIED] public-ingest route's
 *  shape, served as labeled synthetic examples until the ingest is ruled. */
export const lenders = [
  {
    $type: "Lender",
    id: LENDER.id,
    name: LENDER.name,
    charter: "state non-bank lender (fictional)",
    products: [
      { product: "small-business-term-loan", aprRangePct: [6.5, 9.75], termMonths: [36, 84] },
      { product: "working-capital-loan", aprRangePct: [7.5, 11.25], termMonths: [12, 36] },
    ],
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
  {
    $type: "Lender",
    id: "lender_example_granitefork",
    name: "Granite Fork Credit Union (fictional)",
    charter: "federal credit union (fictional)",
    products: [{ product: "equipment-loan", aprRangePct: [5.9, 8.4], termMonths: [24, 84] }],
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
  {
    $type: "Lender",
    id: "lender_example_bluepine",
    name: "Bluepine Capital Finance LLC (fictional)",
    charter: "fintech loan servicer (fictional)",
    products: [{ product: "invoice-financing", aprRangePct: [9.0, 14.5], termMonths: [3, 12] }],
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
];

export function getPaymentMessage(id) {
  return paymentMessages.find((m) => m.id === id);
}

export function getLoan(id) {
  return loans.find((l) => l.id === id);
}

export function getCreditFile(id) {
  return creditFiles.find((c) => c.id === id);
}

export function getLender(id) {
  return lenders.find((l) => l.id === id);
}

/** Consistency re-derivations for the self-verify gate (§5.2 quality bar). */
export const seedInternals = Object.freeze({ LOAN_SPECS, AMORT, LENDER, usd });
