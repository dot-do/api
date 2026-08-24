/**
 * currency.api.ht/{code} — exchange rates over Frankfurter (ECB reference, live).
 * currency.api.ht/USD → all rates; currency.api.ht/USD/EUR → one pair.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'
import { CURRENCY_NAMES, COUNTRIES } from '../data/reference'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const CODE_RE = /^[a-z]{3}$/i

export const currencyTool: HypertextTool = {
  name: 'currency',
  description: 'ISO 4217 exchange rates — European Central Bank reference rates',
  valueSyntax: '<code> or <from>/<to> (ISO 4217)',
  examples: ['USD', 'USD/EUR', 'JPY'],
  source: 'Frankfurter API — European Central Bank reference rates (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const parts = value.trim().toUpperCase().split('/')
    const [base, quote] = parts
    if (!CODE_RE.test(base) || (quote && !CODE_RE.test(quote))) {
      return badValue(`'${value}' is not an ISO 4217 code or pair (e.g. USD or USD/EUR)`)
    }

    const url = `https://api.frankfurter.dev/v1/latest?base=${base}${quote ? `&symbols=${quote}` : ''}`
    let body: { base?: string; date?: string; rates?: Record<string, number> }
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 404 || res.status === 422) return notFoundValue(`'${base}' is not a currency covered by ECB reference rates`)
      if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`)
      body = (await res.json()) as typeof body
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const rates: Record<string, unknown> = {}
    for (const [code, rate] of Object.entries(body.rates ?? {})) {
      rates[code] = { rate, currency: ctx.links.href('currency', `${base}/${code}`), name: CURRENCY_NAMES[code] ?? null }
    }

    const usedBy = Object.values(COUNTRIES)
      .filter((c) => c.currency === base)
      .map((c) => ctx.links.href('country', c.iso2.toLowerCase()))

    return {
      data: {
        currency: base,
        name: CURRENCY_NAMES[base] ?? null,
        asOf: body.date ?? null,
        rates,
        usedBy,
        source: this.source,
      },
      links: {
        frankfurter: url,
        usd: base !== 'USD' ? ctx.links.href('currency', `${base}/USD`) : undefined,
        eur: base !== 'EUR' ? ctx.links.href('currency', `${base}/EUR`) : undefined,
      },
    }
  },
}
