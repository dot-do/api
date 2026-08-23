/**
 * worker.ts — the apis.productions wave-zero worker: ONE substrate
 * (src/substrate.ts), ONE manifest (src/manifest.ts), two plies from one
 * definition (template §3):
 *
 *   data face      GET  /productions (+/{id}), /assets, /pages,
 *                       /audience-signals — typed record collections
 *   headless face  POST /pages — the CMS system-of-record door on the SAME
 *                       collection (native-bound Page Noun); sandbox writes
 *                       are ephemeral and disclosed
 *
 * The vendored axp-faces generator serves the quartet + home + collection;
 * this file serves the extra live routes, the MCP door, the labeled 402
 * stub, and emits the wave-zero seams (§7.4): metering / money / receipt
 * events as structured logs — seams only, no billing, no account UI.
 */

import { createAxpRoutes, envelopeResponse, ok, empty, blocked, offer } from './axp-faces/index.js'
import { manifest } from './manifest.ts'
import {
  SUBSTRATE,
  ORIGIN,
  productions,
  assets,
  seedPages,
  audienceSignals,
  type Page,
} from './substrate.ts'
import { SUITE_TEXT, suiteDigest } from './verify-suite.ts'

const axp = createAxpRoutes(manifest)

// ---------------------------------------------------------------------------
// §7.4 seams — emitted, never settled here. Every event carries the §6.4
// rollup tags. At wave zero the sink is the structured log stream; the
// analytics plane reads it after extraction (§7.2).
// ---------------------------------------------------------------------------

const PROJECTION_TAGS = {
  substrate: SUBSTRATE,
  projection: 'apis.productions',
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
// Ephemeral sandbox writes (headless door). Disclosed retention: per-isolate
// memory, discarded on isolate recycle — stated on every created record and
// in the OpenAPI summary. Never presented as durable storage.
// ---------------------------------------------------------------------------

const createdPages: Page[] = []
let createdSeq = 0

const allPages = (): Page[] => [...seedPages, ...createdPages]

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
// JSON-RPC 2.0 over streamable HTTP: initialize, tools/list, tools/call.
// ---------------------------------------------------------------------------

type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown> }

const TOOLS: ToolDef[] = [
  {
    name: 'listProductions',
    description: 'Production records (labeled example data); optional kind/status filters',
    inputSchema: { type: 'object', properties: { kind: { type: 'string' }, status: { type: 'string' } } },
  },
  {
    name: 'getProduction',
    description: 'One Production by id',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'listAssets',
    description: 'MediaAsset records; optional productionId/role filters',
    inputSchema: { type: 'object', properties: { productionId: { type: 'string' }, role: { type: 'string' } } },
  },
  {
    name: 'listPages',
    description: 'Page records (Content ply), including sandbox-created pages; optional productionId filter',
    inputSchema: { type: 'object', properties: { productionId: { type: 'string' } } },
  },
  {
    name: 'createPage',
    description: 'Create a Page via the headless CMS door — sandbox writes are ephemeral (per-isolate memory) and labeled',
    inputSchema: {
      type: 'object',
      required: ['slug', 'title', 'body'],
      properties: { slug: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, productionId: { type: 'string' } },
    },
  },
  {
    name: 'listAudienceSignals',
    description: 'AudienceSignal records — unordered usage counts from distribution exhaust; no ranking implied',
    inputSchema: { type: 'object', properties: { productionId: { type: 'string' }, period: { type: 'string' } } },
  },
]

function createPageRecord(input: Record<string, unknown>): { page?: Page; problem?: string } {
  const { slug, title, body, productionId } = input
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug)) return { problem: 'slug must be 1-64 chars of [a-z0-9-]' }
  if (typeof title !== 'string' || title.length === 0 || title.length > 200) return { problem: 'title must be a non-empty string (<= 200 chars)' }
  if (typeof body !== 'string' || body.length === 0 || body.length > 10_000) return { problem: 'body must be a non-empty string (<= 10000 chars)' }
  if (productionId !== undefined && (typeof productionId !== 'string' || !productions.some((p) => p.id === productionId))) {
    return { problem: 'productionId, when given, must name an existing production' }
  }
  const page: Page = {
    $type: 'Page',
    id: `page_e_${String(++createdSeq).padStart(4, '0')}`,
    ...(typeof productionId === 'string' && { productionId }),
    slug,
    title: title.startsWith('[demo]') ? title : `[demo] ${title}`,
    body,
    example: true,
    note: 'example data — created in the anon sandbox; ephemeral (per-isolate memory, discarded on isolate recycle)',
  }
  createdPages.push(page)
  return { page }
}

