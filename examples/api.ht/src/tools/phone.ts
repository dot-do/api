/**
 * phone.api.ht/{number} — phone number parsing (offline dataset, DEMO).
 *
 * No free live carrier/CNAM source is wired yet, so this tool parses the
 * number offline: vanity letters, country calling code, NANP area-code
 * geography (curated subset), toll-free / premium classification, and
 * canonical formats. Every response is labeled with what is demo data.
 * The country links into the Wikipedia-backed entity layer.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'
import { COUNTRY_CODES, NANP_AREA_CODES, NANP_PREMIUM, NANP_TOLL_FREE } from '../data/known'

const VANITY: Record<string, string> = {
  a: '2', b: '2', c: '2', d: '3', e: '3', f: '3', g: '4', h: '4', i: '4',
  j: '5', k: '5', l: '5', m: '6', n: '6', o: '6', p: '7', q: '7', r: '7', s: '7',
  t: '8', u: '8', v: '8', w: '9', x: '9', y: '9', z: '9',
}

export function normalizePhone(raw: string): { digits: string; hadPlus: boolean } | null {
  const trimmed = raw.trim()
  const hadPlus = trimmed.startsWith('+')
  let digits = ''
  for (const ch of trimmed.toLowerCase()) {
    if (/\d/.test(ch)) digits += ch
    else if (VANITY[ch]) digits += VANITY[ch]
    else if (!/[\s().+-]/.test(ch)) return null
  }
  if (digits.length < 7 || digits.length > 15) return null
  return { digits, hadPlus }
}

function matchCountry(digits: string): { code: string; rest: string } | null {
  for (const len of [3, 2, 1]) {
    const prefix = digits.slice(0, len)
    if (COUNTRY_CODES[prefix]) return { code: prefix, rest: digits.slice(len) }
  }
  return null
}

function formatNanp(national: string): string {
  return national.length === 10
    ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
    : national
}

export const phoneTool: HypertextTool = {
  name: 'phone',
  description: 'Phone number parsing — country, region, type, canonical formats',
  valueSyntax: '<phone number> (e.g. 800-234-2342, +442079460958, 1-800-GOT-JUNK)',
  examples: ['800-234-2342', '+14155552671', '1-800-GOT-JUNK'],
  source: 'offline dataset (DEMO) — carrier, CNAM, and line-type lookups not wired',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const normalized = normalizePhone(value)
    if (!normalized) return badValue(`'${value}' does not look like a phone number`)
    let { digits } = normalized
    const { hadPlus } = normalized

    // NANP convenience: a bare 10-digit number is treated as +1.
    let country = hadPlus ? matchCountry(digits) : null
    if (!hadPlus) {
      if (digits.length === 10) country = { code: '1', rest: digits }
      else if (digits.length === 11 && digits.startsWith('1')) country = { code: '1', rest: digits.slice(1) }
      else country = matchCountry(digits)
    }
    if (!country) return badValue(`Could not determine the country calling code for '${value}'`)

    const info = COUNTRY_CODES[country.code]
    const national = country.rest
    const isNanp = country.code === '1'
    const areaCode = isNanp && national.length === 10 ? national.slice(0, 3) : null
    const tollFree = areaCode ? NANP_TOLL_FREE.has(areaCode) : false
    const premium = areaCode ? NANP_PREMIUM.has(areaCode) : false
    const region = areaCode ? NANP_AREA_CODES[areaCode] ?? null : null
    const e164 = `+${country.code}${national}`

    return {
      data: {
        input: value,
        e164,
        countryCallingCode: `+${country.code}`,
        countryIso: info.iso,
        countryName: info.name,
        country: ctx.links.href('entity', info.slug),
        nationalNumber: national,
        areaCode,
        region,
        type: tollFree ? 'toll-free' : premium ? 'premium-rate' : 'unknown (line-type lookup not wired)',
        tollFree,
        formats: {
          e164,
          national: isNanp ? formatNanp(national) : national,
          international: `+${country.code} ${national}`,
          rfc3966: `tel:${e164}`,
        },
        source: this.source,
      },
      links: {
        country: ctx.links.href('entity', info.slug),
      },
    }
  },
}
