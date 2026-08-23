/**
 * faces.d.ts — TypeScript face of the VENDORED axp-faces generator (see
 * PINS.json: package axp-faces@0.1.0, pinned spec apis-ax-axp@2.6.0).
 *
 * The .js sources in this directory are byte-identical vendored copies from
 * axp.org.ai/packages/axp-faces (the estate's shared AXP machine-face
 * generator) — never edited here; a needed change lands upstream and
 * re-vendors. This declaration file is LOCAL (not part of the pinned bytes):
 * it only types the surface this site consumes.
 */

export type Face = 'html' | 'json' | 'md'

export declare const FACES: readonly Face[]
export declare const FACE_CONTENT_TYPE: Readonly<Record<Face, string>>
export declare const FACE_MEDIA_TYPE: Readonly<Record<Face, string>>
export declare const AGENT_UA_TOKENS: readonly string[]
export declare const UNFURL_UA_TOKENS: readonly string[]
export declare const CONNEG_VARY: string

export declare function faceFromExtension(pathname: string): { face: Face; cleanPath: string } | null
export declare function faceFromAccept(accept: string | null | undefined): Face | null
export declare function faceFromClientClass(request: Request, opts?: { unfurlHtml?: boolean }): Face
export declare function negotiate(
  request: Request,
  pathname: string,
  opts?: { unfurlHtml?: boolean },
): { face: Face; cleanPath: string; via: 'address' | 'accept' | 'client-class' }
export declare function faceAddress(cleanPath: string, face: Face): string
export declare function linkAlternates(
  cleanPath: string,
  opts?: { faces?: readonly Face[]; addresses?: Partial<Record<Face, string>> },
): string

export type FaceSource =
  | string
  | object
  | ((request: Request, url: URL) => string | object | Response | Promise<string | object | Response>)

export declare function serveFace(
  request: Request,
  url: URL,
  faces: Partial<Record<Face, FaceSource>>,
  face: Face,
  opts?: {
    cleanPath?: string
    status?: number
    headers?: Record<string, string>
    addresses?: Partial<Record<Face, string>>
  },
): Promise<Response>

export declare function serveNegotiated(
  request: Request,
  url: URL,
  faces: Partial<Record<Face, FaceSource>>,
  opts?: {
    cleanPath?: string
    status?: number
    headers?: Record<string, string>
    addresses?: Partial<Record<Face, string>>
    unfurlHtml?: boolean
  },
): Promise<Response>

// envelope.js — the typed outcome helpers (OK | EMPTY | BLOCKED | OFFER)
export declare function ok(
  results: unknown,
  opts?: { memberName?: string; extra?: Record<string, unknown> },
): { type: 'OK' } & Record<string, unknown>
export declare function empty(
  message: string,
  opts?: { memberName?: string },
): { type: 'EMPTY'; message: string } & Record<string, unknown>
export declare function blocked(reason: string): { type: 'BLOCKED'; reason: string }
export declare function offer(body: Record<string, unknown>): { type: 'OFFER' } & Record<string, unknown>
export declare function envelopeResponse(
  body: Record<string, unknown>,
  opts?: { status?: number; headers?: Record<string, string> },
): Response
export declare function collectionDecision(
  manifest: Record<string, unknown>,
  searchParams: URLSearchParams,
): { status: number; body: Record<string, unknown> }

// manifest.js / card.js / coverage.js — consumed for probe/coverage derivation
export declare function defineSiteManifest(input: Record<string, unknown>): Record<string, unknown>
export declare function buildProbes(manifest: Record<string, unknown>): Record<string, unknown>
export declare function buildCard(manifest: Record<string, unknown>): Record<string, unknown>
export declare function httpInterfaces(manifest: Record<string, unknown>): Array<{ method: string; url: string }>
export declare function buildOpenapi(manifest: Record<string, unknown>): Record<string, unknown>
export declare function buildPricingDocument(manifest: Record<string, unknown>): Record<string, unknown>
export declare function buildLlmsTxt(manifest: Record<string, unknown>): string
export declare function buildFamilyRegistry(manifest: Record<string, unknown>): Record<string, unknown>
export declare function createAxpRoutes(
  manifest: Record<string, unknown>,
  opts?: { unfurlHtml?: boolean },
): (request: Request, env?: unknown) => Promise<Response | undefined>
export declare function coverageDomain(manifest: Record<string, unknown>): readonly string[]
export declare function coverageTag(id: string): string
export declare function tagsIn(name: string): string[]
export declare function auditCoverage(input: {
  domain: readonly string[]
  coverage?: Record<string, string[]>
  results: Array<{ name: string; passed: boolean }>
}): string[]
export declare function operationId(method: string, path: string, op?: { operationId?: string }): string
export declare const COVERAGE_TAG_RE: RegExp
