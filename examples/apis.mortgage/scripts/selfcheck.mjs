/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist (16 boxes), run
 * mechanically against the in-process worker (no network, no deploy).
 * Fail-closed: any FAILED box exits 1. Box 16 (rail-ledger registration) is
 * reported BLOCKED — the ledger service + LEDGER.md are not on the committed
 * draft/rail-ledger-v1 branch of ~/projects/ax and no address convention
 * exists yet; blocked-on-rail-ledger is recorded, never stubbed. A BLOCKED
 * box is honestly counted as NOT passing (score /16) but is not a defect of
 * this build, so it does not exit 1.
 *
 * Box 4 note (disclosed): the autonomous-qa `describeConformance` runner is
 * not vendored in this repo; box 4 runs the same probe-ladder expansion
 * behaviorally in-process against the vendored generator at the PINS.json
 * digest. The hosted api.qa verdict (§9.2) remains the independent check.
 *
 *   node scripts/selfcheck.mjs
 */

import worker from '../src/worker.js'
import { manifest } from '../src/manifest.js'
import { product } from '../src/product.js'
import { projection } from '../src/projection.js'

const ORIGIN = 'https://apis.mortgage'
const env = {}
const results = []

function box(n, name, state, detail = '') {
  // state: true | false | 'BLOCKED'
  results.push({ n, name, state, detail })
  const label = state === true ? 'PASS   ' : state === 'BLOCKED' ? 'BLOCKED' : 'FAIL   '
  console.log(`${label} [${String(n).padStart(2)}] ${name}${detail ? ` — ${detail}` : ''}`)
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

// capture the seam logs for box 13, silence them otherwise
const realLog = console.log
const seamEvents = []
console.log = (...a) => {
  if (typeof a[0] === 'string' && a[0].startsWith('{"kind"')) {
    try { seamEvents.push(JSON.parse(a[0])) } catch { /* ignore */ }
    return
  }
  realLog(...a)
}

// ── box 1: G3 APIProduct authored ─────────────────────────────────────────
box(
  1,
  'G3 APIProduct authored: nouns each carry schema+binding+verbs; System coordinate declared',
  product.substrate === 'mortgage' &&
    product.nouns.every((n) => n.schema && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0) &&
    product.systems.length > 0 &&
    product.systems.every((s) => s.system && s.coordinates.length > 0),
)

// ── box 2: both plies from one definition ─────────────────────────────────
const mint = await call('/pipelines', { method: 'POST' })
const plId = mint.body.results?.[0]?.id
const add = await call(`/pipelines/${plId}/loan-files`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    loanIdentifier: 'EXAMPLEULI0000000000LF9001',
    loanPurposeType: 'Purchase',
    lender: { name: 'Example Mortgage Bank (fictional demo lender)' },
    example: true,
  }),
})
const plList = await call(`/pipelines/${plId}/loan-files`)
box(
  2,
  'both plies from one definition: LOS pipeline door does native CRUD on the same LoanFile noun',
  mint.status === 200 && /ephemeral/.test(mint.body.results[0].retention) &&
    add.status === 200 && add.body.results[0].binding === 'native' && add.body.results[0].$type === 'LoanFile' &&
    plList.body.type === 'OK' && plList.body.results.length === 1,
)

// ── box 3: quartet from one manifest via vendored generator ───────────────
const card = await call('/.well-known/agents.json')
const openapi = await call('/openapi.json')
const pricing = await call('/pricing')
const llms = await call('/llms.txt')
box(
  3,
  'quartet emitted from one defineSiteManifest via vendored axp-faces at PINS digest (card, openapi 3.1, pricing, llms.txt)',
  card.status === 200 &&
    openapi.status === 200 &&
    openapi.body.openapi === '3.1.0' &&
    pricing.status === 200 &&
    llms.status === 200 &&
    /^# /m.test(llms.text),
)

// ── box 4: conformance probe ladder green at the pinned digest ────────────
const e1 = await call('/loan-files?purpose=none')
const e2 = await call('/loan-files?status=none')
const f1 = await call('/loan-files?scope=borrower-pii')
const f2 = await call('/loan-files?scope=servicing')
const over = await call(`/loan-files?spend=${manifest.pricing.hardCeiling * 2}`)
const half = await call(`/loan-files?spend=${manifest.pricing.hardCeiling / 2}`)
const zero = await call('/loan-files?spend=0')
box(
  4,
  'probe ladder green (describeConformance stand-in, disclosed): 2× knownEmpty, 2× knownForbidden, over→402 OFFER, half/zero→200 OK',
  e1.body.type === 'EMPTY' && e2.body.type === 'EMPTY' && e1.status === 200 && e2.status === 200 &&
    f1.body.type === 'BLOCKED' && f2.body.type === 'BLOCKED' && f1.status === 403 && f2.status === 403 &&
    over.status === 402 && over.body.type === 'OFFER' && half.status === 200 && zero.status === 200,
)

