/**
 * seed.mjs — the §5.2 anon-sandbox seed corpus for the `waste-remediation`
 * substrate, produced MECHANICALLY from the register row's candidate record
 * types (hazardous-waste manifest, service/pickup work order, scale/weight
 * ticket, waste-profile record) by this deterministic generator. Reseeding =
 * re-running this module (a build step, never a manual act); the corpus is
 * versioned with the manifest.
 *
 * WHY SYNTHETIC: the row's statutory record system (EPA e-Manifest /
 * RCRAInfo) answered 401 in-session — the manifest feed requires registered
 * credentials, so wave-zero Manifest records are labeled synthetic seed per
 * spec §5.2. The Facility noun is the exception: EPA ECHO's RCRA handler
 * search is keyless and public-domain, so facilities are REAL ingested
 * records (facilities.real.mjs) with provenance — and NOTHING in this file
 * references those real parties: synthetic manifests move between synthetic
 * Example companies only, so no real company is ever depicted doing a
 * fictional thing.
 *
 * Fixture law: every record carries `example: true`; identifiers use the
 * demo prefix 952; companies/people are synthetic ("Example …" names only);
 * all emails live under example.com; handler ids use the EX9 prefix (no
 * real RCRA handler id starts with EX); no credentials or real EIN-shaped
 * identifiers appear anywhere.
 *
 * Live-demo ruling: this seed is tenant #1 of the real substrate — the same
 * handlers serve it that serve everything else. It is a live environment of
 * the real product over simulated data, never a faked demo.
 */

const SUBSTRATE = "waste-remediation";
const EXAMPLE_NOTE = "labeled example record on the anonymous sandbox — simulated data, not a real manifest, shipment, or company";

/* Synthetic parties — Example names only, never the real ECHO facilities. */
const GENERATORS = [
  { handlerId: "EX9-952-GEN-01", name: "Example Coatings Manufacturing", contact: "dana@example.com" },
  { handlerId: "EX9-952-GEN-02", name: "Example Metal Finishing Works", contact: "riley@example.com" },
  { handlerId: "EX9-952-GEN-03", name: "Example Campus Construction Site 7", contact: "sam@example.com" },
];
const TRANSPORTER = { handlerId: "EX9-952-TRN-01", name: "Example Environmental Hauling", contact: "jordan@example.com" };
const TSDF = { handlerId: "EX9-952-TSD-01", name: "Example Treatment & Disposal Facility", contact: "casey@example.com" };

const iso = (day, h) => `2026-08-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00Z`;

/* One row per manifest: [status, wasteCode, wasteDescription, tons, generatorIdx]
 * — the statutory lifecycle is exercised end-to-end (scheduled → in-transit →
 * received → certified), every declared filter value present at least once,
 * none named "none" so the knownEmpty probes stay honest. Waste codes are the
 * RCRA characteristic/listed code GRAMMAR (D/F/U series) on simulated streams. */
const MANIFEST_TABLE = [
  ["scheduled", "D001", "[demo] ignitable spent solvent blend, drummed", 2.4, 0],
  ["scheduled", "F003", "[demo] non-halogenated solvent still bottoms", 1.1, 1],
  ["in-transit", "D002", "[demo] corrosive pickling acid, tote", 3.0, 1],
  ["in-transit", "D008", "[demo] lead-bearing blast media", 5.2, 2],
  ["received", "F006", "[demo] electroplating wastewater sludge", 4.8, 1],
  ["received", "D001", "[demo] off-spec flammable coating batch", 1.9, 0],
  ["certified", "U134", "[demo] discarded hydrofluoric acid, lab pack", 0.3, 2],
  ["certified", "D002", "[demo] neutralized caustic rinse water", 6.5, 0],
];

export const manifests = MANIFEST_TABLE.map(([status, wasteCode, wasteDescription, tons, gi], i) => {
  const id = `MAN-952-${String(i + 1).padStart(4, "0")}`;
  const generator = GENERATORS[gi];
  const scheduled = iso(10 + i, 8);
  const reached = { "in-transit": 1, received: 2, certified: 3 }[status] ?? 0;
  return {
    $type: "https://schema.org.ai/HazardousWasteManifest", // statutory record grammar per EPA e-Manifest (register row flag [UNVERIFIED] kept); no keyless interchange feed exists, so the schema is schema.org.ai-typed (cascade rule 2)
    id,
    example: true,
    exampleNote: EXAMPLE_NOTE,
    status,
    wasteCode,
    wasteDescription,
    quantityTons: tons,
    generator,
    transporter: TRANSPORTER,
    designatedFacility: TSDF,
    scheduledAt: scheduled,
    ...(reached >= 1 && { pickedUpAt: iso(10 + i, 10) }),
    ...(reached >= 2 && { receivedAt: iso(10 + i, 15) }),
    ...(reached >= 3 && {
      certifiedAt: iso(10 + i, 17),
      certification: {
        by: TSDF.contact,
        statement: "[demo] receipt certified in the labeled example lifecycle — simulated signature, no statutory effect",
      },
    }),
    createdAt: scheduled,
    updatedAt: iso(10 + i, 8 + reached * 3),
  };
});

