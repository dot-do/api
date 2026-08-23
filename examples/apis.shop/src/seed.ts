/**
 * seed.ts — the §5.2 sandbox seed corpus, produced MECHANICALLY from the
 * register row's G1 anchors (GS1 GTIN/GPC/Digital Link, schema.org
 * Offer/Order/Product, UNSPSC) + data-ply record types. Deterministic (no
 * RNG): reseeding is a build step, and the corpus is versioned with the
 * manifest.
 *
 * SYNTHETIC DATA — every record here is example data and says so:
 *   - `example: true` on every record; merchant/seller names carry "(demo)"
 *   - fictional merchants and brands (no real company or person names)
 *   - every GTIN sits in the GS1 demo prefix 952 space with a VALID check
 *     digit (computed, never hand-typed) — estate fixture law
 *   - GPC / UNSPSC / HTS values are format-valid EXAMPLE classification
 *     codes, not authoritative assignments; the crosswalk mechanism is the
 *     product, the assignments are labeled sandbox data
 *   - merchant product feeds are Class B (agreements not landed) — so the
 *     whole catalog is labeled synthetic per spec §5.2 until they do
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation and
 * gives each Noun honest depth — offers include an OutOfStock listing and a
 * sale price; orders cover the full lifecycle INCLUDING a returned order,
 * because a seed corpus in which every order delivers is not world-class
 * example data, it is advertising.
 */

export const SEED_VERSION = '1.0.0'

export const RETENTION_NOTE =
  'Example data: this sandbox is a live environment of the real product over simulated data. ' +
  'Anonymous workspace writes are ephemeral (in-memory, per-isolate) and are never persisted or reused. No payment occurs anywhere in this sandbox.'

export const SEED_LABEL = 'synthetic example data — fictional merchants and products in the GS1 demo-952 GTIN space; not a real catalog'

/** GS1 demo prefix — the fixture-law GTIN space for synthetic records. */
export const GS1_DEMO_PREFIX = '952'

/** GTIN-13 check digit (GS1 mod-10): weights 1/3 from the left of a 12-digit body. */
export function gtin13(body12: string): string {
  if (!/^\d{12}$/.test(body12)) throw new Error(`gtin13 body must be 12 digits, got '${body12}'`)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3)
  return body12 + String((10 - (sum % 10)) % 10)
}

/** Validate any GTIN-13 (used by the sandbox catalog door too). */
export function isValidGtin13(gtin: string): boolean {
  return /^\d{13}$/.test(gtin) && gtin13(gtin.slice(0, 12)) === gtin
}

/** Canonical GS1 Digital Link URI (AI 01 = GTIN-14, zero-padded). */
export function digitalLinkUri(gtin: string): string {
  return `https://id.gs1.org/01/${gtin.padStart(14, '0')}`
}

const g = (itemRef: string) => gtin13(`${GS1_DEMO_PREFIX}0001${itemRef}`) // 952 0001 xxxxx + check

export interface SeedProduct {
  $context: string
  $type: 'Product'
  gtin: string
  name: string
  brand: string
  category: string
  /** format-valid EXAMPLE classification codes — not authoritative assignments */
  gpcBrick: string
  unspsc: string
  hts: string
  merchant: string
  example: true
  label: string
}

export interface SeedOffer {
  $context: string
  $type: 'Offer'
  id: string
  gtin: string
  price: number
  priceCurrency: 'USD'
  availability: 'InStock' | 'OutOfStock'
  seller: string
  saleNote?: string
  example: true
  label: string
}

export interface OrderLine {
  gtin: string
  name: string
  quantity: number
  unitPrice: number
}

export interface SeedOrder {
  $context: string
  $type: 'Order'
  id: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'returned'
  customer: string
  lines: OrderLine[]
  total: number
  orderedAt: string
  example: true
  label: string
}

const CONTEXT = 'https://schema.org.ai'
const MERCHANT = 'Bramble & Vale Mercantile (demo)'
const SELLER_MARKETPLACE = 'Quillhaven Goods (demo)'

const p = (gtin: string, name: string, brand: string, category: string, gpcBrick: string, unspsc: string, hts: string): SeedProduct => ({
  $context: CONTEXT,
  $type: 'Product',
  gtin,
  name,
  brand,
  category,
  gpcBrick,
  unspsc,
  hts,
  merchant: MERCHANT,
  example: true,
  label: SEED_LABEL,
})

/** GTINs — every one computed in the 952 demo space. */
export const GTINS = {
  coffee: g('00101'),
  filters: g('00102'),
  detergent: g('00103'),
  candle: g('00201'),
  throwBlanket: g('00202'),
  mug: g('00203'),
  socks: g('00301'),
  beanie: g('00302'),
} as const

