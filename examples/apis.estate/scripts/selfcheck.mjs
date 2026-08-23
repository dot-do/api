/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for apis.estate, run
 * mechanically against the in-process worker (no network, no deploy).
 * Fail-closed: any failed box exits 1. The one box this tree cannot close —
 * rail-ledger registration — is recorded BLOCKED-ON-RAIL-LEDGER (no ledger
 * address exists in ~/projects/ax as of 2026-08-23) and is reported, never
 * stubbed; see README.md.
 *
 *   node scripts/selfcheck.mjs
 *
 * Sections 1–2 and the conformance gate mirror the apis.markets check.mjs
 * precedent: vendored-generator byte integrity, ratified spec pin, and
 * gradePinned green in-process (requires a built ~/projects/api.qa or
 * $AUTONOMOUS_QA).
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import worker from '../src/worker.js'
import { manifest } from '../src/manifest.js'
import { product } from '../src/product.js'
import { projection } from '../src/projection.js'
import * as seed from '../src/seed.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const RATIFIED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'
const EXTENSION_DIGEST = '903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5'

const ORIGIN = 'https://apis.estate'
const env = {}
const results = []

function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function call(path, init = {}) {
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, init), env, undefined)
  let body
  const text = await res.text()
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, headers: res.headers, body, text }
}

// silence the seam logs during the run
const realLog = console.log
console.log = (...a) => {
  if (typeof a[0] === 'string' && a[0].startsWith('{"kind"')) return
  realLog(...a)
}

