/**
 * shapes.api.ht/{dataset}/{id}?shape=a|b|c — the link-shape comparison.
 *
 * dot-do/data #36 (feeds the #13 per-brand link-contract ruling): the founder
 * compares candidate link shapes on LIVE pages, not in prose. The SAME entity
 * renders in three candidate shapes, switched by `?shape=`:
 *
 *   ?shape=a  typed camelCase edges — envelope `links` keyed by verb-register
 *             edge names (postedBy, locatedIn, sameAs, potentialAction); the
 *             edge name carries the TYPE of the relation, the URL carries identity
 *   ?shape=b  label-keyed maps — envelope `links` keyed by arbitrary human
 *             labels, as the original recovered workers did; no machine edge type
 *   ?shape=c  shape (a) + a `variations` block in data holding REAL
 *             representation alternates of this page's subject (for classes:
 *             Wikidata JSON / TTL / HTML) — relation edges and representation
 *             alternates never share a namespace
 *
 * Conventions kept from this worker (no second envelope): pages go through
 * `c.var.respond` — the shape-under-comparison IS the envelope's `links` block;
 * `data.shapes` holds the hop map to the same page in the other shapes.
 * A miss is a page too (recovered design): 404 status, `data.suggestions` as a
 * link map in the current shape.
 *
 * Data embedded at build time, zero request-time fetches:
 *   - jobs:    53 canonical Job records (#34 adapter PoC, 3 Greenhouse boards)
 *   - classes: top-20 head Wikidata classes (committed wiki-sources catalog)
 * Plus two Views over jobs (a partition is a View, not a Dataset):
 *   companies/{name}, locations/{slug}.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'
import type { LinkContext } from '../links'
import { page, esc } from '../landing'
import { JOBS, type Job } from '../data/shapes-jobs'
import { CLASSES, CLASSES_SNAPSHOT, type WikidataClass } from '../data/shapes-classes'

type Shape = 'a' | 'b' | 'c'
const SHAPES: Shape[] = ['a', 'b', 'c']

const SHAPE_INFO: Record<Shape, { name: string; rule: string }> = {
  a: {
    name: 'typed camelCase edges',
    rule: 'links keyed by verb-register edge names (postedBy, locatedIn, sameAs, potentialAction) — the edge name carries the TYPE of the relation; the URL carries identity',
  },
  b: {
    name: 'label-keyed link maps',
    rule: 'links keyed by arbitrary human labels, as the original recovered workers did — labels carry meaning; URLs carry identity; no machine-readable edge type',
  },
  c: {
    name: 'typed edges + variations',
    rule: 'shape (a) links, plus a `variations` block holding format/representation alternates of THIS page (Wikidata JSON/TTL/HTML, Greenhouse JSON) — relation edges and representation alternates never share a namespace',
  },
}

// ---------------------------------------------------------------------------
// helpers

const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const locSlug = (j: Job) => slugify(j.location)

const uniq = <T>(xs: T[]) => [...new Set(xs)]

/** absolute URL into the shapes tool: {tool root}/{path}?shape={s} */
const at = (links: LinkContext, path: string, shape: Shape): string => `${links.href('shapes', path)}?shape=${shape}`

/** hop map to the SAME page in every shape — lives in data, never in links */
const hops = (links: LinkContext, path: string) =>
  Object.fromEntries(SHAPES.map((s) => [`${s} — ${SHAPE_INFO[s].name}`, at(links, path, s)]))

interface PageResult {
  data: Record<string, unknown>
  links: Record<string, string | undefined>
  status?: number
}

const ok = (links: LinkContext, path: string, data: Record<string, unknown>, linkMap: Record<string, string | undefined>): PageResult => ({
  data: { ...data, shapes: hops(links, path) },
  links: linkMap,
})

/** a miss is a page: 404 + suggestions rendered as the current shape's link map */
const miss = (
  links: LinkContext,
  path: string,
  message: string,
  suggestions: Record<string, string>,
  linkMap: Record<string, string | undefined>,
): PageResult => ({
  data: {
    type: 'Miss',
    miss: { message, code: 'NOT_FOUND', status: 404 },
    suggestions,
    shapes: hops(links, path),
  },
  links: linkMap,
  status: 404,
})

