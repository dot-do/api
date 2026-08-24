/**
 * email.api.ht/{address} — email address validation: RFC-style syntax check
 * (offline) + live MX lookup over Cloudflare DoH. Does NOT contact the
 * mailbox — deliverability beyond MX presence is not claimed.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, upstreamError } from '../registry'
import { registrableDomain } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
// Pragmatic RFC 5322 subset — the practically deliverable form.
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}@((?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62})$/i

const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com'])
const FREE_PROVIDERS = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com'])

export const emailTool: HypertextTool = {
  name: 'email',
  description: 'Email address validation — syntax check plus live MX verification',
  valueSyntax: '<address>',
  examples: ['hello@cloudflare.com', 'nobody@example.com'],
  source: 'Syntax offline (RFC 5322 subset); MX via Cloudflare DNS over HTTPS (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const address = value.trim().toLowerCase()
    const m = address.match(EMAIL_RE)
    if (!m || address.includes('..')) return badValue(`'${value}' is not a syntactically valid email address`)
    const [local, domain] = [address.slice(0, address.lastIndexOf('@')), m[1]]

    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`
    let mxHosts: { priority: number; exchange: string }[] = []
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/dns-json', 'user-agent': UA } })
      if (!res.ok) throw new Error(`DoH returned ${res.status}`)
      const body = (await res.json()) as { Answer?: { type: number; data: string }[] }
      mxHosts = (body.Answer ?? [])
        .filter((a) => a.type === 15)
        .map((a) => {
          const [priority, exchange = ''] = a.data.split(/\s+/)
          return { priority: Number(priority), exchange: exchange.replace(/\.$/, '') }
        })
        .sort((a, b) => a.priority - b.priority)
    } catch (err) {
      return upstreamError('Cloudflare DoH', (err as Error).message)
    }

    const nullMx = mxHosts.length === 1 && mxHosts[0].exchange === ''
    const registrable = registrableDomain(domain)

    return {
      data: {
        address,
        localPart: local,
        domain: ctx.links.href('dns', domain),
        syntaxValid: true,
        mxFound: mxHosts.length > 0 && !nullMx,
        nullMx,
        mx: mxHosts.map((h) => ({ priority: h.priority, exchange: h.exchange ? ctx.links.href('dns', h.exchange) : null })),
        freeProvider: FREE_PROVIDERS.has(domain),
        disposable: DISPOSABLE.has(domain),
        note: 'MX presence only — mailbox existence and deliverability are not verified.',
        source: this.source,
      },
      links: {
        dns: ctx.links.href('dns', domain),
        whois: ctx.links.href('whois', registrable),
        doh: url,
      },
    }
  },
}
