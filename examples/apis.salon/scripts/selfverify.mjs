/**
 * selfverify.mjs — the §9.1 self-verify run, fail-closed and scriptable:
 *
 *   1. AXP conformance at the PINNED digest (apis-ax-axp@2.6.0), in-memory
 *      via autonomous-qa's gradePinned — the same digest-locked requirements
 *      the deployed verifier at https://api.qa runs (DISCLOSED: the vendored
 *      axp-faces ships no describeConformance, so the probe ladder runs
 *      in-process through the verifier's own code path instead);
 *   2. the published suite (/verify/suite.json) judged row by row against
 *      the worker in-memory;
 *   3. fixture law: every SYNTHETIC record labeled example, every synthetic
 *      telephone number in the NANP fictional 555-01XX range, license-shaped
 *      ids spell EXAMPLE, names marked fictional, no secret-shaped strings —
 *      the booking/POS ledger ties by construction (a sale record settles
 *      exactly one COMPLETED booking; booking price = the offer price; the
 *      POS summary equals the sum of its sale records; booking status
 *      derives from time vs AS_OF) — the synthetic salon name does NOT
 *      collide with any real licensed establishment (anti-collision, the
 *      honest inverse of a shared-corpus tie) — and the REAL license corpus
 *      carries corpus provenance (with its disclosed withheld-fields
 *      curation) and is NEVER labeled example;
 *   4. rate-card law: every rates[].operation is an OpenAPI operationId and
 *      names an included allowance or prices from zero (survey-floor
 *      vocabulary — no freeQuota member anywhere);
 *   5. the four axp-ext-rates-g2 fields emitted NATIVELY by the vendored
 *      axp-faces@0.3.0 (no bridge file exists): rates[] top-level in
 *      /pricing, g2 top-level on the card, links.verify as a card link
 *      member, operationId on EVERY OpenAPI route — plus string MCP tool
 *      names identical to operationIds (five-surface invariant), and the
 *      MCP door (authless sandbox rung) answering tools/list.
 *
 * Run: node scripts/selfverify.mjs
 * (resolves `autonomous-qa` from node_modules; set AUTONOMOUS_QA_PATH to the
 *  verifier's dist/src/index.js to run without an install)
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const worker = (await import(join(root, "worker.js"))).default;
const { suiteDocument, suiteText, suiteDigest } = await import(join(root, "verify.js"));
const { bookings, serviceOffers, saleRecords, posSummary, salon, practitioners } = await import(join(root, "seed.js"));
const { establishmentLicenses, LICENSE_PROVENANCE } = await import(join(root, "seed-licenses.js"));
const { RATES, manifest } = await import(join(root, "manifest.js"));
const { buildCard, buildOpenapi, buildPricingDocument } = await import(join(root, "axp", "index.js"));

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

const ORIGIN = "https://apis.salon";
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

// ── 3. fixture law (§5.2) + real-data provenance law + ledger ties ──────────
console.log("\nFixture law (§5.2) — synthetic labeled, real provenance-labeled");
const synthetic = [...bookings, ...serviceOffers, ...saleRecords, posSummary, salon, ...practitioners];
synthetic.every((r) => r.example === true) ? pass(`every synthetic record labeled example (${synthetic.length})`) : fail("example labels", "unlabeled synthetic record present");
const numbers = [...new Set([salon.telephone, ...bookings.map((b) => b.clientPhone)])];
numbers.every((n) => /^\+1\d{3}55501\d{2}$/.test(n)) ? pass(`every synthetic number in the NANP fictional 555-01XX range (${numbers.length})`) : fail("fixture law", "number outside the 555-01XX fictional range");
const licenseRefs = [salon.licenseRef, ...practitioners.map((p) => p.licenseRef)];
licenseRefs.every((l) => l.startsWith("EXAMPLE")) ? pass("every license-shaped id spells EXAMPLE") : fail("fixture law", "license-shaped id without EXAMPLE marker");
[salon, ...practitioners].every((p) => /fictional/i.test(p.name)) ? pass("salon and every practitioner marked fictional") : fail("fixture law", "party not marked fictional");
bookings.every((b) => /fictional/i.test(b.client)) ? pass("every client marked fictional") : fail("fixture law", "client not marked fictional");
/fictional address/i.test(salon.address) ? pass("the salon address marked fictional") : fail("fixture law", "address not marked fictional");
// the booking/POS ledger ties by construction
const completedIds = new Set(bookings.filter((b) => b.status === "completed").map((b) => b.id));
saleRecords.every((s) => completedIds.has(s.bookingId)) && saleRecords.length === completedIds.size
  ? pass(`every sale record settles exactly one COMPLETED booking (${saleRecords.length} of ${completedIds.size})`)
  : fail("ledger tie", "sale records and completed bookings do not tie one-to-one");
bookings.every((b) => b.priceUsd === serviceOffers.find((s) => s.id === b.serviceOfferId)?.priceUsd)
  ? pass("every booking price IS its service offer's price")
  : fail("ledger tie", "booking price diverges from its offer");
const round2 = (n) => Math.round(n * 100) / 100;
const totals = round2(saleRecords.reduce((s, x) => s + x.totalUsd, 0));
posSummary.totalUsd === totals ? pass(`POS summary equals the sum of its sale records (${totals})`) : fail("ledger tie", `summary ${posSummary.totalUsd} != sum ${totals}`);
saleRecords.every((s) => s.totalUsd === round2(s.subtotalUsd + s.taxUsd + s.tipUsd)) ? pass("every sale total = subtotal + tax + tip") : fail("ledger tie", "sale total does not derive from its parts");
// anti-collision: the fictional salon must not shadow a real licensed establishment
const salonToken = "WILLOWMERE";
establishmentLicenses.some((r) => (r.businessName || "").toUpperCase().includes(salonToken))
  ? fail("anti-collision", "the fictional salon name collides with a real licensed establishment")
  : pass("the fictional salon name collides with NO real licensed establishment (anti-collision)");
const corpus = JSON.stringify(synthetic);
/(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN)/.test(corpus) ? fail("secret scan", "secret-shaped string in seed") : pass("secret scan clean");
// the REAL corpus: provenance mandatory, example labels forbidden
establishmentLicenses.length > 0 ? pass(`real license corpus present (${establishmentLicenses.length} records)`) : fail("real corpus", "empty");
establishmentLicenses.every((r) => r.real === true) ? pass("every establishment license carries real:true") : fail("provenance law", "record missing real:true");
LICENSE_PROVENANCE.source && LICENSE_PROVENANCE.retrievedAt && LICENSE_PROVENANCE.publisher && LICENSE_PROVENANCE.withheldFields
  ? pass("corpus provenance recorded (source + publisher + retrievedAt + disclosed withheld fields)")
  : fail("provenance law", "corpus provenance incomplete");
establishmentLicenses.every((r) => r.example === undefined) ? pass("no real record is labeled example (real data is not an example)") : fail("labeling law", "real record labeled example");

// ── 4. rate-card law (survey-floor vocabulary) ───────────────────────────────
console.log("\nRate-card law (§5.1 / §9.1, axp-ext-rates-g2@0.2.0 floor)");
const openapiDoc = buildOpenapi(manifest);
for (const r of RATES) {
  const named = r.price === 0 || r.included !== undefined || r.note !== undefined;
  named ? pass(`${r.operation}: zero price, included allowance, or free-floor note named`) : fail(r.operation, "no zero price, no included allowance, no free-floor note");
}
RATES.every((r) => r.freeQuota === undefined) ? pass("no legacy freeQuota member anywhere (included allowances only)") : fail("survey floor", "legacy freeQuota member present");
const declaredOperationIds = new Set();
for (const methods of Object.values(openapiDoc.paths || {})) {
  for (const op of Object.values(methods)) {
    if (op && typeof op === "object" && op.operationId) declaredOperationIds.add(op.operationId);
  }
}
for (const r of RATES) {
  declaredOperationIds.has(r.operation) ? pass(`${r.operation} ∈ OpenAPI operationIds`) : fail(r.operation, "not an OpenAPI operationId — the rate card may only price declared operations");
}

// ── 5. NATIVE extension emission (axp-faces@0.3.0 — no bridges) ─────────────
console.log("\nNative axp-ext-rates-g2 emission (vendored 0.3.0, no bridge file)");
existsSync(join(root, "extensions.js")) ? fail("no-bridge law", "extensions.js bridge file exists — the batch requires native emission") : pass("no bridge file exists — the generator emits all four fields");
const card = buildCard(manifest);
const pricingDoc = buildPricingDocument(manifest);
Array.isArray(pricingDoc.rates) && pricingDoc.rates.length === RATES.length ? pass("rates[] is TOP-LEVEL in the Pricing Document (native)") : fail("rates[] placement", "not top-level in /pricing");
card.g2 && card.g2.icp && card.g2.personas && card.g2.systems ? pass("g2 is TOP-LEVEL on the capability card (native; icp + personas + systems)") : fail("g2 placement", "missing/incomplete on card");
card.links?.verify === `${ORIGIN}/verify` ? pass("links.verify is a card link member (native)") : fail("links.verify placement", String(card.links?.verify));
let missingOpIds = [];
for (const [p, methods] of Object.entries(openapiDoc.paths || {})) {
  for (const [m, op] of Object.entries(methods)) {
    if (op && typeof op === "object" && !op.operationId) missingOpIds.push(`${m.toUpperCase()} ${p}`);
  }
}
missingOpIds.length === 0 ? pass("operationId on EVERY OpenAPI route (native passthrough)") : fail("operationId placement", missingOpIds.join(", "));
openapiDoc.paths?.["/bookings"]?.get?.operationId === "listBookings" ? pass("collection operationId is the real verb listBookings (never listCollection)") : fail("collection verb", String(openapiDoc.paths?.["/bookings"]?.get?.operationId));
const cardTools = card.interfaces?.mcp?.tools;
Array.isArray(cardTools) && cardTools.every((t) => typeof t === "string") ? pass("MCP tools declared as STRING operationIds on the card") : fail("mcp tools", "non-string tool entries");
card.interfaces?.mcp?.url === `${ORIGIN}/mcp` ? pass("MCP door declared on the card (mounted)") : fail("mcp declaration", "card interfaces.mcp missing");
card.interfaces?.testSuite === undefined ? pass("interfaces.testSuite stays UNDECLARED (digest-pinned executable suite pending)") : fail("testSuite", "declared before the digest-pinned bar");
const mcpRes = await worker.fetch(
  new Request(`${ORIGIN}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }),
  {},
  {},
);
const mcpBody = await mcpRes.json().catch(() => undefined);
const liveToolNames = (mcpBody?.result?.tools || []).map((t) => t.name);
liveToolNames.length === 9 ? pass("MCP tools/list answers authless with all 9 operations") : fail("mcp door", `status ${mcpRes.status}, tools ${liveToolNames.length}`);
liveToolNames.every((n) => declaredOperationIds.has(n)) ? pass("five-surface invariant: every live MCP tool name is a declared operationId") : fail("five-surface invariant", `stray tool names: ${liveToolNames.filter((n) => !declaredOperationIds.has(n)).join(", ")}`);
JSON.stringify([...liveToolNames].sort()) === JSON.stringify([...cardTools].sort()) ? pass("card tool strings equal the live tools/list set") : fail("five-surface invariant", "card tools != live tools");

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length > 0) {
  console.error(`SELF-VERIFY FAILED — ${failures.length} defect(s)`);
  process.exit(1);
}
console.log("SELF-VERIFY PASSED — suite digest " + (await suiteDigest()));
console.log("suite bytes: " + suiteText.length);
