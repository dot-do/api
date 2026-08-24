/**
 * embed-landing.mjs — regenerate src/landing.js from src/landing.html.
 *
 * src/landing.html is the EDITABLE source of the browser face (the crafted
 * landing carried over from the pre-cutover waitlist property, reframed to
 * the 2026-08-23 founder ruling on #9). src/landing.js is its generated
 * ES-module embedding, committed so both `node scripts/selfcheck.mjs` and
 * the deployed worker serve the identical bytes with no loader plugins.
 *
 *   node scripts/embed-landing.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '../src/landing.html')
const out = join(here, '../src/landing.js')

const html = readFileSync(src, 'utf8')
const body = `/**
 * landing.js — GENERATED from src/landing.html by scripts/embed-landing.mjs.
 * Do not edit by hand: edit landing.html and re-run the script.
 */

export const LANDING_HTML = ${JSON.stringify(html)}
`
writeFileSync(out, body)
console.log(`wrote ${out} (${body.length} bytes from ${html.length} bytes of HTML)`)
