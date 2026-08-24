# api.holdings — wave zero of register row `holdings-corporate-mgmt`

The rail an agent calls to act on holdings and entities: **unified entity
records, typed formation / registration / BOI-status / registered-agent
records, the renewal/compliance calendar, and ownership structure as typed
edges** (NAICS 55), served as a payable machine-face property per the
property template spec (`studio/docs/plans/2026-08-23-property-template-spec.md`).

Register state: **zone-only** (api.holdings held at dynadot exp 2027-07-31,
CF zone live, no brand record) — nothing served this property before this
example; the build is greenfield in the `@dotdo/api` examples pattern.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance —
  Nouns (Entity, Formation, Registration, BOIReport, RegisteredAgent,
  Renewal, OwnershipStake), the System coordinate
  (EntityBackOffice⟨registration⟩ — SC #18 registration module, module
  grain; the fuller span is not a named 52-System catalog row and is not
  declared), the operation set, the sandbox spec, one meter per operation.
  The `APIProduct` interface is local for now; its normative home is
  primitives.org.ai `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): three non-exclusive configs on
  the one substrate — **api.holdings** (B2D, per-outcome pricing on renewal
  filings — SERVED by this worker), **apis.ax** (B2A, 402-metered, the #17
  ladder — recorded), **data.mt** (B2D, credit packs — recorded).
  Non-exclusivity is the pricing-experiment mechanism. The cell's
  counterpart-brand **gap** is recorded in the served projection config: the
  ICP includes non-technical principals and the register names no
  human-vocabulary counterpart for NAICS 55 (spec §5.1 B2A2B).

## Bindings and the dogfood corpus

`Registration` is `ingested`-bound — the row's source route is
public-licensable ingest (Secretary-of-State registries, SAM/USAspending,
BOI/UEI feeds). That route is not reachable keyless in-session at typed
grain, so the wave-zero corpus is the **§5.2 labeled synthetic seed**; real
mirror rows attach when the ingest lands on the enrichment ladder (public
registration rows → unified entity record → renewal calendar → apply/renew
transaction layer). Every other Noun is `native` to the entity back-office
system of record. The internal-first-customer corpus (a studio-shaped
multi-entity structure) accretes **behind auth as tenants** — it never
appears in the public seed (fixture law: no real company names; the
internal-operating-detail ban applies to every published record).

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical, PINS.json-digested,
pinned `apis-ax-axp@2.6.0` / digest `a9a1197c…`). The anon sandbox is the
universal floor: `/renewals` answers keyless with 9 labeled synthetic
renewal obligations across DE / TX / US-federal and due / filed / overdue
(a fictional four-entity holding structure, 00-prefix EINs, DEMO-prefix
UEIs and filing numbers, BOI records at status grain only).

```sh
pnpm install                      # repo root
cd examples/api.holdings
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/renewals
curl localhost:8787/entities/ent-northgate   # the unified entity record
curl localhost:8787/pricing                  # the rate card (rates[] per operation)
curl -X POST localhost:8787/renewals/ren-fleetline-de-2027/order   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/api-holdings.test.ts   # from the repo root
```

## Payable stubs — never fake billing

`orderRenewalFiling` answers a real typed **402 OFFER** (per-outcome rate —
price per completed, verified renewal filing, exclusive of government fees —
alternatives, checkout seam) and says in the body that it is a **labeled
stub**: the settlement rail is not activated (A1's charter), `/checkout`
cannot take payment, and no money event is ever fabricated. Metering, money,
receipt, and traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## Generator gaps (recorded, to fix in axp.org.ai and re-vendor — never patched here)

The vendored generator output is extended by site-level wrappers in
`src/axp.ts` for four things the spec requires that `axp-faces` does not
carry yet:

1. `/pricing` `rates[]` (the DRAFT §2 rate-card extension) + mirrored `offers`
2. card `links.verify` → the published suite page
3. card `g2` member — the row's G2 coordinates (ICP + Persona + System) per stake #6
4. per-route `operationId`s in the OpenAPI doc (the rate card may only price declared operationIds)

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests (conformance + live anon sandbox + verified suite with runs on
  record). Copy stays claim-free.
- OAuth enforcement — `/login` → `/callback` runs in labeled demo mode until
  a GitHub OAuth app is configured; keys are random, unpersisted, unenforced.
- Committed-subscription tier — no rate-card row until it exists.
- The fuller entity back-office System span (compliance calendar,
  cap-table/ownership ledger as catalog coordinates) — not a named
  52-System catalog row in the register excerpts; not declared.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.

## §9.1 rail-ledger box: REGISTERED

The checklist's final box — "face registered in the rail ledger
(faces-payable/week denominator)" — is **REGISTERED**: registered via
LEDGER.md door A — row in packages/rail-ledger/registry/faces.json @
draft/rail-ledger-v1 (studio #9 alignment pass 2026-08-23); readout
https://apis.ax/account/readouts/faces-payable (service built, deploy pending
Batch-S). The box was previously blocked-on-rail-ledger (no rail ledger
existed in the ax repo at 2026-08-23 build time); it was never satisfied by
a stubbed or fabricated ledger entry — registration landed when the ledger
package and its door-A registry existed. The served projection config
records the ledger address in its `railLedger` field.
