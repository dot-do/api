/**
 * dashboard-template.js — the ABSTRACT DASHBOARD TEMPLATE, instance #1.
 *
 * This file is deliberately generic: it renders a developer dashboard from a
 * declarative config (see ./dashboard-config.js for the apis.dev instance)
 * and knows nothing about apis.dev. It is the first concrete instance of the
 * abstract-dashboard template idea (#30, apps.ax): a dashboard is a set of
 * PANELS, each panel a typed binding onto a door the origin already serves —
 * never a second implementation of the data.
 *
 * Panel kinds (the template's whole vocabulary today):
 *   - collection — GET a same-origin door serving a typed envelope
 *                  (OK | EMPTY | BLOCKED | OFFER) and render its results as
 *                  ledger rows; declarative column mapping (idKey, metaKeys,
 *                  hrefKey); an optional `verdicts` map annotates rows with
 *                  REAL external verdicts only — an absent key renders
 *                  "unscored", never an invented score.
 *   - mint       — a POST door that creates a record (the sandbox floor);
 *                  minted records append as rows, disclosure line included.
 *   - kv         — server-rendered facts (links allowed); `demo: true`
 *                  stamps the panel DEMO for anything not wired to a live
 *                  lane yet. Honesty is config, not copy: a panel that shows
 *                  placeholder data MUST carry the stamp.
 *
 * EXTRACTION PATH: when a second property needs a dashboard, this file (and
 * the panel-kind vocabulary) moves to the shared template package and the
 * property keeps only its config — the prove-then-extract doctrine applied
 * to dashboards. Do not grow property-specific branches in here.
 *
 * Hydration: one small inline script, config carried as JSON in a
 * <script type="application/json"> island. No dependencies, no build step.
 */

import { renderPage } from './style.js'

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function kvEntries(entries) {
  return entries
    .map(([k, v]) => {
      const val =
        v && typeof v === 'object'
          ? `<a href="${esc(v.href)}" ${v.href.startsWith('http') ? 'rel="noopener"' : ''}>${esc(v.label)}</a>`
          : esc(v)
      return `<dt>${esc(k)}</dt><dd>${val}</dd>`
    })
    .join('\n')
}

function panelShell(p) {
  const stamp = p.demo ? ` <span class="stamp-demo">demo</span>` : ''
  const src = p.source ? `<span class="src">${p.source.method} ${p.source.path}</span>` : ''
  let inner = ''
  if (p.kind === 'kv') {
    inner = `<dl class="kv">\n${kvEntries(p.entries)}\n</dl>`
  } else if (p.kind === 'mint') {
    inner = `<div class="ledger-rows" data-rows></div>
      <p class="hint" data-hint>nothing minted yet in this browser session</p>
      <div class="act"><button class="mint" data-mint>${esc(p.cta)}</button></div>`
  } else if (p.kind === 'collection') {
    inner = `<div class="ledger-rows" data-rows><p class="hint">loading ${esc(p.source.path)}…</p></div>`
  }
  return `<section class="panel${p.wide ? ' wide' : ''}" id="panel-${p.id}" data-panel="${p.id}">
    <div class="panel-head"><h2>${esc(p.title)}${stamp}</h2>${src}</div>
    <div class="panel-body">
      ${inner}
      ${p.note ? `<p class="hint" style="margin-top:0.7rem">${esc(p.note)}</p>` : ''}
    </div>
  </section>`
}

/** The generic hydration script — interprets the config island, calls only
 *  same-origin doors, and renders truthful empty/error states. */
const HYDRATE = /* js */ `
const cfg = JSON.parse(document.getElementById('dash-config').textContent);
const escEl = (t) => { const s = document.createElement('span'); s.textContent = t == null ? '' : String(t); return s.innerHTML; };
function row({ id, meta, right }) {
  return '<div class="lrow"><span class="id">' + escEl(id) + '</span><span class="meta">' + escEl(meta) + '</span><span class="right">' + right + '</span></div>';
}
for (const p of cfg.panels) {
  const root = document.querySelector('[data-panel="' + p.id + '"]');
  if (!root) continue;
  const rows = root.querySelector('[data-rows]');
  if (p.kind === 'collection') {
    fetch(p.source.path).then((r) => r.json()).then((env) => {
      const results = env.results || [];
      if (results.length === 0) { rows.innerHTML = '<p class="hint">' + escEl(env.message || 'a truthful empty set') + '</p>'; return; }
      rows.innerHTML = results.map((rec) => {
        const id = rec[p.columns.idKey];
        const meta = p.columns.metaKeys.map((k) => rec[k]).filter(Boolean).join(' · ');
        const verdict = p.verdicts && Object.prototype.hasOwnProperty.call(p.verdicts, id)
          ? '<b>' + escEl(p.verdicts[id]) + '</b> · api.qa'
          : '<span style="color:var(--muted)">unscored</span>';
        const href = p.columns.hrefKey && rec[p.columns.hrefKey];
        const right = href ? '<a href="' + escEl(href) + '" rel="noopener">' + verdict + '</a>' : verdict;
        return row({ id, meta, right });
      }).join('');
    }).catch(() => { rows.innerHTML = '<p class="hint">could not reach ' + escEl(p.source.path) + ' from this page</p>'; });
  }
  if (p.kind === 'mint') {
    const btn = root.querySelector('[data-mint]');
    const hint = root.querySelector('[data-hint]');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const r = await fetch(p.source.path, { method: p.source.method });
        const env = await r.json();
        const ws = (env.results || [])[0];
        if (ws) {
          hint.textContent = ws.retention || '';
          rows.insertAdjacentHTML('beforeend', row({ id: ws.id, meta: 'minted ' + (ws.createdAt || ''), right: 'live' }));
        } else {
          hint.textContent = env.message || 'no record returned';
        }
      } catch { hint.textContent = 'mint failed — the door did not answer'; }
      btn.disabled = false;
    });
  }
}
`

/** Render the whole dashboard page from one config. */
export function renderDashboardPage(config) {
  const body = `
${config.demoNotice ? `<div class="demo-band"><div class="wrap"><span class="tag">demo</span><p>${esc(config.demoNotice)}</p></div></div>` : ''}
<main>
  <div class="wrap">
    <div class="dash">
${config.panels.map(panelShell).join('\n')}
    </div>
  </div>
</main>
<script type="application/json" id="dash-config">${JSON.stringify({
    panels: config.panels.map((p) => ({
      id: p.id,
      kind: p.kind,
      source: p.source,
      columns: p.columns,
      verdicts: p.verdicts,
    })),
  })}</script>`
  return renderPage({
    title: `${config.brand} — dashboard`,
    description: config.description,
    path: '/dashboard',
    body,
    script: HYDRATE,
  })
}
