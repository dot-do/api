/**
 * cve.api.ht/{cve-id} — CVE record lookup over CIRCL CVE Search (live),
 * serving CVE Program v5 records.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue, notFoundValue, upstreamError } from '../registry'
import { slugifyEntity } from '../data/known'

const UA = 'api.ht/0.1 (hypertext API surface; +https://api.ht)'
const CVE_RE = /^cve-\d{4}-\d{4,}$/i

interface CveRecordV5 {
  cveMetadata?: { cveId?: string; state?: string; datePublished?: string; dateUpdated?: string; assignerShortName?: string }
  containers?: {
    cna?: {
      title?: string
      descriptions?: { lang?: string; value?: string }[]
      affected?: { vendor?: string; product?: string }[]
      metrics?: { cvssV3_1?: { baseScore?: number; baseSeverity?: string; vectorString?: string } }[]
      references?: { url?: string }[]
    }
  }
}

export const cveTool: HypertextTool = {
  name: 'cve',
  description: 'CVE vulnerability record — description, CVSS, affected products',
  valueSyntax: '<CVE-YYYY-NNNN...>',
  examples: ['CVE-2021-44228', 'CVE-2014-0160'],
  source: 'CIRCL CVE Search (live) — CVE Program v5 records',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const id = value.trim().toUpperCase()
    if (!CVE_RE.test(id)) return badValue(`'${value}' is not a CVE id (CVE-YYYY-NNNN)`)

    const url = `https://cve.circl.lu/api/cve/${id}`
    let record: CveRecordV5
    try {
      const res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } })
      if (res.status === 404) return notFoundValue(`No record for ${id}`)
      if (!res.ok) throw new Error(`CIRCL returned ${res.status}`)
      record = (await res.json()) as CveRecordV5
      if (!record?.cveMetadata?.cveId) return notFoundValue(`No record for ${id}`)
    } catch (err) {
      return upstreamError(this.source, (err as Error).message)
    }

    const cna = record.containers?.cna
    const description = cna?.descriptions?.find((d) => d.lang?.startsWith('en'))?.value ?? cna?.descriptions?.[0]?.value
    const cvss = cna?.metrics?.map((m) => m.cvssV3_1).find(Boolean)
    const affected = (cna?.affected ?? []).slice(0, 10).map((a) => ({
      vendor: a.vendor ?? null,
      product: a.product ?? null,
      organization: a.vendor && !/^n\/?a$/i.test(a.vendor) ? ctx.links.href('entity', slugifyEntity(a.vendor)) : null,
    }))

    return {
      data: {
        cve: record.cveMetadata?.cveId ?? id,
        state: record.cveMetadata?.state ?? null,
        title: cna?.title ?? null,
        description: description ?? null,
        published: record.cveMetadata?.datePublished ?? null,
        updated: record.cveMetadata?.dateUpdated ?? null,
        assigner: record.cveMetadata?.assignerShortName ?? null,
        cvss: cvss ? { score: cvss.baseScore ?? null, severity: cvss.baseSeverity ?? null, vector: cvss.vectorString ?? null } : null,
        affected,
        references: (cna?.references ?? []).slice(0, 10).map((r) => r.url).filter(Boolean),
        source: this.source,
      },
      links: {
        circl: url,
        nvd: `https://nvd.nist.gov/vuln/detail/${id}`,
        mitre: `https://www.cve.org/CVERecord?id=${id}`,
      },
    }
  },
}
