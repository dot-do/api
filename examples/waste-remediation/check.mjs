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
 *   4. fixture-law gate (synthetic seed): every synthetic record is labeled
 *      example data, every synthetic identifier carries the 952 demo prefix,
 *      every email is @example.com, every synthetic handler id carries the
 *      EX9 prefix, and NO synthetic record references a real ECHO party;
 *   5. real-corpus gate (ingested Facility records): every record carries
 *      real: true and a provenance block naming source, retrievedAt, and
 *      license — and none is example-labeled (real data is never dressed
 *      as demo, demo data is never dressed as real).
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

// 4 ── fixture-law gate (synthetic seed)
const { manifests, workOrders, scaleTickets, wasteProfiles } = await import(pathToFileURL(join(HERE, "seed.mjs")).href);
const synthetic = [...manifests, ...workOrders, ...scaleTickets, ...wasteProfiles];
gate("every synthetic record labeled example: true", synthetic.every((r) => r.example === true), `${synthetic.length} records`);
gate("every synthetic id carries the 952 demo prefix", synthetic.every((r) => /-952-/.test(r.id)));
const syntheticText = JSON.stringify(synthetic);
const emails = syntheticText.match(/[\w.+-]+@[\w.-]+/g) || [];
gate("every synthetic email is @example.com", emails.every((e) => e.endsWith("@example.com")), `${emails.length} emails`);
const handlerIds = syntheticText.match(/"handlerId":"([^"]+)"/g) || [];
gate("every synthetic handler id carries the EX9 prefix", handlerIds.every((h) => h.includes("EX9-952-")), `${handlerIds.length} handler refs`);
gate(
  "no synthetic filter value collides with the knownEmpty probe value",
  manifests.every((m) => m.status !== "none" && m.wasteCode !== "none") && workOrders.every((w) => w.status !== "none"),
);

// 5 ── real-corpus gate (ingested Facility records)
const { facilities } = await import(pathToFileURL(join(HERE, "facilities.real.mjs")).href);
gate("real corpus non-empty", facilities.length > 0, `${facilities.length} records`);
gate("every real record carries real: true", facilities.every((f) => f.real === true));
gate(
  "every real record carries provenance (source + retrievedAt + license)",
  facilities.every((f) => f.provenance && f.provenance.source && f.provenance.retrievedAt && f.provenance.license),
);
gate("no real record is example-labeled", facilities.every((f) => f.example === undefined));
const realHandlerIds = new Set(facilities.map((f) => f.handlerId));
gate("no synthetic record references a real ECHO party", ![...realHandlerIds].some((id) => syntheticText.includes(id)));

if (failures > 0) {
  console.error(`\n${failures} gate(s) FAILED — fail-closed: do not deploy, do not soften copy.`);
  process.exit(1);
}
console.log("\nall gates green at the ratified pin.");
