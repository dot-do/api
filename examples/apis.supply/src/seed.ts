/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors + data-ply record types (X12 850/856/810 typed
 * documents, GS1 GTIN/GLN identity, UNSPSC catalog spine). Deterministic
 * (no RNG): reseeding is a build step, and the corpus is versioned with the
 * manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; titles/labels carry a "[demo]" tag
 *   - fictional distributor and trading partners (no real company or person
 *     names; roles are labels, never names)
 *   - every GTIN and GLN uses the GS1 DEMO PREFIX 952 with a VALID check
 *     digit (fixture law) — never a real company prefix
 *   - the row's seed-corpus route (fn-supply-chain internal purchasing,
 *     Class A, shared rail) was NOT reachable in-session at build time, so
 *     per spec §5.2 this labeled synthetic seed is the wave-zero corpus;
 *     real first-party documents accrete later at the transactions.dev rail,
 *     consent-at-rail — coordinate with the fn-supply-chain row build
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation —
 * complete document flows (850 → 856 → 810) with internally consistent
 * quantities and totals, one deliberate short-ship variance so three-way
 * matching has a real exception to find, and PO statuses spanning the whole
 * lifecycle so the `status` filter genuinely branches.
 */

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused.'

const CONTEXT = 'https://schema.org.ai'

/** GS1 mod-10 check digit for a 12-digit body → 13-digit GTIN/GLN (demo prefix 952). */
export function gs1CheckDigit(body12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = body12.charCodeAt(i) - 48
    // rightmost body digit (position 12 of 13) carries weight 3
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (sum % 10)) % 10)
}

export function gs1Id(body12: string): string {
  if (!/^952\d{9}$/.test(body12)) throw new Error(`demo GS1 body must be 952 + 9 digits, got '${body12}'`)
  return body12 + gs1CheckDigit(body12)
}

/**
 * UNSPSC coarse-grain anchor (register row G1 anchor: UNSPSC as the
 * cross-distributor catalog spine). Deliberately segment-grain: deep 8-digit
 * commodity codes attach when the register enrichment ladder types them — a
 * guessed deep code would be a fabricated fact.
 */
export const UNSPSC_ANCHOR = 'UNSPSC segment grain (register row G1 anchor; deep commodity codes attach via the enrichment ladder)'

export interface SeedPartner {
  $context: string
  $type: 'Organization'
  id: string
  name: string
  gln: string
  role: 'buyer'
  example: true
  label: string
}

export interface SeedCatalogItem {
  $context: string
  $type: 'Product'
  id: string
  gtin: string
  name: string
  unspscSegment: string
  unspscNote: string
  uom: 'case' | 'each'
  unitPrice: number
  currency: 'USD'
  example: true
  label: string
}

export interface POLine {
  gtin: string
  description: string
  orderedQty: number
  unitPrice: number
}

export type PurchaseOrderStatus = 'acknowledged' | 'shipped' | 'invoiced' | 'matched'

export interface SeedPurchaseOrder {
  $context: string
  $type: 'PurchaseOrder'
  id: string
  x12: '850'
  poNumber: string
  partner: string
  buyerGln: string
  sellerGln: string
  orderedOn: string
  status: PurchaseOrderStatus
  lines: POLine[]
  total: number
  example: true
  label: string
}

export interface ShipNoticeLine {
  gtin: string
  shippedQty: number
}

export interface SeedShipNotice {
  $context: string
  $type: 'ShipNotice'
  id: string
  x12: '856'
  poId: string
  shippedOn: string
  lines: ShipNoticeLine[]
  example: true
  label: string
}

export interface InvoiceLine {
  gtin: string
  qty: number
  unitPrice: number
  amount: number
}

export interface SeedInvoice {
  $context: string
  $type: 'Invoice'
  id: string
  x12: '810'
  poId: string
  shipNoticeId: string
  invoicedOn: string
  lines: InvoiceLine[]
  total: number
  example: true
  label: string
}

