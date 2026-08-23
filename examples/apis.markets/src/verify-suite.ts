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
 * Run against the live origin:
 *   npx autonomous-qa suite https://apis.markets/verify/suite.json --env prod
 */

const suiteDoc = {
  $type: 'Suite',
  name: 'apis-markets-public-contract',
  version: '1',
  description:
    'The apis.markets public-contract suite: every row is a keyless GET against the live doors — the typed branching collection, record reads, the free Pricing Document with its top-level zero-priced rate card, the ICP document, and the labeled 402 offer stub. Runnable by anyone; passing is the claim.',
  environments: {
    prod: { vars: { baseUrl: 'https://apis.markets' } },
  },
  requirements: [
    {
      id: 'instruments-keyless-ok [openapi:listCollection]',
      kind: 'endpoint',
      method: 'GET',
      path: '/instruments',
      expect: {
        status: 200,
        contentTypeIncludes: 'application/json',
        paths: [{ path: 'type', equals: 'OK' }],
      },
    },
    {
      id: 'instruments-branch-empty [openapi:listCollection]',
      kind: 'endpoint',
      method: 'GET',
      path: '/instruments?assetClass=none',
      expect: { status: 200, paths: [{ path: 'type', equals: 'EMPTY' }] },
    },
    {
      id: 'instrument-by-id [openapi:getInstrument]',
      kind: 'endpoint',
      method: 'GET',
      path: '/instruments/ins_0001',
      expect: {
        status: 200,
        paths: [
          { path: 'type', equals: 'OK' },
          { path: 'results.0.id', equals: 'ins_0001' },
          { path: 'results.0.example', equals: true },
        ],
      },
    },
    {
      id: 'quotes-list [openapi:listQuotes]',
      kind: 'endpoint',
      method: 'GET',
      path: '/quotes',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'positions-list [openapi:listPositions]',
      kind: 'endpoint',
      method: 'GET',
      path: '/positions',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'position-by-id [openapi:getPosition]',
      kind: 'endpoint',
      method: 'GET',
      path: '/positions/pos_0001',
      expect: {
        status: 200,
        paths: [
          { path: 'type', equals: 'OK' },
          { path: 'results.0.example', equals: true },
        ],
      },
    },
    {
      id: 'post-trade-documents-list [openapi:listPostTradeDocuments]',
      kind: 'endpoint',
      method: 'GET',
      path: '/post-trade-documents',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'pricing-free-with-toplevel-rates [openapi:getPricing]',
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
      id: 'icp-served [openapi:getICP]',
      kind: 'endpoint',
      method: 'GET',
      path: '/icp.json',
      expect: { status: 200, contentTypeIncludes: 'application/json' },
    },
    {
      id: 'offer-is-a-labeled-stub [openapi:getOfferStub]',
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
