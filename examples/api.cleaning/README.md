# api.cleaning — wave zero of register row `facilities-services`

The rail an agent calls to get cleaning: **work orders, service visits,
recurring-service schedules, building-services vendors, and facilities**,
served as a payable machine-face property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`), instantiated from
the register row (`…/registers/2026-08-23-full-economy-property-register.json`,
key `facilities-services`, NAICS 5617 core).

Register state: **NAME-ONLY, ZONELESS** — api.cleaning is held (porkbun) with
no CF zone; Batch-S zone provisioning is the gating action. Zonelessness
blocks serving at the domain only, never this build: the worker serves the
full face under `wrangler dev` / workers.dev today.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance —
  Nouns (WorkOrder, ServiceVisit, ServiceSchedule, Vendor, Facility; all
  `native`-bound per the row's first-party-capture source route), the System
  coordinates (FSM⟨building-services⟩ + Scheduler⟨recurring-service-booking⟩),
  the operation set, the sandbox spec, one meter per operation. The
  `APIProduct` interface is local for now; its normative home is
  primitives.org.ai `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): two non-exclusive configs on the
  one substrate — **api.cleaning** (B2A, 402-metered, the #17 ladder —
  SERVED by this worker) and **apis.ax** (B2A universal register — recorded).
  The B2A2B **counterpart-brand gap** is recorded in the served projection
  config (the cell's ICP includes non-technical principals and the register
  names no human-vocabulary demand brand; gigs.cleaning is the supply door,
  out of naming scope).

## Record-type collision — recorded, row-scoped

The WorkOrder / service-visit grain is shared-adjacent with
**repair-field-services** (the cascade tree spans (811, 5617) with one THE
WORK ORDER record and one FSM system) and **fn-facilities-assets**
(maintenance work-order grain). The register carries **no primacy ruling**
for the shared type, so this row builds under its OWN key: row-scoped schema
addresses (`https://schema.org.ai/facilities-services/WorkOrder`,
`…/ServiceVisit`), the collision recorded in `src/substrate.ts` and the
projection config, **nothing shared claimed**. A future primacy ruling
reconciles the row-scoped types into the shared address.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical, PINS.json-digested;
axp-faces **0.3.0** with **axp-ext-rates-g2@0.2.0** native — the survey
floor; vendored from axp.org.ai `draft/axp-extension-rates-g2` @
`523c9ef217d54feefb0b20734a6d2996a6965b79` via `git show`; extension digest
`903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5`; pinned
spec `apis-ax-axp@2.6.0`, digest `a9a1197c…`). The four extension members
(top-level `rates[]`, `links.verify`, per-route `operationId`s, the card `g2`
object) are **native generator inputs — no site-side bridges or wrappers**.

The anon sandbox is the universal floor: `/work-orders` answers keyless with
22 labeled synthetic work orders (a fictional workspace, "Harborview
Facilities Group (demo)": three vendors across janitorial / landscaping /
pest control with onboarding-packet state, three facilities, five recurring
schedules, two full service periods; completed orders carry service visits).

**Honest source-route disclosure (C-class):** the row's source route is
first-party work-order/schedule capture at the rail, and the rail is **not
yet built** — so per spec §5.2 the wave-zero corpus is labeled synthetic
seed. No class-A status is claimed or improvised; public-registry supply
enrichment is register-flagged UNVERIFIED and is not ingested.

```sh
pnpm install                      # repo root
cd examples/api.cleaning
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/work-orders
curl "localhost:8787/work-orders?status=completed&service=janitorial"
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl -X POST localhost:8787/work-orders/wo-cc-janitorial-2026-07-1/dispatch   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/api-cleaning.test.ts   # from the repo root
```

**Box-4 disclosure:** `describeConformance` is absent from the vendored
axp-faces package; the probe ladder runs in-process two ways instead —
api.qa's own requirement implementations (`autonomous-qa` `assertConforms`,
digest-pinned, fail-closed) dispatched in memory, plus explicit behavioral
probes (keyless OK / EMPTY / BLOCKED / over-ceiling 402) in the suite.

## B2A motion — the #17 ladder, exclusively

This projection's buyer is an autonomous agent: **no OAuth, no card on
file, no /login door exists**. Onboarding is the proof-of-work ladder —
anon sandbox (rung 0) → earned .ax-ledger credits (rung 1) → human-claimed
(rung 2) → paid 402 metering on id.org.ai machine identity (rung 3) — and
every 402 OFFER advertises the whole ladder (pay / work / claim) in its
`alternatives`. The MCP door (`/mcp`) is **authless at the sandbox rung
only**; rungs above the floor are keyed, and no keyed rung is declared until
mounted (mounted-rungs-only).

## Payable stubs — never fake billing

`dispatchWorkOrder` answers a real typed **402 OFFER** (per-dispatch rate,
ladder alternatives, checkout seam) and says in the body that it is a
**labeled stub**: the supply-side dispatch rail is not yet built, the
settlement rail is not activated (A1's charter), `/checkout` cannot take
payment, and no money event is ever fabricated. Metering, money, receipt,
and traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests (conformance + live anon sandbox + verified suite with runs on
  record). Copy stays claim-free.
- OAuth / credit-card gates — **never** on a B2A projection (spec §5.1).
- Keyed ladder rungs (earned-credits, human-claimed, paid enforcement) — the
  shapes are declared in the projection config and advertised in the OFFER;
  no keyed rung is declared as a mounted interface until it is mounted.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.

## Rail ledger (§9.1 final box)

Face registered in the rail ledger (faces-payable/week denominator) via
LEDGER.md **door A** — row added to
`packages/rail-ledger/registry/faces.json` @ ax `draft/rail-ledger-v1`.
The served projection config records the address in its `railLedger` field:
`https://apis.ax/account/faces?face=api.cleaning` (readout service built,
deploy pending Batch-S).
