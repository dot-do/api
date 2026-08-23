/**
 * substrate.js — Stratum A: the G3 substrate `fn-business-ops` in the
 * API-as-digital-product shape (property-template spec §1; the normative
 * APIProduct type lands in primitives.org.ai `digital-products` — this file
 * is one instance of it, never a redefinition).
 *
 * Everything here derives from ONE register row
 * (studio docs/plans/registers/2026-08-23-full-economy-property-register.json,
 * key `fn-business-ops`):
 *
 *   - G1 anchors: APQC PCF Business-Ops/Management family; O*NET 11-1021.00
 *     General and Operations Managers; NAICS 55 kept distinct as the adjacent
 *     vertical coordinate.
 *   - Data ply: no interchange standard exists for this Function — the records
 *     are business-as-code primitives: the APQC process registry as the typed
 *     spine plus KPI/OKR/process-state records (the operate/govern record
 *     layer over deployed properties). Money-shaped records resolve into the
 *     finance facet per #22 and are NOT in this substrate.
 *   - Headless ply: the manage/operate face over deployed APIs and systems —
 *     the lifecycle counterpart of the build face per the #22 generator rule
 *     (apis.do → apis.dev build/monetize + api.management manage/operate);
 *     System coordinate ERP⟨management-operations⟩ (ERP-family ops systems
 *     are the modal System in the 52-catalog, 381 occupations).
 *
 * NOTHING brand/offer/price/motion-shaped lives here — those are G4
 * projection fields (projection.js). One substrate, many non-exclusive
 * projections, by design.
 */

export const SUBSTRATE = "fn-business-ops";

/** Seed spec version — reseeding is a build step, never a manual act (§5.2.5). */
export const SEED_VERSION = "2026-08-23.1";

/**
 * Canonical Nouns. Each: schema ($type → schema.org.ai), binding
 * (ingested | generated | native | federated — manifest metadata, invisible
 * on the wire), verbs. PascalCase types, camelCase verbs.
 */
export const NOUNS = [
  {
    noun: "Process",
    $type: "https://schema.org.ai/Process",
    binding: "generated", // APQC PCF public spine as free typed vocabulary; records mechanically generated against it
    verbs: ["listProcesses", "getProcess"],
    collection: "/processes",
  },
  {
    noun: "KPI",
    $type: "https://schema.org.ai/KPI",
    binding: "native", // operate/govern record layer over deployed properties (owned-by-construction route)
    verbs: ["listKPIs"],
    collection: "/kpis",
  },
  {
    noun: "Objective",
    $type: "https://schema.org.ai/Objective",
    binding: "native",
    verbs: ["listObjectives"],
    collection: "/objectives",
  },
  {
    noun: "ManagedProperty",
    $type: "https://schema.org.ai/ManagedProperty",
    binding: "native", // system-of-record door: the operator brings the estate; telemetry is first-party exhaust
    verbs: ["listProperties", "getProperty"],
    collection: "/properties",
  },
];

/** The row's System set from the 52-System catalog, at this row's coordinate. */
export const SYSTEMS = [{ system: "ERP", coordinates: ["management-operations"] }];

/** Transports actually mounted at wave zero (presence-when-true). */
export const TRANSPORTS = ["REST", "MCP"];

/**
 * Operations — the served contract only (live-only law). The pinned
 * axp-faces generator assigns operationIds to the surfaces it owns
 * (listCollection, getPricing, getOffer, getFamilyRegistry); site routes
 * carry method+path until the generator grows route-level operationIds
 * (filed upstream — fix the generator, never patch one site).
 */
export const OPERATIONS = [
  { operation: "listProcesses", operationId: "listCollection", method: "GET", path: "/processes" },
  { operation: "listKPIs", method: "GET", path: "/kpis" },
  { operation: "listObjectives", method: "GET", path: "/objectives" },
  { operation: "listProperties", method: "GET", path: "/properties" },
  { operation: "getPricing", operationId: "getPricing", method: "GET", path: "/pricing" },
  { operation: "getOffer", operationId: "getOffer", method: "GET", path: "/offer" },
  { operation: "getFamilyRegistry", operationId: "getFamilyRegistry", method: "GET", path: "/family.json" },
];

/** One meter per operation (seams only at wave zero — §7.4). */
export const METERS = OPERATIONS.map((o) => ({ operation: o.operation, event: "meter" }));

/* ────────────────────────────────────────────────────────────────────────────
 * Sandbox seed — mechanically produced from the row's G1 anchors (§5.2).
 *
 * The anon sandbox is the LIVE product over clearly-labeled simulated data
 * (live-demo ruling): demo tenant = tenant #1 on the same handlers, every
 * record labeled example: true, no real company or person names (fixture
 * law), reseed = build step. APQC PCF category ids/titles are public typed
 * vocabulary (the spine the row names); everything tenant-shaped below is
 * synthetic.
 * ──────────────────────────────────────────────────────────────────────── */

const DEMO_TENANT = "demo-estate"; // tenant #1 — synthetic, clearly labeled

/** APQC PCF level-1 categories — the public typed spine (coordinates, not tenant data). */
const PCF_CATEGORIES = [
  ["1.0", "Develop Vision and Strategy"],
  ["2.0", "Develop and Manage Products and Services"],
  ["3.0", "Market and Sell Products and Services"],
  ["4.0", "Deliver Physical Products"],
  ["5.0", "Deliver Services"],
  ["6.0", "Manage Customer Service"],
  ["7.0", "Develop and Manage Human Capital"],
  ["8.0", "Manage Information Technology"],
  ["9.0", "Manage Financial Resources"],
  ["10.0", "Acquire, Construct, and Manage Assets"],
  ["11.0", "Manage Enterprise Risk, Compliance, Remediation, and Resiliency"],
  ["12.0", "Manage External Relationships"],
  ["13.0", "Develop and Manage Business Capabilities"],
];

