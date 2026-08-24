/**
 * dashboard-template.js — the ABSTRACT DASHBOARD TEMPLATE, instance #2.
 *
 * Carried structurally from instance #1 (apis.dev
 * examples/apis.dev/src/site/dashboard-template.js @ 5085d0a, the #30
 * apps.ax template idea): a dashboard is a set of PANELS, each panel a
 * typed binding onto a door the origin already serves — never a second
 * implementation of the data. This file knows nothing about api.management;
 * see ./dashboard-config.js for the instance config. Shared-anatomy
 * contract: examples/DASHBOARD-FAMILY.md — divergence between instances is
 * a defect; amend the doc first.
 *
 * Panel kinds (v1 vocabulary from instance #1, unchanged):
 *   - collection — GET a same-origin door serving a typed envelope
 *                  (OK | EMPTY | BLOCKED | OFFER), rendered as ledger rows;
 *                  declarative column mapping (idKey, metaKeys, hrefKey);
 *                  an optional `verdicts` map annotates rows with REAL
 *                  external verdicts only — an absent key renders
 *                  "unscored", never an invented score.
 *   - mint       — a POST door that creates a record (the sandbox floor).
 *   - kv         — server-rendered facts; `demo: true` stamps the panel
 *                  DEMO for anything not wired to a live lane yet.
 *
 * ADDITIVE kinds introduced by instance #2 (generic — recorded in
 * DASHBOARD-FAMILY.md §template v1.1 for adoption at extraction):
 *   - ledger      — server-rendered ruled register rows from config data
 *                   (for inventories that are compiled facts, not a runtime
 *                   door): declarative columns, client-side filter, colhead.
 *   - instruments — a grid of verdict/status instrument panels (host, big
 *                   grade, n-of-scale meter cells, sourced receipt link).
 *
 * EXTRACTION PATH: when the shared template package exists, both instances
 * keep only their configs. Do not grow property-specific branches in here.
 */

import { renderPage } from "./style.js";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function kvEntries(entries) {
  return entries
    .map(([k, v]) => {
      const val =
        v && typeof v === "object"
          ? `<a href="${esc(v.href)}" ${v.href.startsWith("http") ? 'rel="noopener"' : ""}>${esc(v.label)}</a>`
          : esc(v);
      return `<dt>${esc(k)}</dt><dd>${val}</dd>`;
    })
    .join("\n");
}

function ledgerRows(p) {
  const cols = p.columns; // [{key, label, class}], first col = id-ish
  // NB: the grid rides a custom property, never an inline
  // grid-template-columns — an inline declaration would beat the <=980px
  // stacked-layout override and reintroduce the mobile overflow.
  const head = `<div class="colhead" style="--ledger-grid:${esc(p.grid)}">${cols
    .map((c) => `<span${c.right ? ' style="text-align:right"' : ""}>${esc(c.label)}</span>`)
    .join("")}</div>`;
  const rows = p.rows
    .map((r) => {
      const key = cols.map((c) => r[c.key]).join(" ").toLowerCase();
      const cells = cols
        .map((c) => {
          const raw = r[c.key];
          const html = c.html ? String(raw) : esc(raw == null ? "" : raw);
          return `<span class="${esc(c.class || "")}${c.stateKey && r[c.stateKey] === "live" ? " live" : ""}"${c.right ? ' style="text-align:right"' : ""}>${html}</span>`;
        })
        .join("");
      return `<div class="row" style="--ledger-grid:${esc(p.grid)}" data-k="${esc(key)}">${cells}</div>`;
    })
    .join("\n");
  const filter = p.filter
    ? `<div class="ledger-head"><div class="search"><input data-filter type="search" placeholder="${esc(p.filter.placeholder)}" aria-label="${esc(p.filter.placeholder)}"></div><div class="result-count"><b data-shown>${p.rows.length}</b> / ${p.rows.length} rows</div></div>`
    : "";
  return `${filter}<div class="ledger">${head}
${rows}
<div class="no-hits" data-nohits>No rows match. Clear the filter.</div></div>`;
}

function instrumentCells(v) {
  return Array.from({ length: v.scale }, (_, i) => `<i${i < v.value ? ' class="on"' : ""}></i>`).join("");
}

