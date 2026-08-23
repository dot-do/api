/**
 * manifest.js — the ONE site manifest every fn-strategy machine face is
 * generated from (vendored axp-faces 0.3.0, pinned apis-ax-axp@2.6.0, digest
 * a9a1197c…, extension axp-ext-rates-g2@0.2.0). Never hand-roll a face: the
 * quartet, the branching collection, the probes, and the conneg middleware
 * all derive from this file. The four extension members — rates[] (top-level
 * in the Pricing Document), the canonical operationId on every route, the
 * card's links.verify, and the top-level card g2 object — are native
 * generator inputs here, at their ruled placements.
 *
 * PLACEHOLDER ADDRESS. Register row fn-strategy is a GAP row — no
 * api-grammar name is held. Per template spec §0 the G3 substrate is built
 * under a placeholder org.ai address; the G4 brand attaches when a name is
 * acquired (#16). Nothing here is a brand and nothing here carries a
 * positioning claim.
 */

import { defineSiteManifest } from './axp/manifest.js'
import { objectives } from './seed.js'

export const ORIGIN = 'https://fn-strategy.org.ai'

/**
 * The row's G2/ICP coordinates — ONE object, two placements: carried verbatim
 * onto the capability card as the top-level `g2` member (axp-ext-rates-g2 §4)
 * and embedded in the /icp.json document worker.js serves (links.icp stays
 * legal beside g2). GAP-row honesty: coordinates only, no brand, no claim.
 */
export const g2 = {
  icp: {
    companyTypes: ['all — horizontal Function row'],
    jobTypes: ['founder', 'chief executive', 'strategy officer', 'chief of staff'],
  },
  coordinates: ['Function=Strategy', 'Department=Executive'],
  personas: [
    { id: 'founder-operator', description: 'founder/CEO steering an annual-or-episodic planning cycle' },
    { id: 'strategy-officer', description: 'strategy/chief-of-staff role running the objective and analysis cadence' },
    { id: 'agent-caller', description: 'autonomous agent consuming plan/objective/analysis records over this machine face (B2A)' },
  ],
  motion: 'B2A',
  agentClasses: [
    { id: 'reader-agent', description: 'keyless reads: the quartet, /plans, /objectives, /analyses, /verify — no key, no account' },
    {
      id: 'sandbox-transactor',
      description:
        'exercises the headless doors (POST /objectives, POST /key-results/{id}/progress) against labeled synthetic state; ' +
        'mutations are per-isolate and ephemeral at wave zero',
    },
    { id: 'mcp-caller', description: 'the same Nouns and verbs over the /mcp JSON-RPC door — one definition, two transports' },
  ],
}

