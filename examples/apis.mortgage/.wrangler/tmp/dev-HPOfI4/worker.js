var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/axp-faces/manifest.js
var HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+$/i;
var PATHNAME = /^\/[^\s?#]*$/;
var OPERATION_ID_RE = /^[a-z][A-Za-z0-9]*$/;
function fail(msg) {
  throw new Error(`axp-faces manifest: ${msg}`);
}
__name(fail, "fail");
function assertOperationId(id, what) {
  if (typeof id !== "string" || !OPERATION_ID_RE.test(id)) {
    fail(
      `${what} must be a camelCase verb-form operationId (axp-ext/rates-g2 \xA71 \u2014 the ONE cross-face operation name: route operationId = MCP tool = suite coverage reference = SDK method = rates[] key; e.g. "decodeVin", "createPlacement") \u2014 got ${JSON.stringify(id)}`
    );
  }
  return id;
}
__name(assertOperationId, "assertOperationId");
var AT_LIMIT = ["bill", "block", "throttle", "force-upgrade", "renew-early", "drop"];
var DISCLOSURE = ["published", "calculator-only", "quote-only", "undisclosed"];
var METER_AGGREGATION = ["sum", "distinct", "high-watermark", "gauge", "peak"];
var METER_BASIS = ["consumed", "provisioned", "standing"];
var BREAKS_MODE = ["graduated", "retroactive", "reprice-offer"];
var BREAKS_BASIS = ["units", "spend", "instantaneous-rate"];
var MODIFIER_OP = ["multiply", "add"];
var MODIFIER_SCOPE = ["rate", "offer", "card"];
var RESERVED_RATE_MEMBERS = {
  keys: "D1 (rate dimensions/matrix)",
  payment: "D4 (two-part tariff)",
  direction: "A14 (money direction)",
  recurrence: "A13 (purchase recurrence)",
  effective: "D5 (temporal validity)",
  condition: "G20 (rate-level predicates ride modifiers[].condition until ratified standalone)",
  credits: "A6 (credits are offer-level when ratified)",
  currencies: "D3 (virtual currencies)"
};
var RESERVED_OFFER_MEMBERS = {
  credits: "A6 (cross-meter monetary credits)",
  base_fee: "A9 (hybrid base fee)",
  minimum: "A10 (billing floor / true-up)",
  relations: "A12 (requires/excludes/alternative_to/modifies)",
  entitlements: "A15 (non-price entitlements)",
  eligibility: "D6 (eligibility predicates)",
  effective: "D5 (temporal validity)",
  recurrence: "A13 (purchase recurrence)"
};
var isFiniteNum = /* @__PURE__ */ __name((v) => typeof v === "number" && Number.isFinite(v), "isFiniteNum");
function refuseReserved(obj, reserved, what) {
  for (const [k, why] of Object.entries(reserved)) {
    if (obj[k] !== void 0) {
      fail(`${what}.${k} is a RESERVED name (axp-ext/rates-g2 \xA72.9 \u2014 deferred amendment ${why}, not yet ratified): drop it rather than colonize it with a private convention`);
    }
  }
}
__name(refuseReserved, "refuseReserved");
function validateRatePrice(row, what) {
  const p = row.price;
  if (typeof p === "number") {
    if (!isFiniteNum(p) || p < 0) fail(`${what}: a scalar price is a finite number >= 0 \u2014 got ${JSON.stringify(p)}`);
    return;
  }
  if (p === null || typeof p !== "object" || Array.isArray(p)) fail(`${what}: price is a scalar >= 0 or one of the \xA72 price objects (compound | passthrough | market) \u2014 got ${JSON.stringify(p)}`);
  const isPassthrough = p.passthrough !== void 0;
  const isMarket = p.discovery !== void 0;
  if (isPassthrough && isMarket) fail(`${what}: a price is passthrough OR market-discovered, never both`);
  if (isPassthrough) {
    const pt = p.passthrough;
    if (pt === null || typeof pt !== "object" || Array.isArray(pt) || typeof pt.provider !== "string" || pt.provider.length === 0) {
      fail(`${what}: price.passthrough is { provider, reference?, markup? } with provider a non-empty string (A2/G8)`);
    }
    if (pt.reference !== void 0 && typeof pt.reference !== "string") fail(`${what}: price.passthrough.reference must be a string`);
    if (pt.markup !== void 0) {
      const mk = pt.markup;
      if (mk === null || typeof mk !== "object" || Array.isArray(mk)) fail(`${what}: price.passthrough.markup is { fixed?, percent? }`);
      if (mk.fixed !== void 0 && (!isFiniteNum(mk.fixed) || mk.fixed < 0)) fail(`${what}: passthrough markup.fixed must be a finite number >= 0`);
      if (mk.percent !== void 0 && (!isFiniteNum(mk.percent) || mk.percent < 0)) fail(`${what}: passthrough markup.percent must be a finite number >= 0`);
    }
    for (const k of ["fixed", "percent", "basis", "cap", "floor", "min_fee"]) {
      if (p[k] !== void 0) fail(`${what}: a passthrough price carries no compound member ${JSON.stringify(k)} \u2014 markup lives inside passthrough.markup (A2)`);
    }
    return;
  }
  if (isMarket) {
    if (p.discovery !== "market") fail(`${what}: price.discovery is closed to "market" (A2/G16) \u2014 got ${JSON.stringify(p.discovery)}`);
    if (p.reference !== void 0 && typeof p.reference !== "string") fail(`${what}: price.reference must be a string (a rate reference or URL)`);
    if (p.buyer_cap !== void 0 && typeof p.buyer_cap !== "boolean") fail(`${what}: price.buyer_cap must be a boolean`);
    return;
  }
  if (p.fixed === void 0 && p.percent === void 0) {
    fail(`${what}: a compound price declares at least one of fixed / percent (A1/G1) \u2014 an empty price object prices nothing`);
  }
  if (p.fixed !== void 0 && (!isFiniteNum(p.fixed) || p.fixed < 0)) fail(`${what}: price.fixed must be a finite number >= 0`);
  if (p.percent !== void 0) {
    if (!isFiniteNum(p.percent) || p.percent <= 0) fail(`${what}: price.percent must be a finite number > 0 (a zero percent is the member omitted)`);
    if (typeof p.basis !== "string" || p.basis.length === 0) {
      fail(`${what}: price.percent REQUIRES price.basis naming what the percent is of ("transaction-value", "payout", "billing-volume", ...) \u2014 an ad-valorem rate without a basis is unpriceable (A1/G1)`);
    }
  }
  for (const k of ["cap", "floor", "min_fee"]) {
    if (p[k] !== void 0 && (!isFiniteNum(p[k]) || p[k] < 0)) fail(`${what}: price.${k} must be a finite number >= 0`);
  }
}
__name(validateRatePrice, "validateRatePrice");
function assertAtLimit(v, what) {
  if (!AT_LIMIT.includes(v)) fail(`${what} is closed to ${AT_LIMIT.map((x) => JSON.stringify(x)).join(" | ")} (A4/G4) \u2014 got ${JSON.stringify(v)}`);
  return v;
}
__name(assertAtLimit, "assertAtLimit");
function validateIncluded(row, what) {
  const inc = row.included;
  if (inc === void 0) return;
  if (row.freeQuota !== void 0) fail(`${what}: declare included OR freeQuota, never both \u2014 freeQuota is the legacy shorthand for included {qty, period:"month"}`);
  if (typeof inc === "number") {
    if (!isFiniteNum(inc) || inc <= 0) fail(`${what}: a numeric included must be a finite number > 0`);
    return;
  }
  if (inc === "unlimited") return;
  if (inc === null || typeof inc !== "object" || Array.isArray(inc)) fail(`${what}: included is a quantity, "unlimited", or an allowance object {qty, period?, rollover?, at_limit?} (A5/G5)`);
  if (!(inc.qty === "unlimited" || isFiniteNum(inc.qty) && inc.qty > 0)) fail(`${what}: included.qty must be a finite number > 0 or "unlimited"`);
  if (inc.period !== void 0 && !["day", "month", "once"].includes(inc.period)) fail(`${what}: included.period is closed to "day" | "month" | "once" (A5/G5)`);
  if (inc.rollover !== void 0 && typeof inc.rollover !== "boolean") fail(`${what}: included.rollover must be a boolean`);
  if (inc.at_limit !== void 0) assertAtLimit(inc.at_limit, `${what}: included.at_limit`);
}
__name(validateIncluded, "validateIncluded");
function validateModifiers(row, what) {
  const mods = row.modifiers;
  if (mods === void 0) return;
  if (!Array.isArray(mods) || mods.length === 0) fail(`${what}: modifiers must be a NON-EMPTY array (A3/G2) \u2014 or absent`);
  for (const m of mods) {
    if (m === null || typeof m !== "object" || Array.isArray(m)) fail(`${what}: every modifier is { op, value, scope?, condition?, stacking_order? }`);
    if (!MODIFIER_OP.includes(m.op)) fail(`${what}: modifier.op is closed to "multiply" | "add" (A3/G2) \u2014 got ${JSON.stringify(m.op)}`);
    if (!isFiniteNum(m.value)) fail(`${what}: modifier.value must be a finite number`);
    if (m.scope !== void 0 && !MODIFIER_SCOPE.includes(m.scope)) fail(`${what}: modifier.scope is closed to "rate" | "offer" | "card"`);
    if (m.condition !== void 0) {
      if (m.condition === null || typeof m.condition !== "object" || Array.isArray(m.condition) || typeof m.condition.attribute !== "string") {
        fail(`${what}: modifier.condition is { attribute, op?, value? } with attribute a string (A3/G20)`);
      }
    }
    if (m.stacking_order !== void 0 && !(Number.isInteger(m.stacking_order) && m.stacking_order >= 0)) fail(`${what}: modifier.stacking_order must be a non-negative integer`);
  }
}
__name(validateModifiers, "validateModifiers");
function validateMeter(row, what) {
  const mt = row.meter;
  if (mt === void 0) return;
  if (mt === null || typeof mt !== "object" || Array.isArray(mt)) fail(`${what}: meter is { aggregation, basis?, reset_period?, definition_url? } (G3)`);
  if (!METER_AGGREGATION.includes(mt.aggregation)) fail(`${what}: meter.aggregation is closed to ${METER_AGGREGATION.map((x) => JSON.stringify(x)).join(" | ")} (G3)`);
  if (mt.basis !== void 0 && !METER_BASIS.includes(mt.basis)) fail(`${what}: meter.basis is closed to "consumed" | "provisioned" | "standing" (G3)`);
  if (mt.reset_period !== void 0 && typeof mt.reset_period !== "string") fail(`${what}: meter.reset_period must be a string`);
  if (mt.definition_url !== void 0 && typeof mt.definition_url !== "string") fail(`${what}: meter.definition_url must be a string URL \u2014 "defined elsewhere" must be distinguishable from "undefined"`);
}
__name(validateMeter, "validateMeter");
function validateVolumeBreaks(row, what) {
  const vb = row.volume_breaks;
  if (vb === void 0) return;
  if (vb === null || typeof vb !== "object" || Array.isArray(vb)) fail(`${what}: volume_breaks is { mode, basis?, breaks[], formula_url?, approximate? } (A7/G7)`);
  if (!BREAKS_MODE.includes(vb.mode)) {
    fail(`${what}: volume_breaks.mode is REQUIRED and closed to "graduated" | "retroactive" | "reprice-offer" (A7/G7 \u2014 the same breaks JSON bills differently under each) \u2014 got ${JSON.stringify(vb.mode)}`);
  }
  if (vb.basis !== void 0 && !BREAKS_BASIS.includes(vb.basis)) fail(`${what}: volume_breaks.basis is closed to "units" | "spend" | "instantaneous-rate"`);
  if (!Array.isArray(vb.breaks) || vb.breaks.length === 0) fail(`${what}: volume_breaks.breaks must be a NON-EMPTY array of { from, price | discount_percent }`);
  for (const b of vb.breaks) {
    if (b === null || typeof b !== "object" || Array.isArray(b) || !isFiniteNum(b.from) || b.from < 0) fail(`${what}: every break is { from: number >= 0, price | discount_percent }`);
    if (b.price === void 0 && b.discount_percent === void 0) fail(`${what}: every break carries price or discount_percent`);
    if (b.price !== void 0 && (!isFiniteNum(b.price) || b.price < 0)) fail(`${what}: break.price must be a finite number >= 0`);
    if (b.discount_percent !== void 0 && (!isFiniteNum(b.discount_percent) || b.discount_percent <= 0)) fail(`${what}: break.discount_percent must be a finite number > 0`);
  }
  if (vb.formula_url !== void 0 && typeof vb.formula_url !== "string") fail(`${what}: volume_breaks.formula_url must be a string URL`);
  if (vb.approximate !== void 0 && typeof vb.approximate !== "boolean") fail(`${what}: volume_breaks.approximate must be a boolean`);
}
__name(validateVolumeBreaks, "validateVolumeBreaks");
function validateDisclosure(row, what) {
  if (row.disclosure !== void 0 && !DISCLOSURE.includes(row.disclosure)) {
    fail(`${what}: disclosure is closed to ${DISCLOSURE.map((x) => JSON.stringify(x)).join(" | ")} (A8/G9)`);
  }
  const withheld = row.disclosure !== void 0 && row.disclosure !== "published";
  if (row.price === void 0 || row.price === null) {
    if (!withheld) {
      fail(`${what} needs a price \u2014 omit/null it ONLY under a non-published disclosure ("calculator-only" | "quote-only" | "undisclosed"), so a withheld price is a declared fact, never a silent gap (A8/G9)`);
    }
  }
  if (row.estimate !== void 0) {
    if (!withheld) fail(`${what}: estimate is legal only when disclosure withholds the price (A8/G9) \u2014 a published price needs no estimate`);
    const e = row.estimate;
    if (e === null || typeof e !== "object" || Array.isArray(e) || !isFiniteNum(e.low) || !isFiniteNum(e.high) || e.low < 0 || e.high < e.low) {
      fail(`${what}: estimate is { low, high, provenance? } with 0 <= low <= high`);
    }
    if (e.provenance !== void 0 && typeof e.provenance !== "string") fail(`${what}: estimate.provenance must be a string`);
  }
  return withheld;
}
__name(validateDisclosure, "validateDisclosure");
function assertPath(p, what) {
  if (typeof p !== "string" || !PATHNAME.test(p)) fail(`${what} must be a same-origin pathname starting with "/" (got ${JSON.stringify(p)})`);
  if (p.includes("{")) fail(`${what} must be non-templated (Appendix A.3) \u2014 got ${JSON.stringify(p)}`);
  return p;
}
__name(assertPath, "assertPath");
function defineSiteManifest(input) {
  if (!input || typeof input !== "object") fail("manifest must be an object");
  const origin = String(input.origin || "").replace(/\/+$/, "");
  if (!HTTPS_ORIGIN.test(origin) && !/^https?:\/\/[a-z0-9.-]+(\.[a-z]+)?$/i.test(origin)) {
    fail(`origin must be an https origin with no path (got ${JSON.stringify(input.origin)})`);
  }
  const name = input.name || new URL(origin).hostname;
  const description = String(input.description || "");
  if (description.length < 21) fail("description must be substantive (> 20 chars) \u2014 the card check judges it");
  const c = input.collection;
  if (!c || typeof c !== "object") fail("collection is required \u2014 the one branching GET pathname that discharges Clauses 4 and 7");
  const collectionPath = assertPath(c.path, "collection.path");
  const records = Array.isArray(c.records) ? c.records : null;
  if (!records || records.length === 0) {
    fail("collection.records must be a NON-EMPTY array \u2014 the keyless probe must answer 200 OK with substance; seed one honest, clearly-labeled demo record (the api.lawyer demoMatter pattern)");
  }
  const filters = Array.isArray(c.filters) && c.filters.length > 0 ? c.filters.map(String) : ["filter", "tag"];
  const blockedScopes = Array.isArray(c.blockedScopes) && c.blockedScopes.length >= 2 ? c.blockedScopes.map(String) : ["admin", "internal"];
  if (blockedScopes.length < 2) fail("collection.blockedScopes needs >= 2 entries \u2014 Clause 4 requires two distinct knownForbidden probes");
  const knownEmptyQueries = filters.length >= 2 ? [`${filters[0]}=none`, `${filters[1]}=none`] : [`${filters[0]}=none`, `${filters[0]}=__none__`];
  const collection = Object.freeze({
    path: collectionPath,
    /* axp-ext/rates-g2 §1: the collection operation's canonical name is
       site-nameable (default "listCollection") so a rate row can key on it. */
    operationId: c.operationId !== void 0 ? assertOperationId(c.operationId, "collection.operationId") : "listCollection",
    memberName: c.memberName || "results",
    summary: c.summary || `The ${name} collection \u2014 typed OK | EMPTY | BLOCKED, branching on its query`,
    records: Object.freeze([...records]),
    filters: Object.freeze(filters),
    blockedScopes: Object.freeze(blockedScopes),
    /** (record, param, value) => boolean — how a filter param matches */
    match: typeof c.match === "function" ? c.match : (rec, param, value) => rec != null && String(rec[param]) === value,
    emptyMessage: typeof c.emptyMessage === "function" ? c.emptyMessage : (param, value) => `no records match ${param}=${value} \u2014 a truthful empty set, not an error`,
    blockedReason: typeof c.blockedReason === "function" ? c.blockedReason : (scope) => `scope '${scope}' is reserved to the platform \u2014 not permitted for your agent class`
  });
  const p = input.pricing || { model: "free" };
  if (p.model !== "free" && p.model !== "metered") fail('pricing.model is closed to "free" | "metered" (Appendix A.2)');
  const binding = (() => {
    if (p.binding === void 0) {
      for (const k of ["statement", "termsUrl", "ledgerUrl"]) {
        if (p[k] !== void 0) fail(`pricing.${k} is meaningless without pricing.binding \u2014 declare binding: true | false or drop ${k}`);
      }
      return {};
    }
    if (typeof p.binding !== "boolean") fail("pricing.binding must be a boolean \u2014 true (published terms bind this price) or false (stated intent)");
    if (p.binding === true && typeof p.termsUrl !== "string") {
      fail("pricing.binding: true requires pricing.termsUrl \u2014 a price cannot claim to be bound without naming the terms document that binds it");
    }
    if (p.binding === false && typeof p.statement !== "string") {
      fail("pricing.binding: false requires pricing.statement \u2014 an unbound price states its intent in the same words the human page uses, or it is not admitted");
    }
    if (p.binding === false && p.termsUrl !== void 0) {
      fail("pricing.binding: false declares NO termsUrl \u2014 naming a terms document is what binding: true means");
    }
    return {
      binding: p.binding,
      ...p.statement !== void 0 && { statement: String(p.statement) },
      ...p.termsUrl !== void 0 && { termsUrl: String(p.termsUrl) },
      ...p.ledgerUrl !== void 0 && { ledgerUrl: String(p.ledgerUrl) }
    };
  })();
  let rates;
  if (p.rates !== void 0) {
    if (!Array.isArray(p.rates) || p.rates.length === 0) fail("pricing.rates must be a NON-EMPTY array of rate rows (axp-ext/rates-g2 \xA72) \u2014 or absent");
    rates = Object.freeze(
      p.rates.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) fail("every pricing.rates row is an object { operation, price, ... } (axp-ext/rates-g2 \xA72)");
        assertOperationId(row.operation, "pricing.rates[].operation");
        const what = `pricing.rates row ${JSON.stringify(row.operation)}`;
        refuseReserved(row, RESERVED_RATE_MEMBERS, what);
        validateDisclosure(row, what);
        if (row.price !== void 0 && row.price !== null) validateRatePrice(row, what);
        if (row.unit !== void 0 && typeof row.unit !== "string") fail(`${what}: unit must be a string`);
        if (row.note !== void 0 && typeof row.note !== "string") fail(`${what}: note must be a string`);
        if (row.freeQuota !== void 0 && !(isFiniteNum(row.freeQuota) && row.freeQuota > 0)) {
          fail(`${what}: freeQuota must be a number strictly > 0 \u2014 a zero quota is the row without it`);
        }
        validateIncluded(row, what);
        validateModifiers(row, what);
        validateMeter(row, what);
        validateVolumeBreaks(row, what);
        if (row.derived_from !== void 0) assertOperationId(row.derived_from, `${what}: derived_from`);
        if (p.model === "free") {
          if (row.price !== 0) fail(`${what}: a free surface publishes only scalar zero rates \u2014 a positive, compound, reference, or withheld price contradicts model:"free"`);
          if (row.freeQuota !== void 0) fail(`${what}: freeQuota on a free surface implies billable overage \u2014 use included {qty, at_limit:"block"|"throttle"|"drop"} for an honest free quota`);
          if (row.modifiers !== void 0 || row.volume_breaks !== void 0) fail(`${what}: modifiers/volume_breaks modify a price a free surface does not charge \u2014 drop them or declare model:"metered"`);
          if (row.disclosure !== void 0 && row.disclosure !== "published") fail(`${what}: a free surface withholds nothing \u2014 disclosure must be "published" or absent`);
          const inc = row.included;
          if (inc !== null && typeof inc === "object" && inc.at_limit !== void 0 && !["block", "throttle", "drop"].includes(inc.at_limit)) {
            fail(`${what}: on a free surface included.at_limit is closed to "block" | "throttle" | "drop" \u2014 "${inc.at_limit}" implies a bill or a purchase`);
          }
        }
        return Object.freeze(JSON.parse(JSON.stringify(row)));
      })
    );
    const seen = /* @__PURE__ */ new Set();
    for (const row of rates) {
      if (seen.has(row.operation)) fail(`pricing.rates keys on operationId and ${JSON.stringify(row.operation)} appears twice \u2014 one operation, one rate row`);
      seen.add(row.operation);
    }
    for (const row of rates) {
      if (row.derived_from !== void 0) {
        if (row.derived_from === row.operation) fail(`pricing.rates row ${JSON.stringify(row.operation)}: derived_from cannot reference itself`);
        if (!seen.has(row.derived_from)) fail(`pricing.rates row ${JSON.stringify(row.operation)}: derived_from ${JSON.stringify(row.derived_from)} names no row on this card (A3/G2)`);
      }
    }
  }
  const allowanceRefs = [];
  let pricing;
  if (p.model === "free") {
    if (p.hardCeiling !== void 0 || p.offers !== void 0) {
      fail("a free API declares NO hardCeiling and NO offers \u2014 free means the metering clauses do not apply (Appendix A.5)");
    }
    pricing = Object.freeze({ model: "free", ...rates !== void 0 && { rates }, ...binding });
  } else {
    if (!(typeof p.hardCeiling === "number" && p.hardCeiling > 0)) fail("metered pricing requires hardCeiling: a number strictly > 0");
    const offers = Array.isArray(p.offers) ? p.offers : null;
    if (!offers || offers.length === 0) fail("metered pricing requires monetization offers (>= 1, each with id|title plus price|checkoutUrl|alternatives)");
    for (const o of offers) {
      if (!o || !o.id && !o.title) fail("every offer carries an id or title");
      if (o.price === void 0 && o.checkoutUrl === void 0 && o.alternatives === void 0) {
        fail("every offer carries a price, checkoutUrl, or alternatives member");
      }
      const oWhat = `pricing.offers ${JSON.stringify(o.id || o.title)}`;
      refuseReserved(o, RESERVED_OFFER_MEMBERS, oWhat);
      if (o.spend_cap !== void 0) {
        const sc = o.spend_cap;
        if (sc === null || typeof sc !== "object" || Array.isArray(sc) || !isFiniteNum(sc.amount) || sc.amount <= 0 || !["buyer", "seller"].includes(sc.settable_by)) {
          fail(`${oWhat}: spend_cap is { amount: number > 0, settable_by: "buyer" | "seller" } (A4/G4)`);
        }
      }
      if (o.allowances !== void 0) {
        if (!Array.isArray(o.allowances) || o.allowances.length === 0) fail(`${oWhat}: allowances must be a NON-EMPTY array (A5/G5) \u2014 or absent`);
        for (const a of o.allowances) {
          if (a === null || typeof a !== "object" || Array.isArray(a)) fail(`${oWhat}: every allowance is { pool_qty, denomination, applies_to[], conversion?, disjunctive?, period?, rollover?, at_limit? }`);
          if (!(a.pool_qty === "unlimited" || isFiniteNum(a.pool_qty) && a.pool_qty > 0)) fail(`${oWhat}: allowance.pool_qty must be a finite number > 0 or "unlimited"`);
          if (!["unit", "currency"].includes(a.denomination)) fail(`${oWhat}: allowance.denomination is closed to "unit" | "currency" (A5/G5)`);
          if (!Array.isArray(a.applies_to) || a.applies_to.length === 0) fail(`${oWhat}: allowance.applies_to must be a NON-EMPTY array of operationIds \u2014 a pool no meter drains allows nothing`);
          for (const ref2 of a.applies_to) {
            assertOperationId(ref2, `${oWhat}: allowance.applies_to entry`);
            allowanceRefs.push({ ref: ref2, where: `${oWhat} allowances.applies_to` });
          }
          if (a.conversion !== void 0) {
            if (a.conversion === null || typeof a.conversion !== "object" || Array.isArray(a.conversion) || Object.keys(a.conversion).length === 0) {
              fail(`${oWhat}: allowance.conversion is a non-empty { <operationId>: ratio > 0 } map (A5/G5)`);
            }
            for (const [ref2, ratio] of Object.entries(a.conversion)) {
              assertOperationId(ref2, `${oWhat}: allowance.conversion key`);
              if (!(isFiniteNum(ratio) && ratio > 0)) fail(`${oWhat}: allowance.conversion[${JSON.stringify(ref2)}] must be a finite ratio > 0`);
              allowanceRefs.push({ ref: ref2, where: `${oWhat} allowances.conversion` });
            }
          }
          if (a.disjunctive !== void 0 && typeof a.disjunctive !== "boolean") fail(`${oWhat}: allowance.disjunctive must be a boolean (OR-limits: whichever exhausts first)`);
          if (a.period !== void 0 && !["day", "month", "once"].includes(a.period)) fail(`${oWhat}: allowance.period is closed to "day" | "month" | "once"`);
          if (a.rollover !== void 0 && typeof a.rollover !== "boolean") fail(`${oWhat}: allowance.rollover must be a boolean`);
          if (a.at_limit !== void 0) assertAtLimit(a.at_limit, `${oWhat}: allowance.at_limit`);
        }
      }
    }
    pricing = Object.freeze({
      model: "metered",
      hardCeiling: p.hardCeiling,
      ...p.unit !== void 0 && { unit: p.unit },
      ...p.price !== void 0 && { price: p.price },
      ...rates !== void 0 && { rates },
      ...binding,
      offers: Object.freeze(offers.map((o) => Object.freeze({ ...o }))),
      offerPath: assertPath(p.offerPath || "/offer", "pricing.offerPath"),
      spendParam: String(p.spendParam || "spend")
    });
  }
  const routes = Object.freeze(
    (Array.isArray(input.routes) ? input.routes : []).map((r) => {
      if (!r || typeof r !== "object") fail("each route is an object { method, path, summary, ... }");
      const method = String(r.method || "GET").toUpperCase();
      if (typeof r.path !== "string" || !r.path.startsWith("/")) fail(`route path must start with "/" (got ${JSON.stringify(r.path)})`);
      if (!r.summary) fail(`route ${method} ${r.path} needs a summary \u2014 the contract is hand-true, not scaffolded`);
      if (r.operationId !== void 0) assertOperationId(r.operationId, `route ${method} ${r.path} operationId`);
      return Object.freeze({
        method,
        path: r.path,
        ...r.operationId !== void 0 && { operationId: r.operationId },
        summary: String(r.summary),
        ...r.description !== void 0 && { description: String(r.description) },
        params: Object.freeze(Array.isArray(r.params) ? r.params.map((x) => Object.freeze({ ...x })) : []),
        ...r.requestBody !== void 0 && { requestBody: r.requestBody },
        ...r.responses !== void 0 && { responses: r.responses }
      });
    })
  );
  let llms;
  if (input.llms && typeof input.llms.body === "string") {
    const body = input.llms.body;
    if (!/^# /m.test(body)) fail("llms.body must be markdown with an H1 (Clause 2)");
    if (/<html|<!doctype/i.test(body)) fail("llms.body must never be HTML (Clause 2)");
    llms = Object.freeze({ body });
  }
  const family = Object.freeze(
    (Array.isArray(input.family) ? input.family : []).map((f) => {
      if (!f || !f.name || !f.origin) fail("each family entry needs { name, origin } (plus role/seams/faces as true)");
      return Object.freeze({
        name: String(f.name),
        origin: String(f.origin).replace(/\/+$/, ""),
        ...f.role !== void 0 && { role: String(f.role) },
        ...f.llms !== void 0 && { llms: String(f.llms) },
        ...f.card !== void 0 && { card: String(f.card) },
        seams: Object.freeze(Array.isArray(f.seams) ? f.seams.map((s) => Object.freeze({ ...s })) : [])
      });
    })
  );
  let mcp;
  if (input.mcp !== void 0) {
    const m = input.mcp;
    const remote = m && typeof m.url === "string";
    const local = m && typeof m.command === "string";
    if (!remote && !local) fail("mcp must be { url, transport, tools } (a mounted door) or { command, args } (an npx-served server) \u2014 or absent");
    if (remote && (!Array.isArray(m.tools) || m.tools.length === 0)) fail("a mounted mcp door declares a non-empty tools array");
    if (Array.isArray(m.tools)) {
      for (const t of m.tools) {
        if (typeof t !== "string") {
          fail(`mcp.tools entries are STRING tool names (axp-ext/rates-g2 \xA71 \u2014 the tool name is the canonical operationId; descriptions and schemas are served live by tools/list) \u2014 got ${JSON.stringify(t)}`);
        }
        assertOperationId(t, "mcp.tools entry");
      }
    }
    mcp = Object.freeze(JSON.parse(JSON.stringify(m)));
  }
  let digitalLink;
  if (input.digitalLink !== void 0) {
    const d = input.digitalLink;
    if (d === null || typeof d !== "object" || Array.isArray(d)) {
      fail("digitalLink must be an object (Appendix A.8.1) \u2014 {} declares the interface at GS1's fixed /.well-known/gs1resolver");
    }
    if (d.wellKnown === void 0) {
      digitalLink = Object.freeze({});
    } else {
      if (typeof d.wellKnown !== "string") fail("digitalLink.wellKnown must be a string URL (Appendix A.8.1)");
      const abs = d.wellKnown.startsWith("/") ? `${origin}${d.wellKnown}` : d.wellKnown;
      let u;
      try {
        u = new URL(abs);
      } catch {
        fail(`digitalLink.wellKnown must be an absolute URL or a same-origin pathname (got ${JSON.stringify(d.wellKnown)})`);
      }
      if (u.origin !== new URL(origin).origin) {
        fail(`digitalLink.wellKnown must be SAME-ORIGIN with the card (Appendix A.8.2 \u2014 a card describes this origin's resolver, never a third party's): ${u.origin} !== ${origin}`);
      }
      if (u.pathname !== "/.well-known/gs1resolver") {
        fail(`digitalLink.wellKnown must address /.well-known/gs1resolver \u2014 GS1 fixes that location (RFC 8615); got ${JSON.stringify(u.pathname)}`);
      }
      digitalLink = Object.freeze({ wellKnown: u.href });
    }
  }
  let testSuite;
  if (input.testSuite !== void 0) {
    const t = input.testSuite;
    if (t === null || typeof t !== "object" || Array.isArray(t)) {
      fail("testSuite must be an object (Appendix A.8.5) \u2014 { digest } plus an address ({ url } and/or { package, version }) at minimum");
    }
    if (t.runner !== void 0 && t.runner !== "api.qa/suite@1" && t.runner !== "api.qa/vitest@1") {
      fail(
        `testSuite.runner is closed to "api.qa/suite@1" | "api.qa/vitest@1" (Appendix A.8.5 \u2014 any other value fails at the verifier, never skips) \u2014 got ${JSON.stringify(t.runner)}`
      );
    }
    const executable = t.runner === "api.qa/vitest@1";
    if (t.url === void 0 && t.package === void 0) {
      fail(
        "testSuite needs an address (Appendix A.8.5): at least one of `url` / `package` \u2014 a suite that names no location and no pin is not a published suite"
      );
    }
    let u;
    if (t.url !== void 0) {
      if (typeof t.url !== "string") {
        fail("testSuite.url must be a string URL (Appendix A.8.5)");
      }
      const abs = t.url.startsWith("/") ? `${origin}${t.url}` : t.url;
      try {
        u = new URL(abs);
      } catch {
        fail(`testSuite.url must be an absolute URL or a same-origin-relative pathname (got ${JSON.stringify(t.url)})`);
      }
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        fail(`testSuite.url must be an http(s) address (got ${JSON.stringify(t.url)})`);
      }
    }
    if (t.package !== void 0) {
      if (typeof t.package !== "string" || !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(t.package)) {
        fail(`testSuite.package must be a valid npm package name (Appendix A.8.6.6) \u2014 got ${JSON.stringify(t.package)}`);
      }
      if (!executable) {
        fail('testSuite.package is meaningful only under runner "api.qa/vitest@1" (Appendix A.8.5 \u2014 a declarative suite has no module to assert identity over)');
      }
      if (typeof t.version !== "string" || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(t.version)) {
        fail(
          "testSuite.version is REQUIRED with testSuite.package and must be an exact published version, never a range (Appendix A.8.5) \u2014 an identity assertion over a moving target asserts nothing"
        );
      }
    } else if (t.version !== void 0) {
      fail("testSuite.version is meaningful only with testSuite.package (Appendix A.8.5)");
    }
    if (t.export !== void 0) {
      if (typeof t.export !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t.export)) {
        fail(`testSuite.export must be the name of a module export (Appendix A.8.5) \u2014 got ${JSON.stringify(t.export)}`);
      }
      if (!executable) {
        fail('testSuite.export is meaningful only under runner "api.qa/vitest@1" (Appendix A.8.5 \u2014 a declarative document has no exports)');
      }
    }
    if (typeof t.digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(t.digest)) {
      fail(
        `testSuite.digest is REQUIRED and must be "sha256:<64 lowercase hex>" over the pinned artifact's exact bytes (Appendix A.8.5.1) \u2014 the digest is the SOLE byte authority in every addressing (A.8.6.6). Unpinned, a surface could rewrite its assertions between advertising them and being held to them.`
      );
    }
    if (t.environment !== void 0 && typeof t.environment !== "string") {
      fail("testSuite.environment must be a string naming one of the suite's environments (Appendix A.8.5)");
    }
    testSuite = Object.freeze({
      ...u !== void 0 && { url: u.href },
      ...t.package !== void 0 && { package: t.package, version: t.version },
      ...t.export !== void 0 && { export: t.export },
      digest: t.digest,
      ...t.environment !== void 0 && { environment: t.environment },
      ...t.runner !== void 0 && { runner: t.runner }
    });
  }
  const familyPath = assertPath(input.familyPath || "/family.json", "familyPath");
  let verifyUrl;
  if (input.verifyUrl !== void 0) {
    if (typeof input.verifyUrl !== "string") fail("verifyUrl must be a string \u2014 an absolute http(s) URL or a same-origin pathname (axp-ext/rates-g2 \xA73)");
    const abs = input.verifyUrl.startsWith("/") ? `${origin}${input.verifyUrl}` : input.verifyUrl;
    let u;
    try {
      u = new URL(abs);
    } catch {
      fail(`verifyUrl must be an absolute URL or a same-origin pathname (got ${JSON.stringify(input.verifyUrl)})`);
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") fail(`verifyUrl must be an http(s) address (got ${JSON.stringify(input.verifyUrl)})`);
    verifyUrl = u.href;
  }
  let g2;
  if (input.g2 !== void 0) {
    if (input.g2 === null || typeof input.g2 !== "object" || Array.isArray(input.g2)) {
      fail("g2 must be a plain object of G2/ICP coordinates (axp-ext/rates-g2 \xA74) \u2014 or absent");
    }
    if (Object.keys(input.g2).length === 0) fail("g2: {} declares nothing \u2014 declare at least one coordinate member or omit g2 (presence-when-true)");
    g2 = Object.freeze(JSON.parse(JSON.stringify(input.g2)));
  }
  const contractOperationIds = [
    collection.operationId,
    "getPricing",
    ...family.length > 0 ? ["getFamilyRegistry"] : [],
    ...pricing.model === "metered" ? ["getOffer"] : [],
    ...routes.filter((r) => r.operationId !== void 0).map((r) => r.operationId)
  ];
  {
    const seen = /* @__PURE__ */ new Set();
    for (const id of contractOperationIds) {
      if (seen.has(id)) fail(`operationId ${JSON.stringify(id)} is declared twice \u2014 one operation, one canonical identifier (axp-ext/rates-g2 \xA71)`);
      seen.add(id);
    }
  }
  const nameable = /* @__PURE__ */ new Set([...contractOperationIds, ...mcp !== void 0 && Array.isArray(mcp.tools) ? mcp.tools : []]);
  if (rates !== void 0) {
    for (const row of rates) {
      if (!nameable.has(row.operation)) {
        fail(
          `pricing.rates row ${JSON.stringify(row.operation)} names an operation this manifest does not declare \u2014 rates[] keys on the canonical operationId (give the route an operationId, or drop the row); declared: ${[...nameable].sort().join(", ")}`
        );
      }
    }
  }
  for (const { ref: ref2, where } of allowanceRefs) {
    if (!nameable.has(ref2)) {
      fail(`${where} references ${JSON.stringify(ref2)} \u2014 an operation this manifest does not declare (A5/G5); declared: ${[...nameable].sort().join(", ")}`);
    }
  }
  const manifest2 = Object.freeze({
    origin,
    name,
    description,
    version: String(input.version || "0.1.0"),
    collection,
    pricing,
    routes,
    ...mcp !== void 0 && { mcp },
    ...digitalLink !== void 0 && { digitalLink },
    ...testSuite !== void 0 && { testSuite },
    ...llms !== void 0 && { llms },
    ...input.docsUrl !== void 0 && { docsUrl: String(input.docsUrl) },
    ...verifyUrl !== void 0 && { verifyUrl },
    ...g2 !== void 0 && { g2 },
    conformanceUrl: String(input.conformanceUrl || `https://api.qa/${name}`),
    ...input.icpUrl !== void 0 && { icpUrl: String(input.icpUrl) },
    ...input.attestationLadder !== void 0 && { attestationLadder: Object.freeze(JSON.parse(JSON.stringify(input.attestationLadder))) },
    family,
    familyPath,
    ...input.home !== void 0 && { home: input.home },
    homeContext: String(input.homeContext || "https://schema.org.ai"),
    knownEmptyQueries: Object.freeze(knownEmptyQueries)
  });
  return manifest2;
}
__name(defineSiteManifest, "defineSiteManifest");
function buildProbes(manifest2) {
  const { collection, pricing, knownEmptyQueries } = manifest2;
  return {
    keyless: { url: collection.path },
    knownEmpty: knownEmptyQueries.map((q) => ({ url: `${collection.path}?${q}` })),
    knownForbidden: collection.blockedScopes.slice(0, 2).map((s) => ({ url: `${collection.path}?scope=${s}` })),
    pricing: { url: "/pricing" },
    ...pricing.model === "metered" && {
      overCeiling: { url: collection.path, param: pricing.spendParam }
    }
  };
}
__name(buildProbes, "buildProbes");