// ---------------------------------------------------------------------------
// jobs — one entity, three shapes

const JOB_SOURCE = 'Greenhouse board API via the dot-do/data#34 adapter PoC (canonical records; ingest/stated/posted) — embedded, zero request-time fetches'

function jobFacts(j: Job) {
  return {
    type: 'Job',
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    department: j.department,
    postedAt: j.postedAt,
    source: JOB_SOURCE,
  }
}

function jobPage(links: LinkContext, shape: Shape, j: Job): PageResult {
  const path = `jobs/${j.id}`
  if (shape === 'b') {
    // (b) original label-keyed maps — arbitrary labels, exactly as the old workers did
    return ok(links, path, jobFacts(j), {
      [j.company]: at(links, `companies/${j.company}`, shape),
      [j.location.trim()]: at(links, `locations/${locSlug(j)}`, shape),
      'All jobs': at(links, 'jobs', shape),
      'View on Greenhouse': j.sourceUrl,
      Apply: `${j.sourceUrl}#app`,
    })
  }
  // (a) and (c): typed camelCase verb-register edges
  const data: Record<string, unknown> = jobFacts(j)
  if (shape === 'c') {
    // real representation alternates of this job, not relation edges
    data.variations = {
      'source-html': j.sourceUrl,
      'source-json': `https://boards-api.greenhouse.io/v1/boards/${j.company}/jobs/${j.id}`,
    }
  }
  return ok(links, path, data, {
    memberOf: at(links, 'jobs', shape),
    postedBy: at(links, `companies/${j.company}`, shape),
    locatedIn: at(links, `locations/${locSlug(j)}`, shape),
    sameAs: j.sourceUrl,
    potentialAction: `${j.sourceUrl}#app`,
  })
}

function jobsIndex(links: LinkContext, shape: Shape): PageResult {
  const byKey =
    shape === 'b'
      ? Object.fromEntries(JOBS.map((j) => [`${j.title.trim()} — ${j.company} (${j.location.trim()})`, at(links, `jobs/${j.id}`, shape)]))
      : Object.fromEntries(JOBS.map((j) => [j.id, at(links, `jobs/${j.id}`, shape)]))
  return ok(
    links,
    'jobs',
    {
      type: 'Dataset',
      name: 'jobs',
      description: '53 canonical Job records from the dot-do/data#34 adapter PoC (3 Greenhouse boards → one canonical shape)',
      count: JOBS.length,
      companies: Object.fromEntries(uniq(JOBS.map((j) => j.company)).map((co) => [co, at(links, `companies/${co}`, shape)])),
      locations: Object.fromEntries(uniq(JOBS.map(locSlug)).map((l) => [l, at(links, `locations/${l}`, shape)])),
      jobs: byKey,
    },
    {},
  )
}

function jobMiss(links: LinkContext, shape: Shape, value: string): PageResult {
  const scored = JOBS.map((j) => {
    const hay = `${j.title} ${j.company} ${j.location}`.toLowerCase()
    let score = 0
    for (const word of value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) if (hay.includes(word)) score++
    return { j, score }
  })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 8)
  const pool = scored.length ? scored.map((s) => s.j) : JOBS.slice(0, 8)
  const suggestions =
    shape === 'b'
      ? Object.fromEntries(pool.map((j) => [`${j.title.trim()} — ${j.company}`, at(links, `jobs/${j.id}`, shape)]))
      : Object.fromEntries(pool.map((j) => [j.id, at(links, `jobs/${j.id}`, shape)]))
  return miss(links, `jobs/${value}`, `No job '${value}' in this dataset`, suggestions, {
    dataset: at(links, 'jobs', shape),
  })
}

// Views over jobs (a partition is a View, never a Dataset)

