/**
 * pricing-page.js — the browser face of /pricing.
 *
 * ONE source of truth: this page renders the SAME Pricing Document the
 * machine faces serve (buildPricingDocument(manifest) — rates[] at the
 * axp-ext-rates-g2 §2 ruled placement). Nothing is retyped; a price that
 * is not in the document cannot appear here. The JSON and markdown faces
 * (/pricing.json, /pricing.md) stay generator-emitted and untouched —
 * only the html register is designed.
 */

import { renderPage } from './style.js'

/**
 * @param {object} doc      buildPricingDocument(manifest)
 * @param {object} pricing  manifest.pricing (for offers[].alternatives — the B2A ladder)
 */
export function pricingPageHtml(doc, pricing) {
  const rateRows = (doc.rates || [])
    .map(
      (r) => `<tr>
        <td>${r.operation}</td>
        <td class="num">${r.price === 0 ? '0' : `$${r.price}`}</td>
        <td class="num">${r.freeQuota !== undefined ? r.freeQuota.toLocaleString('en-US') : '—'}</td>
        <td class="note">${r.status || 'free'}</td>
      </tr>`,
    )
    .join('\n')

  const ladder = (pricing.offers?.[0]?.alternatives || [])
    .map((a) => {
      const right =
        a.status !== undefined
          ? `<span class="s">${a.status}</span>`
          : `<span class="price-live">${a.price === 0 ? 'free' : `$${a.price}/${(a.unit || '').replace('USD/', '') || 'call'}`}</span>`
      return `<div class="rung"><span class="n">${a.rung}</span><span class="t">${a.title}</span>${right}</div>`
    })
    .join('\n')

  const body = `
<main>
  <div class="wrap">
    <div class="prose">
      <h1>Rate card</h1>
      <p class="lede">${doc.statement}</p>
    </div>

    <section class="band">
      <h2 class="sec-label">Rates by operation</h2>
      <div class="table-scroll">
      <table class="rates-table">
        <thead><tr><th>operationId</th><th class="num">price / call</th><th class="num">free quota</th><th>settlement</th></tr></thead>
        <tbody>
${rateRows}
        </tbody>
      </table>
      </div>
      <p class="sec-note">Every row keys on a contract operationId; the generator refuses a rate for an operation the contract does not declare. This table renders the document at <a href="/pricing.json" style="color:var(--accent)">/pricing.json</a> — same truth, page register.</p>
    </section>

    <section class="band">
      <h2 class="sec-label">Model</h2>
      <dl class="facts">
        <dt>model</dt><dd class="mono">${doc.model}</dd>
        <dt>hard ceiling</dt><dd class="mono">$${doc.hardCeiling} ${doc.unit || 'USD'}</dd>
        <dt>binding</dt><dd class="mono">${doc.binding === false ? 'false — stated intent, not bound terms' : String(doc.binding)}</dd>
        <dt>machine faces</dt><dd class="mono"><a href="/pricing.json">/pricing.json</a> · <a href="/pricing.md">/pricing.md</a> · <a href="/offer">/offer</a> (402)</dd>
      </dl>
    </section>

    <section class="band">
      <h2 class="sec-label">The B2A ladder</h2>
      <p class="sec-note">Every 402 OFFER advertises all four rungs. Unwired rungs say so — a stub is labeled a stub, never a live door.</p>
      <div class="ladder">
${ladder}
      </div>
    </section>
  </div>
</main>`
  return renderPage({
    title: 'apis.dev — rate card',
    description: 'The apis.dev rate card: operation-keyed metered rates, free quotas, hard ceiling, and the B2A ladder.',
    path: '/pricing',
    body,
  })
}
