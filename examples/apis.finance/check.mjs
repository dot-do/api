#!/usr/bin/env node
/**
 * check.mjs — the fail-closed wave-zero gate for apis.finance
 * (template spec §9.1). Every box scriptable; any failure exits 1.
 *
 *   1. Vendor integrity: axp/*.js byte-match VENDORED.json + PINS.json pins
 *      the ratified apis-ax-axp@2.6.0 digest
 *   2. Spec pin: spec/apis-ax-standard.spec.json digest-matches its
 *      .digest.txt and the ratified pin a9a1197c…
 *   3. Conformance: gradePinned(worker, spec) green in-process via
 *      autonomous-qa (the same digest-locked implementations the hosted
 *      verifier at https://api.qa runs)
 *   4. Fixture law + §5.2 quality bar over the seed: every record labeled
 *      (example: true + exampleNote); fictional names/BICs only (ZZ pseudo
 *      country code, "(fictional)" markers, synthetic UETRs); NO real
 *      routing numbers or EINs; and the corpus RE-DERIVED, never trusted —
 *      installments equal the level payment, camt.053 statements chain
 *      opening→closing across months, credit-file tradelines equal the
 *      amortized outstanding balance
 *   5. Suite bytes: /verify/suite.json serves suiteText exactly; /verify's
 *      digest matches those bytes; every suite row replayed in-process
 *   5b. The doors the GET-only suite cannot exercise: workspace mint +
 *      register (headless ply, incl. 400 on missing members), the payable
 *      402 stub doors (mounted-rungs-only alternatives), and the MCP door
 *      (authless reads; payable tools BLOCKED without a bearer key, typed
 *      OFFER with one)
 *   6. Conneg spot check: curl-class JSON / agent-UA markdown / browser HTML
 *   7. Ruled extension placements (batch-2 rollup, binding — zero
 *      divergence): rates[] top-level in the Pricing Document (operation ⊆
 *      contract operationIds, every row priced from zero or free-quota'd),
 *      g2 top-level on the card, links.verify as a card link member,
 *      operationId on EVERY route
 *
 * Requires a local autonomous-qa build. Resolution order:
 *   $AUTONOMOUS_QA (dir) > ~/projects/api.qa
 * Run: node check.mjs   (Node >= 22)
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const RATIFIED_DIGEST = "a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d";

let failures = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};

// ── 1. vendor integrity ─────────────────────────────────────────────────────
console.log("1. vendored axp-faces integrity");
{
  const dir = join(HERE, "axp");
  const vendored = JSON.parse(readFileSync(join(dir, "VENDORED.json"), "utf8"));
  let drift = false;
  for (const [label, digest] of Object.entries(vendored.files)) {
    const file = label === "PINS.json" ? join(dir, "PINS.json") : join(dir, label.replace(/^src\//, ""));
    if (!existsSync(file) || sha256(readFileSync(file)) !== digest) {
      fail(`${label}: drift or missing`);
      drift = true;
    }
  }
  const pins = JSON.parse(readFileSync(join(dir, "PINS.json"), "utf8"));
  if (pins.pinnedSpecDigest !== RATIFIED_DIGEST) fail(`PINS.json pins ${pins.pinnedSpecDigest}, expected ${RATIFIED_DIGEST}`);
  else if (!drift) pass(`${Object.keys(vendored.files).length} files byte-identical; pinned ${pins.pinnedSpec} / ${RATIFIED_DIGEST.slice(0, 8)}…`);
}

// ── 2. spec pin ─────────────────────────────────────────────────────────────
console.log("2. pinned spec copy");
const spec = readFileSync(join(HERE, "spec/apis-ax-standard.spec.json"), "utf8");
{
  const expected = readFileSync(join(HERE, "spec/apis-ax-standard.digest.txt"), "utf8").trim();
  if (expected !== RATIFIED_DIGEST) fail(`digest.txt carries ${expected}, expected the ratified ${RATIFIED_DIGEST}`);
  else if (sha256(spec) !== expected) fail("spec bytes do not match digest.txt");
  else pass(`spec.json sha256 = ratified digest ${RATIFIED_DIGEST.slice(0, 8)}… (${JSON.parse(spec).requirements.length} requirements)`);
}

// ── the worker + seed (module-load also runs the bridge's own build gates) ──
const worker = (await import(pathToFileURL(join(HERE, "worker.js")).href)).default;
const seed = await import(pathToFileURL(join(HERE, "seed.js")).href);
const { ORIGIN, RATE_ROWS } = await import(pathToFileURL(join(HERE, "manifest.js")).href);
const { suiteText } = await import(pathToFileURL(join(HERE, "verify.js")).href);

// ── 3. conformance, in-process ──────────────────────────────────────────────
console.log("3. AXP conformance (gradePinned, in-process)");
{
  const qaDir = process.env.AUTONOMOUS_QA || join(homedir(), "projects/api.qa");
  const qaEntry = join(qaDir, "dist/src/index.js");
  if (!existsSync(qaEntry)) {
    fail(`autonomous-qa not found at ${qaEntry} — set $AUTONOMOUS_QA to a built checkout`);
  } else {
    const qa = await import(pathToFileURL(qaEntry).href);
    // Landing-order accommodation (mirrors axp-faces' own conformance suite):
    // a verifier without the capability-coverage registry row refuses the
    // ratified spec whole, so it is graded on the runnable view minus that
    // one requirement — loudly named, never silent.
    const hasCoverage = qa.eligibleOptionalChecks().includes("capability-coverage");
    const doc = JSON.parse(spec);
    const runDoc = hasCoverage ? doc : { ...doc, requirements: doc.requirements.filter((r) => r.id !== "check-published-test-suite" && r.id !== "check-capability-coverage") };
    // NOTE: interfaces.testSuite is deliberately UNDECLARED (batch-2 ruling —
    // it stays undeclared until digest-pinned as an executable suite), so the
    // published-suite/coverage checks are dormant either way.
    const runSpec = hasCoverage ? spec : JSON.stringify(runDoc, null, 2);
    const expectedDigest = hasCoverage ? RATIFIED_DIGEST : sha256(runSpec);
    if (!hasCoverage) console.log(`  (verifier predates capability-coverage — grading the runnable view: ${runDoc.requirements.length} requirements)`);
    try {
      const report = await qa.gradePinned(worker, runSpec, { expectedDigest, baseOrigin: ORIGIN });
      const red = report.requirements.filter((r) => r.verdict !== "pass");
      if (red.length > 0) for (const r of red) fail(`${r.id}: ${r.verdict} — ${r.detail}`);
      else pass(`all ${report.requirements.length} pinned requirements pass`);
    } catch (e) {
      fail(`gradePinned threw: ${e.message}`);
    }
  }
}

// ── 4. fixture law + §5.2 quality bar over the seed ─────────────────────────
console.log("4. fixture law (labeled synthetic seed; internal consistency re-derived)");
{
  const corpora = {
    paymentMessages: seed.paymentMessages,
    loans: seed.loans,
    creditFiles: seed.creditFiles,
    lenders: seed.lenders,
  };
  let bad = 0;
  const looksLikeRoutingOrEin = (s) => /\b\d{9}\b/.test(s) || /\b\d{2}-\d{7}\b/.test(s);
  for (const [name, rows] of Object.entries(corpora)) {
    for (const rec of rows) {
      if (rec.example !== true) { fail(`${name}/${rec.id}: missing example: true`); bad++; }
      if (typeof rec.exampleNote !== "string" || !rec.exampleNote.includes("Example data")) { fail(`${name}/${rec.id}: missing exampleNote label`); bad++; }
      for (const party of [rec.debtor, rec.creditor]) {
        if (party?.bic !== undefined && !/ZZ00$/.test(party.bic)) { fail(`${name}/${rec.id}: BIC ${party.bic} lacks the fictional ZZ pseudo-country marker`); bad++; }
      }
      if (rec.uetr !== undefined && !/^00000000-0000-4000-8000-\d{12}$/.test(rec.uetr)) { fail(`${name}/${rec.id}: UETR not the synthetic-by-construction shape`); bad++; }
      const label = rec.name ?? rec.subject ?? rec.borrower;
      if ((name === "loans" || name === "creditFiles" || name === "lenders") && label !== undefined && !String(label).includes("(fictional)")) {
        fail(`${name}/${rec.id}: party name lacks the (fictional) marker`); bad++;
      }
      if (looksLikeRoutingOrEin(JSON.stringify(rec).replace(/00000000-0000-4000-8000-\d{12}/g, ""))) {
        fail(`${name}/${rec.id}: contains a routing-number/EIN-shaped digit string`); bad++;
      }
    }
  }
  if (bad === 0) pass(`${Object.values(corpora).flat().length} seed records labeled; fictional parties/BICs/UETRs only; no routing-number/EIN-shaped strings`);

  // Re-derive, never trust (§5.2 quality bar):
  const { LOAN_SPECS, AMORT } = seed.seedInternals;
  let derived = 0;
  for (const s of LOAN_SPECS) {
    const a = AMORT.get(s.id);
    for (const row of a.rows) {
      const pm = seed.paymentMessages.find((m) => m.loanId === s.id && m.installment === row.n);
      if (!pm || Math.round(pm.amount * 100) !== row.paymentCents) { fail(`${s.id} installment ${row.n}: pacs.008 amount != level payment`); derived++; }
    }
    const cf = seed.creditFiles.find((c) => c.tradelines[0].loanId === s.id);
    if (!cf || Math.round(cf.tradelines[0].currentBalance * 100) !== a.outstandingCents) { fail(`${s.id}: tradeline balance != amortized outstanding`); derived++; }
  }
  const statements = seed.paymentMessages.filter((m) => m.msgType.startsWith("camt.053")).sort((x, y) => x.period.localeCompare(y.period));
  let prevClosing = 0;
  for (const st of statements) {
    const movement = st.entries.reduce((sum, e) => sum + Math.round(e.amount * 100) * (e.creditDebit === "CRDT" ? 1 : -1), 0);
    if (Math.round(st.openingBalance * 100) !== prevClosing) { fail(`camt.053 ${st.period}: opening does not chain from prior closing`); derived++; }
    if (Math.round(st.closingBalance * 100) !== prevClosing + movement) { fail(`camt.053 ${st.period}: closing != opening + entries`); derived++; }
    if (st.entryCount !== st.entries.length) { fail(`camt.053 ${st.period}: entryCount mismatch`); derived++; }
    prevClosing = Math.round(st.closingBalance * 100);
  }
  if (derived === 0) pass(`corpus re-derived: installments = level payment; ${statements.length} statements chain opening→closing; tradelines = amortized outstanding`);
}

// ── 5. suite bytes + digest coherence + rows replayed ───────────────────────
console.log("5. published suite (/verify)");
{
  const served = await (await worker.fetch(new Request(`${ORIGIN}/verify/suite.json`))).text();
  if (served !== suiteText) fail("/verify/suite.json does not serve suiteText byte-for-byte");
  else {
    const verifyDoc = await (await worker.fetch(new Request(`${ORIGIN}/verify`, { headers: { accept: "*/*", "user-agent": "curl/8.6.0" } }))).json();
    const expected = `sha256:${sha256(served)}`;
    if (verifyDoc.digest !== expected) fail(`/verify digest ${verifyDoc.digest} != computed ${expected}`);
    else pass(`suite served byte-exact; digest ${expected.slice(0, 15)}… coherent with /verify`);
  }
  const doc = JSON.parse(suiteText);
  let red = 0;
  for (const req of doc.requirements) {
    const res = await worker.fetch(new Request(`${ORIGIN}${req.path}`, { method: req.method }));
    let okRow = res.status === (req.expect.status ?? 200);
    if (okRow && req.expect.contentTypeIncludes && !(res.headers.get("content-type") || "").includes(req.expect.contentTypeIncludes)) okRow = false;
    if (okRow && req.expect.paths) {
      const body = await res.json();
      for (const p of req.expect.paths) {
        const val = p.path.split(".").reduce((o, k) => (o == null ? o : o[k]), body);
        if (p.exists !== undefined ? (val === undefined) === p.exists : val !== p.equals) okRow = false;
      }
    }
    if (!okRow) { fail(`suite row ${req.id} fails in-process`); red++; }
  }
  if (red === 0) pass(`${doc.requirements.length} suite rows green in-process`);
}

