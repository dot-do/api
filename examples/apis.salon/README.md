# apis.salon — wave-zero property (register row `personal-care`, NAICS 812)

The full-economy register row `personal-care` instantiated per the
property-template spec (studio `docs/plans/2026-08-23-property-template-spec.md`),
batch 7 (C-class per-property booking/POS first-party capture).

**Ruled primary name:** apis.salon (register ladder rung 3 — held, covers the
8121 hair/nail/skin core; the 812 apex incl. laundry and death care stays
unnamed). apis.beauty is the recorded alternative and expires 2026-10-22 — a
Batch-S dated admin fact, not a sequencing input.

## What serves

| Door | What | Data |
|---|---|---|
| `GET /bookings` | the branching keyless collection (anon-sandbox universal floor) — salon appointments at the Reservation grain | labeled synthetic |
| `GET /bookings/{id}` | one booking with its service, practitioner, derived status | labeled synthetic |
| `POST /bookings` | request a confirmed booking — the per-outcome payable door; typed 402 OFFER, **labeled stub, no live settlement** | — |
| `GET /service-offers[/{id}]` | the service menu at the Offer grain | labeled synthetic |
| `GET /sale-records[/{id}]` | POS sale records settling completed bookings + derived period summary | labeled synthetic |
| `GET /establishment-licenses[/{id}]` | **REAL public TDLR salon-license registry data** (1,387 records — every Travis County Full Service Establishment), corpus provenance + disclosed curation served with it | real, ingested |
| `POST /mcp` | authless MCP door (anon-sandbox rung) — 9 tools = the 9 operationIds | same definitions |
| quartet | `/.well-known/agents.json` · `/openapi.json` · `/pricing` · `/llms.txt` + `/verify` | generated |

Two plies, one manifest (spec §3): the same collections are the data face and
the salon booking/POS system door; there is no second API.

## Booking-record primacy (the lodging check, applied here)

THE BOOKING record (schema.org Reservation grain) is named by multiple
register rows (lodging, travel-tourism, passenger-mobility,
restaurants-food-service, arts-entertainment). **No primacy ruling exists in
the register** (checked 2026-08-23). Per the standing batch rule this row
builds its Booking **under its own row key** (`personal-care`), records the
collision (`product.js`, `projection.config.json`), and **claims nothing
shared**.

## Source-route probes (honest, in-session, 2026-08-23)

- **TDLR All Licenses** (`data.texas.gov/resource/7358-krk7.json`): 200 OK
  keyless → **ingested** (`scripts/ingest-licenses.mjs` → `seed-licenses.js`,
  provenance on the corpus; reseed is a build step). Scope: every Travis
  County Full Service Establishment license — complete within that stated
  one-county, one-class bound. **Disclosed curation:** owner names, phones,
  street/mailing addresses, geocodes withheld (owner names are frequently
  personal names of sole proprietors); the withheld-field list is served in
  the provenance.
- **Individual practitioner licenses** (TDLR, reachable): deferred as a
  curation decision — person-named public records need their own ruling
  before serving. Reachability recorded honestly; serving withheld
  deliberately.
- **NY licensing open data** (guessed resource `w6t6-dwrk`): 404
  dataset.missing — recorded, deferred; no NY corpus and no claim about one.

Real data is never labeled example; synthetic data always is (fixture law:
555-01XX numbers only, EXAMPLE license-shaped ids, fictional names/addresses,
anti-collision check of the fictional salon name against the real corpus).

## Machine face

Vendored **axp-faces@0.3.0** at the committed PINS.json digest, from the
axp.org.ai repo branch `draft/axp-extension-rates-g2` **committed HEAD
`523c9ef217d54feefb0b20734a6d2996a6965b79`** (git show, never the working
tree; per-file sha256 verified — `axp/VENDORED.json`). The four
**axp-ext-rates-g2@0.2.0** fields (digest `903e414d…`) are emitted
**natively — no bridge file exists**: top-level `rates[]`, top-level `g2`,
`links.verify`, `operationId` on every route; MCP tools are string
operationIds; the collection's operationId is the real verb `listBookings`.
Survey-floor vocabulary: `included` allowances, no `freeQuota`, nothing
withheld, no reserved member names.