// src/axp-faces/envelope.js
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
function ok(results, { memberName = "results", extra } = {}) {
  return { type: "OK", [memberName]: results, ...extra || {} };
}
__name(ok, "ok");
function empty(message, { memberName = "results" } = {}) {
  return { type: "EMPTY", [memberName]: [], message };
}
__name(empty, "empty");
function blocked(reason) {
  return { type: "BLOCKED", reason };
}
__name(blocked, "blocked");
function offer(o) {
  if (!o || !o.id && !o.title) throw new Error("axp-faces offer: an OFFER carries an id or title");
  if (o.price === void 0 && o.checkoutUrl === void 0 && o.alternatives === void 0) {
    throw new Error("axp-faces offer: an OFFER carries a price, checkoutUrl, or alternatives member");
  }
  return { type: "OFFER", ...o };
}
__name(offer, "offer");
function envelopeResponse(body, { status, headers } = {}) {
  const s = status ?? (body.type === "OK" || body.type === "EMPTY" ? 200 : body.type === "BLOCKED" ? 403 : body.type === "OFFER" ? 402 : 200);
  return new Response(JSON.stringify(body), { status: s, headers: { ...JSON_HEADERS, ...headers || {} } });
}
__name(envelopeResponse, "envelopeResponse");
function collectionDecision(manifest2, searchParams) {
  const { collection, pricing } = manifest2;
  const scope = searchParams.get("scope");
  if (scope !== null && collection.blockedScopes.includes(scope)) {
    return { status: 403, body: blocked(collection.blockedReason(scope)) };
  }
  if (pricing.model === "metered" && searchParams.has(pricing.spendParam)) {
    const spend = Number(searchParams.get(pricing.spendParam));
    if (Number.isFinite(spend) && spend > pricing.hardCeiling) {
      const first = pricing.offers[0];
      return {
        status: 402,
        body: offer({
          ...first.id !== void 0 && { id: first.id },
          ...first.title !== void 0 && { title: first.title },
          ...first.price !== void 0 && { price: first.price },
          ...first.checkoutUrl !== void 0 && { checkoutUrl: first.checkoutUrl },
          ...first.alternatives !== void 0 && { alternatives: first.alternatives },
          message: `requested spend ${spend} exceeds the declared hardCeiling ${pricing.hardCeiling} \u2014 explicit re-authorization required`
        })
      };
    }
  }
  let recs = [...collection.records];
  let filtered = null;
  for (const param of collection.filters) {
    const value = searchParams.get(param);
    if (value !== null) {
      recs = recs.filter((r) => collection.match(r, param, value));
      filtered = [param, value];
    }
  }
  if (recs.length === 0) {
    const [param, value] = filtered || [collection.filters[0], ""];
    return { status: 200, body: empty(collection.emptyMessage(param, value), { memberName: collection.memberName }) };
  }
  return { status: 200, body: ok(recs, { memberName: collection.memberName }) };
}
__name(collectionDecision, "collectionDecision");

// src/axp-faces/conneg.js
var FACES = Object.freeze(["html", "json", "md"]);
var FACE_CONTENT_TYPE = Object.freeze({
  html: "text/html; charset=utf-8",
  json: "application/json; charset=utf-8",
  md: "text/markdown; charset=utf-8"
});
var FACE_MEDIA_TYPE = Object.freeze({
  html: "text/html",
  json: "application/json",
  md: "text/markdown"
});
var EXT_FACE = Object.freeze({ ".html": "html", ".json": "json", ".md": "md" });
var AGENT_UA_TOKENS = Object.freeze([
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-user",
  "claude-searchbot",
  "perplexitybot",
  "perplexity-user",
  "mistralai-user",
  "duckassistbot",
  "bingbot-chat",
  "agent"
]);
var UNFURL_UA_TOKENS = Object.freeze([
  "facebookexternalhit",
  "twitterbot",
  "slackbot",
  "discordbot",
  "whatsapp",
  "linkedinbot",
  "telegrambot",
  "applebot",
  "pinterestbot",
  "skypeuripreview"
]);
var CONNEG_VARY = "Accept, Sec-Fetch-Mode, Sec-Fetch-Dest, User-Agent";
function faceFromExtension(pathname) {
  for (const [ext, face] of Object.entries(EXT_FACE)) {
    if (pathname.endsWith(ext)) return { face, cleanPath: pathname.slice(0, -ext.length) };
  }
  return null;
}
__name(faceFromExtension, "faceFromExtension");
function faceFromAccept(accept) {
  if (!accept) return null;
  const best = { html: null, json: null, md: null };
  const parts = accept.split(",");
  for (let i = 0; i < parts.length; i++) {
    const segs = parts[i].split(";");
    const type = segs[0].trim().toLowerCase();
    let q = 1;
    for (let j = 1; j < segs.length; j++) {
      const m = /^\s*q\s*=\s*([0-9]*\.?[0-9]+)/i.exec(segs[j]);
      if (m) q = parseFloat(m[1]);
    }
    if (!(q > 0)) continue;
    let face = null;
    if (type === "text/html") face = "html";
    else if (type === "application/json" || type === "application/ld+json") face = "json";
    else if (type === "text/markdown") face = "md";
    else if (type === "application/*") face = "json";
    if (face === null) continue;
    if (best[face] === null || q > best[face].q) best[face] = { q, idx: i };
  }
  let chosen = null;
  for (const face of FACES) {
    const b = best[face];
    if (b === null) continue;
    if (chosen === null || b.q > chosen.q || b.q === chosen.q && b.idx < chosen.idx) {
      chosen = { face, q: b.q, idx: b.idx };
    }
  }
  return chosen ? chosen.face : null;
}
__name(faceFromAccept, "faceFromAccept");
function faceFromClientClass(request, { unfurlHtml = true } = {}) {
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");
  if (mode === "navigate" || dest === "document" || dest === "iframe") return "html";
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (unfurlHtml && UNFURL_UA_TOKENS.some((t) => ua.includes(t))) return "html";
  if (AGENT_UA_TOKENS.some((t) => ua.includes(t))) return "md";
  return "json";
}
__name(faceFromClientClass, "faceFromClientClass");
function negotiate(request, pathname, opts = {}) {
  const forced = faceFromExtension(pathname);
  if (forced) return { ...forced, via: "address" };
  const inferred = faceFromAccept(request.headers.get("accept"));
  if (inferred) return { face: inferred, cleanPath: pathname, via: "accept" };
  return { face: faceFromClientClass(request, opts), cleanPath: pathname, via: "client-class" };
}
__name(negotiate, "negotiate");
function faceAddress(cleanPath, face) {
  const ext = face === "html" ? "html" : face === "json" ? "json" : "md";
  if (cleanPath.endsWith("/")) return `${cleanPath}index.${ext}`;
  return `${cleanPath}.${ext}`;
}
__name(faceAddress, "faceAddress");
function linkAlternates(cleanPath, { faces = FACES, addresses } = {}) {
  return faces.map((f) => {
    const href = addresses && addresses[f] || faceAddress(cleanPath, f);
    return `<${href}>; rel="alternate"; type="${FACE_MEDIA_TYPE[f]}"`;
  }).join(", ");
}
__name(linkAlternates, "linkAlternates");
async function resolveFaceBody(source, request, url) {
  const v = typeof source === "function" ? await source(request, url) : source;
  return v;
}
__name(resolveFaceBody, "resolveFaceBody");
async function serveFace(request, url, faces, face, { cleanPath, status = 200, headers, addresses } = {}) {
  const clean = cleanPath ?? url.pathname;
  const source = faces[face];
  const baseHeaders = {
    link: linkAlternates(clean, { faces: FACES.filter((f) => faces[f] !== void 0), addresses }),
    vary: CONNEG_VARY,
    ...headers || {}
  };
  if (source === void 0) {
    return new Response(request.method === "HEAD" ? null : JSON.stringify({ type: "EMPTY", results: [], message: "no such face of this resource" }), {
      status: 404,
      headers: { "content-type": FACE_CONTENT_TYPE.json, vary: CONNEG_VARY }
    });
  }
  const body = await resolveFaceBody(source, request, url);
  if (body instanceof Response) {
    const h = new Headers(body.headers);
    for (const [k, v] of Object.entries(baseHeaders)) h.set(k, v);
    if (!h.get("content-type")) h.set("content-type", FACE_CONTENT_TYPE[face]);
    return new Response(request.method === "HEAD" ? null : body.body, { status: body.status, headers: h });
  }
  const text = face === "json" && typeof body !== "string" ? JSON.stringify(body, null, 2) : String(body);
  return new Response(request.method === "HEAD" ? null : text, {
    status,
    headers: { "content-type": FACE_CONTENT_TYPE[face], ...baseHeaders }
  });
}
__name(serveFace, "serveFace");
async function serveNegotiated(request, url, faces, opts = {}) {
  const { face, cleanPath } = negotiate(request, url.pathname, opts);
  return serveFace(request, url, faces, face, { ...opts, cleanPath });
}
__name(serveNegotiated, "serveNegotiated");

// src/axp-faces/card.js
function httpInterfaces(manifest2) {
  const { origin, collection, pricing, routes, family, familyPath } = manifest2;
  const urls = [
    { method: "GET", url: `${origin}${collection.path}` },
    { method: "GET", url: `${origin}/pricing` },
    { method: "GET", url: `${origin}/openapi.json` },
    { method: "GET", url: `${origin}/llms.txt` }
  ];
  if (family.length > 0) urls.push({ method: "GET", url: `${origin}${familyPath}` });
  if (pricing.model === "metered") urls.push({ method: "GET", url: `${origin}${pricing.offerPath}` });
  for (const r of routes) {
    if (r.method === "GET" && !r.path.includes("{")) urls.push({ method: "GET", url: `${origin}${r.path}` });
  }
  return urls;
}
__name(httpInterfaces, "httpInterfaces");
function buildCard(manifest2) {
  const { origin, name, description, mcp, digitalLink, testSuite, docsUrl, conformanceUrl, icpUrl, verifyUrl, g2, family, familyPath, attestationLadder, pricing } = manifest2;
  return {
    name,
    description,
    interfaces: {
      http: httpInterfaces(manifest2),
      ...mcp !== void 0 && { mcp },
      ...digitalLink !== void 0 && { digitalLink },
      ...testSuite !== void 0 && { testSuite }
    },
    openapi: `${origin}/openapi.json`,
    llms: `${origin}/llms.txt`,
    links: {
      openapi: `${origin}/openapi.json`,
      llms: `${origin}/llms.txt`,
      pricing: `${origin}/pricing`,
      ...docsUrl !== void 0 && { docs: docsUrl },
      ...icpUrl !== void 0 && { icp: icpUrl },
      ...family.length > 0 && { family: `${origin}${familyPath}` },
      /* axp-ext/rates-g2 §3 — the ruled placement: the published runnable-suite
         export rides links.verify, beside links.conformance (the verdict). */
      ...verifyUrl !== void 0 && { verify: verifyUrl },
      conformance: conformanceUrl
    },
    /* axp-ext/rates-g2 §4 — the ruled placement: G2/ICP coordinates as a
       TOP-LEVEL card object, carried verbatim from the manifest. */
    ...g2 !== void 0 && { g2 },
    ...attestationLadder !== void 0 && { attestationLadder },
    ...pricing.model === "metered" && {
      monetization: {
        offers: pricing.offers,
        probe: { method: "GET", url: pricing.offerPath }
      }
    },
    probes: buildProbes(manifest2)
  };
}
__name(buildCard, "buildCard");

// src/axp-faces/openapi.js
var ENVELOPE_SCHEMAS = {
  OkEnvelope: {
    type: "object",
    required: ["type"],
    properties: {
      type: { const: "OK" }
    },
    description: "200 \u2014 substantive content. The collection member name (results/items/events\u2026) is this API's own choice, documented on the operation."
  },
  EmptyEnvelope: {
    type: "object",
    required: ["type", "message"],
    properties: {
      type: { const: "EMPTY" },
      message: { type: "string" }
    },
    description: "200 \u2014 a truthful empty collection, never a bare [] masquerading as data."
  },
  BlockedEnvelope: {
    type: "object",
    required: ["type", "reason"],
    properties: {
      type: { const: "BLOCKED" },
      reason: { type: "string" }
    },
    description: "401/403 \u2014 a permission boundary with a worded reason."
  },
  OfferEnvelope: {
    type: "object",
    required: ["type"],
    properties: {
      type: { const: "OFFER" },
      id: { type: "string" },
      title: { type: "string" },
      price: {},
      checkoutUrl: { type: "string" },
      alternatives: { type: "array" }
    },
    description: "402 \u2014 a payment or ceiling re-authorization boundary; an offer to proceed, never a refusal."
  },
  PricingDocument: {
    type: "object",
    required: ["model"],
    properties: {
      model: { enum: ["free", "metered"] },
      hardCeiling: { type: "number", exclusiveMinimum: 0 },
      unit: { type: "string" },
      price: { type: "number" },
      rates: {
        type: "array",
        items: {
          type: "object",
          required: ["operation"],
          properties: {
            operation: {
              type: "string",
              description: "The canonical camelCase-verb operationId this rate keys on (axp-ext/rates-g2 \xA71) \u2014 the ONE cross-face operation name: OpenAPI operationId = MCP tool name = suite coverage reference = SDK method name = this key."
            },
            price: {
              description: "Scalar amount >= 0, or a \xA72 price object: compound {fixed?, percent?, basis, cap?, floor?, min_fee?} (A1, ad-valorem), {passthrough: {provider, reference?, markup?}} (A2, third-party-owned price plus markup), or {discovery: 'market', reference?, buyer_cap?} (A2, auction/spot). Absent or null ONLY under a non-published `disclosure` (A8).",
              oneOf: [{ type: "number", minimum: 0 }, { type: "object" }, { type: "null" }]
            },
            unit: { type: "string" },
            included: {
              description: 'A5 \u2014 the allowance: quantity, "unlimited", or {qty, period: "day"|"month"|"once", rollover?, at_limit?}. `freeQuota` is the legacy shorthand for {qty, period: "month"} \u2014 never both.'
            },
            freeQuota: { type: "number", exclusiveMinimum: 0 },
            modifiers: {
              type: "array",
              description: "A3 \u2014 relative/derived pricing: [{op: 'multiply'|'add', value, scope?: 'rate'|'offer'|'card', condition?: {attribute, op?, value?}, stacking_order?}]. See also `derived_from`."
            },
            derived_from: { type: "string", description: "A3 \u2014 the rate-card row this row's price derives from (an operationId on this same card)." },
            meter: {
              type: "object",
              description: "G3 lite \u2014 {aggregation: 'sum'|'distinct'|'high-watermark'|'gauge'|'peak', basis?: 'consumed'|'provisioned'|'standing', reset_period?, definition_url?}: how the billable unit aggregates, so identical-looking rows cannot mean bills 10x apart."
            },
            volume_breaks: {
              type: "object",
              description: "A7 \u2014 {mode: 'graduated'|'retroactive'|'reprice-offer' (REQUIRED), basis?: 'units'|'spend'|'instantaneous-rate', breaks: [{from, price|discount_percent}], formula_url?, approximate?}."
            },
            disclosure: {
              enum: ["published", "calculator-only", "quote-only", "undisclosed"],
              description: "A8 \u2014 a meter may exist with its price withheld; 'priced on request' is distinguishable from 'no such meter'. Price may be absent/null only when this is present and not 'published'."
            },
            estimate: { type: "object", description: "A8 \u2014 {low, high, provenance?}: third-party estimate, legal only under a withheld disclosure." },
            note: { type: "string" }
          }
        },
        description: "axp-ext/rates-g2 \xA72 \u2014 the operationId-keyed operation rate card, TOP-LEVEL in the Pricing Document. Additive and descriptive: `model` and `hardCeiling` keep answering Appendix A.2; every row names an operation this origin's own contract declares. Offer-level A4/A5 members (spend_cap, pooled allowances[]) ride monetization.offers. Deferred-amendment names (credits, base_fee, minimum, relations, entitlements, keys, payment, direction, recurrence, effective, eligibility, currencies) are RESERVED."
      },
      binding: {
        type: "boolean",
        description: "Whether published terms bind this price. `model` answers what it costs; `binding` answers whether you can hold us to it. Absent means not declared \u2014 never assume bound."
      },
      statement: {
        type: "string",
        description: "Present when binding is false: the stated intent, in the same words the human pages use."
      },
      termsUrl: {
        type: "string",
        description: "Present when binding is true: the terms document that binds this price."
      },
      ledgerUrl: {
        type: "string",
        description: "Where the open item to bind this price is tracked."
      }
    },
    description: 'AXP Appendix A.2 \u2014 closed model "free" | "metered"; hardCeiling required and > 0 when metered. `binding` is a descriptive member on an axis orthogonal to `model`: binding: true carries termsUrl, binding: false carries statement.'
  }
};
var ref = /* @__PURE__ */ __name((name) => ({ $ref: `#/components/schemas/${name}` }), "ref");
var jsonContent = /* @__PURE__ */ __name((schema) => ({ "application/json": { schema } }), "jsonContent");
function buildOpenapi(manifest2) {
  const { origin, name, description, version, collection, pricing, routes, family, familyPath } = manifest2;
  const collectionParams = [
    ...collection.filters.map((f) => ({
      name: f,
      in: "query",
      required: false,
      schema: { type: "string" },
      description: `filter the collection by ${f}; a non-matching value answers a typed 200 EMPTY, never a fake success`
    })),
    {
      name: "scope",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: `reserved scopes (${collection.blockedScopes.join(", ")}) answer a typed 403 BLOCKED`
    }
  ];
  if (pricing.model === "metered") {
    collectionParams.push({
      name: pricing.spendParam,
      in: "query",
      required: false,
      schema: { type: "number" },
      description: `requested spend in the same unit as hardCeiling (${pricing.hardCeiling}); above the ceiling answers a typed 402 OFFER re-authorization boundary`
    });
  }
  const paths = {
    [collection.path]: {
      get: {
        operationId: collection.operationId || "listCollection",
        summary: collection.summary,
        description: `The keyless, branching collection (AXP Clauses 4 + 7): plain GET answers 200 OK with substantive typed content to an anonymous caller; a non-matching filter answers 200 EMPTY; a reserved scope answers 403 BLOCKED. Collection member name: "${collection.memberName}".`,
        parameters: collectionParams,
        responses: {
          200: { description: "OK or EMPTY envelope", content: jsonContent({ oneOf: [ref("OkEnvelope"), ref("EmptyEnvelope")] }) },
          403: { description: "BLOCKED envelope", content: jsonContent(ref("BlockedEnvelope")) },
          ...pricing.model === "metered" && {
            402: { description: "OFFER envelope \u2014 the hard-ceiling re-authorization boundary", content: jsonContent(ref("OfferEnvelope")) }
          }
        }
      }
    },
    "/pricing": {
      get: {
        operationId: "getPricing",
        summary: "The Pricing Document (AXP Appendix A.2)",
        description: (pricing.model === "free" ? 'This API is free: {"model":"free"} \u2014 the declaration itself is the obligation (the no-ask-zone law).' : `This API is metered with a hard ceiling of ${pricing.hardCeiling}${pricing.unit ? ` (${pricing.unit})` : ""}; the caller can never be metered past it without explicit re-authorization.`) + (pricing.binding === false ? " This price is NOT bound by published terms: it is a stated intent, and the document says so in its `binding` and `statement` members. Budget against it; do not contract on it." : pricing.binding === true ? ` This price IS bound by published terms at ${pricing.termsUrl}.` : ""),
        responses: {
          200: { description: "the Pricing Document", content: jsonContent(ref("PricingDocument")) }
        }
      }
    }
  };
  if (family.length > 0) {
    paths[familyPath] = {
      get: {
        operationId: "getFamilyRegistry",
        summary: "The family registry \u2014 sibling properties and their seams as typed edges",
        description: "Lists the sibling doors of this property's family so an agent at this door discovers the others as contracts, not links.",
        responses: { 200: { description: "the family registry", content: jsonContent({ type: "object" }) } }
      }
    };
  }
  if (pricing.model === "metered") {
    paths[pricing.offerPath] = {
      get: {
        operationId: "getOffer",
        summary: "The offer boundary (AXP Appendix A.5)",
        description: "Always answers 402 with a typed OFFER body \u2014 the machine-readable start of the paid conversation.",
        responses: {
          402: { description: "OFFER envelope", content: jsonContent(ref("OfferEnvelope")) }
        }
      }
    };
  }
  for (const r of routes) {
    const method = r.method.toLowerCase();
    paths[r.path] = paths[r.path] || {};
    paths[r.path][method] = {
      /* axp-ext/rates-g2 §1 — operationId passthrough on every route: the
         canonical cross-face operation name lands on the contract verbatim. */
      ...r.operationId !== void 0 && { operationId: r.operationId },
      summary: r.summary,
      ...r.description !== void 0 && { description: r.description },
      ...r.params.length > 0 && { parameters: r.params.map((p) => ({ in: "query", required: false, schema: { type: "string" }, ...p })) },
      ...r.requestBody !== void 0 && { requestBody: r.requestBody },
      responses: r.responses || { 200: { description: "OK" } }
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: name,
      version,
      description
    },
    servers: [{ url: origin }],
    paths,
    components: { schemas: ENVELOPE_SCHEMAS }
  };
}
__name(buildOpenapi, "buildOpenapi");

// src/axp-faces/pricing.js
function bindingMembers(p) {
  if (p.binding === void 0) return {};
  return {
    binding: p.binding,
    ...p.statement !== void 0 && { statement: p.statement },
    ...p.termsUrl !== void 0 && { termsUrl: p.termsUrl },
    ...p.ledgerUrl !== void 0 && { ledgerUrl: p.ledgerUrl }
  };
}
__name(bindingMembers, "bindingMembers");
function ratesMembers(p) {
  return p.rates !== void 0 ? { rates: p.rates } : {};
}
__name(ratesMembers, "ratesMembers");
function buildPricingDocument(manifest2) {
  const p = manifest2.pricing;
  if (p.model === "free") return { model: "free", ...ratesMembers(p), ...bindingMembers(p) };
  return {
    model: "metered",
    hardCeiling: p.hardCeiling,
    ...p.unit !== void 0 && { unit: p.unit },
    ...p.price !== void 0 && { price: p.price },
    ...ratesMembers(p),
    ...bindingMembers(p)
  };
}
__name(buildPricingDocument, "buildPricingDocument");

// src/axp-faces/llms.js
function llmsTail(manifest2) {
  const { origin, conformanceUrl, icpUrl, docsUrl, family, familyPath } = manifest2;
  const lines = [
    "## Machine surfaces",
    "",
    `- Capability card (AXP probe manifest): ${origin}/.well-known/agents.json`,
    `- OpenAPI 3.1 contract: ${origin}/openapi.json`,
    `- Pricing Document: ${origin}/pricing`,
    ...icpUrl !== void 0 ? [`- icp.json (agent classes): ${icpUrl}`] : [],
    ...docsUrl !== void 0 ? [`- Documentation: ${docsUrl}`] : [],
    ...family.length > 0 ? [`- Family registry (sibling doors as typed edges): ${origin}${familyPath}`] : [],
    `- This file: ${origin}/llms.txt`,
    `- Conformance (independent verifier): ${conformanceUrl}`
  ];
  if (family.length > 0) {
    lines.push("", "## The family", "");
    for (const f of family) {
      lines.push(`- ${f.name}${f.role ? ` \u2014 ${f.role}` : ""}: ${f.origin}/`);
    }
  }
  return lines.join("\n") + "\n";
}
__name(llmsTail, "llmsTail");
function buildLlmsTxt(manifest2) {
  if (!manifest2.llms) {
    throw new Error("axp-faces llms: manifest.llms.body is not declared \u2014 serve your static llms.txt and append llmsTail(manifest) at build time instead");
  }
  return manifest2.llms.body.trimEnd() + "\n\n" + llmsTail(manifest2);
}
__name(buildLlmsTxt, "buildLlmsTxt");

