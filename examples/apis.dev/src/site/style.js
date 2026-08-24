/**
 * style.js — the one stylesheet of the apis.dev product surface.
 *
 * DESIGN FAMILY: api.qa (founder + Bryant ruling, 2026-08-23). apis.dev
 * belongs to the api.qa design family — as do apis.ax and apis.directory —
 * so the surface speaks the certificate identity, not a minted one:
 * IBM Plex Sans for prose, IBM Plex Mono for anything the machine produced
 * (paths, prices, verdicts, counts), the lab-grey paper, hairline rules,
 * square corners everywhere, hatched separator bands, and ONE accent — the
 * api.qa teal, role-locked to the act of building/committing. Color tokens
 * are inherited verbatim from api.qa src/views.ts tokensCss() (where their
 * contrast rationale is documented token by token); none are minted here.
 *
 * Fonts ride the Google Fonts CDN exactly as api.qa itself does (views.ts
 * documents the tradeoff); this Worker serves no static assets, so the
 * apis.directory self-hosted-woff2 variant is not available here.
 *
 * The page is a ledger: ruled rows, tabular numerals, borders over boxes.
 * Cards appear nowhere; hairlines carry the structure.
 */

import { menuIcon, closeIcon } from './icons.js'

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
  --ok: oklch(0.500 0.135 158);
  --hatch: oklch(0.205 0.021 210 / 0.16);
  /* the terminal plate is theme-INVARIANT (api.qa rule: a screenshot of a
     terminal reads as the same dark surface in both themes) */
  --plate: oklch(0.128 0.022 222);
  --plate-ink: oklch(0.910 0.014 190);
  --plate-dim: oklch(0.680 0.016 195);
  --plate-rule: oklch(0.280 0.020 220);
  --plate-accent: oklch(0.800 0.130 175);
  /* Theme-INVARIANT (api.qa views.ts): a scrim derived from the ink token
     paints a white veil in dark mode. A scrim is always a shadow. */
  --scrim: oklch(0.16 0.012 210 / 0.58);
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
    --ok: oklch(0.760 0.145 160);
    --hatch: oklch(0.930 0.010 185 / 0.13);
  }
}
/* explicit choice beats the OS preference in both directions (family theme
   mechanism, shared with api.management site/style.js) */
:root[data-theme="dark"] {
  --bg: oklch(0.185 0.014 210); --surface: oklch(0.225 0.016 212);
  --text: oklch(0.930 0.010 185); --muted: oklch(0.680 0.016 195);
  --border: oklch(0.320 0.016 212); --border-soft: oklch(0.270 0.014 212);
  --accent: oklch(0.760 0.128 178); --on-accent: oklch(0.185 0.014 210);
  --accent-wash: color-mix(in srgb, var(--accent) 9%, transparent);
  --ok: oklch(0.760 0.145 160);
  --hatch: oklch(0.930 0.010 185 / 0.13);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
/* scroll-padding clears the nav (api.qa baseCss); without it in-page anchors
   land underneath the bar. */
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 5rem; }
body {
  background: var(--bg); color: var(--text);
  font-family: var(--sans); font-size: 15px; line-height: 1.6;
  font-variant-numeric: tabular-nums; /* every number is an instrument reading */
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
code, .mono { font-family: var(--mono); overflow-wrap: anywhere; }

.wrap { max-width: 1140px; margin: 0 auto; padding-inline: clamp(16px, 3.5vw, 40px); }

/* hatched separator band (family signature): a region that carries no reading */
.hatch { height: 22px; border-bottom: 1px solid var(--border);
  background-image: repeating-linear-gradient(-45deg,
    var(--hatch) 0, var(--hatch) 1px, transparent 2px, transparent 8px); }

/* ---------- nav — the api.qa chrome, extracted from api.qa src/views.ts
   (navHtml + the nav block of baseCss) with tokens mapped to this site's
   names (--paper->--bg, --panel->--surface, --ink->--text, --ink-soft->--muted,
   --rule->--border, --teal->--accent). Adapted per property: the brand lockup
   is this wordmark; the theme button (family mechanism) rides in .navcta.
   Mobile menu is :target-driven — this Worker ships no nav JavaScript. ---------- */
.pad { max-width: 1140px; margin: 0 auto; padding-inline: clamp(16px, 3.5vw, 40px); }
.navwrap { position: relative; z-index: 60; }
.nav { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem; min-height: 58px; }
a.brand { display: flex; align-items: center; gap: 0.55rem; font-family: var(--mono); font-weight: 700; font-size: 1rem; letter-spacing: -0.02em; flex: none; text-decoration: none; white-space: nowrap; }
a.brand .tld { color: var(--muted); font-weight: 400; }
a.brand .dot { color: var(--accent); }
.navlinks { display: flex; justify-content: center; gap: 1.6rem; font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }
.navlinks a { text-decoration: none; transition: color var(--dur) var(--ease); }
.navlinks a:hover { color: var(--accent); }
.navlinks a[aria-current="page"] { color: var(--text); }
.navcta { display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem; }
/* Bare icon link: no border, no fill. Padding is hit-area only. */
.iconlink { display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--muted); padding: 0.4rem; margin: -0.4rem; transition: color var(--dur) var(--ease); }
.iconlink:hover { color: var(--accent); }
.iconlink .icon { width: 1.2rem; height: 1.2rem; }
/* The nav sits ABOVE the scrim, opaque so the fixed scrim cannot paint
   through the transparent bar (api.qa learned both the hard way). */
