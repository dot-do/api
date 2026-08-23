/**
 * whois.api.ht/{domain} — domain registration data via RDAP (live).
 *
 * rdap.org bootstraps to the authoritative registry RDAP server. Nameservers
 * link into dns.api.ht; the registrar links into the entity layer.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'
import { slugifyEntity } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i

interface RdapEntity {
  roles?: string[]
  vcardArray?: [string, [string, Record<string, unknown>, string, unknown][]]
  publicIds?: { type: string; identifier: string }[]
  entities?: RdapEntity[]
}

interface RdapDomain {
  ldhName?: string
  handle?: string
  status?: string[]
  events?: { eventAction: string; eventDate: string }[]
  nameservers?: { ldhName?: string }[]
  secureDNS?: { delegationSigned?: boolean }
  entities?: RdapEntity[]
}

function vcardValue(entity: RdapEntity | undefined, field: string): string | undefined {
  const rows = entity?.vcardArray?.[1]
  if (!rows) return undefined
  const row = rows.find((r) => r[0] === field)
  return typeof row?.[3] === 'string' ? (row[3] as string) : undefined
}

function findByRole(entities: RdapEntity[] | undefined, role: string): RdapEntity | undefined {
  for (const e of entities ?? []) {
    if (e.roles?.includes(role)) return e
    const nested = findByRole(e.entities, role)
    if (nested) return nested
  }
  return undefined
}

function eventDate(events: RdapDomain['events'], action: string): string | undefined {
  return events?.find((e) => e.eventAction === action)?.eventDate
}

export const whoisTool: HypertextTool = {
  name: 'whois',
  description: 'Domain registration (WHOIS/RDAP) — registrar, dates, status, nameservers',
  valueSyntax: '<domain>',
  examples: ['cloudflare.com', 'startups.studio', 'github.com'],
  source: 'RDAP via rdap.org bootstrap (live)',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const domain = value.trim().toLowerCase().replace(/\.$/, '')
    if (!DOMAIN_RE.test(domain)) return badValue(`'${value}' is not a valid domain name`)

    const rdapUrl = `https://rdap.org/domain/${encodeURIComponent(domain)}`
    let rdap: RdapDomain
    try {
      const res = await ctx.fetch(rdapUrl, { headers: { accept: 'application/rdap+json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`No RDAP registration found for '${domain}'`)
      if (!res.ok) throw new Error(`rdap.org returned ${res.status}`)
      rdap = (await res.json()) as RdapDomain
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const registrar = findByRole(rdap.entities, 'registrar')
    const registrarName = vcardValue(registrar, 'fn')
    const registrarIanaId = registrar?.publicIds?.find((p) => /iana/i.test(p.type))?.identifier
    const registrarSlug = registrarName ? slugifyEntity(registrarName) : undefined
    const nameservers = (rdap.nameservers ?? [])
      .map((ns) => ns.ldhName?.toLowerCase().replace(/\.$/, ''))
      .filter((ns): ns is string => Boolean(ns))

    return {
      data: {
        domain: rdap.ldhName?.toLowerCase() ?? domain,
        handle: rdap.handle ?? null,
        status: rdap.status ?? [],
        registrar: registrarName ?? null,
        registrarEntity: registrarSlug ? ctx.links.href('entity', registrarSlug) : null,
        registrarIanaId: registrarIanaId ?? null,
        registered: eventDate(rdap.events, 'registration') ?? null,
        updated: eventDate(rdap.events, 'last changed') ?? null,
        expires: eventDate(rdap.events, 'expiration') ?? null,
        dnssec: rdap.secureDNS?.delegationSigned ?? false,
        nameservers: nameservers.map((ns) => ctx.links.href('dns', ns)),
        dns: ctx.links.href('dns', domain),
        source: this.source,
      },
      links: {
        dns: ctx.links.href('dns', domain),
        registrar: registrarSlug ? ctx.links.href('entity', registrarSlug) : undefined,
        rdap: rdapUrl,
        site: `https://${domain}`,
      },
    }
  },
}