// src/axp-faces/family.js
function buildFamilyRegistry(manifest2) {
  const { origin, name, description, homeContext, family, familyPath } = manifest2;
  return {
    $context: homeContext,
    $type: "FamilyRegistry",
    $id: `${origin}${familyPath}`,
    self: {
      name,
      origin,
      description,
      llms: `${origin}/llms.txt`,
      card: `${origin}/.well-known/agents.json`,
      openapi: `${origin}/openapi.json`,
      pricing: `${origin}/pricing`
    },
    siblings: family.map((f) => ({
      rel: "sibling",
      name: f.name,
      origin: f.origin,
      ...f.role !== void 0 && { role: f.role },
      ...f.llms !== void 0 && { llms: f.llms },
      ...f.card !== void 0 && { card: f.card },
      ...f.seams.length > 0 && { seams: f.seams }
    }))
  };
}
__name(buildFamilyRegistry, "buildFamilyRegistry");

// src/axp-faces/routes.js
var JSON_CT = { "content-type": "application/json; charset=utf-8" };
var MD_CT = { "content-type": "text/markdown; charset=utf-8" };
function jsonResponse(obj, { head = false, status = 200, headers } = {}) {
  return new Response(head ? null : JSON.stringify(obj, null, 2), { status, headers: { ...JSON_CT, ...headers || {} } });
}
__name(jsonResponse, "jsonResponse");
function mdOfJson(title, obj) {
  return `# ${title}

\`\`\`json
${JSON.stringify(obj, null, 2)}
\`\`\`
`;
}
__name(mdOfJson, "mdOfJson");
function htmlOfJson(title, obj) {
  const esc = /* @__PURE__ */ __name((s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), "esc");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body><h1>${esc(title)}</h1><pre>${esc(JSON.stringify(obj, null, 2))}</pre></body></html>
`;
}
__name(htmlOfJson, "htmlOfJson");
function createAxpRoutes(manifest2, opts = {}) {
  const card = buildCard(manifest2);
  const openapiDoc = buildOpenapi(manifest2);
  const pricingDoc = buildPricingDocument(manifest2);
  const familyDoc = manifest2.family.length > 0 ? buildFamilyRegistry(manifest2) : void 0;
  const llmsTxt = manifest2.llms ? buildLlmsTxt(manifest2) : void 0;
  const routePaths = /* @__PURE__ */ new Set([
    "/.well-known/agents.json",
    "/openapi.json",
    "/pricing",
    "/pricing.json",
    "/pricing.md",
    "/pricing.html",
    manifest2.collection.path,
    ...llmsTxt !== void 0 ? ["/llms.txt"] : [],
    ...familyDoc !== void 0 ? [manifest2.familyPath] : [],
    ...manifest2.pricing.model === "metered" ? [manifest2.pricing.offerPath] : [],
    ...manifest2.home !== void 0 ? ["/", "/index.html", "/index.json", "/index.md"] : []
  ]);
  const pricingFaces = {
    json: pricingDoc,
    md: mdOfJson(`${manifest2.name} \u2014 pricing`, pricingDoc),
    html: htmlOfJson(`${manifest2.name} \u2014 pricing`, pricingDoc)
  };
  return /* @__PURE__ */ __name(async function axpRoutes2(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!routePaths.has(path)) return void 0;
    if (request.method !== "GET" && request.method !== "HEAD") {
      return envelopeResponse(
        { type: "BLOCKED", reason: `method ${request.method} is not served at ${path} \u2014 this address answers GET and HEAD` },
        { status: 405, headers: { allow: "GET, HEAD" } }
      );
    }
    const head = request.method === "HEAD";
    switch (path) {
      case "/.well-known/agents.json":
        return jsonResponse(card, { head });
      case "/openapi.json":
        return jsonResponse(openapiDoc, { head });
      case "/pricing":
      case "/pricing.json":
      case "/pricing.md":
      case "/pricing.html": {
        const { face } = negotiate(request, path, opts);
        return serveFace(request, url, pricingFaces, face, { cleanPath: "/pricing" });
      }
      case "/llms.txt":
        return new Response(head ? null : llmsTxt, { status: 200, headers: MD_CT });
      case manifest2.collection.path: {
        const { status, body } = collectionDecision(manifest2, url.searchParams);
        return new Response(head ? null : JSON.stringify(body), { status, headers: { ...JSON_CT, vary: "accept" } });
      }
    }
    if (familyDoc !== void 0 && path === manifest2.familyPath) {
      return jsonResponse(familyDoc, { head });
    }
    if (manifest2.pricing.model === "metered" && path === manifest2.pricing.offerPath) {
      const body = offer({ ...manifest2.pricing.offers[0] });
      return new Response(head ? null : JSON.stringify(body), { status: 402, headers: JSON_CT });
    }
    if (manifest2.home !== void 0) {
      const homeFaces = normalizeHomeFaces(manifest2);
      if (path === "/") {
        const { face } = negotiate(request, "/", opts);
        return serveFace(request, url, homeFaces, face, { cleanPath: "/" });
      }
      const forced = path === "/index.html" ? "html" : path === "/index.json" ? "json" : "md";
      return serveFace(request, url, homeFaces, forced, { cleanPath: "/" });
    }
    return void 0;
  }, "axpRoutes");
  function normalizeHomeFaces(m) {
    const h = m.home;
    return {
      html: h.html,
      md: h.md,
      json: h.json !== void 0 ? h.json : {
        // the JSON face SHOULD be JSON-LD with a resolvable context (A.7.1)
        $context: m.homeContext,
        $type: "API",
        $id: `${m.origin}/`,
        name: m.name,
        description: m.description,
        llms: `${m.origin}/llms.txt`,
        card: `${m.origin}/.well-known/agents.json`,
        openapi: `${m.origin}/openapi.json`,
        pricing: `${m.origin}/pricing`,
        collection: `${m.origin}${m.collection.path}`
      }
    };
  }
  __name(normalizeHomeFaces, "normalizeHomeFaces");
}
__name(createAxpRoutes, "createAxpRoutes");

// src/seed.js
var HMDA_API = "https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations";
var OBSERVED = "2026-08-23";
function hmdaRecord({ state, purpose, purposeCode, count, volumeUSD }) {
  return {
    $type: "LenderMarketRecord",
    id: `hmda-2024-${state.toLowerCase()}-${purpose.toLowerCase().replace(/\s+/g, "-")}`,
    state,
    year: 2024,
    actionTaken: "originated",
    loanPurpose: purpose,
    originationCount: count,
    loanVolumeUSD: volumeUSD,
    binding: "ingested",
    provenance: {
      source: "FFIEC HMDA Data Browser API \u2014 aggregations (public data)",
      url: `${HMDA_API}?states=${state}&years=2024&actions_taken=1&loan_purposes=${purposeCode}`,
      observedAt: OBSERVED
    }
  };
}
__name(hmdaRecord, "hmdaRecord");
var lenderMarketRecords = [
  hmdaRecord({ state: "CA", purpose: "Home purchase", purposeCode: 1, count: 261993, volumeUSD: 182895805e3 }),
  hmdaRecord({ state: "CA", purpose: "Refinancing", purposeCode: 31, count: 62335, volumeUSD: 50129165e3 }),
  hmdaRecord({ state: "FL", purpose: "Home purchase", purposeCode: 1, count: 299894, volumeUSD: 12023287e4 }),
  hmdaRecord({ state: "FL", purpose: "Refinancing", purposeCode: 31, count: 35203, volumeUSD: 18213075e3 }),
  hmdaRecord({ state: "ID", purpose: "Home purchase", purposeCode: 1, count: 25840, volumeUSD: 998603e4 }),
  hmdaRecord({ state: "ID", purpose: "Refinancing", purposeCode: 31, count: 4430, volumeUSD: 17334e5 }),
  hmdaRecord({ state: "NY", purpose: "Home purchase", purposeCode: 1, count: 115407, volumeUSD: 56326435e3 }),
  hmdaRecord({ state: "NY", purpose: "Refinancing", purposeCode: 31, count: 19878, volumeUSD: 1730821e4 }),
  hmdaRecord({ state: "TX", purpose: "Home purchase", purposeCode: 1, count: 360296, volumeUSD: 12921585e4 }),
  hmdaRecord({ state: "TX", purpose: "Refinancing", purposeCode: 31, count: 40917, volumeUSD: 21189015e3 })
];
var EXAMPLE_NOTE = "example data \u2014 synthetic MISMO-flavored sandbox seed over fictional lenders, labeled per estate fixture law";
var loanFiles = [
  {
    $type: "LoanFile",
    id: "lf-0001",
    loanIdentifier: "EXAMPLEULI0000000000LF0001",
    lender: { name: "Example Mortgage Bank (fictional demo lender)" },
    loanPurposeType: "Purchase",
    loanStatus: "Application",
    baseLoanAmountUSD: 412e3,
    noteRatePercent: 6.375,
    amortizationType: "Fixed",
    loanTermMonths: 360,
    propertyUsageType: "PrimaryResidence",
    propertyState: "ID",
    example: true,
    note: EXAMPLE_NOTE
  },
  {
    $type: "LoanFile",
    id: "lf-0002",
    loanIdentifier: "EXAMPLEULI0000000000LF0002",
    lender: { name: "Example Mortgage Bank (fictional demo lender)" },
    loanPurposeType: "Purchase",
    loanStatus: "Processing",
    baseLoanAmountUSD: 287500,
    noteRatePercent: 6.5,
    amortizationType: "Fixed",
    loanTermMonths: 360,
    propertyUsageType: "PrimaryResidence",
    propertyState: "TX",
    example: true,
    note: EXAMPLE_NOTE
  },
  {
    $type: "LoanFile",
    id: "lf-0003",
    loanIdentifier: "EXAMPLEULI0000000000LF0003",
    lender: { name: "Example Home Loans (fictional demo lender)" },
    loanPurposeType: "Purchase",
    loanStatus: "Underwriting",
    baseLoanAmountUSD: 655e3,
    noteRatePercent: 6.125,
    amortizationType: "AdjustableRate",
    adjustmentPeriod: "5/1",
    loanTermMonths: 360,
    propertyUsageType: "SecondHome",
    propertyState: "FL",
    example: true,
    note: EXAMPLE_NOTE
  },
  {
    $type: "LoanFile",
    id: "lf-0004",
    loanIdentifier: "EXAMPLEULI0000000000LF0004",
    lender: { name: "Example Home Loans (fictional demo lender)" },
    loanPurposeType: "Refinance",
    loanStatus: "ClearToClose",
    baseLoanAmountUSD: 331e3,
    noteRatePercent: 5.99,
    amortizationType: "Fixed",
    loanTermMonths: 240,
    propertyUsageType: "PrimaryResidence",
    propertyState: "CA",
    example: true,
    note: EXAMPLE_NOTE
  },
  {
    $type: "LoanFile",
    id: "lf-0005",
    loanIdentifier: "EXAMPLEULI0000000000LF0005",
    lender: { name: "Example Correspondent Funding (fictional demo lender)" },
    loanPurposeType: "Refinance",
    loanStatus: "Closed",
    baseLoanAmountUSD: 198750,
    noteRatePercent: 6.25,
    amortizationType: "Fixed",
    loanTermMonths: 180,
    propertyUsageType: "Investment",
    propertyState: "NY",
    example: true,
    note: EXAMPLE_NOTE
  },
  {
    $type: "LoanFile",
    id: "lf-0006",
    loanIdentifier: "EXAMPLEULI0000000000LF0006",
    lender: { name: "Example Correspondent Funding (fictional demo lender)" },
    loanPurposeType: "Purchase",
    loanStatus: "Closed",
    baseLoanAmountUSD: 523e3,
    noteRatePercent: 6.625,
    amortizationType: "Fixed",
    loanTermMonths: 360,
    propertyUsageType: "PrimaryResidence",
    propertyState: "CA",
    example: true,
    note: EXAMPLE_NOTE
  }
];

// src/projection.js
var projection = {
  substrate: "mortgage",
  brand: "apis.mortgage",
  domains: ["apis.mortgage"],
  /** G2 coordinates (exposed on the machine face at /icp.json). */
  icp: {
    industry: "NAICS 522292 (real estate credit / mortgage banking)",
    companyTypes: ["independent mortgage bank", "mortgage broker", "servicer", "correspondent lender"],
    jobTypes: ["lender ops / secondary marketing", "loan processor", "closer", "developer at a lender-systems vendor"]
  },
  personas: [
    { id: "record-agent", description: "an autonomous agent pulling MISMO-typed loan-file records and HMDA market records mid-task" },
    { id: "secondary-marketing", description: "lender ops / secondary-marketing analyst reading market records by state, year, and purpose" },
    { id: "lender-systems-developer", description: "integrates loan-file records into lender or vendor systems" }
  ],
  /** The row's named agent motion: "agents pulling loan-file and market
   *  records (B2A)". B2A: no OAuth, no credit card on file; the #17 ladder
   *  is the only path. Machine identity via id.org.ai; settlement via 402. */
  motion: "B2A",
  /** Offer = shape × price × gate, drawn only from the B2A permissible set
   *  (§5.1). Rungs 1–3 are 402-shaped stubs in wave zero — advertised as
   *  stubs on the OFFER body, never as live doors. */
  offer: [
    { shape: "anon-sandbox", rung: 0, price: 0, gate: "none \u2014 keyless" },
    {
      shape: "earned-credits",
      rung: 1,
      price: "earned",
      gate: ".ax-ledger proof-of-work",
      status: "stub \u2014 ledger not wired in wave zero"
    },
    {
      shape: "human-claimed",
      rung: 2,
      price: 0,
      gate: "human claims the agent pipeline",
      status: "stub \u2014 claim door not wired in wave zero"
    },
    {
      shape: "paid-metered",
      rung: 3,
      price: 2e-4,
      unit: "USD/call",
      gate: "402 metering on machine identity (id.org.ai)",
      status: "stub \u2014 test-mode; 402-shaped boundary served, no live settlement"
    }
  ],
  pricing: { pattern: "402-metered-per-call", rateCardRef: "/pricing" },
  /** No "agent default" claim: the §4.6 worthiness bar (hosted verdict +
   *  live anon sandbox + verified published suite) has not been attested. */
  positioning: "the loan file and the mortgage market record as typed keyless doors \u2014 MISMO-typed documents and HMDA-derived market data over the mortgage substrate",
  mdx: null,
  // wave zero serves a minimal generated landing; per-brand MDX defers to extraction (§7.3)
  /** §6.2 experiment registration. */
  experiment: {
    pattern: "402-metered-per-call",
    motion: "B2A",
    shapes: ["anon-sandbox", "earned-credits", "human-claimed", "paid-metered"],
    rateCardRef: "/pricing",
    startDate: "2026-08-23",
    hypothesis: "a keyless MISMO/HMDA record floor with a 402-shaped paid rung converts returning agent identities to metered calls once settlement activates",
    /** §9.1 box 16 — door-A registration (own act): one row in
     *  packages/rail-ledger/registry/faces.json on ax draft/rail-ledger-v1
     *  @ ef4d688 ({apis.mortgage, mortgage, B2A, 402-metered-per-call,
     *  test-mode}); readout at the live ledger. */
    railLedger: "https://ledger.apis.ax/faces?face=apis.mortgage"
  },
  /** §5.1 B2A2B check: the row's ICP includes non-technical principals
   *  (processors, closers, lender ops). The register already HOLDS
   *  human-vocabulary counterpart names for exactly those occupations —
   *  recorded here as candidates, never asserted; activation is triggered by
   *  the §9.3 agent-referred-human-traffic signal, named per #3. */
  counterpartBrand: {
    candidates: ["closers.mortgage", "processors.mortgage"],
    status: "candidates recorded \u2014 held occupational doors, nothing serving today; triggered by the \xA79.3 diagnostic, not pre-launched"
  },
  /** Shared-face collision record (no projection-primacy ruling found):
   *  ~/projects/ax/packages/api.mortgage is an ADR-0020 directory data home
   *  on the singular twin. This projection claims only apis.mortgage. */
  collisions: [
    {
      name: "api.mortgage",
      where: "~/projects/ax/packages/api.mortgage",
      nature: "ADR-0020 directory data home on the singular twin; api.mortgage (singular) is not held per the register",
      resolution: "built under row key `mortgage` as apis.mortgage; the shared face is not claimed"
    }
  ]
};

// src/landing.js
var LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>apis.mortgage: the headless mortgage system of record. Machine face live.</title>
<meta name="description" content="The headless mortgage system of record: loan files, market records and pipelines as typed, keyless doors, priced on a posted rate card. The licensed operator brings the license; the software holds the record. Payoff, lien and eNote rows are ROADMAP and post to the waitlist first.">
<meta property="og:site_name" content="apis.mortgage">
<meta property="og:title" content="Agents can\u2019t originate a mortgage. Neither can most software. Both will reach the company that holds the file through apis.mortgage.">
<meta property="og:description" content="The headless mortgage system of record: loan files, market records and pipelines as typed, keyless doors. The licensed operator brings the license; the software holds the record. Payoff, lien and eNote rows are ROADMAP. Waitlist open.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://apis.mortgage">
<meta property="og:image" content="https://apis.mortgage/og.png">
<meta property="og:image:alt" content="A register of three ROADMAP surfaces and two reserved entries under a WAITLIST stamp, above the category line payoff, lien and eNote data. Headline: Agents can\u2019t originate a mortgage. Neither can most software. Both will reach the company that holds the file through apis.mortgage.">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://apis.mortgage">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Piazzolla:opsz,wght@8..30,400;8..30,500;8..30,600&family=Sometype+Mono&display=swap" rel="stylesheet">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"apis.mortgage","url":"https://apis.mortgage","description":"The headless mortgage system of record: loan files, market records and pipelines as typed, keyless doors, priced on a posted rate card. The licensed operator brings the license; the software holds the record. Payoff, lien and eNote rows are ROADMAP and post to the waitlist first."}
<\/script>
<style>
/* ============================================================
   apis.mortgage \xB7 THE RESERVED MARGIN (DESIGN.md Part IV)

   TWO MATERIALS, AND THE PAGE IS THE SCENE PART IV WRITES.

   Ground  = the recorder's counter, limestone, warm buff stone.
   Figure  = the unexecuted security instrument, warm near-white
             stock LYING ON the counter: its own edge, the leaf
             beneath it, and the cast that edge throws.
   Ruling  = drawn in the stock's own hue, so every rule on the
             instrument is the same material as the instrument.
   Seal    = oxblood, and oxblood only where DESIGN.md puts it,
             which makes it the page's ONE chromatic event.

   M56 (2026-08-02) SUPERSEDED M14 and M38 and built the counter.
   M57 (2026-08-02, same file, on the second design review) does
   two things M56 left undone.

   ONE HUE FAMILY, NOT THREE. M56 warmed the stock and left every
   rule and the counter itself on hue 250, so the page was warm
   paper carrying a cool ruling on a cool desk: measured by area,
   the navy rule ink covered 0.49% of the page against oxblood's
   0.22%, and the accent was outweighed 2:1 by a hue nobody had
   chosen. Paper, ruling and counter are now one family (hue 40 to
   45) and oxblood is the only departure from it. Limestone is a
   warm stone; the cool desk was the default, not the decision.

   FIVE STOCKS, NOT THREE, AND FOUR OF THEM INSIDE THE SHEET.
   M56's whole in-page range was 0.965 -> 0.910 -> 0.893: three
   near-identical creams, so the reading column was ONE flat
   surface for its entire 6,000px and the only real value step on
   the page was the desk OUTSIDE the instrument. The sheet now
   carries recessed stock under the objects that are instruments
   (the two schedules, the docket, the register's own bands) and a
   distinct ground under the operative provision, at a measured
   spread of 0.107 OKLCH between the base sheet and --sheet-4 and
   0.150 down to --sheet-5.
   ============================================================ */
:root{
  color-scheme: light;

  /* ---- MATERIAL 1 \xB7 the counter (limestone, warm buff, hue 45) ---- */
  --counter:oklch(0.700 0.014 45);        /* rgb(166,156,151) relLum 0.341 */
  --counter-cast:oklch(0.530 0.020 45);   /* rgb(118,104,98)  relLum 0.147 */

  /* ---- MATERIAL 2 \xB7 the instrument (warm stock, hue 40), FIVE STOCKS.
     Every one of them is a surface a reader can see the edge of, and each
     names the class of object that lies on it:
       --sheet    the sheet itself, and the face of anything laid ON it
       --sheet-2  a BAND that runs the sheet's width: the reserved margin,
                  the operative provision's ground, the footer
       --sheet-3  a RECESSED INSTRUMENT quoted inside the document: the two
                  schedules' bodies, the docket's message, the register's
                  own annotation bands
       --sheet-4  the HEAD of a recessed instrument, and the two bounded
                  prose fields: table head bands, the gate schedule, the
                  honest limit, the register's recording foot
       --sheet-5  the deepest stock on the sheet and the smallest by area:
                  the docket's envelope band. Mono chrome only: no primary
                  text, no link and no hairline is ever drawn on it.

     AND THE FIFTH STOCK'S BAN IS A PRICE, WITH THE NUMBERS THAT SET IT (M62.2).
     --sheet-5 is the one ground on this sheet three of its own ink pairings
     cannot stand on: --ink measures 10.43 against this file's 12 floor, --ink-2
     6.45 against 7, --seal 6.12 against 6.5, and --rule-hair 1.15, which is not
     a hairline but an absence. What may stand on it is MONO CHROME at the 4.5
     floor, which is what the envelope band carries at 6.45. The ground is not
     lifted to clear the three, because clearing them puts it at 0.858, which IS
     --sheet-4: the fifth stock would stop existing and the envelope band would
     lose the one value step that makes it read as an envelope. The ladder is the
     design and the ban is what the bottom rung costs. It had been written here
     and in BUILD-SPEC-mortgage.md since M57 and read by nothing; scripts/check.mjs
     \xA711(m2) now fails the build if this ground spreads past the envelope band or
     if any of the three is ever drawn on it. ---- */
  --sheet:oklch(0.965 0.006 40);          /* rgb(247,242,240) relLum 0.897 */
  --sheet-2:oklch(0.928 0.010 40);        /* rgb(238,229,226) relLum 0.797 */
  --sheet-3:oklch(0.886 0.014 40);        /* rgb(226,215,211) relLum 0.693 */
  --sheet-4:oklch(0.858 0.017 40);        /* rgb(219,205,200) relLum 0.628 */
  --sheet-5:oklch(0.815 0.020 40);        /* rgb(207,191,185) relLum 0.538 */
  --sheet-cast:oklch(0.700 0.024 40);     /* the cast inside the warm world  */

  /* ---- THE RULE HIERARCHY \xB7 three weights, three jobs, and no fourth.
     W3  --rule-frame 2px   THE INSTRUMENT FRAME. An object that is itself
                            an instrument: the register, the recording stamp
                            box, the docket, \xA73's operative rules, the two
                            tables, the footer's opening rule.
     W2  --rule-mid   1px   THE FIELD DIVISION. A division INSIDE a framed
                            object, the reserved margin's own edge, every
                            section's closing rule, the two bounded fields.
     W1  --rule-hair  1px   THE HAIRLINE. Every recording line, every table
                            body row, every schedule row. The quietest mark
                            on the sheet, and the one the blanks are drawn in.
     A rule that cannot be named in one of those three sentences does not
     get drawn. This is the named deliverable of the 2026-08-02 pass.
     M57: all three are on the stock's own hue. A hairline at 0.845 was also
     invisible on recessed stock, so the weights are re-set against the
     DEEPEST ground each is drawn on rather than against the base sheet. ---- */
  --rule-hair:oklch(0.775 0.017 40);
  --rule-mid:oklch(0.635 0.024 40);
  --rule-frame:oklch(0.415 0.030 40);

  /* ---- THE INK \xB7 warm document ink, and the sheet's only text.
     M57 re-sets all three against --sheet-4, the deepest ground any of them
     is set on, rather than against the base sheet: primary 12.04, body 7.45,
     mono 5.57, all measured as real sRGB ratios. ---- */
  --ink:oklch(0.188 0.027 35);
  --ink-2:oklch(0.348 0.030 35);
  --ink-3:oklch(0.418 0.026 35);

  /* ---- THE SEAL \xB7 oxblood, hue 25 (Part IV stamp theology) ---- */
  --seal:oklch(0.372 0.115 25);
  --seal-deep:oklch(0.302 0.100 25);
  --seal-ring:oklch(0.445 0.120 25);
  --paper-on-seal:oklch(0.965 0.010 40);

  --serif:'Piazzolla',Charter,'Bitstream Charter',Georgia,serif;
  --mono:'Sometype Mono',ui-monospace,'SF Mono',Menlo,monospace;

  /* M56: THE opsz AXIS IS WORKED. Piazzolla runs 8..30 and the sheet had been
     setting every tier at 28, so the body was a display cut at reading size and
     the headline was a reading cut at display size. The axis now does the register
     work Part IV's type table says it does: 30 at the headline (fine joins, high
     contrast, tight fit), 26 at section heads, 20 at the two display fields, 11 in
     body prose and 9 in small serif, where the cut opens up and thickens. */
  --text-body:clamp(1.0625rem,1rem + 0.3vw,1.1875rem);
  --text-clause:clamp(1.35rem,1.25rem + 0.6vw,1.75rem);
  --text-h2:clamp(1.75rem,1.6rem + 1.15vw,2.6rem);
  --text-h1:clamp(2.05rem,1.2rem + 2.75vw,3.5rem);
  --text-mono:clamp(0.8125rem,0.79rem + 0.15vw,0.9rem);
  --text-small:0.875rem;
  --text-fine:0.8125rem;

  --space-section:clamp(4.5rem,3rem + 6vw,7.5rem);
  --space-block:clamp(1.75rem,1.4rem + 1.5vw,3rem);
  --space-row:clamp(0.9rem,0.8rem + 0.5vw,1.35rem);

  --quart:cubic-bezier(0.25,1,0.5,1);
  --expo:cubic-bezier(0.16,1,0.3,1);

  /* THE SHEET ON THE COUNTER. The instrument does not fill the window: it is a
     sheet of a size, lying on a counter that is larger than it. \`--reveal\` is how
     much counter shows on each side, and it is never zero, at any width. */
  /* The instrument is a sheet of a size, and the counter is larger than it. The
     sheet stops growing at 76rem, so past that width it is the COUNTER that
     grows, which is what a document on a counter does when you step back from it.
     \`--edge\` is the offset of the leaf under it and of the cast that leaf throws;
     both are always smaller than \`--reveal\`, so the stack never reaches the
     window's own edge at any width. */
  --sheet-max:76rem;
  /* M57 opens the phone crop. At 390 the reveal measured 8px and the edge 3px,
     so the scene the whole material argument rests on was a hairline nobody
     could see on the device most readers arrive on. */
  --reveal:clamp(0.85rem,3vw,1.25rem);
  --edge:clamp(4px,0.7vw,6px);
  --margin-w:0rem;
  --colgap:clamp(2rem,3vw,3rem);
  --gutter:clamp(1rem,3.4vw,2.75rem);

  /* THE TERMINATION LAW (M37, unchanged in substance). A rule ends where the
     thing it rules ends, and there are two kinds of thing on this sheet: the
     DOCUMENT's fields, set at --measure (body) or --measure-clause (display),
     and the SHEET's own furniture, which runs the instrument's full width and
     terminates on the reserved margin. */
  --measure:38rem;
  --measure-clause:50rem;
  --rule-reach:0px;
  --hero-reach:0px;

  /* M59: THE REGISTER IS A FIXED MEASURE, NOT A PROPORTIONAL REMAINDER. Through
     M58 the object's inline insets inside the fixed 272px margin were authored as
     \`clamp(1.1rem,1.9vw,1.9rem)\`, so the most produced object on the sheet got
     NARROWER as the window got wider: 235px at 1000, 229 at 1280, 226 at 1440,
     223 at 1600, and its inner measure with it (154.4 -> 143.4). "Payoff / lien
     data" measures 146.2px in this face at this size, so the register's own
     shortest surface name held one line at 1280 and broke at 1600, which put the
     worst line breaks on the page inside the one object whose argument is ruling
     discipline. The insets are a constant 24px now and the object is 224px at
     every width from 1000 up; the entry column and the field pad are set so the
     inner measure lands at 152px, which holds every surface name this register
     carries with 6px to spare and does not move. */
  /* the banded grounds' own inline padding, declared once because the schedules
     inside them are hung off the band's outer edge and have to give it back */
  --band-pad:clamp(1rem,1.6vw,1.5rem);
  --reg-pad:0.55rem;
  /* M58: the entry column is sized to the tab that labels it. Through M57 the tab
     was 234px wide over a 38px number column, so its right edge fell mid-cell
     inside the Surface column and aligned to nothing, in the one object whose
     whole argument is tab-stop discipline. The column and its label are one
     measure now, and the tab's right edge IS the column division.

     M60 RE-SIZES IT TO WHAT THE COLUMN ACTUALLY CARRIES. The entry column is the
     register's own hand: the entry's numeral and the entry's endorsement, on one
     left tab stop. It is ruled to the stamp component at its ratified 0.72rem
     (76.2px measured) plus the field pad on both sides, and the head that labels
     it (\`ENTRY\`, 39.1px at the micro tier) sets inside it with room. */
  --entry-col:5.5rem;
  --reg-inset:12px;
  --reg-head-h:2.2rem;

  /* THE REGISTER'S OWN SCALE (M60). Three type registers inside one 248px object,
     and the scale that separates them is declared here rather than inlined:
       --t-reg-micro  the MACHINE tier: field keys and the two column heads, mono,
                      caps, +0.12em, --ink-3. The recorder's printed rubric.
       --t-reg-name   the DISPLAY tier: entry names, Piazzolla 500 at opsz 20,
                      --ink. What was presented for recording.
     The third register is the object's PROSE tier (--text-fine mono, sentence
     case, --ink-3): the specimen caption, the reserved-entry note, the recording
     foot's key and the entry numerals. Measured ratio across the object's scale,
     10.88px to 16.80px: 1.544. */
  --t-reg-micro:0.68rem;
  --t-reg-name:1.05rem;
}
@media(min-width:1000px){
  :root{
    /* M56: THE SOVEREIGN MARGIN RETURNS TO ITS RATIFIED WIDTH. DESIGN.md Part IV
       Layout binds \`grid-template-columns: minmax(0,1fr) 17rem\` at 1000px and
       above; the sheet had been serving clamp(6.5rem,8.5vw,9.5rem), which is 40
       to 56 per cent of it, and a margin that narrow cannot hold the one composed
       object the Part gives it, which is why the register had migrated into the
       hero's own column and the margin had been left carrying section furniture
       instead. 17rem, and the register is in it. */
    --margin-w:17rem;
    /* the counter shows generously once there is a desk to see: a phone is a
       close crop of the scene and a laptop is the step back from it. */
    --reveal:clamp(1.75rem,4vw,4.5rem);
    /* M58: THE READING COLUMN'S RIGHT EDGE IS THE MARGIN'S RULE, so a section
       rule that stops at 0 stops ON the reserved margin. Every closing rule on
       the sheet, both schedules and \xA73's recital band therefore terminate on one
       vertical (content width minus 17rem), the reader never meets a rule that
       ends in the middle of nothing, and neither reach token has any work left
       to do. They are kept at zero rather than deleted because \`.content>section
       ::after\` and the hero's override are both authored in terms of them. */
    --rule-reach:0px;
    --hero-reach:0px;
  }
}
/* THE LAPTOP BAND (M47, M52, re-set by M56 for the ratified margin). Between 1000
   and 1199 the reserved margin has taken 17rem and the reading column is the
   narrowest it ever gets, so the headline gives back the width it cannot use.
   Measured at 1024x768, the commonest laptop: this is the difference between the
   fold's primary action clearing the fold and standing 200 pixels under it. */
@media(min-width:1000px) and (max-width:1199px){
  :root{ --text-h1:clamp(1.95rem,3.4vw,2.6rem); }
}

*,*::before,*::after{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%;background:var(--counter)}
body{background:var(--counter);color:var(--ink);
  font:400 var(--text-body)/1.62 var(--serif);
  font-variation-settings:'opsz' 11;
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  min-height:100vh;overflow-x:clip}
/* \`clip\` and not \`hidden\`: \`hidden\` would make the body a scroll container and
   the running head would stand inside it instead of at the viewport top. */

/* ---- THE INSTRUMENT, LYING ON THE COUNTER.
        Outward from the document's own face the stack is:
          1px --rule-frame   the sheet's cut edge
          5px --sheet-3      the leaf beneath it, uncovered at foot and fore-edge
          5px --counter-cast the cast that edge throws on the stone
              --counter      the counter
        No shadow, no blur, no gradient: four flat tones and two offsets, which
        is what a sheet on a counter actually looks like under even light. ---- */
.sheet{position:relative;background:var(--sheet);
  width:min(var(--sheet-max),100% - var(--reveal) * 2);
  margin-inline:auto;margin-block:0 var(--reveal);
  border:1px solid var(--rule-frame);
  min-height:100vh;display:flex;flex-direction:column}
.sheet::before{content:"";position:absolute;z-index:-1;
  top:var(--edge);left:var(--edge);
  right:calc(-1 * var(--edge));bottom:calc(-1 * var(--edge));
  background:var(--sheet-3);border:1px solid var(--rule-mid)}
.sheet::after{content:"";position:absolute;z-index:-2;
  top:calc(var(--edge) * 2);left:calc(var(--edge) * 2);
  right:calc(-2 * var(--edge));bottom:calc(-2 * var(--edge));
  background:var(--counter-cast)}

h1{font:600 var(--text-h1)/1.015 var(--serif);
  font-variation-settings:'opsz' 30;letter-spacing:-0.019em}
h2{font:600 var(--text-h2)/1.11 var(--serif);
  font-variation-settings:'opsz' 26;letter-spacing:-0.012em;
  margin-bottom:var(--space-block);max-width:20ch}
p{margin-bottom:var(--space-row)}
p:last-child{margin-bottom:0}
code{font-family:var(--mono);font-size:0.92em}
a{color:var(--seal);text-decoration:underline;text-underline-offset:0.18em;
  text-decoration-thickness:1px;text-decoration-color:var(--seal-deep);
  transition:text-decoration-thickness 150ms var(--quart),color 150ms var(--quart)}
a:hover{color:var(--seal-deep);text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--seal-ring);outline-offset:2px}
::selection{background:var(--sheet-3)}

/* M56: THE HEADLINE CARRIES ONE MARKED TERM. The estate reference this pass is
   measured against sets one word of its headline in the accent with a rule under
   it, and the sheet had no such mark anywhere: 129 characters of one weight, one
   colour and one size, which is a paragraph in a large size and not a display
   line. The term is \`reach\`, and it is not a designer's pick: it is the single
   word docs/copy/mortgage-copy.md MR-E3 is written about, re-ruled once by MR-F2
   for tense and once by MR-G3 for landing, and named there as the thing this
   property actually offers ("the property is the address, not the holder", MR-D1).
   The ink is recorded as the fifth authorized placement of --seal in
   BUILD-SPEC-mortgage.md M56, with its ground; the four in DESIGN.md Part IV are
   otherwise untouched, and the coverage cost is one word. */
h1 .mark{color:var(--seal);text-decoration:underline;
  text-decoration-thickness:2px;text-decoration-color:var(--seal);
  text-underline-offset:0.1em}

/* ---- the running head: the instrument's standing line, and the machine door.
        Four cells at every width (copy doc MR-E1, MR-E2, MR-E8): the property
        name, the WAITLIST stamp, /llms.txt and the act. Below 1000px it sets as
        two flex rows so all four hold, and the door and the status artifact both
        sit inside the first forty pixels. ---- */
.runhead{border-bottom:1px solid var(--rule-mid);background:var(--sheet);
  flex:none;position:sticky;top:0;z-index:6}
:target{scroll-margin-block-start:6.5rem}
h2{scroll-margin-block-start:6.5rem}
@media(min-width:1000px){
  :target{scroll-margin-block-start:5rem}
  h2{scroll-margin-block-start:5rem}
}
/* M58 AUTHORS THE PHONE MASTHEAD INSTEAD OF LETTING IT WRAP. Through M57 this row
   was \`flex-wrap\` plus a zero-height \`::after\` break and two \`margin-inline-start:
   auto\` pushes, and what it produced at 390 was row one pairing \`apis.mortgage\`
   with \`/llms.txt\` and row two pairing \`payoff, lien and eNote data\` with \`Join the
   waitlist\`: the two halves of one identity phrase on different lines beside two
   unrelated items, which reads as a wrap accident and not as a two-line runhead.
   The row is an explicit grid now and every cell is placed by hand:

     row 1   apis.mortgage \xB7 WAITLIST                          /llms.txt
     row 2   payoff, lien and eNote data
     row 3                                             Join the waitlist

   The identity phrase is whole on one row and it is nobody's neighbour. The
   machine door stands in row one because DESIGN.md Part I \xA73.2 binds it to the
   first forty pixels and scripts/check-viewport.mjs measures it there, not
   because the eyebrow ran out of room; the same law holds the WAITLIST stamp
   (stampEdge). From 760px up the two links group on one terminus in row one and
   the masthead is two rows. */
.runhead-inner{padding:0.6rem var(--gutter);
  font:400 var(--text-fine) var(--mono);color:var(--ink-3);
  display:grid;grid-template-columns:auto auto minmax(0,1fr);
  column-gap:0.6rem;row-gap:0.28rem;align-items:baseline}
.runhead-inner p{margin:0}
.runhead-inner .eyebrow{display:contents}
.runhead-inner .self{color:var(--ink);grid-column:1;grid-row:1}
.runhead-inner .stat{grid-column:2;grid-row:1;white-space:nowrap}
.runhead-inner .door{grid-column:3;grid-row:1;justify-self:end;white-space:nowrap}
.runhead-inner .cat{grid-column:1 / -1;grid-row:2;min-width:0}
.runhead-inner .rh-act{grid-column:1 / -1;grid-row:3;justify-self:end;white-space:nowrap}
.runhead-inner .rh-act a{color:var(--seal)}
/* M59 \xB7 THE PHONE MASTHEAD IS TWO ROWS AND TWO EDGES, NOT THREE RAGGED ONES.
   M58 authored the row as an explicit grid and put the act alone on row three:

     row 1   apis.mortgage \xB7 WAITLIST                          /llms.txt
     row 2   payoff, lien and eNote data
     row 3                                             Join the waitlist

   Measured at 390, the two right-aligned cells landed on the same terminus but on
   two different vertical rhythms with the category line stranded between them, and
   the property's PRIMARY ACT sat alone under a utility link, which is the one
   ranking this masthead must not state. The review's own cure was to drop
   \`/llms.txt\` at the narrow breakpoint; that cure is unavailable and the ground is
   not preference. DESIGN.md Part I \xA73.2 binds the machine door to the first forty
   pixels at every width, scripts/check.mjs \xA711(l2) fails the build if the cell is
   ever \`display:none\`, and scripts/check-viewport.mjs measures its edge from 320
   up. A machine door is not removed to make room for anything.

   So the ROWS are cut instead of the door:

     row 1   apis.mortgage \xB7 WAITLIST                          /llms.txt
     row 2   payoff, lien and eNote data                Join the waitlist

   Two rows, one right terminus, and the two links stand on ADJACENT lines instead
   of three lines apart with a stranded left half between them. The act cannot take
   row one and the reason is arithmetic, not taste: at 390 the identity pair, the
   stamp and the door measure 241px of a 362px content row, and the act is 118, so
   a four-cell row one overflows at every phone width. What the act takes instead
   is rank on the row it does hold: it is the only mark in the strip drawn at the
   2px underline weight, against the door's hairline, which is the same one-step
   ranking MR-G8 gave the wordmark over the slots beside it. Below 340 the act
   returns to a row of its own, because row one cannot hold the identity pair, the
   stamp and the door inside 292 pixels of content width, and an overflowing
   masthead is worse than a third row. */
@media(min-width:340px) and (max-width:759px){
  .runhead-inner{grid-template-columns:auto minmax(0,1fr) auto}
  .runhead-inner .stat{grid-column:2;grid-row:1;justify-self:start}
  .runhead-inner .door{grid-column:3;grid-row:1;justify-self:end}
  .runhead-inner .cat{grid-column:1 / 3;grid-row:2}
  .runhead-inner .rh-act{grid-column:3;grid-row:2;justify-self:end}
}
.runhead-inner .rh-act a{text-decoration-thickness:2px}
/* the two links take one terminus as soon as one row can hold the identity pair
   and both of them: a machine door and a human act are one class of cell, and a
   rule divides them the same way the desktop head's own door cell is divided. */
@media(min-width:760px){
  .runhead-inner{grid-template-columns:auto auto minmax(0,1fr) auto}
  /* act then door, in that order at every width from 760 up, which is the order
     the desktop head takes at 1200 where the door's cell IS the reserved
     margin's cell. A machine door that changes places with the human act at one
     breakpoint is a strip that reflows for no reason. */
  .runhead-inner .rh-act{grid-column:3;grid-row:1;justify-self:end}
  .runhead-inner .door{grid-column:4;
    border-inline-start:1px solid var(--rule-mid);padding-inline-start:0.9rem}
}
/* A MACHINE DOOR IS A TAP TARGET. 18px in the head strip, which is the stated
   exception the hub and the rate card take, because Part I \xA73.2 puts this row
   inside forty pixels and MR-E1 measured the door at y13-29. */
.runhead-inner .door a{display:inline-block;padding-block:1px;line-height:16px}
.runhead-inner .stamp{vertical-align:baseline}
/* MR-E2: every separator is suppressed at the widths where its slot takes its own
   row, so no line begins or ends on a bare rule dot. */
.runhead-inner .eyebrow .sep{display:none}
/* MR-G4: one category string, one width. It renders whole at every width. */
.runhead-inner .eyebrow .cat-long{display:inline}
/* MR-G8: the wordmark takes a weight and a size step, so the three slots stop
   reading as a breadcrumb trail whose first crumb is the brand. */
.runhead-inner .self{font-weight:500;font-size:1.08em;letter-spacing:0.005em}
/* M56: THE MASTHEAD KEEPS THE TWO-ROW SET UNTIL 1200. With the reserved margin at
   its ratified 17rem the eyebrow's own cell in the desktop grid is ~456px at
   1024, and the three slots wrap there, which opened row two on a bare leading
   rule dot: verbatim the defect MR-E2 was authored against. Below 1200 the head
   is two flex rows and every separator is suppressed, so a row edge divides the
   slots that a rule dot divided on one line, and the door and the status artifact
   both hold the first forty pixels. */
@media(min-width:1200px){
  .runhead-inner{display:grid;font-size:var(--text-small);
    grid-template-columns:minmax(0,1fr) auto var(--margin-w);
    column-gap:0;align-items:baseline;
    padding-inline:var(--gutter) 0}
  .runhead-inner .eyebrow{display:block;grid-column:1;grid-row:1}
  .runhead-inner .eyebrow .sep{display:inline}
  .runhead-inner .rh-act{grid-column:2;grid-row:1;justify-self:end;
    border-inline-start:0;padding-inline:0 var(--colgap)}
  /* the door's cell IS the reserved margin's cell, so the sheet's first line and
     the sheet's own column division land on one vertical. */
  .runhead-inner .door{grid-column:3;grid-row:1;justify-self:start;
    padding-inline-start:1.15rem;
    border-inline-start:1px solid var(--rule-mid)}
  .runhead-inner .stamp{margin-inline-start:0.15rem}
}

/* ============================================================
   THE SOVEREIGN MARGIN: the instrument left, the reserved margin right, and the
   margin runs the whole height of the sheet.

   M58 (2026-08-02, third design review) RESTORES THE FULL-HEIGHT COLUMN AND
   SUPERSEDES M57.3 IN FULL. M57's own note is kept below because it is the
   argument this amendment answers.

   What M57 shipped was not a margin. \`.margin\` spanned y44 to y1122 of a 6,575px
   scroll (17%), was not sticky, and terminated as a flat-edged tinted rectangle
   with no closing mark; for the other 83% of the document there was no margin, no
   vertical rule and no register, and the right 272px of the sheet was blank paper.
   DESIGN.md Part IV Layout is not ambiguous about this: "the right 17rem, FULL
   PAGE HEIGHT, separated by one 1px rule on its left, filled --stone-1,
   TERMINATING EXACTLY INTO THE FOOTER BAND at every breakpoint (this join is a
   ship gate: if it breaks, the signature reads as a bug)". A column that runs out
   at 17% is the ship gate breaking.

   THE ONE-OBJECT LAW IS UNTOUCHED AND SO IS M57'S DIAGNOSIS. Part IV gives the
   margin exactly one composed object and this build still gives it exactly one,
   the register, near the top and baseline-set against the H1; below it the margin
   is empty for the entire scroll, which is the sentence immediately after the
   one-object clause and is the whole point of a reserved margin. M57 was right
   that an unexplained tint band is Rejection 2, and the cure it chose (cut the
   column) was the wrong half: what makes a reserved margin read as reserved is
   that it is BOUNDED and TERMINATED, not that it is short. So the band is drawn
   once, as a single rule-led column from the runhead's own divider to the footer's
   opening rule, it is the same vertical the masthead's machine-door cell already
   stands on, and it ends on a 2px instrument rule rather than in mid-air. Nothing
   is added inside it: no folio marks, no section numbers, no clause keys, no
   watermark. The register never animates and the column never becomes sticky;
   emptiness that moves is decoration, and a bar that reflows on scroll would be
   the loudest motion this page could ship.

   AND THE COLUMN GAP IS CLOSED, WHICH IS WHAT GIVES THE SHEET ONE RIGHT EDGE.
   With \`column-gap:0\` the reading column's right edge IS the margin's rule, so
   every section rule, both schedules and \xA73's recital band terminate on the one
   vertical at content width minus 17rem, the register terminates on the sheet's
   own fore-edge with the footer and the runhead, and the page runs three right
   edges instead of the five M57 shipped.

   (M57's superseded note, kept because this amendment answers it.)

   M56 made the margin a column of the WHOLE PAGE. The register filled its
   first ~1,090px and the remaining band ran flat --sheet-2 from y1090 to
   y6080: at 1280 that is a 272 x 5,000px strip of tint down the right of the
   document with nothing in it, which is PRODUCT.md's named Rejection 2
   (dead whitespace reading as an unstyled internal document) drawn in this
   property's own ink. It was the page's largest visual liability.

   THE ONE-OBJECT LAW IS NOT AMENDED AND IS NOT WORKED AROUND. DESIGN.md Part
   IV Layout gives the reserved margin exactly one composed object and nothing
   else, ever, and this build still gives it exactly one: the register. What
   M57 changes is that the sheet stops RESERVING a full-height column for an
   object that ends at the head. The margin is row one of the reading grid; the
   register is in it, baseline-set against the headline; the band closes on a
   W2 field rule at row one's foot, on the same vertical the hero's own closing
   rule lands on; and every section below row one takes the sheet's whole
   width. There is no empty band left to explain, and the second option the
   review offered (a margin carrying a second and third composed object down
   the scroll) is declined on the record because it needs strings this
   property's copy doc does not author and the one-object law forbids.

   The roman folio marks stay struck (M56, \`.content>section::before\`): they
   were entries the CONTENT column made against its own rules, standing in the
   margin because that was where the space was.
   ============================================================ */
.page{position:relative;width:100%;flex:1 0 auto;display:flex;flex-direction:column}
.content{padding-inline:var(--gutter);min-width:0;display:flow-root;flex:1 0 auto}
@media(min-width:1000px){
  .content{display:grid;grid-template-columns:minmax(0,1fr) var(--margin-w);
    column-gap:0;align-items:stretch;
    padding-inline:var(--gutter) 0;position:relative}
  /* THE RESERVED MARGIN, DRAWN ONCE, FLOOR TO FLOOR. The band is a single painted
     column on the reading grid's own padding box, so it starts on the runhead's
     divider and ends on the footer's 2px opening rule with no join to maintain
     and nothing to fall out of alignment. It is drawn here rather than on the
     \`<aside>\` because the aside holds the object and the column holds the
     reservation, and those are two different lengths: the object ends where the
     register ends, the reservation ends where the instrument ends. */
  .content::after{content:"";position:absolute;z-index:0;
    inset-block:0;inset-inline-end:0;width:var(--margin-w);
    background:var(--sheet-2);
    border-inline-start:1px solid var(--rule-mid)}
  .content>*{position:relative;z-index:1}
  /* THE HERO CLOSES WHERE THE HERO ENDS. \`align-self:start\` and not the grid's
     default stretch: stretched, the section's closing rule was pushed to the
     foot of the head band and stood ~370px below the last line it was closing,
     which is a rule floating in space and the exact fault the termination law
     exists to forbid (a rule ends where the thing it rules ends). */
  .content>section.hero{grid-column:1;grid-row:1;align-self:start}
  /* THE ASIDE IS THE OBJECT'S BERTH, NOT THE COLUMN, AND IT DOES NOT SIZE A ROW
     OF THE READING GRID. \`.content::after\` above draws the reservation for the
     whole instrument; this places the one composed object in it, top-set against
     the headline, OUT OF THE ROW FLOW. That last part is the difference between
     a margin and a two-column head band: an in-flow aside makes row one as deep
     as the register, so a register deeper than the hero opens ~900px of blank
     sheet in the reading column before \xA72 can start, which is the dead
     whitespace this pass exists to remove and which M57 tried to cure by cutting
     the column instead. Out of flow, the document reads straight down its own
     column at its own interval and the register stands in the margin beside
     whatever passage happens to be level with it, which is what a marginal
     object does on a ruled instrument.

     It is inset from the sheet's fore-edge by the object's own pad, because the
     register is a LEAF LYING ON the margin and it carries a leaf and a cast of
     its own: run its 2px frame onto the sheet's cut edge and the reader meets
     four dark lines stacked in three pixels, which reads as a clipped object
     rather than as a filed one. The page's three RULE termini are unchanged by
     the inset: --measure for prose, the margin's rule for every section rule and
     both schedules, the sheet's fore-edge for the runhead, the margin band and
     the footer. */
  .margin{position:absolute;top:0;inset-inline-end:0;width:var(--margin-w);
    isolation:isolate;z-index:1;
    padding-inline:var(--reg-inset);padding-block:0}
  /* and every section of the document stands in the reading column, because the
     margin is reserved for the whole height of the sheet and nothing crosses it */
  .content>section:not(.hero){grid-column:1}
  /* and the hero's own copy is set at the desktop's leading, not the phone's:
     the fold has 900 pixels here and the block was tuned inside 667. */
  .hero h1{margin-bottom:0.42em}
  .content p.hero-sub{line-height:1.3}
  .hero-stand{margin-block-start:1.5rem}
  .hero-cta{margin-block-start:2.2rem}
  .hero-cta .standing-reason{margin-block-end:1.1rem}
  .hero-recipient{margin-block-start:1.15rem}
}
@media(max-width:999px){
  /* THE MARGIN COLUMN IS DELETED, NOT SHRUNK, AND THE REGISTER IS NOT DELETED
     WITH IT (M58, superseding M57.9 and the render half of MR-G6).

     DESIGN.md Part IV Layout writes the phone build in its own sentence: "Mobile
     < 1000px: the margin column is deleted, not shrunk. The empty register (same
     five ruled rows, same single stamp) renders as a --stone-1 band bounded by
     1px rules." M57 shipped the first clause and dropped the second, and what a
     phone reader met at 390 was prose plus tinted panels with \`.margin\` and
     \`.register\` both measuring 0x0: the property's registered exclusive
     architecture, the reserved margin and the empty register, and its whole
     honesty grammar, that the empty register IS the artifact, deleted on the
     device class most readers arrive on. A hero artifact that exists only on
     desktop is not the hero artifact.

     MR-G6's own holding is satisfied rather than worked around. It rules that
     the specimen "renders whole or not at all" and forbids a collapsed variant
     that keeps the surface names and drops the reserved entries, the blank rules
     and the recording foot. This is the WHOLE object: the tab, the 2px
     instrument frame, the numbered gutter, the specimen band, every keyed and
     unkeyed recording line, the reserved entries with their caption, and the
     unfilled \`Received for record\` stamp box. What is dropped is only the
     two-column margin GEOMETRY, which is the clause Part IV writes.

     PLACEMENT. Part IV puts the band above the H1; it renders here directly
     under the hero's own action instead, because MR-F7's fold gate binds this
     property's primary control above a 667px viewport and a ~1,100px band over
     the headline would put it four screens down. Directly under the act is where
     the estate reference this pass is measured against places its own
     instrument, and it is the first object the reader meets after the ask. */
  .page{display:block}
  .margin{display:block;padding:0;margin-block:var(--space-block) 0}
  .register{margin-block-start:0;margin-block-end:0}
}

/* ============================================================
   M59 (2026-08-02, fourth design review) \xB7 THE MARGIN CARRIES THE INSTRUMENT FOR
   THE WHOLE SCROLL, AND IT DOES IT WITHOUT A SINGLE NEW STRING.

   THE FINDING. M58's margin is exactly 272px at 1000/1280/1440/1600 and never
   collapses, but it carried the register for 1,529px of a 6,392px document. From
   the register's lower edge at y1573 to the footer at y6056 it was a 272px empty
   tinted rail: 77 per cent of the scroll, three quarters of the reader's time on
   the page, beside a reference build that keeps marginal notes running the whole
   length of its own terminal block. A reserved margin that falls silent for three
   quarters of a document is a wide gutter with a tint on it.

   THE ONE-OBJECT LAW IS NOT AMENDED, AND NOTHING IS INVENTED TO FILL THE COLUMN.
   DESIGN.md Part IV Layout gives the reserved margin exactly one COMPOSED OBJECT
   and this build still gives it exactly one: the register, framed, ruled, tabbed
   and stamped. What runs below it is not a second object. It is the document's own
   marginal apparatus: three strings the sheet was ALREADY rendering, relocated out
   of the reading column into the margin they annotate, plus the marginal termini
   of the sheet's own section rules. No string is added, none is duplicated, none
   is edited and the DOM order of every one of them is untouched, so with CSS off
   the reader meets docs/copy/mortgage-copy.md in copy order exactly as before.
   A29's closed chrome set is not extended, because nothing new is written.

   THE FIVE RELOCATED NOTES, in copy order:
     \xA72  \`.closing\`        the rate-card note, which was already an annotation on
                           the schedule and is now beside it
     \xA73  \`h2\`              "Why this door stands apart." set as the MARGINAL CLAUSE
                           KEY Part IV's own \xA73 spec asks for, in the actual margin
                           rather than in a key column carved out of the band
     \xA74  \`.persona-lead\`   the gloss that introduces the four portraits, beside the
                           four portraits
     \xA74  \`.persona-close\`  the sentence that closes them, beside the block it closes
     \xA75  \`h2\`              the family strip's key, on the same device as \xA73's

   WHY \xA73 AND \xA75 TAKE MARGINAL KEYS AND \xA72 AND \xA74 KEEP DISPLAY HEADS. A section
   whose whole body is ONE BOUNDED INSTRUMENT takes a key: the recital band and the
   family strip are each one object with a gloss, and a key is what a bounded object
   is labelled with. A section that carries the argument in prose keeps a display
   head, which is \xA72 and \xA74. \xA72 could not take a key in any case, because the margin
   beside it is occupied by the one composed object the Part reserves it for.

   Each note is typographically SUBORDINATE to the register by construction: mono at
   --text-fine, --ink-2, one hairline above, no frame, no fill, no stamp geometry.
   The register keeps the frame, the tab, the stamps and the stock. It is the
   produced object; these are annotations on the same instrument.

   AND THE SECTION RULES TERMINATE IN THE MARGIN RATHER THAN AT IT. A closing rule
   that REACHES the margin sends a stub across its division, so the reader meets a
   rule in the column at every section's foot. These are RULES AND NOT MARKS:
   \`content:""\`, no numeral, no letter, no alphabet. The recorder's roman folios
   stay struck and scripts/check.mjs \xA711(m) still fails the build if a keyed mark
   is ever drawn in this column again.
   (M61 strikes M59's sentence "a rule that stops on its own field, which is \xA74's,
   sends none". M60 put every section's closing rule across the margin whole, \xA74's
   included, and the served bytes have drawn \xA74's terminus since; the sentence was
   describing a build two passes old. It is recorded rather than deleted because a
   comment that went stale silently is the same fault as a number that did.)

   AND WHAT COUNTS AS A MARK, RULED, BECAUSE THE FILE READ BOTH WAYS. The
   one-viewport law is measured on TEXT MARKS ONLY -- the register, the five
   relocated notes and the two schedules' keys. A section terminus is a hairline
   the reader crosses, not a note the reader reads, and a law about a column
   falling silent is a law about reading matter. This is the strict reading and it
   is the one that binds; the earlier text enumerated the termini in the apparatus
   and then called them not-marks four sentences later, which let the same
   measurement return two answers.

   MEASURED, ON THE STRICT READING, AND ONE INTERVAL IS OVER. At 1000, 1280, 1440
   and 1600 every interval between two text marks in this column is inside one
   viewport EXCEPT ONE: 902, 955, 974 and 991 pixels, from \`.persona-close\` to \xA75's
   key, against a 900px read height. It is \xA74's ask block, and it is a BOUNDED
   EXCEPTION with a stated reason, a measured ceiling and a gate, not an oversight:

     THE REASON. M59's cure is "no string is added, none is duplicated, none is
     edited". Every string standing beside that interval is held in place by a copy
     ruling that predates this one. MR-C4 sets HONEST LIMIT at body size inside its
     own quiet rules as \xA74's second paragraph and gives the display tier to the
     ask; MR-C4 again fixes the standing reason at body size in the document serif
     as the one sentence on the page that gives a reason to act; MR-F5 puts the
     recipient line AT the control, because a \`mailto:\` whose only explanation
     stood 250 pixels away was the defect MR-F5 exists to close, and 250 pixels
     away is exactly where this margin is. So the four candidates are the four
     strings that may not move, and the alternative -- writing a note for the
     column -- is the one thing M59 forbids outright.

     AND THE QUIET IS THE SECTION'S ARGUMENT. \xA74 is the only converting section on
     the property and MR-C4's whole ruling is that the loudest thing on that screen
     must be the ask. An annotation hanging in the margin beside the button is a
     second thing to read at the moment the page has stopped arguing, which is the
     competition MR-C4 removed from inside the column. The rail is clear there
     because the reader is at the control.

     THE CEILING, AND THE GATE. The exception is \xA74's ask block and nothing else.
     scripts/check-viewport.mjs \`marginMarks\` measures every interval in this column
     at 1000, 1280, 1440 and 1600 on every publish, and it measures the tail from the
     last mark to the foot of the column too: a second interval over one viewport
     fails the build, and this one fails it the moment it passes the cap.

     M62 RE-CUTS THE CAP FROM 1,050 TO 1,000, BECAUSE 1,050 WAS SIZED TO THE VOID
     RATHER THAN WRITTEN AGAINST IT. The measured intervals are 902, 955, 974 and
     991, and a cap at 1,050 handed this exception 59 further pixels that nothing on
     the record had argued for. An exception that may quietly grow another half-screen
     is the unrecorded breach the cap exists to prevent, one rung up. One thousand is
     one viewport and one hundred pixels, and the hundred is a FREEZE and not a
     budget: it is the eighth pass's own measurement rounded to the next hundred so a
     font-metric wobble cannot break a build by itself, and there is no room in it for
     another paragraph. A later pass that needs this interval taller argues for it
     here, in the open, and moves the number by hand.

     AND THE HONEST PART, STATED PLAINLY, BECAUSE THIS IS THE PAGE'S SHARPEST OPEN
     TENSION. Read as a landing page, a 950-pixel stretch of painted rail with nothing
     on it beside the only section a reader can act in is dead whitespace, and it is
     the failure mode this property's own Rejection 2 names. Read as this property,
     it is the signature: DESIGN.md Part IV Layout rules the reserved margin "contains
     exactly one composed object and nothing else, ever", and then, in its own words,
     "Below it the margin is empty for the entire scroll. No notes, no watermarks, no
     ghost text, no cursor, no 'coming soon': one clever addition destroys the
     meaning." M59's five relocated notes are the DEVIATION from that, taken because
     three quarters of a silent rail read as a gutter; the ask block is the one place
     the deviation has nothing to relocate, so what stands there is the ratified
     design with nothing added to it.
     What makes it a decision rather than a leftover: all four strings beside this
     interval are pinned by rulings that predate the margin (MR-C4 twice, MR-D2,
     MR-F5); the fifth string the column would need is the one thing M59 forbids
     outright; and abbreviating one of the four to fill it is exactly what M61 did to
     \xA74's fourth persona key and what MR-H1 has just undone. The cure, if the tension
     is ever resolved the other way, is a string this property is entitled to write
     and has not written. Until then the number is frozen and the rail is quiet on the
     record. Recorded in docs/design/BUILD-SPEC-mortgage.md M62.
   ============================================================ */
@media(min-width:1000px){
  .content>section .marginal{position:absolute;inset-inline-start:100%;
    width:var(--margin-w);padding-inline:var(--reg-inset);
    max-width:none;margin:0;z-index:2;
    font:400 var(--text-fine)/1.5 var(--mono);color:var(--ink-2);
    letter-spacing:0.01em;
    border-top:1px solid var(--rule-mid);padding-block-start:0.55rem}
  /* the stations. Each offset is measured from its own section's top edge at
     1000, 1280, 1440 and 1600 so that (a) no note ever runs under the register,
     whose foot is the lowest at 1000, and (b) no gap between two marks in this
     column exceeds one viewport. */
  .content>section h2.marginal{max-width:none;
    font:400 var(--text-fine)/1.5 var(--mono);color:var(--ink-2);
    letter-spacing:0.06em;text-align:start}
  /* M60: the three relocated NOTES take their own static position, which is where
     the flow already puts them, so each one stands beside the passage it annotates
     instead of at a hand-tuned offset from its section's top edge. M59's measured
     offsets were the only way to place them when the margin below the register was
     otherwise empty; with the two schedules now keying into the same column the
     offsets collided with the keys, and a note whose y is authored by hand is a
     number that goes stale the next time a paragraph grows. The two SECTION KEYS
     keep top:0, because a key labels its object from the object's own top edge. */
  .content>section h2#h-family.marginal{top:0}
  /* TWO NOTES HANG ABOVE THEIR OWN STATIC POSITION, and both for the same reason:
     an out-of-flow note takes the y of the thing that follows it, and in these two
     places the thing that follows is a mark of the sheet's own, not a passage.
     \`.persona-lead\` introduces the four portraits, so its static y is the
     schedule's top edge, level with the first portrait's key; \`.closing\` is \xA72's
     last child, so its static y is the section's foot and the section's closing
     rule ran through the middle of it. Each is lifted by its own height and one
     row of clear space: the gloss reads as the line ABOVE the four keys, and the
     rate-card note closes on the schedule it annotates instead of on the rule that
     closes the section. Nothing is placed by a hand-tuned offset. */
  .content>section p.persona-lead,
  .content>section p.closing{transform:translateY(calc(-100% - 0.9rem))}
  /* AND THE TWO RULE WEIGHTS BEHAVE DIFFERENTLY AT THE MARGIN, WHICH IS WHAT
     MAKES THE HIERARCHY A HIERARCHY RATHER THAN THREE THICKNESSES. W2, the field
     division, ends on the margin's own rule and sends a stub across it: the
     reading column is the field, and the margin is marked by it. W3, the
     instrument frame, spans the WHOLE INSTRUMENT, reserved margin included. \xA73's
     recital band is the only W3-ruled section on the sheet, so its two rules run
     the full sheet width and the clause key hangs from the upper one inside the
     bracket they make. The band's own STOCK stops at the margin's division, which
     is what keeps the rail legible as a rail. */
  .boundary h2.marginal{top:0;border-top:2px solid var(--rule-frame);
    padding-block-start:0.75rem;
    font:400 var(--text-fine)/1.5 var(--mono);color:var(--ink-2);
    letter-spacing:0.06em;text-transform:none;text-align:start;
    border-inline-end:0;padding-inline-end:var(--reg-inset);margin:0}
  /* THE MARGINAL TERMINUS OF EVERY SECTION RULE, ON ONE GRAMMAR (M60).
     M59 shipped two: \xA73's rule crossed the reserved margin WHOLE at 2px to the
     sheet's cut edge, and every other section sent a 1.5rem stub that stopped
     250px short of that edge and aligned to nothing on either side of itself. A
     24px mark floating in a 272px column is the unanchored-mark defect this same
     build struck from \xA72's status column one pass earlier, and running two
     terminus grammars on one sheet is what made the margin read as a gutter with
     furniture in it rather than as part of the instrument.
     ONE grammar, the one \xA73 already had: a section's closing rule crosses the
     reserved margin WHOLE, at the weight of the rule it continues, and ends on the
     sheet's own cut edge. The rule's own field still stops on the margin's
     division (M58's three-right-edges law is untouched) -- what crosses is the
     terminus, and it now reaches the edge the instrument ends at. Every section
     that closes on a rule sends one. */
  .content>section::before{content:"";position:absolute;bottom:0;
    inset-inline-start:100%;width:var(--margin-w);height:1px;
    background:var(--rule-mid)}
  /* \xA75 closes on the footer's own W3 rule, which already spans the whole sheet, so
     it has no rule of its own for a terminus to continue. */
  .content>section:last-of-type::before{display:none}
  /* \xA73 closes on the clause's own W3 rule, so its terminus carries that weight. */
  .content>section.boundary::before{height:2px;background:var(--rule-frame)}
}

/* THE SHEET'S FURNITURE. Every section closes with one W2 field rule, and it is
   the only rule in the section that does. \xA73 and \xA74 close on their own field's
   terminus rather than on the sheet line, because a rule ends where the thing it
   rules ends (M53, copy doc MR-E7). */
.content>section{position:relative;margin-block-start:var(--space-section);
  padding-block-end:var(--space-block)}
.content>section::after{content:"";position:absolute;left:0;bottom:0;height:1px;
  right:calc(-1 * var(--rule-reach));background:var(--rule-mid)}
/* the hero's rule is the head band's closing rule: it terminates on the reserved
   margin's own divider, and the margin's foot rule continues it to the sheet's
   cut edge, so one W2 line closes the head band across the whole instrument. */
.content>section.hero::after{right:calc(-1 * var(--hero-reach))}
/* \xA73's closing rule IS the clause's own bottom rule, at the instrument weight.
   A second rule 43px under it was the sheet closing the same section twice. */
.content>section.boundary::after{display:none}
.content>section.boundary{padding-block-end:0}
/* M60: \xA74's closing rule reaches the margin's division like every other section's.
   It had been ruled to --measure, which left it 252px short of the vertical every
   other rule on the sheet lands on and gave the section no terminus a marginal
   mark could record (MR-F8's law: a mark records a rule that REACHES it). The
   sheet now closes five sections on one vertical and crosses the margin on one
   grammar; the FIELDS inside \xA74 are still ruled at --measure, which is where M53's
   termination law actually applies. */
/* and the last section closes on the footer's own opening rule, which is the
   instrument weight and spans the whole sheet. A section rule 25px above it was
   the sheet closing the same section twice, the same doubling \xA73 carried. */
.content>section:last-of-type::after{display:none}
.content>section.hero{margin-block-start:1rem}
@media(min-width:1000px){ .content>section.hero{margin-block-start:0.75rem} }
.content p{max-width:var(--measure)}

/* ---- hero.
        M56: the headline takes the whole instrument column. Through M55 it shared
        the hero's first row with the register and set 28 to 30 characters a line
        at 1280, which is a five-line paragraph in a large size. The register is in
        the margin now, so row one is the headline alone and row two is the
        document's opening argument beside the instrument's own head. ---- */
/* ONE COLUMN, AND THE HEADLINE TAKES ALL OF IT. Through M55 the headline shared
   the hero's first row with the register and set 28 to 30 characters a line at
   1280, which is a five-line paragraph in a large size rather than a display
   line. The register is in the reserved margin now; the instrument's head band
   opens the sheet above the headline; and the headline has the whole instrument
   column. The DOM is untouched, so with CSS off the reader still meets headline,
   deck, disclosure, reason, act, in copy order. */
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr);align-items:start}
.hero-head{grid-row:1}
.hero-text{grid-row:2}
.hero-cta{grid-row:3}
.hero h1{margin-bottom:0.3em}

/* ---- M57 CUTS THE TITLE BLOCK (M56's \`.hero-art\` / \`.titleblock\` / \`.tb-zone\`).
        M56 put three empty ruled zones directly under the running head as the
        first object on the page: three blank cells with stray hairlines inside a
        W3 frame, no string, no numeral, nothing to key them. It was legible only
        to a reader who had read the stylesheet comment justifying it, it spent
        the page's most valuable 100 pixels, and it stood as a SECOND empty
        artifact competing with the register for the claim to be the produced
        hero. An unkeyed empty three-cell grid is the exact tell this rebuild
        exists to remove.
        The review offered two cures, cut it or key it, and the second one is
        foreclosed here rather than declined by taste: keying it needs a string
        naming the preparer, return-to and recorder zones, docs/copy/mortgage-copy.md
        authors none, and A29's chrome set is closed at the labels it enumerates.
        On the property whose thesis is that nothing has been recorded yet, an
        invented \`Prepared by\` is a fabricated record. So it is cut, and the
        instrument's head is now what a head actually is on this sheet: the
        headline, and the register standing in the margin beside it. ---- */

/* ---- the deck: the display tier, and the fold's one positive payload
        (copy doc MR-D2, MR-E4, MR-F3). ---- */
.content p.hero-sub{color:var(--ink);max-width:var(--measure-clause);
  font:400 var(--text-clause)/1.24 var(--serif);
  font-variation-settings:'opsz' 20;letter-spacing:-0.008em;
  margin-bottom:0}
@media(max-width:699px){ .content p.hero-sub{line-height:1.17} }
/* the non-liveness disclosure (MR-D2, MR-D9, MR-F5): body size, directly under
   the deck, above the standing reason and above the ask. Never below a button. */
.hero-stand{color:var(--ink-2);max-width:var(--measure);
  margin-block-start:clamp(0.5rem,0.4rem + 0.3vw,0.85rem)}
.hero-cta{margin-block-start:clamp(0.6rem,0.5rem + 0.32vw,1rem)}
.hero-cta p{margin:0}
/* MR-F7 / M56: the fold's primary action clears a REAL phone viewport, not a raw
   device height, and 667 (an iPhone SE) is the height it is measured against
   rather than 844. No string is deleted and no tier is removed: this block is the
   headline's phone size and leading, the deck's, the leading of the standing line
   and the standing reason, and four leading margins, all inside 699px. The
   masthead sets on two rows here rather than three, which is the other half.
   The tiers still separate: 28px headline, 19.2px deck, 17.2px body. */
@media(max-width:699px){
  .content>section.hero{margin-block-start:0.2rem}
  .hero h1{font-size:clamp(1.7rem,7.2vw,1.85rem);line-height:0.98;
    letter-spacing:-0.023em}
  .content p.hero-sub{font-size:1.2rem;line-height:1.13}
  .hero-stand{line-height:1.38;margin-block-start:0.28rem}
  .hero-cta{margin-block-start:0.4rem}
  .hero-cta .standing-reason{line-height:1.38;margin-block-end:0.25rem}
}
@media(max-width:430px){
  :root{ --gutter:0.875rem }
  /* the head's own tier steps down so the category and the act share one row.
     At 13px they measure 211 and 133 against a 337px row and wrapped to a third
     line; at 12px they measure 194 and 122 and the head is two rows at every
     phone width, which is 21 pixels of fold returned to the argument. */
  .runhead-inner{font-size:0.75rem}
}
/* ---- the standing reason (MR-C4, MR-D2). It renders above both buttons, in the
        same words both times, and it is the only sentence on this page that gives
        a reason to act, so it sets at body size in the document serif. ---- */
.standing-reason{max-width:var(--measure);
  font:400 var(--text-body)/1.55 var(--serif);color:var(--ink-2);
  font-variation-settings:'opsz' 11;
  border-inline-start:1px solid var(--rule-mid);padding-inline-start:0.8rem}
.hero-cta .standing-reason{margin-block-end:0.4rem}
.ask>p.standing-reason{margin-block-start:var(--space-block);margin-block-end:0}

/* ============================================================
   THE EMPTY REGISTER \xB7 the one composed object in the reserved margin.

   M56 returns it to the margin DESIGN.md Part IV gives it, and produces it as
   the most worked object on the sheet:
     \xB7 figure and ground \xB7 a --sheet face on the margin's --sheet-2 stock, with
       the leaf beneath it uncovered at the foot and fore-edge and the cast that
       edge throws. The same four-tone stack the whole instrument is built from,
       one order of magnitude down.
     \xB7 three rule weights \xB7 W3 frames the object and the recording stamp box, W2
       divides its fields, W1 draws every blank.
     \xB7 one left tab stop, one right terminus \xB7 every key sets on one vertical and
       every recording line runs between two fixed verticals. No rule is a flex
       remainder, so the blanks read as ruling and not as ragged leftovers.
     \xB7 a tab breaking its own top edge \xB7 the register's first column head sits
       proud of the instrument frame, which is what a filed thing does.
     \xB7 an UNFILLED recording stamp box \xB7 the statutory artifact this property is
       named for, drawn at the foot under the copy's own \`Received for record\`,
       architecturally empty and the most produced object on the page.
   It claims no liveness: every line in it is a name, a stamp, or a blank, and
   nothing in it is ever filled (check.mjs \xA711(l)). It never animates.

   M57 \xB7 THE CHROME TELLS THE TRUTH ABOUT ITS OWN COLUMNS, AND THE OBJECT STOPS
   BEING A SECOND PRINTING OF \xA72.

   (1) TAB STOPS. M56's column head set \`Surface\` at x=992.4 while the surface
   names it heads set at x=1032.4: the head stood 40px left, over the ENTRY
   column, not over its own. In an object whose entire argument is tab-stop and
   rule discipline that is the chrome lying about the ruling. The head row is
   now the same two-column grid the entry rows are, so \`Surface\` sets on the
   \`.reg-main\` stop exactly, and the entry column's division rule runs from the
   object's top edge rather than starting under the head.

   (2) \`Status\` IS STRUCK FROM THE HEAD. It named a column the body never ruled:
   the three ROADMAP stamps floated right with no division under the word that
   promised them. Of the review's two cures, ruling a real status column is
   measured and declined -- the reserved margin is 17rem, the object's inner
   measure is ~231px, and an entry column plus a stamp-width status field leaves
   the surface names ~68px, which sets \`eNote / eVault: who holds control\` at
   four lines. The stamps sit as marks ON the surface column instead, on the
   object's one right terminus, which is what the head now says they are. Nothing
   is lost from A29's closed chrome set, which never contained \`Status\`.

   (3) ROW RHYTHM. The stamp is locked to the row's FIRST band, at one fixed
   offset from every row's top rule, instead of falling below the title and
   leaving an empty wedge in the one-line row. Rows carry a minimum height, so
   entries 01 and 02 stand on one measure and only entry 03, which records four
   fields, is taller than its neighbours -- which is a fact about entry 03.

   (4) TWO VOICES, SO THE REGISTER AND \xA72 STOP SAYING THE SAME THING TWICE. The
   surface names set in the MONO face here and in the document serif in \xA72: this
   object is the recorder's hand (ruled, numbered, stamped, unfilled) and \xA72 is
   the instrument's own text (a catalog of what the surfaces do). The review's
   preferred cure, entering each row's named gate beside it, is foreclosed by
   MR-D6, which gave the waits-on ledger exactly one owner and made \xA72 the owner;
   its alternative, demoting \xA72's table to a ruled list, is foreclosed by MR-D11,
   which hangs this object's \`aria-hidden\` render on \xA72 marking the same data up
   as a real table with scope="col" headers. Both are recorded in
   BUILD-SPEC-mortgage.md M57 with their grounds.
   ============================================================ */
.register{position:relative;border:2px solid var(--rule-frame);
  background:var(--sheet);margin-block-start:0;
  margin-block-end:var(--space-block)}
/* BASELINE-ALIGNED TO THE HEADLINE (DESIGN.md Part IV Layout: the register sits
   "near the top, aligned to the H1's first baseline"). The object's own first
   typed line, the \`Surface / Status\` head row, closes on the vertical the
   headline's first line closes on, and the reserved margin above it is empty,
   which is the whole point of a reserved margin. Two values because the headline
   takes the laptop band's reduced size between 1000 and 1199 and its first
   baseline moves with it; measured at 1024, 1280 and 1440. */
/* M58 re-sets the value against the headline's FIRST LINE rather than against
   the block: the object's own first typed line, the \`Entry / Surface\` head row,
   now closes within a few pixels of the vertical the headline's first line
   closes on, at 1024, 1280 and 1440, and the tab that breaks the register's top
   edge still clears the runhead's divider. Above it the reserved margin is
   empty, which is what a reserved margin is. */
@media(min-width:1000px){ .register{margin-block-start:2rem} }
/* The leaf beneath, uncovered at the foot and the fore-edge, and the cast that
   leaf throws. M58 turns the offset down-RIGHT, which is the direction the sheet
   itself is lit from (\`.sheet::before\` and \`.sheet::after\` run down-right), so
   the whole page has one light and the register is the same object one order of
   magnitude down. M57 ran it down-left because the object's right frame stood on
   the instrument's own cut edge and a right-hand leaf would have crossed out of
   the document; the object is inset from that edge now, and 8px of cast still
   lands inside the reserved margin at every width.

   M60 CAPS THE STACK'S TOP EDGE. Both leaves ran an open top: the only part of
   either that shows is the strip to the right of the instrument's own frame, and
   that strip was arriving as a hairline step and a bare tone change with nothing
   closing it, so the object's top-right corner read as an unfinished cut rather
   than as two leaves under one. Each leaf's top edge now carries the 2px frame
   rule, and because the instrument's own ground covers everything to the left of
   its right frame, the cap starts exactly at the instrument's top-right corner
   without an inset having to be authored. */
.register::before{content:"";position:absolute;z-index:-1;
  top:4px;left:4px;right:-4px;bottom:-4px;background:var(--sheet-3);
  border:1px solid var(--rule-mid);border-top:2px solid var(--rule-frame)}
.register::after{content:"";position:absolute;z-index:-2;
  top:8px;left:8px;right:-8px;bottom:-8px;background:var(--sheet-cast);
  border-top:2px solid var(--rule-frame)}
/* THE TAB, SNAPPED TO THE COLUMN IT LABELS (M58).

   M57's tab was 234px wide over a 38px number column, so its right edge fell
   mid-cell inside the Surface column and aligned to no division on the object,
   and \`Entry\` and \`Surface\` read as two column labels sitting on two different
   baselines with the header row's first cell left empty. The header was
   ambiguous: was \`Entry\` the artifact's title or the gutter column's label?

   It is the gutter column's label, and the object now says so twice over. The
   tab is exactly the entry column's width, its right edge IS that column's
   division rule, and it runs DOWN through the header band so that \`Entry\` and
   \`Surface\` set on ONE baseline, one label over each of the object's two ruled
   columns. It still breaks the instrument's own top edge, which is what a filed
   thing does. Nothing is invented and nothing is printed twice: \`Entry\` is the
   first string in the closed REGISTER CHROME set (copy doc, A29 as amended) and
   it renders once, and putting a second copy of it in the header row's first
   cell -- the review's other half -- would be the same word set twice in the
   same face 20px apart, which is the defect one column over. Three weights in
   one device: 2px frame where the tab crosses the instrument's edge, 1px field
   division where it is the column's own rule, 1px under the header band.

   M60 CLOSES THE CORNERS, superseding M58's rise. The tab rose 1.55rem ABOVE the
   instrument, so \`Entry\` and \`Surface\` sat under two different top rules at two
   different y (53.3 and 76.1, measured at 1280), and the instrument's own 2px
   frame was broken open at its top-left corner by a three-sided box that left a
   step at the corner it crossed. A filed thing that breaks its own edge is a
   device; two column heads under two edges is a defect, and this object is one
   ruled instrument rather than a stack of tabbed folders.
   The two heads are now two CELLS OF ONE HEAD BAND: one top rule at one y (the
   instrument's own 2px frame), one closing rule under both, one division between
   them, and the active head distinguished by FILL AND WEIGHT ONLY -- \`Entry\` on
   the instrument's own --sheet at 500 in --ink, \`Surface\` on the recessed
   --sheet-4 at 400 in --ink-3. No corner is broken and no step is left. Both
   labels set in the register's own MACHINE tier, which is the tier their field
   keys set in, because a column head and a field key are the same kind of mark. */
.reg-tab{position:absolute;top:0;left:0;z-index:1;
  width:var(--entry-col);height:var(--reg-head-h);
  background:var(--sheet);
  border-inline-end:1px solid var(--rule-mid);
  border-bottom:1px solid var(--rule-mid);
  display:flex;align-items:flex-end;
  padding:0 var(--reg-pad) 0.52rem;
  font:500 var(--t-reg-micro)/1 var(--mono);color:var(--ink);
  text-transform:uppercase;letter-spacing:0.12em}
/* THE COLUMN HEAD, ON THE COLUMN'S OWN TAB STOP (M57, kept). Same grid as every
   entry row below it, so \`Surface\` sets on the \`.reg-main\` stop to the pixel and
   the entry column's W2 division runs the object's full height from its top
   edge. The head band takes a fixed height so both labels land on one baseline
   by construction rather than by coincidence. */
.reg-cols{display:grid;grid-template-columns:var(--entry-col) minmax(0,1fr);
  height:var(--reg-head-h);align-items:end;
  background:var(--sheet-4);
  border-bottom:1px solid var(--rule-mid);
  font:400 var(--t-reg-micro)/1 var(--mono);color:var(--ink-3);
  text-transform:uppercase;letter-spacing:0.12em}
.reg-cols::before{content:"";grid-column:1;height:100%;
  border-inline-end:1px solid var(--rule-mid)}
.reg-cols span{grid-column:2;padding:0 var(--reg-pad) 0.52rem}
/* the specimen's own caption: the one sentence saying the emptiness is deliberate
   (MR-G5). Chrome, not a value: no rule in this object is filled by it. */
.reg-caption{padding:0.55rem var(--reg-pad);
  border-bottom:1px solid var(--rule-mid);background:var(--sheet-3);
  font:400 var(--text-fine)/1.45 var(--mono);color:var(--ink-3)}
/* THE ROW, AND ITS ONE PRIMARY TAB STOP (M60, superseding M56's centred numeral
   and M58's right-floated stamp).

   THE FINDING. Measured at 1280 on the shipped bytes, entry 01's numeral set its
   baseline at y217, its ROADMAP stamp at y219.9 and its surface name at y266.9:
   three marks, three baselines, none of them registered. The stamp took the row's
   first band alone on the right, so the left 90px of that band was empty; the
   entry column then ran 135px (entry 01) to 300px (entry 03) with one 16px
   numeral at the top of it and nothing else. Those two emptinesses meet at the
   column division and make ONE L-SHAPED VOID, hinged on the corner where the
   object's two most produced marks should have registered against each other.

   THE CURE, and the measurement that chose it. The entry column is the register's
   own hand and it now carries what a recorder's hand carries: the entry's
   NUMERAL and the entry's ENDORSEMENT, stacked on ONE left tab stop, so the
   column is occupied down its own height instead of holding one mark and 280px of
   nothing. The surface column then opens on its first baseline with the entry
   NAME at full measure, and every field key under it hangs on that same left tab
   stop. Numeral and name share one first baseline by grid baseline alignment
   rather than by tuned padding.
   The arrangement the review asked for -- numeral, name and chip all on the first
   baseline with the chip at the right terminus -- was built first and measured out
   of the property: the widest name sets 123.4px at the ratified --t-reg-name, the
   ROADMAP stamp sets 76.2px at Part IV's ratified 0.72rem, and with the gap that
   needs 208.4px of surface column. A 17rem reserved margin (DESIGN.md Part IV
   Layout, binding) yields at most 200px once the object keeps an inset wide enough
   for its own two leaves and an entry column wide enough for the head that names
   it. The two ways to buy the 8px were to cut the stamp below its ratified size or
   to cut the name below the size this pass ratified, and both are worse than
   moving the chip to the column whose head already says \`Entry\`. */
.reg-row{position:relative;display:grid;
  grid-template-columns:var(--entry-col) minmax(0,1fr);
  align-items:baseline;border-top:1px solid var(--rule-mid)}
.reg-row:first-of-type{border-top:0}
/* the entry column's division, drawn on the row rather than on a cell, so it runs
   the row's full height whether the entry carries an endorsement or is reserved */
.reg-row::before{content:"";position:absolute;inset-block:0;
  left:var(--entry-col);width:1px;background:var(--rule-mid)}
/* the entry column: arabic here, and nowhere else on the sheet now that the
   recorder's roman marks are struck (M56). Numeral over endorsement, one stop. */
.reg-num{grid-column:1;display:flex;flex-direction:column;align-items:flex-start;
  gap:0.6rem;padding:0.85rem var(--reg-pad) 0.9rem;
  font:400 var(--text-fine)/1.3 var(--mono);color:var(--ink-3);
  letter-spacing:0.06em}
.reg-main{grid-column:2;padding:0.85rem var(--reg-pad) 0.9rem;min-width:0}
/* THE OBJECT'S DISPLAY TIER (M60, superseding M57's mono cut). M57 set the entry
   names in the machine mono so the register would read as the recorder's hand and
   \xA72's table as the catalog. What it produced was an object with ONE type register
   in it: numerals, heads, names, keys, captions and notes all in one face within
   6px of one size, so nothing inside the instrument had rank and the whole of it
   read as a caption. The recorder's hand is the MACHINE tier, and it still holds
   the numerals, the heads and the keys; what was PRESENTED for recording is the
   document's own voice and sets in the document's own face, which is the split
   this property's temperature argument rests on. Measured ratio, 16.80px against
   the 10.88px machine tier: 1.544. */
.reg-surface{display:block;
  font:500 var(--t-reg-name)/1.28 var(--serif);
  font-variation-settings:'opsz' 20;
  color:var(--ink);letter-spacing:0}
/* M59 \xB7 THE OBJECT CHOOSES ITS OWN BREAKS. Re-measured by M60 against the display
   tier and the 138.4px surface measure the wider object now gives: \`Doc
   intelligence\` sets 118.8 and \`Payoff / lien data\` 123.4, so both hold one line
   at every width, and \`eNote / eVault: who holds control\` takes two with the break
   at the colon (108.0 over 130.9), which is the one break in it that leaves a
   whole clause on the second line. The spans carry no string of their own and add
   none: they are break control, and the rendered text is byte-identical to
   docs/copy/mortgage-copy.md's SEQUENCE row names. */
.reg-surface span{white-space:nowrap}
/* the row's first band is the entry NAME alone, at the full measure of the column
   the head names. The endorsement is entered in the entry column beside it. */
.reg-line{display:block}
/* THE RECORDING LINE, UNFILLED, KEYED (MR-F9). The key sets on the object's one
   left tab stop and the rule runs from that stop to the object's one right
   terminus, so nine blanks share two verticals instead of nine. */
/* ONE FIELD GRAMMAR FOR THE WHOLE REGISTER (M59, superseding M58's uniform
   four-line skeleton).

   M58 gave every numbered entry four recording lines, keyed where the copy doc
   authors a key and anonymous where it does not. Read down the column that
   produced entry 01 with one key over three open rules, entry 02 with one key over
   three open rules, and entry 03 with four keys: 02 did not read as an entry with
   one named field, it read as an entry that had LOST its labels, and the three
   presented entries looked like three differently-filled copies of one form.

   The cure the review preferred, three named keys in every entry, is foreclosed
   and the ground is on the record: MR-F9 admitted exactly six field keys to A29's
   closed chrome set and mapped them to the surfaces whose typed fields they are
   (\`Controlling party\` to 01, \`Typed field \xB7 source page\` to 02, and 03's four).
   Levelling the counts means either moving a key onto a surface that does not
   record it or authoring new ones, and this is a design-layer pass with no
   authority to write a string on the property whose thesis is that a claim means
   exactly what it says.

   So the grammar is levelled instead of the counts: EVERY RECORDING LINE UNDER A
   PRESENTED ENTRY IS KEYED, and no presented entry carries an anonymous rule. The
   number of lines is then a fact about the entry rather than a shape imposed on
   it, which is the same reading \xA72's schedule already states in prose. Entries 04
   and 05 stay exactly as MR-B5 and MR-E6 rule them: four blank rules apiece, no
   surface, no stamp, under the caption that says why. The two kinds of blank on
   this object are now visually distinct as well as legally distinct, which is what
   MR-E6 argued they were all along. */
.reg-field{display:block;margin-block-start:0.6rem}
.reg-field:first-of-type{margin-block-start:0.9rem}
/* THE OBJECT'S MACHINE TIER (M60). The field keys are the recorder's printed
   rubric: the words a blank form carries before anything is entered against them,
   which is exactly what these six are. They set below the entry names they belong
   to, in caps at the micro tier, so a key can never be mistaken for a value and
   the object's scale reads at a glance instead of on inspection. Part I \xA73.3's ban
   on "repeated tiny uppercase tracked section labels" is not touched: these label
   no section, they are inside one instrument, and they are members of the copy
   doc's own closed REGISTER CHROME set (A29 as amended by MR-F9). Contrast on
   --sheet: --ink-3 measures 5.57, over the 4.5 mono floor. */
.reg-key{display:block;font:400 var(--t-reg-micro)/1.3 var(--mono);color:var(--ink-3);
  text-transform:uppercase;letter-spacing:0.12em}
/* the unkeyed line takes the key's own line box as blank space, so the tab stops
   and the rule pitch are identical in a keyed row and an unkeyed one */
.reg-field.reg-open{padding-block-start:calc(var(--t-reg-micro) * 1.3)}
.reg-blank{display:block;height:1rem;border-bottom:1px solid var(--rule-hair)}
.reg-field .reg-blank{margin-block-start:0.1rem}
/* the reserved entries and their caption (A29, MR-B5, MR-E6). A recording line
   under a presented entry says this surface is not recorded yet; a reserved entry
   with nothing presented against it says the register is not full and we are not
   going to pretend it is. */
.reg-note{padding:0.6rem var(--reg-pad);
  border-top:1px solid var(--rule-mid);background:var(--sheet-3);
  font:400 var(--text-fine)/1.45 var(--mono);color:var(--ink-3)}
/* a reserved entry presents no surface and carries no stamp, which is the one
   deliberate difference between it and a presented entry and the thing the
   caption above it states. Its recording apparatus is the same four lines on the
   same four stops, so the register's blankness is uniform down its whole height
   (M58). */
/* a reserved entry's surface column opens on a blank rule and not on a line of
   type, so it has no first baseline for the numeral to register against: the row
   aligns to its own top edge instead and the numeral keeps the same tab stop and
   the same drop as every presented entry above it (M60). */
.reg-row.reg-reserved{align-items:start}
.reg-row.reg-reserved .reg-field:first-of-type{margin-block-start:0}
/* ---- THE RECORDING STAMP BOX, UNFILLED. The endorsement field a recorder
        stamps, drawn at the instrument's foot under the copy's own
        \`Received for record\`. It is the statutory artifact this property is named
        for and it is architecturally empty: a W3 frame, a W2 inner rule at a 4px
        inset (the double-ruled endorsement field), and two W1 recording lines on
        the same two verticals every other blank in the object uses. Renders only
        against an unfilled rule (A29 limit one): the day anything is written in
        it, it stops being chrome and becomes a claim the copy doc has to
        author. ---- */
.reg-foot{padding:0.65rem var(--reg-pad) 0.75rem;
  border-top:1px solid var(--rule-mid);background:var(--sheet-4)}
.reg-foot-key{display:block;font:400 var(--text-fine)/1 var(--mono);color:var(--ink-3);
  letter-spacing:0.06em;margin-block-end:0.45rem}
.reg-stampbox{display:block;border:2px solid var(--rule-frame);
  background:var(--sheet);padding:4px}
.reg-stampbox-inner{display:block;border:1px solid var(--rule-mid);
  padding:0.6rem 0.6rem 0.5rem}
.reg-stampbox .reg-blank{height:1.1rem}
.reg-stampbox .reg-blank + .reg-blank{margin-block-start:0.55rem}

/* ---- the stamp component (Part IV signature element 3) ---- */
.stamp{display:inline-block;font:400 0.72rem var(--mono);text-transform:uppercase;
  letter-spacing:0.14em;border:1px solid currentColor;border-radius:1px;
  padding:0.3em 0.7em;background:transparent;white-space:nowrap}
.stamp-waitlist{color:var(--seal)}
.stamp-roadmap{color:var(--ink-3)}
/* M60 \xB7 LIVE IS FILLED AGAIN, AND M58's CUT IS WITHDRAWN.
   DESIGN.md Part IV states this twice, in two different paragraphs, as law:
   signature element 3, "no fill except LIVE ... LIVE (family strip only): --ink
   fill, --paper-on-seal text", and the Color section, "LIVE ... renders as an
   --ink-filled chip: other properties' liveness is a fact this page reports, not
   a promise it makes (imported verbatim as law)". M58 read Part I \xA72's one-line
   registry cell as superseding both, and recorded that supersession NOWHERE BUT
   IN A CSS COMMENT IN THE SHIPPED BYTES. That is the exact self-ratifying pattern
   DESIGN.md Part III's own 2026-08-02 amendment blocks by name: "a clause is
   superseded in the document that holds it or it is not superseded." Part IV is
   the document that holds this clause and it has not been amended, so the shipped
   page conforms to it rather than to its own footnote.
   The two things M58 got right are kept: the mark is level, and it is the same
   component every other stamp on the sheet uses. What returns is the fill, which
   is the whole point of the clause -- the one property in the strip that is live
   is the one mark on the page that is filled, and this page's own WAITLIST is not.
   Contrast: --paper-on-seal on --ink measures 14.6:1, well over the 4.5 floor for
   text on a fill. */
.stamp-live{background:var(--ink);color:var(--paper-on-seal);border-color:var(--ink)}
/* the compound's suffix (Part IV signature element 3): the stamp, then the mono
   suffix OUTSIDE the border, in --ink-3. It sets inline beside the stamp so the
   separator separates two things, which is the condition MR-B14 could not meet
   when the suffix was wrapped onto its own line. */
.suffix{font:400 var(--text-fine) var(--mono);color:var(--ink-3);white-space:nowrap}

/* ---- tables: instruments, so they take the W3 frame, a banded head closed by a
        W2 rule, and W1 body rows. Three weights, one object.
        M57 RECESSES THEM ONTO THEIR OWN STOCK. Through M56 both tables stood on
        the base sheet inside a frame, which made them ruled text rather than
        instruments quoted inside the document: the whole reading column was one
        surface for its entire scroll. The body is --sheet-3 and the head band is
        --sheet-4, so a schedule reads as a leaf laid INTO the sheet, the way the
        register reads as a leaf laid ON the margin. ---- */
.tablewrap{overflow-x:auto;margin-block-start:var(--space-block)}
table{border-collapse:collapse;width:100%;min-width:38rem;
  border:2px solid var(--rule-frame);background:var(--sheet-3)}
table{table-layout:fixed}
/* M56: THE BANDED HEAD. The head row was --stone-2 under a 1px rule, half a step
   off the body, so the two tables opened without an edge. It is a banded head
   closed by the W2 field rule, which is the same head grammar the register's own
   column rule uses; M57 steps it one stock deeper than the body it heads. */
thead th{background:var(--sheet-4);font:500 var(--text-small) var(--serif);
  font-variation-settings:'opsz' 10;text-align:left;
  padding:0.85rem 1.1rem;border-bottom:1px solid var(--rule-mid);color:var(--ink)}
td{padding:var(--space-row) 1.1rem;border-top:1px solid var(--rule-hair);
  vertical-align:baseline}
tbody tr:first-child td{border-top:0}
td.surface{font-weight:600;font-variation-settings:'opsz' 16;letter-spacing:-0.006em}
td.gets{color:var(--ink-2)}
/* M56: THE STATUS COLUMN IS A RULED FIELD. The three ROADMAP stamps were floating
   at the right edge of an unbounded cell, which is why the section's own honesty
   rhythm did not read as a rhythm. The column has a leading W2 division rule down
   its full height and every stamp is entered against it.
   M59 STRIKES THE TICK. M56 also set a 2px x 0.62em bar ahead of each stamp,
   anchored to no rule, no cell edge and no column division the eye could locate:
   it stood ~20px left of its stamp and formed a faint vertical at x811 that only a
   reader who knew to look for it could find, and the family strip two sections
   down set the identical stamps with no tick at all, so the device was a one-off
   rather than a system. On an object whose stated argument is rule discipline an
   unanchored 2px mark is the one element that reads unintentional. The field is
   carried by the division rule that was already drawing it, which is the review's
   first cure and the one that leaves both schedules on one grammar.

   M61 PUTS BOTH SCHEDULES' STAMPS ON ONE BEHAVIOUR. The field stayed ruled and the
   division rule stayed, but the stamp inside it set FLUSH LEFT here and FLUSH
   RIGHT in the family strip: one component, one sheet, two column behaviours, and
   this was the one that read as a chip adrift, 14px off the division with 68px of
   empty cell behind it at 1280 because MR-G7 leaves this column the surplus, so
   the surplus was the thing the reader's eye landed in. THE RULE IS NOW ONE
   SENTENCE FOR BOTH: a stamp hangs on the closing edge of the column it stamps.
   Here that column is the schedule's last, so the three stamps land on the
   margin's own division at 940; in the family strip Status is the middle column
   and the four stamps land on that column's closing edge at 392. Two verticals,
   because they are two columns, and one behaviour, which is what was missing.
   It is also the behaviour both tables have always taken below 1000px, where the
   stacked row sets its stamp right against the entry. MR-G7 is untouched: it rules
   where the surplus goes and never which edge the stamp takes, and the surplus
   still falls in this column. What the division rule draws is the field's opening;
   the closing edge is where the entries are read off. */
th.status,td.status{text-align:right;white-space:nowrap;
  border-inline-start:1px solid var(--rule-mid);padding-inline:0.85rem}
/* MR-G7: both tables obey the sheet's own measure. \`max-width\` is not honoured on
   a table cell in auto layout, so the columns are ruled and the STATUS COLUMN IS
   LEFT AUTO, so the surplus falls into the most under-filled column on the page
   rather than into the reading line.
   M56 re-sets the ramp for the 17rem margin. --measure is a length and a table
   column takes it only where the frame is wide enough to leave the status field a
   stamp's worth of room afterwards. With the reserved margin at its ratified
   width the sheet's table reaches 950px at a 1440px viewport and not at 1100,
   which is where the old ramp had it, so the description column would have been
   ruled at 38rem inside an 857px table and the three ROADMAP stamps pushed out of
   their own cell. Three steps, each measured at the width it starts at. */
/* M58 STRIKES M57's ARBITRARY CAP AND GIVES BOTH SCHEDULES ONE OF THE SHEET'S
   OWN EDGES. M57 capped the table at \`--measure + 20rem\` inside a full-width
   \`.tablewrap\`, so at 1280 the frame stopped dead at x=1024: 67px inside the
   margin line at 956 and 204px short of the sheet edge at 1228, aligned to
   nothing. At 1000 the same cap landed exactly on the content edge, which is the
   proof that the number was arbitrary rather than compositional. The page then
   ran four unrelated right edges in one column (prose 704, tables 1024, register
   1207, bands 1228) plus the footer's own hairline at a fifth, and that is the
   specific unresolved tell that reads as unfinished beside a page holding one
   measure end to end.

   THE SCHEDULE IS STILL AN INSTRUMENT OF A SIZE; ITS SIZE IS NOW THE READING
   COLUMN. With the reserved margin restored to its ratified full height the
   reading column IS the instrument's measure: a table at \`width:100%\` terminates
   on the margin's rule, which is the same vertical every section rule and the
   recital band land on, so the schedule declares the margin rather than floating
   inside it. THREE RIGHT EDGES ON THE PAGE: --measure for prose, the margin line
   for the sheet's furniture and both schedules, and the sheet's fore-edge for
   the runhead, the register and the footer band.

   MR-G7's law is unchanged and its arrangement is unchanged: the columns are
   ruled, the description is capped, and the status column is left auto so the
   surplus falls there rather than into the reading line. What moves is the ramp,
   because the column is 860px at 1280 and 900px above 1330 rather than 1,132px:
   a description ruled at 38rem inside an 860px table leaves the status field 76
   pixels for a 125px stamp entry, so the percentage steps hold below 1440 and
   the length cap takes over at the width that can carry it. Each step measured
   at the width it starts at. */
thead th:first-child{width:9rem}
thead th:nth-child(2){width:52%}
thead th.status{width:auto}
.family thead th:first-child{width:8.75rem}
.family thead th.status{width:auto}
.family thead th:last-child{width:52%}
@media(min-width:1200px){
  thead th:first-child{width:10.5rem}
  thead th:nth-child(2){width:62%}
  .family thead th:last-child{width:64%}
}
@media(min-width:1440px){
  thead th:nth-child(2){width:var(--measure)}
  .family thead th:last-child{width:var(--measure)}
}
@media(max-width:999px){
  td.gets,.family tbody td:last-child{max-width:var(--measure)}
}
/* M57 STRIKES THE ROW HOVER TINT AND ITS 120ms TRANSITION. Neither table's rows
   contain a control or lead anywhere, so the tint promised an affordance that
   does not exist and put motion on a page whose whole argument is that nothing
   here is live. Row scanning is carried by the W1 body rules and by the status
   column's own W2 division, which are static marks. */
.family td:first-child,.family th:first-child{width:8.75rem}
.family td:first-child{font-family:var(--mono);font-size:var(--text-mono);
  white-space:nowrap;color:var(--ink)}
/* M40: the strip's stamps take the column edge and the suffix sets under them, so
   all four rows keep one optical edge and one pitch. The stack is kept and
   measured: the compound needs 200px set inline, and the Status column is 150px
   at 1440 because MR-G7 rules the Role column at --measure and leaves Status the
   surplus. Inline would need 227px of column, which this sheet does not have at
   any width, so the mandate is met on the pitch M40 already built.
   M60 RESTORES THE MANDATED SEPARATOR inside that stack, superseding MR-B14's
   parenthesis: DESIGN.md Part IV signature element 3 writes the compound as the
   \`WAITLIST\` stamp then \`\xB7 entity-gated\`, and the copy doc states the same
   compound twice in its own prose. Right-aligned under the stamp, the separator
   hangs on the stamp's own optical edge and continues it, which is the marginal
   continuation grammar this sheet already uses; it is not a list bullet, because
   the strip sets no list anywhere and the mark it continues is 11px above it.
   M61: the strip no longer declares its own alignment. It set \`text-align:right\`
   against a sheet-wide \`left\` and was the reason the sheet ran two stamp columns;
   the shared rule sets right for both schedules now, so this block carries only
   what is actually particular to the strip, which is the stacked suffix. */
.family td.status,.family th.status{white-space:nowrap;padding-inline:0.85rem}
.family td.status .suffix{display:block;line-height:1;margin-block-start:0.45rem}
.family tbody td{vertical-align:middle}
.family td:last-child{color:var(--ink-2)}
.closing{font-size:var(--text-small);color:var(--ink-3);margin-block-start:var(--space-block)}

/* ---- below 1000px both tables reflow to stacked entries, and the status stamp
        comes with the row it stamps (M45). No string is added, edited, dropped or
        reordered and every row keeps its DOM cell order. ---- */
@media(max-width:999px){
  .tablewrap{overflow-x:visible}
  table{display:block;min-width:0;width:100%}
  thead{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;
    clip-path:inset(50%);white-space:nowrap;border:0}
  tbody{display:block}
  tbody tr{display:grid;grid-template-columns:minmax(0,1fr) auto;
    column-gap:1rem;align-items:baseline;
    padding:var(--space-row) 1.1rem;border-top:1px solid var(--rule-hair)}
  tbody tr:first-child{border-top:0}
  tbody td{display:block;width:auto;padding:0;border-top:0}
  td.surface,.family tbody td:first-child{grid-column:1;grid-row:1;width:auto}
  td.status,.family tbody td.status{grid-column:2;grid-row:1;width:auto;
    text-align:right;border-inline-start:0;padding-inline-start:0}
  td.gets,.family tbody td:last-child{grid-column:1 / -1;grid-row:2;
    margin-block-start:0.55rem}
}

/* ---- \xA72 named unlocks: the schedule of gates, bounded above and below by the W2
        field rule and ruled inside by W1 (M35, M37, M52). The copy's four named
        event clauses are entered against the entries they gate, in the register's
        own grammar, in copy order and word for word. ---- */
/* M57 gives it its own ground. It is the section's densest field and it stood on
   the base sheet between two hairlines, which read as more of the same paper. */
.unlocks{position:relative;
  margin-block-start:var(--space-block);
  background:var(--sheet-4);border-block:1px solid var(--rule-mid);
  padding:calc(var(--space-block) * 0.8) var(--band-pad)}
.content .unlock-clause{max-width:var(--measure);margin:0;color:var(--ink)}
.unlock-sched{margin-block:calc(var(--space-block) * 0.7);
  border-block:1px solid var(--rule-hair)}
.usched{display:grid;grid-template-columns:6.9rem minmax(0,1fr);
  column-gap:1.05rem;border-top:1px solid var(--rule-hair);
  --row-pad:0.85rem;padding-block:var(--row-pad)}
.usched:first-child{border-top:0}
.usched-key{font:400 var(--text-fine)/1.62 var(--mono);color:var(--ink-3);
  letter-spacing:0.06em;white-space:nowrap;text-align:center;
  border-inline-end:1px solid var(--rule-hair)}
.usched-val{margin:0;color:var(--ink)}
/* ============================================================
   M60 \xB7 THE MARGIN CARRIES THE FOLIO MARKS AND THE PERSONA KEYS.

   THE FINDING. M59 relocated five notes into the reserved margin and measured the
   largest interval between two marks in the column. What it did not measure is
   how much of the column those five notes OCCUPY: below the register's foot the
   margin carried five short lines across 4,700px of scroll, so beside \xA72's gate
   schedule and beside \xA74's four portraits -- the two densest fields on the sheet,
   1,350px between them -- the reserved margin was blank paper with a tint on it.

   NOTHING IS INVENTED AND THE ONE-OBJECT LAW IS NOT AMENDED. This is M59's own
   device applied to the two schedules it skipped: a KEY hung in the margin beside
   the value it keys. Eight strings move, all eight already rendered, none edited,
   none duplicated, none added, and the DOM order of every one is untouched, so
   with CSS off the reader still meets docs/copy/mortgage-copy.md in copy order.
     \xA72  \`.usched-key\`   \`01 \xB7 02 \xB7 03\`, \`01\`, \`02\`, \`03\` -- the copy's own gate
                         keys, which are the REGISTER'S OWN ENTRY NUMBERS, hung
                         beside the clause that names each entry's blocker
     \xA74  \`.usched-key\`   \`The engineer\`, \`The founder\`, \`The servicing operations
                         lead\`, \`Or the platform product manager\` -- the copy's own
                         portrait keys, hung beside the sentence each one opens

   AND THE ARABIC IS THE SAME ARABIC (MR-D5, satisfied rather than bent). MR-D5
   reserves arabic to the register's entries "because a boxed 01 in the margin at
   the rule directly under 01 eNote / eVault invites a correlation that does not
   exist". These four keys are not a second numbering: they are \xA72's own citation
   OF the register's entries, the copy doc writes them as \`01\`, \`02\` and \`03\` for
   exactly that reason, and the correlation MR-D5 was protecting against is the one
   this page means. They are also not boxed, not ruled and not a mark of their own:
   they are typed keys on the margin's one tab stop, at --text-fine in --ink-3,
   subordinate to the register by the same construction M59 set for its five notes.
   scripts/check.mjs \xA711(m) still fails the build if a KEYED SECTION MARK is ever
   drawn in this column again, and none is: no \`::before\` on any section carries
   content, and the recorder's roman folios stay struck.

   AND THE SHEET LOSES THREE OF ITS FIVE RIGHT EDGES ON THE SAME MOVE. A key can
   only hang on the margin's own tab stop if the schedule it keys ENDS on the
   margin's division, which is where the two tables, every section rule and the
   recital band already end. So the two banded grounds and the two schedules take
   that vertical too, and the sheet is left with exactly two right edges: the
   READING LINE at --measure, and every GROUND, RULE, TABLE and SCHEDULE on the
   margin's division. The prose inside the bands does not move: \`.unlock-clause\`,
   \`.usched-val\` and \xA74's limit paragraph are still ruled at --measure, which is
   the ground \`.clause\` has stood on since M57 (a band wider than the provision
   set on it). Measured at 1280: five right edges (703.7, 816.6, 860.1, 1203.8,
   1227.8) become three, and the two that remain inside the reading column are the
   two the termination law names.
   ============================================================ */
.unlocks,.unlock-sched,.personasched,.limit{max-width:none}
.unlock-sched{margin-inline-end:calc(-1 * var(--band-pad))}
.content .unlock-clause,.content .usched-val{max-width:var(--measure)}
@media(min-width:1000px){
  .unlock-sched .usched,.personasched .usched{display:block;position:relative;
    padding-inline-end:0}
  /* the key registers on the FIRST BASELINE of the value it keys, not on the row's
     top edge: the row rule already runs from the value's own left edge to the
     margin's division, so rule, clause and key make one ledger line and the four
     portraits keep their subjects even though the subject sets in the margin.

     M61 MAKES THE TAB STOP ONE REGISTRATION INSTEAD OF TWO. The offset was written
     \`calc(0.85rem + 0.36rem)\` and described as the declared difference between the
     two leadings. It was neither: \`0.85rem\` is the GATE schedule's row padding
     hard-copied into a rule that also serves the PERSONA schedule, whose rows pad
     0.7rem, so the one tab stop ran two registrations 2.4px apart, and \`0.36rem\`
     was a round number that landed neither of them on zero. Measured with a
     zero-height baseline-aligned probe: the gate keys sat 3.23px above the first
     baseline of their clause and the persona keys 0.83px above it.

     The offset is now two terms and each one says what it is. \`--row-pad\` is the
     schedule's OWN declared row padding, taken from the schedule rather than
     copied from its neighbour, so the key follows its rows when they are re-set.
     \`--key-drop\` is the distance from a value's content-box top to its first
     baseline minus the same distance in the key, which is a fact about two
     typefaces at two sizes and two leadings and is not derivable in CSS: it is
     MEASURED, it is one number because both schedules set the same two faces at
     the same two sizes, and it is measured again on every publish -- the viewport
     gate's \`baselineTab\` probe fails the build if either schedule drifts off zero.
     A constant that is checked is a constant; one that is only asserted is the
     defect this replaces. */
  .unlock-sched .usched,.personasched .usched{--key-drop:8.99px}
  .unlock-sched .usched-key,.personasched .usched-key{position:absolute;
    top:calc(var(--row-pad) + var(--key-drop));
    inset-inline-start:100%;width:var(--margin-w);
    padding-inline:var(--reg-inset);
    text-align:start;white-space:normal;border-inline-end:0;
    font:400 var(--text-fine)/1.5 var(--mono);color:var(--ink-2);
    letter-spacing:0.06em}
}
/* MR-E9: the gate schedule stacks on a phone, so the page's densest legal copy is
   not set at 17 to 25 characters a line.

   AND THE TWO PHONE GRAMMARS ARE TWO NAMED VARIANTS, NOT DRIFT (M62.3, recorded in
   DESIGN.md Part IV Layout). One \`.usched\` takes two settings below 700px and two
   different left origins, 28.6px and 44.6px at 390, and until this pass neither was
   written down anywhere. A distinction that is real and unrecorded is indistinguishable
   from a mistake, and the next pass unifies it by reflex.
     THE DISPLAY difference is what the key IS. \xA72's key is a FOLIO REFERENCE -- \`01\`,
     \`02\`, \`03\` -- pointing at the register's own entry numbers, part of no sentence, so
     it stacks as a block above its clause. \xA74's key is a GRAMMATICAL SUBJECT, the head
     of the sentence its value completes, so it sets inline as a lead-in: a subject that
     stacks above its own predicate stops being a sentence with CSS off, which is the
     one thing MR-C7 and MR-H1 will not spend.
     THE ORIGIN difference is not the schedule's at all. \xA72's schedule stands inside the
     \`.unlocks\` band and takes that band's own \`--band-pad\` inset, exactly as the clause
     above it does; \xA74's stands on the reading column. The 16px is the band's. Aligning
     the two would mean pulling \xA72's schedule out of the band it is filed in. */
@media(max-width:699px){
  .unlock-sched .usched{display:block;--row-pad:0.65rem}
  .unlock-sched .usched-key{display:block;text-align:start;border-inline-end:0;
    padding-inline-end:0;margin-block-end:0.35rem}
}

/* ============================================================
   \xA73 THE BOUNDARY \xB7 the operative provision, and the sheet's centre of gravity.

   M56 UNFRAMES IT, superseding M43's \`.clause-field\` card. DESIGN.md Part IV
   Layout says of this property, in its own words, "No cards anywhere: there is no
   document to frame yet", and signature element 4 specifies the section exactly:
   "one paragraph at --text-clause, 62ch, ruled off above and below" and nothing
   added. M43 answered a real finding (a heading and a paragraph alone in an
   1280x780 band) with the one device the Part bans, and the card then read as the
   only framed prose on the sheet.
   What replaces the frame is the instrument's own device: the provision is ruled
   off above and below by the W3 instrument rule, its heading sets as a MARGINAL
   CLAUSE KEY beside it (Part I \xA73.2's ratified rail/margin placement transform,
   which is the same transform the caption rail on the hub runs), and the operative
   sentence carries the lead-in weight so the reader meets a provision with its
   holding stated first rather than thirteen undifferentiated lines.
   ============================================================ */
/* M57 GIVES THE PROVISION ITS OWN GROUND, AND THE GROUND IS A BAND AND NOT A
   CARD. Part IV's ban is on framing prose ("no cards anywhere: there is no
   document to frame yet") and it is not touched: the provision has no side
   rules, no corners and no box. What it has is a distinct stock running the
   sheet's whole width between the two W3 instrument rules that were already
   ruling it, which is what a recital band is on a real instrument, and which is
   the page's largest single value step inside the reading column. */
.content>section.boundary{margin-block-start:calc(var(--space-section) * 1.05)}
/* M59 STEPS THE BAND OFF THE RAIL. Through M58 the recital band and the reserved
   margin were the SAME VALUE, oklch(0.928 0.010 40): the band's heavy top and
   bottom rules spanned x52 to x956 and stopped dead on the margin's division while
   the identical tone continued unbroken to the sheet's fore-edge at x1228, so the
   band and the rail fused into one L-shape neither element intends and the page's
   two W3 rules died in mid-field. The band takes the next stock down the ladder,
   --sheet-3, which is the stock every other recessed instrument on this sheet
   already stands on; its rules now terminate on a visible tonal edge, and the
   margin reads as the column beside the band rather than as part of it. */
.clause{max-width:none;background:var(--sheet-3);
  border-block:2px solid var(--rule-frame);
  padding-block:calc(var(--space-block) * 1.05);
  padding-inline:var(--gutter);
  margin-inline:calc(-1 * var(--gutter))}
@media(min-width:1000px){
  /* the clause key stands in the reserved margin from here up, so the band is one
     column again and the provision takes the whole of it. */
  .clause{display:block;margin-inline-end:0;padding-inline-end:var(--gutter)}
}
.boundary h2{margin:0;max-width:none;
  font:600 1.0625rem/1.28 var(--serif);font-variation-settings:'opsz' 12;
  letter-spacing:0;color:var(--ink)}
.content .boundary-clause{font:400 var(--text-clause)/1.38 var(--serif);
  font-variation-settings:'opsz' 20;max-width:min(62ch,var(--measure-clause));
  color:var(--ink);letter-spacing:-0.006em;margin:0}
/* the operative sentence, in the lead-in weight. One string, one paragraph, one
   \`<p>\`: the mark is a display transform on the sentence the clause opens with,
   and the DOM text is byte-identical to the copy doc's paragraph. */
.content .boundary-clause .lead,
.content .boundary-clause .close{font-weight:600;color:var(--ink)}
/* between 820 and 999 there is no reserved margin to stand the key in, so it keeps
   the carved key column M56 gave it. */
@media(min-width:820px) and (max-width:999px){
  .clause{display:grid;grid-template-columns:10rem minmax(0,1fr);
    column-gap:clamp(1.5rem,2.4vw,2.5rem)}
  .boundary h2{text-align:right;padding-block-start:0.42rem;
    border-inline-end:1px solid var(--rule-hair);padding-inline-end:clamp(1.5rem,2.4vw,2.5rem);
    margin-inline-end:calc(-1 * clamp(1.5rem,2.4vw,2.5rem))}
}
@media(max-width:819px){
  .boundary h2{margin-bottom:var(--space-row)}
}

/* ---- \xA74 the honest limit: body size inside the same two quiet field rules, so
        the section's display tier belongs to the ask and not to a refusal
        (M49, copy doc MR-C4). ---- */
.limit{position:relative;
  margin-block:calc(var(--space-block) * 1.05);
  background:var(--sheet-4);border-block:1px solid var(--rule-mid);
  padding:calc(var(--space-block) * 0.75) clamp(1rem,1.6vw,1.5rem)}
.content .limit p{font:400 var(--text-body)/1.62 var(--serif);
  font-variation-settings:'opsz' 11;
  color:var(--ink-2);max-width:var(--measure);margin:0}
.content p.askline{font:500 clamp(1.2rem,1.05rem + 0.55vw,1.5rem)/1.42 var(--serif);
  font-variation-settings:'opsz' 18;letter-spacing:-0.006em;
  color:var(--ink);max-width:var(--measure);
  margin-block-start:var(--space-block)}

/* ---- \xA74 the four readers, entered against their own names (MR-C7) ---- */
.persona-lead{margin-bottom:calc(var(--space-row) * 0.75)}
.personasched{margin-block:0 var(--space-row);
  border-block:1px solid var(--rule-hair)}
.personasched .usched{grid-template-columns:12rem minmax(0,1fr);
  column-gap:0.95rem;--row-pad:0.7rem}
.personasched .usched-key{text-align:start;white-space:normal;line-height:1.5}
/* THE FOURTH PORTRAIT HANGS ITS CONJUNCTION, AND THE WRAP IS ANSWERED IN LAYOUT
   RATHER THAN IN COPY (M62, copy doc MR-H1).

   THE DEFECT THIS REPLACES. MR-C7 splits each portrait at its relative pronoun, so
   the fourth key is the whole head of the fourth sentence, \`Or the platform product
   manager\`. Set at --text-fine in the sheet's mono at 0.06em it measures 257.92px
   against the margin key's 248px inner measure, and it was the only mark in this
   column that set two lines. M61 answered that by moving the \`Or\` out of the key and
   into the head of the value, which made the served document read \`The platform
   product manager Or whose roadmap now says mortgage data partner\` with CSS off: a
   string the file of record does not contain, authored to close a nine-pixel
   overset. A ratified string is not a layout lever.

   THE CURE IS THE PRINTER'S, AND IT IS THE OLDEST ONE. The conjunction hangs into
   the gutter and the NAME lands on the margin's one tab stop with the other three,
   so the four portraits still read as four names down the column and the fourth
   still reads as the last of an enumeration. The margin's tab stop is not doubled:
   \`the platform product manager\` starts exactly where \`The engineer\` starts, and
   what stands left of it is a hanging conjunction, which is a hang and not a second
   registration -- the same distinction that lets hung punctuation keep an optical
   left edge.

   THE INDENT IS DERIVED AND NOT CHOSEN. \`Or \` is three characters of this
   schedule's own face at this schedule's own tracking: 3ch of advance plus three
   times the 0.06em the keys are tracked at. Written that way it follows the type
   when the type is re-set, and it cannot go stale as a pixel constant would. It
   measures 24.97px at 13px, which leaves the name's line 232.95px inside a 248px
   measure and hangs 12.97px past the margin's division into 239px of clear paper:
   the value's own first line ends 299px to the left of it at 1280 and 51px at
   1000, the narrowest width this margin exists at. scripts/check-viewport.mjs
   \`marginHang\` measures that clearance on every publish.

   AND IT APPLIES ONLY WHERE THERE IS A GUTTER TO HANG INTO, WHICH IS MEASURED AND
   NOT ASSUMED. A hung character needs clear paper at least its own width to its
   left or it reads as the last word of the line it is hanging beside. The clear
   paper here is the gutter between the reading field's right edge and the margin's
   division, and that gutter does not exist at the bottom of this range: at 1000 the
   field is capped by the COLUMN and not by \`--measure\`, so it runs to within 4px of
   the division and the hang would stand 8.2px from the value's own first line. The
   gutter opens as soon as \`--measure\` takes over, reaching 25.9px at 1020, 43.6px at
   1040 and 256.3px at 1280. The hang is taken at 1040 and above, where the gutter is
   at least one and a half times the hang; below it the key wraps to two lines in the
   margin, which is what five of this column's other marks already do and what \`The
   servicing operations lead\` does in the 700-999 band.

   BETWEEN 700 AND 999 the key sets in the schedule's own 12rem column and wraps
   there; below 700 it is an inline lead-in and \`text-indent\` does not reach an
   inline box at all. Both are the settings those bands already had. */
@media(min-width:1040px){
  .personasched .usched-key.k-hang{text-indent:calc(-3ch - 0.18em)}
}
@media(max-width:699px){
  .personasched .usched{display:block;--row-pad:0.65rem}
  .personasched .usched-key{display:inline;border-inline-end:0;padding-inline-end:0.4rem}
  .personasched .usched-val{display:inline}
}

/* ---- \xA74 THE DOCKET \xB7 a quoted instrument, and never a field to type in.
        M56 raises it from a hairline-margined list to an object with its own
        chrome: a W2 frame, an envelope band carrying the routing pair on
        --sheet-3, a W2 division, and the message's three lines on --sheet-2.
        THE INPUT-GEOMETRY BAN (MR-A5 limit one) IS UNAMENDED AND IS WHY THE
        CHROME STOPS THERE: no rule under any line, no box around any line, no
        placeholder, nothing that reads as typeable. This property's ratified
        villain is a surface that lies about what it is, and a three-field inline
        signup form that is not one is that villain drawn in this property's own
        ink. The block carries the mailto's own \`to\` and \`subject\` so a reader
        with webmail and no protocol handler can copy the whole message (MR-C5). ---- */
.ask{margin-block-start:var(--space-block);scroll-margin-block-start:5.5rem}
.ask>p{margin:0;margin-block-start:var(--space-block)}
/* M57 raises the frame to W3 and steps the two zones onto real stock: the
   envelope band takes --sheet-5, the deepest stock on the sheet and the only
   place it is used, and the message takes --sheet-3. A quoted instrument is a
   thing lying in the document, and it took the same tint as everything else. */
.docket{max-width:var(--measure);border:2px solid var(--rule-frame);
  background:var(--sheet-3)}
.docket-row{padding:0.16rem 1rem}
/* the envelope band: the routing pair the mail is addressed with, on the head
   stock, closed by the W2 field rule. The message's own three lines follow on the
   docket's own stock. Two zones, one quotation, and no rule under any line. */
.docket-row.docket-env{background:var(--sheet-5)}
.docket-row.docket-env:first-of-type{padding-block-start:0.6rem}
.docket-row.docket-env + .docket-row:not(.docket-env){
  border-top:1px solid var(--rule-mid);padding-block-start:0.85rem}
.docket-row.docket-env:last-of-type{padding-block-end:0.6rem}
.docket-row:last-child{padding-block-end:0.85rem}
.docket-row span{display:block;font:400 var(--text-fine)/1.65 var(--mono);
  color:var(--ink-2)}
.docket-row.docket-env span{color:var(--ink-2)}

/* ---- MR-J1 (2026-08-02, owner-directed): the register takes names, and this is
        the thing that takes them. The docket quoted a message the reader had to go
        somewhere else to send; these are the same five lines as fields that send it
        here. It inherits the docket's instrument grammar (W3 frame, --sheet-5
        envelope band over --sheet-3 message stock) because it is the same
        instrument, now fillable. MR-A5's "never input geometry" governed the
        DOCKET, a quotation; this is the intake itself, and an intake takes input. ---- */
.wl{max-width:var(--measure);border:2px solid var(--rule-frame);
  background:var(--sheet-3);margin-block-start:var(--space-block)}
.wl-env{background:var(--sheet-5);padding:0.6rem 1rem;
  border-bottom:1px solid var(--rule-mid)}
.wl-env span{display:block;font:400 var(--text-fine)/1.65 var(--mono);color:var(--ink-2)}
.wl-body{padding:0.85rem 1rem 1rem}
.wl-f{display:block;margin-block-start:0.7rem}
.wl-f:first-child{margin-block-start:0}
.wl-f>span{display:block;font:400 var(--text-fine)/1.65 var(--mono);color:var(--ink-2);
  margin-block-end:0.2rem}
.wl-f .req{color:var(--ink-3)}
.wl-f input,.wl-f select,.wl-f textarea{
  display:block;width:100%;box-sizing:border-box;
  font:400 var(--text-fine)/1.5 var(--mono);color:var(--ink-1);
  background:var(--sheet-1);border:1px solid var(--rule-mid);border-radius:0;
  padding:0.4rem 0.55rem;-webkit-appearance:none;appearance:none}
.wl-f textarea{min-height:3.4rem;resize:vertical}
.wl-f select{background-image:none}
.wl-f input:focus,.wl-f select:focus,.wl-f textarea:focus{
  outline:2px solid var(--seal);outline-offset:1px;border-color:var(--seal)}
.wl-act{margin-block-start:0.95rem}
.wl-note{font:400 var(--text-fine)/1.55 var(--mono);color:var(--ink-3);
  margin:0.6rem 0 0}
/* the JS-off path is a real POST and needs no script; these two only matter when
   the enhancement runs, and they are inert otherwise. */
.wl-live{font:400 var(--text-fine)/1.6 var(--mono);color:var(--ink-2);margin:0.6rem 0 0}
.wl-live:empty{display:none}
.wl[hidden]{display:none}
/* the demoted mailto: still a real button and still the ratified label, set quieter
   than the submit above it because it is now the alternate and not the act. */
.alt-lead{font:400 var(--text-fine)/1.65 var(--mono);color:var(--ink-3);
  max-width:var(--measure)}
.ask>p.alt-lead{margin-block-start:var(--space-block);margin-block-end:0.55rem}
.alt-act .btn{background:transparent;color:var(--seal);
  box-shadow:inset 0 0 0 1px var(--seal)}
.alt-act .btn:hover{background:var(--seal);color:var(--paper-on-seal)}

/* ---- the recipient line: what the button does and who answers it
        (MR-A4, MR-F5). Operational instruction, in the machine voice. ---- */
.recipient{font:400 var(--text-fine)/1.65 var(--mono);color:var(--ink-3);
  max-width:var(--measure);margin:0.75rem 0 0}
.ask>p.recipient{margin:0.75rem 0 0}
.hero-recipient{margin-block-start:0.7rem}

/* the two open fields close on the right on the line the termination law assigns
   them, so no prose block on the sheet ends on an unreconciled ragged right.
   M57: the closure is now the STOCK's own edge rather than a hairline drawn where
   the stock would have ended anyway. A ground that stops at --measure states the
   termination more plainly than a rule describing it, and a hairline on three
   sides of a field is a box pretending not to be one. */

/* ---- buttons ---- */
.btn{display:inline-block;font:500 1.0625rem var(--serif);
  font-variation-settings:'opsz' 14;padding:0.85rem 1.75rem;
  border-radius:2px;background:var(--seal);color:var(--paper-on-seal);
  text-decoration:none;white-space:nowrap;
  transition:background 150ms var(--quart),transform 120ms var(--quart)}
.btn:hover{background:var(--seal-deep);color:var(--paper-on-seal)}
.btn:active{transform:translateY(1px)}

/* ---- footer: the band the reserved margin terminates into. Same stock as the
        margin, opened by the W3 instrument rule, and it runs to the sheet's own
        cut edge, where the leaf and the cast take over. ---- */
.footer{background:var(--sheet-2);border-top:2px solid var(--rule-frame);
  padding-block:var(--space-block) calc(var(--space-block) * 1.35);flex:none}
.footer-inner{padding-inline:var(--gutter)}
.foot-links{font:400 var(--text-small) var(--mono);color:var(--ink-3);
  max-width:var(--measure);
  padding-bottom:var(--space-row);border-bottom:1px solid var(--rule-hair);
  margin-bottom:var(--space-block)}
/* M58: AND THE FOOTER'S HAIRLINE TAKES THE SAME TERMINUS AS EVERY OTHER RULE ON
   THE SHEET. It was ruled to --measure, which made it the page's fifth right
   edge: a rule ending on a prose measure under a band that has no prose measure.
   The footer sits below the reserved margin, so its rule runs to the vertical
   the margin's own rule stands on and the reader meets one terminus from the
   runhead to the last line of the estate note. */
@media(min-width:1000px){
  .footer-inner{padding-inline:var(--gutter) 0}
  .foot-links{max-width:none;margin-inline-end:var(--margin-w)}
}
/* every anchor in the footer link row is a real tap target (WCAG 2.2 AA 2.5.8);
   the footer has no forty-pixel ceiling, so it takes the full 40. */
.foot-links a{color:var(--seal);display:inline-block;padding-block:12px;
  line-height:16px}
.standing{font:400 var(--text-body)/1.62 var(--serif);color:var(--ink);
  font-variation-settings:'opsz' 11;
  max-width:var(--measure);margin:0}

/* ---- motion: one load under 750ms, then still forever. The counter, the sheet,
        the ruling, the reserved margin and the register are present at 0ms and
        never animate: emptiness that moves is decoration. ---- */
html.js .m-h1{opacity:0;transform:translateY(8px)}
html.js .m-h1.in{opacity:1;transform:none;
  transition:opacity 600ms var(--expo) 80ms,transform 600ms var(--expo) 80ms}
html.js .m-sub{opacity:0}
html.js .m-sub.in{opacity:1;transition:opacity 450ms var(--expo) 160ms}
html.js .m-cta{opacity:0}
html.js .m-cta.in{opacity:1;transition:opacity 400ms var(--expo) 240ms}
@media(prefers-reduced-motion:reduce){
  html.js .m-h1,html.js .m-sub,html.js .m-cta{
    opacity:1;transform:none;transition:none}
}
</style>
</head>
<body>

<div class="sheet">

<header class="runhead">
  <div class="runhead-inner">
    <!-- MR-D4 / MR-G4: one category string, \`payoff, lien and eNote data\`, whole
         at every width. MR-E1 / MR-E2 / MR-E8: the door and the act render at
         every width, and below 1000px the head sets as two rows so the name, the
         status artifact and the machine door all hold the first forty pixels.
         Reading order does not move: with CSS off this is still name, category,
         status. -->
    <p class="eyebrow"><code class="self">apis.mortgage</code><span class="cat"><span class="sep"> \xB7 </span><span class="cat-long">payoff, lien and eNote data</span></span><span class="stat"><span class="sep"> \xB7 </span><span class="stamp stamp-live">LIVE</span></span></p>
    <!-- MR-F4: the standing act targets the ASK BLOCK, not \xA74's heading. -->
    <p class="rh-act"><a href="#ask">Join the waitlist</a></p>
    <p class="door"><a href="/llms.txt"><code>/llms.txt</code></a></p>
  </div>
</header>

<div class="page">

  <main class="content">

    <section class="hero" aria-label="apis.mortgage">
      <div class="hero-grid">
        <div class="hero-head">
          <!-- M56: one marked term. \`reach\` is the word MR-E3, MR-F2 and MR-G3 are
               each written about, and the mark is the display transform Part I
               \xA73.2 permits on a rendered string. The string is byte-identical to
               docs/copy/mortgage-copy.md's HEADLINE block. -->
          <h1 class="m-h1">Agents can\u2019t originate a mortgage. Neither can most software. Both will <span class="mark">reach</span> the company that holds the file through apis.mortgage.</h1>
        </div>

        <div class="hero-text">
          <p class="m-sub hero-sub">For the founder blocked on a Payoff figure that still arrives by telephone and portal login: that figure will come back attested, the issuing party named on it, the loan record cited, this entity answering for it, with its per-diem and its good-through date.</p>
          <p class="m-sub hero-stand">apis.mortgage is not the vault, the servicer or the recorder, and it is not the licensee. It is the headless system of record: the software that holds the file and answers for the record. The licensed operator \u2014 the broker, the lender, the servicer \u2014 is the customer, and brings the license. The machine face is live and priced; the attested rows post here when they earn LIVE.</p>
        </div>

        <div class="hero-cta">
          <p class="standing-reason m-cta">The waitlist will hear it first, and the order these surfaces ship in is set by what this list asks for.</p>
          <!-- MR-F5 / MR-F6: the fold's only action is a labelled control and it
               explains its own inbox at the control, which is where a cold reader
               asks the question. -->
          <p class="m-cta"><a class="btn" href="mailto:keys@apis.finance?subject=apis.mortgage%20waitlist&amp;body=What%20we%27re%20building%3A%0AWhich%20surface%20first%20(eNote%2FeVault%2C%20doc%20intelligence%2C%20payoff%2Flien)%3A%0AExpected%20volume%3A">Email us to join</a></p>
          <p class="recipient hero-recipient">Opens your mail app to keys@apis.finance, the shared inbox for apis.finance and its properties. Answered by a person.</p>
        </div>
      </div>
    </section>

    <!-- ============================================================
         THE RESERVED MARGIN, AND THE ONE COMPOSED OBJECT IN IT.

         M56 returned the register to the margin DESIGN.md Part IV assigns it,
         from the hero column M42 through M55 had it borrowing. M57 moves the
         aside inside the reading grid and places it in ROW ONE, beside the hero
         and nowhere else, so the margin is co-extensive with the object it
         reserves instead of running 5,000px of empty tint to the footer. The
         one-object law is unchanged: this is still the only thing in it.

         The object is chrome, not copy: it is aria-hidden because MR-D11 rules
         it a specimen of data \xA72 marks up properly as a <table> with
         scope="col" headers, it holds no focusable element, and every key in it
         is a fact \xA72's own SEQUENCE states in prose on both served surfaces
         (MR-F10). With CSS off it now reads directly after the hero section it
         stands beside, complete, and before \xA72 -- which is the copy order the
         specimen is a specimen OF, and which no longer splits the fold's own
         copy in two the way the M42-M55 placement did.
         ============================================================ -->
    <aside class="margin" aria-hidden="true">
    <div class="register" aria-hidden="true">
      <!-- the tab, breaking the instrument frame it belongs to -->
      <div class="reg-tab">Entry</div>
      <!-- M57: the head names the column it actually stands over, and only that
           one. \`Status\` is struck because the body never ruled a status column
           and the object's own argument is rule discipline; the three ROADMAP
           marks sit on the surface column's right terminus instead. \`Entry\`
           heads column one from the tab above it. -->
      <div class="reg-cols"><span>Surface</span></div>
      <!-- MR-G5: the specimen says once, in its own tier, that its blanks are
           deliberate. Nothing is filled: the caption is the claim.
           MR-J2 (2026-08-02): the caption said "nothing has shipped", which was a
           claim about the whole property made by a caption standing over three
           mortgage rows. On the day POST /waitlist started answering it became
           false, and it is the diluted posture the owner ruling bans by name. The
           blanks are still deliberate and still unfilled; what is scoped is the
           claim, to the rows this object actually shows. -->
      <div class="reg-caption">Specimen \xB7 no row is filled because no row has shipped</div>
      <!-- MR-F9: the recording lines are KEYED. Every value beside every key is
           empty, every stamp is ROADMAP, and nothing is presented as furnished. -->
      <div class="reg-row">
        <div class="reg-num">01<span class="stamp stamp-roadmap">ROADMAP</span></div>
        <div class="reg-main">
          <div class="reg-line"><span class="reg-surface"><span>eNote / eVault:</span> <span>who holds control</span></span></div>
          <div class="reg-field"><span class="reg-key">Controlling party</span><span class="reg-blank"></span></div>
        </div>
      </div>
      <div class="reg-row">
        <div class="reg-num">02<span class="stamp stamp-roadmap">ROADMAP</span></div>
        <div class="reg-main">
          <div class="reg-line"><span class="reg-surface"><span>Doc intelligence</span></span></div>
          <div class="reg-field"><span class="reg-key">Typed field \xB7 source page</span><span class="reg-blank"></span></div>
        </div>
      </div>
      <div class="reg-row">
        <div class="reg-num">03<span class="stamp stamp-roadmap">ROADMAP</span></div>
        <div class="reg-main">
          <div class="reg-line"><span class="reg-surface"><span>Payoff / lien data</span></span></div>
          <div class="reg-field"><span class="reg-key">Issued by</span><span class="reg-blank"></span></div>
          <div class="reg-field"><span class="reg-key">Loan record</span><span class="reg-blank"></span></div>
          <div class="reg-field"><span class="reg-key">Per diem</span><span class="reg-blank"></span></div>
          <div class="reg-field"><span class="reg-key">Good through</span><span class="reg-blank"></span></div>
        </div>
      </div>
      <!-- MR-E6: the reserved entries and their caption. A reserved entry with
           nothing presented against it says the register is not full and we are
           not going to pretend it is. -->
      <div class="reg-note">Entries 04 and 05 are reserved. Nothing is presented against them.</div>
      <div class="reg-row reg-reserved">
        <div class="reg-num">04</div>
        <div class="reg-main">
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
        </div>
      </div>
      <div class="reg-row reg-reserved">
        <div class="reg-num">05</div>
        <div class="reg-main">
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
          <div class="reg-field reg-open"><span class="reg-blank"></span></div>
        </div>
      </div>
      <!-- THE RECORDING STAMP BOX, UNFILLED (M56). The statutory artifact this
           property is named for, under the copy's own \`Received for record\`. -->
      <div class="reg-foot">
        <span class="reg-foot-key">Received for record</span>
        <span class="reg-stampbox"><span class="reg-stampbox-inner"><span class="reg-blank"></span><span class="reg-blank"></span></span></span>
      </div>
    </div>
    </aside>

    <section aria-labelledby="h-ships">
      <h2 id="h-ships">What ships first, and who is liable for it.</h2>
      <p>You don\u2019t need a license to know what the unregulated edge of a mortgage is. Extending credit, taking the Application, negotiating terms, deciding: those are Lender-Reserved, and they stay with the licensed operator who performs them. The edge is not reserved, and it ships first, from this property, in this order.</p>
      <div class="tablewrap">
        <table role="table">
          <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Surface</th><th role="columnheader" scope="col">What your agent gets</th><th role="columnheader" scope="col" class="status">Status</th></tr></thead>
          <tbody role="rowgroup">
            <tr role="row"><td role="cell" class="surface">eNote / eVault: who holds control</td><td role="cell" class="gets">Typed state on electronic promissory notes: which eVault holds control, transfer and control events attested, under the UCC\u2019s control regime for electronic chattel paper</td><td role="cell" class="status"><span class="stamp stamp-roadmap">ROADMAP</span></td></tr>
            <tr role="row"><td role="cell" class="surface">Doc intelligence</td><td role="cell" class="gets">The mortgage file read by machine: the note, the security instrument, the disclosure set, extracted as typed fields with the source page cited</td><td role="cell" class="status"><span class="stamp stamp-roadmap">ROADMAP</span></td></tr>
            <tr role="row"><td role="cell" class="surface">Payoff / lien data</td><td role="cell" class="gets">Attested Payoff figures: the issuing party named, the loan record cited, per-diem and good-through date, with lien and release status on mortgage Collateral</td><td role="cell" class="status"><span class="stamp stamp-roadmap">ROADMAP</span></td></tr>
          </tbody>
        </table>
      </div>
      <div class="unlocks">
        <p class="unlock-clause">Each row waits on named events, never on a date.</p>
        <dl class="unlock-sched">
          <div class="usched">
            <dt class="usched-key">01 \xB7 02 \xB7 03</dt>
            <dd class="usched-val">Two of them are common to all three: a written counsel opinion that the surface performs no Lender-Reserved act and performs no licensed act by software, and a licensed operator on the other side of it, because an attested figure is attested by the party licensed to issue it \u2014 the operator brings the license, the software holds the record.</dd>
          </div>
          <div class="usched">
            <dt class="usched-key">01</dt>
            <dd class="usched-val">The eNote row waits on a third, a signed agreement with an eVault provider, and until there is one no row here will describe this entity as holding control of anything.</dd>
          </div>
          <div class="usched">
            <dt class="usched-key">02</dt>
            <dd class="usched-val">The doc intelligence row has no blocker of its own; it waits only on the two above.</dd>
          </div>
          <div class="usched">
            <dt class="usched-key">03</dt>
            <dd class="usched-val">The payoff and lien row waits on the per-state recording and release rules it would answer with.</dd>
          </div>
        </dl>
        <p class="unlock-clause">Licenses gate the licensed acts, which a credentialed human performs and software never does. Nothing gates the Lender-Reserved acts; the Lender performs them alone. When a row\u2019s events have happened, the row changes.</p>
      </div>
      <!-- M59: this sentence was already an annotation on the schedule above it.
           At 1000px and up it stands in the reserved margin beside that schedule;
           below 1000 there is no margin and it renders where it always did. The
           string, its class and its position in the DOM are unchanged. -->
      <p class="closing marginal">When a row goes live it will say LIVE and its price will post on a rate card.</p>
    </section>

    <section class="boundary" aria-labelledby="h-boundary">
      <div class="clause">
        <h2 id="h-boundary" class="marginal">Why this door stands apart.</h2>
        <p class="boundary-clause"><span class="lead">The license stays with the operator. The record stays with the software.</span> Mortgage acts sit under their own federal and state regime, and an API in front of them moves none of them. apis.mortgage draws the line where the regime draws it: the software is the system of record \u2014 the loan file, the market record, the pipeline \u2014 and the licensed operator who runs on it brings the license, extends the credit, takes the Application, decides. You\u2019ve seen mortgage APIs that turn out to be lead forms, and lead forms that turn out to be someone else\u2019s license. This one holds the file and names whose license every regulated act runs on: the operator\u2019s. A price posts on this page\u2019s own rate card, and every row carries the status word it has earned. It never redirects into apis.finance. <span class="close">What is live here is live here, under this name, on the operator\u2019s license and this software\u2019s record.</span></p>
      </div>
    </section>

    <section class="asksec" aria-labelledby="h-waitlist">
      <h2 id="h-waitlist">Tell us what you\u2019d build.</h2>
      <p class="persona-lead marginal">You are probably one of four people.</p>
      <!-- MR-C7, AS AMENDED BY MR-H1: the four portrait sentences, entered against
           their own names in \xA72's schedule grammar. THE SPLIT IS AT THE RELATIVE
           PRONOUN AND NOWHERE ELSE, one per portrait, so every key is the whole head
           of its own sentence up to that pronoun and every value is the remainder of
           it: \`The engineer\`, \`The founder\`, \`The servicing operations lead\`, and
           \`Or the platform product manager\`. The fourth key carries the conjunction
           because the conjunction is inside the head of the fourth sentence, and a
           value that began \`Or whose roadmap now says\` would be a string the ratified
           paragraph does not contain. With CSS off, and verbatim at 390 where the key
           sets as an inline lead-in, the reader meets the same six sentences in the
           same order and the same words, which is the whole of A30's test.
           M61 rendered the fourth key \`The platform product manager\` and opened its
           value with \`Or\`. That reads \`The platform product manager Or whose roadmap
           now says mortgage data partner\` in document order, which is not English and
           is not a sentence in the file of record; and it was done to stop the one key
           that wrapped to two lines in the margin, which is a layout problem answered
           in copy. MR-C7's own words foreclose exactly that move. The wrap is answered
           in layout instead: see \`.usched-key.k-hang\` in the stylesheet.
           scripts/check.mjs \xA711(j4) now reads the PERSONA PARAGRAPH block out of
           docs/copy/mortgage-copy.md and fails the build if the six rendered strings
           are not that paragraph, in order, byte for byte. -->
      <dl class="personasched">
        <div class="usched">
          <dt class="usched-key">The engineer</dt>
          <dd class="usched-val">who owns an eVault integration and cannot reach control state from anything they are shipping this year.</dd>
        </div>
        <div class="usched">
          <dt class="usched-key">The founder</dt>
          <dd class="usched-val">who has been told twice that the data exists, and twice that it comes with a partnership, a minimum and a licensed intermediary in the middle.</dd>
        </div>
        <div class="usched">
          <dt class="usched-key">The servicing operations lead</dt>
          <dd class="usched-val">who owns payoff fulfillment and lien release, measured against a statutory window, and unable to hire their way out of the volume.</dd>
        </div>
        <div class="usched">
          <dt class="usched-key k-hang">Or the platform product manager</dt>
          <dd class="usched-val">whose roadmap now says mortgage data partner, and who has learned to read a vendor page for its licensing posture before reading it for features.</dd>
        </div>
      </dl>
      <p class="persona-close marginal">All four have been sold this category before by someone who could not say whose license it ran on.</p>
      <div class="limit">
        <p>Nothing else comes with joining. No early price, no reserved capacity, no beta, no place in a queue that moves ahead of anyone else\u2019s. Those are the four things a list like this is usually sold with, and this list grants none of them.</p>
      </div>
      <!-- MR-C4: \xA74 has one display tier and it changes occupant, not size. The
           tier belongs to the ask, which is the sentence the section's headline
           names and the only one here a reader can act on. -->
      <p class="askline">You know what you\u2019d build the day these rows open. Tell us three things: what you\u2019re building, which surface you need first (eNote/eVault, doc intelligence, payoff/lien), and the volume you expect. The waitlist hears it first, and it is answered by a person.</p>
      <div class="ask" id="ask">
        <!-- MR-J1 (2026-08-02, owner-directed). The docket rendered the message and
             sent the reader elsewhere to send it; these are its own five lines, as a
             real form, POSTing to this entity's own /waitlist. It works with no script:
             the enhancement below only swaps the receipt in place. -->
        <form class="wl" id="wl" action="/waitlist" method="post">
          <div class="wl-env">
            <span>To: keys@apis.finance</span>
            <span>Subject: apis.mortgage waitlist</span>
          </div>
          <div class="wl-body">
            <label class="wl-f">
              <span>What we\u2019re building:</span>
              <textarea name="building" rows="2" autocomplete="off"></textarea>
            </label>
            <label class="wl-f">
              <span>Which surface first (eNote/eVault, doc intelligence, payoff/lien):</span>
              <select name="surface">
                <option value="">(no preference)</option>
                <option value="eNote/eVault">eNote/eVault</option>
                <option value="doc intelligence">doc intelligence</option>
                <option value="payoff/lien">payoff/lien</option>
              </select>
            </label>
            <label class="wl-f">
              <span>Expected volume:</span>
              <input type="text" name="volume" autocomplete="off">
            </label>
            <label class="wl-f">
              <span>Where we reply: <span class="req">(required)</span></span>
              <input type="email" name="email" required autocomplete="email" inputmode="email">
            </label>
            <p class="wl-act"><button class="btn" type="submit">Join the waitlist</button></p>
            <p class="wl-live" id="wl-live" role="status" aria-live="polite"></p>
            <p class="wl-note">Goes to keys@apis.finance, the shared inbox for apis.finance and its properties. Answered by a person.</p>
          </div>
        </form>
        <p class="standing-reason">The waitlist will hear it first, and the order these surfaces ship in is set by what this list asks for.</p>
        <!-- The mailto is not deleted, it is demoted: a reader who prefers their own mail
             mail app keeps a working path, with the same three questions pre-filled. -->
        <p class="alt-lead">Or send it from your own mail app instead:</p>
        <p class="alt-act"><a class="btn" href="mailto:keys@apis.finance?subject=apis.mortgage%20waitlist&amp;body=What%20we%27re%20building%3A%0AWhich%20surface%20first%20(eNote%2FeVault%2C%20doc%20intelligence%2C%20payoff%2Flien)%3A%0AExpected%20volume%3A">Email us to join</a></p>
        <p class="recipient">Opens your mail app to keys@apis.finance, the shared inbox for apis.finance and its properties. Answered by a person.</p>
      </div>
    </section>

    <section aria-labelledby="h-family">
      <h2 id="h-family" class="marginal">One family. This door answers for itself.</h2>
      <p><code>api.X</code> is one API for one profession. <code>apis.X</code> is a family of APIs sharing one key. apis.mortgage belongs to the apis family and stands apart from it on purpose: one key will open it, but what answers behind it is this entity, not the hub.</p>
      <div class="tablewrap">
        <table class="family" role="table">
          <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Property</th><th role="columnheader" scope="col" class="status">Status</th><th role="columnheader" scope="col">Role</th></tr></thead>
          <tbody role="rowgroup">
            <tr role="row"><td role="cell"><a href="https://apis.finance"><code>apis.finance</code></a></td><td role="cell" class="status"><span class="stamp stamp-live">LIVE</span></td><td role="cell">The hub. The catalog, the key, the posted rate card.</td></tr>
            <tr role="row"><td role="cell"><a href="https://apis.credit"><code>apis.credit</code></a></td><td role="cell" class="status"><span class="stamp stamp-roadmap">ROADMAP</span></td><td role="cell">The data door. Business credit, KYB, UCC lien search. Posted and priced in draft; not yet callable.</td></tr>
            <tr role="row"><td role="cell"><a href="https://apis.loans"><code>apis.loans</code></a></td><td role="cell" class="status"><span class="stamp stamp-roadmap">ROADMAP</span></td><td role="cell">The origination door, standing until origination is live through licensed partners.</td></tr>
            <tr role="row"><td role="cell"><code>apis.mortgage</code></td><td role="cell" class="status"><span class="stamp stamp-live">LIVE</span> <span class="suffix">\xB7 machine face</span></td><td role="cell">You are here. Loan files, market records and pipelines answer today; payoff, lien and eNote rows post here when they earn LIVE. This property never redirects into the hub.</td></tr>
          </tbody>
        </table>
      </div>
    </section>


  </main>

</div>

<footer class="footer">
  <div class="footer-inner">
    <p class="foot-links"><a href="/llms.txt">/llms.txt</a> \xB7 <a href="mailto:keys@apis.finance">keys@apis.finance</a></p>
    <p class="foot-links">MACHINE FACE \xB7 <a href="/.well-known/agents.json"><code>/.well-known/agents.json</code></a> \xB7 <a href="/openapi.json"><code>/openapi.json</code></a> \xB7 <a href="/pricing"><code>/pricing</code></a> \xB7 <code>POST /mcp</code> \xB7 <a href="/verify"><code>/verify</code></a> \xB7 <a href="/loan-files"><code>/loan-files</code></a> \xB7 <a href="/market-records"><code>/market-records</code></a></p>
    <p class="standing">On the machine face, loan-file records are labeled example data over fictional lenders; market records are real FFIEC HMDA aggregations with the query URL and observation date stamped on every record. Borrower personal data is not served, in any class. The rate card is test-mode and says so in its own statement.</p>
    <p class="standing">apis.mortgage is the headless mortgage system of record. It holds no license and performs no licensed act: the licensed operator it wraps \u2014 the broker, the lender, the servicer \u2014 brings the license, extends the credit, takes the Application and decides. What answers here is software and data, priced on its own rate card, each row carrying the status word it has earned.</p>
  </div>
</footer>

</div>

<script>
document.documentElement.classList.add('js');
addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.m-h1,.m-sub,.m-cta').forEach(function(el){el.classList.add('in')});

  /* MR-J1: enhancement only. With no script the form is a real POST to /waitlist and
     the worker answers a rendered receipt; this keeps the reader on the page instead.
     Every failure path here falls back to letting the browser submit normally, so a
     broken script can never swallow a submission. */
  var f=document.getElementById('wl'),live=document.getElementById('wl-live');
  if(!f||!live||!window.fetch)return;
  f.addEventListener('submit',function(ev){
    if(!f.checkValidity())return; // let the browser show its own message
    ev.preventDefault();
    var btn=f.querySelector('button[type=submit]');
    var fd=new FormData(f),payload={};
    fd.forEach(function(v,k){payload[k]=v});
    if(btn){btn.disabled=true}
    live.textContent='Recording\u2026';
    fetch('/waitlist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})
      .then(function(res){
        if(btn){btn.disabled=false}
        if(res.ok&&res.j&&res.j.recorded){
          var w=document.createElement('div');
          w.className='wl';
          w.innerHTML='<div class="wl-env"><span>Recorded '+
            String(res.j.received_at||'').replace(/[<>&]/g,'')+'</span></div>'+
            '<div class="wl-body"><p class="wl-live">You\u2019re on the list for apis.mortgage. '+
            'Nothing on this property is live yet. '+
            'As soon as we\u2019re ready for someone with your profile and requirements, we\u2019ll be in contact.</p>'+
            '<p class="wl-note">A person replies from keys@apis.finance.</p></div>';
          f.parentNode.replaceChild(w,f);
          return;
        }
        live.textContent=(res.j&&res.j.detail)?res.j.detail:
          'That did not record. Write to keys@apis.finance and a person will enter it by hand.';
      })
      .catch(function(){
        if(btn){btn.disabled=false}
        live.textContent='';
        f.submit(); // network or parse failure: hand it back to the browser, never drop it
      });
  });
});
<\/script>
</body>
</html>
`;

// src/manifest.js
var ORIGIN = "https://apis.mortgage";
var LLMS_BODY = `# apis.mortgage

The headless mortgage system of record. apis.mortgage is the machine face
of the mortgage substrate (NAICS 522292): MISMO-typed loan-file records,
HMDA-derived lender market records, and an auto-minted sandbox loan
pipeline \u2014 the LOS system-of-record door.

The boundary, stated once (founder ruling 2026-08-23): the software is the
system of record, and the licensed operator \u2014 the broker, the lender, the
servicer \u2014 is the customer and brings the license. Lender-Reserved acts
(extending credit, taking the Application, negotiating terms, deciding)
stay with the operator. What is served here is software and data, priced
on this property's own rate card.

Every collection answers without a key. Typed envelopes everywhere:
OK | EMPTY | BLOCKED | OFFER \u2014 three emptinesses never blend.

## Doors

- \`GET /loan-files\` \u2014 MISMO-typed loan-file records (branching collection; \`?purpose=<Purchase|Refinance>\`, \`?status=<loanStatus>\`)
- \`GET /loan-files/{id}\` \u2014 one loan file by id
- \`GET /market-records\` \u2014 HMDA-derived market records (\`?state=\`, \`?purpose=\`)
- \`POST /pipelines\` \u2014 auto-mint an anonymous sandbox loan pipeline (keyless; ephemeral in wave zero, disclosed on mint)
- \`POST /mcp\` \u2014 MCP door (JSON-RPC 2.0): the same nouns and verbs as HTTP
- \`GET /verify\` \u2014 run our tests: the public-contract checks, runnable by anyone
- \`POST /waitlist\` \u2014 the register for the ROADMAP surfaces (payoff/lien data, eNote/eVault control state, doc intelligence). Takes \`email\` (required), \`building\`, \`surface\` and \`volume\`, form-encoded or JSON, capped at 16KB. Stores every accepted submission durably and answers 201 with a receipt; refuses with a typed 422 carrying a cure when the reply address is missing or unusable, and with a 503 that says nothing was recorded if the store is unavailable. GET answers a typed 405: this door writes and never lists \u2014 no name on this list is published in any form.
- \`GET /healthz\` \u2014 liveness of the process; its \`callable\` member names what answers today.

## Pricing

Metered rate card with a declared hard ceiling. Settlement is a labeled
test-mode stub today: the 402 OFFER boundary is served, no charge is
collected, and the pricing document says so in its own \`statement\` member.

## Data classes

Market records are real: each is one aggregation row from the FFIEC HMDA
Data Browser API (public data), with the exact query URL and observation
date stamped on the record. Loan-file records are labeled example data
(\`"example": true\`) \u2014 MISMO-flavored synthetic files over fictional
lenders. Borrower personal data is not served on this face, in any class.

## Scope

This is the data, document and pipeline door of the mortgage substrate:
the loan file, the market record, the pipeline. The attested rows \u2014
payoff/lien figures, eNote/eVault control state, doc intelligence \u2014 are
ROADMAP: each waits on named events (a written counsel opinion; a licensed
operator on the other side of it; for eNote, a signed eVault agreement)
and posts to the waitlist first. Loan origination, closing, and settlement
money movement are not served here \u2014 those are the operator's acts under
the operator's license.`;
var HOME_MD = `# apis.mortgage

The headless mortgage system of record: the loan file, the market record
and the pipeline as typed, keyless doors. The licensed operator brings the
license; the software holds the record.

MISMO-typed loan-file records, HMDA-derived lender market records, and an
auto-minted sandbox loan pipeline over the mortgage substrate (NAICS 522292).

- Machine card: /.well-known/agents.json
- Contract: /openapi.json \xB7 Pricing: /pricing \xB7 Agents: /llms.txt
- Records: /loan-files \xB7 /market-records
- Sandbox: POST /pipelines \xB7 MCP: POST /mcp \xB7 Tests: /verify
- Waitlist for the ROADMAP rows (payoff/lien, eNote/eVault, doc intelligence): POST /waitlist

Market records are real (FFIEC HMDA Data Browser, query URL stamped on every
record). Loan-file records are labeled example data over fictional lenders.
Borrower personal data is not served on this face. Settlement is a labeled
test-mode stub \u2014 the 402 boundary is served, nothing is charged.`;
var LADDER_ALTERNATIVES = [
  {
    rung: 0,
    id: "anon-sandbox",
    title: "Anonymous sandbox \u2014 keyless and free",
    url: `${ORIGIN}/loan-files`,
    price: 0
  },
  {
    rung: 1,
    id: "earned-credits",
    title: "Work: earn .ax-ledger credits via proof-of-work",
    status: "stub \u2014 ledger not wired in wave zero; this rung does not settle yet"
  },
  {
    rung: 2,
    id: "human-claimed",
    title: "Claim: a human claims this agent pipeline (attribution \u2192 tenure)",
    status: "stub \u2014 claim door not wired in wave zero"
  },
  {
    rung: 3,
    id: "paid-402",
    title: "Pay: metered calls against machine identity (id.org.ai)",
    price: 2e-4,
    unit: "USD/call",
    status: "stub \u2014 test-mode; no live settlement, no charge is collected"
  }
];
var RATE_ROWS = [
  { operation: "searchLoanFiles", price: 2e-4, unit: "USD/call", freeQuota: 1e3, status: "stub \u2014 test-mode, no live settlement" },
  { operation: "getLoanFile", price: 2e-4, unit: "USD/call", freeQuota: 1e3, status: "stub \u2014 test-mode, no live settlement" },
  { operation: "listLenderMarketRecords", price: 0, unit: "USD/call" },
  { operation: "getPricing", price: 0, unit: "USD/call" },
  { operation: "getFamilyRegistry", price: 0, unit: "USD/call" },
  { operation: "getOffer", price: 0, unit: "USD/call" }
];
var manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "apis.mortgage",
  description: "The headless mortgage system of record: MISMO-typed loan-file records, HMDA-derived lender market records, and an auto-minted sandbox loan pipeline as typed, keyless doors over the mortgage substrate. The licensed operator brings the license; the software holds the record.",
  version: "0.1.0",
  collection: {
    path: "/loan-files",
    /** axp-ext/rates-g2 §1 — the branching collection's canonical operationId:
     *  the SAME identifier on the OpenAPI contract, the MCP door, and the
     *  rate-card key (the rates[] row above keys on it). */
    operationId: "searchLoanFiles",
    memberName: "results",
    summary: "MISMO-typed loan-file records \u2014 typed OK | EMPTY | BLOCKED | OFFER, branching on the query",
    records: loanFiles,
    filters: ["purpose", "status"],
    blockedScopes: ["borrower-pii", "servicing"],
    match: /* @__PURE__ */ __name((rec, param, value) => param === "purpose" ? rec.loanPurposeType === value : param === "status" ? rec.loanStatus === value : false, "match"),
    emptyMessage: /* @__PURE__ */ __name((param, value) => `no loan-file records match ${param}=${value} \u2014 a truthful empty set, not an error`, "emptyMessage"),
    blockedReason: /* @__PURE__ */ __name((scope) => scope === "borrower-pii" ? "borrower personal data is not served on this face, in any data class" : `scope '${scope}' is outside this property's data/document door \u2014 not served to your agent class`, "blockedReason")
  },
  pricing: {
    model: "metered",
    hardCeiling: 100,
    unit: "USD",
    price: 2e-4,
    binding: false,
    statement: "Test-mode rate card: metering seams are live, settlement is a labeled stub \u2014 no charge is collected today. Prices are the stated intent of the wave-zero pricing experiment, not bound terms.",
    /** TOP-LEVEL in the Pricing Document — the axp-ext/rates-g2 §2 ruled
     *  placement, never nested under an offer. */
    rates: RATE_ROWS,
    offers: [
      {
        id: "metered-calls",
        title: "Metered calls (test-mode stub \u2014 no live settlement)",
        price: 2e-4,
        unit: "USD/call",
        status: "stub \u2014 the 402 boundary is served; no charge is collected",
        alternatives: LADDER_ALTERNATIVES
      }
    ],
    offerPath: "/offer",
    spendParam: "spend"
  },
  /** Live routes beyond the quartet — presence-when-true: everything listed
   *  here answers today. Each carries its canonical camelCase operationId
   *  (axp-ext/rates-g2 §1): the ONE cross-face operation name, passed through
   *  to the OpenAPI contract and shared with the MCP door and metering seams. */
  routes: [
    {
      method: "GET",
      path: "/loan-files/{id}",
      operationId: "getLoanFile",
      summary: "One MISMO-typed loan-file record by id",
      responses: {
        200: { description: "OK envelope with the record" },
        404: { description: "EMPTY envelope \u2014 no record with that id" }
      }
    },
    {
      method: "GET",
      path: "/market-records",
      operationId: "listLenderMarketRecords",
      summary: "HMDA-derived lender market records \u2014 real public data, query URL stamped on every record",
      params: [
        { name: "state", description: "filter by two-letter state code" },
        { name: "purpose", description: "filter by loan purpose (Home purchase | Refinancing)" }
      ]
    },
    {
      method: "GET",
      path: "/icp.json",
      operationId: "getICP",
      summary: "G2 coordinates: ICP, personas, agent classes, and the attestation ladder"
    },
    {
      method: "GET",
      path: "/verify",
      operationId: "getVerify",
      summary: "Run our tests \u2014 the public-contract checks, runnable by anyone"
    },
    {
      method: "GET",
      path: "/verify/suite.json",
      operationId: "getVerifySuite",
      summary: "The declarative check suite behind /verify"
    },
    {
      method: "POST",
      path: "/pipelines",
      operationId: "createPipeline",
      summary: "Auto-mint an anonymous sandbox loan pipeline (keyless; ephemeral in wave zero \u2014 retention disclosed on mint)",
      responses: { 200: { description: "OK envelope with the minted pipeline" } }
    },
    {
      method: "GET",
      path: "/pipelines/{id}",
      operationId: "getPipeline",
      summary: "One pipeline \u2014 the LOS system-of-record door (headless ply)"
    },
    {
      method: "GET",
      path: "/pipelines/{id}/loan-files",
      operationId: "listPipelineLoanFiles",
      summary: "Loan-file records in a pipeline"
    },
    {
      method: "POST",
      path: "/pipelines/{id}/loan-files",
      operationId: "addLoanFile",
      summary: "Add a loan-file record to a pipeline (native binding \u2014 system of record)"
    },
    {
      method: "POST",
      path: "/waitlist",
      operationId: "joinWaitlist",
      summary: "Join the waitlist for the ROADMAP surfaces (payoff/lien, eNote/eVault, doc intelligence) \u2014 durable KV intake carried over from the pre-cutover property, receipt semantics preserved",
      responses: {
        201: { description: "receipt \u2014 the submission was durably recorded" },
        405: { description: "typed refusal \u2014 this door answers POST only and never lists" },
        413: { description: "typed refusal \u2014 body over the 16KB cap; nothing recorded" },
        422: { description: "typed refusal carrying a cure \u2014 reply address missing or unusable; nothing recorded" },
        503: { description: "typed refusal \u2014 store unavailable; nothing recorded, said plainly" }
      }
    },
    {
      method: "GET",
      path: "/healthz",
      operationId: "getHealth",
      summary: "Liveness of the process \u2014 the `callable` member names what answers today"
    }
  ],
  /** MCP tool names ARE the canonical operationIds (axp-ext/rates-g2 §1) —
   *  the same camelCase identifier as the OpenAPI contract, one operation,
   *  one name, every face. */
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["searchLoanFiles", "getLoanFile", "listLenderMarketRecords", "getPricing"]
  },
  llms: { body: LLMS_BODY },
  docsUrl: `${ORIGIN}/llms.txt`,
  icpUrl: `${ORIGIN}/icp.json`,
  /** links.verify (axp-ext/rates-g2 §3) — the published runnable-suite export,
   *  native on the card since axp-faces 0.2.0. */
  verifyUrl: "/verify",
  /** g2 (axp-ext/rates-g2 §4) — the property's G2/ICP coordinates, TOP-LEVEL
   *  on the card, carried verbatim from the projection config (the fuller
   *  /icp.json document stays linked beside it via links.icp). */
  g2: {
    substrate: projection.substrate,
    motion: projection.motion,
    icp: projection.icp,
    personas: projection.personas
  },
  conformanceUrl: "https://api.qa/apis.mortgage",
  family: [
    { name: "apis.do", origin: "https://apis.do", role: "every service, one envelope \u2014 the managed implementation layer" },
    { name: "apis.ax", origin: "https://apis.ax", role: "the agent-first API catalog (B2A register)" },
    { name: "api.qa", origin: "https://api.qa", role: "independent conformance verifier" },
    { name: "api.lawyer", origin: "https://api.lawyer", role: "AXP reference implementation" }
  ],
  home: { html: LANDING_HTML, md: HOME_MD }
});

