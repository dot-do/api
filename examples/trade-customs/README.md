# trade-customs — wave-zero property (GAP row, placeholder address)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`trade-customs`** — Cross-Border Trade & Customs,
NAICS 481-483 + customs.

**This is a GAP row.** No api-grammar or category-completing name is held for
this category; the candidates on record (api.trade†, api.customs†, tradedocs†;
surface-register gap-fill candidates customs.dev / tradedocs.dev) are ALL
availability-unverified. Per spec §0 the G3 substrate is built first under a
**placeholder address** (`trade-customs.org.ai`) and the G4 brand config
attaches when a name is ruled (#16). Nothing in this directory implies
acquisition of any name. See `REGISTER-NOTE.md` for the gap facts and carried
flags.

**Regulated-act separation.** Customs brokerage is a licensed act
(19 CFR 111). This property serves the buildable document layer only —
typed trade documents and headless packet assembly; the operator brings the
license (#22 regulation unlock). Broker-side scopes answer BLOCKED on the
branching collection.

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only) | `/openapi.json` |
| Pricing Document (metered shape, `binding: false` + statement — stub, nothing charged) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /shipments` |
| Data face | `/shipments`, `/bills-of-lading`, `/certificates-of-origin`, `/phytosanitary-certificates`, `/commercial-invoices`, `/customs-entries` |
| Headless face (document-pipeline system-of-record door, same collection) | `POST /shipments` → anon workspace, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the pay/work/claim ladder | `POST /shipments/{id}/assemble-packet` |
| MCP door (declared on the card because mounted) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas + System coordinates) | `/icp.json` (card `links.icp`) |
| Rate card — top-level `rates[]` in the Pricing Document (axp-ext-rates-g2) | `/pricing` |
| Published verification suite ("run this") | `/verify` |

One identifier per operation across every face (the five-surface invariant):
the OpenAPI `operationId`, the MCP tool string, the `/verify` suite's
`operation` refs, and the `rates[]` keys are the same camelCase verb
(`listShipments`, `getBillOfLading`, `assemblePacket`, …).

## Strata

- **G3 (Stratum A)** — `product.js`: the `APIProduct` instance (Nouns with
  schema/binding/verbs — eBL on DCSA typing, CoO/invoice on UN/CEFACT typing;
  System coordinates `TMS⟨freight-forwarders⟩` +
  `DocumentManagement⟨trade-document-assembly⟩` restating the row's headless
  ply; operations, sandbox spec, meters).
- **G4 (Stratum B)** — `projection.json`: placeholder projection, `motion: B2A`,
  the four-rung ladder as the offer array (three rungs are labeled stubs),
  experiment registration, the **counterpart-brand gap recorded** (§9.3), and
  the regulated-act separation recorded. Repo config, not a served surface.

## Sandbox seed (§5.2)

The row's source route is spec-native document assembly (SC #4) — the schemas
come free from UN/CEFACT + DCSA, but no class-A live corpus is reachable
in-session (first-party packets accrete only once real shipments run). So the
seed is **synthetic, mechanically produced, and labeled**:
`scripts/generate-seed.mjs` (deterministic PRNG keyed on the substrate id) →
`seed.json`. Every record carries `example: true` + a demo notice; fictional
forwarder/carrier/party names; `*-ex-*` ids, `00-`prefixed EIN-shaped ids,
`CONT-EX-*` container refs (deliberately not ISO 6346 units), and `EXnn.…`
HTS-SHAPED codes — never real classifications (the register row itself flags
the HTS grain [UNVERIFIED]). DCSA/UN/CEFACT are typing anchors; the values are
synthetic. Reseeding is a build step, never a manual edit.

## Vendoring

`axp/` is byte-identical vendored `axp-faces` **0.3.0** (pins:
`apis-ax-axp@2.6.0`, digest `a9a1197c…`; extension `axp-ext-rates-g2@0.2.0`,
digest `903e414d…`; see `axp/PINS.json` + `axp/VENDORED.json`), vendored from
the axp.org.ai repo's **committed HEAD** on `draft/axp-extension-rates-g2`
(`523c9ef217d54feefb0b20734a6d2996a6965b79`, via `git show` — never the
working tree). `spec/` carries the pinned spec + digest. Drift gate: box 3 of
`scripts/selfcheck.mjs` re-verifies byte-identity against that exact commit
on every run.

## Verify

```sh
node scripts/generate-seed.mjs   # reseed (deterministic)
node scripts/selfcheck.mjs       # §9.1 checklist, 16 boxes, fail-closed, in-process
```

Current run: **13/16 pass, 0 fail** — box 4 DEFERRED (local
describeConformance runner not a repo dependency; hosted verdict needs a
ruled domain), box 11 N/A (guardrail vacuous — no agent-default claim, no
sibling projection), box 16 BLOCKED (blocked-on-rail-ledger — see below).

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
- Platform-account registration — **blocked-on-rail-ledger**: the ledger service +
  LEDGER.md do not exist on `~/projects/ax` `draft/rail-ledger-v1`'s committed
  tree (tip `1620e9f`); no address convention to point at. Never stubbed;
  registers when the convention lands and this face has a ruled address.
