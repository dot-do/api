/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types (order/menu record,
 * schema.org-typed · par-level / inventory-count artifact · supplier
 * invoice / food-cost records). Deterministic (no RNG): reseeding is a build
 * step, and the corpus is versioned with the manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; names carry a "(demo)" label
 *   - fictional operator, locations, suppliers, and menu items (no real
 *     company, person, or place names; personas are role labels)
 *   - synthetic EINs use the 00- prefix (never a valid real EIN range)
 *   - item GTINs use the GS1 demo prefix 952 with VALID check digits
 *     (fixture law — demo-prefixed, arithmetically real)
 *   - the row's first-party artifact-capture route (par levels, counts,
 *     invoices at the rail) was NOT provisioned in-session, so per spec §5.2
 *     this labeled synthetic seed is the wave-zero corpus
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation —
 * three locations across the NAICS 722 grain (722511 full-service bistro;
 * 722513 pizza and 722320 catering: the apis.pizza / apis.catering
 * sub-verticals INSIDE this property per the property-grain ruling), two
 * full month-end count cycles with internally consistent food-cost
 * arithmetic (openingValue + purchasesValue − countedValue = usageCost;
 * July's opening = June's counted — cycle continuity), supplier invoices
 * whose line totals sum to invoice totals and roll up to the counts'
 * purchasesValue, and orders whose totals roll up to the counts' salesValue.
 */

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const AI_CONTEXT = 'https://schema.org.ai'
const ORG_CONTEXT = 'https://schema.org'

/** GS1 demo-prefix GTIN-13: '952' + 9 digits + a VALID check digit (fixture law). */
export function gtin13(body9: string): string {
  const body = `952${body9}`
  if (!/^\d{12}$/.test(body)) throw new Error(`gtin13 needs 9 digits after the 952 prefix, got '${body9}'`)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3)
  return body + String((10 - (sum % 10)) % 10)
}

/** The demo operator — tenant #1 on the production substrate (live-demo ruling). */
export const OPERATOR = {
  $context: ORG_CONTEXT,
  $type: 'Organization',
  id: 't-coppergate',
  name: 'Coppergate Hospitality Group LLC (demo)',
  ein: '00-1000001',
  naics: '722',
  example: true as const,
  label: '[demo] Fictional restaurant group — sandbox seed tenant',
}

/** Fictional suppliers (00-prefix EINs — never a valid real EIN range). */
export const SUPPLIERS = [
  { id: 'v-harborline', name: 'Harborline Produce Co (demo)', ein: '00-3000001', supplies: 'produce & protein' },
  { id: 'v-millgate', name: 'Millgate Provisions Inc (demo)', ein: '00-3000002', supplies: 'dry goods & oil' },
] as const

export interface SeedItem {
  key: string
  name: string
  gtin: string
  unit: string
  unitCost: number
  supplierId: (typeof SUPPLIERS)[number]['id']
}

/** Shared item catalog — GS1 demo prefix 952, valid check digits. */
export const ITEMS: SeedItem[] = [
  { key: 'flour', name: 'Tipo 00 flour (demo item)', gtin: gtin13('000000001'), unit: 'kg', unitCost: 3, supplierId: 'v-millgate' },
  { key: 'oil', name: 'Olive oil (demo item)', gtin: gtin13('000000002'), unit: 'liter', unitCost: 9, supplierId: 'v-millgate' },
  { key: 'tomato', name: 'Crushed tomatoes (demo item)', gtin: gtin13('000000003'), unit: 'case', unitCost: 24, supplierId: 'v-harborline' },
  { key: 'mozz', name: 'Low-moisture mozzarella (demo item)', gtin: gtin13('000000004'), unit: 'kg', unitCost: 8, supplierId: 'v-harborline' },
  { key: 'chicken', name: 'Chicken thighs (demo item)', gtin: gtin13('000000005'), unit: 'kg', unitCost: 6, supplierId: 'v-harborline' },
  { key: 'greens', name: 'Mixed greens (demo item)', gtin: gtin13('000000006'), unit: 'case', unitCost: 18, supplierId: 'v-harborline' },
]

const itemByKey = (key: string): SeedItem => ITEMS.find((i) => i.key === key)!

export interface SeedLocation {
  $context: string
  $type: 'FoodEstablishment'
  id: string
  name: string
  naics: '722511' | '722513' | '722320'
  subVertical: 'full-service' | 'pizza' | 'catering'
  operatorId: string
  example: true
  label: string
}

/**
 * Three locations across the NAICS 722 grain. Pizza (722513) and catering
 * (722320) are the apis.pizza / apis.catering sub-verticals INSIDE this
 * property (property-grain ruling) — location grains, never separate
 * substrates.
 */
