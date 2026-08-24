# The dashboard family — shared anatomy for apis.dev and api.management

**Status:** v1, authored with the api.management product surface
(`draft/api-management-product-v1`). The apis.dev product surface
(`draft/apis-dev-product-v1`) MUST build to this same structure —
**divergence between the two consoles is a defect**, per the #4 family
ruling (apis.dev and api.management join the api.qa / apis.ax /
apis.directory design family) and the "same abstract-dashboard template"
directive. Amend this doc first, then both sites, never one site alone.

## Identity (extracted from api.qa — reuse, never re-derive)

Sources of truth, in order:
1. `~/projects/api.qa/src/views.ts` (`tokensCss()`) + `DESIGN.md`
2. `apis.directory` `site/lib/style.mjs` (the family stylesheet this repo's
   `examples/api.management/site/style.js` mirrors)

- **Type:** IBM Plex Sans (prose) · IBM Plex Mono (anything the machine
  produced: scores, keys, verdicts, counts, branches, prices). Single-worker
  sites with no static-asset pipeline use the Google Fonts CDN (api.qa
  precedent); sites with an asset pipeline self-host woff2 (apis.directory
  precedent). Real fallback stacks always.
- **Paper:** lab-grey oklch — light `0.930 0.004 175` bg / `0.968 0.003 175`
  surface; dark `0.185 0.014 210` bg / `0.225 0.016 212` surface.
- **ONE accent:** the api.qa teal — `oklch(0.470 0.110 185)` light /
  `oklch(0.760 0.128 178)` dark. No second accent, ever.
- **Structure:** hairline rules carry the page; square corners everywhere;
  hatched separator bands (`repeating-linear-gradient(-45deg …)` with the
  1px→transparent antialias ramp); ledger rows, never card grids; tabular
  numerals on body ("every number is an instrument reading").
- **Motion:** 120ms `cubic-bezier(0.16, 1, 0.3, 1)`, color/background only;
  `prefers-reduced-motion` kills it.
- **Theme:** light tokens on bare `:root`; dark under
  `@media (prefers-color-scheme: dark)` guarded `:root:not([data-theme="light"])`;
  repeated under `:root[data-theme="dark"]` so the toggle wins both ways.

## The family disclosure line (footer, every page)

> Family: api.qa verifies · apis.ax offers · apis.directory registers ·
> apis.dev builds · api.management operates.

Extend by appending, never reword existing clauses.

## Landing anatomy (order is normative)

1. **Masthead** — mono wordmark (`name<accent dot>tld-muted`), uppercase mono
   nav, theme button. No logo images.
2. **Intro** — h1 ≤21ch, lede ≤40 words, CTA + reassurance note UNDER the
   CTA, then the **tally**: a ruled numbers band (top border 2px text-color),
   real counted numbers only, no heading.
3. **Hatch band.**
4. Content sections, each with a `sec-label` (mono uppercase + 5px accent
   square) — and each with its OWN anatomy (taste standard rule 2: no
   repeated section skeletons): a dl mechanism band, a machine exhibit
   (`pre` on surface, honest — the endpoint shown must answer), a real
   table with status chips, a shelf/roster of ruled rows.
5. **Brand shelf** — ruled rows: brand (mono bold) / role / verdict column.
   Verdicts ONLY where an attested api.qa run exists; everything else reads
   `unscored — awaiting run`. Fs are printed, never curated away.
6. **Closing prose** — ONE paragraph per page, max.
7. **Foot hatch + footer** — machine-face nav (llms.txt, agents.json,
   openapi.json, pricing, verify, mcp) + the family disclosure line.

## Console / dashboard anatomy (the abstract dashboard template)

Both properties render their operator surface through ONE abstract
template (#30, apps.ax): a dashboard is a set of PANELS, each panel a
typed binding onto a door the origin already serves — never a second
implementation of the data. The template file is generic and knows nothing
about the property; all property knowledge is declarative config.

Instances (template duplicated until extraction; byte-level convergence is
the extraction step, structural convergence is mandatory NOW):
- **#1 apis.dev** — `examples/apis.dev/src/site/dashboard-template.js` +
  `dashboard-config.js` (@ 5085d0a), mounted at `/dashboard`.
- **#2 api.management** — `examples/api.management/site/dashboard-template.js`
  + `dashboard-config.js`, mounted at `/console`.

**Mount path**: the template mounts at the property's operative noun —
`/dashboard` for a developer surface (apis.dev), `/console` for a
management surface (api.management). Each property 301s the sibling's noun
to its own. Page shape inside the mount is identical.

**Panel kinds — template v1 (instance #1):**
- `collection` — GET a same-origin door serving a typed envelope
  (OK | EMPTY | BLOCKED | OFFER), ledger rows, declarative columns
  (idKey/metaKeys/hrefKey); optional `verdicts` map annotates rows with
  REAL external verdicts only — absent key renders `unscored`, never an
  invented score.
- `mint` — a POST door that creates a record (the sandbox floor),
  disclosure line included.
- `kv` — server-rendered facts; `demo: true` stamps the panel DEMO for
  anything not wired to a live lane. Honesty is config, not copy.

**Panel kinds — v1.1 additions (instance #2, generic; adopt at
extraction):**
- `collection` gains optional `source.member` — the envelope member
  holding the records when the door names its collection (axp-faces
  `memberName`, e.g. `properties`) instead of `results`. Fallback order:
  `env.results`, then `env[source.member]`.
- `ledger` — server-rendered ruled register rows from config data, for
  inventories that are compiled facts rather than a runtime door:
  declarative columns + grid, mono uppercase colhead, client-side filter
  with result count and truthful no-hits state.
- `instruments` — grid of verdict/status instrument panels: host, big
  headline grade, n-of-scale meter cells (ten cells because ten AX
  checks), mono note + real receipt link.

**Page order**: demo band (bordered `DEMO` tag + one mono sentence
separating demo chrome from real data — real rows cite their source, §5.2
synthetic says `example: true`) → panel grid (2-col, wide panels span) →
footer. Hydration: one config island (`<script type="application/json">`)
+ one generic script; no framework, no build step.

The console/dashboard is a browser document like `/` — NOT a declared API
operation: no operationId, no rate row, absent from OpenAPI/card (the
machine contract stays live-endpoints-only).

## Honesty rules bound into the template

- Zero fabricated numbers; every tally figure is counted from data in-repo
  or cited to the build log (StartupsStudio/studio#9).
- "top-rated"/grade claims only where a real attested api.qa verdict
  exists; api.insure B and api.qa A+ are currently the only passing ones.
- Demo labels mark demo things only — never used to soften real data, and
  real data is never presented inside an unlabeled demo shell.
- Today-vs-roadmap status chips: `live` only for wire-true today; test-mode
  stays labeled test-mode.
