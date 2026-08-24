/**
 * holidays.api.ht/{country}[/{year}] — public holidays over Nager.Date (live).
 * Defaults to the current year. Cross-links into country views.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  global: boolean
  types?: string[]
}

export const holidaysTool: HypertextTool = {
  name: 'holidays',
  description: 'Public holidays by country and year',
  valueSyntax: '<country>[/<year>] (ISO 3166 alpha-2)',
  examples: ['us', 'us/2027', 'de'],
  source: 'Nager.Date public holidays API (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const parts = value.trim().toLowerCase().split('/')
    const country = parts[0]
    const year = parts[1] ?? String(new Date().getUTCFullYear())
    if (!/^[a-z]{2}$/.test(country)) return badValue(`'${country}' is not a 2-letter country code`)
    if (!/^\d{4}$/.test(year)) return badValue(`'${year}' is not a 4-digit year`)

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country.toUpperCase()}`
    let holidays: NagerHoliday[]
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`No holiday data for country '${country.toUpperCase()}'`)
      if (!res.ok) throw new Error(`Nager.Date returned ${res.status}`)
      holidays = (await res.json()) as NagerHoliday[]
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    return {
      data: {
        country: ctx.links.href('country', country),
        year: Number(year),
        count: holidays.length,
        holidays: holidays.map((h) => ({
          date: h.date,
          name: h.name,
          localName: h.localName,
          nationwide: h.global,
          types: h.types ?? [],
        })),
        source: this.source,
      },
      links: {
        country: ctx.links.href('country', country),
        nextYear: ctx.links.href('holidays', `${country}/${Number(year) + 1}`),
        previousYear: ctx.links.href('holidays', `${country}/${Number(year) - 1}`),
        nagerDate: url,
      },
    }
  },
}
