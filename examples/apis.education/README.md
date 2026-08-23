# apis.education — wave zero of register row `education`

The functions an education institution's systems call: **course and
credential records, financial-aid artifact records, and an auto-minted
catalog door on the LMS system-of-record coordinate**, served as a payable
machine-face property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`).

Register state: **name-only** (apis.education held — porkbun, exp
2027-07-26 — no Cloudflare zone, no brand record; nothing served this
property before this example). Row posture is **RULED Axis-2 only**
(SC #20, avoid-class 5): a headless-kit face, not a data-thesis play — no
consumer front, and learner/consumer demand stays agent-intermediated
(B2A2C free-rider) by the row's own ruling.

## The two strata

- **G3 substrate** (`src/product.js`): the `APIProduct` instance — Nouns
  (Course, Credential, AidArtifact `generated`; Catalog, CatalogCourse
  `native`), the System coordinate (LMS⟨education-institutions⟩ — SIS/
  registrar is [UNVERIFIED] in the row and is not declared), the operation
  set, the sandbox spec, one meter per operation. The `APIProduct`
  interface's normative home is primitives.org.ai `digital-products`
  (prove-then-extract).
- **G4 projection** (`src/projection.js`): apis.education (B2D,
  freemium-ladder pattern, experiment registered). The B2A2C
  counterpart-brand **gap is recorded** in the config: no human-vocabulary
  name is held for this cell (fafsa.click is an artifact door, not a
  counterpart brand). Sub-vertical names (apis.university / school /
  courses / study) are content inside this property, not separate brands
  (property-grain ruling).

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`src/axp-faces/`, byte-identical to
PINS.json: axp-faces 0.3.0, pinned `apis-ax-axp@2.6.0` digest `a9a1197c…`,
extension `axp-ext-rates-g2@0.2.0` digest `903e414d…`; vendored from the
axp.org.ai repo's committed HEAD `523c9ef2` on branch
`draft/axp-extension-rates-g2` via `git show` — see `VENDORED.json`). The
four extension members are native: top-level `rates[]`, per-route
`operationId` (route = MCP tool = suite ref = rate key), `links.verify`,
top-level `g2`.

## Data classes (all synthetic, all labeled)

Every sandbox record is **labeled synthetic example data**
(`"example": true`) over fictional institutions, per estate fixture law.
Source-route honesty (probed in-session 2026-08-23): the row's ingest
candidates are flagged `[UNVERIFIED]` — College Scorecard answered 403
keyless (API key required); IPEDS bulk (`HD2023.zip`) answered 200, but the
route is unruled in the register, so real ingest is deferred to a
register-level source-route verification (a row gap is filed upstream,
never improvised). Provenance note in `src/seed.js`.

## Run it

```sh
cd examples/apis.education
node scripts/selfcheck.mjs        # the §9.1 checklist, 16 boxes, fail-closed
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/courses                 # keyless anon floor (labeled example data)
curl localhost:8787/courses?level=certificate
curl localhost:8787/pricing                 # rate card — rates[] per operation, test-mode statement
curl -X POST localhost:8787/catalogs        # mint an ephemeral catalog (headless ply)
```

Self-verify: **15/16 §9.1 boxes** — box 16 (rail-ledger registration) is
**BLOCKED-ON-RAIL-LEDGER**: `ax` branch `draft/rail-ledger-v1` carries no
committed LEDGER.md/address convention as of 2026-08-23; registration is
deferred, not stubbed. Box 4 is the real conformance gate: api.qa's own
requirement implementations run in-process at the pinned digest
(fail-closed if `autonomous-qa` is missing).

Deploy prerequisite (founder/ops act, recorded in `wrangler.jsonc`):
apis.education has **no Cloudflare zone** — zone provisioning precedes any
route attachment. Nothing here claims to be serving.
