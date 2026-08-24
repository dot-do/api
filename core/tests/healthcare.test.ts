/**
 * healthcare — the wave-zero self-verify suite (spec §9.1) plus the
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
import { healthcare } from '../../examples/healthcare/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../../examples/healthcare/src/axp'
import { RATES } from '../../examples/healthcare/src/manifest'
import {
  CREDENTIALS,
  ELIGIBILITY_RECORDS,
  ENROLLMENTS,
  PAYERS,
  PRIOR_AUTH_ARTIFACTS,
  PROVIDERS,
  SUPERBILLS,
} from '../../examples/healthcare/src/seed'
import { substrate, OPERATIONS } from '../../examples/healthcare/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://healthcare.org.ai'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = healthcare()
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
    const spec = readFileSync(join(here, '..', '..', 'examples', 'healthcare', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
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
    expect(body.links.conformance).toBe('https://api.qa/healthcare.org.ai')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('hospital / health system')
    expect(body.g2.systems[0]).toEqual({ system: 'Credentialing', coordinates: ['healthcare-provider-organizations'] })
    expect(body.probes.keyless.url).toBe('/providers')
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

  it('rate-card law (axp-ext-rates-g2 §1/§2): every rates[].operation ⊆ declared operationIds; price >= 0; freeQuota only on priced rows, strictly > 0', async () => {
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
        // §2: a zero (or unlimited) quota is the row WITHOUT freeQuota —
        // a zero-price row is free without quota by construction
        expect(typeof fq).toBe('number')
        expect(fq as number).toBeGreaterThan(0)
        expect(rate.price, `freeQuota only belongs on a priced row ('${rate.operation}')`).toBeGreaterThan(0)
      }
      // the camelCase verb form — the ONE cross-face operation name
      expect(rate.operation).toMatch(/^[a-z][A-Za-z0-9]*$/)
    }
    // every substrate operation is declared in the contract
    for (const o of OPERATIONS) expect(opIds).toContain(o.operation)
  })

  it('serves llms.txt with H1, the family cross-link tail, and the [COUNSEL] boundary statement', async () => {
    const res = await fetchApp('/llms.txt')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/^# healthcare/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
    // the surviving [COUNSEL] flag, stated on the agent-facing surface
    expect(text).toContain('person-anchored public-registry records are NOT published as a data product')
    expect(text).toContain('Non-PHI admin artifacts only')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/providers')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.providers.length).toBe(PROVIDERS.length)
    expect(body.providers.length).toBeGreaterThanOrEqual(8)
    for (const p of body.providers) expect(p.example).toBe(true)
  })

  it('branches: filters → EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const emptyRes = await fetchApp('/providers?status=none')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const blockedRes = await fetchApp('/providers?scope=tenant-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/providers?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('seed exercises every noun: referential integrity, eligibility checks answer, every collection serves keyless', async () => {
    const providerIds = new Set(PROVIDERS.map((p) => p.id))
    const payerIds = new Set(PAYERS.map((p) => p.id))
    const credentialIds = new Set(CREDENTIALS.map((c) => c.id))
    for (const c of CREDENTIALS) expect(providerIds, `credential ${c.id} must attach to a seeded provider`).toContain(c.providerId)
    for (const e of ENROLLMENTS) {
      expect(providerIds, `enrollment ${e.id} provider`).toContain(e.providerId)
      expect(payerIds, `enrollment ${e.id} payer`).toContain(e.payerId)
      for (const cid of e.credentialIds) expect(credentialIds, `enrollment ${e.id} credential ${cid}`).toContain(cid)
    }
    for (const a of PRIOR_AUTH_ARTIFACTS) {
      expect(providerIds).toContain(a.providerId)
      expect(payerIds).toContain(a.payerId)
    }
    for (const el of ELIGIBILITY_RECORDS) {
      expect(providerIds).toContain(el.providerId)
      expect(payerIds).toContain(el.payerId)
    }
    // every seeded provider carries >= 1 credential (roster depth law)
    for (const p of PROVIDERS) {
      expect(
        CREDENTIALS.some((c) => c.providerId === p.id),
        `provider ${p.id} must carry at least one credential`,
      ).toBe(true)
    }

    const check = await fetchApp('/eligibility-records/check?providerId=prov-2&payerId=payer-bellhaven-mutual')
    expect(check.status).toBe(200)
    expect((await check.json()).type).toBe('OK')
    const badCheck = await fetchApp('/eligibility-records/check?providerId=prov-2&payerId=payer-unknown')
    expect(badCheck.status).toBe(400)
    expect((await badCheck.json()).type).toBe('BLOCKED')

    for (const path of ['/credentials', '/enrollments', '/prior-auth-artifacts', '/eligibility-records', '/superbills', '/icp.json', '/verify', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('fixture law + [COUNSEL] boundary: example labels everywhere, DEMO-namespace identifiers, role labels never person names, provenance stamped', () => {
    for (const p of PROVIDERS) {
      expect(p.example).toBe(true)
      expect(p.npi.startsWith('DEMO-')).toBe(true) // outside the real NPI namespace by construction
      expect(p.providerRole).toContain('role label') // never a person's name
      expect(p.provenance).toContain('synthetic derivative')
      expect(p.provenance).toContain('no real registry record')
      // the seed never reproduces NPPES person-anchored fields
      expect('first_name' in p).toBe(false)
      expect('last_name' in p).toBe(false)
      expect('authorized_official_first_name' in p).toBe(false)
    }
    for (const c of CREDENTIALS) {
      expect(c.example).toBe(true)
      expect(c.identifier.startsWith('DEMO-')).toBe(true)
    }
    for (const e of ENROLLMENTS) expect(e.example).toBe(true)
    for (const a of PRIOR_AUTH_ARTIFACTS) {
      expect(a.example).toBe(true)
      expect(a.serviceCode.startsWith('DEMO-')).toBe(true)
    }
    for (const el of ELIGIBILITY_RECORDS) {
      expect(el.example).toBe(true)
      expect(el.planCode.startsWith('DEMO-')).toBe(true)
      expect(el.subscriberRole).toContain('role label')
    }
    for (const s of SUPERBILLS) {
      expect(s.example).toBe(true)
      for (const l of s.lines) expect(l.procedureCode.startsWith('DEMO-')).toBe(true)
      // line items sum EXACTLY to the total (internal consistency)
      const sum = Math.round(s.lines.reduce((t, l) => t + l.units * l.charge, 0) * 100) / 100
      expect(s.total).toBe(sum)
    }
  })
})

describe('the 402 boundary (payable stub — never fake billing)', () => {
  it('submitEnrollment answers a typed 402 OFFER labeled as a stub, with the per-outcome rate and alternatives', async () => {
    const id = ENROLLMENTS.find((e) => e.status === 'ready')!.id
    const res = await fetchApp(`/enrollments/${id}/submit`, { method: 'POST' })
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toContain('LABELED STUB')
    expect(body.rate.operation).toBe('submitEnrollment')
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
  it('MCP door serves the same operations as HTTP (authless sandbox rung, mounted-rungs-only)', async () => {
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
    const post = await fetchApp('/enrollments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerId: 'prov-2', payerId: 'payer-harborstone' }),
    })
    expect(post.status).toBe(201)
    const body = await post.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    expect(body.enrollments[0].label).toContain('ephemeral')

    const badCred = await fetchApp('/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerId: 'prov-nope', kind: 'state-license' }),
    })
    expect(badCred.status).toBe(400)
    expect((await badCred.json()).type).toBe('BLOCKED')

    const goodCred = await fetchApp('/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerId: 'prov-2', kind: 'board-certification' }),
    })
    expect(goodCred.status).toBe(201)
    const credBody = await goodCred.json()
    expect(credBody.credentials[0].identifier.startsWith('DEMO-')).toBe(true)
    expect(credBody.credentials[0].label).toContain('ephemeral')
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
      const path = new URL(url).pathname
      // parameterized check door: probe with a valid provider × payer pair
      const probe = path === '/eligibility-records/check' ? '/eligibility-records/check?providerId=prov-2&payerId=payer-bellhaven-mutual' : path
      const res = await fetchApp(probe)
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
    // the [COUNSEL] boundary is carried on the Provider binding itself
    const provider = substrate.nouns.find((n) => n.noun === 'Provider')!
    expect(provider.binding).toBe('generated')
    expect(provider.bindingNote).toContain('[COUNSEL]')
  })

  it('pricing doc and manifest agree (one source of truth)', () => {
    expect(pricingDoc.model).toBe('metered')
    expect((manifest as { pricing: { hardCeiling: number } }).pricing.hardCeiling).toBe(pricingDoc.hardCeiling)
    expect((openapiDoc as { openapi: string }).openapi).toBe('3.1.0')
  })
})
