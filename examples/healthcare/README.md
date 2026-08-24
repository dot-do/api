# healthcare — wave zero of register row `healthcare`

The credentialing and enrollment functions a provider organization's systems
call: **a provider roster, credentials (licenses, board certifications,
registrations), payer-enrollment packets, prior-auth artifacts, eligibility
records, and superbills — non-PHI admin artifacts only**, served as a payable
machine-face property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`), instantiated from
the full-economy register row `healthcare` (NAICS 62).

**The build gate is LIFTED** (founder ruling, studio issue #9, 2026-08-23
evening): same regulation unlock as every regulated cell — the headless
system of record carries no regulatory blocker; **the licensed operator is
the customer**. The narrow **[COUNSEL] flag survives ONLY on publishing
person-anchored public-registry records as data** — a data-ply decision, not
a build blocker. That boundary is enforced and stated everywhere on this
surface (see below).

Register state: **name pair UNRESOLVED — this build claims NEITHER name.**
api.hospital (held, porkbun/2027-07-25, NO zone — the row's proposed primary,
ladder step 2, with the caveat on record that "hospital" names NAICS 622, not
all of 62) vs apis.healthcare (held, zoneless — the plural subject-form
breadth name) is an open **#33 curation item**; the cross-form pair is one of
the undefined pairs flagged in coverage A.6. The property is therefore built
under the **ROW KEY** on the placeholder face `healthcare.org.ai`; both
candidates are recorded in `projections/healthcare.org.ai.json →
nameCandidates`, and renaming is a one-line config + registry edit when the
register rules. Healthcare depth was NONE estate-wide before this example:
nothing served, supply doors only.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance — Nouns
  (Credential, Enrollment `native` — the credentialing/enrollment
  system-of-record door; Provider honestly `generated` — see the [COUNSEL]
  boundary below; PriorAuthArtifact, EligibilityRecord, Superbill `generated`
  — the disputed grains served as data only), the System coordinate
  (Credentialing⟨healthcare-provider-organizations⟩ — the SC #12 derived
  instantiation; the EHR abstraction stays in the 52-System catalog,
  Epic-class incumbents, NO instantiation), the operation set, the sandbox
  spec, one meter per operation. The `APIProduct` interface is local for now;
  its normative home is primitives.org.ai `digital-products`
  (prove-then-extract).
- **G4 projections** (`projections/*.json`): two non-exclusive configs on the
  one substrate — **healthcare.org.ai** (B2D, metered + per-outcome
  enrollment submission — SERVED by this worker on the row-key placeholder)
  and **apis.ax** (B2A, 402-metered, the #17 ladder — recorded).
  Non-exclusivity is the pricing-experiment mechanism. The B2A2B
  **counterpart-brand GAP is recorded** (spec §5.1/§9.3): the estate holds NO
  human-vocabulary credentialing name in this cell — the held artifact doors
  (priorauth, superbill, soapnotes) belong to the DISPUTED grains and the
  gigs.* health doors are labor-supply, a different motion.

## The entry-grain dispute — recorded, not resolved

The row's entry grain is OPEN (convergence §5 tension 2): **SC lands at
credentialing** (watchlist-gated V), **EO narrows to
scheduling/eligibility**, **DC enters at prior-auth/superbill artifacts**.
This build records the dispute in the served projection config and **builds
the credentialing System FIRST as the least-disputed grain**; the other two
contenders are served as data-ply record collections only (list/get + an
eligibility check inquiry) — no scheduling or prior-auth System is
instantiated or claimed. Resolution needs the shared per-market incumbency
probe (#22); nothing here forecloses it.

## The [COUNSEL] boundary — the data ply's standing rule

**NPPES/PECOS public credentialing registries are class-A sources (SC route
10: "the rare healthcare door whose source data is public and whose artifact
is not PHI") and MAY be ingested. Person-anchored public-registry records are
NOT published as a data product on this surface. Sandbox exposure is only
through clearly-labeled synthetic derivatives in the registry record shape.
Non-PHI admin artifacts only; no clinical (FHIR-clinical) resource is
served.**

Probed honestly this session (2026-08-23): the public NPPES v2.1 API
(`npiregistry.cms.hhs.gov/api/?version=2.1`) answered an NPI-2 organization
query with `result_count: 1` and the documented record shape — class A
confirmed. **Zero probed records were ingested into or shipped from this
corpus.** Notably, even the NPI-2 *organization* record carries
person-anchored fields (`authorized_official_first_name/last_name/…`), which
is exactly why the boundary binds at the record grain, not the enumeration
type: the synthetic derivative deliberately reproduces none of them, and
providers appear as **role labels, never names**, with a `provenance` stamp
on every record. Flipping the Provider binding `generated → ingested` is
gated on counsel sign-off on the **publishing** boundary — never on the
build. The boundary is stated in this README, in `/llms.txt`, on the HTML
landing, in both projection configs, and tested in
`core/tests/healthcare.test.ts`.

FHIR (65 resources) is the sector-settled schema per the row; the
schema-settledness advantage applies **only to the admin edge** served here
(Practitioner-typed roster records, qualification-grain credentials).
X12 remains the admin interchange anchor: 834 enrollment is named in the
estate regulation-decomposition set; the 270/271 eligibility and 278
prior-auth set numbers are row-marked [UNVERIFIED] and are not restated as
verified by this build.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`): **axp-faces 0.3.0** with
**axp-ext-rates-g2@0.2.0** native (extension digest `903e414d…`), pinned spec
`apis-ax-axp@2.6.0` / digest `a9a1197c…`. Vendored byte-identical from the
axp.org.ai repo's **COMMITTED main** — commit
`da9a166a7620d5943277634c3507fe50b7e628a2` (the post-merge HEAD, ≥ the
rates-g2 merge) — via `git show`, digests recorded in `axp/VENDORED.json`.
The four extension members are native manifest inputs, no bridges: top-level
`rates[]`, top-level `g2`, `links.verify`, per-route operationIds (route =
MCP tool = suite ref = rates key — the five-surface operationId invariant;
collections carry real verbs — `listProviders`).

The anon sandbox is the universal floor: `/providers` answers keyless with 8
labeled synthetic roster records for a fictional provider group ("Cascade
Ridge Medical Group (demo)") in a fictional city (Bellhaven) — spanning the
ambulatory (621) and hospital (622) grains, credentials in every lifecycle
status the filters branch on, the full PECOS-grain enrollment lifecycle
(draft → ready → submitted → approved), prior-auth artifacts in every
disposition, eligibility records for both fictional payers, and superbills
whose line items sum exactly to their totals. All identifiers are
DEMO-namespace (a `DEMO-` prefixed NPI is outside the real checksummed NPI
namespace by construction; `DEMO-` procedure codes claim no licensed code
set).

```sh
cd core && pnpm install --ignore-workspace   # root manifest on this branch line names absent
                                             # workspace packages (pre-existing defect, filed upstream)
cd ../examples/healthcare
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/providers
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl "localhost:8787/eligibility-records/check?providerId=prov-2&payerId=payer-bellhaven-mutual"
curl -X POST localhost:8787/enrollments/enr-2/submit   # 402 OFFER (per-outcome)
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs):

```sh
cd core && npx vitest run tests/healthcare.test.ts
```

## Payable stubs — never fake billing

`submitEnrollment` answers a real typed **402 OFFER** (per-outcome rate,
alternatives, checkout seam) and says in the body that it is a **labeled
stub**: the settlement rail is not activated (A1's charter), `/checkout`
cannot take payment, no packet leaves the sandbox, and no money event is
ever fabricated. Metering, money, receipt, and traffic **seams** are emitted
as structured logs tagged `{substrate, projection, motion, operation, shape,
pattern}` (spec §6.4/§7.4).

## §9.1 self-verify checklist (16 boxes, scored honestly): 16/16

| # | Box | State |
|---|---|---|
| 1 | G3 `APIProduct` authored; every Noun has schema + binding + verbs; System coordinate declared | PASS (tested) |
| 2 | Both plies from one definition (data collections = headless doors, same manifest rows) | PASS |
| 3 | Quartet from one `defineSiteManifest()` via vendored axp-faces at PINS.json digest | PASS (0.3.0, ext 0.2.0 digest `903e414d…`, vendored from axp.org.ai COMMITTED main `da9a166a…` via git show, byte-digests verified) |
| 4 | Local conformance green at pinned digest, fail-closed | PASS with DISCLOSURE: vendored axp-faces 0.3.0 exports no `describeConformance` — the probe ladder runs in-process via api.qa's `assertConforms` at the pinned digest (`core/tests/healthcare.test.ts`, fail-closed loader; the same requirement implementations the hosted verifier runs) |
| 5 | Anon sandbox floor: keyless 200 OK, substantive labeled seed, exercises every operation, fixture law | PASS (tested — incl. the [COUNSEL] fixture rules: role labels, DEMO-namespace NPIs, provenance stamps, no NPPES person-anchored fields) |
| 6 | Rate card served: model, hardCeiling, binding axis, rows lawful, `rates[].operation` ⊆ operationIds | PASS (tested; survey-floor vocabulary — zero-price rows carry no freeQuota) |
| 7 | `motion` declared; shapes from the motion's permissible set; B2A projections id.org.ai + 402 only | PASS (B2D served; B2A recorded config uses the #17 ladder, no OAuth/CC) |
| 8 | 402 OFFER advertises per motion (B2D: checkout + OAuth free tier) | PASS (tested) |
| 9 | B2A2B/C counterpart brand named OR gap recorded | PASS — GAP RECORDED (no human-vocabulary credentialing name held; the held artifact doors belong to the disputed grains; gigs.* doors are labor-supply) |
| 10 | G4 projection config complete per §2 | PASS (2 projections; served one carries nameCandidates, grainDispute, counselBoundary, counterpartBrand, railLedger) |
| 11 | Guardrail: agent-default claimant never beaten on same-shape identical calls | PASS (vacuous — no agent-default claim served, no sibling face serves this substrate yet; claim withheld per §4.6) |
| 12 | `/verify` published; `interfaces.testSuite` undeclared until digest-pinned | PASS (tested) |
| 13 | Seams emitted with §6.4 tags; traffic events carry identity class + referral | PASS |
| 14 | Conneg matrix spot-checked; demo data labeled | PASS (tested) |
| 15 | No ghost surfaces (presence-when-true) | PASS (tested) |
| 16 | Face registered in the rail ledger | PASS — registered via door A: `healthcare.org.ai` row in `packages/rail-ledger/registry/faces.json` (ax repo, branch `draft/rail-ledger-v1`); `railLedger` pointer recorded in `projections/healthcare.org.ai.json`. A GAP-style placeholder host registers under the row key per LEDGER.md §3 — renaming later is a one-row edit |

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests. Copy stays claim-free.
- A brand name — the #33 pair is unresolved; the face serves the row key and
  the register decides.
- Real registry records — the [COUNSEL] publishing boundary (above); the
  Provider binding stays `generated` until counsel signs off on publishing.
- A prior-auth or scheduling System — disputed grains, served as data only.
- An EHR — contested (Epic-class incumbents); the abstraction stays in the
  52-System catalog.
- A payer roster product — the top rung of the row ladder; recorded as the
  buyer persona, nothing served.
- OAuth enforcement — `/login` → `/callback` runs in labeled demo mode until
  a GitHub OAuth app is configured; keys are random, unpersisted, unenforced.
- Committed-subscription tier — no rate-card row until it exists.
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.
- Ladder rungs above the anon sandbox on the MCP door — only the mounted
  rung is advertised (the MCP door is the authless sandbox rung; keyed rungs
  sit above it, not on this door).
