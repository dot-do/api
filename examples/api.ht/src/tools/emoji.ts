/**
 * emoji.api.ht/{name-or-char} — emoji reference (offline): shortname →
 * character from a vendored curated table (labeled), and any character →
 * exact Unicode codepoint decomposition (real math).
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue } from '../registry'
import { EMOJI } from '../data/reference'

const codepoints = (s: string): string[] => [...s].map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)

export const emojiTool: HypertextTool = {
  name: 'emoji',
  description: 'Emoji reference — shortname ↔ character with Unicode codepoints',
  valueSyntax: '<shortname> (e.g. party-popper) or the emoji itself',
  examples: ['party-popper', 'rocket', '🦄'],
  source: `Vendored Unicode CLDR-style shortname table (offline, curated subset of ${Object.keys(EMOJI).length})`,

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const v = value.trim()
    if (!v || v.length > 80) return badValue('Provide an emoji shortname or character')

    // Non-ASCII input: treat as the character itself — decomposition is exact.
    if ([...v].some((c) => c.codePointAt(0)! > 0x7f)) {
      const name = Object.keys(EMOJI).find((k) => EMOJI[k] === v)
      return {
        data: {
          emoji: v,
          shortname: name ?? null,
          codepoints: codepoints(v),
          codepointCount: [...v].length,
          utf8Bytes: new TextEncoder().encode(v).length,
          named: !!name,
          note: name ? undefined : 'Not in the vendored shortname subset — codepoint decomposition is exact regardless.',
          source: this.source,
        },
        links: name ? { shortname: ctx.links.href('emoji', name) } : {},
      }
    }

    const slug = v.toLowerCase().replace(/[\s_]+/g, '-')
    const char = EMOJI[slug]
    if (!char) {
      const near = Object.keys(EMOJI).filter((k) => k.includes(slug)).slice(0, 5)
      if (near.length > 0) {
        return {
          error: { message: `No exact match for '${slug}' — try: ${near.join(', ')}`, code: 'NOT_FOUND', status: 404 },
          status: 404,
          links: Object.fromEntries(near.map((k) => [k, ctx.links.href('emoji', k)])),
        }
      }
      return notFoundValue(`'${slug}' is not in the vendored shortname subset (${Object.keys(EMOJI).length} emoji)`)
    }

    return {
      data: {
        shortname: slug,
        emoji: char,
        codepoints: codepoints(char),
        utf8Bytes: new TextEncoder().encode(char).length,
        source: this.source,
      },
      links: { character: ctx.links.href('emoji', char) },
    }
  },
}
