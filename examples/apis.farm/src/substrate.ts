/**
 * substrate.ts — Stratum A: the G3 APIProduct instance for register row
 * `agriculture-food` (template spec §1, docs/plans/2026-08-23-property-template-spec.md
 * in the studio repo).
 *
 * One substrate, two plies (§3): the data face serves the typed record
 * collections below; the headless face serves the SAME collections as
 * system-of-record doors for the native-bound Nouns (Product/Facility master
 * data — the records the rail events reference). There is no second API.
 *
 * RAIL LAW (register anchor, binding): the FSMA-204 traceability grain rides
 * the warehousing-traceability row's rail — epcis.dev/barcoding.dev (one
 * rail, two rows by design). This property CONSUMES rail events and never
 * re-implements EPCIS capture: the TraceabilityLot Noun is `federated`, and
 * its `cteRefs` are references to rail events, not events served here.
 *
 * Every record served from this file is MECHANICALLY GENERATED example data
 * (template §5.2): fictional facility names, GS1 demo prefix 952 with valid
 * check digits on every GTIN/GLN, no real company or person names; every
 * record carries `example: true` and a "[demo]" name prefix. The row's
 * source route (owned corpus, consent-at-rail) is Class A by construction
 * but captures at the RAIL, not here — so wave zero serves the §5.2
 * synthetic seed, labeled.
 */

export const SUBSTRATE = 'agriculture-food'
export const ORIGIN = 'https://apis.farm'
export const RAIL = 'https://epcis.dev'

// ---------------------------------------------------------------------------
// Noun schemas (G1 anchors: GS1 EPCIS 2.0 + GTIN/GLN, FSMA-204 KDE/CTE grain;
// schema.org fallback where no industry standard names the record).
// $type resolves against https://schema.org.ai.
// ---------------------------------------------------------------------------

/** A rail-event reference — the CTE lives on the traceability rail. */
export interface CTERef {
  cte: 'harvesting' | 'cooling' | 'initial-packing' | 'transformation' | 'shipping' | 'receiving'
  rail: string // the rail origin (epcis.dev)
  eventId: string // rail event id — dereference at the rail, not here
  note: string
}

export interface TraceabilityLot {
  $type: 'TraceabilityLot' // FSMA-204 traceability-lot grain (KDEs); EPCIS-typed via the rail
  id: string
  tlc: string // traceability lot code
  gtin: string // GS1 GTIN-13, demo prefix 952
  productId: string
  quantity: number
  uom: string
  status: 'harvested' | 'transformed' | 'shipped' | 'received'
  originGln: string // GLN where the lot originated
  currentGln: string // GLN of current custody
  harvestDate?: string
  inputLotIds?: string[] // transformation inputs (chain-of-custody)
  kdes: Record<string, string> // FSMA-204 key data elements at this lot's grain
  cteRefs: CTERef[] // rail event references — consumed, never re-implemented
  example: true
  note: string
}

export interface Product {
  $type: 'Product' // schema.org/Product grain; GTIN-identified thing (G1 anchor)
  id: string
  gtin: string // GS1 GTIN-13, demo prefix 952, valid check digit
  name: string
  ftl: boolean // on the FSMA-204 Food Traceability List
  category: string
  example: true
  note: string
}

export interface Facility {
  $type: 'Facility' // schema.org/Place grain; GLN-identified location (G1 anchor)
  id: string
  gln: string // GS1 GLN-13, demo prefix 952, valid check digit
  name: string
  role: 'grower' | 'processor' | 'distributor'
  example: true
  note: string
}

export interface ComplianceArtifact {
  $type: 'ComplianceArtifact' // FSMA-204 compliance deliverable derived from the lot chain
  id: string
  kind: 'traceability-plan' | 'sortable-sheet'
  title: string
  facilityGln: string
  coversLotIds: string[]
  rowCount: number
  generatedAt: string
  example: true
  note: string
}

// ---------------------------------------------------------------------------
// §5.2 mechanically produced sandbox seed — fixture law: GS1 demo prefix 952
// with valid check digits, fictional names only, every record labeled.
// ---------------------------------------------------------------------------

const DEMO_NOTE = 'example data — synthetic sandbox seed, not a real lot, product, facility, or filing'

export const facilities: Facility[] = [
  { $type: 'Facility', id: 'fac_0001', gln: '9520002000019', name: '[demo] Greenrow Farms', role: 'grower', example: true, note: DEMO_NOTE },
  { $type: 'Facility', id: 'fac_0002', gln: '9520002000026', name: '[demo] Millbrook Fresh Processing', role: 'processor', example: true, note: DEMO_NOTE },
  { $type: 'Facility', id: 'fac_0003', gln: '9520002000033', name: '[demo] Stonewheel Distribution', role: 'distributor', example: true, note: DEMO_NOTE },
]