function callTool(name: string, args: Record<string, unknown>): { envelope: Record<string, unknown>; isError?: boolean } {
  const asUrl = (params: Record<string, unknown>) => {
    const u = new URL(`${ORIGIN}/x`)
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string') u.searchParams.set(k, v)
    return u
  }
  switch (name) {
    case 'listProductions': {
      const { rows, miss } = filterList(productions as unknown as Record<string, unknown>[], asUrl(args), ['kind', 'status'])
      return { envelope: rows.length ? ok(rows) : empty(`no productions match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'getProduction': {
      const rec = productions.find((p) => p.id === args.id)
      return rec ? { envelope: ok([rec]) } : { envelope: empty(`no production with id ${String(args.id)}`), isError: true }
    }
    case 'listAssets': {
      const { rows, miss } = filterList(assets as unknown as Record<string, unknown>[], asUrl(args), ['productionId', 'role'])
      return { envelope: rows.length ? ok(rows) : empty(`no assets match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'listPages': {
      const { rows, miss } = filterList(allPages() as unknown as Record<string, unknown>[], asUrl(args), ['productionId'])
      return { envelope: rows.length ? ok(rows) : empty(`no pages match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'createPage': {
      const { page, problem } = createPageRecord(args)
      return page ? { envelope: ok([page]) } : { envelope: blocked(problem || 'invalid input'), isError: true }
    }
    case 'listAudienceSignals': {
      const { rows, miss } = filterList(audienceSignals as unknown as Record<string, unknown>[], asUrl(args), ['productionId', 'period'])
      return { envelope: rows.length ? ok(rows) : empty(`no audience signals match ${miss?.[0]}=${miss?.[1]}`) }
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
        serverInfo: { name: 'apis.productions', version: '0.1.0' },
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
// The fetch pipeline: generator first, site routes second, typed 404 last.
// HEAD mirrors GET everywhere (conneg law A.7.3).
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, _env?: unknown, _ctx?: unknown): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Metering seam for the generator-served collection door.
    if (path === '/productions' && (request.method === 'GET' || request.method === 'HEAD')) {
      emitMeter('listCollection', request)
    }

    const hit = await axp(request, undefined)
    if (hit !== undefined) return hit

    if (path === '/mcp') return handleMcp(request)

    const head = request.method === 'HEAD'
    const getLike = request.method === 'GET' || head

    // POST /pages — the headless system-of-record door.
    if (path === '/pages' && request.method === 'POST') {
      emitMeter('createPage', request)
      let input: Record<string, unknown>
      try {
        input = (await request.json()) as Record<string, unknown>
      } catch {
        return envelopeResponse(blocked('the request body must be a JSON object'), { status: 400 })
      }
      const { page, problem } = createPageRecord(input)
      if (!page) return envelopeResponse(blocked(problem || 'invalid input'), { status: 400 })
      return json(ok([page]), 201)
    }

    if (!getLike) {
      return envelopeResponse(
        { type: 'BLOCKED', reason: `method ${request.method} is not served at ${path}` },
        { status: 405, headers: { allow: 'GET, HEAD' } },
      )
    }

    const idMatch = path.match(/^\/productions\/([A-Za-z0-9_-]+)$/)
    if (idMatch) {
      emitMeter('getProduction', request)
      const rec = productions.find((p) => p.id === idMatch[1])
      if (!rec) return json(empty(`no production with id ${idMatch[1]} — nothing here has been deleted; no such record was ever seeded`), 404, head)
      return json(ok([rec]), 200, head)
    }

    switch (path) {
      case '/assets':
        emitMeter('listAssets', request)
        return listResponse(assets as unknown as Record<string, unknown>[], url, ['productionId', 'role'], 'assets', head)

      case '/pages':
        emitMeter('listPages', request)
        return listResponse(allPages() as unknown as Record<string, unknown>[], url, ['productionId'], 'pages', head)

      case '/audience-signals':
        emitMeter('listAudienceSignals', request)
        return listResponse(audienceSignals as unknown as Record<string, unknown>[], url, ['productionId', 'period'], 'audience signals', head)

      case '/icp.json':
        // G2 coordinates (template §2; stake #6): facts about who this
        // projection serves — no positioning, no claims.
        return json(
          {
            $context: 'https://schema.org.ai',
            $type: 'ICP',
            substrate: SUBSTRATE,
            projection: 'apis.productions',
            motion: 'B2A',
            icp: {
              companyType: 'first-party content operation (the studio itself)',
              jobTypes: ['producer', 'content lead', 'brand operator'],
            },
            personas: [
              { id: 'film-program-agent', class: 'machine', description: 'an agent operating a launch-film program against these records' },
              { id: 'deck-factory-agent', class: 'machine', description: 'an agent producing and releasing deck suites' },
              { id: 'content-operator', class: 'human', description: 'a producer or content lead reading the same records in a browser' },
            ],
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
            name: 'apis.productions — run our tests',
            suite: `${ORIGIN}/verify/suite.json`,
            runner: 'api.qa/suite@1',
            digest,
            run: `npx autonomous-qa suite ${ORIGIN}/verify/suite.json --env prod --expect-digest ${digest.replace('sha256:', '')}`,
            declaredOnCard: false,
            declaredOnCardNote:
              'interfaces.testSuite is not declared: the declarative dialect is GET-only and cannot honestly cover the MCP tools and the POST door (A.8.7 coverage). The suite is published and runnable here regardless.',
            conformance: 'https://api.qa/apis.productions',
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
              '402-shaped stub served for shape-compatibility with payable siblings; no billing exists behind this door and no payment is accepted (see /pricing: free)',
            alternatives: [
              { rel: 'free', url: `${ORIGIN}/productions`, note: 'every door on this origin is keyless and free' },
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