// ── 5b. the doors the GET-only suite cannot exercise ────────────────────────
console.log("5b. headless doors + payable stubs + MCP door");
{
  const post = (path, body, headers = {}) =>
    worker.fetch(new Request(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));

  // workspace mint (system-of-record door; ephemeral, disclosed)
  const mintRes = await post("/workspaces", {});
  const mint = await mintRes.json();
  const ws = mint.workspaces?.[0];
  if (mintRes.status !== 200 || mint.type !== "OK" || !ws || !/EPHEMERAL/i.test(ws.retention || "")) {
    fail(`POST /workspaces: status ${mintRes.status}, expected 200 OK with an EPHEMERAL-disclosing workspace`);
  } else pass("mintWorkspace answers 200 OK; retention (ephemeral, nothing stored) disclosed on mint");

  // register a loan record (native verb; validated + echoed; persisted:false disclosed)
  const reg = await post(`/workspaces/${ws?.id ?? "ws_anon_x"}/loans`, { borrower: "Gate Check Co (fictional)", principal: 1000, annualRatePct: 5, termMonths: 12 });
  const regBody = await reg.json();
  if (reg.status !== 200 || regBody.type !== "OK" || regBody.loan?.persisted !== false) {
    fail(`POST /workspaces/{id}/loans: status ${reg.status}, expected 200 OK with persisted:false disclosed`);
  } else pass("registerLoanRecord validates, echoes typed, and discloses persisted:false");
  const regBad = await post(`/workspaces/${ws?.id ?? "ws_anon_x"}/loans`, { borrower: "Missing Fields Co (fictional)" });
  if (regBad.status !== 400) fail(`POST /workspaces/{id}/loans with missing members: status ${regBad.status}, expected 400`);
  else pass("a loan record missing required members is refused with a worded 400");

  // payable doors: typed 402 OFFER, mounted rungs only, stub-labeled
  for (const [path, op] of [["/credit-files/pulls", "pullCreditFile"], ["/originations", "submitOrigination"]]) {
    const res = await post(path, {});
    const body = await res.json();
    const kinds = (body.alternatives ?? []).map((a) => a.kind);
    const stubLabeled = /stub/i.test(JSON.stringify(body));
    if (res.status !== 402 || body.type !== "OFFER") fail(`POST ${path}: status ${res.status}/${body.type}, expected a typed 402 OFFER`);
    else if (!kinds.includes("sandbox") || !kinds.includes("pay") || kinds.length !== 2) fail(`POST ${path}: alternatives ${JSON.stringify(kinds)} — mounted rungs only means exactly [sandbox, pay] at wave zero`);
    else if (!stubLabeled) fail(`POST ${path}: the OFFER body does not label itself a stub`);
    else pass(`${op}: typed 402 OFFER; alternatives = mounted rungs only (sandbox, pay); labeled stub`);
  }

  // MCP door: authless reads; payable tools bearer-gated
  const rpc = async (method, params, headers = {}) =>
    (await post("/mcp", { jsonrpc: "2.0", id: 1, method, ...(params && { params }) }, headers)).json();
  const tools = await rpc("tools/list");
  const nTools = tools.result?.tools?.length ?? 0;
  if (nTools !== 10) fail(`MCP tools/list: ${nTools} tools, expected 10`);
  const read = await rpc("tools/call", { name: "list_loans", arguments: {} });
  const readOk = read.result?.content?.[0]?.text?.includes('"OK"');
  if (!readOk) fail("MCP authless read (list_loans) did not answer an OK envelope");
  const gated = await rpc("tools/call", { name: "pull_credit_file", arguments: { subject: "x" } });
  const gatedBlocked = gated.result?.content?.[0]?.text?.includes('"BLOCKED"');
  if (!gatedBlocked) fail("MCP payable tool without a bearer key did not answer a typed BLOCKED");
  const keyed = await rpc("tools/call", { name: "pull_credit_file", arguments: { subject: "x" } }, { authorization: "Bearer test-key" });
  const keyedOffer = keyed.result?.content?.[0]?.text?.includes('"OFFER"');
  if (!keyedOffer) fail("MCP payable tool with a bearer key did not answer a typed OFFER");
  if (nTools === 10 && readOk && gatedBlocked && keyedOffer) {
    pass("MCP door: 10 tools; sandbox reads authless (anon-sandbox rung); payable tools BLOCKED keyless, typed OFFER with a bearer key");
  }
}

