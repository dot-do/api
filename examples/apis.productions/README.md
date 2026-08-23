# apis.productions — wave zero

The wave-zero instantiation of the full-economy register row **`media-entertainment`**
(NAICS 512, 515-516) as the property **apis.productions**, built to the payable
machine-face template (`docs/plans/2026-08-23-property-template-spec.md` in the
studio repo, §7.3 wave-zero MUSTs).

**Ruling context.** The register rules this row INTERNAL-ONLY (Class F): the
name faces the estate's own content operation, not an external market. So this
property carries **no public positioning, no G4 claims, and no agent-default
claim** — the projection config records that explicitly. No ranking is implied
anywhere on the surface. Every served record is labeled example data.

## Layout

| File | Stratum | What it is |
|---|---|---|
| `src/substrate.ts` | A (G3) | The `APIProduct` instance: Nouns (Production, MediaAsset, Page, AudienceSignal) with schema + binding + verbs; the CMS System coordinate; the §5.2 labeled synthetic sandbox seed |
| `projection.apis.productions.json` | B (G4) | The projection config: brand, ICP + personas, motion **B2A**, offer (anon sandbox only), pricing pattern, experiment registration, counterpart-brand record |
| `src/manifest.ts` | face | The ONE site manifest — every machine face generates from it |
| `src/axp-faces/` | face | The shared generator, vendored byte-identical (PINS.json pins `apis-ax-axp@2.6.0`, digest `a9a1197c…`, plus extension `axp-ext-rates-g2@0.2.0`); never edited here |
| `src/worker.ts` | serving | Both plies from the one definition: data face (GET collections), headless face (POST /pages — the CMS system-of-record door, ephemeral + disclosed), the MCP door at `/mcp`, the labeled 402 stub at `/offer`, and the §7.4 seams (meter/money/receipt events as structured logs) |
| `src/verify-suite.ts` | proof | The published `api.qa/suite@1` suite served byte-exact at `/verify/suite.json`; `/verify` prints the digest and the run command |
| `spec/` | pin | The ratified spec copy + digest the local gate asserts against |
| `check.mjs` | gate | The §9.1 self-verify gate — vendor integrity, spec pin, in-process `gradePinned` conformance, fixture law, suite-byte coherence, conneg spot check. `node check.mjs` (Node ≥ 22.18; needs a built `~/projects/api.qa` or `$AUTONOMOUS_QA`) |

## Wave-zero decisions on record

- **Seed, not ingest.** The row's source route (first-party produced-content
  exhaust) is real, but wave zero serves the §5.2 mechanically-produced
  synthetic seed instead: publishing the estate's actual production records on
  a served face is an internal-operating-detail question the Class F ruling
  has not answered. Real-exhaust ingest is deferred behind that ruling.
- **`interfaces.testSuite` not declared.** Declaring it arms the strict
  A.8.7 capability-coverage check, which demands a passing suite row per MCP
  tool and per POST door — the GET-only declarative dialect cannot honestly
  cover those. The suite is published and runnable at `/verify` regardless;
  omission is full conformance (A.8.5).
- **402 stub, free pricing.** `/pricing` is `{"model":"free", "binding":false}`
  with its statement; `/offer` answers a typed 402 OFFER labeled `stub: true` —
  shape-compatibility with payable siblings, never fake billing.
- **Family registry empty.** The row's sibling names (apis.photos,
  apis.photography) serve nothing today; presence-when-true keeps them out.

## Rail ledger (§9.1 final box)

Face registered in the rail ledger (faces-payable/week denominator):
registered via LEDGER.md door A — row in
`packages/rail-ledger/registry/faces.json` @ `draft/rail-ledger-v1`
(studio #9 alignment pass 2026-08-23); readout
https://ledger.apis.ax/readouts/faces-payable (service built, deploy pending
Batch-S). The served projection config records the address in its
`railLedger` field.
