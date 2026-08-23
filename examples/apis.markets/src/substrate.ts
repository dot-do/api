/**
 * substrate.ts — Stratum A: the G3 APIProduct instance for register row
 * `capital-markets` (Securities & Capital Markets, NAICS 523; template spec
 * §1, docs/plans/2026-08-23-property-template-spec.md in the studio repo).
 *
 * SCOPE (from the row, permanent): execution and custody are OUT OF SCOPE.
 * The viable ply is reference/market/position data and post-trade documents.
 * No door on this substrate places, routes, amends, or cancels an order, and
 * none holds assets. Agents at this face are data pullers, never traders.
 *
 * One substrate, two plies (§3): the data face serves the typed record
 * collections below; the headless face serves the SAME collections as
 * system-of-record doors for the native-bound Nouns — the row's OMS/PMS pair
 * at the securities-capital-markets coordinate. The PMS door is the position
 * RECORD door (recording, never execution); the OMS-side door is read-only
 * post-trade documents. There is no second API.
 *
 * Schema anchors: the register row cites NO estate-settled interchange
 * standard for 523 (FIX / ISO 20022 are flagged [UNVERIFIED/BK] — named in no
 * estate doc), so record schemas fall back to schema.org generics per
 * cascade rule 2 (§3.1). $type resolves against https://schema.org.ai.
 *
 * Every record served from this file is MECHANICALLY GENERATED example data
 * (template §5.2): synthetic issuers and symbols (ZZ-prefixed, colliding with
 * no listed ticker), no real company or person names, no real ISIN/CUSIP
 * identifiers, and every record carries `example: true` with a "[demo]"
 * prefix on its name/title field. The row's source route (public disclosure
 * ingest, EDGAR/FINRA-class) is [UNVERIFIED / not ruled] — so wave zero
 * serves the §5.2 labeled synthetic seed, never a real-corpus ingest.
 */

export const SUBSTRATE = 'capital-markets'
export const ORIGIN = 'https://apis.markets'

// ---------------------------------------------------------------------------
// Noun schemas (schema.org generic fallback — cascade rule 2)
// ---------------------------------------------------------------------------

export interface Instrument {
  $type: 'Instrument' // schema.org/FinancialProduct grain (generic fallback)
  id: string
  symbol: string // synthetic ZZ-prefixed demo symbol — not a listed ticker
  name: string
  assetClass: 'equity' | 'bond' | 'fund'
  status: 'active' | 'delisted'
  currency: string
  example: true
  note: string
}

export interface Quote {
  $type: 'Quote' // reference market-data record (end-of-session), not a feed
  id: string
  instrumentId: string
  session: string // trading session date, YYYY-MM-DD
  kind: 'close'
  price: number
  currency: string
  example: true
  note: string
}

export interface Position {
  $type: 'Position' // SC-tree trade/position grain; the PMS system-of-record Noun
  id: string
  accountId: string // synthetic demo account
  instrumentId: string
  quantity: number
  costBasis: number
  currency: string
  asOf: string
  example: true
  note: string
}

export interface PostTradeDocument {
  $type: 'PostTradeDocument' // post-trade paper: confirmations and statements
  id: string
  kind: 'confirmation' | 'statement'
  accountId: string
  tradeRef?: string // synthetic reference — no real trade exists behind it
  issuedAt: string
  title: string
  summary: string
  example: true
  note: string
}

// ---------------------------------------------------------------------------
// §5.2 mechanically produced sandbox seed — fixture law: synthetic names and
// symbols only, no real issuers/tickers/identifiers, every record labeled.
// ---------------------------------------------------------------------------

const DEMO_NOTE = 'example data — synthetic sandbox seed; no real issuer, security, account, or trade exists behind this record'

export const instruments: Instrument[] = [
  { $type: 'Instrument', id: 'ins_0001', symbol: 'ZZHL', name: '[demo] Harborline Utilities Corp. — common equity', assetClass: 'equity', status: 'active', currency: 'USD', example: true, note: DEMO_NOTE },
  { $type: 'Instrument', id: 'ins_0002', symbol: 'ZZMV', name: '[demo] Meridian Valley Freight Co. — common equity', assetClass: 'equity', status: 'active', currency: 'USD', example: true, note: DEMO_NOTE },
  { $type: 'Instrument', id: 'ins_0003', symbol: 'ZZQB', name: '[demo] Quarrybrook Water District — revenue bond 2031', assetClass: 'bond', status: 'active', currency: 'USD', example: true, note: DEMO_NOTE },
  { $type: 'Instrument', id: 'ins_0004', symbol: 'ZZOS', name: '[demo] Orchard Static Media Group — common equity (delisted)', assetClass: 'equity', status: 'delisted', currency: 'USD', example: true, note: DEMO_NOTE },
]

/** End-of-session reference quotes — every ACTIVE instrument is quoted so the
 *  seed has §5.2 "realistic depth", not a token row. */
export const quotes: Quote[] = [
  { $type: 'Quote', id: 'qte_0001', instrumentId: 'ins_0001', session: '2026-08-20', kind: 'close', price: 42.18, currency: 'USD', example: true, note: DEMO_NOTE },
  { $type: 'Quote', id: 'qte_0002', instrumentId: 'ins_0001', session: '2026-08-21', kind: 'close', price: 42.73, currency: 'USD', example: true, note: DEMO_NOTE },
  { $type: 'Quote', id: 'qte_0003', instrumentId: 'ins_0002', session: '2026-08-21', kind: 'close', price: 17.05, currency: 'USD', example: true, note: DEMO_NOTE },
  { $type: 'Quote', id: 'qte_0004', instrumentId: 'ins_0003', session: '2026-08-21', kind: 'close', price: 98.4, currency: 'USD', example: true, note: DEMO_NOTE },
]

