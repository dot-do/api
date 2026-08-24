/**
 * landing.js — the browser face of `/`, wired into manifest.home.html.
 *
 * A pure function of the same data the machine face serves: the rate rows
 * come in from manifest.js (never retyped here), the door addresses are the
 * ones the worker actually mounts, and every claim on the page is a claim
 * the origin's own JSON faces repeat. Taste standard applied by counting:
 * leads ≤25 words, one closing paragraph, no repeated section skeleton
 * (figures band / worked-example pair / status table / shelf ledger /
 * ruled pricing line are five different anatomies).
 *
 * BRAND SHELF ruling (founder, 2026-08-24, reframed same day): apis.dev
 * does not display api.qa scores AT ALL — scoring is api.qa's product,
 * linked, never duplicated here. The shelf is "Built on apis.dev": the
 * properties on the platform, no per-brand grades. The claim is the
 * MECHANISM — properties built on apis.dev pass the pinned AXP
 * conformance gate by construction (the generator emits the five faces
 * conformant); continuous verification runs at api.qa, the independent
 * verifier (one link; family disclosure covers the relationship). The
 * one number printed is the collective mechanism stat, verified against
 * the studio#9 build record before printing. General law: no F/failing
 * grades on marketing shelves, ever — failing verdicts live on api.qa
 * and internal ops consoles, not brand shelves. No fabricated scores.
 */

import { renderPage } from './style.js'

/** The shelf: properties built on apis.dev. No per-brand grades — ever (see ruling above). */
const SHELF = [
  { domain: 'auto.dev', what: 'vehicle data & VIN decode' },
  { domain: 'apis.vin', what: 'vehicle APIs' },
  { domain: 'api.lawyer', what: 'legal work as an API' },
  { domain: 'api.insure', what: 'insurance as an API' },
  { domain: 'apis.mortgage', what: 'mortgage as an API' },
  { domain: 'barcoding.dev', what: 'barcodes & identifiers' },
]

function shelfRows() {
  // No verdict column: scores are api.qa's product and are not duplicated here.
  return SHELF.map((b) => `<a class="srow" href="https://${b.domain}" rel="noopener">
      <span class="brand">${b.domain}</span>
      <span class="what">${b.what}</span>
    </a>`).join('\n')
}

/**
 * @param {{ rates: Array<{operation:string, price:number, unit?:string, freeQuota?:number}>, hardCeiling: number }} data
 */
