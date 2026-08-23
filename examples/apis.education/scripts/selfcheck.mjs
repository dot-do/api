/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for apis.education,
 * run mechanically against the in-process worker (no network, no deploy).
 * SIXTEEN boxes, one per §9.1 row, fail-closed: any failed box exits 1
 * (the rail-ledger box is expected to report its blocker until the rail
 * ledger's address convention lands — a blocked box is a FAIL, not a stub).
 *
 *   node scripts/selfcheck.mjs
 *
 * Box 4 (conformance at the pinned digest) is the real gate: api.qa's own
 * requirement implementations (autonomous-qa, resolved from
 * $AUTONOMOUS_QA_DIR or ~/projects/api.qa) run in-process against the
 * worker with the vendored byte-identical spec text, expectedDigest
 * fail-closed. Missing autonomous-qa FAILS the box — a gate that skips is
 * not a gate.
 *
 * Vendoring provenance (recorded per the batch-3 watch list): axp-faces
 * 0.3.0 with axp-ext-rates-g2@0.2.0 vendored from the axp.org.ai repo's
 * COMMITTED HEAD of branch draft/axp-extension-rates-g2 —
 * commit 523c9ef217d54feefb0b20734a6d2996a6965b79 — via `git show` only
 * (never the working tree); byte-digests re-verified against PINS.json by
 * box 3 below on every run.
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import worker from '../src/worker.js'
import { manifest } from '../src/manifest.js'
import { product } from '../src/product.js'
import { projection } from '../src/projection.js'
import { courseRecords, credentialRecords, aidArtifactRecords } from '../src/seed.js'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://apis.education'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'
const env = {}
const results = []

function box(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${results.length}/16] ${name}${detail ? ` — ${detail}` : ''}`)
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

// silence the seam logs during the run, but capture them for box 13
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
  'G3 APIProduct authored (digital-products shape): every Noun has schema + binding + verbs; System coordinate declared',
  product.substrate === 'education' &&
    product.nouns.every((n) => n.schema && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0) &&
    product.systems.length > 0 &&
    product.systems.every((s) => s.system && s.coordinates.length > 0),
)

// ── box 2: both plies from one definition ─────────────────────────────────
// The headless door (/catalogs/{id}/courses) CRUDs the SAME Course noun the
// data face serves, from the same manifest.
const mint = await call('/catalogs', { method: 'POST' })
const catId = mint.body.results?.[0]?.id
const reg = await call(`/catalogs/${catId}/courses`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'demo-course-001', name: 'Demo Course (fictional example)', example: true }),
})
const catList = await call(`/catalogs/${catId}/courses`)
const manifestPaths = new Set(manifest.routes.map((r) => r.path))
box(
  'both plies serve from one definition: data collections + headless system doors are rows of the SAME manifest; native CRUD on the same Course noun',
  manifestPaths.has('/catalogs') &&
    manifestPaths.has('/catalogs/{id}/courses') &&
    manifest.collection.path === '/courses' &&
    mint.status === 200 &&
    /ephemeral/.test(mint.body.results[0].retention) &&
    reg.status === 200 &&
    reg.body.results[0].binding === 'native' &&
    reg.body.results[0].$type === 'Course' &&
    catList.body.type === 'OK' &&
    catList.body.results.length === 1,
)

// ── box 3: quartet from one defineSiteManifest via vendored axp-faces at
//           PINS.json digests (byte-identical, re-verified now) ────────────
const pins = JSON.parse(readFileSync(join(here, '..', 'src', 'axp-faces', 'PINS.json'), 'utf8'))
const vendorDrift = Object.entries(pins.files).filter(([rel, want]) => {
  const got = createHash('sha256')
    .update(readFileSync(join(here, '..', 'src', 'axp-faces', rel.replace('src/', ''))))
    .digest('hex')
  return got !== want
})
const card = await call('/.well-known/agents.json')
const openapi = await call('/openapi.json')
const pricing = await call('/pricing')
const llms = await call('/llms.txt')
box(
  'quartet emitted from one defineSiteManifest() via vendored axp-faces at PINS digests (0.3.0, ext axp-ext-rates-g2@0.2.0); all four answer',
  vendorDrift.length === 0 &&
    pins.version === '0.3.0' &&
    pins.pinnedSpecDigest === PINNED_DIGEST &&
    pins.extensions?.['axp-ext-rates-g2']?.version === '0.2.0' &&
    pins.extensions?.['axp-ext-rates-g2']?.digest ===
      '903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5' &&
    card.status === 200 &&
    openapi.status === 200 &&
    openapi.body.openapi === '3.1.0' &&
    pricing.status === 200 &&
    llms.status === 200 &&
    /^# /m.test(llms.text),
  vendorDrift.length > 0 ? `vendor drift: ${vendorDrift.map(([f]) => f).join(', ')}` : '',
)

// ── box 4: local conformance green at the pinned digest (fail-closed) ─────
let conformancePass = false
let conformanceDetail = ''
try {
  const candidates = [
    process.env.AUTONOMOUS_QA_DIR,
    join(here, '..', '..', '..', 'node_modules', 'autonomous-qa'),
    join(homedir(), 'projects', 'api.qa'),
  ].filter(Boolean)
  let localJs = null
  for (const dir of candidates) {
    const entry = join(dir, 'dist', 'src', 'local.js')
    if (existsSync(entry)) {
      localJs = entry
      break
    }
  }
  if (!localJs) throw new Error(`autonomous-qa not found (tried: ${candidates.join(', ')})`)
  const { gradePinned } = await import(pathToFileURL(localJs).href)
  const spec = readFileSync(join(here, '..', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
  const report = await gradePinned(worker, spec, { baseOrigin: ORIGIN, expectedDigest: PINNED_DIGEST })
  conformancePass = report.passed === true
  conformanceDetail = conformancePass
    ? `passed at digest ${PINNED_DIGEST.slice(0, 12)}…`
    : `FAILED: ${JSON.stringify(report.failures ?? report).slice(0, 400)}`
} catch (err) {
  conformanceDetail = String(err && err.message ? err.message : err).slice(0, 400)
}
box('local conformance green at pinned digest (api.qa requirement implementations, expectedDigest fail-closed)', conformancePass, conformanceDetail)

// ── box 5: anon sandbox floor with substantive labeled seed ───────────────
const courses = await call('/courses')
const allSeedLabeled =
  courseRecords.every((r) => r.example === true) &&
  credentialRecords.every((r) => r.example === true) &&
  aidArtifactRecords.every((r) => r.example === true)
const seedText = JSON.stringify([courseRecords, credentialRecords, aidArtifactRecords])
const fixtureLawClean =
  !/\b\d{3}-\d{2}-\d{4}\b/.test(seedText) && // no SSN-shaped values
  !/\b\d{2}-\d{7}\b/.test(seedText) && // no EIN-shaped values
  /fictional/i.test(seedText) &&
  !/(api[_-]?key|secret|password|token)\s*[:=]/i.test(seedText)
box(
  'anon sandbox floor: keyless GET /courses → 200 OK; every seed record example-labeled over fictional institutions; fixture law passes (no SSN/EIN-shaped values, secret-scan clean)',
  courses.status === 200 &&
    courses.body.type === 'OK' &&
    courses.body.results.length >= 5 &&
    allSeedLabeled &&
    fixtureLawClean,
)

// ── box 6: rate card at the ruled placement ────────────────────────────────
const rates = pricing.body.rates
const opIds = Object.values(openapi.body.paths).flatMap((p) =>
  Object.values(p)
    .map((op) => op.operationId)
    .filter(Boolean),
)
const OPERATION_ID_RE = /^[a-z][A-Za-z0-9]*$/
box(
  'rate card served: metered, hardCeiling > 0, offers present, binding declared with statement; rates[] TOP-LEVEL; every row freeQuota or zero price; rates[].operation ⊆ OpenAPI operationIds; one camelCase operationId per face',
  pricing.body.model === 'metered' &&
    pricing.body.hardCeiling > 0 &&
    pricing.body.binding === false &&
    typeof pricing.body.statement === 'string' &&
    Array.isArray(rates) &&
    rates.length === 7 &&
    card.body.monetization?.offers?.[0]?.rates === undefined &&
    rates.every((r) => r.freeQuota !== undefined || r.price === 0) &&
    rates.every((r) => opIds.includes(r.operation)) &&
    opIds.every((id) => OPERATION_ID_RE.test(id)) &&
    new Set(opIds).size === opIds.length,
  `opIds=[${opIds}]`,
)

// ── box 7: motion declared; shapes from the motion's permissible set ──────
const B2D_SHAPES = ['anon-sandbox', 'oauth-free-tier', 'self-serve-metered', 'committed-subscription', 'sales-led']
box(
  'motion declared (B2D); every offer shape drawn from the B2D permissible set (§5.1); no #17-ladder-only shapes on a B2D projection',
  projection.motion === 'B2D' &&
    projection.offer.every((o) => B2D_SHAPES.includes(o.shape)) &&
    projection.experiment.motion === 'B2D',
)

// ── box 8: 402 OFFER advertises the B2D doors (checkout + OAuth free tier) ─
const over = await call(`/courses?spend=${manifest.pricing.hardCeiling * 2}`)
const half = await call(`/courses?spend=${manifest.pricing.hardCeiling / 2}`)
const zero = await call('/courses?spend=0')
const offerBoundary = await call('/offer')
const altIds = (over.body.alternatives || []).map((a) => a.id)
box(
  'B2D OFFER bodies advertise checkout + OAuth free tier (stubs labeled); over-ceiling → 402 OFFER, half and zero → 200 OK; /offer boundary answers',
  over.status === 402 &&
    over.body.type === 'OFFER' &&
    ['anon-sandbox', 'oauth-free-tier', 'checkout-metered'].every((id) => altIds.includes(id)) &&
    over.body.alternatives.filter((a) => a.status).every((a) => /stub/.test(a.status)) &&
    half.status === 200 &&
    zero.status === 200 &&
    offerBoundary.status === 402 &&
    offerBoundary.body.type === 'OFFER' &&
    offerBoundary.body.rates === undefined,
)

// ── box 9: B2A2C counterpart-brand check ───────────────────────────────────
box(
  'B2A2C: consumer/learner demand is agent-intermediated by the row ruling and no human-vocabulary counterpart name is held — the counterpart-brand gap is RECORDED in the projection config',
  projection.counterpartBrand?.state === 'gap-recorded' &&
    typeof projection.counterpartBrand.note === 'string' &&
    /counterpart/.test(projection.counterpartBrand.note),
)

// ── box 10: G4 projection config complete ─────────────────────────────────
box(
  'G4 projection config complete (brand, ICP+personas, motion, offer[], positioning, mdx, experiment registration)',
  projection.brand === 'apis.education' &&
    projection.icp &&
    projection.personas.length >= 2 &&
    projection.offer.length > 0 &&
    typeof projection.positioning === 'string' &&
    'mdx' in projection &&
    projection.experiment?.pattern === 'freemium-ladder' &&
    typeof projection.experiment?.hypothesis === 'string',
)

// ── box 11: guardrail — no agent-default claim anywhere on the face ───────
const publishedStrings = JSON.stringify([card.body, llms.text, manifest.description, projection.positioning])
box(
  'guardrail check: this projection claims no agent-default positioning (worthiness bar not attested), so the §5.3 price comparison is vacuously satisfied; no claim string anywhere on the face',
  !/agent default/i.test(publishedStrings),
)

// ── box 12: /verify export; interfaces.testSuite undeclared ───────────────
const verify = await call('/verify', { headers: { accept: 'application/json' } })
const suite = await call('/verify/suite.json')
box(
  '/verify export published (doc + suite.json); interfaces.testSuite undeclared (deployed verifier cannot judge it — api.lawyer precedent); links.verify + g2 native on the card',
  verify.status === 200 &&
    suite.status === 200 &&
    suite.body.runner === 'api.qa/suite@1' &&
    card.body.interfaces.testSuite === undefined &&
    card.body.links?.verify === `${ORIGIN}/verify` &&
    card.body.g2 &&
    typeof card.body.g2 === 'object' &&
    card.body.g2.motion === 'B2D' &&
    card.body.g2.substrate === 'education',
)

// ── box 13: seams emitted with the §6.4 tags + identity class ──────────────
const meterEvents = seamEvents.filter((e) => e.kind === 'meter')
box(
  'seams emitted: metering events tagged {substrate, projection, motion, operation, shape, pattern} + identity class + referral source; money/receipt seams exist and fire only on settlement (none today — settlement is a labeled stub)',
  meterEvents.length > 0 &&
    meterEvents.every(
      (e) =>
        e.substrate === 'education' &&
        e.projection === 'apis.education' &&
        e.motion === 'B2D' &&
        e.pattern === 'freemium-ladder' &&
        typeof e.operation === 'string' &&
        typeof e.shape === 'string' &&
        typeof e.identityClass === 'string',
    ) &&
    seamEvents.filter((e) => e.kind === 'money' || e.kind === 'receipt').length === 0,
)

// ── box 14: conneg matrix spot-check + demo data labeled ──────────────────
const homeCurl = await call('/', { headers: { accept: '*/*', 'user-agent': 'curl/8.6.0' } })
const homeBrowser = await call('/', {
  headers: { accept: 'text/html,*/*;q=0.8', 'sec-fetch-mode': 'navigate', 'user-agent': 'Mozilla/5.0' },
})
const pricingMd = await call('/pricing.md')
const headCard = await call('/.well-known/agents.json', { method: 'HEAD' })
const postPricing = await call('/pricing', { method: 'POST' })
box(
  'conneg law spot-check: curl / → JSON, browser / → HTML, /pricing.md → markdown, Link alternates, HEAD mirrors GET, 405 typed with Allow; demo-data labeling present on landing and docs',
  typeof homeCurl.body === 'object' &&
    /^<!doctype html>/i.test(homeBrowser.text) &&
    /markdown/.test(pricingMd.headers.get('content-type') || '') &&
    (homeCurl.headers.get('link') || '').includes('rel="alternate"') &&
    headCard.status === 200 &&
    headCard.text === '' &&
    postPricing.status === 405 &&
    postPricing.body.type === 'BLOCKED' &&
    (postPricing.headers.get('allow') || '').includes('GET') &&
    /example data|synthetic/i.test(homeBrowser.text) &&
    /synthetic|example/i.test(llms.text),
)

// ── box 15: no ghost surfaces ──────────────────────────────────────────────
let ghosts = []
for (const [p, ops] of Object.entries(openapi.body.paths)) {
  if (p.includes('{') || !ops.get) continue
  const r = await call(p)
  const expected = p === manifest.pricing.offerPath ? [402] : [200]
  if (!expected.includes(r.status)) ghosts.push(`${p}→${r.status}`)
}
const mcpProbe = await call('/mcp', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
})
const cardTools = card.body.interfaces?.mcp?.tools || []
const servedTools = (mcpProbe.body.result?.tools || []).map((t) => t.name)
box(
  'no ghost surfaces: every non-templated GET in the contract answers as declared; MCP card-declared tools == served tools (authless, anon-sandbox rung only)',
  ghosts.length === 0 &&
    mcpProbe.status === 200 &&
    cardTools.length === servedTools.length &&
    cardTools.every((t) => servedTools.includes(t)),
  ghosts.length > 0 ? ghosts.join(', ') : `tools=[${servedTools}]`,
)

// ── box 16: rail-ledger registration ───────────────────────────────────────
// Checked 2026-08-23: ~/projects/ax branch draft/rail-ledger-v1 exists but
// its committed HEAD (1620e9f) carries no LEDGER.md and no address
// convention (packages/rail-ledger is uncommitted work in progress in its
// worktree). Per the batch-3 watch list: record blocked-on-rail-ledger —
// never stub. This box FAILS until the convention lands and this face is
// registered in the faces-payable/week denominator.
box(
  'face registered in the rail ledger (faces-payable/week denominator)',
  false,
  'BLOCKED-ON-RAIL-LEDGER: no committed LEDGER.md/address convention on ax draft/rail-ledger-v1 (HEAD 1620e9f) as of 2026-08-23 — registration deferred, not stubbed',
)

console.log = realLog
const passed = results.filter((r) => r.pass).length
console.log(`\n${passed}/16 §9.1 boxes pass`)
const failed = results.filter((r) => !r.pass)
for (const f of failed) console.log(`  FAILED: ${f.name}${f.detail ? ` — ${f.detail}` : ''}`)
if (failed.some((f) => !/rail ledger/.test(f.name))) process.exit(1)
// rail-ledger-only failure: exit 2 to distinguish "blocked upstream" from "defect here"
if (failed.length > 0) process.exit(2)
