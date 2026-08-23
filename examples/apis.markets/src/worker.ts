/**
 * worker.ts — the apis.markets wave-zero worker: ONE substrate
 * (src/substrate.ts), ONE manifest (src/manifest.ts), two plies from one
 * definition (template §3):
 *
 *   data face      GET  /instruments (+/{id}), /quotes, /positions (+/{id}),
 *                       /post-trade-documents — typed record collections
 *   headless face  POST /positions — the PMS system-of-record door on the
 *                       SAME collection (native-bound Position Noun):
 *                       recording, never execution; sandbox writes are
 *                       ephemeral and disclosed
 *
 * SCOPE (permanent, from the register row): execution and custody are out of
 * scope — no order placement/routing/amendment/cancellation, no custody.
 *
 * The vendored axp-faces generator serves the quartet + home + collection;
 * this file serves the extra live routes, the MCP door, the labeled 402
 * stub, and emits the wave-zero seams (§7.4): metering / money / receipt
 * events as structured logs — seams only, no billing, no account UI.
 *
 * ── RULED BRIDGE (batch-2 rollup; binding placements, zero divergence) ──────
 * Until the upstream axp-faces re-vendor lands, four extension members are
 * grafted onto the GENERATOR-BUILT documents (the vendored tree is never
 * edited — VENDORED.json integrity holds):
 *   1. `rates[]` top-level in the served Pricing Document (all three faces);
 *   2. `g2` top-level on the capability card;
 *   3. `links.verify` as a card link member;
 *   4. `operationId` on every OpenAPI route (fail-closed: a route the
 *      OPERATION_IDS map misses throws at module init).
 * Remove this whole block when the re-vendored generator carries them.
 */

// @ts-ignore — vendored byte-identical JS (PINS.json digest-checked); never edited here
import {
  createAxpRoutes,
  buildCard,
  buildOpenapi,
  buildPricingDocument,
  envelopeResponse,
  ok,
  empty,
  blocked,
  offer,
  negotiate,
  serveFace,
} from './axp-faces/index.js'
import { manifest, RATES, G2, OPERATION_IDS } from './manifest.ts'
import {
  SUBSTRATE,
  ORIGIN,
  instruments,
  quotes,
  seedPositions,
  postTradeDocuments,
  type Position,
} from './substrate.ts'
import { SUITE_TEXT, suiteDigest } from './verify-suite.ts'

const axp = createAxpRoutes(manifest)

// ---------------------------------------------------------------------------
// The ruled-bridge documents (built once from the same frozen manifest).
// ---------------------------------------------------------------------------

/** Bridges 2 + 3: top-level g2; links.verify as a link member. */
const bridgedCard = (() => {
  const card = buildCard(manifest)
  return { ...card, g2: G2, links: { ...card.links, verify: `${ORIGIN}/verify` } }
})()

/** Bridge 4: operationId on every route — fail-closed at module init. */
const bridgedOpenapi = (() => {
  const doc = buildOpenapi(manifest)
  for (const [path, methods] of Object.entries(doc.paths as Record<string, Record<string, { operationId?: string }>>)) {
    for (const [method, op] of Object.entries(methods)) {
      if (op.operationId !== undefined) continue // the generator's own doors keep their ids
      const key = `${method.toUpperCase()} ${path}`
      const id = OPERATION_IDS[key]
      if (id === undefined) throw new Error(`ruled bridge: no operationId mapped for ${key} — every route carries one`)
      op.operationId = id
    }
  }
  return doc
})()

/** Bridge 1: rates[] top-level in the Pricing Document; every row prices
 *  from zero (model: free) and every operation is a bridged operationId. */
const bridgedPricing = (() => {
  const openapiIds = new Set<string>()
  for (const methods of Object.values(bridgedOpenapi.paths as Record<string, Record<string, { operationId?: string }>>)) {
    for (const op of Object.values(methods)) if (op.operationId) openapiIds.add(op.operationId)
  }
  for (const row of RATES) {
    if (!openapiIds.has(row.operation)) throw new Error(`ruled bridge: rates[].operation ${row.operation} is not an OpenAPI operationId`)
    if (row.price !== 0 && !('freeQuota' in row)) throw new Error(`rate row ${row.operation} must carry freeQuota or a zero price`)
  }
  return { ...buildPricingDocument(manifest), rates: RATES }
})()

