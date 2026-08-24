# consulting-research — wave-zero property (GAP row, placeholder address)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`consulting-research`** — Consulting & Scientific
Services, NAICS 5416-5417.

**This is a GAP row.** No api-grammar or category-completing name is held for
this category. Per spec §0, the G3 substrate is built first under a
**placeholder address** (`consulting-research.org.ai`) and the G4 brand config
attaches when a name is ruled. Nothing in this directory implies acquisition
of any name.

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only) | `/openapi.json` |
| Pricing Document (metered shape, `binding: false` + statement — stub, nothing charged) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /engagements` |
| Data face | `/engagements`, `/sows`, `/milestones`, `/deliverables`, `/tasks`, `/processes` |
| Headless face (system-of-record door, same collection) | `POST /engagements` → anon workspace, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the pay/work/claim ladder | `POST /deliverables/{id}/order` |
| MCP door (declared on the card because mounted) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas + System coordinates) | `/icp.json` (card `links.icp`) |
| Rate card — top-level `rates[]` in the Pricing Document (axp-ext-rates-g2; former `/rates` side door retired) | `/pricing` |
| Published verification suite ("run this") | `/verify` |

## Strata

- **G3 (Stratum A)** — `product.js`: the `APIProduct` instance (Nouns with
  schema/binding/verbs, System coordinates `ProjectManagement⟨professional-services-firms⟩`
  + `CRM⟨consulting-pipeline⟩`, operations, sandbox spec, meters).
- **G4 (Stratum B)** — `projection.json`: placeholder projection, `motion: B2A`,
  the four-rung ladder as the offer array (three rungs are labeled stubs),
  experiment registration, and the **counterpart-brand gap recorded** (§9.3).
  Repo config, not a served surface.

## Sandbox seed (§5.2)

The row's source route is unruled (no class-A corpus reachable), so the seed
is **synthetic, mechanically produced, and labeled**: `scripts/generate-seed.mjs`
(deterministic PRNG keyed on the substrate id) → `seed.json`. Every record
carries `example: true` + a demo notice; fictional firm/client names; synthetic
`00-`prefixed identifiers; O*NET code `13-1111.00` appears as a *typing anchor*
only — task statements and `PCF-EX-*` process ids are synthetic. Reseeding is
a build step, never a manual edit.

## Vendoring

`axp/` is byte-identical vendored `axp-faces` (pins: `apis-ax-axp@2.6.0`,
digest `a9a1197c…`; see `axp/PINS.json` + `axp/VENDORED.json`); `spec/` carries
the pinned spec + digest. Drift gate: `node <axp.org.ai>/packages/axp-faces/scripts/vendor.mjs axp --check`.

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
  stubs in every OFFER body; nothing is ever charged.
- workers.do serving lane, shared dashboard, unified analytics — extraction
  targets, not wave-zero requirements (§7.2).
- Platform-account registration — registered via LEDGER.md door A — row in
  packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio #9
  alignment pass 2026-08-23); readout https://apis.ax/account/readouts/faces-payable
  (service built, deploy pending Batch-S). Face is the placeholder host until
  the address is ruled.
