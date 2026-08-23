/**
 * store.ts — the sandbox workspace: the §5.2 seed corpus (tenant #1, the
 * live-demo ruling — same handlers as product) plus an EPHEMERAL in-memory
 * anonymous workspace for writes (per-isolate, disclosed retention, never
 * persisted). One service layer — the REST routes and the MCP tools both
 * call these functions: one definition, two transports.
 */

import {
  GS1_DEMO_PREFIX,
  OFFERS,
  ORDERS,
  PRODUCTS,
  gtin13,
  identityOf,
  isValidGtin13,
  type OrderLine,
  type ProductIdentity,
  type SeedOffer,
  type SeedOrder,
  type SeedProduct,
} from './seed'

export interface Workspace {
  extraProducts: SeedProduct[]
  extraOffers: SeedOffer[]
  extraOrders: SeedOrder[]
  mintCounter: number
}

export function createWorkspace(): Workspace {
  return { extraProducts: [], extraOffers: [], extraOrders: [], mintCounter: 0 }
}

const CONTEXT = 'https://schema.org.ai'
const WS_LABEL = 'sandbox-minted example record — ephemeral anonymous workspace (in-memory, per-isolate); no payment occurs'

export const listProducts = (ws: Workspace) => [...PRODUCTS, ...ws.extraProducts]
export const getProduct = (ws: Workspace, gtin: string) => listProducts(ws).find((p) => p.gtin === gtin)
export const listOffers = (ws: Workspace) => [...OFFERS, ...ws.extraOffers]
export const getOffer = (ws: Workspace, id: string) => listOffers(ws).find((o) => o.id === id)
export const listOrders = (ws: Workspace) => [...ORDERS, ...ws.extraOrders]
export const getOrder = (ws: Workspace, id: string) => listOrders(ws).find((o) => o.id === id)

export function resolveIdentity(ws: Workspace, gtin: string): ProductIdentity | undefined {
  const product = getProduct(ws, gtin)
  return product && identityOf(product)
}

export interface CreateProductInput {
  gtin?: string
  name?: string
  brand?: string
  category?: string
  gpcBrick?: string
  unspsc?: string
  hts?: string
}

export function createProduct(ws: Workspace, input: CreateProductInput): { product?: SeedProduct; error?: string } {
  if (!input.name || typeof input.name !== 'string') return { error: 'a product needs a name' }
  let gtin = input.gtin
  if (gtin !== undefined) {
    if (!isValidGtin13(String(gtin))) return { error: `'${gtin}' is not a valid GTIN-13 (13 digits, GS1 mod-10 check digit)` }
    if (!String(gtin).startsWith(GS1_DEMO_PREFIX)) return { error: `sandbox GTINs must sit in the GS1 demo prefix ${GS1_DEMO_PREFIX} space (fixture law); '${gtin}' does not` }
    if (getProduct(ws, String(gtin))) return { error: `GTIN ${gtin} already exists in this catalog` }
    gtin = String(gtin)
  } else {
    ws.mintCounter += 1
    gtin = gtin13(`${GS1_DEMO_PREFIX}9${String(ws.mintCounter).padStart(8, '0')}`)
  }
  const product: SeedProduct = {
    $context: CONTEXT,
    $type: 'Product',
    gtin,
    name: input.name,
    brand: typeof input.brand === 'string' ? input.brand : 'unbranded (sandbox)',
    category: typeof input.category === 'string' ? input.category : 'uncategorized',
    gpcBrick: typeof input.gpcBrick === 'string' ? input.gpcBrick : '00000000',
    unspsc: typeof input.unspsc === 'string' ? input.unspsc : '00000000',
    hts: typeof input.hts === 'string' ? input.hts : '0000.00.00',
    merchant: 'anonymous sandbox workspace (demo)',
    example: true,
    label: WS_LABEL,
  }
  ws.extraProducts.push(product)
  return { product }
}

export interface CreateOfferInput {
  gtin?: string
  price?: number
  availability?: string
}

export function createOffer(ws: Workspace, input: CreateOfferInput): { offer?: SeedOffer; error?: string } {
  if (!input.gtin || !getProduct(ws, String(input.gtin))) {
    return { error: `an offer needs a gtin that exists in the catalog — see /products` }
  }
  if (typeof input.price !== 'number' || !(input.price >= 0)) return { error: 'an offer needs a price >= 0 (number)' }
  const availability = input.availability === 'OutOfStock' ? 'OutOfStock' : 'InStock'
  const offer: SeedOffer = {
    $context: CONTEXT,
    $type: 'Offer',
    id: `off-ws-${ws.extraOffers.length + 1}`,
    gtin: String(input.gtin),
    price: input.price,
    priceCurrency: 'USD',
    availability,
    seller: 'anonymous sandbox workspace (demo)',
    example: true,
    label: WS_LABEL,
  }
  ws.extraOffers.push(offer)
  return { offer }
}

export interface CreateOrderInput {
  lines?: { gtin?: string; quantity?: number }[]
  customer?: string
}

export function createOrder(ws: Workspace, input: CreateOrderInput): { order?: SeedOrder; error?: string } {
  const rawLines = Array.isArray(input.lines) ? input.lines : []
  if (rawLines.length === 0) return { error: 'an order needs at least one line: { gtin, quantity }' }
  const lines: OrderLine[] = []
  for (const raw of rawLines) {
    const gtin = String(raw.gtin ?? '')
    const quantity = raw.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return { error: `every order line needs an integer quantity >= 1 (line for '${gtin}')` }
    }
    const product = getProduct(ws, gtin)
    if (!product) return { error: `no product with GTIN '${gtin}' — see /products` }
    const inStock = listOffers(ws)
      .filter((o) => o.gtin === gtin && o.availability === 'InStock')
      .sort((a, b) => a.price - b.price)[0]
    if (!inStock) return { error: `no InStock offer for GTIN '${gtin}' — see /offers?gtin=${gtin}` }
    lines.push({ gtin, name: product.name, quantity, unitPrice: inStock.price })
  }
  const order: SeedOrder = {
    $context: CONTEXT,
    $type: 'Order',
    id: `ord-ws-${ws.extraOrders.length + 1}`,
    status: 'pending',
    customer: typeof input.customer === 'string' ? input.customer : 'anonymous sandbox agent',
    lines,
    total: Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100,
    orderedAt: new Date().toISOString().slice(0, 10),
    example: true,
    label: WS_LABEL,
  }
  ws.extraOrders.push(order)
  return { order }
}
