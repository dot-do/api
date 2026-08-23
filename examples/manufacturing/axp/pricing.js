/**
 * pricing.js — the Pricing Document (AXP Clause 5, Appendix A.2): the
 * mechanical discharge of the estate no-ask-zone law. `{"model":"free"}` is
 * how a free API is admitted — by declaring, never by staying silent; a
 * metered API additionally publishes its hard ceiling so an agent wallet
 * learns worst-case exposure before the first call.
 *
 * THE BINDING DECLARATION (added 2026-08-05).
 * `model` answers *what it costs*. It has never answered *whether you can hold
 * us to it*, and the gap is not academic: a property can publish
 * `{"model":"free"}` — a complete, conformant cost answer — while its human
 * pages correctly say no terms document exists. An agent then reads a bound
 * offer where a human is told there is none, and both surfaces are behaving
 * exactly as specified. The contradiction is in the vocabulary, not in either
 * page.
 *
 * So the document carries a second, orthogonal axis:
 *
 *   model   — free | metered            (Appendix A.2, closed, unchanged)
 *   binding — true | false              (is this declaration bound by terms?)
 *
 * `binding` is a descriptive member, exactly like `unit` and `price`: the
 * pinned requirement `pricing-declared` reads `model` and is untouched, so a
 * document carrying it conforms at apis-ax-axp@2.4.0 with no spec revision and
 * no digest bump. Agents that ignore it read the same cost answer they read
 * before; agents that honor it stop mistaking a stated intent for terms.
 *
 * Two rules, both enforced in manifest.js and both fail-closed, because a
 * boolean nobody has to explain is worse than no boolean at all:
 *   - `binding: true`  MUST carry `termsUrl` — you cannot claim to be bound
 *     without naming the document that binds you.
 *   - `binding: false` MUST carry `statement` — an unbound price explains
 *     itself in the same words the human page uses, or it is not admitted.
 *
 * Omitting `binding` stays legal and emits nothing (every pre-existing
 * manifest keeps its exact bytes). Silence means "not declared", never "bound".
 */

/** The binding axis, emitted after the model-specific members of either model. */
function bindingMembers(p) {
  if (p.binding === undefined) return {};
  return {
    binding: p.binding,
    ...(p.statement !== undefined && { statement: p.statement }),
    ...(p.termsUrl !== undefined && { termsUrl: p.termsUrl }),
    ...(p.ledgerUrl !== undefined && { ledgerUrl: p.ledgerUrl }),
  };
}

/**
 * The operation rate card (axp-ext/rates-g2@0.1.0 §2) — a TOP-LEVEL array of
 * the Pricing Document, the ruled placement (never nested under an offer).
 * One row per priced operation, keyed by the canonical camelCase operationId
 * (§1: the same identifier the route, the MCP tool, the suite reference, and
 * the generated SDK method carry). `model` keeps answering the Appendix A.2
 * question and the pinned `pricing-declared` requirement untouched — `rates`
 * is descriptive and additive, the `binding` precedent exactly.
 */
function ratesMembers(p) {
  return p.rates !== undefined ? { rates: p.rates } : {};
}

export function buildPricingDocument(manifest) {
  const p = manifest.pricing;
  if (p.model === "free") return { model: "free", ...ratesMembers(p), ...bindingMembers(p) };
  return {
    model: "metered",
    hardCeiling: p.hardCeiling,
    ...(p.unit !== undefined && { unit: p.unit }),
    ...(p.price !== undefined && { price: p.price }),
    ...ratesMembers(p),
    ...bindingMembers(p),
  };
}
