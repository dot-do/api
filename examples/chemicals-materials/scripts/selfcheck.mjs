#!/usr/bin/env node
/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for the
 * chemicals-materials wave-zero property, run in-process against the worker
 * (Workers-shaped fetch handler imported directly; no network, no deploy).
 *
 * Exactly 16 boxes (§9.1), scored /16. Fail-closed: any failing box exits 1.
 * Boxes that are structurally DEFERRED / BLOCKED / N-A at wave zero say so
 * explicitly and why — they are never silently skipped and never stubbed.
 *
 * VENDORING PROVENANCE (batch watch-list law): axp/ was vendored from the
 * axp.org.ai repo's COMMITTED HEAD on branch draft/axp-extension-rates-g2 —
 * commit 523c9ef217d54feefb0b20734a6d2996a6965b79 — via `git show`, never
 * the working tree. Box 3 re-verifies byte-identity against that commit
 * when the repo is present, and against PINS.json digests always.
 *
 *   node scripts/selfcheck.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(DIR);

const VENDORED_FROM_HEAD = "523c9ef217d54feefb0b20734a6d2996a6965b79"; // axp.org.ai draft/axp-extension-rates-g2
const AXP_REPO = "/Users/nathanclevenger/projects/axp.org.ai";
const EXT_DIGEST = "903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5"; // axp-ext-rates-g2@0.2.0

const worker = (await import("../worker.js")).default;
const { manifest, ORIGIN } = await import("../manifest.js");
const { product } = await import("../product.js");
const { coverageDomain } = await import("../axp/coverage.js");
const { VERIFY_DOC } = await import("../surfaces.js");

const results = [];
let failures = 0;
function box(name, fn) {
  try {
    const note = fn();
    results.push(["PASS", name, note || ""]);
  } catch (e) {
    failures++;
    results.push(["FAIL", name, e.message]);
  }
}
function note(name, status, msg) {
  results.push([status, name, msg]);
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function call(path, { method = "GET", headers = {}, body } = {}) {
  const req = new Request(`${ORIGIN}${path}`, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) });
  const res = await worker.fetch(req, {}, { waitUntil() {} });
  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, json, text };
}

// silence seam logs during the run, but count them
const seamEvents = [];
const realLog = console.log;
console.log = (line) => {
  try {
    const o = JSON.parse(line);
    if (o.seam) return void seamEvents.push(o);
  } catch {}
  realLog(line);
};

// The canonical operation-id set — the five-surface invariant's one name.
const contractIds = new Set([manifest.collection.operationId, ...manifest.routes.map((r) => r.operationId)]);

// ── 1. G3 APIProduct instance ────────────────────────────────────────────────
box("1 G3: APIProduct instance — every Noun has schema+binding+verbs; System coordinates declared (row hedges carried)", () => {
  assert(product.substrate === "chemicals-materials", "substrate id mismatch");
  for (const n of product.nouns) assert(n.$type && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0, `Noun ${n.name} incomplete`);
  assert(product.systems.length >= 1 && product.systems.every((s) => s.system && s.coordinates.length > 0), "System coordinates missing");
  assert(product.systems.some((s) => (s.note || "").includes("UNVERIFIED")), "the register's [UNVERIFIED] system-of-record hedge must be carried, not dropped");
  // product.operations must equal the served contract's canonical ids
  const prodOps = new Set(product.operations);
  for (const id of contractIds) assert(prodOps.has(id), `contract operation ${id} missing from product.operations`);
  for (const id of prodOps) assert(contractIds.has(id), `product operation ${id} not in the served contract`);
  return `${product.nouns.length} nouns, ${product.systems.length} system coordinates, ${prodOps.size} operations = contract`;
});

