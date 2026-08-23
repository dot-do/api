/**
 * substrate.ts — Stratum A: the G3 APIProduct instance for register row
 * `media-entertainment` (template spec §1, docs/plans/2026-08-23-property-template-spec.md
 * in the studio repo).
 *
 * One substrate, two plies (§3): the data face serves the typed record
 * collections below; the headless face serves the SAME collections as
 * system-of-record doors for the native-bound Nouns (CMS "Content: THE PAGE"
 * coordinate). There is no second API.
 *
 * Every record served from this file is MECHANICALLY GENERATED example data
 * (template §5.2): synthetic titles, no real company or person names, every
 * record carries `example: true` and a "[demo]" title prefix. The register
 * row's source route (the estate's own produced-content exhaust) is
 * first-party but is NOT ingested at wave zero — the sandbox seed below is
 * the §5.2 synthetic corpus, labeled.
 */

export const SUBSTRATE = 'media-entertainment'
export const ORIGIN = 'https://apis.productions'

// ---------------------------------------------------------------------------
// Noun schemas (G1 anchors: schema.org CreativeWork / MediaObject; the Page
// record is the H5 Content ply). $type resolves against https://schema.org.ai.
// ---------------------------------------------------------------------------

export interface Production {
  $type: 'Production' // schema.org/CreativeWork grain
  id: string
  title: string
  kind: 'film' | 'deck' | 'page-suite'
  status: 'released' | 'in-production'
  releasedAt?: string
  example: true
  note: string
}

export interface MediaAsset {
  $type: 'MediaAsset' // schema.org/MediaObject grain
  id: string
  productionId: string
  role: 'master' | 'poster' | 'caption'
  contentType: string
  durationSeconds?: number
  example: true
  note: string
}

export interface Page {
  $type: 'Page' // H5 Content ply — "Content: THE PAGE"
  id: string
  productionId?: string
  slug: string
  title: string
  body: string
  example: true
  note: string
}

export interface AudienceSignal {
  $type: 'AudienceSignal' // distribution-exhaust measurement (generated)
  id: string
  productionId: string
  channel: 'site' | 'social' | 'direct'
  period: string
  views: number
  agentReferredShare: number // fraction of views arriving via agent referral
  example: true
  note: string
}

// ---------------------------------------------------------------------------
// §5.2 mechanically produced sandbox seed — fixture law: synthetic names only,
// no real companies/people, every record labeled.
// ---------------------------------------------------------------------------

const DEMO_NOTE = 'example data — synthetic sandbox seed, not a produced work'

export const productions: Production[] = [
  {
    $type: 'Production',
    id: 'prod_0001',
    title: '[demo] Signal Harbor — launch film',
    kind: 'film',
    status: 'released',
    releasedAt: '2026-06-01',
    example: true,
    note: DEMO_NOTE,
  },
  {
    $type: 'Production',
    id: 'prod_0002',
    title: '[demo] Meadowline — pitch deck',
    kind: 'deck',
    status: 'released',
    releasedAt: '2026-07-15',
    example: true,
    note: DEMO_NOTE,
  },
  {
    $type: 'Production',
    id: 'prod_0003',
    title: '[demo] Orchard Static — brand page suite',
    kind: 'page-suite',
    status: 'in-production',
    example: true,
    note: DEMO_NOTE,
  },
  {
    $type: 'Production',
    id: 'prod_0004',
    title: '[demo] Quarry Lights — launch film',
    kind: 'film',
    status: 'in-production',
    example: true,
    note: DEMO_NOTE,
  },
]

/** Every released production carries a full asset set (master + poster +
 *  caption) so the seed has the §5.2 "realistic depth", not a token row. */
export const assets: MediaAsset[] = [
  { $type: 'MediaAsset', id: 'ast_0001', productionId: 'prod_0001', role: 'master', contentType: 'video/mp4', durationSeconds: 92, example: true, note: DEMO_NOTE },
  { $type: 'MediaAsset', id: 'ast_0002', productionId: 'prod_0001', role: 'poster', contentType: 'image/png', example: true, note: DEMO_NOTE },
  { $type: 'MediaAsset', id: 'ast_0003', productionId: 'prod_0001', role: 'caption', contentType: 'text/vtt', example: true, note: DEMO_NOTE },
  { $type: 'MediaAsset', id: 'ast_0004', productionId: 'prod_0002', role: 'master', contentType: 'application/pdf', example: true, note: DEMO_NOTE },
  { $type: 'MediaAsset', id: 'ast_0005', productionId: 'prod_0002', role: 'poster', contentType: 'image/png', example: true, note: DEMO_NOTE },
  { $type: 'MediaAsset', id: 'ast_0006', productionId: 'prod_0004', role: 'poster', contentType: 'image/png', example: true, note: DEMO_NOTE },
]

