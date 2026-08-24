/**
 * units.api.ht/{amount}{unit}-to-{unit} — unit conversion (offline, exact
 * defined factors + affine temperature). e.g. units.api.ht/10km-to-mi
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'
import { UNIT_FACTORS } from '../data/reference'

const VALUE_RE = /^(-?\d+(?:\.\d+)?)\s*([a-z]+[a-z0-9]*)(?:-to-|_to_| to )([a-z]+[a-z0-9]*)$/i

const TEMPS = new Set(['c', 'f', 'k'])
function convertTemp(v: number, from: string, to: string): number {
  const k = from === 'c' ? v + 273.15 : from === 'f' ? (v - 32) * (5 / 9) + 273.15 : v
  return to === 'c' ? k - 273.15 : to === 'f' ? (k - 273.15) * (9 / 5) + 32 : k
}

const round = (n: number) => Number(n.toPrecision(12))

export const unitsTool: HypertextTool = {
  name: 'units',
  description: 'Unit conversion — length, mass, volume, area, speed, data, temperature',
  valueSyntax: '<amount><unit>-to-<unit> (e.g. 10km-to-mi, 72f-to-c)',
  examples: ['10km-to-mi', '5kg-to-lb', '72f-to-c'],
  source: 'Offline — exact SI / international yard-and-pound definitions',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const m = value.trim().toLowerCase().match(VALUE_RE)
    if (!m) return badValue(`'${value}' does not match <amount><unit>-to-<unit> (e.g. 10km-to-mi)`)
    const [, amountStr, from, to] = m
    const amount = Number(amountStr)

    if (TEMPS.has(from) && TEMPS.has(to)) {
      const result = round(convertTemp(amount, from, to))
      const label = (u: string) => ({ c: 'Celsius', f: 'Fahrenheit', k: 'Kelvin' })[u]
      return {
        data: {
          from: { amount, unit: from, name: label(from) }, to: { amount: result, unit: to, name: label(to) },
          dimension: 'temperature', formula: 'affine (exact)', source: this.source,
        },
        links: { reverse: ctx.links.href('units', `${result}${to}-to-${from}`) },
      }
    }

    const fromDef = UNIT_FACTORS[from]
    const toDef = UNIT_FACTORS[to]
    const supported = () => {
      const byDim: Record<string, string[]> = {}
      for (const [u, d] of Object.entries(UNIT_FACTORS)) (byDim[d.dimension] ??= []).push(u)
      return Object.entries(byDim).map(([d, us]) => `${d}: ${us.join(', ')}`).join(' | ')
    }
    if (!fromDef || !toDef) return badValue(`Unknown unit '${!fromDef ? from : to}'. Supported — ${supported()} | temperature: c, f, k`)
    if (fromDef.dimension !== toDef.dimension) {
      return badValue(`Cannot convert ${fromDef.dimension} (${from}) to ${toDef.dimension} (${to})`)
    }

    const result = round((amount * fromDef.toBase) / toDef.toBase)
    return {
      data: {
        from: { amount, unit: from, name: fromDef.name },
        to: { amount: result, unit: to, name: toDef.name },
        dimension: fromDef.dimension,
        factor: round(fromDef.toBase / toDef.toBase),
        source: this.source,
      },
      links: { reverse: ctx.links.href('units', `${result}${to}-to-${from}`) },
    }
  },
}