export const PRODUCTS: SeedProduct[] = [
  p(GTINS.coffee, 'Hearthside Roast Whole Bean Coffee, 12 oz', 'Hearthside Roasting Co. (demo)', 'pantry', '10000115', '50201706', '0901.21.00'),
  p(GTINS.filters, 'Hearthside #4 Paper Coffee Filters, 100 ct', 'Hearthside Roasting Co. (demo)', 'pantry', '10000115', '52151504', '4823.20.10'),
  p(GTINS.detergent, 'Fernbrook Free & Clear Laundry Detergent, 64 loads', 'Fernbrook Home (demo)', 'household', '47100302', '47131811', '3402.50.11'),
  p(GTINS.candle, 'Fernbrook Cedar & Clove Soy Candle, 8 oz', 'Fernbrook Home (demo)', 'home', '10005844', '56101601', '3406.00.00'),
  p(GTINS.throwBlanket, 'Quillhaven Herringbone Throw Blanket', 'Quillhaven (demo)', 'home', '10005843', '52121505', '6301.40.00'),
  p(GTINS.mug, 'Quillhaven Stoneware Mug, 14 oz', 'Quillhaven (demo)', 'home', '10005845', '52152003', '6912.00.44'),
  p(GTINS.socks, 'Loomfield Merino Crew Socks, 3-pack', 'Loomfield & Co. (demo)', 'apparel', '10001071', '53102409', '6115.94.00'),
  p(GTINS.beanie, 'Loomfield Ribbed Knit Beanie', 'Loomfield & Co. (demo)', 'apparel', '10001340', '53102516', '6505.00.90'),
]

const o = (id: string, gtin: string, price: number, availability: SeedOffer['availability'], seller: string, saleNote?: string): SeedOffer => ({
  $context: CONTEXT,
  $type: 'Offer',
  id,
  gtin,
  price,
  priceCurrency: 'USD',
  availability,
  seller,
  ...(saleNote ? { saleNote } : {}),
  example: true,
  label: SEED_LABEL,
})

export const OFFERS: SeedOffer[] = [
  o('off-coffee-1', GTINS.coffee, 14.5, 'InStock', MERCHANT),
  o('off-coffee-sub', GTINS.coffee, 13.05, 'InStock', MERCHANT, 'recurring-consumable price (restock cadence) — the agents-as-buyers overlay the register row names'),
  o('off-filters-1', GTINS.filters, 4.25, 'InStock', MERCHANT),
  o('off-detergent-1', GTINS.detergent, 18.99, 'InStock', MERCHANT),
  o('off-candle-1', GTINS.candle, 16.0, 'InStock', MERCHANT),
  o('off-blanket-1', GTINS.throwBlanket, 68.0, 'InStock', SELLER_MARKETPLACE),
  o('off-mug-1', GTINS.mug, 22.0, 'OutOfStock', SELLER_MARKETPLACE),
  o('off-socks-1', GTINS.socks, 24.0, 'InStock', MERCHANT),
  o('off-socks-sale', GTINS.socks, 19.2, 'InStock', MERCHANT, 'markdown — end of season'),
  o('off-beanie-1', GTINS.beanie, 21.0, 'InStock', MERCHANT),
]

const ord = (id: string, status: SeedOrder['status'], customer: string, lines: OrderLine[], orderedAt: string): SeedOrder => ({
  $context: CONTEXT,
  $type: 'Order',
  id,
  status,
  customer,
  lines,
  total: Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100,
  orderedAt,
  example: true,
  label: SEED_LABEL,
})

export const ORDERS: SeedOrder[] = [
  ord('ord-1001', 'delivered', 'customer role: household restock agent (demo)', [
    { gtin: GTINS.coffee, name: 'Hearthside Roast Whole Bean Coffee, 12 oz', quantity: 2, unitPrice: 13.05 },
    { gtin: GTINS.filters, name: 'Hearthside #4 Paper Coffee Filters, 100 ct', quantity: 1, unitPrice: 4.25 },
  ], '2026-07-02'),
  ord('ord-1002', 'delivered', 'customer role: gift buyer (demo)', [
    { gtin: GTINS.candle, name: 'Fernbrook Cedar & Clove Soy Candle, 8 oz', quantity: 1, unitPrice: 16.0 },
    { gtin: GTINS.throwBlanket, name: 'Quillhaven Herringbone Throw Blanket', quantity: 1, unitPrice: 68.0 },
  ], '2026-07-15'),
  ord('ord-1003', 'returned', 'customer role: apparel shopper (demo)', [
    { gtin: GTINS.beanie, name: 'Loomfield Ribbed Knit Beanie', quantity: 1, unitPrice: 21.0 },
  ], '2026-07-21'),
  ord('ord-1004', 'shipped', 'customer role: household restock agent (demo)', [
    { gtin: GTINS.detergent, name: 'Fernbrook Free & Clear Laundry Detergent, 64 loads', quantity: 1, unitPrice: 18.99 },
  ], '2026-08-14'),
  ord('ord-1005', 'pending', 'customer role: apparel shopper (demo)', [
    { gtin: GTINS.socks, name: 'Loomfield Merino Crew Socks, 3-pack', quantity: 2, unitPrice: 19.2 },
  ], '2026-08-22'),
]

export interface ProductIdentity {
  $context: string
  $type: 'ProductIdentity'
  gtin: string
  gtin14: string
  digitalLink: string
  crosswalk: { gpcBrick: string; unspsc: string; hts: string }
  binding: 'generated'
  note: string
  example: true
  label: string
}

/** The 4-lens crosswalk, computed mechanically from the catalog (generated binding). */
export function identityOf(product: SeedProduct): ProductIdentity {
  return {
    $context: CONTEXT,
    $type: 'ProductIdentity',
    gtin: product.gtin,
    gtin14: product.gtin.padStart(14, '0'),
    digitalLink: digitalLinkUri(product.gtin),
    crosswalk: { gpcBrick: product.gpcBrick, unspsc: product.unspsc, hts: product.hts },
    binding: 'generated',
    note: 'crosswalk computed from the catalog record; classification values are format-valid example assignments (labeled sandbox data). Live resolution against id.gs1.org is not performed at wave zero.',
    example: true,
    label: SEED_LABEL,
  }
}
