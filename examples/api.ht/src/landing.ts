/**
 * HTML faces — landings and docs ONLY.
 *
 * api.ht data routes are always JSON (every entity value an absolute URL);
 * the only HTML in the property is:
 *   - the apex landing (api.ht/)
 *   - each tool root ({tool}.api.ht/)
 *   - /docs
 *   - the /callback key page
 * Each landing links straight into live JSON views so a visitor can start
 * clicking without reading anything.
 */

import type { LinkContext } from './links'
import type { HypertextTool, ToolRegistry } from './registry'
import type { CallbackResult } from './auth'

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Shared HTML shell — exported so tools with a custom landing keep the property's one design. */
export function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --bg:#fff; --fg:#111; --muted:#666; --line:#e5e5e5; --accent:#0550ae; --code:#f6f8fa; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0d1117; --fg:#e6edf3; --muted:#8b949e; --line:#30363d; --accent:#58a6ff; --code:#161b22; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 44rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; letter-spacing: -0.02em; }
  h1 .tld { color: var(--muted); font-weight: 400; }
  h2 { font-size: 1.05rem; margin: 2.25rem 0 .5rem; }
  p { margin: .5rem 0; }
  .muted { color: var(--muted); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code, pre { font: 0.85rem/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre { background: var(--code); border: 1px solid var(--line); border-radius: 8px;
    padding: .8rem 1rem; overflow-x: auto; }
  code { background: var(--code); border-radius: 4px; padding: .1rem .3rem; }
  pre code { background: none; border: none; padding: 0; }
  ul.links { list-style: none; padding: 0; margin: .5rem 0; }
  ul.links li { padding: .35rem 0; border-bottom: 1px solid var(--line); }
  ul.links li:last-child { border-bottom: none; }
  ul.links .desc { color: var(--muted); font-size: .9rem; }
  .btn { display: inline-block; background: var(--fg); color: var(--bg); border-radius: 8px;
    padding: .5rem 1rem; font-weight: 600; }
  .btn:hover { text-decoration: none; opacity: .85; }
  .note { border-left: 3px solid var(--line); padding: .25rem 0 .25rem .85rem; color: var(--muted); font-size: .9rem; }
  .key { font-size: 1.05rem; user-select: all; }
  footer { margin-top: 3rem; color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`
}

export function rootLandingHtml(tools: ToolRegistry, links: LinkContext): string {
  const rows = Object.values(tools)
    .map((t) => {
      const example = t.examples[0]
      return `<li><a href="${esc(links.href(t.name, example))}"><code>${esc(t.name)}.api.ht/${esc(example)}</code></a>
        <div class="desc">${esc(t.description)}</div></li>`
    })
    .join('\n')

  return page('api.ht', `
<h1>api<span class="tld">.ht</span></h1>
<p class="muted">Hypertext APIs. Every response is JSON. Every value is a link.</p>

<h2>The grammar</h2>
<pre><code>[tool].api.ht/[value]</code></pre>
<p class="muted">The path is the query. No docs to read first — click any value in any response and keep going.
There is no central directory: you navigate the graph by following links.</p>

<h2>Start clicking</h2>
<ul class="links">
${rows}
</ul>

<h2>From a terminal or an agent</h2>
<pre><code>curl ${esc(links.href('ip', '1.1.1.1'))}</code></pre>
<p class="muted">Same bytes as the browser — pure JSON, links included.</p>

<h2>Free tier</h2>
<p><a class="btn" href="${esc(links.apex('/login'))}">Sign in with GitHub</a></p>
<p class="note">Anonymous use is free. Signing in issues an API key for higher limits — the OAuth flow is stubbed in this preview.</p>

<footer><a href="${esc(links.apex('/docs'))}">docs</a> · <a href="${esc(links.apex('/'))}">api.ht</a></footer>
`)
}

export function toolLandingHtml(tool: HypertextTool, links: LinkContext): string {
  const rows = tool.examples
    .map((v) => `<li><a href="${esc(links.href(tool.name, v))}"><code>${esc(tool.name)}.api.ht/${esc(v)}</code></a></li>`)
    .join('\n')

  return page(`${tool.name}.api.ht`, `
<h1>${esc(tool.name)}<span class="tld">.api.ht</span></h1>
<p class="muted">${esc(tool.description)}</p>

<h2>Usage</h2>
<pre><code>${esc(tool.name)}.api.ht/${esc(tool.valueSyntax)}</code></pre>
<p class="muted">Data source: ${esc(tool.source)}</p>

<h2>Try it — these are live JSON views</h2>
<ul class="links">
${rows}
</ul>

<h2>From a terminal or an agent</h2>
<pre><code>curl ${esc(links.href(tool.name, tool.examples[0]))}</code></pre>

<p><a class="btn" href="${esc(links.apex('/login'))}">Sign in with GitHub</a></p>
<p class="note">Anonymous use is free; sign-in (stubbed in this preview) issues a key for higher limits.</p>

<footer><a href="${esc(links.apex('/docs'))}">docs</a> · <a href="${esc(links.apex('/'))}">api.ht</a></footer>
`)
}

export function docsHtml(tools: ToolRegistry, links: LinkContext): string {
  const rows = Object.values(tools)
    .map((t) => `<li><a href="${esc(links.href(t.name))}"><code>${esc(t.name)}</code></a> — ${esc(t.description)}
      <div class="desc">value: <code>${esc(t.valueSyntax)}</code> · source: ${esc(t.source)}</div></li>`)
    .join('\n')

  return page('api.ht docs', `
<h1>api<span class="tld">.ht</span> <span class="muted">docs</span></h1>

<h2>One rule</h2>
<p><code>[tool].api.ht/[value]</code> — the path is the query. Every data route returns JSON.
Every value in that JSON that references another entity is an absolute URL you can follow —
in a browser, in curl output, or from an agent. Discovery happens by clicking, not by
browsing a catalog.</p>

<h2>Envelope</h2>
<pre><code>{
  "api":   { "name": "api.ht", ... },
  "links": { "self": "...", ...related views... },
  "data":  { ...every entity value is an absolute URL... }
}</code></pre>

<h2>Tools</h2>
<ul class="links">
${rows}
</ul>

<h2>Data provenance</h2>
<p class="muted">Live lookups use free public sources (Cloudflare DoH, RDAP, RIPEstat, Wikipedia).
Anything mocked or heuristic says so in its <code>source</code> field — always read it.</p>

<h2>Auth</h2>
<p class="muted">Anonymous use is free. <a href="${esc(links.apex('/login'))}">/login</a> starts the
GitHub OAuth flow (stubbed in this preview) and <code>/callback</code> shows your free-tier key.</p>

<footer><a href="${esc(links.apex('/'))}">api.ht</a></footer>
`)
}

export function callbackHtml(result: CallbackResult, links: LinkContext): string {
  return page('api.ht — your key', `
<h1>You're in<span class="tld">.</span></h1>
<p class="muted">Free tier, ready to use.</p>

<h2>Your API key</h2>
<pre><code class="key">${esc(result.apiKey)}</code></pre>
<p class="note">${esc(result.note)}</p>

<h2>Use it</h2>
<pre><code>curl -H "Authorization: Bearer ${esc(result.apiKey)}" \\
  ${esc(links.href('ip', '1.1.1.1'))}</code></pre>

<footer><a href="${esc(links.apex('/docs'))}">docs</a> · <a href="${esc(links.apex('/'))}">api.ht</a></footer>
`)
}