Pinned spec: `apis-ax-axp@2.6.0`, digest `a9a1197c…` (24 requirements) —
fail-closed gates in `test/conformance.test.js` and `scripts/selfverify.mjs`.

## Run the gates

```sh
pnpm install
pnpm test        # digest-pinned conformance gate (24/24)
pnpm verify      # full §9.1 selfverify (conformance + suite + fixture + rate-card + native placements)
pnpm ingest      # reseed the real TDLR license corpus
```

Status at commit: conformance **24/24**, published suite **24/24 rows**,
selfverify **SELF-VERIFY PASSED** (zero defects).

## §9.1 checklist — 16/16 pass

| # | Box | Verdict |
|---|---|---|
| 1 | G3 `APIProduct` authored (nouns: schema + binding + verbs; System coordinate declared) | ✅ (`product.js`; Scheduler/Booking + POS coordinates carried **with the register's [UNVERIFIED] catalog caveat verbatim** — register defect noted below) |
| 2 | Both plies from one definition | ✅ one manifest, one worker |
| 3 | Quartet from `defineSiteManifest()` via vendored axp-faces at PINS digest | ✅ 0.3.0, hashes verified against the committed PINS.json |
| 4 | Local conformance green at pinned digest, fail-closed | ✅ 24/24 — **DISCLOSED:** the vendored axp-faces ships no `describeConformance`, so the probe ladder runs in-process via autonomous-qa's `gradePinned`/`assertConforms` at `--expect-digest` (the deployed verifier's own code path) |
| 5 | Anon sandbox floor: keyless 200 OK, substantive labeled seed, every operation exercised, fixture law | ✅ selfverify fixture section all green (incl. the booking↔POS ledger ties and the real-corpus anti-collision check) |
| 6 | Rate card served; metered members complete; every row free-quota-or-zero; `rates[].operation ⊆ operationIds` | ✅ (survey-floor form: reads price from zero with `included` allowances; the one positive row is the per-outcome booking door whose free floor is the sandbox, named in its `note`) |
| 7 | `motion` declared; shapes from the motion's set; B2A gates never OAuth/CC | ✅ B2A, `projection.config.json` (the agent-side leg of the cell's native B2A2C shape) |
| 8 | 402 OFFER advertises the ladder via `alternatives` | ✅ **mounted rungs only** per the batch ruling (sandbox + pay-stub; work/claim not mounted, not advertised) |
| 9 | B2A2B/C counterpart brand named or gap recorded | ✅ **counterpart-brand gap recorded** (no human-vocabulary name held for the cell; §9.3 diagnostic armed at the seams) |
| 10 | G4 projection config complete per §2 | ✅ |
| 11 | Guardrail: agent-default price never beaten same-shape | ✅ vacuously — no claim carried, no sibling projection exists |
| 12 | `/verify` export published; `interfaces.testSuite` only if it answers | ✅ served + digest-pinned; declaration withheld (GET-only suite@1 cannot cover the POST doors) |
| 13 | Seams emitted with §6.4 tags + identity class + referral | ✅ `seams.js` |
| 14 | Conneg matrix spot-checked; demo data labeled | ✅ curl→JSON / agent-UA→markdown / browser→HTML / never 406 / HEAD mirrors GET (the four pinned conneg checks + suite home-face rows) |
| 15 | No ghost surfaces (presence-when-true) | ✅ every declared door serves; reachable-but-deferred feeds recorded, not declared |
| 16 | Face registered in the platform account | ✅ **door A** — row in `packages/rail-ledger/registry/faces.json` (ax repo, `draft/rail-ledger-v1`); `account: https://apis.ax/account/faces?face=apis.salon` in the projection config |

## Register defects filed upstream (spec §0 — not improvised here)

1. Headless ply: salon management's membership/rank in the ~52-System
   catalog is [UNVERIFIED] in the row — needs the headless.ly catalog re-run
   at NAICS 812.
2. Source route: no cascade row exists for 812; the row's booking/POS
   capture posture is itself marked [UNVERIFIED — posture inferred]. Carried
   verbatim.
3. A person-anchored-records curation ruling is needed before the reachable
   TDLR individual-practitioner license grain (person-named) can serve.