export const LOCATIONS: SeedLocation[] = [
  {
    $context: ORG_CONTEXT, $type: 'FoodEstablishment', id: 'l-peppercorn', name: 'Peppercorn Row Bistro (demo)',
    naics: '722511', subVertical: 'full-service', operatorId: OPERATOR.id, example: true,
    label: '[demo] Fictional full-service restaurant',
  },
  {
    $context: ORG_CONTEXT, $type: 'FoodEstablishment', id: 'l-sliceward', name: 'Slice Ward Pizza Co (demo)',
    naics: '722513', subVertical: 'pizza', operatorId: OPERATOR.id, example: true,
    label: '[demo] Fictional pizza shop — the apis.pizza sub-vertical grain',
  },
  {
    $context: ORG_CONTEXT, $type: 'FoodEstablishment', id: 'l-gatheredfork', name: 'Gathered Fork Catering (demo)',
    naics: '722320', subVertical: 'catering', operatorId: OPERATOR.id, example: true,
    label: '[demo] Fictional caterer — the apis.catering sub-vertical grain',
  },
]

export const PERIODS = ['2026-06', '2026-07'] as const

export interface SeedParLevel {
  $context: string
  $type: 'ParLevel'
  id: string
  locationId: string
  itemKey: string
  itemName: string
  gtin: string
  unit: string
  parQty: number
  unitCost: number
  example: true
  label: string
}

const PAR_SPEC: Record<string, [string, number][]> = {
  'l-peppercorn': [['flour', 20], ['chicken', 40], ['greens', 12], ['oil', 24]],
  'l-sliceward': [['flour', 60], ['tomato', 15], ['mozz', 50], ['oil', 12]],
  'l-gatheredfork': [['chicken', 80], ['greens', 20], ['oil', 30], ['tomato', 10]],
}

export const PAR_LEVELS: SeedParLevel[] = LOCATIONS.flatMap((l) =>
  PAR_SPEC[l.id]!.map(([key, parQty]): SeedParLevel => {
    const item = itemByKey(key)
    return {
      $context: AI_CONTEXT, $type: 'ParLevel', id: `pl-${l.id.slice(2)}-${key}`, locationId: l.id,
      itemKey: key, itemName: item.name, gtin: item.gtin, unit: item.unit, parQty, unitCost: item.unitCost,
      example: true, label: `[demo] Par level — ${item.name}, ${l.name}`,
    }
  }),
)

export interface InvoiceLine {
  itemName: string
  gtin: string
  qty: number
  unitCost: number
  lineTotal: number
}

export interface SeedSupplierInvoice {
  $context: string
  $type: 'Invoice'
  id: string
  locationId: string
  period: string
  supplierId: string
  supplierName: string
  lines: InvoiceLine[]
  total: number
  status: 'paid' | 'received'
  example: true
  label: string
}

/**
 * Two invoices per location-period (one per supplier), lines derived from the
 * location's par levels: qty = parQty × 3 (June) / × 3.5 (July). Line totals
 * sum to the invoice total by construction (tested).
 */
export const SUPPLIER_INVOICES: SeedSupplierInvoice[] = LOCATIONS.flatMap((l) =>
  PERIODS.flatMap((period): SeedSupplierInvoice[] => {
    const mult = period === '2026-06' ? 3 : 3.5
    return SUPPLIERS.map((s) => {
      const lines: InvoiceLine[] = PAR_LEVELS.filter((p) => p.locationId === l.id)
        .filter((p) => itemByKey(p.itemKey).supplierId === s.id)
        .map((p) => {
          const qty = p.parQty * mult
          return { itemName: p.itemName, gtin: p.gtin, qty, unitCost: p.unitCost, lineTotal: qty * p.unitCost }
        })
      return {
        $context: ORG_CONTEXT, $type: 'Invoice', id: `si-${l.id.slice(2)}-${period}-${s.id.slice(2)}`,
        locationId: l.id, period, supplierId: s.id, supplierName: s.name,
        lines, total: lines.reduce((sum, x) => sum + x.lineTotal, 0),
        status: period === '2026-06' ? 'paid' : 'received', example: true,
        label: `[demo] Supplier invoice — ${s.name}, ${l.name}, ${period}`,
      }
    }).filter((inv) => inv.lines.length > 0)
  }),
)

export interface SeedMenuItem {
  id: string
  name: string
  price: number
}

export interface SeedMenu {
  $context: string
  $type: 'Menu'
  id: string
  locationId: string
  items: SeedMenuItem[]
  example: true
  label: string
}

const MENU_SPEC: Record<string, [string, number][]> = {
  'l-peppercorn': [['Roast chicken plate (demo)', 24], ['Market greens salad (demo)', 14], ['Olive-oil cake (demo)', 9]],
  'l-sliceward': [['Margherita pie (demo)', 16], ['White pie (demo)', 18], ['Garlic knots (demo)', 7]],
  'l-gatheredfork': [['Buffet package per guest (demo)', 38], ['Canape platter (demo)', 65], ['Beverage service per guest (demo)', 12]],
}

export const MENUS: SeedMenu[] = LOCATIONS.map((l) => ({
  $context: ORG_CONTEXT, $type: 'Menu' as const, id: `m-${l.id.slice(2)}`, locationId: l.id,
  items: MENU_SPEC[l.id]!.map(([name, price], ix): SeedMenuItem => ({ id: `mi-${l.id.slice(2)}-${ix + 1}`, name, price })),
  example: true as const, label: `[demo] Menu — ${l.name}`,
}))

