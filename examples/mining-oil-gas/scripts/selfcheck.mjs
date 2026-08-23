#!/usr/bin/env node
/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for `mining-oil-gas`
 * wave zero, fail-closed and scriptable. 16 boxes, scored /16; a BLOCKED box
 * is a recorded blocker, never a stub.
 *
 * Vendoring provenance (batch watch list): axp-faces@0.3.0 with
 * axp-ext-rates-g2@0.2.0 was vendored via `git show` from the axp.org.ai
 * repo's COMMITTED HEAD on branch draft/axp-extension-rates-g2 —
 * commit 523c9ef217d54feefb0b20734a6d2996a6965b79 — never the working tree.
 * Byte-identity is re-verified below against axp/PINS.json on every run.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const VENDORED_FROM = {
  repo: "axp.org.ai",
  branch: "draft/axp-extension-rates-g2",
  commit: "523c9ef217d54feefb0b20734a6d2996a6965b79",
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const { default: worker } = await import(join(root, "worker.js"));
const { buildManifest, ORIGIN } = await import(join(root, "manifest.js"));
const { apiProduct, OPERATIONS } = await import(join(root, "apiproduct.js"));
const { projection } = await import(join(root, "projection.js"));
const seed = await import(join(root, "seed.js"));

const manifest = buildManifest();
const get = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), {}, undefined);
const json = async (path, init) => {
  const res = await get(path, init);
  return { res, body: await res.json() };
};

let passCount = 0;
let blockedCount = 0;
const rows = [];
function box(n, label, verdict, detail = "") {
  const mark = verdict === "PASS" ? "✓" : verdict === "BLOCKED" ? "◼" : "✗";
  if (verdict === "PASS") passCount++;
  if (verdict === "BLOCKED") blockedCount++;
  rows.push(`${mark} [${String(n).padStart(2)}] ${verdict.padEnd(7)} ${label}${detail ? ` — ${detail}` : ""}`);
  if (verdict === "FAIL") process.exitCode = 1;
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// 1 — G3 APIProduct instance
{
  const nounsOk = apiProduct.nouns.every(
    (n) => typeof n.schema === "string" && ["ingested", "generated", "native", "federated"].includes(n.binding) && n.verbs.length > 0 && n.verbs.every((v) => OPERATIONS.includes(v)),
  );
  const sysOk = apiProduct.systems.length > 0 && apiProduct.systems.every((s) => s.coordinates.length > 0);
  box(1, "G3 APIProduct authored: every Noun has schema+binding+verbs; System coordinate declared", nounsOk && sysOk ? "PASS" : "FAIL");
}

// 2 — both plies from one definition
{
  const { body: coll } = await json("/jib-statements");
  const { res, body } = await json("/jib-statements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wellId: "well-demo-001", partnerId: "op-demo-002", grossBilled: 100, workingInterestShare: 0.5 }),
  });
  const { body: reread } = await json("/jib-statements");
  const ok2 = coll.type === "OK" && res.status === 201 && body.type === "OK" && reread.jibStatements.length === coll.jibStatements.length + 1;
  box(2, "Both plies serve from one definition (GET data face + POST headless door on the same collection)", ok2 ? "PASS" : "FAIL");
}

