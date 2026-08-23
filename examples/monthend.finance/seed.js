/**
 * seed.js — the §5.2 sandbox seed, produced mechanically from the row's
 * record schemas. EVERY record is synthetic and labeled: fictional company,
 * no real names, no real identifiers, `example: true` on every record.
 *
 * The corpus is generated deterministically from a balanced double-entry
 * journal, so the trial balance TIES BY CONSTRUCTION and every close
 * deliverable is internally consistent with the Ledger it closes — the
 * "premium, world-class example data" bar is a property of the generator,
 * not of hand-typed numbers.
 */

import { CLOSE_DELIVERABLE_TYPES } from "./product.js";

export const EXAMPLE_NOTE =
  "Example data — synthetic sandbox seed over a fictional company (Harbor Lane Goods Co.). " +
  "No real company, person, or account appears here. Anonymous sandbox: stateless reads; " +
  "nothing you send is stored at wave zero; the seed regenerates on every deploy.";

const LEDGER_ID = "led_example_harborlane";

/** Chart of accounts — {code, name, normal: "debit"|"credit", kind}. */
const ACCOUNTS = [
  { code: "1000", name: "Cash", normal: "debit", kind: "asset" },
  { code: "1100", name: "Accounts Receivable", normal: "debit", kind: "asset" },
  { code: "1200", name: "Inventory", normal: "debit", kind: "asset" },
  { code: "1300", name: "Prepaid Insurance", normal: "debit", kind: "asset" },
  { code: "1500", name: "Equipment", normal: "debit", kind: "asset" },
  { code: "1590", name: "Accumulated Depreciation", normal: "credit", kind: "contra-asset" },
  { code: "2000", name: "Accounts Payable", normal: "credit", kind: "liability" },
  { code: "2100", name: "Accrued Liabilities", normal: "credit", kind: "liability" },
  { code: "3000", name: "Owner's Equity", normal: "credit", kind: "equity" },
  { code: "4000", name: "Revenue", normal: "credit", kind: "revenue" },
  { code: "5000", name: "Cost of Goods Sold", normal: "debit", kind: "expense" },
  { code: "6000", name: "Rent Expense", normal: "debit", kind: "expense" },
  { code: "6100", name: "Insurance Expense", normal: "debit", kind: "expense" },
  { code: "6200", name: "Depreciation Expense", normal: "debit", kind: "expense" },
  { code: "6300", name: "Payroll Expense", normal: "debit", kind: "expense" },
];

/** One balanced journal entry: lines of {account, debit?|credit?}. */
function je(period, seq, memo, lines) {
  const debits = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credits = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (debits !== credits) throw new Error(`seed defect: unbalanced entry ${period}#${seq} (${debits} != ${credits})`);
  return { id: `je_${period}_${String(seq).padStart(2, "0")}`, period, seq, memo, lines, example: true };
}

/** The full two-period journal (2026-06, 2026-07) — a complete close cycle each. */
export const journal = [
  // ── 2026-06 ──
  je("2026-06", 1, "Founder funding received", [
    { account: "1000", debit: 50000 }, { account: "3000", credit: 50000 }]),
  je("2026-06", 2, "Warehouse equipment purchased", [
    { account: "1500", debit: 12000 }, { account: "1000", credit: 12000 }]),
  je("2026-06", 3, "Inventory purchased on terms", [
    { account: "1200", debit: 18000 }, { account: "2000", credit: 18000 }]),
  je("2026-06", 4, "Twelve-month insurance policy prepaid", [
    { account: "1300", debit: 2400 }, { account: "1000", credit: 2400 }]),
  je("2026-06", 5, "June sales on account", [
    { account: "1100", debit: 26000 }, { account: "4000", credit: 26000 }]),
  je("2026-06", 6, "June cost of goods sold", [
    { account: "5000", debit: 11000 }, { account: "1200", credit: 11000 }]),
  je("2026-06", 7, "Customer collections", [
    { account: "1000", debit: 14000 }, { account: "1100", credit: 14000 }]),
  je("2026-06", 8, "Supplier payments", [
    { account: "2000", debit: 9000 }, { account: "1000", credit: 9000 }]),
  je("2026-06", 9, "June rent paid", [
    { account: "6000", debit: 3000 }, { account: "1000", credit: 3000 }]),
  je("2026-06", 10, "June payroll accrued", [
    { account: "6300", debit: 6500 }, { account: "2100", credit: 6500 }]),
  je("2026-06", 11, "Insurance amortization, month 1 of 12", [
    { account: "6100", debit: 200 }, { account: "1300", credit: 200 }]),
  je("2026-06", 12, "Depreciation, 60-month straight line", [
    { account: "6200", debit: 200 }, { account: "1590", credit: 200 }]),
  // ── 2026-07 ──
  je("2026-07", 1, "Inventory purchased on terms", [
    { account: "1200", debit: 15000 }, { account: "2000", credit: 15000 }]),
  je("2026-07", 2, "July sales on account", [
    { account: "1100", debit: 31000 }, { account: "4000", credit: 31000 }]),
  je("2026-07", 3, "July cost of goods sold", [
    { account: "5000", debit: 13500 }, { account: "1200", credit: 13500 }]),
  je("2026-07", 4, "Customer collections", [
    { account: "1000", debit: 28000 }, { account: "1100", credit: 28000 }]),
  je("2026-07", 5, "Supplier payments", [
    { account: "2000", debit: 16000 }, { account: "1000", credit: 16000 }]),
  je("2026-07", 6, "June payroll accrual paid", [
    { account: "2100", debit: 6500 }, { account: "1000", credit: 6500 }]),
  je("2026-07", 7, "July payroll accrued", [
    { account: "6300", debit: 6800 }, { account: "2100", credit: 6800 }]),
  je("2026-07", 8, "July rent paid", [
    { account: "6000", debit: 3000 }, { account: "1000", credit: 3000 }]),
  je("2026-07", 9, "Insurance amortization, month 2 of 12", [
    { account: "6100", debit: 200 }, { account: "1300", credit: 200 }]),
  je("2026-07", 10, "Depreciation, 60-month straight line", [
    { account: "6200", debit: 200 }, { account: "1590", credit: 200 }]),
];

