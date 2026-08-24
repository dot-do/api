/**
 * lang.api.ht/{code} — ISO 639-1 language reference (offline, vendored
 * curated subset — labeled). Cross-links into countries where official.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue } from '../registry'
import { countriesForLanguage, LANGUAGES } from '../data/reference'

export const langTool: HypertextTool = {
  name: 'lang',
  description: 'ISO 639-1 language reference — English and native names, where spoken',
  valueSyntax: '<iso639-1> (e.g. en, ja) or language name',
  examples: ['en', 'ja', 'spanish'],
  source: `Vendored ISO 639-1 reference (offline, curated subset of ${Object.keys(LANGUAGES).length} languages)`,

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const v = value.trim().toLowerCase()
    if (!/^[a-zà-ž' -]{2,40}$/.test(v)) return badValue(`'${value}' is not a language code or name`)

    let code = LANGUAGES[v] ? v : undefined
    if (!code) code = Object.keys(LANGUAGES).find((k) => LANGUAGES[k].name.toLowerCase() === v || LANGUAGES[k].native.toLowerCase() === v)
    if (!code) return notFoundValue(`'${value}' is not in the vendored language subset (${Object.keys(LANGUAGES).length} languages)`)

    const entry = LANGUAGES[code]
    const countries = countriesForLanguage(code)

    return {
      data: {
        language: code,
        name: entry.name,
        nativeName: entry.native,
        officialIn: countries.map((c) => ({ name: c.name, country: ctx.links.href('country', c.iso2.toLowerCase()) })),
        source: this.source,
      },
      links: Object.fromEntries(countries.slice(0, 5).map((c) => [c.slug, ctx.links.href('country', c.iso2.toLowerCase())])),
    }
  },
}
