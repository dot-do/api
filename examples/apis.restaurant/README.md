# apis.restaurant — wave zero of register row `restaurants-food-service`

The functions a restaurant's systems call: **the back-of-house
operational-artifact set — par levels, inventory counts, supplier invoices —
plus schema.org-typed order/menu records**, served as a payable machine-face
property per the property template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`), instantiated from
the full-economy register row `restaurants-food-service` (NAICS 722).

Register state: **name-only, ZONELESS** — apis.restaurant is held (porkbun,
exp 2027-07-25) with NO Cloudflare zone (Batch-S hours-class admin item;
blocks serving only, never the build). Nothing served this property before
this example. **apis.pizza and apis.catering are sub-verticals INSIDE this
property** per the property-grain ruling — the seed's pizza-shop (722513) and
caterer (722320) locations carry those grains; addresses of the same
instance, never separate builds. apis.kitchen / apis.recipes are
register-marked [UNVERIFIED assignment] to this row and are NOT claimed here.

## The two strata

- **G3 substrate** (`src/substrate.ts`): the `APIProduct` instance — Nouns
  (InventoryCount, ParLevel `native` estate-typed; SupplierInvoice, Order,
  Menu, Location `native` on real schema.org types), the System coordinate
  (Inventory⟨restaurant-back-of-house⟩ — the row's POS/OMS derived system is
  ruled avoid-class 3, 'POS commoditized': built once in the catalog, NEVER a
  front here; the served ply is the back-of-house inventory/par-level system
  the held artifact name parlevels.co points at), the operation set, the
  sandbox spec, one meter per operation. The `APIProduct` interface is local
  for now; its normative home is primitives.org.ai `digital-products`
  (prove-then-extract).
- **G4 projections** (`projections/*.json`): three non-exclusive configs on
  the one substrate — **apis.restaurant** (B2D, per-outcome pricing — SERVED
  by this worker), **apis.ax** (B2A, 402-metered, the #17 ladder — recorded),
  **data.mt** (B2D, credit packs — recorded). Non-exclusivity is the
  pricing-experiment mechanism. The B2A2B **counterpart-brand CANDIDATE is
  recorded** (not asserted): **parlevels.co**, the row's held DC
  artifact-grammar door — kitchen-manager vocabulary, zero API/agent
  vocabulary; the gigs.* doors are labor-supply, a different motion.

## Axis-2 only, and the source route stays honest

The row's ruled posture is **Axis-2 ONLY** (SC #23, avoid-class 3 at POS).
The route-if-provisioned is **first-party artifact capture** (par levels,
counts, invoices) at the rail — owned-by-construction. That route was **NOT
provisioned in-session**, so the wave-zero corpus is the **§5.2 labeled
synthetic seed** — recorded honestly, never unlabeled, never an improvised
class-A claim. Menu/order data is schema.org-public and crowded (the row's
avoid lane): nothing here is scraped. FSMA-204/EPCIS traceability rides the
agriculture-food row upstream, never claimed here.

## SHARED FACES, recorded (no primacy ruling)

Two record-type collisions are recorded in
`projections/apis.restaurant.json → sharedFaces`, per the batch primacy rule
(build under YOUR row key, record the collision, claim nothing shared):

- **Order** — shared with retail-ecommerce (SC #25 Offer/Order,
  schema.org + GS1 Digital Link).
- **SupplierInvoice** — adjacent to wholesale-distribution (X12 810 typed
  invoice) and the accounting-tax worked example's schema.org Invoice fallback.

## The machine face

Quartet + envelope + conneg emitted from ONE `defineSiteManifest()` via the
**vendored axp-faces generator** (`axp/`): **axp-faces 0.3.0** with
**axp-ext-rates-g2@0.2.0** native (extension digest `903e414d…`, the
pricing-survey ADOPT-NOW floor), pinned spec `apis-ax-axp@2.6.0` / digest
`a9a1197c…`. Vendored byte-identical from the axp.org.ai repo's COMMITTED
HEAD — branch `draft/axp-extension-rates-g2`, commit
`523c9ef217d54feefb0b20734a6d2996a6965b79` — via `git show`, digests recorded
in `axp/VENDORED.json`. The four extension members are native manifest
inputs, no bridges: top-level `rates[]`, top-level `g2`, `links.verify`,
per-route operationIds (route = MCP tool = suite ref = SDK functionName =
rates key; collections carry real verbs — `listInventoryCounts`).

The anon sandbox is the universal floor: `/inventory-counts` answers keyless
with 6 labeled synthetic month-end counts (a fictional restaurant group,
three fictional locations across the NAICS 722 grain, two full count cycles
with internally consistent food-cost arithmetic — opening + purchases −
counted = usage, July opens on June's counted value, invoices and orders
roll up exactly; fictional operator/suppliers, 00-prefix EINs, GS1
demo-prefix 952 GTINs with valid check digits).

```sh
cd core && pnpm install --ignore-workspace   # root manifest on this branch line names absent
                                             # workspace packages (pre-existing defect, filed upstream)
cd ../examples/apis.restaurant
npx tsx build.ts                  # bundles worker.ts → _worker.js
npx wrangler dev                  # http://localhost:8787

curl localhost:8787/inventory-counts
curl localhost:8787/pricing       # the rate card (rates[] per operation)
curl -X POST localhost:8787/inventory-counts/ic-peppercorn-2026-06/reconcile   # 402 OFFER
```

The gate (fail-closed, digest-pinned — the same requirement implementations
the hosted verifier runs; 20 tests, all green at commit time):

```sh
cd core && npx vitest run tests/apis-restaurant.test.ts
```

## Payable stubs — never fake billing

`reconcileInventoryCount` answers a real typed **402 OFFER** (per-outcome
rate, alternatives, checkout seam) and says in the body that it is a
**labeled stub**: the settlement rail is not activated (A1's charter),
`/checkout` cannot take payment, and no money event is ever fabricated.
Metering, money, receipt, and traffic **seams** are emitted as structured
logs tagged `{substrate, projection, motion, operation, shape, pattern}`
(spec §6.4/§7.4).

## §9.1 self-verify checklist (16 boxes, scored honestly): 16/16

| # | Box | State |
|---|---|---|
| 1 | G3 `APIProduct` authored; every Noun has schema + binding + verbs; System coordinate declared | PASS (tested) |
| 2 | Both plies from one definition (data collections = headless doors, same manifest rows) | PASS |
| 3 | Quartet from one `defineSiteManifest()` via vendored axp-faces at PINS.json digest | PASS (0.3.0, ext 0.2.0 digest `903e414d…`, vendored from axp.org.ai `523c9ef2…` committed HEAD via git show, byte-digests verified) |
| 4 | Local conformance green at pinned digest, fail-closed | PASS with DISCLOSURE: vendored axp-faces 0.3.0 exports no `describeConformance` — the probe ladder runs in-process via api.qa's `assertConforms` at the pinned digest (`tests/apis-restaurant.test.ts`, fail-closed loader; the same requirement implementations the hosted verifier runs) |
| 5 | Anon sandbox floor: keyless 200 OK, substantive labeled seed, exercises every operation, fixture law | PASS (tested — incl. 952-prefix GTIN check-digit validity) |
| 6 | Rate card served: model, hardCeiling, binding axis, rows lawful, `rates[].operation` ⊆ operationIds | PASS (tested; survey-floor vocabulary — zero-price rows carry no freeQuota) |
| 7 | `motion` declared; shapes from the motion's permissible set; B2A projections id.org.ai + 402 only | PASS (B2D served; B2A recorded config uses the #17 ladder, no OAuth/CC) |
| 8 | 402 OFFER advertises per motion (B2D: checkout + OAuth free tier) | PASS (tested) |
| 9 | B2A2B/C counterpart brand named OR gap recorded | PASS — CANDIDATE RECORDED (parlevels.co, the row's held human-vocabulary artifact door; not asserted, §9.3-triggered) |
| 10 | G4 projection config complete per §2 | PASS (3 projections; served one carries adminState, subVerticals, sharedFaces, counterpartBrand, account) |
| 11 | Guardrail: agent-default claimant never beaten on same-shape identical calls | PASS (vacuous — no agent-default claim served, no sibling face serves this substrate yet; claim withheld per §4.6) |
| 12 | `/verify` published; `interfaces.testSuite` undeclared until digest-pinned | PASS (tested) |
| 13 | Seams emitted with §6.4 tags; traffic events carry identity class + referral | PASS |
| 14 | Conneg matrix spot-checked; demo data labeled | PASS (tested) |
| 15 | No ghost surfaces (presence-when-true) | PASS (tested) |
| 16 | Face registered in the platform account | PASS — registered via door A: row in `packages/rail-ledger/registry/faces.json` (ax repo, branch `draft/rail-ledger-v1`); `account` address recorded in `projections/apis.restaurant.json` |

## Deliberately absent (presence-when-true)

- `interfaces.testSuite` — `/verify` is published and `links.verify` names
  it, but no digest-pinned suite document in an api.qa dialect is authored
  yet; declaring one would arm strict verification against a document that
  does not answer. Omission is full conformance.
- Agent-default positioning — **withheld** until the §4.6 worthiness bar
  attests. Copy stays claim-free.
- OAuth enforcement — `/login` → `/callback` runs in labeled demo mode until
  a GitHub OAuth app is configured; keys are random, unpersisted, unenforced.
- Committed-subscription tier — no rate-card row until it exists.
- A POS/OMS front — ruled avoid-class 3; the abstraction lives in the
  catalog, never here.
- Workspace counts in the branching collection — the generator's collection
  serves the versioned seed; ephemeral workspace counts are visible via
  `getInventoryCount` and the MCP list tool (disclosed retention).
- RPC / CapnWeb / full HATEOAS transports — arrive with the workers.do lane
  (spec §7.2 extraction target); only what serves is declared.
- Ladder rungs above the anon sandbox on the MCP door — only the mounted
  rung is advertised (the MCP door is the authless sandbox rung; keyed rungs
  sit above it, not on this door).