.navwrap > .pad { position: relative; z-index: 2; background: var(--bg); }
.menu { display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 1; }
.menu:target { display: block; }
@media (min-width: 821px) { .menu { display: none !important; } }
.menu-scrim { position: fixed; inset: 0; background: var(--scrim); }
.menu-panel { position: relative; background: var(--bg); border-bottom: 1px solid var(--border); }
.menu-panel a { display: flex; align-items: center; justify-content: space-between; font-family: var(--mono); font-size: 0.9rem; color: var(--text); text-decoration: none; padding: 0.95rem clamp(16px, 3.5vw, 40px); border-top: 1px solid var(--border); }
.menu-panel a:first-child { border-top: 0; }
.menu-panel a:hover, .menu-panel a:focus-visible { color: var(--accent); background: var(--surface); }
/* One control, two states: the hamburger becomes an X in place. */
.burger { display: none; }
.burger-close { display: none; }
@media (max-width: 820px) {
  .navlinks { display: none; }
  .nav { grid-template-columns: 1fr auto; }
  .burger-open { display: inline-flex; }
  .menu:target ~ .pad .burger-open { display: none; }
  .menu:target ~ .pad .burger-close { display: inline-flex; }
}
@keyframes burger-turn { from { transform: rotate(-90deg); opacity: 0; } to { transform: rotate(0); opacity: 1; } }
.burger .icon { animation: burger-turn 220ms var(--ease); } /* 220ms = api.qa --dur-base */
.theme-btn { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--border); padding: 4px 10px; transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease); }
.theme-btn:hover { color: var(--text); border-color: var(--muted); }

/* ---------- demo notice band (dashboard) ---------- */
.demo-band { border-bottom: 1px solid var(--border); background: var(--accent-wash); }
.demo-band .wrap { display: flex; gap: 0.9rem; align-items: baseline; padding-block: 8px; }
.demo-band .tag { font-family: var(--mono); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.12em; color: var(--accent); border: 1px solid var(--accent); padding: 1px 7px; white-space: nowrap; }
.demo-band p { font-family: var(--mono); font-size: 0.72rem; line-height: 1.6; color: var(--muted); }

/* ---------- hero ---------- */
.hero { padding-block: clamp(2.6rem, 7vw, 5rem) clamp(1.6rem, 4vw, 2.6rem); }
.hero h1 { font-weight: 700; font-size: clamp(2.1rem, 6vw, 3.6rem); letter-spacing: -0.028em; line-height: 1.04; max-width: 14ch; text-wrap: balance; }
.hero .lede { margin-top: 1.1rem; font-size: 1.04rem; color: var(--muted); max-width: 58ch; }
.hero .cta-row { margin-top: 1.7rem; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.btn { display: inline-block; font-family: var(--mono); font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; padding: 11px 22px; background: var(--accent); color: var(--on-accent); transition: filter var(--dur) var(--ease); }
.btn:hover { filter: brightness(1.08); }
.btn-quiet { display: inline-block; font-family: var(--mono); font-size: 0.8rem; letter-spacing: 0.05em; text-decoration: none; padding: 10px 20px; border: 1px solid var(--border); color: var(--muted); transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease); }
.btn-quiet:hover { color: var(--text); border-color: var(--muted); }
.assure { margin-top: 0.9rem; font-family: var(--mono); font-size: 0.72rem; color: var(--muted); }

