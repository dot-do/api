#!/usr/bin/env node
/**
 * generate-seed.mjs — the §5.2 mechanical sandbox seed for the
 * `utilities-energy` substrate (register row: Utilities & Energy, NAICS 22;
 * GAP row, placeholder key, Axis-2 depth-ruled).
 *
 * Source-route honesty (probed in-session, 2026-08-23): api.eia.gov v2
 * answers API_KEY_MISSING keyless; the EIA bulk manifest answers 200 keyless.
 * The register classes this row's route as public-licensable ingest
 * [UNVERIFIED] — NOT class A — so the universal-floor anon sandbox is seeded
 * synthetically, typed to the EIA-class feed shapes (utility/meter/interval,
 * ISO-queue, tariff-filing record shapes) so real ingest can replace the seed
 * without a schema change. Estate fixture law:
 *   - every record carries `example: true` and a demo notice — the sandbox is
 *     the real product over clearly-labeled simulated data, never a faked demo;
 *   - no real company or person names (fictional utility/applicant names,
 *     invented compounds tagged [example] — no real-brand collision by
 *     construction);
 *   - no real EINs — synthetic 00-prefixed patterns;
 *   - identifiers are SCHEMA-SHAPED SYNTHETIC (`UTIL-EX-*`, `MTR-EX-*`,
 *     `ISO-EX-*`, `TRF-EX-*`) — never real EIA/FERC/ISO ids, queue names, or
 *     tariff numbers presented as authoritative; Green Button/ESPI appears as
 *     a TYPING ANCHOR only (register: [UNVERIFIED — not in estate docs]);
 *   - no GTIN grain exists on this row: the GS1 952 demo-prefix rule applies
 *     where GTINs exist, and none do here (recorded, not skipped silently).
 *
 * Deterministic: seeded PRNG keyed on the substrate id. Reseeding is a build
 * step (`node scripts/generate-seed.mjs`), never a manual edit of seed.json.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "seed.json");

// mulberry32 — tiny deterministic PRNG
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const rnd = mulberry32(hash("utilities-energy"));

const DEMO_NOTICE =
  "Synthetic example data — mechanically generated sandbox seed for the utilities-energy substrate; not real utility, meter, queue, or tariff data. Identifiers are schema-shaped synthetic (UTIL-EX/MTR-EX/ISO-EX/TRF-EX); Green Button/ESPI is a typing anchor only. Retention: sandbox seed is versioned with the manifest and may be regenerated at any deploy.";

const label = (rec) => ({ ...rec, example: true, demo_notice: DEMO_NOTICE });

// Fictional utilities — invented compounds, no real-brand collision by construction.
const utilities = [
  { id: "UTIL-EX-2201", name: "Glimmerford Electric Cooperative [example]", kind: "electric-distribution", naics: "2211", ein: "00-2200001", state: "EX" },
  { id: "UTIL-EX-2202", name: "Bracken Hollow Water & Power District [example]", kind: "combined-utility", naics: "2211", ein: "00-2200002", state: "EX" },
  { id: "UTIL-EX-2203", name: "Tarrowgate Gas Service Company [example]", kind: "gas-distribution", naics: "2212", ein: "00-2200003", state: "EX" },
].map(label);

// Meters — EIA-class/ESPI-shaped meter records (typing anchor only; register
// marks ESPI [UNVERIFIED — not in estate docs]).
const SERVICE_KINDS = ["electricity", "electricity", "electricity", "gas", "water"];
const meters = [];
for (let m = 1; m <= 6; m++) {
  const util = utilities[m % utilities.length];
  meters.push(
    label({
      id: `MTR-EX-${1000 + m}`,
      utilityId: util.id,
      serviceKind: SERVICE_KINDS[m % SERVICE_KINDS.length],
      kind: m <= 4 ? "interval" : "monthly-register",
      espiTypingAnchor:
        "Green Button / NAESB ESPI UsagePoint shape (typing anchor only — register marks the standard [UNVERIFIED]; record content synthetic)",
      servicePoint: `Feeder EX-${100 + m}, Exampleford County [example]`,
      status: m === 6 ? "inactive" : "active",
    }),
  );
}

// Interval reads — the one data abstraction the cascade assigns this market
// (SC #21). Hourly kWh blocks on the interval meters; ESPI IntervalBlock
// typing anchor; values synthetic.
const intervalReads = [];
let irSeq = 0;
for (const meter of meters.filter((m) => m.kind === "interval")) {
  for (let h = 0; h < 6; h++) {
    intervalReads.push(
      label({
        id: `ir-ex-${++irSeq}`,
        meter: meter.id,
        utilityId: meter.utilityId,
        period: `2026-08-22T${String(h).padStart(2, "0")}:00Z/PT1H`,
        kWh: Number((0.4 + rnd() * 3.2).toFixed(3)),
        quality: "synthetic-example",
        espiTypingAnchor: "ESPI IntervalBlock shape (typing anchor only; values synthetic)",
      }),
    );
  }
}

// Public interconnection-queue entries — FERC/ISO queue record shape (the
// interconnection.click read grain). Queue names schema-shaped synthetic
// (ISO-EX-*) — never real queue data presented as authoritative.
const QUEUE_STATUSES = ["active", "active", "active", "withdrawn", "completed"];
const RESOURCE_TYPES = ["solar", "solar+storage", "storage", "wind"];
const queueEntries = [];
for (let q = 1; q <= 6; q++) {
  queueEntries.push(
    label({
      id: `que-ex-${q}`,
      queue: q <= 3 ? "ISO-EX-EAST" : "ISO-EX-WEST",
      position: `Q${2026 - (q % 2)}-${String(40 + q).padStart(3, "0")}`,
      status: QUEUE_STATUSES[q % QUEUE_STATUSES.length],
      resourceType: RESOURCE_TYPES[q % RESOURCE_TYPES.length],
      capacityMW: Number((2 + rnd() * 148).toFixed(1)),
      county: "Exampleford County [example]",
      utilityId: utilities[q % utilities.length].id,
      sourceShape: "public FERC/ISO interconnection-queue record shape (register: implied by interconnection.click; queue content synthetic)",
    }),
  );
}

// Applicant-side interconnection requests — the native filing grain
// (interconnection.click write side). Fictional applicants.
const applicants = [
  "Suncrest Array Partners LLC [example]",
  "Fernwheel Solar Installations Inc. [example]",
  "Osselbrook Distributed Energy Co. [example]",
];
const interconnectionRequests = [];
for (let r = 1; r <= 3; r++) {
  interconnectionRequests.push(
    label({
      id: `icr-ex-${r}`,
      applicant: applicants[r - 1],
      utilityId: utilities[r % utilities.length].id,
      status: r === 1 ? "draft" : r === 2 ? "submitted" : "under-review",
      systemSizeKwDc: Number((8 + rnd() * 4990).toFixed(1)),
      resourceType: r === 3 ? "solar+storage" : "solar",
      tariffId: `TRF-EX-${3000 + r}`,
      workspace: null,
    }),
  );
}

// Utility tariff filings — public filing shape per the row's source route.
const tariffs = [];
for (let t = 1; t <= 4; t++) {
  tariffs.push(
    label({
      id: `TRF-EX-${3000 + t}`,
      utilityId: utilities[t % utilities.length].id,
      name: `${t % 2 ? "Residential TOU" : "Commercial Demand"} Schedule EX-${t} [example]`,
      filingStatus: t === 4 ? "pending" : "effective",
      ratePerKwh: Number((0.06 + rnd() * 0.3).toFixed(4)),
      currency: "USD",
      sourceShape: "utility tariff-filing record shape (public source class per the row's route; content synthetic)",
    }),
  );
}

const seed = {
  $context: "https://schema.org.ai",
  substrate: "utilities-energy",
  generated: "deterministic (mulberry32, keyed on substrate id) — reseed via scripts/generate-seed.mjs",
  demo_notice: DEMO_NOTICE,
  fixtureLaw: {
    realNames: false,
    syntheticIdentifiers:
      "UTIL-EX-/MTR-EX-/ISO-EX-/TRF-EX- prefixes, 00-prefixed EIN pattern, *-ex-* record ids; no real EIA/FERC/ISO identifiers or tariff numbers presented as authoritative",
    gtins: "no GTIN grain exists on this row — the GS1 952 demo-prefix rule applies where GTINs exist, and none do here",
    typingAnchors: "Green Button/NAESB ESPI carried as typing anchors only (register: [UNVERIFIED — not in estate docs])",
    secretScan: "no credentials present by construction",
  },
  utilities,
  meters,
  intervalReads,
  queueEntries,
  interconnectionRequests,
  tariffs,
};

writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `seed: ${utilities.length} utilities, ${meters.length} meters, ${intervalReads.length} interval reads, ${queueEntries.length} queue entries, ${interconnectionRequests.length} interconnection requests, ${tariffs.length} tariffs → seed.json`,
);
