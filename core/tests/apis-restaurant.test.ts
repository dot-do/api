/**
 * apis.restaurant — the wave-zero self-verify suite (spec §9.1) plus the
 * fail-closed, digest-pinned AXP conformance gate.
 *
 * The conformance gate runs api.qa's requirement implementations IN MEMORY
 * against the worker app — the same digest-locked implementations the hosted
 * verifier at https://api.qa runs, so this gate green and the hosted verdict
 * cannot diverge by construction. The spec text is the vendored byte-identical
 * copy of the ratified standard; the digest below is the ratification digest.
 * (Disclosed per §9.1 box 4: vendored axp-faces 0.3.0 exports no
 * describeConformance — the in-process gate below IS the probe ladder,
 * re-implemented via api.qa's assertConforms at the pinned digest.)
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
import { apisRestaurant } from '../../examples/apis.restaurant/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../../examples/apis.restaurant/src/axp'
import { RATES } from '../../examples/apis.restaurant/src/manifest'
import {
  gtin13,
  OPERATOR,
  SUPPLIERS,
  ITEMS,
  LOCATIONS,
  PAR_LEVELS,
  MENUS,
  ORDERS,
  SUPPLIER_INVOICES,
  INVENTORY_COUNTS,
  PERIODS,
} from '../../examples/apis.restaurant/src/seed'
import { substrate, OPERATIONS } from '../../examples/apis.restaurant/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://apis.restaurant'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = apisRestaurant()
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
    const spec = readFileSync(join(here, '..', '..', 'examples', 'apis.restaurant', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
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
    expect(body.links.conformance).toBe('https://api.qa/apis.restaurant')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('independent restaurant operator')
    expect(body.g2.systems[0]).toEqual({ system: 'Inventory', coordinates: ['restaurant-back-of-house'] })
    expect(body.probes.keyless.url).toBe('/inventory-counts')
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
        // §2: a zero (or "unlimited") quota is the row WITHOUT freeQuota —
        // a zero-price row is free without quota by construction
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
    expect(text).toMatch(/^# apis\.restaurant/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/inventory-counts')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.inventoryCounts.length).toBe(6) // 3 locations × 2 month-end count cycles
    for (const cnt of body.inventoryCounts) expect(cnt.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const emptyRes = await fetchApp('/inventory-counts?status=none')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const narrower = await fetchApp('/inventory-counts?status=reconciled')
    expect((await narrower.json()).inventoryCounts.length).toBe(3) // June cycle reconciled

    const byLocation = await fetchApp('/inventory-counts?location=l-sliceward')
    expect((await byLocation.json()).inventoryCounts.length).toBe(2) // the apis.pizza sub-vertical grain

    const blockedRes = await fetchApp('/inventory-counts?scope=tenant-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/inventory-counts?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('seed is internally consistent: food-cost arithmetic identity, cycle continuity, invoice/order rollups, references resolve', async () => {
    for (const cnt of INVENTORY_COUNTS) {
      // openingValue + purchasesValue − countedValue = usageCost
      expect(cnt.openingValue + cnt.purchasesValue - cnt.countedValue, `count ${cnt.id} arithmetic identity`).toBe(cnt.usageCost)
      // purchasesValue = Σ that period's supplier-invoice totals
      const invoiceSum = SUPPLIER_INVOICES.filter((si) => si.locationId === cnt.locationId && si.period === cnt.period).reduce((s, si) => s + si.total, 0)
      expect(cnt.purchasesValue, `count ${cnt.id} purchases roll up from invoices`).toBe(invoiceSum)
      // salesValue = Σ that period's order totals
      const orderSum = ORDERS.filter((o) => o.locationId === cnt.locationId && o.period === cnt.period).reduce((s, o) => s + o.total, 0)
      expect(cnt.salesValue, `count ${cnt.id} sales roll up from orders`).toBe(orderSum)
      // references resolve
      for (const siId of cnt.supplierInvoiceIds) expect(SUPPLIER_INVOICES.some((si) => si.id === siId), `count ${cnt.id} invoice ${siId} resolves`).toBe(true)
      for (const line of cnt.lines) expect(PAR_LEVELS.some((p) => p.id === line.parLevelId), `count ${cnt.id} par level ${line.parLevelId} resolves`).toBe(true)
      expect(LOCATIONS.some((l) => l.id === cnt.locationId)).toBe(true)
    }
    // cycle continuity: July opens on June's counted value, per location
    for (const l of LOCATIONS) {
      const june = INVENTORY_COUNTS.find((cnt) => cnt.locationId === l.id && cnt.period === PERIODS[0])!
      const july = INVENTORY_COUNTS.find((cnt) => cnt.locationId === l.id && cnt.period === PERIODS[1])!
      expect(july.openingValue, `location ${l.id} cycle continuity`).toBe(june.countedValue)
    }
    // invoice line totals sum to invoice totals; order line totals sum to order totals
    for (const si of SUPPLIER_INVOICES) {
      expect(si.lines.reduce((s, x) => s + x.lineTotal, 0), `invoice ${si.id} lines sum to total`).toBe(si.total)
      expect(si.lines.length).toBeGreaterThan(0)
    }
    for (const o of ORDERS) {
      expect(o.lines.reduce((s, x) => s + x.lineTotal, 0), `order ${o.id} lines sum to total`).toBe(o.total)
      const menu = MENUS.find((m) => m.locationId === o.locationId)!
      for (const line of o.lines) expect(menu.items.some((mi) => mi.id === line.menuItemId), `order ${o.id} menu item ${line.menuItemId} resolves`).toBe(true)
    }
    for (const path of ['/par-levels', '/supplier-invoices', '/orders', '/menus', '/locations', '/icp.json', '/verify', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('count statuses genuinely branch (June reconciled, July open — a two-cycle in-flight corpus, honestly)', async () => {
    const open = await fetchApp('/inventory-counts?status=open')
    expect((await open.json()).inventoryCounts.length).toBe(3) // July cycle open
    const reconciled = await fetchApp('/inventory-counts?status=reconciled')
    expect((await reconciled.json()).inventoryCounts.length).toBe(3) // June cycle reconciled
    const june = await fetchApp('/inventory-counts?period=2026-06')
    expect((await june.json()).inventoryCounts.length).toBe(3)
  })

  it('fixture law: example labels everywhere, synthetic 00-prefix EINs, GS1 demo-prefix (952) GTINs with valid check digits, no real-looking identifiers', () => {
    expect(OPERATOR.ein.startsWith('00-')).toBe(true)
    expect(OPERATOR.name).toContain('(demo)')
    for (const s of SUPPLIERS) {
      expect(s.ein.startsWith('00-')).toBe(true)
      expect(s.name).toContain('(demo)')
    }
    for (const item of ITEMS) {
      expect(item.gtin.startsWith('952'), `item ${item.key} carries the GS1 demo prefix`).toBe(true)
      expect(item.gtin.length).toBe(13)
      // the check digit is arithmetically VALID (recomputed, not asserted)
      expect(item.gtin).toBe(gtin13(item.gtin.slice(3, 12)))
      expect(item.name).toContain('(demo item)')
    }
    for (const l of LOCATIONS) {
      expect(l.example).toBe(true)
      expect(l.name).toContain('(demo)')
    }
    for (const p of PAR_LEVELS) expect(p.example).toBe(true)
    for (const m of MENUS) expect(m.example).toBe(true)
    for (const o of ORDERS) expect(o.example).toBe(true)
    for (const si of SUPPLIER_INVOICES) expect(si.example).toBe(true)
    for (const cnt of INVENTORY_COUNTS) expect(cnt.example).toBe(true)
  })
})

describe('the 402 boundary (payable stub — never fake billing)', () => {
  it('reconcileInventoryCount answers a typed 402 OFFER labeled as a stub, with the per-outcome rate and alternatives', async () => {
    const id = INVENTORY_COUNTS[0]!.id
    const res = await fetchApp(`/inventory-counts/${id}/reconcile`, { method: 'POST' })
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toContain('LABELED STUB')
    expect(body.rate.operation).toBe('reconcileInventoryCount')
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

  it('sandbox writes land in the ephemeral workspace and disclose retention; the availability identity is enforced at the door', async () => {
    const post = await fetchApp('/locations/l-peppercorn/inventory-counts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        period: '2026-08',
        lines: [
          { parLevelId: 'pl-peppercorn-flour', countedQty: 10 },
          { parLevelId: 'pl-peppercorn-oil', countedQty: 8 },
        ],
      }),
    })
    expect(post.status).toBe(201)
    const body = await post.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    const cnt = body.inventoryCounts[0]
    expect(cnt.openingValue + cnt.purchasesValue - cnt.countedValue).toBe(cnt.usageCost)
    expect(cnt.status).toBe('open')

    // a count cannot exceed what was available (opening + purchases)
    const overAvailable = await fetchApp('/locations/l-peppercorn/inventory-counts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ period: '2026-08', lines: [{ parLevelId: 'pl-peppercorn-flour', countedQty: 9_999_999 }] }),
    })
    expect(overAvailable.status).toBe(400)

    const missingPeriod = await fetchApp('/locations/l-peppercorn/inventory-counts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ parLevelId: 'pl-peppercorn-flour', countedQty: 1 }] }),
    })
    expect(missingPeriod.status).toBe(400)

    const unknownParLevel = await fetchApp('/locations/l-peppercorn/inventory-counts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ period: '2026-08', lines: [{ parLevelId: 'pl-sliceward-mozz', countedQty: 1 }] }),
    })
    expect(unknownParLevel.status).toBe(400) // another location's par level — not this door's grain
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
