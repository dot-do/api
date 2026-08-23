# fn-risk-compliance — wave-zero property (regulation-check family, GAP at the umbrella grain)

The wave-zero instantiation of the payable machine-face property template
(studio `docs/plans/2026-08-23-property-template-spec.md`) for full-economy
register row **`fn-risk-compliance`** (Function: Risk & Compliance — one of
the 13 horizontal Function families), built **at the family grain**: the row
is the structural inverse of every other row — 28 held per-statute .dev
fronts (the narrowest grain, enumerated by the 2026-08-23 property-surface
register) and a **GAP at the property grain**. No api-grammar umbrella name
is held; compliance.do is convention-barred (.do = primitives, never startup
brands); no phantom umbrella is named anywhere here. Per the register's own
words the family is "batch-provisionable as a family (one pipeline, ~20
fronts)": this is that ONE pipeline, under the placeholder address
`https://fn-risk-compliance.org.ai`. `projection.config.json` carries
`brand: null`; the umbrella name rides the #16 lane; attaching a held .dev
front (or an acquired umbrella) later is a config change, not a rebuild.

## What serves (one definition, two plies)

| Face | Doors |
|---|---|
| Machine face (vendored axp-faces 0.3.0 from axp.org.ai commit `523c9ef2…` via `git show`; pinned `apis-ax-axp@2.6.0` digest `a9a1197c…`; extension `axp-ext-rates-g2@0.2.0` digest `903e414d…` **native, no bridges**) | `/.well-known/agents.json` (native `links.verify` + top-level `g2`), `/openapi.json` (canonical `operationId` on every operation), `/pricing` (3 faces, top-level `rates[]`), `/llms.txt`, `/` (3 faces), `/offer` (402) |
| Data face | `GET /checks` (the family register as the branching collection: OK / EMPTY / BLOCKED / OFFER), `GET /checks/{id}`, `GET /statutes`, `GET /statutes/{id}`, `GET /check-runs`, `GET /check-runs/{id}`, `GET /obligations`, `GET /obligations/{id}` |
| Headless face (the shared check-runner, system-of-record verb on the same collections) | `POST /checks/{id}/runs` |
| MCP (authless — the anon-sandbox rung only; keyed rungs above are stubs) | `POST /mcp` — the same Nouns/verbs over JSON-RPC, tools declared by canonical operationId |
| G2 exposure | `GET /icp.json` — the row's ICP + persona coordinates and agent classes |
| Verify | `GET /verify`, `GET /verify/suite.json` — "run our tests" |

## Wave-zero honesty (labeled everywhere it shows)

- **Two record classes, disclosed per record.** Statutes and check
  definitions are cited reference facts (public-law citations; estate-register
  rows), each carrying a provenance note stating that the live registry-fetch
  pipeline — the row's ruled cheapest source route — has **not** run at wave
  zero and no registry-derived value appears anywhere. Every check RESULT,
  calendar entry, and minted subject is **synthetic example data**
  (`example: true`, `[demo]` titles, fictional companies, synthetic 00-prefix
  identifier patterns only).
- **Front→statute bindings are register-true.** Only the five fronts the
  register row recites (davisbacon, fifra, neshap, fflcheck, edi834) are
  bound; the other 23 carry the row's own `[UNVERIFIED]` flag — binding is a
  curation act, never improvised here.
- **No attestation is faked.** Attested-check output is typed to ride the
  api.qa verification rail (VerificationReport, H4 — LIVE; a consumption
  edge). Every wave-zero run says `attested: false`; no verdict URL is
  fabricated.
- **Mutations are ephemeral** (per-isolate memory; disclosed retention). The
  anon sandbox is the universal floor.
- **The rate card is a stub**: metered-shaped so the 402 OFFER boundary is
  real and machine-probeable, with `binding: false` and a plain statement
  that no settlement is wired and no charge can occur. The OFFER's
  pay/work/claim alternatives are each labeled `status: "stub"`
  (mounted-rungs-only). Never fake billing.
- **Seams are emitted, not rendered**: metering / money / traffic events
  tagged `{substrate, projection, motion, operation, shape, pattern}` go to
  structured stdout (or an attached `SEAMS` queue binding). No account UI,
  keys, or invoicing exist here, by design (template §7.4).

## Run the gate

```sh
node selfcheck.mjs            # fail-closed §9.1 self-verify, 12 checks
# AQA_DIR=/path/to/api.qa node selfcheck.mjs   # if the estate layout differs
```

The gate runs the pinned apis-ax-axp@2.6.0 conformance in-process plus the
template's own checks (seed honesty in both record classes, every operation
exercised, conneg matrix, offer ladder, ghost-surface sweep,
projection-config completeness). **Disclosed (§9.1 box 4):**
`describeConformance` is absent from vendored axp-faces 0.3.0 — the probe
ladder runs in-process via the independent verifier (autonomous-qa
`gradePinned`) against the pinned spec bytes; missing verifier = FAIL, never
skip. `axp/` is byte-identical vendored from `axp.org.ai/packages/axp-faces`
at committed HEAD `523c9ef217d54feefb0b20734a6d2996a6965b79`
(branch `draft/axp-extension-rates-g2`) via `git show`; digests recorded in
`axp/VENDORED.json`; never edit it by hand.

## Deliberate withholdings (filed, not softened)

- `interfaces.testSuite` is deliberately not declared (api.lawyer reference
  posture): declaring it arms `check-capability-coverage` against deployed
  verifiers that predate the registry row. The suite still ships at
  `/verify/suite.json` and `links.verify` names it.
- "Agent default" positioning is withheld: no brand exists to carry it and
  the §4.6 worthiness bar is not attested. Claim-free everywhere.
- Per §7.3 MAY-defer: workers.do serving lane, shared dashboard, per-brand
  MDX, unified analytics plane, live settlement (test-mode counts as
  face-payable), apps.ax app projections.

## Primacy / collision record (watch-list law)

Checked both registers for primacy rulings before building; none found for
this row's record types or names. Recorded in `projection.config.json`:
the Construction row (NAICS 23) owns the draw/lien-waiver/pay-app
payment-documentation set (LienWaiver shared with real-estate-closing per the
register) — this family's construction-payment-adjacent fronts
(jointcheck.dev, trustnotice.dev) are HELD names only; no LienWaiver or
payment-documentation record type is defined, served, or claimed shared here.
Built under this row's own key.

## Rail ledger

§9.1 final box (face registered in the rail ledger, faces-payable/week
denominator): registered via LEDGER.md door A — row in
`packages/rail-ledger/registry/faces.json` @ `draft/rail-ledger-v1` (ax
repo); `railLedger` address recorded in `projection.config.json`
(`https://ledger.apis.ax/faces?face=fn-risk-compliance.org.ai`). GAP rule:
the placeholder host `fn-risk-compliance.org.ai` is the registered face
until a name attaches.
