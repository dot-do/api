/**
 * api.cleaning — the wave-zero self-verify suite (spec §9.1) plus the
 * fail-closed, digest-pinned AXP conformance gate.
 *
 * BOX-4 DISCLOSURE: `describeConformance` is absent from the vendored
 * axp-faces package, so the probe ladder is exercised IN-PROCESS here two
 * ways — (a) api.qa's own requirement implementations (autonomous-qa
 * `assertConforms`, the same digest-locked implementations the hosted
 * verifier at https://api.qa runs) dispatched in memory against the worker
 * app, and (b) the explicit behavioral probes below (keyless OK, EMPTY,
 * BLOCKED, over-ceiling 402). The gate is fail-closed: missing autonomous-qa
 * FAILS the suite — a conformance gate that skips is not a gate.
 *
 * `autonomous-qa` is resolved from (in order): $AUTONOMOUS_QA_DIR, the repo's
 * node_modules, the sibling estate checkout ~/projects/api.qa.
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiCleaning } from '../examples/api.cleaning/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../examples/api.cleaning/src/axp'
import { RATES } from '../examples/api.cleaning/src/manifest'
import { WORK_ORDERS, VENDORS, SCHEDULES, SERVICE_VISITS, FACILITIES } from '../examples/api.cleaning/src/seed'
import { substrate, OPERATIONS } from '../examples/api.cleaning/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://api.cleaning'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = apiCleaning()
const fetchApp = (path: string, init?: RequestInit) => app.fetch(new Request(`${ORIGIN}${path}`, init))

async function loadAutonomousQa(): Promise<{ assertConforms: (t: unknown, s: unknown, o?: unknown) => Promise<void> }> {
  const candidates = [
    process.env.AUTONOMOUS_QA_DIR,
    join(here, '..', 'node_modules', 'autonomous-qa'),
    join(homedir(), 'projects', 'api.qa'),
  ].filter((x): x is string => !!x)
  for (const dir of candidates) {
    const entry = join(dir, 'dist', 'src', 'vitest.js')
    if (existsSync(entry)) return import(pathToFileURL(entry).href)
  }
  throw new Error(
    `autonomous-qa not found (tried: ${candidates.join(', ')}). ` +
      'The conformance gate is fail-closed: install autonomous-qa or set AUTONOMOUS_QA_DIR to the api.qa checkout.',
  )
}

describe('AXP conformance (fail-closed, digest-pinned)', () => {
  it(`conforms to apis-ax-axp@2.6.0 at digest ${PINNED_DIGEST.slice(0, 12)}…`, async () => {
    const { assertConforms } = await loadAutonomousQa()
    const spec = readFileSync(join(here, '..', 'examples', 'api.cleaning', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
    await assertConforms(app, { spec, expectedDigest: PINNED_DIGEST }, { baseOrigin: ORIGIN })
  }, 60_000)
})

describe('the quartet', () => {
  it('serves the capability card with probe manifest, conformance + verify links, and G2 coordinates', async () => {
    const res = await fetchApp('/.well-known/agents.json')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.interfaces.http.length).toBeGreaterThan(4)
    expect(body.interfaces.mcp.url).toBe(`${ORIGIN}/mcp`)
    expect(body.links.conformance).toBe('https://api.qa/api.cleaning')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('janitorial company')
    expect(body.g2.systems[0]).toEqual({ system: 'FSM', coordinates: ['building-services'] })
    expect(body.probes.keyless.url).toBe('/work-orders')
    expect(body.probes.overCeiling).toBeDefined() // metered
  })

  it('serves the rate card at /pricing: metered, hardCeiling, binding axis, TOP-LEVEL rates[] (axp-ext-rates-g2 §2)', async () => {
    const res = await fetchApp('/pricing')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.model).toBe('metered')
    expect(body.hardCeiling).toBeGreaterThan(0)
    expect(body.binding).toBe(false)
    expect(typeof body.statement).toBe('string')
    // rates[] at the RULED placement — top-level in the Pricing Document,
    // emitted by the generator from pricing.rates (no site-side patching)
    expect(body.rates.length).toBe(RATES.length)
    expect(body.rates.map((r: { operation: string }) => r.operation)).toEqual(RATES.map((r) => r.operation))
    const offerRes = await fetchApp('/offer')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota, when present, strictly > 0', async () => {
    const res = await fetchApp('/openapi.json')
    const doc = await res.json()
    const opIds = new Set<string>()
    for (const methods of Object.values(doc.paths as Record<string, Record<string, { operationId?: string }>>)) {
      for (const op of Object.values(methods)) if (op.operationId) opIds.add(op.operationId)
    }
    for (const rate of RATES) {
      expect(opIds, `rate row '${rate.operation}' must price a declared operationId`).toContain(rate.operation)
      expect(rate.price, `rate row '${rate.operation}' must carry a finite price >= 0`).toBeGreaterThanOrEqual(0)
      const fq = (rate as { freeQuota?: unknown }).freeQuota
      if (fq !== undefined) {
        expect(typeof fq).toBe('number')
        expect(fq as number).toBeGreaterThan(0)
      }
      // the camelCase verb form — the ONE cross-face operation name
      expect(rate.operation).toMatch(/^[a-z][A-Za-z0-9]*$/)
    }
    // every substrate operation is declared in the contract
    for (const o of OPERATIONS) expect(opIds).toContain(o.operation)
  })

  it('serves llms.txt with H1 and the family cross-link tail', async () => {
    const res = await fetchApp('/llms.txt')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/^# api\.cleaning/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/work-orders')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.workOrders.length).toBe(22) // 5 schedules × 2 periods × 2 occurrences + 2 ad hoc
    for (const w of body.workOrders) expect(w.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const narrower = await fetchApp('/work-orders?status=completed')
    expect(narrower.status).toBe(200)
    const narrowerBody = await narrower.json()
    expect(narrowerBody.type).toBe('OK')
    expect(narrowerBody.workOrders.length).toBeLessThan(WORK_ORDERS.length)

    const emptyRes = await fetchApp('/work-orders?status=none')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const blockedRes = await fetchApp('/work-orders?scope=tenant-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/work-orders?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('seed exercises every noun: completed orders carry visits; schedules are recurring; vendors carry onboarding-packet state', async () => {
    const completed = WORK_ORDERS.filter((w) => w.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    for (const w of completed) {
      expect(SERVICE_VISITS.some((v) => v.workOrderId === w.id), `completed ${w.id} must have a visit`).toBe(true)
    }
    for (const s of SCHEDULES) expect(s.cadence.length).toBeGreaterThan(0)
    for (const v of VENDORS) expect(typeof v.onboarding.w9OnFile).toBe('boolean')
    for (const path of ['/service-visits', '/schedules', '/vendors', '/facilities', '/icp.json', '/verify', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('fixture law: example labels everywhere, synthetic 00-prefix EINs, no real-looking identifiers', () => {
    for (const v of VENDORS) {
      expect(v.example).toBe(true)
      expect(v.ein.startsWith('00-')).toBe(true)
      expect(v.name).toContain('(demo)')
    }
    for (const f of FACILITIES) {
      expect(f.example).toBe(true)
      expect(f.name).toContain('(demo)')
    }
    for (const w of WORK_ORDERS) expect(w.example).toBe(true)
    for (const s of SCHEDULES) expect(s.example).toBe(true)
    for (const v of SERVICE_VISITS) expect(v.example).toBe(true)
  })
})

describe('the 402 boundary (payable stub — never fake billing; the B2A ladder)', () => {
  it('dispatchWorkOrder answers a typed 402 OFFER labeled as a stub, with the per-dispatch rate and the full ladder in alternatives', async () => {
    const id = WORK_ORDERS[0]!.id
    const res = await fetchApp(`/work-orders/${id}/dispatch`, { method: 'POST' })
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toContain('LABELED STUB')
    expect(body.rate.operation).toBe('dispatchWorkOrder')
    // spec §5.1: one 402 advertises the whole B2A ladder — pay / work / claim
    const altIds = body.alternatives.map((a: { id: string }) => a.id)
    expect(altIds).toContain('anon-sandbox')
    expect(altIds).toContain('earned-credits')
    expect(altIds).toContain('human-claimed')
  })

  it('the checkout seam is a labeled stub that cannot take payment', async () => {
    const res = await fetchApp('/checkout')
    const body = await res.json()
    expect(body.checkout[0].status).toBe('stub')
    expect(body.checkout[0].note).toContain('no charge can occur')
  })

  it('B2A onboarding: no OAuth/CC door exists (never OAuth on a B2A projection)', async () => {
    const login = await fetchApp('/login')
    expect(login.status).toBe(404)
    const urls = (card as { interfaces: { http: { url: string }[] } }).interfaces.http.map((h) => new URL(h.url).pathname)
    expect(urls).not.toContain('/login')
    expect(urls).not.toContain('/callback')
  })
})

describe('two plies, one definition', () => {
  it('MCP door serves the same operations as HTTP (authless at the sandbox rung only)', async () => {
    const res = await fetchApp('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const toolNames = body.result.tools.map((t: { name: string }) => t.name)
    for (const o of OPERATIONS) expect(toolNames).toContain(o.operation)
    // the card's declared MCP tools are exactly the substrate operations
    expect(new Set((card as { interfaces: { mcp: { tools: string[] } } }).interfaces.mcp.tools)).toEqual(new Set(toolNames))
  })

  it('sandbox writes land in the ephemeral workspace and disclose retention', async () => {
    const post = await fetchApp('/work-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ facilityId: 'f-commerce-center', vendorId: 'v-brightline', service: 'janitorial', title: 'test capture' }),
    })
    expect(post.status).toBe(201)
    const body = await post.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    expect(body.workOrders[0].title).toContain('[sandbox workspace — ephemeral]')

    const bad = await fetchApp('/work-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ facilityId: 'nope' }),
    })
    expect(bad.status).toBe(400)

    const visit = await fetchApp('/work-orders/wo-cc-janitorial-2026-07-1/visits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ minutes: 120, crewRole: 'night-crew-lead' }),
    })
    expect(visit.status).toBe(201)

    const schedule = await fetchApp('/schedules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ facilityId: 'f-gatehouse-depot', vendorId: 'v-brightline', service: 'janitorial', cadence: 'weekly' }),
    })
    expect(schedule.status).toBe(201)
  })
})

describe('conneg matrix spot-check (§8)', () => {
  it('home: bare curl gets JSON, browser navigation gets HTML, agent UA gets markdown', async () => {
    const curl = await fetchApp('/', { headers: { 'user-agent': 'curl/8.0', accept: '*/*' } })
    expect(curl.headers.get('content-type')).toContain('application/json')

    const browser = await fetchApp('/', {
      headers: { accept: '*/*', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', 'user-agent': 'Mozilla/5.0' },
    })
    expect(browser.headers.get('content-type')).toContain('text/html')

    const agent = await fetchApp('/', { headers: { accept: '*/*', 'user-agent': 'ClaudeBot/1.0' } })
    expect(agent.headers.get('content-type')).toContain('text/markdown')
  })

  it('pricing face addresses force; alternates advertised; HEAD mirrors GET; never 406', async () => {
    const md = await fetchApp('/pricing.md')
    expect(md.headers.get('content-type')).toContain('text/markdown')
    expect(md.headers.get('link')).toContain('rel="alternate"')
    const head = await fetchApp('/pricing', { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
    const weird = await fetchApp('/pricing', { headers: { accept: 'application/vnd.exotic' } })
    expect(weird.status).not.toBe(406)
  })
})