export const seedPages: Page[] = [
  {
    $type: 'Page',
    id: 'page_0001',
    productionId: 'prod_0001',
    slug: 'signal-harbor',
    title: '[demo] Signal Harbor — landing page',
    body: 'Example landing copy for a demo launch film. This record is synthetic sandbox seed.',
    example: true,
    note: DEMO_NOTE,
  },
  {
    $type: 'Page',
    id: 'page_0002',
    productionId: 'prod_0002',
    slug: 'meadowline',
    title: '[demo] Meadowline — deck page',
    body: 'Example page body for a demo deck. This record is synthetic sandbox seed.',
    example: true,
    note: DEMO_NOTE,
  },
]

export const audienceSignals: AudienceSignal[] = [
  { $type: 'AudienceSignal', id: 'sig_0001', productionId: 'prod_0001', channel: 'site', period: '2026-07', views: 4210, agentReferredShare: 0.18, example: true, note: DEMO_NOTE },
  { $type: 'AudienceSignal', id: 'sig_0002', productionId: 'prod_0001', channel: 'social', period: '2026-07', views: 1730, agentReferredShare: 0.04, example: true, note: DEMO_NOTE },
  { $type: 'AudienceSignal', id: 'sig_0003', productionId: 'prod_0002', channel: 'direct', period: '2026-07', views: 640, agentReferredShare: 0.31, example: true, note: DEMO_NOTE },
]

// ---------------------------------------------------------------------------
// The G3 APIProduct instance (template §1 shape). Brandless by law: no ICP,
// no motion, no offer, no positioning here — those are G4 fields in
// ../projection.apis.productions.json.
// ---------------------------------------------------------------------------

export const apiProduct = {
  substrate: SUBSTRATE,
  nouns: [
    { schema: { $type: 'Production', $context: 'https://schema.org.ai', anchor: 'schema.org/CreativeWork' }, binding: 'native', verbs: ['listProductions', 'getProduction'] },
    { schema: { $type: 'MediaAsset', $context: 'https://schema.org.ai', anchor: 'schema.org/MediaObject' }, binding: 'native', verbs: ['listAssets'] },
    { schema: { $type: 'Page', $context: 'https://schema.org.ai', anchor: 'H5 Content ply' }, binding: 'native', verbs: ['listPages', 'createPage'] },
    { schema: { $type: 'AudienceSignal', $context: 'https://schema.org.ai', anchor: 'distribution-exhaust measurement' }, binding: 'generated', verbs: ['listAudienceSignals'] },
  ],
  systems: [
    // Headless ply (§3.2): the row names CMS — "Content: THE PAGE" (H5) — at
    // this row's coordinate. DAM is NOT declared: the register marks it
    // [UNVERIFIED whether in the 52-System catalog], and an unverified
    // coordinate is not declared (presence-when-true).
    { system: 'Content', coordinates: ['media-production'] },
  ],
  transports: ['REST', 'MCP'], // live-only: the transports this worker actually mounts
  operations: [
    'listProductions',
    'getProduction',
    'listAssets',
    'listPages',
    'createPage',
    'listAudienceSignals',
  ],
  sandbox: {
    seedVersion: '2026-08-23.1',
    corpus: { productions: 4, assets: 6, pages: 2, audienceSignals: 3 },
    law: 'template §5.2 — mechanically generated, labeled example data; synthetic names only; reseed is a build step (edit substrate.ts)',
    retention: 'sandbox writes (createPage) are ephemeral: per-isolate memory, discarded on isolate recycle',
  },
  suite: { url: '/verify/suite.json', runner: 'api.qa/suite@1' },
  meters: [
    // one meter per operation — seams only at wave zero (§7.4)
    'listProductions',
    'getProduction',
    'listAssets',
    'listPages',
    'createPage',
    'listAudienceSignals',
  ],
} as const