/* ---------- numbers band (no heading; first element after the hero) ---------- */
.figures { border-block: 1px solid var(--border); background: var(--surface); }
.figures .wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.figures .fig { padding: 1.1rem 1.2rem 1.2rem 0; border-right: 1px solid var(--border-soft); }
.figures .fig:last-child { border-right: 0; }
.figures .fig + .fig { padding-left: 1.2rem; }
.figures b { display: block; font-family: var(--mono); font-weight: 700; font-size: 1.7rem; letter-spacing: -0.03em; line-height: 1.1; }
.figures span { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

/* ---------- section scaffolding ---------- */
section.band { padding-block: clamp(1.8rem, 4.5vw, 3rem); }
section.band + section.band { border-top: 1px solid var(--border); }
.sec-label { font-family: var(--mono); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.sec-note { margin-top: 0.5rem; font-size: 0.9rem; color: var(--muted); max-width: 64ch; }

/* ---------- worked example: definition in, faces out ---------- */
.worked { display: grid; grid-template-columns: minmax(320px, 1.25fr) 1fr; gap: 0; border: 1px solid var(--border); margin-top: 1.3rem; }
.plate { background: var(--plate); color: var(--plate-ink); padding: 1.1rem 1.3rem; overflow-x: auto; }
.plate pre { font-family: var(--mono); font-size: 0.76rem; line-height: 1.75; }
.plate .c { color: var(--plate-dim); }
.plate .k { color: var(--plate-accent); }
.emits { background: var(--surface); border-left: 1px solid var(--border); }
.emits .emit { display: grid; grid-template-columns: 8.5rem 1fr; gap: 1rem; align-items: baseline; padding: 0.72rem 1.2rem; border-bottom: 1px solid var(--border-soft); }
.emits .emit:last-child { border-bottom: 0; }
.emits .f { font-weight: 600; font-size: 0.9rem; }
.emits .a { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); }
.emits .a a { color: var(--accent); text-decoration: none; }
.emits .a a:hover { text-decoration: underline; }
.worked-cap { margin-top: 0.8rem; font-size: 0.88rem; color: var(--muted); max-width: 68ch; }

/* ---------- status table (what serves today) ---------- */
.status-table { width: 100%; border-collapse: collapse; margin-top: 1.2rem; font-size: 0.88rem; }
.status-table th { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; border-bottom: 2px solid var(--text); padding: 6px 14px 6px 0; }
.status-table td { border-bottom: 1px solid var(--border-soft); padding: 9px 14px 9px 0; vertical-align: top; }
.status-table td:first-child { font-weight: 600; white-space: nowrap; }
.status-table td.addr { font-family: var(--mono); font-size: 0.74rem; }
.status-table td.addr a { color: var(--accent); text-decoration: none; }
.status-table td.addr a:hover { text-decoration: underline; }
.st { font-family: var(--mono); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; white-space: nowrap; }
.st.live { color: var(--ok); border: 1px solid var(--ok); }
.st.road { color: var(--muted); border: 1px dashed var(--muted); }
.table-scroll { overflow-x: auto; }

/* ---------- brand shelf (ledger rows, not cards) ---------- */
.shelf { border-top: 2px solid var(--text); margin-top: 1.2rem; }
.shelf .colhead { display: grid; grid-template-columns: minmax(160px, 1.4fr) 1fr; gap: 12px; padding: 7px 2px; border-bottom: 1px solid var(--border); font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.shelf .srow { display: grid; grid-template-columns: minmax(160px, 1.4fr) 1fr; gap: 12px; align-items: baseline; padding: 11px 2px; border-bottom: 1px solid var(--border-soft); text-decoration: none; transition: background var(--dur) var(--ease); }
.shelf .srow:hover { background: var(--accent-wash); }
.shelf .brand { font-family: var(--mono); font-weight: 700; font-size: 0.95rem; }
.shelf .what { font-size: 0.85rem; color: var(--muted); }
.shelf .verdict { font-family: var(--mono); font-size: 0.78rem; text-align: right; }
.shelf .verdict .grade { font-weight: 700; }
.shelf .verdict .unscored { color: var(--muted); font-weight: 400; }

/* ---------- pricing page ---------- */
.prose { max-width: 72ch; padding-block: clamp(2rem, 5vw, 3rem) 1rem; }
.prose h1 { font-weight: 700; font-size: clamp(1.7rem, 4.5vw, 2.6rem); letter-spacing: -0.025em; line-height: 1.08; }
.prose .lede { margin-top: 0.9rem; color: var(--muted); max-width: 62ch; }
.rates-table { width: 100%; border-collapse: collapse; margin-top: 1.2rem; font-size: 0.88rem; }
.rates-table th { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; border-bottom: 2px solid var(--text); padding: 6px 14px 6px 0; }
.rates-table th.num, .rates-table td.num { text-align: right; padding-right: 28px; }
.rates-table td { border-bottom: 1px solid var(--border-soft); padding: 9px 14px 9px 0; }
.rates-table td:first-child { font-family: var(--mono); font-size: 0.78rem; }
.rates-table td.num { font-family: var(--mono); font-size: 0.82rem; }
.rates-table td.note { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
.facts { display: grid; grid-template-columns: 10rem 1fr; row-gap: 0.55rem; column-gap: 1rem; font-size: 0.88rem; margin-top: 1.2rem; }
.facts dt { font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding-top: 2px; }
.facts dd .mono { font-size: 0.8rem; }
.ladder { border-top: 2px solid var(--text); margin-top: 1.2rem; }
.ladder .rung { display: grid; grid-template-columns: 3rem 1fr minmax(140px, auto); gap: 12px; align-items: baseline; padding: 11px 2px; border-bottom: 1px solid var(--border-soft); }
.ladder .n { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }
.ladder .t { font-size: 0.92rem; font-weight: 600; }
.ladder .s { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); text-align: right; }
.ladder .price-live { font-family: var(--mono); font-size: 0.78rem; text-align: right; }

/* ---------- dashboard ---------- */
.dash { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.2rem, 3vw, 2rem); padding-block: clamp(1.6rem, 4vw, 2.4rem) 3rem; align-items: start; }
.panel { border: 1px solid var(--border); background: var(--surface); }
.panel.wide { grid-column: 1 / -1; }
.panel-head { display: flex; align-items: baseline; gap: 0.8rem; padding: 0.8rem 1.1rem; border-bottom: 1px solid var(--border); }
.panel-head h2 { font-size: 0.95rem; font-weight: 700; letter-spacing: -0.01em; }
.panel-head .src { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); margin-left: auto; }
.stamp-demo { font-family: var(--mono); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; border: 1.5px solid var(--muted); color: var(--muted); padding: 2px 8px; transform: rotate(-2deg); display: inline-block; }
.panel-body { padding: 0.9rem 1.1rem 1.1rem; }
.panel-body .hint { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }
.ledger-rows { border-top: 1px solid var(--border); }
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