// ── box 5: anon sandbox floor with substantive labeled seed ───────────────
const files = await call('/loan-files')
const market = await call('/market-records')
const filesLabeled = (files.body.results || []).every((r) => r.example === true && /fictional/i.test(r.lender?.name || ''))
const marketReal = (market.body.results || []).every(
  (r) => r.provenance?.url?.startsWith('https://ffiec.cfpb.gov/') && r.provenance?.observedAt,
)
const noRealULI = (files.body.results || []).every((r) => r.loanIdentifier?.startsWith('EXAMPLE'))
box(
  5,
  'anon sandbox floor: keyless 200 OK; synthetic loan files example-labeled + fictional lenders + EXAMPLE identifiers; market records real with stamped HMDA provenance',
  files.status === 200 && files.body.type === 'OK' && files.body.results.length >= 6 && filesLabeled && noRealULI &&
    market.status === 200 && market.body.type === 'OK' && market.body.results.length >= 10 && marketReal,
)

// ── box 6: rate card at the ruled placement; five-surface operationIds ────
const rates = pricing.body.rates
const opIds = Object.values(openapi.body.paths).flatMap((p) =>
  Object.values(p).map((op) => op.operationId).filter(Boolean),
)
const OPERATION_ID_RE = /^[a-z][A-Za-z0-9]*$/
const mcpProbe = await call('/mcp', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
})
const cardTools = card.body.interfaces?.mcp?.tools || []
const servedTools = (mcpProbe.body.result?.tools || []).map((t) => t.name)
box(
  6,
  'rate card: metered, hardCeiling > 0, offers, binding+statement; rates[] TOP-LEVEL, every row freeQuota or zero price, rates[].operation ⊆ operationIds; one camelCase id across contract+MCP, no duplicates',
  pricing.body.model === 'metered' && pricing.body.hardCeiling > 0 && pricing.body.binding === false &&
    typeof pricing.body.statement === 'string' &&
    Array.isArray(rates) && rates.length === 6 &&
    card.body.monetization?.offers?.[0]?.rates === undefined &&
    rates.every((r) => r.freeQuota !== undefined || r.price === 0) &&
    rates.every((r) => opIds.includes(r.operation)) &&
    opIds.every((id) => OPERATION_ID_RE.test(id)) &&
    new Set(opIds).size === opIds.length &&
    servedTools.every((t) => OPERATION_ID_RE.test(t) && opIds.includes(t)) &&
    cardTools.length === servedTools.length && cardTools.every((t) => servedTools.includes(t)),
  `opIds=[${opIds}] tools=[${servedTools}]`,
)

// ── box 7: motion declared; B2A gates only ────────────────────────────────
box(
  7,
  'motion declared (B2A); offer shapes from the B2A set only; no OAuth/CC gates anywhere',
  projection.motion === 'B2A' &&
    projection.offer.every((o) => !/oauth|credit card|cc on file/i.test(String(o.gate))),
)

// ── box 8: 402 OFFER advertises the whole ladder ──────────────────────────
const altIds = (over.body.alternatives || []).map((a) => a.id)
box(
  8,
  '402 OFFER alternatives advertise the whole ladder (sandbox / work / claim / pay), stubs labeled',
  ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-402'].every((id) => altIds.includes(id)) &&
    over.body.alternatives.filter((a) => a.status).every((a) => /stub/.test(a.status)),
)

// ── box 9: B2A2B counterpart brand recorded ───────────────────────────────
box(
  9,
  'counterpart-brand check: non-technical principals in ICP → human-vocabulary candidates recorded (closers.mortgage, processors.mortgage), never asserted',
  Array.isArray(projection.counterpartBrand?.candidates) &&
    projection.counterpartBrand.candidates.includes('closers.mortgage') &&
    projection.counterpartBrand.candidates.includes('processors.mortgage') &&
    /candidates recorded/.test(projection.counterpartBrand.status),
)

