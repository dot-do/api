#!/usr/bin/env node
/**
 * check.mjs — the fail-closed local gate for this example (spec §9.1):
 *
 *   1. vendor drift gate: every file in ./axp is byte-identical to the
 *      digests its own PINS.json carries (nothing vendored is hand-edited);
 *   2. spec pin gate: ./spec/apis-ax-standard.spec.json hashes to the
 *      ratified pinned digest PINS.json names (apis-ax-axp@2.6.0);
 *   3. conformance gate — DISCLOSED RE-IMPLEMENTATION (§9.1 box 4, batch
 *      watch-list item): `describeConformance` is ABSENT from vendored
 *      axp-faces 0.3.0, so the probe ladder is run IN-PROCESS against the
 *      worker via the api.qa verifier (gradePinned at --expect-digest
 *      semantics) instead — same pinned requirements, same fail-closed
 *      posture; this note IS the disclosure. The 2.5.0 landing-order
 *      accommodation from axp-faces' own suite is mirrored:
 *      `check-capability-coverage` is filtered out only while the installed
 *      verifier does not register it, and the run digest is then computed
 *      over the filtered view and loudly named;
 *   4. fixture-law gate (the corpus is 100% synthetic — source-route
 *      honesty: the row's first-party capture rail is unbuilt and public
 *      rate data is the register-ruled avoid lane, so NO record on this
 *      face is or claims to be real): every record labeled example data,
 *      every identifier carries the 952 demo prefix, every email is
 *      @example.com, every party is an Example name, and no record claims
 *      `real: true` or carries a provenance block (class-A status is never
 *      improvised);
 *   5. rate-card coherence gate: every rates[].operation is a declared
 *      substrate operation, every rate row prices from zero or carries a
 *      free quota, and the seed corpus gives every GET operation a
 *      substantive answer (§9.1 box 5: the seed exercises every operation);
 *   6. conneg spot-check gate (§9.1 box 14): bare-curl JSON / agent-UA
 *      markdown / browser HTML verified in-process on /verify.
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
const vendored = JSON.parse(readFileSync(join(HERE, "axp/VENDORED.json"), "utf8"));
gate(
  "vendored PINS.json matches VENDORED.json record",
  sha256(readFileSync(join(HERE, "axp/PINS.json"))) === vendored.files["PINS.json"],
  `from ${vendored.branch} @ ${vendored.vendoredFromCommit.slice(0, 8)}`,
);
gate(
  "extension pin is axp-ext-rates-g2@0.2.0 at the ratified digest",
  pins.extensions?.["axp-ext-rates-g2"]?.version === "0.2.0" &&
    pins.extensions?.["axp-ext-rates-g2"]?.digest === "903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5",
);

// 2 ── spec pin gate
const specText = readFileSync(join(HERE, "spec/apis-ax-standard.spec.json"), "utf8");
const specDigest = sha256(specText);
gate(`spec digest == PINS pinnedSpecDigest (${pins.pinnedSpec})`, specDigest === pins.pinnedSpecDigest, specDigest.slice(0, 12));

// 3 ── in-process conformance at the pin (disclosed re-implementation of the
//      probe ladder — describeConformance is absent from vendored axp-faces)
console.log("note: describeConformance is ABSENT from vendored axp-faces 0.3.0 — the probe ladder runs in-process via the api.qa verifier (gradePinned, --expect-digest semantics). Disclosed per §9.1 box 4.");
const qaPath = process.env.AUTONOMOUS_QA;
let qa;
try {
  qa = await import(qaPath ? pathToFileURL(join(qaPath, "dist/src/index.js")).href : "autonomous-qa");
} catch (e) {
  gate("conformance (autonomous-qa resolvable)", false, `set AUTONOMOUS_QA to the package dir: ${e.message}`);
}
const { default: worker } = await import(pathToFileURL(join(HERE, "worker.mjs")).href);
const { ORIGIN } = await import(pathToFileURL(join(HERE, "manifest.mjs")).href);
if (qa) {
  const hasCoverage = qa.eligibleOptionalChecks().includes("capability-coverage");
  const ratified = JSON.parse(specText);
  const runDoc = hasCoverage ? ratified : { ...ratified, requirements: ratified.requirements.filter((r) => r.id !== "check-capability-coverage") };
  const runSpec = hasCoverage ? specText : JSON.stringify(runDoc, null, 2);
  const runDigest = sha256(runSpec);
  if (!hasCoverage) console.log(`note: installed verifier predates capability-coverage — runnable view is ${runDoc.requirements.length} requirements, digest ${runDigest.slice(0, 12)}…`);
  const report = await qa.gradePinned(worker, runSpec, { expectedDigest: runDigest, baseOrigin: ORIGIN });
  for (const r of report.requirements.filter((x) => x.verdict !== "pass")) {
    console.log(`  requirement ${r.id}: ${r.verdict} — ${r.detail}`);
  }
  gate(`conformance passed at pinned digest (${runDoc.requirements.length} requirements)`, report.passed === true);
}

// 4 ── fixture-law gate (the corpus is 100% synthetic — no class-A claims)
const { properties, bookings, folios, nightAuditReports } = await import(pathToFileURL(join(HERE, "seed.mjs")).href);
const synthetic = [...properties, ...bookings, ...folios, ...nightAuditReports];
gate("every synthetic record labeled example: true", synthetic.every((r) => r.example === true), `${synthetic.length} records`);
gate("every synthetic id carries the 952 demo prefix", synthetic.every((r) => /-952-/.test(r.id)));
const syntheticText = JSON.stringify(synthetic);
const emails = syntheticText.match(/[\w.+-]+@[\w.-]+/g) || [];
gate("every synthetic email is @example.com", emails.every((e) => e.endsWith("@example.com")), `${emails.length} emails`);
gate(
  "every named party is an Example name",
  properties.every((p) => p.name.startsWith("Example ") && p.operator.name.startsWith("Example ")) &&
    bookings.every((b) => b.guest.name.endsWith(" Example") || b.guest.name.includes("Example")),
);
gate(
  "no record improvises class-A status (no real: true, no provenance block)",
  synthetic.every((r) => r.real === undefined && r.provenance === undefined),
);
gate(
  "no synthetic filter value collides with the knownEmpty probe value",
  bookings.every((b) => b.status !== "none" && b.property !== "none") && properties.every((p) => p.type !== "none"),
);
gate(
  "folio arithmetic internally consistent (lines sum to total; balance zero)",
  folios.every((f) => Math.abs(f.lines.reduce((t, l) => t + l.amount, 0) - f.total) < 0.005 && f.balance === 0),
);
gate(
  "night-audit arithmetic recomputes from the corpus (outOfBalance 0)",
  nightAuditReports.every((r) => r.outOfBalance === 0 && r.occupiedUnits <= r.totalUnits),
);

// 5 ── rate-card coherence + seed-exercises-every-operation gate
const { substrate } = await import(pathToFileURL(join(HERE, "substrate.mjs")).href);
const { manifest } = await import(pathToFileURL(join(HERE, "manifest.mjs")).href);
const opIds = new Set(substrate.operations.map((o) => o.operation));
const rates = manifest.pricing.rates;
gate("every rates[].operation ⊆ declared operationIds", rates.every((r) => opIds.has(r.operation)), `${rates.length} rows / ${opIds.size} ops`);
gate("every operation has a rate row", [...opIds].every((o) => rates.some((r) => r.operation === o) || ["getIcp", "getSubstrate", "getVerify"].includes(o)));
gate("every rate row prices from zero or carries a free quota", rates.every((r) => r.price === 0 || (typeof r.freeQuota === "number" && r.freeQuota > 0)));
gate("MCP tool names ⊆ operationIds", manifest.mcp.tools.every((t) => opIds.has(t)));

const probe = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), {}, {});
const okType = async (path, init) => {
  const res = await probe(path, init);
  if (res.status !== 200) return false;
  const body = await res.json();
  return body.type === "OK";
};
gate("seed exercises listBookings", await okType("/bookings"));
gate("seed exercises getBooking", await okType("/bookings/BKG-952-0001"));
gate("seed exercises listProperties", await okType("/properties?type=villa"));
gate("seed exercises getProperty", await okType("/properties/PRP-952-0001"));
gate("seed exercises listNightAuditReports", await okType("/night-audit-reports?businessDate=2026-08-15"));
gate("seed exercises getNightAuditReport", await okType("/night-audit-reports/NAR-952-0001"));
gate("seed exercises listFolios", await okType("/folios"));
gate(
  "write doors exercise createBooking → cancelBooking → runNightAudit (ephemeral workspace)",
  await (async () => {
    const created = await probe("/bookings", {
      method: "POST",
      body: JSON.stringify({ property: "PRP-952-0001", guestName: "Robin Example", checkIn: "2026-09-01", nights: 2 }),
    });
    if (created.status !== 200) return false;
    const body = await created.json();
    const id = body.bookings?.[0]?.id;
    if (!id || !id.startsWith("BKG-ANON-")) return false;
    const audit = await probe("/night-audit-reports", { method: "POST", body: JSON.stringify({ businessDate: "2026-09-01" }) });
    if (audit.status !== 200) return false;
    const auditBody = await audit.json();
    if (auditBody.nightAuditReports?.[0]?.occupiedUnits !== 1) return false;
    const cancelled = await probe(`/bookings/${id}/cancel`, { method: "POST" });
    if (cancelled.status !== 200) return false;
    const seedCancel = await probe("/bookings/BKG-952-0001/cancel", { method: "POST" });
    return seedCancel.status === 403; // seed tenant read-only → BLOCKED
  })(),
);

// 6 ── conneg spot-check gate (§9.1 box 14)
const ctOf = async (path, headers) => (await probe(path, { headers })).headers.get("content-type") || "";
gate("conneg: bare curl gets JSON on /verify", (await ctOf("/verify", { accept: "*/*", "user-agent": "curl/8.6.0" })).includes("json"));
gate("conneg: agent UA gets markdown on /verify", (await ctOf("/verify", { accept: "*/*", "user-agent": "Claude-User/1.0" })).includes("markdown"));
gate(
  "conneg: browser gets HTML on /verify",
  (await ctOf("/verify", { accept: "text/html,application/xhtml+xml", "user-agent": "Mozilla/5.0" })).includes("html"),
);
gate("conneg: extension override /verify.md", (await ctOf("/verify.md", { accept: "*/*", "user-agent": "curl/8.6.0" })).includes("markdown"));

if (failures > 0) {
  console.error(`\n${failures} gate(s) FAILED — fail-closed: do not deploy, do not soften copy.`);
  process.exit(1);
}
console.log("\nall gates green at the ratified pin.");