/** Account balances through the END of `period` (inclusive, cumulative). */
function balancesThrough(period) {
  const bal = new Map(ACCOUNTS.map((a) => [a.code, 0]));
  for (const entry of journal) {
    if (entry.period > period) continue;
    for (const l of entry.lines) bal.set(l.account, bal.get(l.account) + (l.debit || 0) - (l.credit || 0));
  }
  return bal;
}

/** The trial balance for a period: every account, debit/credit columns, totals. */
export function trialBalance(period) {
  const bal = balancesThrough(period);
  const rows = ACCOUNTS.map((a) => {
    const v = bal.get(a.code);
    return { account: a.code, name: a.name, debit: v > 0 ? v : 0, credit: v < 0 ? -v : 0 };
  }).filter((r) => r.debit !== 0 || r.credit !== 0);
  const totals = {
    debit: rows.reduce((s, r) => s + r.debit, 0),
    credit: rows.reduce((s, r) => s + r.credit, 0),
  };
  if (totals.debit !== totals.credit) throw new Error(`seed defect: trial balance ${period} does not tie`);
  return { rows, totals, tied: true };
}

function activityIn(period, code, side) {
  let s = 0;
  for (const e of journal) {
    if (e.period !== period) continue;
    for (const l of e.lines) if (l.account === code) s += l[side] || 0;
  }
  return s;
}

/** Deliverable content per type — every number derives from the journal. */
function deliverableContent(type, period) {
  const bal = balancesThrough(period);
  switch (type) {
    case "trial-balance":
      return trialBalance(period);
    case "bank-reconciliation":
      return {
        cashPerBooks: bal.get("1000"),
        depositsInTransit: 0,
        outstandingChecks: 0,
        statementBalance: bal.get("1000"),
        reconciled: true,
      };
    case "ar-aging":
      return { current: bal.get("1100"), days30: 0, days60: 0, days90plus: 0, total: bal.get("1100") };
    case "ap-cutoff":
      return { openPayables: -bal.get("2000"), invoicesReceivedAfterCutoff: 0, accrued: true };
    case "accrual-journal":
      return { accruedLiabilities: -bal.get("2100"), entries: journal.filter((e) => e.period === period && /accrued/i.test(e.memo)).map((e) => e.id) };
    case "prepaid-amortization":
      return { prepaidBalance: bal.get("1300"), monthlyAmortization: 200, scheduleMonthsRemaining: bal.get("1300") / 200 };
    case "fixed-asset-rollforward":
      return { cost: bal.get("1500"), accumulatedDepreciation: -bal.get("1590"), netBookValue: bal.get("1500") + bal.get("1590"), monthlyDepreciation: 200 };
    case "revenue-recognition":
      return { revenueRecognized: activityIn(period, "4000", "credit"), deferred: 0, method: "point-in-time on delivery" };
    case "balance-sheet-reconciliation":
      return {
        accountsReconciled: ["1000", "1100", "1200", "1300", "1500", "1590", "2000", "2100"],
        unreconciledDifferences: 0,
      };
    case "month-end-package": {
      const revenue = activityIn(period, "4000", "credit");
      const expenses = ["5000", "6000", "6100", "6200", "6300"].reduce((s, c) => s + activityIn(period, c, "debit"), 0);
      return { period, revenue, expenses, netIncome: revenue - expenses, includes: CLOSE_DELIVERABLE_TYPES.slice(0, 9) };
    }
    default:
      throw new Error(`seed defect: unknown deliverable type ${type}`);
  }
}

/** The seeded Ledger records (the Noun the collection serves at /ledgers). */
export const ledgers = [
  {
    $type: "Ledger",
    id: LEDGER_ID,
    company: "Harbor Lane Goods Co. (fictional)",
    currency: "USD",
    periods: ["2026-06", "2026-07"],
    accounts: ACCOUNTS,
    entryCount: journal.length,
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
];

/** The seeded CloseDeliverable records — 10 types × 2 full close cycles. */
export const closeDeliverables = ["2026-06", "2026-07"].flatMap((period) =>
  CLOSE_DELIVERABLE_TYPES.map((type) => ({
    $type: "CloseDeliverable",
    id: `cd_${period}_${type}`,
    type,
    period,
    status: period === "2026-06" ? "verified" : "in-progress",
    ledgerId: LEDGER_ID,
    title: `${type.replace(/-/g, " ")} — ${period}`,
    content: deliverableContent(type, period),
    example: true,
    exampleNote: EXAMPLE_NOTE,
  })),
);

export function getLedger(id) {
  const l = ledgers.find((x) => x.id === id);
  return l ? { ...l, entries: journal } : undefined;
}

export function getCloseDeliverable(id) {
  return closeDeliverables.find((x) => x.id === id);
}
