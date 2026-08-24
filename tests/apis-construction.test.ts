/**
 * apis.construction — the wave-zero self-verify suite (spec §9.1) plus the
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
import { apisConstruction } from '../examples/apis.construction/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../examples/apis.construction/src/axp'
import { RATES } from '../examples/apis.construction/src/manifest'
import { CONTRACTOR, SUBCONTRACTORS, PROJECTS, PERMITS, PAY_APPLICATIONS, LIEN_WAIVERS, DRAW_PACKAGES } from '../examples/apis.construction/src/seed'
import { substrate, OPERATIONS } from '../examples/apis.construction/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://apis.construction'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = apisConstruction()
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
    const spec = readFileSync(join(here, '..', 'examples', 'apis.construction', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
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
    expect(body.links.conformance).toBe('https://api.qa/apis.construction')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('general contractor')
    expect(body.g2.systems[0]).toEqual({ system: 'ProjectManagement', coordinates: ['construction-pm'] })
    expect(body.probes.keyless.url).toBe('/draw-packages')
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
    expect(text).toMatch(/^# apis\.construction/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/draw-packages')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.drawPackages.length).toBe(6) // 3 projects × 2 draw cycles
    for (const d of body.drawPackages) expect(d.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const emptyRes = await fetchApp('/draw-packages?status=none')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const narrower = await fetchApp('/draw-packages?status=verified')
    expect((await narrower.json()).drawPackages.length).toBe(3) // June cycle verified

    const blockedRes = await fetchApp('/draw-packages?scope=tenant-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/draw-packages?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('seed is internally consistent: pay-app arithmetic identity holds; draw-package references resolve', async () => {
    for (const a of PAY_APPLICATIONS) {
      expect(a.completedToDate - a.retainageHeld - a.previousPayments, `pay app ${a.id} arithmetic identity`).toBe(a.currentPaymentDue)
      const linesSum = a.lines.reduce((s, l) => s + l.thisPeriod, 0)
      expect(Math.round(linesSum * 100) / 100, `pay app ${a.id} lines sum to the period amount`).toBe(
        Math.round((a.completedToDate - (a.applicationNumber === 1 ? 0 : a.completedToDate / 2.2)) * 100) / 100,
      )
      expect(a.completedToDate).toBeLessThanOrEqual(a.contractSum)
    }
    for (const d of DRAW_PACKAGES) {
      expect(PAY_APPLICATIONS.some((a) => a.id === d.payApplicationId), `draw ${d.id} pay application resolves`).toBe(true)
      for (const wId of d.lienWaiverIds) expect(LIEN_WAIVERS.some((w) => w.id === wId), `draw ${d.id} waiver ${wId} resolves`).toBe(true)
      for (const pId of d.permitIds) expect(PERMITS.some((p) => p.id === pId), `draw ${d.id} permit ${pId} resolves`).toBe(true)
      expect(PROJECTS.some((p) => p.id === d.projectId)).toBe(true)
    }
    for (const path of ['/pay-applications', '/lien-waivers', '/permits', '/projects', '/icp.json', '/verify', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('waiver types genuinely branch (the shared-face record is served under this row key only)', async () => {
    const cond = await fetchApp('/lien-waivers?waiverType=conditional-progress')
    expect((await cond.json()).lienWaivers.length).toBe(9) // July cycle pending
    const uncond = await fetchApp('/lien-waivers?waiverType=unconditional-progress')
    expect((await uncond.json()).lienWaivers.length).toBe(9) // June cycle paid
    const final = await fetchApp('/lien-waivers?waiverType=unconditional-final')
    expect((await final.json()).type).toBe('EMPTY') // honest: no final waiver in an in-flight cycle
  })

  it('fixture law: example labels everywhere, synthetic 00-prefix EINs and DEMO- permit numbers, no real-looking identifiers', () => {
    expect(CONTRACTOR.ein.startsWith('00-')).toBe(true)
    expect(CONTRACTOR.name).toContain('(demo)')
    for (const s of SUBCONTRACTORS) {
      expect(s.ein.startsWith('00-')).toBe(true)
      expect(s.name).toContain('(demo)')
    }
    for (const p of PROJECTS) {
      expect(p.example).toBe(true)
      expect(p.name).toContain('(demo)')
      expect(p.ownerName).toContain('(demo')
    }
    for (const pm of PERMITS) {
      expect(pm.example).toBe(true)
      expect(pm.permitNumber.startsWith('DEMO-')).toBe(true)
      expect(pm.jurisdiction).toContain('(demo jurisdiction)')
    }
    for (const a of PAY_APPLICATIONS) expect(a.example).toBe(true)
    for (const w of LIEN_WAIVERS) expect(w.example).toBe(true)
    for (const d of DRAW_PACKAGES) expect(d.example).toBe(true)
  })
})

describe('the 402 boundary (payable stub — never fake billing)', () => {
  it('orderDrawPackage answers a typed 402 OFFER labeled as a stub, with the per-outcome rate and alternatives', async () => {
    const id = DRAW_PACKAGES[0]!.id
    const res = await fetchApp(`/draw-packages/${id}/order`, { method: 'POST' })
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toContain('cannot take payment')
    expect(body.rate.operation).toBe('orderDrawPackage')
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

  it('sandbox writes land in the ephemeral workspace and disclose retention; the arithmetic identity is enforced at the door', async () => {
    const post = await fetchApp('/projects/p-harborview/pay-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        period: '2026-08',
        lines: [
          { description: 'Concrete & structure', scheduledValue: 240000, thisPeriod: 20000 },
          { description: 'Finishes', scheduledValue: 144000, thisPeriod: 12000 },
        ],
      }),
    })
    expect(post.status).toBe(201)
    const body = await post.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    const a = body.payApplications[0]
    expect(a.completedToDate - a.retainageHeld - a.previousPayments).toBe(a.currentPaymentDue)

    const overContract = await fetchApp('/projects/p-harborview/pay-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ period: '2026-08', lines: [{ description: 'x', scheduledValue: 1, thisPeriod: 9_999_999 }] }),
    })
    expect(overContract.status).toBe(400)

    const missingPeriod = await fetchApp('/projects/p-harborview/pay-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ description: 'x', scheduledValue: 1, thisPeriod: 1 }] }),
    })
    expect(missingPeriod.status).toBe(400)
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
