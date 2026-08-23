/**
 * asn.api.ht/{asn} — autonomous system overview via RIPEstat (live).
 * Accepts '13335' or 'AS13335'. Links to the owning organization's entity view.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, upstreamError } from '../registry'
import { asnToEntitySlug, ENTITY_DOMAINS } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

interface RipeAsOverview {
  data?: {
    holder?: string
    announced?: boolean
    type?: string
    resource?: string
  }
}

export const asnTool: HypertextTool = {
  name: 'asn',
  description: 'Autonomous system (ASN) overview — holder, announcement status, owning organization',
  valueSyntax: '<asn> (e.g. 13335 or AS13335)',
  examples: ['13335', 'AS15169', '8075'],
  source: 'RIPEstat as-overview (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const numeric = value.trim().replace(/^as/i, '')
    if (!/^\d{1,10}$/.test(numeric)) return badValue(`'${value}' is not a valid ASN`)
    const asn = Number(numeric)

    const url = `https://stat.ripe.net/data/as-overview/data.json?resource=AS${asn}`
    let overview: RipeAsOverview
    try {
      const res = await ctx.fetch(url, { headers: { 'user-agent': UA } })
      if (!res.ok) throw new Error(`RIPEstat returned ${res.status}`)
      overview = (await res.json()) as RipeAsOverview
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const holder = overview.data?.holder
    const orgSlug = asnToEntitySlug(asn, holder)
    const orgDomain = orgSlug ? ENTITY_DOMAINS[orgSlug] : undefined

    return {
      data: {
        asn: `AS${asn}`,
        holder: holder ?? null,
        announced: overview.data?.announced ?? false,
        type: overview.data?.type ?? null,
        organization: orgSlug ? ctx.links.href('entity', orgSlug) : null,
        website: orgDomain ? `https://${orgDomain}` : null,
        sources: {
          overview: this.source,
          organization: 'derived from ASN holder (curated table + heuristic)',
        },
      },
      links: {
        organization: orgSlug ? ctx.links.href('entity', orgSlug) : undefined,
        organizationDns: orgDomain ? ctx.links.href('dns', orgDomain) : undefined,
        ripestat: url,
        peeringdb: `https://www.peeringdb.com/asn/${asn}`,
        bgpTools: `https://bgp.tools/as/${asn}`,
      },
    }
  },
}