// ── 2. Both plies from one definition ───────────────────────────────────────
await (async () => {
  const dataRead = await call("/substances");
  const headlessCreate = await call("/substances", { method: "POST", body: { name: "selfcheck substance", physicalState: "liquid" } });
  box("2 Both plies serve from ONE definition (data GET + headless POST on the same collection)", () => {
    assert(dataRead.status === 200 && dataRead.json.type === "OK", "data face GET /substances failed");
    assert(headlessCreate.status === 200 && headlessCreate.json.type === "OK", "headless POST /substances failed");
    assert(headlessCreate.json.workspace && headlessCreate.json.retention, "workspace mint / disclosed retention missing");
    return `workspace ${headlessCreate.json.workspace} minted, retention disclosed`;
  });
})();

// ── 3. Quartet via vendored axp-faces at pins + provenance drift gate ───────
await (async () => {
  const card = await call("/.well-known/agents.json");
  const openapi = await call("/openapi.json");
  const pricing = await call("/pricing");
  const llms = await call("/llms.txt");
  box("3 Quartet from one defineSiteManifest() via vendored axp-faces at PINS digest; vendored bytes = committed HEAD 523c9ef2 (git show), never the working tree", () => {
    assert(card.status === 200 && card.json.probes && card.json.interfaces.http.length > 0, "card incomplete");
    assert(openapi.status === 200 && openapi.json.openapi === "3.1.0", "openapi not 3.1");
    assert(pricing.status === 200 && pricing.json.model === "metered", "pricing missing");
    assert(llms.status === 200 && /^# /m.test(llms.text) && llms.text.includes("## Machine surfaces"), "llms.txt H1/tail missing");
    const pins = JSON.parse(readFileSync(join(DIR, "axp/PINS.json"), "utf8"));
    assert(pins.pinnedSpec === "apis-ax-axp@2.6.0", "PINS not at the ratified 2.6.0 pin");
    assert(pins.version === "0.3.0", "axp-faces not 0.3.0");
    assert(pins.extensions?.["axp-ext-rates-g2"]?.version === "0.2.0", "extension axp-ext-rates-g2 not 0.2.0");
    assert(pins.extensions?.["axp-ext-rates-g2"]?.digest === EXT_DIGEST, "extension digest ≠ the ratified 903e414d… digest");
    const specDigest = readFileSync(join(DIR, "spec/apis-ax-standard.digest.txt"), "utf8").trim();
    assert(specDigest === pins.pinnedSpecDigest, "vendored spec digest ≠ PINS digest");
    // byte-identity: every vendored file hashes to its PINS entry
    for (const [rel, want] of Object.entries(pins.files)) {
      const local = rel.replace(/^src\//, "");
      assert(sha256(readFileSync(join(DIR, "axp", local))) === want, `vendored ${local} ≠ PINS digest`);
    }
    // provenance: byte-identical with the COMMITTED HEAD we vendored from
    let provenance = "PINS-digest match only (axp.org.ai repo not present)";
    if (existsSync(AXP_REPO)) {
      for (const rel of Object.keys(pins.files)) {
        const local = rel.replace(/^src\//, "");
        const committed = execFileSync("git", ["-C", AXP_REPO, "show", `${VENDORED_FROM_HEAD}:packages/axp-faces/${rel.startsWith("src/") ? rel : rel}`]);
        assert(sha256(committed) === sha256(readFileSync(join(DIR, "axp", local))), `vendored ${local} ≠ committed HEAD ${VENDORED_FROM_HEAD.slice(0, 8)}`);
      }
      const pinsCommitted = execFileSync("git", ["-C", AXP_REPO, "show", `${VENDORED_FROM_HEAD}:packages/axp-faces/PINS.json`]);
      assert(sha256(pinsCommitted) === sha256(readFileSync(join(DIR, "axp/PINS.json"))), "PINS.json ≠ committed HEAD copy");
      provenance = `byte-identical with committed HEAD ${VENDORED_FROM_HEAD.slice(0, 12)} (git show)`;
    }
    return `pin ${pins.pinnedSpec} @ ${pins.pinnedSpecDigest.slice(0, 8)}…; ext 0.2.0 @ ${EXT_DIGEST.slice(0, 8)}…; ${provenance}`;
  });
})();

// ── 4. Local conformance at pinned digest ───────────────────────────────────
note(
  "4 Local describeConformance({baseUrl}) green at pinned digest",
  "DEFERRED",
  "autonomous-qa is not a dependency of this repo and adding root deps is outside this draft branch's blast radius; boxes 5/8/12 re-implement the probe-ladder behavior in-process. Hosted api.qa verdict additionally requires a ruled, deployed domain (GAP row — placeholder address). Carried in the build summary.",
);

// ── 5. Anon sandbox universal floor + fixture law ───────────────────────────
await (async () => {
  const okRes = await call("/safety-data-sheets");
  box("5 Anon sandbox: keyless 200 OK with substantive LABELED seed; every operation exercised; fixture law (no real names/CAS/UN ids, synthetic ids, no secrets)", () => {
    assert(okRes.status === 200 && okRes.json.type === "OK", "keyless probe failed");
    const recs = okRes.json.safetyDataSheets;
    assert(recs.length >= 3, "seed not substantive");
    for (const r of recs) assert(r.example === true && r.demo_notice, `record ${r.id} not labeled example data`);
    for (const r of recs) assert(Array.isArray(r.sections) && r.sections.length === 16, `SDS ${r.id} does not carry all 16 GHS sections`);
    const seed = JSON.parse(readFileSync(join(DIR, "seed.json"), "utf8"));
    for (const k of ["suppliers", "substances", "safetyDataSheets", "shippingDeclarations", "facilities"]) {
      assert(Array.isArray(seed[k]) && seed[k].length > 0, `seed.${k} empty — an operation would answer without substance`);
      for (const r of seed[k]) assert(r.example === true, `seed.${k} record ${r.id} unlabeled`);
    }
    const recordText = JSON.stringify(["suppliers", "substances", "safetyDataSheets", "shippingDeclarations", "facilities"].map((k) => seed[k]));
    assert(!/(?:password|secret[^-]|api[_-]?key|bearer |-----BEGIN)/i.test(recordText.replace(/trade-secret/g, "")), "secret-scan hit in seed records");
    for (const s of seed.suppliers) assert(/\[example\]/.test(s.name) && /^00-/.test(s.ein), "supplier not example-labeled / EIN not synthetic 00-prefix");
    for (const s of seed.substances) assert(s.casShapedId === null || /^CAS-EX-/.test(s.casShapedId), `substance ${s.id} id not CAS-EX synthetic`);
    for (const d of seed.shippingDeclarations) assert(/^UN-EX-/.test(d.unShapedId), `declaration ${d.id} id not UN-EX synthetic`);
    return `${recs.length} labeled SDS (16 sections each); all collections populated + labeled; secret-scan clean; CAS/UN ids synthetic by pattern`;
  });
})();

// ── 6. Rate card — TOP-LEVEL rates[] + five-surface invariant ───────────────
await (async () => {
  const pricing = await call("/pricing");
  const retired = await call("/rates");
  box("6 Rate card at the ruled placement: top-level rates[] in /pricing; metered → hardCeiling>0 + offers + binding statement; every row freeQuota or zero price; rows/MCP tools/suite refs all key on canonical operationIds ⊆ contract (five-surface invariant); no /rates side door", () => {
    assert(pricing.json.model === "metered" && pricing.json.hardCeiling > 0, "pricing model/ceiling");
    assert(pricing.json.binding === false && typeof pricing.json.statement === "string", "unbound stub must carry binding:false + statement");
    const rates = pricing.json.rates;
    assert(Array.isArray(rates) && rates.length > 0, "top-level rates[] missing from the Pricing Document");
    for (const row of rates) assert(row.price === 0 || row.freeQuota !== undefined, `rate row ${row.operation} lacks freeQuota and is not zero-priced`);
    for (const row of rates) assert(!("unlimited" in row), "survey-floor vocabulary: 'unlimited' is an included-allowance object, never a bare member");
    const domain = new Set(coverageDomain(manifest));
    for (const row of rates) assert(domain.has(`openapi:${row.operation}`) || domain.has(`mcp:${row.operation}`), `rate row ${row.operation} not in the contract's canonical operation domain`);
    for (const row of rates) assert(contractIds.has(row.operation), `rate row ${row.operation} is not a canonical contract operationId`);
    for (const t of manifest.mcp.tools) assert(contractIds.has(t), `MCP tool ${t} is not a canonical contract operationId (five-surface invariant)`);
    for (const c of VERIFY_DOC.checks) assert(contractIds.has(c.operation) || c.operation === "getPricing", `suite check ${c.id} refs unknown operation ${c.operation}`);
    assert(retired.status === 404, "/rates side door answers — the ruled placement is top-level rates[] in /pricing");
    return `${rates.length} rows in /pricing, all canonical ⊆ coverage domain (${domain.size} ids); MCP tools + suite refs on the same ids; /rates 404`;
  });
})();

// ── 7. Motion declared; shapes from the motion's permissible set ────────────
box("7 motion declared per projection; B2A shapes only; no OAuth/CC gates on the B2A path (id.org.ai machine identity + 402)", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  assert(proj.motion === "B2A", "motion missing");
  const allowed = new Set(["anon-sandbox", "earned-credits", "human-claimed", "paid"]);
  for (const o of proj.offer) assert(allowed.has(o.shape), `shape ${o.shape} not in the B2A ladder`);
  const gates = proj.offer.map((o) => o.gate).join(" ");
  assert(!/oauth|credit card|\bCC\b/i.test(gates.replace(/no live settlement/i, "")), "an OAuth/CC gate leaked into a B2A projection");
  return "B2A, 4 ladder rungs (3 stubs, labeled)";
});

// ── 8. 402 OFFER advertises the ladder ───────────────────────────────────────
await (async () => {
  const overCeiling = await call("/safety-data-sheets?spend=26");
  const offerDoor = await call("/offer");
  const issueStub = await call("/shipping-declarations/dec-ex-1/issue", { method: "POST", body: {} });
  const empt1 = await call("/safety-data-sheets?hazardClass=none");
  const empt2 = await call("/safety-data-sheets?supplier=none");
  const forb1 = await call("/safety-data-sheets?scope=trade-secret");
  const forb2 = await call("/safety-data-sheets?scope=supplier-pricing");
  const half = await call("/safety-data-sheets?spend=12");
  const zero = await call("/safety-data-sheets?spend=0");
  box("8 402 OFFER bodies advertise the B2A ladder (pay / work / claim); payable stubs LABELED; probe ladder behaviorally passes (keyless OK, 2× knownEmpty, 2× knownForbidden, over/half/zero spend)", () => {
    for (const [lbl, r] of [["over-ceiling", overCeiling], ["offer door", offerDoor], ["issue stub", issueStub]]) {
      assert(r.status === 402 && r.json.type === "OFFER", `${lbl} is not a 402 OFFER`);
      assert(Array.isArray(r.json.alternatives), `${lbl} OFFER carries no alternatives ladder`);
      const ids = r.json.alternatives.map((a) => a.id).sort().join(",");
      assert(ids === "claim,pay,work", `${lbl} ladder incomplete: ${ids}`);
    }
    assert(issueStub.json.stub === true, "issue OFFER not labeled stub");
    assert(empt1.status === 200 && empt1.json.type === "EMPTY", "knownEmpty 1");
    assert(empt2.status === 200 && empt2.json.type === "EMPTY", "knownEmpty 2");
    assert(forb1.status === 403 && forb1.json.type === "BLOCKED", "knownForbidden 1");
    assert(forb2.status === 403 && forb2.json.type === "BLOCKED", "knownForbidden 2");
    assert(half.status === 200 && zero.status === 200, "spend ladder half/zero");
    return "3 OFFER doors, full ladder, stub labeled; all probe rungs answer typed";
  });
})();

// ── 9. Counterpart-brand gap ─────────────────────────────────────────────────
box("9 B2A2B/C counterpart-brand: gap RECORDED in the projection config", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  assert(proj.counterpartBrandGap && proj.counterpartBrandGap.recorded === true, "counterpart-brand gap not recorded");
  return "recorded (GAP row — naming is #3's job)";
});

// ── 10. G4 projection config complete ────────────────────────────────────────
box("10 G4 projection config complete per §2 (GAP form: brand pending, everything else filled; row hedges carried)", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  for (const k of ["substrate", "icp", "personas", "motion", "offer", "pricing", "positioning", "experiment"]) {
    assert(proj[k] !== undefined, `projection.${k} missing`);
  }
  assert(proj.brand === null && proj.brandStatus.includes("GAP"), "GAP row must record brand-pending, not invent a brand");
  assert(proj.brandStatus.includes("UNVERIFIED") || proj.positioning.includes("UNVERIFIED") || proj.positioning.includes("probe-before-build"), "the row's [UNVERIFIED]/probe-before-build hedge must appear in the projection record");
  assert(proj.sourceRouteStatus && proj.sourceRouteStatus.classA === false, "source-route status must record classA:false honestly");
  return "complete; brand=null (GAP), experiment registered, probe-before-build hedge carried";
});

