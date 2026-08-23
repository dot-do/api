/**
 * manifest.js — the ONE site manifest every fn-corporate-affairs machine face
 * is generated from (vendored axp-faces, pinned apis-ax-axp@2.6.0, digest
 * a9a1197c…). Never hand-roll a face: the quartet, the branching collection,
 * the probes, and the conneg middleware all derive from this file.
 *
 * PLACEHOLDER ADDRESS. Register row fn-corporate-affairs is a GAP row — one
 * of the two Function rows with literally zero estate names. Per template
 * spec §0 the G3 substrate is built under a placeholder org.ai address; the
 * G4 brand attaches when a name is acquired (#16). Nothing here is a brand
 * and nothing here carries a positioning claim.
 *
 * LADDER ADVERTISEMENT (batch-2 rollup rule — binding): only MOUNTED rungs
 * are advertised. At wave zero the only mounted rung is the keyless anon
 * sandbox (rung 0), so the 402 OFFER's alternatives carry exactly that one
 * entry; the pay/work/claim rungs appear when they mount, not before
 * (presence-when-true).
 */

import { defineSiteManifest } from './axp/manifest.js'
import { stakeholders } from './seed.js'

export const ORIGIN = 'https://fn-corporate-affairs.org.ai'

const llmsBody = `# fn-corporate-affairs — wave-zero corporate-affairs-function substrate (placeholder address)

The G3 substrate for the Corporate Affairs function (one of the 13 horizontal
Function families): typed Stakeholder / Engagement / Mention / Disclosure
records (data face) and the stakeholder/IR-CRM system-of-record doors on the
SAME collections (headless face). One definition, two plies.

This is a wave-zero build of a GAP register row served under a placeholder
address — no api-grammar brand name is held for this function yet, and this
surface claims none.

## Decomposition honesty

Board/governance artifacts are NOT served here — that record slice belongs to
the entity back-office substrate (holdings-corporate-mgmt). Public filings are
not owned here either: the Disclosure collection is a federated
corporate-affairs VIEW of a corpus the public-record read layer owns, and at
wave zero that federation is unwired — every disclosure record is a labeled
synthetic stand-in that says so on its face.

## What is honest here

- **All records are synthetic example data**, clearly labeled (\`example: true\`,
  "[demo]" titles, fictional companies/outlets/regulators only). The sandbox is
  the real product code over simulated data — never a faked demo.
- **Anonymous sandbox is the floor**: every GET below answers keyless.
- **Mutations are ephemeral**: POST doors write to per-isolate memory only —
  no durability at wave zero; state resets whenever the isolate recycles.
- **Pricing is a stub rate card**: the Pricing Document is metered-shaped so
  the 402 OFFER boundary is real and probeable, but \`binding: false\` and its
  statement say plainly that no live settlement is wired and no charge can
  occur. Only the mounted sandbox rung is advertised in OFFER alternatives.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/stakeholders            # keyless typed OK — the branching collection
curl ${ORIGIN}/stakeholders?type=investor
curl ${ORIGIN}/engagements
curl ${ORIGIN}/mentions
curl ${ORIGIN}/disclosures
curl ${ORIGIN}/pricing                 # the stub rate card, binding: false, rates[] per operation
curl ${ORIGIN}/verify                  # run our tests — the published suite
\`\`\`

## Headless doors (same collections, system-of-record verbs)

\`\`\`sh
curl -X POST ${ORIGIN}/stakeholders -H 'content-type: application/json' \\
  -d '{"title":"[demo] my stakeholder","type":"media"}'
curl -X POST ${ORIGIN}/engagements -H 'content-type: application/json' \\
  -d '{"title":"[demo] my briefing","stakeholderId":"st-demo-1","kind":"briefing"}'
\`\`\`
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'fn-corporate-affairs.org.ai',
  description:
    'Wave-zero corporate-affairs-function substrate (placeholder address for a GAP register row): typed Stakeholder/Engagement/Mention/Disclosure records and headless stakeholder-CRM system-of-record doors from one definition, with a labeled synthetic sandbox as the keyless floor.',
  version: '0.1.0',

  collection: {
    path: '/stakeholders',
    memberName: 'results',
    summary: 'Stakeholders — the branching typed collection (OK | EMPTY | BLOCKED), keyless, labeled demo seed',
    records: stakeholders,
    filters: ['type', 'status'],
    blockedScopes: ['admin', 'internal'],
    match: (rec, param, value) => String(rec[param]) === value,
  },

  pricing: {
    model: 'metered',
    hardCeiling: 100,
    unit: 'usd-per-month',
    price: 0.002,
    binding: false,
    statement:
      'STUB RATE CARD (wave zero, GAP register row): prices are stated intent for a placeholder projection. No live settlement is wired, no key or account exists, and no charge can occur. This document exists so the 402 OFFER boundary is real and machine-probeable before a brand attaches.',
    offers: [
      {
        id: 'b2a-metered-stub',
        title: '[stub] Metered access — wave-zero rate-card stub; no live settlement; only the mounted sandbox rung is advertised below',
        price: { model: 'metered', hardCeiling: 100, unit: 'usd-per-month', perCall: 0.002 },
        alternatives: [
          {
            kind: 'sandbox',
            status: 'mounted',
            description:
              'Return under the free keyless anon-sandbox floor (B2A ladder rung 0) — the only rung mounted at wave zero. ' +
              'The pay (402 metering on id.org.ai machine identity), work (earned credits), and claim (human attribution) rungs are NOT mounted and are therefore not advertised here (presence-when-true); each appears as an alternative when it mounts.',
          },
        ],
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  routes: [
    { method: 'GET', path: '/stakeholders/{stakeholderId}', summary: 'One stakeholder by id — typed OK | EMPTY' },
    {
      method: 'POST',
      path: '/stakeholders',
      summary: 'Create a stakeholder (headless stakeholder-CRM system-of-record door; ephemeral per-isolate state at wave zero)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'type'],
              properties: {
                title: { type: 'string' },
                type: { type: 'string', enum: ['investor', 'regulator', 'media', 'community'] },
                interests: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'OK envelope with the minted stakeholder (labeled example data, disclosed retention)' } },
    },
    { method: 'GET', path: '/engagements', summary: 'Engagements — typed list of the engagement log (labeled demo seed)' },
    { method: 'GET', path: '/engagements/{engagementId}', summary: 'One engagement by id — typed OK | EMPTY' },
    {
      method: 'POST',
      path: '/engagements',
      summary: 'Log an engagement against a stakeholder (headless door; ephemeral per-isolate state at wave zero)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'stakeholderId', 'kind'],
              properties: {
                title: { type: 'string' },
                stakeholderId: { type: 'string' },
                kind: { type: 'string' },
                summary: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'OK envelope with the logged engagement (labeled example data, disclosed retention)' } },
    },
    { method: 'GET', path: '/mentions', summary: 'Mentions — typed list of press-mention records (labeled demo seed)' },
    { method: 'GET', path: '/mentions/{mentionId}', summary: 'One mention by id — typed OK | EMPTY' },
    {
      method: 'GET',
      path: '/disclosures',
      summary: 'Disclosures — federated corporate-affairs view (labeled synthetic stand-ins; federation unwired at wave zero)',
    },
    { method: 'GET', path: '/disclosures/{disclosureId}', summary: 'One disclosure by id — typed OK | EMPTY' },
    { method: 'GET', path: '/icp.json', summary: 'Self-classification: the G2 coordinates (ICP + personas) and agent classes this surface distinguishes' },
    { method: 'GET', path: '/verify', summary: 'Run our tests — the published verification suite for this surface' },
    { method: 'GET', path: '/verify/suite.json', summary: 'The published suite document (machine-readable)' },
  ],

  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    // Batch-2 MCP auth rule: authless at the anon-sandbox rung (the only
    // mounted rung); bearer-key auth arrives with the rungs above when they
    // mount. Declared authless here because that is what serves.
    auth: 'none — anon-sandbox rung (keyless); bearer-key applies only to unmounted higher rungs',
    tools: [
      { name: 'listStakeholders', description: 'List stakeholders; filters: type, status (labeled demo seed)' },
      { name: 'getStakeholder', description: 'Get one stakeholder by id' },
      { name: 'listEngagements', description: 'List the engagement log (labeled demo seed)' },
      { name: 'getEngagement', description: 'Get one engagement by id' },
      { name: 'listMentions', description: 'List press-mention records (labeled demo seed)' },
      { name: 'getMention', description: 'Get one mention by id' },
      { name: 'listDisclosures', description: 'List the federated disclosure view (labeled synthetic stand-ins)' },
      { name: 'getDisclosure', description: 'Get one disclosure by id' },
    ],
  },

  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,
  conformanceUrl: 'https://api.qa/fn-corporate-affairs.org.ai',

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>fn-corporate-affairs.org.ai</title></head>
<body>
<h1>fn-corporate-affairs — corporate-affairs-function substrate (placeholder address)</h1>
<p>Wave-zero build of a GAP register row: typed Stakeholder / Engagement / Mention / Disclosure
records and headless stakeholder-CRM system-of-record doors from one definition. All records are
clearly labeled synthetic example data; the keyless sandbox is the floor. Governance artifacts
live on the entity back-office substrate, not here; disclosures are a federated view, unwired
and synthetic at wave zero.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> ·
<a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# fn-corporate-affairs.org.ai

Wave-zero corporate-affairs-function substrate (placeholder address for a GAP register row).
All records are labeled synthetic example data; the keyless sandbox is the floor.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
})
