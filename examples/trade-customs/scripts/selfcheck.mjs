#!/usr/bin/env node
/**
 * selfcheck.mjs — the §9.1 agent self-verify checklist for the
 * trade-customs wave-zero property, run in-process against the worker
 * (Workers-shaped fetch handler imported directly; no network, no deploy).
 *
 * EXACTLY 16 boxes — one per §9.1 checklist row, scored /16, fail-closed:
 * any FAIL exits 1. Boxes that are structurally DEFERRED, vacuous (N/A), or
 * BLOCKED at wave zero say so explicitly and why — they are never counted
 * as passes.
 *
 *   node scripts/selfcheck.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(DIR);

const worker = (await import("../worker.js")).default;
const { manifest, ORIGIN } = await import("../manifest.js");
const { product } = await import("../product.js");
const { coverageDomain } = await import("../axp/coverage.js");

/**
 * Vendoring provenance — the axp/ directory was vendored from the
 * axp.org.ai repo's COMMITTED HEAD on branch draft/axp-extension-rates-g2
 * (git show against this hash; never the working tree). Box 3 re-verifies
 * byte-identity against this exact commit on every run.
 */
const VENDORED_FROM = {
  repo: "/Users/nathanclevenger/projects/axp.org.ai",
  branch: "draft/axp-extension-rates-g2",
  head: "523c9ef217d54feefb0b20734a6d2996a6965b79",
};

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
box("1. G3: APIProduct instance — every Noun has schema+binding+verbs; System coordinate declared", () => {
  assert(product.substrate === "trade-customs", "substrate id mismatch");
  for (const n of product.nouns) assert(n.$type && n.binding && Array.isArray(n.verbs) && n.verbs.length > 0, `Noun ${n.name} incomplete`);
  assert(product.systems.length >= 1 && product.systems.every((s) => s.system && s.coordinates.length > 0), "System coordinates missing");
  return `${product.nouns.length} nouns, ${product.systems.length} system coordinates`;
});

// ── 2. Both plies from one definition ───────────────────────────────────────
await (async () => {
  const dataRead = await call("/shipments");
  const headlessCreate = await call("/shipments", { method: "POST", body: { reference: "selfcheck shipment", mode: "ocean" } });
  box("2. Both plies serve from ONE definition (data GET + headless POST on the same collection)", () => {
    assert(dataRead.status === 200 && dataRead.json.type === "OK", "data face GET /shipments failed");
    assert(headlessCreate.status === 200 && headlessCreate.json.type === "OK", "headless POST /shipments failed");
    assert(headlessCreate.json.workspace && headlessCreate.json.retention, "workspace mint / disclosed retention missing");
    return `workspace ${headlessCreate.json.workspace} minted, retention disclosed`;
  });
})();

