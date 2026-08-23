/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types. Deterministic (no RNG):
 * reseeding is a build step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; titles carry a "[demo]" label
 *   - fictional firm and clients (no real company or person names; personas
 *     are role labels, never names)
 *   - synthetic EINs use the 00- prefix (never a valid real EIN range)
 *   - the source route (owned corpus via headless usage accretion) is not
 *     reachable in-session, so per spec §5.2 this labeled synthetic seed is
 *     the wave-zero corpus; real per-tenant ledgers accrete later,
 *     consent-at-rail
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation — two
 * FULL close cycles (all 10 typed deliverables, internally consistent
 * double-entry), a year-keyed return per client, clients and engagements at
 * firm-practice grain.
 */

import { CLOSE_DELIVERABLE_TYPES } from './substrate'

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

export interface SeedClient {
  $context: string
  $type: 'Client'
  id: string
  name: string
  ein: string
  entityType: 'LLC' | 'C-Corp' | 'S-Corp'
  fiscalYearEnd: string
  example: true
  label: string
}

export interface LedgerEntryLine {
  account: string
  debit: number
  credit: number
}

export interface LedgerEntry {
  id: string
  date: string
  memo: string
  lines: LedgerEntryLine[]
  example: true
}

export interface SeedLedger {
  $context: string
  $type: 'Ledger'
  id: string
  clientId: string
  basis: 'accrual'
  currency: 'USD'
  periods: string[]
  entries: LedgerEntry[]
  example: true
  label: string
}

export interface SeedCloseDeliverable {
  $context: string
  $type: 'CloseDeliverable'
  id: string
  deliverableType: (typeof CLOSE_DELIVERABLE_TYPES)[number]
  period: string
  clientId: string
  ledgerId: string
  status: 'verified' | 'in-progress'
  apqc: string
  preparedByRole: string
  reviewedByRole: string
  title: string
  example: true
  label: string
}

export interface SeedReturn {
  $context: string
  $type: 'Return'
  id: string
  clientId: string
  year: number
  form: string
  status: 'filed'
  filedOn: string
  example: true
  label: string
}

export interface SeedEngagement {
  $context: string
  $type: 'Engagement'
  id: string
  clientId: string
  kind: 'monthly-close'
  startedOn: string
  status: 'active'
  example: true
  label: string
}

/** The demo firm — tenant #1 on the production substrate (live-demo ruling). */
export const FIRM = {
  $context: CONTEXT,
  $type: 'Firm',
  id: 't-meridian-cole',
  name: 'Meridian & Cole LLP (demo)',
  ein: '00-1000001',
  example: true as const,
  label: '[demo] Fictional CPA firm — sandbox seed tenant',
}

export const CLIENTS: SeedClient[] = [
  { $context: CONTEXT, $type: 'Client', id: 'c-sable-harbor', name: 'Sable Harbor Coffee Roasters LLC (demo)', ein: '00-2000002', entityType: 'LLC', fiscalYearEnd: '12-31', example: true, label: '[demo] Fictional SMB client' },
  { $context: CONTEXT, $type: 'Client', id: 'c-bluegate', name: 'Bluegate Hardware Supply Inc (demo)', ein: '00-2000003', entityType: 'C-Corp', fiscalYearEnd: '12-31', example: true, label: '[demo] Fictional SMB client' },
  { $context: CONTEXT, $type: 'Client', id: 'c-fernwheel', name: 'Fernwheel Studio Collective LLC (demo)', ein: '00-2000004', entityType: 'S-Corp', fiscalYearEnd: '12-31', example: true, label: '[demo] Fictional SMB client' },
]

export const PERIODS = ['2026-06', '2026-07'] as const