export const products: Product[] = [
  { $type: 'Product', id: 'prd_0001', gtin: '9520001000010', name: '[demo] Romaine hearts, 2ct', ftl: true, category: 'leafy greens', example: true, note: DEMO_NOTE },
  { $type: 'Product', id: 'prd_0002', gtin: '9520001000027', name: '[demo] Fresh-cut salad mix, 10oz', ftl: true, category: 'fresh-cut produce', example: true, note: DEMO_NOTE },
  { $type: 'Product', id: 'prd_0003', gtin: '9520001000034', name: '[demo] Cucumbers, bulk', ftl: true, category: 'fresh produce', example: true, note: DEMO_NOTE },
  { $type: 'Product', id: 'prd_0004', gtin: '9520001000041', name: '[demo] Soft ripened cheese wheel', ftl: true, category: 'soft cheese', example: true, note: DEMO_NOTE },
]

const railRef = (cte: CTERef['cte'], eventId: string): CTERef => ({
  cte,
  rail: RAIL,
  eventId,
  note: 'rail event reference — the EPCIS event lives on the traceability rail (one rail, two rows); dereference there',
})

/** A full farm-to-DC chain (harvest → transformation → shipping → receiving)
 *  so the seed has the §5.2 "realistic depth" — chain-of-custody is walkable
 *  end to end, and every declared operation has substance to answer with. */
export const lots: TraceabilityLot[] = [
  {
    $type: 'TraceabilityLot', id: 'lot_0001', tlc: '952-GRF-2026-0801', gtin: '9520001000010', productId: 'prd_0001',
    quantity: 1200, uom: 'case', status: 'harvested', originGln: '9520002000019', currentGln: '9520002000019',
    harvestDate: '2026-08-01',
    kdes: { commodity: 'romaine', harvestLocation: 'gln:9520002000019', coolingDate: '2026-08-01' },
    cteRefs: [railRef('harvesting', 'evt_demo_h_0001'), railRef('cooling', 'evt_demo_c_0001')],
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'TraceabilityLot', id: 'lot_0002', tlc: '952-GRF-2026-0802', gtin: '9520001000010', productId: 'prd_0001',
    quantity: 900, uom: 'case', status: 'harvested', originGln: '9520002000019', currentGln: '9520002000019',
    harvestDate: '2026-08-02',
    kdes: { commodity: 'romaine', harvestLocation: 'gln:9520002000019', coolingDate: '2026-08-02' },
    cteRefs: [railRef('harvesting', 'evt_demo_h_0002'), railRef('cooling', 'evt_demo_c_0002')],
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'TraceabilityLot', id: 'lot_0003', tlc: '952-MFP-2026-0803', gtin: '9520001000027', productId: 'prd_0002',
    quantity: 4800, uom: 'each', status: 'transformed', originGln: '9520002000026', currentGln: '9520002000026',
    inputLotIds: ['lot_0001', 'lot_0002'],
    kdes: { transformationDate: '2026-08-03', transformationLocation: 'gln:9520002000026' },
    cteRefs: [railRef('transformation', 'evt_demo_t_0001'), railRef('initial-packing', 'evt_demo_p_0001')],
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'TraceabilityLot', id: 'lot_0004', tlc: '952-MFP-2026-0804', gtin: '9520001000027', productId: 'prd_0002',
    quantity: 2400, uom: 'each', status: 'shipped', originGln: '9520002000026', currentGln: '9520002000026',
    inputLotIds: ['lot_0003'],
    kdes: { shipDate: '2026-08-04', shipFrom: 'gln:9520002000026', shipTo: 'gln:9520002000033' },
    cteRefs: [railRef('shipping', 'evt_demo_s_0001')],
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'TraceabilityLot', id: 'lot_0005', tlc: '952-SWD-2026-0805', gtin: '9520001000027', productId: 'prd_0002',
    quantity: 2400, uom: 'each', status: 'received', originGln: '9520002000026', currentGln: '9520002000033',
    inputLotIds: ['lot_0004'],
    kdes: { receiveDate: '2026-08-05', receiveLocation: 'gln:9520002000033' },
    cteRefs: [railRef('receiving', 'evt_demo_r_0001')],
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'TraceabilityLot', id: 'lot_0006', tlc: '952-GRF-2026-0806', gtin: '9520001000034', productId: 'prd_0003',
    quantity: 300, uom: 'crate', status: 'harvested', originGln: '9520002000019', currentGln: '9520002000019',
    harvestDate: '2026-08-06',
    kdes: { commodity: 'cucumber', harvestLocation: 'gln:9520002000019', coolingDate: '2026-08-06' },
    cteRefs: [railRef('harvesting', 'evt_demo_h_0003')],
    example: true, note: DEMO_NOTE,
  },
]

