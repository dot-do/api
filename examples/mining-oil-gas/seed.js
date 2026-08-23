/**
 * seed.js — the §5.2 mechanically-produced sandbox seed for the
 * `mining-oil-gas` substrate (GAP row — no apex name held; this corpus lives
 * under the placeholder org.ai address).
 *
 * SYNTHETIC DATA, ALWAYS LABELED. The row's source route (public-licensable
 * ingest: state well registries, MSHA violation data, FracFocus disclosures)
 * is recorded [UNVERIFIED — none probed] in the register and carries no
 * class-A rating, so per the batch watch list this seed is generated per
 * template §5.2 — never real records:
 *   - every record carries `example: true`; every named/titled field carries
 *     a "[demo]" prefix;
 *   - well API numbers use the synthetic state code 00 ("00-000-NNNNN") —
 *     00 is not a real US state/county API prefix (same law as the
 *     accounting row's synthetic 00-prefix EINs);
 *   - no real company, person, mine or well names anywhere;
 *   - regulatory classification codes (30 CFR standard cites, CAS numbers)
 *     are deliberately OMITTED rather than fabricated — the compliance spine
 *     is documented, never faked.
 *
 * The corpus exercises every declared operation: wells branch by
 * status/operatorId (OK), impossible filters return EMPTY, reserved scopes
 * return BLOCKED; violations, disclosures and JIB statements populate the
 * sibling collections with realistic depth (a producing demo well has a
 * FracFocus-class disclosure and JIB statements whose share arithmetic is
 * internally consistent).
 */

export const RETENTION_NOTICE =
  "Demo workspace: synthetic example data on an unnamed wave-zero surface. " +
  "Records you create are held in ephemeral sandbox memory only and may be reset at any time.";

/** Operator — schema.org Organization generic fallback (no estate-held typed
 *  schema; PIDX is [UNVERIFIED] in the register — cascade rule 2). */
export const operators = [
  {
    $type: "https://schema.org/Organization",
    id: "op-demo-001",
    example: true,
    name: "[demo] Basalt Ridge Operating Co.",
    kind: "operator",
    summary: "Synthetic demo operator of record for the demo wells and the demo quarry.",
  },
  {
    $type: "https://schema.org/Organization",
    id: "op-demo-002",
    example: true,
    name: "[demo] Northpost Energy Partners",
    kind: "non-operated-wi-holder",
    summary: "Synthetic demo non-operating working-interest holder — the JIB counterparty (JIB is a between-parties document; the row's ICP names the pair).",
  },
];

/** Well — state-registry-shaped record; typed as the substrate's own record
 *  (no verified interchange standard on the row). API numbers are SYNTHETIC:
 *  state code 00 does not exist. */
export const wells = [
  {
    $type: "https://schema.org.ai/Well",
    id: "well-demo-001",
    example: true,
    name: "[demo] Cormorant Ridge 1H",
    apiNumber: "00-000-00001",
    operatorId: "op-demo-001",
    status: "producing",
    spudDate: "2024-03-11",
  },
  {
    $type: "https://schema.org.ai/Well",
    id: "well-demo-002",
    example: true,
    name: "[demo] Cormorant Ridge 2H",
    apiNumber: "00-000-00002",
    operatorId: "op-demo-001",
    status: "producing",
    spudDate: "2024-09-02",
  },
  {
    $type: "https://schema.org.ai/Well",
    id: "well-demo-003",
    example: true,
    name: "[demo] Gray Fork 4",
    apiNumber: "00-000-00003",
    operatorId: "op-demo-001",
    status: "shut-in",
    spudDate: "2019-06-24",
  },
  {
    $type: "https://schema.org.ai/Well",
    id: "well-demo-004",
    example: true,
    name: "[demo] Old Meridian 7",
    apiNumber: "00-000-00004",
    operatorId: "op-demo-001",
    status: "plugged",
    spudDate: "2008-02-18",
  },
];

