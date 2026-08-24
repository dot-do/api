/**
 * seed.mjs — the §5.2 sandbox seed for register row `fn-facilities-assets`,
 * produced mechanically from the row's record schemas (asset/serial registry,
 * maintenance work order, equipment-model catalog identity, Digital Product
 * Passport). EVERY record is synthetic and labeled: fictional companies and
 * sites only, `example: true` on every record, disclosed retention.
 *
 * Fixture law (spec §5.2.2): every GTIN carries the GS1 demo prefix 952 and a
 * VALID check digit (computed, never typed); serials are GIAI-style strings
 * under the same demo prefix; no real company, person, EIN, or serial appears.
 *
 * HONESTY (source-route): this row is C-class at wave zero — no manufacturer
 * identity feed is honestly reachable yet, so the model catalog below is
 * labeled synthetic seed standing in until an ingest route is proven
 * (class-A status is NOT claimed anywhere on this surface).
 */

export const SEED_VERSION = "2026-08-23.1";

export const RETENTION =
  "ephemeral — anonymous sandbox records live for this isolate's lifetime only; nothing you send is durably stored at wave zero";

export const EXAMPLE_NOTE =
  "Example data — synthetic sandbox seed over fictional companies (Example Facilities Co., Example Manufacturing GmbH — both synthetic). " +
  "GS1 demo prefix 952 on every identifier; valid check digits; no real company, person, site, or serial appears.";

/** GTIN-13 under the GS1 demo prefix 952 with a computed (valid) check digit. */
export function gtin13(body9) {
  const digits = `952${body9}`;
  if (!/^\d{12}$/.test(digits)) throw new Error(`seed defect: gtin13 needs 9 digits after the 952 prefix, got ${body9}`);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  return digits + String((10 - (sum % 10)) % 10);
}

/** GIAI-style serial identity under the same demo prefix. */
const giai = (suffix) => `urn:example:giai:952/${suffix}`;

/** The manufacturer catalog ply — the Vindex identity spine, SYNTHETIC at
 *  wave zero (see HONESTY note above). One model per seeded asset class. */
