# api.management — fn-business-ops, wave zero

The operate face of an API estate: the rail a managing agent calls to operate
deployed APIs and systems. One register row in (`fn-business-ops`,
studio `docs/plans/registers/2026-08-23-full-economy-property-register.json`),
one payable machine-face property out, per the property-template spec
(studio `docs/plans/2026-08-23-property-template-spec.md`).

## What serves

| Surface | Address | Source |
|---|---|---|
| Capability card + probe manifest | `/.well-known/agents.json` | generated |
| OpenAPI 3.1 (live-only) | `/openapi.json` | generated |
| Pricing Document | `/pricing` (+ `.json/.md/.html`) | generated |
| Agent front door | `/llms.txt` | hand-written body + generated tail |
| Branching collection (Clauses 4+7) | `/processes` | generated from the seed |
| Data-ply collections | `/kpis` · `/objectives` | site routes, same envelope law |
| Headless operate door (ERP⟨management-operations⟩) | `/properties` | same definition, same envelopes |
| G2 coordinates (card `links.icp`) | `/icp.json` | projection config |
| Run-our-tests page | `/verify` | this repo's conformance gate |
| MCP door (JSON-RPC over HTTP) | `POST /mcp` | same Nouns/verbs as HTTP |
| 402 OFFER boundary | `/offer`, `/processes?spend=>ceiling` | generated; B2A ladder in `alternatives` |
| Family registry | `/family.json` | verified-serving siblings only |
| Home (three-faced, conneg) | `/` | manifest |

Quartet + envelopes + conneg are emitted by **vendored `axp-faces`** at the
ratified pin `apis-ax-axp@2.6.0` (digest `a9a1197c…`; byte-identity against
`vendor/axp-faces/PINS.json` is asserted — never hand-rolled).

## The two strata

- **G3 substrate** (`substrate.js`): Nouns Process / KPI / Objective /
  ManagedProperty with schema + binding + verbs; System coordinate
  ERP⟨management-operations⟩; APQC PCF as the public typed spine (the row
  records no interchange standard — this Function's records are
  business-as-code primitives). Money-shaped records belong to the finance
  facet per #22 and are absent by design.
- **G4 projection** (`projection.js`): brand api.management, **motion B2A**
  (the buyer is the managing agent — no OAuth, no card on file, the #17
  ladder exclusively), 402-metered experiment registered, agent-default claim
  **withheld** until the §4.6 worthiness bar passes.

## Sandbox and pricing truth

The anon sandbox is the live product over **clearly-labeled simulated data**:
every seed record carries `"example": true`, no real company or person names,
deterministic reseed as a build step (`buildSeed()`, seed spec versioned).
Metering is a **test-mode stub and says so on the wire**: the Pricing
Document declares `binding: false` with a statement in plain words; the OFFER
body's `alternatives` (pay / work / claim) are each labeled `status: "stub"`;
no `checkoutUrl` exists anywhere — never fake billing.

## Verify

```sh
npm install && npm test   # 24/24 pinned requirements in-process + the §9.1 face checks
npm run dev               # wrangler dev
```

## Domain control (why no route is wired)

api.management is estate-CONTROLLED but irregular: CF zone in the
Semantics.dev account, Vercel-verified on team longtailstudio, **registrar
paper [UNVERIFIED]** (RDAP: Sav.com; absent from the stale Sav export).
`wrangler.jsonc` deliberately carries no routes until control is confirmed
(the register row's graduated task: log into Sav). apis.management is NOT
held (third-party Gandi, exp 2026-10-30) — opportunistic acquisition per #3.

## Deferred (template §7.3 MAY-defer column)

- Serving from the unified workers.do lane (custom worker is deliberate — prove-then-extract)
- Shared developer dashboard integration (seams emitted now)
- Per-brand MDX layer on the shared renderer
- Unified analytics/monitoring plane (seams are structured logs at wave zero)
- apps.ax-generated app projections
- Live settlement activation (A1's charter; test-mode counts as face-payable)

## Open items filed upstream (never patched locally)

- `axp-faces` route-level `operationId`s: site routes beyond the generator's
  own four carry method+path only in the emitted contract.
- Rate-card `rates[]` extension (per-operation prices, `freeQuota`) — template
  spec Open Question 1; per-operation rates live in `projection.js` until the
  Pricing Document shape is ratified.
- `interfaces.testSuite` declaration — made only when a digest-pinned suite
  document answers at its address (A.8.5), not before.
