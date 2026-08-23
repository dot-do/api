/**
 * verify-suite.ts — the published public-contract suite (template §4.3:
 * "trust us" → "run this"). Declarative api.qa/suite@1 dialect, GET-only.
 *
 * SUITE_TEXT is the EXACT byte payload served at /verify/suite.json — the
 * digest over these bytes is the pin a runner asserts with --expect-digest.
 * Rows carry [openapi:…] coverage tags so the day interfaces.testSuite is
 * declared (see src/manifest.ts), the coverage map is already honest for the
 * GET surface.
 *
 * Run against the live origin (once the apis.farm zone is provisioned —
 * currently name-only, no CF zone):
 *   npx autonomous-qa suite https://apis.farm/verify/suite.json --env prod
 */

const suiteDoc = {
  $type: 'Suite',
  name: 'apis-farm-public-contract',
  version: '1',
  description:
    'The apis.farm public-contract suite: every row is a keyless GET against the live doors — the typed branching lot collection, record reads, the free Pricing Document with its per-operation rate card, the ICP document, and the labeled 402 offer stub. Runnable by anyone; passing is the claim.',
  environments: {
    prod: { vars: { baseUrl: 'https://apis.farm' } },
  },
  requirements: [
    {
      id: 'lots-keyless-ok [openapi:listCollection]',
      kind: 'endpoint',
      method: 'GET',
      path: '/lots',
      expect: {
        status: 200,
        contentTypeIncludes: 'application/json',
        paths: [{ path: 'type', equals: 'OK' }],
      },
    },
    {
      id: 'lots-branch-empty [openapi:listCollection]',
      kind: 'endpoint',
      method: 'GET',
      path: '/lots?status=none',
      expect: { status: 200, paths: [{ path: 'type', equals: 'EMPTY' }] },
    },
    {
      id: 'lot-by-id-with-chain [openapi:getLot]',
      kind: 'endpoint',
      method: 'GET',
      path: '/lots/lot_0003',
      expect: {
        status: 200,
        paths: [
          { path: 'type', equals: 'OK' },
          { path: 'results.0.id', equals: 'lot_0003' },
          { path: 'results.0.example', equals: true },
          { path: 'results.0.cteRefs.0.rail', equals: 'https://epcis.dev' },
        ],
      },
    },
    {
      id: 'products-list [openapi:listProducts]',
      kind: 'endpoint',
      method: 'GET',
      path: '/products',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'facilities-list [openapi:listFacilities]',
      kind: 'endpoint',
      method: 'GET',
      path: '/facilities',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'compliance-artifacts-list [openapi:listComplianceArtifacts]',
      kind: 'endpoint',
      method: 'GET',
      path: '/compliance-artifacts',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'pricing-free-with-rates [openapi:getPricing]',
      kind: 'endpoint',
      method: 'GET',
      path: '/pricing',
      expect: {
        status: 200,
        paths: [
          { path: 'model', equals: 'free' },
          { path: 'rates.0.price', equals: 0 },
        ],
      },
    },
    {
      id: 'icp-served [openapi:getIcp]',
      kind: 'endpoint',
      method: 'GET',
      path: '/icp.json',
      expect: { status: 200, contentTypeIncludes: 'application/json' },
    },
    {
      id: 'offer-is-a-labeled-stub [openapi:getOffer]',
      kind: 'endpoint',
      method: 'GET',
      path: '/offer',
      expect: {
        status: 402,
        paths: [
          { path: 'type', equals: 'OFFER' },
          { path: 'stub', equals: true },
        ],
      },
    },
  ],
}

/** The exact bytes served at /verify/suite.json. */
export const SUITE_TEXT = JSON.stringify(suiteDoc, null, 2) + '\n'

/** sha256 over SUITE_TEXT, computed once, lazily (Workers + Node crypto.subtle). */
let digestPromise: Promise<string> | undefined
export function suiteDigest(): Promise<string> {
  digestPromise ||= crypto.subtle.digest('SHA-256', new TextEncoder().encode(SUITE_TEXT)).then((buf) => {
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
    return `sha256:${hex}`
  })
  return digestPromise
}