describe('no ghost surfaces (presence-when-true)', () => {
  it('every concrete GET the card declares answers 200', async () => {
    const urls = (card as { interfaces: { http: { method: string; url: string }[] } }).interfaces.http
    for (const { method, url } of urls) {
      if (method !== 'GET') continue
      const res = await fetchApp(new URL(url).pathname)
      expect([200, 402], `${url} must answer (200, or 402 at the declared offer boundary)`).toContain(res.status)
    }
  })

  it('interfaces.testSuite is not declared (no suite document is published at a pinned digest yet)', () => {
    expect((card as { interfaces: Record<string, unknown> }).interfaces.testSuite).toBeUndefined()
  })

  it('G3 substrate invariants: every noun has schema + binding + verbs; a system coordinate is declared; the record-type collision is recorded row-scoped', () => {
    for (const n of substrate.nouns) {
      expect(n.schema).toMatch(/^https:\/\//)
      expect(['ingested', 'generated', 'native', 'federated']).toContain(n.binding)
      expect(n.verbs.length).toBeGreaterThan(0)
    }
    expect(substrate.systems.length).toBeGreaterThan(0)
    expect(substrate.meters.length).toBe(OPERATIONS.length)
    // primacy law: no primacy ruling exists → WorkOrder/ServiceVisit are
    // row-scoped under facilities-services, claiming nothing shared
    const workOrder = substrate.nouns.find((n) => n.noun === 'WorkOrder')!
    expect(workOrder.schema).toContain('/facilities-services/')
    expect(workOrder.bindingNote).toContain('Collision recorded')
    const visit = substrate.nouns.find((n) => n.noun === 'ServiceVisit')!
    expect(visit.schema).toContain('/facilities-services/')
  })

  it('pricing doc and manifest agree (one source of truth)', () => {
    expect(pricingDoc.model).toBe('metered')
    expect((manifest as { pricing: { hardCeiling: number } }).pricing.hardCeiling).toBe(pricingDoc.hardCeiling)
    expect((openapiDoc as { openapi: string }).openapi).toBe('3.1.0')
  })
})
