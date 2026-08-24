/**
 * geo.api.ht/{place} — place-name geocoding over Open-Meteo (live, free).
 * Results cross-link into country, tz, and zip views.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'

interface GeoResult {
  name: string
  latitude: number
  longitude: number
  elevation?: number
  country_code?: string
  country?: string
  admin1?: string
  timezone?: string
  population?: number
  postcodes?: string[]
}

export const geoTool: HypertextTool = {
  name: 'geo',
  description: 'Place-name geocoding — coordinates, country, timezone, population',
  valueSyntax: '<place name> (e.g. austin, san-francisco)',
  examples: ['austin', 'tokyo', 'berlin'],
  source: 'Open-Meteo Geocoding API (live, GeoNames-backed)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const place = value.trim().replace(/[-_+]+/g, ' ')
    if (place.length < 2 || place.length > 100) return badValue(`'${value}' is not a valid place name`)

    const url = `${ENDPOINT}?name=${encodeURIComponent(place)}&count=5&language=en&format=json`
    let results: GeoResult[]
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`)
      const body = (await res.json()) as { results?: GeoResult[] }
      results = body.results ?? []
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    if (results.length === 0) return notFoundValue(`No place found for '${place}'`)

    const top = results[0]
    const cc = top.country_code?.toUpperCase()
    return {
      data: {
        place: top.name,
        region: top.admin1 ?? null,
        country: cc ? ctx.links.href('country', cc.toLowerCase()) : null,
        countryName: top.country ?? null,
        latitude: top.latitude,
        longitude: top.longitude,
        elevationMeters: top.elevation ?? null,
        population: top.population ?? null,
        timezone: top.timezone ? ctx.links.href('tz', top.timezone) : null,
        postcode: top.postcodes?.[0] && cc ? ctx.links.href('zip', `${cc.toLowerCase()}/${top.postcodes[0]}`) : null,
        alternatives: results.slice(1).map((r) => ({
          place: r.name,
          region: r.admin1 ?? null,
          country: r.country ?? null,
          geo: ctx.links.href('geo', `${r.name.toLowerCase()}`),
        })),
        source: this.source,
      },
      links: {
        country: cc ? ctx.links.href('country', cc.toLowerCase()) : undefined,
        tz: top.timezone ? ctx.links.href('tz', top.timezone) : undefined,
        openMeteo: url,
      },
    }
  },
}
