/**
 * property.test.ts — the wave-zero §9.1 checklist boxes that are this
 * property's own (the AXP boxes live in conformance.test.ts):
 *
 *   - anon sandbox floor: keyless OK with substantive LABELED seed
 *   - fixture law: synthetic records labeled, no real-entity fields, secret-scan
 *   - every declared operation exercised by the seed corpus (both plies)
 *   - rate card: operationId-keyed, every row freeQuota or zero price,
 *     rates ⊆ substrate operation ids, full operation coverage, and served
 *     at the RULED placement — pricing.rates, TOP-LEVEL in the Pricing
 *     Document (axp-ext/rates-g2 §2; never nested under an offer)
 *   - operationId unified across contract + MCP + rate keys (rates-g2 §1)
 *   - card carries links.verify (§3) and the top-level g2 object (§4)
 *   - 402 boundary served as a LABELED stub (never fake billing)
 *   - MCP door serves the same operations as HTTP (one definition)
 *   - seams tagged {substrate, projection, motion, operation, shape, pattern}
 *   - G2 coordinates on the wire (/icp.json), /verify export answers
 *   - no ghost surfaces: every card-declared GET answers
 */
import { describe, expect, it } from 'vitest'
import worker, { seams, icpDocument } from '../src/worker.ts'
import { manifest, rates, g2Coordinates } from '../src/manifest.ts'
import { staffingTalent } from '../src/substrate.ts'
import { apiCareersProjection } from '../src/projection.ts'
import * as seed from '../src/seed.ts'