/** The demo distributor — tenant #1 on the production substrate (live-demo ruling). */
export const DISTRIBUTOR = {
  $context: CONTEXT,
  $type: 'Organization',
  id: 't-harborline',
  name: 'Harborline Distribution Co (demo)',
  gln: gs1Id('952000000001'),
  role: 'seller' as const,
  example: true as const,
  label: '[demo] Fictional wholesale distributor — sandbox seed tenant',
}

export const PARTNERS: SeedPartner[] = [
  { $context: CONTEXT, $type: 'Organization', id: 'p-cobblepine', name: 'Cobble & Pine Hardware LLC (demo)', gln: gs1Id('952000000101'), role: 'buyer', example: true, label: '[demo] Fictional trading partner' },
  { $context: CONTEXT, $type: 'Organization', id: 'p-brightquay', name: 'Brightquay Facilities Group Inc (demo)', gln: gs1Id('952000000102'), role: 'buyer', example: true, label: '[demo] Fictional trading partner' },
  { $context: CONTEXT, $type: 'Organization', id: 'p-fernrow', name: 'Fernrow Outfitters LLC (demo)', gln: gs1Id('952000000103'), role: 'buyer', example: true, label: '[demo] Fictional trading partner' },
]

const item = (n: number, name: string, uom: 'case' | 'each', unitPrice: number): SeedCatalogItem => {
  const gtin = gs1Id(`952000001${String(n).padStart(3, '0')}`)
  return {
    $context: CONTEXT,
    $type: 'Product',
    id: gtin,
    gtin,
    name: `[demo] ${name}`,
    unspscSegment: 'facilities-and-office-consumables',
    unspscNote: UNSPSC_ANCHOR,
    uom,
    unitPrice,
    currency: 'USD',
    example: true,
    label: '[demo] Synthetic catalog item — GS1 demo prefix 952, valid check digit',
  }
}

export const CATALOG_ITEMS: SeedCatalogItem[] = [
  item(1, 'Nitrile work gloves, L (case of 100)', 'case', 18.5),
  item(2, 'Heavy-duty trash liners, 55 gal (case of 200)', 'case', 42.0),
  item(3, 'Multifold paper towels (case of 16 packs)', 'case', 31.25),
  item(4, 'Neutral floor cleaner concentrate, 1 gal', 'each', 23.75),
  item(5, 'Copy paper, 20lb letter (case of 10 reams)', 'case', 47.9),
  item(6, 'Safety glasses, clear anti-fog', 'each', 4.6),
]

const gtinOf = (ix: number): string => CATALOG_ITEMS[ix]!.gtin
const priceOf = (ix: number): number => CATALOG_ITEMS[ix]!.unitPrice
const lineOf = (ix: number, qty: number): POLine => ({
  gtin: gtinOf(ix),
  description: CATALOG_ITEMS[ix]!.name,
  orderedQty: qty,
  unitPrice: priceOf(ix),
})

interface FlowSpec {
  partnerIx: number
  seq: string
  orderedOn: string
  status: PurchaseOrderStatus
  lines: POLine[]
  /** gtin → shipped qty when it differs from ordered (the short-ship variance) */
  shortShip?: Record<string, number>
}

/**
 * Six document flows spanning the whole lifecycle:
 *   matched ×2 (clean three-way), invoiced ×1 (with a deliberate short-ship
 *   variance — the match exception case), shipped ×1, acknowledged ×2.
 */
