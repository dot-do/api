/**
 * projection.js — Stratum B for this GAP row.
 *
 * Template spec §0: a GAP row instantiates everything EXCEPT the G4 brand
 * config — the G3 work is never blocked on a name. So this file is a
 * PLACEHOLDER projection registration, not a brand: it declares the fields
 * the §9.1 checklist needs at wave zero (motion, offer shapes, experiment
 * registration) and records the gaps, and it attaches a real brand only when
 * a product-function name is acquired (#16).
 *
 * Register facts this encodes (fn-product-development row, 2026-08-23):
 *   - no held name carries the product-function meaning;
 *   - apis.dev is explicitly NOT this rail (#3: its ratified subject belongs
 *     to the Software vertical; double-assignment would violate
 *     one-ruled-name-per-category);
 *   - B2A is the wave-zero motion: "agents that build products (the estate's
 *     own swarms) are the first tenant" (row ICP hint).
 */
import { SUBSTRATE } from "./apiproduct.js";
import { G2 } from "./manifest.js";

export const projection = Object.freeze({
  substrate: SUBSTRATE,

  /** GAP — no product-function name held. Never a brand claim; the org.ai
   *  placeholder address is a substrate address, not a G4 face. */
  brand: null,
  domains: [],

  /** Rail-ledger address of record (LEDGER.md door A; GAP rule: the
   *  placeholder host is the registry face until the address is ruled). */
  account: "https://apis.ax/account/faces?face=fn-product-development.org.ai",
  brandGap: {
    status: "GAP",
    note: "No held name carries the product-function meaning (full-economy register 2026-08-23). Acquisition candidate belongs on the #16 list; ply-lead if acquired: headless.[x] form fits rule 4 (system-of-record face leads). apis.dev must NOT be stretched to cover this row.",
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

  /** §5.1 B2A2B/C counterpart check: the row's ICP includes product/engineering
   *  leads (technical) — no non-technical-principal ICP is claimed at wave
   *  zero, so no counterpart brand is required yet. The §9.3 diagnostic
   *  (agent-referred human traffic) is wired at the seams and would surface
   *  the gap; a counterpart proposal would be filed against the register row. */
  counterpartBrand: { required: false, note: "re-evaluate when the G4 brand attaches and human principals enter the ICP" },
});