export interface OrderLine {
  menuItemId: string
  name: string
  qty: number
  price: number
  lineTotal: number
}

export interface SeedOrder {
  $context: string
  $type: 'Order'
  id: string
  locationId: string
  period: string
  channel: 'dine-in' | 'pickup' | 'catering-event'
  lines: OrderLine[]
  total: number
  example: true
  label: string
}

const CHANNEL: Record<string, SeedOrder['channel']> = {
  'l-peppercorn': 'dine-in',
  'l-sliceward': 'pickup',
  'l-gatheredfork': 'catering-event',
}

/** Two orders per location-period; order totals roll up to the count's salesValue (tested). */
export const ORDERS: SeedOrder[] = LOCATIONS.flatMap((l) =>
  PERIODS.flatMap((period): SeedOrder[] => {
    const menu = MENUS.find((m) => m.locationId === l.id)!
    const qtySets: [number, number, number][] = period === '2026-06' ? [[10, 6, 4], [5, 3, 2]] : [[12, 7, 5], [6, 4, 3]]
    return qtySets.map((qtys, ox) => {
      const lines: OrderLine[] = menu.items.map((mi, ix) => ({
        menuItemId: mi.id, name: mi.name, qty: qtys[ix]!, price: mi.price, lineTotal: qtys[ix]! * mi.price,
      }))
      return {
        $context: ORG_CONTEXT, $type: 'Order' as const, id: `o-${l.id.slice(2)}-${period}-${ox + 1}`,
        locationId: l.id, period, channel: CHANNEL[l.id]!,
        lines, total: lines.reduce((sum, x) => sum + x.lineTotal, 0),
        example: true as const, label: `[demo] Order record #${ox + 1} — ${l.name}, ${period}`,
      }
    })
  }),
)

export interface CountLine {
  parLevelId: string
  itemName: string
  gtin: string
  parQty: number
  countedQty: number
  varianceQty: number
}

export interface SeedInventoryCount {
  $context: string
  $type: 'InventoryCount'
  id: string
  locationId: string
  period: string
  lines: CountLine[]
  openingValue: number
  purchasesValue: number
  countedValue: number
  usageCost: number
  salesValue: number
  foodCostPct: number
  supplierInvoiceIds: string[]
  status: 'open' | 'reconciled' // the COUNT_STATUSES lifecycle (./substrate.ts)
  example: true
  label: string
}

/**
 * One month-end count per location-period. Food-cost arithmetic is internally
 * consistent BY CONSTRUCTION and tested:
 *   usageCost = openingValue + purchasesValue − countedValue
 *   purchasesValue = Σ that period's supplier-invoice totals
 *   July's openingValue = June's countedValue (cycle continuity)
 *   salesValue = Σ that period's order totals
 * June's counts are reconciled (the completed cycle); July's are open — the
 * status filter genuinely branches.
 */
export const INVENTORY_COUNTS: SeedInventoryCount[] = LOCATIONS.flatMap((l) => {
  const purchases = (period: string) =>
    SUPPLIER_INVOICES.filter((si) => si.locationId === l.id && si.period === period).reduce((sum, si) => sum + si.total, 0)
  const sales = (period: string) =>
    ORDERS.filter((o) => o.locationId === l.id && o.period === period).reduce((sum, o) => sum + o.total, 0)

  const openingJun = purchases('2026-06') * 0.5
  const countedJun = purchases('2026-06') * 0.45
  const openingJul = countedJun // cycle continuity — July opens on June's counted value
  const countedJul = purchases('2026-07') * 0.4

  return PERIODS.map((period): SeedInventoryCount => {
    const isJune = period === '2026-06'
    const openingValue = isJune ? openingJun : openingJul
    const countedValue = isJune ? countedJun : countedJul
    const purchasesValue = purchases(period)
    const salesValue = sales(period)
    const usageCost = openingValue + purchasesValue - countedValue
    const lines: CountLine[] = PAR_LEVELS.filter((p) => p.locationId === l.id).map((p) => {
      const countedQty = p.parQty * (isJune ? 0.8 : 1.1)
      return { parLevelId: p.id, itemName: p.itemName, gtin: p.gtin, parQty: p.parQty, countedQty, varianceQty: countedQty - p.parQty }
    })
    return {
      $context: AI_CONTEXT, $type: 'InventoryCount', id: `ic-${l.id.slice(2)}-${period}`,
      locationId: l.id, period, lines,
      openingValue, purchasesValue, countedValue, usageCost, salesValue,
      foodCostPct: usageCost / salesValue,
      supplierInvoiceIds: SUPPLIER_INVOICES.filter((si) => si.locationId === l.id && si.period === period).map((si) => si.id),
      status: isJune ? 'reconciled' : 'open',
      example: true, label: RETENTION_NOTE,
    }
  })
})