// src/mcp.js
var PROTOCOL_VERSION = "2025-06-18";
function toolResult(id, payload) {
  return {
    jsonrpc: "2.0",
    id,
    result: { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] }
  };
}
__name(toolResult, "toolResult");
function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
__name(rpcError, "rpcError");
function buildTools(manifest2) {
  return [
    {
      name: "searchLoanFiles",
      description: "Search the MISMO-typed loan-file records (the same /loan-files collection): purpose = Purchase | Refinance, status = loanStatus. Typed OK | EMPTY | BLOCKED result. Records are labeled example data.",
      inputSchema: {
        type: "object",
        properties: { purpose: { type: "string" }, status: { type: "string" } }
      }
    },
    {
      name: "getLoanFile",
      description: "One MISMO-typed loan-file record by id \u2014 same records as GET /loan-files/{id}.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
      name: "listLenderMarketRecords",
      description: "HMDA-derived lender market records (real public data, FFIEC HMDA Data Browser, query URL stamped on every record) \u2014 same records as GET /market-records.",
      inputSchema: {
        type: "object",
        properties: { state: { type: "string" }, purpose: { type: "string" } }
      }
    },
    {
      name: "getPricing",
      description: "The Pricing Document (AXP Appendix A.2) \u2014 same document as GET /pricing.",
      inputSchema: { type: "object", properties: {} }
    }
  ];
}
__name(buildTools, "buildTools");
function filterMarketRecords(args = {}) {
  let recs = lenderMarketRecords;
  if (args.state) recs = recs.filter((r) => r.state === String(args.state).toUpperCase());
  if (args.purpose) recs = recs.filter((r) => r.loanPurpose.toLowerCase() === String(args.purpose).toLowerCase());
  return recs;
}
__name(filterMarketRecords, "filterMarketRecords");
function callTool(manifest2, name, args = {}) {
  switch (name) {
    case "searchLoanFiles": {
      const params = new URLSearchParams();
      if (args.purpose) params.set("purpose", String(args.purpose));
      if (args.status) params.set("status", String(args.status));
      return collectionDecision(manifest2, params).body;
    }
    case "getLoanFile": {
      const rec = manifest2.collection.records.find((r) => r.id === args.id);
      return rec ? { type: "OK", results: [rec] } : { type: "EMPTY", results: [], message: `no loan-file record with id ${args.id}` };
    }
    case "listLenderMarketRecords": {
      const recs = filterMarketRecords(args);
      return recs.length > 0 ? { type: "OK", results: recs } : { type: "EMPTY", results: [], message: "no market records match \u2014 a truthful empty set" };
    }
    case "getPricing":
      return buildPricingDocument(manifest2);
    default:
      return void 0;
  }
}
__name(callTool, "callTool");
function handleMcpMessage(manifest2, msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg && msg.id, -32600, "invalid JSON-RPC 2.0 request");
  }
  const { id, method, params } = msg;
  if (id === void 0) return null;
  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "apis.mortgage", version: manifest2.version }
        }
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: buildTools(manifest2) } };
    case "tools/call": {
      const name = params && params.name;
      const result = callTool(manifest2, name, params && params.arguments || {});
      if (result === void 0) return rpcError(id, -32602, `unknown tool: ${name}`);
      return toolResult(id, result);
    }
    default:
      return rpcError(id, -32601, `method not found: ${method}`);
  }
}
__name(handleMcpMessage, "handleMcpMessage");

