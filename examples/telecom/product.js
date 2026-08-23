/**
 * product.js — the G3 APIProduct instance for register row `telecom`
 * (property-template spec §1, studio docs/plans/2026-08-23-property-template-spec.md).
 *
 * D-ROW PLACEHOLDER — TRUE-ZERO GAP: the row has zero names held AND zero
 * named acquisition candidates (register: "one of the register's true zero
 * rows"). Per spec §0 a GAP row instantiates everything EXCEPT the G4 brand
 * config; the G3 work is never blocked on a name. The substrate id is the
 * register row key and the serving placeholder address is telecom.org.ai
 * (open question #4's placeholder-org.ai route, per the D-row precedent).
 * G4 brand attachment is held pending #16.
 *
 * Bindings note (row source route — public-licensable ingest first, the
 * standard cold-start for a zero-asset vertical; wrap-as-destination barred
 * per #2 ruling 5). Feeds probed IN-SESSION on 2026-08-23:
 *   - NANPA NPA numbering report (reports.nanpa.com/public/npa_report.csv):
 *     REACHABLE, keyless, 200 OK — so NumberingResource is `ingested` and
 *     REAL at wave zero (seed-numbering.js, provenance on every record).
 *   - FCC License View API (data.fcc.gov/api/license-view): 301 → 403
 *     Access Denied in-session; FCC broadband map API: 401. Both stay on the
 *     enrichment ladder as probed-unreachable — recorded honestly, never
 *     faked. SpectrumLicense / broadband-availability nouns enter when a
 *     reachable Class-A route (or licensed access) exists.
 *   - PortOrder / CoverageRecord / UsageRecord are `native` at wave zero —
 *     the OSS/BSS system-of-record grain (number porting with LOA,
 *     serviceability, rated usage), served over labeled synthetic seed:
 *     LNP port data and CDRs are carrier-confidential by nature (never a
 *     public ingest), and serviceability is per-operator first-party data.
 *
 * Headless-ply caveat carried from the register [UNVERIFIED]: OSS/BSS as the
 * telecom system-of-record pair is NOT confirmed present in the O*NET-derived
 * ~52-System catalog excerpts — the row's own "cheapest next fact" is the
 * headless.ly catalog re-run at NAICS 517. The coordinate below carries the
 * row's words verbatim and the caveat travels with it (register defect filed
 * upstream, not improvised away).
 */

export const NOUN_BINDINGS = Object.freeze({
  NumberingResource: "ingested",
  PortOrder: "native",
  CoverageRecord: "native",
  UsageRecord: "native",
});

export const APIProduct = Object.freeze({
  substrate: "telecom",
  nouns: Object.freeze([
    Object.freeze({
      noun: "NumberingResource",
      schema: { $type: "NumberingResource", $context: "https://schema.org.ai" },
      binding: "ingested", // REAL public data: the NANPA NPA report (keyless, probed reachable in-session)
      verbs: Object.freeze(["listNumberingResources", "getNumberingResource"]),
    }),
    Object.freeze({
      noun: "PortOrder",
      schema: { $type: "PortOrder", $context: "https://schema.org.ai" },
      binding: "native", // the OSS/BSS number-porting system of record (LNP/LOA grain)
      verbs: Object.freeze(["listPortOrders", "getPortOrder", "orderNumberPort"]),
    }),
    Object.freeze({
      noun: "CoverageRecord",
      schema: { $type: "CoverageRecord", $context: "https://schema.org.ai" },
      binding: "native", // serviceability at the address grain — per-operator first-party data
      verbs: Object.freeze(["listCoverageRecords", "getCoverageRecord"]),
    }),
    Object.freeze({
      noun: "UsageRecord",
      schema: { $type: "UsageRecord", $context: "https://schema.org.ai" },
      binding: "native", // rated usage (CDR grain) in the BSS ledger of the reseller tenant
      verbs: Object.freeze(["listUsageRecords", "getUsageRecord"]),
    }),
  ]),
  systems: Object.freeze([
    // Register headless ply VERBATIM, caveat attached: "OSS/BSS — the telecom
    // system-of-record pair [UNVERIFIED: not confirmed present in the
    // O*NET-derived ~52-System catalog excerpts]". The MVNO/reseller
    // coordinate follows the row's (UNVERIFIED) ICP.
    Object.freeze({
      system: "OSS/BSS",
      coordinates: Object.freeze(["mvno-reseller-operations"]),
      unverified:
        "register row marks the telecom System pair UNVERIFIED in the 52-System catalog — needs the headless.ly catalog re-run at NAICS 517 (the row's cheapest next fact)",
    }),
  ]),
  transports: Object.freeze(["REST", "MCP"]), // live-only; RPC/CapnWeb/HATEOAS land with the serving-lane extraction
  // The only things a rate card may price. One identifier, five surfaces
  // (axp-ext/rates-g2 §1): route operationId = MCP tool = suite ref = SDK
  // method = rates[] key. The branching collection's operationId is the real
  // verb listPortOrders (never the generator default listCollection).
  operations: Object.freeze([
    Object.freeze({ verb: "listPortOrders", wire: "GET /port-orders", collection: true }),
    Object.freeze({ verb: "getPortOrder", wire: "GET /port-orders/{id}" }),
    Object.freeze({ verb: "orderNumberPort", wire: "POST /ports" }),
    Object.freeze({ verb: "listNumberingResources", wire: "GET /numbering-resources" }),
    Object.freeze({ verb: "getNumberingResource", wire: "GET /numbering-resources/{id}" }),
    Object.freeze({ verb: "listCoverageRecords", wire: "GET /coverage-records" }),
    Object.freeze({ verb: "getCoverageRecord", wire: "GET /coverage-records/{id}" }),
    Object.freeze({ verb: "listUsageRecords", wire: "GET /usage-records" }),
    Object.freeze({ verb: "getUsageRecord", wire: "GET /usage-records/{id}" }),
  ]),
  sandbox: Object.freeze({
    // §5.2 — the synthetic corpus generator is seed.js (deterministic,
    // internally consistent, every record labeled example: true); the REAL
    // ingested NumberingResource corpus is seed-numbering.js (provenance-
    // labeled, never labeled example — it is not an example). Reseeding
    // either is a build step: node scripts/ingest-numbering.mjs; seed.js is code.
    seedModule: "./seed.js",
    ingestModule: "./seed-numbering.js",
    tenant: "example", // tenant #1 pattern: same handlers as product, simulated reseller back office
    retention: "anonymous sandbox reads are stateless; nothing a caller sends is stored at wave zero",
  }),
  meters: Object.freeze(
    [
      "listPortOrders",
      "getPortOrder",
      "orderNumberPort",
      "listNumberingResources",
      "getNumberingResource",
      "listCoverageRecords",
      "getCoverageRecord",
      "listUsageRecords",
      "getUsageRecord",
    ].map((operation) =>
      Object.freeze({ operation, event: "meter", tags: Object.freeze(["substrate", "projection", "motion", "operation", "shape", "pattern"]) }),
    ),
  ),
});
