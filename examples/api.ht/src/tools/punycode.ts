/**
 * punycode.api.ht/{hostname} — IDN conversion (offline, real): Unicode →
 * ASCII (via the URL parser's IDNA) and xn-- → Unicode (RFC 3492 decode).
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'

// RFC 3492 parameters
const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1
  delta += Math.floor(delta / numPoints)
  let k = 0
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN))
    k += BASE
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW))
}

/** Decode one punycode label body (after xn--). RFC 3492 §6.2. */
export function punycodeDecode(input: string): string | null {
  const output: number[] = []
  const lastDelim = input.lastIndexOf('-')
  const basic = lastDelim > 0 ? input.slice(0, lastDelim) : ''
  for (const ch of basic) {
    if (ch.charCodeAt(0) >= 0x80) return null
    output.push(ch.charCodeAt(0))
  }
  let i = 0, n = INITIAL_N, bias = INITIAL_BIAS
  let idx = lastDelim > 0 ? lastDelim + 1 : 0
  while (idx < input.length) {
    const oldi = i
    let w = 1
    for (let k = BASE; ; k += BASE) {
      if (idx >= input.length) return null
      const c = input.charCodeAt(idx++)
      const digit = c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : BASE
      if (digit >= BASE) return null
      i += digit * w
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias
      if (digit < t) break
      w *= BASE - t
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0)
    n += Math.floor(i / (output.length + 1))
    i %= output.length + 1
    output.splice(i++, 0, n)
  }
  return String.fromCodePoint(...output)
}

export const punycodeTool: HypertextTool = {
  name: 'punycode',
  description: 'IDN hostname conversion — Unicode ↔ punycode (xn--), both directions',
  valueSyntax: '<hostname> (unicode or xn--)',
  examples: ['münchen.de', 'xn--mnchen-3ya.de', 'bücher.example'],
  source: 'Offline — IDNA via URL parser (encode) + RFC 3492 (decode)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const host = value.trim().toLowerCase().replace(/\.$/, '')
    if (!host || host.length > 253 || /[\s/]/.test(host)) return badValue(`'${value}' is not a hostname`)

    let ascii: string
    try {
      ascii = new URL(`http://${host}`).hostname
    } catch {
      return badValue(`'${value}' is not a convertible hostname`)
    }

    const unicodeLabels = ascii.split('.').map((label) => {
      if (!label.startsWith('xn--')) return label
      return punycodeDecode(label.slice(4)) ?? label
    })
    const unicode = unicodeLabels.join('.')

    return {
      data: {
        input: host,
        ascii,
        unicode,
        isIdn: ascii !== unicode,
        labels: ascii.split('.').map((label, i) => ({ ascii: label, unicode: unicodeLabels[i], punycode: label.startsWith('xn--') })),
        dns: ctx.links.href('dns', ascii),
        source: this.source,
      },
      links: {
        dns: ctx.links.href('dns', ascii),
        whois: ctx.links.href('whois', ascii.split('.').slice(-2).join('.')),
      },
    }
  },
}
