/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for apis.engineering,
 * run mechanically against the in-process worker (no network, no deploy).
 * Sixteen boxes, scored /16, fail-closed: box 16 (rail-ledger registration)
 * is recorded blocked-on-rail-ledger and honestly counted as not passing.
 *
 *   node scripts/selfcheck.mjs
 *
 * VENDORING PROVENANCE (batch watch list): axp-faces 0.3.0 with
 * axp-ext-rates-g2@0.2.0 vendored via `git show` from the axp.org.ai repo's
 * COMMITTED HEAD on branch draft/axp-extension-rates-g2:
 *
 *   VENDORED_FROM_COMMIT = 523c9ef217d54feefb0b20734a6d2996a6965b79
 *
 * Box 3 verifies the vendored bytes against PINS.json digests and the
 * recorded commit; the extension digest is asserted in box 4.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import worker from '../src/worker.js'
import { manifest } from '../src/manifest.js'
import { product } from '../src/product.js'
import { projection } from '../src/projection.js'

const VENDORED_FROM_COMMIT = '523c9ef217d54feefb0b20734a6d2996a6965b79'
const PINNED_SPEC_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'
const EXTENSION_DIGEST = '903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5'

const ORIGIN = 'https://apis.engineering'
const env = {}
const results = []
const HERE = dirname(fileURLToPath(import.meta.url))
const FACES_DIR = join(HERE, '..', 'src', 'axp-faces')

