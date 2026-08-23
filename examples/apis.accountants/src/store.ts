/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  CLIENTS,
  CLOSE_DELIVERABLES,
  ENGAGEMENTS,
  LEDGERS,
  RETURNS,
  RETENTION_NOTE,
  type LedgerEntry,
  type LedgerEntryLine,
  type SeedEngagement,
  type SeedLedger,
} from './seed'

export interface Workspace {
  extraEntries: Map<string, LedgerEntry[]>
  extraEngagements: SeedEngagement[]
}

export function createWorkspace(): Workspace {
  return { extraEntries: new Map(), extraEngagements: [] }
}

export const listClients = () => CLIENTS
export const listEngagements = (ws: Workspace) => [...ENGAGEMENTS, ...ws.extraEngagements]
export const listReturns = () => RETURNS
export const getReturn = (id: string) => RETURNS.find((r) => r.id === id)
export const listCloseDeliverables = () => CLOSE_DELIVERABLES
export const getCloseDeliverable = (id: string) => CLOSE_DELIVERABLES.find((d) => d.id === id)

export function listLedgers(ws: Workspace): SeedLedger[] {
  return LEDGERS.map((l) => withExtras(l, ws))
}

export function getLedger(ws: Workspace, id: string): SeedLedger | undefined {
  const l = LEDGERS.find((x) => x.id === id)
  return l && withExtras(l, ws)
}

function withExtras(l: SeedLedger, ws: Workspace): SeedLedger {
  const extra = ws.extraEntries.get(l.id)
  return extra && extra.length > 0 ? { ...l, entries: [...l.entries, ...extra] } : l
}

export interface PostEntryInput {
  date?: string
  memo?: string
  lines?: LedgerEntryLine[]
}

export function postEntry(ws: Workspace, ledgerId: string, input: PostEntryInput): { entry?: LedgerEntry; error?: string } {
  const ledger = LEDGERS.find((l) => l.id === ledgerId)
  if (!ledger) return { error: `no ledger '${ledgerId}'` }
  const lines = Array.isArray(input.lines) ? input.lines : []
  if (lines.length < 2) return { error: 'a journal entry needs at least two lines' }
  let debits = 0
  let credits = 0
  for (const line of lines) {
    if (typeof line.account !== 'string' || typeof line.debit !== 'number' || typeof line.credit !== 'number') {
      return { error: 'every line needs { account: string, debit: number, credit: number }' }
    }
    debits += line.debit
    credits += line.credit
  }
  if (Math.round(debits * 100) !== Math.round(credits * 100)) {
    return { error: `entry does not balance: debits ${debits} != credits ${credits}` }
  }
  const existing = ws.extraEntries.get(ledgerId) ?? []
  const entry: LedgerEntry = {
    id: `${ledgerId}-ws-e${existing.length + 1}`,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    memo: `[sandbox workspace — ephemeral] ${input.memo ?? ''}`.trim(),
    lines,
    example: true,
  }
  ws.extraEntries.set(ledgerId, [...existing, entry])
  return { entry }
}

export function createEngagement(ws: Workspace, input: { clientId?: string; kind?: string }): { engagement?: SeedEngagement; error?: string } {
  const client = CLIENTS.find((c) => c.id === input.clientId)
  if (!client) return { error: `unknown clientId '${input.clientId}' — see /clients` }
  const engagement: SeedEngagement = {
    $context: 'https://schema.org.ai',
    $type: 'Engagement',
    id: `e-ws-${ws.extraEngagements.length + 1}`,
    clientId: client.id,
    kind: 'monthly-close',
    startedOn: new Date().toISOString().slice(0, 10),
    status: 'active',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraEngagements.push(engagement)
  return { engagement }
}
