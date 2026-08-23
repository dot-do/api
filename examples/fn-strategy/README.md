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
| Machine face (vendored axp-faces, pinned `apis-ax-axp@2.6.0`, digest `a9a1197c…`) | `/.well-known/agents.json` (+ `links.verify`), `/openapi.json`, `/pricing` (3 faces), `/llms.txt`, `/` (3 faces), `/offer` (402) |
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
node selfcheck.mjs            # fail-closed §9.1 self-verify, 11 checks
# AQA_DIR=/path/to/api.qa node selfcheck.mjs   # if the estate layout differs
```

The gate runs the pinned apis-ax-axp@2.6.0 conformance in-process via
autonomous-qa (api.qa) plus the template's own checks (seed labeling, every
operation exercised, conneg matrix, offer ladder, ghost-surface sweep,
projection-config completeness). `axp/` is byte-identical vendored from
`axp.org.ai/packages/axp-faces` (`scripts/vendor.mjs`); never edit it by hand.

## Known gaps (filed, not softened)

- `rates[]` (operationId-keyed rate rows, DRAFT §2) is not yet supported by the
  axp-faces Pricing Document — a generator extension per the fix-the-generator
  law; the intended rate table lives in `projection.config.json` until it lands.
- `links.verify` is added additively to the generated card in `worker.js` — the
  generator does not emit it yet (same law; one-link extension, quartet stays
  generator-emitted).
- `interfaces.testSuite` is deliberately not declared (api.lawyer reference
  posture): declaring it arms `check-capability-coverage` against deployed
  verifiers that predate the registry row. The suite still ships at
  `/verify/suite.json` and `links.verify` names it.
