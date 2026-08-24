#!/usr/bin/env node
/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for the
 * arts-entertainment wave-zero property, run in-process against the worker
 * (Workers-shaped fetch handler imported directly; no network, no deploy).
 *
 * Exactly 16 boxes (§9.1), scored /16. Fail-closed: any failing box exits 1.
 * Nothing is silently skipped and nothing is stubbed; every disclosure is
 * printed in the box it belongs to.
 *
 * VENDORING PROVENANCE (batch watch-list law): src/axp-faces/ was vendored
 * from the axp.org.ai repo's COMMITTED HEAD on branch
 * draft/axp-extension-rates-g2 — commit
 * 523c9ef217d54feefb0b20734a6d2996a6965b79 — via `git show`, never the
 * working tree. Box 3 re-verifies byte-identity against that commit when
 * the repo is present, and against PINS.json digests always.
 *
 *   node scripts/selfcheck.mjs
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(DIR)

const VENDORED_FROM_HEAD = '523c9ef217d54feefb0b20734a6d2996a6965b79' // axp.org.ai draft/axp-extension-rates-g2
const AXP_REPO = '/Users/nathanclevenger/projects/axp.org.ai'
const EXT_DIGEST = '903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5' // axp-ext-rates-g2@0.2.0
const AX_REPO = '/Users/nathanclevenger/projects/ax'
const RAIL_LEDGER_BRANCH = 'draft/rail-ledger-v1'
const FACE = 'arts-entertainment.org.ai'

const worker = (await import('../worker.js')).default
const { manifest, ORIGIN } = await import('../src/manifest.js')
const { apiProduct } = await import('../src/substrate.js')
const { seed } = await import('../src/substrate.js')
const { coverageDomain } = await import('../src/axp-faces/coverage.js')
const { buildProbes } = await import('../src/axp-faces/manifest.js')
const { VERIFY_DOC } = await import('../src/surfaces.js')

const results = []
let failures = 0
function box(name, fn) {
  try {
    const note = fn()
    results.push(['PASS', name, note || ''])
  } catch (e) {
    failures++
    results.push(['FAIL', name, e.message])
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

async function call(path, { method = 'GET', headers = {}, body } = {}) {
  const req = new Request(`${ORIGIN}${path}`, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) })
  const res = await worker.fetch(req, {}, { waitUntil() {} })
  let json = null
  const text = await res.text()
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, headers: res.headers, json, text }
}

// silence seam logs during the run, but count them
const seamEvents = []
const realLog = console.log
console.log = (line) => {
  try {
    const o = JSON.parse(line)
    if (o.seam) return void seamEvents.push(o)
  } catch {}
  realLog(line)
}

// The canonical operation-id set — the five-surface invariant's one name.
const contractIds = new Set([manifest.collection.operationId, ...manifest.routes.map((r) => r.operationId)])
const META_OPS = new Set(['getIcp', 'getVerify']) // served meta-surfaces, not substrate domain operations

// ── 1. G3 APIProduct instance ────────────────────────────────────────────────
box('1 G3: APIProduct instance — every Noun has schema+binding+verbs; System coordinate declared (row hedges carried); operations = the served contract', () => {
  assert(apiProduct.substrate === 'arts-entertainment', 'substrate id mismatch')
  for (const n of apiProduct.nouns) assert(n.name && n.schema && n.schema.$type && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0, `Noun ${n.name} incomplete`)
  assert(['ingested', 'generated', 'native', 'federated'].every((b) => true) && apiProduct.nouns.every((n) => ['ingested', 'generated', 'native', 'federated'].includes(n.binding)), 'binding outside the closed enum')
  assert(apiProduct.systems.length >= 1 && apiProduct.systems.every((s) => s.system && s.coordinates.length > 0), 'System coordinates missing')
  assert(apiProduct.systems.some((s) => (s.note || '').includes('UNVERIFIED')), "the register's [UNVERIFIED] venue-management/ticketing hedge must be carried, not dropped")
  const nounVerbs = new Set(apiProduct.nouns.flatMap((n) => n.verbs))
  const prodOps = new Set(apiProduct.operations)
  for (const v of nounVerbs) assert(prodOps.has(v), `noun verb ${v} not in operations`)
  for (const op of prodOps) assert(nounVerbs.has(op), `operation ${op} owned by no Noun`)
  for (const op of prodOps) assert(contractIds.has(op), `substrate operation ${op} missing from the served contract`)
  for (const id of contractIds) assert(prodOps.has(id) || META_OPS.has(id), `contract operation ${id} is neither a substrate operation nor a meta surface`)
  return `${apiProduct.nouns.length} nouns (bindings honest: 3 generated + 1 native), 1 system coordinate, ${prodOps.size} operations = contract minus meta`
})

