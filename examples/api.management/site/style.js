/**
 * site/style.js — api.management product surface stylesheet.
 *
 * DESIGN FAMILY: api.qa (founder + Bryant ruling, 2026-08-23; extended to
 * apis.dev + api.management by the #4 family ruling). Tokens are inherited
 * VERBATIM from api.qa src/views.ts tokensCss() via apis.directory
 * site/lib/style.mjs — none minted here. IBM Plex Sans for prose, IBM Plex
 * Mono for anything the machine produced, lab-grey paper, hairline rules,
 * square corners, hatched separator bands, ONE teal accent, 120ms
 * cubic-bezier(0.16,1,0.3,1) motion. Fonts ride the Google Fonts CDN (the
 * api.qa precedent for single-worker sites with no static-asset pipeline).
 *
 * The abstract console/dashboard anatomy shared with apis.dev is specified
 * in examples/DASHBOARD-FAMILY.md — divergence from it is a defect.
 */

export const FONTS_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;600;700&display=swap">`;

export const STYLE = /* css */ `
:root {
  --bg: oklch(0.930 0.004 175);
  --surface: oklch(0.968 0.003 175);
  --text: oklch(0.205 0.021 210);
  --muted: oklch(0.445 0.018 200);
  --border: oklch(0.845 0.008 190);
  --border-soft: oklch(0.890 0.006 190);
  --accent: oklch(0.470 0.110 185);      /* the api.qa teal */
  --on-accent: oklch(0.992 0.006 180);
  --accent-wash: color-mix(in srgb, var(--accent) 7%, transparent);
  --hatch: oklch(0.205 0.021 210 / 0.16);
  --sans: 'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace;
  --dur: 120ms;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: oklch(0.185 0.014 210); --surface: oklch(0.225 0.016 212);
    --text: oklch(0.930 0.010 185); --muted: oklch(0.680 0.016 195);
    --border: oklch(0.320 0.016 212); --border-soft: oklch(0.270 0.014 212);
    --accent: oklch(0.760 0.128 178); --on-accent: oklch(0.185 0.014 210);
    --accent-wash: color-mix(in srgb, var(--accent) 9%, transparent);
    --hatch: oklch(0.930 0.010 185 / 0.13);
  }
}
:root[data-theme="dark"] {
  --bg: oklch(0.185 0.014 210); --surface: oklch(0.225 0.016 212);
  --text: oklch(0.930 0.010 185); --muted: oklch(0.680 0.016 195);
  --border: oklch(0.320 0.016 212); --border-soft: oklch(0.270 0.014 212);
  --accent: oklch(0.760 0.128 178); --on-accent: oklch(0.185 0.014 210);
  --accent-wash: color-mix(in srgb, var(--accent) 9%, transparent);
  --hatch: oklch(0.930 0.010 185 / 0.13);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  background: var(--bg); color: var(--text);
  font-family: var(--sans); font-size: 15px; line-height: 1.6;
  font-variant-numeric: tabular-nums; /* every number is an instrument reading */
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
a { color: inherit; }
/* square corners everywhere — no radius anywhere in this system (family rule) */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.row > *, .colhead > * { min-width: 0; }
code, .mono { font-family: var(--mono); overflow-wrap: anywhere; }

.wrap { max-width: 1240px; margin: 0 auto; padding-inline: clamp(16px, 3.5vw, 40px); }

/* hatched separator band (family signature): a region that carries no reading */
.hatch { height: 22px; border-bottom: 1px solid var(--border);
  background-image: repeating-linear-gradient(-45deg,
    var(--hatch) 0, var(--hatch) 1px, transparent 2px, transparent 8px); }

/* ---------- masthead ---------- */
.masthead { border-bottom: 1px solid var(--border); background: var(--surface); }
.masthead .wrap { display: flex; align-items: center; gap: 1.25rem; min-height: 56px; }
.wordmark { font-family: var(--mono); font-weight: 700; font-size: 1rem; letter-spacing: -0.01em; text-decoration: none; white-space: nowrap; }
.wordmark .tld { color: var(--muted); font-weight: 400; }
.wordmark .dot { color: var(--accent); }
.mast-nav { display: flex; gap: 1.1rem; margin-left: auto; align-items: center; }
.mast-nav a { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none; color: var(--muted); transition: color var(--dur) var(--ease); }
.mast-nav a:hover, .mast-nav a[aria-current="page"] { color: var(--text); }
.theme-btn { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--border); padding: 4px 10px; transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease); }
.theme-btn:hover { color: var(--text); border-color: var(--muted); }

/* ---------- demo notice band ---------- */
.demo-band { border-bottom: 1px solid var(--border); background: var(--accent-wash); }
.demo-band .wrap { display: flex; gap: 0.9rem; align-items: baseline; padding-block: 8px; }
.demo-band .tag { font-family: var(--mono); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.12em; color: var(--accent); border: 1px solid var(--accent); padding: 1px 7px; white-space: nowrap; }
.demo-band p { font-family: var(--mono); font-size: 0.72rem; line-height: 1.6; color: var(--muted); }

/* ---------- intro ---------- */
.intro { padding-block: clamp(2.4rem, 6vw, 4.5rem) clamp(1.8rem, 4vw, 3rem); }
.intro h1 { font-weight: 700; font-size: clamp(2rem, 5.5vw, 3.4rem); letter-spacing: -0.028em; line-height: 1.04; max-width: 21ch; text-wrap: balance; }
.intro .lede { margin-top: 1rem; font-size: 1.02rem; color: var(--muted); max-width: 62ch; }
.intro .cta-row { margin-top: 1.6rem; display: flex; flex-wrap: wrap; gap: 0.8rem; align-items: center; }
.cta { font-family: var(--mono); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; background: var(--accent); color: var(--on-accent); padding: 10px 18px; text-decoration: none; transition: opacity var(--dur) var(--ease); }
.cta:hover { opacity: 0.9; }
.cta-note { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }
.tally { margin-top: 1.8rem; display: flex; flex-wrap: wrap; gap: 0.4rem 1.6rem; font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.04em; color: var(--muted); border-top: 2px solid var(--text); padding-top: 0.8rem; }
.tally b { color: var(--text); font-weight: 700; }

/* ---------- sections ---------- */
.sec { border-top: 1px solid var(--border); padding-block: clamp(1.8rem, 4vw, 2.8rem); }
.sec.on-surface { background: var(--surface); border-bottom: 1px solid var(--border); }
/* plain mono label, no accent marker — family parity with apis.dev/api.qa
   section labels, and it keeps the teal inside its role budget */
.sec-label { font-family: var(--mono); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.sec-lead { margin-top: 0.7rem; font-size: 0.95rem; color: var(--muted); max-width: 66ch; }

/* mechanism dl band (bring-your-apis section) */
.mech { margin-top: 1.4rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
.mech > div { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 14px 16px; }
.mech dt { font-family: var(--mono); font-size: 0.64rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.mech dd { margin-top: 0.4rem; font-size: 0.86rem; color: var(--muted); }
.mech dd b { color: var(--text); font-weight: 600; }

/* machine exhibit */
.machine pre { background: var(--surface); border: 1px solid var(--border); padding: 1rem 1.2rem; overflow-x: auto; font-family: var(--mono); font-size: 0.74rem; line-height: 1.8; margin-top: 1.2rem; }
.machine pre .c { color: var(--muted); }
.machine pre a { color: var(--accent); text-decoration: none; }
.machine pre a:hover { text-decoration: underline; }
.exhibit-cap { margin-top: 0.7rem; font-family: var(--mono); font-size: 0.7rem; color: var(--muted); max-width: 72ch; }

/* capability table (today vs roadmap) */
.cap-table { width: 100%; border-collapse: collapse; margin-top: 1.3rem; font-size: 0.88rem; }
.cap-table th { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; border-bottom: 2px solid var(--text); padding: 6px 14px 6px 0; }
.cap-table td { border-bottom: 1px solid var(--border-soft); padding: 9px 14px 9px 0; vertical-align: top; }
.cap-table td:first-child { font-weight: 600; white-space: nowrap; }
.cap-table td.m { color: var(--muted); }
.cap-scroll { overflow-x: auto; }
.cap-scroll .cap-table { min-width: 640px; }
.st { font-family: var(--mono); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; padding: 2px 7px; border: 1px solid var(--border); color: var(--muted); white-space: nowrap; }
.st.live { border-color: var(--accent); color: var(--accent); }

/* ---------- rate-card page (family anatomy shared with apis.dev) ---------- */
.prose { max-width: 72ch; padding-block: clamp(2rem, 5vw, 3rem) 1rem; }
.prose h1 { font-weight: 700; font-size: clamp(1.7rem, 4.5vw, 2.6rem); letter-spacing: -0.025em; line-height: 1.08; }
.prose .lede { margin-top: 0.9rem; color: var(--muted); max-width: 62ch; }
.rates-table { width: 100%; border-collapse: collapse; margin-top: 1.2rem; font-size: 0.88rem; min-width: 560px; }
.rates-table th { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; border-bottom: 2px solid var(--text); padding: 6px 14px 6px 0; }
.rates-table th.num, .rates-table td.num { text-align: right; padding-right: 28px; }
.rates-table td { border-bottom: 1px solid var(--border-soft); padding: 9px 14px 9px 0; }
.rates-table td:first-child { font-family: var(--mono); font-size: 0.78rem; }
.rates-table td.num { font-family: var(--mono); font-size: 0.82rem; }
.rates-table td.note { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
.facts { display: grid; grid-template-columns: 10rem 1fr; row-gap: 0.55rem; column-gap: 1rem; font-size: 0.88rem; margin-top: 1.2rem; }
.facts dt { font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding-top: 2px; }
.facts dd .mono, .facts dd.mono { font-size: 0.8rem; }
.facts dd a { color: var(--accent); text-decoration: none; }
.facts dd a:hover { text-decoration: underline; }
.doc-link { color: var(--accent); }
.ladder { border-top: 2px solid var(--text); margin-top: 1.2rem; }
.ladder .rung { display: grid; grid-template-columns: 3rem 1fr minmax(110px, auto); gap: 12px; align-items: baseline; padding: 11px 2px; border-bottom: 1px solid var(--border-soft); }
.ladder .n { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }
.ladder .t { font-size: 0.9rem; }
.ladder .s { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); text-align: right; }
@media (max-width: 560px) {
  .ladder .rung { grid-template-columns: 2rem 1fr; }
  .ladder .s { grid-column: 2; text-align: left; }
}

/* brand shelf: ruled roster rows, verdicts only where a real api.qa run exists */
.shelf { margin-top: 1.3rem; border-top: 2px solid var(--text); }
.shelf-row { display: grid; grid-template-columns: minmax(150px, 1.4fr) minmax(160px, 2fr) 200px; gap: 12px; align-items: baseline; padding: 10px 2px; border-bottom: 1px solid var(--border-soft); }
.shelf-row .brand { font-family: var(--mono); font-weight: 700; font-size: 0.95rem; }
.shelf-row .role { font-size: 0.8rem; color: var(--muted); }
.shelf-row .verdict { font-family: var(--mono); font-size: 0.72rem; text-align: right; color: var(--muted); }
/* a grade is a reading, not a commit moment: ink, not teal — an F set in the
   accent read as success */
.shelf-row .verdict b { color: var(--text); font-weight: 700; }
.shelf-cap { margin-top: 0.7rem; font-family: var(--mono); font-size: 0.68rem; color: var(--muted); max-width: 76ch; }

/* closing prose: the ONE paragraph */
.close-prose { padding-block: clamp(1.8rem, 4vw, 2.6rem); }
.close-prose p { max-width: 66ch; font-size: 0.95rem; color: var(--muted); }

/* ---------- console ---------- */
.ledger-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.9rem; padding-block: 1.4rem 0.9rem; }
.search { flex: 1 1 220px; display: flex; align-items: center; border: 1px solid var(--border); background: var(--surface); }
.search input { flex: 1; border: 0; background: none; color: var(--text); font-family: var(--mono); font-size: 0.8rem; padding: 8px 10px; outline: none; min-width: 0; }
.search input::placeholder { color: var(--muted); }
.result-count { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); margin-left: auto; }
.result-count b { color: var(--text); }

.ledger { border-top: 2px solid var(--text); }
/* per-panel grids arrive as --ledger-grid (a custom property, never an
   inline grid-template-columns: inline styles beat the <=980px stacked
   override and break the mobile layout — that bug shipped once) */
.colhead { display: grid; grid-template-columns: var(--ledger-grid, minmax(150px, 1.4fr) minmax(120px, 1.1fr) minmax(230px, 2fr) 74px 84px minmax(120px, 1fr)); gap: 12px; align-items: center; padding: 7px 2px; border-bottom: 1px solid var(--border); font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.row { display: grid; grid-template-columns: var(--ledger-grid, minmax(150px, 1.4fr) minmax(120px, 1.1fr) minmax(230px, 2fr) 74px 84px minmax(120px, 1fr)); gap: 12px; align-items: center; padding: 9px 2px; border-bottom: 1px solid var(--border-soft); transition: background var(--dur) var(--ease); }
.row:hover { background: var(--accent-wash); }
.row .face { font-family: var(--mono); font-weight: 700; font-size: 0.85rem; }
.row .face .gap-tag { font-weight: 400; font-size: 0.64rem; color: var(--muted); }
.row .subst { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }
.row .branch { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
.row .gate { font-family: var(--mono); font-size: 0.72rem; }
.row .state { font-family: var(--mono); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.row .state.live { color: var(--accent); }
.row .vres { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); text-align: right; }
.row .vres b { color: var(--text); font-weight: 700; }
.row.hide { display: none; }
.no-hits { display: none; padding: 2.5rem 0; font-family: var(--mono); font-size: 0.8rem; color: var(--muted); }
.no-hits.show { display: block; }

/* verdict instruments (the four real §9.2 runs) */
.instruments { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0; border-top: 1px solid var(--border); border-left: 1px solid var(--border); margin-top: 1.3rem; }
.instrument { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--surface); padding: 1.1rem 1.2rem; }
.instrument .host { font-family: var(--mono); font-size: 0.78rem; font-weight: 700; }
.instrument .big { font-family: var(--mono); font-weight: 700; font-size: 2.4rem; letter-spacing: -0.04em; line-height: 1; margin-top: 0.5rem; }
.instrument .big span { font-size: 1rem; color: var(--muted); font-weight: 400; }
.instrument .cells { margin-top: 0.7rem; display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; max-width: 180px; }
.instrument .cells i { height: 8px; background: var(--border); }
.instrument .cells i.on { background: var(--accent); }
.instrument .src { margin-top: 0.7rem; font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.02em; color: var(--muted); line-height: 1.7; }
.instrument .src a { color: var(--accent); text-decoration: none; }

/* ---------- dashboard panels (abstract template vocabulary — shared with
   apis.dev src/site/style.js; keep class names identical) ---------- */
.dash { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.2rem, 3vw, 2rem); padding-block: clamp(1.6rem, 4vw, 2.4rem) 3rem; align-items: start; }
.panel { border: 1px solid var(--border); background: var(--surface); }
.panel.wide { grid-column: 1 / -1; }
.panel-head { display: flex; align-items: baseline; gap: 0.8rem; padding: 0.8rem 1.1rem; border-bottom: 1px solid var(--border); }
.panel-head h2 { font-size: 0.95rem; font-weight: 700; letter-spacing: -0.01em; }
.panel-head .src { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); margin-left: auto; }
.stamp-demo { font-family: var(--mono); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; border: 1.5px solid var(--muted); color: var(--muted); padding: 2px 8px; transform: rotate(-2deg); display: inline-block; }
.panel-body { padding: 0.9rem 1.1rem 1.1rem; }
.panel-body .hint { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }
.ledger-rows { display: block; }
.lrow { display: grid; grid-template-columns: minmax(140px, 1.3fr) 1fr minmax(90px, auto); gap: 10px; align-items: baseline; padding: 8px 2px; border-bottom: 1px solid var(--border-soft); font-size: 0.85rem; }
.lrow .id { font-family: var(--mono); font-size: 0.78rem; font-weight: 700; }
.lrow .meta { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
.lrow .right { font-family: var(--mono); font-size: 0.72rem; text-align: right; }
.lrow .right a { color: var(--accent); text-decoration: none; }
.lrow .right a:hover { text-decoration: underline; }
.panel .act { margin-top: 0.8rem; }
.panel button.mint { font-family: var(--mono); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; background: var(--accent); color: var(--on-accent); padding: 8px 16px; transition: filter var(--dur) var(--ease); }
.panel button.mint:hover { filter: brightness(1.08); }
.kv { display: grid; grid-template-columns: auto 1fr; row-gap: 0.4rem; column-gap: 1rem; font-size: 0.85rem; }
.kv dt { font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding-top: 3px; }
.kv dd { font-family: var(--mono); font-size: 0.8rem; }
.kv dd a { color: var(--accent); text-decoration: none; }
.kv dd a:hover { text-decoration: underline; }
/* the panel-scoped ledger (kind: ledger) reuses the register ledger classes
   above; instruments (kind: instruments) reuse .instruments/.instrument */
.panel .instruments { border: 0; margin-top: 0; }
.panel .instrument { background: var(--bg); }
.panel .ledger-head { padding-block: 0 0.7rem; }

/* ---------- footer ---------- */
.foot-hatch { margin-top: 2.5rem; border-top: 1px solid var(--border); }
footer { background: var(--surface); }
footer .wrap { display: flex; flex-wrap: wrap; gap: 0.8rem 2rem; align-items: baseline; padding-block: 1.3rem; }
footer p { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
footer nav { display: flex; flex-wrap: wrap; gap: 1.2rem; margin-left: auto; }
footer nav a { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); text-decoration: none; transition: color var(--dur) var(--ease); }
footer nav a:hover { color: var(--accent); }
.family-line { border-top: 1px solid var(--border-soft); }
.family-line p { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); padding-block: 0.9rem; }
.family-line a { color: var(--text); text-decoration: none; }
.family-line a:hover { color: var(--accent); }

/* ---------- responsive ---------- */
@media (max-width: 980px) {
  .dash { grid-template-columns: 1fr; }
  .lrow { grid-template-columns: 1fr auto; }
  .lrow .meta { grid-column: 1 / -1; }
  .colhead { display: none; }
  .row { grid-template-columns: 1fr auto; grid-template-rows: auto auto; row-gap: 4px; }
  .row .subst, .row .branch { display: none; }
  .row .gate { grid-column: 1; grid-row: 2; }
  .row .state { grid-column: 2; grid-row: 1; text-align: right; }
  .row .vres { grid-column: 2; grid-row: 2; }
  .shelf-row { grid-template-columns: 1fr auto; }
  .shelf-row .role { display: none; }
}
@media (max-width: 560px) {
  .demo-band .wrap { flex-direction: column; gap: 4px; }
  .masthead .wrap { flex-wrap: wrap; row-gap: 0; padding-block: 6px; }
  .mast-nav { gap: 0.8rem; flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`;