/* Service/pickup work orders — the headless route/dispatch ply's record.
 * Every completed order has a scale ticket; statuses exercise the dispatch
 * lifecycle end-to-end. */
const WORK_ORDER_TABLE = [
  ["scheduled", "MAN-952-0001", "[demo] drum pickup — dock 3, liftgate needed"],
  ["scheduled", "MAN-952-0002", "[demo] still-bottoms tote swap"],
  ["en-route", "MAN-952-0003", "[demo] acid tote transfer, placarded corrosive"],
  ["en-route", "MAN-952-0004", "[demo] blast-media roll-off exchange"],
  ["completed", "MAN-952-0005", "[demo] sludge box haul to designated TSDF"],
  ["completed", "MAN-952-0007", "[demo] lab-pack collection, chemistry sign-off"],
];

export const workOrders = WORK_ORDER_TABLE.map(([status, manifest, instructions], i) => {
  const id = `WO-952-${String(i + 1).padStart(4, "0")}`;
  const completed = status === "completed";
  return {
    $type: "https://schema.org.ai/WorkOrder",
    id,
    example: true,
    exampleNote: EXAMPLE_NOTE,
    status,
    manifest,
    instructions,
    assignedTo: { name: "Alex Example (route driver)", email: "alex@example.com" },
    dispatcher: { name: "Morgan Example (dispatch)", email: "morgan@example.com" },
    windowStart: iso(10 + i, 7),
    windowEnd: iso(10 + i, 12),
    ...(completed && { completedAt: iso(10 + i, 11), scaleTicket: `SCL-952-${String(i + 1).padStart(4, "0")}` }),
    createdAt: iso(9 + i, 16),
    updatedAt: iso(10 + i, completed ? 11 : 7),
  };
});

/* Scale/weight tickets — generated by the dispatch system when an order
 * completes; gross/tare arithmetic is internally consistent. */
export const scaleTickets = workOrders
  .filter((w) => w.status === "completed")
  .map((w) => {
    const m = manifests.find((x) => x.id === w.manifest);
    const netTons = m.quantityTons;
    const tareTons = 14.2;
    return {
      $type: "https://schema.org.ai/ScaleTicket",
      id: w.scaleTicket,
      example: true,
      exampleNote: EXAMPLE_NOTE,
      workOrder: w.id,
      manifest: m.id,
      facility: TSDF.handlerId, // synthetic Example TSDF — never a real ECHO facility
      grossTons: +(tareTons + netTons).toFixed(1),
      tareTons,
      netTons,
      weighedAt: w.completedAt,
      weighmaster: "Casey Example (weighmaster)",
    };
  });

/* Waste-profile records — `generated` binding: mechanically derived from
 * the manifest corpus above, one profile per waste code seen. */
const PROFILE_NAMES = {
  D001: "[demo] Ignitable liquids — solvent and coating streams",
  D002: "[demo] Corrosive liquids — acid and caustic streams",
  D008: "[demo] Lead-characteristic solids",
  F003: "[demo] Spent non-halogenated solvents (listed)",
  F006: "[demo] Electroplating sludges (listed)",
  U134: "[demo] Discarded hydrofluoric acid (listed commercial chemical)",
};

export const wasteProfiles = [...new Set(manifests.map((m) => m.wasteCode))].map((wasteCode, i) => {
  const shipped = manifests.filter((m) => m.wasteCode === wasteCode);
  return {
    $type: "https://schema.org.ai/WasteProfile",
    id: `WPR-952-${String(i + 1).padStart(4, "0")}`,
    example: true,
    exampleNote: EXAMPLE_NOTE,
    wasteCode,
    name: PROFILE_NAMES[wasteCode],
    physicalState: wasteCode === "D008" ? "solid" : "liquid",
    derivedFrom: shipped.map((m) => m.id),
    totalTonsOnRecord: +shipped.reduce((t, m) => t + m.quantityTons, 0).toFixed(1),
    body: `${PROFILE_NAMES[wasteCode]} — a labeled example waste profile generated from the demo manifest corpus (substrate ${SUBSTRATE}).`,
  };
});
