/**
 * github.api.ht/{owner}/{repo} — repository lookup over the GitHub REST API
 * (live, unauthenticated — 60 req/hr/IP). Homepage cross-links into dns.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const REPO_RE = /^[\w.-]+\/[\w.-]+$/

interface GithubRepo {
  full_name?: string
  description?: string
  homepage?: string
  language?: string
  license?: { spdx_id?: string }
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
  default_branch?: string
  archived?: boolean
  pushed_at?: string
  created_at?: string
  topics?: string[]
  owner?: { login?: string; type?: string }
  html_url?: string
}

export const githubTool: HypertextTool = {
  name: 'github',
  description: 'GitHub repository lookup — stars, language, license, activity',
  valueSyntax: '<owner>/<repo>',
  examples: ['honojs/hono', 'cloudflare/workers-sdk'],
  source: 'GitHub REST API (live, unauthenticated)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const slug = value.trim().replace(/^\/+|\/+$/g, '')
    if (!REPO_RE.test(slug)) return badValue(`'${value}' is not an owner/repo slug`)

    const url = `https://api.github.com/repos/${slug}`
    let repo: GithubRepo
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/vnd.github+json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`Repository '${slug}' not found on GitHub`)
      if (res.status === 403 || res.status === 429) return upstreamError(this.source, 'GitHub unauthenticated rate limit reached — retry later')
      if (!res.ok) throw new Error(`GitHub returned ${res.status}`)
      repo = (await res.json()) as GithubRepo
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    let homepageHost: string | undefined
    try {
      if (repo.homepage) homepageHost = new URL(repo.homepage).hostname
    } catch { /* not a URL */ }

    return {
      data: {
        repository: repo.full_name ?? slug,
        description: repo.description ?? null,
        owner: repo.owner?.login ?? null,
        ownerType: repo.owner?.type ?? null,
        language: repo.language ?? null,
        license: repo.license?.spdx_id ?? null,
        stars: repo.stargazers_count ?? null,
        forks: repo.forks_count ?? null,
        openIssues: repo.open_issues_count ?? null,
        defaultBranch: repo.default_branch ?? null,
        archived: repo.archived ?? false,
        createdAt: repo.created_at ?? null,
        lastPush: repo.pushed_at ?? null,
        topics: repo.topics ?? [],
        homepage: repo.homepage || null,
        homepageDns: homepageHost ? ctx.links.href('dns', homepageHost) : null,
        source: this.source,
      },
      links: {
        github: repo.html_url ?? `https://github.com/${slug}`,
        api: url,
        homepageDns: homepageHost ? ctx.links.href('dns', homepageHost) : undefined,
      },
    }
  },
}
