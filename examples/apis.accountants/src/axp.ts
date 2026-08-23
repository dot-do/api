/**
 * axp.ts — the machine face: vendored axp-faces generator output plus the
 * estate extensions the generator does not carry yet (each recorded as a
 * generator gap in the README, to be fixed in axp.org.ai and re-vendored —
 * never patched into the vendored files):
 *
 *   1. `/pricing` rate card `rates[]` + mirrored `offers` (DRAFT §2 extension;
 *      unknown members are ignored by the verifier — conformant by construction)
 *   2. card `links.verify` → the published suite page (spec §4.1)
 *   3. card `g2` member — the row's G2 coordinates (ICP + Persona + System
 *      coordinate) exposed on the card per stake #6; the full document is
 *      `/icp.json` (card `links.icp`)
 *   4. per-route operationIds injected into the OpenAPI doc (the rate card may
 *      only price operationIds the contract declares)
 *
 * Everything else — collection, llms.txt, family, offer, home faces — is the
 * vendored generator, untouched.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { createAxpRoutes } from '../axp/routes.js'
// @ts-ignore vendored
import { buildCard } from '../axp/card.js'
// @ts-ignore vendored
import { buildOpenapi } from '../axp/openapi.js'
// @ts-ignore vendored
import { buildPricingDocument } from '../axp/pricing.js'
// @ts-ignore vendored
import { serveFace, negotiate } from '../axp/conneg.js'
// @ts-ignore vendored
import { envelopeResponse } from '../axp/envelope.js'
import { buildManifest, ORIGIN, RATES } from './manifest'
import { OPERATIONS, substrate } from './substrate'
import icp from './icp'

export const manifest = buildManifest()

/** #4 — operationIds for every declared route (method+path → operationId). */
const OPERATION_IDS: Record<string, string> = {
  ...Object.fromEntries(OPERATIONS.map((o) => [`${o.method} ${o.path}`, o.operation])),
  'GET /icp.json': 'getIcp',
  'GET /verify': 'getVerify',
  'GET /checkout': 'getCheckout',
}

function extendOpenapi(doc: Record<string, unknown>): Record<string, unknown> {
  const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const key = `${method.toUpperCase()} ${path}`
      if (OPERATION_IDS[key]) op.operationId = OPERATION_IDS[key]
    }
  }
  return doc
}

/** #2 + #3 — the extended capability card. */
export const card = (() => {
  const base = buildCard(manifest)
  return {
    ...base,
    links: { ...base.links, verify: `${ORIGIN}/verify` },
    g2: {
      icp: icp.icp,
      personas: icp.personas,
      systems: substrate.systems,
    },
  }
})()

/** #1 — the rate card: the served /pricing document itself, extended. */
export const pricingDoc = (() => {
  const base = buildPricingDocument(manifest)
  return {
    ...base,
    rates: RATES,
    // A.5 offers mirrored here for one-document reads (DRAFT §2)
    offers: (manifest as { pricing: { offers: unknown } }).pricing.offers,
  }
})()

export const openapiDoc = extendOpenapi(buildOpenapi(manifest) as Record<string, unknown>)

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

function jsonResponse(obj: unknown, head: boolean): Response {
  return new Response(head ? null : JSON.stringify(obj, null, 2), { status: 200, headers: JSON_CT })
}

function mdOfJson(title: string, obj: unknown): string {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`
}

function htmlOfJson(title: string, obj: unknown): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`
}

const pricingFaces = {
  json: pricingDoc,
  md: mdOfJson('apis.accountants — pricing (rate card)', pricingDoc),
  html: htmlOfJson('apis.accountants — pricing (rate card)', pricingDoc),
}

const generatorRoutes = createAxpRoutes(manifest)

const OVERRIDDEN = new Set(['/.well-known/agents.json', '/openapi.json', '/pricing', '/pricing.json', '/pricing.md', '/pricing.html'])

/**
 * The machine-face handler: extended documents first, then the vendored
 * generator for everything it serves. Returns undefined on fall-through.
 */
export async function axpHandler(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url)
  const path = url.pathname

  if (OVERRIDDEN.has(path)) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return envelopeResponse(
        { type: 'BLOCKED', reason: `method ${request.method} is not served at ${path} — this address answers GET and HEAD` },
        { status: 405, headers: { allow: 'GET, HEAD' } },
      )
    }
    const head = request.method === 'HEAD'
    if (path === '/.well-known/agents.json') return jsonResponse(card, head)
    if (path === '/openapi.json') return jsonResponse(openapiDoc, head)
    const { face } = negotiate(request, path, {})
    return serveFace(request, url, pricingFaces, face, { cleanPath: '/pricing' })
  }

  return generatorRoutes(request, undefined)
}
