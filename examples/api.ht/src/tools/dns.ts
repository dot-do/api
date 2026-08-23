/**
 * dns.api.ht/{name} — DNS lookups over Cloudflare DNS-over-HTTPS (live).
 *
 * Every answer that references another entity is an absolute URL:
 * A/AAAA records link into ip.api.ht, NS/CNAME/MX targets link back into
 * dns.api.ht, and the registrable domain links into whois.api.ht.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, upstreamError } from '../registry'
import { registrableDomain } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query'
const DEFAULT_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'] as const
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i

interface DohAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

const TYPE_NUMBERS: Record<string, number> = { A: 1, AAAA: 28, CNAME: 5, MX: 15, NS: 2, TXT: 16, SOA: 6, PTR: 12, SRV: 33, CAA: 257 }

async function queryDoh(fetcher: typeof fetch, name: string, type: string): Promise<DohAnswer[]> {
  const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=${type}`
  const res = await fetcher(url, { headers: { accept: 'application/dns-json', 'user-agent': UA } })
  if (!res.ok) throw new Error(`DoH ${type} query returned ${res.status}`)
  const body = (await res.json()) as { Answer?: DohAnswer[] }
  return body.Answer ?? []
}

const stripDot = (s: string) => s.replace(/\.$/, '')
const stripQuotes = (s: string) => s.replace(/^"|"$/g, '').replace(/" "/g, '')

export const dnsTool: HypertextTool = {
  name: 'dns',
  description: 'DNS records for a hostname — answers link into ip, dns, and whois views',
  valueSyntax: '<hostname>',
  examples: ['startups.studio', 'cloudflare.com', 'one.one.one.one'],
  source: 'Cloudflare DNS over HTTPS (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const name = stripDot(value.trim().toLowerCase())
    if (!HOSTNAME_RE.test(name)) return badValue(`'${value}' is not a valid hostname`)

    const requested = ctx.query.type?.toUpperCase()
    if (requested && !(requested in TYPE_NUMBERS)) {
      return badValue(`Unsupported record type '${requested}' (supported: ${Object.keys(TYPE_NUMBERS).join(', ')})`)
    }
    const types = requested ? [requested] : [...DEFAULT_TYPES]

    let answers: DohAnswer[][]
    try {
      answers = await Promise.all(types.map((t) => queryDoh(ctx.fetch, name, t)))
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const records: Record<string, unknown[]> = {}
    types.forEach((type, i) => {
      const wanted = TYPE_NUMBERS[type]
      const rows = answers[i].filter((a) => a.type === wanted)
      if (rows.length === 0) return
      records[type] = rows.map((a) => {
        switch (type) {
          case 'A':
          case 'AAAA':
            return ctx.links.href('ip', a.data)
          case 'NS':
          case 'CNAME':
          case 'PTR':
            return ctx.links.href('dns', stripDot(a.data))
          case 'MX': {
            const [priority, exchange] = a.data.split(/\s+/)
            return { priority: Number(priority), exchange: ctx.links.href('dns', stripDot(exchange ?? '')) }
          }
          case 'TXT':
            return stripQuotes(a.data)
          default:
            return a.data
        }
      })
    })

    const registrable = registrableDomain(name)

    return {
      data: {
        name,
        type: requested ?? 'ANY (A, AAAA, CNAME, MX, NS, TXT)',
        records,
        registrableDomain: ctx.links.href('whois', registrable),
        source: this.source,
      },
      links: {
        whois: ctx.links.href('whois', registrable),
        apex: registrable !== name ? ctx.links.href('dns', registrable) : undefined,
        doh: `${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=A`,
      },
    }
  },
}
