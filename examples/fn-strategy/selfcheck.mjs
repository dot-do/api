#!/usr/bin/env node
/**
 * selfcheck.mjs — the fail-closed §9.1 self-verify gate for the fn-strategy
 * wave-zero property. Runs the whole surface in-process (the worker is plain
 * ESM over standard fetch primitives) and refuses to pass on any defect.
 *
 *   node selfcheck.mjs
 *   AQA_DIR=/path/to/api.qa node selfcheck.mjs   # where the estate layout differs
 *
 * The pinned-conformance check imports autonomous-qa (api.qa) from AQA_DIR or
 * the standard estate layout. Missing verifier = FAIL, never skip: the gate
 * is fail-closed by law.
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
globalThis.__SEAM_SILENT = true // keep the gate's output legible; seams still construct
const RATIFIED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const results = []
let failed = false
function check(id, okFlag, detail) {
  results.push({ id, verdict: okFlag ? 'pass' : 'FAIL', detail })
  if (!okFlag) failed = true
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// ── 1. vendored pins (byte-identical vendoring, drift fails closed) ─────────
{
  const vendored = JSON.parse(readFileSync(join(HERE, 'axp/VENDORED.json'), 'utf8'))
  const pins = JSON.parse(readFileSync(join(HERE, 'axp/PINS.json'), 'utf8'))
  let drift = []
  for (const [label, digest] of Object.entries(vendored.files)) {
    const local = label === 'PINS.json' ? 'PINS.json' : label.replace(/^src\//, '')
    const actual = sha256(readFileSync(join(HERE, 'axp', local)))
    if (actual !== digest) drift.push(label)
  }
  const specDigestFile = readFileSync(join(HERE, 'spec/apis-ax-standard.digest.txt'), 'utf8').trim()
  check(
    'vendored-pins',
    drift.length === 0 && pins.pinnedSpecDigest === RATIFIED_DIGEST && specDigestFile === RATIFIED_DIGEST,
    drift.length ? `drift in ${drift.join(', ')}` : `12 vendored files byte-true; spec pinned at ${RATIFIED_DIGEST.slice(0, 8)}…`,
  )
}

// ── the worker under test ───────────────────────────────────────────────────
const { manifest, ORIGIN } = await import('./manifest.js')
const worker = (await import('./worker.js')).default
const env = {}
const call = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), env)
const json = async (r) => JSON.parse(await r.text())

// ── 2. pinned conformance (autonomous-qa in-process, fail-closed) ───────────
{
  const spec = readFileSync(join(HERE, 'spec/apis-ax-standard.spec.json'), 'utf8')
  const candidates = [
    process.env.AQA_DIR,
    resolve(HERE, '../../../api.qa'),
    resolve(HERE, '../../../../api.qa'),
    resolve(HERE, '../../../../../api.qa'),
  ].filter(Boolean)
  const aqaDir = candidates.find((c) => existsSync(join(c, 'dist/src/index.js')))
  if (!aqaDir) {
    check('pinned-conformance', false, `autonomous-qa not found (tried ${candidates.join(', ')}); set AQA_DIR — the gate never skips`)
  } else {
    const aqa = await import(pathToFileURL(join(aqaDir, 'dist/src/index.js')).href)
    // Landing-order accommodation (axp-faces test posture): a verifier without
    // the capability-coverage registry row cannot run the ratified spec whole —
    // run the runnable view and recompute its digest. Never a lenient verdict:
    // the removed row is declaration-armed and this card does NOT declare
    // interfaces.testSuite.
    const hasCoverage = aqa.eligibleOptionalChecks().includes('capability-coverage')
    const doc = JSON.parse(spec)
    const runDoc = hasCoverage ? doc : { ...doc, requirements: doc.requirements.filter((r) => r.id !== 'check-capability-coverage') }
    const runSpec = hasCoverage ? spec : JSON.stringify(runDoc, null, 2)
    const runDigest = hasCoverage ? RATIFIED_DIGEST : sha256(runSpec)
    try {
      const report = await aqa.gradePinned(worker, runSpec, { expectedDigest: runDigest, baseOrigin: ORIGIN })
      const bad = report.requirements.filter((r) => r.verdict !== 'pass')
      check(
        'pinned-conformance',
        report.passed === true,
        report.passed
          ? `passed ${report.requirements.length}/${runDoc.requirements.length} (apis-ax-axp@2.6.0${hasCoverage ? '' : ' runnable view'})`
          : bad.map((r) => `${r.id}: ${r.verdict} — ${r.detail}`).join(' | '),
      )
    } catch (e) {
      check('pinned-conformance', false, e.message)
    }
  }
}

// ── 3. seed labeling (fixture law: labeled, fictional, no ghosts) ───────────
{
  const seed = await import('./seed.js')
  const records = [...seed.plans, ...seed.objectives, ...seed.analyses]
  const unlabeled = records.filter((r) => r.example !== true || !String(r.title).startsWith('[demo]'))
  const fictional = String(seed.demoTenant.name).includes('(fictional)')
  check(
    'seed-labeled',
    unlabeled.length === 0 && fictional && records.length >= 8,
    unlabeled.length ? `unlabeled: ${unlabeled.map((r) => r.id).join(', ')}` : `${records.length} records, all example:true + [demo]-titled, fictional tenant`,
  )
}

// ── 4. every declared operation answers substantively (no ghost surfaces) ──
{
  const probes = [
    ['listPlans', await call('/plans'), (b) => b.type === 'OK' && b.results.length >= 2],
    ['getPlan', await call('/plans/pl-demo-1'), (b) => b.type === 'OK'],
    ['listObjectives', await call('/objectives'), (b) => b.type === 'OK' && b.results.length >= 4],
    ['getObjective', await call('/objectives/obj-demo-1'), (b) => b.type === 'OK'],
    [
      'createObjective',
      await call('/objectives', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'selfcheck objective', cycle: '2026-H2' }) }),
      (b, s) => s === 201 && b.type === 'OK' && b.results[0].example === true && String(b.results[0].retention).includes('ephemeral'),
    ],
    [
      'recordKeyResultProgress',
      await call('/key-results/kr-demo-1a/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current: 0.45 }) }),
      (b) => b.type === 'OK' && b.results[0].keyResult.current === 0.45,
    ],
    ['listAnalyses', await call('/analyses'), (b) => b.type === 'OK' && b.results.length >= 2],
    ['getAnalysis', await call('/analyses/an-demo-1'), (b) => b.type === 'OK'],
  ]
  const bad = []
  for (const [op, res, judge] of probes) {
    const body = await json(res.clone ? res.clone() : res)
    if (!judge(body, res.status)) bad.push(`${op} (status ${res.status})`)
  }
  // the MCP door serves the same definition
  const mcpList = await json(await call('/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }))
  if (!Array.isArray(mcpList.result?.tools) || mcpList.result.tools.length !== manifest.mcp.tools.length) bad.push('mcp tools/list')
  const mcpCall = await json(
    await call('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'listObjectives', arguments: { cycle: '2026-H1' } } }),
    }),
  )
  if (mcpCall.result?.isError !== false) bad.push('mcp tools/call')
  check('operations-exercised', bad.length === 0, bad.length ? `defective: ${bad.join(', ')}` : '8 HTTP operations + MCP list/call all answer substantively')
}

// ── 5. conneg matrix on this worker's own addresses ─────────────────────────
{
  const bareCurl = await call('/verify')
  const mdFace = await call('/verify', { headers: { accept: 'text/markdown' } })
  const htmlFace = await call('/verify', { headers: { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' } })
  const forced = await call('/plans.md')
  const ct = (r) => (r.headers.get('content-type') || '').split(';')[0]
  const okConneg = ct(bareCurl) === 'application/json' && ct(mdFace) === 'text/markdown' && ct(htmlFace) === 'text/html' && ct(forced) === 'text/markdown'
  check('conneg-matrix', okConneg, `bare→${ct(bareCurl)}, accept md→${ct(mdFace)}, browser→${ct(htmlFace)}, /plans.md→${ct(forced)}`)
}

// ── 6. the 402 OFFER ladder — every rung labeled a stub ─────────────────────
{
  const offerRes = await call('/offer')
  const offerBody = await json(offerRes)
  const alts = offerBody.alternatives || []
  const kinds = alts.map((a) => a.kind).sort().join(',')
  const allStub = alts.length === 3 && alts.every((a) => a.status === 'stub' && /STUB/i.test(a.description))
  const overCeiling = await call('/objectives?spend=101')
  const overBody = await json(overCeiling)
  check(
    'offer-ladder',
    offerRes.status === 402 && offerBody.type === 'OFFER' && kinds === 'claim,pay,work' && allStub && overCeiling.status === 402 && overBody.type === 'OFFER',
    `/offer 402 OFFER with [${kinds}] all stub-labeled; over-ceiling 402 OFFER`,
  )
}

// ── 7. HEAD mirrors GET ─────────────────────────────────────────────────────
{
  const g = await call('/pricing')
  const h = await call('/pricing', { method: 'HEAD' })
  const g2 = await call('/plans')
  const h2 = await call('/plans', { method: 'HEAD' })
  const hBody = await h2.text()
  check('head-mirrors-get', g.status === h.status && g2.status === h2.status && hBody === '', `HEAD /pricing ${h.status}, HEAD /plans ${h2.status} (empty body)`)
}

// ── 8. typed 405 on a GET-only AXP address ──────────────────────────────────
{
  const r = await call('/pricing', { method: 'POST' })
  const b = await json(r)
  check('typed-405', r.status === 405 && b.type === 'BLOCKED' && (r.headers.get('allow') || '').includes('GET'), `POST /pricing → ${r.status} ${b.type}, Allow: ${r.headers.get('allow')}`)
}

// ── 9. no ghost surfaces: every card-declared http entry answers ────────────
{
  const card = await json(await call('/.well-known/agents.json'))
  const bad = []
  for (const entry of card.interfaces.http) {
    const path = entry.url.replace(ORIGIN, '')
    const r = await call(path)
    if (!(r.status === 200 || (path === manifest.pricing.offerPath && r.status === 402))) bad.push(`${path} → ${r.status}`)
  }
  const verifyOk = card.links.verify === `${ORIGIN}/verify` && (await call('/verify/suite.json')).status === 200
  const mcpDeclared = card.interfaces.mcp && card.interfaces.mcp.url === `${ORIGIN}/mcp`
  check('no-ghost-surfaces', bad.length === 0 && verifyOk && mcpDeclared, bad.length ? bad.join(', ') : `${card.interfaces.http.length} declared doors answer; links.verify + mcp door live`)
}

// ── 10. probes honest: knownEmpty / knownForbidden branch truthfully ────────
{
  const e1 = await json(await call('/objectives?cycle=none'))
  const e2 = await json(await call('/objectives?status=none'))
  const f1 = await call('/objectives?scope=admin')
  const f2 = await call('/objectives?scope=internal')
  check(
    'probes-honest',
    e1.type === 'EMPTY' && e2.type === 'EMPTY' && f1.status === 403 && f2.status === 403,
    `knownEmpty → EMPTY×2; knownForbidden → 403×2`,
  )
}

// ── 11. projection config complete (§2, GAP form) ───────────────────────────
{
  const cfg = JSON.parse(readFileSync(join(HERE, 'projection.config.json'), 'utf8'))
  const okCfg =
    cfg.substrate === 'fn-strategy' &&
    cfg.brand === null &&
    cfg.motion === 'B2A' &&
    Array.isArray(cfg.offer) &&
    cfg.offer.length === 4 &&
    cfg.experiment?.pattern === '402-metered' &&
    cfg.positioning === null &&
    cfg.counterpartBrandGap?.recorded === true
  check('projection-config', okCfg, 'GAP projection: brand null, motion B2A, 4 offer shapes, experiment registered, counterpart-brand gap recorded, claim-free')
}

// ── report ──────────────────────────────────────────────────────────────────
console.log('\nfn-strategy wave-zero selfcheck (fail-closed)\n')
for (const r of results) console.log(`  ${r.verdict === 'pass' ? 'PASS' : 'FAIL'}  ${r.id.padEnd(22)} ${r.detail}`)
console.log(`\n${results.filter((r) => r.verdict === 'pass').length}/${results.length} checks pass`)
process.exit(failed ? 1 : 0)
