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
 *   npx autonomous-qa suite https://apis.productions/verify/suite.json --env prod
 */

const suiteDoc = {
  $type: 'Suite',
  name: 'apis-productions-public-contract',
  version: '1',
  description:
    'The apis.productions public-contract suite: every row is a keyless GET against the live doors — the typed branching collection, record reads, the free Pricing Document, the ICP document, and the labeled 402 offer stub. Runnable by anyone; passing is the claim.',
  environments: {
    prod: { vars: { baseUrl: 'https://apis.productions' } },
  },
  requirements: [
    {
      id: 'productions-keyless-ok [openapi:listCollection]',
      kind: 'endpoint',
      method: 'GET',
      path: '/productions',
      expect: {
        status: 200,
        contentTypeIncludes: 'application/json',
        paths: [{ path: 'type', equals: 'OK' }],
      },
    },
    {
      id: 'productions-branch-empty [openapi:listCollection]',
      kind: 'endpoint',
      method: 'GET',
      path: '/productions?kind=none',
      expect: { status: 200, paths: [{ path: 'type', equals: 'EMPTY' }] },
    },
    {
      id: 'production-by-id [openapi:GET /productions/{id}]',
      kind: 'endpoint',
      method: 'GET',
      path: '/productions/prod_0001',
      expect: {
        status: 200,
        paths: [
          { path: 'type', equals: 'OK' },
          { path: 'results.0.id', equals: 'prod_0001' },
          { path: 'results.0.example', equals: true },
        ],
      },
    },
    {
      id: 'assets-list [openapi:GET /assets]',
      kind: 'endpoint',
      method: 'GET',
      path: '/assets',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'pages-list [openapi:GET /pages]',
      kind: 'endpoint',
      method: 'GET',
      path: '/pages',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'audience-signals-list [openapi:GET /audience-signals]',
      kind: 'endpoint',
      method: 'GET',
      path: '/audience-signals',
      expect: { status: 200, paths: [{ path: 'type', equals: 'OK' }] },
    },
    {
      id: 'pricing-free [openapi:getPricing]',
      kind: 'endpoint',
      method: 'GET',
      path: '/pricing',
      expect: { status: 200, paths: [{ path: 'model', equals: 'free' }] },
    },
    {
      id: 'icp-served [openapi:GET /icp.json]',
      kind: 'endpoint',
      method: 'GET',
      path: '/icp.json',
      expect: { status: 200, contentTypeIncludes: 'application/json' },
    },
    {
      id: 'offer-is-a-labeled-stub [openapi:GET /offer]',
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