export const models = [
  {
    $type: "EquipmentModel",
    id: "mdl-hvac-rtu-40",
    name: "[demo] RTU-40 packaged rooftop unit",
    class: "hvac",
    manufacturer: "Example Manufacturing GmbH (synthetic)",
    gtin: gtin13("000000101"),
    powerSource: "electric",
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
  {
    $type: "EquipmentModel",
    id: "mdl-light-hb-150",
    name: "[demo] HB-150 high-bay LED luminaire",
    class: "lighting",
    manufacturer: "Example Manufacturing GmbH (synthetic)",
    gtin: gtin13("000000202"),
    powerSource: "electric",
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
  {
    $type: "EquipmentModel",
    id: "mdl-lift-e25",
    name: "[demo] E25 electric counterbalance forklift",
    class: "material-handling",
    manufacturer: "Example Manufacturing GmbH (synthetic)",
    gtin: gtin13("000000303"),
    powerSource: "industrial battery (Li-ion)",
    batteryPowered: true,
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
  {
    $type: "EquipmentModel",
    id: "mdl-desk-adj-2",
    name: "[demo] ADJ-2 sit-stand desk",
    class: "furniture",
    manufacturer: "Example Manufacturing GmbH (synthetic)",
    gtin: gtin13("000000404"),
    powerSource: "electric (height motor)",
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
];

const modelById = new Map(models.map((m) => [m.id, m]));

function asset(n, modelId, { site, status, commissioned }) {
  const model = modelById.get(modelId);
  if (!model) throw new Error(`seed defect: asset seed names unknown model ${modelId}`);
  return {
    $type: "Asset",
    id: `ast-demo-${String(n).padStart(3, "0")}`,
    serial: giai(`AST-${String(n).padStart(3, "0")}`),
    gtin: model.gtin,
    modelId,
    class: model.class,
    name: `[demo] ${model.name.replace("[demo] ", "")} — unit ${String(n).padStart(3, "0")}`,
    operator: "Example Facilities Co. (synthetic)",
    site,
    status,
    commissioned,
    example: true,
    exampleNote: EXAMPLE_NOTE,
  };
}

/** The asset registry ply — serialized individuals across four asset classes,
 *  two synthetic sites, all three lifecycle statuses represented. */
export const assets = [
  asset(1, "mdl-hvac-rtu-40", { site: "Building A (synthetic)", status: "operational", commissioned: "2024-03-11" }),
  asset(2, "mdl-hvac-rtu-40", { site: "Building B (synthetic)", status: "needs-maintenance", commissioned: "2023-07-02" }),
  asset(3, "mdl-light-hb-150", { site: "Building A (synthetic)", status: "operational", commissioned: "2025-01-20" }),
  asset(4, "mdl-light-hb-150", { site: "Building B (synthetic)", status: "operational", commissioned: "2025-01-20" }),
  asset(5, "mdl-lift-e25", { site: "Building A (synthetic)", status: "needs-maintenance", commissioned: "2022-10-05" }),
  asset(6, "mdl-lift-e25", { site: "Building B (synthetic)", status: "operational", commissioned: "2024-06-17" }),
  asset(7, "mdl-desk-adj-2", { site: "Building A (synthetic)", status: "operational", commissioned: "2024-11-30" }),
  asset(8, "mdl-desk-adj-2", { site: "Building B (synthetic)", status: "retired", commissioned: "2019-04-08" }),
];

function workOrder(n, assetId, { status, opened, summary, task }) {
  if (!assets.some((a) => a.id === assetId)) throw new Error(`seed defect: work order names unknown asset ${assetId}`);
  return {
    $type: "MaintenanceWorkOrder",
    id: `wo-demo-${String(n).padStart(3, "0")}`,
    assetId,
    status, // open | in-progress | completed
    opened,
    summary: `[demo] ${summary}`,
    task, // O*NET 49-9071 maintenance-and-repair task grain [code UNVERIFIED per the register row]
    assignee: "Example Facilities Co. maintenance planner (synthetic role, no person named)",
    example: true,
    exampleNote: EXAMPLE_NOTE,
  };
}

/** The maintenance work-order ply — first-party events at the rail; every
 *  status the collection filter serves is represented. */
export const workOrders = [
  workOrder(1, "ast-demo-002", { status: "open", opened: "2026-08-19", summary: "compressor short-cycling on RTU-40 unit 002", task: "diagnose mechanical fault" }),
  workOrder(2, "ast-demo-005", { status: "in-progress", opened: "2026-08-15", summary: "traction battery capacity fade on E25 unit 005", task: "test and recondition battery pack" }),
  workOrder(3, "ast-demo-003", { status: "completed", opened: "2026-07-28", summary: "driver replacement on HB-150 unit 003", task: "replace electrical component" }),
  workOrder(4, "ast-demo-001", { status: "completed", opened: "2026-06-30", summary: "quarterly filter change on RTU-40 unit 001", task: "perform routine preventive maintenance" }),
  workOrder(5, "ast-demo-007", { status: "open", opened: "2026-08-21", summary: "height motor intermittent on ADJ-2 unit 007", task: "diagnose electrical fault" }),
];

/** Digital Product Passports — composed from registry identity + first-party
 *  events (binding `generated`). The statutory clock is real and dated; the
 *  records are synthetic examples of the artifact the statute mandates. */
export const passports = [
  {
    $type: "ProductPassport",
    id: "dpp-demo-ast-005",
    assetId: "ast-demo-005",
    gtin: modelById.get("mdl-lift-e25").gtin,
    serial: giai("AST-005"),
    scope: "industrial battery (Li-ion) — in statutory scope of the EU battery DPP",
    statutoryClock: "EU battery Digital Product Passport applies 2027-02-18 (Regulation (EU) 2023/1542) — a dated demand trigger, recorded on the register row",
    composition: { source: "registry identity + first-party maintenance events (binding: generated)", events: ["wo-demo-002"] },
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
  {
    $type: "ProductPassport",
    id: "dpp-demo-ast-006",
    assetId: "ast-demo-006",
    gtin: modelById.get("mdl-lift-e25").gtin,
    serial: giai("AST-006"),
    scope: "industrial battery (Li-ion) — in statutory scope of the EU battery DPP",
    statutoryClock: "EU battery Digital Product Passport applies 2027-02-18 (Regulation (EU) 2023/1542) — a dated demand trigger, recorded on the register row",
    composition: { source: "registry identity + first-party maintenance events (binding: generated)", events: [] },
    example: true,
    exampleNote: EXAMPLE_NOTE,
  },
];
