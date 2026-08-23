# apis.shop — wave zero

Register row **retail-ecommerce** (Retail & E-commerce, NAICS 44-45 ex-441)
instantiated per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`) as a payable
machine face on the `@dotdo/api` framework.

- **Grain:** GS1 Digital Link + schema.org Offer/Order (the row names its
  interchange standard — no cascade fallback).
- **Substrate (G3):** `src/substrate.ts` — Nouns Product / ProductIdentity /
  Offer / Order; Systems OMS⟨online-retailers⟩ + Storefront⟨multichannel-merchants,
  marketplace-sellers⟩ (POS deliberately not served — avoid-class commodity per the row).
- **Projection (G4):** `projections/apis.shop.json` — motion **B2A** (the
  row's Axis-2 ruling: agents as purchasers hitting Offer/Order surfaces).
  No OAuth door, no checkout/credit-card door on this face.
- **Both plies, one definition:** the typed record collections and the
  OMS/storefront system-of-record doors are the same routes, same envelopes,
  same rate-card rows; REST and MCP dispatch the same store functions.

## Run

```sh
pnpm install                      # repo root
npx vitest run tests/apis-shop.test.ts   # the /verify suite (fail-closed conformance gate included)
cd examples/apis.shop && npx tsx build.ts && npx wrangler dev   # serve locally
```

## Data provenance (labeled — always)

Everything the sandbox serves is **synthetic example data and says so**
(`example: true` + label on every record): merchant product feeds are
**Class B (agreements)** and have not landed, so per spec §5.2 the catalog is
a labeled synthetic seed until they do. Fixture law: fictional merchants and
brands only; every GTIN sits in the **GS1 demo prefix 952** space with a
computed, valid check digit; GPC/UNSPSC/HTS values are format-valid example
assignments, not authoritative classifications. The sandbox is the real
product over simulated data — never a faked demo (live-demo ruling).

## Estate extensions (ruled placements — bridged, not forked)

The vendored `axp/` generator (byte-identical, `PINS.json`-digested, pinned
to `apis-ax-axp@2.6.0` digest `a9a1197c…`) does not carry four estate
extensions yet. They are applied in `src/axp.ts` at the **ruled placements**,
until the upstream re-vendor lands — never by editing vendored files:

1. `rates[]` **top-level** on the served Pricing Document
2. `g2` **top-level** on the capability card
3. `links.verify` as a card **link member**
4. `operationId` on **every route** in the OpenAPI document

## Ladder + MCP auth (batch rulings)

- **Only mounted rungs are advertised.** The anonymous sandbox is the only
  mounted rung at wave zero, and it is the only alternative the 402 OFFER
  carries. Earned-credits and human-claimed rungs are recorded in the
  projection config as deferred and are NOT advertised.
- **MCP auth:** authless on the anon-sandbox rung (all that is mounted);
  bearer-key required on rungs above once they mount.
- `interfaces.testSuite` stays **undeclared** until a suite document is
  published at a pinned digest (omission is full conformance; a wrong
  declaration is a machine-readable false claim).
- Agent-default positioning claim **withheld** until the §4.6 worthiness bar
  is attested.

## Seams (§7.4 — emitted, never rendered)

Structured log events tagged `{substrate, projection, motion, operation,
shape, pattern}` for meters; money/receipt seams exist and are emitted ONLY
on real settlement (rail not activated — no fabricated events); the traffic
seam carries identity class × referral source (the §9.3 counterpart-brand
diagnostic's raw signal — gap recorded in the projection config).

## Admin notes

- **apis.shop renewal due 2026-12-12** — Batch-S dated admin, not a build gate.
- CF zone exists (zone-only state); route attachment is a deploy decision.
- Rail-ledger registration (§9.1 final box): **blocked-on-rail-ledger** — no
  rail ledger exists in the ax repo at build time; the box is recorded
  blocked, never stubbed.
