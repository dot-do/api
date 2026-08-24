#!/usr/bin/env node
/**
 * Generate src/site/icons.js — every UI icon this site ships, resolved at
 * BUILD time from Iconify data and committed as inline SVG strings.
 *
 *   node scripts/gen-icons.mjs
 *
 * PATTERN PROVENANCE: the estate's build-time icon rule (api.qa src/icons.ts:
 * "no glyph path data is written by hand anywhere in this repo"; studio
 * site-v3/build.mjs: Iconify names as the authoring interface, resolved
 * against a vendored collection at build time, zero runtime icon fetches).
 * This is the single-worker instantiation: the generator inlines the SVG
 * bodies into a committed module; the Worker serves them as strings and
 * never fetches an icon at runtime.
 *
 * Deps are generation-time only and deliberately not in any manifest — like
 * gen-og.mjs, a normal build never runs this. Resolve them either from a
 * local `npm i --no-save @iconify/utils @iconify-json/lucide`, or point
 * ICONIFY_MODULES at a node_modules that has both.
 *
 * Collection: lucide — the family choice (api.qa icons.ts imports
 * lucide-static; studio ICONS_FOR maps the engineered 2px-stroke voice to
 * lucide). Same geometry: 24-box, 2px stroke, round caps and joins.
 */
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bases = [import.meta.url]
if (process.env.ICONIFY_MODULES) bases.unshift(pathToFileURL(process.env.ICONIFY_MODULES + '/x.js').href)
let utils, collection
for (const base of bases) {
  try {
    const req = createRequire(base)
    utils = req('@iconify/utils')
    collection = req('@iconify-json/lucide/icons.json')
    break
  } catch { /* try the next base */ }
}
if (!utils) {
  console.error('cannot resolve @iconify/utils + @iconify-json/lucide — npm i --no-save them here, or set ICONIFY_MODULES=/path/to/node_modules')
  process.exit(1)
}

/** name → [export, default css class, rendered size in px] */
const ICONS = [
  ['menu', 'menuIcon', 'icon', 20],
  ['x', 'closeIcon', 'icon', 16],
]

const fns = ICONS.map(([name, exportName, cls, size]) => {
  const data = utils.getIconData(collection, name)
  if (!data) throw new Error(`lucide has no icon "${name}"`)
  const svg = utils.iconToSVG(data, { height: 24 })
  return `/** lucide "${name}" — inline SVG resolved at build time; sized ${size}px, colored by currentColor. */
export function ${exportName}(cls = '${cls}') {
  return \`<svg class="\${cls}" width="${size}" height="${size}" viewBox="${svg.attributes.viewBox}" aria-hidden="true">${svg.body}</svg>\`
}`
})

const out = `/**
 * GENERATED FILE — do not edit by hand. Regenerate: node scripts/gen-icons.mjs
 * UI icons as build-time-inlined SVG (Iconify data, lucide collection).
 * Estate rule (api.qa icons.ts / studio site-v3): no hand-authored glyph
 * path data, no unicode symbols as icons, zero runtime icon fetches.
 */
${fns.join('\n\n')}
`
writeFileSync(new URL('../src/site/icons.js', import.meta.url), out)
console.log(`wrote src/site/icons.js — ${ICONS.length} icons (lucide, build-time inlined)`)
