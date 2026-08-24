/**
 * npm.api.ht/{package} — npm registry lookup (live). Scoped packages work:
 * npm.api.ht/@dotdo/api. Repository and homepage cross-link into github/dns.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

interface NpmVersion {
  name?: string
  version?: string
  description?: string
  license?: string
  homepage?: string
  repository?: { url?: string } | string
  dependencies?: Record<string, string>
  dist?: { tarball?: string; unpackedSize?: number }
}

export function parseGithubRepo(repoUrl?: string): string | undefined {
  if (!repoUrl) return undefined
  const m = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#].*)?$/i)
  return m ? `${m[1]}/${m[2]}` : undefined
}

export const npmTool: HypertextTool = {
  name: 'npm',
  description: 'npm package lookup — latest version, license, dependencies, repository',
  valueSyntax: '<package> (scoped ok, e.g. @scope/name)',
  examples: ['hono', 'zod', '@cloudflare/workers-types'],
  source: 'npm public registry (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const name = value.trim().toLowerCase()
    if (!NAME_RE.test(name) || name.length > 214) return badValue(`'${value}' is not a valid npm package name`)

    const url = `https://registry.npmjs.org/${name.startsWith('@') ? name.replace('/', '%2F') : name}/latest`
    let pkg: NpmVersion
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`Package '${name}' not found on the npm registry`)
      if (!res.ok) throw new Error(`npm registry returned ${res.status}`)
      pkg = (await res.json()) as NpmVersion
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
    const ghRepo = parseGithubRepo(repoUrl)
    const deps = Object.entries(pkg.dependencies ?? {})
    let homepageHost: string | undefined
    try {
      if (pkg.homepage) homepageHost = new URL(pkg.homepage).hostname
    } catch { /* not a URL */ }

    return {
      data: {
        package: pkg.name ?? name,
        version: pkg.version ?? null,
        description: pkg.description ?? null,
        license: pkg.license ?? null,
        homepage: pkg.homepage ?? null,
        homepageDns: homepageHost ? ctx.links.href('dns', homepageHost) : null,
        repository: ghRepo ? ctx.links.href('github', ghRepo) : (repoUrl ?? null),
        unpackedSize: pkg.dist?.unpackedSize ?? null,
        dependencies: Object.fromEntries(deps.map(([dep, range]) => [dep, { range, npm: ctx.links.href('npm', dep) }])),
        source: this.source,
      },
      links: {
        registry: url,
        npmjs: `https://www.npmjs.com/package/${name}`,
        github: ghRepo ? ctx.links.href('github', ghRepo) : undefined,
      },
    }
  },
}