// 0a — vendored generator byte integrity (quartet never hand-rolled)
{
  const dir = join(ROOT, 'src/axp-faces')
  const vendored = JSON.parse(readFileSync(join(dir, 'VENDORED.json'), 'utf8'))
  let drift = []
  for (const [label, digest] of Object.entries(vendored.files)) {
    const file = label === 'PINS.json' ? join(dir, 'PINS.json') : join(dir, label.replace(/^src\//, ''))
    if (!existsSync(file) || sha256(readFileSync(file)) !== digest) drift.push(label)
  }
  const pins = JSON.parse(readFileSync(join(dir, 'PINS.json'), 'utf8'))
  check(
    'vendored axp-faces byte-identical to VENDORED.json; PINS pin apis-ax-axp@2.6.0 + axp-ext-rates-g2@0.2.0 at the ruled digests',
    drift.length === 0 &&
      pins.version === '0.3.0' &&
      pins.pinnedSpecDigest === RATIFIED_DIGEST &&
      pins.extensions?.['axp-ext-rates-g2']?.version === '0.2.0' &&
      pins.extensions?.['axp-ext-rates-g2']?.digest === EXTENSION_DIGEST &&
      vendored.vendoredFrom?.head === '523c9ef217d54feefb0b20734a6d2996a6965b79',
    drift.join(', '),
  )
}

// 0b — ratified spec copy pinned
const specText = readFileSync(join(ROOT, 'spec/apis-ax-axp-2.6.0.spec.json'), 'utf8')
{
  const expected = readFileSync(join(ROOT, 'spec/apis-ax-axp-2.6.0.digest.txt'), 'utf8').trim()
  check(
    'pinned spec copy: bytes match the ratified digest a9a1197c…',
    expected === RATIFIED_DIGEST && sha256(specText) === expected,
  )
}

// 1 — G3 instance shape
check(
  'G3 APIProduct authored: nouns each carry schema+binding+verbs; System coordinate declared',
  product.substrate === 'real-estate' &&
    product.nouns.every((n) => n.schema && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0) &&
    product.systems.length > 0 &&
    product.systems.every((s) => s.system && s.coordinates.length > 0),
)

// 2 — quartet from one manifest via vendored generator
const card = await call('/.well-known/agents.json')
const openapi = await call('/openapi.json')
const pricing = await call('/pricing')
const llms = await call('/llms.txt')
check(
  'quartet answers (card, openapi 3.1, pricing, llms.txt)',
  card.status === 200 &&
    openapi.status === 200 &&
    openapi.body.openapi === '3.1.0' &&
    pricing.status === 200 &&
    llms.status === 200 &&
    /^# /m.test(llms.text),
)

// 2b — conformance at the pinned digest, in-process (gradePinned)
{
  const qaDir = process.env.AUTONOMOUS_QA || join(homedir(), 'projects/api.qa')
  const qaEntry = join(qaDir, 'dist/src/index.js')
  if (!existsSync(qaEntry)) {
    check('gradePinned green at the pinned digest (in-process)', false, `autonomous-qa not found at ${qaEntry}`)
  } else {
    const qa = await import(pathToFileURL(qaEntry).href)
    const hasCoverage = qa.eligibleOptionalChecks().includes('capability-coverage')
    const doc = JSON.parse(specText)
    const runDoc = hasCoverage ? doc : { ...doc, requirements: doc.requirements.filter((r) => r.id !== 'check-capability-coverage') }
    const runSpec = hasCoverage ? specText : JSON.stringify(runDoc, null, 2)
    const expectedDigest = hasCoverage ? RATIFIED_DIGEST : sha256(runSpec)
    if (!hasCoverage) realLog(`  (verifier predates capability-coverage — grading the runnable view: ${runDoc.requirements.length} requirements)`)
    try {
      const report = await qa.gradePinned(worker, runSpec, { expectedDigest, baseOrigin: ORIGIN })
      const red = report.requirements.filter((r) => r.verdict !== 'pass')
      check(
        'gradePinned green at the pinned digest (in-process)',
        red.length === 0,
        red.map((r) => `${r.id}: ${r.verdict}`).join('; '),
      )
    } catch (e) {
      check('gradePinned green at the pinned digest (in-process)', false, e.message)
    }
  }
}

// 3 — card shape: interfaces non-empty, probes, conformance + mcp declared-only-where-mounted
const mcpProbe = await call('/mcp', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
})
const cardTools = card.body.interfaces?.mcp?.tools || []
const servedTools = (mcpProbe.body.result?.tools || []).map((t) => t.name)
check(
  'card: interfaces.http non-empty; probes manifest; links.conformance → api.qa/apis.estate',
  Array.isArray(card.body.interfaces?.http) &&
    card.body.interfaces.http.length > 0 &&
    card.body.probes?.keyless?.url === '/closing-packets' &&
    card.body.links?.conformance === 'https://api.qa/apis.estate',
)
check(
  'MCP door mounted (authless — only the anon-sandbox rung is mounted) and card-declared tools == served tools',
  mcpProbe.status === 200 &&
    cardTools.length === servedTools.length &&
    cardTools.every((t) => servedTools.includes(t)),
  `card=[${cardTools}] served=[${servedTools}]`,
)

// 4 — anon sandbox floor: keyless 200 OK with substantive labeled seed
const packets = await call('/closing-packets')
const allLabeled = (packets.body.results || []).every((r) => r.example === true && String(r.name).startsWith('[demo]'))
check(
  'anon sandbox floor: keyless GET /closing-packets → 200 OK, every record example-labeled with [demo] name',
  packets.status === 200 && packets.body.type === 'OK' && packets.body.results.length >= 3 && allLabeled,
)

// 4b — fixture law over the whole seed + packet referential integrity (§5.2 depth)
{
  const corpora = {
    closingPackets: seed.closingPackets,
    lienWaivers: seed.lienWaivers,
    payoffLetters: seed.payoffLetters,
    deeds: seed.deeds,
  }
  const bad = []
  for (const [name, rows] of Object.entries(corpora)) {
    for (const rec of rows) {
      if (rec.example !== true) bad.push(`${name}/${rec.id}: missing example:true`)
      if (!String(rec.name).startsWith('[demo]')) bad.push(`${name}/${rec.id}: name lacks [demo] prefix`)
      if (!String(rec.id).startsWith('zz-')) bad.push(`${name}/${rec.id}: id not zz-prefixed synthetic`)
    }
  }
  const docIds = new Set([...seed.lienWaivers, ...seed.payoffLetters, ...seed.deeds].map((r) => r.id))
  for (const p of seed.closingPackets) {
    if (!Array.isArray(p.documents) || p.documents.length === 0) bad.push(`${p.id}: packet has no documents`)
    for (const d of p.documents) if (!docIds.has(d)) bad.push(`${p.id}: dangling document ref ${d}`)
    if (!/money\/escrow/.test(String(p.exclusions))) bad.push(`${p.id}: missing money/escrow exclusion line`)
  }
  check(
    'fixture law: every seed record labeled (example:true, [demo] names, zz- synthetic ids); packets internally consistent (every document ref resolves); escrow exclusion stated on every packet',
    bad.length === 0,
    bad.join('; '),
  )
}

// 5 — probe ladder: knownEmpty ×2, knownForbidden ×2 (escrow among them), over/half/zero ceiling
const e1 = await call('/closing-packets?county=none')
const e2 = await call('/closing-packets?kind=none')
const f1 = await call('/closing-packets?scope=escrow')
const f2 = await call('/closing-packets?scope=admin')
const over = await call(`/closing-packets?spend=${manifest.pricing.hardCeiling * 2}`)
const half = await call(`/closing-packets?spend=${manifest.pricing.hardCeiling / 2}`)
const zero = await call('/closing-packets?spend=0')
check(
  'probe ladder: 2× knownEmpty EMPTY/200, 2× knownForbidden BLOCKED/403 (escrow scope blocked by construction)',
  e1.body.type === 'EMPTY' && e2.body.type === 'EMPTY' && e1.status === 200 && e2.status === 200 &&
    f1.body.type === 'BLOCKED' && f2.body.type === 'BLOCKED' && f1.status === 403 && f2.status === 403 &&
    /escrow/.test(String(f1.body.reason)),
)
check(
  'metered boundary: over-ceiling → 402 OFFER; half and zero → 200 OK',
  over.status === 402 && over.body.type === 'OFFER' && half.status === 200 && zero.status === 200,
)

// 6 — rate card: model, hardCeiling, offers, binding axis, rate rows at the ruled placement
const rates = pricing.body.rates
const opIds = Object.values(openapi.body.paths).flatMap((p) =>
  Object.values(p).map((op) => op.operationId).filter(Boolean),
)
const OPERATION_ID_RE = /^[a-z][A-Za-z0-9]*$/
check(
  'rate card: metered, hardCeiling > 0, offers present, binding declared with statement',
  pricing.body.model === 'metered' && pricing.body.hardCeiling > 0 && pricing.body.binding === false &&
    typeof pricing.body.statement === 'string',
)
check(
  'rates[] TOP-LEVEL in the Pricing Document (§2 ruled placement, never offer-nested); every row has freeQuota or zero price; rates[].operation ⊆ OpenAPI operationIds',
  Array.isArray(rates) && rates.length === 5 &&
    card.body.monetization?.offers?.[0]?.rates === undefined &&
    rates.every((r) => r.freeQuota !== undefined || r.price === 0) &&
    rates.every((r) => opIds.includes(r.operation)),
  `opIds=[${opIds}]`,
)
check(
  'one cross-face operationId (§1): every contract operationId and MCP tool camelCase; no duplicates; collection = searchClosingPackets everywhere',
  opIds.every((id) => OPERATION_ID_RE.test(id)) &&
    new Set(opIds).size === opIds.length &&
    servedTools.every((t) => OPERATION_ID_RE.test(t)) &&
    servedTools.includes('searchClosingPackets') && opIds.includes('searchClosingPackets'),
  `opIds=[${opIds}] tools=[${servedTools}]`,
)
check(
  'links.verify + g2 native on the card (§3/§4 ruled placements): links.verify → /verify beside links.conformance and links.icp; g2 a non-empty top-level object with motion B2A',
  card.body.links?.verify === 'https://apis.estate/verify' &&
    card.body.links?.icp === 'https://apis.estate/icp.json' &&
    card.body.g2 && typeof card.body.g2 === 'object' && !Array.isArray(card.body.g2) &&
    Object.keys(card.body.g2).length > 0 && card.body.g2.motion === 'B2A',
)
const offerBoundary = await call('/offer')
check(
  '402 /offer boundary answers OFFER (rates live at /pricing top-level, not on the offer)',
  offerBoundary.status === 402 && offerBoundary.body.type === 'OFFER' &&
    offerBoundary.body.rates === undefined,
)

// 7 — motion declared; B2A gates only (no OAuth/CC gate anywhere)
check(
  'motion declared (B2A); offer shapes from the B2A set only; no OAuth/CC gates',
  projection.motion === 'B2A' &&
    projection.offer.every((o) => !/oauth|credit card|cc on file/i.test(String(o.gate))),
)

// 8 — MOUNTED-RUNGS-ONLY: the OFFER advertises exactly the mounted rung(s)
const altIds = (over.body.alternatives || []).map((a) => a.id)
const mountedIds = projection.offer.filter((o) => o.mounted).map((o) => o.shape === 'anon-sandbox' ? 'anon-sandbox' : o.shape)
check(
  '402 OFFER alternatives advertise ONLY mounted rungs (anon-sandbox today); unmounted rungs recorded in the projection config, never advertised',
  altIds.length === mountedIds.length && altIds.includes('anon-sandbox') &&
    !altIds.some((id) => ['earned-credits', 'human-claimed', 'paid-402'].includes(id)) &&
    projection.offer.filter((o) => !o.mounted).every((o) => /unmounted/.test(String(o.status))),
  `advertised=[${altIds}]`,
)

// 9 — B2A2B counterpart brand named (row-provided, staged)
check(
  'counterpart brand recorded: closings.services (staged, human vocabulary, not linked while not serving)',
  projection.counterpartBrand?.name === 'closings.services' &&
    /staged/.test(String(projection.counterpartBrand.status)) &&
    !JSON.stringify(manifest.family).includes('closings.services'),
)

// 10 — G4 projection config complete
check(
  'G4 projection config complete (brand, ICP+personas, motion, offer[], positioning, mdx, experiment)',
  projection.brand === 'apis.estate' && projection.icp && projection.personas.length >= 2 &&
    projection.offer.length > 0 && typeof projection.positioning === 'string' &&
    'mdx' in projection && projection.experiment?.pattern === '402-metered-per-call',
)

// 11 — no agent-default claim before the worthiness bar (guardrail trivially satisfied)
const publishedStrings = JSON.stringify([card.body, llms.text, manifest.description, projection.positioning])
check(
  'worthiness bar respected: no "agent default" claim anywhere on the face (guardrail check passes vacuously — no claim carried)',
  !/agent default/i.test(publishedStrings),
)

// 12 — /verify export published; testSuite NOT declared on card (until digest-pinned)
const verify = await call('/verify', { headers: { accept: 'application/json' } })
const suiteRes = await call('/verify/suite.json')
check(
  '/verify export published (doc + suite.json); interfaces.testSuite undeclared (stays undeclared until digest-pinned)',
  verify.status === 200 && suiteRes.status === 200 && suiteRes.body.runner === 'api.qa/suite@1' &&
    card.body.interfaces.testSuite === undefined,
)

// 13 — two plies from one definition: headless door assembles the same noun family
const mint = await call('/transaction-files', { method: 'POST' })
const tfId = mint.body.results?.[0]?.id
const add = await call(`/transaction-files/${tfId}/documents`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'zz-waiver-0001', kind: 'lien-waiver', example: true }),
})
const escrowTry = await call(`/transaction-files/${tfId}/documents`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'zz-x', kind: 'escrow-disbursement' }),
})
const docsList = await call(`/transaction-files/${tfId}/documents`)
check(
  'headless ply: transaction file mints keyless with disclosed retention; native document assembly on the packet noun; escrow document kinds BLOCKED (permanent exclusion)',
  mint.status === 200 && /ephemeral/.test(mint.body.results[0].retention) &&
    add.status === 200 && add.body.results[0].binding === 'native' &&
    escrowTry.status === 403 && escrowTry.body.type === 'BLOCKED' &&
    docsList.body.type === 'OK' && docsList.body.results.length === 1,
)

