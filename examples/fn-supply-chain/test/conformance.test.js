/**
 * conformance.test.js — the fail-closed, digest-pinned AXP conformance gate
 * (template spec §9.1: local describeConformance/assertConforms green at the
 * pinned digest, --expect-digest semantics, fail-closed).
 *
 * The spec text is the VENDORED byte-identical ratified standard
 * (spec/apis-ax-axp-2.6.0.spec.json); the digest below is the ratification
 * digest — drifted bytes refuse before a single probe fires. The hosted
 * api.qa runs the SAME digest-locked requirement implementations, so this
 * gate green and a hosted verdict cannot diverge by construction. Probes
 * dispatch to the worker IN MEMORY at the canonical placeholder origin.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertConforms } from "autonomous-qa/vitest";
import { grade } from "autonomous-qa";
import worker from "../worker.js";
import { ORIGIN } from "../manifest.js";

globalThis.__SEAM_SILENT = true; // keep the gate's output legible; seams still shape-check

const here = dirname(fileURLToPath(import.meta.url));
const spec = readFileSync(join(here, "..", "spec", "apis-ax-axp-2.6.0.spec.json"), "utf8");
export const PINNED_DIGEST = "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d";

const target = { fetch: (req) => worker.fetch(req, {}, undefined) };

describe("AXP conformance — pinned apis-ax-axp@2.6.0 (fail-closed digest gate)", () => {
  it(`every pinned requirement passes at digest ${PINNED_DIGEST.slice(0, 12)}…`, async () => {
    await assertConforms(target, { spec, expectedDigest: PINNED_DIGEST }, { baseOrigin: ORIGIN });
  }, 30_000);

  it("the advisory grade carries an empty failing set", async () => {
    const report = await grade(target, { baseOrigin: ORIGIN });
    const failing = report.checks.filter((c) => c.verdict === "fail").map((c) => c.id);
    expect(failing).toEqual([]);
  }, 30_000);
});
