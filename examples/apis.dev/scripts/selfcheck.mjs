/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist, run mechanically
 * against the in-process worker (no network, no deploy). Fail-closed:
 * any failed box exits 1.
 *
 *   node scripts/selfcheck.mjs
 */

import worker from '../src/worker.js'
import { manifest } from '../src/manifest.js'
import { product } from '../src/product.js'
import { projection } from '../src/projection.js'

const ORIGIN = 'https://apis.dev'
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

// 1 — G3 instance shape
check(
  'G3 APIProduct authored: nouns each carry schema+binding+verbs; System coordinate declared',
  product.substrate === 'software-it-services' &&
    product.nouns.every((n) => n.schema && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0) &&
    product.systems.length > 0 &&
    product.systems.every((s) => s.system && s.coordinates.length > 0),
)

// 2 — quartet from one manifest via vendored generator (structural: the routes
// module is the vendored axp-faces; verified byte-identical against PINS.json
// at vendor time — see axp-faces/VENDORED.json)
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

// 3 — card shape: interfaces non-empty, probes, conformance + mcp declared-only-where-mounted
const mcpProbe = await call('/mcp', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
})
const cardTools = card.body.interfaces?.mcp?.tools || []
const servedTools = (mcpProbe.body.result?.tools || []).map((t) => t.name)
check(
  'card: interfaces.http non-empty; probes manifest; links.conformance → api.qa/apis.dev',
  Array.isArray(card.body.interfaces?.http) &&
    card.body.interfaces.http.length > 0 &&
    card.body.probes?.keyless?.url === '/apis' &&
    card.body.links?.conformance === 'https://api.qa/apis.dev',
)
check(
  'MCP door mounted and card-declared tools == served tools',
  mcpProbe.status === 200 &&
    cardTools.length === servedTools.length &&
    cardTools.every((t) => servedTools.includes(t)),
  `card=[${cardTools}] served=[${servedTools}]`,
)

// 4 — anon sandbox floor: keyless 200 OK with substantive labeled seed
const apis = await call('/apis')
const allLabeled = (apis.body.results || []).every((r) => r.provenance || r.example === true)
check(
  'anon sandbox floor: keyless GET /apis → 200 OK, every record provenance-stamped or example-labeled',
  apis.status === 200 && apis.body.type === 'OK' && apis.body.results.length >= 5 && allLabeled,
)

// 5 — probe ladder: knownEmpty ×2, knownForbidden ×2, over/half/zero ceiling
const e1 = await call('/apis?filter=none')
const e2 = await call('/apis?tag=none')
const f1 = await call('/apis?scope=admin')
const f2 = await call('/apis?scope=internal')
const over = await call(`/apis?spend=${manifest.pricing.hardCeiling * 2}`)
const half = await call(`/apis?spend=${manifest.pricing.hardCeiling / 2}`)
const zero = await call('/apis?spend=0')
check(
  'probe ladder: 2× knownEmpty EMPTY/200, 2× knownForbidden BLOCKED/403',
  e1.body.type === 'EMPTY' && e2.body.type === 'EMPTY' && e1.status === 200 && e2.status === 200 &&
    f1.body.type === 'BLOCKED' && f2.body.type === 'BLOCKED' && f1.status === 403 && f2.status === 403,
)
check(
  'metered boundary: over-ceiling → 402 OFFER with the B2A ladder in alternatives; half and zero → 200 OK',
  over.status === 402 && over.body.type === 'OFFER' && Array.isArray(over.body.alternatives) &&
    over.body.alternatives.length === 4 && half.status === 200 && zero.status === 200,
)

// 6 — rate card: model, hardCeiling, offers, binding axis, rate rows
const rates = pricing.body.offers?.[0]?.rates ?? manifest.pricing.offers[0].rates
const opIds = Object.values(openapi.body.paths).flatMap((p) =>
  Object.values(p).map((op) => op.operationId).filter(Boolean),
)
check(
  'rate card: metered, hardCeiling > 0, offers present, binding declared with statement',
  pricing.body.model === 'metered' && pricing.body.hardCeiling > 0 && pricing.body.binding === false &&
    typeof pricing.body.statement === 'string',
)
check(
  'rate rows: every row has freeQuota or zero price; rates[].operation ⊆ OpenAPI operationIds',
  rates.every((r) => r.freeQuota !== undefined || r.price === 0) &&
    rates.every((r) => opIds.includes(r.operation)),
  `opIds=[${opIds}]`,
)
const offerBoundary = await call('/offer')
check(
  'rate rows served on the wire: card monetization.offers[0].rates and the /offer 402 body carry them ' +
    '(the pinned generator closes /pricing to model/ceiling/binding — the DRAFT §2 top-level rates[] member awaits the rate-card extension ruling, spec Open #1)',
  card.body.monetization?.offers?.[0]?.rates?.length === 4 &&
    offerBoundary.status === 402 && offerBoundary.body.rates?.length === 4,
)