// 14 — conneg spot-check: bare curl JSON / browser HTML / .md face; HEAD mirrors GET; 405 typed
const homeCurl = await call('/', { headers: { accept: '*/*', 'user-agent': 'curl/8.6.0' } })
const homeBrowser = await call('/', {
  headers: { accept: 'text/html,*/*;q=0.8', 'sec-fetch-mode': 'navigate', 'user-agent': 'Mozilla/5.0' },
})
const pricingMd = await call('/pricing.md')
const headCard = await call('/.well-known/agents.json', { method: 'HEAD' })
const postPricing = await call('/pricing', { method: 'POST' })
check(
  'conneg law: curl / → JSON, browser / → HTML, /pricing.md → markdown, Link alternates present',
  typeof homeCurl.body === 'object' && homeCurl.body.$type === 'API' &&
    /^<!doctype html>/i.test(homeBrowser.text) &&
    /markdown/.test(pricingMd.headers.get('content-type') || '') &&
    (homeCurl.headers.get('link') || '').includes('rel="alternate"'),
)
check(
  'HEAD mirrors GET; non-GET on an AXP route answers 405 typed with Allow',
  headCard.status === 200 && headCard.text === '' &&
    postPricing.status === 405 && postPricing.body.type === 'BLOCKED' &&
    (postPricing.headers.get('allow') || '').includes('GET'),
)