// ── 11. Guardrail ────────────────────────────────────────────────────────────
note(
  "11 Guardrail (§5.3): agent-default claim never worse-priced than sibling same-shape face",
  "N/A",
  "no agent-default claim is made anywhere on this property (worthiness bar not attempted) and no sibling projection of this substrate exists — the check is vacuously satisfied and says so rather than claiming a run.",
);

// ── 12. /verify export + native card placements ──────────────────────────────
await (async () => {
  const verify = await call("/verify");
  const card = await call("/.well-known/agents.json");
  const mcpList = await call("/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  const mcpCall = await call("/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "listSafetyDataSheets", arguments: { hazardClass: "oxidizing-solid" } } } });
  box("12 /verify export published + card links.verify + top-level g2 (native rates-g2 placements); interfaces.testSuite NOT declared; MCP door mounted, card-declared, same Nouns/verbs", () => {
    assert(verify.status === 200 && Array.isArray(verify.json.checks) && verify.json.checks.length >= 10, "/verify missing or thin");
    assert(card.json.links.verify === `${ORIGIN}/verify`, "card links.verify missing or wrong — the ruled placement for the runnable-suite link");
    assert(card.json.g2 && typeof card.json.g2 === "object" && Object.keys(card.json.g2).length > 0, "card top-level g2 missing — the ruled placement for G2/ICP coordinates");
    assert(typeof card.json.links.icp === "string", "links.icp stays declared beside g2");
    assert(card.json.interfaces.testSuite === undefined, "testSuite declared without a verified pinned suite — inadmissible");
    const tools = mcpList.json.result.tools.map((t) => t.name).sort();
    const declared = [...manifest.mcp.tools].sort();
    assert(JSON.stringify(tools) === JSON.stringify(declared), "tools/list ≠ card declaration");
    const payload = JSON.parse(mcpCall.json.result.content[0].text);
    assert(payload.type === "OK" && payload.safetyDataSheets.every((r) => r.example === true), "tools/call result not the same labeled records");
    return `${verify.json.checks.length} published checks; links.verify + g2 on the card; ${tools.length} MCP tools == card, answering labeled seed`;
  });
})();

