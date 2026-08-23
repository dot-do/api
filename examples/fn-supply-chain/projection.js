/**
 * projection.js — Stratum B (the G4 projection config, template spec §2) for
 * the `fn-supply-chain` row.
 *
 * NOT a GAP row: the ruled primary name is **apis.supply** (held, porkbun,
 * expiry 2027-07-26) — but it is (a) a SHARED face with the Wholesale/NAICS
 * 42 vertical row (surface register: substrate "wholesale-distribution
 * (shared: fn-supply-chain)"; that row owns the examples/apis.supply build),
 * and (b) ZONELESS (register: "Requires provisioning (currently zoneless)").
 * So this projection is REGISTERED here — motion, offer array, experiment —
 * while the face itself serves from the shared build once the zone
 * provisions and the two-substrate shared-face arrangement is reconciled.
 * The substrate serves under the row-key placeholder address meanwhile;
 * attaching the face is a config change, not a rebuild.
 *
 * Register facts this encodes (fn-supply-chain row, 2026-08-23):
 *   - "the purest B2A row — agents as buyers is this function's native
 *     motion (FP B-class)" → motion: B2A;
 *   - internal-first anchor (SC H3): the studio's own agent purchasing
 *     across posted-rate catalogs is the first corpus/tenant;
 *   - .ng verb rail (sourc.ng, purchasi.ng, shipp.ng) held adjacent —
 *     verb-vocabulary names, not counterpart-brand candidates;
 *   - epcis.dev stays the traceability sub-position's own face (one ruled
 *     name per category keeps them distinct).
 */
import { SUBSTRATE } from "./apiproduct.js";

export const projection = Object.freeze({
  substrate: SUBSTRATE,

  /** The ruled name — registered, NOT yet serving as this substrate's face. */
  brand: "apis.supply",
  domains: ["apis.supply"],
  brandStatus: {
    state: "name-only (held; zoneless — provisioning debt recorded on the register row)",
    sharedFace:
      "apis.supply is shared with the Wholesale/NAICS 42 vertical row, which owns the examples/apis.supply build; this Function row builds under its row-key dir (batch-1 fn-* precedent) to avoid a two-branch collision. How one shared face projects two substrates is a register-level arrangement, reconciled at provisioning — not improvised here.",
    grammarNote:
      "surface register grades the name grammar 'marginal' (object/activity in the whose-APIs subject slot); the row's subject reading — 'the functions a supply organization's systems call' — is ladder rung 3 (no category-completing TLD held, no singular api.* held).",
  },

  /** G2 coordinates (also served machine-readably at /icp.json and as the
   *  card's top-level g2 member — the ruled batch-2 bridge placement). */
  icp: {
    coordinates: "Function = Supply Chain & Procurement × Departments = Procurement / Operations",
    companyTypes: "all — horizontal Function row",
    jobTypes: ["chief procurement officer", "procurement manager", "supply chain manager", "buyer/planner", "logistics manager"],
  },
  personas: [
    { id: "agentBuyer", description: "an autonomous purchasing agent — the native tenant (the row's purest-B2A verdict); the studio's own agent purchasing across posted-rate catalogs is the first corpus (internal-first anchor, SC H3)" },
    { id: "procurementLead", description: "procurement/ops leader across CompanyTypes (buy-side system-of-record operator)" },
    { id: "supplierOps", description: "supply-side operator answering RFQ fan-out with quotes (the price-response corpus contributor)" },
  ],

  /** §2 motion — selects onboarding path and permissible shapes (§5.1). */
  motion: "B2A",

  /** Offer array: shape × price × gate, drawn only from the B2A ladder.
   *  Rungs 1–3 are declared as labeled STUBS: the doors above the sandbox
   *  floor are not mounted at wave zero — the 402 OFFER body advertises the
   *  whole ladder honestly with stub disclosures. Advertised rungs = MOUNTED
   *  rungs only; stubs are marked, never asserted. */
  offer: [
    { shape: "anon-sandbox", gate: "none — keyless", price: "free", rung: 0, live: true },
    { shape: "earned-credits", gate: ".ax-ledger proof-of-work (#17)", price: "earned", rung: 1, live: false, stub: "ledger not attached until the shared face provisions" },
    { shape: "human-claimed", gate: "human claims the agent workspace", price: "free/earned, longer tenure", rung: 2, live: false, stub: "claim door not mounted at wave zero" },
    { shape: "paid", gate: "402 metering on machine identity (id.org.ai)", price: "metered units", rung: 3, live: false, stub: "no live settlement — 402-shaped stub only, never fake billing" },
  ],

  /** §6.2 experiment registration. */
  experiment: {
    pattern: "402-metered-per-call",
    motion: "B2A",
    shapes: ["anon-sandbox", "earned-credits", "human-claimed", "paid"],
    rateCardRef: "/pricing",
    startDate: "2026-08-23",
    hypothesis:
      "the purest-B2A row: agent buyers convert from the anon sandbox floor to metered PO/RFQ writes, and the quote corpus (submitQuote is free by design — supply-side contribution feeds the price-response dataset) accretes before any paid rung is live",
  },

  /** One claim-free line — the row's recorded subject reading. The
   *  agent-default claim is earned via the §4.6 worthiness bar (conformance +
   *  live anon sandbox + verified published suite, ATTESTED by api.qa) —
   *  withheld everywhere until the bar is attested (batch-2 watch list). */
  positioning: "the functions a supply organization's systems call",

  /** No per-brand MDX layer until the shared face serves — the home faces in
   *  the manifest are substrate-plain by design. */
  mdx: null,

  /** §5.1 B2A2B/C counterpart check — GAP RECORDED (the §9.1 box's honest
   *  branch): the row's ICP includes procurement and ops leaders who are not
   *  developers. If agent buyers transact on behalf of those principals the
   *  effective motion becomes B2A2B, and no human-vocabulary counterpart
   *  brand exists on the register for this cell — the held .ng verb rail
   *  (sourc.ng, purchasi.ng, shipp.ng) is agent/verb vocabulary, not
   *  counterpart-grade. The §9.3 diagnostic (agent-referred HUMAN traffic at
   *  the seams) is wired; the response is a counterpart-brand proposal filed
   *  against the register row, named per #3 — never API vocabulary on a
   *  principal-facing surface. */
  counterpartBrand: {
    required: false,
    gap: "recorded — no human-vocabulary counterpart name held for the procurement-principal cell; §9.3 diagnostic wired at the seams; proposal route: register row + #3 naming, triggered by the signal",
  },
});
