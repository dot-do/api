/**
 * seed.js — the §5.2 mechanically-produced sandbox seed for the
 * `fn-supply-chain` substrate (Function: Supply Chain & Procurement).
 *
 * SYNTHETIC DATA, ALWAYS LABELED. The row's source route is internal-first
 * (SC H3: the studio's own agent purchasing across posted-rate catalogs is
 * the first corpus; EPCIS captured first-party at the rail; X12 docs via the
 * transactions.dev germ) — none of that corpus exists yet or is reachable in
 * a build session, so this seed is generated per template §5.2:
 *   - every record carries `example: true`; every titled record a "[demo]" prefix;
 *   - GTINs AND GLNs use the GS1 demo prefix 952 with valid check digits;
 *   - no real company or person names anywhere (all parties fictional);
 *   - UNSPSC codes are deliberately OMITTED rather than fabricated — the
 *     what-is-bought spine is documented, never faked.
 *
 * The corpus exercises every declared operation with realistic depth per the
 * row's own record chain: a closed PO (X12 850) has its invoice (810), its
 * ASN (856) and a shipping→receiving EPCIS event pair; an awarded RFQ has
 * competing quotes (the price-response corpus germ — the row's "most valuable
 * prospective dataset"); an open PO and an open RFQ are honest open branches.
 */

export const RETENTION_NOTICE =
  "Demo workspace: synthetic example data on a wave-zero substrate. " +
  "Records you create are held in ephemeral sandbox memory only and may be reset at any time.";

/** GS1 demo-prefix-952 party/location GLNs (valid check digits). */
export const GLN = Object.freeze({
  buyerDC: "9520003900011", // [demo] Bramblehollow Assembly LLC — central DC
  quorvexShipFrom: "9520003900028", // [demo] Quorvex Industrial Supply Co — ship-from
  ostermereShipFrom: "9520003900035", // [demo] Ostermere Packaging Works — ship-from
  receivingDock: "9520003900042", // [demo] Bramblehollow Assembly LLC — receiving dock
});

/** Item — the GS1-identified thing (GTIN spine). UNSPSC omitted, never faked. */
export const items = [
  { $type: "https://schema.org/Product", id: "itm-demo-001", example: true, title: "[demo] M6 stainless hex bolts (box of 500)", gtin: "9520002100016", supplier: "Quorvex Industrial Supply Co" },
  { $type: "https://schema.org/Product", id: "itm-demo-002", example: true, title: "[demo] Corrugated shipper 40x30x30cm (bundle of 25)", gtin: "9520002100023", supplier: "Ostermere Packaging Works" },
  { $type: "https://schema.org/Product", id: "itm-demo-003", example: true, title: "[demo] Nitrile gloves size L (case of 1000)", gtin: "9520002100030", supplier: "Quorvex Industrial Supply Co" },
  { $type: "https://schema.org/Product", id: "itm-demo-004", example: true, title: "[demo] Stretch wrap 500mm roll (pack of 6)", gtin: "9520002100047", supplier: "Ostermere Packaging Works" },
];

/** PurchaseOrder — X12 850-typed business document (settled-schema cheap entry). */
export const purchaseOrders = [
  {
    $type: "https://schema.org/Order",
    id: "po-demo-001",
    example: true,
    x12: "850",
    status: "closed",
    supplier: "Quorvex Industrial Supply Co",
    buyer: "Bramblehollow Assembly LLC",
    buyerGln: GLN.buyerDC,
    supplierGln: GLN.quorvexShipFrom,
    currency: "usd",
    orderedAt: "2026-06-02",
    lines: [
      { gtin: "9520002100016", qty: 20, unitPrice: 42.5 },
      { gtin: "9520002100030", qty: 5, unitPrice: 89.0 },
    ],
  },
  {
    $type: "https://schema.org/Order",
    id: "po-demo-002",
    example: true,
    x12: "850",
    status: "shipped",
    supplier: "Ostermere Packaging Works",
    buyer: "Bramblehollow Assembly LLC",
    buyerGln: GLN.buyerDC,
    supplierGln: GLN.ostermereShipFrom,
    currency: "usd",
    orderedAt: "2026-07-14",
    lines: [
      { gtin: "9520002100023", qty: 40, unitPrice: 3.15 },
      { gtin: "9520002100047", qty: 12, unitPrice: 27.8 },
    ],
  },
  {
    $type: "https://schema.org/Order",
    id: "po-demo-003",
    example: true,
    x12: "850",
    status: "open",
    supplier: "Quorvex Industrial Supply Co",
    buyer: "Bramblehollow Assembly LLC",
    buyerGln: GLN.buyerDC,
    supplierGln: GLN.quorvexShipFrom,
    currency: "usd",
    orderedAt: "2026-08-11",
    lines: [{ gtin: "9520002100030", qty: 10, unitPrice: 89.0 }],
  },
];