export const complianceArtifacts: ComplianceArtifact[] = [
  {
    $type: 'ComplianceArtifact', id: 'art_0001', kind: 'traceability-plan',
    title: '[demo] FSMA-204 traceability plan — Millbrook Fresh Processing',
    facilityGln: '9520002000026', coversLotIds: [], rowCount: 0, generatedAt: '2026-08-10',
    example: true, note: DEMO_NOTE,
  },
  {
    $type: 'ComplianceArtifact', id: 'art_0002', kind: 'sortable-sheet',
    title: '[demo] FSMA-204 sortable sheet — salad-mix chain, Aug 2026',
    facilityGln: '9520002000033', coversLotIds: ['lot_0001', 'lot_0002', 'lot_0003', 'lot_0004', 'lot_0005'], rowCount: 8, generatedAt: '2026-08-10',
    example: true, note: DEMO_NOTE,
  },
]

// ---------------------------------------------------------------------------
// The G3 APIProduct instance (template §1 shape). Brandless by law: no ICP,
// no motion, no offer, no positioning here — those are G4 fields in
// ../projection.apis.farm.json. The APIProduct interface's normative home is
// primitives.org.ai `digital-products` (prove-then-extract); local for now.
// ---------------------------------------------------------------------------

export const apiProduct = {
  substrate: SUBSTRATE,
  nouns: [
    {
      schema: { $type: 'TraceabilityLot', $context: 'https://schema.org.ai', anchor: 'GS1 EPCIS 2.0 / FSMA-204 KDE-CTE grain (via the rail)' },
      binding: 'federated', // rides epcis.dev/barcoding.dev — rail events consumed, never re-implemented here
      verbs: ['listLots', 'getLot'],
    },
    {
      schema: { $type: 'Product', $context: 'https://schema.org.ai', anchor: 'schema.org/Product; GS1 GTIN identified thing' },
      binding: 'native', // vertical master data — the headless system-of-record door
      verbs: ['listProducts', 'registerProduct'],
    },
    {
      schema: { $type: 'Facility', $context: 'https://schema.org.ai', anchor: 'schema.org/Place; GS1 GLN identified location' },
      binding: 'native',
      verbs: ['listFacilities'],
    },
    {
      schema: { $type: 'ComplianceArtifact', $context: 'https://schema.org.ai', anchor: 'FSMA-204 compliance deliverable (derived)' },
      binding: 'generated',
      verbs: ['listComplianceArtifacts'],
    },
  ],
  systems: [
    // The register's cascade verdict for this row is "none modal (ERP
    // fragments)": no single O*NET-modal vertical system for NAICS 11/311-312.
    // The row rides the warehousing-traceability row's shared WMS/worklist
    // event rail (one rail, two rows by design) — declared here in the row's
    // own words, never as an invented 52-System catalog entry. The row's
    // farm-management-system and QA-workbench candidates are [UNVERIFIED] in
    // the register and therefore not declared (presence-when-true).
    { system: 'shared WMS/worklist event rail (epcis.dev/barcoding.dev)', coordinates: ['agriculture-food'] },
  ],
  transports: ['REST', 'MCP'], // live-only: the transports this worker actually mounts
  operations: [
    'listLots',
    'getLot',
    'listProducts',
    'registerProduct',
    'listFacilities',
    'listComplianceArtifacts',
  ],
  sandbox: {
    seedVersion: '2026-08-23.1',
    corpus: { facilities: 3, products: 4, lots: 6, complianceArtifacts: 2 },
    law: 'template §5.2 — mechanically generated, labeled example data; GS1 demo prefix 952 with valid check digits; fictional names only; reseed is a build step (edit substrate.ts)',
    retention: 'sandbox writes (registerProduct) are ephemeral: per-isolate memory, discarded on isolate recycle',
  },
  suite: { url: '/verify/suite.json', runner: 'api.qa/suite@1' },
  meters: [
    // one meter per operation — seams only at wave zero (§7.4)
    'listLots',
    'getLot',
    'listProducts',
    'registerProduct',
    'listFacilities',
    'listComplianceArtifacts',
  ],
} as const
