/**
 * tz.api.ht/{zone} — IANA timezone view computed offline from the runtime's
 * ICU tz database (real data, no network): current time, UTC offset, DST flag.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue } from '../registry'
import { COUNTRIES } from '../data/reference'

const ZONE_RE = /^[a-z_+-]+(\/[a-z0-9_+-]+){0,2}$/i

/** UTC offset in minutes for a zone at a given instant, via Intl. */
export function zoneOffsetMinutes(zone: string, at: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]))
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second))
  return Math.round((asUtc - at.getTime()) / 60000) + 0 // +0 normalizes -0
}

function fmtOffset(min: number): string {
  const sign = min < 0 ? '-' : '+'
  const abs = Math.abs(min)
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

export const tzTool: HypertextTool = {
  name: 'tz',
  description: 'IANA timezone — current time, UTC offset, DST state',
  valueSyntax: '<iana-zone> (e.g. America/New_York)',
  examples: ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo'],
  source: 'IANA tz database via the runtime ICU (offline, real)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const zone = value.trim().replace(/\s+/g, '_')
    if (!ZONE_RE.test(zone)) return badValue(`'${value}' is not an IANA zone name`)

    const now = new Date()
    let canonical: string
    let offsetNow: number
    try {
      canonical = new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone
      offsetNow = zoneOffsetMinutes(canonical, now)
    } catch {
      return notFoundValue(`'${zone}' is not a known IANA timezone`)
    }

    // DST detection: compare January vs July offsets; current != min ⇒ DST active.
    const jan = zoneOffsetMinutes(canonical, new Date(Date.UTC(now.getUTCFullYear(), 0, 1)))
    const jul = zoneOffsetMinutes(canonical, new Date(Date.UTC(now.getUTCFullYear(), 6, 1)))
    const observesDst = jan !== jul
    const dstActive = observesDst && offsetNow === Math.max(jan, jul)

    const abbrev = new Intl.DateTimeFormat('en-US', { timeZone: canonical, timeZoneName: 'short' })
      .formatToParts(now).find((p) => p.type === 'timeZoneName')?.value

    const countries = Object.values(COUNTRIES)
      .filter((c) => c.tz === canonical)
      .map((c) => ctx.links.href('country', c.iso2.toLowerCase()))

    return {
      data: {
        timezone: canonical,
        abbreviation: abbrev ?? null,
        utcOffset: fmtOffset(offsetNow),
        offsetMinutes: offsetNow,
        observesDst,
        dstActive,
        localTime: new Intl.DateTimeFormat('sv-SE', { timeZone: canonical, dateStyle: 'short', timeStyle: 'medium' }).format(now),
        utcTime: now.toISOString(),
        countries,
        source: this.source,
      },
      links: {
        utc: canonical !== 'UTC' ? ctx.links.href('tz', 'UTC') : undefined,
        country: countries[0],
      },
    }
  },
}
