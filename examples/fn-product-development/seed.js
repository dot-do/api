/**
 * seed.js — the §5.2 mechanically-produced sandbox seed for the
 * `fn-product-development` substrate (GAP row — no product-function name is
 * held; this corpus lives under the placeholder org.ai address).
 *
 * SYNTHETIC DATA, ALWAYS LABELED. The row's source route (usage accretion
 * from headless PM/PLM instances, consent-at-rail) is not reachable in a
 * build session, so this seed is generated per template §5.2:
 *   - every record carries `example: true` and a "[demo]" title prefix;
 *   - GTINs use the GS1 demo prefix 952 with valid check digits;
 *   - no real company or person names anywhere;
 *   - GPC/UNSPSC classification codes are deliberately OMITTED rather than
 *     fabricated — the classification spine is documented, never faked.
 *
 * The corpus exercises every declared operation: products branch by
 * stage/kind (OK), impossible filters return EMPTY, reserved scopes return
 * BLOCKED; requirements, releases, roadmap items and BOM items populate the
 * sibling collections with realistic depth (a demo software product has
 * requirements, releases and roadmap items; the demo physical product has a
 * BOM with valid 952-prefix GTINs).
 */

export const RETENTION_NOTICE =
  "Demo workspace: synthetic example data on an unnamed wave-zero surface. " +
  "Records you create are held in ephemeral sandbox memory only and may be reset at any time.";

/** Product — schema.org Product generic fallback (no product-dev interchange standard; register cascade rule 2). */
export const products = [
  {
    $type: "https://schema.org/Product",
    id: "prod-demo-sdk",
    example: true,
    title: "[demo] Telemetry SDK",
    kind: "software",
    stage: "ga",
    summary: "Synthetic demo software product with a full requirement → release → roadmap chain.",
  },
  {
    $type: "https://schema.org/Product",
    id: "prod-demo-gateway",
    example: true,
    title: "[demo] Edge Gateway (hardware)",
    kind: "physical",
    stage: "beta",
    summary: "Synthetic demo physical product carrying the BOM items with GS1 demo-prefix (952) GTINs.",
  },
  {
    $type: "https://schema.org/Product",
    id: "prod-demo-console",
    example: true,
    title: "[demo] Fleet Console",
    kind: "software",
    stage: "concept",
    summary: "Synthetic demo concept-stage product: requirements only, no releases yet — an honest empty branch.",
  },
];

/** Requirement — no interchange standard exists for requirements records (register row, UNVERIFIED); typed here as the substrate's own record. */
export const requirements = [
  { id: "req-demo-001", example: true, product: "prod-demo-sdk", title: "[demo] Batch event upload", status: "shipped", priority: "p1" },
  { id: "req-demo-002", example: true, product: "prod-demo-sdk", title: "[demo] Offline buffering", status: "shipped", priority: "p2" },
  { id: "req-demo-003", example: true, product: "prod-demo-sdk", title: "[demo] Sampling controls", status: "in-progress", priority: "p1" },
  { id: "req-demo-004", example: true, product: "prod-demo-gateway", title: "[demo] PoE power input", status: "shipped", priority: "p1" },
  { id: "req-demo-005", example: true, product: "prod-demo-gateway", title: "[demo] Fanless enclosure", status: "in-progress", priority: "p2" },
  { id: "req-demo-006", example: true, product: "prod-demo-console", title: "[demo] Multi-fleet view", status: "proposed", priority: "p2" },
];

/** Release — year-keyed release records for the software product. */
export const releases = [
  { id: "rel-demo-2025-1", example: true, product: "prod-demo-sdk", version: "1.0.0", date: "2025-11-04", channel: "ga" },
  { id: "rel-demo-2026-1", example: true, product: "prod-demo-sdk", version: "1.1.0", date: "2026-02-17", channel: "ga" },
  { id: "rel-demo-2026-2", example: true, product: "prod-demo-sdk", version: "1.2.0-beta.1", date: "2026-06-30", channel: "beta" },
  { id: "rel-demo-gw-0", example: true, product: "prod-demo-gateway", version: "0.9.0", date: "2026-05-12", channel: "beta" },
];

/** RoadmapItem — now/next/later horizons. */
export const roadmapItems = [
  { id: "rm-demo-001", example: true, product: "prod-demo-sdk", title: "[demo] Sampling controls GA", horizon: "now" },
  { id: "rm-demo-002", example: true, product: "prod-demo-sdk", title: "[demo] Schema registry integration", horizon: "next" },
  { id: "rm-demo-003", example: true, product: "prod-demo-gateway", title: "[demo] Gateway GA hardware rev", horizon: "next" },
  { id: "rm-demo-004", example: true, product: "prod-demo-console", title: "[demo] Console private preview", horizon: "later" },
];

/**
 * Item — BOM lines for the physical demo product. GTINs are GTIN-13 under the
 * GS1 demo prefix 952 with VALID check digits (estate fixture law). GPC brick
 * / UNSPSC codes are omitted, not invented.
 */
export const bomItems = [
  { id: "bom-demo-001", example: true, product: "prod-demo-gateway", title: "[demo] Mainboard assembly", gtin: "9520001100017", qty: 1 },
  { id: "bom-demo-002", example: true, product: "prod-demo-gateway", title: "[demo] Aluminum enclosure", gtin: "9520001100024", qty: 1 },
  { id: "bom-demo-003", example: true, product: "prod-demo-gateway", title: "[demo] PoE module", gtin: "9520001100031", qty: 1 },
  { id: "bom-demo-004", example: true, product: "prod-demo-gateway", title: "[demo] Antenna kit", gtin: "9520001100048", qty: 2 },
  { id: "bom-demo-005", example: true, product: "prod-demo-gateway", title: "[demo] Thermal pad set", gtin: "9520001100055", qty: 4 },
];
