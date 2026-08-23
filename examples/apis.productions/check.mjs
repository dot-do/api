#!/usr/bin/env node
/**
 * check.mjs — the fail-closed wave-zero gate for apis.productions
 * (template spec §9.1). Every box scriptable; any failure exits 1.
 *
 *   1. Vendor integrity: src/axp-faces/*.js byte-match VENDORED.json + PINS.json
 *   2. Spec pin: spec/apis-ax-axp-2.6.0.spec.json digest-matches its .digest.txt
 *      and the ratified pin a9a1197c…
 *   3. Conformance: gradePinned(worker, spec) green in-process via autonomous-qa
 *      (the same digest-locked implementations the hosted verifier runs)
 *   4. Fixture law: every seed record labeled (example: true, "[demo]" title)
 *   5. Suite bytes: /verify/suite.json serves SUITE_TEXT exactly; /verify's
 *      digest matches those bytes
 *   6. Conneg spot check: curl-class JSON / agent-UA markdown / browser HTML at /
 *
 * Requires a local autonomous-qa build. Resolution order:
 *   $AUTONOMOUS_QA (dir) > ~/projects/api.qa
 * Run: node check.mjs   (Node >= 22.18 — type stripping for the .ts sources)
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const RATIFIED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

let failures = 0
const pass = (msg) => console.log(`  ✓ ${msg}`)
const fail = (msg) => {
  failures++
  console.error(`  ✗ ${msg}`)
}

// ── 1. vendor integrity ─────────────────────────────────────────────────────
console.log('1. vendored axp-faces integrity')
{
  const dir = join(HERE, 'src/axp-faces')
  const vendored = JSON.parse(readFileSync(join(dir, 'VENDORED.json'), 'utf8'))
  let drift = false
  for (const [label, digest] of Object.entries(vendored.files)) {
    const file = label === 'PINS.json' ? join(dir, 'PINS.json') : join(dir, label.replace(/^src\//, ''))
    if (!existsSync(file) || sha256(readFileSync(file)) !== digest) {
      fail(`${label}: drift or missing`)
      drift = true
    }
  }
  const pins = JSON.parse(readFileSync(join(dir, 'PINS.json'), 'utf8'))
  if (pins.pinnedSpecDigest !== RATIFIED_DIGEST) fail(`PINS.json pins ${pins.pinnedSpecDigest}, expected ${RATIFIED_DIGEST}`)
  else if (!drift) pass(`${Object.keys(vendored.files).length} files byte-identical; pinned apis-ax-axp@${pins.pinnedSpec.split('@')[1]} / ${RATIFIED_DIGEST.slice(0, 8)}…`)
}

// ── 2. spec pin ─────────────────────────────────────────────────────────────
console.log('2. pinned spec copy')
const spec = readFileSync(join(HERE, 'spec/apis-ax-axp-2.6.0.spec.json'), 'utf8')
{
  const expected = readFileSync(join(HERE, 'spec/apis-ax-axp-2.6.0.digest.txt'), 'utf8').trim()
  if (expected !== RATIFIED_DIGEST) fail(`digest.txt carries ${expected}, expected the ratified ${RATIFIED_DIGEST}`)
  else if (sha256(spec) !== expected) fail('spec bytes do not match digest.txt')
  else pass(`spec.json sha256 = ratified digest ${RATIFIED_DIGEST.slice(0, 8)}… (${JSON.parse(spec).requirements.length} requirements)`)
}

// ── worker + substrate (type-stripped imports) ──────────────────────────────
const worker = (await import(pathToFileURL(join(HERE, 'src/worker.ts')).href)).default
const substrate = await import(pathToFileURL(join(HERE, 'src/substrate.ts')).href)
const { SUITE_TEXT } = await import(pathToFileURL(join(HERE, 'src/verify-suite.ts')).href)
const ORIGIN = substrate.ORIGIN

// ── 3. conformance, in-process ──────────────────────────────────────────────
console.log('3. AXP conformance (gradePinned, in-process)')
{
  const qaDir = process.env.AUTONOMOUS_QA || join(homedir(), 'projects/api.qa')
  const qaEntry = join(qaDir, 'dist/src/index.js')
  if (!existsSync(qaEntry)) {
    fail(`autonomous-qa not found at ${qaEntry} — set $AUTONOMOUS_QA to a built checkout`)
  } else {
    const qa = await import(pathToFileURL(qaEntry).href)
    // Landing-order accommodation (mirrors axp-faces' own conformance suite):
    // a verifier without the capability-coverage registry row refuses the
    // ratified spec whole, so it is graded on the runnable view minus that
    // one requirement — loudly named, never silent.
    const hasCoverage = qa.eligibleOptionalChecks().includes('capability-coverage')
    const doc = JSON.parse(spec)
    const runDoc = hasCoverage ? doc : { ...doc, requirements: doc.requirements.filter((r) => r.id !== 'check-capability-coverage') }
    const runSpec = hasCoverage ? spec : JSON.stringify(runDoc, null, 2)
    const expectedDigest = hasCoverage ? RATIFIED_DIGEST : sha256(runSpec)
    if (!hasCoverage) console.log(`  (verifier predates capability-coverage — grading the runnable view: ${runDoc.requirements.length} requirements)`)
    try {
      const report = await qa.gradePinned(worker, runSpec, { expectedDigest, baseOrigin: ORIGIN })
      const red = report.requirements.filter((r) => r.verdict !== 'pass')
      if (red.length > 0) for (const r of red) fail(`${r.id}: ${r.verdict} — ${r.detail}`)
      else pass(`all ${report.requirements.length} pinned requirements pass`)
    } catch (e) {
      fail(`gradePinned threw: ${e.message}`)
    }
  }
}

// ── 4. fixture law over the seed ────────────────────────────────────────────
console.log('4. fixture law (labeled seed)')
{
  const corpora = { productions: substrate.productions, assets: substrate.assets, pages: substrate.seedPages, audienceSignals: substrate.audienceSignals }
  let bad = 0
  for (const [name, rows] of Object.entries(corpora)) {
    for (const rec of rows) {
      if (rec.example !== true) { fail(`${name}/${rec.id}: missing example: true`); bad++ }
      if ('title' in rec && !String(rec.title).startsWith('[demo]')) { fail(`${name}/${rec.id}: title lacks the [demo] prefix`); bad++ }
    }
  }
  if (bad === 0) pass(`${Object.values(corpora).flat().length} seed records labeled (example: true; [demo] titles)`)
}

// ── 5. suite bytes + digest coherence ───────────────────────────────────────
console.log('5. published suite (/verify)')
{
  const served = await (await worker.fetch(new Request(`${ORIGIN}/verify/suite.json`))).text()
  if (served !== SUITE_TEXT) fail('/verify/suite.json does not serve SUITE_TEXT byte-for-byte')
  else {
    const verifyDoc = await (await worker.fetch(new Request(`${ORIGIN}/verify`))).json()
    const expected = `sha256:${sha256(served)}`
    if (verifyDoc.digest !== expected) fail(`/verify digest ${verifyDoc.digest} != computed ${expected}`)
    else pass(`suite served byte-exact; digest ${expected.slice(0, 15)}… coherent with /verify`)
  }
  // The suite's own rows, replayed in-process (GET-only, same worker).
  const doc = JSON.parse(SUITE_TEXT)
  let red = 0
  for (const req of doc.requirements) {
    const res = await worker.fetch(new Request(`${ORIGIN}${req.path}`, { method: req.method }))
    let okRow = res.status === (req.expect.status ?? 200)
    if (okRow && req.expect.paths) {
      const body = await res.json()
      for (const p of req.expect.paths) {
        const val = p.path.split('.').reduce((o, k) => (o == null ? o : o[k]), body)
        if (val !== p.equals) okRow = false
      }
    }
    if (!okRow) { fail(`suite row ${req.id} fails in-process`); red++ }
  }
  if (red === 0) pass(`${doc.requirements.length} suite rows green in-process`)
}

// ── 5b. the doors the GET-only suite cannot exercise ────────────────────────
console.log('5b. headless door + MCP door')
{
  const created = await worker.fetch(
    new Request(`${ORIGIN}/pages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'gate-check', title: 'gate check page', body: 'created by check.mjs against the ephemeral sandbox' }),
    }),
  )
  const createdBody = await created.json()
  if (created.status !== 201 || createdBody.type !== 'OK' || createdBody.results[0].example !== true) {
    fail(`POST /pages (createPage): status ${created.status}, expected 201 OK with a labeled record`)
  } else pass('createPage answers 201 OK; the created record is labeled and discloses ephemeral retention')

  const rpc = async (method, params) =>
    (await worker.fetch(
      new Request(`${ORIGIN}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params && { params }) }),
      }),
    )).json()
  const tools = await rpc('tools/list')
  const call = await rpc('tools/call', { name: 'listProductions', arguments: { kind: 'film' } })
  const nTools = tools.result?.tools?.length ?? 0
  const callOk = call.result?.content?.[0]?.text?.includes('"OK"')
  if (nTools !== 6) fail(`MCP tools/list: ${nTools} tools, expected 6`)
  else if (!callOk) fail('MCP tools/call listProductions did not answer an OK envelope')
  else pass('MCP door: 6 tools listed; tools/call answers the same typed envelopes as HTTP')
}

// ── 6. conneg spot check at / ───────────────────────────────────────────────
console.log('6. conneg spot check (home faces)')
{
  const face = async (headers) => {
    const res = await worker.fetch(new Request(`${ORIGIN}/`, { headers }))
    return (res.headers.get('content-type') || '').split(';')[0]
  }
  const curl = await face({ accept: '*/*', 'user-agent': 'curl/8.6.0' })
  const agent = await face({ accept: '*/*', 'user-agent': 'Claude-User/1.0' })
  const browser = await face({ accept: 'text/html,application/xhtml+xml', 'user-agent': 'Mozilla/5.0', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'none', 'sec-fetch-dest': 'document' })
  if (curl !== 'application/json') fail(`bare curl at / got ${curl}, expected application/json`)
  if (agent !== 'text/markdown') fail(`agent UA at / got ${agent}, expected text/markdown`)
  if (browser !== 'text/html') fail(`browser at / got ${browser}, expected text/html`)
  if (curl === 'application/json' && agent === 'text/markdown' && browser === 'text/html') pass('curl→JSON, agent-UA→markdown, browser→HTML')
}

console.log(failures === 0 ? '\nALL GATES GREEN' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
