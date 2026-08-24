# fn-strategy — wave-zero property (GAP register row, placeholder address)

The wave-zero instantiation of the payable machine-face property template
(studio `docs/plans/2026-08-23-property-template-spec.md`) for full-economy
register row **`fn-strategy`** (Function: Strategy — one of the 13 horizontal
Function families).

**This is a GAP row**: no api-grammar name is held. Per spec §0 the G3
substrate is built under the placeholder address `https://fn-strategy.org.ai`,
there is **no G4 brand config** (`projection.config.json` carries
`brand: null`), no positioning claim anywhere, and the acquisition facts are
filed in `REGISTER-NOTE.md` for the #16 list. Attaching a name later is a
config change, not a rebuild.

## What serves (one definition, two plies)

| Face | Doors |
|---|---|
| Machine face (vendored axp-faces 0.3.0, pinned `apis-ax-axp@2.6.0` digest `a9a1197c…`, extension `axp-ext-rates-g2@0.2.0`) | `/.well-known/agents.json` (native `links.verify` + top-level `g2`), `/openapi.json` (canonical `operationId` on every operation), `/pricing` (3 faces, top-level `rates[]`), `/llms.txt`, `/` (3 faces), `/offer` (402) |
| Data face | `GET /objectives` (the branching collection: OK / EMPTY / BLOCKED / OFFER), `GET /objectives/{id}`, `GET /plans`, `GET /plans/{id}`, `GET /analyses`, `GET /analyses/{id}` |
| Headless face (strategic-planning/OKR system-of-record verbs, same collections) | `POST /objectives`, `POST /key-results/{id}/progress` |
| MCP | `POST /mcp` — the same Nouns/verbs over JSON-RPC |
| G2 exposure | `GET /icp.json` — the row's ICP + persona coordinates and agent classes |
| Verify | `GET /verify`, `GET /verify/suite.json` — "run our tests" |

## Wave-zero honesty (labeled everywhere it shows)

- **All records are synthetic example data** (`example: true`, `[demo]` titles,
  fictional companies) — the §5.2 mechanically produced sandbox seed. The row's
  class-A source route (the estate atlas and its G1 ingests) is platform-side
  and not reachable from this substrate at wave zero.
- **Mutations are ephemeral** (per-isolate memory; disclosed retention on every
  minted record). The anon sandbox is the universal floor.
- **The rate card is a stub**: metered-shaped so the 402 OFFER boundary is real
  and machine-probeable, with `binding: false` and a plain statement that no
  settlement is wired and no charge can occur. The OFFER's pay/work/claim
  alternatives are each labeled `status: "stub"`. Never fake billing.
- **Seams are emitted, not rendered**: metering / money / traffic events tagged
  `{substrate, projection, motion, operation, shape, pattern}` go to structured
  stdout (or an attached `SEAMS` queue binding). No account UI, keys, or
  invoicing exist here, by design (template §7.4).

## Run the gate

```sh
node selfcheck.mjs            # fail-closed §9.1 self-verify, 12 checks
# AQA_DIR=/path/to/api.qa node selfcheck.mjs   # if the estate layout differs
```

The gate runs the pinned apis-ax-axp@2.6.0 conformance in-process via
autonomous-qa (api.qa) plus the template's own checks (seed labeling, every
operation exercised, conneg matrix, offer ladder, ghost-surface sweep,
projection-config completeness). `axp/` is byte-identical vendored from
`axp.org.ai/packages/axp-faces` (`scripts/vendor.mjs`); never edit it by hand.

## Known gaps (filed, not softened)

- ~~`rates[]` not supported by the axp-faces Pricing Document~~ — CLOSED by
  `axp-ext-rates-g2@0.2.0` (axp-faces 0.3.0): the operationId-keyed rate card
  is now a native generator input (`pricing.rates` in `manifest.js`) served as
  a top-level array of the Pricing Document at the ruled placement.
- ~~`links.verify` bridged onto the generated card in `worker.js`~~ — CLOSED by
  the same extension: `verifyUrl` is a native manifest input and the bridge
  code is removed; the card also carries the top-level `g2` object natively
  (`links.icp` stays beside it).
- `interfaces.testSuite` is deliberately not declared (api.lawyer reference
  posture): declaring it arms `check-capability-coverage` against deployed
  verifiers that predate the registry row. The suite still ships at
  `/verify/suite.json` and `links.verify` names it.

## Platform account

§9.1 final box (face registered in the platform account, faces-payable/week
denominator): registered via LEDGER.md door A — row in
packages/rail-ledger/registry/faces.json @ draft/rail-ledger-v1 (studio #9
alignment pass 2026-08-23); readout
https://apis.ax/account/readouts/faces-payable (service built, deploy pending
Batch-S). GAP rule: the placeholder host `fn-strategy.org.ai` is the
registered face until a name attaches.
