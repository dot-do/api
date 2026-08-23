/**
 * api.repair — the wave-zero self-verify suite (spec §9.1) plus the
 * fail-closed, digest-pinned AXP conformance gate.
 *
 * The conformance gate runs api.qa's requirement implementations IN MEMORY
 * against the worker app — the same digest-locked implementations the hosted
 * verifier at https://api.qa runs, so this gate green and the hosted verdict
 * cannot diverge by construction. DISCLOSED (batch watch list, §9.1 box 4):
 * `describeConformance` is absent from vendored axp-faces 0.3.0, so the
 * probe ladder is exercised in-process by this suite (keyless OK, knownEmpty,
 * knownForbidden, pricing, over-ceiling 402 / half-ceiling 200 / zero 200)
 * via the pinned gate rather than a generator-local probe walk.
 *
 * `autonomous-qa` is resolved from (in order): $AUTONOMOUS_QA_DIR, the repo's
 * node_modules, the sibling estate checkout ~/projects/api.qa. Missing every
 * candidate FAILS the suite (fail-closed) — a conformance gate that skips is
 * not a gate.
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiRepair } from '../examples/api.repair/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../examples/api.repair/src/axp'
import { RATES } from '../examples/api.repair/src/manifest'
import { ESTIMATES, INSPECTION_REPORTS, OPERATORS, WORK_ORDERS } from '../examples/api.repair/src/seed'
import { substrate, OPERATIONS } from '../examples/api.repair/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://api.repair'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = apiRepair()
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
    const spec = readFileSync(join(here, '..', 'examples', 'api.repair', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
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
    expect(body.links.conformance).toBe('https://api.qa/api.repair')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('electronics repair shop')
    expect(body.g2.systems[0]).toEqual({ system: 'FSM', coordinates: ['repair-field-services'] })
    expect(body.g2.motion).toBe('B2A')
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

  it('rate-card law (axp-ext-rates-g2 §1/§2, survey floor): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota strictly > 0', async () => {
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
    expect(text).toMatch(/^# api\.repair/m)
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
    expect(body.workOrders.length).toBe(18) // 3 operators × 6 lifecycle jobs
    for (const w of body.workOrders) expect(w.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
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

  it('seed exercises every noun: estimates internally consistent, inspections behind every estimate-backed job, every collection answers keyless', async () => {
    for (const e of ESTIMATES) {
      const lineSum = e.lines.reduce((s, l) => s + l.totalUsd, 0)
      expect(Math.round(lineSum * 100), `estimate ${e.id} lines must sum to its total`).toBe(Math.round(e.totalUsd * 100))
      for (const l of e.lines) expect(Math.round(l.qty * l.unitUsd * 100), `line math on ${e.id}`).toBe(Math.round(l.totalUsd * 100))
    }
    // every non-open work order carries an estimate and an inspection report
    for (const w of WORK_ORDERS) {
      if (w.status !== 'open') {
        expect(ESTIMATES.some((e) => e.id === w.estimateId), `work order ${w.id} must link an estimate`).toBe(true)
        expect(INSPECTION_REPORTS.some((r) => r.id === w.inspectionReportId), `work order ${w.id} must link an inspection report`).toBe(true)
      }
      if (w.status === 'completed') {
        const e = ESTIMATES.find((x) => x.id === w.estimateId)!
        expect(w.actualTotalUsd, `completed work order ${w.id} actuals reconcile to the approved estimate`).toBe(e.totalUsd)
      }
    }
    for (const path of ['/estimates', '/inspection-reports', '/icp.json', '/verify']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('fixture law: example labels everywhere, 952-prefix demo asset tags, fictional (demo) operators, no real names', () => {
    for (const o of OPERATORS) {
      expect(o.example).toBe(true)
      expect(o.name).toContain('(demo)')
    }
    for (const w of WORK_ORDERS) {
      expect(w.example).toBe(true)
      expect(String(w.assetTag).startsWith('952-')).toBe(true)
    }
    for (const e of ESTIMATES) expect(e.example).toBe(true)
    for (const r of INSPECTION_REPORTS) {
      expect(r.example).toBe(true)
      expect(r.assetTag.startsWith('952-')).toBe(true)
    }
  })
})

describe('the 402 boundary — B2A motion law (never OAuth/CC gates)', () => {
  it('the OFFER advertises the whole B2A ladder in one place: pay / work / claim alternatives, all labeled stubs', async () => {
    const res = await fetchApp('/offer')
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    const offer = body.offers?.[0] ?? body
    const altIds = (offer.alternatives ?? []).map((a: { id: string }) => a.id)
    expect(altIds).toContain('anon-sandbox')
    expect(altIds).toContain('pay-402')
    expect(altIds).toContain('work-earned-credits')
    expect(altIds).toContain('claim-workspace')
  })

  it('serves NO OAuth, NO login, NO checkout door on this B2A face (motion law, spec §9.1)', async () => {
    for (const path of ['/login', '/callback', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must not exist on a B2A face`).toBe(404)
    }
    // and the card declares none of them
    const urls = (card as { interfaces: { http: { url: string }[] } }).interfaces.http.map((u) => new URL(u.url).pathname)
    for (const path of ['/login', '/callback', '/checkout']) expect(urls).not.toContain(path)
  })
})

describe('two plies, one definition', () => {
  it('MCP door serves the same operations as HTTP', async () => {
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

  it('the FSM system-of-record doors work the same collections: create → complete a work order in the ephemeral workspace', async () => {
    const post = await fetchApp('/work-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operatorId: 'op-juniper', unit: 'chest freezer', complaint: 'not holding temp' }),
    })
    expect(post.status).toBe(201)
    const created = await post.json()
    expect(created.type).toBe('OK')
    expect(created.retention).toContain('ephemeral')
    const id = created.workOrders[0].id

    const complete = await fetchApp(`/work-orders/${id}/complete`, { method: 'POST' })
    expect(complete.status).toBe(200)
    const completed = await complete.json()
    expect(completed.workOrders[0].status).toBe('completed')

    const bad = await fetchApp('/work-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operatorId: 'op-nowhere', unit: 'x', complaint: 'y' }),
    })
    expect(bad.status).toBe(400)
    expect((await bad.json()).type).toBe('BLOCKED')
  })

  it('approveEstimate is a real lifecycle verb on the same collection', async () => {
    const list = await fetchApp('/estimates')
    const est = (await list.json()).estimates[0]
    const res = await fetchApp(`/estimates/${est.id}/approve`, { method: 'POST' })
    expect(res.status).toBe(200)
    expect((await res.json()).estimates[0].status).toBe('approved')
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

  it('G3 substrate invariants: every noun has schema + binding + verbs; a system coordinate is declared; collisions recorded', () => {
    for (const n of substrate.nouns) {
      expect(n.schema).toMatch(/^https:\/\//)
      expect(['ingested', 'generated', 'native', 'federated']).toContain(n.binding)
      expect(n.verbs.length).toBeGreaterThan(0)
    }
    expect(substrate.systems.length).toBeGreaterThan(0)
    expect(substrate.meters.length).toBe(OPERATIONS.length)
    // the WorkOrder collision is recorded on its binding note (batch primacy rule)
    const wo = substrate.nouns.find((n) => n.noun === 'WorkOrder')!
    expect(wo.bindingNote).toContain('COLLISION RECORDED')
  })

  it('pricing doc and manifest agree (one source of truth)', () => {
    expect(pricingDoc.model).toBe('metered')
    expect((manifest as { pricing: { hardCeiling: number } }).pricing.hardCeiling).toBe(pricingDoc.hardCeiling)
    expect((openapiDoc as { openapi: string }).openapi).toBe('3.1.0')
  })
})
