/**
 * substrate.mjs — Stratum A: the G3 `APIProduct` instance for register row
 * `fn-facilities-assets` (Function: Facilities & Assets — property template
 * spec §1, PascalCase shape from primitives.org.ai digital-products). This is
 * the ONE definition both plies serve from: the data face (asset-registry
 * record collections) and the headless EAM/CMMS face (register/open/complete
 * doors on the SAME collections) are the same manifest rows, same envelopes,
 * same rate rows — binding direction differs, never the surface.
 *
 * No brand, domain, ICP, persona, motion, offer, price, or positioning
 * appears in this stratum — those are G4 projection fields (§2,
 * projection.mjs).
 *
 * PRIMACY RECORD (batch watch list): the register carries NO primacy ruling
 * for the work-order record type. The FSM work-order grain is named on THREE
 * rows (facilities-services, repair-field-services, and this row's
 * maintenance work-order), and the waste-remediation wave-zero substrate
 * already defines a `WorkOrder` noun under its own row key. This substrate
 * therefore defines its OWN `MaintenanceWorkOrder` under the
 * fn-facilities-assets row key, records the collision, and claims NOTHING
 * shared — no shared abstraction, no cross-row type reference. Same for
 * `Asset`: defined here at the durable-asset-registry grain (Vindex pattern
 * per VC #32), no shared claim with any other row's asset-shaped record.
 */
import { assets, workOrders, models, passports } from "./seed.mjs";

export const substrate = Object.freeze({
  substrate: "fn-facilities-assets",

  /** Canonical Nouns — each names its schema and its binding direction.
   * The register row names GS1 GIAI/serial identity and the UNSPSC/GTIN
   * spine as the identity vocabulary [both flagged UNVERIFIED on the row];
   * no interchange standard is named for the maintenance work-order record,
   * so it falls back to schema.org generics (spec §3.1 cascade rule 2). */
  nouns: [
    {
      noun: "Asset",
      schema: "https://schema.org/IndividualProduct", // serialized individual — the registry grain
      binding: "native", // first-party registry + transaction events captured at the rail (the row's owned-by-construction leg)
      verbs: ["list", "get", "register"],
    },
    {
      noun: "MaintenanceWorkOrder",
      schema: "https://schema.org/Action", // schema.org generic — no interchange standard named on the row (cascade rule 2); collision with the FSM work-order grain recorded above, nothing shared claimed
      binding: "native", // first-party maintenance events at the rail
      verbs: ["list", "get", "open", "complete"],
    },
    {
      noun: "EquipmentModel",
      schema: "https://schema.org/ProductModel", // manufacturer catalog identity on the GTIN spine
      binding: "ingested", // the Vindex way: manufacturer identity ingest where it exists. HONESTY: no class-A manufacturer feed is honestly reachable at wave zero — the corpus below is labeled synthetic §5.2 seed standing in until an ingest route is proven; class-A status is NOT claimed.
      verbs: ["search", "get"],
    },
    {
      noun: "ProductPassport",
      schema: "https://schema.org/Certification", // schema.org generic stand-in — the DPP delegated-act schemas are not yet final; the statutory clock is real and dated (EU battery DPP applies 2027-02-18, Regulation (EU) 2023/1542 per the register row via VC #23)
      binding: "generated", // composed from the registry identity + first-party event corpus
      verbs: ["get", "order"],
    },
  ],

  /** The row's System set. The register row flags EAM/CMMS membership in the
   * ~52-System catalog as UNVERIFIED (the published top ranks do not
   * enumerate it) — declared here exactly as the row states it, with the
   * FSM adjacency and H3 procurement adjacency recorded, nothing shared
   * claimed across rows. */
  systems: [
    {
      system: "EAM/CMMS (enterprise asset & maintenance management)",
      coordinates: ["facilities-maintenance-department"],
      note: "52-System-catalog membership UNVERIFIED per the register row; FSM (field maintenance) and H3 procurement (acquire side) are adjacencies, not claims",
    },
  ],

  /** Transports actually served by this wave-zero worker — live-only,
   * presence-when-true. (RPC / CapnWeb / HATEOAS arrive with the workers.do
   * extraction lane, spec §7.2.) */
  transports: ["REST", "MCP"],

  /** OpenAPI operations — the only things a rate card may price. One
   * canonical camelCase operationId per operation (axp-ext-rates-g2 §1,
   * five-surface invariant): route operationId = MCP tool name = rates[]
   * key = suite coverage reference = SDK method. Real verbs on collections. */
  operations: [
    { operation: "listAssets", method: "GET", path: "/assets", noun: "Asset", verb: "list" },
    { operation: "getAsset", method: "GET", path: "/assets/{assetId}", noun: "Asset", verb: "get" },
    { operation: "registerAsset", method: "POST", path: "/assets", noun: "Asset", verb: "register" },
    { operation: "getPassport", method: "GET", path: "/assets/{assetId}/passport", noun: "ProductPassport", verb: "get" },
    { operation: "orderPassport", method: "POST", path: "/passports/order", noun: "ProductPassport", verb: "order" }, // the per-outcome payable door: a compiled, verified DPP dossier — 402 OFFER, wave-zero labeled stub
    { operation: "listWorkOrders", method: "GET", path: "/work-orders", noun: "MaintenanceWorkOrder", verb: "list" },
    { operation: "getWorkOrder", method: "GET", path: "/work-orders/{workOrderId}", noun: "MaintenanceWorkOrder", verb: "get" },
    { operation: "openWorkOrder", method: "POST", path: "/work-orders", noun: "MaintenanceWorkOrder", verb: "open" },
    { operation: "completeWorkOrder", method: "POST", path: "/work-orders/{workOrderId}/complete", noun: "MaintenanceWorkOrder", verb: "complete" },
    { operation: "searchModels", method: "GET", path: "/models", noun: "EquipmentModel", verb: "search" },
    { operation: "getModel", method: "GET", path: "/models/{modelId}", noun: "EquipmentModel", verb: "get" },
  ],

  /** §5.2 sandbox spec — the universal floor. Deterministic labeled seed
   * corpus (seed.mjs, versioned with the manifest; reseed = build step);
   * anonymous callers get the labeled seed tenant plus an ephemeral
   * auto-minted workspace for writes. */
  sandbox: {
    seedModule: "./seed.mjs",
    seedTenant: "tenant-1 (the labeled demo tenant on the production substrate — live-demo ruling)",
    autoMintedWorkspace: {
      retention: "ephemeral — isolate lifetime only at wave zero; records created anonymously are not durable and are disclosed as such on every write",
      tenure: "anon (#17 ladder rung 0)",
    },
    fixtureLaw:
      "GS1 demo prefix 952 on every identifier (GTINs carry valid check digits); synthetic Example-name companies and people only; example.com emails only; no real EIN/serial collisions; secret-scanned",
  },

  /** One meter per operation (seams only at wave zero — spec §7.4). */
  meters: [
    "listAssets",
    "getAsset",
    "registerAsset",
    "getPassport",
    "orderPassport",
    "listWorkOrders",
    "getWorkOrder",
    "openWorkOrder",
    "completeWorkOrder",
    "searchModels",
    "getModel",
  ].map((operation) => ({ operation, event: "metering" })),
});

/** The seed corpus, exported for the worker + manifest. */
export const seed = Object.freeze({ assets, workOrders, models, passports });
