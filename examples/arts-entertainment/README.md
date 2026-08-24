# arts-entertainment — wave-zero property (GAP row, placeholder address)

Instantiation of the payable machine-face property template
(`studio/docs/plans/2026-08-23-property-template-spec.md`) from the
full-economy register row **`arts-entertainment`** — Arts, Entertainment &
Recreation, NAICS 71 (Batch 7, D row).

**This is a GAP row, and the row's recorded THESIS GAP is the operative
fact.** Nothing held names the category at the 2-digit grain (no
api.entertainment / apis.recreation); the held names — apis.golf,
apis.casino, apis.theater, apis.hockey + the api.hockey pair, api.rodeo,
api.bingo, api.fishing — are grammar-completion sub-niche tails with no
entry thesis on record ("Nominal cover, thesis gap"). Per spec §0 the G3
substrate is built first under a **placeholder address**
(`arts-entertainment.org.ai`) and the G4 brand config attaches when a name
is ruled (#16). Held sub-niche tails may carry sub-vertical projections
later — recorded in `projection.json`, never served or asserted. Nothing in
this directory implies acquisition of any name.

**The grain:** schema.org-typed Event / Venue / admission-Ticket /
Reservation records (the row's own generic-fallback anchor — no industry
interchange standard is cited for NAICS 71) plus the booking
system-of-record door (H5 "Schedule: THE BOOKING") on the same Reservation
collection.

## What serves (one worker, one definition)

| Surface | Where |
| --- | --- |
| Capability card (AXP probe manifest; native top-level `g2` + `links.verify`) | `/.well-known/agents.json` |
| OpenAPI 3.1 (live-only; camelCase operationId on every route) | `/openapi.json` |
| Pricing Document (metered shape, `binding: false` + statement — stub, nothing charged; top-level `rates[]` per axp-ext-rates-g2) | `/pricing` |
| llms.txt (H1 + machine-surfaces tail) | `/llms.txt` |
| Branching collection (Clauses 4+7): keyless OK, 2× EMPTY, 2× BLOCKED, spend ladder | `GET /events` |
| Data face | `/events`, `/venues`, `/tickets`, `/reservations` |
| Headless face (booking system-of-record door, same collection) | `POST /reservations` → anon workspace, disclosed retention |
| Outcome verb — 402 OFFER **stub** advertising the pay/work/claim ladder | `POST /reservations/{id}/confirm` |
| MCP door (declared on the card because mounted; authless anon-sandbox rung — no keyed tool exists yet, so none is declared) | `POST /mcp` (JSON-RPC 2.0) |
| G2 coordinates (ICP + personas + System coordinate) | `/icp.json` (card `links.icp`; also top-level `g2` on the card) |
| Published verification suite ("run this") | `/verify` |

One operation, one name, everywhere (five-surface invariant): the canonical
camelCase operationId is the OpenAPI id, the MCP tool string, the suite
check's `operation` ref, the meter tag, and the rate-card key —
`listEvents`, `getEvent`, `listVenues`, `getVenue`, `listTickets`,
`listReservations`, `getReservation`, `createReservation`,
`confirmReservation`.

## Strata

- **G3 (Stratum A)** — `src/substrate.js`: the `APIProduct` instance.
  Bindings are honest: **Reservation is `native`** (first-party capture at
  the served booking door — the one first-party route the row names);
  **Venue / Event / Ticket are `generated`** at wave zero (synthetic labeled
  seed — the row's ingest route is conditional on provisioning that has not
  happened, and a `native` label on a synthetic corpus would be a false
  provenance claim). System coordinate: Schedule⟨venue-booking⟩; the row's
  venue-management/ticketing systems stay [UNVERIFIED — inferred] and are
  NOT declared.
- **G4 (Stratum B)** — `projection.json`: placeholder projection,
  `motion: B2A`, the four-rung ladder as the offer array (three rungs are
  labeled stubs), experiment registration, the **counterpart-brand gap
  recorded** (§9.3 — the row rules consumer demand agent-intermediated
  only), the **source-route status recorded honestly** (`classA: false`),
  the **primacy collisions recorded** (Event / Ticket / Reservation collide
  by name with other rows' record types; no primacy ruling exists in either
  register, so the types are local to this row key and nothing shared is
  claimed), and the **platform-account registration**. Repo config, not a served
  surface.

## Sandbox seed (§5.2)

Synthetic, mechanically produced, labeled — the seed spec is
`src/substrate.js` itself, versioned with the manifest (reseed = edit the
module = a build step). Every record carries `example: true`, a demo note,
and a `[demo]` name/title prefix; venues and cities are fictional; no real
club, casino, theater, team, or person appears; **no GS1 identifiers are
minted** (the 952-demo-prefix rule has nothing to bind — recorded, not
skipped); secret-scan clean. The corpus exercises every operation: both
collection filters branch both ways, tickets carry both statuses, and a
confirmed reservation exists for the outcome verb to target.

## Vendoring

`src/axp-faces/` is byte-identical vendored `axp-faces` **0.3.0** with
**axp-ext-rates-g2@0.2.0** (digest `903e414d…`), pinned spec
`apis-ax-axp@2.6.0` (digest `a9a1197c…`) — vendored via `git show` from the
axp.org.ai repo's **committed HEAD
`523c9ef217d54feefb0b20734a6d2996a6965b79`** on branch
`draft/axp-extension-rates-g2` (never the working tree; see
`src/axp-faces/VENDORED.json`). `spec/` carries the pinned spec + digest
(spec bytes hash to the pinned digest). The selfcheck re-verifies
byte-identity against that commit whenever the repo is present. The four
estate members — top-level `rates[]`, top-level `g2`, `links.verify`,
per-route operationIds — are NATIVE generator inputs; no bridges, no
hand-patched documents.

## Platform account (§9.1 box 16)

Registered via **door A** per `ax` repo `packages/rail-ledger/LEDGER.md`
(branch `draft/rail-ledger-v1`): one row in `registry/faces.json` — face
`arts-entertainment.org.ai`, `payableBasis: "test-mode"` (the 402 boundary
is served; settlement rail not activated; test-mode counts as face-payable
per spec §7.3) — and `"account"` recorded in `projection.json`. The
selfcheck verifies the COMMITTED registry row via `git show`.

## Verify

```sh
node scripts/selfcheck.mjs   # §9.1 checklist — 16 boxes, fail-closed, in-process
npx wrangler dev             # http://localhost:8787 (optional; no deploy implied)
```

Current run: **16/16 pass** (box 4 carries the disclosure:
`describeConformance` is absent from vendored axp-faces 0.3.0, so the probe
ladder is re-implemented in-process from `buildProbes(manifest)` at the same
pin; the hosted verdict remains api.qa's job, §9.2).

## Deferred / honest gaps at wave zero (spec §7.3 MAY-defer + GAP-row consequences)

- Hosted api.qa verdict + `links.conformance` verdict page — requires a
  ruled, deployed domain; the placeholder is not deployed to a public
  address.
- `interfaces.testSuite` declaration — arms the strict digest-pinned check;
  the `/verify` document is published undeclared until the hosted verdict
  exists.
- Live settlement, credit ledger (work rung), claim door — declared as
  labeled stubs in every OFFER body; nothing is ever charged, and no money
  event is ever emitted `settled: true`.
- workers.do serving lane, shared dashboard, unified analytics — extraction
  targets, not wave-zero requirements (§7.2).
- The row's own prerequisites stay open exactly as the register wrote them:
  **no category-grain name, no entry thesis** ("provisioning anything here
  is an Axis-2 kit decision, not a front") — G4 held pending #16; the
  thesis gap is carried, not cured, by this G3 build.