const ORIGIN = 'https://api.careers'
const get = (path: string, headers: Record<string, string> = {}) => worker.fetch(new Request(`${ORIGIN}${path}`, { headers }))
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  worker.fetch(new Request(`${ORIGIN}${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } }))

describe('anon sandbox — the universal floor', () => {
  it('keyless GET /placements answers 200 OK with substantive, labeled seed', async () => {
    const res = await get('/placements')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.placements.length).toBeGreaterThanOrEqual(5)
    for (const rec of body.placements) {
      expect(rec.example).toBe(true)
      expect(rec.label).toContain('example data')
    }
  })

  it('branches truthfully: knownEmpty → EMPTY, knownForbidden → 403 BLOCKED', async () => {
    for (const q of ['status=none', 'occupation=none']) {
      const body = await (await get(`/placements?${q}`)).json()
      expect(body.type).toBe('EMPTY')
    }
    for (const scope of ['admin', 'internal']) {
      const res = await get(`/placements?scope=${scope}`)
      expect(res.status).toBe(403)
      expect((await res.json()).type).toBe('BLOCKED')
    }
  })

  it('POST auto-mints an ephemeral workspace with disclosed retention, and the workspace reads back merged', async () => {
    const res = await post('/candidates', { name: 'Vesper Corven', onetCode: '15-1252.00' })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.type).toBe('OK')
    expect(body.workspace).toMatch(/^ws_/)
    expect(body.retention).toContain('ephemeral')
    const minted = body.results[0]
    expect(minted.example).toBe(true)

    const list = await (await get('/candidates', { 'x-workspace': body.workspace })).json()
    expect(list.candidates.map((c: { id: string }) => c.id)).toContain(minted.id)

    // the branching collection merges workspace records through the SAME manifest rows
    const plc = await post('/placements', { candidateId: minted.id, jobOrderId: 'job_0004', onetCode: '15-1252.00' }, { 'x-workspace': body.workspace })
    const plcBody = await plc.json()
    expect(plc.status).toBe(201)
    const merged = await (await get('/placements', { 'x-workspace': body.workspace })).json()
    expect(merged.placements.map((p: { id: string }) => p.id)).toContain(plcBody.results[0].id)
  })

  it('incomplete create bodies answer a typed envelope, not a bare error', async () => {
    const res = await post('/candidates', { name: 'No Code Given' })
    expect(res.status).toBe(400)
    expect((await res.json()).type).toBe('BLOCKED')
  })
})

describe('fixture law — labeled synthetic data, no leakage', () => {
  it('every synthetic seed record is labeled example: true', () => {
    for (const rec of [...seed.candidates, ...seed.jobOrders, ...seed.placements]) {
      expect(rec.example).toBe(true)
      expect(rec.label).toBe(seed.SEED_LABEL)
    }
  })

  it('occupation records carry their real-source attribution (O*NET excerpt, not synthetic)', () => {
    for (const occ of seed.occupations) expect(occ.source).toContain('O*NET')
  })

  it('secret-scan: the corpus contains no credential-shaped strings and no id-number fields', () => {
    const text = JSON.stringify(seed)
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|-----BEGIN/)
    expect(text).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/) // SSN-shaped
    expect(text.toLowerCase()).not.toMatch(/"(ssn|ein|email|phone)"/)
  })
})

describe('rate card — operationId-keyed, honest from zero', () => {
  const opIds = staffingTalent.operations.map((o) => o.id)

  it('every rate row prices a declared operation and has freeQuota or a zero price', () => {
    for (const row of rates) {
      expect(opIds).toContain(row.operation)
      const free = 'freeQuota' in row && typeof row.freeQuota === 'number' && row.freeQuota > 0
      expect(free || row.price === 0).toBe(true)
    }
  })

  it('every operation has a rate row (full coverage) and every operation is metered', () => {
    const rated = rates.map((r) => r.operation)
    const metered = staffingTalent.meters.map((m) => m.operation)
    for (const id of opIds) {
      expect(rated).toContain(id)
      expect(metered).toContain(id)
    }
  })

  it('/pricing declares metered + binding: false with the test-mode statement (stub, never fake billing)', async () => {
    const body = await (await get('/pricing')).json()
    expect(body.model).toBe('metered')
    expect(body.hardCeiling).toBeGreaterThan(0)
    expect(body.binding).toBe(false)
    expect(body.statement).toContain('no billing occurs')
  })

  it('the rate card rides the RULED placement: top-level rates[] in the Pricing Document, never nested under an offer (axp-ext/rates-g2 §2)', async () => {
    const body = await (await get('/pricing')).json()
    expect(body.rates).toEqual(rates.map((r) => ({ ...r })))
    // the bridge placement is gone: no offer (card monetization or 402 body) carries rates
    const card = await (await get('/.well-known/agents.json')).json()
    for (const offer of card.monetization.offers) expect(offer.rates).toBeUndefined()
    const offerBody = await (await get('/offer')).json()
    expect(JSON.stringify(offerBody)).not.toContain('"rates"')
  })

  it('the OpenAPI contract carries the ONE canonical operationId on every operation, uniquely, and every rate row keys on a declared id (axp-ext/rates-g2 §1)', async () => {
    const oas = await (await get('/openapi.json')).json()
    const ids: string[] = []
    for (const methods of Object.values(oas.paths as Record<string, Record<string, { operationId?: string }>>)) {
      for (const op of Object.values(methods)) if (op.operationId) ids.push(op.operationId)
    }
    expect(new Set(ids).size).toBe(ids.length) // one operation, one identifier
    for (const op of staffingTalent.operations) expect(ids, op.id).toContain(op.id)
    for (const row of rates) expect(ids, row.operation).toContain(row.operation)
  })
})

describe('the 402 boundary — a labeled stub advertising the whole B2A ladder', () => {
  it('GET /offer answers 402 OFFER with pay / work / claim alternatives', async () => {
    const res = await get('/offer')
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.type).toBe('OFFER')
    expect(body.stub).toBe(true)
    const ids = body.alternatives.map((a: { id: string }) => a.id)
    expect(ids).toEqual(['pay-402', 'work-earned-credits', 'claim-workspace'])
  })

  it('over-ceiling spend on the collection answers 402 OFFER; within-ceiling answers 200', async () => {
    expect((await get('/placements?spend=999')).status).toBe(402)
    expect((await get('/placements?spend=1')).status).toBe(200)
  })
})

describe('every declared operation is exercised (both plies, one definition)', () => {
  it('each substrate operation answers with a typed envelope over HTTP', async () => {
    const sample: Record<string, string> = {
      getPlacement: seed.placements[0].id,
      getCandidate: seed.candidates[0].id,
      getJobOrder: seed.jobOrders[0].id,
      getOccupation: seed.occupations[0].id,
    }
    const createBodies: Record<string, unknown> = {
      createPlacement: { candidateId: 'cand_0003', jobOrderId: 'job_0004', onetCode: '43-4051.00' },
      createCandidate: { name: 'Orin Vex', onetCode: '43-4051.00' },
      createJobOrder: { client: 'Bluewisp Logistics (fictional)', title: 'CSR', onetCode: '43-4051.00' },
    }
    for (const op of staffingTalent.operations) {
      const path = op.path.replace('{id}', sample[op.id] || '')
      const res = op.method === 'GET' ? await get(path) : await post(path, createBodies[op.id])
      expect(res.status, op.id).toBeLessThan(400)
      const body = await res.json()
      expect(['OK', 'EMPTY'], op.id).toContain(body.type)
    }
  })

  it('the MCP door serves the same operation set (tools/list) and dispatches tools/call', async () => {
    const list = await (await post('/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' })).json()
    expect(list.result.tools.map((t: { name: string }) => t.name).sort()).toEqual(staffingTalent.operations.map((o) => o.id).sort())

    const call = await (await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'getOccupation', arguments: { id: '29-1141.00' } } })).json()
    expect(call.result.isError).toBe(false)
    expect(JSON.parse(call.result.content[0].text).results[0].title).toBe('Registered Nurses')
  })
})

describe('seams — emitted and fully tagged (§6.4)', () => {
  it('meter seams carry {substrate, projection, motion, operation, shape, pattern}', async () => {
    seams.length = 0
    await get('/placements')
    await get('/occupations')
    const meters = seams.filter((s) => s.seam === 'meter')
    expect(meters.length).toBeGreaterThanOrEqual(2)
    for (const m of meters) {
      expect(m.substrate).toBe('staffing-talent')
      expect(m.projection).toBe('api.careers')
      expect(m.motion).toBe('B2A')
      expect(m.operation).toBeTruthy()
      expect(m.shape).toBe('anon-sandbox')
      expect(m.pattern).toBe('402-metered-per-call')
    }
  })

  it('workspace minting emits a signup seam with identity class + referral; 402 emits a stub money-event', async () => {
    seams.length = 0
    await post('/job-orders', { client: 'Fernhollow Care (fictional)', title: 'RN', onetCode: '29-1141.00' })
    await get('/offer')
    const signup = seams.find((s) => s.seam === 'signup')
    expect(signup?.identityClass).toBe('machine-anonymous')
    expect(signup?.referral).toBe('direct')
    const money = seams.find((s) => s.seam === 'money-event')
    expect(money?.stub).toBe(true)
  })
})

describe('G2 on the wire, /verify export, no ghost surfaces', () => {
  it('/icp.json exposes the register row coordinates and the projection motion', async () => {
    const body = await (await get('/icp.json')).json()
    expect(body.register.row).toBe('staffing-talent')
    expect(body.register.naics).toBe('5613')
    expect(body.register.sharedWith).toContain('fn-hr-talent')
    expect(body.motion).toBe('B2A')
    expect(body.icp.companyTypes.length).toBeGreaterThan(0)
    expect(icpDocument.personas).toEqual(apiCareersProjection.personas)
  })

  it('/verify answers with the runnable suites and the pinned digest', async () => {
    const body = await (await get('/verify')).json()
    expect(body.suites.map((s: { id: string }) => s.id)).toContain('axp-conformance')
    expect(JSON.stringify(body)).toContain('a9a1197c')
  })

  it('presence-when-true: every GET the card declares actually answers', async () => {
    const card = await (await get('/.well-known/agents.json')).json()
    for (const entry of card.interfaces.http) {
      const path = new URL(entry.url).pathname
      const res = await get(path)
      expect([200, 402], `${entry.method} ${path}`).toContain(res.status) // /offer is 402 by design
    }
    expect(card.links.conformance).toBe('https://api.qa/api.careers')
    expect(card.interfaces.mcp.url).toBe(`${ORIGIN}/mcp`)
    expect(card.interfaces.mcp.tools.length).toBe(staffingTalent.operations.length)
  })

  it('the card carries links.verify and the TOP-LEVEL g2 object at the ruled placements (axp-ext/rates-g2 §3/§4), with links.icp beside them', async () => {
    const card = await (await get('/.well-known/agents.json')).json()
    expect(card.links.verify).toBe(`${ORIGIN}/verify`)
    expect(card.links.icp).toBe(`${ORIGIN}/icp.json`)
    expect(card.g2).toEqual(JSON.parse(JSON.stringify(g2Coordinates)))
    // MCP tool names ARE the canonical operationIds (§1) — string entries
    for (const tool of card.interfaces.mcp.tools) expect(typeof tool).toBe('string')
  })

  it('conneg spot-check: bare fetch gets JSON at /, browser gets HTML, /pricing.md is markdown', async () => {
    const bare = await get('/')
    expect(bare.headers.get('content-type')).toContain('application/json')
    const browser = await get('/', { 'sec-fetch-dest': 'document', accept: 'text/html,*/*' })
    expect(browser.headers.get('content-type')).toContain('text/html')
    const md = await get('/pricing.md')
    expect(md.headers.get('content-type')).toContain('markdown')
  })
})
