/**
 * axp.ts — the machine face: the vendored axp-faces generator (0.3.0,
 * axp-ext-rates-g2@0.2.0 native), unwrapped. The four estate members
 * (pricing `rates[]`, card `links.verify`, card `g2`, per-route operationIds)
 * are NATIVE generator inputs — declared in ./manifest.ts, validated
 * fail-closed at `defineSiteManifest`, emitted at the ruled placements by
 * the generator itself. No hand-patched documents, no overridden routes:
 * one manifest in, the quartet out.
 */

// @ts-ignore vendored plain-ESM JS (byte-identical, PINS.json-digested)
import { createAxpRoutes } from '../axp/routes.js'
// @ts-ignore vendored
import { buildCard } from '../axp/card.js'
// @ts-ignore vendored
import { buildOpenapi } from '../axp/openapi.js'
// @ts-ignore vendored
import { buildPricingDocument } from '../axp/pricing.js'
import { buildManifest } from './manifest'

export const manifest = buildManifest()

/** The generated documents — pure generator output, exported for the tests. */
export const card = buildCard(manifest)
export const pricingDoc = buildPricingDocument(manifest)
export const openapiDoc = buildOpenapi(manifest)

const generatorRoutes = createAxpRoutes(manifest)

/**
 * The machine-face handler: the vendored generator serves everything it owns
 * (card, contract, pricing faces, llms.txt, family, offer, collection, home).
 * Returns undefined on fall-through.
 */
export async function axpHandler(request: Request): Promise<Response | undefined> {
  return generatorRoutes(request, undefined)
}