const FLOWS: FlowSpec[] = [
  { partnerIx: 0, seq: '0701', orderedOn: '2026-07-06', status: 'matched', lines: [lineOf(0, 12), lineOf(2, 8)] },
  { partnerIx: 0, seq: '0801', orderedOn: '2026-08-03', status: 'shipped', lines: [lineOf(1, 10), lineOf(3, 24)] },
  { partnerIx: 1, seq: '0702', orderedOn: '2026-07-13', status: 'matched', lines: [lineOf(2, 20), lineOf(4, 6), lineOf(5, 50)] },
  { partnerIx: 1, seq: '0802', orderedOn: '2026-08-10', status: 'acknowledged', lines: [lineOf(4, 12)] },
  { partnerIx: 2, seq: '0703', orderedOn: '2026-07-20', status: 'invoiced', lines: [lineOf(0, 30), lineOf(5, 100)], shortShip: { [gtinOf(5)]: 80 } },
  { partnerIx: 2, seq: '0805', orderedOn: '2026-08-17', status: 'acknowledged', lines: [lineOf(1, 5), lineOf(2, 5)] },
]

const round2 = (n: number): number => Math.round(n * 100) / 100
const HAS_SHIPMENT: PurchaseOrderStatus[] = ['shipped', 'invoiced', 'matched']
const HAS_INVOICE: PurchaseOrderStatus[] = ['invoiced', 'matched']

export const PURCHASE_ORDERS: SeedPurchaseOrder[] = FLOWS.map((f) => {
  const partner = PARTNERS[f.partnerIx]!
  return {
    $context: CONTEXT,
    $type: 'PurchaseOrder',
    id: `po-${partner.id.slice(2)}-${f.seq}`,
    x12: '850',
    poNumber: `DEMO-850-${f.seq}`,
    partner: partner.id,
    buyerGln: partner.gln,
    sellerGln: DISTRIBUTOR.gln,
    orderedOn: f.orderedOn,
    status: f.status,
    lines: f.lines,
    total: round2(f.lines.reduce((s, l) => s + l.orderedQty * l.unitPrice, 0)),
    example: true,
    label: RETENTION_NOTE,
  }
})

export const SHIP_NOTICES: SeedShipNotice[] = FLOWS.filter((f) => HAS_SHIPMENT.includes(f.status)).map((f) => {
  const partner = PARTNERS[f.partnerIx]!
  const poId = `po-${partner.id.slice(2)}-${f.seq}`
  return {
    $context: CONTEXT,
    $type: 'ShipNotice',
    id: `asn-${partner.id.slice(2)}-${f.seq}`,
    x12: '856',
    poId,
    shippedOn: f.orderedOn.slice(0, 8) + String(Number(f.orderedOn.slice(8)) + 4).padStart(2, '0'),
    lines: f.lines.map((l) => ({ gtin: l.gtin, shippedQty: f.shortShip?.[l.gtin] ?? l.orderedQty })),
    example: true,
    label: f.shortShip
      ? '[demo] Short-shipped ASN — the deliberate three-way-match variance case'
      : '[demo] Advance ship notice — quantities match the PO',
  }
})

export const INVOICES: SeedInvoice[] = FLOWS.filter((f) => HAS_INVOICE.includes(f.status)).map((f) => {
  const partner = PARTNERS[f.partnerIx]!
  const poId = `po-${partner.id.slice(2)}-${f.seq}`
  const lines: InvoiceLine[] = f.lines.map((l) => {
    const qty = f.shortShip?.[l.gtin] ?? l.orderedQty
    return { gtin: l.gtin, qty, unitPrice: l.unitPrice, amount: round2(qty * l.unitPrice) }
  })
  return {
    $context: CONTEXT,
    $type: 'Invoice',
    id: `inv-${partner.id.slice(2)}-${f.seq}`,
    x12: '810',
    poId,
    shipNoticeId: `asn-${partner.id.slice(2)}-${f.seq}`,
    invoicedOn: f.orderedOn.slice(0, 8) + String(Number(f.orderedOn.slice(8)) + 9).padStart(2, '0'),
    lines,
    total: round2(lines.reduce((s, l) => s + l.amount, 0)),
    example: true,
    label: '[demo] Invoice billed on shipped quantities — totals internally consistent with the ASN',
  }
})
