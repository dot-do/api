/**
 * mac.api.ht/{mac} — MAC address / OUI vendor lookup over maclookup.app (live),
 * plus offline structural decode (unicast/multicast, local/universal bits).
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, upstreamError } from '../registry'
import { slugifyEntity } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

export function normalizeMac(raw: string): string | null {
  const hex = raw.trim().toLowerCase().replace(/[^0-9a-f]/g, '')
  if (hex.length !== 12 && hex.length !== 6) return null
  return (hex.match(/.{2}/g) ?? []).join(':')
}

interface MacLookup {
  success?: boolean
  found?: boolean
  macPrefix?: string
  company?: string
  country?: string
  blockType?: string
}

export const macTool: HypertextTool = {
  name: 'mac',
  description: 'MAC address vendor (IEEE OUI) — plus unicast/multicast and local/universal bits',
  valueSyntax: '<mac|oui> (any separator style)',
  examples: ['44:38:39:ff:ef:57', '3c-22-fb', 'F4.5C.89.12.34.56'],
  source: 'maclookup.app (IEEE OUI registry, live); bit decode offline',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const mac = normalizeMac(value)
    if (!mac) return badValue(`'${value}' is not a valid MAC address or OUI prefix`)

    const firstOctet = parseInt(mac.slice(0, 2), 16)
    const oui = mac.split(':').slice(0, 3).join(':')

    const url = `https://api.maclookup.app/v2/macs/${encodeURIComponent(mac)}`
    let vendor: MacLookup
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 429) return upstreamError(this.source, 'maclookup.app rate limit reached — retry later')
      if (!res.ok) throw new Error(`maclookup.app returned ${res.status}`)
      vendor = (await res.json()) as MacLookup
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const company = vendor.found ? vendor.company : undefined
    const entitySlug = company ? slugifyEntity(company) : undefined

    return {
      data: {
        mac,
        oui,
        registered: vendor.found ?? false,
        vendor: company ?? null,
        vendorCountry: vendor.country || null,
        blockType: vendor.blockType || null,
        organization: entitySlug ? ctx.links.href('entity', entitySlug) : null,
        unicast: (firstOctet & 1) === 0,
        multicast: (firstOctet & 1) === 1,
        universallyAdministered: (firstOctet & 2) === 0,
        locallyAdministered: (firstOctet & 2) === 2,
        sources: { vendor: 'maclookup.app — IEEE OUI registry (live)', bits: 'offline decode (IEEE 802)' },
      },
      links: {
        organization: entitySlug ? ctx.links.href('entity', entitySlug) : undefined,
        macLookup: url,
      },
    }
  },
}
