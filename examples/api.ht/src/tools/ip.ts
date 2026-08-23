/**
 * ip.api.ht/{ip} — IP intelligence.
 *
 * Live sources: RIPEstat prefix-overview (ASN + holder + announced prefix) and
 * Cloudflare DoH PTR (reverse DNS). The owning-organization link is derived
 * from the ASN holder (curated table for well-known ASNs, heuristic slug
 * otherwise) and points into the Wikipedia-backed entity layer.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, upstreamError } from '../registry'
import { asnToEntitySlug, registrableDomain } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
const IPV6_RE = /^[0-9a-f:]+$/i

export function ipVersion(value: string): 4 | 6 | null {
  const m = value.match(IPV4_RE)
  if (m) return m.slice(1).every((o) => Number(o) <= 255) ? 4 : null
  if (value.includes(':') && IPV6_RE.test(value) && value.length >= 3) return 6
  return null
}

/** Expand an IPv6 address into its 32-nibble reverse zone name. */
export function ipv6PtrName(ip: string): string {
  const [head, tail = ''] = ip.toLowerCase().split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  const groups = [...headGroups, ...Array(Math.max(missing, 0)).fill('0'), ...tailGroups]
  const nibbles = groups.map((g) => g.padStart(4, '0')).join('')
  return `${nibbles.split('').reverse().join('.')}.ip6.arpa`
}

export function ipv4PtrName(ip: string): string {
  return `${ip.split('.').reverse().join('.')}.in-addr.arpa`
}

interface RipePrefixOverview {
  data?: {
    resource?: string
    announced?: boolean
    asns?: { asn: number; holder?: string }[]
  }
}

export const ipTool: HypertextTool = {
  name: 'ip',
  description: 'IP address intelligence — network, ASN, owning organization, reverse DNS',
  valueSyntax: '<ipv4|ipv6>',
  examples: ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'],
  source: 'RIPEstat prefix-overview + Cloudflare DoH PTR (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const ip = value.trim()
    const version = ipVersion(ip)
    if (!version) return badValue(`'${value}' is not a valid IPv4 or IPv6 address`)

    const ripeUrl = `https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(ip)}`
    const ptrName = version === 4 ? ipv4PtrName(ip) : ipv6PtrName(ip)
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(ptrName)}&type=PTR`

    let ripe: RipePrefixOverview | undefined
    let ptrs: string[] = []
    try {
      const [ripeRes, dohRes] = await Promise.all([
        ctx.fetch(ripeUrl, { headers: { 'user-agent': UA } }),
        ctx.fetch(dohUrl, { headers: { accept: 'application/dns-json', 'user-agent': UA } }),
      ])
      if (!ripeRes.ok) throw new Error(`RIPEstat returned ${ripeRes.status}`)
      ripe = (await ripeRes.json()) as RipePrefixOverview
      if (dohRes.ok) {
        const doh = (await dohRes.json()) as { Answer?: { type: number; data: string }[] }
        ptrs = (doh.Answer ?? []).filter((a) => a.type === 12).map((a) => a.data.replace(/\.$/, ''))
      }
    } catch (err) {
      return upstreamError('RIPEstat / Cloudflare DoH', (err as Error).message)
    }

    const asnRow = ripe?.data?.asns?.[0]
    const orgSlug = asnRow ? asnToEntitySlug(asnRow.asn, asnRow.holder) : undefined
    const primaryPtr = ptrs[0]

    return {
      data: {
        ip,
        version: `IPv${version}`,
        prefix: ripe?.data?.resource,
        announced: ripe?.data?.announced ?? false,
        asn: asnRow ? ctx.links.href('asn', String(asnRow.asn)) : null,
        asnHolder: asnRow?.holder ?? null,
        organization: orgSlug ? ctx.links.href('entity', orgSlug) : null,
        hostname: primaryPtr ? ctx.links.href('dns', primaryPtr) : null,
        reverseDns: ptrs.map((p) => ctx.links.href('dns', p)),
        sources: {
          network: 'RIPEstat prefix-overview (live)',
          reverseDns: 'Cloudflare DNS over HTTPS PTR (live)',
          organization: 'derived from ASN holder (curated table + heuristic)',
        },
      },
      links: {
        asn: asnRow ? ctx.links.href('asn', String(asnRow.asn)) : undefined,
        hostDomain: primaryPtr ? ctx.links.href('whois', registrableDomain(primaryPtr)) : undefined,
        rdap: `https://rdap.org/ip/${ip}`,
        ripestat: ripeUrl,
      },
    }
  },
}
