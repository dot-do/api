/**
 * axp.ts — the machine face: vendored axp-faces generator output plus the
 * FOUR ruled estate extensions the generator does not carry yet (batch
 * rollup, binding — bridged EXACTLY here until the upstream re-vendor lands
 * in axp.org.ai; the vendored files are never patched):
 *
 *   1. `/pricing` rate card `rates[]` — TOP-LEVEL in the Pricing Document;
 *      every operation priced from zero with freeQuota (free model), rows
 *      keyed by contract operationIds only
 *   2. card `g2` member — TOP-LEVEL on the card: the row's G2 coordinates
 *      (ICP + Persona + System); the full document is /icp.json (links.icp)
 *   3. card `links.verify` — a card link member → the published suite page
 *   4. per-route `operationId`s injected into the OpenAPI doc — every route,
 *      zero divergence (the rate card may only price declared operationIds)
 *
 * Everything else — collection, llms.txt, home faces — is the vendored
 * generator, untouched.
 */

import {
  createAxpRoutes,
  buildCard,
  buildOpenapi,
  buildPricingDocument,
  envelopeResponse,
  serveFace,
  negotiate,
  // @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
} from './axp-faces/index.js'
import { manifest } from './manifest.ts'
import { SUBSTRATE, ORIGIN, apiProduct } from './substrate.ts'

// ---------------------------------------------------------------------------
// G2 coordinates (template §2; stake #6): facts about who this projection
// serves — no positioning, no claims. Served in full at /icp.json; the card
// carries the same coordinates top-level as `g2`.
// ---------------------------------------------------------------------------

export const icpDoc = {
  $context: 'https://schema.org.ai',
  $type: 'ICP',
  substrate: SUBSTRATE,
  projection: 'apis.farm',
  motion: 'B2D',
  icp: {
    companyType: 'food producers, processors, packers, and distributors (NAICS 311-312) holding FSMA-204 exposure on Food Traceability List items',
    jobTypes: ['QA / food-safety compliance lead', 'supply-chain / ops systems owner'],
  },
  personas: [
    { id: 'compliance-integrator', class: 'human', description: 'a developer integrating a processor’s QA/compliance systems against typed lot and artifact records' },
    { id: 'supply-chain-systems-owner', class: 'human', description: 'an ops systems owner wiring facility and product master data to the traceability rail' },
    { id: 'compliance-agent', class: 'machine', description: 'an agent assembling FSMA-204 deliverables from the lot chain on a principal’s behalf' },
  ],
} as const

// ---------------------------------------------------------------------------
// #1 — the rate card: every operation priced from zero (free model), rows
// keyed by contract operationIds ONLY (the §9.1 subset law).
// ---------------------------------------------------------------------------

export const RATES = [
  { operation: 'listCollection', price: 0, unit: 'call', freeQuota: 'unlimited', note: 'the /lots branching collection (substrate verb listLots)' },
  { operation: 'getLot', price: 0, unit: 'call', freeQuota: 'unlimited' },
  { operation: 'listProducts', price: 0, unit: 'call', freeQuota: 'unlimited' },
  { operation: 'registerProduct', price: 0, unit: 'call', freeQuota: 'unlimited', note: 'sandbox writes are ephemeral and fixture-law-gated (demo prefix 952)' },
  { operation: 'listFacilities', price: 0, unit: 'call', freeQuota: 'unlimited' },
  { operation: 'listComplianceArtifacts', price: 0, unit: 'call', freeQuota: 'unlimited' },
] as const

// ---------------------------------------------------------------------------
// #4 — operationIds for every declared route (method+path → operationId).
// The generator names its own quartet operations (listCollection, getPricing);
// every manifest route gets its id injected here.
// ---------------------------------------------------------------------------

const OPERATION_IDS: Record<string, string> = {
  'GET /lots/{id}': 'getLot',
  'GET /products': 'listProducts',
  'POST /products': 'registerProduct',
  'GET /facilities': 'listFacilities',
  'GET /compliance-artifacts': 'listComplianceArtifacts',
  'GET /icp.json': 'getIcp',
  'GET /verify': 'getVerify',
  'GET /verify/suite.json': 'getVerifySuite',
  'GET /offer': 'getOffer',
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

// ---------------------------------------------------------------------------
// #2 + #3 — the extended capability card.
// ---------------------------------------------------------------------------

export const card = (() => {
  const base = buildCard(manifest) as Record<string, unknown> & { links: Record<string, unknown> }
  return {
    ...base,
    links: { ...base.links, verify: `${ORIGIN}/verify` },
    g2: {
      icp: icpDoc.icp,
      personas: icpDoc.personas,
      systems: apiProduct.systems,
    },
  }
})()

/** #1 — the served /pricing document itself, extended with rates[] top-level.
 *  Unknown members are ignored by the verifier — conformant by construction. */
export const pricingDoc = (() => {
  const base = buildPricingDocument(manifest) as Record<string, unknown>
  return { ...base, rates: RATES }
})()

export const openapiDoc = extendOpenapi(buildOpenapi(manifest) as Record<string, unknown>)

// ---------------------------------------------------------------------------
// The machine-face handler: extended documents first, then the vendored
// generator for everything else. Returns undefined on fall-through.
// ---------------------------------------------------------------------------

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
  md: mdOfJson('apis.farm — pricing (rate card)', pricingDoc),
  html: htmlOfJson('apis.farm — pricing (rate card)', pricingDoc),
}

const generatorRoutes = createAxpRoutes(manifest)

const OVERRIDDEN = new Set(['/.well-known/agents.json', '/openapi.json', '/pricing', '/pricing.json', '/pricing.md', '/pricing.html'])

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
