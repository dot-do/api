# apis.finance — wave zero

The wave-zero instantiation of the full-economy register row
**`banking-payments`** (NAICS 521-522 ex-mortgage) as the property
**apis.finance**, built to the payable machine-face template
(`docs/plans/2026-08-23-property-template-spec.md` in the studio repo, §7.3
wave-zero MUSTs).

**Register rulings carried (binding).**

- **Rails law:** rails are avoid-class 3 — this property is the
  data/functions layer ("the functions a lending system calls"), **never the
  payment rails themselves**. The ISO 20022 message set (pain.001 /
  pacs.008 / camt.053) is the interchange spine of the data ply.
- **Naming:** the name apis.finance is the held-and-recorded plural (ladder
  verdict). `api.finance` appears in no [REG] row — treated as **not held**;
  the ax `packages/api.finance` package is an internal ADR-0020 data home
  (markets/advisory), not this row's home. finance.do is third-party
  (aftermarket-only; nothing here implies pursuit). apis.credit / apis.loans /
  apis.cards / apis.creditcard are same-property sub-rails, recorded in the
  projection config and the card's family block — not separate substrates.
- **Platform consumption:** settlement/billing/escrow primitives
  (payments.do, Batch-S) are platform modules this property **consumes, not
  contains** — that blocks the monetized-serving stage only, never the face.
  Every payable door is a labeled 402-shaped stub; no billing occurs.
- **Source route:** the row's public-regulatory-ingest route is an
  [UNVERIFIED route inference] and not reachable in-session, so every
  wave-zero Noun is `generated` per §5.2 (labeled synthetic sandbox seed);
  the Workspace door is `native` (ephemeral at wave zero, disclosed on mint).

Every served record is labeled example data (`example: true` +
`exampleNote` on every record; fictional lender/borrowers; ZZ pseudo-country
BICs; synthetic-by-construction UETRs; no real routing numbers or EINs —
enforced by the gate). No public positioning beyond the recorded pitch, no
agent-default claim (withheld until the §4.6 worthiness bar attests), no
ranking implied anywhere.

## Layout

| File | Stratum | What it is |
|---|---|---|
| `product.js` | A (G3) | The `APIProduct` instance: Nouns (PaymentMessage / Loan / CreditFile / Lender `generated`; Workspace `native`) with schema + binding + verbs; System coordinate CoreBanking⟨banks, credit-unions, non-bank-lenders, fintech-loan-servicers⟩; operations (the only things the rate card may price); sandbox spec; meters |
| `projection.config.json` | B (G4) | The projection config: brand, sub-rails, ICP + personas, motion **B2D**, offer array (mounted: anon sandbox + 402 stub; unmounted rungs recorded, not advertised), pricing pattern, experiment registration, counterpart-brand check (no gap — technical principals), guardrail note |
| `manifest.js` | face | The ONE site manifest — every machine face generates from it; G2 doc (`/icp.json`), the operation-keyed `RATE_ROWS`, the MCP declaration (mounted), family cross-links |
| `axp/` | face | The shared generator, vendored byte-identical (PINS.json pins `apis-ax-axp@2.6.0`, digest `a9a1197c…`); never edited here |
| `bridge.js` | face | The FOUR ruled extension placements (batch-2 rollup, binding — bridged exactly here until the upstream re-vendor lands): `/pricing` `rates[]` top-level, card `g2` top-level, card `links.verify`, `operationId` on every route — with fail-closed build gates |
| `seed.js` | §5.2 | The labeled synthetic seed, generated from three amortizing loans so everything ties BY CONSTRUCTION: installment pacs.008s equal the level payment, camt.053 statements chain opening→closing, credit-file tradelines equal the amortized outstanding |
| `worker.js` | serving | Both plies from the one definition: data face (payment-messages branching collection + loans/credit-files/lenders), headless face (workspace mint + register — the core-banking system-of-record door, ephemeral + disclosed), the payable 402 stub doors (`POST /credit-files/pulls`, `POST /originations`), and the §7.4 seams |
| `mcp.js` | face | The MCP door at `POST /mcp` — same Nouns/verbs as HTTP; sandbox read tools authless (anon-sandbox rung), payable tools bearer-keyed (typed BLOCKED keyless, typed OFFER keyed) |
| `verify.js` | proof | The published `api.qa/suite@1` suite served byte-exact at `/verify/suite.json`; `/verify` prints the digest and the run command. `interfaces.testSuite` stays UNDECLARED until digest-pinned executable (batch-2 ruling) |
| `seams.js` | §7.4 | Meter / money / receipt / signal events tagged `{substrate, projection, motion, operation, shape, pattern}`; identity class + referral on signals (the §9.3 diagnostic feed); no account UI, key management, invoicing, or payout logic |
| `spec/` | pin | The ratified spec copy + digest the local gate asserts against |
| `check.mjs` | gate | The §9.1 self-verify gate — vendor integrity, spec pin, in-process `gradePinned` conformance, fixture law + corpus re-derivation, suite-byte coherence, headless + payable + MCP doors, conneg spot check, ruled-placement checks. `node check.mjs` (Node ≥ 22; needs a built `~/projects/api.qa` or `$AUTONOMOUS_QA`) |

## Gate result at build time

`node check.mjs` → **ALL GATES GREEN**, including `gradePinned` **24/24** at
the ratified digest `a9a1197c…`.

## §9.1 checklist: 16/16

Every box passes, including the last: **face registered in the platform account**
— REGISTERED: registered via LEDGER.md door A — row in
packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio #9
alignment pass 2026-08-23); readout
https://apis.ax/account/readouts/faces-payable (service built, deploy pending
Batch-S).