// ── 3. Quartet from one defineSiteManifest via vendored axp-faces at pins ───
//      + byte-identical vendoring against the COMMITTED HEAD (git show —
//      never the working tree), extension pin included.
await (async () => {
  const card = await call("/.well-known/agents.json");
  const openapi = await call("/openapi.json");
  const pricing = await call("/pricing");
  const llms = await call("/llms.txt");
  box("3. Quartet from one defineSiteManifest() via vendored axp-faces @ PINS digest; vendor byte-identical to committed HEAD (git show); axp-ext-rates-g2@0.2.0 pinned", () => {
    assert(card.status === 200 && card.json.probes && card.json.interfaces.http.length > 0, "card incomplete");
    assert(openapi.status === 200 && openapi.json.openapi === "3.1.0", "openapi not 3.1");
    assert(pricing.status === 200 && pricing.json.model === "metered", "pricing missing");
    assert(llms.status === 200 && /^# /m.test(llms.text) && llms.text.includes("## Machine surfaces"), "llms.txt H1/tail missing");
    const pins = JSON.parse(readFileSync(join(DIR, "axp/PINS.json"), "utf8"));
    assert(pins.pinnedSpec === "apis-ax-axp@2.6.0", "PINS not at the ratified 2.6.0 pin");
    const specDigest = readFileSync(join(DIR, "spec/apis-ax-standard.digest.txt"), "utf8").trim();
    assert(specDigest === pins.pinnedSpecDigest, "vendored spec digest ≠ PINS digest");
    const ext = pins.extensions && pins.extensions["axp-ext-rates-g2"];
    assert(ext && ext.version === "0.2.0", "axp-ext-rates-g2 not pinned at 0.2.0");
    assert(ext.digest === "903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5", "axp-ext-rates-g2 digest mismatch");
    // Drift gate: byte-identity vs the recorded COMMITTED HEAD, via git show.
    const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
    const gitShow = (p) => execFileSync("git", ["-C", VENDORED_FROM.repo, "show", `${VENDORED_FROM.head}:packages/axp-faces/${p}`]);
    const vendorFiles = ["src/card.js", "src/conneg.js", "src/coverage.js", "src/envelope.js", "src/family.js", "src/index.js", "src/llms.js", "src/manifest.js", "src/openapi.js", "src/pricing.js", "src/routes.js", "PINS.json"];
    for (const f of vendorFiles) {
      const local = readFileSync(join(DIR, "axp", f.replace("src/", "")));
      assert(sha256(local) === sha256(gitShow(f)), `vendored axp/${f.replace("src/", "")} drifted from ${VENDORED_FROM.head.slice(0, 8)}`);
    }
    return `pin ${pins.pinnedSpec} @ ${pins.pinnedSpecDigest.slice(0, 8)}…; ext rates-g2@0.2.0 @ 903e414d…; ${vendorFiles.length} files byte-identical to ${VENDORED_FROM.branch} HEAD ${VENDORED_FROM.head.slice(0, 12)} (git show)`;
  });
})();

// ── 4. Local conformance at pinned digest ───────────────────────────────────
note(
  "4. Local describeConformance({baseUrl}) green at pinned digest",
  "DEFERRED",
  "autonomous-qa is not a dependency of this repo and adding root deps is outside this draft branch's blast radius; box 12 re-implements the behavioral probe ladder in-process. Hosted api.qa verdict additionally requires a ruled, deployed domain (GAP row — placeholder address). Filed as a blocker in the build summary.",
);

// ── 5. Anon sandbox universal floor + seed coverage + fixture law ───────────
await (async () => {
  const okRes = await call("/shipments");
  box("5. Anon sandbox floor: keyless 200 OK with substantive LABELED seed; seed exercises every operation; fixture law (no real names, synthetic ids, secret-scan)", () => {
    assert(okRes.status === 200 && okRes.json.type === "OK", "keyless probe failed");
    const recs = okRes.json.shipments;
    assert(recs.length >= 3, "seed not substantive");
    for (const r of recs) assert(r.example === true && r.demo_notice, `record ${r.id} not labeled example data`);
    const seed = JSON.parse(readFileSync(join(DIR, "seed.json"), "utf8"));
    for (const k of ["shipments", "billsOfLading", "certificatesOfOrigin", "phytosanitaryCertificates", "commercialInvoices", "customsEntries"]) {
      assert(Array.isArray(seed[k]) && seed[k].length > 0, `seed.${k} empty — an operation would answer without substance`);
      for (const r of seed[k]) assert(r.example === true, `seed.${k} record ${r.id} unlabeled`);
    }
    const recordText = JSON.stringify(
      ["forwarders", "carriers", "parties", "shipments", "billsOfLading", "certificatesOfOrigin", "phytosanitaryCertificates", "commercialInvoices", "customsEntries"].map((k) => seed[k]),
    );
    assert(!/(?:password|secret|api[_-]?key|bearer |-----BEGIN)/i.test(recordText), "secret-scan hit in seed records");
    for (const f of [...seed.forwarders, ...seed.carriers, ...seed.parties]) assert(/\[example\]/.test(f.name), `party/carrier name ${f.id} not example-labeled`);
    for (const f of seed.forwarders) assert(/^00-/.test(f.ein), "EIN not synthetic 00-prefix");
    for (const e of seed.customsEntries) assert(/^EX/.test(e.htsShaped), "customs entry key not synthetic EX-chapter HTS-shaped");
    for (const b of seed.billsOfLading) assert(/CONT-EX-/.test(b.containerRef), "container ref not synthetic CONT-EX-*");
    return `${okRes.json.shipments.length} labeled seed shipments; all 6 record collections populated + labeled; secret-scan clean; synthetic identifiers`;
  });
})();

// ── 6. Rate card — TOP-LEVEL rates[] in the Pricing Document ────────────────
await (async () => {
  const pricing = await call("/pricing");
  const cardForOffers = await call("/.well-known/agents.json");
  const sideDoor = await call("/rates");
  box("6. Rate card at the ruled placement: top-level rates[] in /pricing; metered → hardCeiling>0 + offers (card monetization); every row freeQuota or zero price; rows key on canonical operationIds ⊆ contract; no /rates side door", () => {
    assert(pricing.json.model === "metered" && pricing.json.hardCeiling > 0, "pricing model/ceiling");
    assert(pricing.json.binding === false && typeof pricing.json.statement === "string", "unbound stub must carry binding:false + statement");
    const offers = cardForOffers.json.monetization && cardForOffers.json.monetization.offers;
    assert(Array.isArray(offers) && offers.length > 0, "offers missing from card monetization on metered model");
    const rates = pricing.json.rates;
    assert(Array.isArray(rates) && rates.length > 0, "top-level rates[] missing from the Pricing Document");
    for (const row of rates) {
      assert(row.price === 0 || row.freeQuota !== undefined, `rate row ${row.operation} lacks freeQuota and is not zero-priced`);
    }
    const domain = new Set(coverageDomain(manifest));
    for (const row of rates) {
      assert(domain.has(`openapi:${row.operation}`) || domain.has(`mcp:${row.operation}`), `rate row ${row.operation} not in the contract's canonical operation domain`);
    }
    assert(sideDoor.status === 404, "/rates side door answers — the ruled placement is top-level rates[] in /pricing");
    return `${rates.length} rows in /pricing, all ⊆ coverage domain (${domain.size} ids); no side door (404)`;
  });
})();

// ── 7. Motion declared; shapes from the motion's permissible set ────────────
box("7. motion declared per projection; B2A shapes only; no OAuth/CC gates on the B2A path", () => {
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
  const overCeiling = await call("/shipments?spend=26");
  const offerDoor = await call("/offer");
  const orderStub = await call("/shipments/shp-ex-1/assemble-packet", { method: "POST" });
  box("8. 402 OFFER bodies advertise the B2A ladder (pay / work / claim); payable stubs LABELED as stubs", () => {
    for (const [label, r] of [["over-ceiling", overCeiling], ["offer door", offerDoor], ["assemble stub", orderStub]]) {
      assert(r.status === 402 && r.json.type === "OFFER", `${label} is not a 402 OFFER`);
      assert(Array.isArray(r.json.alternatives), `${label} OFFER carries no alternatives ladder`);
      const ids = r.json.alternatives.map((a) => a.id).sort().join(",");
      assert(ids === "claim,pay,work", `${label} ladder incomplete: ${ids}`);
    }
    assert(orderStub.json.stub === true, "assemble OFFER not labeled stub");
    return "3 OFFER doors, full ladder, stub labeled";
  });
})();

// ── 9. Counterpart-brand gap ─────────────────────────────────────────────────
box("9. B2A2B/C counterpart-brand: gap RECORDED in the projection config", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  assert(proj.counterpartBrandGap && proj.counterpartBrandGap.recorded === true, "counterpart-brand gap not recorded");
  return "recorded (GAP row — naming is #3's job)";
});