function companyPage(links: LinkContext, shape: Shape, co: string): PageResult {
  const jobs = JOBS.filter((j) => j.company === co)
  if (!jobs.length) {
    return miss(
      links,
      `companies/${co}`,
      `No company '${co}'`,
      Object.fromEntries(uniq(JOBS.map((j) => j.company)).map((c) => [c, at(links, `companies/${c}`, shape)])),
      { dataset: at(links, 'jobs', shape) },
    )
  }
  const board = `https://job-boards.greenhouse.io/${co}`
  const posts =
    shape === 'b'
      ? Object.fromEntries(jobs.map((j) => [`${j.title.trim()} (${j.location.trim()})`, at(links, `jobs/${j.id}`, shape)]))
      : Object.fromEntries(jobs.map((j) => [j.id, at(links, `jobs/${j.id}`, shape)]))
  const data: Record<string, unknown> = { type: 'View', name: `Jobs at ${co}`, of: 'jobs', company: co, count: jobs.length, posts }
  if (shape === 'c') data.variations = { 'board-html': board, 'board-json': `https://boards-api.greenhouse.io/v1/boards/${co}/jobs` }
  return ok(
    links,
    `companies/${co}`,
    data,
    shape === 'b'
      ? { 'All jobs': at(links, 'jobs', shape), 'Board on Greenhouse': board }
      : { partOf: at(links, 'jobs', shape), sameAs: board },
  )
}

function locationPage(links: LinkContext, shape: Shape, l: string): PageResult {
  const jobs = JOBS.filter((j) => locSlug(j) === l)
  if (!jobs.length) {
    return miss(
      links,
      `locations/${l}`,
      `No location '${l}'`,
      Object.fromEntries(uniq(JOBS.map(locSlug)).map((x) => [x, at(links, `locations/${x}`, shape)])),
      { dataset: at(links, 'jobs', shape) },
    )
  }
  const label = (jobs[0] as Job).location.trim()
  const posts =
    shape === 'b'
      ? Object.fromEntries(jobs.map((j) => [`${j.title.trim()} — ${j.company}`, at(links, `jobs/${j.id}`, shape)]))
      : Object.fromEntries(jobs.map((j) => [j.id, at(links, `jobs/${j.id}`, shape)]))
  return ok(
    links,
    `locations/${l}`,
    { type: 'View', name: `Jobs in ${label}`, of: 'jobs', location: label, count: jobs.length, posts },
    shape === 'b' ? { 'All jobs': at(links, 'jobs', shape) } : { partOf: at(links, 'jobs', shape) },
  )
}

// ---------------------------------------------------------------------------
// classes — one entity, three shapes

function classPage(links: LinkContext, shape: Shape, cls: WikidataClass): PageResult {
  const q = `Q${cls.qid}`
  const path = `classes/${q}`
  const facts = {
    type: 'Class',
    qid: q,
    label: cls.label,
    instanceCount: cls.instanceCount,
    source: `Wikidata direct-P31 instance counts via QLever, committed wiki-sources catalog snapshot ${CLASSES_SNAPSHOT} (CC0-1.0) — embedded, zero request-time fetches`,
  }
  if (shape === 'b') {
    return ok(links, path, facts, {
      [`${q} on Wikidata`]: `https://www.wikidata.org/wiki/${q}`,
      'Entity data (JSON)': `https://www.wikidata.org/wiki/Special:EntityData/${q}.json`,
      'All classes': at(links, 'classes', shape),
      'Query instances (SPARQL)': `https://query.wikidata.org/#SELECT%20%3Fx%20WHERE%20%7B%20%3Fx%20wdt%3AP31%20wd%3A${q}%20%7D%20LIMIT%2010`,
    })
  }
  const data: Record<string, unknown> = { ...facts }
  if (shape === 'c') {
    // real representation alternates: the same class as Wikidata JSON / TTL / HTML
    data.variations = {
      'wikidata-json': `https://www.wikidata.org/wiki/Special:EntityData/${q}.json`,
      'wikidata-ttl': `https://www.wikidata.org/wiki/Special:EntityData/${q}.ttl`,
      'wikidata-html': `https://www.wikidata.org/wiki/${q}`,
    }
  }
  return ok(links, path, data, {
    memberOf: at(links, 'classes', shape),
    sameAs: `http://www.wikidata.org/entity/${q}`,
    describedBy: `https://www.wikidata.org/wiki/Special:EntityData/${q}.json`,
    subjectOf: `https://www.wikidata.org/wiki/${q}`,
  })
}

