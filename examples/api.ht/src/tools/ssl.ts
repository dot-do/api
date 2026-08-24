/**
 * ssl.api.ht/{domain} — certificate-transparency view over Cert Spotter (live).
 * Workers can't open raw TLS sockets, so cert data comes from CT logs, not a
 * live handshake — the response says so. Cross-links into dns and whois.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'
import { registrableDomain } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i

interface Issuance {
  id?: string
  tbs_sha256?: string
  dns_names?: string[]
  not_before?: string
  not_after?: string
  issuer?: { friendly_name?: string; name?: string }
}

export const sslTool: HypertextTool = {
  name: 'ssl',
  description: 'TLS certificates for a domain from Certificate Transparency logs',
  valueSyntax: '<hostname>',
  examples: ['example.com', 'cloudflare.com'],
  source: 'SSLMate Cert Spotter CT API (live) — CT logs, not a live handshake',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const name = value.trim().toLowerCase().replace(/\.$/, '')
    if (!HOSTNAME_RE.test(name)) return badValue(`'${value}' is not a valid hostname`)

    const url = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(name)}&include_subdomains=false&expand=dns_names&expand=issuer`
    let issuances: Issuance[]
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 429) return upstreamError(this.source, 'Cert Spotter rate limit reached — retry later')
      if (!res.ok) throw new Error(`Cert Spotter returned ${res.status}`)
      issuances = (await res.json()) as Issuance[]
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    if (issuances.length === 0) return notFoundValue(`No certificates found in CT logs for '${name}'`)

    const now = Date.now()
    const certs = issuances.slice(0, 20).map((i) => ({
      issuer: i.issuer?.friendly_name ?? i.issuer?.name ?? null,
      notBefore: i.not_before ?? null,
      notAfter: i.not_after ?? null,
      active: !!(i.not_before && i.not_after && Date.parse(i.not_before) <= now && now <= Date.parse(i.not_after)),
      dnsNames: (i.dns_names ?? []).map((d) => (d.startsWith('*.') ? d : ctx.links.href('dns', d))),
      sha256: i.tbs_sha256 ?? null,
    }))
    const registrable = registrableDomain(name)

    return {
      data: {
        domain: name,
        certificatesFound: issuances.length,
        certificates: certs,
        note: 'From Certificate Transparency logs (what CAs issued), not a live TLS handshake.',
        source: this.source,
      },
      links: {
        dns: ctx.links.href('dns', name),
        whois: ctx.links.href('whois', registrable),
        certSpotter: url,
        crtSh: `https://crt.sh/?q=${encodeURIComponent(name)}`,
      },
    }
  },
}
