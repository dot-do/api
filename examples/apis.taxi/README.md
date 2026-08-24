# apis.taxi — wave zero of register row `passenger-mobility`

The functions a passenger fleet's systems call: **trips, bookings
(reservations), a zone-pair fare schedule, the fleet, and GTFS-typed transit
schedules**, served as a payable machine-face property per the property
template spec (`studio/docs/plans/2026-08-23-property-template-spec.md`),
instantiated from the register row `passenger-mobility` (NAICS 485-487) —
built here for real as a `@dotdo/api` example.

Register state: **name-only** (apis.taxi held, NO Cloudflare zone; the
sibling apis.limo has the row's one zone — a provisioning fact, not a
curation signal). Zone provisioning is Batch-S admin: it blocks SERVING at
the apex name, never building. Nothing served this property before this
example. The row is the thinnest non-gap holding in its batch: two names,
one zone, no records, nothing serving.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance — Nouns
  (Trip, Reservation, Fare, Vehicle — `native`-bound to the dispatch/booking
  system-of-record door; TransitSchedule — honestly `generated`: the row has
  NO ruled source route, so the GTFS-typed corpus is labeled synthetic, and
  public-feed ingest is the enrichment-ladder candidate), the System
  coordinate (Scheduler⟨passenger-dispatch⟩ — the H5 Scheduler rail
  vertically lensed per the row's headless ply), the operation set, the
  sandbox spec, one meter per operation. The `APIProduct` interface is local
  for now; its normative home is primitives.org.ai `digital-products`
  (prove-then-extract).
- **G4 projections** (`projections/*.json`): three non-exclusive configs on
  the one substrate — **apis.taxi** (B2D, metered + per-outcome dispatch —
  SERVED by this worker), **apis.limo** (B2D livery sub-niche — recorded,
  zone exists, nothing deployed), **apis.ax** (B2A, 402-metered, the #17
  ladder — recorded). Non-exclusivity is the pricing-experiment mechanism.
  The row's consumer side is B2A2C free-rider only and the estate holds NO
  human-vocabulary name in this cell — the **counterpart-brand GAP is
  recorded** in the served projection config (spec §5.1/§9.3), never patched
  with API vocabulary on this surface.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical, PINS.json-digested,
pinned `apis-ax-axp@2.6.0` / digest `a9a1197c…`, extension
`axp-ext-rates-g2@0.2.0` / digest `903e414d…` — vendored from the axp.org.ai
repo's committed HEAD `523c9ef2` on `draft/axp-extension-rates-g2`, recorded
in `axp/VENDORED.json`). The four estate members — top-level `rates[]`,
top-level `g2`, `links.verify`, per-route operationIds — are NATIVE generator
inputs; no bridges, no hand-patched documents.

The anon sandbox is the universal floor: `/trips` answers keyless with
labeled synthetic trips for a fictional operator ("Harborline Livery Co
(demo)") in a fictional city (Porthaven) — a three-class fleet (sedan taxi,
charter shuttle, wheelchair-accessible NEMT van), two service days, every
status the filters branch on, and synthetic GTFS-shaped schedules that are
NOT ingested from any real transit agency feed.

```sh
pnpm install                      # repo root
cd examples/apis.taxi
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/trips
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl "localhost:8787/fares/quote?fromZone=airport&toZone=downtown&serviceClass=sedan"
curl -X POST localhost:8787/reservations/r-2026-08-20-5/dispatch   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/apis-taxi.test.ts   # from the repo root
```

## Payable stubs — never fake billing

`dispatchTrip` answers a real typed **402 OFFER** (per-outcome rate,
alternatives, checkout seam) and says in the body that it is a **labeled
stub**: the settlement rail is not activated (A1's charter), `/checkout`
cannot take payment, and no money event is ever fabricated. Metering, money,
receipt, and traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## Honest gaps (recorded, never stubbed)

- **Zone**: apis.taxi is zoneless — serving at the apex name is blocked on
  Batch-S zone provisioning; the worker, tests, and face are complete.
- **Source route**: the register row rules NO route (its candidates —
  municipal livery/TNC registries, GTFS feeds — are marked UNVERIFIED), so
  wave zero serves the §5.2 labeled synthetic seed; no real feed was ingested
  and none is claimed.
- **Platform account**: the faces-payable register (§9.1 final box) has no address
  convention yet — `~/projects/ax` `draft/rail-ledger-v1` holds only an
  uncommitted `packages/rail-ledger` skeleton and no LEDGER.md. Recorded as
  blocked-on-rail-ledger, not stubbed.
- **interfaces.testSuite**: not declared until a suite document is published
  at a pinned digest (omission is full conformance; a wrong declaration is a
  machine-readable false claim).
