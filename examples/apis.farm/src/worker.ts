/**
 * worker.ts — the apis.farm wave-zero worker: ONE substrate
 * (src/substrate.ts), ONE manifest (src/manifest.ts), two plies from one
 * definition (template §3):
 *
 *   data face      GET  /lots (+/{id}), /products, /facilities,
 *                       /compliance-artifacts — typed record collections
 *   headless face  POST /products — the master-data system-of-record door on
 *                       the SAME collection (native-bound Product Noun);
 *                       sandbox writes are ephemeral, fixture-law-gated
 *                       (demo prefix 952), and disclosed
 *
 * The rail law: EPCIS events are consumed from the traceability rail
 * (epcis.dev/barcoding.dev) via cteRefs on lot records — never captured or
 * re-served here (one rail, two rows).
 *
 * src/axp.ts serves the quartet (with the four ruled estate extensions) +
 * home + collection via the vendored generator; this file serves the extra
 * live routes, the authless MCP door, the labeled 402 stub, and emits the
 * wave-zero seams (§7.4): metering / money / receipt events as structured
 * logs — seams only, no billing, no account UI.
 */

import { ok, empty, blocked, offer, envelopeResponse } from './axp-faces/index.js'
import { axpHandler, icpDoc } from './axp.ts'
import {
  SUBSTRATE,
  ORIGIN,
  RAIL,
  lots,
  products,
  facilities,
  complianceArtifacts,
  type Product,
} from './substrate.ts'
import { SUITE_TEXT, suiteDigest } from './verify-suite.ts'

// ---------------------------------------------------------------------------
// §7.4 seams — emitted, never settled here. Every event carries the §6.4
// rollup tags. At wave zero the sink is the structured log stream; the
// analytics plane reads it after extraction (§7.2).
// ---------------------------------------------------------------------------