/**
 * RFQ — the row's H3 record. Wave-zero scope note: the register carries an
 * OPEN dispute verbatim — RFQ breadth-vs-narrowed (convergence §5.3: VC
 * claims value at cross-category breadth [H — probe before build]; FP/SC/EO
 * all narrow it; "resolve by incumbency probe, not by ruling"). This seed is
 * category-narrow (a `category` field per RFQ) and takes NO position on
 * breadth — the dispute is a register question, not a build decision.
 */
export const rfqs = [
  {
    id: "rfq-demo-001",
    example: true,
    title: "[demo] Corrugated shippers, quarterly volume",
    status: "awarded",
    category: "packaging",
    quantity: 4800,
    neededBy: "2026-07-01",
    awardedQuote: "quo-demo-002",
  },
  {
    id: "rfq-demo-002",
    example: true,
    title: "[demo] Stainless fastener resupply",
    status: "open",
    category: "fasteners",
    quantity: 100,
    neededBy: "2026-09-15",
  },
];

/** Quote — the price response (the RFQ fan-out corpus germ). */
export const quotes = [
  { $type: "https://schema.org/Offer", id: "quo-demo-001", example: true, rfq: "rfq-demo-001", supplier: "Quorvex Industrial Supply Co", unitPrice: 3.42, currency: "usd", leadTimeDays: 21 },
  { $type: "https://schema.org/Offer", id: "quo-demo-002", example: true, rfq: "rfq-demo-001", supplier: "Ostermere Packaging Works", unitPrice: 3.15, currency: "usd", leadTimeDays: 10, awarded: true },
  { $type: "https://schema.org/Offer", id: "quo-demo-003", example: true, rfq: "rfq-demo-002", supplier: "Quorvex Industrial Supply Co", unitPrice: 41.9, currency: "usd", leadTimeDays: 14 },
];

/** Invoice — X12 810-typed; amounts foot to their PO lines exactly. */
export const invoices = [
  { $type: "https://schema.org/Invoice", id: "inv-demo-001", example: true, x12: "810", purchaseOrder: "po-demo-001", amount: 1295.0, currency: "usd", status: "paid", issuedAt: "2026-06-20" },
  { $type: "https://schema.org/Invoice", id: "inv-demo-002", example: true, x12: "810", purchaseOrder: "po-demo-002", amount: 459.6, currency: "usd", status: "issued", issuedAt: "2026-08-02" },
];

/** ShipmentNotice — X12 856 ASN; GLN-addressed, GTIN-lined. */
export const shipmentNotices = [
  {
    id: "asn-demo-001",
    example: true,
    x12: "856",
    purchaseOrder: "po-demo-001",
    shipFromGln: GLN.quorvexShipFrom,
    shipToGln: GLN.buyerDC,
    shippedAt: "2026-06-12",
    lines: [
      { gtin: "9520002100016", qty: 20 },
      { gtin: "9520002100030", qty: 5 },
    ],
  },
  {
    id: "asn-demo-002",
    example: true,
    x12: "856",
    purchaseOrder: "po-demo-002",
    shipFromGln: GLN.ostermereShipFrom,
    shipToGln: GLN.buyerDC,
    shippedAt: "2026-07-30",
    lines: [
      { gtin: "9520002100023", qty: 40 },
      { gtin: "9520002100047", qty: 12 },
    ],
  },
];

/** EPCISEvent — GS1 EPCIS 2.0-shaped ObjectEvents tracing the shipped POs.
 *  (epcis.dev remains the traceability sub-position's own face — a distinct
 *  register cell; these are this Function row's data-ply records.) */
export const epcisEvents = [
  {
    id: "epc-demo-001",
    example: true,
    standard: "GS1 EPCIS 2.0",
    eventType: "ObjectEvent",
    bizStep: "shipping",
    readPointGln: GLN.quorvexShipFrom,
    gtins: ["9520002100016", "9520002100030"],
    eventTime: "2026-06-12T15:04:00Z",
    shipmentNotice: "asn-demo-001",
  },
  {
    id: "epc-demo-002",
    example: true,
    standard: "GS1 EPCIS 2.0",
    eventType: "ObjectEvent",
    bizStep: "receiving",
    readPointGln: GLN.receivingDock,
    gtins: ["9520002100016", "9520002100030"],
    eventTime: "2026-06-16T09:41:00Z",
    shipmentNotice: "asn-demo-001",
  },
  {
    id: "epc-demo-003",
    example: true,
    standard: "GS1 EPCIS 2.0",
    eventType: "ObjectEvent",
    bizStep: "shipping",
    readPointGln: GLN.ostermereShipFrom,
    gtins: ["9520002100023", "9520002100047"],
    eventTime: "2026-07-30T17:22:00Z",
    shipmentNotice: "asn-demo-002",
  },
];
