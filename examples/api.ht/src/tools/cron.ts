/**
 * cron.api.ht/{expression} — cron expression parsing (offline, real math):
 * field-by-field description and the next 3 UTC run times.
 * 5-field POSIX cron: minute hour day-of-month month day-of-week.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dayOfMonth', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'dayOfWeek', min: 0, max: 7 }, // 0 and 7 = Sunday
] as const

const MONTH_NAMES: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const DOW_NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

export function parseField(expr: string, min: number, max: number, names?: Record<string, number>): Set<number> | null {
  const out = new Set<number>()
  for (const part of expr.split(',')) {
    const stepMatch = part.match(/^(.+?)\/(\d+)$/)
    const step = stepMatch ? Number(stepMatch[2]) : 1
    if (step < 1) return null
    let range = stepMatch ? stepMatch[1] : part
    if (names) range = range.toLowerCase().replace(/[a-z]{3}/g, (n) => (names[n] !== undefined ? String(names[n]) : n))
    let lo: number, hi: number
    if (range === '*') [lo, hi] = [min, max]
    else if (/^\d+$/.test(range)) [lo, hi] = stepMatch ? [Number(range), max] : [Number(range), Number(range)]
    else {
      const m = range.match(/^(\d+)-(\d+)$/)
      if (!m) return null
      ;[lo, hi] = [Number(m[1]), Number(m[2])]
    }
    if (lo < min || hi > max || lo > hi) return null
    for (let v = lo; v <= hi; v += step) out.add(v === 7 && max === 7 ? 0 : v)
  }
  return out
}

function describeField(name: string, expr: string): string {
  if (expr === '*') return `every ${name}`
  return `${name} ${expr}`
}

export const cronTool: HypertextTool = {
  name: 'cron',
  description: 'Cron expression parser — field meanings and the next 3 UTC runs',
  valueSyntax: '<m> <h> <dom> <mon> <dow> (spaces or underscores)',
  examples: ['0 9 * * 1-5', '*/15 * * * *', '0 0 1 1 *'],
  source: 'Offline — POSIX 5-field cron semantics, computed',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const expr = value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
    const parts = expr.split(' ')
    if (parts.length !== 5) return badValue(`'${value}' is not a 5-field cron expression (minute hour day month weekday)`)

    const sets: Set<number>[] = []
    for (let i = 0; i < 5; i++) {
      const names = i === 3 ? MONTH_NAMES : i === 4 ? DOW_NAMES : undefined
      const set = parseField(parts[i], FIELDS[i].min, FIELDS[i].max, names)
      if (!set) return badValue(`Field ${i + 1} ('${parts[i]}') is not valid for ${FIELDS[i].name} (${FIELDS[i].min}-${FIELDS[i].max})`)
      sets.push(set)
    }
    const [minutes, hours, doms, months, dows] = sets
    const domRestricted = parts[2] !== '*'
    const dowRestricted = parts[4] !== '*'

    // Next runs: scan minute-by-minute from now, capped at 366 days out.
    const runs: string[] = []
    const start = new Date()
    start.setUTCSeconds(0, 0)
    for (let i = 1; i <= 366 * 24 * 60 && runs.length < 3; i++) {
      const t = new Date(start.getTime() + i * 60000)
      if (!minutes.has(t.getUTCMinutes()) || !hours.has(t.getUTCHours()) || !months.has(t.getUTCMonth() + 1)) continue
      const domHit = doms.has(t.getUTCDate())
      const dowHit = dows.has(t.getUTCDay())
      // POSIX: if both dom and dow are restricted, either may match.
      const dayHit = domRestricted && dowRestricted ? domHit || dowHit : domHit && dowHit
      if (dayHit) runs.push(t.toISOString())
    }

    return {
      data: {
        expression: expr,
        fields: {
          minute: describeField('minute', parts[0]),
          hour: describeField('hour', parts[1]),
          dayOfMonth: describeField('day-of-month', parts[2]),
          month: describeField('month', parts[3]),
          dayOfWeek: describeField('day-of-week', parts[4]),
        },
        nextRunsUtc: runs,
        note: runs.length < 3 ? 'Fewer than 3 runs found within the 366-day scan window.' : undefined,
        source: this.source,
      },
      links: {
        hourly: ctx.links.href('cron', '0 * * * *'),
        dailyMidnight: ctx.links.href('cron', '0 0 * * *'),
      },
    }
  },
}