// 7 — motion declared; B2A gates only (no OAuth/CC gate anywhere)
check(
  'motion declared (B2A); offer shapes from the B2A set only; no OAuth/CC gates',
  projection.motion === 'B2A' &&
    projection.offer.every((o) => !/oauth|credit card|cc on file/i.test(String(o.gate))),
)

// 8 — 402 OFFER advertises pay / work / claim
const altIds = (over.body.alternatives || []).map((a) => a.id)
check(
  '402 OFFER alternatives advertise the whole ladder (sandbox / work / claim / pay), stubs labeled',
  ['anon-sandbox', 'earned-credits', 'human-claimed', 'paid-402'].every((id) => altIds.includes(id)) &&
    over.body.alternatives.filter((a) => a.status).every((a) => /stub/.test(a.status)),
)

// 9 — G4 projection config complete
check(
  'G4 projection config complete (brand, ICP+personas, motion, offer[], positioning, mdx, experiment)',
  projection.brand === 'apis.dev' && projection.icp && projection.personas.length >= 2 &&
    projection.offer.length > 0 && typeof projection.positioning === 'string' &&
    'mdx' in projection && projection.experiment?.pattern === '402-metered-per-call',
)

// 10 — no agent-default claim before the worthiness bar
const publishedStrings = JSON.stringify([card.body, llms.text, manifest.description, projection.positioning])
check(
  'worthiness bar respected: no "agent default" claim anywhere on the face',
  !/agent default/i.test(publishedStrings),
)

// 11 — /verify export published; testSuite NOT declared on card (documented)
const verify = await call('/verify', { headers: { accept: 'application/json' } })
const suite = await call('/verify/suite.json')
check(
  '/verify export published (doc + suite.json); interfaces.testSuite undeclared (verifier cannot judge it yet)',
  verify.status === 200 && suite.status === 200 && suite.body.runner === 'api.qa/suite@1' &&
    card.body.interfaces.testSuite === undefined,
)

// 12 — two plies from one definition: headless door CRUDs the same noun
const mint = await call('/workspaces', { method: 'POST' })
const wsId = mint.body.results?.[0]?.id
const reg = await call(`/workspaces/${wsId}/apis`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'example-demo.api', name: 'Example Demo API (fictional)', example: true }),
})
const list = await call(`/workspaces/${wsId}/apis`)
check(
  'headless ply: workspace mints keyless with disclosed retention; native CRUD on the same WebAPI noun',
  mint.status === 200 && /ephemeral/.test(mint.body.results[0].retention) &&
    reg.status === 200 && reg.body.results[0].binding === 'native' &&
    list.body.type === 'OK' && list.body.results.length === 1,
)

// 13 — conneg spot-check: bare curl JSON / browser HTML / .md face; HEAD mirrors GET; 405 typed
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

// 14 — no ghost surfaces: every non-templated GET path in the contract answers
let ghosts = []
for (const [p, ops] of Object.entries(openapi.body.paths)) {
  if (p.includes('{') || !ops.get) continue
  const r = await call(p)
  const expected = p === manifest.pricing.offerPath ? [402] : [200]
  if (!expected.includes(r.status)) ghosts.push(`${p}→${r.status}`)
}
check('no ghost surfaces: every non-templated GET in openapi answers as declared', ghosts.length === 0, ghosts.join(', '))

// 15 — fixture law on synthetic records: labeled, fictional providers only
const actions = await call('/actions')
check(
  'fixture law: every synthetic Action record example-labeled with a fictional provider',
  actions.body.results.every((r) => r.example === true && /fictional/i.test(r.provider.name)),
)

console.log = realLog
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks pass`)
if (failed.length > 0) process.exit(1)
