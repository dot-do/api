/**
 * conformance.test.ts — the fail-closed, digest-pinned AXP conformance gate.
 *
 * The spec text is the VENDORED byte-identical copy of the ratified standard
 * (spec/apis-ax-axp-2.6.0.spec.json, from axp.org.ai/spec/conformance); the
 * digest below is the ratification digest — if the vendored bytes ever drift,
 * `assertConforms` refuses before a single probe fires. The deployed verifier
 * at https://api.qa runs the SAME digest-locked requirement implementations,
 * so this gate green and a hosted verdict cannot diverge by construction.
 *
 * Probes dispatch to the worker IN MEMORY (no socket) at the canonical
 * origin, so the card's absolute same-origin cross-links hold exactly as
 * they will live once the api.careers zone exists.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertConforms, assertGradeAtLeast } from 'autonomous-qa/vitest'
import { grade } from 'autonomous-qa'
import worker from '../src/worker.ts'

const here = dirname(fileURLToPath(import.meta.url))
const spec = readFileSync(join(here, '..', 'spec', 'apis-ax-axp-2.6.0.spec.json'), 'utf8')

export const PINNED_DIGEST = 'a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d'

const target = worker as { fetch: (req: Request) => Response | Promise<Response> }

describe('AXP conformance — pinned apis-ax-axp@2.6.0 (fail-closed digest gate)', () => {
  it(`every pinned requirement passes at digest ${PINNED_DIGEST.slice(0, 12)}…`, async () => {
    await assertConforms(target, { spec, expectedDigest: PINNED_DIGEST }, { baseOrigin: 'https://api.careers' })
  }, 30_000)

  it('the advisory grade is a full pass with an empty failing set', async () => {
    await assertGradeAtLeast(target, 'A+', { baseOrigin: 'https://api.careers' })
    const report = await grade(target as never, { baseOrigin: 'https://api.careers' })
    const failing = report.checks.filter((c) => c.verdict === 'fail').map((c) => c.id)
    expect(failing).toEqual([])
  }, 30_000)
})