/** Deterministic, internally consistent double-entry cycle for one client-period. */
function entriesFor(clientIx: number, period: string, ledgerId: string): LedgerEntry[] {
  const base = (clientIx + 1) * 1000
  const m = period.slice(5) // '06' | '07'
  const mk = (n: number, date: string, memo: string, lines: LedgerEntryLine[]): LedgerEntry => ({
    id: `${ledgerId}-${period}-e${n}`,
    date,
    memo: `[demo] ${memo}`,
    lines,
    example: true,
  })
  return [
    mk(1, `${period}-05`, 'Revenue — invoices issued', [
      { account: '1100 Accounts Receivable', debit: base * 4, credit: 0 },
      { account: '4000 Revenue', debit: 0, credit: base * 4 },
    ]),
    mk(2, `${period}-12`, 'Cash receipts on account', [
      { account: '1000 Cash', debit: base * 3, credit: 0 },
      { account: '1100 Accounts Receivable', debit: 0, credit: base * 3 },
    ]),
    mk(3, `${period}-20`, 'Vendor bills — operating expense', [
      { account: '6000 Operating Expense', debit: base, credit: 0 },
      { account: '2000 Accounts Payable', debit: 0, credit: base },
    ]),
    mk(4, `${period}-27`, 'Payroll run', [
      { account: '6100 Payroll Expense', debit: base * 2, credit: 0 },
      { account: '1000 Cash', debit: 0, credit: base * 2 },
    ]),
    mk(5, `${period}-30`, `Month-end accrual (period ${m})`, [
      { account: '6200 Accrued Expense', debit: Math.round(base / 2), credit: 0 },
      { account: '2100 Accrued Liabilities', debit: 0, credit: Math.round(base / 2) },
    ]),
  ]
}

export const LEDGERS: SeedLedger[] = CLIENTS.map((c, ix) => {
  const id = `l-${c.id.slice(2)}`
  return {
    $context: CONTEXT,
    $type: 'Ledger',
    id,
    clientId: c.id,
    basis: 'accrual',
    currency: 'USD',
    periods: [...PERIODS],
    entries: PERIODS.flatMap((p) => entriesFor(ix, p, id)),
    example: true,
    label: `[demo] Ledger for ${c.name}`,
  }
})

const DELIVERABLE_TITLES: Record<(typeof CLOSE_DELIVERABLE_TYPES)[number], string> = {
  'trial-balance': 'Trial balance',
  'bank-reconciliation': 'Bank reconciliation',
  'ar-reconciliation': 'AR reconciliation',
  'ap-reconciliation': 'AP reconciliation',
  'accruals-journal': 'Accruals journal',
  'prepaids-amortization': 'Prepaids amortization schedule',
  'fixed-asset-rollforward': 'Fixed-asset rollforward',
  'payroll-reconciliation': 'Payroll reconciliation',
  'flux-analysis': 'Flux (variance) analysis',
  'close-package': 'Month-end close package',
}

/**
 * APQC coarse-grain process anchor (register row G1 anchor: APQC "Manage
 * Financial Resources"). Deliberately category-grain: deeper PCF subcodes
 * attach when the register enrichment ladder types them — a guessed deep code
 * would be a fabricated fact.
 */
const APQC_ANCHOR = 'APQC PCF — Manage Financial Resources (category grain; register row G1 anchor)'

export const CLOSE_DELIVERABLES: SeedCloseDeliverable[] = CLIENTS.flatMap((c) =>
  PERIODS.flatMap((period) =>
    CLOSE_DELIVERABLE_TYPES.map((t, ti): SeedCloseDeliverable => ({
      $context: CONTEXT,
      $type: 'CloseDeliverable',
      id: `cd-${c.id.slice(2)}-${period}-${t}`,
      deliverableType: t,
      period,
      clientId: c.id,
      ledgerId: `l-${c.id.slice(2)}`,
      // 2026-06 cycle fully verified; 2026-07 in flight past the halfway mark —
      // so the `status` filter genuinely branches (OK / EMPTY / narrower OK)
      status: period === '2026-06' || ti < 6 ? 'verified' : 'in-progress',
      apqc: APQC_ANCHOR,
      preparedByRole: 'staff-accountant',
      reviewedByRole: 'engagement-partner',
      title: `[demo] ${DELIVERABLE_TITLES[t]} — ${c.name}, ${period}`,
      example: true,
      label: RETENTION_NOTE,
    })),
  ),
)

export const RETURNS: SeedReturn[] = CLIENTS.map((c) => ({
  $context: CONTEXT,
  $type: 'Return',
  id: `r-${c.id.slice(2)}-2025`,
  clientId: c.id,
  year: 2025,
  form: c.entityType === 'C-Corp' ? '1120' : c.entityType === 'S-Corp' ? '1120-S' : '1065',
  status: 'filed',
  filedOn: '2026-03-14',
  example: true,
  label: `[demo] ${c.name} — synthetic filed return (no real EIN, no real filing)`,
}))

export const ENGAGEMENTS: SeedEngagement[] = CLIENTS.map((c) => ({
  $context: CONTEXT,
  $type: 'Engagement',
  id: `e-${c.id.slice(2)}-close`,
  clientId: c.id,
  kind: 'monthly-close',
  startedOn: '2026-05-01',
  status: 'active',
  example: true,
  label: `[demo] Monthly close engagement — ${c.name}`,
}))