export function landingHtml({ rates, hardCeiling }) {
  const metered = rates.find((r) => r.freeQuota !== undefined) || rates[0]
  const body = `
<main>
  <div class="wrap">
    <section class="hero">
      <h1>Define once. Ship five faces.</h1>
      <p class="lede">One definition generates the documentation, the REST surface, the SDK, the MCP tools, and the CLI — plus the rate card that meters them. apis.dev is where you build that definition and publish it.</p>
      <div class="cta-row">
        <a class="btn" href="/dashboard">Open the dashboard</a>
        <a class="btn-quiet" href="/llms.txt">curl apis.dev/llms.txt</a>
      </div>
      <p class="assure">Keyless. No account. The sandbox floor answers anonymously.</p>
    </section>
  </div>

  <div class="figures" aria-label="what this origin serves">
    <div class="wrap">
      <div class="fig"><b>14</b><span>operations</span></div>
      <div class="fig"><b>5</b><span>nouns</span></div>
      <div class="fig"><b>2</b><span>transports</span></div>
      <div class="fig"><b>4</b><span>rate rows</span></div>
      <div class="fig"><b>0</b><span>keys required</span></div>
    </div>
  </div>

  <div class="wrap">
    <section class="band" id="how">
      <h2 class="sec-label">Schema in, faces out</h2>
      <div class="worked">
        <div class="plate"><pre><span class="c">// @dotdo/api — the estate's convention-driven generator</span>
<span class="k">import</span> { defineResource } <span class="k">from</span> <span class="k">'@dotdo/api'</span>

<span class="k">const</span> Customer = defineResource(<span class="k">'Customer'</span>)
  .fields({
    name:  { type: <span class="k">'string'</span>, required: <span class="k">true</span> },
    email: { type: <span class="k">'string'</span>, format: <span class="k">'email'</span> },
  })
  .relations({ orders: { type: <span class="k">'hasMany'</span>, resource: <span class="k">'Order'</span> } })
  .build()</pre></div>
        <div class="emits">
          <div class="emit"><span class="f">Docs</span><span class="a"><a href="/llms.txt">/llms.txt</a> · <a href="/openapi.json">/openapi.json</a></span></div>
          <div class="emit"><span class="f">REST</span><span class="a"><a href="/apis">/apis</a> — typed OK · EMPTY · BLOCKED · OFFER</span></div>
          <div class="emit"><span class="f">SDK</span><span class="a">typed client from the definition</span></div>
          <div class="emit"><span class="f">MCP</span><span class="a">POST /mcp — tools = contract operationIds</span></div>
          <div class="emit"><span class="f">CLI</span><span class="a">commands from the definition</span></div>
          <div class="emit"><span class="f">Rate card</span><span class="a"><a href="/pricing">/pricing</a> — operation-keyed rates[]</span></div>
        </div>
      </div>
      <p class="worked-cap">The generator is <a href="https://www.npmjs.com/package/@dotdo/api" rel="noopener">@dotdo/api</a>, the estate's own convention-driven builder: a resource definition in; REST with HATEOAS, an OpenAPI contract, a typed SDK, CLI commands, and MCP tools out. This origin practices the same mechanism — its whole machine face is generated from one manifest by the vendored axp-faces generator.</p>
    </section>

    <section class="band" id="status">
      <h2 class="sec-label">What serves today</h2>
      <div class="table-scroll">
      <table class="status-table">
        <thead><tr><th>Face</th><th>Mechanism</th><th>Address</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Docs</td><td>llms.txt front door + OpenAPI 3.1 contract</td><td class="addr"><a href="/llms.txt">/llms.txt</a> · <a href="/openapi.json">/openapi.json</a></td><td><span class="st live">serving</span></td></tr>
          <tr><td>REST</td><td>typed registry + keyless sandbox workspaces</td><td class="addr"><a href="/apis">/apis</a> · POST /workspaces</td><td><span class="st live">serving</span></td></tr>
          <tr><td>MCP</td><td>5 tools; tool names are the contract's operationIds</td><td class="addr">POST /mcp</td><td><span class="st live">serving</span></td></tr>
          <tr><td>Rate card</td><td>operation-keyed rates[]; 402 OFFER boundary</td><td class="addr"><a href="/pricing">/pricing</a> · <a href="/offer">/offer</a></td><td><span class="st live">serving · test-mode</span></td></tr>
          <tr><td>SDK</td><td>typed client generated from the definition</td><td class="addr">via @dotdo/api</td><td><span class="st road">roadmap</span></td></tr>
          <tr><td>CLI</td><td>commands generated from the definition</td><td class="addr">via @dotdo/api</td><td><span class="st road">roadmap</span></td></tr>
        </tbody>
      </table>
      </div>
      <p class="sec-note">API and probe-report records are real, provenance-stamped. Action records are labeled example data. Settlement is a labeled test-mode stub — the 402 boundary is served, nothing is charged.</p>
    </section>

    <section class="band" id="shelf">
      <h2 class="sec-label">Built on apis.dev</h2>
      <div class="shelf">
        <div class="colhead"><span>Brand</span><span class="h-what">What it sells</span></div>
        ${shelfRows()}
      </div>
      <p class="sec-note">52 of the register's 53 categories generated on this platform; every build gates at the pinned conformance spec (apis-ax-axp@2.6.0) before deploy — the generator emits the five faces conformant by construction, so a property scoring imperfectly is an apis.dev product gap, not the property's. Continuous verification is <a href="https://api.qa" rel="noopener">api.qa</a>'s product, not this page's: attested, replayable, and run by an estate sibling whose independence is procedural — pinned spec, evidence anyone can replay — not corporate.</p>
    </section>

    <section class="band" id="pricing">
      <h2 class="sec-label">Pricing</h2>
      <p class="sec-note mono">metered · $${metered.price}/${(metered.unit || 'USD/call').replace('USD/', '')} · first ${(metered.freeQuota ?? 0).toLocaleString('en-US')} calls free · $${hardCeiling} hard ceiling · test-mode: nothing is charged today — <a href="/pricing" style="color:var(--accent)">full rate card</a></p>
    </section>

    <section class="closing">
      <p>apis.dev is the build-and-monetize door of the <a href="https://apis.do" rel="noopener">apis.do</a> provider abstraction; api.management is its sibling for manage-and-operate. What you register here is served the way this page is served — one definition, every face generated from it, and an independent verifier, <a href="https://api.qa" rel="noopener">api.qa</a>, grading the result in public.</p>
    </section>
  </div>
</main>`
  return renderPage({
    title: 'apis.dev — define once, ship five faces',
    description:
      'Build and monetize APIs: one definition generates docs, REST, SDK, MCP, CLI — and the rate card that meters them.',
    path: '/',
    body,
  })
}
