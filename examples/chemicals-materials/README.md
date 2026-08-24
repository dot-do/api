# chemicals-materials — wave-zero property (GAP row, placeholder address)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`chemicals-materials`** — Chemicals & Materials,
NAICS 325.

**This is a GAP row, and the row's own hedge is the operative fact.** Nothing
is held at any ladder step; no acquisition candidate is named in any estate
doc; `api.chemicals` / `apis.chemicals` availability is [UNVERIFIED]. The
category is a **single-lens candidate** (VC #25 only — "every chemical edge
legally carries an SDS handoff"), at artifact depth, marked **[H] with an
explicit probe-before-build flag**. Per spec §0 the G3 substrate is built
first under a **placeholder address** (`chemicals-materials.org.ai`) and the
G4 brand config attaches when a name is ruled. Nothing in this directory
implies acquisition of any name, and every register [UNVERIFIED] anchor is
carried, not hardened.

**The grain:** the GHS 16-section SDS — the SDS instance of the
insurance-document pattern (own the mandatory document layer under whoever
transacts) — plus the hazmat shipping-declaration artifact on the transaction
edge and the facility right-to-know inventory join.

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest; native top-level `g2` + `links.verify`) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only; camelCase operationId on every route) | `/openapi.json` |
| Pricing Document (metered shape, `binding: false` + statement — stub, nothing charged; top-level `rates[]` per axp-ext-rates-g2) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /safety-data-sheets` |
| Data face | `/safety-data-sheets`, `/substances`, `/shipping-declarations`, `/facilities` |
| Headless face (chemical-inventory system-of-record door, same collection) | `POST /substances` → anon workspace, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the pay/work/claim ladder | `POST /shipping-declarations/{id}/issue` |
| MCP door (declared on the card because mounted; authless anon-sandbox rung — no bearer-gated tool exists yet, so none is declared) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas + System coordinates) | `/icp.json` (card `links.icp`; also top-level `g2` on the card) |
| Published verification suite ("run this") | `/verify` |

One operation, one name, everywhere (five-surface invariant): the canonical
camelCase operationId is the OpenAPI id, the MCP tool string, the suite
check's `operation` ref, the meter tag, and the rate-card key —
`listSafetyDataSheets`, `getSafetyDataSheet`, `listSubstances`,
`getSubstance`, `createSubstance`, `listShippingDeclarations`,
`getShippingDeclaration`, `issueShippingDeclaration`, `listFacilities`,
`getFacility`.

## Strata

- **G3 (Stratum A)** — `product.js`: the `APIProduct` instance (Nouns with
  schema/binding/verbs; System coordinates carry the register's own
  [UNVERIFIED] hedge on the EHS system-of-record; operations, sandbox spec,
  meters).
- **G4 (Stratum B)** — `projection.json`: placeholder projection,
  `motion: B2A`, the four-rung ladder as the offer array (three rungs are
  labeled stubs), experiment registration, the **counterpart-brand gap
  recorded** (§9.3), and the **source-route status recorded honestly**
  (classA: false — probe-before-build flag unresolved). Repo config, not a
  served surface.

## Sandbox seed (§5.2)

The row's source route (supplier-published SDS corpora) is an UNPROBED
single-lens hypothesis — not class A — so the seed is **synthetic,
mechanically produced, and labeled**: `scripts/generate-seed.mjs`
(deterministic PRNG keyed on the substrate id) → `seed.json`. Every record
carries `example: true` + a demo notice; fictional supplier/facility names;
**no real CAS registry numbers and no real UN numbers** — ids are CAS-shaped
(`CAS-EX-*`) and UN-shaped (`UN-EX-*`) synthetic patterns; EINs are synthetic
`00-`prefixed; the 16 GHS section TITLES are the standard's own vocabulary
(typing anchor), all section CONTENT is synthetic. Reseeding is a build step,
never a manual edit.

## Vendoring

`axp/` is byte-identical vendored `axp-faces` **0.3.0** with
**axp-ext-rates-g2@0.2.0** (digest `903e414d…`), pinned spec
`apis-ax-axp@2.6.0` (digest `a9a1197c…`) — vendored via `git show` from the
axp.org.ai repo's **committed HEAD
`523c9ef217d54feefb0b20734a6d2996a6965b79`** on branch
`draft/axp-extension-rates-g2` (never the working tree; see
`axp/VENDORED.json`). `spec/` carries the pinned spec + digest from the same
commit. The selfcheck re-verifies byte-identity against that commit.

## Verify

```sh
node scripts/generate-seed.mjs   # reseed (deterministic)
node scripts/selfcheck.mjs       # §9.1 checklist — 16 boxes, fail-closed, in-process
```

## Deferred / blocked at wave zero (spec §7.3 MAY-defer + GAP-row consequences)

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
- Platform-account registration — **blocked-on-rail-ledger**: at build time the
  ledger service + LEDGER.md did not exist at the committed HEAD of
  `~/projects/ax` branch `draft/rail-ledger-v1` (tip = main, `1620e9f`); no
  address convention to point at, and nothing is stubbed.
- The row's own prerequisites stay open exactly as the register wrote them:
  **no name, no incumbency probe, no corpus probe** — G4 held pending #16;
  the probe-before-build flag is untouched by this G3 build.
