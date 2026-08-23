/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  CATALOG_ITEMS,
  INVOICES,
  PARTNERS,
  PURCHASE_ORDERS,
  SHIP_NOTICES,
  DISTRIBUTOR,
  RETENTION_NOTE,
  type POLine,
  type SeedPurchaseOrder,
} from './seed'

export interface Workspace {
  extraPurchaseOrders: SeedPurchaseOrder[]
}

export function createWorkspace(): Workspace {
  return { extraPurchaseOrders: [] }
}

export const listPartners = () => PARTNERS
export const listCatalogItems = () => CATALOG_ITEMS
export const getCatalogItem = (gtin: string) => CATALOG_ITEMS.find((i) => i.gtin === gtin)
export const listShipNotices = () => SHIP_NOTICES
export const getShipNotice = (id: string) => SHIP_NOTICES.find((s) => s.id === id)
export const listInvoices = () => INVOICES
export const getInvoice = (id: string) => INVOICES.find((i) => i.id === id)

export function listPurchaseOrders(ws: Workspace): SeedPurchaseOrder[] {
  return [...PURCHASE_ORDERS, ...ws.extraPurchaseOrders]
}

export function getPurchaseOrder(ws: Workspace, id: string): SeedPurchaseOrder | undefined {
  return listPurchaseOrders(ws).find((p) => p.id === id)
}

/** Document-flow links for one PO (856/810 siblings, seed corpus only). */
export function documentFlow(poId: string): { shipNoticeId?: string; invoiceId?: string } {
  return {
    shipNoticeId: SHIP_NOTICES.find((s) => s.poId === poId)?.id,
    invoiceId: INVOICES.find((i) => i.poId === poId)?.id,
  }
}

export interface SubmitPurchaseOrderInput {
  partnerId?: string
  lines?: { gtin?: string; qty?: number }[]
}

/** The agent-native EDI door: submit an 850-typed PO into the ephemeral workspace. */
export function submitPurchaseOrder(ws: Workspace, input: SubmitPurchaseOrderInput): { purchaseOrder?: SeedPurchaseOrder; error?: string } {
  const partner = PARTNERS.find((p) => p.id === input.partnerId)
  if (!partner) return { error: `unknown partnerId '${input.partnerId}' — demo partners: ${PARTNERS.map((p) => p.id).join(', ')}` }
  const rawLines = Array.isArray(input.lines) ? input.lines : []
  if (rawLines.length < 1) return { error: 'a purchase order needs at least one line: { gtin, qty }' }
  const lines: POLine[] = []
  for (const l of rawLines) {
    const item = CATALOG_ITEMS.find((c) => c.gtin === l.gtin)
    if (!item) return { error: `unknown gtin '${l.gtin}' — see /catalog-items` }
    if (typeof l.qty !== 'number' || !Number.isFinite(l.qty) || l.qty <= 0) return { error: `line for gtin '${l.gtin}' needs qty > 0` }
    lines.push({ gtin: item.gtin, description: item.name, orderedQty: l.qty, unitPrice: item.unitPrice })
  }
  const n = ws.extraPurchaseOrders.length + 1
  const purchaseOrder: SeedPurchaseOrder = {
    $context: 'https://schema.org.ai',
    $type: 'PurchaseOrder',
    id: `po-ws-${n}`,
    x12: '850',
    poNumber: `DEMO-850-WS-${n}`,
    partner: partner.id,
    buyerGln: partner.gln,
    sellerGln: DISTRIBUTOR.gln,
    orderedOn: new Date().toISOString().slice(0, 10),
    status: 'acknowledged',
    lines,
    total: Math.round(lines.reduce((s, l) => s + l.orderedQty * l.unitPrice, 0) * 100) / 100,
    example: true,
    label: `[sandbox workspace — ephemeral] ${RETENTION_NOTE}`,
  }
  ws.extraPurchaseOrders.push(purchaseOrder)
  return { purchaseOrder }
}

export interface LandedCostInput {
  gtin?: string
  qty?: number
  destinationCountry?: string
}

export interface LandedCostQuote {
  $context: string
  $type: 'LandedCostQuote'
  gtin: string
  qty: number
  destinationCountry: string
  goodsValue: number
  freightEstimate: number
  dutyEstimate: number
  landedCost: number
  currency: 'USD'
  example: true
  label: string
}

/**
 * Sandbox landed-cost computation — a LABELED DEMO FORMULA (flat synthetic
 * freight/duty factors), never presented as real duty or freight rates.
 */
export function quoteLandedCost(input: LandedCostInput): { quote?: LandedCostQuote; error?: string } {
  const item = CATALOG_ITEMS.find((c) => c.gtin === input.gtin)
  if (!item) return { error: `unknown gtin '${input.gtin}' — see /catalog-items` }
  if (typeof input.qty !== 'number' || !Number.isFinite(input.qty) || input.qty <= 0) return { error: 'qty must be a number > 0' }
  const destinationCountry = typeof input.destinationCountry === 'string' && input.destinationCountry ? input.destinationCountry.toUpperCase().slice(0, 2) : 'US'
  const r2 = (n: number) => Math.round(n * 100) / 100
  const goodsValue = r2(item.unitPrice * input.qty)
  const freightEstimate = r2(goodsValue * 0.08)
  const dutyEstimate = destinationCountry === 'US' ? 0 : r2(goodsValue * 0.05)
  return {
    quote: {
      $context: 'https://schema.org.ai',
      $type: 'LandedCostQuote',
      gtin: item.gtin,
      qty: input.qty,
      destinationCountry,
      goodsValue,
      freightEstimate,
      dutyEstimate,
      landedCost: r2(goodsValue + freightEstimate + dutyEstimate),
      currency: 'USD',
      example: true,
      label: '[demo] Landed-cost quote from a labeled demo formula (flat synthetic freight/duty factors) — NOT real duty or freight rates',
    },
  }
}