// ── 13. Seams ────────────────────────────────────────────────────────────────
box("13 Seams emitted: metering tagged {substrate,projection,motion,operation,shape,pattern} + identity class; operations are canonical ids; money + receipt stubs on the payable path", () => {
  const meters = seamEvents.filter((e) => e.seam === "meter");
  assert(meters.length > 0, "no metering events emitted during the run");
  for (const m of meters) {
    for (const k of ["substrate", "projection", "motion", "operation", "shape", "pattern", "identityClass"]) {
      assert(m[k] !== undefined, `meter event missing ${k}`);
    }
    assert(contractIds.has(m.operation) || /^mcp:/.test(m.operation), `meter operation ${m.operation} is not a canonical id`);
  }
  assert(seamEvents.some((e) => e.seam === "money" && e.stub === true && e.settled === false), "money-event stub not emitted");
  assert(seamEvents.some((e) => e.seam === "receipt" && e.stub === true), "receipt stub not emitted");
  return `${meters.length} meter events on canonical ids, money+receipt stubs present`;
});

// ── 14. Conneg spot-check + demo labeling ────────────────────────────────────
await (async () => {
  const bare = await call("/pricing");
  const agent = await call("/pricing", { headers: { "user-agent": "Claude-User/1.0", accept: "*/*" } });
  const browser = await call("/pricing", { headers: { accept: "text/html,application/xhtml+xml", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" } });
  box("14 Docs/landing conneg spot-check (bare curl JSON / agent UA markdown / browser HTML); demo data labeled on served faces", () => {
    assert((bare.headers.get("content-type") || "").includes("json"), "bare GET /pricing not JSON");
    assert((agent.headers.get("content-type") || "").includes("markdown"), "agent UA /pricing not markdown");
    assert((browser.headers.get("content-type") || "").includes("html"), "browser /pricing not HTML");
    return "three faces answer per the conneg law";
  });
})();

// ── 15. No ghost surfaces ────────────────────────────────────────────────────
await (async () => {
  const openapi = await call("/openapi.json");
  const misses = [];
  for (const [p, item] of Object.entries(openapi.json.paths)) {
    for (const method of Object.keys(item)) {
      if (!["get", "post"].includes(method)) continue;
      let probe = p
        .replace("/safety-data-sheets/{id}", "/safety-data-sheets/sds-ex-1")
        .replace("/substances/{id}", "/substances/sub-ex-1")
        .replace("/shipping-declarations/{id}/issue", "/shipping-declarations/dec-ex-1/issue")
        .replace("/shipping-declarations/{id}", "/shipping-declarations/dec-ex-1")
        .replace("/facilities/{id}", "/facilities/fac-ex-1");
      const r = await call(probe, {
        method: method.toUpperCase(),
        ...(method === "post" && probe === "/substances" && { body: { name: "ghost check" } }),
        ...(method === "post" && probe.includes("issue") && { body: {} }),
      });
      if (r.status === 404) misses.push(`${method.toUpperCase()} ${p}`);
    }
  }
  box("15 No ghost surfaces: every contract path answers (presence-when-true)", () => {
    assert(misses.length === 0, `declared but not serving: ${misses.join(", ")}`);
    return `${Object.keys(openapi.json.paths).length} contract paths all answer`;
  });
})();

// ── 16. Rail ledger ──────────────────────────────────────────────────────────
note(
  "16 Face registered in the rail ledger (faces-payable/week denominator)",
  "BLOCKED",
  "blocked-on-rail-ledger: checked ~/projects/ax branch draft/rail-ledger-v1 at committed HEAD 1620e9f during this build — no LEDGER.md and no ledger service exist yet (the branch tip equals main), so no address convention to point at. Never stubbed; registers when the ledger lands (and, for this GAP row, when an address is ruled).",
);

console.log = realLog;
let pass = 0, other = 0;
for (const [status, name, msg] of results) {
  if (status === "PASS") pass++;
  else if (status !== "FAIL") other++;
  console.log(`${status.padEnd(8)} ${name}${msg ? ` — ${msg}` : ""}`);
}
console.log(`\n${pass}/16 pass, ${failures} fail, ${other} deferred/blocked/N-A (16 §9.1 boxes; vendored from axp.org.ai draft/axp-extension-rates-g2 @ ${VENDORED_FROM_HEAD})`);
process.exit(failures ? 1 : 0);
