/**
 * selfverify.mjs — the §9.1 self-verify run, fail-closed and scriptable:
 *
 *   1. AXP conformance at the PINNED digest (apis-ax-axp@2.6.0), in-memory
 *      via autonomous-qa's gradePinned — the same digest-locked requirements
 *      the deployed verifier at https://api.qa runs;
 *   2. the published suite (/verify/suite.json) judged row by row against
 *      the worker in-memory;
 *   3. fixture law: every SYNTHETIC record labeled example, EINs 00-prefix,
 *      UEI-shaped ids spell EXAMPLE, compliance calendar ties (every filing
 *      references a registration; every renewal-due/lapsed registration has
 *      exactly one open filing task), no secret-shaped strings — and the
 *      REAL award corpus carries provenance on every record and is NEVER
 *      labeled example;
 *   4. rate-card law: every rates[].operation is an OpenAPI operationId and
 *      names a free quota or prices from zero;
 *   5. the four batch-2 RULED extension placements, exactly: rates[]
 *      top-level in /pricing, g2 top-level on the card, links.verify as a
 *      card link member, operationId on EVERY OpenAPI route — plus the MCP
 *      door (authless sandbox rung) answering tools/list.
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
const { registrations, filings, permits, companies } = await import(join(root, "seed.js"));
const { awards, AWARDS_PROVENANCE } = await import(join(root, "seed-awards.js"));
const { RATES, manifest } = await import(join(root, "manifest.js"));
const { card, pricingDoc, openapiDoc } = await import(join(root, "extensions.js"));

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

const ORIGIN = "https://public-admin.org.ai";
const failures = [];
const pass = (name) => console.log(`  ✓ ${name}`);
const fail = (name, detail) => {
  failures.push(`${name}: ${detail}`);
  console.log(`  ✗ ${name} — ${detail}`);
};

// ── 1. pinned conformance ────────────────────────────────────────────────────
console.log(`\nAXP conformance (pinned ${expectedDigest.slice(0, 12)}…)`);
const report = await aqa.gradePinned(worker, specText, { baseOrigin: ORIGIN, expectedDigest });
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
  const res = await worker.fetch(new Request(`${ORIGIN}${row.path}`, { method: row.method }), {}, {});
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

// ── 3. fixture law (§5.2) + real-data provenance law ────────────────────────
console.log("\nFixture law (§5.2) — synthetic labeled, real provenance-labeled");
const synthetic = [...registrations, ...filings, ...permits, ...companies];
synthetic.every((r) => r.example === true) ? pass(`every synthetic record labeled example (${synthetic.length})`) : fail("example labels", "unlabeled synthetic record present");
companies.every((c) => c.ein.startsWith("00-")) ? pass("every EIN uses the never-issued 00- prefix") : fail("fixture law", "non-00 EIN in seed");
companies.every((c) => c.uei.startsWith("EXAMPLE")) ? pass("every UEI-shaped id spells EXAMPLE") : fail("fixture law", "UEI-shaped id without EXAMPLE marker");
companies.every((c) => /fictional/i.test(c.name)) ? pass("every company name marked fictional") : fail("fixture law", "company not marked fictional");
// compliance calendar ties by construction
const regIds = new Set(registrations.map((r) => r.id));
filings.every((f) => regIds.has(f.registrationId)) ? pass("every filing references a registration (no orphans)") : fail("calendar tie", "orphaned filing");
let calendarOk = true;
for (const r of registrations) {
  const open = filings.filter((f) => f.registrationId === r.id && (f.status === "open" || f.status === "overdue"));
  const want = r.status === "renewal-due" || r.status === "lapsed" ? 1 : 0;
  if (open.length !== want) { calendarOk = false; fail("calendar tie", `${r.id}: ${open.length} open tasks, want ${want} (status ${r.status})`); }
}
if (calendarOk) pass("every renewal-due/lapsed registration has exactly one open filing task");
const corpus = JSON.stringify(synthetic);
/(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN)/.test(corpus) ? fail("secret scan", "secret-shaped string in seed") : pass("secret scan clean");
// the REAL corpus: provenance mandatory, example labels forbidden
awards.length > 0 ? pass(`real award corpus present (${awards.length} records)`) : fail("real corpus", "empty");
awards.every((a) => a.real === true && a.provenance?.source && a.provenance?.retrievedAt) ? pass("every award carries real:true + provenance") : fail("provenance law", "award missing provenance");
awards.every((a) => a.example === undefined) ? pass("no real record is labeled example (real data is not an example)") : fail("labeling law", "real record labeled example");
AWARDS_PROVENANCE.license.includes("public domain") ? pass("corpus license recorded (public domain)") : fail("provenance law", "license missing");

// ── 4. rate-card law ─────────────────────────────────────────────────────────
console.log("\nRate-card law (§5.1 / §9.1)");
for (const r of RATES) {
  const named = r.freeQuota !== undefined || r.price === 0;
  named ? pass(`${r.operation}: free quota or zero price named`) : fail(r.operation, "no free quota and non-zero price");
}
const declaredOperationIds = new Set();
for (const methods of Object.values(openapiDoc.paths || {})) {
  for (const op of Object.values(methods)) {
    if (op && typeof op === "object" && op.operationId) declaredOperationIds.add(op.operationId);
  }
}
for (const r of RATES) {
  declaredOperationIds.has(r.operation) ? pass(`${r.operation} ∈ OpenAPI operationIds`) : fail(r.operation, "not an OpenAPI operationId — the rate card may only price declared operations");
}

// ── 5. the four RULED extension placements (batch-2, zero divergence) ───────
console.log("\nRuled extension placements (batch-2 bridge)");
Array.isArray(pricingDoc.rates) && pricingDoc.rates.length === RATES.length ? pass("rates[] is TOP-LEVEL in the Pricing Document") : fail("rates[] placement", "not top-level in /pricing");
card.g2 && card.g2.icp && card.g2.personas && card.g2.systems ? pass("g2 is TOP-LEVEL on the capability card (icp + personas + systems)") : fail("g2 placement", "missing/incomplete on card");
card.links?.verify === `${ORIGIN}/verify` ? pass("links.verify is a card link member") : fail("links.verify placement", String(card.links?.verify));
let missingOpIds = [];
for (const [p, methods] of Object.entries(openapiDoc.paths || {})) {
  for (const [m, op] of Object.entries(methods)) {
    if (op && typeof op === "object" && !op.operationId) missingOpIds.push(`${m.toUpperCase()} ${p}`);
  }
}
missingOpIds.length === 0 ? pass("operationId on EVERY OpenAPI route") : fail("operationId placement", missingOpIds.join(", "));
card.interfaces?.mcp?.url === `${ORIGIN}/mcp` ? pass("MCP door declared on the card (mounted)") : fail("mcp declaration", "card interfaces.mcp missing");
card.interfaces?.testSuite === undefined ? pass("interfaces.testSuite stays UNDECLARED (batch-2 ruling — digest-pinned executable suite pending)") : fail("testSuite", "declared before the digest-pinned bar");
const mcpRes = await worker.fetch(
  new Request(`${ORIGIN}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }),
  {},
  {},
);
const mcpBody = await mcpRes.json().catch(() => undefined);
Array.isArray(mcpBody?.result?.tools) && mcpBody.result.tools.length === 9 ? pass("MCP tools/list answers authless with all 9 operations") : fail("mcp door", `status ${mcpRes.status}`);

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length > 0) {
  console.error(`SELF-VERIFY FAILED — ${failures.length} defect(s)`);
  process.exit(1);
}
console.log("SELF-VERIFY PASSED — suite digest " + (await suiteDigest()));
console.log("suite bytes: " + suiteText.length);