function instrumentsGrid(p) {
  return `<div class="instruments">${p.items
    .map(
      (v) => `<div class="instrument">
  <div class="host">${esc(v.host)}</div>
  <div class="big">${esc(v.headline)} <span>· ${v.value}/${v.scale}</span></div>
  <div class="cells" style="grid-template-columns:repeat(${v.scale},1fr)">${instrumentCells(v)}</div>
  <div class="src">${esc(v.note)}${v.href ? ` — <a href="${esc(v.href)}" rel="noopener">receipt</a>` : ""}</div>
</div>`,
    )
    .join("\n")}</div>`;
}

function panelShell(p) {
  const stamp = p.demo ? ` <span class="stamp-demo">demo</span>` : "";
  const src = p.source ? `<span class="src">${esc(p.source.method)} ${esc(p.source.path)}</span>` : "";
  let inner = "";
  if (p.kind === "kv") {
    inner = `<dl class="kv">\n${kvEntries(p.entries)}\n</dl>`;
  } else if (p.kind === "mint") {
    inner = `<div class="ledger-rows" data-rows></div>
      <p class="hint" data-hint>nothing minted yet in this browser session</p>
      <div class="act"><button class="mint" data-mint>${esc(p.cta)}</button></div>`;
  } else if (p.kind === "collection") {
    inner = `<div class="ledger-rows" data-rows><p class="hint">loading ${esc(p.source.path)}…</p></div>`;
  } else if (p.kind === "ledger") {
    inner = ledgerRows(p);
  } else if (p.kind === "instruments") {
    inner = instrumentsGrid(p);
  }
  return `<section class="panel${p.wide ? " wide" : ""}" id="panel-${esc(p.id)}" data-panel="${esc(p.id)}">
    <div class="panel-head"><h2>${esc(p.title)}${stamp}</h2>${src}</div>
    <div class="panel-body">
      ${inner}
      ${p.note ? `<p class="hint" style="margin-top:0.7rem">${esc(p.note)}</p>` : ""}
    </div>
  </section>`;
}

/** The generic hydration script — interprets the config island, calls only
 *  same-origin doors, and renders truthful empty/error states. Ledger
 *  panels get a client-side filter over server-rendered rows. */
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
      const results = env.results || (p.source.member && env[p.source.member]) || [];
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
        const rec = (env.results || [])[0];
        if (rec) {
          hint.textContent = rec.retention || '';
          rows.insertAdjacentHTML('beforeend', row({ id: rec.id, meta: 'minted ' + (rec.createdAt || ''), right: 'live' }));
        } else {
          hint.textContent = env.message || 'no record returned';
        }
      } catch { hint.textContent = 'mint failed — the door did not answer'; }
      btn.disabled = false;
    });
  }
  if (p.kind === 'ledger') {
    const input = root.querySelector('[data-filter]');
    if (!input) continue;
    const lrows = Array.prototype.slice.call(root.querySelectorAll('.ledger .row'));
    const shown = root.querySelector('[data-shown]');
    const none = root.querySelector('[data-nohits]');
    input.addEventListener('input', () => {
      const v = input.value.trim().toLowerCase();
      let n = 0;
      lrows.forEach((r) => { const hit = !v || r.getAttribute('data-k').indexOf(v) >= 0; r.classList.toggle('hide', !hit); if (hit) n++; });
      if (shown) shown.textContent = n;
      if (none) none.classList.toggle('show', n === 0);
    });
  }
}
`;

/** Render the whole dashboard page from one config. */
export function renderDashboardPage(config) {
  const body = `
${config.demoNotice ? `<div class="demo-band"><div class="wrap"><span class="tag">demo</span><p>${config.demoNoticeHtml || esc(config.demoNotice)}</p></div></div>` : ""}
<main>
  <div class="wrap">
    <div class="dash">
${config.panels.map(panelShell).join("\n")}
    </div>
  </div>
</main>
<script type="application/json" id="dash-config">${JSON.stringify({
    panels: config.panels.map((p) => ({
      id: p.id,
      kind: p.kind,
      source: p.source,
      columns: p.kind === "collection" ? p.columns : undefined,
      verdicts: p.verdicts,
    })),
  })}</script>`;
  return renderPage({
    title: `${config.brand} — ${config.pageName || "dashboard"}`,
    description: config.description,
    path: config.path || "/dashboard",
    body,
    script: HYDRATE,
  });
}