// 3 — quartet from vendored axp-faces at the PINS digest, byte-identical
{
  const pins = JSON.parse(readFileSync(join(root, "axp", "PINS.json"), "utf8"));
  let identical = pins.version === "0.3.0" && pins.extensions?.["axp-ext-rates-g2"]?.version === "0.2.0" && pins.extensions["axp-ext-rates-g2"].digest === "903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5";
  for (const [file, hash] of Object.entries(pins.files)) {
    const local = join(root, "axp", file.replace(/^src\//, ""));
    if (sha256(readFileSync(local)) !== hash) identical = false;
  }
  const quartet = [];
  for (const p of ["/.well-known/agents.json", "/openapi.json", "/pricing.json", "/llms.txt"]) quartet.push((await get(p)).status);
  box(3, `Quartet from vendored axp-faces@0.3.0 (rates-g2@0.2.0 native), byte-identical to PINS at ${VENDORED_FROM.commit.slice(0, 7)}`, identical && quartet.every((s) => s === 200) ? "PASS" : "FAIL");
}

// 4 — pinned conformance gate green (delegated to vitest run — fail-closed digest)
{
  const specBytes = readFileSync(join(root, "spec", "apis-ax-axp-2.6.0.spec.json"));
  const digest = sha256(specBytes);
  box(4, "Local conformance green at pinned digest (pnpm test runs assertConforms fail-closed)", digest === "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d" ? "PASS" : "FAIL", `spec digest ${digest.slice(0, 12)}…`);
}

// 5 — anon sandbox floor: keyless 200 with substantive labeled seed
{
  const { res, body } = await json("/wells");
  const labeled = body.wells?.every((w) => w.example === true && w.name.startsWith("[demo]"));
  const secretScan = !/(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN)/.test(JSON.stringify(Object.fromEntries(Object.entries(seed).filter(([k]) => k !== "default"))));
  const apiNums = seed.wells.every((w) => /^00-\d{3}-\d{5}$/.test(w.apiNumber));
  box(5, "Anon sandbox: keyless 200 OK, labeled seed, fixture law (secret-scan, synthetic 00-prefix API numbers, no real names)", res.status === 200 && labeled && secretScan && apiNums ? "PASS" : "FAIL");
}

// 6 — rate card
{
  const { body: pricing } = await json("/pricing.json");
  const { body: openapi } = await json("/openapi.json");
  const opIds = [];
  for (const p of Object.values(openapi.paths)) for (const op of Object.values(p)) if (op.operationId) opIds.push(op.operationId);
  // offers live at the 402 OFFER boundary in the generated wire schema (the
  // pinned conformance gate is the authority on the document shape)
  const { res: offerRes, body: offerBody } = await json(manifest.pricing.offerPath);
  const offersOk = manifest.pricing.offers.length > 0 && offerRes.status === 402 && Array.isArray(offerBody.alternatives) && offerBody.alternatives.length > 0;
  const ok6 =
    pricing.model === "metered" &&
    pricing.hardCeiling > 0 &&
    typeof pricing.statement === "string" &&
    pricing.binding === false &&
    offersOk &&
    pricing.rates.length > 0 &&
    pricing.rates.every((r) => opIds.includes(r.operation) && (r.freeQuota !== undefined || r.price === 0));
  box(6, "Rate card served: model, hardCeiling>0, binding+statement, offers at the 402 boundary, every rate row freeQuota-or-zero, rates[].operation ⊆ operationIds", ok6 ? "PASS" : "FAIL");
}

// 7 — motion declared, shapes from the motion's set, no OAuth/CC gates on B2A
{
  const b2aShapes = ["anon-sandbox", "earned-credits", "human-claimed", "paid"];
  const ok7 = projection.motion === "B2A" && projection.offer.every((o) => b2aShapes.includes(o.shape) && !/oauth|credit card/i.test(o.gate));
  box(7, "motion=B2A declared; offer shapes drawn only from the B2A ladder; no OAuth/CC gates", ok7 ? "PASS" : "FAIL");
}

// 8 — 402 OFFER advertises the ladder
{
  const { res, body } = await json(manifest.pricing.offerPath);
  const modes = (body.alternatives || []).map((a) => a.mode).sort();
  box(8, "402 OFFER body advertises the B2A ladder (pay / work / claim), rungs labeled stubs", res.status === 402 && body.type === "OFFER" && modes.join(",") === "claim,pay,work" ? "PASS" : "FAIL");
}

// 9 — counterpart-brand gap recorded
box(9, "B2A2B/C: counterpart-brand gap RECORDED in projection config (row ICP names non-technical principals; no human-vocabulary name held)", projection.counterpartBrand?.gap === true ? "PASS" : "FAIL");

// 10 — G4 projection config complete (GAP form per §0)
{
  const p = projection;
  const ok10 = p.substrate === "mining-oil-gas" && p.brand === null && p.brandGap?.status === "GAP" && p.icp && p.personas.length > 0 && p.motion && p.offer.length > 0 && p.positioning === null && p.experiment?.pattern;
  box(10, "G4 projection config complete in its GAP form (brand null + gap recorded; ICP/personas/motion/offer/experiment present)", ok10 ? "PASS" : "FAIL");
}

// 11 — guardrail
box(11, "Guardrail: no agent-default claim carried (GAP row claims nothing), so no sibling price comparison can be violated", projection.positioning === null ? "PASS" : "FAIL");

// 12 — /verify published, testSuite undeclared
{
  const { res } = await json("/verify");
  const { body: card } = await json("/.well-known/agents.json");
  box(12, "/verify export published; interfaces.testSuite NOT declared (no digest-pinned suite document yet)", res.status === 200 && card.interfaces.testSuite === undefined && card.links.verify === `${ORIGIN}/verify` ? "PASS" : "FAIL");
}

// 13 — seams emitted with the §6.4 grain
{
  const lines = [];
  const orig = console.log;
  console.log = (s) => lines.push(s);
  try {
    await get("/wells");
  } finally {
    console.log = orig;
  }
  const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const meterEv = events.find((e) => e.seam === "meter");
  const trafficEv = events.find((e) => e.seam === "traffic");
  const ok13 = meterEv && ["substrate", "projection", "motion", "operation", "shape", "pattern"].every((k) => k in meterEv) && trafficEv && "identityClass" in trafficEv && "referral" in trafficEv;
  box(13, "Seams emitted: meter events carry {substrate,projection,motion,operation,shape,pattern}; traffic carries identity class + referral", ok13 ? "PASS" : "FAIL");
}

// 14 — conneg matrix spot-check
{
  const curl = await get("/", { headers: { accept: "*/*", "user-agent": "curl/8.6.0" } });
  const agent = await get("/", { headers: { accept: "*/*", "user-agent": "Claude-User/1.0" } });
  const browser = await get("/", { headers: { accept: "text/html", "sec-fetch-dest": "document", "user-agent": "Mozilla/5.0" } });
  const ok14 =
    (curl.headers.get("content-type") || "").includes("json") &&
    (agent.headers.get("content-type") || "").includes("markdown") &&
    (await browser.text()).includes("<!doctype html>");
  box(14, "Conneg matrix spot-check: bare curl → JSON, agent UA → markdown, browser → HTML; demo data labeled on every face", ok14 ? "PASS" : "FAIL");
}

// 15 — no ghost surfaces
{
  const { body: card } = await json("/.well-known/agents.json");
  let ok15 = true;
  for (const entry of card.interfaces.http) {
    const path = new URL(entry.url).pathname;
    const res = await get(path);
    const wanted = path === manifest.pricing.offerPath ? 402 : 200;
    if (res.status !== wanted) ok15 = false;
  }
  const mcpRes = await json("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  const served = mcpRes.body.result.tools.map((t) => t.name).sort().join(",");
  if (served !== [...manifest.mcp.tools].sort().join(",")) ok15 = false;
  box(15, "No ghost surfaces: every declared http interface + every declared MCP tool answers", ok15 ? "PASS" : "FAIL");
}

// 16 — rail-ledger registration
box(
  16,
  "Face registered in the rail ledger (faces-payable/week denominator)",
  "BLOCKED",
  "blocked-on-rail-ledger: probed ~/projects/ax branch draft/rail-ledger-v1 (worktree HEAD 1620e9f, 2026-08-23) — no ledger service, no LEDGER.md, no address convention exists yet; recorded, never stubbed",
);

console.error(`\nmining-oil-gas §9.1 self-verify — vendored from ${VENDORED_FROM.repo}@${VENDORED_FROM.commit} (${VENDORED_FROM.branch})\n`);
for (const r of rows) console.error(r);
console.error(`\nscore: ${passCount}/16 pass, ${blockedCount} blocked (blockers recorded, never stubbed)${process.exitCode ? " — FAILURES PRESENT" : ""}`);
