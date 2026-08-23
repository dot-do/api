/**
 * manifest.js — the ONE site manifest every fn-risk-compliance machine face
 * is generated from (vendored axp-faces 0.3.0, pinned apis-ax-axp@2.6.0,
 * digest a9a1197c…, extension axp-ext-rates-g2@0.2.0 at digest 903e414d…,
 * vendored from axp.org.ai commit 523c9ef217d54feefb0b20734a6d2996a6965b79
 * via git show). Never hand-roll a face: the quartet, the branching
 * collection, the probes, and the conneg middleware all derive from this
 * file. The four extension members — rates[] (top-level in the Pricing
 * Document), the canonical operationId on every route, the card's
 * links.verify, and the top-level card g2 object — are NATIVE generator
 * inputs here, at their ruled placements. No bridges.
 *
 * FAMILY GRAIN, PLACEHOLDER ADDRESS. Register row fn-risk-compliance holds
 * 28 per-statute .dev fronts (the narrowest grain) and a GAP at the property
 * grain — no api-grammar umbrella name; compliance.do is convention-barred.
 * This is ONE pipeline serving the whole family under the placeholder
 * address; a held .dev front attaches later as a config change, not a
 * rebuild. Nothing here is a brand and nothing here carries a positioning
 * claim; no phantom umbrella is named.
 */

import { defineSiteManifest } from './axp/manifest.js'
import { checkDefinitions } from './seed.js'

export const ORIGIN = 'https://fn-risk-compliance.org.ai'

/**
 * The row's G2/ICP coordinates — ONE object, two placements: carried
 * verbatim onto the capability card as the top-level `g2` member
 * (axp-ext-rates-g2 §4) and embedded in the /icp.json document worker.js
 * serves (links.icp stays legal beside g2). GAP-row honesty: coordinates
 * only, no brand, no claim.
 */
export const g2 = {
  icp: {
    companyTypes: [
      'regulated CompanyTypes across the economy — each per-statute front has its own micro-ICP (government contractors for davisbacon, FFL dealers for fflcheck, benefits administrators for edi834), enumerable from the CompanyType × regulation join',
    ],
    jobTypes: ['compliance officer', 'operations lead'],
  },
  coordinates: ['Function=Risk&Compliance', 'Department=Compliance'],
  personas: [
    { id: 'compliance-officer', description: 'compliance officer at a regulated company tracking which obligations bind and when' },
    { id: 'ops-lead', description: 'operations lead needing a per-statute applicability answer before committing work' },
    { id: 'agent-caller', description: 'autonomous agent checking a step before acting — the row’s named caller class (B2A)' },
  ],
  motion: 'B2A',
  agentClasses: [
    { id: 'reader-agent', description: 'keyless reads: the quartet, /statutes, /checks, /check-runs, /obligations, /verify — no key, no account' },
    {
      id: 'sandbox-transactor',
      description:
        'exercises the check-runner door (POST /checks/{id}/runs) against labeled synthetic subjects; runs are per-isolate and ephemeral at wave zero',
    },
    { id: 'mcp-caller', description: 'the same Nouns and verbs over the /mcp JSON-RPC door — one definition, two transports' },
  ],
}

