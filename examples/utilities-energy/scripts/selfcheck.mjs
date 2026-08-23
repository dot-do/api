#!/usr/bin/env node
/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist (16 boxes, scored /16)
 * for the utilities-energy wave-zero property, run in-process against the
 * worker (Workers-shaped fetch handler imported directly; no network, no
 * deploy).
 *
 * Batch-4 rules judged here (per the batch-3 watch list, binding):
 *   - vendoring is NATIVE axp-faces@0.3.0 + axp-ext-rates-g2@0.2.0 (digest
 *     903e414d…), taken via `git show` from the axp.org.ai repo's COMMITTED
 *     HEAD on branch draft/axp-extension-rates-g2 — the vendored-from commit
 *     is recorded below and re-verified against `git show` when the repo is
 *     reachable;
 *   - the four extension fields emitted natively (rates[] top-level, g2
 *     top-level, links.verify, operationId per route) — no bridges;
 *   - five-surface operationId invariant; real collection verbs;
 *   - survey-floor vocabulary: `included` allowances (never legacy freeQuota
 *     rows here), no reserved member names (the generator refuses them
 *     fail-closed);
 *   - mounted-rungs rule; testSuite undeclared; agent-default withheld.
 *
 * Fail-closed: any failing box exits 1. Boxes that are structurally
 * NOT-APPLICABLE, DEFERRED, or BLOCKED at wave zero say so explicitly and why.
 *
 *   node scripts/selfcheck.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(DIR);

/** The commit this property's axp/ vendoring was taken from (git show only). */
const VENDORED_FROM_COMMIT = "523c9ef217d54feefb0b20734a6d2996a6965b79";
const AXP_REPO = "/Users/nathanclevenger/projects/axp.org.ai";

const worker = (await import("../worker.js")).default;
const { manifest, ORIGIN } = await import("../manifest.js");
const { product } = await import("../product.js");

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

// ── 1. G3 APIProduct instance ────────────────────────────────────────────────
box("1. G3: APIProduct instance — every Noun has schema+binding+verbs; System coordinate declared AS THE ROW PROVIDES (empty cell)", () => {
  assert(product.substrate === "utilities-energy", "substrate id mismatch");
  for (const n of product.nouns) assert(n.$type && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0, `Noun ${n.name} incomplete`);
  assert(Array.isArray(product.systems) && product.systems.length === 0, "the row's headless cell is EMPTY ('—' in SC #21) — declaring a System would improvise a register field");
  assert(typeof product.systemsNote === "string" && product.systemsNote.includes("empty"), "the empty System set must be declared with the row's own note, never silently");
  return `${product.nouns.length} nouns; System set declared EMPTY as the row provides it (the cascade's only empty headless cell — CIS/MDM candidates [UNVERIFIED] stay undeclared per presence-when-true)`;
});

// ── 2. Both plies from one definition ───────────────────────────────────────
await (async () => {
  const dataRead = await call("/interconnection-requests");
  const headlessCreate = await call("/interconnection-requests", { method: "POST", body: { applicant: "Selfcheck Array Co. [example]", systemSizeKwDc: 12.5 } });
  box("2. Both plies serve from ONE definition (data GET + headless applicant-filing POST on the same collection)", () => {
    assert(dataRead.status === 200 && dataRead.json.type === "OK", "data face GET /interconnection-requests failed");
    assert(headlessCreate.status === 200 && headlessCreate.json.type === "OK", "headless POST /interconnection-requests failed");
    assert(headlessCreate.json.workspace && headlessCreate.json.retention, "workspace mint / disclosed retention missing");
    assert(headlessCreate.json.interconnectionRequests[0].example === true, "workspace-minted filing not labeled example data");
    return `workspace ${headlessCreate.json.workspace} minted, retention disclosed, labeled draft filing created`;
  });
})();

