#!/usr/bin/env node
/**
 * generate-seed.mjs — the §5.2 mechanical sandbox seed for the
 * `trade-customs` substrate (register row: Cross-Border Trade & Customs,
 * NAICS 481-483 + customs; a GAP row — no G4 name held).
 *
 * The row's source route is SPEC-NATIVE document assembly (SC #4): the
 * schemas come free from UN/CEFACT + DCSA, but no class-A live corpus is
 * reachable in-session (first-party packet assembly accretes an owned corpus
 * only once real shipments run). So the universal-floor anon sandbox is
 * seeded synthetically, generated against the row's G1-anchored record
 * schemas under estate fixture law:
 *   - every record carries `example: true` and a demo notice — the sandbox is
 *     the real product over clearly-labeled simulated data, never a faked demo;
 *   - no real company, vessel, or person names (fictional invented compounds);
 *   - no real identifiers — `*-ex-*` record ids, 00-prefixed EIN-shaped ids,
 *     CONT-EX-* container ids (deliberately NOT ISO 6346-valid so nothing can
 *     be mistaken for a live unit), EX-chapter HTS-SHAPED codes (EXnn.nn.nnnn
 *     — not real classifications; the register row itself flags the HTS grain
 *     [UNVERIFIED]);
 *   - DCSA/UN/CEFACT are TYPING anchors: the field shapes follow the document
 *     grain, the values are synthetic.
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
const rnd = mulberry32(hash("trade-customs"));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const DEMO_NOTICE =
  "Synthetic example data — mechanically generated sandbox seed for the trade-customs substrate; not real shipment, party, document, or customs data. Retention: sandbox seed is versioned with the manifest and may be regenerated at any deploy.";

const label = (rec) => ({ ...rec, example: true, demo_notice: DEMO_NOTICE });

// Fictional forwarders/carriers — invented compounds, no real-brand collision
// by construction.
const forwarders = [
  { id: "fwd-ex-1", name: "Tarnwick Forwarding Group LLC [example]", role: "freight-forwarder", ein: "00-2200001" },
  { id: "fwd-ex-2", name: "Bryneside Global Logistics Ltd [example]", role: "freight-forwarder", ein: "00-2200002" },
].map(label);

const carriers = [
  { id: "car-ex-1", name: "Sablemoor Ocean Lines [example]", mode: "ocean" },
  { id: "car-ex-2", name: "Quillhaven Air Cargo [example]", mode: "air" },
  { id: "car-ex-3", name: "Fennelmoor Rail Freight Co. [example]", mode: "rail" },
].map(label);

// Fictional trading parties (exporters/importers).
const parties = [
  { id: "pty-ex-1", name: "Osselbrook Machinery Works GmbH [example]", role: "exporter", country: "DE" },
  { id: "pty-ex-2", name: "Larkfen Botanicals S.A. [example]", role: "exporter", country: "CL" },
  { id: "pty-ex-3", name: "Midgewater Provisions Import Co. [example]", role: "importer", country: "US" },
  { id: "pty-ex-4", name: "Tarnbeck Components KK [example]", role: "importer", country: "JP" },
].map(label);

const LANES = [
  { origin: "DE", destination: "US", mode: "ocean" },
  { origin: "CL", destination: "US", mode: "ocean", agri: true },
  { origin: "DE", destination: "JP", mode: "air" },
  { origin: "US", destination: "JP", mode: "air" },
  { origin: "CL", destination: "DE", mode: "ocean", agri: true },
  { origin: "DE", destination: "US", mode: "rail" }, // inland leg of a through movement
];

const GOODS = [
  { description: "Industrial pump assemblies [example goods]", agri: false },
  { description: "Dried botanical extracts [example goods]", agri: true },
  { description: "Machined drivetrain components [example goods]", agri: false },
  { description: "Packaged specialty foodstuffs [example goods]", agri: true },
];

const INCOTERMS = ["FOB", "CIF", "DAP", "EXW"];
const STATUSES = ["assembling", "in-transit", "in-transit", "cleared"]; // weighted

const shipments = [];
const billsOfLading = [];
const certificatesOfOrigin = [];
const phytosanitaryCertificates = [];
const commercialInvoices = [];
const customsEntries = [];

let blSeq = 0, cooSeq = 0, phySeq = 0, invSeq = 0, entSeq = 0;
for (let i = 1; i <= 6; i++) {
  const lane = LANES[(i - 1) % LANES.length];
  const forwarder = forwarders[i % forwarders.length];
  const carrier = carriers.find((c) => c.mode === lane.mode);
  const exporter = parties.find((p) => p.role === "exporter" && (!lane.agri || p.id === "pty-ex-2")) || parties[0];
  const importer = parties.find((p) => p.role === "importer") || parties[2];
  const goods = lane.agri ? pick(GOODS.filter((g) => g.agri)) : pick(GOODS.filter((g) => !g.agri));
  const status = i <= 2 ? "in-transit" : pick(STATUSES); // guarantee in-transit depth
  const sid = `shp-ex-${i}`;
  const packetDocs = [];

  // eBL — DCSA typing anchor; MLETR transferable-record flag. Ocean/rail
  // movements carry a bill of lading in this seed; air movements carry the
  // invoice+certificate set only (honest variance, not padding).
  if (lane.mode !== "air") {
    const blId = `ebl-ex-${++blSeq}`;
    packetDocs.push(blId);
    billsOfLading.push(
      label({
        id: blId, shipmentId: sid,
        typingAnchor: "DCSA eBL (field shapes only — values synthetic)",
        status: status === "assembling" ? "draft" : i % 4 === 0 ? "surrendered" : "issued",
        transferableRecord: true,
        mletr_note: "typed as an electronic transferable record; legal equivalence follows MLETR/ETDA adoption per jurisdiction (the register row's statutory clock)",
        carrierId: carrier.id,
        shipperId: exporter.id,
        consigneeId: importer.id,
        containerRef: `CONT-EX-0000${i} [synthetic — not an ISO 6346 unit]`,
        vessel: lane.mode === "ocean" ? "MV Sablemoor Wanderer [example]" : null,
      }),
    );
  }

  const cooId = `coo-ex-${++cooSeq}`;
  packetDocs.push(cooId);
  certificatesOfOrigin.push(
    label({
      id: cooId, shipmentId: sid,
      typingAnchor: "UN/CEFACT CoO grain (field shapes only — values synthetic)",
      originCountry: lane.origin,
      goodsDescription: goods.description,
      issuedBy: `Chamber of Commerce of ${lane.origin} [synthetic issuer reference]`,
      status: status === "assembling" ? "draft" : "issued",
    }),
  );

  if (lane.agri) {
    const phyId = `phy-ex-${++phySeq}`;
    packetDocs.push(phyId);
    phytosanitaryCertificates.push(
      label({
        id: phyId, shipmentId: sid,
        typingAnchor: "ePhyto-adjacent grain [UNVERIFIED anchor per register row] — values synthetic",
        originCountry: lane.origin,
        commodity: goods.description,
        inspection: "passed [synthetic inspection record]",
        status: "issued",
      }),
    );
  }

  const invId = `inv-ex-${++invSeq}`;
  packetDocs.push(invId);
  commercialInvoices.push(
    label({
      id: invId, shipmentId: sid,
      typingAnchor: "UN/CEFACT commercial-invoice grain (field shapes only — values synthetic)",
      sellerId: exporter.id,
      buyerId: importer.id,
      incoterm: pick(INCOTERMS),
      currency: "USD",
      totalValue: 1000 * (i + 3) + Math.floor(rnd() * 900), // synthetic amount
      lines: [{ description: goods.description, quantity: 10 * i, unitPrice: 100 + i }],
    }),
  );

  // Customs entry only once a movement has reached the border (honest
  // presence); HTS-SHAPED synthetic keys — EX chapter, never a real code.
  if (status === "cleared" || status === "in-transit") {
    const entId = `ent-ex-${++entSeq}`;
    customsEntries.push(
      label({
        id: entId, shipmentId: sid,
        htsShaped: `EX${10 + i}.0${i}.00${i}0 [synthetic HTS-shaped code — not a real classification; the register row flags this grain UNVERIFIED]`,
        destinationCountry: lane.destination,
        declaredValue: commercialInvoices[commercialInvoices.length - 1].totalValue,
        status: status === "cleared" ? "released" : "filed",
        broker_note: "brokerage is a licensed act (19 CFR 111) performed by the operator, never by this layer — this record is the typed document trail only",
      }),
    );
  }

  shipments.push(
    label({
      id: sid,
      reference: `REF-EX-${1000 + i} [synthetic]`,
      mode: lane.mode,
      originCountry: lane.origin,
      destinationCountry: lane.destination,
      status,
      forwarderId: forwarder.id,
      carrierId: carrier.id,
      exporterId: exporter.id,
      importerId: importer.id,
      goodsDescription: goods.description,
      packetDocumentIds: packetDocs,
      packet_note: "the document packet is mandatory on every cross-border edge — refs above are this shipment's typed packet",
    }),
  );
}

const seed = {
  $context: "https://schema.org.ai",
  substrate: "trade-customs",
  generated: "deterministic (mulberry32, keyed on substrate id) — reseed via scripts/generate-seed.mjs",
  demo_notice: DEMO_NOTICE,
  fixtureLaw: {
    realNames: false,
    syntheticIdentifiers:
      "00-prefixed EIN pattern; *-ex-* record ids; CONT-EX-* container refs (not ISO 6346 units); EXnn.nn.nnnn HTS-shaped codes (not real classifications)",
    secretScan: "no credentials present by construction",
  },
  forwarders, carriers, parties, shipments,
  billsOfLading, certificatesOfOrigin, phytosanitaryCertificates, commercialInvoices, customsEntries,
};

writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `seed: ${shipments.length} shipments, ${billsOfLading.length} eBLs, ${certificatesOfOrigin.length} CoOs, ${phytosanitaryCertificates.length} phyto certs, ${commercialInvoices.length} invoices, ${customsEntries.length} customs entries → seed.json`,
);