/** Two synthetic demo accounts, positions consistent with the confirmations
 *  below (a position exists because a confirmed demo trade seeded it). */
export const seedPositions: Position[] = [
  { $type: 'Position', id: 'pos_0001', accountId: 'acct_demo_01', instrumentId: 'ins_0001', quantity: 250, costBasis: 10_320.5, currency: 'USD', asOf: '2026-08-21', example: true, note: DEMO_NOTE },
  { $type: 'Position', id: 'pos_0002', accountId: 'acct_demo_01', instrumentId: 'ins_0003', quantity: 10, costBasis: 9_812.0, currency: 'USD', asOf: '2026-08-21', example: true, note: DEMO_NOTE },
  { $type: 'Position', id: 'pos_0003', accountId: 'acct_demo_02', instrumentId: 'ins_0002', quantity: 1_200, costBasis: 19_884.0, currency: 'USD', asOf: '2026-08-21', example: true, note: DEMO_NOTE },
]

export const postTradeDocuments: PostTradeDocument[] = [
  {
    $type: 'PostTradeDocument', id: 'ptd_0001', kind: 'confirmation', accountId: 'acct_demo_01', tradeRef: 'trd_demo_0001', issuedAt: '2026-08-18',
    title: '[demo] trade confirmation — 250 ZZHL @ 41.28', summary: 'Confirmation of a synthetic demo purchase seeding pos_0001. No real trade occurred.',
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'PostTradeDocument', id: 'ptd_0002', kind: 'confirmation', accountId: 'acct_demo_02', tradeRef: 'trd_demo_0002', issuedAt: '2026-08-19',
    title: '[demo] trade confirmation — 1200 ZZMV @ 16.57', summary: 'Confirmation of a synthetic demo purchase seeding pos_0003. No real trade occurred.',
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'PostTradeDocument', id: 'ptd_0003', kind: 'statement', accountId: 'acct_demo_01', issuedAt: '2026-08-01',
    title: '[demo] monthly account statement — July 2026', summary: 'Synthetic demo statement covering the seeded July activity of acct_demo_01.',
    example: true, note: DEMO_NOTE,
  },
]

// ---------------------------------------------------------------------------
// The G3 APIProduct instance (template §1 shape). Brandless by law: no ICP,
// no motion, no offer, no positioning here — those are G4 fields in
// ../projection.apis.markets.json.
// ---------------------------------------------------------------------------

export const apiProduct = {
  substrate: SUBSTRATE,
  nouns: [
    { schema: { $type: 'Instrument', $context: 'https://schema.org.ai', anchor: 'schema.org/FinancialProduct (generic fallback — no estate-settled interchange standard for NAICS 523)' }, binding: 'generated', verbs: ['listInstruments', 'getInstrument'] },
    { schema: { $type: 'Quote', $context: 'https://schema.org.ai', anchor: 'schema.org generic fallback — end-of-session reference quote' }, binding: 'generated', verbs: ['listQuotes'] },
    { schema: { $type: 'Position', $context: 'https://schema.org.ai', anchor: 'SC-tree trade/position grain — PMS system-of-record Noun' }, binding: 'native', verbs: ['listPositions', 'getPosition', 'recordPosition'] },
    { schema: { $type: 'PostTradeDocument', $context: 'https://schema.org.ai', anchor: 'post-trade documents (confirmations, statements)' }, binding: 'native', verbs: ['listPostTradeDocuments'] },
  ],
  systems: [
    // Headless ply (§3.2): the row names the OMS/PMS pair for NAICS 523 from
    // the ~52-System catalog. Both coordinates have serving doors today
    // (presence-when-true): PMS = the recordPosition system-of-record door;
    // OMS = the read-only post-trade documents door. Order placement,
    // routing, amendment, cancellation, and custody are PERMANENTLY out of
    // scope on this substrate (register row scope ruling).
    { system: 'PortfolioManagement', coordinates: ['securities-capital-markets'] },
    { system: 'OrderManagement', coordinates: ['securities-capital-markets'] },
  ],
  transports: ['REST', 'MCP'], // live-only: the transports this worker actually mounts
  operations: [
    // listInstruments is served as the branching collection door; until the
    // upstream generator re-vendor passes operationId through, its OpenAPI
    // operationId is the generator's own `listCollection` (see the ruled
    // bridge note in src/worker.ts).
    'listInstruments',
    'getInstrument',
    'listQuotes',
    'listPositions',
    'getPosition',
    'recordPosition',
    'listPostTradeDocuments',
  ],
  sandbox: {
    seedVersion: '2026-08-23.1',
    corpus: { instruments: 4, quotes: 4, positions: 3, postTradeDocuments: 3 },
    law: 'template §5.2 — mechanically generated, labeled example data; synthetic ZZ-prefixed symbols, no real issuers/tickers/ISINs/CUSIPs; reseed is a build step (edit substrate.ts)',
    retention: 'sandbox writes (recordPosition) are ephemeral: per-isolate memory, discarded on isolate recycle',
  },
  suite: { url: '/verify/suite.json', runner: 'api.qa/suite@1' },
  meters: [
    // one meter per operation — seams only at wave zero (§7.4)
    'listInstruments',
    'getInstrument',
    'listQuotes',
    'listPositions',
    'getPosition',
    'recordPosition',
    'listPostTradeDocuments',
  ],
} as const
