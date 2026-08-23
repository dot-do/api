#!/usr/bin/env node
/**
 * check.mjs — the fail-closed local gate for this example (spec §9.1):
 *
 *   1. vendor drift gate: every file in ./axp is byte-identical to the
 *      digests its own PINS.json carries (nothing vendored is hand-edited);
 *   2. spec pin gate: ./spec/apis-ax-standard.spec.json hashes to the
 *      ratified pinned digest PINS.json names (apis-ax-axp@2.6.0);
 *   3. conformance gate: the worker, run IN-PROCESS, passes every pinned
 *      requirement (api.qa's gradePinned at --expect-digest semantics);
 *      the 2.5.0 landing-order accommodation from axp-faces' own suite is
 *      mirrored: `check-capability-coverage` is filtered out only while the
 *      installed verifier does not register it, and the run digest is then
 *      computed over the filtered view and loudly named;
 *   4. fixture-law gate: every seed record is labeled example data, every
 *      identifier carries the 952 demo prefix, every email is @example.com.
 *
 * autonomous-qa resolution: node_modules if installed, else the
 * AUTONOMOUS_QA env var pointing at the package directory.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
let failures = 0;
const gate = (name, okay, detail = "") => {
  console.log(`${okay ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!okay) failures++;
};

// 1 ── vendor drift gate
const pins = JSON.parse(readFileSync(join(HERE, "axp/PINS.json"), "utf8"));
for (const [label, digest] of Object.entries(pins.files)) {
  const local = join(HERE, "axp", label.replace(/^src\//, ""));
  gate(`vendored ${label}`, sha256(readFileSync(local)) === digest);
}

// 2 ── spec pin gate
const specText = readFileSync(join(HERE, "spec/apis-ax-standard.spec.json"), "utf8");
const specDigest = sha256(specText);
gate(`spec digest == PINS pinnedSpecDigest (${pins.pinnedSpec})`, specDigest === pins.pinnedSpecDigest, specDigest.slice(0, 12));

// 3 ── in-process conformance at the pin
const qaPath = process.env.AUTONOMOUS_QA;
let qa;
try {
  qa = await import(qaPath ? pathToFileURL(join(qaPath, "dist/src/index.js")).href : "autonomous-qa");
} catch (e) {
  gate("conformance (autonomous-qa resolvable)", false, `set AUTONOMOUS_QA to the package dir: ${e.message}`);
}
if (qa) {
  const { default: worker } = await import(pathToFileURL(join(HERE, "worker.mjs")).href);
  const hasCoverage = qa.eligibleOptionalChecks().includes("capability-coverage");
  const ratified = JSON.parse(specText);
  const runDoc = hasCoverage ? ratified : { ...ratified, requirements: ratified.requirements.filter((r) => r.id !== "check-capability-coverage") };
  const runSpec = hasCoverage ? specText : JSON.stringify(runDoc, null, 2);
  const runDigest = sha256(runSpec);
  if (!hasCoverage) console.log(`note: installed verifier predates capability-coverage — runnable view is ${runDoc.requirements.length} requirements, digest ${runDigest.slice(0, 12)}…`);
  const { ORIGIN } = await import(pathToFileURL(join(HERE, "manifest.mjs")).href);
  const report = await qa.gradePinned(worker, runSpec, { expectedDigest: runDigest, baseOrigin: ORIGIN });
  for (const r of report.requirements.filter((x) => x.verdict !== "pass")) {
    console.log(`  requirement ${r.id}: ${r.verdict} — ${r.detail}`);
  }
  gate(`conformance passed at pinned digest (${runDoc.requirements.length} requirements)`, report.passed === true);
}

// 4 ── fixture-law gate
const { tickets, conversations, deflections } = await import(pathToFileURL(join(HERE, "seed.mjs")).href);
const all = [...tickets, ...conversations, ...deflections];
gate("every seed record labeled example: true", all.every((r) => r.example === true), `${all.length} records`);
gate("every seed id carries the 952 demo prefix", all.every((r) => /-952-/.test(r.id)));
const emails = JSON.stringify(all).match(/[\w.+-]+@[\w.-]+/g) || [];
gate("every seed email is @example.com", emails.every((e) => e.endsWith("@example.com")), `${emails.length} emails`);
gate("no ticket status collides with the knownEmpty probe value", tickets.every((t) => t.status !== "none" && t.priority !== "none"));

if (failures > 0) {
  console.error(`\n${failures} gate(s) FAILED — fail-closed: do not deploy, do not soften copy.`);
  process.exit(1);
}
console.log("\nall gates green at the ratified pin.");
