/**
 * mime.api.ht/{ext-or-type} — media-type reference (offline, vendored common
 * subset of the IANA registry — labeled). Works both directions:
 * mime.api.ht/json and mime.api.ht/application/json.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue } from '../registry'
import { MIME_BY_EXT } from '../data/reference'

export const mimeTool: HypertextTool = {
  name: 'mime',
  description: 'Media-type reference — extension ↔ IANA media type, both directions',
  valueSyntax: '<extension> or <type>/<subtype>',
  examples: ['json', 'application/json', 'woff2'],
  source: `Vendored media-type table (offline, curated subset of ${Object.keys(MIME_BY_EXT).length} common types)`,

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const v = value.trim().toLowerCase().replace(/^\./, '')
    if (!/^[a-z0-9][a-z0-9.+/-]{0,80}$/.test(v)) return badValue(`'${value}' is not an extension or media type`)

    if (v.includes('/')) {
      // type → extensions
      const extensions = Object.keys(MIME_BY_EXT).filter((ext) => MIME_BY_EXT[ext] === v)
      if (extensions.length === 0) return notFoundValue(`'${v}' is not in the vendored media-type subset`)
      const [type, subtype] = v.split('/')
      return {
        data: {
          mediaType: v, type, subtype,
          extensions: extensions.map((e) => ({ extension: `.${e}`, mime: ctx.links.href('mime', e) })),
          source: this.source,
        },
        links: { iana: `https://www.iana.org/assignments/media-types/${v}` },
      }
    }

    const mediaType = MIME_BY_EXT[v]
    if (!mediaType) return notFoundValue(`Extension '.${v}' is not in the vendored media-type subset`)
    const siblings = Object.keys(MIME_BY_EXT).filter((ext) => MIME_BY_EXT[ext] === mediaType && ext !== v)

    return {
      data: {
        extension: `.${v}`,
        mediaType: ctx.links.href('mime', mediaType),
        type: mediaType.split('/')[0],
        compressible: /^(text\/|application\/(json|xml|yaml|javascript))/.test(mediaType),
        sameType: siblings.map((e) => ctx.links.href('mime', e)),
        source: this.source,
      },
      links: { mediaType: ctx.links.href('mime', mediaType), iana: `https://www.iana.org/assignments/media-types/${mediaType}` },
    }
  },
}
