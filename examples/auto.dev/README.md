# auto.dev — wave-zero machine face (class A, LIVE-REVENUE row)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`automotive`** — Automotive, NAICS 441/8111.

**This is the estate's only LIVE-REVENUE row** ($70-80k MRR [INV §2 via
coverage doc]; HARVEST/HOLD posture [SC #1]) and the naming doctrine's own
exemplar: *"a category-completing name that can BE the category to an agent
outranks grammatical composition (auto.dev > api.auto)"* (register,
verbatim). Consequences built in, not around:

- **The production rail is not this worker.** api.auto.dev serves 2.1M
  listings, key-gated, on the **Drivly, Inc. stack** (entity boundary per the
  restructuring); `~/projects/auto.dev` is not a git clone. Preflight
  resolved this build's home to dot-do/api examples per the agriculture-food
  precedent. **FOUNDER FLAG (carried):** if precedent prefers the fn-it
  pattern (build in the live property repo), the home overrides to
  drivly/auto.dev — recorded in `projection.json`.
- **Gap-closure shape, honestly probed** (2026-08-23): the live rail already
  serves a real agent-oriented `llms.txt` (200) and `openapi.json` (200) —
  but `/.well-known/agents.json` 404s, `/pricing` is an HTML marketing page,
  and the API answers 401 keyless (no anon floor, no typed envelopes, no
  `rates[]` Pricing Document). **Those gaps are exactly what this face
  closes**, as an adoptable artifact.
- **Consumption edge, not a blocker:** the corpus is key-gated from this
  build, so the universal-floor sandbox is **labeled synthetic**, typed to
  the live rail's record shapes (VIN-keyed vehicle, listing, part,
  work-order) so the real corpus can back it without a schema change.

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest; `g2` top-level, `links.verify` — NATIVE ext emission) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only; `operationId` on every route) | `/openapi.json` |
| Pricing Document (metered shape, `rates[]` TOP-LEVEL, survey-floor `included` allowances, `binding: false` + statement — stub on this face, nothing charged here) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /vehicles` |
| Data face | `/vehicles`, `/vin/{vin}` (sandbox decode), `/listings`, `/parts`, `/work-orders` |
| Headless face (FSM work-order door, same collection — the row's 8111 grain; DMS named by the row stays deferred, never mounted) | `POST /work-orders` → anon workspace, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the B2D shapes (only the sandbox floor mounted) | `POST /work-orders/{id}/complete` |
| MCP door (declared on the card because mounted; AUTHLESS — anon-sandbox rung only; string tool names = operationIds) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas; FSM⟨automotive-repair 8111⟩ served, DMS deferred as the row provides) | `/icp.json` (card `links.icp` + top-level `g2`) |
| Published verification suite ("run this") | `/verify` (card `links.verify`; `interfaces.testSuite` deliberately undeclared) |

There is **no separate `/rates` address**: the operation rate card rides
`rates[]` top-level in the Pricing Document — the ruled axp-ext/rates-g2
placement.

## Strata

- **G3 (Stratum A)** — `product.js`: the `APIProduct` instance (4 Nouns with
  schema/binding/verbs — Vehicle/Listing/Part ingested, WorkOrder the one
  native-bound Noun; FSM System coordinate served, DMS recorded deferred;
  operations, sandbox spec, meters).
- **G4 (Stratum B)** — `projection.json`: the auto.dev projection, `motion:
  B2D` (the row differentiates motions by brand), the B2D shape set as the
  offer array (three shapes labeled NOT-MOUNTED stubs on this face),
  experiment registration, **agent-default claim withheld** (the register
  phrases the term on this property; the §4.6 bar is what this face exists
  to pass — earned, never asserted), the **named counterpart brand**
  (vin.company — the spec's own §5.1 exemplar, zero-API-vocabulary law
  carried; NOT a gap), and `account` recorded. Repo config, not a served
  surface.

## Sandbox seed (§5.2) — source route probed honestly

Probed in-session (2026-08-23): `auto.dev/api/listings` answers **401
keyless** ("Authentication required"); every api.auto.dev plan takes a
bearer key. Class A status belongs to the row's owned corpus at the
production rail; it is not keylessly reachable from this build — so the
wave-zero seed is **synthetic, mechanically produced, and labeled**, typed
to the live shapes. `scripts/generate-seed.mjs` (deterministic PRNG keyed on
the substrate id) → `seed.json`. Every record carries `example: true` + a
demo notice; **VINs are EXAMPLE-prefixed 17-char VIN-shaped synthetic**
(I/O/Q excluded, check digit not computed — never a real vehicle; ISO
3779/3780 is a typing anchor only, register [UNVERIFIED]); **GTIN grain
exists on this row** (parts/tires) so GTINs use the **GS1 demo prefix 952
with valid EAN-13 check digits**; makes, models, and dealers are fictional
`[example]` compounds; 00-prefixed EINs. Reseeding is a build step, never a
manual edit.

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

Current honest score: **15/16 pass, 0 fail** — box 11 N/A (guardrail
vacuous: agent-default claim withheld, no sibling estate projection serves a
comparable rate card on this substrate). Box 4 PASSES with disclosure:
`describeConformance` is absent from vendored axp-faces@0.3.0, so the probe
ladder is re-implemented in-process at the pinned digest (batch-4 watch
list); the hosted api.qa verdict remains §9.2's independent act. Box 16 is
DONE: face `auto.dev` registered in the platform-account's committed registry
(ax repo `draft/rail-ledger-v1`, door A) and the selfcheck re-verifies the
committed row. 2 supplemental gates green (vendor byte-identity vs git show,
MCP door).

## Deferred at wave zero (spec §7.3 MAY-defer + row consequences)

- Hosted api.qa verdict + `links.conformance` verdict page — requires this
  face to serve on a public address, which is the home-placement founder
  ruling (Drivly entity boundary).
- Adoption into the live serving repo (drivly/auto.dev) or CNAME cutover —
  the flagged founder ruling; nothing here touches the production rail.
- `interfaces.testSuite` declaration — stays undeclared until digest-pinned
  after a hosted verdict exists.
- OAuth free tier, checkout, subscription doors on THIS face — labeled
  `mounted:false` stubs in every OFFER body; the production rail's keyed
  plans live at the Drivly stack and are never restated or charged here.
- DMS headless door (dms.headless.ly) — the row itself defers instantiation.
- apis.ax B2A sibling projection (the row's "generalization frontier"),
  data.vin bulk face, apis.autos dealer-group face — future projections of
  this substrate, not wave-zero requirements.
- workers.do serving lane, shared dashboard, unified analytics — extraction
  targets (§7.2), not wave-zero requirements.
