/**
 * site/pages.js — the landing (browser home) of api.management.
 * Server-rendered string; chrome comes from site/style.js renderPage.
 * The console lives in site/dashboard-config.js rendered through the
 * abstract dashboard template (site/dashboard-template.js — shared
 * structure with apis.dev; see examples/DASHBOARD-FAMILY.md).
 *
 * Copy follows the taste standard: mechanisms, numbers, no adjectives;
 * inconvenient truths stated in place.
 *
 * MARKETING SHELF ruling (founder, 2026-08-24): the shelf shows REAL
 * PASSING verdicts with their grades; every brand without a passing
 * verdict — whether unscored, pending, or failing for infrastructure
 * reasons (e.g. the pinned verification lane not yet having run) — shows
 * the SAME neutral "awaiting verification" state. No F/failing grades on
 * marketing shelves, ever; failing verdicts live on api.qa and the
 * internal ops console (an operator tool, which keeps real statuses),
 * not brand shelves. No fabricated scores, ever.
 */
import { renderPage } from "./style.js";
import { INVENTORY, VERDICTS } from "./inventory.js";

export function renderLanding() {
  const attested = VERDICTS.length;
  const body = `
<section class="intro"><div class="wrap">
  <h1>Point it at your APIs.</h1>
  <p class="lede">Monitoring, conformance verdicts, usage metering, rate-card enforcement, and a management console — for the APIs this platform serves and the APIs you already run. An existing portfolio gets management without a from-scratch rebuild.</p>
  <div class="cta-row"><a class="cta" href="/console">Open the console</a><span class="cta-note">Keyless. Console chrome is demo-labeled; the register in it is real.</span></div>
  <div class="tally">
    <span><b>${INVENTORY.length}</b> APIs under management (our own)</span>
    <span><b>6</b> metered operations on this face</span>
    <span><b>${attested}</b> attested verdicts issued</span>
    <span><b>0.002</b> USD/call · test-mode</span>
  </div>
</div></section>

<div class="hatch"></div>

<section class="sec"><div class="wrap">
  <h2 class="sec-label">Bring the APIs you already have</h2>
  <p class="sec-lead">Management starts from your published contracts, not from a rebuild. Point the console at an origin; the probes read what it already serves.</p>
  <dl class="mech">
    <div><dt>Input</dt><dd>An origin you control — internal or public. <b>llms.txt</b>, <b>agents.json</b>, OpenAPI: whatever it already publishes is the contract.</dd></div>
    <div><dt>Probe</dt><dd>api.qa samples the published surfaces and declared endpoints — read-only, budgeted, seed-recorded, replayable by anyone.</dd></div>
    <div><dt>Verdict</dt><dd>A letter grade and 10-point AX score, Ed25519-attested at <b>api.qa/{domain}</b>. Lying surfaces cap the grade at C.</dd></div>
    <div><dt>Operate</dt><dd>The console holds the inventory: state, gate, rate card, verdict — one ledger per portfolio, ours included.</dd></div>
  </dl>
</div></section>

<section class="sec on-surface machine"><div class="wrap">
  <h2 class="sec-label">How monitoring works</h2>
  <p class="sec-lead">Conformance is judged by api.qa, never by this console. A verdict is a pure function of five inputs, none writable by the verified party.</p>
  <pre>$ curl -s <a href="https://api.qa/api.insure">https://api.qa/api.insure</a>
{
  "$type": "VerificationReport",
  "verifier": "api.qa",
  "mode": "remote",
  "target": "https://api.insure",
  "grade": "B",
  "axScore": { "points": 8, "max": 10, <span class="c">…</span> },
  "attested": true,   <span class="c"># Ed25519 over the canonical report digest</span>
  "evidence": { <span class="c">…</span> }    <span class="c"># embedded — anyone can rejudge() it offline</span>
}</pre>
  <p class="exhibit-cap">A real report, fetched live. The evidence bundle is embedded, so any third party can replay the probes and reproduce the verdict; api.management consumes these verdicts and can never mint one.</p>
</div></section>

<section class="sec"><div class="wrap">
  <h2 class="sec-label">What a managed API gets</h2>
  <div class="cap-scroll"><table class="cap-table">
    <thead><tr><th>Capability</th><th>Mechanism</th><th>Today</th></tr></thead>
    <tbody>
      <tr><td>Inventory console</td><td class="m">Every managed API in one ledger — state, branch, gate, verdict.</td><td><span class="st live">v1 — chrome demo, register real</span></td></tr>
      <tr><td>Conformance verdicts</td><td class="m">Attested api.qa runs against the public origin; regressions are diffs between signed reports.</td><td><span class="st live">live — ${attested} issued</span></td></tr>
      <tr><td>Usage metering</td><td class="m">Per-operation meter events tagged {substrate, projection, operation, shape}.</td><td><span class="st">test-mode</span></td></tr>
      <tr><td>Rate-card enforcement</td><td class="m">rates[] priced per operationId; spend past the ceiling answers a 402 OFFER.</td><td><span class="st">test-mode</span></td></tr>
      <tr><td>Weekly payable readout</td><td class="m">apis.ax/account faces-payable ledger — registered faces vs payable, per week.</td><td><span class="st">account lane deployed · apex dispatch pending</span></td></tr>
      <tr><td>Alerts</td><td class="m">Verdict and gate regressions pushed to the operator.</td><td><span class="st">roadmap</span></td></tr>
    </tbody>
  </table></div>
</div></section>

<section class="sec on-surface"><div class="wrap">
  <h2 class="sec-label">Estate brands on this console</h2>
  <div class="shelf">
    <div class="shelf-row"><span class="brand">api.insure</span><span class="role">insurance machine face — first platform property through the full verdict lane</span><span class="verdict"><b>B</b> · 8/10 · attested</span></div>
    <div class="shelf-row"><span class="brand">auto.dev</span><span class="role">vehicle data &amp; VIN decode</span><span class="verdict">awaiting verification</span></div>
    <div class="shelf-row"><span class="brand">apis.vin</span><span class="role">vehicle-data family</span><span class="verdict">awaiting verification</span></div>
    <div class="shelf-row"><span class="brand">api.lawyer</span><span class="role">legal machine face</span><span class="verdict">awaiting verification</span></div>
    <div class="shelf-row"><span class="brand">barcoding.dev</span><span class="role">GS1 scheme registry</span><span class="verdict">awaiting verification</span></div>
    <div class="shelf-row"><span class="brand">patent.click</span><span class="role">patent tooling</span><span class="verdict">awaiting verification</span></div>
  </div>
  <p class="shelf-cap">A grade appears only where an attested api.qa run has passed (first run 2026-08-23). Every other brand — unscored, pending, or awaiting its verification lane — shows the same awaiting-verification state; it is not a grade, and no claim is made for it. Full run-by-run statuses live at api.qa and in the operator console.</p>
</div></section>

<section class="close-prose"><div class="wrap">
  <p>api.management is the operate face of the apis.do abstraction — apis.dev builds and monetizes, this console manages and monitors. The machine face under this page is the same product the console reads: six operations, one rate card, one pinned conformance spec anyone can run at <a href="/verify">/verify</a>.</p>
</div></section>`;
  return renderPage({
    title: "api.management — manage and monitor API portfolios",
    description: "Management and monitoring for API portfolios — yours or ours. Conformance verdicts by api.qa, usage metering, rate-card enforcement, one console.",
    path: "/",
    body,
  });
}