/** The three faces of the bridged Pricing Document — same wrappers the
 *  vendored routes.js uses, so the faces stay one truth. */
const bridgedPricingFaces = (() => {
  const title = `${manifest.name} — pricing`
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const jsonText = JSON.stringify(bridgedPricing, null, 2)
  return {
    json: bridgedPricing,
    md: `# ${title}\n\n\`\`\`json\n${jsonText}\n\`\`\`\n`,
    html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(jsonText)}</pre></body></html>\n`,
  }
})()

// ---------------------------------------------------------------------------
// §7.4 seams — emitted, never settled here. Every event carries the §6.4
// rollup tags. At wave zero the sink is the structured log stream; the
// analytics plane reads it after extraction (§7.2).
// ---------------------------------------------------------------------------

const PROJECTION_TAGS = {
  substrate: SUBSTRATE,
  projection: 'apis.markets',
  motion: 'B2A',
  shape: 'anon-sandbox',
  pattern: 'freemium-floor-only',
} as const

function identityClass(request: Request): 'human' | 'machine' {
  // Browser signals only (never UA sniffing for humans): Sec-Fetch-* headers
  // are browser-attached. Everything else is machine-class at this door.
  return request.headers.has('sec-fetch-site') || request.headers.has('sec-fetch-mode') ? 'human' : 'machine'
}

/** Metering seam — one event per operation call (§9.1 seams row). */
function emitMeter(operation: string, request: Request): void {
  console.log(
    JSON.stringify({
      event: 'meter',
      ...PROJECTION_TAGS,
      operation,
      identityClass: identityClass(request), // id.org.ai grain lands with rung 1+; anon at rung 0
      identity: 'anon',
      referral: request.headers.get('referer') || null,
      ts: new Date().toISOString(),
    }),
  )
}

/** Money-event seam — defined, never fired at wave zero: pricing is free and
 *  no billing exists (the 402 door is a labeled stub). */
export function emitMoneyEvent(detail: Record<string, unknown>): void {
  console.log(JSON.stringify({ event: 'money', ...PROJECTION_TAGS, ...detail, ts: new Date().toISOString() }))
}

/** Receipt seam (emails.do rail) — defined, never fired at wave zero. */
export function emitReceipt(detail: Record<string, unknown>): void {
  console.log(JSON.stringify({ event: 'receipt', ...PROJECTION_TAGS, ...detail, ts: new Date().toISOString() }))
}

// ---------------------------------------------------------------------------
// Ephemeral sandbox writes (headless PMS door). Disclosed retention:
// per-isolate memory, discarded on isolate recycle — stated on every
// recorded position and in the OpenAPI summary. Never presented as durable.
// ---------------------------------------------------------------------------

const recordedPositions: Position[] = []
let recordedSeq = 0

const allPositions = (): Position[] => [...seedPositions, ...recordedPositions]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

function json(body: unknown, status = 200, head = false): Response {
  return new Response(head ? null : JSON.stringify(body, null, 2), { status, headers: JSON_CT })
}

function filterList<T extends Record<string, unknown>>(rows: T[], url: URL, keys: string[]): { rows: T[]; miss?: [string, string] } {
  let out = rows
  for (const key of keys) {
    const value = url.searchParams.get(key)
    if (value === null) continue
    out = out.filter((r) => String(r[key]) === value)
    if (out.length === 0) return { rows: out, miss: [key, value] }
  }
  return { rows: out }
}

function listResponse<T extends Record<string, unknown>>(
  rows: T[],
  url: URL,
  keys: string[],
  what: string,
  head: boolean,
): Response {
  const { rows: out, miss } = filterList(rows, url, keys)
  if (out.length === 0) {
    const message = miss
      ? `no ${what} match ${miss[0]}=${miss[1]} — a truthful empty set, not an error`
      : `no ${what} exist yet — a truthful empty set, not an error`
    return json(empty(message), 200, head)
  }
  return json(ok(out), 200, head)
}

// ---------------------------------------------------------------------------
// The MCP door — same Nouns and verbs as HTTP (one definition, §3.3).
// Keyless (authless): the anon sandbox is the only ladder rung mounted at
// wave zero, so no bearer tier exists to demand. JSON-RPC 2.0 over
// streamable HTTP: initialize, tools/list, tools/call.
// ---------------------------------------------------------------------------

type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown> }

const TOOLS: ToolDef[] = [
  {
    name: 'listInstruments',
    description: 'Instrument reference records (labeled example data); optional assetClass/status filters',
    inputSchema: { type: 'object', properties: { assetClass: { type: 'string' }, status: { type: 'string' } } },
  },
  {
    name: 'getInstrument',
    description: 'One Instrument by id',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'listQuotes',
    description: 'End-of-session reference Quote records; optional instrumentId/session filters — never an execution feed',
    inputSchema: { type: 'object', properties: { instrumentId: { type: 'string' }, session: { type: 'string' } } },
  },
  {
    name: 'listPositions',
    description: 'Position records (PMS system-of-record grain), including sandbox-recorded positions; optional accountId/instrumentId filters',
    inputSchema: { type: 'object', properties: { accountId: { type: 'string' }, instrumentId: { type: 'string' } } },
  },
  {
    name: 'getPosition',
    description: 'One Position by id',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'recordPosition',
    description:
      'Record an already-held position snapshot via the PMS system-of-record door — recording, never execution (no order is placed, no asset moves). Sandbox writes are ephemeral (per-isolate memory) and labeled',
    inputSchema: {
      type: 'object',
      required: ['accountId', 'instrumentId', 'quantity', 'costBasis'],
      properties: {
        accountId: { type: 'string' },
        instrumentId: { type: 'string' },
        quantity: { type: 'number' },
        costBasis: { type: 'number' },
        asOf: { type: 'string' },
      },
    },
  },
  {
    name: 'listPostTradeDocuments',
    description: 'PostTradeDocument records (confirmations, statements) — the read-only post-trade door; optional kind/accountId filters',
    inputSchema: { type: 'object', properties: { kind: { type: 'string' }, accountId: { type: 'string' } } },
  },
]

function recordPositionRecord(input: Record<string, unknown>): { position?: Position; problem?: string } {
  const { accountId, instrumentId, quantity, costBasis, asOf } = input
  if (typeof accountId !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(accountId)) return { problem: 'accountId must be 1-64 chars of [a-z0-9_-]' }
  if (typeof instrumentId !== 'string' || !instruments.some((i) => i.id === instrumentId)) {
    return { problem: 'instrumentId must name an existing instrument (see GET /instruments)' }
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity === 0) return { problem: 'quantity must be a non-zero finite number' }
  if (typeof costBasis !== 'number' || !Number.isFinite(costBasis) || costBasis < 0) return { problem: 'costBasis must be a finite number >= 0' }
  if (asOf !== undefined && (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf))) return { problem: 'asOf, when given, must be YYYY-MM-DD' }
  const position: Position = {
    $type: 'Position',
    id: `pos_e_${String(++recordedSeq).padStart(4, '0')}`,
    accountId,
    instrumentId,
    quantity,
    costBasis,
    currency: 'USD',
    asOf: typeof asOf === 'string' ? asOf : new Date().toISOString().slice(0, 10),
    example: true,
    note: 'example data — recorded in the anon sandbox; ephemeral (per-isolate memory, discarded on isolate recycle); recording, never execution',
  }
  recordedPositions.push(position)
  return { position }
}

function callTool(name: string, args: Record<string, unknown>): { envelope: Record<string, unknown>; isError?: boolean } {
  const asUrl = (params: Record<string, unknown>) => {
    const u = new URL(`${ORIGIN}/x`)
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string') u.searchParams.set(k, v)
    return u
  }
  switch (name) {
    case 'listInstruments': {
      const { rows, miss } = filterList(instruments as unknown as Record<string, unknown>[], asUrl(args), ['assetClass', 'status'])
      return { envelope: rows.length ? ok(rows) : empty(`no instruments match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'getInstrument': {
      const rec = instruments.find((i) => i.id === args.id)
      return rec ? { envelope: ok([rec]) } : { envelope: empty(`no instrument with id ${String(args.id)}`), isError: true }
    }
    case 'listQuotes': {
      const { rows, miss } = filterList(quotes as unknown as Record<string, unknown>[], asUrl(args), ['instrumentId', 'session'])
      return { envelope: rows.length ? ok(rows) : empty(`no quotes match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'listPositions': {
      const { rows, miss } = filterList(allPositions() as unknown as Record<string, unknown>[], asUrl(args), ['accountId', 'instrumentId'])
      return { envelope: rows.length ? ok(rows) : empty(`no positions match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'getPosition': {
      const rec = allPositions().find((p) => p.id === args.id)
      return rec ? { envelope: ok([rec]) } : { envelope: empty(`no position with id ${String(args.id)}`), isError: true }
    }
    case 'recordPosition': {
      const { position, problem } = recordPositionRecord(args)
      return position ? { envelope: ok([position]) } : { envelope: blocked(problem || 'invalid input'), isError: true }
    }
    case 'listPostTradeDocuments': {
      const { rows, miss } = filterList(postTradeDocuments as unknown as Record<string, unknown>[], asUrl(args), ['kind', 'accountId'])
      return { envelope: rows.length ? ok(rows) : empty(`no post-trade documents match ${miss?.[0]}=${miss?.[1]}`) }
    }
    default:
      return { envelope: blocked(`no tool named ${name} — tools/list names the full set`), isError: true }
  }
}

async function handleMcp(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return envelopeResponse(
      { type: 'BLOCKED', reason: 'the MCP door answers POST (JSON-RPC 2.0); GET has nothing to say here' },
      { status: 405, headers: { allow: 'POST' } },
    )
  }
  let rpc: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> }
  try {
    rpc = (await request.json()) as typeof rpc
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error — the body must be JSON-RPC 2.0' } }, 400)
  }
  const id = rpc.id ?? null
  const reply = (result: unknown) => json({ jsonrpc: '2.0', id, result })
  switch (rpc.method) {
    case 'initialize':
      return reply({
        protocolVersion: '2025-03-26',
        serverInfo: { name: 'apis.markets', version: '0.1.0' },
        capabilities: { tools: {} },
      })
    case 'notifications/initialized':
      return new Response(null, { status: 202 })
    case 'tools/list':
      return reply({ tools: TOOLS })
    case 'tools/call': {
      const name = String(rpc.params?.name ?? '')
      const args = (rpc.params?.arguments ?? {}) as Record<string, unknown>
      emitMeter(name, request)
      const { envelope, isError } = callTool(name, args)
      return reply({ content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }], ...(isError && { isError: true }) })
    }
    default:
      return json({ jsonrpc: '2.0', id, error: { code: -32601, message: `method ${String(rpc.method)} not found` } })
  }
}

