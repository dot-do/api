# apis.markets — wave zero

The wave-zero instantiation of the full-economy register row **`capital-markets`**
(Securities & Capital Markets, NAICS 523) as the property **apis.markets**, built
to the payable machine-face template (`docs/plans/2026-08-23-property-template-spec.md`
in the studio repo, §7.3 wave-zero MUSTs).

**Scope, permanent (register ruling).** Execution and custody are OUT OF
SCOPE: no door on this substrate places, routes, amends, or cancels an order,
and none holds assets. The viable ply is reference/market/position data and
post-trade documents. Agents at this face are data pullers, never traders.

**Property grain.** apis.trading, apis.investments, and apis.broker are
sub-audience rails **within this property** (content, not separate brands, per
the register's property-grain ruling). They serve nothing today, so they are
linked nowhere (presence-when-true); the projection config records them.

**No positioning is carried.** The agent-default claim is withheld until the
§4.6 worthiness bar is attested; no ranking is implied anywhere on this
surface. Every served record is labeled example data.

## Layout

| File | Stratum | What it is |
|---|---|---|
| `src/substrate.ts` | A (G3) | The `APIProduct` instance: Nouns (Instrument, Quote, Position, PostTradeDocument) with schema + binding + verbs; the OMS/PMS System coordinates; the §5.2 labeled synthetic sandbox seed |
| `projection.apis.markets.json` | B (G4) | The projection config: brand, ICP + personas, motion **B2A**, offer (anon sandbox only), pricing pattern, experiment registration, counterpart-brand gap record, api.finance coordination note |
| `src/manifest.ts` | face | The ONE site manifest — every machine face generates from it; also carries the ruled-bridge data (RATES, G2, OPERATION_IDS) |
| `src/axp-faces/` | face | The shared generator, vendored byte-identical (PINS.json pins `apis-ax-axp@2.6.0`, digest `a9a1197c…`); never edited here |
| `src/worker.ts` | serving | Both plies from the one definition: data face (GET collections), headless PMS door (POST /positions — recording, never execution; ephemeral + disclosed), the MCP door at `/mcp` (keyless — only the anon-sandbox rung is mounted), the labeled 402 stub at `/offer`, the §7.4 seams (meter/money/receipt events as structured logs), and the **ruled bridge** below |
| `src/verify-suite.ts` | proof | The published `api.qa/suite@1` suite served byte-exact at `/verify/suite.json`; `/verify` prints the digest and the run command |
| `spec/` | pin | The ratified spec copy + digest the local gate asserts against |
| `check.mjs` | gate | The §9.1 self-verify gate — vendor integrity, spec pin, in-process `gradePinned` conformance, fixture law, suite-byte coherence, headless+MCP exercise, conneg spot check, ruled-bridge placements. `node check.mjs` (Node ≥ 22.18; needs a built `~/projects/api.qa` or `$AUTONOMOUS_QA`) |

## The ruled bridge (batch-2 rollup — remove at the upstream re-vendor)

Four extension placements are grafted onto the generator-built documents in
`src/worker.ts` (the vendored tree is never edited; VENDORED.json integrity
holds):

1. `rates[]` **top-level** in the served Pricing Document (all three faces);
   every row prices from zero (model: free);
2. `g2` **top-level** on the capability card (ICP + personas, same truth as
   `/icp.json`);
3. `links.verify` as a card link member;
4. `operationId` on every OpenAPI route (fail-closed at module init), with
   `rates[].operation ⊆ operationIds` asserted by the gate.

## Wave-zero decisions on record

- **Seed, not ingest.** The row's source route (public disclosure ingest,
  EDGAR/FINRA-class) is [UNVERIFIED / not ruled] in the register — so wave
  zero serves the §5.2 mechanically-produced synthetic seed: ZZ-prefixed demo
  symbols colliding with no listed ticker, fictional issuers, no real
  ISIN/CUSIP, every record `example: true`. Real-corpus ingest is deferred
  behind a data-door verdict on the row.
- **api.finance coordination (ADR-0020 overlap).** `~/projects/ax/packages/api.finance`
  is the markets-data + advisory possibility surface (Directory archetype:
  typed Definition + classified capability collection, open-floor/BYOL/
  credential-reserved axes). This property does **not** duplicate its
  directory ply — it serves typed records, not a capability directory — and
  any future EDGAR-class ingest coordinates with api.finance's open-floor
  classification first.
- **`interfaces.testSuite` not declared.** Declaring it arms the strict
  A.8.7 capability-coverage check, which demands a passing suite row per MCP
  tool and per POST door — the GET-only declarative dialect cannot honestly
  cover those. The suite is published and runnable at `/verify` regardless;
  omission is full conformance (A.8.5). It stays undeclared until
  digest-pinned.
- **402 stub, free pricing.** `/pricing` is `{"model":"free", "binding":false}`
  with its statement plus the bridged zero-priced `rates[]`; `/offer` answers
  a typed 402 OFFER labeled `stub: true` — shape-compatibility with payable
  siblings, never fake billing. Only the mounted ladder rung (anon sandbox)
  is advertised.
- **MCP auth.** Keyless (authless) — the anon-sandbox rung is the only rung
  mounted, so no bearer tier exists to demand; the bearer-key tier arrives
  with rung 1+.
- **Family registry empty.** The property's sub-audience rails serve nothing
  today; presence-when-true keeps them out.
- **Rail-ledger registration: REGISTERED.** The §9.1 final box (face
  registered in the rail ledger, the faces-payable/week denominator) is
  registered via LEDGER.md door A — row in
  packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio #9
  alignment pass 2026-08-23); readout
  https://apis.ax/account/readouts/faces-payable (service built, deploy
  pending Batch-S).

## §9.1 self-verify score

16/16 pass; the 16th (rail-ledger registration) is REGISTERED as above.
Every passing box is asserted by `check.mjs` or by this tree directly;
the 402-OFFER ladder box passes under the ruled mounted-rungs-only placement
(only the anon sandbox is mounted, only it is advertised). §9.2 (independent
api.qa hosted verdict + worthiness-bar attestation) is out of this tree's
hands by design — positioning stays claim-free until attested.