/** Violation — MSHA-class mine-safety violation record (the minesafety.dev
 *  artifact grammar). The 30 CFR standard cite is OMITTED, never fabricated. */
export const violations = [
  {
    id: "vio-demo-001",
    example: true,
    mineId: "mine-demo-001",
    mineName: "[demo] Basalt Ridge Quarry",
    operatorId: "op-demo-001",
    severity: "significant-substantial",
    issuedDate: "2026-04-14",
    status: "terminated",
    summary: "[demo] Synthetic demo citation — berm height on elevated roadway. Standard cite omitted (never fabricated).",
  },
  {
    id: "vio-demo-002",
    example: true,
    mineId: "mine-demo-001",
    mineName: "[demo] Basalt Ridge Quarry",
    operatorId: "op-demo-001",
    severity: "non-ss",
    issuedDate: "2026-05-02",
    status: "open",
    summary: "[demo] Synthetic demo citation — equipment pre-shift examination recordkeeping. Standard cite omitted.",
  },
  {
    id: "vio-demo-003",
    example: true,
    mineId: "mine-demo-001",
    mineName: "[demo] Basalt Ridge Quarry",
    operatorId: "op-demo-001",
    severity: "non-ss",
    issuedDate: "2026-06-19",
    status: "terminated",
    summary: "[demo] Synthetic demo citation — guarding on stationary conveyor. Standard cite omitted.",
  },
];

/** Disclosure — FracFocus-class chemical-disclosure record. CAS numbers and
 *  ingredient chemistry are OMITTED, never fabricated; only counts and
 *  synthetic volumes appear. */
export const disclosures = [
  {
    id: "disc-demo-001",
    example: true,
    wellId: "well-demo-001",
    apiNumber: "00-000-00001",
    jobDate: "2024-04-20",
    waterVolumeGal: 4200000,
    ingredientsDisclosed: 14,
    summary: "[demo] Synthetic demo disclosure — ingredient list withheld by fixture law (CAS numbers never fabricated).",
  },
  {
    id: "disc-demo-002",
    example: true,
    wellId: "well-demo-002",
    apiNumber: "00-000-00002",
    jobDate: "2024-10-08",
    waterVolumeGal: 3875000,
    ingredientsDisclosed: 12,
    summary: "[demo] Synthetic demo disclosure — ingredient list withheld by fixture law.",
  },
];

/**
 * JIBStatement — the joint-interest-billing statement (the jib.claims
 * artifact grammar): a between-parties document from operator to
 * non-operating working-interest holder. Share arithmetic is internally
 * consistent by construction: netDue = round(grossBilled × workingInterestShare, 2).
 */
export const jibStatements = [
  {
    $type: "https://schema.org.ai/JIBStatement",
    id: "jib-demo-2026-06-001",
    example: true,
    wellId: "well-demo-001",
    operatorId: "op-demo-001",
    partnerId: "op-demo-002",
    period: "2026-06",
    memo: "[demo] June operating expenses — Cormorant Ridge 1H",
    grossBilled: 18425.5,
    workingInterestShare: 0.25,
    netDue: 4606.38,
    status: "issued",
  },
  {
    $type: "https://schema.org.ai/JIBStatement",
    id: "jib-demo-2026-06-002",
    example: true,
    wellId: "well-demo-002",
    operatorId: "op-demo-001",
    partnerId: "op-demo-002",
    period: "2026-06",
    memo: "[demo] June operating expenses — Cormorant Ridge 2H",
    grossBilled: 21080.0,
    workingInterestShare: 0.25,
    netDue: 5270.0,
    status: "issued",
  },
  {
    $type: "https://schema.org.ai/JIBStatement",
    id: "jib-demo-2026-07-001",
    example: true,
    wellId: "well-demo-001",
    operatorId: "op-demo-001",
    partnerId: "op-demo-002",
    period: "2026-07",
    memo: "[demo] July operating expenses + workover — Cormorant Ridge 1H",
    grossBilled: 44310.75,
    workingInterestShare: 0.25,
    netDue: 11077.69,
    status: "disputed",
  },
];
