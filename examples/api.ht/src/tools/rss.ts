/**
 * rss.api.ht/{feed-url} — fetch and parse an RSS/Atom feed (live).
 * Guarded: https only, public hostnames only (no IP literals / localhost),
 * response capped at 512KB. Parsing is regex-based (headline extraction),
 * not a full XML parser — labeled in the response.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, upstreamError } from '../registry'
import { registrableDomain } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const MAX_BYTES = 512 * 1024
const HOSTNAME_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()
}

function firstTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? decodeEntities(m[1]) : undefined
}

export const rssTool: HypertextTool = {
  name: 'rss',
  description: 'RSS/Atom feed reader — headlines and links from any public https feed',
  valueSyntax: '<feed-url> (https only)',
  examples: ['https://hnrss.org/frontpage', 'https://blog.cloudflare.com/rss'],
  source: 'The feed itself (live fetch, https, public hosts only); regex extraction — not a full XML parser',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    let url: URL
    try {
      url = new URL(value.includes('://') ? value : `https://${value}`)
    } catch {
      return badValue(`'${value}' is not a URL`)
    }
    if (url.protocol !== 'https:') return badValue('Only https feeds are fetched')
    if (!HOSTNAME_RE.test(url.hostname) || url.hostname === 'localhost') return badValue(`'${url.hostname}' is not a public hostname`)
    if (url.port && url.port !== '443') return badValue('Only port 443 is fetched')

    let xml: string
    try {
      const res = await ctx.fetch(url.toString(), { headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'user-agent': UA }, redirect: 'follow' })
      if (!res.ok) return upstreamError('feed host', `${url.hostname} returned ${res.status}`)
      xml = (await res.text()).slice(0, MAX_BYTES)
    } catch (err) {
      return upstreamError('feed host', (err as Error).message)
    }

    const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml)
    const itemRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi
    const chunks = xml.match(itemRe) ?? []
    if (chunks.length === 0 && !/<(rss|feed|channel)[\s>]/i.test(xml)) {
      return badValue(`'${url.hostname}' did not return an RSS or Atom feed`)
    }

    const items = chunks.slice(0, 20).map((chunk) => {
      const atomLink = chunk.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i)?.[1]
      return {
        title: firstTag(chunk, 'title') ?? null,
        link: isAtom ? (atomLink ?? null) : (firstTag(chunk, 'link') ?? null),
        published: firstTag(chunk, isAtom ? 'updated' : 'pubDate') ?? null,
      }
    })

    return {
      data: {
        feed: url.toString(),
        format: isAtom ? 'Atom' : 'RSS',
        title: firstTag(xml.slice(0, 5000), 'title') ?? null,
        itemCount: items.length,
        items,
        note: 'Headline extraction via regex over the first 512KB — not a validating XML parse.',
        source: this.source,
      },
      links: {
        feed: url.toString(),
        dns: ctx.links.href('dns', url.hostname),
        whois: ctx.links.href('whois', registrableDomain(url.hostname)),
      },
    }
  },
}
