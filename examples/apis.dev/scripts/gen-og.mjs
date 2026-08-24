#!/usr/bin/env node
/**
 * Generate the 1200x630 social card and emit it as src/site/og.js.
 *
 *   node scripts/gen-og.mjs
 *
 * PATTERN PROVENANCE: api.qa scripts/gen-assets.mjs (the family's og
 * pattern) — the card is rendered by headless Chrome from the SAME tokens
 * and typefaces the site uses, then inlined as base64 because this Worker
 * has no filesystem and no static-asset pipeline. Committed output; a
 * normal build does not run this — rerun only when tokens or copy change.
 *
 * WHY CHROME: the card is set in IBM Plex (a webfont). Chrome loads the
 * same Google Fonts stylesheet the site uses, so the card renders in the
 * real face from the real tokens (api.qa learned this the hard way with
 * rsvg/fontconfig silently substituting Helvetica).
 *
 * WHY THE TOKENS ARE PARSED OUT OF style.js: hand-copied values drift the
 * moment a token moves. The card is the dark UI, so the dark block is the
 * single source.
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME} — set CHROME=/path/to/chrome`)
  process.exit(1)
}

// --- tokens, read from the stylesheet rather than copied -------------------
const styleSrc = readFileSync(new URL('../src/site/style.js', import.meta.url), 'utf8')
const darkStart = styleSrc.indexOf('@media (prefers-color-scheme: dark)')
const darkBlock = styleSrc.slice(darkStart, styleSrc.indexOf('}', styleSrc.indexOf('--hatch', darkStart)))
function token(name) {
  const m = darkBlock.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!m) throw new Error(`token --${name} not found in style.js dark block`)
  return m[1].trim()
}
const T = Object.fromEntries(['bg', 'text', 'muted', 'accent', 'border'].map((n) => [n, token(n)]))
console.log('tokens read from style.js (dark block):')
for (const [k, v] of Object.entries(T)) console.log(`  --${k}: ${v}`)

const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;700&display=block">`

// --- the card: wordmark + the one line (api.qa card grammar: anything past
// the mark and one line is noise at feed-thumbnail size), plus the family's
// hatched separator band as the bottom edge. --------------------------------
const html = `<!doctype html><meta charset="utf-8">${FONTS}
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:${T.bg};color:${T.text};
    font-family:'IBM Plex Sans',sans-serif;overflow:hidden;position:relative;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px}
  .lockup{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:84px;letter-spacing:-.03em}
  .lockup .dot{color:${T.accent}}
  .lockup .tld{color:${T.muted};font-weight:400}
  .tagline{font-size:36px;font-weight:400;color:${T.muted};letter-spacing:-.015em}
  .hatch{position:absolute;left:0;right:0;bottom:0;height:26px;border-top:1px solid ${T.border};
    background-image:repeating-linear-gradient(-45deg,
      ${T.text.replace(')', ' / 0.13)')} 0, ${T.text.replace(')', ' / 0.13)')} 1px, transparent 2px, transparent 8px)}
</style>
<div class="lockup">apis<span class="dot">.</span><span class="tld">dev</span></div>
<div class="tagline">Define once. Ship five faces.</div>
<div class="hatch"></div>`

const tmp = mkdtempSync(join(tmpdir(), 'apisdev-og-'))
const htmlPath = join(tmp, 'og.html')
const pngPath = join(tmp, 'og.png')
writeFileSync(htmlPath, html)
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--virtual-time-budget=8000', '--window-size=1200,630',
  `--screenshot=${pngPath}`, `file://${htmlPath}`,
], { stdio: 'pipe' })

const b64 = readFileSync(pngPath).toString('base64')
const out = `/**
 * GENERATED FILE — do not edit by hand. Regenerate: node scripts/gen-og.mjs
 * 1200x630 social card, rendered by Chrome from the site's own dark tokens
 * and typefaces (family og pattern, per api.qa scripts/gen-assets.mjs).
 * Served at /og.png; referenced by og:image / twitter:image in style.js.
 */
export const OG_PNG_BASE64 = '${b64}'
`
writeFileSync(new URL('../src/site/og.js', import.meta.url), out)
console.log(`wrote src/site/og.js (${Math.round(b64.length / 1024)}KB base64, png ${Math.round((b64.length * 3) / 4 / 1024)}KB)`)
console.log(`preview: ${pngPath}`)
