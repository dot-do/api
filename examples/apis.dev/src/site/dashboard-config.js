/**
 * dashboard-config.js — the apis.dev INSTANCE of the abstract dashboard
 * template (./dashboard-template.js; template idea #30, apps.ax). All
 * property-specific knowledge lives here as config; the template stays
 * generic. Prices are derived from the manifest's own RATE_ROWS — never
 * retyped — so the billing panel cannot drift from /pricing.
 *
 * NO VERDICTS map (founder ruling 2026-08-24): apis.dev does not display
 * api.qa scores at all — scoring is api.qa's product, linked, never
 * duplicated. Each record's cell links to its conformance page instead.
 */

import { RATE_ROWS, manifest } from '../manifest.js'

const metered = RATE_ROWS.find((r) => r.freeQuota !== undefined)

export const dashboardConfig = {
  brand: 'apis.dev',
  description:
    'Developer dashboard v1: workspaces, registered APIs with links to their api.qa conformance pages, usage and billing panels.',
  demoNotice:
    'Demo-labeled shell. The APIs and Workspaces panels call this origin’s real doors; workspaces are ephemeral wave-zero sandboxes. Usage and billing are demo-local placeholders until the apis.ax account lane is wired.',
  panels: [
    {
      id: 'apis',
      kind: 'collection',
      title: 'APIs',
      wide: true,
      source: { method: 'GET', path: '/apis' },
      columns: { idKey: 'id', metaKeys: ['pricingModel', 'binding'], hrefKey: 'conformance' },
      note: 'live from GET /apis — real records, provenance-stamped; scoring is api.qa’s product — each record links to its conformance page there',
    },
    {
      id: 'workspaces',
      kind: 'mint',
      title: 'Workspaces',
      source: { method: 'POST', path: '/workspaces' },
      cta: 'Mint sandbox workspace',
      note: 'live door — keyless; ephemeral in wave zero, retention disclosed on every mint',
    },
    {
      id: 'usage',
      kind: 'kv',
      title: 'Usage',
      demo: true,
      entries: [
        ['calls this period', '— (demo-local: no queryable usage store is wired yet)'],
        ['metered operations', RATE_ROWS.map((r) => r.operation).join(' · ')],
      ],
      note: 'metering seams emit structured events per call; the readout lane lands with the apis.ax account wiring',
    },
    {
      id: 'billing',
      kind: 'kv',
      title: 'Billing',
      demo: true,
      entries: [
        [
          'rate',
          `$${metered.price}/call after ${metered.freeQuota.toLocaleString('en-US')} free — test-mode: nothing is charged`,
        ],
        ['ceiling', `$${manifest.pricing.hardCeiling} hard`],
        ['account door', { href: 'https://apis.ax/account', label: 'apis.ax/account' }],
        ['rate card', { href: '/pricing', label: '/pricing' }],
      ],
      note: 'demo-local fallback — balances and invoices arrive via the apis.ax/account lane, not this shell',
    },
  ],
}
