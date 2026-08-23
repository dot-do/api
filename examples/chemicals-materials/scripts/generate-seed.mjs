#!/usr/bin/env node
/**
 * generate-seed.mjs — the §5.2 mechanical sandbox seed for the
 * `chemicals-materials` substrate (register row: Chemicals & Materials,
 * NAICS 325; a GAP row — no G4 name held).
 *
 * The row's source route (supplier-published SDS corpora as ingest) is a
 * single-lens HYPOTHESIS with an explicit probe-before-build flag — NOT a
 * class-A ruled route — so the universal-floor anon sandbox is seeded
 * synthetically, generated against the row's G1-anchored record schemas
 * under estate fixture law:
 *   - every record carries `example: true` and a demo notice — the sandbox is
 *     the real product over clearly-labeled simulated data, never a faked demo;
 *   - no real company or person names (fictional supplier/facility names,
 *     collision-avoided by construction);
 *   - NO REAL CAS REGISTRY NUMBERS and NO REAL UN NUMBERS — ids are
 *     CAS-SHAPED (`CAS-EX-*`) and UN-SHAPED (`UN-EX-*`) synthetic patterns;
 *     the register marks both anchors [UNVERIFIED], and this seed never
 *     hardens them;
 *   - GHS section TITLES are the standard's own 16-section vocabulary
 *     (HazCom 2012 format — a typing anchor); all section CONTENT is
 *     synthetic and labeled;
 *   - no real EINs — synthetic 00-prefixed patterns.
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
const rnd = mulberry32(hash("chemicals-materials"));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const DEMO_NOTICE =
  "Synthetic example data — mechanically generated sandbox seed for the chemicals-materials substrate; not a real substance, SDS, shipment, supplier, or facility. Substance ids are CAS-shaped synthetic (never real registry numbers); UN ids are UN-shaped synthetic. Retention: sandbox seed is versioned with the manifest and may be regenerated at any deploy.";

const label = (rec) => ({ ...rec, example: true, demo_notice: DEMO_NOTICE });

// Fictional suppliers — invented compounds, no real-brand collision by construction.
const suppliers = [
  { id: "sup-ex-1", name: "Thornmere Solvents LLC [example]", kind: "chemical-manufacturer", naics: "325199", ein: "00-3250001" },
  { id: "sup-ex-2", name: "Gribbleflask Chemical Works Inc. [example]", kind: "chemical-manufacturer", naics: "325180", ein: "00-3250002" },
  { id: "sup-ex-3", name: "Marlpit Polymer Supply Co. [example]", kind: "chemical-distributor", naics: "424690", ein: "00-3250003" },
].map(label);

// Fictional receiving establishments (right-to-know inventory grain).
const facilitiesBase = [
  { id: "fac-ex-1", name: "Osselton Fabrication Co. — Plant 2 [example]", kind: "downstream-receiving-establishment", sector: "manufacturing" },
  { id: "fac-ex-2", name: "Larkspindle Coatings Works [example]", kind: "downstream-receiving-establishment", sector: "coatings" },
  { id: "fac-ex-3", name: "Tarnbeck Water Treatment Cooperative [example]", kind: "downstream-receiving-establishment", sector: "utilities-energy" },
];

// Synthetic substances — invented names; CAS-SHAPED synthetic ids only.
// hazardClass values are GHS class slugs (standard vocabulary as typing);
// every record-level claim is synthetic and labeled.
const SUBSTANCE_DEFS = [
  { name: "Exemplene 40 (synthetic solvent blend) [example]", physicalState: "liquid", hazardClass: "flammable-liquid", packingGroup: "II" },
  { name: "Bramblewick Etchant B [example]", physicalState: "liquid", hazardClass: "corrosive-to-metals", packingGroup: "III" },
  { name: "Quarrelstone Oxidizer QX-7 [example]", physicalState: "solid", hazardClass: "oxidizing-solid", packingGroup: "II" },
  { name: "Fennelmoor Resin Catalyst FR-2 [example]", physicalState: "liquid", hazardClass: "skin-sensitizer", packingGroup: "III" },
  { name: "Midgewater Buffer Salt M-12 [example]", physicalState: "solid", hazardClass: "not-classified", packingGroup: null },
  { name: "Tarnbeck Chlorinating Granules T-9 [example]", physicalState: "solid", hazardClass: "oxidizing-solid", packingGroup: "II" },
];

// The 16 GHS section titles — the standard's own vocabulary (HazCom 2012
// format; typing anchor). Content per section is synthetic.
const GHS_SECTIONS = [
  "Identification",
  "Hazard(s) identification",
  "Composition/information on ingredients",
  "First-aid measures",
  "Fire-fighting measures",
  "Accidental release measures",
  "Handling and storage",
  "Exposure controls/personal protection",
  "Physical and chemical properties",
  "Stability and reactivity",
  "Toxicological information",
  "Ecological information",
  "Disposal considerations",
  "Transport information",
  "Regulatory information",
  "Other information",
];

const substances = [];
const safetyDataSheets = [];
const shippingDeclarations = [];
let sdsSeq = 0, decSeq = 0;

SUBSTANCE_DEFS.forEach((def, i) => {
  const supplier = suppliers[i % suppliers.length];
  const sid = `sub-ex-${i + 1}`;
  const casShaped = `CAS-EX-${String(1000000 + i * 137).slice(-7)}-0${i}`; // synthetic, CAS-SHAPED — never a real registry number
  const unShaped = def.hazardClass === "not-classified" ? null : `UN-EX-${3000 + i}`; // synthetic, UN-SHAPED

  substances.push(
    label({
      id: sid,
      name: def.name,
      casShapedId: casShaped,
      casNote: "CAS-shaped SYNTHETIC id — not a real CAS registry number (register anchor [UNVERIFIED]; fixture law)",
      physicalState: def.physicalState,
      hazardClass: def.hazardClass,
      unShapedId: unShaped,
      supplierId: supplier.id,
      naics: "325",
    }),
  );

  const sdsId = `sds-ex-${++sdsSeq}`;
  safetyDataSheets.push(
    label({
      id: sdsId,
      substanceId: sid,
      supplier: supplier.id,
      hazardClass: def.hazardClass,
      format: "GHS 16-section (OSHA HazCom 2012) — typing anchor; all content synthetic",
      revision: `${1 + (i % 3)}.0`,
      issued: `2026-0${1 + (i % 6)}-1${i % 9}`,
      sections: GHS_SECTIONS.map((title, n) =>
        ({
          section: n + 1,
          title,
          content: `Synthetic section content for ${def.name} — ${title.toLowerCase()} [synthetic content, example data]`,
        })),
    }),
  );

  // one or two shipping declarations per classified substance
  if (unShaped) {
    const n = 1 + (i % 2);
    for (let d = 0; d < n; d++) {
      const facility = facilitiesBase[(i + d) % facilitiesBase.length];
      const issued = d === 0 && i % 3 !== 0;
      shippingDeclarations.push(
        label({
          id: `dec-ex-${++decSeq}`,
          substanceId: sid,
          substance: sid,
          sdsId,
          shipperId: supplier.id,
          consigneeFacilityId: facility.id,
          grain: "49 CFR hazmat shipping papers [register anchor UNVERIFIED; grain used as typing only]",
          unShapedId: unShaped,
          properShippingName: `${def.name.replace(" [example]", "")}, synthetic proper shipping name [example]`,
          hazardClass: def.hazardClass,
          packingGroup: def.packingGroup,
          quantity: `${pick([4, 12, 20, 55])} x ${pick(["1L", "4L", "25kg", "208L drum"])} [synthetic]`,
          status: issued ? "issued" : "draft",
          emergencyContact: "00-555-EXAMPLE (synthetic — fixture law, no real phone)",
        }),
      );
    }
  }
});

// facility right-to-know inventory: each facility holds 2-4 substances
const facilities = facilitiesBase.map((f, i) =>
  label({
    ...f,
    inventory: substances
      .filter((_, si) => (si + i) % 2 === 0 || si === i)
      .map((s) => ({ substanceId: s.id, sdsOnFile: true, quantityOnHand: `${pick([2, 6, 10, 30])} ${pick(["drums", "pails", "bags", "cylinders"])} [synthetic]` })),
    rightToKnowNote: "HazCom right-to-know inventory join — synthetic example inventory; the breadth claim (every receiving establishment) is the register's [UNVERIFIED] hedge, carried",
  }),
);

const seed = {
  $context: "https://schema.org.ai",
  substrate: "chemicals-materials",
  generated: "deterministic (mulberry32, keyed on substrate id) — reseed via scripts/generate-seed.mjs",
  demo_notice: DEMO_NOTICE,
  fixtureLaw: {
    realNames: false,
    syntheticIdentifiers: "CAS-EX-* CAS-shaped ids (never real registry numbers); UN-EX-* UN-shaped ids; 00-prefixed EIN pattern; *-ex-* record ids",
    secretScan: "no credentials present by construction",
  },
  suppliers, substances, safetyDataSheets, shippingDeclarations, facilities,
};

writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `seed: ${substances.length} substances, ${safetyDataSheets.length} safetyDataSheets, ${shippingDeclarations.length} shippingDeclarations, ${facilities.length} facilities, ${suppliers.length} suppliers → seed.json`,
);
