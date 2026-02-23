#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const tsvPath = resolve(ROOT, '../.do/workers/domains/do.tsv')
const outPath = resolve(ROOT, 'src/domains.ts')

const content = readFileSync(tsvPath, 'utf-8')
const domains = content
  .split('\n')
  .slice(1) // skip header
  .map((line) => line.trim())
  .filter(Boolean)

const output = `// Auto-generated from .do/workers/domains/do.tsv
// Run: npx tsx scripts/generate-domains.ts
export const DO_DOMAINS: string[] = ${JSON.stringify(domains, null, 2)}
`

writeFileSync(outPath, output)
console.log(`Generated ${outPath} with ${domains.length} domains`)