/* ── shared page chrome (masthead / footer / theme), used by every browser
   face — the api.management counterpart of apis.dev's renderPage. ───────── */

const escChrome = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const THEME_SCRIPT = `<script>(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}document.addEventListener("DOMContentLoaded",function(){var b=document.querySelector(".theme-btn");if(!b)return;b.addEventListener("click",function(){var r=document.documentElement,cur=r.getAttribute("data-theme"),dark=cur?cur==="dark":matchMedia("(prefers-color-scheme: dark)").matches,next=dark?"light":"dark";r.setAttribute("data-theme",next);try{localStorage.setItem("theme",next)}catch(e){}})})})();</script>`;

function masthead(current) {
  const nav = [
    ["/console", "console"],
    ["/pricing", "pricing"],
    ["/verify", "verify"],
    ["/llms.txt", "llms.txt"],
  ]
    .map(([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  return `<header class="masthead"><div class="wrap">
  <a class="wordmark" href="/">api<span class="dot">.</span><span class="tld">management</span></a>
  <nav class="mast-nav">${nav}<button class="theme-btn" type="button" aria-label="toggle color theme">theme</button></nav>
</div></header>`;
}

const FAMILY_LINE = `<div class="family-line"><div class="wrap"><p>Family: <a href="https://api.qa">api.qa</a> verifies · <a href="https://apis.ax">apis.ax</a> offers · <a href="https://apis.directory">apis.directory</a> registers · <a href="https://apis.dev">apis.dev</a> builds · api.management operates.</p></div></div>`;

function footer() {
  return `<div class="foot-hatch hatch"></div><footer>
  <div class="wrap"><p>api.management — the operate face of an API portfolio. Sandbox data is labeled <code>"example": true</code>; metering runs in test mode and the <a href="/pricing">Pricing Document</a> says so.</p>
  <nav><a href="/llms.txt">llms.txt</a><a href="/.well-known/agents.json">agents.json</a><a href="/openapi.json">openapi.json</a><a href="/pricing">pricing</a><a href="/verify">verify</a><a href="/mcp">mcp</a></nav></div>
  ${FAMILY_LINE}
</footer>`;
}

export function renderPage({ title, description, path, body, script = "" }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escChrome(title)}</title>
<meta name="description" content="${escChrome(description)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#e9ecea">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1b2124">
<meta property="og:type" content="website">
<meta property="og:site_name" content="api.management">
<meta property="og:title" content="${escChrome(title)}">
<meta property="og:description" content="${escChrome(description)}">
<meta property="og:url" content="https://api.management${escChrome(path)}">
<meta property="og:image" content="https://api.management/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escChrome(title)}">
<meta name="twitter:description" content="${escChrome(description)}">
<meta name="twitter:image" content="https://api.management/og.png">
${FONTS_HEAD}
<style>${STYLE}</style></head>
<body>${masthead(path)}
${body}
${footer()}
${THEME_SCRIPT}${script ? `<script>${script}</script>` : ""}
</body></html>`;
}
