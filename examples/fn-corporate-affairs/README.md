# fn-corporate-affairs — wave-zero property (GAP register row, placeholder address)

The wave-zero instantiation of the payable machine-face property template
(studio `docs/plans/2026-08-23-property-template-spec.md`) for full-economy
register row **`fn-corporate-affairs`** (Function: Corporate Affairs — one of
the 13 horizontal Function families).

**This is a GAP row with zero estate names** (one of the two Function rows,
with Strategy, holding literally none). Per spec §0 the G3 substrate is built
under the placeholder address `https://fn-corporate-affairs.org.ai`, there is
**no G4 brand config** (`projection.config.json` carries `brand: null`), no
positioning claim anywhere, and the acquisition facts — including the row's
decomposition question, answered — are filed in `REGISTER-NOTE.md` for the
#16 list. Attaching a name later is a config change, not a rebuild.

## Decomposition (the row's own warning, honored)

- **Board/governance artifacts are NOT served here** — that slice belongs to
  the entity back-office substrate (holdings-corporate-mgmt / api.holdings).
- **Public filings are not owned here** — the `Disclosure` collection is a
  `federated` corporate-affairs view of a corpus the public-record read layer
  owns; the federation is unwired at wave zero and every record says so.
- **What this substrate owns**: the stakeholder relationship register and
  engagement log (native) plus press-mention records (generated) — the
  residual grain no other row serves, which makes the GAP not fully benign.

## What serves (one definition, two plies)

| Face | Doors |
|---|---|
| Machine face (vendored axp-faces, pinned `apis-ax-axp@2.6.0`, digest `a9a1197c…`) | `/.well-known/agents.json` (+ ruled `g2` top-level + `links.verify`), `/openapi.json` (operationId on every route), `/pricing` (3 faces, top-level `rates[]`), `/llms.txt`, `/` (3 faces), `/offer` (402) |
| Data face | `GET /stakeholders` (the branching collection: OK / EMPTY / BLOCKED / OFFER), `GET /stakeholders/{id}`, `GET /engagements`, `GET /engagements/{id}`, `GET /mentions`, `GET /mentions/{id}`, `GET /disclosures`, `GET /disclosures/{id}` |
| Headless face (stakeholder/IR-CRM system-of-record verbs, same collections) | `POST /stakeholders`, `POST /engagements` |
| MCP | `POST /mcp` — the same Nouns/verbs over JSON-RPC; **authless** (the anon-sandbox rung is the only mounted rung; bearer-key arrives with the rungs above) |
| G2 exposure | `GET /icp.json` — the row's ICP + persona coordinates and agent classes (also `g2` on the card, per ruling) |
| Verify | `GET /verify`, `GET /verify/suite.json` — "run our tests" |

## Batch-2 ruled extension placements (bridges, exactly as ruled)

Until the upstream axp-faces re-vendor lands, `worker.js` extends the
GENERATED documents additively — the vendored bytes are never edited:

- `rates[]` **top-level on the Pricing Document** — operationId-keyed, every
  row `freeQuota` or zero price, rows ⊆ OpenAPI operationIds;
- `g2` **top-level on the card**;
- `links.verify` **as a card link member**;
- `operationId` **on every OpenAPI route** (the generator emits its own
  quartet ids; the manifest routes get theirs in the bridge).

## Wave-zero honesty (labeled everywhere it shows)

- **All records are synthetic example data** (`example: true`, `[demo]`
  titles, fictional companies/outlets/regulators only) — the §5.2 mechanically
  produced sandbox seed. The row's source route (public filings/press indices)
  is register inference only [UNVERIFIED], so the labeled-synthetic path
  applies by rule.
- **Mutations are ephemeral** (per-isolate memory; disclosed retention on
  every minted record). The anon sandbox is the universal floor.
- **The rate card is a stub**: metered-shaped so the 402 OFFER boundary is
  real and machine-probeable, with `binding: false` and a plain statement that
  no settlement is wired and no charge can occur. Never fake billing.
- **The OFFER advertises only MOUNTED rungs** (batch-2 rule): exactly the
  sandbox floor at wave zero; pay/work/claim appear as alternatives when they
  mount, not before (presence-when-true).
- **Seams are emitted, not rendered**: metering / money / traffic events
  tagged `{substrate, projection, motion, operation, shape, pattern}` go to
  structured stdout (or an attached `SEAMS` queue binding). No account UI,
  keys, or invoicing exist here, by design (template §7.4).

## Run the gate

```sh
node selfcheck.mjs            # fail-closed §9.1 self-verify, 12 checks
# AQA_DIR=/path/to/api.qa node selfcheck.mjs   # if the estate layout differs
```

The gate runs the pinned apis-ax-axp@2.6.0 conformance in-process via
autonomous-qa (api.qa) plus the template's own checks (seed labeling, every
operation exercised, the ruled placements, conneg matrix, mounted-rungs-only
offer, ghost-surface sweep, projection-config + decomposition completeness).
`axp/` is byte-identical vendored from `axp.org.ai/packages/axp-faces`; never
edit it by hand.

## Known gaps (filed, not softened)

- The four ruled placements above are **bridges** carried upstream as
  generator issues (fix-the-generator law); they migrate into axp-faces at the
  re-vendor and the bridge code in `worker.js` then deletes.
- `interfaces.testSuite` is deliberately not declared (batch-2 rule: stays
  undeclared until digest-pinned; declaring it arms `check-capability-coverage`
  against deployed verifiers that predate the registry row). The suite still
  ships at `/verify/suite.json` and `links.verify` names it.
- Rail-ledger registration (§9.1 final box): **blocked-on-rail-ledger** — no
  faces-payable rail ledger exists in the ax repo at build time; the box is
  recorded blocked, never stubbed.
