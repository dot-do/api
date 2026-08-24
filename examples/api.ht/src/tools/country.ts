/**
 * country.api.ht/{code|slug} — ISO 3166 country reference (offline, vendored
 * curated subset — labeled). The hub of the reference graph: cross-links into
 * currency, lang, tz, holidays, phone, and entity views.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue } from '../registry'
import { COUNTRIES, CURRENCY_NAMES, findCountry, LANGUAGES } from '../data/reference'

export const countryTool: HypertextTool = {
  name: 'country',
  description: 'ISO 3166 country reference — capital, currency, languages, timezone, calling code',
  valueSyntax: '<iso2|iso3|slug> (e.g. us, jpn, united-kingdom)',
  examples: ['us', 'jp', 'united-kingdom'],
  source: `Vendored ISO 3166 reference (offline, curated subset of ${Object.keys(COUNTRIES).length} countries)`,

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const v = value.trim().toLowerCase().replace(/[_\s]+/g, '-')
    if (!/^[a-z][a-z-]{0,60}$/.test(v)) return badValue(`'${value}' is not a country code or slug`)

    const country = findCountry(v)
    if (!country) return notFoundValue(`'${value}' is not in the vendored country subset (${Object.keys(COUNTRIES).length} countries)`)

    const flag = String.fromCodePoint(...country.iso2.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

    return {
      data: {
        country: country.iso2,
        iso3: country.iso3,
        name: country.name,
        flag,
        capital: country.capital,
        currency: ctx.links.href('currency', country.currency),
        currencyName: CURRENCY_NAMES[country.currency] ?? null,
        languages: country.languages.map((l) => ({ code: l, name: LANGUAGES[l]?.name ?? null, lang: ctx.links.href('lang', l) })),
        timezone: ctx.links.href('tz', country.tz),
        callingCode: `+${country.callingCode}`,
        holidays: ctx.links.href('holidays', country.iso2.toLowerCase()),
        entity: ctx.links.href('entity', country.slug),
        source: this.source,
      },
      links: {
        currency: ctx.links.href('currency', country.currency),
        tz: ctx.links.href('tz', country.tz),
        holidays: ctx.links.href('holidays', country.iso2.toLowerCase()),
        entity: ctx.links.href('entity', country.slug),
      },
    }
  },
}
