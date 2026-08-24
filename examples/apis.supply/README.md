# apis.supply — wave zero of register row `wholesale-distribution`

The functions a distributor's systems call: **the X12 850/856/810 document
rail (purchase orders, advance ship notices, invoices), the GTIN/UNSPSC-keyed
catalog, and landed-cost quotes**, served as a payable machine-face property
per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`).

Register state: **name-only, ZONELESS** — apis.supply is held (porkbun,
expiry 2027-07-26) but has **no Cloudflare zone**; provisioning is Batch-S
admin, and route attachment waits on it. Nothing served this property before
this example.

**Name-sharing note:** the register anchors apis.supply in the NAICS 42 row
(`wholesale-distribution`), which OWNS `examples/apis.supply`. The
fn-supply-chain function row shares the name and builds under its own row-key
directory — coordinate there, never here.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance —
  Nouns (PurchaseOrder ×850-typed, ShipNotice ×856, Invoice ×810,
  CatalogItem, LandedCostQuote), the System coordinates
  (OrderManagement⟨wholesale-distribution, edi-pipeline⟩ + ERP), the
  operation set, the sandbox spec, one meter per operation. The `APIProduct`
  interface is local for now; its normative home is primitives.org.ai
  `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): two non-exclusive configs on
  the one substrate — **apis.supply** (B2D, per-outcome pricing on verified
  three-way matches — SERVED by this worker), **apis.ax** (B2A, 402-metered,
  the #17 ladder — recorded). A data-face projection (cross-distributor
  price/availability corpus) is deliberately **withheld**: the row marks that
  breadth claim [H — probe before build], and recording a projection would
  spend the vacancy claim before the incumbency probe. The B2A2B
  counterpart-brand candidates (the held restock/refill/replenish
  recurring-consumable family) are recorded in the served projection config,
  not asserted.

## The document rail and the germ

The row's source route is **owned-by-construction**: X12 documents captured
first-party at the agent-native EDI rail — the **transactions.dev germ**
(dot-do/transactions.dev), consent-at-rail. This example needed no
repo-level germ work: the typed 850/856/810 record schemas live here, and the
germ is declared as a family edge (`rel: source-route`) on the card. When the
rail starts accreting real documents, the enrichment ladder (document flow →
normalized catalog/price corpus → cross-distributor discovery) runs there.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical, PINS.json-digested,
pinned `apis-ax-axp@2.6.0` / digest `a9a1197c…`). The anon sandbox is the
universal floor: `/purchase-orders` answers keyless with six labeled
synthetic document flows (complete 850 → 856 → 810 cycles, internally
consistent quantities and totals, one deliberate short-ship variance so
three-way matching has a real exception, statuses spanning the whole
lifecycle). Fixture law: fictional distributor + partners, **GS1 demo prefix
952 with valid check digits** on every GTIN/GLN.

The row's seed-corpus route (fn-supply-chain internal purchasing, Class A,
shared rail) was **not reachable in-session** at build time, so per spec §5.2
the labeled synthetic seed is the wave-zero corpus — swap-in is a reseed
build step when the shared rail serves.

```sh
pnpm install                      # repo root
cd examples/apis.supply
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/purchase-orders
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl -X POST localhost:8787/purchase-orders/po-cobblepine-0701/match   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/apis-supply.test.ts   # from the repo root
```

## Payable stubs — never fake billing

`matchPurchaseOrder` answers a real typed **402 OFFER** (per-outcome rate —
price per completed VERIFIED three-way match, never per call — alternatives,
checkout seam) and says in the body that it is a **labeled stub**: the
settlement rail is not activated (A1's charter), `/checkout` cannot take
payment, and no money event is ever fabricated. Metering, money, receipt, and
traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## Generator gaps (recorded, to fix in axp.org.ai and re-vendor — never patched here)

The vendored generator output is extended by site-level wrappers in
`src/axp.ts` for four things the spec requires that `axp-faces` does not
carry yet — placements are the RULED extension placements (batch-2 watch
list; zero divergence):

1. `/pricing` `rates[]` top-level (the DRAFT §2 rate-card extension) + mirrored `offers`
2. card `links.verify` as a card link member → the published suite page
3. card `g2` top-level member — the row's G2 coordinates (ICP + Persona + System) per stake #6
4. per-route `operationId`s in the OpenAPI doc (the rate card may only price declared operationIds)

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests (conformance + live anon sandbox + verified suite with runs on
  record). Copy stays claim-free.
- MCP auth above the anon-sandbox rung — the MCP door is **authless** because
  the anon sandbox is the only ladder rung served today; bearer-key auth
  arrives with the rungs above (the ruled ladder). Only MOUNTED rungs are
  advertised.
- OAuth enforcement — `/login` → `/callback` runs in labeled demo mode until
  a GitHub OAuth app is configured; keys are random, unpersisted, unenforced.
- Committed-subscription tier — no rate-card row until it exists.
- Cross-distributor price/availability breadth — [H] on the row; probe before
  build. This catalog is single-tenant sandbox grain.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.

## Definition of done (spec §9.1, run 2026-08-23)

**16/16 pass.** The gate is `tests/apis-supply.test.ts` (20 tests, fail-closed
at the pinned digest) plus the projection configs and this record. The final
box:

- **Platform-account registration (final box): REGISTERED** — registered via
  LEDGER.md door A — row in packages/rail-ledger/registry/faces.json @
  draft/rail-ledger-v1 (studio #9 alignment pass 2026-08-23); readout
  https://apis.ax/account/readouts/faces-payable (service built, deploy
  pending Batch-S). Previously blocked-on-rail-ledger (no ledger existed in
  `~/projects/ax` at 2026-08-23 build time); no fake ledger entry was ever
  stubbed — registration landed when the ledger package and its door-A
  registry existed. The served projection config records the ledger address
  in its `account` field.

Guardrail (§5.3) note: this projection carries no agent-default claim, so the
box passes by construction; the apis.ax projection (recorded, not served)
inherits the guardrail obligation when its rate card goes live.

§9.2 (independent): hosted api.qa verdict + worthiness-bar attestation wait on
the zone (apis.supply is ZONELESS; Batch-S admin) — nothing here counts on
deploy.
