/**
 * seed.js — the §5.2 sandbox seed corpus for the fn-strategy substrate,
 * mechanically produced against the substrate's record schemas.
 *
 * SYNTHETIC DATA, ALWAYS LABELED: every record carries `example: true`, a
 * "[demo]" title prefix, and belongs to a fictional company. No real company
 * or person names appear (fixture law); no financial identifiers are used.
 * The seed is versioned with the manifest — reseeding is a build step.
 *
 * Quality bar (§5.2.3): the corpus exercises every declared operation —
 * plans with objectives, objectives with full key-result sets at varied
 * cycles/statuses so the branching collection genuinely branches, and
 * analyses with substantive content.
 */

const RETENTION = 'ephemeral — per-isolate memory only; no durability at wave zero'

/** The one fictional tenant (live-demo ruling: real handlers, simulated data). */
export const demoTenant = {
  id: 'org-demo-1',
  name: '[demo] Aster Gale Holdings (fictional)',
  example: true,
  retention: RETENTION,
}

export const plans = [
  {
    id: 'pl-demo-1',
    $type: 'https://schema.org.ai/Plan',
    example: true,
    title: '[demo] FY2026 strategic plan — Aster Gale Holdings (fictional)',
    status: 'active',
    horizon: 'FY2026',
    pillars: [
      'Concentrate the portfolio on two service lines with recurring demand',
      'Stand up a repeatable partner channel before direct-sales expansion',
      'Retire legacy tooling that carries un-costed operational risk',
    ],
    objectiveIds: ['obj-demo-1', 'obj-demo-2', 'obj-demo-3'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'pl-demo-2',
    $type: 'https://schema.org.ai/Plan',
    example: true,
    title: '[demo] FY2025 strategic plan — Aster Gale Holdings (fictional), archived',
    status: 'archived',
    horizon: 'FY2025',
    pillars: ['Consolidate three regional units under one operating model'],
    objectiveIds: ['obj-demo-4'],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]

export const objectives = [
  {
    id: 'obj-demo-1',
    $type: 'https://schema.org.ai/Objective',
    example: true,
    title: '[demo] Grow recurring revenue share of total revenue',
    planId: 'pl-demo-1',
    cycle: '2026-H1',
    status: 'on-track',
    owner: '[demo] Chief Executive (fictional role, no person named)',
    keyResults: [
      { id: 'kr-demo-1a', example: true, metric: 'recurring revenue share', baseline: 0.34, target: 0.5, current: 0.41, unit: 'ratio' },
      { id: 'kr-demo-1b', example: true, metric: 'multi-year contracts signed', baseline: 2, target: 8, current: 5, unit: 'count' },
    ],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'obj-demo-2',
    $type: 'https://schema.org.ai/Objective',
    example: true,
    title: '[demo] Launch the partner channel in two named segments',
    planId: 'pl-demo-1',
    cycle: '2026-H1',
    status: 'at-risk',
    owner: '[demo] Head of Strategy (fictional role, no person named)',
    keyResults: [
      { id: 'kr-demo-2a', example: true, metric: 'partners onboarded', baseline: 0, target: 6, current: 1, unit: 'count' },
      { id: 'kr-demo-2b', example: true, metric: 'partner-sourced pipeline', baseline: 0, target: 400000, current: 55000, unit: 'usd' },
    ],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'obj-demo-3',
    $type: 'https://schema.org.ai/Objective',
    example: true,
    title: '[demo] Retire the legacy scheduling stack',
    planId: 'pl-demo-1',
    cycle: '2026-H2',
    status: 'draft',
    owner: '[demo] Chief Operating Officer (fictional role, no person named)',
    keyResults: [
      { id: 'kr-demo-3a', example: true, metric: 'workloads migrated', baseline: 0, target: 12, current: 0, unit: 'count' },
    ],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'obj-demo-4',
    $type: 'https://schema.org.ai/Objective',
    example: true,
    title: '[demo] Consolidate regional units under one operating model',
    planId: 'pl-demo-2',
    cycle: '2025-H2',
    status: 'achieved',
    owner: '[demo] Chief Executive (fictional role, no person named)',
    keyResults: [
      { id: 'kr-demo-4a', example: true, metric: 'units on the shared model', baseline: 0, target: 3, current: 3, unit: 'count' },
    ],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]

export const analyses = [
  {
    id: 'an-demo-1',
    $type: 'https://schema.org.ai/Analysis',
    example: true,
    title: '[demo] Market landscape — regional facilities-services demand (synthetic)',
    kind: 'market',
    cycle: '2026-H1',
    summary:
      'Synthetic market read for the fictional Aster Gale Holdings: demand concentration by segment, ' +
      'switching-cost observations, and two candidate wedges. Generated example content — every figure is invented.',
    findings: [
      { claim: 'Segment A demand is concentrated in multi-site operators', support: 'synthetic example figure set A' },
      { claim: 'Segment B buyers renew on 12-month cycles', support: 'synthetic example figure set B' },
    ],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
  {
    id: 'an-demo-2',
    $type: 'https://schema.org.ai/Analysis',
    example: true,
    title: '[demo] Competitor register — fictional entrants only',
    kind: 'competitor',
    cycle: '2026-H1',
    summary: 'A register of wholly fictional competitors used to exercise the Analysis record shape.',
    findings: [
      { claim: 'Vantage Orchard Co. (fictional) competes on bundled pricing', support: 'synthetic example note' },
      { claim: 'Bluewick Array Ltd. (fictional) competes on onboarding speed', support: 'synthetic example note' },
    ],
    tenant: demoTenant.id,
    retention: RETENTION,
  },
]
