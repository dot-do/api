/**
 * api.ht tool registry.
 *
 * A tool is one subdomain: `{tool}.api.ht/{value}`. Adding a tool to the
 * registry is the whole job — routing, landing, JSON envelope, and cross-links
 * come from the framework. This is the expansion path from 4 tools to
 * thousands: one `HypertextTool` object per subdomain.
 */

import type { LinkContext } from './links'

export interface ToolContext {
  /** link builder bound to the current request (subdomain vs path mode) */
  links: LinkContext
  /** injectable fetch (tests inject a fake; workers use global fetch) */
  fetch: typeof globalThis.fetch
  /** query params (e.g. dns.api.ht/example.com?type=MX) */
  query: Record<string, string>
}

export interface ToolError {
  message: string
  code: string
  status: number
}

export interface ToolResult {
  /** JSON body — every entity-referencing value is an absolute URL */
  data?: Record<string, unknown>
  /** extra envelope links (self is added automatically) */
  links?: Record<string, string | undefined>
  error?: ToolError
  status?: number
}

export interface HypertextTool {
  name: string
  description: string
  /** example values, used on landings and in the root index */
  examples: string[]
  /** value syntax hint shown in docs, e.g. '<ipv4|ipv6>' */
  valueSyntax: string
  /** where the data comes from — surfaced verbatim in responses */
  source: string
  lookup: (value: string, ctx: ToolContext) => Promise<ToolResult>
  /** optional custom HTML face for the tool root; defaults to the generic toolLandingHtml */
  landingHtml?: (links: LinkContext) => string
}

export type ToolRegistry = Record<string, HypertextTool>

export function badValue(message: string): ToolResult {
  return { error: { message, code: 'INVALID_VALUE', status: 400 }, status: 400 }
}

export function upstreamError(source: string, detail?: string): ToolResult {
  return {
    error: {
      message: `Upstream lookup failed (${source})${detail ? `: ${detail}` : ''}`,
      code: 'UPSTREAM_ERROR',
      status: 502,
    },
    status: 502,
  }
}

export function notFoundValue(message: string): ToolResult {
  return { error: { message, code: 'NOT_FOUND', status: 404 }, status: 404 }
}