// ---------------------------------------------------------------------------
// The fetch pipeline: ruled-bridge faces first (they replace three generator
// addresses with the SAME documents plus the ruled extension members), then
// the generator, then site routes, then a typed 404.
// HEAD mirrors GET everywhere (conneg law A.7.3).
// ---------------------------------------------------------------------------

const BRIDGED_PATHS = new Set(['/.well-known/agents.json', '/openapi.json', '/pricing', '/pricing.json', '/pricing.md', '/pricing.html'])

export default {
  async fetch(request: Request, _env?: unknown, _ctx?: unknown): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // ── ruled-bridge faces ──────────────────────────────────────────────────
    if (BRIDGED_PATHS.has(path)) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return envelopeResponse(
          { type: 'BLOCKED', reason: `method ${request.method} is not served at ${path} — this address answers GET and HEAD` },
          { status: 405, headers: { allow: 'GET, HEAD' } },
        )
      }
      const head = request.method === 'HEAD'
      if (path === '/.well-known/agents.json') return json(bridgedCard, 200, head)
      if (path === '/openapi.json') return json(bridgedOpenapi, 200, head)
      // three faces of the one (bridged) Pricing Document; /pricing
      // negotiates, the face addresses force (A.7.2)
      const { face } = negotiate(request, path, {})
      return serveFace(request, url, bridgedPricingFaces, face, { cleanPath: '/pricing' })
    }

    // Metering seam for the generator-served collection door.
    if (path === '/instruments' && (request.method === 'GET' || request.method === 'HEAD')) {
      emitMeter('listCollection', request)
    }

    const hit = await axp(request, undefined)
    if (hit !== undefined) return hit

    if (path === '/mcp') return handleMcp(request)

    const head = request.method === 'HEAD'
    const getLike = request.method === 'GET' || head

    // POST /positions — the headless PMS system-of-record door.
    if (path === '/positions' && request.method === 'POST') {
      emitMeter('recordPosition', request)
      let input: Record<string, unknown>
      try {
        input = (await request.json()) as Record<string, unknown>
      } catch {
        return envelopeResponse(blocked('the request body must be a JSON object'), { status: 400 })
      }
      const { position, problem } = recordPositionRecord(input)
      if (!position) return envelopeResponse(blocked(problem || 'invalid input'), { status: 400 })
      return json(ok([position]), 201)
    }

    if (!getLike) {
      return envelopeResponse(
        { type: 'BLOCKED', reason: `method ${request.method} is not served at ${path}` },
        { status: 405, headers: { allow: 'GET, HEAD' } },
      )
    }

    const instrumentMatch = path.match(/^\/instruments\/([A-Za-z0-9_-]+)$/)
    if (instrumentMatch) {
      emitMeter('getInstrument', request)
      const rec = instruments.find((i) => i.id === instrumentMatch[1])
      if (!rec) return json(empty(`no instrument with id ${instrumentMatch[1]} — nothing here has been deleted; no such record was ever seeded`), 404, head)
      return json(ok([rec]), 200, head)
    }

    const positionMatch = path.match(/^\/positions\/([A-Za-z0-9_-]+)$/)
    if (positionMatch) {
      emitMeter('getPosition', request)
      const rec = allPositions().find((p) => p.id === positionMatch[1])
      if (!rec) return json(empty(`no position with id ${positionMatch[1]} — nothing here has been deleted; no such record was ever recorded`), 404, head)
      return json(ok([rec]), 200, head)
    }

    switch (path) {
      case '/quotes':
        emitMeter('listQuotes', request)
        return listResponse(quotes as unknown as Record<string, unknown>[], url, ['instrumentId', 'session'], 'quotes', head)

      case '/positions':
        emitMeter('listPositions', request)
        return listResponse(allPositions() as unknown as Record<string, unknown>[], url, ['accountId', 'instrumentId'], 'positions', head)

      case '/post-trade-documents':
        emitMeter('listPostTradeDocuments', request)
        return listResponse(postTradeDocuments as unknown as Record<string, unknown>[], url, ['kind', 'accountId'], 'post-trade documents', head)

      case '/icp.json':
        // G2 coordinates (template §2): facts about who this projection
        // serves — no positioning, no claims. Same truth as the card's
        // bridged top-level g2 member.
        return json(
          {
            $context: 'https://schema.org.ai',
            $type: 'ICP',
            substrate: SUBSTRATE,
            projection: 'apis.markets',
            motion: 'B2A',
            ...G2,
          },
          200,
          head,
        )

      case '/verify': {
        const digest = await suiteDigest()
        return json(
          {
            $context: 'https://schema.org.ai',
            $type: 'VerifyExport',
            name: 'apis.markets — run our tests',
            suite: `${ORIGIN}/verify/suite.json`,
            runner: 'api.qa/suite@1',
            digest,
            run: `npx autonomous-qa suite ${ORIGIN}/verify/suite.json --env prod --expect-digest ${digest.replace('sha256:', '')}`,
            declaredOnCard: false,
            declaredOnCardNote:
              'interfaces.testSuite is not declared: the declarative dialect is GET-only and cannot honestly cover the MCP tools and the POST door (A.8.7 coverage). The suite is published and runnable here regardless.',
            conformance: 'https://api.qa/apis.markets',
          },
          200,
          head,
        )
      }

      case '/verify/suite.json':
        return new Response(head ? null : SUITE_TEXT, { status: 200, headers: JSON_CT })

      case '/offer':
        // 402-shaped payable stub (template §7.3) — labeled, never fake billing.
        return envelopeResponse(
          offer({
            id: 'stub',
            title: 'payable stub — nothing on this origin is billable today',
            stub: true,
            notice:
              '402-shaped stub served for shape-compatibility with payable siblings; no billing exists behind this door and no payment is accepted (see /pricing: free, rates all zero)',
            alternatives: [
              { rel: 'free', url: `${ORIGIN}/instruments`, note: 'every door on this origin is keyless and free — the anon sandbox is the only ladder rung mounted today' },
              { rel: 'pricing', url: `${ORIGIN}/pricing` },
            ],
          }),
          { status: 402 },
        )
    }

    return envelopeResponse(
      { type: 'EMPTY', results: [], message: 'no route at this path — nothing here has been deleted; the route was never written' },
      { status: 404 },
    )
  },
}
