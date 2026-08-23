/**
 * conformance.test.js — the fail-closed, digest-pinned AXP conformance gate
 * (property-template spec §9.1: local conformance green at the pinned digest,
 * --expect-digest, fail-closed).
 *
 * The spec text is the vendored byte-identical copy of the ratified standard
 * (spec/apis-ax-standard.spec.json, apis-ax-axp@2.6.0); if the vendored bytes
 * ever drift from the pin, the gate refuses before a single probe fires. The
 * deployed verifier at https://api.qa runs the SAME digest-locked requirement
 * implementations, so this gate green and the hosted verdict cannot diverge
 * by construction. Probes dispatch to the worker IN MEMORY (no socket) at the
 * placeholder origin, so the card's absolute same-origin cross-links hold
 * exactly as they will live.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it } from "vitest";
import { assertConforms } from "autonomous-qa/vitest";
import worker from "../worker.js";

const here = dirname(fileURLToPath(import.meta.url));
const spec = readFileSync(join(here, "..", "spec", "apis-ax-standard.spec.json"), "utf8");
export const PINNED_DIGEST = readFileSync(join(here, "..", "spec", "apis-ax-standard.digest.txt"), "utf8").trim();

describe("AXP conformance — pinned apis-ax-axp@2.6.0 (fail-closed digest gate)", () => {
  it(`every pinned requirement passes at digest ${PINNED_DIGEST.slice(0, 12)}…`, async () => {
    await assertConforms(worker, { spec, expectedDigest: PINNED_DIGEST }, { baseOrigin: "https://public-admin.org.ai" });
  }, 30_000);
});
