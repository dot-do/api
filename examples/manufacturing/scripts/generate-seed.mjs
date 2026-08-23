#!/usr/bin/env node
/**
 * generate-seed.mjs — the §5.2 mechanical sandbox seed for the
 * `manufacturing` substrate (register row: Manufacturing, NAICS 31-33; a GAP
 * row — zero market-face names held).
 *
 * The row's source route (GS1 registries + manufacturer-published product
 * content as ingest) is not a reachable class-A corpus in this build, so the
 * universal-floor anon sandbox is seeded synthetically, generated against the
 * row's G1-anchored record schemas under estate fixture law:
 *   - every record carries `example: true` and a demo notice — the sandbox is
 *     the real product over clearly-labeled simulated data, never a faked demo;
 *   - every GTIN uses the GS1 DEMO PREFIX 952 with a VALID GTIN-13 check
 *     digit (fixture law; the check-digit routine self-tests below);
 *   - no real company or person names (fictional manufacturer names, invented
 *     compounds — no real-brand collision by construction);
 *   - no real EINs — synthetic 00-prefixed patterns;
 *   - classification codes are SCHEMA-SHAPED SYNTHETIC (`UNSPSC-EX-*`,
 *     `GPC-EX-*`, `HTS-EX-*`) — never real UNSPSC/GPC/HTS codes presented as
 *     authoritative; GS1/UNSPSC/X12 appear as TYPING ANCHORS only;
 *   - X12 850/856/810 are typing anchors; document content is synthetic.
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
const rnd = mulberry32(hash("manufacturing"));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ── GS1 fixture law: demo-prefix 952 GTIN-13 with a VALID check digit ───────
// GTIN-13 check digit: over the 12 data digits left→right, odd positions ×1,
// even positions ×3; check = (10 − sum mod 10) mod 10.
function gtin13(data12) {
  if (!/^\d{12}$/.test(data12)) throw new Error(`gtin13 needs 12 data digits, got ${data12}`);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(data12[i]) * (i % 2 === 0 ? 1 : 3);
  return data12 + String((10 - (sum % 10)) % 10);
}
// Self-test against the GS1 documentation example: data 400638133393 → check 1.
if (gtin13("400638133393") !== "4006381333931") throw new Error("GTIN-13 check-digit routine failed its self-test");
let gtinSeq = 0;
const nextGtin = () => gtin13("952" + String(++gtinSeq).padStart(9, "0")); // demo prefix 952

const DEMO_NOTICE =
  "Synthetic example data — mechanically generated sandbox seed for the manufacturing substrate; not real product, manufacturer, or trading data. GTINs use the GS1 demo prefix 952; classification codes are schema-shaped synthetic. Retention: sandbox seed is versioned with the manifest and may be regenerated at any deploy.";

const label = (rec) => ({ ...rec, example: true, demo_notice: DEMO_NOTICE });

// Fictional manufacturers — invented compounds, no real-brand collision by construction.
const manufacturers = [
  { id: "mfr-ex-1", name: "Coppervane Industrial Works LLC [example]", kind: "electrical-components", naics: "335", ein: "00-3100001" },
  { id: "mfr-ex-2", name: "Thornemill Components Inc. [example]", kind: "fabricated-metal", naics: "332", ein: "00-3100002" },
  { id: "mfr-ex-3", name: "Grindlewold Fabricators LLC [example]", kind: "machinery", naics: "333", ein: "00-3100003" },
].map(label);

// Fictional trading counterparties (distributors/buyers).
const counterparties = [
  { id: "cp-ex-1", name: "Larkspindle Distribution Inc. [example]", role: "distributor" },
  { id: "cp-ex-2", name: "Osselton Assembly Co. [example]", role: "oem-buyer" },
  { id: "cp-ex-3", name: "Tarnbeck Retail Supply Cooperative [example]", role: "retail-buyer" },
].map(label);

const SEGMENTS = ["electrical-example", "fasteners-example", "power-storage-example"];
const STATUSES = ["active", "active", "active", "draft", "discontinued"]; // weighted

const ITEM_NAMES = [
  "Terminal block, 12-position [example]",
  "Hex flange bolt M8×30, grade-EX [example]",
  "Cable gland, IP67-style [example]",
  "Prismatic battery cell, 100Ah-class [example]",
  "Battery module housing, welded [example]",
  "Torque hinge assembly [example]",
  "DIN-rail power relay [example]",
  "Stainless clevis pin 10mm [example]",
];

// Schema-shaped synthetic classification codes (never real UNSPSC/GPC/HTS).
const crosswalk = [];
const items = [];
for (let i = 1; i <= 8; i++) {
  const seg = SEGMENTS[i % SEGMENTS.length];
  const mfr = manufacturers[i % manufacturers.length];
  const unspsc = `UNSPSC-EX-${3100 + i}`;
  const gpc = `GPC-EX-${5200 + i}`;
  const hts = `HTS-EX-${8500 + i}`;
  items.push(
    label({
      id: `item-ex-${i}`,
      gtin: nextGtin(), // GS1 demo prefix 952, valid check digit
      name: ITEM_NAMES[i - 1],
      manufacturerId: mfr.id,
      brand: mfr.name,
      status: i <= 5 ? "active" : pick(STATUSES),
      gpcSegment: seg,
      gpcBrick: gpc,
      unspsc,
      identityAnchors: "GS1 GTIN/GPC + UNSPSC (typing anchors; codes on this record are synthetic schema-shaped examples)",
    }),
  );
  crosswalk.push(
    label({
      id: `xw-ex-${i}`,
      unspsc,
      gpc,
      hts,
      labelText: `${ITEM_NAMES[i - 1].replace(" [example]", "")} — synthetic crosswalk row [example]`,
      spine: "UNSPSC↔GPC↔HTS identity spine (register: the crosswalk corpus this row rides); codes are schema-shaped synthetic",
    }),
  );
}

// BOMs — parent items with component lines referencing sibling items.
const boms = [];
for (let b = 1; b <= 4; b++) {
  const parent = items[b + 2]; // items 4..7 get BOMs (includes the battery module)
  const nComp = 2 + (b % 3);
  const components = [];
  for (let c = 0; c < nComp; c++) {
    const comp = items[(b + c) % items.length];
    if (comp.id === parent.id) continue;
    components.push({ itemId: comp.id, gtin: comp.gtin, quantity: 1 + ((b + c) % 6), unit: "each" });
  }
  boms.push(
    label({
      id: `bom-ex-${b}`,
      itemId: parent.id,
      revision: `R${b}.0`,
      status: b === 4 ? "draft" : "released",
      components,
    }),
  );
}

// Digital Product Passports — the row's only DATED demand signal: EU battery
// regulation DPP, statutory 2027-02-18 (register [VC #23, H]). Synthetic.
const passports = [
  label({
    id: "dpp-ex-1",
    itemId: "item-ex-4", // prismatic battery cell
    kind: "battery-passport",
    statute: "EU battery-regulation Digital Product Passport, statutory date 2027-02-18 (register VC #23; record content synthetic)",
    carbonFootprintKgCO2e: 18.4,
    recycledContentPct: 12,
    substancesOfConcern: ["synthetic-example-substance-A"],
  }),
  label({
    id: "dpp-ex-2",
    itemId: "item-ex-5", // battery module housing
    kind: "battery-passport",
    statute: "EU battery-regulation Digital Product Passport, statutory date 2027-02-18 (register VC #23; record content synthetic)",
    carbonFootprintKgCO2e: 6.1,
    recycledContentPct: 41,
    substancesOfConcern: [],
  }),
];

// RFQs + quotes — the buyer-side mfg RFQ grain (register FP #26 / VC #13).
const rfqs = [];
const quotes = [];
let qSeq = 0;
for (let r = 1; r <= 3; r++) {
  const buyer = counterparties[r % counterparties.length];
  const line = items[(r * 2) % items.length];
  rfqs.push(
    label({
      id: `rfq-ex-${r}`,
      title: `RFQ — ${line.name.replace(" [example]", "")}, ${500 * r} units [example]`,
      buyerId: buyer.id,
      status: r === 3 ? "closed" : "open",
      lines: [{ itemId: line.id, gtin: line.gtin, quantity: 500 * r, unit: "each" }],
    }),
  );
  const nQuotes = 1 + (r % 2);
  for (let q = 0; q < nQuotes; q++) {
    const supplier = manufacturers[(r + q) % manufacturers.length];
    quotes.push(
      label({
        id: `quote-ex-${++qSeq}`,
        rfqId: `rfq-ex-${r}`,
        supplierId: supplier.id,
        unitPrice: Number((0.4 + rnd() * 9).toFixed(2)),
        currency: "USD",
        leadTimeDays: 10 + Math.floor(rnd() * 40),
        status: r === 3 && q === 0 ? "awarded" : "submitted",
      }),
    );
  }
}

// X12 trading documents — 850 (PO) / 856 (ASN) / 810 (Invoice) typing
// anchors on the wholesale edge; document content synthetic.
const tradingDocuments = [];
let tdSeq = 0;
for (let t = 1; t <= 2; t++) {
  const item = items[t];
  const buyer = counterparties[t % counterparties.length];
  const seller = manufacturers[t % manufacturers.length];
  for (const kind of ["850", "856", "810"]) {
    tradingDocuments.push(
      label({
        id: `td-ex-${++tdSeq}`,
        kind, // X12 transaction-set number (typing anchor; content synthetic)
        x12TypingAnchor: `X12 ${kind} (${kind === "850" ? "purchase order" : kind === "856" ? "ship notice" : "invoice"}) — typing anchor only; document content is synthetic`,
        buyerId: buyer.id,
        sellerId: seller.id,
        itemIds: [item.id],
        gtins: [item.gtin],
        total: kind === "810" ? Number((100 + rnd() * 4000).toFixed(2)) : undefined,
        currency: kind === "810" ? "USD" : undefined,
      }),
    );
  }
}

const seed = {
  $context: "https://schema.org.ai",
  substrate: "manufacturing",
  generated: "deterministic (mulberry32, keyed on substrate id) — reseed via scripts/generate-seed.mjs",
  demo_notice: DEMO_NOTICE,
  fixtureLaw: {
    realNames: false,
    gs1DemoPrefix: "952 — every GTIN is 952-prefixed with a valid GTIN-13 check digit (routine self-tested)",
    syntheticIdentifiers: "00-prefixed EIN pattern; UNSPSC-EX-/GPC-EX-/HTS-EX- classification codes; *-ex-* record ids",
    secretScan: "no credentials present by construction",
  },
  manufacturers,
  counterparties,
  items,
  boms,
  passports,
  rfqs,
  quotes,
  tradingDocuments,
  crosswalk,
};

writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `seed: ${items.length} items, ${boms.length} boms, ${passports.length} passports, ${rfqs.length} rfqs, ${quotes.length} quotes, ${tradingDocuments.length} trading documents, ${crosswalk.length} crosswalk rows → seed.json`,
);
