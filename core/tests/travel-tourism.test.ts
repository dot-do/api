/**
 * travel-tourism — the wave-zero self-verify suite (spec §9.1) plus the
 * fail-closed, digest-pinned AXP conformance gate.
 *
 * The conformance gate runs api.qa's requirement implementations IN MEMORY
 * against the worker app — the same digest-locked implementations the hosted
 * verifier at https://api.qa runs, so this gate green and the hosted verdict
 * cannot diverge by construction. (`describeConformance` is absent from the
 * vendored axp-faces build; this in-process ladder is the disclosed
 * re-implementation route — see the example README.) The spec text is the
 * vendored byte-identical copy of the ratified standard; the digest below is
 * the ratification digest.
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
import { travelTourism } from '../examples/travel-tourism/src/app'
import { card, pricingDoc, openapiDoc, manifest } from '../examples/travel-tourism/src/axp'
import { RATES } from '../examples/travel-tourism/src/manifest'
import { BOOKINGS, CAMP_SESSIONS, OPERATORS, SAILINGS, TRIPS } from '../examples/travel-tourism/src/seed'
import { substrate, OPERATIONS, SUB_VERTICALS } from '../examples/travel-tourism/src/substrate'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://travel-tourism.org.ai'
const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const app = travelTourism()
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
    const spec = readFileSync(join(here, '..', 'examples', 'travel-tourism', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')
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
    expect(body.links.conformance).toBe('https://api.qa/travel-tourism.org.ai')
    expect(body.links.verify).toBe(`${ORIGIN}/verify`)
    expect(body.links.icp).toBe(`${ORIGIN}/icp.json`)
    // stake #6 — the row's G2 coordinates exposed on the card
    expect(body.g2.icp.companyTypes).toContain('tour operator')
    expect(body.g2.systems[0]).toEqual({ system: 'Booking', coordinates: ['tour-operators'] })
    expect(body.probes.keyless.url).toBe('/bookings')
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
    expect(text).toMatch(/^# travel-tourism\.org\.ai/m)
    expect(text).toContain('## The family')
    expect(text).toContain('https://apis.ax/')
  })
})

describe('anon sandbox — the universal floor', () => {
  it('keyless collection answers 200 OK with substantive labeled seed', async () => {
    const res = await fetchApp('/bookings')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.bookings.length).toBe(18) // 3 sub-verticals × 2 items × 3 statuses
    for (const b of body.bookings) expect(b.example).toBe(true)
  })

  it('branches: filters → narrower OK / EMPTY, blocked scopes → 403 BLOCKED, over-ceiling → 402 OFFER', async () => {
    const charter = await fetchApp('/bookings?subVertical=charter&status=confirmed')
    expect(charter.status).toBe(200)
    const charterBody = await charter.json()
    expect(charterBody.type).toBe('OK')
    expect(charterBody.bookings.length).toBe(2)

    const emptyRes = await fetchApp('/bookings?status=none')
    expect(emptyRes.status).toBe(200)
    expect((await emptyRes.json()).type).toBe('EMPTY')

    const blockedRes = await fetchApp('/bookings?scope=operator-private')
    expect(blockedRes.status).toBe(403)
    expect((await blockedRes.json()).type).toBe('BLOCKED')

    const offerRes = await fetchApp('/bookings?spend=1000')
    expect(offerRes.status).toBe(402)
    expect((await offerRes.json()).type).toBe('OFFER')
  })

  it('seed exercises every noun with internal consistency: manifests within capacity, rosters within capacity, every confirmed booking has a trip', async () => {
    for (const s of SAILINGS) expect(s.berthsBooked, `sailing ${s.id} manifest within capacity`).toBeLessThanOrEqual(s.capacity)
    for (const s of CAMP_SESSIONS) expect(s.enrolled, `session ${s.id} roster within capacity`).toBeLessThanOrEqual(s.capacity)
    const tripBookingIds = new Set(TRIPS.map((t) => t.bookingId))
    for (const b of BOOKINGS.filter((x) => x.status === 'confirmed')) {
      expect(tripBookingIds, `confirmed booking ${b.id} must have an itinerary`).toContain(b.id)
    }
    // every zoned sub-vertical × every status appears — the filters genuinely branch
    for (const sub of SUB_VERTICALS) {
      for (const status of ['confirmed', 'pending', 'cancelled']) {
        expect(BOOKINGS.some((b) => b.subVertical === sub && b.status === status)).toBe(true)
      }
    }
    for (const path of ['/trips', '/sailings', '/camp-sessions', '/operators', '/icp.json', '/verify', '/checkout']) {
      const res = await fetchApp(path)
      expect(res.status, `${path} must answer keyless`).toBe(200)
    }
  })

  it('fixture law: example labels everywhere, (demo) operator names, 00-prefix registration ids, people as role labels never names', () => {
    for (const o of OPERATORS) {
      expect(o.example).toBe(true)
      expect(o.registrationId.startsWith('00-')).toBe(true)
      expect(o.name).toContain('(demo)')
    }
    for (const b of BOOKINGS) {
      expect(b.example).toBe(true)
      expect(b.contactRole).toContain('role label')
    }
    for (const s of SAILINGS) expect(s.example).toBe(true)
    for (const s of CAMP_SESSIONS) expect(s.example).toBe(true)
  })
})

describe('the 402 boundary (payable stub — never fake billing; B2A ladder advertised)', () => {
  it('confirmBooking answers a typed 402 OFFER labeled as a stub, with the per-outcome rate and the whole #17 ladder in alternatives', async () => {
    const id = BOOKINGS[0]!.id
    const res = await fetchApp(`/bookings/${id}/confirm`, { method: 'POST' })
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toContain('LABELED STUB')
    expect(body.rate.operation).toBe('confirmBooking')
    expect(body.rate.unit).toBe('usd-per-confirmed-booking')
    // pay (checkoutUrl on the offer) / work (earned-credits) / claim (human-claimed)
    const altIds = body.alternatives.map((a: { id: string }) => a.id)
    expect(altIds).toContain('anon-sandbox')
    expect(altIds).toContain('earned-credits')
    expect(altIds).toContain('human-claimed')
    expect(body.checkoutUrl).toBe(`${ORIGIN}/checkout`)
  })

  it('the checkout seam is a labeled stub that cannot take payment', async () => {
    const res = await fetchApp('/checkout')
    const body = await res.json()
    expect(body.checkout[0].status).toBe('stub')
    expect(body.checkout[0].note).toContain('no charge can occur')
  })

  it('B2A projection: no OAuth/CC door is mounted — /login was never written (typed 404 EMPTY floor)', async () => {
    const res = await fetchApp('/login')
    expect(res.status).toBe(404)
    expect((await res.json()).type).toBe('EMPTY')
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
    const post = await fetchApp('/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subVertical: 'charter', itemRef: 's-harborlight-2026-09-12', partySize: 2 }),
    })
    expect(post.status).toBe(201)
    const body = await post.json()
    expect(body.type).toBe('OK')
    expect(body.retention).toContain('ephemeral')
    const createdId = body.bookings[0].id

    // the workspace booking is retrievable by id (same handlers as product)
    const got = await fetchApp(`/bookings/${createdId}`)
    expect(got.status).toBe(200)
    expect((await got.json()).bookings[0].id).toBe(createdId)

    const badSub = await fetchApp('/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subVertical: 'flights', itemRef: 'x' }),
    })
    expect(badSub.status).toBe(400)

    const enroll = await fetchApp('/camp-sessions/cs-cedarknoll-2027-a/enrollments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ camperAgeBand: '9-12' }),
    })
    expect(enroll.status).toBe(201)
    expect((await enroll.json()).type).toBe('OK')

    const badEnroll = await fetchApp('/camp-sessions/cs-nowhere/enrollments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    expect(badEnroll.status).toBe(400)
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

  it('G3 substrate invariants: every noun has schema + binding + verbs; system coordinates are declared; one meter per operation', () => {
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