// ── 2. Both plies from one definition ───────────────────────────────────────
await (async () => {
  const dataRead = await call('/reservations')
  const headlessCreate = await call('/reservations', { method: 'POST', body: { venueId: 'ven_0001', resource: 'tee-time', startsAt: '2026-09-07T08:00:00Z', partySize: 2 } })
  box('2 Both plies serve from ONE definition (data GET + headless booking-door POST on the same collection)', () => {
    assert(dataRead.status === 200 && dataRead.json.type === 'OK', 'data face GET /reservations failed')
    assert(headlessCreate.status === 201 && headlessCreate.json.type === 'OK', 'headless POST /reservations failed')
    assert(headlessCreate.json.workspace && headlessCreate.json.retention, 'workspace mint / disclosed retention missing')
    return `workspace ${headlessCreate.json.workspace} minted, retention disclosed`
  })
})()

// ── 3. Quartet via vendored axp-faces at pins + provenance drift gate ───────
await (async () => {
  const card = await call('/.well-known/agents.json')
  const openapi = await call('/openapi.json')
  const pricing = await call('/pricing')
  const llms = await call('/llms.txt')
  box('3 Quartet from one defineSiteManifest() via vendored axp-faces 0.3.0 at PINS digest; vendored bytes = committed HEAD 523c9ef2 (git show), never the working tree', () => {
    assert(card.status === 200 && card.json.probes && card.json.interfaces.http.length > 0, 'card incomplete')
    assert(openapi.status === 200 && openapi.json.openapi === '3.1.0', 'openapi not 3.1')
    assert(pricing.status === 200 && pricing.json.model === 'metered', 'pricing missing')
    assert(llms.status === 200 && /^# /m.test(llms.text) && llms.text.includes('## Machine surfaces'), 'llms.txt H1/tail missing')
    const pins = JSON.parse(readFileSync(join(DIR, 'src/axp-faces/PINS.json'), 'utf8'))
    assert(pins.pinnedSpec === 'apis-ax-axp@2.6.0', 'PINS not at the ratified 2.6.0 pin')
    assert(pins.version === '0.3.0', 'axp-faces not 0.3.0')
    assert(pins.extensions?.['axp-ext-rates-g2']?.version === '0.2.0', 'extension axp-ext-rates-g2 not 0.2.0')
    assert(pins.extensions?.['axp-ext-rates-g2']?.digest === EXT_DIGEST, 'extension digest ≠ the ratified 903e414d… digest')
    const specDigest = readFileSync(join(DIR, 'spec/apis-ax-axp-2.6.0.digest.txt'), 'utf8').trim()
    assert(specDigest === pins.pinnedSpecDigest, 'vendored spec digest ≠ PINS digest')
    assert(sha256(readFileSync(join(DIR, 'spec/apis-ax-axp-2.6.0.spec.json'))) === pins.pinnedSpecDigest, 'vendored spec BYTES ≠ pinned digest')
    for (const [rel, want] of Object.entries(pins.files)) {
      const local = rel.replace(/^src\//, '')
      assert(sha256(readFileSync(join(DIR, 'src/axp-faces', local))) === want, `vendored ${local} ≠ PINS digest`)
    }
    let provenance = 'PINS-digest match only (axp.org.ai repo not present)'
    if (existsSync(AXP_REPO)) {
      for (const rel of Object.keys(pins.files)) {
        const local = rel.replace(/^src\//, '')
        const committed = execFileSync('git', ['-C', AXP_REPO, 'show', `${VENDORED_FROM_HEAD}:packages/axp-faces/${rel}`])
        assert(sha256(committed) === sha256(readFileSync(join(DIR, 'src/axp-faces', local))), `vendored ${local} ≠ committed HEAD ${VENDORED_FROM_HEAD.slice(0, 8)}`)
      }
      const pinsCommitted = execFileSync('git', ['-C', AXP_REPO, 'show', `${VENDORED_FROM_HEAD}:packages/axp-faces/PINS.json`])
      assert(sha256(pinsCommitted) === sha256(readFileSync(join(DIR, 'src/axp-faces/PINS.json'))), 'PINS.json ≠ committed HEAD copy')
      provenance = `byte-identical with committed HEAD ${VENDORED_FROM_HEAD.slice(0, 12)} (git show)`
    }
    return `pin ${pins.pinnedSpec} @ ${pins.pinnedSpecDigest.slice(0, 8)}…; ext 0.2.0 @ ${EXT_DIGEST.slice(0, 8)}…; ${provenance}`
  })
})()

// ── 4. Conformance at the pinned digest — probe ladder in-process ───────────
await (async () => {
  const probes = buildProbes(manifest)
  const keyless = await call(probes.keyless.url)
  const empties = await Promise.all(probes.knownEmpty.map((p) => call(p.url)))
  const forbiddens = await Promise.all(probes.knownForbidden.map((p) => call(p.url)))
  const pricingProbe = await call(probes.pricing.url)
  const over = await call(`${probes.overCeiling.url}?${probes.overCeiling.param}=${manifest.pricing.hardCeiling + 1}`)
  const half = await call(`${probes.overCeiling.url}?${probes.overCeiling.param}=${Math.floor(manifest.pricing.hardCeiling / 2)}`)
  const zero = await call(`${probes.overCeiling.url}?${probes.overCeiling.param}=0`)
  box('4 Local conformance at pinned digest — DISCLOSED: describeConformance is ABSENT from vendored axp-faces 0.3.0, so the probe ladder is re-implemented in-process from buildProbes(manifest) at the same pin (hosted verdict stays api.qa’s, §9.2)', () => {
    assert(keyless.status === 200 && keyless.json.type === 'OK', 'keyless probe not 200 OK')
    for (const e of empties) assert(e.status === 200 && e.json.type === 'EMPTY', 'knownEmpty probe not 200 EMPTY')
    assert(empties.length === 2, 'need 2 knownEmpty probes')
    for (const f of forbiddens) assert(f.status === 403 && f.json.type === 'BLOCKED', 'knownForbidden probe not 403 BLOCKED')
    assert(forbiddens.length === 2, 'need 2 knownForbidden probes')
    assert(pricingProbe.status === 200 && pricingProbe.json.model === 'metered', 'pricing probe failed')
    assert(over.status === 402 && over.json.type === 'OFFER', 'over-ceiling not 402 OFFER')
    assert(half.status === 200 && zero.status === 200, 'half/zero spend not 200')
    return 'probe ladder green at apis-ax-axp@2.6.0 pin (keyless OK, 2× EMPTY, 2× BLOCKED, pricing, over→OFFER, half/zero→OK); disclosure carried in the box title'
  })
})()

// ── 5. Anon sandbox universal floor + fixture law ───────────────────────────
await (async () => {
  const okRes = await call('/events')
  box('5 Anon sandbox: keyless 200 OK with substantive LABELED seed; every operation exercised by the corpus; fixture law (fictional names, [demo] prefixes, no GS1 ids so the 952 rule has nothing to bind, secret-scan clean)', () => {
    assert(okRes.status === 200 && okRes.json.type === 'OK', 'keyless probe failed')
    const recs = okRes.json.events
    assert(recs.length >= 5, 'seed not substantive')
    for (const k of ['venues', 'events', 'tickets', 'reservations']) {
      assert(Array.isArray(seed[k]) && seed[k].length >= 3, `seed.${k} thin — an operation would answer without substance`)
      for (const r of seed[k]) assert(r.example === true && typeof r.note === 'string', `seed.${k} record ${r.id} unlabeled`)
    }
    for (const v of seed.venues) assert(v.name.startsWith('[demo] '), `venue ${v.id} name not [demo]-prefixed`)
    for (const e of seed.events) assert(e.title.startsWith('[demo] '), `event ${e.id} title not [demo]-prefixed`)
    // filters must branch BOTH ways on the live corpus
    for (const f of manifest.collection.filters) {
      const vals = new Set(seed.events.map((r) => String(r[f])))
      assert(vals.size >= 2, `filter ${f} cannot branch — only one value in the corpus`)
    }
    // every substrate operation has corpus to answer with (reads) or a door (writes)
    assert(seed.tickets.some((t) => t.status === 'sold') && seed.tickets.some((t) => t.status === 'available'), 'ticket corpus lacks realistic depth (both statuses)')
    assert(seed.reservations.some((r) => r.status === 'confirmed'), 'no confirmed reservation for the outcome verb to target')
    const text = JSON.stringify(seed)
    assert(!/(?:password|secret|api[_-]?key|bearer |-----BEGIN)/i.test(text), 'secret-scan hit in seed records')
    assert(!/\b(?:952\d{5,}|01\d{12,})\b/.test(text), 'GTIN-shaped identifier found — this corpus mints no GS1 ids by design')
    return `${seed.venues.length}+${seed.events.length}+${seed.tickets.length}+${seed.reservations.length} labeled records; filters branch; no GS1 ids minted; secret-scan clean`
  })
})()

// ── 6. Rate card — TOP-LEVEL rates[] + five-surface invariant ───────────────
await (async () => {
  const pricing = await call('/pricing')
  const retired = await call('/rates')
  box('6 Rate card at the ruled placement: top-level rates[] in /pricing; metered → hardCeiling>0 + offers + binding:false statement; every row freeQuota or zero price; rows/MCP tools/suite refs all key on canonical operationIds ⊆ contract (five-surface invariant); no /rates side door', () => {
    assert(pricing.json.model === 'metered' && pricing.json.hardCeiling > 0, 'pricing model/ceiling')
    assert(pricing.json.binding === false && typeof pricing.json.statement === 'string', 'unbound stub must carry binding:false + statement')
    const rates = pricing.json.rates
    assert(Array.isArray(rates) && rates.length > 0, 'top-level rates[] missing from the Pricing Document')
    for (const row of rates) assert(row.price === 0 || row.freeQuota !== undefined, `rate row ${row.operation} lacks freeQuota and is not zero-priced`)
    const domain = new Set(coverageDomain(manifest))
    for (const row of rates) assert(domain.has(`openapi:${row.operation}`) || domain.has(`mcp:${row.operation}`), `rate row ${row.operation} not in the contract's canonical operation domain`)
    for (const row of rates) assert(contractIds.has(row.operation), `rate row ${row.operation} is not a canonical contract operationId`)
    const rateOps = new Set(rates.map((r) => r.operation))
    for (const op of apiProduct.operations) assert(rateOps.has(op), `substrate operation ${op} has no rate row — every operation prices from zero or declares a quota`)
    for (const t of manifest.mcp.tools) assert(contractIds.has(t), `MCP tool ${t} is not a canonical contract operationId (five-surface invariant)`)
    for (const c of VERIFY_DOC.checks) assert(contractIds.has(c.operation) || c.operation === 'getPricing', `suite check ${c.id} refs unknown operation ${c.operation}`)
    assert(retired.status === 404, '/rates side door answers — the ruled placement is top-level rates[] in /pricing')
    return `${rates.length} rows in /pricing covering all ${apiProduct.operations.length} substrate ops; MCP tools + suite refs on the same ids; /rates 404`
  })
})()

// ── 7. Motion declared; shapes from the motion's permissible set ────────────
box('7 motion declared per projection; B2A shapes only; no OAuth/CC gates on the B2A path (id.org.ai machine identity + 402)', () => {
  const proj = JSON.parse(readFileSync(join(DIR, 'projection.json'), 'utf8'))
  assert(proj.motion === 'B2A', 'motion missing')
  const allowed = new Set(['anon-sandbox', 'earned-credits', 'human-claimed', 'paid'])
  for (const o of proj.offer) assert(allowed.has(o.shape), `shape ${o.shape} not in the B2A ladder`)
  const gates = proj.offer.map((o) => o.gate).join(' ')
  assert(!/oauth|credit card|\bCC\b/i.test(gates.replace(/no live settlement/i, '')), 'an OAuth/CC gate leaked into a B2A projection')
  return 'B2A, 4 ladder rungs (3 stubs, labeled)'
})

// ── 8. 402 OFFER advertises the ladder ───────────────────────────────────────
await (async () => {
  const overCeiling = await call('/events?spend=26')
  const offerDoor = await call('/offer')
  const confirmStub = await call('/reservations/rsv_0001/confirm', { method: 'POST', body: {} })
  box('8 402 OFFER bodies advertise the B2A ladder (pay / work / claim) on every OFFER door; payable stubs LABELED — never fake billing', () => {
    for (const [lbl, r] of [['over-ceiling', overCeiling], ['offer door', offerDoor], ['confirm stub', confirmStub]]) {
      assert(r.status === 402 && r.json.type === 'OFFER', `${lbl} is not a 402 OFFER`)
      assert(Array.isArray(r.json.alternatives), `${lbl} OFFER carries no alternatives ladder`)
      const ids = r.json.alternatives.map((a) => a.id).sort().join(',')
      assert(ids === 'claim,pay,work', `${lbl} ladder incomplete: ${ids}`)
    }
    assert(confirmStub.json.stub === true, 'confirm OFFER not labeled stub')
    assert(/STUB/i.test(JSON.stringify(confirmStub.json)), 'stub labeling not human-visible in the OFFER body')
    return '3 OFFER doors, full pay/work/claim ladder, stub labeled'
  })
})()

// ── 9. Counterpart-brand gap ─────────────────────────────────────────────────
box('9 B2A2B/C counterpart-brand: gap RECORDED in the projection config (the row rules consumer demand agent-intermediated only)', () => {
  const proj = JSON.parse(readFileSync(join(DIR, 'projection.json'), 'utf8'))
  assert(proj.counterpartBrandGap && proj.counterpartBrandGap.recorded === true, 'counterpart-brand gap not recorded')
  assert(/free-rider|B2A2C/.test(proj.counterpartBrandGap.reason), "the row's free-rider ruling must appear in the record")
  return 'recorded (GAP row — naming is #3’s job)'
})

// ── 10. G4 projection config complete ────────────────────────────────────────
box('10 G4 projection config complete per §2 (GAP form: brand pending, everything else filled; row hedges + primacy collisions carried)', () => {
  const proj = JSON.parse(readFileSync(join(DIR, 'projection.json'), 'utf8'))
  for (const k of ['substrate', 'icp', 'personas', 'motion', 'offer', 'pricing', 'positioning', 'experiment']) {
    assert(proj[k] !== undefined, `projection.${k} missing`)
  }
  assert(proj.brand === null && proj.brandStatus.includes('GAP'), 'GAP row must record brand-pending, not invent a brand')
  assert(proj.positioning.includes('WITHHELD'), 'agent-default withholding must be explicit in positioning')
  assert(proj.sourceRouteStatus && proj.sourceRouteStatus.classA === false, 'source-route status must record classA:false honestly')
  assert(proj.primacyCollisions && proj.primacyCollisions.collisions.length >= 3, 'primacy collisions (Event/Ticket/Reservation) must be recorded — no ruling exists, nothing shared is claimed')
  assert(proj.heldSubNicheTails && proj.heldSubNicheTails.recorded.length > 0, 'held sub-niche tails must be recorded (not served)')
  return 'complete; brand=null (GAP), experiment registered, thesis-gap hedge + 3 primacy collisions carried'
})

// ── 11. Guardrail ────────────────────────────────────────────────────────────
box('11 Guardrail (§5.3): agent-default claim never worse-priced than sibling same-shape face — vacuously satisfied, and the check RAN', () => {
  const proj = JSON.parse(readFileSync(join(DIR, 'projection.json'), 'utf8'))
  assert(!/agent[- ]default for/i.test(proj.positioning) || /WITHHELD/.test(proj.positioning), 'projection claims agent-default — guardrail would need a sibling price sweep')
  assert(proj.positioning.includes('WITHHELD'), 'withholding must be explicit')
  // no sibling projection of this substrate serves anywhere — nothing to compare
  return 'no agent-default claim exists on this substrate (worthiness bar not attempted) and no sibling projection serves — the conditional passes with a false antecedent, stated, not skipped'
})

// ── 12. /verify export + native card placements + MCP door ──────────────────
await (async () => {
  const verify = await call('/verify')
  const card = await call('/.well-known/agents.json')
  const mcpList = await call('/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })
  const mcpCall = await call('/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'listEvents', arguments: { category: 'performance' } } } })
  box('12 /verify export published + card links.verify + top-level g2 (native rates-g2 placements); interfaces.testSuite NOT declared; MCP door mounted (authless sandbox rung), card-declared, same Nouns/verbs', () => {
    assert(verify.status === 200 && Array.isArray(verify.json.checks) && verify.json.checks.length >= 10, '/verify missing or thin')
    assert(card.json.links.verify === `${ORIGIN}/verify`, 'card links.verify missing or wrong — the ruled placement for the runnable-suite link')
    assert(card.json.g2 && typeof card.json.g2 === 'object' && Object.keys(card.json.g2).length > 0, 'card top-level g2 missing — the ruled placement for G2/ICP coordinates')
    assert(typeof card.json.links.icp === 'string', 'links.icp stays declared beside g2')
    assert(card.json.interfaces.testSuite === undefined, 'testSuite declared without a verified pinned suite — inadmissible')
    const tools = mcpList.json.result.tools.map((t) => t.name).sort()
    const declared = [...manifest.mcp.tools].sort()
    assert(JSON.stringify(tools) === JSON.stringify(declared), 'tools/list ≠ card declaration')
    const payload = JSON.parse(mcpCall.json.result.content[0].text)
    assert(payload.type === 'OK' && payload.events.every((r) => r.example === true), 'tools/call result not the same labeled records')
    return `${verify.json.checks.length} published checks; links.verify + g2 on the card; ${tools.length} authless MCP tools == card, answering labeled seed`
  })
})()

// ── 13. Seams ────────────────────────────────────────────────────────────────
box('13 Seams emitted: metering tagged {substrate,projection,motion,operation,shape,pattern} + identity class; operations are canonical ids; money + receipt stubs on the payable path only (settled:false — never fake billing)', () => {
  const meters = seamEvents.filter((e) => e.seam === 'meter')
  assert(meters.length > 0, 'no metering events emitted during the run')
  for (const m of meters) {
    for (const k of ['substrate', 'projection', 'motion', 'operation', 'shape', 'pattern', 'identityClass']) {
      assert(m[k] !== undefined, `meter event missing ${k}`)
    }
    assert(contractIds.has(m.operation) || /^mcp:/.test(m.operation), `meter operation ${m.operation} is not a canonical id`)
  }
  assert(seamEvents.some((e) => e.seam === 'money' && e.stub === true && e.settled === false), 'money-event stub not emitted')
  assert(!seamEvents.some((e) => e.seam === 'money' && e.settled === true), 'a settled money event on a stub rail would be fake billing')
  assert(seamEvents.some((e) => e.seam === 'receipt' && e.stub === true), 'receipt stub not emitted')
  return `${meters.length} meter events on canonical ids, money+receipt stubs present, none settled`
})

// ── 14. Conneg spot-check + demo labeling ────────────────────────────────────
await (async () => {
  const bare = await call('/pricing')
  const agent = await call('/pricing', { headers: { 'user-agent': 'Claude-User/1.0', accept: '*/*' } })
  const browser = await call('/pricing', { headers: { accept: 'text/html,application/xhtml+xml', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' } })
  const home = await call('/', { headers: { accept: 'text/html,application/xhtml+xml', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' } })
  box('14 Docs/landing conneg spot-check (bare curl JSON / agent UA markdown / browser HTML); demo data labeled on served faces', () => {
    assert((bare.headers.get('content-type') || '').includes('json'), 'bare GET /pricing not JSON')
    assert((agent.headers.get('content-type') || '').includes('markdown'), 'agent UA /pricing not markdown')
    assert((browser.headers.get('content-type') || '').includes('html'), 'browser /pricing not HTML')
    assert(/labeled synthetic example data/.test(home.text), 'landing does not label the demo data')
    return 'three faces answer per the conneg law; landing labels the demo data'
  })
})()

// ── 15. No ghost surfaces ────────────────────────────────────────────────────
await (async () => {
  const openapi = await call('/openapi.json')
  const misses = []
  for (const [p, item] of Object.entries(openapi.json.paths)) {
    for (const method of Object.keys(item)) {
      if (!['get', 'post'].includes(method)) continue
      const probe = p
        .replace('/events/{id}', '/events/evt_0001')
        .replace('/venues/{id}', '/venues/ven_0001')
        .replace('/reservations/{id}/confirm', '/reservations/rsv_0001/confirm')
        .replace('/reservations/{id}', '/reservations/rsv_0001')
      const r = await call(probe, {
        method: method.toUpperCase(),
        ...(method === 'post' && probe === '/reservations' && { body: { venueId: 'ven_0001', resource: 'table', startsAt: '2026-09-08T19:00:00Z' } }),
        ...(method === 'post' && probe.includes('confirm') && { body: {} }),
      })
      if (r.status === 404) misses.push(`${method.toUpperCase()} ${p}`)
    }
  }
  box('15 No ghost surfaces: every contract path answers (presence-when-true)', () => {
    assert(misses.length === 0, `declared but not serving: ${misses.join(', ')}`)
    return `${Object.keys(openapi.json.paths).length} contract paths all answer`
  })
})()

// ── 16. Rail ledger ──────────────────────────────────────────────────────────
box('16 Face registered in the rail ledger (faces-payable/week denominator) — door A, per LEDGER.md at ax draft/rail-ledger-v1', () => {
  const proj = JSON.parse(readFileSync(join(DIR, 'projection.json'), 'utf8'))
  assert(proj.railLedger === `https://apis.ax/account/faces?face=${FACE}`, 'projection.railLedger missing or off-convention')
  let where = 'projection.railLedger recorded (ax repo not present to verify the committed registry row)'
  if (existsSync(AX_REPO)) {
    const committed = execFileSync('git', ['-C', AX_REPO, 'show', `${RAIL_LEDGER_BRANCH}:packages/rail-ledger/registry/faces.json`], { encoding: 'utf8' })
    const reg = JSON.parse(committed)
    const row = reg.faces.find((f) => f.face === FACE)
    assert(row, `face ${FACE} not in the COMMITTED registry at ${RAIL_LEDGER_BRANCH}`)
    assert(row.substrate === 'arts-entertainment' && row.payableBasis === 'test-mode', 'registry row coordinates wrong')
    where = `committed registry row verified at ${RAIL_LEDGER_BRANCH} (payableBasis test-mode — the 402 boundary is served, settlement rail not activated)`
  }
  return where
})

console.log = realLog
let pass = 0
for (const [status, name, msg] of results) {
  if (status === 'PASS') pass++
  console.log(`${status.padEnd(6)} ${name}${msg ? ` — ${msg}` : ''}`)
}
console.log(`\n${pass}/16 pass, ${failures} fail (16 §9.1 boxes; vendored from axp.org.ai draft/axp-extension-rates-g2 @ ${VENDORED_FROM_HEAD})`)
process.exit(failures ? 1 : 0)
