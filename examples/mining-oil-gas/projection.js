/**
 * projection.js — Stratum B for this GAP row.
 *
 * Template spec §0: a GAP row instantiates everything EXCEPT the G4 brand
 * config — the G3 work is never blocked on a name. This file is a
 * PLACEHOLDER projection registration, not a brand: it declares the fields
 * the §9.1 checklist needs at wave zero (motion, offer shapes, experiment
 * registration), records the gaps, and attaches a real brand only when an
 * apex name is acquired (#16).
 *
 * Register facts this encodes (mining-oil-gas row, 2026-08-23):
 *   - GAP at every ladder rung: no category-completing TLD, no
 *     api./apis./headless./data. form held, no acquisition candidate in any
 *     estate doc, no WATCH row for NAICS 21;
 *   - held names are artifact singletons only: minesafety.dev
 *     (regulation-check grammar), jib.claims (JIB document grammar),
 *     tankcheck.dev;
 *   - the surface register's gap-fill note lists mining.dev / oilfield.dev
 *     as cheap .dev candidates [availability UNVERIFIED, no purchase
 *     implied] — recorded, never claimed;
 *   - the row is analysis-thin by its own statement; the concrete next facts
 *     it names are an incumbency probe and a name (both absent).
 */
import { SUBSTRATE } from "./apiproduct.js";
import { G2 } from "./manifest.js";

export const projection = Object.freeze({
  substrate: SUBSTRATE,

  /** GAP — no apex name held. Never a brand claim; the org.ai placeholder
   *  address is a substrate address, not a G4 face. */
  brand: null,
  domains: [],
  brandGap: {
    status: "GAP",
    note: "No apex name at any ladder rung (full-economy register 2026-08-23: 'GAP — ladder exhausts'). Artifact singletons held: minesafety.dev, jib.claims, tankcheck.dev — grammars, not apex brands. Surface-register gap-fill candidates mining.dev / oilfield.dev [availability UNVERIFIED]. Acquisition belongs on the #16 list; naming per #3, never re-derived here.",
  },

  /** G2 coordinates — ONE truth (manifest.js G2): served machine-readably at
   *  /icp.json AND carried as the card's top-level `g2` member at the ruled
   *  placement (axp-ext-rates-g2 §4). */
  icp: G2.icp,
  personas: G2.personas,

  /** §2 motion — selects onboarding path and permissible shapes (§5.1). */
  motion: G2.motion,

  /** Offer array: shape × price × gate, drawn only from the B2A ladder.
   *  Rungs 1-3 are declared as labeled STUBS: the doors above the sandbox
   *  floor are not mounted until the row is named — the 402 OFFER body
   *  advertises the whole ladder honestly with stub disclosures. */
  offer: [
    { shape: "anon-sandbox", gate: "none — keyless", price: "free", rung: 0, live: true },
    { shape: "earned-credits", gate: ".ax-ledger proof-of-work (#17)", price: "earned", rung: 1, live: false, stub: "ledger not attached until the row is named" },
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
    hypothesis: "wave-zero placeholder registration: the anon sandbox floor plus a 402-shaped ladder stub; the first real hypothesis is assigned when the G4 brand attaches",
  },

  /** No positioning claim: the agent-default claim is earned via the §4.6
   *  worthiness bar, and a GAP row with no brand claims nothing. */
  positioning: null,

  /** No per-brand MDX layer — no brand. The home faces in the manifest are
   *  substrate-plain by design. */
  mdx: null,

  /** §5.1 B2A2B counterpart check — RECORDED AS A GAP: the row's own ICP
   *  personas (land/JIB accountant, EHS/compliance manager) are
   *  non-technical principals, and no human-vocabulary apex name is held for
   *  this cell. Wave zero serves only the B2A motion, so no counterpart
   *  surface exists to violate the jargon ban — but the gap is real and
   *  recorded per §5.1: a counterpart-brand proposal is filed against the
   *  register row when the §9.3 signal (agent-referred human traffic) fires
   *  or when the G4 brand attaches, whichever first. jib.claims is the
   *  closest held human-vocabulary artifact grammar [fit UNVERIFIED]. */
  counterpartBrand: {
    required: false,
    gap: true,
    note: "Row ICP names non-technical principals and no human-vocabulary apex name is held — a counterpart-brand gap per §5.1, recorded here; naming per #3 when triggered, never invented by this build.",
  },
});