/** Synthetic operated properties — the demo estate uses this repo's own example hosts. */
const DEMO_PROPERTIES = [
  { id: "prop-001", domain: "api.example.com.ai", lifecycle: "live", plies: ["data", "headless"] },
  { id: "prop-002", domain: "directory.example.com.ai", lifecycle: "live", plies: ["data"] },
  { id: "prop-003", domain: "blog.example.com.ai", lifecycle: "building", plies: ["data"] },
  { id: "prop-004", domain: "services.example.com.ai", lifecycle: "sunset-review", plies: ["headless"] },
];

/**
 * buildSeed() — deterministic, versioned; every record carries example: true
 * and the demo tenant. Exercises every declared operation and makes the
 * knownEmpty/knownForbidden probes honest.
 */
export function buildSeed() {
  const label = { example: true, tenant: DEMO_TENANT };

  const processes = [
    ...PCF_CATEGORIES.map(([apqc, title]) => ({
      id: `pcf-${apqc}`,
      kind: "category",
      apqc,
      title,
      source: "APQC PCF (public typed vocabulary — category level)",
      ...label,
    })),
    // process-state records of the demo tenant (the operate/govern layer)
    {
      id: "proc-verify-conformance",
      kind: "process",
      apqc: "13.0",
      title: "[demo] Verify machine-face conformance across the operated estate",
      state: "operating",
      cadence: "continuous",
      ...label,
    },
    {
      id: "proc-quarterly-okr",
      kind: "process",
      apqc: "1.0",
      title: "[demo] Set and review quarterly objectives for the operated estate",
      state: "operating",
      cadence: "quarterly",
      ...label,
    },
    {
      id: "proc-lifecycle-review",
      kind: "process",
      apqc: "13.0",
      title: "[demo] Review property lifecycle states (build → live → sunset)",
      state: "operating",
      cadence: "monthly",
      ...label,
    },
    {
      id: "proc-incident-response",
      kind: "process",
      apqc: "11.0",
      title: "[demo] Respond to availability incidents on operated properties",
      state: "operating",
      cadence: "on-event",
      ...label,
    },
  ];

  const kpis = [
    { id: "kpi-availability-001", kind: "availability", property: "api.example.com.ai", value: 0.9992, period: "2026-07", ...label, title: "[demo] Monthly availability" },
    { id: "kpi-availability-002", kind: "availability", property: "directory.example.com.ai", value: 0.9987, period: "2026-07", ...label, title: "[demo] Monthly availability" },
    { id: "kpi-latency-001", kind: "p95-latency-ms", property: "api.example.com.ai", value: 84, period: "2026-07", ...label, title: "[demo] p95 latency (ms)" },
    { id: "kpi-calls-001", kind: "metered-calls", property: "api.example.com.ai", value: 12840, period: "2026-07", ...label, title: "[demo] Metered calls" },
    { id: "kpi-sandbox-001", kind: "sandbox-sessions", property: "directory.example.com.ai", value: 312, period: "2026-07", ...label, title: "[demo] Anonymous sandbox sessions" },
    { id: "kpi-suite-001", kind: "suite-runs", property: "api.example.com.ai", value: 62, period: "2026-07", ...label, title: "[demo] Published-suite runs by external callers" },
  ];

  const objectives = [
    {
      id: "okr-2026q3-001",
      quarter: "2026-Q3",
      status: "active",
      objective: "[demo] Every live property serves a passing machine face",
      keyResults: [
        "[demo] 4/4 live properties answer keyless first value",
        "[demo] 4/4 pricing documents served",
        "[demo] conformance verdicts linked from every card",
      ],
      ...label,
    },
    {
      id: "okr-2026q3-002",
      quarter: "2026-Q3",
      status: "active",
      objective: "[demo] Operate the estate at under one page of weekly exceptions",
      keyResults: ["[demo] incident count per property per month ≤ 1", "[demo] lifecycle reviews current for 4/4 properties"],
      ...label,
    },
    {
      id: "okr-2026q2-001",
      quarter: "2026-Q2",
      status: "closed",
      objective: "[demo] Stand up the operate/govern record layer",
      keyResults: ["[demo] KPI records flowing for 2 properties", "[demo] process registry typed against the APQC spine"],
      ...label,
    },
  ];

  const properties = DEMO_PROPERTIES.map((p) => ({
    ...p,
    title: `[demo] ${p.domain}`,
    conformance: "unverified [demo record — no live verdict exists for example hosts]",
    system: "ERP⟨management-operations⟩",
    ...label,
  }));

  return { version: SEED_VERSION, processes, kpis, objectives, properties };
}

/**
 * The G3 APIProduct instance — the digital-products shape (§1), assembled
 * from the pieces above. G4 fields (brand, motion, offer, price, positioning)
 * are deliberately absent; see projection.js.
 */
export const API_PRODUCT = {
  substrate: SUBSTRATE,
  nouns: NOUNS,
  systems: SYSTEMS,
  transports: TRANSPORTS,
  operations: OPERATIONS,
  sandbox: { seedVersion: SEED_VERSION, tenant: DEMO_TENANT, rule: "live product over labeled simulated data; reseed is a build step" },
  suite: { verify: "/verify", pinnedDeclaration: "withheld — declared on the card only when a digest-pinned suite document answers (A.8.5)" },
  meters: METERS,
};