const llmsBody = `# fn-risk-compliance — wave-zero regulation-check family substrate (placeholder address)

The G3 substrate for the Risk & Compliance function at the FAMILY grain: one
pipeline behind the estate's 28 held per-statute .dev check fronts
(davisbacon.dev, fflcheck.dev, fifra.dev, neshap.dev, edi834.dev and the
enumerated tail — all held, none serving yet). Typed Statute /
CheckDefinition / CheckRun / Obligation records (data face) and the shared
check-runner door on the SAME collections (headless face). One definition,
two plies.

This is a wave-zero build of a register row whose umbrella name is a GAP —
no api-grammar function-level name is held and this surface claims none.

## What is honest here

- **Statutes and check definitions are reference facts**: public-law
  citations and estate-register rows, each carrying a provenance note. The
  live registry-fetch pipeline has NOT run at wave zero and no
  registry-derived value appears anywhere.
- **Every check RESULT and calendar entry is synthetic example data**,
  clearly labeled (\`example: true\`, "[demo]" titles, fictional companies
  only). The sandbox is the real product code over simulated data — never a
  faked demo.
- **Anonymous sandbox is the floor**: every GET below answers keyless.
- **Runs are ephemeral**: the check-runner door writes per-isolate memory
  only — no durability at wave zero.
- **Pricing is a stub rate card**: metered-shaped so the 402 OFFER boundary
  is real and probeable, but \`binding: false\` and its statement say plainly
  that no live settlement is wired and no charge can occur. The OFFER's
  alternatives ladder (pay / work / claim) is declared stub-by-stub.
- **No attestation is faked**: attested-check output is typed to ride the
  api.qa verification rail; every wave-zero run says \`attested: false\`.

## Quickstart

\`\`\`sh
curl ${ORIGIN}/checks                  # keyless typed OK — the family register (branching collection)
curl ${ORIGIN}/checks?statuteId=davis-bacon
curl ${ORIGIN}/statutes
curl ${ORIGIN}/obligations
curl ${ORIGIN}/pricing                 # the stub rate card, binding: false
curl ${ORIGIN}/verify                  # run our tests — the published suite
\`\`\`

## Headless door (the shared check-runner, system-of-record verb)

\`\`\`sh
curl -X POST ${ORIGIN}/checks/davisbacon/runs -H 'content-type: application/json' \\
  -d '{"subject":{"company":"[demo] my fictional co"}}'
\`\`\`
`

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: 'fn-risk-compliance.org.ai',
  description:
    'Wave-zero regulation-check family substrate (placeholder address for a GAP-at-umbrella register row): typed Statute/CheckDefinition/CheckRun/Obligation records and the shared per-statute check-runner door from one definition, with a labeled synthetic sandbox as the keyless floor. 28 held .dev fronts attach later as config, not rebuilds.',
  version: '0.1.0',

  collection: {
    path: '/checks',
    operationId: 'listChecks', // the canonical name the rate row and the MCP tool share (axp-ext-rates-g2 §1)
    memberName: 'results',
    summary: 'Check definitions — the family register as the branching typed collection (OK | EMPTY | BLOCKED), keyless',
    records: checkDefinitions,
    filters: ['statuteId', 'front'],
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
      'STUB RATE CARD (wave zero, family-grain placeholder for a GAP-at-umbrella register row): prices are stated intent. No live settlement is wired, no key or account exists, and no charge can occur. This document exists so the 402 OFFER boundary is real and machine-probeable before any front or umbrella name attaches.',
    /* axp-ext-rates-g2 §2 — the operationId-keyed operation rate card, served
       as a TOP-LEVEL array of the Pricing Document (the ruled placement).
       binding: false + the statement above govern these rows too. Zero-price
       rows are the keyless floor. Survey-floor vocabulary only: scalar price
       + freeQuota; no reserved names in rows or offers. */
    rates: [
      { operation: 'listChecks', price: 0, note: 'keyless floor — the family register is free' },
      { operation: 'getCheck', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'runCheck', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'listStatutes', price: 0, note: 'keyless floor' },
      { operation: 'getStatute', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'listCheckRuns', price: 0, note: 'keyless floor' },
      { operation: 'getCheckRun', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
      { operation: 'listObligations', price: 0, note: 'keyless floor' },
      { operation: 'getObligation', price: 0.002, unit: 'usd-per-call', freeQuota: 100 },
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
              'Earn credits via proof-of-work tasks (the B2A ladder, rung 1). STUB at wave zero: the credits ledger is not wired to this face.',
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
    { method: 'GET', path: '/statutes', operationId: 'listStatutes', summary: 'Statutes — the family’s G1 anchors as typed records (public-law citations, provenance disclosed)' },
    { method: 'GET', path: '/statutes/{statuteId}', operationId: 'getStatute', summary: 'One statute by id — typed OK | EMPTY' },
    { method: 'GET', path: '/checks/{checkId}', operationId: 'getCheck', summary: 'One check definition by id (a held per-statute .dev front) — typed OK | EMPTY' },
    {
      method: 'POST',
      path: '/checks/{checkId}/runs',
      operationId: 'runCheck',
      summary: 'Run a check (the shared check-runner door; labeled synthetic result, ephemeral per-isolate state at wave zero; attested: false — no live registry consulted)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['subject'],
              properties: { subject: { type: 'object' } },
            },
          },
        },
      },
      responses: { 201: { description: 'OK envelope with the minted check run (labeled example data, disclosed retention)' } },
    },
    { method: 'GET', path: '/check-runs', operationId: 'listCheckRuns', summary: 'Check runs — typed list (labeled demo seed + anything minted in this isolate)' },
    { method: 'GET', path: '/check-runs/{runId}', operationId: 'getCheckRun', summary: 'One check run by id — typed OK | EMPTY' },
    { method: 'GET', path: '/obligations', operationId: 'listObligations', summary: 'Obligations — the compliance-calendar records (labeled demo seed)' },
    { method: 'GET', path: '/obligations/{obligationId}', operationId: 'getObligation', summary: 'One obligation by id — typed OK | EMPTY' },
    { method: 'GET', path: '/icp.json', operationId: 'getIcp', summary: 'Self-classification: the G2 coordinates (ICP + personas) and agent classes this surface distinguishes' },
    { method: 'GET', path: '/verify', operationId: 'getVerify', summary: 'Run our tests — the published verification suite for this surface' },
    { method: 'GET', path: '/verify/suite.json', operationId: 'getVerifySuite', summary: 'The published suite document (machine-readable)' },
  ],

  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: 'streamable-http',
    // axp-ext-rates-g2 §1: MCP tools are declared BY NAME — each string IS
    // the canonical operationId; descriptions and input schemas are served
    // live by the /mcp door's tools/list (worker.js). Authless: the MCP door
    // is mounted at the anon-sandbox rung only; keyed rungs sit above it and
    // are stubs at wave zero (mounted-rungs-only law).
    tools: ['listStatutes', 'getStatute', 'listChecks', 'getCheck', 'runCheck', 'listCheckRuns', 'getCheckRun', 'listObligations', 'getObligation'],
  },

  llms: { body: llmsBody },
  verifyUrl: '/verify', // → links.verify on the card (axp-ext-rates-g2 §3; absolutized by the generator)
  g2, // → the top-level card g2 object (axp-ext-rates-g2 §4; carried verbatim)
  icpUrl: `${ORIGIN}/icp.json`,
  conformanceUrl: 'https://api.qa/fn-risk-compliance.org.ai',

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>fn-risk-compliance.org.ai</title></head>
<body>
<h1>fn-risk-compliance — regulation-check family substrate (placeholder address)</h1>
<p>Wave-zero build of the Risk &amp; Compliance function row at the family grain: one pipeline
behind the estate's 28 held per-statute .dev check fronts. Typed Statute / CheckDefinition /
CheckRun / Obligation records and the shared check-runner door from one definition. Statute
and register records are cited reference facts; every check result and calendar entry is
clearly labeled synthetic example data; the keyless sandbox is the floor.</p>
<p>Machine faces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">/.well-known/agents.json</a> ·
<a href="/openapi.json">/openapi.json</a> · <a href="/pricing">/pricing</a> · <a href="/verify">/verify</a></p>
</body></html>
`,
    md: `# fn-risk-compliance.org.ai

Wave-zero regulation-check family substrate (placeholder address; the umbrella
name is a register GAP). Statute/register records are cited reference facts;
every check result and calendar entry is labeled synthetic example data; the
keyless sandbox is the floor.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
`,
  },
})