/* ---------- closing prose + footer ---------- */
.closing { max-width: 68ch; padding-block: clamp(1.8rem, 4vw, 2.6rem); border-top: 1px solid var(--border); }
.closing p { color: var(--muted); font-size: 0.95rem; }
.closing a { color: var(--text); }
/* footer — the api.qa chrome (footHtml + the footer block of baseCss),
   tokens mapped as in the nav. Columns adapted to this property's links;
   the family disclosure line rides in .fnote. */
.foot-hatch { border-top: 1px solid var(--border); }
footer { padding-block: 2rem; }
.fgrid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1.75rem; }
@media (max-width: 820px) { .fgrid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .fgrid { grid-template-columns: 1fr; } }
.fgrid > * { min-width: 0; }
.fcol h4 { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text); margin: 0 0 0.65rem; font-weight: 700; }
/* Scoped away from .brand (api.qa rule): an unscoped .fcol a selector
   overrides the brand lockup's display:flex and colour. */
.fcol a:not(.brand) { display: block; font-size: 0.83rem; color: var(--muted); text-decoration: none; padding: 0.16rem 0; transition: color var(--dur) var(--ease); }
.fcol a:not(.brand):hover { color: var(--accent); }
.fcol a.brand { font-size: 1.02rem; color: var(--text); margin-bottom: 0.75rem; }
.fcol p { font-size: 0.83rem; color: var(--muted); max-width: 38ch; }
.fcol p a { color: var(--text); }
.fnote { margin-top: 1.75rem; padding-top: 1rem; border-top: 1px solid var(--border-soft); font-family: var(--mono); font-size: 0.66rem; color: var(--muted); display: flex; flex-wrap: wrap; gap: 0.4rem 1.25rem; justify-content: space-between; }
.fnote a { color: var(--text); text-decoration: none; }
.fnote a:hover { color: var(--accent); }

/* the /verify browser face: the markdown document, set verbatim */
.verify-pre { font-family: var(--mono); font-size: 0.78rem; line-height: 1.75; overflow-x: auto; padding-block: 2rem; }