function box(n, name, pass, detail = '') {
  results.push({ n, name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${String(n).padStart(2)}] ${name}${detail ? ` — ${detail}` : ''}`)
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

// capture seam events instead of printing them (box 13 asserts their shape)
const seamEvents = []
const realLog = console.log
console.log = (...a) => {
  if (typeof a[0] === 'string' && a[0].startsWith('{"kind"')) {
    try {
      seamEvents.push(JSON.parse(a[0]))
    } catch {
      /* ignore */
    }
    return
  }
  realLog(...a)
}

// ── box 1: G3 APIProduct instance ─────────────────────────────────────────
box(
  1,
  'G3 APIProduct authored: every Noun has schema + binding + verbs; System coordinate declared',
  product.substrate === 'engineering-architecture' &&
    product.nouns.every((n) => n.schema && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0) &&
    product.systems.length > 0 &&
    product.systems.every((s) => s.system && s.coordinates.length > 0),
)

// ── box 2: both plies from one definition ─────────────────────────────────
const mint = await call('/projects', { method: 'POST' })
const projId = mint.body.results?.[0]?.id
const assemble = await call(`/projects/${projId}/submittals`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Demo assembly package (example)', items: [{ drawing: 'demo-c-101' }, { specification: 'demo-spec-earthwork' }] }),
})
const projList = await call(`/projects/${projId}/submittals`)
box(
  2,
  'both plies serve from one definition: data collections + headless project door = same manifest rows, same nouns',
  mint.status === 200 && /ephemeral/.test(mint.body.results[0].retention) &&
    assemble.status === 200 && assemble.body.results[0].binding === 'native' &&
    assemble.body.results[0].stamped === false &&
    projList.body.type === 'OK' && projList.body.results.length === 1 &&
    manifest.routes.some((r) => r.operationId === 'assembleSubmittal') &&
    product.nouns.some((n) => n.name === 'ProjectSubmittal' && n.binding === 'native'),
)

// ── box 3: quartet from vendored axp-faces at PINS digest ────────────────
const pins = JSON.parse(readFileSync(join(FACES_DIR, 'PINS.json'), 'utf8'))
const vendored = JSON.parse(readFileSync(join(FACES_DIR, 'VENDORED.json'), 'utf8'))
let digestOk = vendored.sourceCommit === VENDORED_FROM_COMMIT
for (const [rel, want] of Object.entries(pins.files)) {
  const got = createHash('sha256').update(readFileSync(join(FACES_DIR, rel.replace(/^src\//, '')))).digest('hex')
  if (got !== want || vendored.files[rel] !== want) digestOk = false
}
const card = await call('/.well-known/agents.json')
const openapi = await call('/openapi.json')
const pricing = await call('/pricing')
const llms = await call('/llms.txt')
box(
  3,
  `quartet emitted from one defineSiteManifest() via vendored axp-faces (byte-verified vs PINS.json; vendored from axp.org.ai ${VENDORED_FROM_COMMIT.slice(0, 7)} branch draft/axp-extension-rates-g2)`,
  digestOk &&
    card.status === 200 && openapi.status === 200 && openapi.body.openapi === '3.1.0' &&
    pricing.status === 200 && llms.status === 200 && /^# /m.test(llms.text),
)

// ── box 4: local conformance at the pinned digest, fail-closed ───────────
const e1 = await call('/drawings?discipline=none')
const e2 = await call('/drawings?tag=none')
const f1 = await call('/drawings?scope=stamped')
const f2 = await call('/drawings?scope=internal')
const over = await call(`/drawings?spend=${manifest.pricing.hardCeiling * 2}`)
const half = await call(`/drawings?spend=${manifest.pricing.hardCeiling / 2}`)
const zero = await call('/drawings?spend=0')
const mcpProbe = await call('/mcp', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
})
const cardTools = card.body.interfaces?.mcp?.tools || []
const servedTools = (mcpProbe.body.result?.tools || []).map((t) => t.name)
box(
  4,
  `local conformance green at the pinned digests (spec ${PINNED_SPEC_DIGEST.slice(0, 8)}…, ext ${EXTENSION_DIGEST.slice(0, 8)}…): probe ladder + card shape + native g2/links.verify + MCP tools == card tools`,
  pins.pinnedSpecDigest === PINNED_SPEC_DIGEST &&
    pins.extensions?.['axp-ext-rates-g2']?.version === '0.2.0' &&
    pins.extensions?.['axp-ext-rates-g2']?.digest === EXTENSION_DIGEST &&
    e1.body.type === 'EMPTY' && e2.body.type === 'EMPTY' && e1.status === 200 && e2.status === 200 &&
    f1.body.type === 'BLOCKED' && f2.body.type === 'BLOCKED' && f1.status === 403 && f2.status === 403 &&
    over.status === 402 && over.body.type === 'OFFER' &&
    half.status === 200 && zero.status === 200 &&
    Array.isArray(card.body.interfaces?.http) && card.body.interfaces.http.length > 0 &&
    card.body.probes?.keyless?.url === '/drawings' &&
    card.body.links?.conformance === 'https://api.qa/apis.engineering' &&
    card.body.links?.verify === 'https://apis.engineering/verify' &&
    card.body.g2 && typeof card.body.g2 === 'object' && !Array.isArray(card.body.g2) &&
    card.body.g2.motion === 'B2A' && card.body.g2.substrate === 'engineering-architecture' &&
    mcpProbe.status === 200 && cardTools.length === servedTools.length &&
    cardTools.every((t) => servedTools.includes(t)),
  `tools card=[${cardTools}] served=[${servedTools}]`,
)

// ── box 5: anon sandbox floor with substantive labeled seed ──────────────
const drawings = await call('/drawings')
const specs = await call('/specifications')
const submittals = await call('/submittals')
const drawingOne = await call('/drawings/demo-c-101')
const allLabeled =
  (drawings.body.results || []).every((r) => r.example === true && r.stamped === false) &&
  (specs.body.results || []).every((r) => r.example === true) &&
  (submittals.body.results || []).every((r) => r.example === true)
const fixtureText = JSON.stringify([drawings.body, specs.body, submittals.body])
box(
  5,
  'anon sandbox floor: keyless 200 OK with substantive labeled synthetic seed; seed exercises every record operation; fixture law (fictional names, no stamps, labels everywhere)',
  drawings.status === 200 && drawings.body.type === 'OK' && drawings.body.results.length >= 5 &&
    drawingOne.status === 200 && specs.body.results.length >= 3 && submittals.body.results.length >= 3 &&
    allLabeled && /fictional/i.test(fixtureText) && !/lien|draw request/i.test(fixtureText),
)

// ── box 6: rate card ──────────────────────────────────────────────────────
const rates = pricing.body.rates
const opIds = Object.values(openapi.body.paths).flatMap((p) =>
  Object.values(p).map((op) => op.operationId).filter(Boolean),
)
const OPERATION_ID_RE = /^[a-z][A-Za-z0-9]*$/
box(
  6,
  'rate card served: model metered, hardCeiling > 0, offers, binding declared; rates[] TOP-LEVEL; every row freeQuota or zero price; rates[].operation ⊆ operationIds; ids camelCase, no duplicates',
  pricing.body.model === 'metered' && pricing.body.hardCeiling > 0 && pricing.body.binding === false &&
    typeof pricing.body.statement === 'string' &&
    Array.isArray(rates) && rates.length === 4 &&
    card.body.monetization?.offers?.[0]?.rates === undefined &&
    rates.every((r) => r.freeQuota !== undefined || r.price === 0) &&
    rates.every((r) => opIds.includes(r.operation)) &&
    opIds.every((id) => OPERATION_ID_RE.test(id)) && new Set(opIds).size === opIds.length &&
    servedTools.every((t) => OPERATION_ID_RE.test(t) && opIds.includes(t)),
  `opIds=[${opIds}]`,
)

// ── box 7: motion declared; shapes from the B2A set only ─────────────────
box(
  7,
  'motion declared (B2A); offer shapes drawn only from the B2A permissible set; no OAuth/CC gates anywhere',
  projection.motion === 'B2A' &&
    projection.offer.every((o) => !/oauth|credit card|cc on file/i.test(String(o.gate))) &&
    projection.offer.every((o) => ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-metered'].includes(o.shape)),
)

// ── box 8: 402 OFFER advertises the whole ladder ─────────────────────────
const altIds = (over.body.alternatives || []).map((a) => a.id)
const offerBoundary = await call('/offer')
box(
  8,
  '402 OFFER alternatives advertise the whole B2A ladder (sandbox / work / claim / pay); stubs labeled; rates never offer-nested',
  ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-402'].every((id) => altIds.includes(id)) &&
    over.body.alternatives.filter((a) => a.status).every((a) => /stub/.test(a.status)) &&
    offerBoundary.status === 402 && offerBoundary.body.type === 'OFFER' && offerBoundary.body.rates === undefined,
)

// ── box 9: counterpart-brand gap recorded ────────────────────────────────
const icp = await call('/icp.json')
box(
  9,
  'B2A2B/C: counterpart-brand GAP recorded in the projection config (no human-vocabulary name held for this cell) and exposed on /icp.json',
  projection.counterpartBrand?.gap === true &&
    typeof projection.counterpartBrand.note === 'string' &&
    icp.status === 200 && icp.body.counterpartBrand?.gap === true,
)

// ── box 10: G4 projection config complete ────────────────────────────────
box(
  10,
  'G4 projection config complete (brand, ICP+personas, motion, offer[], positioning, mdx, experiment)',
  projection.brand === 'apis.engineering' && projection.icp && projection.personas.length >= 2 &&
    projection.offer.length > 0 && typeof projection.positioning === 'string' &&
    'mdx' in projection && projection.experiment?.pattern === '402-metered-per-call' &&
    projection.experiment.startDate && projection.experiment.hypothesis,
)

// ── box 11: guardrail ────────────────────────────────────────────────────
const publishedStrings = JSON.stringify([card.body, llms.text, manifest.description, projection.positioning])
box(
  11,
  'guardrail: no agent-default claim anywhere on the face (claim withheld until the §4.6 bar attests — the §5.3 price check is vacuous without the claim)',
  !/agent default/i.test(publishedStrings),
)

// ── box 12: /verify export ───────────────────────────────────────────────
const verify = await call('/verify', { headers: { accept: 'application/json' } })
const suite = await call('/verify/suite.json')
box(
  12,
  '/verify export published (doc + suite.json); interfaces.testSuite undeclared (verifier cannot judge it yet)',
  verify.status === 200 && suite.status === 200 && suite.body.runner === 'api.qa/suite@1' &&
    card.body.interfaces.testSuite === undefined,
)

// ── box 13: seams emitted with the §6.4 tags ─────────────────────────────
const meterEvents = seamEvents.filter((e) => e.kind === 'meter')
box(
  13,
  'seams emitted: meter events tagged {substrate, projection, motion, operation, shape, pattern} + identity class (§9.3 diagnostic fields)',
  meterEvents.length > 0 &&
    meterEvents.every(
      (e) =>
        e.substrate === 'engineering-architecture' && e.projection === 'apis.engineering' &&
        e.motion === 'B2A' && e.pattern === '402-metered-per-call' &&
        typeof e.operation === 'string' && typeof e.shape === 'string' && typeof e.identityClass === 'string',
    ),
  `${meterEvents.length} meter events captured`,
)

// ── box 14: conneg spot-check ────────────────────────────────────────────
const homeCurl = await call('/', { headers: { accept: '*/*', 'user-agent': 'curl/8.6.0' } })
const homeBrowser = await call('/', {
  headers: { accept: 'text/html,*/*;q=0.8', 'sec-fetch-mode': 'navigate', 'user-agent': 'Mozilla/5.0' },
})
const pricingMd = await call('/pricing.md')
const headCard = await call('/.well-known/agents.json', { method: 'HEAD' })
const postPricing = await call('/pricing', { method: 'POST' })
box(
  14,
  'conneg law spot-checked: curl / → JSON, browser / → HTML, /pricing.md → markdown, Link alternates; HEAD mirrors GET; 405 typed with Allow; demo data labeled on the landing',
  typeof homeCurl.body === 'object' && homeCurl.body.$type === 'API' &&
    /^<!doctype html>/i.test(homeBrowser.text) && /example data/i.test(homeBrowser.text) &&
    /markdown/.test(pricingMd.headers.get('content-type') || '') &&
    (homeCurl.headers.get('link') || '').includes('rel="alternate"') &&
    headCard.status === 200 && headCard.text === '' &&
    postPricing.status === 405 && postPricing.body.type === 'BLOCKED' &&
    (postPricing.headers.get('allow') || '').includes('GET'),
)

// ── box 15: no ghost surfaces ────────────────────────────────────────────
let ghosts = []
for (const [p, ops] of Object.entries(openapi.body.paths)) {
  if (p.includes('{') || !ops.get) continue
  const r = await call(p)
  const expected = p === manifest.pricing.offerPath ? [402] : [200]
  if (!expected.includes(r.status)) ghosts.push(`${p}→${r.status}`)
}
box(15, 'no ghost surfaces: every non-templated GET in the contract answers as declared (presence-when-true)', ghosts.length === 0, ghosts.join(', '))

// ── box 16: rail-ledger registration ─────────────────────────────────────
// Checked 2026-08-23 at ~/projects/ax (worktree ax-rail-ledger-wt, branch
// draft/rail-ledger-v1): packages/rail-ledger exists but its registry/ is
// empty, no LEDGER.md is committed, and no face-address convention is
// published yet. Per the batch watch list this box is recorded
// blocked-on-rail-ledger — never stubbed — and counted honestly as not
// passing.
box(
  16,
  'face registered in the rail ledger (faces-payable/week denominator)',
  false,
  'BLOCKED-ON-RAIL-LEDGER: ledger service on draft/rail-ledger-v1 has no LEDGER.md and no address convention yet; register this face there the day the convention lands',
)

console.log = realLog
const passed = results.filter((r) => r.pass).length
console.log(`\n§9.1 checklist: ${passed}/16 boxes pass`)
const unexpected = results.filter((r) => !r.pass && r.n !== 16)
if (unexpected.length > 0) {
  console.log(`unexpected failures: ${unexpected.map((r) => r.n).join(', ')}`)
  process.exit(1)
}
