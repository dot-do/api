# travel-tourism — wave zero of register row `travel-tourism` (D-row placeholder)

The booking substrate for the unserved travel sub-verticals: **bookings,
trips, sailings/charter manifests, and camp-session rosters**, served as a
payable machine-face property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`).

Register state: **GAP at the 5615 apex** — no api-grammar apex name and no
category-completing TLD is held; the ruled posture is **per-sub-vertical
properties on the held names** (apis.cruises / apis.voyage / apis.camp carry
CF zones) rather than one apex property. So the substrate is built once under
the row key, the served face runs on the placeholder address
`travel-tourism.org.ai` (spec §0: the G3 work is never blocked on a name),
and the per-sub-vertical G4 brand configs are recorded beside it. Facts and
carried flags: `REGISTER-NOTE.md`.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance — Nouns
  (Booking, Trip, Sailing, CampSession, Operator; all `native`-bound: the
  row's source route is first-party booking capture at the rail,
  owned-by-construction), the Booking⟨tour-operators / charter-operators /
  camp-operators⟩ System coordinates, the operation set, the sandbox spec,
  one meter per operation. Fare/availability nouns are deliberately ABSENT —
  the row rules that lane crowded (avoid-class 5). The `APIProduct` interface
  is local for now; its normative home is primitives.org.ai
  `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): five non-exclusive configs on
  the one substrate — **travel-tourism.org.ai** (B2A placeholder — SERVED by
  this worker), **apis.cruises**, **apis.voyage**, **apis.camp** (B2D
  sub-vertical brand configs on held zoned names, per the ruled posture —
  recorded, served at their own go-lives), **apis.ax** (B2A cross-cutting —
  recorded). The B2A2C counterpart-brand gap is recorded on the served
  config, not patched with API vocabulary (§9.3).

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical, vendored from
axp.org.ai COMMITTED HEAD `523c9ef217d54feefb0b20734a6d2996a6965b79`
(`draft/axp-extension-rates-g2`) via `git show` — provenance in
`axp/VENDORED.json`; axp-faces 0.3.0 with axp-ext-rates-g2@0.2.0 native, the
survey floor; pinned `apis-ax-axp@2.6.0` / digest `a9a1197c…`). The four
estate members (top-level `rates[]`, `links.verify`, card `g2`, per-route
operationIds) are native generator inputs — no bridges, no wrappers.

The anon sandbox is the universal floor: `/bookings` answers keyless with 18
labeled synthetic bookings branching on `status` and `subVertical`
(fictional operators — Sable Line Coastal Cruises, Harborlight Charters,
Cedar Knoll Summer Camp, Waypoint & Fern Travel, all "(demo)"; travelers are
role labels, never names). Workspace writes (`createBooking`,
`enrollCamper`) are ephemeral and retrievable by id; the generator's static
collection lists the seed corpus.

```sh
pnpm install                      # repo root
cd examples/travel-tourism
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/bookings
curl "localhost:8787/bookings?status=confirmed&subVertical=charter"
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl -X POST localhost:8787/bookings/bk-charter-007/confirm   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/travel-tourism.test.ts   # from the repo root
```

## Payable stubs — never fake billing

`confirmBooking` answers a real typed **402 OFFER** (per-outcome rate — a
CONFIRMED booking, never a call — plus the whole B2A ladder in
`alternatives`: pay / work / claim, the work and claim rungs disclosed as
stubs) and says in the body that it is a **labeled stub**: the settlement
rail is not activated (A1's charter), `/checkout` cannot take payment, and no
money event is ever fabricated. Metering, money, receipt, and traffic
**seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests. Copy stays claim-free.
- OAuth / credit-card doors — none are mounted: the served projection is
  B2A (machine identity + 402, per spec §9.1); the B2D OAuth free tier
  belongs to the sub-vertical faces when they go live.
- Fare/availability collections — ruled crowded lane (avoid-class 5); absent
  by decision, not omission.
- apis.flights / apis.vacations configs — held name-only, no zones, inside
  the ruled avoid-class; recorded in REGISTER-NOTE.md, configs deferred.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.

## Conformance gate note (box 4 disclosure)

`describeConformance` is absent from the vendored axp-faces build; the
digest-pinned probe ladder runs in-process instead via `autonomous-qa`'s
`assertConforms` (the api.qa requirement implementations, loaded fail-closed
from $AUTONOMOUS_QA_DIR / node_modules / the sibling api.qa checkout) against
the vendored byte-identical spec at `spec/apis-ax-axp-2.6.0.spec.json`
(`--expect-digest` equivalent: `expectedDigest` pinned in the test). A gate
that skips is not a gate: missing every candidate FAILS the suite.

## Rail ledger (§9.1 final box)

Face registered in the rail ledger (faces-payable/week denominator):
registered via LEDGER.md door A — one row for `travel-tourism.org.ai` in
`packages/rail-ledger/registry/faces.json` @ ax `draft/rail-ledger-v1`;
readout https://apis.ax/account/readouts/faces-payable (service built, deploy
pending Batch-S). The served projection config records the address in its
`railLedger` field.
