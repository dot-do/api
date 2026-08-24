/**
 * zip.api.ht/{country}/{code} — postal-code lookup over Zippopotam.us (live).
 * Bare codes default to US. Places cross-link into geo and country views.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

interface ZippoPlace {
  'place name': string
  state?: string
  'state abbreviation'?: string
  latitude: string
  longitude: string
}

interface ZippoResponse {
  'post code': string
  country: string
  'country abbreviation': string
  places: ZippoPlace[]
}

export const zipTool: HypertextTool = {
  name: 'zip',
  description: 'Postal-code lookup — places, state, coordinates (bare codes default to US)',
  valueSyntax: '<country>/<code> or <us-zip>',
  examples: ['90210', 'us/78701', 'de/10115'],
  source: 'Zippopotam.us (live, GeoNames-backed)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const parts = value.trim().toLowerCase().split('/')
    const [country, code] = parts.length === 2 ? parts : ['us', parts[0]]
    if (!/^[a-z]{2}$/.test(country)) return badValue(`'${country}' is not a 2-letter country code`)
    if (!/^[a-z0-9][a-z0-9 -]{1,9}$/.test(code)) return badValue(`'${code}' is not a valid postal code`)

    const url = `https://api.zippopotam.us/${country}/${encodeURIComponent(code)}`
    let body: ZippoResponse
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`No postal code '${code}' found in '${country.toUpperCase()}'`)
      if (!res.ok) throw new Error(`Zippopotam returned ${res.status}`)
      body = (await res.json()) as ZippoResponse
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const primary = body.places?.[0]
    return {
      data: {
        postalCode: body['post code'],
        country: ctx.links.href('country', body['country abbreviation'].toLowerCase()),
        countryName: body.country,
        places: (body.places ?? []).map((p) => ({
          place: ctx.links.href('geo', p['place name'].toLowerCase()),
          name: p['place name'],
          state: p.state ?? null,
          stateCode: p['state abbreviation'] ?? null,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
        })),
        source: this.source,
      },
      links: {
        country: ctx.links.href('country', body['country abbreviation'].toLowerCase()),
        geo: primary ? ctx.links.href('geo', primary['place name'].toLowerCase()) : undefined,
        zippopotam: url,
      },
    }
  },
}
