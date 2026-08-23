/**
 * selfverify.mjs — the §9.1 self-verify run, fail-closed and scriptable:
 *
 *   1. AXP conformance at the PINNED digest (apis-ax-axp@2.6.0), in-memory
 *      via autonomous-qa's gradePinned — the same digest-locked requirements
 *      the deployed verifier at https://api.qa runs;
 *   2. the published suite (/verify/suite.json) judged row by row against
 *      the worker in-memory;
 *   3. seed fixture law: every record labeled example, journal balanced,
 *      trial balance tied, no secret-shaped strings, no real-name leakage;
 *   4. rate-card law: every rate row names a free quota or prices from zero,
 *      and every rate operation is a served contract door.
 *
 * Run: node scripts/selfverify.mjs
 * (resolves `autonomous-qa` from node_modules; set AUTONOMOUS_QA_PATH to the
 *  verifier's dist/src/index.js to run without an install)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const worker = (await import(join(root, "worker.js"))).default;
const { suiteDocument, suiteText, suiteDigest } = await import(join(root, "verify.js"));
const { journal, trialBalance, ledgers, closeDeliverables } = await import(join(root, "seed.js"));
const { rateCard, manifest } = await import(join(root, "manifest.js"));

const specText = readFileSync(join(root, "spec", "apis-ax-standard.spec.json"), "utf8");
const expectedDigest = readFileSync(join(root, "spec", "apis-ax-standard.digest.txt"), "utf8").trim();

let aqa;
try {
  aqa = await import("autonomous-qa");
} catch {
  const p = process.env.AUTONOMOUS_QA_PATH;
  if (!p) throw new Error("autonomous-qa is not installed — pnpm install here, or set AUTONOMOUS_QA_PATH to its dist/src/index.js");
  aqa = await import(p);
}

const failures = [];
const pass = (name) => console.log(`  ✓ ${name}`);
const fail = (name, detail) => {
  failures.push(`${name}: ${detail}`);
  console.log(`  ✗ ${name} — ${detail}`);
};

// ── 1. pinned conformance ────────────────────────────────────────────────────
console.log(`\nAXP conformance (pinned ${expectedDigest.slice(0, 12)}…)`);
const report = await aqa.gradePinned(worker, specText, { baseOrigin: "https://monthend.finance", expectedDigest });
if (report.passed) pass(`all ${report.requirements?.length ?? "pinned"} requirements pass`);
else {
  const failing = (report.requirements || []).filter((r) => r.verdict && r.verdict !== "pass");
  fail("pinned conformance", failing.map((r) => `${r.id}:${r.verdict}${r.detail ? ` (${r.detail})` : ""}`).join("; ") || JSON.stringify(report).slice(0, 400));
}

// ── 2. the published suite, judged in-memory ────────────────────────────────
console.log(`\nPublished suite (${suiteDocument.name}@${suiteDocument.version}, ${await suiteDigest()})`);
function readPath(body, dotted) {
  let cursor = body;
  for (const seg of dotted.split(".")) {
    if (cursor === null || typeof cursor !== "object" || !(seg in cursor)) return { found: false };
    cursor = cursor[seg];
  }
  return { found: true, value: cursor };
}
for (const row of suiteDocument.requirements) {
  const res = await worker.fetch(new Request(`https://monthend.finance${row.path}`, { method: row.method }), {}, {});
  const problems = [];
  if (res.status !== row.expect.status) problems.push(`status ${res.status}, want ${row.expect.status}`);
  const ct = res.headers.get("content-type") || "";
  if (row.expect.contentTypeIncludes && !ct.includes(row.expect.contentTypeIncludes)) problems.push(`content-type '${ct}'`);
  let body;
  try { body = JSON.parse(await res.clone().text()); } catch { body = undefined; }
  for (const p of row.expect.paths || []) {
    const r = readPath(body, p.path);
    if (p.exists === true && !r.found) problems.push(`${p.path} absent`);
    if (p.equals !== undefined && (!r.found || JSON.stringify(r.value) !== JSON.stringify(p.equals))) problems.push(`${p.path}=${JSON.stringify(r.value)}, want ${JSON.stringify(p.equals)}`);
  }
  problems.length === 0 ? pass(row.id) : fail(row.id, problems.join("; "));
}

// ── 3. seed fixture law ──────────────────────────────────────────────────────
console.log("\nSeed fixture law (§5.2)");
for (const e of journal) {
  const d = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const c = e.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (d !== c) fail(`journal ${e.id}`, `unbalanced ${d}/${c}`);
}
pass(`journal balanced (${journal.length} entries)`);
for (const period of ["2026-06", "2026-07"]) {
  const tb = trialBalance(period);
  tb.totals.debit === tb.totals.credit ? pass(`trial balance ties ${period} (${tb.totals.debit})`) : fail(`trial balance ${period}`, "does not tie");
}
const allRecords = [...ledgers, ...closeDeliverables];
allRecords.every((r) => r.example === true) ? pass(`every seed record labeled example (${allRecords.length})`) : fail("example labels", "unlabeled record present");
const corpus = JSON.stringify(allRecords) + JSON.stringify(journal);
/(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN)/.test(corpus) ? fail("secret scan", "secret-shaped string in seed") : pass("secret scan clean");
/(fictional)/i.test(ledgers[0].company) ? pass("company name marked fictional") : fail("fixture law", "company not marked fictional");

// ── 4. rate-card law ─────────────────────────────────────────────────────────
console.log("\nRate-card law (§5.1 / §9.1)");
for (const r of rateCard.rates) {
  const named = r.freeQuota !== undefined || r.price === 0;
  named ? pass(`${r.verb}: free quota or zero price named`) : fail(r.verb, "no free quota and non-zero price");
}
const served = new Set([
  `GET ${manifest.collection.path}`,
  ...manifest.routes.map((r) => `${r.method} ${r.path}`),
]);
for (const r of rateCard.rates) {
  const wire = r.operation.replace("/close-deliverables/{id}", "/close-deliverables/{id}").replace("/ledgers/{id}", "/ledgers/{id}");
  served.has(wire) ? pass(`${r.verb} is a served contract door (${wire})`) : fail(r.verb, `${wire} not in manifest`);
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length > 0) {
  console.error(`SELF-VERIFY FAILED — ${failures.length} defect(s)`);
  process.exit(1);
}
console.log("SELF-VERIFY PASSED — suite digest " + (await suiteDigest()));
console.log("suite bytes: " + suiteText.length);
