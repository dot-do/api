/**
 * site/pricing-page.js — the browser face of /pricing.
 *
 * Sibling of apis.dev src/site/pricing-page.js (family rate-card anatomy:
 * ruled rates table · model facts dl · the B2A ladder). ONE source of
 * truth: this page renders the SAME Pricing Document the machine faces
 * serve (buildPricingDocument(manifest) — rates[] at the axp-ext-rates-g2
 * §2 ruled placement). Nothing is retyped; a price that is not in the
 * document cannot appear here. The json and markdown registers stay
 * generator-emitted and untouched — only the html register is designed.
 */

import { renderPage } from "./style.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * @param {object} doc      buildPricingDocument(manifest)
 * @param {object} pricing  manifest.pricing (for offers[].alternatives — the B2A ladder)
 */
export function pricingPageHtml(doc, pricing) {
  const rateRows = (doc.rates || [])
    .map(
      (r) => `<tr>
        <td>${esc(r.operation)}</td>
        <td class="num">${r.price === 0 ? "0" : `$${r.price}`}</td>
        <td class="note">${esc(r.status || "test-mode stub — no live settlement")}</td>
      </tr>`,
    )
    .join("\n");

  const alternatives = pricing.offers?.[0]?.alternatives || [];
  const ladder = [
    `<div class="rung"><span class="n">0</span><span class="t">Anonymous sandbox — keyless and free</span><span class="s">free · serving</span></div>`,
    ...alternatives.map(
      (a, i) =>
        `<div class="rung"><span class="n">${i + 1}</span><span class="t">${esc(a.id)} — ${esc(a.summary)}</span><span class="s">${esc(a.status)}</span></div>`,
    ),
  ].join("\n");

  const body = `
<main>
  <div class="wrap">
    <div class="prose">
      <h1>Rate card</h1>
      <p class="lede">${esc(doc.statement)}</p>
    </div>

    <section class="sec">
      <h2 class="sec-label">Rates by operation</h2>
      <div class="cap-scroll">
      <table class="rates-table">
        <thead><tr><th>operationId</th><th class="num">price / call</th><th>settlement</th></tr></thead>
        <tbody>
${rateRows}
        </tbody>
      </table>
      </div>
      <p class="sec-lead">Every row keys on a contract operationId; the generator refuses a rate for an operation the contract does not declare. This table renders the document at <a href="/pricing.json" class="doc-link">/pricing.json</a> — same truth, page register.</p>
    </section>

    <section class="sec">
      <h2 class="sec-label">Model</h2>
      <dl class="facts">
        <dt>model</dt><dd class="mono">${esc(doc.model)}</dd>
        <dt>hard ceiling</dt><dd class="mono">$${doc.hardCeiling} ${esc(doc.unit || "USD")}</dd>
        <dt>binding</dt><dd class="mono">${doc.binding === false ? "false — stated intent, not bound terms" : esc(String(doc.binding))}</dd>
        <dt>machine faces</dt><dd class="mono"><a href="/pricing.json">/pricing.json</a> · <a href="/pricing.md">/pricing.md</a> · <a href="/offer">/offer</a> (402)</dd>
      </dl>
    </section>

    <section class="sec">
      <h2 class="sec-label">The B2A ladder</h2>
      <p class="sec-lead">Every 402 OFFER advertises the ladder. Unwired rungs say so — a stub is labeled a stub, never a live door.</p>
      <div class="ladder">
${ladder}
      </div>
    </section>
  </div>
</main>`;
  return renderPage({
    title: "api.management — rate card",
    description:
      "The api.management rate card: six operation-keyed metered rates, the hard ceiling, and the B2A ladder. Test-mode — nothing is charged.",
    path: "/pricing",
    body,
  });
}
