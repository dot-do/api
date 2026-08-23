#!/usr/bin/env node
/**
 * generate-seed.mjs — the §5.2 mechanical sandbox seed for the `automotive`
 * substrate (register row: Automotive, NAICS 441/8111; class A LIVE-REVENUE
 * rail — auto.dev).
 *
 * Source-route honesty (probed in-session, 2026-08-23): the live corpus
 * (api.auto.dev; 2.1M listings [SC #1]) is KEY-GATED — auto.dev/api/listings
 * answers 401 keyless, every plan takes a bearer key. Class A status belongs
 * to the row's owned corpus at the production rail (Drivly, Inc. serving
 * stack — entity boundary); it is NOT honestly reachable keylessly from this
 * build, so the universal-floor anon sandbox is seeded SYNTHETICALLY, typed
 * to the live rail's record shapes (VIN-keyed vehicle, listing, part,
 * work-order) so the real corpus can back it without a schema change.
 * Estate fixture law:
 *   - every record carries `example: true` and a demo notice — the sandbox is
 *     the real product over clearly-labeled simulated data, never a faked demo;
 *   - no real company, person, make, or model names (fictional compounds
 *     tagged [example] — no real-brand collision by construction);
 *   - no real VINs: 17-char VIN-SHAPED synthetic ids, `EXAMPLE`-prefixed,
 *     I/O/Q excluded, check digit NOT computed (ISO 3779/3780 is a typing
 *     anchor only — register marks it [UNVERIFIED]); never decodable as a
 *     real vehicle by construction;
 *   - GTIN grain EXISTS on this row (parts/tires on the GTIN/UNSPSC spine):
 *     GS1 demo prefix 952 with VALID EAN-13 check digits;
 *   - no real EINs — synthetic 00-prefixed patterns;
 *   - no real dealer stock numbers, listing prices, or recall ids presented
 *     as authoritative.
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
const rnd = mulberry32(hash("automotive"));

const DEMO_NOTICE =
  "Synthetic example data — mechanically generated sandbox seed for the automotive substrate; not real vehicle, listing, parts, or work-order data. VINs are VIN-shaped synthetic (EXAMPLE-prefixed, check digit not computed — never a real vehicle); GTINs use the GS1 demo prefix 952 with valid check digits; makes, models, and dealers are fictional [example]. The production corpus (api.auto.dev) is key-gated and is never reproduced here. Retention: sandbox seed is versioned with the manifest and may be regenerated at any deploy.";

const label = (rec) => ({ ...rec, example: true, demo_notice: DEMO_NOTICE });

// VIN-shaped synthetic id: 17 chars, "EXAMPLE" + 10 from the VIN alphabet
// (I/O/Q excluded). Check digit deliberately NOT computed — never a real VIN.
const VIN_ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
function syntheticVin(n) {
  let tail = "";
  const r = mulberry32(hash("vin-" + n));
  for (let i = 0; i < 10; i++) tail += VIN_ALPHABET[Math.floor(r() * VIN_ALPHABET.length)];
  return "EXAMPLE" + tail;
}

// EAN-13 with GS1 demo prefix 952 and a VALID check digit (fixture law:
// the 952 rule applies because GTIN grain exists on this row).
function gtin952(seq) {
  const body = "952" + String(seq).padStart(9, "0"); // 12 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  return body + String((10 - (sum % 10)) % 10);
}

// Fictional dealers — invented compounds, no real-brand collision by construction.
const dealers = [
  { id: "DLR-EX-4411", name: "Kestrelbrook Auto Group [example]", kind: "franchise-dealer-group", naics: "4411", ein: "00-4410001", state: "EX" },
  { id: "DLR-EX-4412", name: "Marrowfield Motors [example]", kind: "independent-dealer", naics: "4411", ein: "00-4410002", state: "EX" },
  { id: "DLR-EX-8111", name: "Tarnwick Reconditioning & Repair [example]", kind: "independent-repair-operator", naics: "8111", ein: "00-8110001", state: "EX" },
].map(label);

// Fictional makes/models — never real marques (fixture law: no real company names).
const MAKES = [
  { make: "Meridale [example]", models: ["Corsette 5", "Faring GT"] },
  { make: "Vantorra [example]", models: ["Slipstream", "Halcyon X"] },
  { make: "Kelwyn Motors [example]", models: ["Ridgeline 8", "Pace 3"] },
];
const BODY = ["sedan", "suv", "pickup", "coupe"];
const vehicles = [];
for (let v = 1; v <= 8; v++) {
  const mk = MAKES[v % MAKES.length];
  vehicles.push(
    label({
      vin: syntheticVin(v),
      vinShape:
        "17-char VIN-shaped synthetic (EXAMPLE prefix, I/O/Q excluded, check digit not computed) — ISO 3779/3780 typing anchor only [register: UNVERIFIED]; never a real vehicle",
      make: mk.make,
      model: mk.models[v % mk.models.length],
      year: 2020 + (v % 6),
      bodyStyle: BODY[v % BODY.length],
      mileage: Math.floor(4000 + rnd() * 90000),
      condition: v % 3 === 0 ? "used-recon" : "used",
    }),
  );
}

// Retail listings on the vehicle record (the live rail's listings lane shape;
// prices synthetic, never real market data presented as authoritative).
const listings = [];
for (let l = 1; l <= 8; l++) {
  const veh = vehicles[l - 1];
  listings.push(
    label({
      id: `lst-ex-${l}`,
      vin: veh.vin,
      dealerId: dealers[l % 2].id,
      priceUsd: Math.floor(9000 + rnd() * 42000),
      status: l % 4 === 0 ? "sold" : "active",
      daysOnLot: Math.floor(rnd() * 120),
      sourceShape: "retail listing record shape (live-rail listings lane; content synthetic, labeled)",
    }),
  );
}

// Parts/tires on the GTIN/UNSPSC identity spine (row data ply). UNSPSC
// segment 25 is a typing anchor only [register: UNVERIFIED at class level].
const PART_DEFS = [
  { name: "Brake pad set, front [example]", category: "brakes" },
  { name: "All-season tire 225/55R18 [example]", category: "tires" },
  { name: "Winter tire 205/60R16 [example]", category: "tires" },
  { name: "Cabin air filter [example]", category: "filters" },
  { name: "Alternator, remanufactured [example]", category: "electrical" },
  { name: "Timing chain kit [example]", category: "engine" },
];
const parts = PART_DEFS.map((p, i) =>
  label({
    id: `PRT-EX-${2501 + i}`,
    gtin: gtin952(250100 + i),
    gtinNote: "GS1 demo prefix 952, valid EAN-13 check digit (fixture law: GTIN grain exists on this row)",
    unspscTypingAnchor: "UNSPSC segment 25 (vehicles) [register: UNVERIFIED at class level] — typing anchor only",
    name: p.name,
    category: p.category,
    fitsMake: MAKES[i % MAKES.length].make,
    priceUsd: Number((12 + rnd() * 480).toFixed(2)),
  }),
);

// Work orders — the 8111 FSM grain (recon/inspection/maintenance), the
// native headless door's records.
const WO_KINDS = ["recon", "inspection", "maintenance"];
const workOrders = [];
for (let w = 1; w <= 3; w++) {
  workOrders.push(
    label({
      id: `wo-ex-${w}`,
      kind: WO_KINDS[w - 1],
      vin: vehicles[w].vin,
      operatorId: dealers[2].id,
      status: w === 1 ? "draft" : w === 2 ? "in-progress" : "completed",
      lineItems: [
        { description: `${WO_KINDS[w - 1]} labor [example]`, hours: Number((0.5 + rnd() * 5).toFixed(1)) },
        { description: "parts per estimate [example]", partId: parts[w].id },
      ],
      workspace: null,
    }),
  );
}

const seed = {
  $context: "https://schema.org.ai",
  substrate: "automotive",
  generated: "deterministic (mulberry32, keyed on substrate id) — reseed via scripts/generate-seed.mjs",
  demo_notice: DEMO_NOTICE,
  fixtureLaw: {
    realNames: false,
    syntheticIdentifiers:
      "VIN-shaped synthetic (EXAMPLE prefix, check digit not computed), DLR-EX-/PRT-EX-/lst-ex-/wo-ex- ids, 00-prefixed EIN pattern; no real VINs, stock numbers, listing prices, or recall ids presented as authoritative",
    gtins: "GTIN grain EXISTS on this row (parts/tires) — GS1 demo prefix 952 with valid EAN-13 check digits, per fixture law",
    typingAnchors:
      "ISO 3779/3780 (VIN) and UNSPSC segment 25 carried as typing anchors only (register marks both [UNVERIFIED]); fictional makes/models/dealers throughout",
    sourceRoute:
      "live corpus key-gated (auto.dev/api/listings → 401 keyless, probed 2026-08-23); seed is synthetic, typed to the live rail's record shapes so real corpus can replace it without a schema change",
    secretScan: "no credentials present by construction",
  },
  dealers,
  vehicles,
  listings,
  parts,
  workOrders,
};

writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `seed: ${dealers.length} dealers, ${vehicles.length} vehicles, ${listings.length} listings, ${parts.length} parts, ${workOrders.length} work orders → seed.json`,
);
