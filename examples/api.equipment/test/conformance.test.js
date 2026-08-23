/**
 * conformance.test.js — THE gate (template §9.1 box 4): the worker, verified
 * in-process against the ratified pinned spec apis-ax-axp@2.6.0, digest
 * asserted (fail-closed — a spec text that does not hash to the pin never
 * runs).
 *
 * DISCLOSURE (batch watch list, §9.1 box 4): the vendored axp-faces tree
 * exports NO `describeConformance` — the in-process probe ladder is
 * re-implemented here by api.qa's `assertConforms` (autonomous-qa, consumed
 * as a file: dependency), which runs the same digest-locked requirement set
 * the deployed verifier at https://api.qa judges by.
 */
import { readFileSync } from "node:fs";
import { it } from "vitest";
import "autonomous-qa/vitest";
import { assertConforms } from "autonomous-qa/vitest";
import worker from "../worker.mjs";

const spec = readFileSync(new URL("../spec/apis-ax-standard.spec.json", import.meta.url), "utf8");
const expectedDigest = readFileSync(new URL("../spec/apis-ax-standard.digest.txt", import.meta.url), "utf8").trim();

it("conforms to apis-ax-axp@2.6.0 at the ratified digest (all requirements, fail-closed)", async () => {
  await assertConforms(worker, { spec, expectedDigest }, { baseOrigin: "https://api.equipment" });
}, 120_000);