// src/verify.js
function buildSuite(manifest2) {
  const probes = buildProbes(manifest2);
  const o = manifest2.origin;
  const checks = [
    {
      id: "keyless-ok",
      probe: `GET ${o}${probes.keyless.url}`,
      expect: { status: 200, "body.type": "OK" }
    },
    ...probes.knownEmpty.map((p, i) => ({
      id: `known-empty-${i + 1}`,
      probe: `GET ${o}${p.url}`,
      expect: { status: 200, "body.type": "EMPTY" }
    })),
    ...probes.knownForbidden.map((p, i) => ({
      id: `known-forbidden-${i + 1}`,
      probe: `GET ${o}${p.url}`,
      expect: { status: 403, "body.type": "BLOCKED" }
    })),
    {
      id: "pricing-declared",
      probe: `GET ${o}/pricing`,
      expect: { status: 200, "body.model": "metered", "body.binding": false }
    },
    {
      id: "over-ceiling-offer",
      probe: `GET ${o}${probes.keyless.url}?spend=${manifest2.pricing.hardCeiling * 2}`,
      expect: { status: 402, "body.type": "OFFER" }
    },
    {
      id: "half-ceiling-ok",
      probe: `GET ${o}${probes.keyless.url}?spend=${manifest2.pricing.hardCeiling / 2}`,
      expect: { status: 200, "body.type": "OK" }
    },
    {
      id: "offer-boundary",
      probe: `GET ${o}/offer`,
      expect: { status: 402, "body.type": "OFFER" }
    },
    {
      id: "card-answers",
      probe: `GET ${o}/.well-known/agents.json`,
      expect: { status: 200, "body.interfaces.http": "non-empty" }
    },
    {
      id: "market-records-real",
      probe: `GET ${o}/market-records?state=ID`,
      expect: { status: 200, "body.type": "OK" }
    },
    {
      id: "pipeline-mint",
      probe: `POST ${o}/pipelines`,
      expect: { status: 200, "body.type": "OK" }
    }
  ];
  return {
    suite: "apis.mortgage public-contract checks",
    runner: "api.qa/suite@1",
    environment: "production",
    checks
  };
}
__name(buildSuite, "buildSuite");
function buildVerifyDoc(manifest2) {
  const suite = buildSuite(manifest2);
  return {
    $context: "https://schema.org.ai",
    $type: "Report",
    name: "Run our tests",
    description: "The public-contract checks for apis.mortgage. Every check is runnable by anyone, keyless, against the live origin \u2014 a claim with a published passing test is proven; anything less stays out of the copy.",
    suite: `${manifest2.origin}/verify/suite.json`,
    conformance: manifest2.conformanceUrl,
    howTo: suite.checks.map((c) => ({ id: c.id, curl: `curl -i '${c.probe.replace(/^GET |^POST /, "")}'${c.probe.startsWith("POST") ? " -X POST" : ""}`, expect: c.expect }))
  };
}
__name(buildVerifyDoc, "buildVerifyDoc");
function buildVerifyMd(manifest2) {
  const suite = buildSuite(manifest2);
  const lines = [
    "# Run our tests",
    "",
    "The public-contract checks for apis.mortgage \u2014 runnable by anyone, keyless, against the live origin.",
    "",
    `Suite document: ${manifest2.origin}/verify/suite.json`,
    `Independent verifier: ${manifest2.conformanceUrl}`,
    "",
    "| check | probe | expect |",
    "|---|---|---|",
    ...suite.checks.map((c) => `| ${c.id} | \`${c.probe}\` | \`${JSON.stringify(c.expect)}\` |`),
    ""
  ];
  return lines.join("\n");
}
__name(buildVerifyMd, "buildVerifyMd");