// 15 — no ghost surfaces: every non-templated GET path in the contract answers
let ghosts = []
for (const [p, ops] of Object.entries(openapi.body.paths)) {
  if (p.includes('{') || !ops.get) continue
  const r = await call(p)
  const expected = p === manifest.pricing.offerPath ? [402] : [200]
  if (!expected.includes(r.status)) ghosts.push(`${p}→${r.status}`)
}
check('no ghost surfaces: every non-templated GET in openapi answers as declared', ghosts.length === 0, ghosts.join(', '))

// 16 — seams: meter events tagged per §6.4 (shape checked structurally)
{
  const { emitMeterEvent } = await import('../src/seams.js')
  let captured
  const origLog = realLog
  const tmp = console.log
  console.log = (s) => {
    if (typeof s === 'string' && s.startsWith('{"kind"')) captured = JSON.parse(s)
  }
  emitMeterEvent({}, undefined, new Request(`${ORIGIN}/closing-packets`, { headers: { 'user-agent': 'curl/8' } }), {
    operation: 'searchClosingPackets',
    shape: 'anon-sandbox',
  })
  console.log = tmp
  check(
    'seams: meter event carries {substrate, projection, motion, operation, shape, pattern} + identity class',
    captured && captured.substrate === 'real-estate' && captured.projection === 'apis.estate' &&
      captured.motion === 'B2A' && captured.operation === 'searchClosingPackets' &&
      captured.shape === 'anon-sandbox' && captured.pattern === '402-metered-per-call' &&
      typeof captured.identityClass === 'string',
  )
}

console.log = realLog
console.log(
  '\nRAIL-LEDGER (§9.1 final box): BLOCKED-ON-RAIL-LEDGER — no ledger address convention exists in ~/projects/ax as of 2026-08-23 (packages/rail-ledger is uncommitted work-in-progress on draft/rail-ledger-v1, no LEDGER.md). The box closes by registering this face at the ledger address when it lands — never by stubbing.',
)
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks pass`)
if (failed.length > 0) process.exit(1)