function classesIndex(links: LinkContext, shape: Shape): PageResult {
  const byKey =
    shape === 'b'
      ? Object.fromEntries(
          CLASSES.map((c) => [`${c.label} (${c.instanceCount.toLocaleString('en-US')} instances)`, at(links, `classes/Q${c.qid}`, shape)]),
        )
      : Object.fromEntries(CLASSES.map((c) => [`Q${c.qid}`, at(links, `classes/Q${c.qid}`, shape)]))
  return ok(
    links,
    'classes',
    {
      type: 'Dataset',
      name: 'classes',
      description: `Top-20 head Wikidata classes by direct-P31 instance count (of 8,975 live-tier classes in the committed catalog, snapshot ${CLASSES_SNAPSHOT})`,
      count: CLASSES.length,
      classes: byKey,
    },
    {},
  )
}

function classMiss(links: LinkContext, shape: Shape, value: string): PageResult {
  const needle = value.toLowerCase().replace(/^q/, '')
  const scored = CLASSES.map((c) => {
    let score = 0
    if (c.qid === needle) score += 10
    for (const word of value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) if (c.label.toLowerCase().includes(word)) score++
    return { c, score }
  })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 8)
  const pool = scored.length ? scored.map((s) => s.c) : CLASSES.slice(0, 8)
  const suggestions =
    shape === 'b'
      ? Object.fromEntries(pool.map((c) => [c.label, at(links, `classes/Q${c.qid}`, shape)]))
      : Object.fromEntries(pool.map((c) => [`Q${c.qid}`, at(links, `classes/Q${c.qid}`, shape)]))
  return miss(links, `classes/${value}`, `No class '${value}' in this demo slice (top-20 of 8,975 catalog classes)`, suggestions, {
    dataset: at(links, 'classes', shape),
    wikidataLive: /^q\d+$/i.test(value)
      ? `https://www.wikidata.org/wiki/${value.toUpperCase()}`
      : `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(value)}`,
  })
}

// ---------------------------------------------------------------------------
// the custom landing — a clickable index explaining the three shapes

function shapesLandingHtml(links: LinkContext): string {
  const j = JOBS[0] as Job
  const li = (u: string, label: string, missRow = false) =>
    `<li><a href="${esc(u)}"${missRow ? ' style="color:#d1242f"' : ''}><code>${esc(label)}</code></a></li>`
  const col = (s: Shape) => `
<h2>?shape=${s} — ${esc(SHAPE_INFO[s].name)}</h2>
<p class="muted">${esc(SHAPE_INFO[s].rule)}</p>
<ul class="links">
${li(at(links, `jobs/${j.id}`, s), `job — ${j.title.trim()}`)}
${li(at(links, 'jobs', s), 'jobs dataset (53 records, dot-do/data#34 PoC)')}
${li(at(links, `companies/${j.company}`, s), `company view — ${j.company}`)}
${li(at(links, 'classes/Q5', s), 'class — human (Q5)')}
${li(at(links, 'classes/Q13442814', s), 'class — scholarly article')}
${li(at(links, 'classes', s), 'classes dataset (top-20 head classes)')}
${li(at(links, 'jobs/staff-engineer', s), 'miss — jobs/staff-engineer (suggestions)', true)}
${li(at(links, 'classes/Q42', s), 'miss — classes/Q42 (suggestions)', true)}
</ul>`

  return page('shapes.api.ht', `
<h1>shapes<span class="tld">.api.ht</span></h1>
<p class="muted">The same entity, three candidate link shapes — the live comparison for
<a href="https://github.com/dot-do/data/issues/36">dot-do/data#36</a>, feeding the
<a href="https://github.com/dot-do/data/issues/13">#13</a> per-brand link-contract ruling.</p>

<h2>Usage</h2>
<pre><code>shapes.api.ht/{dataset}/{id}?shape=a|b|c</code></pre>
<p class="muted">Datasets: <code>jobs</code>, <code>classes</code> (+ <code>companies</code>/<code>locations</code>
Views over jobs). Omitting <code>?shape=</code> defaults to <code>a</code>. Every JSON response carries a
<code>shapes</code> hop map to the same page in the other two shapes, so you can compare in place.
A miss is a page too: 404 with <code>suggestions</code> as a link map in the current shape.</p>
${SHAPES.map(col).join('\n')}

<h2>Compare the same page across shapes</h2>
<ul class="links">
${SHAPES.map((s) => li(at(links, `jobs/${j.id}`, s), `same job, ?shape=${s}`)).join('\n')}
${SHAPES.map((s) => li(at(links, 'classes/Q5', s), `same class, ?shape=${s}`)).join('\n')}
</ul>

<h2>From a terminal or an agent</h2>
<pre><code>curl ${esc(at(links, `jobs/${j.id}`, 'a'))}</code></pre>

<footer>Data embedded at build time, zero request-time fetches: 53 canonical Job records
(dot-do/data#34 adapter PoC, 3 Greenhouse boards) + top-20 head Wikidata classes
(committed wiki-sources catalog, snapshot ${esc(CLASSES_SNAPSHOT)}, CC0-1.0).
<a href="${esc(links.apex('/docs'))}">docs</a> · <a href="${esc(links.apex('/'))}">api.ht</a></footer>
`)
}

