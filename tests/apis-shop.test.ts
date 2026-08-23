/**
 * apis.shop — the wave-zero self-verify suite (spec §9.1) plus the
 * fail-closed, digest-pinned AXP conformance gate.
 *
 * The conformance gate runs api.qa's requirement implementations IN MEMORY
 * against the worker app — the same digest-locked implementations the hosted
 * verifier at https://api.qa runs, so this gate green and the hosted verdict
 * cannot diverge by construction. The spec text is the vendored byte-identical
 * copy of the ratified standard; the digest below is the ratification digest.
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
import { apisShop } from '../examples/apis.shop/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../examples/apis.shop/src/axp'
import { RATES } from '../examples/apis.shop/src/manifest'
import { GS1_DEMO_PREFIX, OFFERS, ORDERS, PRODUCTS, gtin13, isValidGtin13 } from '../examples/apis.shop/src/seed'
import { substrate, OPERATIONS } from '../examples/apis.shop/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://apis.shop'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = apisShop()
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
    const spec = readFileSync(join(here, '..', 'examples', 'apis.shop', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
    await assertConforms(app, { spec, expectedDigest: PINNED_DIGEST }, { baseOrigin: ORIGIN })
  }, 60_000)
})

describe('the quartet (ruled extension placements — zero divergence)', () => {
  it('serves the capability card with probe manifest, conformance + verify links, and top-level g2', async () => {
    const res = await fetchApp('/.well-known/agents.json')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.interfaces.http.length).toBeGreaterThan(4)
    expect(body.interfaces.mcp.url).toBe(`${ORIGIN}/mcp`)
    expect(body.links.conformance).toBe('https://api.qa/apis.shop')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`) // ruled placement: card link member
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // ruled placement: g2 top-level on the card
    expect(body.g2.icp.companyTypes).toContain('online retailer')
    expect(body.g2.systems[0]).toEqual({ system: 'OMS', coordinates: ['online-retailers (NAICS 44-45 ex-441)'] })
    expect(body.probes.keyless.url).toBe('/products')
    expect(body.probes.overCeiling).toBeDefined() // metered
  })

  it('serves the rate card at /pricing: metered, hardCeiling, binding axis, rates[] top-level', async () => {
    const res = await fetchApp('/pricing')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.model).toBe('metered')
    expect(body.hardCeiling).toBeGreaterThan(0)
    expect(body.binding).toBe(false)
    expect(typeof body.statement).toBe('string')
    expect(body.rates.length).toBe(RATES.length) // ruled placement: rates[] top-level
    expect(body.offers.length).toBeGreaterThan(0)
  })

  it('rate-card law: every rates[].operation ⊆ OpenAPI operationIds; every row names freeQuota or prices from zero', async () => {
    const res = await fetchApp('/openapi.json')
    const doc = await res.json()
    const opIds = new Set<string>()
    for (const methods of Object.values(doc.paths as Record<string, Record<string, { operationId?: string }>>)) {
      for (const op of Object.values(methods)) if (op.operationId) opIds.add(op.operationId)
    }
    for (const rate of RATES) {
      expect(opIds, `rate row '${rate.operation}' must price a declared operationId`).toContain(rate.operation)
      const named = (rate as { freeQuota?: unknown }).freeQuota !== undefined || rate.price === 0
      expect(named, `rate row '${rate.operation}' must name its free quota or price from zero`).toBe(true)
    }
    // every substrate operation is declared in the contract
    for (const o of OPERATIONS) expect(opIds).toContain(o.operation)
    // ruled placement: operationId on EVERY declared route
    for (const [path, methods] of Object.entries(doc.paths as Record<string, Record<string, { operationId?: string }>>)) {
      for (const [method, op] of Object.entries(methods)) {
        expect(op.operationId, `${method.toUpperCase()} ${path} must carry an operationId`).toBeDefined()
      }
    }
  })

  it('serves llms.txt with H1 and the family cross-link tail', async () => {
    const res = await fetchApp('/llms.txt')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/^# apis\.shop/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/products')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.products.length).toBe(PRODUCTS.length)
    for (const p of body.products) expect(p.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const emptyRes = await fetchApp('/products?category=nonexistent')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const blockedRes = await fetchApp('/products?scope=merchant-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/products?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('the 402 OFFER advertises ONLY mounted ladder rungs (batch ruling)', async () => {
    const offerRes = await fetchApp('/products?spend=1000')
    const body = await offerRes.json()
    const alternativeIds: string[] = (body.offers ?? body.alternatives ?? [])
      .flatMap((o: { alternatives?: { id: string }[] }) => (o.alternatives ?? []).map((a) => a.id))
    const fromManifest = (manifest as { pricing: { offers: { alternatives?: { id: string }[] }[] } }).pricing.offers
      .flatMap((o) => (o.alternatives ?? []).map((a) => a.id))
    for (const id of [...alternativeIds, ...fromManifest]) {
      expect(['anon-sandbox'], `rung '${id}' is advertised but not mounted`).toContain(id)
    }
    expect(fromManifest).toContain('anon-sandbox')
  })

  it('seed exercises every collection: products, offers, orders, identity, icp, verify answer keyless', async () => {
    for (const path of ['/offers', '/orders', `/digital-links/${PRODUCTS[0]!.gtin}`, '/icp.json', '/verify']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('GS1 fixture law: every seed GTIN sits in the demo-952 space with a valid check digit; example labels everywhere; no unlabeled merchant names', () => {
    for (const p of PRODUCTS) {
      expect(p.gtin.startsWith(GS1_DEMO_PREFIX), `${p.gtin} must use the GS1 demo prefix`).toBe(true)
      expect(isValidGtin13(p.gtin), `${p.gtin} must carry a valid check digit`).toBe(true)
      expect(p.example).toBe(true)
      expect(p.merchant).toContain('(demo)')
      expect(p.brand).toContain('(demo)')
    }
    for (const o of OFFERS) {
      expect(o.example).toBe(true)
      expect(o.seller).toContain('(demo)')
    }
    for (const o of ORDERS) expect(o.example).toBe(true)
    // the check-digit function itself is sound: flipping any digit breaks validation
    const g = gtin13('952000100001')
    expect(isValidGtin13(g)).toBe(true)
    const flipped = g.slice(0, 12) + String((Number(g[12]) + 1) % 10)
    expect(isValidGtin13(flipped)).toBe(false)
  })

  it('order seed has honest lifecycle depth (including a returned order) and consistent totals', () => {
    const statuses = new Set(ORDERS.map((o) => o.status))
    for (const s of ['pending', 'shipped', 'delivered', 'returned']) expect(statuses).toContain(s)
    for (const o of ORDERS) {
      const sum = Math.round(o.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100
      expect(o.total, `order ${o.id} total must equal the sum of its lines`).toBe(sum)
    }
  })
})

describe('the identity spine (GS1 Digital Link + 4-lens crosswalk)', () => {
  it('resolves a GTIN to the canonical id.gs1.org Digital Link and the GPC/UNSPSC/HTS crosswalk', async () => {
    const gtin = PRODUCTS[0]!.gtin
    const res = await fetchApp(`/digital-links/${gtin}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    const identity = body.identities[0]
    expect(identity.digitalLink).toBe(`https://id.gs1.org/01/0${gtin}`)
    expect(identity.gtin14).toBe(`0${gtin}`)
    expect(identity.binding).toBe('generated')
    expect(identity.crosswalk.gpcBrick).toBeDefined()
    expect(identity.crosswalk.unspsc).toBeDefined()
    expect(identity.crosswalk.hts).toBeDefined()
    expect(identity.example).toBe(true)
  })

  it('an unknown GTIN answers a truthful EMPTY, not an error', async () => {
    const res = await fetchApp('/digital-links/9529999999999')
    expect(res.status).toBe(200)
    expect((await res.json()).type).toBe('EMPTY')
  })
})

describe('the agents-as-buyers door (order capture — sandbox, no payment)', () => {
  it('places an order against served InStock offers, prices it from the cheapest offer, and discloses retention', async () => {
    const gtin = PRODUCTS[0]!.gtin
    const res = await fetchApp('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ gtin, quantity: 2 }] }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    const order = body.orders[0]
    expect(order.status).toBe('pending')
    expect(order.example).toBe(true)
    const cheapest = OFFERS.filter((o) => o.gtin === gtin && o.availability === 'InStock').sort((a, b) => a.price - b.price)[0]!
    expect(order.lines[0].unitPrice).toBe(cheapest.price)
    expect(order.total).toBe(Math.round(cheapest.price * 2 * 100) / 100)
  })

  it('refuses an order for an OutOfStock-only or unknown GTIN with a typed BLOCKED', async () => {
    const outOfStockOnly = OFFERS.find((o) => o.availability === 'OutOfStock')!
    const hasInStock = OFFERS.some((o) => o.gtin === outOfStockOnly.gtin && o.availability === 'InStock')
    expect(hasInStock).toBe(false)
    const res = await fetchApp('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ gtin: outOfStockOnly.gtin, quantity: 1 }] }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).type).toBe('BLOCKED')

    const unknown = await fetchApp('/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ gtin: '0000000000000', quantity: 1 }] }),
    })
    expect(unknown.status).toBe(400)
  })

  it('catalog door enforces GTIN fixture law on sandbox writes: invalid check digit and non-952 GTINs are refused; omitted GTINs are minted from the 952 space', async () => {
    const bad = await fetchApp('/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Widget', gtin: '9520001999999' }),
    })
    expect(bad.status).toBe(400)

    const real = await fetchApp('/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Widget', gtin: gtin13('036000100001') }),
    })
    expect(real.status).toBe(400) // valid check digit but outside the demo space

    const minted = await fetchApp('/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sandbox Widget' }),
    })
    expect(minted.status).toBe(201)
    const body = await minted.json()
    expect(body.products[0].gtin.startsWith(GS1_DEMO_PREFIX)).toBe(true)
    expect(isValidGtin13(body.products[0].gtin)).toBe(true)
    expect(body.products[0].example).toBe(true)
  })
})

describe('B2A motion law (no OAuth, no credit card on this face)', () => {
  it('serves neither /login nor /checkout nor /callback — the doors were never written', async () => {
    for (const path of ['/login', '/checkout', '/callback']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must not exist on a B2A face`).toBe(404)
    }
  })
})

describe('two plies, one definition', () => {
  it('MCP door serves the same operations as HTTP (authless — the anon-sandbox rung is all that is mounted)', async () => {
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
      if (url.includes('{')) continue // templated
      const res = await fetchApp(new URL(url).pathname)
      expect([200, 402], `${url} must answer (200, or 402 at the declared offer boundary)`).toContain(res.status)
    }
  })

  it('interfaces.testSuite is not declared (no suite document is published at a pinned digest yet)', () => {
    expect((card as { interfaces: Record<string, unknown> }).interfaces.testSuite).toBeUndefined()
  })

  it('G3 substrate invariants: every noun has schema + binding + verbs; system coordinates declared; one meter per operation', () => {
    for (const n of substrate.nouns) {
      expect(n.schema).toMatch(/^https:\/\//)
      expect(['ingested', 'generated', 'native', 'federated']).toContain(n.binding)
      expect(n.verbs.length).toBeGreaterThan(0)
      expect(n.bindingNote.length).toBeGreaterThan(0)
    }
    expect(substrate.systems.length).toBeGreaterThan(0)
    expect(substrate.meters.length).toBe(OPERATIONS.length)
  })

  it('pricing doc and manifest agree (one source of truth)', () => {
    expect(pricingDoc.model).toBe('metered')
    expect((manifest as { pricing: { hardCeiling: number } }).pricing.hardCeiling).toBe(pricingDoc.hardCeiling)
    expect((openapiDoc as { openapi: string }).openapi).toBe('3.1.0')
  })
})