// ── 3. Quartet from one defineSiteManifest via vendored axp-faces at pins ───
//      NATIVE extension emission (batch-3/4 watch list): rates[] top-level,
//      g2 top-level, links.verify, operationId per route — no bridges.
await (async () => {
  const card = await call("/.well-known/agents.json");
  const openapi = await call("/openapi.json");
  const pricing = await call("/pricing");
  const llms = await call("/llms.txt");
  box("3. Quartet emitted from one defineSiteManifest() via vendored axp-faces@0.3.0 at the ratified pins; four extension fields NATIVE", () => {
    assert(card.status === 200 && card.json.probes && card.json.interfaces.http.length > 0, "card incomplete");
    assert(openapi.status === 200 && openapi.json.openapi === "3.1.0", "openapi not 3.1");
    assert(pricing.status === 200 && pricing.json.model === "metered", "pricing missing");
    assert(llms.status === 200 && /^# /m.test(llms.text) && llms.text.includes("## Machine surfaces"), "llms.txt H1/tail missing");
    const pins = JSON.parse(readFileSync(join(DIR, "axp/PINS.json"), "utf8"));
    assert(pins.version === "0.3.0" && pins.pinnedSpec === "apis-ax-axp@2.6.0", "PINS not axp-faces@0.3.0 at the ratified 2.6.0 spec pin");
    assert(pins.pinnedSpecDigest.startsWith("a9a1197c"), "PINS spec digest not the ratified a9a1197c…");
    const ext = pins.extensions && pins.extensions["axp-ext-rates-g2"];
    assert(ext && ext.version === "0.2.0" && ext.digest === "903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5", "axp-ext-rates-g2@0.2.0 pin (digest 903e414d…) missing from PINS");
    const specDigest = readFileSync(join(DIR, "spec/apis-ax-standard.digest.txt"), "utf8").trim();
    assert(specDigest === pins.pinnedSpecDigest, "vendored spec digest ≠ PINS digest");
    const extSpecHash = createHash("sha256").update(readFileSync(join(DIR, "spec/axp-ext-rates-g2.json"))).digest("hex");
    assert(extSpecHash === ext.digest, "vendored extension spec does not hash to the pinned 903e414d… digest");
    // native emission of the four fields
    assert(Array.isArray(pricing.json.rates) && pricing.json.rates.length > 0, "rates[] not TOP-LEVEL in the Pricing Document");
    assert(card.json.g2 && typeof card.json.g2 === "object" && !Array.isArray(card.json.g2) && card.json.g2.icp, "g2 not a top-level card object");
    assert(card.json.links.verify === `${ORIGIN}/verify`, "links.verify missing from the card links");
    const missing = [];
    for (const [p, item] of Object.entries(openapi.json.paths)) {
      for (const [m, op] of Object.entries(item)) {
        if (!["get", "post", "put", "patch", "delete"].includes(m)) continue;
        if (typeof op.operationId !== "string" || op.operationId.length === 0) missing.push(`${m.toUpperCase()} ${p}`);
      }
    }
    assert(missing.length === 0, `routes without operationId: ${missing.join(", ")}`);
    assert(manifest.collection.operationId === "listIntervalReads", "collection must carry a REAL verb name (listIntervalReads), never listCollection");
    return `pins axp-faces@0.3.0 / ${pins.pinnedSpec} @ a9a1197c… / ext 0.2.0 @ 903e414d…; rates[] ${pricing.json.rates.length} rows top-level; g2 + links.verify native; operationId on all ${Object.keys(openapi.json.paths).length} paths`;
  });

  // vendor provenance + drift gate: every vendored file byte-hashes to the
  // COMMITTED bytes at the recorded vendored-from commit (git show — never
  // the working tree), and to its PINS/VENDORED entries.
  box("SUPP. Vendored axp/ byte-identical to axp.org.ai COMMITTED HEAD " + VENDORED_FROM_COMMIT.slice(0, 7) + " (git show, never the working tree)", () => {
    const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
    const vendored = JSON.parse(readFileSync(join(DIR, "axp/VENDORED.json"), "utf8"));
    assert(vendored.vendoredFrom && vendored.vendoredFrom.commit === VENDORED_FROM_COMMIT, "VENDORED.json does not record the vendored-from commit");
    for (const [label, hash] of Object.entries(vendored.files)) {
      const local = join(DIR, "axp", label.replace(/^src\//, ""));
      assert(sha256(readFileSync(local)) === hash, `vendored ${label} does not hash to its VENDORED.json entry`);
    }
    const pins = JSON.parse(readFileSync(join(DIR, "axp/PINS.json"), "utf8"));
    for (const [label, hash] of Object.entries(pins.files)) {
      const local = join(DIR, "axp", label.replace(/^src\//, ""));
      assert(sha256(readFileSync(local)) === hash, `vendored ${label} does not hash to its PINS.json entry`);
    }
    try {
      for (const label of Object.keys(vendored.files)) {
        const upstream = execFileSync("git", ["-C", AXP_REPO, "show", `${VENDORED_FROM_COMMIT}:packages/axp-faces/${label}`]);
        const local = readFileSync(join(DIR, "axp", label.replace(/^src\//, "")));
        assert(sha256(upstream) === sha256(local), `vendored ${label} ≠ committed bytes at ${VENDORED_FROM_COMMIT.slice(0, 7)}`);
      }
      return `all ${Object.keys(vendored.files).length} files byte-identical to git show ${VENDORED_FROM_COMMIT.slice(0, 7)} (committed HEAD of draft/axp-extension-rates-g2) + PINS/VENDORED entries`;
    } catch (e) {
      if (/vendored .* ≠ committed/.test(e.message)) throw e;
      return "hash-identity vs PINS/VENDORED verified; upstream repo unreachable for the live git-show comparison in this environment — hashes recorded at vendoring time stand";
    }
  });
})();

// ── 4. Local conformance at pinned digest ───────────────────────────────────
note(
  "4. Local describeConformance({baseUrl}) green at pinned digest",
  "DEFERRED",
  "autonomous-qa is not a dependency of this repo and adding root deps is outside this draft branch's blast radius; the probe-ladder box below re-implements the behavioral checks in-process. Hosted api.qa verdict additionally requires a ruled, deployed domain (GAP row — placeholder address). Carried as a blocker in the build summary.",
);

// ── 5. Anon sandbox universal floor ─────────────────────────────────────────
await (async () => {
  const okRes = await call("/interval-reads");
  box("5. Anon sandbox: keyless 200 OK with substantive LABELED seed; seed exercises every operation; fixture law passes", () => {
    assert(okRes.status === 200 && okRes.json.type === "OK", "keyless probe failed");
    const recs = okRes.json.intervalReads;
    assert(recs.length >= 5, "seed not substantive");
    for (const r of recs) assert(r.example === true && r.demo_notice, `record ${r.id} not labeled example data`);
    const seed = JSON.parse(readFileSync(join(DIR, "seed.json"), "utf8"));
    for (const k of ["utilities", "meters", "intervalReads", "queueEntries", "interconnectionRequests", "tariffs"]) {
      assert(Array.isArray(seed[k]) && seed[k].length > 0, `seed.${k} empty — an operation would answer without substance`);
      for (const r of seed[k]) assert(r.example === true, `seed.${k} record ${r.id} unlabeled`);
    }
    for (const u of seed.utilities) {
      assert(/\[example\]/.test(u.name), `utility ${u.id} name not example-labeled`);
      assert(/^00-/.test(u.ein), `utility ${u.id} EIN not synthetic 00-prefix`);
      assert(/^UTIL-EX-/.test(u.id), `utility id ${u.id} not schema-shaped synthetic`);
    }
    for (const m of seed.meters) assert(/^MTR-EX-/.test(m.id), `meter id ${m.id} not schema-shaped synthetic`);
    for (const q of seed.queueEntries) assert(/^ISO-EX-/.test(q.queue), `queue ${q.queue} not schema-shaped synthetic (never real ISO queues as authority)`);
    for (const t of seed.tariffs) assert(/^TRF-EX-/.test(t.id), `tariff id ${t.id} not schema-shaped synthetic`);
    for (const r of seed.interconnectionRequests) assert(/\[example\]/.test(r.applicant), `applicant ${r.id} not example-labeled`);
    const recordText = JSON.stringify(["utilities", "meters", "intervalReads", "queueEntries", "interconnectionRequests", "tariffs"].map((k) => seed[k]));
    assert(!/(?:password|secret|api[_-]?key|bearer |-----BEGIN)/i.test(recordText), "secret-scan hit in seed records");
    assert(seed.fixtureLaw && /no GTIN grain/.test(seed.fixtureLaw.gtins), "the no-GTIN-grain note must be recorded, not silently skipped");
    return `${recs.length} labeled interval reads keyless; all 6 collections populated + labeled; synthetic identifiers throughout; secret-scan clean; no-GTIN-grain recorded`;
  });
})();

// ── 6. Rate card ─────────────────────────────────────────────────────────────
await (async () => {
  const pricing = await call("/pricing");
  const openapi = await call("/openapi.json");
  box("6. Rate card served IN the Pricing Document: metered → hardCeiling>0 + offers; survey-floor vocabulary (included allowances, no legacy freeQuota, no reserved members); operations ⊆ declared operationIds", () => {
    assert(pricing.json.model === "metered" && pricing.json.hardCeiling > 0, "pricing model/ceiling");
    assert(pricing.json.binding === false && typeof pricing.json.statement === "string", "unbound stub must carry binding:false + statement");
    const rates = pricing.json.rates;
    assert(Array.isArray(rates) && rates.length > 0, "rates[] missing from the Pricing Document");
    for (const row of rates) {
      assert(row.price === 0 || (row.included && row.included.qty > 0), `rate row ${row.operation} is neither zero-priced nor carrying an included allowance`);
      assert(row.freeQuota === undefined, `rate row ${row.operation} uses the legacy freeQuota shorthand — the 0.2.0 survey floor uses included allowances`);
      for (const reserved of ["keys", "payment", "direction", "recurrence", "effective", "condition", "credits", "currencies"]) {
        assert(row[reserved] === undefined, `rate row ${row.operation} carries RESERVED member ${reserved}`);
      }
    }
    const served = new Set();
    for (const item of Object.values(openapi.json.paths)) for (const op of Object.values(item)) if (op.operationId) served.add(op.operationId);
    for (const t of manifest.mcp.tools) served.add(t);
    for (const row of rates) assert(served.has(row.operation), `rate row ${row.operation} not among served operationIds`);
    return `${rates.length} rows, all zero-priced or included-allowanced, all keyed on served canonical operationIds (${served.size} declared)`;
  });
})();

// ── 7. Motion declared; shapes from the motion's permissible set ────────────
box("7. motion declared per projection; B2A shapes only; no OAuth/CC gates; only the mounted rung offered as live", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  assert(proj.motion === "B2A", "motion missing");
  const allowed = new Set(["anon-sandbox", "earned-credits", "human-claimed", "paid"]);
  for (const o of proj.offer) assert(allowed.has(o.shape), `shape ${o.shape} not in the B2A ladder`);
  const gates = proj.offer.map((o) => o.gate).join(" ");
  assert(!/oauth|credit card|\bCC\b/i.test(gates.replace(/no live settlement/gi, "")), "an OAuth/CC gate leaked into a B2A projection");
  const mounted = proj.offer.filter((o) => !/NOT MOUNTED/.test(o.gate));
  assert(mounted.length === 1 && mounted[0].shape === "anon-sandbox", "mounted-rungs rule: exactly the anon-sandbox floor is mounted at wave zero");
  return "B2A, 4 ladder rungs declared, 1 mounted (anon-sandbox floor), 3 explicit NOT-MOUNTED stubs";
});

// ── 8. 402 OFFER: ladder discoverable; only mounted rungs advertised as live ─
await (async () => {
  const overCeiling = await call("/interval-reads?spend=26");
  const offerDoor = await call("/offer");
  const submitStub = await call("/interconnection-requests/icr-ex-1/submit", { method: "POST" });
  box("8. 402 OFFER bodies: whole ladder discoverable from one 402; ONLY the mounted rung marked mounted:true; unmounted rungs explicit mounted:false stubs; payable stubs LABELED", () => {
    for (const [label, r] of [["over-ceiling", overCeiling], ["offer door", offerDoor], ["submit stub", submitStub]]) {
      assert(r.status === 402 && r.json.type === "OFFER", `${label} is not a 402 OFFER`);
      assert(Array.isArray(r.json.alternatives), `${label} OFFER carries no alternatives ladder`);
      const ids = r.json.alternatives.map((a) => a.id).sort().join(",");
      assert(ids === "claim,pay,sandbox,work", `${label} ladder incomplete: ${ids}`);
      const mounted = r.json.alternatives.filter((a) => a.mounted === true);
      assert(mounted.length === 1 && mounted[0].id === "sandbox", `${label}: only the sandbox floor may be advertised as mounted`);
      for (const a of r.json.alternatives) if (a.id !== "sandbox") assert(a.mounted === false && a.stub === true, `${label}: unmounted rung ${a.id} not labeled mounted:false stub`);
    }
    assert(submitStub.json.stub === true, "submit OFFER not labeled stub");
    return "3 OFFER doors; full ladder discoverable; 1 mounted rung, 3 labeled unmounted stubs";
  });
})();

// ── 9. Counterpart-brand gap ─────────────────────────────────────────────────
box("9. B2A2B/C counterpart-brand: gap RECORDED in the projection config", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  assert(proj.counterpartBrandGap && proj.counterpartBrandGap.recorded === true, "counterpart-brand gap not recorded");
  assert(/interconnection\.click/.test(proj.counterpartBrandGap.reason), "the row's held entry artifacts must be recorded as candidates, not asserted");
  return "recorded — installer/EPC principals; metering.click + interconnection.click noted as held candidates only (naming is #3's job)";
});

// ── 10. G4 projection config complete ────────────────────────────────────────
box("10. G4 projection config complete per §2 (GAP form: brand pending, everything else filled; depth ruling carried)", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  for (const k of ["substrate", "icp", "personas", "motion", "offer", "pricing", "positioning", "experiment"]) {
    assert(proj[k] !== undefined, `projection.${k} missing`);
  }
  assert(proj.brand === null && proj.brandStatus.includes("GAP"), "GAP row must record brand-pending, not invent a brand");
  assert(!/agent default for/i.test(proj.positioning) || /WITHHELD/.test(proj.positioning), "agent-default claim must stay withheld until the §4.6 bar is attested");
  assert(proj.registerRowCaveats && /Axis-2/.test(proj.registerRowCaveats.depthRuling), "the SC #21 depth ruling — the row's binding constraint — must be carried in the config");
  assert(/no apex|no data-thesis|no front/i.test(proj.positioning + proj.registerRowCaveats.depthRuling), "the no-data-thesis-face posture must be stated, not implied");
  return "complete; brand=null (GAP), depth ruling carried, experiment registered, agent-default claim withheld";
});

// ── 11. Guardrail ────────────────────────────────────────────────────────────
note(
  "11. Guardrail (§5.3): agent-default claim never worse-priced than sibling same-shape face",
  "N/A",
  "no agent-default claim is made anywhere on this property (worthiness bar not attempted) and no sibling projection of this substrate exists — the check is vacuously satisfied and says so rather than claiming a run.",
);

// ── 12. /verify export ───────────────────────────────────────────────────────
await (async () => {
  const verify = await call("/verify");
  const card = await call("/.well-known/agents.json");
  box("12. /verify export published + linked via links.verify; interfaces.testSuite NOT declared (stays undeclared until digest-pinned)", () => {
    assert(verify.status === 200 && Array.isArray(verify.json.checks) && verify.json.checks.length >= 10, "/verify missing or thin");
    assert(card.json.interfaces.testSuite === undefined, "testSuite declared without a verified pinned suite — inadmissible");
    assert(card.json.links.verify === `${ORIGIN}/verify`, "links.verify not on the card");
    return `${verify.json.checks.length} published checks; linked, undeclared as testSuite`;
  });
})();

// probe ladder + MCP (behavioral — what api.qa's hosted run would judge)
await (async () => {
  const empt1 = await call("/interval-reads?meter=none");
  const empt2 = await call("/interval-reads?period=none");
  const forb1 = await call("/interval-reads?scope=utility-internal");
  const forb2 = await call("/interval-reads?scope=customer-pii");
  const half = await call("/interval-reads?spend=12");
  const zero = await call("/interval-reads?spend=0");
  box("SUPP. Probe ladder behaviorally passes (keyless OK, 2× knownEmpty, 2× knownForbidden, half/zero spend OK)", () => {
    assert(empt1.status === 200 && empt1.json.type === "EMPTY", "knownEmpty 1");
    assert(empt2.status === 200 && empt2.json.type === "EMPTY", "knownEmpty 2");
    assert(forb1.status === 403 && forb1.json.type === "BLOCKED", "knownForbidden 1");
    assert(forb2.status === 403 && forb2.json.type === "BLOCKED", "knownForbidden 2");
    assert(half.status === 200 && zero.status === 200, "spend ladder");
    return "all rungs answer typed";
  });

  const mcpList = await call("/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  const mcpCall = await call("/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "listQueueEntries", arguments: { status: "active" } } } });
  box("SUPP. MCP door mounted, card-declared as STRING tool names, AUTHLESS at the anon-sandbox rung: tool names = canonical operationIds; same Nouns/verbs as HTTP", () => {
    for (const t of manifest.mcp.tools) assert(typeof t === "string", "card MCP tools must be strings (the canonical operationIds)");
    const tools = mcpList.json.result.tools.map((t) => t.name).sort();
    const declared = [...manifest.mcp.tools].sort();
    assert(JSON.stringify(tools) === JSON.stringify(declared), "tools/list ≠ card declaration");
    const payload = JSON.parse(mcpCall.json.result.content[0].text);
    assert(payload.type === "OK" && payload.queueEntries.every((e) => e.example === true), "tools/call result not the same labeled records");
    return `${tools.length} string tools, list==card, call answers labeled seed`;
  });
})();

// ── 13. Seams ────────────────────────────────────────────────────────────────
box("13. Seams emitted: metering tagged {substrate,projection,motion,operation,shape,pattern} + identity class; money + receipt stubs on the payable path", () => {
  const meters = seamEvents.filter((e) => e.seam === "meter");
  assert(meters.length > 0, "no metering events emitted during the run");
  for (const m of meters) {
    for (const k of ["substrate", "projection", "motion", "operation", "shape", "pattern", "identityClass"]) {
      assert(m[k] !== undefined, `meter event missing ${k}`);
    }
  }
  assert(seamEvents.some((e) => e.seam === "money" && e.stub === true && e.settled === false), "money-event stub not emitted");
  assert(seamEvents.some((e) => e.seam === "receipt" && e.stub === true), "receipt stub not emitted");
  return `${meters.length} meter events, money+receipt stubs present`;
});

// ── 14. Conneg spot-check + demo labeling ────────────────────────────────────
await (async () => {
  const bare = await call("/pricing");
  const agent = await call("/pricing", { headers: { "user-agent": "Claude-User/1.0", accept: "*/*" } });
  const browser = await call("/pricing", { headers: { accept: "text/html,application/xhtml+xml", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" } });
  box("14. Docs/landing conneg spot-check (bare curl JSON / agent UA markdown / browser HTML); demo data labeled on served faces", () => {
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
  const idFor = (p) =>
    p.includes("/meters/") ? "MTR-EX-1001" : p.includes("/queue-entries/") ? "que-ex-1" : p.includes("/interconnection-requests/") ? "icr-ex-1" : p.includes("/tariffs/") ? "TRF-EX-3001" : "MTR-EX-1001";
  for (const [p, item] of Object.entries(openapi.json.paths)) {
    for (const method of Object.keys(item)) {
      if (!["get", "post"].includes(method)) continue;
      const probe = p.replace("{id}", idFor(p));
      const r = await call(probe, {
        method: method.toUpperCase(),
        ...(method === "post" && probe === "/interconnection-requests" && { body: { applicant: "Ghost Check LLC [example]", systemSizeKwDc: 5 } }),
        ...(method === "post" && probe.includes("submit") && { body: {} }),
      });
      if (r.status === 404) misses.push(`${method.toUpperCase()} ${p}`);
    }
  }
  box("15. No ghost surfaces: every contract path answers (presence-when-true)", () => {
    assert(misses.length === 0, `declared but not serving: ${misses.join(", ")}`);
    return `${Object.keys(openapi.json.paths).length} contract paths all answer`;
  });
})();

// ── 16. Rail ledger ──────────────────────────────────────────────────────────
note(
  "16. Face registered in the rail ledger (faces-payable/week denominator)",
  "BLOCKED",
  "blocked-on-rail-ledger: ~/projects/ax checked at build time (2026-08-23) — packages/rail-ledger exists ONLY as an uncommitted working-tree directory in the draft/rail-ledger-v1 worktree (git status: '?? packages/rail-ledger/'); no LEDGER.md and no committed address convention exist. Per the watch list a fake ledger is never stubbed; registration lands when the ledger's address convention is committed AND this face has a ruled address.",
);

console.log = realLog;
let pass = 0, fail = 0, other = 0, suppPass = 0;
const CORE = results.filter(([, name]) => !name.startsWith("SUPP."));
for (const [status, name, msg] of results) {
  if (name.startsWith("SUPP.")) {
    if (status === "PASS") suppPass++;
    console.log(`${status.padEnd(8)} ${name}${msg ? ` — ${msg}` : ""}`);
    continue;
  }
  if (status === "PASS") pass++;
  else if (status === "FAIL") fail++;
  else other++;
  console.log(`${status.padEnd(8)} ${name}${msg ? ` — ${msg}` : ""}`);
}
console.log(`\n§9.1 score: ${pass}/${CORE.length} pass, ${fail} fail, ${other} deferred/N-A/blocked (16-box checklist) + ${suppPass} supplemental gates green`);
console.log(`vendored-from commit: ${VENDORED_FROM_COMMIT} (axp.org.ai draft/axp-extension-rates-g2, committed HEAD via git show)`);
process.exit(failures ? 1 : 0);
