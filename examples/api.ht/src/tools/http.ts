/**
 * http.api.ht/{status} — HTTP status-code reference (offline, RFC 9110 +
 * registered codes — the full standard set, vendored).
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue } from '../registry'
import { HTTP_STATUSES } from '../data/reference'

const CLASSES: Record<string, string> = {
  '1': 'Informational — request received, continuing process',
  '2': 'Success — the action was successfully received, understood, and accepted',
  '3': 'Redirection — further action must be taken to complete the request',
  '4': 'Client Error — the request contains bad syntax or cannot be fulfilled',
  '5': 'Server Error — the server failed to fulfill an apparently valid request',
}

export const httpTool: HypertextTool = {
  name: 'http',
  description: 'HTTP status-code reference — name, meaning, defining RFC',
  valueSyntax: '<status-code> (100–599)',
  examples: ['404', '203', '418'],
  source: 'Vendored from RFC 9110 + IANA status-code registry (offline)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const code = value.trim()
    if (!/^[1-5]\d\d$/.test(code)) return badValue(`'${value}' is not an HTTP status code (100–599)`)

    const entry = HTTP_STATUSES[code]
    if (!entry) return notFoundValue(`${code} is in a valid class but not a registered status code`)

    const neighbors = Object.keys(HTTP_STATUSES).filter((c) => c[0] === code[0] && c !== code)

    return {
      data: {
        status: Number(code),
        name: entry.name,
        summary: entry.summary,
        class: `${code[0]}xx`,
        classMeaning: CLASSES[code[0]],
        rfc: entry.rfc,
        sameClass: Object.fromEntries(neighbors.map((c) => [c, ctx.links.href('http', c)])),
        source: this.source,
      },
      links: {
        mdn: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code}`,
      },
    }
  },
}
