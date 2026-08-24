/**
 * useragent.api.ht/{ua-string} — User-Agent parsing (offline, heuristic
 * regex families — labeled). Send your own UA by hitting the tool root with
 * no value? No — the path IS the query; paste the UA string as the value.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'

interface Match { name: string; version?: string }

function detectBrowser(ua: string): Match | undefined {
  const rules: [string, RegExp][] = [
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Opera', /(?:OPR|Opera)[/ ]([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
    ['curl', /^curl\/([\d.]+)/],
    ['wget', /^Wget\/([\d.]+)/],
  ]
  for (const [name, re] of rules) {
    const m = ua.match(re)
    if (m) return { name, version: m[1] }
  }
  return undefined
}

function detectOs(ua: string): Match | undefined {
  const rules: [string, RegExp][] = [
    ['iOS', /(?:iPhone|iPad).*OS ([\d_]+)/],
    ['Android', /Android ([\d.]+)/],
    ['Windows', /Windows NT ([\d.]+)/],
    ['macOS', /Mac OS X ([\d_.]+)/],
    ['Chrome OS', /CrOS \S+ ([\d.]+)/],
    ['Linux', /Linux/],
  ]
  for (const [name, re] of rules) {
    const m = ua.match(re)
    if (m) return { name, version: m[1]?.replace(/_/g, '.') }
  }
  return undefined
}

const BOT_RE = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|gptbot|claudebot|headless/i

export const useragentTool: HypertextTool = {
  name: 'useragent',
  description: 'User-Agent string parsing — browser, engine, OS, device class, bot detection',
  valueSyntax: '<user-agent string>',
  examples: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'],
  source: 'Offline regex families (heuristic — not a full device database)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const ua = value.trim()
    if (ua.length < 3 || ua.length > 1024) return badValue('Provide a User-Agent string (3–1024 chars)')

    const browser = detectBrowser(ua)
    const os = detectOs(ua)
    const engine = /AppleWebKit/.test(ua) && !/Chrome|CriOS|Edg/.test(ua) ? 'WebKit'
      : /Gecko\/\d/.test(ua) ? 'Gecko'
      : /AppleWebKit/.test(ua) ? 'Blink'
      : undefined
    const mobile = /Mobi|Android|iPhone/i.test(ua)
    const tablet = /iPad|Tablet/i.test(ua)

    return {
      data: {
        userAgent: ua,
        browser: browser?.name ?? null,
        browserVersion: browser?.version ?? null,
        engine: engine ?? null,
        os: os?.name ?? null,
        osVersion: os?.version ?? null,
        deviceClass: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
        likelyBot: BOT_RE.test(ua),
        note: 'Heuristic parse — regex families, not a maintained device database.',
        source: this.source,
      },
      links: {},
    }
  },
}
