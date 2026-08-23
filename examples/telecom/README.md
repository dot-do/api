# telecom — wave-zero property (register row `telecom`, NAICS 517)

The full-economy register row `telecom` instantiated per the property-template
spec (studio `docs/plans/2026-08-23-property-template-spec.md`), **batch 4**
(sector-regulator feed ingest).

**TRUE-ZERO GAP ROW:** zero names held AND zero named acquisition candidates —
one of the register's true zero rows. Per spec §0 a GAP row instantiates
everything except the G4 brand config; this build is the placeholder-key G3
build per the D-row precedent, serving at **telecom.org.ai** (row-key
placeholder). G4 brand attachment is held pending #16.

## What serves

| Door | What | Data |
|---|---|---|
| `GET /port-orders` | the branching keyless collection (anon-sandbox universal floor) — LNP port orders at the LOA grain | labeled synthetic |
| `GET /port-orders/{id}` | one port order with LOA reference + FOC state | labeled synthetic |
| `POST /ports` | order a completed, verified number port — the per-outcome payable door; typed 402 OFFER, **labeled stub, no live settlement** | — |
| `GET /numbering-resources[/{id}]` | **REAL public NANPA NPA registry data** (444 records), corpus provenance served with it | real, ingested |
| `GET /coverage-records[/{id}]` | serviceability at the address grain | labeled synthetic |
| `GET /usage-records[/{id}]` | rated usage (CDR grain) + derived cycle summary | labeled synthetic |
| `POST /mcp` | authless MCP door (anon-sandbox rung) — 9 tools = the 9 operationIds | same definitions |
| quartet | `/.well-known/agents.json` · `/openapi.json` · `/pricing` · `/llms.txt` + `/verify` | generated |

Two plies, one manifest (spec §3): the same collections are the data face and
the reseller OSS/BSS system door; there is no second API.

## Source-route probes (honest, in-session, 2026-08-23)

- **NANPA NPA report** (`reports.nanpa.com/public/npa_report.csv`): 200 OK
  keyless → **ingested** (`scripts/ingest-numbering.mjs` → `seed-numbering.js`,
  provenance on the corpus; reseed is a build step).
- **FCC License View API**: 301 → 403 Access Denied (edge block) — recorded,
  deferred; SpectrumLicense noun enters when a reachable route exists.
- **FCC National Broadband Map API**: 401 — recorded, deferred.

Real data is never labeled example; synthetic data always is (fixture law:
555-01XX numbers only, EXAMPLE SPIDs, X99- OCNs, fictional names/addresses).

## Machine face

Vendored **axp-faces@0.3.0** at the committed PINS.json digest, from the
axp.org.ai repo branch `draft/axp-extension-rates-g2` **committed HEAD
`523c9ef217d54feefb0b20734a6d2996a6965b79`** (git show, never the working
tree; per-file sha256 verified — `axp/VENDORED.json`). The four
**axp-ext-rates-g2@0.2.0** fields (digest `903e414d…`) are emitted
**natively — no bridge file exists**: top-level `rates[]`, top-level `g2`,
`links.verify`, `operationId` on every route; MCP tools are string
operationIds; the collection's operationId is the real verb
`listPortOrders`. Survey-floor vocabulary: `included` allowances, no
`freeQuota`, nothing withheld, no reserved member names.

Pinned spec: `apis-ax-axp@2.6.0`, digest `a9a1197c…` (24 requirements) —
fail-closed gates in `test/conformance.test.js` and `scripts/selfverify.mjs`.

## Run the gates

```sh
pnpm install
pnpm test        # digest-pinned conformance gate (24/24)
pnpm verify      # full §9.1 selfverify (conformance + suite + fixture + rate-card + native placements)
pnpm ingest      # reseed the real NANPA corpus
```

Status at commit: conformance **24/24**, published suite **24/24 rows**,
selfverify **SELF-VERIFY PASSED** (zero defects).

## §9.1 checklist — 15/16 pass

| # | Box | Verdict |
|---|---|---|
| 1 | G3 `APIProduct` authored (nouns: schema + binding + verbs; System coordinate declared) | ✅ (`product.js`; OSS/BSS coordinate carried **verbatim with the register's [UNVERIFIED] caveat** — register defect noted below) |
| 2 | Both plies from one definition | ✅ one manifest, one worker |
| 3 | Quartet from `defineSiteManifest()` via vendored axp-faces at PINS digest | ✅ 0.3.0, hashes verified |
| 4 | Local conformance green at pinned digest, fail-closed | ✅ 24/24 via `gradePinned`/`assertConforms` at `--expect-digest` |
| 5 | Anon sandbox floor: keyless 200 OK, substantive labeled seed, every operation exercised, fixture law | ✅ selfverify fixture section all green |
| 6 | Rate card served; metered members complete; every row free-quota-or-zero; `rates[].operation ⊆ operationIds` | ✅ (survey-floor form: reads price from zero with `included` allowances; the one positive row is the per-outcome door whose free floor is the sandbox, named in its `note`) |
| 7 | `motion` declared; shapes from the motion's set; B2A gates never OAuth/CC | ✅ B2A, `projection.config.json` |
| 8 | 402 OFFER advertises the ladder via `alternatives` | ✅ **mounted rungs only** per the batch ruling (sandbox + pay-stub; work/claim not mounted, not advertised) |
| 9 | B2A2B/C counterpart brand named or gap recorded | ✅ **counterpart-brand gap recorded** (true-zero row — no human-vocabulary name exists) |
| 10 | G4 projection config complete per §2 | ✅ (brand null per the GAP rule) |
| 11 | Guardrail: agent-default price never beaten same-shape | ✅ vacuously — no claim carried, no sibling projection exists |
| 12 | `/verify` export published; `interfaces.testSuite` only if it answers | ✅ served + digest-pinned; declaration withheld (GET-only suite@1 cannot cover the POST doors) |
| 13 | Seams emitted with §6.4 tags + identity class + referral | ✅ `seams.js` |
| 14 | Conneg matrix spot-checked; demo data labeled | ✅ curl→JSON / agent-UA→markdown / browser→HTML / never 406 / HEAD mirrors GET |
| 15 | No ghost surfaces (presence-when-true) | ✅ every declared door serves; unreachable feeds recorded, not declared |
| 16 | Face registered in the rail ledger | ⛔ **blocked-on-rail-ledger** — no committed ledger service/LEDGER.md/address convention in the ax repo (`draft/rail-ledger-v1` has only untracked working-tree files as of this build). Recorded, never stubbed. |

## Register defects filed upstream (spec §0 — not improvised here)

1. Headless ply `OSS/BSS` is [UNVERIFIED] against the 52-System catalog —
   needs the headless.ly catalog re-run at NAICS 517 (the row's own
   "cheapest next fact").
2. Row ICP is [UNVERIFIED] — carried verbatim with the mark.