// src/seams.js
var TAGS = Object.freeze({
  substrate: "mortgage",
  projection: "apis.mortgage",
  motion: "B2A",
  pattern: "402-metered-per-call"
});
function classifyCaller(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const secFetch = request.headers.get("sec-fetch-mode");
  const identityClass = secFetch ? "human-browser" : AGENT_UA_TOKENS.some((t) => ua.includes(t)) ? "machine-agent-ua" : "unattributed";
  return { identityClass, referrer: request.headers.get("referer") || void 0 };
}
__name(classifyCaller, "classifyCaller");
function emitMeterEvent(env, ctx, request, { operation, shape }) {
  const event = {
    kind: "meter",
    ...TAGS,
    operation,
    shape,
    ...classifyCaller(request),
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    if (env && env.METERS && typeof env.METERS.writeDataPoint === "function") {
      env.METERS.writeDataPoint({
        blobs: [event.projection, event.operation, event.shape, event.identityClass],
        indexes: [event.substrate]
      });
    }
  } catch {
  }
  console.log(JSON.stringify(event));
}
__name(emitMeterEvent, "emitMeterEvent");

// src/waitlist.js
var CONFIRMATION = "As soon as we\u2019re ready for someone with your profile and requirements, we\u2019ll be in contact.";
var MAX_BODY_BYTES = 16 * 1024;
var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
var NO_STORE = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
var clip = /* @__PURE__ */ __name((v) => String(v ?? "").slice(0, 2e3).trim(), "clip");
var escapeHtml = /* @__PURE__ */ __name((s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), "escapeHtml");
var refuse = /* @__PURE__ */ __name((status, code, detail, cure) => ({
  object: "waitlist.refused",
  status: code,
  http_status: status,
  detail,
  recorded: false,
  cure,
  contact: "keys@apis.finance"
}), "refuse");
function receiptDocument(email, surface) {
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>You are on the list \xB7 apis.mortgage</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 8vh 6vw; max-width: 34rem; font: 400 17px/1.6 Piazzolla, Georgia, serif; }
  code, .mono { font-family: "Sometype Mono", ui-monospace, monospace; font-size: .86em; }
  h1 { font-size: 1.5rem; font-weight: 500; margin: 0 0 1.4rem; letter-spacing: -.01em; }
  p { margin: 0 0 1.1rem; }
  .said { opacity: .68; }
  .rule { border: 0; border-top: 1px solid currentColor; opacity: .18; margin: 2rem 0 1.4rem; }
  a { color: inherit; }