const llmsBody = `# fn-strategy — wave-zero strategy-function substrate (placeholder address)

The G3 substrate for the Strategy function (one of the 13 horizontal Function
families): typed Plan / Objective / KeyResult / Analysis records (data face)
and the strategic-planning/OKR system-of-record doors on the SAME collections
(headless face). One definition, two plies.

This is a wave-zero build of a GAP register row served under a placeholder
address — no api-grammar brand name is held for this function yet, and this
surface claims none.

## What is honest here

- **All records are synthetic example data**, clearly labeled (\`example: true\`,
  "[demo]" titles, fictional companies only). The sandbox is the real product
  code over simulated data — never a faked demo.
- **Anonymous sandbox is the floor**: every GET below answers keyless.
- **Mutations are ephemeral**: POST doors write to per-isolate memory only —
  no durability at wave zero; state resets whenever the isolate recycles.
- **Pricing is a stub rate card**: the Pricing Document is metered-shaped so
  the 402 OFFER boundary is real and probeable, but \`binding: false\` and its
  statement say plainly that no live settlement is wired and no charge can
  occur. The OFFER's alternatives ladder (pay / work / claim) is likewise
  declared stub-by-stub.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/objectives              # keyless typed OK — the branching collection
curl ${ORIGIN}/objectives?cycle=2026-H1
curl ${ORIGIN}/plans
curl ${ORIGIN}/analyses
curl ${ORIGIN}/pricing                 # the stub rate card, binding: false
curl ${ORIGIN}/verify                  # run our tests — the published suite
\`\`\`

## Headless doors (same collections, system-of-record verbs)

\`\`\`sh
curl -X POST ${ORIGIN}/objectives -H 'content-type: application/json' \\
  -d '{"title":"[demo] my objective","cycle":"2026-H2"}'
curl -X POST ${ORIGIN}/key-results/kr-demo-1a/progress \\
  -H 'content-type: application/json' -d '{"current":0.45}'
\`\`\`
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'fn-strategy.org.ai',
  description:
    'Wave-zero strategy-function substrate (placeholder address for a GAP register row): typed Plan/Objective/KeyResult/Analysis records and headless OKR system-of-record doors from one definition, with a labeled synthetic sandbox as the keyless floor.',
  version: '0.1.0',

  collection: {
    path: '/objectives',
    operationId: 'listObjectives', // the canonical name the rate row and the MCP tool share (axp-ext-rates-g2 §1)
    memberName: 'results',
    summary: 'Objectives — the branching typed collection (OK | EMPTY | BLOCKED), keyless, labeled demo seed',
    records: objectives,
    filters: ['cycle', 'status'],
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
    /* axp-ext-rates-g2 §2 — the operationId-keyed operation rate card, served
       as a TOP-LEVEL array of the Pricing Document (the ruled placement).
       binding: false + the statement above govern these rows too: stated
       intent, no settlement wired. Zero-price rows are the keyless floor. */
    rates: [
      { operation: 'listObjectives', price: 0, note: 'keyless floor — the branching collection is free' },
      { operation: 'getObjective', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'listPlans', price: 0, note: 'keyless floor' },
      { operation: 'getPlan', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'createObjective', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'recordKeyResultProgress', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'listAnalyses', price: 0, note: 'keyless floor' },
      { operation: 'getAnalysis', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
    ],
    offers: [
      {
        id: 'b2a-metered-stub',
        title: '[stub] Metered access — wave-zero rate-card stub; no live settlement',
        price: { model: 'metered', hardCeiling: 100, unit: 'usd-per-month', perCall: 0.002 },
        alternatives: [
          {
            kind: 'pay',
            status: 'stub',
            description:
              '402 metering against machine identity (id.org.ai grain). STUB at wave zero: the settlement rail is not wired and no charge can occur.',
          },
          {
            kind: 'work',
            status: 'stub',
            description:
              'Earn credits via proof-of-work tasks (the B2A ladder, rung 1). STUB at wave zero: the credits ledger is not wired.',
          },
          {
            kind: 'claim',
            status: 'stub',
            description:
              'A human claims this agent workspace for attribution and longer tenure (rung 2). STUB at wave zero: the claim door is not wired.',
          },
        ],
      },
    ],
    offerPath: '/offer',
    spendParam: 'spend',
  },

  routes: [
    // axp-ext-rates-g2 §1: operationId is the ONE cross-face name on every
    // route — OpenAPI operationId = MCP tool name = suite reference = rate key.
    { method: 'GET', path: '/plans', operationId: 'listPlans', summary: 'Plans — typed list of strategic plans (labeled demo seed)' },
    { method: 'GET', path: '/plans/{planId}', operationId: 'getPlan', summary: 'One plan by id — typed OK | EMPTY' },
    { method: 'GET', path: '/objectives/{objectiveId}', operationId: 'getObjective', summary: 'One objective by id, with its key results — typed OK | EMPTY' },
    {
      method: 'POST',
      path: '/objectives',
      operationId: 'createObjective',
      summary: 'Create an objective (headless system-of-record door; ephemeral per-isolate state at wave zero)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'cycle'],
              properties: { title: { type: 'string' }, cycle: { type: 'string' }, planId: { type: 'string' } },
            },
          },
        },
      },
      responses: { 201: { description: 'OK envelope with the minted objective (labeled example data, disclosed retention)' } },
    },
    {
      method: 'POST',
      path: '/key-results/{keyResultId}/progress',
      operationId: 'recordKeyResultProgress',
      summary: 'Record key-result progress (headless door; ephemeral per-isolate state at wave zero)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['current'], properties: { current: { type: 'number' } } },
          },
        },
      },
      responses: { 200: { description: 'OK envelope with the updated key result' } },
    },
    { method: 'GET', path: '/analyses', operationId: 'listAnalyses', summary: 'Analyses — typed list of market/competitor analysis records (labeled demo seed)' },
    { method: 'GET', path: '/analyses/{analysisId}', operationId: 'getAnalysis', summary: 'One analysis by id — typed OK | EMPTY' },
    { method: 'GET', path: '/icp.json', operationId: 'getIcp', summary: 'Self-classification: the G2 coordinates (ICP + personas) and agent classes this surface distinguishes' },
    { method: 'GET', path: '/verify', operationId: 'getVerify', summary: 'Run our tests — the published verification suite for this surface' },
    { method: 'GET', path: '/verify/suite.json', operationId: 'getVerifySuite', summary: 'The published suite document (machine-readable)' },
  ],

  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    // axp-ext-rates-g2 §1: MCP tools are declared BY NAME — each string IS the
    // canonical operationId; descriptions and input schemas are served live by
    // the /mcp door's tools/list (worker.js).
    tools: ['listPlans', 'getPlan', 'listObjectives', 'getObjective', 'listAnalyses', 'getAnalysis'],
  },

  llms: { body: llmsBody },
  verifyUrl: '/verify', // → links.verify on the card (axp-ext-rates-g2 §3; absolutized by the generator)
  g2, // → the top-level card g2 object (axp-ext-rates-g2 §4; carried verbatim)
  icpUrl: `${ORIGIN}/icp.json`,
  conformanceUrl: 'https://api.qa/fn-strategy.org.ai',

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>fn-strategy.org.ai</title></head>
<body>
<h1>fn-strategy — strategy-function substrate (placeholder address)</h1>
<p>Wave-zero build of a GAP register row: typed Plan / Objective / KeyResult / Analysis
records and headless OKR system-of-record doors from one definition. All records are
clearly labeled synthetic example data; the keyless sandbox is the floor.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> ·
<a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# fn-strategy.org.ai

Wave-zero strategy-function substrate (placeholder address for a GAP register row).
All records are labeled synthetic example data; the keyless sandbox is the floor.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
})
