/**
 * color.api.ht/{value} — color parsing and conversion (offline, exact math).
 * Accepts hex (aabbcc / fff), rgb(...) syntax, or a CSS named color.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'
import { CSS_COLORS } from '../data/reference'

export function parseColor(v: string): { r: number; g: number; b: number } | null {
  const s = v.trim().toLowerCase().replace(/^#/, '')
  if (CSS_COLORS[s]) return parseColor(CSS_COLORS[s])
  if (/^[0-9a-f]{3}$/.test(s)) return parseColor(s.split('').map((c) => c + c).join(''))
  if (/^[0-9a-f]{6}$/.test(s)) {
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
  }
  const rgb = s.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/)
  if (rgb) {
    const [r, g, b] = rgb.slice(1).map(Number)
    if ([r, g, b].every((n) => n <= 255)) return { r, g, b }
  }
  return null
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  h *= 60
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** WCAG relative luminance. */
function luminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const cn = c / 255
    return cn <= 0.04045 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export const colorTool: HypertextTool = {
  name: 'color',
  description: 'Color parsing — hex/rgb/hsl conversions, CSS name, WCAG contrast vs black/white',
  valueSyntax: '<hex|rgb(r,g,b)|css-name>',
  examples: ['ff6347', 'rebeccapurple', 'rgb(30,144,255)'],
  source: 'Offline — sRGB math (exact), CSS Color 4 named-color table',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const rgb = parseColor(value)
    if (!rgb) return badValue(`'${value}' is not a hex color, rgb() value, or known CSS color name`)

    const { r, g, b } = rgb
    const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
    const hsl = rgbToHsl(r, g, b)
    const lum = luminance(r, g, b)
    const contrastWhite = (1.05) / (lum + 0.05)
    const contrastBlack = (lum + 0.05) / 0.05
    const cssName = Object.keys(CSS_COLORS).find((n) => CSS_COLORS[n] === hex)

    return {
      data: {
        color: hex,
        cssName: cssName ?? null,
        rgb: { r, g, b },
        hsl,
        css: { hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
        luminance: Number(lum.toFixed(4)),
        contrast: {
          onWhite: Number(contrastWhite.toFixed(2)),
          onBlack: Number(contrastBlack.toFixed(2)),
          bestTextColor: contrastWhite >= contrastBlack ? ctx.links.href('color', 'ffffff') : ctx.links.href('color', '000000'),
        },
        source: this.source,
      },
      links: {
        inverted: ctx.links.href('color', [255 - r, 255 - g, 255 - b].map((n) => n.toString(16).padStart(2, '0')).join('')),
      },
    }
  },
}
