# api.repair — wave zero of register row `repair-field-services`

The rail an agent calls to get repair: **THE work order, its estimate, and
its inspection report** for NAICS 811 ex-8111 (8112 electronics/precision,
8113 commercial machinery, 8114 personal & household goods repair), served as
a payable machine-face property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`) — built as a
`@dotdo/api` example. Entry is the record, not the truck [SC #14].

Register state: **held pair, nothing serving** — api.repair (netim, zone, no
record) + apis.repair (grammar-tail). api.repair sits in the **netim
2026-09-10 expiry block**: the renewal is the row's gating administrative
action (dated Batch-S admin), out of this build's scope.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance — Nouns
  (WorkOrder, Estimate, InspectionReport; all `native` per the row's source
  route), the System coordinate (FSM⟨repair-field-services⟩), the operation
  set, the sandbox spec, one meter per operation. The `APIProduct` interface
  is local for now; its normative home is primitives.org.ai
  `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): **api.repair** (B2A,
  402-metered-per-call — SERVED by this worker) and **apis.repair** (B2D
  outbound function face of the held same-TLD pair — recorded, not served).
  Non-exclusivity is the pricing-experiment mechanism.

## Primacy / collision record (batch watch-list rule)

- **WorkOrder**: fn-service-delivery (api.services) defines its own WorkOrder
  at O*NET task grain. The register carries **no primacy ruling**, so this
  substrate builds its own WorkOrder under its own row key at the row's FSM
  grain and **claims nothing shared**. Recorded in `src/substrate.ts`
  (binding note) and `projections/api.repair.json` (`collisions`).
- **FSM** system name: also named for facilities-services ((811, 5617) span;
  shared-system-span rule is a register HYPOTHESIS, not a ruling) — this
  substrate declares only its own coordinate.

## Source route, probed honestly

The row's Class A route is SD: first-party work-order capture generalizing
from the **live Vin recon/inspection/maintenance lanes**. That live corpus is
the **automotive (8111) instance**, which the register carves to the
automotive row — no ex-8111 corpus or consumption edge exists in this build
session, and pulling the 8111 corpus here would misfile it in scope. So the
wave-zero corpus is **labeled synthetic seed per §5.2** (three fictional
operators, one per subsector; full work-order lifecycles; internally
consistent estimate totals; GS1 952-prefix demo asset tags). The Class A
route is recorded as the enrichment source — never claimed as serving.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical): **axp-faces
0.3.0 + axp-ext-rates-g2@0.2.0** (the survey-floor vocabulary, digest
`903e414d…`), vendored from axp.org.ai COMMITTED HEAD
`523c9ef217d54feefb0b20734a6d2996a6965b79` (branch
`draft/axp-extension-rates-g2`) via `git show` — see `axp/VENDORED.json`.
Pinned spec `apis-ax-axp@2.6.0` / digest `a9a1197c…`. The four estate
extension members (`rates[]`, `links.verify`, `g2`, per-route operationIds)
are **native generator inputs — no site-side bridges**.

```sh
pnpm install                      # repo root
cd examples/api.repair
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/work-orders
curl "localhost:8787/work-orders?status=completed&repairClass=appliance"
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl localhost:8787/offer         # the 402 OFFER — the whole B2A ladder in one place
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/api-repair.test.ts   # from the repo root
```

**Disclosure (§9.1 box 4, batch watch list):** `describeConformance` is
absent from vendored axp-faces 0.3.0, so the probe ladder (keyless OK,
knownEmpty, knownForbidden, pricing, over-ceiling 402 / half-ceiling 200 /
zero 200) is exercised **in-process** by the suite above via the
digest-pinned autonomous-qa gate — not a generator-local probe walk.

## B2A motion (the #17 ladder, exclusively)

This face onboards agents, not accounts: **no OAuth door, no login, no
checkout page** anywhere on the surface. Above the keyless anon sandbox
(universal floor), every 402 OFFER's `alternatives` advertises the whole
ladder in one place — **pay** (402 metering on machine identity via
id.org.ai) / **work** (earned .ax-ledger credits) / **claim** (a human claims
the workspace) — each a labeled stub until its rail activates. The settlement
rail is not activated (A1's charter): the 402 boundary is served, no charge
can occur, and no money event is ever fabricated. Metering, money, receipt,
and traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

**Counterpart-brand gap, recorded (§5.1 B2A2B):** the row's ICP is
non-technical principals (service managers, dispatchers, estimators) and the
register holds no human-vocabulary name for this cell — recorded in
`projections/api.repair.json`; the §9.3 traffic seam carries the trigger
signal.

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests. Copy stays claim-free.
- OAuth / checkout doors — a B2A face has none, by motion law (not an
  omission: a rule).
- Generated benchmark Nouns (cost/duration per repair class) — the
  enrichment ladder, consent-at-rail; nothing generated is declared at wave
  zero.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.

## Platform account (§9.1 final box)

Face registered in the platform account (faces-payable/week denominator) via
LEDGER.md **door A** — row in `packages/rail-ledger/registry/faces.json` @
`ax` repo, branch `draft/rail-ledger-v1`. The served projection config
records the address in its `account` field:
`https://apis.ax/account/faces?face=api.repair`.