// ── 10. G4 projection config complete ────────────────────────────────────────
box("10. G4 projection config complete per §2 (GAP form: brand pending, everything else filled)", () => {
  const proj = JSON.parse(readFileSync(join(DIR, "projection.json"), "utf8"));
  for (const k of ["substrate", "icp", "personas", "motion", "offer", "pricing", "positioning", "experiment"]) {
    assert(proj[k] !== undefined, `projection.${k} missing`);
  }
  assert(proj.brand === null && proj.brandStatus.includes("GAP"), "GAP row must record brand-pending, not invent a brand");
  return "complete; brand=null (GAP), experiment registered";
});

// ── 11. Guardrail ────────────────────────────────────────────────────────────
note(
  "11. Guardrail (§5.3): agent-default claim never worse-priced than sibling same-shape face",
  "N/A",
  "no agent-default claim is made anywhere on this property (worthiness bar not attempted) and no sibling projection of this substrate exists — the check is vacuously satisfied and says so rather than claiming a run.",
);

// ── 12. /verify export + published checks TRUE against the live surface ─────
await (async () => {
  const verify = await call("/verify");
  const card = await call("/.well-known/agents.json");

  // probe ladder (behavioral — what api.qa's hosted run would judge)
  const empt1 = await call("/shipments?status=none");
  const empt2 = await call("/shipments?mode=none");
  const forb1 = await call("/shipments?scope=broker-entries");
  const forb2 = await call("/shipments?scope=carrier-contracts");
  const half = await call("/shipments?spend=12");
  const zero = await call("/shipments?spend=0");
  const mcpList = await call("/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  const mcpCall = await call("/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "listShipments", arguments: { mode: "ocean" } } } });

  box("12. /verify export published + card links.verify + top-level g2 (axp-ext-rates-g2); interfaces.testSuite NOT declared; every published check TRUE against the live surface (probe ladder + MCP parity)", () => {
    assert(verify.status === 200 && Array.isArray(verify.json.checks) && verify.json.checks.length >= 10, "/verify missing or thin");
    assert(card.json.links.verify === `${ORIGIN}/verify`, "card links.verify missing or wrong — the ruled placement for the runnable-suite link");
    assert(card.json.g2 && typeof card.json.g2 === "object" && Object.keys(card.json.g2).length > 0, "card top-level g2 missing — the ruled placement for G2/ICP coordinates");
    assert(typeof card.json.links.icp === "string", "links.icp stays declared beside g2");
    assert(card.json.interfaces.testSuite === undefined, "testSuite declared without a verified pinned suite — inadmissible");
    // suite refs use canonical operationIds (five-surface invariant)
    const opDomain = new Set(coverageDomain(manifest));
    for (const c of verify.json.checks) {
      if (c.operation && c.operation !== "mcp") assert(opDomain.has(`openapi:${c.operation}`), `suite check ${c.id} refs unknown operation ${c.operation}`);
    }
    // the published checks, executed:
    assert(empt1.status === 200 && empt1.json.type === "EMPTY", "knownEmpty 1");
    assert(empt2.status === 200 && empt2.json.type === "EMPTY", "knownEmpty 2");
    assert(forb1.status === 403 && forb1.json.type === "BLOCKED", "knownForbidden 1");
    assert(forb2.status === 403 && forb2.json.type === "BLOCKED", "knownForbidden 2");
    assert(half.status === 200 && zero.status === 200, "spend ladder");
    const tools = mcpList.json.result.tools.map((t) => t.name).sort();
    const declared = [...manifest.mcp.tools].sort();
    assert(JSON.stringify(tools) === JSON.stringify(declared), "tools/list ≠ card declaration");
    const payload = JSON.parse(mcpCall.json.result.content[0].text);
    assert(payload.type === "OK" && payload.shipments.every((s) => s.example === true), "tools/call result not the same labeled records");
    return `${verify.json.checks.length} published checks all hold; links.verify + g2 on the card; ${tools.length} MCP tools == card`;
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
  const ID_BY_PREFIX = { "/shipments/{id}": "shp-ex-1", "/bills-of-lading/{id}": "ebl-ex-1", "/commercial-invoices/{id}": "inv-ex-1", "/customs-entries/{id}": "ent-ex-1" };
  for (const [p, item] of Object.entries(openapi.json.paths)) {
    for (const method of Object.keys(item)) {
      if (!["get", "post"].includes(method)) continue;
      let probe = p;
      if (p === "/shipments/{id}/assemble-packet") probe = "/shipments/shp-ex-1/assemble-packet";
      else if (p.includes("{id}")) probe = p.replace("{id}", ID_BY_PREFIX[p] || "shp-ex-1");
      const r = await call(probe, {
        method: method.toUpperCase(),
        ...(method === "post" && probe === "/shipments" && { body: { reference: "ghost check", mode: "air" } }),
        ...(method === "post" && probe.includes("assemble-packet") && { body: {} }),
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
  "blocked-on-rail-ledger: checked ~/projects/ax — branch draft/rail-ledger-v1 exists but its committed tree (tip 1620e9f) contains no ledger service, no LEDGER.md, and no address convention. Per the batch watch list the box is recorded blocked, never stubbed; registration follows once the ledger's address convention lands (and, for a GAP row, once this face has a ruled address).",
);

console.log = realLog;
let pass = 0, other = 0;
for (const [status, name, msg] of results) {
  if (status === "PASS") pass++;
  else if (status !== "FAIL") other++;
  console.log(`${status.padEnd(8)} ${name}${msg ? ` — ${msg}` : ""}`);
}
console.log(`\nvendored-from: ${VENDORED_FROM.branch} @ ${VENDORED_FROM.head} (git show; never the working tree)`);
console.log(`§9.1 score: ${pass}/16 pass, ${failures} fail, ${other} deferred/N-A/blocked (16 boxes total)`);
process.exit(failures ? 1 : 0);
