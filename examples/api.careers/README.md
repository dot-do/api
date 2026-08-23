# api.careers — wave zero

The payable machine face for the **staffing-talent** register row (Staffing &
Talent Placement, NAICS 5613), instantiated from the property-template spec
(`studio/docs/plans/2026-08-23-property-template-spec.md`). The substrate is
shared by design with the **fn-hr-talent** Function row — one cell, two
register addresses, one primary name; the vertical row leads.

## What serves

| Face | Where | How it is produced |
|---|---|---|
| AXP quartet (card, openapi, pricing, llms.txt) | `/.well-known/agents.json`, `/openapi.json`, `/pricing`, `/llms.txt` | generated from ONE `defineSiteManifest()` (`src/manifest.ts`) by the vendored `axp-faces` generator (`src/axp/`, byte-identical at the PINS.json digest — never hand-rolled, never edited here) |
| Branching collection | `GET /placements` | Clauses 4+7 on one pathname: keyless OK, knownEmpty ×2, knownForbidden ×2, over-ceiling → 402 OFFER |
| Data ply | `GET /candidates` `/job-orders` `/occupations` (+`/{id}`) | O*NET-typed records from the substrate definition (`src/substrate.ts`) |
| Headless ply (ATS doors) | `POST /placements` `/candidates` `/job-orders` | the SAME collections, same envelopes, same rate rows — system-of-record writes into an auto-minted ephemeral sandbox workspace |
| MCP | `POST /mcp` | JSON-RPC tools/list + tools/call over the same operation registry (one definition) |
| G2 coordinates | `GET /icp.json` | the register row's ICP/personas/motion, on the wire (stake #6) |
| Verify export | `GET /verify` | the runnable suites, digest-pinned |

## Data provenance (labeled, always)

- **Occupation** records: real excerpt of **O*NET-SOC 29.0** (U.S. DOL, CC BY
  4.0) — ingested G1 reference vocabulary, source-attributed on every record.
- **Candidate / JobOrder / Placement** seed: **synthetic example data**
  (`"example": true` + label on every record). The row's class-A source route
  (the studio's own recruiting engine) is not reachable from this build and is
  personal data besides — §5.2 mechanical synthetic seed applies. The sandbox
  is the real product over simulated data, never a faked demo.

## Money truth

Pricing is `metered` with `binding: false` and a statement on the wire:
**test mode — settlement is not active; 402 responses are typed offer
boundaries served as labeled stubs; no billing occurs.** The 402 OFFER
advertises the whole B2A ladder (`pay-402` / `work-earned-credits` /
`claim-workspace`) — the ledger and claim doors are stubs and say so.
Metering/money/signup seams are emitted as structured events tagged
`{substrate, projection, motion, operation, shape, pattern}` (§6.4).

## Run

```sh
pnpm install          # devDeps: vitest + autonomous-qa (link:../../../api.qa)
                      # the link: path resolves from the canonical home
                      # (~/projects/api); from a worktree, point it at your
                      # local api.qa checkout (npm needs file:, pnpm takes link:)
pnpm test             # 22 tests: pinned AXP conformance (apis-ax-axp@2.6.0,
                      # digest a9a1197c…, fail-closed) + the property suite
pnpm dev              # wrangler dev (local only — see blocker below)
```

Drift gate for the vendored generator (run from `axp.org.ai/packages/axp-faces`):

```sh
node scripts/vendor.mjs <this-dir>/src/axp --check
```

## Known gaps (recorded, not patched around)

1. **No Cloudflare zone for api.careers** (name held at porkbun to 2027-07-19,
   zone-less; provisioning staged-not-applied per the register). This worker
   cannot deploy to the domain until the zone exists — founder-visible blocker.
2. Generator gaps at axp-faces 0.1.0, to file upstream (never patched locally):
   no top-level `rates[]` in the Pricing Document (rate card rides
   `pricing.offers[0].rates`); no `operationId` passthrough on manifest routes;
   no `links.verify` on the generated card (`/verify` is declared as a live
   GET route instead).
3. `interfaces.testSuite` deliberately not declared until the `/verify`
   document is digest-pinned (declaring arms the strict published-suite check).
4. "Agent default" positioning is **withheld**: the §4.6 worthiness bar needs a
   hosted api.qa verdict at the live domain, which needs the zone.

## Rail ledger (§9.1 final box)

Face registered in the rail ledger (faces-payable/week denominator):
registered via LEDGER.md door A — row in
`packages/rail-ledger/registry/faces.json` @ `draft/rail-ledger-v1`
(studio #9 alignment pass 2026-08-23); readout
https://ledger.apis.ax/readouts/faces-payable (service built, deploy pending
Batch-S). The served projection config records the address in its
`railLedger` field. One registry row covers the shared staffing-talent /
fn-hr-talent cell (byte-identical siblings; face api.careers).
