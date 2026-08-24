/**
 * api.ht link builder — the hypertext grammar.
 *
 * URL grammar: https://[tool].api.ht/[value] — the path IS the query.
 *
 * Carried forward from prior art:
 * - hyper-texts/dbht + apis-dev/db.ht (2022-23): `https://{domain}/{key}` — the
 *   path-is-the-query grammar, optional bearer auth, JSON always.
 * - drivly apis.do envelope: `{ api, data, links, meta }` with absolute URLs in
 *   `links` (reused here via @dotdo/api's respond envelope).
 *
 * Two addressing modes:
 * - subdomain mode (production): request host is `*.api.ht` or `api.ht`
 *   → links are `https://{tool}.api.ht/{value}`
 * - path mode (local dev / *.workers.dev): request host is anything else
 *   → links are `{origin}/{tool}/{value}` so every link stays clickable
 *     against `wrangler dev` on localhost.
 */

export interface LinkContext {
  /** 'subdomain' when serving on the api.ht zone, 'path' otherwise */
  mode: 'subdomain' | 'path'
  /** protocol, e.g. 'https:' */
  protocol: string
  /** apex host — 'api.ht' in subdomain mode, 'localhost:8787' etc. in path mode */
  apexHost: string
  /** tool selected by the request subdomain, if any (subdomain mode only) */
  tool?: string
  /** build an absolute URL to a tool view */
  href: (tool: string, value?: string) => string
  /** build an absolute URL on the apex (landing, docs, login) */
  apex: (path?: string) => string
}

/** Percent-encode a path value but keep ip/domain/phone characters readable. */
export function encodeValue(value: string): string {
  return encodeURIComponent(value)
    .replace(/%3A/gi, ':') // IPv6 — ':' is a legal pchar
    .replace(/%2B/gi, '+') // phone numbers — '+' is a legal pchar
    .replace(/%40/gi, '@') // emails, future tools
    .replace(/%2F/gi, '/') // multi-segment values (shapes: jobs/4266196009) — the router decodes the whole path
}

export function resolveLinkContext(requestUrl: string, apexZone = 'api.ht'): LinkContext {
  const url = new URL(requestUrl)
  const host = url.host.toLowerCase()
  const zone = apexZone.toLowerCase()

  const onZone = host === zone || host.endsWith(`.${zone}`)
  const mode: LinkContext['mode'] = onZone ? 'subdomain' : 'path'
  // Force https on the real zone; respect whatever local dev is using otherwise.
  const protocol = onZone ? 'https:' : url.protocol
  const apexHost = onZone ? zone : host

  let tool: string | undefined
  if (onZone && host !== zone) {
    const sub = host.slice(0, -(zone.length + 1))
    if (sub && sub !== 'www') tool = sub
  }

  const href = (t: string, value?: string): string => {
    const base = mode === 'subdomain' ? `${protocol}//${t}.${apexHost}` : `${protocol}//${apexHost}/${t}`
    if (value === undefined || value === '') return mode === 'subdomain' ? `${base}/` : base
    return `${base}/${encodeValue(value)}`
  }

  const apex = (path = '/'): string => `${protocol}//${apexHost}${path.startsWith('/') ? path : `/${path}`}`

  return { mode, protocol, apexHost, tool, href, apex }
}