</style>
<h1>You\u2019re on the list for apis.mortgage.</h1>
<p>The machine face of this property is live and priced. The rows this list is
   for \u2014 payoff and lien data, eNote/eVault control state, doc intelligence \u2014
   are ROADMAP: when one ships it will be stamped LIVE on the page, its price
   will post on this property\u2019s own rate card, and this list hears it first.</p>
<p>${CONFIRMATION}</p>
<hr class="rule">
<p class="said mono">Recorded. We answer to ${escapeHtml(email)}${surface ? `, and you named <strong>${escapeHtml(surface)}</strong> first` : ""}. A person replies from keys@apis.finance.</p>
<p class="mono"><a href="/">apis.mortgage</a> \xB7 <a href="/llms.txt">/llms.txt</a></p>
`;
}
__name(receiptDocument, "receiptDocument");
async function handleWaitlist(request, env) {
  const ctype = request.headers.get("content-type") || "";
  const wantsJson = ctype.includes("application/json");
  const reply = /* @__PURE__ */ __name((body, status) => new Response(JSON.stringify(body, null, 2), { status, headers: NO_STORE }), "reply");
  if (request.method !== "POST") {
    return reply(
      refuse(405, "METHOD_NOT_ALLOWED", "The register takes names by POST. Nothing is readable here: this door writes and never lists, because no name on this list is ever published in any form.", {
        method: "POST",
        content_type: "application/x-www-form-urlencoded or application/json",
        fields: { email: "required", building: "optional", surface: "optional", volume: "optional" }
      }),
      405
    );
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) {
    return reply(
      refuse(413, "BODY_TOO_LARGE", `The submission is larger than the ${MAX_BODY_BYTES} byte cap for this door. Nothing was recorded.`, {
        max_bytes: MAX_BODY_BYTES,
        declared_bytes: declared,
        remedy: "Shorten the answers, or write to keys@apis.finance, which has no cap and is read by the same person."
      }),
      413
    );
  }
  let raw;
  try {
    raw = await request.text();
  } catch {
    return reply(
      refuse(400, "BODY_UNREADABLE", "The submission body could not be read, so nothing was recorded.", {
        remedy: "Send the form again, or write to keys@apis.finance."
      }),
      400
    );
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return reply(
      refuse(413, "BODY_TOO_LARGE", `The submission is larger than the ${MAX_BODY_BYTES} byte cap for this door. Nothing was recorded.`, {
        max_bytes: MAX_BODY_BYTES,
        remedy: "Shorten the answers, or write to keys@apis.finance, which has no cap and is read by the same person."
      }),
      413
    );
  }
  let building = "", surface = "", volume = "", email = "";
  try {
    if (wantsJson) {
      const body = JSON.parse(raw);
      building = clip(body.building);
      surface = clip(body.surface);
      volume = clip(body.volume);
      email = clip(body.email);
    } else {
      const form = new URLSearchParams(raw);
      building = clip(form.get("building"));
      surface = clip(form.get("surface"));
      volume = clip(form.get("volume"));
      email = clip(form.get("email"));
    }
  } catch {
    return reply(
      refuse(422, "BODY_UNPARSEABLE", "The submission could not be parsed as JSON or as form data, so nothing was recorded.", {
        content_type: "application/x-www-form-urlencoded or application/json",
        fields: { email: "required", building: "optional", surface: "optional", volume: "optional" }
      }),
      422
    );
  }
  if (!email) {
    const body = refuse(422, "EMAIL_REQUIRED", "No reply address was given, and this list is answered by a person, so a name with no address cannot be answered. Nothing was recorded.", {
      field: "email",
      expected: "An address a person can reply to.",
      alternative: "keys@apis.finance, which reaches the same person."
    });
    return reply(body, 422);
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    const body = refuse(422, "EMAIL_INVALID", "That reply address is not an address a person can answer, so nothing was recorded.", {
      field: "email",
      received: email.slice(0, 120),
      expected: "A single address of the form name@host.tld, with no spaces.",
      alternative: "keys@apis.finance, which reaches the same person."
    });
    return reply(body, 422);
  }
  const receivedAt = (/* @__PURE__ */ new Date()).toISOString();
  const key = `${receivedAt}-${crypto.randomUUID()}`;
  const record = {
    object: "waitlist.entry",
    received_at: receivedAt,
    property: "apis.mortgage",
    email,
    building,
    surface,
    volume,
    user_agent: request.headers.get("user-agent") || null,
    country: request.cf?.country ?? null
  };
  try {
    await env.WAITLIST.put(key, JSON.stringify(record));
  } catch (err) {
    console.error(
      "WAITLIST_WRITE_FAILED",
      JSON.stringify({ key, error: String(err), record })
    );
    const body = {
      object: "waitlist.not_recorded",
      status: "STORAGE_UNAVAILABLE",
      http_status: 503,
      recorded: false,
      detail: "The register could not be written to, so you are not on the list. This is said plainly rather than answered with a receipt that is not true. Your submission was written to this property\u2019s error log and the person who answers keys@apis.finance can recover it, but do not rely on that.",
      cure: {
        remedy: "Send the same three answers to keys@apis.finance and a person will enter them by hand.",
        retry: "Or post this form again."
      },
      contact: "keys@apis.finance"
    };
    return reply(body, 503);
  }
  if (wantsJson) {
    return reply(
      {
        object: "waitlist.receipt",
        status: "RECORDED",
        recorded: true,
        received_at: receivedAt,
        we_answer_to: email,
        you_named: surface || null,
        note: "The rows this list is for \u2014 payoff/lien, eNote/eVault, doc intelligence \u2014 are ROADMAP, and joining grants no early price, no reserved capacity, no beta and no place in a queue. The list hears it first, and the order these surfaces ship in is set by what this list asks for.",
        confirmation: CONFIRMATION,
        contact: "keys@apis.finance"
      },
      201
    );
  }
  return new Response(receiptDocument(email, surface), {
    status: 201,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}
__name(handleWaitlist, "handleWaitlist");

// src/worker.js
var axpRoutes = createAxpRoutes(manifest);
var JSON_CT2 = { "content-type": "application/json; charset=utf-8" };
var pipelines = /* @__PURE__ */ new Map();
var RETENTION = "ephemeral \u2014 this wave-zero sandbox is in-memory and may reset at any time; nothing you store here is durable yet";
function json(body, { status = 200, head = false, headers } = {}) {
  return new Response(head ? null : JSON.stringify(body, null, 2), {
    status,
    headers: { ...JSON_CT2, ...headers || {} }
  });
}
__name(json, "json");
function methodNotAllowed(path, allow) {
  return envelopeResponse(
    { type: "BLOCKED", reason: `this address answers ${allow}` },
    { status: 405, headers: { allow } }
  );
}
__name(methodNotAllowed, "methodNotAllowed");
var icpDocument = {
  $context: "https://schema.org.ai",
  property: "apis.mortgage",
  substrate: projection.substrate,
  motion: projection.motion,
  icp: projection.icp,
  personas: projection.personas,
  agent_classes: [
    {
      id: "reader-agent",
      description: "keyless reads: the quartet, /loan-files, /market-records, /verify \u2014 no key, no account"
    },
    {
      id: "sandbox-transactor",
      description: "auto-mints an ephemeral pipeline (POST /pipelines) and adds loan-file records to it"
    },
    {
      id: "catalog-integrator",
      description: "consumes the records through the MCP door (POST /mcp) \u2014 the same nouns and verbs as HTTP"
    }
  ],
  /** anonymous only: the id.org.ai identity plane is not wired in this
   *  deployment (presence-when-true — the identified rung appears when it is). */
  ladder: [
    {
      rung: "anonymous",
      description: "no identity required; every collection and the sandbox floor answer keyless"
    }
  ]
};
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const head = request.method === "HEAD";
    if (path === "/waitlist") {
      emitMeterEvent(env, ctx, request, { operation: "joinWaitlist", shape: "anon-sandbox" });
      return handleWaitlist(request, env);
    }
    if (path === "/healthz") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      return json(
        {
          served: true,
          callable: { dataDoors: true, pipelines: true, mcp: true, waitlist: true, roadmapRows: false },
          property: "apis.mortgage",
          status: "LIVE",
          note: "Liveness of the process. The machine face is live: loan-file, market-record and pipeline doors answer keyless, priced on a test-mode rate card, with MCP at POST /mcp. The ROADMAP rows (payoff/lien, eNote/eVault, doc intelligence) are not callable and post to the waitlist first.",
          waitlist: "https://apis.mortgage/waitlist"
        },
        { head, headers: { "cache-control": "no-store" } }
      );
    }
    if (path === "/robots.txt") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      return new Response(head ? null : "User-agent: *\nAllow: /\n", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" }
      });
    }
    const hit = await axpRoutes(request, env);
    if (hit !== void 0) {
      emitMeterEvent(env, ctx, request, {
        operation: path === manifest.collection.path ? manifest.collection.operationId : path === "/pricing" ? "getPricing" : path === manifest.familyPath ? "getFamilyRegistry" : path === manifest.pricing.offerPath ? "getOffer" : "face",
        shape: "anon-sandbox"
      });
      return hit;
    }
    const fileById = path.match(/^\/loan-files\/([^/]+)$/);
    if (fileById) {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      emitMeterEvent(env, ctx, request, { operation: "getLoanFile", shape: "anon-sandbox" });
      const rec = manifest.collection.records.find((r) => r.id === decodeURIComponent(fileById[1]));
      if (!rec) {
        return json(
          { type: "EMPTY", results: [], message: `no loan-file record with id ${fileById[1]}` },
          { status: 404, head }
        );
      }
      return json({ type: "OK", results: [rec] }, { head });
    }
    if (path === "/market-records") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      emitMeterEvent(env, ctx, request, { operation: "listLenderMarketRecords", shape: "anon-sandbox" });
      const recs = filterMarketRecords({
        state: url.searchParams.get("state") || void 0,
        purpose: url.searchParams.get("purpose") || void 0
      });
      if (recs.length === 0) {
        return json(
          {
            type: "EMPTY",
            results: [],
            message: "no market records match \u2014 a truthful empty set; this seed carries 2024 originations for CA, FL, ID, NY, TX"
          },
          { head }
        );
      }
      return json(
        {
          type: "OK",
          results: recs,
          note: "real public data \u2014 FFIEC HMDA Data Browser aggregations; the exact query URL and observation date are stamped on every record"
        },
        { head }
      );
    }
    if (path === "/icp.json") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      return json(icpDocument, { head });
    }
    if (path === "/verify" || path === "/verify.json" || path === "/verify.md" || path === "/verify.html") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      const doc = buildVerifyDoc(manifest);
      const md = buildVerifyMd(manifest);
      return serveNegotiated(request, url, {
        json: doc,
        md,
        html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>apis.mortgage \u2014 run our tests</title></head><body><pre>${md.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></body></html>`
      }, { cleanPath: "/verify" });
    }
    if (path === "/verify/suite.json") {
      if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
      return json(buildSuite(manifest), { head });
    }
    if (path === "/pipelines") {
      if (request.method !== "POST") return methodNotAllowed(path, "POST");
      const id = crypto.randomUUID();
      const pl = { $type: "Service", id, createdAt: (/* @__PURE__ */ new Date()).toISOString(), retention: RETENTION, loanFiles: [] };
      pipelines.set(id, pl);
      emitMeterEvent(env, ctx, request, { operation: "createPipeline", shape: "anon-sandbox" });
      return json({ type: "OK", results: [{ id: pl.id, createdAt: pl.createdAt, retention: pl.retention }] });
    }
    const plMatch = path.match(/^\/pipelines\/([^/]+)(\/loan-files)?$/);
    if (plMatch) {
      const pl = pipelines.get(plMatch[1]);
      if (!pl) {
        return json(
          { type: "EMPTY", results: [], message: `no pipeline ${plMatch[1]} \u2014 wave-zero pipelines are ${RETENTION}` },
          { status: 404, head }
        );
      }
      if (!plMatch[2]) {
        if (request.method !== "GET" && !head) return methodNotAllowed(path, "GET, HEAD");
        emitMeterEvent(env, ctx, request, { operation: "getPipeline", shape: "anon-sandbox" });
        return json(
          { type: "OK", results: [{ id: pl.id, createdAt: pl.createdAt, retention: pl.retention, loanFiles: pl.loanFiles.length }] },
          { head }
        );
      }
      if (request.method === "GET" || head) {
        emitMeterEvent(env, ctx, request, { operation: "listPipelineLoanFiles", shape: "anon-sandbox" });
        return pl.loanFiles.length === 0 ? json({ type: "EMPTY", results: [], message: "no loan-file records in this pipeline yet" }, { head }) : json({ type: "OK", results: pl.loanFiles }, { head });
      }
      if (request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json(
            { type: "BLOCKED", reason: "the request body must be a JSON loan-file record with at least { loanIdentifier, loanPurposeType }" },
            { status: 400 }
          );
        }
        if (!body || typeof body.loanIdentifier !== "string" || typeof body.loanPurposeType !== "string") {
          return json(
            { type: "BLOCKED", reason: "a loan-file record carries at least { loanIdentifier, loanPurposeType }" },
            { status: 400 }
          );
        }
        const rec = { $type: "LoanFile", ...body, binding: "native", addedAt: (/* @__PURE__ */ new Date()).toISOString() };
        pl.loanFiles.push(rec);
        emitMeterEvent(env, ctx, request, { operation: "addLoanFile", shape: "anon-sandbox" });
        return json({ type: "OK", results: [rec] });
      }
      return methodNotAllowed(path, "GET, HEAD, POST");
    }
    if (path === "/mcp") {
      if (request.method !== "POST") return methodNotAllowed(path, "POST");
      let msg;
      try {
        msg = await request.json();
      } catch {
        return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 });
      }
      emitMeterEvent(env, ctx, request, { operation: "mcp", shape: "anon-sandbox" });
      const responses = Array.isArray(msg) ? msg.map((m) => handleMcpMessage(manifest, m)).filter((r) => r !== null) : handleMcpMessage(manifest, msg);
      if (responses === null) return new Response(null, { status: 202 });
      return json(responses);
    }
    return json(
      {
        type: "EMPTY",
        results: [],
        message: `no address ${path} on this origin \u2014 the capability card at /.well-known/agents.json lists every door`
      },
      { status: 404, head }
    );
  }
};

// ../../../../../Library/pnpm/global/5/.pnpm/wrangler@4.112.0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../Library/pnpm/global/5/.pnpm/wrangler@4.112.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-80kf3i/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../../Library/pnpm/global/5/.pnpm/wrangler@4.112.0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-80kf3i/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
