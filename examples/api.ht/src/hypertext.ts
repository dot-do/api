/**
 * Hypertext mounting — wires [tool].api.ht/[value] onto a @dotdo/api app.
 *
 * Routing:
 *   {tool}.api.ht/            → tool landing (HTML for browsers, JSON otherwise)
 *   {tool}.api.ht/{value}     → JSON lookup (ALWAYS JSON — the data plane)
 *   api.ht/                   → apex landing (minimal tool list, no catalog)
 *   api.ht/{tool}/{value}     → path-mode equivalent (also how local dev works)
 *   /docs /login /callback    → docs + stubbed GitHub OAuth flow (reserved paths)
 */

import type { Hono, Context } from 'hono'
import type { ApiEnv } from '../../../src/types'
import { resolveLinkContext, type LinkContext } from './links'
import type { ToolRegistry, HypertextTool } from './registry'
import { createTools } from './tools'
import { rootLandingHtml, toolLandingHtml, docsHtml, callbackHtml } from './landing'
import { loginRedirect, completeCallback } from './auth'

export interface HypertextDeps {
  /** injectable fetch for tests; defaults to global fetch */
  fetch?: typeof globalThis.fetch
  /** the production zone; requests on other hosts get path-mode links */
  apexZone?: string
}

const RESERVED = new Set(['docs', 'login', 'callback', 'favicon.ico', 'robots.txt'])

function wantsHtml(c: Context<ApiEnv>): boolean {
  return (c.req.header('accept') ?? '').includes('text/html')
}

function toolIndexJson(tools: ToolRegistry, links: LinkContext) {
  const index: Record<string, unknown> = {}
  for (const t of Object.values(tools)) {
    index[t.name] = {
      home: links.href(t.name),
      example: links.href(t.name, t.examples[0]),
      description: t.description,
    }
  }
  return index
}

function toolDescriptor(tool: HypertextTool, links: LinkContext) {
  const examples: Record<string, string> = {}
  for (const v of tool.examples) examples[v] = links.href(tool.name, v)
  return {
    tool: tool.name,
    description: tool.description,
    usage: `${tool.name}.api.ht/${tool.valueSyntax}`,
    source: tool.source,
    examples,
  }
}

export function mountHypertext(app: Hono<ApiEnv>, deps: HypertextDeps = {}): void {
  const tools = createTools()
  const fetcher = deps.fetch ?? globalThis.fetch.bind(globalThis)
  const apexZone = deps.apexZone ?? 'api.ht'
  const ctx = (c: Context<ApiEnv>) => resolveLinkContext(c.req.url, apexZone)

  const unknownTool = (c: Context<ApiEnv>, links: LinkContext, name: string) =>
    c.var.respond({
      error: { message: `Unknown tool '${name}'`, code: 'UNKNOWN_TOOL', status: 404 },
      status: 404,
      links: { docs: links.apex('/docs'), ...Object.fromEntries(Object.keys(tools).map((t) => [t, links.href(t)])) },
    })

  const renderToolRoot = (c: Context<ApiEnv>, links: LinkContext, tool: HypertextTool) => {
    if (wantsHtml(c)) return c.html(toolLandingHtml(tool, links))
    return c.var.respond({
      data: toolDescriptor(tool, links),
      links: { docs: links.apex('/docs'), home: links.apex('/') },
    })
  }

  const renderApexRoot = (c: Context<ApiEnv>, links: LinkContext) => {
    if (wantsHtml(c)) return c.html(rootLandingHtml(tools, links))
    return c.var.respond({
      data: {
        name: 'api.ht',
        tagline: 'Hypertext APIs — every response is JSON, every value is a link.',
        grammar: '[tool].api.ht/[value]',
        discovery: 'No central directory. Follow the links in any response.',
        tools: toolIndexJson(tools, links),
      },
      links: { docs: links.apex('/docs'), login: links.apex('/login') },
    })
  }

  const runLookup = async (c: Context<ApiEnv>, links: LinkContext, tool: HypertextTool, value: string) => {
    const result = await tool.lookup(value, { links, fetch: fetcher, query: c.req.query() })
    if (result.error) {
      return c.var.respond({
        error: result.error,
        status: result.status ?? result.error.status,
        links: { tool: links.href(tool.name), docs: links.apex('/docs') },
      })
    }
    return c.var.respond({
      data: result.data,
      status: result.status ?? 200,
      links: { ...result.links, tool: links.href(tool.name) },
    })
  }

  // Roots
  app.get('/', (c) => {
    const links = ctx(c)
    if (links.tool) {
      const tool = tools[links.tool]
      if (!tool) return unknownTool(c, links, links.tool)
      return renderToolRoot(c, links, tool)
    }
    return renderApexRoot(c, links)
  })

  // Docs + auth flow (reserved paths on every host)
  app.get('/docs', (c) => {
    const links = ctx(c)
    return wantsHtml(c)
      ? c.html(docsHtml(tools, links))
      : c.var.respond({
          data: {
            grammar: '[tool].api.ht/[value]',
            envelope: { api: '...', links: { self: '...' }, data: 'every entity value is an absolute URL' },
            tools: toolIndexJson(tools, links),
            auth: {
              login: links.apex('/login'),
              note: 'GitHub OAuth flow is stubbed in this preview; anonymous use is free.',
            },
          },
        })
  })

  app.get('/login', (c) => loginRedirect(c, ctx(c)))

  app.get('/callback', (c) => {
    const links = ctx(c)
    const result = completeCallback(c)
    if (wantsHtml(c)) return c.html(callbackHtml(result, links))
    return c.var.respond({
      data: { ...result },
      links: { docs: links.apex('/docs'), example: links.href('ip', '1.1.1.1') },
    })
  })

  // The data plane — always JSON
  app.get('/*', async (c) => {
    const links = ctx(c)
    const rawPath = new URL(c.req.url).pathname.replace(/^\/+/, '').replace(/\/+$/, '')
    let decoded: string
    try {
      decoded = decodeURIComponent(rawPath)
    } catch {
      decoded = rawPath
    }

    if (links.tool) {
      // subdomain mode: whole path is the value
      const tool = tools[links.tool]
      if (!tool) return unknownTool(c, links, links.tool)
      if (!decoded) return renderToolRoot(c, links, tool)
      return runLookup(c, links, tool, decoded)
    }

    // path mode: /{tool}/{value}
    const slash = decoded.indexOf('/')
    const toolName = slash === -1 ? decoded : decoded.slice(0, slash)
    const value = slash === -1 ? '' : decoded.slice(slash + 1)
    if (RESERVED.has(toolName)) return c.notFound()
    const tool = tools[toolName]
    if (!tool) return unknownTool(c, links, toolName)
    if (!value) return renderToolRoot(c, links, tool)
    return runLookup(c, links, tool, value)
  })
}