// ---------------------------------------------------------------------------
// the tool

export const shapesTool: HypertextTool = {
  name: 'shapes',
  description: 'Link-shape comparison — the same entity in three candidate link shapes (dot-do/data#36)',
  valueSyntax: '<dataset>/<id>  (jobs/4266196009, classes/Q5; ?shape=a|b|c)',
  examples: ['jobs/4266196009', 'classes/Q5', 'jobs', 'classes', 'jobs/staff-engineer'],
  source:
    'Embedded static data: 53 canonical Job records (dot-do/data#34 adapter PoC, Greenhouse) + top-20 head Wikidata classes (wiki-sources catalog, CC0-1.0). Zero request-time fetches.',
  landingHtml: shapesLandingHtml,

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const links = ctx.links
    const rawShape = (ctx.query.shape ?? 'a').toLowerCase()
    if (!(SHAPES as string[]).includes(rawShape)) {
      return badValue(`Unknown shape '${rawShape}' — pick one of ?shape=a (typed camelCase edges), ?shape=b (label-keyed maps), ?shape=c (typed + variations)`)
    }
    const shape = rawShape as Shape

    const trimmed = value.replace(/^\/+|\/+$/g, '')
    const slash = trimmed.indexOf('/')
    const dataset = slash === -1 ? trimmed : trimmed.slice(0, slash)
    const id = slash === -1 ? '' : trimmed.slice(slash + 1)

    let result: PageResult
    switch (dataset) {
      case 'jobs': {
        if (!id) result = jobsIndex(links, shape)
        else {
          const j = JOBS.find((x) => x.id === id)
          result = j ? jobPage(links, shape, j) : jobMiss(links, shape, id)
        }
        break
      }
      case 'companies': {
        if (!id)
          result = ok(
            links,
            'companies',
            {
              type: 'Index',
              name: 'companies (Views over jobs)',
              companies: Object.fromEntries(uniq(JOBS.map((x) => x.company)).map((co) => [co, at(links, `companies/${co}`, shape)])),
            },
            { dataset: at(links, 'jobs', shape) },
          )
        else result = companyPage(links, shape, id)
        break
      }
      case 'locations': {
        if (!id)
          result = ok(
            links,
            'locations',
            {
              type: 'Index',
              name: 'locations (Views over jobs)',
              locations: Object.fromEntries(uniq(JOBS.map(locSlug)).map((l) => [l, at(links, `locations/${l}`, shape)])),
            },
            { dataset: at(links, 'jobs', shape) },
          )
        else result = locationPage(links, shape, slugify(id))
        break
      }
      case 'classes': {
        if (!id) result = classesIndex(links, shape)
        else {
          const qid = id.replace(/^Q/i, '')
          const cls = CLASSES.find((c) => c.qid === qid)
          result = cls ? classPage(links, shape, cls) : classMiss(links, shape, id)
        }
        break
      }
      default:
        result = miss(
          links,
          trimmed,
          `Unknown dataset '${dataset}'`,
          {
            jobs: at(links, 'jobs', shape),
            classes: at(links, 'classes', shape),
            companies: at(links, 'companies', shape),
            locations: at(links, 'locations', shape),
          },
          {},
        )
    }

    return {
      data: {
        shape: { [shape]: SHAPE_INFO[shape].name, rule: SHAPE_INFO[shape].rule },
        ...result.data,
      },
      links: result.links,
      status: result.status,
    }
  },
}
