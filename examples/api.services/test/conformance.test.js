/**
 * conformance.test.js — THE gate (template §9.1): the worker, verified
 * in-process by api.qa (autonomous-qa) against the ratified pinned spec
 * apis-ax-axp@2.6.0, digest asserted (fail-closed — a spec text that does not
 * hash to the pin never runs).
 */
import { readFileSync } from "node:fs";
import { it } from "vitest";
import "autonomous-qa/vitest";
import { assertConforms } from "autonomous-qa/vitest";
import worker from "../src/worker.js";

const spec = readFileSync(new URL("../spec/apis-ax-standard.spec.json", import.meta.url), "utf8");
const expectedDigest = readFileSync(new URL("../spec/apis-ax-standard.digest.txt", import.meta.url), "utf8").trim();

it("conforms to apis-ax-axp@2.6.0 at the ratified digest (all requirements, fail-closed)", async () => {
  await assertConforms(worker, { spec, expectedDigest }, { baseOrigin: "https://api.services" });
}, 120_000);
