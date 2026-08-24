# apis.farm — wave zero

The wave-zero instantiation of the full-economy register row
**`agriculture-food`** (NAICS 11, 311-312) as the property **apis.farm**,
built to the payable machine-face template
(`docs/plans/2026-08-23-property-template-spec.md` in the studio repo, §7.3
wave-zero MUSTs).

**Rail law (register anchor, binding).** apis.farm names the VERTICAL FACE
only. The FSMA-204 traceability EVENT grain rides the
warehousing-traceability row's rail — **epcis.dev/barcoding.dev** (one rail,
two rows by design). This property **consumes rail events and never
re-implements EPCIS capture**: the TraceabilityLot Noun is `federated`, and
its `cteRefs` reference rail events for dereferencing at the rail.

**Zone status.** The domain is held with **no CF zone** — zone provisioning
is a Batch-S hours-class admin item. It blocks serving, not building:
`wrangler dev` runs the property locally today; nothing is deployed.

Every served record is labeled example data (`example: true`, `[demo]` name
prefix, GS1 demo prefix 952 with valid check digits — enforced by the gate
AND at the sandbox write door). No public positioning, no agent-default
claim (withheld until the §4.6 worthiness bar attests), no ranking implied
anywhere.

## Layout

| File | Stratum | What it is |
|---|---|---|
| `src/substrate.ts` | A (G3) | The `APIProduct` instance: Nouns (TraceabilityLot `federated` via the rail; Product + Facility `native`; ComplianceArtifact `generated`) with schema + binding + verbs; the row's none-modal system verdict declared in its own words; the §5.2 labeled synthetic sandbox seed (a walkable farm-to-DC chain) |
| `projection.apis.farm.json` | B (G4) | The projection config: brand, ICP + personas, motion **B2D**, offer (anon sandbox only — only mounted rungs advertised), pricing pattern, experiment registration, counterpart-brand **gap recorded**, rail-consumption law |
| `src/manifest.ts` | face | The ONE site manifest — every machine face generates from it |
| `src/axp-faces/` | face | The shared generator, vendored byte-identical (PINS.json pins `apis-ax-axp@2.6.0`, digest `a9a1197c…`); never edited here |
| `src/axp.ts` | face | The FOUR ruled extension placements (batch rollup, binding — bridged exactly here until the upstream re-vendor lands): `/pricing` `rates[]` top-level, card `g2` top-level, card `links.verify`, `operationId` on every route |
| `src/worker.ts` | serving | Both plies from the one definition: data face (GET collections), headless face (POST /products — the master-data system-of-record door, ephemeral + disclosed + fixture-law-gated), the authless MCP door at `/mcp` (anon-sandbox rung; bearer-key arrives with the first keyed rung), the labeled 402 stub at `/offer`, and the §7.4 seams (meter/money/receipt events as structured logs) |
| `src/verify-suite.ts` | proof | The published `api.qa/suite@1` suite served byte-exact at `/verify/suite.json`; `/verify` prints the digest and the run command |
| `spec/` | pin | The ratified spec copy + digest the local gate asserts against |
| `check.mjs` | gate | The §9.1 self-verify gate — vendor integrity, spec pin, in-process `gradePinned` conformance, fixture law (incl. GS1 952 check-digit validation), suite-byte coherence, headless + MCP doors, conneg spot check, ruled-placement checks. `node check.mjs` (Node ≥ 22.18; needs a built `~/projects/api.qa` or `$AUTONOMOUS_QA`) |

## Wave-zero decisions on record

- **Seed, not ingest.** The row's source route (owned corpus,
  consent-at-rail) is Class A **by construction at the rail** — the events
  are captured on epcis.dev, not here, and no rail feed is consumed
  in-session at build time. So wave zero serves the §5.2 mechanically
  produced synthetic seed, labeled; live rail consumption lands when the
  rail's consume door is wired. The USDA AMS commodity seed the register
  names is [UNVERIFIED — source never probed] and is not served.
- **System coordinate.** The register's cascade verdict is "none modal (ERP
  fragments)" for NAICS 11/311-312; the row rides the shared WMS/worklist
  event rail. Declared in the row's own words — never an invented 52-System
  catalog entry. The row's farm-management-system and QA-workbench
  candidates are [UNVERIFIED] in the register and not declared
  (presence-when-true).
- **`interfaces.testSuite` not declared** (stays undeclared per the batch
  rollup until digest-pinned AND honestly coverable): declaring it arms the
  strict A.8.7 capability-coverage check, which demands a passing suite row
  per MCP tool and per POST door — the GET-only declarative dialect cannot
  honestly cover those. The suite is published and runnable at `/verify`
  regardless (omission is full conformance, A.8.5); card `links.verify`
  names it.
- **402 stub, free pricing with a rate card.** `/pricing` is
  `{"model":"free", "binding":false}` with its statement PLUS the ruled
  `rates[]` top-level: every operation priced from zero, unlimited
  freeQuota, rows keyed by contract operationIds only. `/offer` answers a
  typed 402 OFFER labeled `stub: true` — shape-compatibility with payable
  siblings, never fake billing. Only MOUNTED rungs are advertised: no
  checkout or OAuth alternative appears until those rungs exist.
- **Family registry empty.** The register's sibling name (gigs.farm) serves
  nothing today (estate-wide gigs.*: 0 live transactions) —
  presence-when-true keeps it out.
- **Counterpart-brand gap recorded.** The ICP includes QA/food-safety
  compliance leads (principals who buy compliance outcomes, not APIs); the
  register holds no human-vocabulary compliance counterpart for this cell.
  Recorded in the projection config; the §9.3 diagnostic reads the traffic
  seams and a proposal files against the register row if the signal fires.

## §9.1 checklist — 16/16 pass

All boxes pass via `node check.mjs` (ALL GATES GREEN; conformance 24/24 at
the ratified digest) and the configs above, including:

- **Platform-account registration (final box): REGISTERED** — registered via
  LEDGER.md door A — row in packages/rail-ledger/registry/faces.json @
  draft/rail-ledger-v1 (studio #9 alignment pass 2026-08-23); readout
  https://apis.ax/account/readouts/faces-payable (service built, deploy
  pending Batch-S).