// ── box 10: G4 projection config complete ─────────────────────────────────
box(
  10,
  'G4 projection config complete (brand, ICP+personas, motion, offer[], positioning, mdx, experiment)',
  projection.brand === 'apis.mortgage' && projection.icp && projection.personas.length >= 2 &&
    projection.offer.length > 0 && typeof projection.positioning === 'string' &&
    'mdx' in projection && projection.experiment?.pattern === '402-metered-per-call',
)

// ── box 11: guardrail — no agent-default claim before the worthiness bar ──
const publishedStrings = JSON.stringify([card.body, llms.text, manifest.description, projection.positioning])
box(
  11,
  'guardrail: no "agent default" claim anywhere on the face (worthiness bar not attested; §5.3 price comparison therefore trivially satisfied)',
  !/agent default/i.test(publishedStrings),
)

// ── box 12: /verify export; testSuite undeclared ──────────────────────────
const verify = await call('/verify', { headers: { accept: 'application/json' } })
const suite = await call('/verify/suite.json')
box(
  12,
  '/verify export published (doc + suite.json); interfaces.testSuite undeclared (verifier cannot judge it yet); links.verify + g2 native on the card',
  verify.status === 200 && suite.status === 200 && suite.body.runner === 'api.qa/suite@1' &&
    card.body.interfaces.testSuite === undefined &&
    card.body.links?.verify === 'https://apis.mortgage/verify' &&
    card.body.g2 && typeof card.body.g2 === 'object' && !Array.isArray(card.body.g2) &&
    Object.keys(card.body.g2).length > 0 && card.body.g2.motion === 'B2A',
)

// ── box 13: seams emitted with §6.4 tags + identity class ─────────────────
const meterOk = seamEvents.some(
  (e) =>
    e.kind === 'meter' && e.substrate === 'mortgage' && e.projection === 'apis.mortgage' &&
    e.motion === 'B2A' && e.pattern === '402-metered-per-call' && e.operation && e.shape && e.identityClass,
)
box(
  13,
  'seams emitted: meter events tagged {substrate, projection, motion, operation, shape, pattern} + identity class at the traffic seam',
  meterOk,
  `${seamEvents.length} events captured in-process`,
)

// ── box 14: conneg spot-check + demo data labeled ─────────────────────────
const homeCurl = await call('/', { headers: { accept: '*/*', 'user-agent': 'curl/8.6.0' } })
const homeBrowser = await call('/', {
  headers: { accept: 'text/html,*/*;q=0.8', 'sec-fetch-mode': 'navigate', 'user-agent': 'Mozilla/5.0' },
})
const pricingMd = await call('/pricing.md')
const headCard = await call('/.well-known/agents.json', { method: 'HEAD' })
const postPricing = await call('/pricing', { method: 'POST' })
box(
  14,
  'conneg law: curl / → JSON, browser / → HTML, /pricing.md → markdown, Link alternates; HEAD mirrors GET; 405 typed with Allow; demo data labeled on landing',
  typeof homeCurl.body === 'object' &&
    /^<!doctype html>/i.test(homeBrowser.text) && /labeled example data/.test(homeBrowser.text) &&
    /markdown/.test(pricingMd.headers.get('content-type') || '') &&
    (homeCurl.headers.get('link') || '').includes('rel="alternate"') &&
    headCard.status === 200 && headCard.text === '' &&
    postPricing.status === 405 && postPricing.body.type === 'BLOCKED' &&
    (postPricing.headers.get('allow') || '').includes('GET'),
)

// ── box 15: no ghost surfaces ─────────────────────────────────────────────
let ghosts = []
for (const [p, ops] of Object.entries(openapi.body.paths)) {
  if (p.includes('{') || !ops.get) continue
  const r = await call(p)
  const expected = p === manifest.pricing.offerPath ? [402] : [200]
  if (!expected.includes(r.status)) ghosts.push(`${p}→${r.status}`)
}
box(15, 'no ghost surfaces: every non-templated GET in openapi answers as declared', ghosts.length === 0, ghosts.join(', '))

// ── box 16: rail-ledger registration ──────────────────────────────────────
box(
  16,
  'face registered in the rail ledger (faces-payable/week denominator)',
  'BLOCKED',
  'blocked-on-rail-ledger: no ledger service or LEDGER.md on the committed draft/rail-ledger-v1 branch of ~/projects/ax; no address convention exists yet — recorded, not stubbed',
)

console.log = realLog
const passed = results.filter((r) => r.state === true).length
const failed = results.filter((r) => r.state === false)
console.log(`\n${passed}/16 boxes pass (${results.filter((r) => r.state === 'BLOCKED').length} blocked)`)
if (failed.length > 0) process.exit(1)