const PROJECTION_TAGS = {
  substrate: SUBSTRATE,
  projection: 'apis.farm',
  motion: 'B2D',
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
      identityClass: identityClass(request), // id.org.ai grain lands with keyed rungs; anon at the floor
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

const createdProducts: Product[] = []
let createdSeq = 0

const allProducts = (): Product[] => [...products, ...createdProducts]

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

/** GS1 mod-10 check digit over a 13-digit code (GTIN-13 / GLN-13). */
export function gs1CheckDigitValid(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop() as number
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

// ---------------------------------------------------------------------------
// The MCP door — same Nouns and verbs as HTTP (one definition, §3.3).
// AUTHLESS by ruling: the only mounted rung is the anon sandbox; bearer-key
// auth arrives with the first keyed rung. JSON-RPC 2.0 over streamable HTTP.
// ---------------------------------------------------------------------------

type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown> }

const TOOLS: ToolDef[] = [
  {
    name: 'listLots',
    description: 'TraceabilityLot records (labeled example data; FSMA-204 KDE grain, EPCIS events referenced on the rail); optional status/gtin filters',
    inputSchema: { type: 'object', properties: { status: { type: 'string' }, gtin: { type: 'string' } } },
  },
  {
    name: 'getLot',
    description: 'One TraceabilityLot by id — chain-of-custody via inputLotIds; EPCIS events dereference at the rail via cteRefs',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'listProducts',
    description: 'Product records (GTIN-identified, demo prefix 952), including sandbox-registered products; optional ftl/category filters',
    inputSchema: { type: 'object', properties: { ftl: { type: 'string' }, category: { type: 'string' } } },
  },
  {
    name: 'registerProduct',
    description: 'Register a Product via the headless master-data door — sandbox writes are ephemeral (per-isolate memory), labeled, and demand a valid demo-prefix-952 GTIN',
    inputSchema: {
      type: 'object',
      required: ['gtin', 'name', 'category'],
      properties: { gtin: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, ftl: { type: 'boolean' } },
    },
  },
  {
    name: 'listFacilities',
    description: 'Facility records (GLN-identified, demo prefix 952); optional role filter',
    inputSchema: { type: 'object', properties: { role: { type: 'string' } } },
  },
  {
    name: 'listComplianceArtifacts',
    description: 'ComplianceArtifact records — FSMA-204 deliverables derived from the lot chain; optional kind/facilityGln filters',
    inputSchema: { type: 'object', properties: { kind: { type: 'string' }, facilityGln: { type: 'string' } } },
  },
]

function registerProductRecord(input: Record<string, unknown>): { product?: Product; problem?: string } {
  const { gtin, name, category, ftl } = input
  if (typeof gtin !== 'string' || !gtin.startsWith('952') || !gs1CheckDigitValid(gtin)) {
    return { problem: 'gtin must be a 13-digit GS1 GTIN with the demo prefix 952 and a valid check digit — the sandbox serves labeled example data only (fixture law)' }
  }
  if (allProducts().some((p) => p.gtin === gtin)) return { problem: `a product with gtin ${gtin} already exists in this sandbox` }
  if (typeof name !== 'string' || name.length === 0 || name.length > 200) return { problem: 'name must be a non-empty string (<= 200 chars)' }
  if (typeof category !== 'string' || category.length === 0 || category.length > 100) return { problem: 'category must be a non-empty string (<= 100 chars)' }
  if (ftl !== undefined && typeof ftl !== 'boolean') return { problem: 'ftl, when given, must be a boolean' }
  const product: Product = {
    $type: 'Product',
    id: `prd_e_${String(++createdSeq).padStart(4, '0')}`,
    gtin,
    name: name.startsWith('[demo]') ? name : `[demo] ${name}`,
    ftl: ftl === true,
    category,
    example: true,
    note: 'example data — registered in the anon sandbox; ephemeral (per-isolate memory, discarded on isolate recycle)',
  }
  createdProducts.push(product)
  return { product }
}

function callTool(name: string, args: Record<string, unknown>): { envelope: Record<string, unknown>; isError?: boolean } {
  const asUrl = (params: Record<string, unknown>) => {
    const u = new URL(`${ORIGIN}/x`)
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string') u.searchParams.set(k, v)
    return u
  }
  switch (name) {
    case 'listLots': {
      const { rows, miss } = filterList(lots as unknown as Record<string, unknown>[], asUrl(args), ['status', 'gtin'])
      return { envelope: rows.length ? ok(rows) : empty(`no lots match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'getLot': {
      const rec = lots.find((l) => l.id === args.id)
      return rec ? { envelope: ok([rec]) } : { envelope: empty(`no lot with id ${String(args.id)}`), isError: true }
    }
    case 'listProducts': {
      const { rows, miss } = filterList(allProducts() as unknown as Record<string, unknown>[], asUrl(args), ['ftl', 'category'])
      return { envelope: rows.length ? ok(rows) : empty(`no products match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'registerProduct': {
      const { product, problem } = registerProductRecord(args)
      return product ? { envelope: ok([product]) } : { envelope: blocked(problem || 'invalid input'), isError: true }
    }
    case 'listFacilities': {
      const { rows, miss } = filterList(facilities as unknown as Record<string, unknown>[], asUrl(args), ['role'])
      return { envelope: rows.length ? ok(rows) : empty(`no facilities match ${miss?.[0]}=${miss?.[1]}`) }
    }
    case 'listComplianceArtifacts': {
      const { rows, miss } = filterList(complianceArtifacts as unknown as Record<string, unknown>[], asUrl(args), ['kind', 'facilityGln'])
      return { envelope: rows.length ? ok(rows) : empty(`no compliance artifacts match ${miss?.[0]}=${miss?.[1]}`) }
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
        serverInfo: { name: 'apis.farm', version: '0.1.0' },
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
// The fetch pipeline: extended machine face first, site routes second, typed
// 404 last. HEAD mirrors GET everywhere (conneg law A.7.3).
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, _env?: unknown, _ctx?: unknown): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Metering seam for the generator-served collection door.
    if (path === '/lots' && (request.method === 'GET' || request.method === 'HEAD')) {
      emitMeter('listCollection', request)
    }

    const hit = await axpHandler(request)
    if (hit !== undefined) return hit

    if (path === '/mcp') return handleMcp(request)

    const head = request.method === 'HEAD'
    const getLike = request.method === 'GET' || head

    // POST /products — the headless master-data system-of-record door.
    if (path === '/products' && request.method === 'POST') {
      emitMeter('registerProduct', request)
      let input: Record<string, unknown>
      try {
        input = (await request.json()) as Record<string, unknown>
      } catch {
        return envelopeResponse(blocked('the request body must be a JSON object'), { status: 400 })
      }
      const { product, problem } = registerProductRecord(input)
      if (!product) return envelopeResponse(blocked(problem || 'invalid input'), { status: 400 })
      return json(ok([product]), 201)
    }

    if (!getLike) {
      return envelopeResponse(
        { type: 'BLOCKED', reason: `method ${request.method} is not served at ${path}` },
        { status: 405, headers: { allow: 'GET, HEAD' } },
      )
    }

    const idMatch = path.match(/^\/lots\/([A-Za-z0-9_-]+)$/)
    if (idMatch) {
      emitMeter('getLot', request)
      const rec = lots.find((l) => l.id === idMatch[1])
      if (!rec) return json(empty(`no lot with id ${idMatch[1]} — nothing here has been deleted; no such record was ever seeded`), 404, head)
      return json(ok([rec]), 200, head)
    }

    switch (path) {
      case '/products':
        emitMeter('listProducts', request)
        return listResponse(allProducts() as unknown as Record<string, unknown>[], url, ['ftl', 'category'], 'products', head)

      case '/facilities':
        emitMeter('listFacilities', request)
        return listResponse(facilities as unknown as Record<string, unknown>[], url, ['role'], 'facilities', head)

      case '/compliance-artifacts':
        emitMeter('listComplianceArtifacts', request)
        return listResponse(complianceArtifacts as unknown as Record<string, unknown>[], url, ['kind', 'facilityGln'], 'compliance artifacts', head)

      case '/icp.json':
        // G2 coordinates (template §2; stake #6): facts about who this
        // projection serves — no positioning, no claims.
        return json(icpDoc, 200, head)

      case '/verify': {
        const digest = await suiteDigest()
        return json(
          {
            $context: 'https://schema.org.ai',
            $type: 'VerifyExport',
            name: 'apis.farm — run our tests',
            suite: `${ORIGIN}/verify/suite.json`,
            runner: 'api.qa/suite@1',
            digest,
            run: `npx autonomous-qa suite ${ORIGIN}/verify/suite.json --env prod --expect-digest ${digest.replace('sha256:', '')}`,
            declaredOnCard: false,
            declaredOnCardNote:
              'interfaces.testSuite is not declared: the declarative dialect is GET-only and cannot honestly cover the MCP tools and the POST door (A.8.7 coverage). The suite is published and runnable here regardless; card links.verify names this page.',
            conformance: 'https://api.qa/apis.farm',
          },
          200,
          head,
        )
      }

      case '/verify/suite.json':
        return new Response(head ? null : SUITE_TEXT, { status: 200, headers: JSON_CT })

      case '/offer':
        // 402-shaped payable stub (template §7.3) — labeled, never fake billing.
        // Only MOUNTED rungs are advertised: the anon-sandbox floor is the only
        // rung live today, so no checkout or OAuth alternative is named.
        return envelopeResponse(
          offer({
            id: 'stub',
            title: 'payable stub — nothing on this origin is billable today',
            stub: true,
            notice:
              '402-shaped stub served for shape-compatibility with payable siblings; no billing exists behind this door and no payment is accepted (see /pricing: free). The B2D checkout and OAuth free-tier rungs are not mounted yet and are therefore not advertised.',
            alternatives: [
              { rel: 'free', url: `${ORIGIN}/lots`, note: 'every door on this origin is keyless and free' },
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
