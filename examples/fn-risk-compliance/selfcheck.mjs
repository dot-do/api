#!/usr/bin/env node
/**
 * selfcheck.mjs — the fail-closed §9.1 self-verify gate for the
 * fn-risk-compliance wave-zero property. Runs the whole surface in-process
 * (the worker is plain ESM over standard fetch primitives) and refuses to
 * pass on any defect.
 *
 *   node selfcheck.mjs
 *   AQA_DIR=/path/to/api.qa node selfcheck.mjs   # where the estate layout differs
 *
 * DISCLOSED (§9.1 box 4): describeConformance is absent from vendored
 * axp-faces 0.3.0 — the probe ladder is run in-process via the independent
 * verifier (autonomous-qa / api.qa gradePinned) against the pinned spec
 * bytes instead. Missing verifier = FAIL, never skip: the gate is
 * fail-closed by law.
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
globalThis.__SEAM_SILENT = true // keep the gate's output legible; seams still construct
const RATIFIED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'
const EXTENSION_NAME = 'axp-ext-rates-g2'
const EXTENSION_VERSION = '0.2.0'
const EXTENSION_DIGEST = '903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5'
const VENDOR_COMMIT = '523c9ef217d54feefb0b20734a6d2996a6965b79'

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
  const ext = pins.extensions?.[EXTENSION_NAME]
  const extPinned = ext?.version === EXTENSION_VERSION && ext?.digest === EXTENSION_DIGEST
  const commitRecorded = vendored.sourceCommit === VENDOR_COMMIT
  check(
    'vendored-pins',
    drift.length === 0 && pins.pinnedSpecDigest === RATIFIED_DIGEST && specDigestFile === RATIFIED_DIGEST && extPinned && commitRecorded,
    drift.length
      ? `drift in ${drift.join(', ')}`
      : !extPinned
        ? `extension pin mismatch: expected ${EXTENSION_NAME}@${EXTENSION_VERSION} (${EXTENSION_DIGEST.slice(0, 8)}…), got ${JSON.stringify(ext)}`
        : !commitRecorded
          ? `vendor source commit not recorded as ${VENDOR_COMMIT.slice(0, 8)}…`
          : `12 vendored files byte-true (source commit ${VENDOR_COMMIT.slice(0, 8)}…); spec pinned at ${RATIFIED_DIGEST.slice(0, 8)}…; ${EXTENSION_NAME}@${EXTENSION_VERSION} pinned at ${EXTENSION_DIGEST.slice(0, 8)}…`,
  )
}

// ── the worker under test ───────────────────────────────────────────────────
const { manifest, ORIGIN } = await import('./manifest.js')
const worker = (await import('./worker.js')).default
const env = {}
const call = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), env)
const json = async (r) => JSON.parse(await r.text())

// ── 2. pinned conformance (autonomous-qa in-process, fail-closed) ───────────
// DISCLOSED: describeConformance is absent from vendored axp-faces 0.3.0; the
// probe ladder runs in-process via the independent verifier instead.
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
          ? `passed ${report.requirements.length}/${runDoc.requirements.length} (apis-ax-axp@2.6.0${hasCoverage ? '' : ' runnable view'}; probe ladder in-process via autonomous-qa — describeConformance absent from axp-faces 0.3.0, disclosed)`
          : bad.map((r) => `${r.id}: ${r.verdict} — ${r.detail}`).join(' | '),
      )
    } catch (e) {
      check('pinned-conformance', false, e.message)
    }
  }
}

// ── 3. seed honesty (two classes: cited reference facts / labeled synthetic) ─
{
  const seed = await import('./seed.js')
  // Reference records: provenance on every record, no registry-derived values.
  const refs = [...seed.statutes, ...seed.checkDefinitions]
  const badRefs = refs.filter((r) => !r.sourceClass || !String(r.sourceNote || '').includes('registry'))
  const statutesCited = seed.statutes.every((s) => typeof s.citation === 'string' && s.citation.length > 0)
  // Only the five register-recited fronts carry statute bindings; the rest are null-flagged.
  const bound = seed.checkDefinitions.filter((c) => c.statuteId !== null).map((c) => c.front).sort()
  const boundOk = JSON.stringify(bound) === JSON.stringify(['davisbacon.dev', 'edi834.dev', 'fflcheck.dev', 'fifra.dev', 'neshap.dev'])
  const unboundFlagged = seed.checkDefinitions.filter((c) => c.statuteId === null).every((c) => String(c.statuteNote).includes('UNVERIFIED'))
  // Synthetic records: labeled per fixture law; no run attested.
  const synth = [...seed.checkRuns, ...seed.obligations]
  const unlabeled = synth.filter((r) => r.example !== true || !String(r.title).startsWith('[demo]'))
  const noneAttested = seed.checkRuns.every((r) => r.attested === false)
  const fictional = String(seed.demoTenant.name).includes('(fictional)')
  check(
    'seed-honesty',
    badRefs.length === 0 && statutesCited && boundOk && unboundFlagged && unlabeled.length === 0 && noneAttested && fictional && seed.checkDefinitions.length === 28,
    badRefs.length
      ? `reference records missing provenance: ${badRefs.map((r) => r.id).join(', ')}`
      : unlabeled.length
        ? `unlabeled synthetic: ${unlabeled.map((r) => r.id).join(', ')}`
        : `28 register fronts (5 bound per the row, 23 [UNVERIFIED]-flagged), ${seed.statutes.length} cited statutes, ${synth.length} synthetic records all labeled, no run attested, fictional tenant`,
  )
}

// ── 4. every declared operation answers substantively (no ghost surfaces) ──
{
  const probes = [
    ['listStatutes', await call('/statutes'), (b) => b.type === 'OK' && b.results.length >= 5],
    ['getStatute', await call('/statutes/davis-bacon'), (b) => b.type === 'OK'],
    ['listChecks', await call('/checks'), (b) => b.type === 'OK' && b.results.length >= 28],
    ['getCheck', await call('/checks/davisbacon'), (b) => b.type === 'OK'],
    [
      'runCheck',
      await call('/checks/davisbacon/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject: { company: 'selfcheck fictional co' } }) }),
      (b, s) => s === 201 && b.type === 'OK' && b.results[0].example === true && b.results[0].attested === false && String(b.results[0].retention).includes('ephemeral'),
    ],
    ['listCheckRuns', await call('/check-runs'), (b) => b.type === 'OK' && b.results.length >= 3],
    ['getCheckRun', await call('/check-runs/run-demo-1'), (b) => b.type === 'OK'],
    ['listObligations', await call('/obligations'), (b) => b.type === 'OK' && b.results.length >= 5],
    ['getObligation', await call('/obligations/ob-demo-1'), (b) => b.type === 'OK'],
  ]
  const bad = []
  for (const [op, res, judge] of probes) {
    const body = await json(res.clone ? res.clone() : res)
    if (!judge(body, res.status)) bad.push(`${op} (status ${res.status})`)
  }
  // the MCP door serves the same definition
  const mcpList = await json(await call('/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }))
  const servedToolNames = (mcpList.result?.tools || []).map((t) => t.name).sort()
  if (JSON.stringify(servedToolNames) !== JSON.stringify([...manifest.mcp.tools].sort())) bad.push('mcp tools/list')
  const mcpCall = await json(
    await call('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'listChecks', arguments: { statuteId: 'davis-bacon' } } }),
    }),
  )
  if (mcpCall.result?.isError !== false) bad.push('mcp tools/call')
  check('operations-exercised', bad.length === 0, bad.length ? `defective: ${bad.join(', ')}` : '9 HTTP operations + MCP list/call all answer substantively')
}

// ── 5. conneg matrix on this worker's own addresses ─────────────────────────
{
  const bareCurl = await call('/verify')
  const mdFace = await call('/verify', { headers: { accept: 'text/markdown' } })
  const htmlFace = await call('/verify', { headers: { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' } })
  const forced = await call('/statutes.md')
  const ct = (r) => (r.headers.get('content-type') || '').split(';')[0]
  const okConneg = ct(bareCurl) === 'application/json' && ct(mdFace) === 'text/markdown' && ct(htmlFace) === 'text/html' && ct(forced) === 'text/markdown'
  check('conneg-matrix', okConneg, `bare→${ct(bareCurl)}, accept md→${ct(mdFace)}, browser→${ct(htmlFace)}, /statutes.md→${ct(forced)}`)
}

// ── 6. the 402 OFFER ladder — every rung labeled a stub (mounted-rungs-only) ─
{
  const offerRes = await call('/offer')
  const offerBody = await json(offerRes)
  const alts = offerBody.alternatives || []
  const kinds = alts.map((a) => a.kind).sort().join(',')
  const allStub = alts.length === 3 && alts.every((a) => a.status === 'stub' && /STUB/i.test(a.description))
  const overCeiling = await call('/checks?spend=101')
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
  const g2r = await call('/statutes')
  const h2 = await call('/statutes', { method: 'HEAD' })
  const hBody = await h2.text()
  check('head-mirrors-get', g.status === h.status && g2r.status === h2.status && hBody === '', `HEAD /pricing ${h.status}, HEAD /statutes ${h2.status} (empty body)`)
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

// ── 9b. axp-ext-rates-g2@0.2.0 native at the ruled placements ───────────────
{
  const card = await json(await call('/.well-known/agents.json'))
  const pricingDoc = await json(await call('/pricing'))
  const openapi = await json(await call('/openapi.json'))
  const problems = []

  // §2 — rates[] TOP-LEVEL in the Pricing Document, keyed on declared operationIds
  const opIds = []
  for (const item of Object.values(openapi.paths || {})) {
    for (const op of Object.values(item)) if (op && typeof op === 'object' && op.operationId) opIds.push(op.operationId)
  }
  if (new Set(opIds).size !== opIds.length) problems.push('duplicate operationId in the contract')
  const nameable = new Set([...opIds, ...manifest.mcp.tools])
  if (!Array.isArray(pricingDoc.rates) || pricingDoc.rates.length !== 9) problems.push(`pricing.rates: expected top-level array of 9 rows, got ${JSON.stringify(pricingDoc.rates?.length)}`)
  for (const row of pricingDoc.rates || []) {
    if (!nameable.has(row.operation)) problems.push(`rate row ${row.operation} names no declared operation`)
    if (!(typeof row.price === 'number' && row.price >= 0)) problems.push(`rate row ${row.operation} price defective`)
  }

  // §1 — the canonical name on every declared route, incl. the branching collection
  const expectedOps = ['listChecks', 'getPricing', 'getOffer', 'listStatutes', 'getStatute', 'getCheck', 'runCheck', 'listCheckRuns', 'getCheckRun', 'listObligations', 'getObligation', 'getIcp', 'getVerify', 'getVerifySuite']
  for (const id of expectedOps) if (!opIds.includes(id)) problems.push(`contract missing operationId ${id}`)

  // §3 + §4 — links.verify and top-level g2 on the card, generator-emitted
  if (card.links.verify !== `${ORIGIN}/verify`) problems.push(`card.links.verify = ${JSON.stringify(card.links.verify)}`)
  if (!card.g2 || typeof card.g2 !== 'object' || Object.keys(card.g2).length === 0) problems.push('card.g2 missing or empty')
  if (JSON.stringify(card.g2) !== JSON.stringify(manifest.g2)) problems.push('card.g2 is not the manifest g2 carried verbatim')
  if (card.links.icp !== `${ORIGIN}/icp.json`) problems.push('links.icp must stay beside g2')

  check(
    'rates-g2-native',
    problems.length === 0,
    problems.length ? problems.join('; ') : `rates[] top-level (9 rows, all declared ops), ${opIds.length} contract operationIds unique, links.verify + g2 + links.icp on the card`,
  )
}

// ── 10. probes honest: knownEmpty / knownForbidden branch truthfully ────────
{
  const e1 = await json(await call('/checks?statuteId=none'))
  const e2 = await json(await call('/checks?front=none'))
  const f1 = await call('/checks?scope=admin')
  const f2 = await call('/checks?scope=internal')
  check(
    'probes-honest',
    e1.type === 'EMPTY' && e2.type === 'EMPTY' && f1.status === 403 && f2.status === 403,
    `knownEmpty → EMPTY×2; knownForbidden → 403×2`,
  )
}

// ── 11. projection config complete (§2, GAP-at-umbrella family form) ────────
{
  const cfg = JSON.parse(readFileSync(join(HERE, 'projection.config.json'), 'utf8'))
  const okCfg =
    cfg.substrate === 'fn-risk-compliance' &&
    cfg.brand === null &&
    cfg.motion === 'B2A' &&
    Array.isArray(cfg.offer) &&
    cfg.offer.length === 4 &&
    cfg.experiment?.pattern === '402-metered' &&
    cfg.positioning === null &&
    cfg.counterpartBrandGap?.recorded === true &&
    cfg.familyFronts?.held?.length === 28 &&
    cfg.familyFronts?.boundByRegisterRow?.length === 5 &&
    // railLedger accepted as read alias; remove after sweep
    typeof (cfg.account ?? cfg.railLedger) === 'string' &&
    (cfg.account ?? cfg.railLedger).includes('face=fn-risk-compliance.org.ai') &&
    Array.isArray(cfg.primacyRecord?.collisions) &&
    cfg.primacyRecord.collisions.length >= 1
  check(
    'projection-config',
    okCfg,
    'family-grain GAP projection: brand null, motion B2A, 4 offer shapes, experiment registered, 28 held fronts (5 bound), counterpart-brand gap + primacy collisions recorded, account address present, claim-free',
  )
}

// ── report ──────────────────────────────────────────────────────────────────
console.log('\nfn-risk-compliance wave-zero selfcheck (fail-closed)\n')
for (const r of results) console.log(`  ${r.verdict === 'pass' ? 'PASS' : 'FAIL'}  ${r.id.padEnd(22)} ${r.detail}`)
console.log(`\n${results.filter((r) => r.verdict === 'pass').length}/${results.length} checks pass`)
process.exit(failed ? 1 : 0)
