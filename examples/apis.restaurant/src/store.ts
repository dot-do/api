/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  INVENTORY_COUNTS,
  LOCATIONS,
  MENUS,
  ORDERS,
  PAR_LEVELS,
  RETENTION_NOTE,
  SUPPLIER_INVOICES,
  type CountLine,
  type SeedInventoryCount,
} from './seed'

export interface Workspace {
  extraCounts: SeedInventoryCount[]
}

export function createWorkspace(): Workspace {
  return { extraCounts: [] }
}

export const listLocations = () => LOCATIONS
export const getLocation = (id: string) => LOCATIONS.find((l) => l.id === id)
export const listParLevels = () => PAR_LEVELS
export const getParLevel = (id: string) => PAR_LEVELS.find((p) => p.id === id)
export const listSupplierInvoices = () => SUPPLIER_INVOICES
export const getSupplierInvoice = (id: string) => SUPPLIER_INVOICES.find((si) => si.id === id)
export const listOrders = () => ORDERS
export const getOrder = (id: string) => ORDERS.find((o) => o.id === id)
export const listMenus = () => MENUS
export const getMenu = (id: string) => MENUS.find((m) => m.id === id)

export function listInventoryCounts(ws: Workspace): SeedInventoryCount[] {
  return [...INVENTORY_COUNTS, ...ws.extraCounts]
}

export function getInventoryCount(ws: Workspace, id: string): SeedInventoryCount | undefined {
  return listInventoryCounts(ws).find((c) => c.id === id)
}

export interface RecordCountInput {
  period?: string
  lines?: { parLevelId: string; countedQty: number }[]
}

/**
 * The headless system-of-record door's write verb: record an inventory count
 * into the EPHEMERAL anonymous workspace. Validation is real — the food-cost
 * arithmetic identity is enforced at the door, not just in the seed: the
 * counted value cannot exceed what was available (opening + purchases).
 */
export function recordInventoryCount(
  ws: Workspace,
  locationId: string,
  input: RecordCountInput,
): { count?: SeedInventoryCount; error?: string } {
  const location = LOCATIONS.find((l) => l.id === locationId)
  if (!location) return { error: `unknown location '${locationId}' — see /locations` }
  if (!input.period || !/^\d{4}-\d{2}$/.test(input.period)) return { error: "an inventory count needs a period like '2026-08'" }
  const inputLines = Array.isArray(input.lines) ? input.lines : []
  if (inputLines.length < 1) return { error: 'an inventory count needs at least one counted line' }

  const lines: CountLine[] = []
  let countedValue = 0
  for (const line of inputLines) {
    const par = PAR_LEVELS.find((p) => p.id === line.parLevelId && p.locationId === locationId)
    if (!par) return { error: `unknown par level '${line.parLevelId}' for this location — see /par-levels` }
    if (typeof line.countedQty !== 'number' || line.countedQty < 0) {
      return { error: 'every line needs { parLevelId: string, countedQty: number >= 0 }' }
    }
    lines.push({
      parLevelId: par.id, itemName: par.itemName, gtin: par.gtin,
      parQty: par.parQty, countedQty: line.countedQty, varianceQty: line.countedQty - par.parQty,
    })
    countedValue += line.countedQty * par.unitCost
  }

  // The arithmetic identity, enforced at the door: opening carries forward
  // from the latest seed count; a count cannot exceed what was available.
  const prior = INVENTORY_COUNTS.filter((c) => c.locationId === locationId)
  const latest = prior[prior.length - 1]!
  const openingValue = latest.countedValue
  const purchasesValue = 0 // no supplier invoices exist for an ad-hoc workspace period
  const available = openingValue + purchasesValue
  if (countedValue > available) {
    return { error: `counted value ${countedValue} exceeds what was available (opening ${openingValue} + purchases ${purchasesValue})` }
  }
  const usageCost = openingValue + purchasesValue - countedValue

  const count: SeedInventoryCount = {
    $context: 'https://schema.org.ai',
    $type: 'InventoryCount',
    id: `ic-ws-${ws.extraCounts.length + 1}`,
    locationId,
    period: input.period,
    lines,
    openingValue,
    purchasesValue,
    countedValue,
    usageCost,
    salesValue: 0,
    foodCostPct: 0,
    supplierInvoiceIds: [],
    status: 'open',
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraCounts.push(count)
  return { count }
}
