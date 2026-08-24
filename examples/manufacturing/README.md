# manufacturing — wave-zero property (GAP row, placeholder address)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`manufacturing`** — Manufacturing, NAICS 31-33.

**This is a GAP row — the register's largest naming vacuum:** zero market-face
names are held for the biggest B2B sector. Per spec §0, the G3 substrate is
built first under a **placeholder address** (`manufacturing.org.ai`, a held G2
namespace, not a market face) and the G4 brand config attaches when a name is
ruled via the #16 acquisition lane. Nothing in this directory implies
acquisition of any name. The GS1-adjacent holdings epcis.dev/barcoding.dev
belong to the warehousing-traceability row, not this one — no family edge is
emitted to them.

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest; `g2` top-level, `links.verify`) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only; `operationId` on every route) | `/openapi.json` |
| Pricing Document (metered shape, `rates[]` TOP-LEVEL, `binding: false` + statement — stub, nothing charged) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /items` |
| Data face | `/items`, `/boms`, `/passports`, `/rfqs`, `/quotes`, `/trading-documents`, `/crosswalk` |
| Headless face (PIM/ERP master-data door, same collection) | `POST /items` → anon workspace, 952-prefix GTIN, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the ladder (only the sandbox rung mounted) | `POST /items/{id}/syndicate` |
| MCP door (declared on the card because mounted; AUTHLESS — anon-sandbox rung only) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas + System coordinates) | `/icp.json` (card `links.icp` + top-level `g2`) |
| Published verification suite ("run this") | `/verify` (card `links.verify`; `interfaces.testSuite` deliberately undeclared) |

There is **no separate `/rates` address**: the operation rate card rides
`rates[]` top-level in the Pricing Document — the ruled axp-ext/rates-g2
placement.

## Strata

- **G3 (Stratum A)** — `product.js`: the `APIProduct` instance (7 Nouns with
  schema/binding/verbs on the GTIN/GPC/UNSPSC identity spine; System
  coordinates `ERP⟨manufacturers⟩` + `PLM⟨engineering-document-control⟩` +
  `PIM⟨product-master-data⟩`; MES excluded as register-unverified; operations,
  sandbox spec, meters).
- **G4 (Stratum B)** — `projection.json`: placeholder projection, `motion: B2A`,
  the four-rung ladder as the offer array (three rungs are labeled NOT-MOUNTED
  stubs), experiment registration, agent-default claim withheld, and the
  **counterpart-brand gap recorded** (§9.3). Repo config, not a served surface.

## Sandbox seed (§5.2)

The row's source route (GS1 registries + manufacturer-published content) is a
hypothesis with no class-A corpus reachable in-session, so the seed is
**synthetic, mechanically produced, and labeled**: `scripts/generate-seed.mjs`
(deterministic PRNG keyed on the substrate id) → `seed.json`. Every record
carries `example: true` + a demo notice; fictional manufacturer names tagged
`[example]`; every GTIN uses the **GS1 demo prefix 952 with a valid GTIN-13
check digit**; classification codes are schema-shaped synthetic
(`UNSPSC-EX-*`/`GPC-EX-*`/`HTS-EX-*` — never real codes presented as
authoritative); synthetic `00-`prefixed EINs. Reseeding is a build step, never
a manual edit.

## Vendoring

`axp/` is byte-identical vendored `axp-faces@0.2.0` (pins: `apis-ax-axp@2.6.0`,
digest `a9a1197c…`, plus the `axp-ext-rates-g2@0.1.0` extension pin; see
`axp/PINS.json` + `axp/VENDORED.json`); `spec/` carries the pinned spec +
digest. Drift gate: `node <axp.org.ai>/packages/axp-faces/scripts/vendor.mjs axp --check`
(the selfcheck falls back to batch-baseline hash identity while the upstream
generator re-vendor is in flight).

## Verify

```sh
node scripts/generate-seed.mjs   # reseed (deterministic)
node scripts/selfcheck.mjs       # §9.1 checklist, fail-closed, in-process
```

## Deferred at wave zero (spec §7.3 MAY-defer + GAP-row consequences)

- Hosted api.qa verdict + `links.conformance` verdict page — requires a ruled,
  deployed domain; the placeholder is not deployed to a public address.
- Local `describeConformance` runner (autonomous-qa) — not a dependency of
  this repo; the selfcheck re-implements the probe-ladder behavior in-process.
- `interfaces.testSuite` declaration — arms the strict digest-pinned check;
  the `/verify` document is published undeclared until the hosted verdict exists.
- Live settlement, credit ledger (work rung), claim door — declared as labeled
  `mounted:false` stubs in every OFFER body; nothing is ever charged.
- workers.do serving lane, shared dashboard, unified analytics — extraction
  targets, not wave-zero requirements (§7.2).
- Platform-account registration — **REGISTERED**: registered via LEDGER.md door A —
  row in packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1
  (studio #9 alignment pass 2026-08-23); readout
  https://apis.ax/account/readouts/faces-payable (service built, deploy pending
  Batch-S). Registered under the placeholder host `manufacturing.org.ai` (GAP
  row — no ruled market face yet; the registry row moves to the ruled address
  when one attaches). Previously blocked-on-rail-ledger (no ledger address
  existed in `~/projects/ax` at 2026-08-23 build time); a fake ledger was
  never stubbed — registration landed when the ledger package and its door-A
  registry existed. The projection config records the ledger address in its
  `account` field.
