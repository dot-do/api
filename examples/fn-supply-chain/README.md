# fn-supply-chain — wave-zero payable machine face

Register row: **fn-supply-chain** (Function: Supply Chain & Procurement — one of the 13 APQC Functions; full-economy register 2026-08-23). Template: `studio/docs/plans/2026-08-23-property-template-spec.md` (§7.3 wave-zero MUSTs).

**Name note.** The ruled primary name, **apis.supply**, is (a) a shared face with the Wholesale/NAICS 42 vertical row — which owns the `examples/apis.supply` build — and (b) zoneless (provisioning debt recorded on the register row). Per the batch-1 fn-\* precedent this Function row builds under its **row-key** directory, and the substrate serves under the row-key placeholder address (`fn-supply-chain.org.ai`). Attaching the shared face at provisioning is a config change, not a rebuild.

## What serves

- **One substrate, two plies** (§3): X12 850/810/856-typed PurchaseOrder / Invoice / ShipmentNotice records, RFQ + Quote records (the price-response corpus germ), GS1 EPCIS 2.0 events and GTIN/GLN-identified Items as the **data face**; POST doors on the *same* collections (`/purchase-orders`, `/rfqs`, `/rfqs/{id}/quotes`) as the headless buy-side procurement system-of-record **headless face**.
- **Machine face** at the ratified pin `apis-ax-axp@2.6.0` (digest `a9a1197c…`), quartet generated from ONE manifest by the vendored `axp-faces` (hashes in `axp/PINS.json`; spec bytes vendored in `spec/`).
- **Ruled bridge placements** (batch-2 watch list — additive extensions of the generated documents until the upstream re-vendor lands): `rates[]` top-level on the Pricing Document; `g2` top-level on the card; `links.verify` as a card link member; `operationId` on every OpenAPI route (bridge throws at module init on any unmapped route).
- **MCP door** mounted at `/mcp` (streamable-http JSON-RPC), authless at the anon-sandbox rung — same Nouns/verbs as HTTP, one definition.
- **Anon sandbox** (universal floor, AXP Clause 7): keyless reads plus ephemeral demo-workspace writes; **all data synthetic and labeled** (`example: true`, `[demo]` prefixes, GS1 demo prefix 952 with valid check digits on GTINs *and* GLNs, fictional parties only, UNSPSC omitted — never fabricated).
- **402-shaped payable stub**: metered model + hard ceiling + OFFER boundary served and labeled as a stub — no live settlement, never fake billing. The OFFER `alternatives` advertise the full B2A ladder (pay / work / claim), each unmounted rung disclosed as a STUB.
- **Projection** (`projection.js`): motion **B2A** (the row's purest-B2A verdict), offer array from the B2A ladder only (rung 0 live; rungs 1–3 labeled stubs), experiment registration (`402-metered-per-call`), claim-free positioning (agent-default withheld until the §4.6 worthiness bar is attested by api.qa), counterpart-brand **gap recorded** for the procurement-principal cell.
- **Seams** (`seams.js`): meter / money / receipt / traffic events tagged `{substrate, projection, motion, operation, shape, pattern}`, identity class at id.org.ai grain + referral source (the §9.3 missing-counterpart diagnostic feed).

## Run it

```sh
pnpm install
pnpm test        # 27 tests: fail-closed digest-pinned conformance gate + §9.1 surface boxes
```

## §9.1 self-verify run (2026-08-23): 15/16 pass, 1 blocked

| # | Box | Result |
|---|---|---|
| 1 | G3 `APIProduct` instance (schema + binding + verbs per Noun; System coordinate) | pass |
| 2 | Both plies from one definition | pass (tested) |
| 3 | Quartet from one `defineSiteManifest()` via vendored axp-faces at PINS digest | pass (hashes verified) |
| 4 | Local conformance green at pinned digest, fail-closed | pass (`test/conformance.test.js`) |
| 5 | Anon sandbox keyless 200 OK, labeled seed, exercises every operation, fixture law | pass (tested) |
| 6 | Rate card: model, hardCeiling, offers, freeQuota-or-zero rows, `rates[].operation ⊆ operationIds` | pass (tested) |
| 7 | Motion declared; B2A shapes only; no OAuth/CC gates | pass (tested) |
| 8 | 402 OFFER advertises the B2A ladder (pay / work / claim) | pass (tested) |
| 9 | Counterpart-brand gap recorded (no human-vocabulary name held for this cell) | pass (`projection.counterpartBrand`) |
| 10 | G4 projection config complete per §2 | pass |
| 11 | Guardrail: no agent-default claim carried → trivially satisfied | pass |
| 12 | `/verify` published; `interfaces.testSuite` undeclared until digest-pinned | pass (tested) |
| 13 | Seams emitted with full §6.4 tags + identity class + referral | pass |
| 14 | Conneg matrix spot-checked; demo data labeled | pass (tested) |
| 15 | No ghost surfaces (presence-when-true) | pass (tested) |
| 16 | Face registered in the rail ledger | **REGISTERED** — registered via LEDGER.md door A — row in packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio #9 alignment pass 2026-08-23); readout https://ledger.apis.ax/readouts/faces-payable (service built, deploy pending Batch-S). Registered under the row-key placeholder host `fn-supply-chain.org.ai` (apis.supply is the shared face owned by the wholesale-distribution build). Previously blocked-on-rail-ledger; no fake ledger was ever stubbed (batch-2 watch list honored) |

Deferred per §7.3 MAY: workers.do serving lane, shared developer dashboard, per-brand MDX layer, unified analytics plane, live settlement (test-mode counts as face-payable), `interfaces.testSuite` declaration.
