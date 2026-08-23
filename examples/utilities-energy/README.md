# utilities-energy — wave-zero property (GAP row, placeholder key, depth-ruled)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`utilities-energy`** — Utilities & Energy,
NAICS 22.

**This GAP row differs from the other GAP rows in kind** (register note,
carried verbatim): SC #21 rules NAICS 22 **Axis-2 only, avoid-class 5**
(door-shape + balance-sheet failure on the utility-side sale) — *"the depth
ruling, not the name shortage, is the binding constraint."* Consequences
built in, not around:

- **Noun-grain rails, no front** — this is the metering.click +
  interconnection.click entry-artifact grain (the row's ruled-compatible held
  artifacts). No apex face and **no data-thesis face** is built or claimed.
- **The buyer coordinate is the party filing into the utility** (solar
  installers/EPCs, interconnection applicants), never the utility itself.
- Placeholder address per spec §0: `energy.org.ai` is a held G2 **namespace,
  not a market face** (register). The G4 brand attaches only if a name is
  ever ruled (#16) — and the register notes the depth ruling weakens the
  acquisition case. Nothing in this directory implies acquisition of any name.
- gigs.solar is a supply door (out of naming scope per #3); no family edge is
  emitted to it or to the non-serving .click artifacts (ghost-surface law).

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest; `g2` top-level, `links.verify` — NATIVE ext emission) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only; `operationId` on every route) | `/openapi.json` |
| Pricing Document (metered shape, `rates[]` TOP-LEVEL, survey-floor `included` allowances, `binding: false` + statement — stub, nothing charged) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /interval-reads` |
| Data face | `/interval-reads`, `/meters`, `/queue-entries`, `/interconnection-requests`, `/tariffs` |
| Headless face (applicant-filing door, same collection — NOT a 52-System door: the row's headless cell is empty) | `POST /interconnection-requests` → anon workspace, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the ladder (only the sandbox rung mounted) | `POST /interconnection-requests/{id}/submit` |
| MCP door (declared on the card because mounted; AUTHLESS — anon-sandbox rung only; string tool names = operationIds) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas; empty System cell declared as provided) | `/icp.json` (card `links.icp` + top-level `g2`) |
| Published verification suite ("run this") | `/verify` (card `links.verify`; `interfaces.testSuite` deliberately undeclared) |

There is **no separate `/rates` address**: the operation rate card rides
`rates[]` top-level in the Pricing Document — the ruled axp-ext/rates-g2
placement.

## Strata

- **G3 (Stratum A)** — `product.js`: the `APIProduct` instance (5 Nouns with
  schema/binding/verbs; **System set declared EMPTY as the row provides it**
  — the cascade's only empty headless cell, CIS/MDM candidates [UNVERIFIED]
  undeclared per presence-when-true; operations, sandbox spec, meters).
- **G4 (Stratum B)** — `projection.json`: placeholder projection, `motion:
  B2A`, the four-rung ladder as the offer array (three rungs labeled
  NOT-MOUNTED stubs), experiment registration, agent-default claim withheld,
  the **counterpart-brand gap recorded** (§9.3 — installer/EPC principals;
  the held .click artifacts noted as candidates only), and the **depth
  ruling carried in full**. Repo config, not a served surface.

## Sandbox seed (§5.2) — source route probed honestly

Probed in-session (2026-08-23): `api.eia.gov` v2 answers `API_KEY_MISSING`
keyless; the EIA **bulk manifest answers 200 keyless**. The register classes
this row's route as public-licensable ingest **[UNVERIFIED] — not class A**,
so the wave-zero seed is **synthetic, mechanically produced, and labeled**,
typed to the EIA-class feed shapes (utility/meter/interval, ISO-queue,
tariff-filing records) so real ingest can replace it without a schema
change. `scripts/generate-seed.mjs` (deterministic PRNG keyed on the
substrate id) → `seed.json`. Every record carries `example: true` + a demo
notice; fictional names tagged `[example]`; identifiers schema-shaped
synthetic (`UTIL-EX-*`/`MTR-EX-*`/`ISO-EX-*`/`TRF-EX-*`, 00-prefixed EINs) —
never real EIA/FERC/ISO identifiers presented as authoritative; Green
Button/ESPI is a **typing anchor only** (register: [UNVERIFIED — not in
estate docs]); **no GTIN grain exists on this row** (the GS1 952 rule
applies where GTINs exist — none do here; recorded, not skipped silently).
Reseeding is a build step, never a manual edit.

## Vendoring

`axp/` is byte-identical vendored **`axp-faces@0.3.0`** — NATIVE
`axp-ext-rates-g2@0.2.0` (digest `903e414d…`, the survey-floor vocabulary),
pinned spec `apis-ax-axp@2.6.0` digest `a9a1197c…` — taken via **`git show`
from the axp.org.ai repo's COMMITTED HEAD
`523c9ef217d54feefb0b20734a6d2996a6965b79`** on branch
`draft/axp-extension-rates-g2` (never the working tree; see
`axp/VENDORED.json` + `axp/PINS.json`). `spec/` carries the pinned spec +
digest + the extension spec (hashes to the 903e414d… digest). The selfcheck
re-verifies every vendored file against `git show` at that commit.

## Verify

```sh
node scripts/generate-seed.mjs   # reseed (deterministic)
node scripts/selfcheck.mjs       # §9.1 checklist (16 boxes), fail-closed, in-process
```

Current honest score: **13/16 pass, 0 fail** — box 4 DEFERRED (local
describeConformance runner; hosted verdict needs a ruled domain), box 11 N/A
(guardrail vacuous: no agent-default claim, no sibling projection), box 16
BLOCKED (blocked-on-rail-ledger, below). 3 supplemental gates green (vendor
byte-identity vs git show, probe ladder, MCP door).

## Deferred at wave zero (spec §7.3 MAY-defer + row consequences)

- Hosted api.qa verdict + `links.conformance` verdict page — requires a
  ruled, deployed domain; the placeholder is not deployed publicly.
- Local `describeConformance` runner (autonomous-qa) — not a dependency of
  this repo; the selfcheck re-implements the probe-ladder behavior in-process.
- `interfaces.testSuite` declaration — stays undeclared until digest-pinned
  after a hosted verdict exists.
- Live settlement, credit ledger (work rung), claim door — labeled
  `mounted:false` stubs in every OFFER body; nothing is ever charged.
- workers.do serving lane, shared dashboard, unified analytics — extraction
  targets (§7.2), not wave-zero requirements.
- Rail-ledger registration — **blocked-on-rail-ledger**: at build time
  (2026-08-23) `packages/rail-ledger` exists only as an *uncommitted*
  working-tree directory in the ax repo's `draft/rail-ledger-v1` worktree
  (`?? packages/rail-ledger/`); no LEDGER.md, no committed address
  convention. A fake ledger is never stubbed; registration lands when the
  convention is committed AND this face has a ruled address.
