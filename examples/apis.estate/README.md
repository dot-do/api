# apis.estate — wave zero

The wave-zero instantiation of the full-economy register row **`real-estate`**
(Real Estate & Closings, NAICS 53) as the property **apis.estate**, built to
the payable machine-face template (`docs/plans/2026-08-23-property-template-spec.md`
in the studio repo, §7.3 wave-zero MUSTs).

**Scope, permanent (register ruling).** The MONEY/ESCROW LAYER IS EXCLUDED —
licensure plus the A1 settlement-module gate. No door on this substrate
holds, moves, disburses, or instructs the movement of funds. Mechanically
enforced: the `escrow` query scope answers BLOCKED 403; escrow/disbursement/
wire document kinds are refused at the assembly door; no packet carries a
settlement statement.

**Property grain.** apis.apartments, apis.house, apis.rentals, apis.lease and
apis.land are sub-audience rails **within this property** (content, not
separate brands, per the register's property-grain ruling). They serve
nothing today, so they are linked nowhere (presence-when-true); the
projection config records them.

**Shared face.** The LienWaiver record type is literally shared with the
construction row (SC #10/#13); no projection-primacy ruling exists, so the
Noun is built under this row's key with the collision recorded in
[REGISTER-NOTE.md](./REGISTER-NOTE.md) — nothing shared is claimed.

**No positioning is carried.** The agent-default claim is withheld until the
§4.6 worthiness bar is attested; no ranking is implied anywhere on this
surface. Every served record is labeled example data.

## Layout

| File | Stratum | What it is |
|---|---|---|
| `src/product.js` | A (G3) | The `APIProduct` instance: Nouns (ClosingPacket, LienWaiver, PayoffLetter, Deed — generated; TransactionFile, PacketDocument — native) with schema + binding + verbs; the TransactionManagement System coordinate |
| `src/projection.js` | B (G4) | The projection config: brand, ICP + personas, motion **B2A**, offer array (rung 0 mounted; rungs 1–3 recorded unmounted), pricing pattern, experiment registration, counterpart brand (closings.services, staged), sub-audience rails |
| `src/manifest.js` | face | The ONE site manifest — every machine face generates from it; the four axp-ext-rates-g2 members (top-level `rates[]`, top-level `g2`, `links.verify`, per-route `operationId`) declared **natively** at their ruled placements, no bridges |
| `src/axp-faces/` | face | The shared generator, vendored byte-identical from the axp.org.ai repo's **committed HEAD `523c9ef`** on `draft/axp-extension-rates-g2` (`git show`, never the working tree): axp-faces **0.3.0**, pinned `apis-ax-axp@2.6.0` digest `a9a1197c…`, extension `axp-ext-rates-g2@0.2.0` digest `903e414d…`; never edited here (VENDORED.json is the byte authority) |
| `src/seed.js` | §5.2 | The labeled synthetic sandbox seed: 3 closing packets (documents referentially intact), 3 lien waivers, 2 payoff letters, 2 deeds — fictional counties ("ZZ"), fictional parties, synthetic zz-prefixed identifiers, `example: true` + `[demo]` prefix on every record |
| `src/worker.js` | serving | Both plies from the one definition: data face (typed collections), headless transaction-file door (mint/assemble — documents only, never funds), MCP door at `/mcp` (authless — only the anon-sandbox rung is mounted), §7.4 seams |
| `src/mcp.js` / `src/verify.js` / `src/seams.js` | — | MCP tools = the canonical operationIds; the published `api.qa/suite@1` suite at `/verify/suite.json`; tagged meter/money/receipt seams |
| `spec/` | pin | The ratified spec copy + digest the local gate asserts against |
| `scripts/selfcheck.mjs` | gate | The §9.1 self-verify gate, fail-closed: vendor byte integrity, spec pin, **in-process `gradePinned` at the ratified digest** (needs a built `~/projects/api.qa` or `$AUTONOMOUS_QA`), fixture law, probe ladder, native extension placements, mounted-rungs-only OFFER, headless + MCP exercise, conneg, ghost-surface sweep, seam shape. `node scripts/selfcheck.mjs` — **27/27 pass** as committed |

## Wave-zero decisions on record

- **Seed, not ingest (source-route honesty).** The row's source route is
  public-licensable county recorder/title ingest across ~3,100 counties with
  **no national interchange standard** and no single class-A feed reachable
  in-session (the register itself records the corpus as county-grained). So
  wave zero serves the §5.2 mechanically produced labeled synthetic seed —
  never a pretended ingest. Real-corpus ingest is deferred behind per-county
  data-door builds.
- **Native extension emission.** Vendored at axp-faces 0.3.0: `rates[]`
  top-level in the Pricing Document, `g2` top-level on the card,
  `links.verify` as a card link, `operationId` on every route — all generator-
  native manifest inputs; the batch-2 site-side bridge era is closed here.
- **Survey-floor vocabulary.** Rate rows carry `freeQuota` (metered model) or
  scalar zero prices; no reserved member names are used anywhere on the card
  or rate rows.
- **Mounted-rungs-only OFFER.** Only rung 0 (keyless anon sandbox) is
  mounted, so it is the only rung advertised in any OFFER `alternatives`;
  rungs 1–3 (earned credits / human-claimed / paid-402) are recorded in the
  projection config as unmounted, never sold as doors.
- **402 stub labeled.** `model: "metered"`, `binding: false` with the
  test-mode statement: metering seams are live, settlement is a labeled stub,
  no charge is collected. Shape-compatibility with payable siblings, never
  fake billing.
- **MCP auth.** Authless — the anon-sandbox rung is the only rung mounted, so
  no bearer tier exists to demand; the bearer-key tier arrives with rung 1+.
- **`interfaces.testSuite` not declared.** It stays undeclared until
  digest-pinned (batch watch list). The suite is published and runnable at
  `/verify` regardless; the card carries `links.verify` natively.
- **Counterpart brand (B2A2B check).** The ICP includes non-technical
  principals (transaction coordinators, closers, PM ops); the register row
  itself names the human-vocabulary counterpart: **closings.services**
  (owned, STAGED — not serving, INV §1.4). Recorded in the projection config;
  not linked while it does not serve (presence-when-true). Not a
  counterpart-brand gap.
- **Family registry.** Only serving origins are linked (apis.ax, api.qa,
  api.lawyer). closings.services (staged) and the five sub-audience rails
  (serve nothing) are recorded, not linked.
- **Zone.** apis.estate has no Cloudflare zone (surface register: cf_zone
  "n", state name-only). Deploy reaches workers.dev; zone creation + route
  attachment is a founder-ruled act, recorded in wrangler.jsonc.
- **Platform-account registration: BLOCKED-ON-RAIL-LEDGER.** The §9.1 final box
  (face registered in the platform account, the faces-payable/week denominator) is
  recorded blocked: no ledger address convention exists in `~/projects/ax` as
  of 2026-08-23 — `packages/rail-ledger` is uncommitted work-in-progress on
  `draft/rail-ledger-v1` with no LEDGER.md. The box closes by registering
  this face at the ledger address when it lands — never by stubbing.

## §9.1 self-verify score

**15/16 pass; the 16th (platform-account registration) is blocked-on-rail-ledger**
as above. Every passing box is asserted by `scripts/selfcheck.mjs` (27/27
mechanical checks, including in-process `gradePinned` green against the full
ratified `apis-ax-axp@2.6.0` spec at digest `a9a1197c…`) or by this tree
directly; the 402-OFFER ladder box passes under the ruled mounted-rungs-only
placement. §9.2 (independent hosted api.qa verdict + worthiness-bar
attestation) is out of this tree's hands by design — positioning stays
claim-free until attested.

## Register-note

The vacancy-at-breadth verdict on closing docs (one of three standing in the
cascade) is recorded in [REGISTER-NOTE.md](./REGISTER-NOTE.md) as a **verdict
fact, not a ranking** [CONVICTION: the register is unordered], alongside the
LienWaiver shared-face collision record.
