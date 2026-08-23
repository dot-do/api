/**
 * entity.api.ht/{slug} — Wikipedia-backed entity stubs (labeled DEMO).
 *
 * The entity layer is what turns isolated lookups into a browsable graph:
 * ip → asn → organization → its domain → dns → back to ip. Until a real
 * entity graph (Wikidata/curated) is wired, each entity view is a Wikipedia
 * summary plus curated cross-links, and says so in its `source` field.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'
import { ENTITY_DOMAINS, WIKI_TITLES } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

interface WikiSummary {
  title?: string
  description?: string
  extract?: string
  content_urls?: { desktop?: { page?: string } }
  thumbnail?: { source?: string }
}

function slugToTitle(slug: string): string {
  if (WIKI_TITLES[slug]) return WIKI_TITLES[slug]
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export const entityTool: HypertextTool = {
  name: 'entity',
  description: 'Entity views (companies, organizations, countries) — Wikipedia-backed stubs',
  valueSyntax: '<slug> (e.g. cloudflare, united-states)',
  examples: ['cloudflare', 'google', 'united-states'],
  source: 'Wikipedia REST API (live) — entity stub (DEMO): full entity graph not wired',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const slug = value.trim().toLowerCase().replace(/\s+/g, '-')
    if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) return badValue(`'${value}' is not a valid entity slug`)

    const title = slugToTitle(slug)
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`

    let summary: WikiSummary
    try {
      const res = await ctx.fetch(wikiUrl, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`No Wikipedia entry found for '${slug}' (tried '${title}')`)
      if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`)
      summary = (await res.json()) as WikiSummary
    } catch (err) {
      return upstreamError('Wikipedia REST API', (err as Error).message)
    }

    const domain = ENTITY_DOMAINS[slug]
    const wikipediaPage = summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`

    return {
      data: {
        entity: slug,
        name: summary.title ?? title,
        description: summary.description ?? null,
        summary: summary.extract ?? null,
        wikipedia: wikipediaPage,
        image: summary.thumbnail?.source ?? null,
        website: domain ? `https://${domain}` : null,
        dns: domain ? ctx.links.href('dns', domain) : null,
        whois: domain ? ctx.links.href('whois', domain) : null,
        source: this.source,
      },
      links: {
        wikipedia: wikipediaPage,
        dns: domain ? ctx.links.href('dns', domain) : undefined,
        whois: domain ? ctx.links.href('whois', domain) : undefined,
      },
    }
  },
}
