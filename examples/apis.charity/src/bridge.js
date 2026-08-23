/**
 * bridge.js — the four RULED extension placements (batch-2 watch list,
 * binding; zero divergence): members the pinned vendored generator
 * (axp-faces 0.1.0 @ apis-ax-axp@2.6.0) does not emit yet, bridged EXACTLY
 * here until the upstream re-vendor lands. The vendored files are NEVER
 * edited (byte-identical at the PINS.json digest); this module post-composes
 * the generated documents:
 *
 *   1. `rates[]` TOP-LEVEL in the Pricing Document (operationId-keyed rate
 *      card; also carried on offers[0].rates as before);
 *   2. `g2` TOP-LEVEL on the capability card ({ icp, personas, motion });
 *   3. `links.verify` as a card link member (→ the /verify export);
 *   4. `operationId` on EVERY route operation in the OpenAPI contract
 *      (the generator ids its own quartet operations; manifest routes get
 *      theirs from OPERATION_IDS).
 *
 * Additive only: every pinned requirement reads the same members it read
 * before — the bridged documents remain conformant at the pinned digest.
 */

import { buildCard, buildOpenapi, buildPricingDocument, negotiate, serveFace, envelopeResponse } from './axp-faces/index.js'
import { manifest, RATE_ROWS, OPERATION_IDS, ORIGIN } from './manifest.js'
import { projection } from './projection.js'

/** 2 + 3 — the card: g2 top-level; links.verify as a link member. */
export const bridgedCard = (() => {
  const card = buildCard(manifest)
  return {
    ...card,
    g2: {
      icp: projection.icp,
      personas: projection.personas,
      motion: projection.motion,
    },
    links: { ...card.links, verify: `${ORIGIN}/verify` },
  }
})()

/** 1 — the Pricing Document: rates[] top-level. */
export const bridgedPricing = (() => {
  const doc = buildPricingDocument(manifest)
  return { ...doc, rates: RATE_ROWS }
})()

/** 4 — the OpenAPI contract: operationId on every route operation. */
export const bridgedOpenapi = (() => {
  const doc = buildOpenapi(manifest)
  const paths = {}
  for (const [p, ops] of Object.entries(doc.paths)) {
    const rebuilt = {}
    for (const [method, op] of Object.entries(ops)) {
      const key = `${method.toUpperCase()} ${p}`
      rebuilt[method] =
        op.operationId !== undefined
          ? op
          : { operationId: OPERATION_IDS[key], ...op }
      if (rebuilt[method].operationId === undefined) {
        throw new Error(`bridge: no operationId for route ${key} — the ruled placement demands one on every route`)
      }
    }
    paths[p] = rebuilt
  }
  return { ...doc, paths }
})()

const JSON_CT = { 'content-type': 'application/json; charset=utf-8' }

function jsonResponse(obj, { head = false, status = 200 } = {}) {
  return new Response(head ? null : JSON.stringify(obj, null, 2), { status, headers: JSON_CT })
}

function mdOfJson(title, obj) {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`
}

function htmlOfJson(title, obj) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>\n<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>\n`
}

const pricingFaces = {
  json: bridgedPricing,
  md: mdOfJson(`${manifest.name} — pricing`, bridgedPricing),
  html: htmlOfJson(`${manifest.name} — pricing`, bridgedPricing),
}

const BRIDGED_PATHS = new Set([
  '/.well-known/agents.json',
  '/openapi.json',
  '/pricing',
  '/pricing.json',
  '/pricing.md',
  '/pricing.html',
])

/**
 * Serve the three bridged documents with the same semantics the vendored
 * router gives them (HEAD mirrors GET; non-GET answers 405 typed with
 * Allow; /pricing conneg-negotiates, its face addresses force). Returns
 * undefined for any other path — mount BEFORE the vendored router.
 */
export function bridgedRoutes(request) {
  const url = new URL(request.url)
  const path = url.pathname
  if (!BRIDGED_PATHS.has(path)) return undefined

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return envelopeResponse(
      { type: 'BLOCKED', reason: `method ${request.method} is not served at ${path} — this address answers GET and HEAD` },
      { status: 405, headers: { allow: 'GET, HEAD' } },
    )
  }
  const head = request.method === 'HEAD'

  if (path === '/.well-known/agents.json') return jsonResponse(bridgedCard, { head })
  if (path === '/openapi.json') return jsonResponse(bridgedOpenapi, { head })

  // /pricing and its three face addresses
  const { face } = negotiate(request, path, {})
  return serveFace(request, url, pricingFaces, face, { cleanPath: '/pricing' })
}
