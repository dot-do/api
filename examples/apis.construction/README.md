# apis.construction — wave zero of register row `construction`

The functions a construction back office's systems call: **the
payment-documentation set — draw packages, lien waivers, pay applications —
plus permit records**, served as a payable machine-face property per the
property template spec (`studio/docs/plans/2026-08-23-property-template-spec.md`),
instantiated from the full-economy register row `construction` (NAICS 23).

Register state: **name-only, ZONELESS** — apis.construction is held (porkbun)
with NO Cloudflare zone (Batch-S admin item; blocks serving only, never the
build). Nothing served this property before this example. AT-RISK admin note
(administrative, not sequencing): the held sibling api.contractors sits in
the netim 2026-09-10 expiry block.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance — Nouns
  (DrawPackage, PayApplication, LienWaiver `native`; Permit `ingested`;
  Project `native`), the System coordinate
  (ProjectManagement⟨construction-pm⟩ — declared per the row; the cascade
  ruling for construction PM is abstraction only, no instantiation), the
  operation set, the sandbox spec, one meter per operation. The `APIProduct`
  interface is local for now; its normative home is primitives.org.ai
  `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): three non-exclusive configs on
  the one substrate — **apis.construction** (B2D, per-outcome pricing —
  SERVED by this worker), **apis.ax** (B2A, 402-metered, the #17 ladder —
  recorded), **data.mt** (B2D, credit packs — recorded). Non-exclusivity is
  the pricing-experiment mechanism. The B2A2B **counterpart-brand GAP** is
  recorded in the served projection config (no human-vocabulary name exists
  for the payment-documentation motion; bids.contractors is a gov-procurement
  door, a different motion).

## The typed-artifact door stays honest

NO settled interchange standard exists for the draw/lien-waiver/pay-app grain
— the register marks the door SD(typed-artifact) **[HYPOTHESIS]** with the
incumbency probe flagged (human-first incumbent forms exist per the row).
Record typing therefore follows cascade rule 2: real schema.org types where
one exists (`GovernmentPermit`, `Project`), estate schema.org.ai identities
for the typed artifacts — a recorded hypothesis, never an asserted standard.

## SHARED FACE, recorded (no primacy ruling)

The **lien-waiver record type is shared with the real-estate-closing
adjacency** (SC #10/#13). No projection-primacy ruling is on record, so this
build claims only its own row key (`construction`) and records the collision
(`projections/apis.construction.json → sharedFaces`). If the real-estate row
later builds a LienWaiver noun, a primacy ruling is needed before either row
claims the shared face.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`): **axp-faces 0.3.0** with
**axp-ext-rates-g2@0.2.0** native (extension digest `903e414d…`, the
pricing-survey ADOPT-NOW floor), pinned spec `apis-ax-axp@2.6.0` / digest
`a9a1197c…`. Vendored byte-identical from the axp.org.ai repo's COMMITTED
HEAD — branch `draft/axp-extension-rates-g2`, commit
`523c9ef217d54feefb0b20734a6d2996a6965b79` — via `git show`, digests recorded
in `axp/VENDORED.json`. The four extension members are native manifest
inputs, no bridges: top-level `rates[]`, top-level `g2`, `links.verify`,
per-route operationIds (route = MCP tool = suite ref = SDK functionName =
rates key; collections carry real verbs — `listDrawPackages`).

The anon sandbox is the universal floor: `/draw-packages` answers keyless
with 6 labeled synthetic draw packages (3 fictional projects across the
NAICS 23 grain, two full draw cycles, internally consistent retainage
arithmetic, fictional contractor/subs/jurisdiction, 00-prefix EINs, DEMO-
permit numbers). The row's permit-ingest route (public-licensable) was NOT
probed in-session and is register-marked [UNVERIFIED], so the §5.2 labeled
synthetic seed is the wave-zero corpus — recorded honestly, never unlabeled.

```sh
pnpm install                      # repo root
cd examples/apis.construction
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/draw-packages
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl -X POST localhost:8787/draw-packages/dp-harborview-2026-06/order   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/apis-construction.test.ts   # from the repo root
```

## Payable stubs — never fake billing

`orderDrawPackage` answers a real typed **402 OFFER** (per-outcome rate,
alternatives, checkout seam) and says in the body that it is a **labeled
stub**: the settlement rail is not activated (A1's charter), `/checkout`
cannot take payment, and no money event is ever fabricated. Metering, money,
receipt, and traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## §9.1 self-verify checklist (16 boxes, scored honestly): 15/16

| # | Box | State |
|---|---|---|
| 1 | G3 `APIProduct` authored; every Noun has schema + binding + verbs; System coordinate declared | PASS (tested) |
| 2 | Both plies from one definition (data collections = headless doors, same manifest rows) | PASS |
| 3 | Quartet from one `defineSiteManifest()` via vendored axp-faces at PINS.json digest | PASS (0.3.0, ext 0.2.0 digest `903e414d…`, vendored from axp.org.ai `523c9ef2…` committed HEAD) |
| 4 | Local conformance green at pinned digest, fail-closed | PASS (`tests/apis-construction.test.ts` — assertConforms at `a9a1197c…`, fail-closed loader) |
| 5 | Anon sandbox floor: keyless 200 OK, substantive labeled seed, exercises every operation, fixture law | PASS (tested) |
| 6 | Rate card served: model, hardCeiling, binding axis, rows lawful, `rates[].operation` ⊆ operationIds | PASS (tested) |
| 7 | `motion` declared; shapes from the motion's permissible set; B2A projections id.org.ai + 402 only | PASS (B2D served; B2A recorded config uses the #17 ladder, no OAuth/CC) |
| 8 | 402 OFFER advertises per motion (B2D: checkout + OAuth free tier) | PASS (tested) |
| 9 | B2A2B/C counterpart brand named OR gap recorded | PASS — GAP RECORDED (no human-vocabulary name for this motion on the register) |
| 10 | G4 projection config complete per §2 | PASS (3 projections; served one carries adminState, sharedFaces, counterpartBrand) |
| 11 | Guardrail: agent-default claimant never beaten on same-shape identical calls | PASS (vacuous — no agent-default claim served, no sibling face serves this substrate yet; claim withheld per §4.6) |
| 12 | `/verify` published; `interfaces.testSuite` undeclared until digest-pinned | PASS (tested) |
| 13 | Seams emitted with §6.4 tags; traffic events carry identity class + referral | PASS |
| 14 | Conneg matrix spot-checked; demo data labeled | PASS (tested) |
| 15 | No ghost surfaces (presence-when-true) | PASS (tested) |
| 16 | Face registered in the rail ledger | **BLOCKED-ON-RAIL-LEDGER** — the ledger service exists only as uncommitted work in `~/projects/ax` worktree (`packages/rail-ledger`, untracked, no LEDGER.md, no address convention committed on `draft/rail-ledger-v1`); never stubbed |

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests. Copy stays claim-free.
- OAuth enforcement — `/login` → `/callback` runs in labeled demo mode until
  a GitHub OAuth app is configured; keys are random, unpersisted, unenforced.
- Committed-subscription tier — no rate-card row until it exists.
- Final lien waivers in the seed — a two-draw in-flight cycle honestly has
  none; the record grammar declares all four types.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.
- Ladder rungs above the anon sandbox on the MCP door — only the mounted
  rung is advertised.