/* ---------- responsive ---------- */
@media (max-width: 860px) {
  .worked { grid-template-columns: 1fr; }
  .emits { border-left: 0; border-top: 1px solid var(--border); }
  .dash { grid-template-columns: 1fr; }
  .figures .fig { border-right: 0; border-bottom: 1px solid var(--border-soft); padding-left: 0; }
  .figures .fig:last-child { border-bottom: 0; }
  .figures .fig + .fig { padding-left: 0; }
}
@media (max-width: 560px) {
  .shelf .colhead, .shelf .srow { grid-template-columns: 1fr auto; }
  .shelf .what, .shelf .colhead .h-what { display: none; }
  .demo-band .wrap { flex-direction: column; gap: 4px; }
  .lrow { grid-template-columns: 1fr auto; }
  .lrow .meta { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`

/**
 * The shared page shell. `path` marks the current nav item; `script` is an
 * optional inline module (dashboard only).
 */
/* Explicit theme choice, persisted per browser; same mechanism and storage
   key as api.management site/style.js (family theme parity). */
const THEME_SCRIPT = `<script>(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}document.addEventListener("DOMContentLoaded",function(){var b=document.querySelector(".theme-btn");if(!b)return;b.addEventListener("click",function(){var r=document.documentElement,cur=r.getAttribute("data-theme"),dark=cur?cur==="dark":matchMedia("(prefers-color-scheme: dark)").matches,next=dark?"light":"dark";r.setAttribute("data-theme",next);try{localStorage.setItem("theme",next)}catch(e){}})})})();</script>`

/* ── shared page chrome (nav / footer / theme) — the PROPER api.qa chrome
   (src/views.ts navHtml/footHtml, Bryant directive 2026-08-24), brand lockup
   and links adapted to this property. Burger icons come from ./icons.js —
   build-time-inlined Iconify SVG, never unicode glyphs (estate icon rule). ── */

const BRAND = `<a class="brand" href="/">apis<span class="dot">.</span><span class="tld">dev</span></a>`

const NAV_LINKS = [
  ['/pricing', 'Pricing'],
  ['/dashboard', 'Dashboard'],
  ['/verify', 'Verify'],
  ['/llms.txt', 'llms.txt'],
]

function navHtml(path) {
  const link = ([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a>`
  return `<div class="navwrap">
  <div class="menu" id="menu">
    <a class="menu-scrim" href="#" aria-label="Close navigation menu" tabindex="-1"></a>
    <div class="menu-panel">
      ${NAV_LINKS.map(link).join('\n      ')}
    </div>
  </div>
  <div class="pad"><nav class="nav">
    ${BRAND}
    <div class="navlinks">${NAV_LINKS.map(link).join('')}</div>
    <div class="navcta">
      <button class="theme-btn" type="button" aria-label="toggle color theme">theme</button>
      <a class="iconlink burger burger-open" href="#menu" aria-label="Open navigation menu" aria-expanded="false">${menuIcon()}</a>
      <a class="iconlink burger burger-close" href="#" aria-label="Close navigation menu" aria-expanded="true">${closeIcon('icon')}</a>
    </div>
  </nav></div>
</div>`
}

function footHtml() {
  return `<div class="foot-hatch hatch"></div>
<div class="pad"><footer>
  <div class="fgrid">
    <div class="fcol">
      ${BRAND}
      <p>The build-and-monetize door of the <a href="https://apis.do" rel="noopener">apis.do</a> provider abstraction — one definition, five faces, one rate card.</p>
    </div>
    <div class="fcol"><h4>Product</h4>
      <a href="/pricing">Pricing</a><a href="/dashboard">Dashboard</a>
    </div>
    <div class="fcol"><h4>For agents</h4>
      <a href="/llms.txt">llms.txt</a><a href="/.well-known/agents.json">agents.json</a>
      <a href="/openapi.json">openapi.json</a><a href="/pricing.json">pricing.json</a>
    </div>
    <div class="fcol"><h4>Verify</h4>
      <a href="/verify">/verify &middot; run our tests</a>
      <a href="https://api.qa/apis.dev" rel="noopener">api.qa/apis.dev</a>
    </div>
  </div>
  <div class="fnote">
    <span>&copy; 2026 apis.dev</span>
    <span>One family: <a href="https://api.qa" rel="noopener">api.qa</a> verifies, <a href="https://apis.ax" rel="noopener">apis.ax</a> offers, <a href="https://apis.directory" rel="noopener">apis.directory</a> registers, apis.dev builds and monetizes, api.management operates &mdash; trust rides the published, continuously verified test suites, not institutional separation.</span>
  </div>
</footer></div>`
}

export function renderPage({ title, description, path, body, script = '' }) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#e9ecea">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1b2124">
<meta property="og:type" content="website">
<meta property="og:site_name" content="apis.dev">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="https://apis.dev${esc(path)}">
<meta property="og:image" content="https://apis.dev/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="https://apis.dev/og.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;700&display=swap">
<style>${STYLE}</style>
</head>
<body>
${navHtml(path)}
<div class="hatch"></div>
${body}
${footHtml()}
${THEME_SCRIPT}${script ? `<script type="module">${script}</script>` : ''}
</body>
</html>`
}
