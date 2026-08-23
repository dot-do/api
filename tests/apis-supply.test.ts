/**
 * apis.supply — the wave-zero self-verify suite (spec §9.1) plus the
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
import { apisSupply } from '../examples/apis.supply/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../examples/apis.supply/src/axp'
import { RATES } from '../examples/apis.supply/src/manifest'
import {
  CATALOG_ITEMS,
  INVOICES,
  PARTNERS,
  PURCHASE_ORDERS,
  SHIP_NOTICES,
  DISTRIBUTOR,
  gs1CheckDigit,
} from '../examples/apis.supply/src/seed'
import { substrate, OPERATIONS } from '../examples/apis.supply/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://apis.supply'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = apisSupply()
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
    const spec = readFileSync(join(here, '..', 'examples', 'apis.supply', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
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
    expect(body.links.conformance).toBe('https://api.qa/apis.supply')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('distributor/wholesaler (sell side)')
    expect(body.g2.systems[0]).toEqual({ system: 'OrderManagement', coordinates: ['wholesale-distribution', 'edi-pipeline'] })
    expect(body.probes.keyless.url).toBe('/purchase-orders')
    expect(body.probes.overCeiling).toBeDefined() // metered
  })

  it('serves the rate card at /pricing: metered, hardCeiling, binding axis, rates[]', async () => {
    const res = await fetchApp('/pricing')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.model).toBe('metered')
    expect(body.hardCeiling).toBeGreaterThan(0)
    expect(body.binding).toBe(false)
    expect(typeof body.statement).toBe('string')
    expect(body.rates.length).toBe(RATES.length)
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
      const named = rate.freeQuota !== undefined || rate.price === 0
      expect(named, `rate row '${rate.operation}' must name its free quota or price from zero`).toBe(true)
    }
    // every substrate operation is declared in the contract
    for (const o of OPERATIONS) expect(opIds).toContain(o.operation)
  })

  it('serves llms.txt with H1 and the family cross-link tail', async () => {
    const res = await fetchApp('/llms.txt')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/^# apis\.supply/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
    expect(text).toContain('https://transactions.dev/')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/purchase-orders')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.purchaseOrders.length).toBe(6) // six document flows spanning the whole lifecycle
    for (const po of body.purchaseOrders) expect(po.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const emptyRes = await fetchApp('/purchase-orders?status=none')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const narrowRes = await fetchApp('/purchase-orders?status=matched')
    expect((await narrowRes.json()).purchaseOrders.length).toBe(2)

    const blockedRes = await fetchApp('/purchase-orders?scope=tenant-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/purchase-orders?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('seed exercises every noun: ship notices, invoices, catalog, quotes, aux faces all answer keyless', async () => {
    for (const path of ['/ship-notices', '/invoices', '/catalog-items', '/icp.json', '/verify', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
    const quote = await fetchApp('/landed-cost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gtin: CATALOG_ITEMS[0]!.gtin, qty: 10, destinationCountry: 'CA' }),
    })
    expect(quote.status).toBe(201)
    const quoteBody = await quote.json()
    expect(quoteBody.type).toBe('OK')
    expect(quoteBody.quotes[0].example).toBe(true)
    expect(quoteBody.quotes[0].label).toContain('NOT real duty or freight rates')
  })

  it('document-flow consistency: shipped ≤ ordered; invoice totals equal shipped × unit price; the short-ship variance exists', async () => {
    let variances = 0
    for (const asn of SHIP_NOTICES) {
      const po = PURCHASE_ORDERS.find((p) => p.id === asn.poId)!
      for (const line of asn.lines) {
        const poLine = po.lines.find((l) => l.gtin === line.gtin)!
        expect(line.shippedQty, `ASN ${asn.id} must not over-ship ${line.gtin}`).toBeLessThanOrEqual(poLine.orderedQty)
        if (line.shippedQty < poLine.orderedQty) variances++
      }
    }
    expect(variances, 'exactly one deliberate short-ship variance').toBe(1)
    for (const inv of INVOICES) {
      const asn = SHIP_NOTICES.find((s) => s.id === inv.shipNoticeId)!
      let computed = 0
      for (const line of inv.lines) {
        const shipped = asn.lines.find((l) => l.gtin === line.gtin)!.shippedQty
        expect(line.qty, `invoice ${inv.id} must bill shipped quantities`).toBe(shipped)
        expect(line.amount).toBeCloseTo(line.qty * line.unitPrice, 2)
        computed += line.amount
      }
      expect(inv.total).toBeCloseTo(computed, 2)
    }
  })

  it('fixture law: example labels everywhere; GS1 demo prefix 952 with VALID check digits; no real-looking identifiers', () => {
    const validGs1 = (id: string) => /^952\d{10}$/.test(id) && gs1CheckDigit(id.slice(0, 12)) === id[12]
    expect(validGs1(DISTRIBUTOR.gln)).toBe(true)
    for (const p of PARTNERS) {
      expect(p.example).toBe(true)
      expect(p.name).toContain('(demo)')
      expect(validGs1(p.gln), `partner GLN ${p.gln} must be 952-prefixed with a valid check digit`).toBe(true)
    }
    for (const i of CATALOG_ITEMS) {
      expect(i.example).toBe(true)
      expect(validGs1(i.gtin), `GTIN ${i.gtin} must be 952-prefixed with a valid check digit`).toBe(true)
    }
    for (const po of PURCHASE_ORDERS) expect(po.example).toBe(true)
    for (const asn of SHIP_NOTICES) expect(asn.example).toBe(true)
    for (const inv of INVOICES) expect(inv.example).toBe(true)
  })
})

describe('the 402 boundary (payable stub — never fake billing)', () => {
  it('matchPurchaseOrder answers a typed 402 OFFER labeled as a stub, with the per-outcome rate and alternatives', async () => {
    const id = PURCHASE_ORDERS[0]!.id
    const res = await fetchApp(`/purchase-orders/${id}/match`, { method: 'POST' })
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toContain('LABELED STUB')
    expect(body.rate.operation).toBe('matchPurchaseOrder')
    expect(body.alternatives.length).toBeGreaterThan(0)
  })

  it('the checkout seam is a labeled stub that cannot take payment', async () => {
    const res = await fetchApp('/checkout')
    const body = await res.json()
    expect(body.checkout[0].status).toBe('stub')
    expect(body.checkout[0].note).toContain('no charge can occur')
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

  it('sandbox writes land in the ephemeral workspace and disclose retention', async () => {
    const post = await fetchApp('/purchase-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        partnerId: 'p-cobblepine',
        lines: [{ gtin: CATALOG_ITEMS[0]!.gtin, qty: 3 }],
      }),
    })
    expect(post.status).toBe(201)
    const body = await post.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    const submitted = body.purchaseOrders[0]
    expect(submitted.total).toBeCloseTo(3 * CATALOG_ITEMS[0]!.unitPrice, 2)

    // the workspace PO is addressable by id
    const got = await fetchApp(`/purchase-orders/${submitted.id}`)
    expect(got.status).toBe(200)
    expect((await got.json()).type).toBe('OK')

    // invalid submissions answer typed BLOCKED
    const bad = await fetchApp('/purchase-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ partnerId: 'p-cobblepine', lines: [{ gtin: 'not-a-gtin', qty: 1 }] }),
    })
    expect(bad.status).toBe(400)
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

  it('G3 substrate invariants: every noun has schema + binding + verbs; a system coordinate is declared', () => {
    for (const n of substrate.nouns) {
      expect(n.schema).toMatch(/^https:\/\//)
      expect(['ingested', 'generated', 'native', 'federated']).toContain(n.binding)
      expect(n.verbs.length).toBeGreaterThan(0)
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