// ── 6. conneg spot check at / ───────────────────────────────────────────────
console.log("6. conneg spot check (home faces)");
{
  const face = async (headers) => {
    const res = await worker.fetch(new Request(`${ORIGIN}/`, { headers }));
    return (res.headers.get("content-type") || "").split(";")[0];
  };
  const curl = await face({ accept: "*/*", "user-agent": "curl/8.6.0" });
  const agent = await face({ accept: "*/*", "user-agent": "Claude-User/1.0" });
  const browser = await face({ accept: "text/html,application/xhtml+xml", "user-agent": "Mozilla/5.0", "sec-fetch-mode": "navigate", "sec-fetch-site": "none", "sec-fetch-dest": "document" });
  if (curl !== "application/json") fail(`bare curl at / got ${curl}, expected application/json`);
  if (agent !== "text/markdown") fail(`agent UA at / got ${agent}, expected text/markdown`);
  if (browser !== "text/html") fail(`browser at / got ${browser}, expected text/html`);
  if (curl === "application/json" && agent === "text/markdown" && browser === "text/html") pass("curl→JSON, agent-UA→markdown, browser→HTML");
}

// ── 7. ruled extension placements (batch-2 rollup — zero divergence) ────────
console.log("7. ruled extension placements");
{
  const card = await (await worker.fetch(new Request(`${ORIGIN}/.well-known/agents.json`))).json();
  const pricing = await (await worker.fetch(new Request(`${ORIGIN}/pricing`, { headers: { accept: "*/*", "user-agent": "curl/8.6.0" } }))).json();
  const openapi = await (await worker.fetch(new Request(`${ORIGIN}/openapi.json`))).json();

  // g2 top-level on the card
  if (card.g2?.$type === "ICP" && card.g2?.icp && Array.isArray(card.g2?.personas)) pass("card g2 (ICP + personas + System coordinate) is top-level");
  else fail("card g2 missing or misplaced — must be a top-level card member");

  // links.verify as a card link member
  if (card.links?.verify === `${ORIGIN}/verify`) pass("card links.verify names the published suite page");
  else fail(`card links.verify is ${card.links?.verify}, expected ${ORIGIN}/verify`);

  // interfaces.testSuite stays UNDECLARED until digest-pinned (batch-2 ruling)
  if (card.interfaces?.testSuite === undefined) pass("interfaces.testSuite undeclared (stays so until the suite is digest-pinned executable)");
  else fail("interfaces.testSuite is declared — the batch-2 ruling holds it back until digest-pinned");

  // operationId on every route
  const missing = [];
  const opIds = new Set();
  for (const [path, methods] of Object.entries(openapi.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!op.operationId) missing.push(`${method.toUpperCase()} ${path}`);
      else opIds.add(op.operationId);
    }
  }
  if (missing.length === 0) pass(`operationId on every route (${opIds.size} distinct across ${Object.keys(openapi.paths).length} paths)`);
  else fail(`routes missing operationId: ${missing.join(", ")}`);

  // rates[] top-level; operations ⊆ contract operationIds; priced from zero
  if (!Array.isArray(pricing.rates) || pricing.rates.length === 0) fail("pricing rates[] missing or empty — must be top-level in the Pricing Document");
  else {
    const stray = pricing.rates.filter((r) => !opIds.has(r.operation)).map((r) => r.operation);
    const unpriced = pricing.rates.filter((r) => r.price !== 0 && r.freeQuota === undefined).map((r) => r.operation);
    if (stray.length > 0) fail(`rates[].operation not in the contract: ${stray.join(", ")}`);
    else if (unpriced.length > 0) fail(`rate rows with neither zero price nor freeQuota: ${unpriced.join(", ")}`);
    else if (JSON.stringify(pricing.rates) !== JSON.stringify(RATE_ROWS)) fail("served rates[] diverge from the manifest RATE_ROWS");
    else pass(`rates[] top-level: ${pricing.rates.length} rows, every operation ⊆ contract operationIds, every row priced from zero or free-quota'd`);
  }
}

console.log(failures === 0 ? "\nALL GATES GREEN" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
