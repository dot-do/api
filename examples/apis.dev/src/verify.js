/**
 * verify.js — the /verify export: "trust us" → "run this". The checks below
 * are the public contract only (presence-when-true applies to tests), and
 * every one is runnable by anyone with curl against the live origin.
 *
 * interfaces.testSuite is deliberately NOT declared on the card: declaring
 * it arms the pinned spec's check-published-test-suite, which the deployed
 * verifier (autonomous-qa 0.3.0) does not implement — a declaration today
 * fails closed on a check the verifier cannot produce (the api.lawyer
 * precedent). The suite itself ships at /verify/suite.json, and the card
 * carries links.verify natively (manifest verifyUrl — axp-ext/rates-g2 §3,
 * generator-native since axp-faces 0.2.0).
 */

import { buildProbes } from './axp-faces/index.js'

export function buildSuite(manifest) {
  const probes = buildProbes(manifest)
  const o = manifest.origin
  const checks = [
    {
      id: 'keyless-ok',
      probe: `GET ${o}${probes.keyless.url}`,
      expect: { status: 200, 'body.type': 'OK' },
    },
    ...probes.knownEmpty.map((p, i) => ({
      id: `known-empty-${i + 1}`,
      probe: `GET ${o}${p.url}`,
      expect: { status: 200, 'body.type': 'EMPTY' },
    })),
    ...probes.knownForbidden.map((p, i) => ({
      id: `known-forbidden-${i + 1}`,
      probe: `GET ${o}${p.url}`,
      expect: { status: 403, 'body.type': 'BLOCKED' },
    })),
    {
      id: 'pricing-declared',
      probe: `GET ${o}/pricing`,
      expect: { status: 200, 'body.model': 'metered', 'body.binding': false },
    },
    {
      id: 'over-ceiling-offer',
      probe: `GET ${o}${probes.keyless.url}?spend=${manifest.pricing.hardCeiling * 2}`,
      expect: { status: 402, 'body.type': 'OFFER' },
    },
    {
      id: 'half-ceiling-ok',
      probe: `GET ${o}${probes.keyless.url}?spend=${manifest.pricing.hardCeiling / 2}`,
      expect: { status: 200, 'body.type': 'OK' },
    },
    {
      id: 'offer-boundary',
      probe: `GET ${o}/offer`,
      expect: { status: 402, 'body.type': 'OFFER' },
    },
    {
      id: 'card-answers',
      probe: `GET ${o}/.well-known/agents.json`,
      expect: { status: 200, 'body.interfaces.http': 'non-empty' },
    },
    {
      id: 'workspace-mint',
      probe: `POST ${o}/workspaces`,
      expect: { status: 200, 'body.type': 'OK' },
    },
  ]
  return {
    suite: 'apis.dev public-contract checks',
    runner: 'api.qa/suite@1',
    environment: 'production',
    checks,
  }
}

export function buildVerifyDoc(manifest) {
  const suite = buildSuite(manifest)
  return {
    $context: 'https://schema.org.ai',
    $type: 'Report',
    name: 'Run our tests',
    description:
      'The public-contract checks for apis.dev. Every check is runnable by anyone, keyless, against the live origin — a claim with a published passing test is proven; anything less stays out of the copy.',
    suite: `${manifest.origin}/verify/suite.json`,
    conformance: manifest.conformanceUrl,
    howTo: suite.checks.map((c) => ({ id: c.id, curl: `curl -i '${c.probe.replace(/^GET |^POST /, '')}'${c.probe.startsWith('POST') ? ' -X POST' : ''}`, expect: c.expect })),
  }
}

export function buildVerifyMd(manifest) {
  const suite = buildSuite(manifest)
  const lines = [
    '# Run our tests',
    '',
    'The public-contract checks for apis.dev — runnable by anyone, keyless, against the live origin.',
    '',
    `Suite document: ${manifest.origin}/verify/suite.json`,
    `Independent verifier: ${manifest.conformanceUrl}`,
    '',
    '| check | probe | expect |',
    '|---|---|---|',
    ...suite.checks.map((c) => `| ${c.id} | \`${c.probe}\` | \`${JSON.stringify(c.expect)}\` |`),
    '',
  ]
  return lines.join('\n')
}
