# apis.accountants — wave zero of register row `accounting-tax`

The functions an accounting firm's systems call: **ledgers, ten typed close
deliverables (trial balance → month-end), and year-keyed returns**, served as
a payable machine-face property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`, whose §10 worked
example is this exact row — built here for real as a `@dotdo/api` example).

Register state: **BRAND-ONLY** (domain held, CF zone live, acquisition paper
trail in `studio/domains/data/apis-accountants-buy-results.json`) — nothing
served this property before this example.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance —
  Nouns (Ledger, CloseDeliverable ×10 typed, Return, Client, Engagement; all
  `native`-bound per the row's source route), the System coordinate
  (Accounting⟨accounting-firms⟩), the operation set, the sandbox spec, one
  meter per operation. The `APIProduct` interface is local for now; its
  normative home is primitives.org.ai `digital-products` (prove-then-extract).
- **G4 projections** (`projections/*.json`): three non-exclusive configs on
  the one substrate — **apis.accountants** (B2D, per-outcome pricing —
  SERVED by this worker), **apis.ax** (B2A, 402-metered, the #17 ladder —
  recorded), **data.mt** (B2D, credit packs — recorded). Non-exclusivity is
  the pricing-experiment mechanism. The B2A2B counterpart-brand candidate
  (monthend.finance) is recorded in the served projection config, not asserted.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`, byte-identical, PINS.json-digested,
pinned `apis-ax-axp@2.6.0` / digest `a9a1197c…`). The anon sandbox is the
universal floor: `/close-deliverables` answers keyless with 60 labeled
synthetic deliverables (two full close cycles, internally consistent
double-entry, fictional firm + clients, 00-prefix EINs).

```sh
pnpm install                      # repo root
cd examples/apis.accountants
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/close-deliverables
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl -X POST localhost:8787/close-deliverables/cd-sable-harbor-2026-06-close-package/order   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
npx vitest run tests/apis-accountants.test.ts   # from the repo root
```

## Payable stubs — never fake billing

`orderCloseDeliverable` answers a real typed **402 OFFER** (per-outcome rate,
alternatives, checkout seam) and says in the body that it is a **labeled
stub**: the settlement rail is not activated (A1's charter), `/checkout`
cannot take payment, and no money event is ever fabricated. Metering, money,
receipt, and traffic **seams** are emitted as structured logs tagged
`{substrate, projection, motion, operation, shape, pattern}` (spec §6.4/§7.4).

## Generator gaps — CLOSED (axp-ext-rates-g2, native since axp-faces 0.2.0)

The four members this example once bridged site-side are native
`defineSiteManifest` inputs since the ratified generator extension
`axp-ext-rates-g2` landed (vendored here at axp-faces 0.3.0 / extension
0.2.0 — the survey floor), each emitted at its RULED placement, validated
fail-closed:

1. `pricing.rates` → TOP-LEVEL `rates[]` in the served Pricing Document
   (rows key on the canonical operationId; the DRAFT-era `offers` mirror is
   gone — offers live on the card's `monetization` and answer at `/offer`)
2. `verifyUrl` → card `links.verify` (the published suite page)
3. `g2` → TOP-LEVEL card object — the row's G2 coordinates (ICP + Persona +
   System) per stake #6; `links.icp` / `/icp.json` stays beside it
4. `routes[].operationId` + `collection.operationId` → OpenAPI passthrough;
   one camelCase identifier per operation across route = MCP tool = suite
   reference = rate key, uniqueness enforced

No site-level wrappers remain; `src/axp.ts` is pure generator output.

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
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.
