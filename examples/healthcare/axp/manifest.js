/**
 * manifest.js — the per-site routes/capability manifest: the ONE source of
 * truth every machine face is generated from ("docs cannot drift because docs
 * render from the manifest the service ships").
 *
 * `defineSiteManifest(input)` validates and normalizes; it THROWS on anything
 * that would emit a non-conformant artifact, because a generator that emits a
 * failing card is worse than no generator. The rules encoded here are AXP
 * 0.4.0 (pinned spec apis-ax-axp@2.4.0) Appendix A.2/A.3/A.5 plus the estate
 * laws:
 *
 *   - presence-when-true: nothing optional is emitted unless the manifest
 *     declares it (mcp, docs, icp, family, attestation ladder, home faces) —
 *     a promised-but-absent door is exactly the ghost surface claims-honesty
 *     punishes;
 *   - no-ask-zone → /pricing truth: pricing is REQUIRED and closed to
 *     {model:"free"} | {model:"metered", hardCeiling>0, offers, ...} — the
 *     policy becomes a served, machine-verified Pricing Document. Orthogonal
 *     to `model`, the optional `binding` axis says whether published terms
 *     bind that price; declared, it is never half-declared (pricing.js);
 *   - one branching collection (the api.lawyer /matters pattern) satisfies
 *     Clauses 4 + 7 on ONE pathname: keyless OK, 2× knownEmpty, 2×
 *     knownForbidden, all demonstrably branching on the query;
 *   - axp-ext/rates-g2@0.2.0 (the ratified generator extension, see
 *     spec/extensions/rates-g2.md): the canonical camelCase-verb operationId
 *     unified across route/MCP/suite/SDK/rate-key (§1), the top-level
 *     `rates[]` rate card in the Pricing Document (§2), the card's
 *     `links.verify` member (§3), and the top-level `g2` card object (§4) —
 *     all additive, all presence-when-true, all fail-closed here.
 */

const HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+$/i;
const PATHNAME = /^\/[^\s?#]*$/;

/* axp-ext/rates-g2@0.2.0 §1 — the canonical operation name: camelCase VERB
   form per the estate naming convention (decodeVin, createPlacement; embedded
   acronyms may stay uppercase: decodeVIN). One identifier, five surfaces —
   the OpenAPI operationId, the MCP tool name, the published suite's coverage
   reference, the generated SDK's method name, and the rates[] key — so the
   shape is enforced wherever any of the five is declared. */
const OPERATION_ID_RE = /^[a-z][A-Za-z0-9]*$/;

function fail(msg) {
  throw new Error(`axp-faces manifest: ${msg}`);
}

function assertOperationId(id, what) {
  if (typeof id !== "string" || !OPERATION_ID_RE.test(id)) {
    fail(
      `${what} must be a camelCase verb-form operationId (axp-ext/rates-g2 §1 — the ONE cross-face operation name: ` +
        `route operationId = MCP tool = suite coverage reference = SDK method = rates[] key; e.g. "decodeVin", "createPlacement") — got ${JSON.stringify(id)}`,
    );
  }
  return id;
}

/* ── axp-ext/rates-g2@0.2.0 §2 vocabulary (the survey floor) ────────────────
   Closed enums and reserved names from the 2026-08-23 adversarial pricing
   survey (90 real API businesses; 7 EXACT / 73 STRAINED / 10 INEXPRESSIBLE,
   fracture concentrated inside rates[]). The ADOPT-NOW amendments are
   implemented below; every DEFERRED amendment's field name is RESERVED and
   refused here, so early adopters cannot colonize it with an incompatible
   private convention before its ratification. */
const AT_LIMIT = ["bill", "block", "throttle", "force-upgrade", "renew-early", "drop"];
const DISCLOSURE = ["published", "calculator-only", "quote-only", "undisclosed"];
const METER_AGGREGATION = ["sum", "distinct", "high-watermark", "gauge", "peak"];
const METER_BASIS = ["consumed", "provisioned", "standing"];
const BREAKS_MODE = ["graduated", "retroactive", "reprice-offer"];
const BREAKS_BASIS = ["units", "spend", "instantaneous-rate"];
const MODIFIER_OP = ["multiply", "add"];
const MODIFIER_SCOPE = ["rate", "offer", "card"];
const RESERVED_RATE_MEMBERS = {
  keys: "D1 (rate dimensions/matrix)",
  payment: "D4 (two-part tariff)",
  direction: "A14 (money direction)",
  recurrence: "A13 (purchase recurrence)",
  effective: "D5 (temporal validity)",
  condition: "G20 (rate-level predicates ride modifiers[].condition until ratified standalone)",
  credits: "A6 (credits are offer-level when ratified)",
  currencies: "D3 (virtual currencies)",
};
const RESERVED_OFFER_MEMBERS = {
  credits: "A6 (cross-meter monetary credits)",
  base_fee: "A9 (hybrid base fee)",
  minimum: "A10 (billing floor / true-up)",
  relations: "A12 (requires/excludes/alternative_to/modifies)",
  entitlements: "A15 (non-price entitlements)",
  eligibility: "D6 (eligibility predicates)",
  effective: "D5 (temporal validity)",
  recurrence: "A13 (purchase recurrence)",
};

const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);

function refuseReserved(obj, reserved, what) {
  for (const [k, why] of Object.entries(reserved)) {
    if (obj[k] !== undefined) {
      fail(`${what}.${k} is a RESERVED name (axp-ext/rates-g2 §2.9 — deferred amendment ${why}, not yet ratified): drop it rather than colonize it with a private convention`);
    }
  }
}

/** A1/A2 — price: scalar, compound object, passthrough reference, or market discovery. */
function validateRatePrice(row, what) {
  const p = row.price;
  if (typeof p === "number") {
    if (!isFiniteNum(p) || p < 0) fail(`${what}: a scalar price is a finite number >= 0 — got ${JSON.stringify(p)}`);
    return;
  }
  if (p === null || typeof p !== "object" || Array.isArray(p)) fail(`${what}: price is a scalar >= 0 or one of the §2 price objects (compound | passthrough | market) — got ${JSON.stringify(p)}`);
  const isPassthrough = p.passthrough !== undefined;
  const isMarket = p.discovery !== undefined;
  if (isPassthrough && isMarket) fail(`${what}: a price is passthrough OR market-discovered, never both`);
  if (isPassthrough) {
    /* A2 (G8) — a pointer plus markup, legally distinct from a number. */
    const pt = p.passthrough;
    if (pt === null || typeof pt !== "object" || Array.isArray(pt) || typeof pt.provider !== "string" || pt.provider.length === 0) {
      fail(`${what}: price.passthrough is { provider, reference?, markup? } with provider a non-empty string (A2/G8)`);
    }
    if (pt.reference !== undefined && typeof pt.reference !== "string") fail(`${what}: price.passthrough.reference must be a string`);
    if (pt.markup !== undefined) {
      const mk = pt.markup;
      if (mk === null || typeof mk !== "object" || Array.isArray(mk)) fail(`${what}: price.passthrough.markup is { fixed?, percent? }`);
      if (mk.fixed !== undefined && (!isFiniteNum(mk.fixed) || mk.fixed < 0)) fail(`${what}: passthrough markup.fixed must be a finite number >= 0`);
      if (mk.percent !== undefined && (!isFiniteNum(mk.percent) || mk.percent < 0)) fail(`${what}: passthrough markup.percent must be a finite number >= 0`);
    }
    for (const k of ["fixed", "percent", "basis", "cap", "floor", "min_fee"]) {
      if (p[k] !== undefined) fail(`${what}: a passthrough price carries no compound member ${JSON.stringify(k)} — markup lives inside passthrough.markup (A2)`);
    }
    return;
  }
  if (isMarket) {
    /* A2 (G16) — no stated price exists; the buyer may cap. */
    if (p.discovery !== "market") fail(`${what}: price.discovery is closed to "market" (A2/G16) — got ${JSON.stringify(p.discovery)}`);
    if (p.reference !== undefined && typeof p.reference !== "string") fail(`${what}: price.reference must be a string (a rate reference or URL)`);
    if (p.buyer_cap !== undefined && typeof p.buyer_cap !== "boolean") fail(`${what}: price.buyer_cap must be a boolean`);
    return;
  }
  /* A1 (G1) — compound / ad-valorem: {fixed?, percent?, basis, cap?, floor?, min_fee?}. */
  if (p.fixed === undefined && p.percent === undefined) {
    fail(`${what}: a compound price declares at least one of fixed / percent (A1/G1) — an empty price object prices nothing`);
  }
  if (p.fixed !== undefined && (!isFiniteNum(p.fixed) || p.fixed < 0)) fail(`${what}: price.fixed must be a finite number >= 0`);
  if (p.percent !== undefined) {
    if (!isFiniteNum(p.percent) || p.percent <= 0) fail(`${what}: price.percent must be a finite number > 0 (a zero percent is the member omitted)`);
    if (typeof p.basis !== "string" || p.basis.length === 0) {
      fail(`${what}: price.percent REQUIRES price.basis naming what the percent is of ("transaction-value", "payout", "billing-volume", ...) — an ad-valorem rate without a basis is unpriceable (A1/G1)`);
    }
  }
  for (const k of ["cap", "floor", "min_fee"]) {
    if (p[k] !== undefined && (!isFiniteNum(p[k]) || p[k] < 0)) fail(`${what}: price.${k} must be a finite number >= 0`);
  }
}

/** A4 — the at-limit contract; economically opposite models must not be identical. */
function assertAtLimit(v, what) {
  if (!AT_LIMIT.includes(v)) fail(`${what} is closed to ${AT_LIMIT.map((x) => JSON.stringify(x)).join(" | ")} (A4/G4) — got ${JSON.stringify(v)}`);
  return v;
}

/** A5 — included: quantity | "unlimited" | allowance object. */
function validateIncluded(row, what) {
  const inc = row.included;
  if (inc === undefined) return;
  if (row.freeQuota !== undefined) fail(`${what}: declare included OR freeQuota, never both — freeQuota is the legacy shorthand for included {qty, period:"month"}`);
  if (typeof inc === "number") {
    if (!isFiniteNum(inc) || inc <= 0) fail(`${what}: a numeric included must be a finite number > 0`);
    return;
  }
  if (inc === "unlimited") return;
  if (inc === null || typeof inc !== "object" || Array.isArray(inc)) fail(`${what}: included is a quantity, "unlimited", or an allowance object {qty, period?, rollover?, at_limit?} (A5/G5)`);
  if (!(inc.qty === "unlimited" || (isFiniteNum(inc.qty) && inc.qty > 0))) fail(`${what}: included.qty must be a finite number > 0 or "unlimited"`);
  if (inc.period !== undefined && !["day", "month", "once"].includes(inc.period)) fail(`${what}: included.period is closed to "day" | "month" | "once" (A5/G5)`);
  if (inc.rollover !== undefined && typeof inc.rollover !== "boolean") fail(`${what}: included.rollover must be a boolean`);
  if (inc.at_limit !== undefined) assertAtLimit(inc.at_limit, `${what}: included.at_limit`);
}

/** A3 — modifiers: derived/relative pricing without combinatorial row duplication. */
function validateModifiers(row, what) {
  const mods = row.modifiers;
  if (mods === undefined) return;
  if (!Array.isArray(mods) || mods.length === 0) fail(`${what}: modifiers must be a NON-EMPTY array (A3/G2) — or absent`);
  for (const m of mods) {
    if (m === null || typeof m !== "object" || Array.isArray(m)) fail(`${what}: every modifier is { op, value, scope?, condition?, stacking_order? }`);
    if (!MODIFIER_OP.includes(m.op)) fail(`${what}: modifier.op is closed to "multiply" | "add" (A3/G2) — got ${JSON.stringify(m.op)}`);
    if (!isFiniteNum(m.value)) fail(`${what}: modifier.value must be a finite number`);
    if (m.scope !== undefined && !MODIFIER_SCOPE.includes(m.scope)) fail(`${what}: modifier.scope is closed to "rate" | "offer" | "card"`);
    if (m.condition !== undefined) {
      if (m.condition === null || typeof m.condition !== "object" || Array.isArray(m.condition) || typeof m.condition.attribute !== "string") {
        fail(`${what}: modifier.condition is { attribute, op?, value? } with attribute a string (A3/G20)`);
      }
    }
    if (m.stacking_order !== undefined && !(Number.isInteger(m.stacking_order) && m.stacking_order >= 0)) fail(`${what}: modifier.stacking_order must be a non-negative integer`);
  }
}

/** A11-lite — meter semantics: two identical rows must not mean bills 10x apart. */
function validateMeter(row, what) {
  const mt = row.meter;
  if (mt === undefined) return;
  if (mt === null || typeof mt !== "object" || Array.isArray(mt)) fail(`${what}: meter is { aggregation, basis?, reset_period?, definition_url? } (G3)`);
  if (!METER_AGGREGATION.includes(mt.aggregation)) fail(`${what}: meter.aggregation is closed to ${METER_AGGREGATION.map((x) => JSON.stringify(x)).join(" | ")} (G3)`);
  if (mt.basis !== undefined && !METER_BASIS.includes(mt.basis)) fail(`${what}: meter.basis is closed to "consumed" | "provisioned" | "standing" (G3)`);
  if (mt.reset_period !== undefined && typeof mt.reset_period !== "string") fail(`${what}: meter.reset_period must be a string`);
  if (mt.definition_url !== undefined && typeof mt.definition_url !== "string") fail(`${what}: meter.definition_url must be a string URL — "defined elsewhere" must be distinguishable from "undefined"`);
}

/** A7 — volume_breaks: mode + basis, or identical JSON means materially different bills. */
function validateVolumeBreaks(row, what) {
  const vb = row.volume_breaks;
  if (vb === undefined) return;
  if (vb === null || typeof vb !== "object" || Array.isArray(vb)) fail(`${what}: volume_breaks is { mode, basis?, breaks[], formula_url?, approximate? } (A7/G7)`);
  if (!BREAKS_MODE.includes(vb.mode)) {
    fail(`${what}: volume_breaks.mode is REQUIRED and closed to "graduated" | "retroactive" | "reprice-offer" (A7/G7 — the same breaks JSON bills differently under each) — got ${JSON.stringify(vb.mode)}`);
  }
  if (vb.basis !== undefined && !BREAKS_BASIS.includes(vb.basis)) fail(`${what}: volume_breaks.basis is closed to "units" | "spend" | "instantaneous-rate"`);
  if (!Array.isArray(vb.breaks) || vb.breaks.length === 0) fail(`${what}: volume_breaks.breaks must be a NON-EMPTY array of { from, price | discount_percent }`);
  for (const b of vb.breaks) {
    if (b === null || typeof b !== "object" || Array.isArray(b) || !isFiniteNum(b.from) || b.from < 0) fail(`${what}: every break is { from: number >= 0, price | discount_percent }`);
    if (b.price === undefined && b.discount_percent === undefined) fail(`${what}: every break carries price or discount_percent`);
    if (b.price !== undefined && (!isFiniteNum(b.price) || b.price < 0)) fail(`${what}: break.price must be a finite number >= 0`);
    if (b.discount_percent !== undefined && (!isFiniteNum(b.discount_percent) || b.discount_percent <= 0)) fail(`${what}: break.discount_percent must be a finite number > 0`);
  }
  if (vb.formula_url !== undefined && typeof vb.formula_url !== "string") fail(`${what}: volume_breaks.formula_url must be a string URL`);
  if (vb.approximate !== undefined && typeof vb.approximate !== "boolean") fail(`${what}: volume_breaks.approximate must be a boolean`);
}

/** A8 — disclosure: "priced on request" must be distinguishable from "no such meter". */
function validateDisclosure(row, what) {
  if (row.disclosure !== undefined && !DISCLOSURE.includes(row.disclosure)) {
    fail(`${what}: disclosure is closed to ${DISCLOSURE.map((x) => JSON.stringify(x)).join(" | ")} (A8/G9)`);
  }
  const withheld = row.disclosure !== undefined && row.disclosure !== "published";
  if (row.price === undefined || row.price === null) {
    if (!withheld) {
      fail(`${what} needs a price — omit/null it ONLY under a non-published disclosure ("calculator-only" | "quote-only" | "undisclosed"), so a withheld price is a declared fact, never a silent gap (A8/G9)`);
    }
  }
  if (row.estimate !== undefined) {
    if (!withheld) fail(`${what}: estimate is legal only when disclosure withholds the price (A8/G9) — a published price needs no estimate`);
    const e = row.estimate;
    if (e === null || typeof e !== "object" || Array.isArray(e) || !isFiniteNum(e.low) || !isFiniteNum(e.high) || e.low < 0 || e.high < e.low) {
      fail(`${what}: estimate is { low, high, provenance? } with 0 <= low <= high`);
    }
    if (e.provenance !== undefined && typeof e.provenance !== "string") fail(`${what}: estimate.provenance must be a string`);
  }
  return withheld;
}

function assertPath(p, what) {
  if (typeof p !== "string" || !PATHNAME.test(p)) fail(`${what} must be a same-origin pathname starting with "/" (got ${JSON.stringify(p)})`);
  if (p.includes("{")) fail(`${what} must be non-templated (Appendix A.3) — got ${JSON.stringify(p)}`);
  return p;
}

/** Validate + normalize a site manifest. Returns a frozen manifest. */
export function defineSiteManifest(input) {
  if (!input || typeof input !== "object") fail("manifest must be an object");

  // ── identity ──────────────────────────────────────────────────────────────
  const origin = String(input.origin || "").replace(/\/+$/, "");
  if (!HTTPS_ORIGIN.test(origin) && !/^https?:\/\/[a-z0-9.-]+(\.[a-z]+)?$/i.test(origin)) {
    fail(`origin must be an https origin with no path (got ${JSON.stringify(input.origin)})`);
  }
  const name = input.name || new URL(origin).hostname;
  const description = String(input.description || "");
  if (description.length < 21) fail("description must be substantive (> 20 chars) — the card check judges it");

  // ── the branching collection (Clauses 4 + 7 on one pathname) ─────────────
  const c = input.collection;
  if (!c || typeof c !== "object") fail("collection is required — the one branching GET pathname that discharges Clauses 4 and 7");
  const collectionPath = assertPath(c.path, "collection.path");
  const records = Array.isArray(c.records) ? c.records : null;
  if (!records || records.length === 0) {
    fail("collection.records must be a NON-EMPTY array — the keyless probe must answer 200 OK with substance; seed one honest, clearly-labeled demo record (the api.lawyer demoMatter pattern)");
  }
  const filters = Array.isArray(c.filters) && c.filters.length > 0 ? c.filters.map(String) : ["filter", "tag"];
  const blockedScopes = Array.isArray(c.blockedScopes) && c.blockedScopes.length >= 2 ? c.blockedScopes.map(String) : ["admin", "internal"];
  if (blockedScopes.length < 2) fail("collection.blockedScopes needs >= 2 entries — Clause 4 requires two distinct knownForbidden probes");
  const knownEmptyQueries =
    filters.length >= 2
      ? [`${filters[0]}=none`, `${filters[1]}=none`]
      : [`${filters[0]}=none`, `${filters[0]}=__none__`];

  const collection = Object.freeze({
    path: collectionPath,
    /* axp-ext/rates-g2 §1: the collection operation's canonical name is
       site-nameable (default "listCollection") so a rate row can key on it. */
    operationId: c.operationId !== undefined ? assertOperationId(c.operationId, "collection.operationId") : "listCollection",
    memberName: c.memberName || "results",
    summary: c.summary || `The ${name} collection — typed OK | EMPTY | BLOCKED, branching on its query`,
    records: Object.freeze([...records]),
    filters: Object.freeze(filters),
    blockedScopes: Object.freeze(blockedScopes),
    /** (record, param, value) => boolean — how a filter param matches */
    match: typeof c.match === "function" ? c.match : (rec, param, value) => rec != null && String(rec[param]) === value,
    emptyMessage:
      typeof c.emptyMessage === "function"
        ? c.emptyMessage
        : (param, value) => `no records match ${param}=${value} — a truthful empty set, not an error`,
    blockedReason:
      typeof c.blockedReason === "function"
        ? c.blockedReason
        : (scope) => `scope '${scope}' is reserved to the platform — not permitted for your agent class`,
  });

  // ── pricing (Clause 5 — the no-ask-zone law, mechanical) ─────────────────
  const p = input.pricing || { model: "free" };
  if (p.model !== "free" && p.model !== "metered") fail('pricing.model is closed to "free" | "metered" (Appendix A.2)');

  /* The binding axis (pricing.js): `model` says what it costs, `binding` says
     whether published terms bind that answer. Optional — omitting it emits
     nothing — but never half-declared, because a boolean nobody has to explain
     is worse than no boolean at all. */
  const binding = (() => {
    if (p.binding === undefined) {
      for (const k of ["statement", "termsUrl", "ledgerUrl"]) {
        if (p[k] !== undefined) fail(`pricing.${k} is meaningless without pricing.binding — declare binding: true | false or drop ${k}`);
      }
      return {};
    }
    if (typeof p.binding !== "boolean") fail("pricing.binding must be a boolean — true (published terms bind this price) or false (stated intent)");
    if (p.binding === true && typeof p.termsUrl !== "string") {
      fail("pricing.binding: true requires pricing.termsUrl — a price cannot claim to be bound without naming the terms document that binds it");
    }
    if (p.binding === false && typeof p.statement !== "string") {
      fail("pricing.binding: false requires pricing.statement — an unbound price states its intent in the same words the human page uses, or it is not admitted");
    }
    if (p.binding === false && p.termsUrl !== undefined) {
      fail("pricing.binding: false declares NO termsUrl — naming a terms document is what binding: true means");
    }
    return {
      binding: p.binding,
      ...(p.statement !== undefined && { statement: String(p.statement) }),
      ...(p.termsUrl !== undefined && { termsUrl: String(p.termsUrl) }),
      ...(p.ledgerUrl !== undefined && { ledgerUrl: String(p.ledgerUrl) }),
    };
  })();

  /* ── the operation rate card (axp-ext/rates-g2@0.2.0 §2) ──────────────────
     `rates` is a TOP-LEVEL array of the Pricing Document (the ruled placement
     — never nested under an offer): one row per priced operation, keyed by
     the canonical operationId (§1). Optional on either model; declared, it is
     judged strictly: every row names an operation the SAME manifest actually
     declares (checked below, after routes/mcp are normalized).

     Since 0.2.0 the row vocabulary is the ADOPT-NOW floor of the 2026-08-23
     adversarial pricing survey (90 businesses: 7 EXACT / 73 STRAINED / 10
     INEXPRESSIBLE — the fracture was inside rates[]): price as scalar OR
     compound {fixed, percent, basis} OR reference form (passthrough | market)
     [A1/A2]; modifiers[] + derived_from for relative pricing [A3]; at_limit +
     offer spend_cap [A4]; included allowances + offer pooled allowances[]
     [A5]; volume_breaks.mode/basis [A7]; disclosure — price omittable ONLY
     when declared withheld [A8]; meter aggregation lite [G3]. DEFERRED
     amendment names are RESERVED and refused. Unreserved extra members still
     pass through verbatim (the offers precedent). */
  let rates;
  if (p.rates !== undefined) {
    if (!Array.isArray(p.rates) || p.rates.length === 0) fail("pricing.rates must be a NON-EMPTY array of rate rows (axp-ext/rates-g2 §2) — or absent");
    rates = Object.freeze(
      p.rates.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) fail("every pricing.rates row is an object { operation, price, ... } (axp-ext/rates-g2 §2)");
        assertOperationId(row.operation, "pricing.rates[].operation");
        const what = `pricing.rates row ${JSON.stringify(row.operation)}`;
        refuseReserved(row, RESERVED_RATE_MEMBERS, what);
        validateDisclosure(row, what); // A8 first: it rules whether price may be absent/null
        if (row.price !== undefined && row.price !== null) validateRatePrice(row, what);
        if (row.unit !== undefined && typeof row.unit !== "string") fail(`${what}: unit must be a string`);
        if (row.note !== undefined && typeof row.note !== "string") fail(`${what}: note must be a string`);
        if (row.freeQuota !== undefined && !(isFiniteNum(row.freeQuota) && row.freeQuota > 0)) {
          fail(`${what}: freeQuota must be a number strictly > 0 — a zero quota is the row without it`);
        }
        validateIncluded(row, what);
        validateModifiers(row, what);
        validateMeter(row, what);
        validateVolumeBreaks(row, what);
        if (row.derived_from !== undefined) assertOperationId(row.derived_from, `${what}: derived_from`);
        if (p.model === "free") {
          /* A free surface stays free: only a scalar zero price, no billable
             overage semantics, nothing withheld. A hard quota (at_limit that
             never bills) is honest free; anything that can produce a bill is
             not. */
          if (row.price !== 0) fail(`${what}: a free surface publishes only scalar zero rates — a positive, compound, reference, or withheld price contradicts model:"free"`);
          if (row.freeQuota !== undefined) fail(`${what}: freeQuota on a free surface implies billable overage — use included {qty, at_limit:"block"|"throttle"|"drop"} for an honest free quota`);
          if (row.modifiers !== undefined || row.volume_breaks !== undefined) fail(`${what}: modifiers/volume_breaks modify a price a free surface does not charge — drop them or declare model:"metered"`);
          if (row.disclosure !== undefined && row.disclosure !== "published") fail(`${what}: a free surface withholds nothing — disclosure must be "published" or absent`);
          const inc = row.included;
          if (inc !== null && typeof inc === "object" && inc.at_limit !== undefined && !["block", "throttle", "drop"].includes(inc.at_limit)) {
            fail(`${what}: on a free surface included.at_limit is closed to "block" | "throttle" | "drop" — "${inc.at_limit}" implies a bill or a purchase`);
          }
        }
        return Object.freeze(JSON.parse(JSON.stringify(row)));
      }),
    );
    const seen = new Set();
    for (const row of rates) {
      if (seen.has(row.operation)) fail(`pricing.rates keys on operationId and ${JSON.stringify(row.operation)} appears twice — one operation, one rate row`);
      seen.add(row.operation);
    }
    /* A3 — derived_from resolves INSIDE the rate card: a rate defined as a
       function of a rate that is not on the card derives from nothing. */
    for (const row of rates) {
      if (row.derived_from !== undefined) {
        if (row.derived_from === row.operation) fail(`pricing.rates row ${JSON.stringify(row.operation)}: derived_from cannot reference itself`);
        if (!seen.has(row.derived_from)) fail(`pricing.rates row ${JSON.stringify(row.operation)}: derived_from ${JSON.stringify(row.derived_from)} names no row on this card (A3/G2)`);
      }
    }
  }

  /* Operation references made by offer-level pooled allowances (A5) — checked
     against the declared operation set once routes/mcp are normalized. */
  const allowanceRefs = [];

  let pricing;
  if (p.model === "free") {
    if (p.hardCeiling !== undefined || p.offers !== undefined) {
      fail("a free API declares NO hardCeiling and NO offers — free means the metering clauses do not apply (Appendix A.5)");
    }
    pricing = Object.freeze({ model: "free", ...(rates !== undefined && { rates }), ...binding });
  } else {
    if (!(typeof p.hardCeiling === "number" && p.hardCeiling > 0)) fail("metered pricing requires hardCeiling: a number strictly > 0");
    const offers = Array.isArray(p.offers) ? p.offers : null;
    if (!offers || offers.length === 0) fail("metered pricing requires monetization offers (>= 1, each with id|title plus price|checkoutUrl|alternatives)");
    for (const o of offers) {
      if (!o || (!o.id && !o.title)) fail("every offer carries an id or title");
      if (o.price === undefined && o.checkoutUrl === undefined && o.alternatives === undefined) {
        fail("every offer carries a price, checkoutUrl, or alternatives member");
      }
      const oWhat = `pricing.offers ${JSON.stringify(o.id || o.title)}`;
      refuseReserved(o, RESERVED_OFFER_MEMBERS, oWhat);
      /* A4 — the buyer-visible spend cap: {amount, settable_by}. */
      if (o.spend_cap !== undefined) {
        const sc = o.spend_cap;
        if (sc === null || typeof sc !== "object" || Array.isArray(sc) || !isFiniteNum(sc.amount) || sc.amount <= 0 || !["buyer", "seller"].includes(sc.settable_by)) {
          fail(`${oWhat}: spend_cap is { amount: number > 0, settable_by: "buyer" | "seller" } (A4/G4)`);
        }
      }
      /* A5 — pooled allowances: one pool drained by many meters, with
         per-meter conversion ratios (the GitHub-Actions / Agora shape). Refs
         are checked against the declared operation set below. */
      if (o.allowances !== undefined) {
        if (!Array.isArray(o.allowances) || o.allowances.length === 0) fail(`${oWhat}: allowances must be a NON-EMPTY array (A5/G5) — or absent`);
        for (const a of o.allowances) {
          if (a === null || typeof a !== "object" || Array.isArray(a)) fail(`${oWhat}: every allowance is { pool_qty, denomination, applies_to[], conversion?, disjunctive?, period?, rollover?, at_limit? }`);
          if (!(a.pool_qty === "unlimited" || (isFiniteNum(a.pool_qty) && a.pool_qty > 0))) fail(`${oWhat}: allowance.pool_qty must be a finite number > 0 or "unlimited"`);
          if (!["unit", "currency"].includes(a.denomination)) fail(`${oWhat}: allowance.denomination is closed to "unit" | "currency" (A5/G5)`);
          if (!Array.isArray(a.applies_to) || a.applies_to.length === 0) fail(`${oWhat}: allowance.applies_to must be a NON-EMPTY array of operationIds — a pool no meter drains allows nothing`);
          for (const ref of a.applies_to) {
            assertOperationId(ref, `${oWhat}: allowance.applies_to entry`);
            allowanceRefs.push({ ref, where: `${oWhat} allowances.applies_to` });
          }
          if (a.conversion !== undefined) {
            if (a.conversion === null || typeof a.conversion !== "object" || Array.isArray(a.conversion) || Object.keys(a.conversion).length === 0) {
              fail(`${oWhat}: allowance.conversion is a non-empty { <operationId>: ratio > 0 } map (A5/G5)`);
            }
            for (const [ref, ratio] of Object.entries(a.conversion)) {
              assertOperationId(ref, `${oWhat}: allowance.conversion key`);
              if (!(isFiniteNum(ratio) && ratio > 0)) fail(`${oWhat}: allowance.conversion[${JSON.stringify(ref)}] must be a finite ratio > 0`);
              allowanceRefs.push({ ref, where: `${oWhat} allowances.conversion` });
            }
          }
          if (a.disjunctive !== undefined && typeof a.disjunctive !== "boolean") fail(`${oWhat}: allowance.disjunctive must be a boolean (OR-limits: whichever exhausts first)`);
          if (a.period !== undefined && !["day", "month", "once"].includes(a.period)) fail(`${oWhat}: allowance.period is closed to "day" | "month" | "once"`);
          if (a.rollover !== undefined && typeof a.rollover !== "boolean") fail(`${oWhat}: allowance.rollover must be a boolean`);
          if (a.at_limit !== undefined) assertAtLimit(a.at_limit, `${oWhat}: allowance.at_limit`);
        }
      }
    }
    pricing = Object.freeze({
      model: "metered",
      hardCeiling: p.hardCeiling,
      ...(p.unit !== undefined && { unit: p.unit }),
      ...(p.price !== undefined && { price: p.price }),
      ...(rates !== undefined && { rates }),
      ...binding,
      offers: Object.freeze(offers.map((o) => Object.freeze({ ...o }))),
      offerPath: assertPath(p.offerPath || "/offer", "pricing.offerPath"),
      spendParam: String(p.spendParam || "spend"),
    });
  }

  // ── extra LIVE routes (presence-when-true: only what actually answers) ───
  const routes = Object.freeze(
    (Array.isArray(input.routes) ? input.routes : []).map((r) => {
      if (!r || typeof r !== "object") fail("each route is an object { method, path, summary, ... }");
      const method = String(r.method || "GET").toUpperCase();
      if (typeof r.path !== "string" || !r.path.startsWith("/")) fail(`route path must start with "/" (got ${JSON.stringify(r.path)})`);
      if (!r.summary) fail(`route ${method} ${r.path} needs a summary — the contract is hand-true, not scaffolded`);
      if (r.operationId !== undefined) assertOperationId(r.operationId, `route ${method} ${r.path} operationId`);
      return Object.freeze({
        method,
        path: r.path,
        ...(r.operationId !== undefined && { operationId: r.operationId }),
        summary: String(r.summary),
        ...(r.description !== undefined && { description: String(r.description) }),
        params: Object.freeze(Array.isArray(r.params) ? r.params.map((x) => Object.freeze({ ...x })) : []),
        ...(r.requestBody !== undefined && { requestBody: r.requestBody }),
        ...(r.responses !== undefined && { responses: r.responses }),
      });
    }),
  );

  // ── llms.txt ──────────────────────────────────────────────────────────────
  let llms;
  if (input.llms && typeof input.llms.body === "string") {
    const body = input.llms.body;
    if (!/^# /m.test(body)) fail("llms.body must be markdown with an H1 (Clause 2)");
    if (/<html|<!doctype/i.test(body)) fail("llms.body must never be HTML (Clause 2)");
    llms = Object.freeze({ body });
  }

  // ── family registry (typed sibling edges, presence-when-true) ────────────
  const family = Object.freeze(
    (Array.isArray(input.family) ? input.family : []).map((f) => {
      if (!f || !f.name || !f.origin) fail("each family entry needs { name, origin } (plus role/seams/faces as true)");
      return Object.freeze({
        name: String(f.name),
        origin: String(f.origin).replace(/\/+$/, ""),
        ...(f.role !== undefined && { role: String(f.role) }),
        ...(f.llms !== undefined && { llms: String(f.llms) }),
        ...(f.card !== undefined && { card: String(f.card) }),
        seams: Object.freeze(Array.isArray(f.seams) ? f.seams.map((s) => Object.freeze({ ...s })) : []),
      });
    }),
  );

  // ── mcp (presence-when-true: declare it ONLY where the door exists) ──────
  let mcp;
  if (input.mcp !== undefined) {
    const m = input.mcp;
    const remote = m && typeof m.url === "string";
    const local = m && typeof m.command === "string";
    if (!remote && !local) fail("mcp must be { url, transport, tools } (a mounted door) or { command, args } (an npx-served server) — or absent");
    if (remote && (!Array.isArray(m.tools) || m.tools.length === 0)) fail("a mounted mcp door declares a non-empty tools array");
    /* axp-ext/rates-g2 §1: an MCP tool name IS the canonical operationId —
       tools are declared BY NAME as strings (the verifier's card parser reads
       string entries), in the same camelCase verb form, so the one operation
       carries the one identifier across every surface it is served on. */
    if (Array.isArray(m.tools)) {
      for (const t of m.tools) {
        if (typeof t !== "string") {
          fail(`mcp.tools entries are STRING tool names (axp-ext/rates-g2 §1 — the tool name is the canonical operationId; descriptions and schemas are served live by tools/list) — got ${JSON.stringify(t)}`);
        }
        assertOperationId(t, "mcp.tools entry");
      }
    }
    mcp = Object.freeze(JSON.parse(JSON.stringify(m)));
  }

  // ── digital link (AXP 0.6.0 Appendix A.8 — OPTIONAL, presence-when-true) ──
  /* An optional DECLARED interface (A.8): presence is the declaration, and since
     apis-ax-axp@2.3.0 declaring it ARMS `check-digital-link-resolver`, which is
     judged strictly. The generator DECLARES it; serving
     the GS1 Resolver Description File is the site's job, and this generator
     never writes one — GS1's vocabulary is GS1's, and a generated description
     file would be AXP guessing at supportedPrimaryKeys it cannot know. So:
     declare it only where the well-known already answers, because a declared
     resolver that 404s is exactly the machine-readable false claim A.8 exists
     to make checkable. Omitting it is full conformance (Clause 6). */
  let digitalLink;
  if (input.digitalLink !== undefined) {
    const d = input.digitalLink;
    if (d === null || typeof d !== "object" || Array.isArray(d)) {
      fail("digitalLink must be an object (Appendix A.8.1) — {} declares the interface at GS1's fixed /.well-known/gs1resolver");
    }
    if (d.wellKnown === undefined) {
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
        fail(`digitalLink.wellKnown must be SAME-ORIGIN with the card (Appendix A.8.2 — a card describes this origin's resolver, never a third party's): ${u.origin} !== ${origin}`);
      }
      if (u.pathname !== "/.well-known/gs1resolver") {
        fail(`digitalLink.wellKnown must address /.well-known/gs1resolver — GS1 fixes that location (RFC 8615); got ${JSON.stringify(u.pathname)}`);
      }
      digitalLink = Object.freeze({ wellKnown: u.href });
    }
  }

  // ── published test suite (AXP 0.7.0 Appendix A.8.5/A.8.6 — OPTIONAL) ─────
  /* The second optional interface — and since apis-ax-axp@2.4.0 declaring it
     ARMS `check-published-test-suite`, which is judged strictly: the verifier
     fetches the document, checks its bytes against the pin, and RUNS it in the
     dialect `runner` names (declarative suite@1 interpreted; executable
     vitest@1 run under the A.8.6 invariants). The generator DECLARES it;
     authoring and serving the suite document is the site's job, and this
     generator never writes one — a generated suite would be AXP asserting
     workflows it cannot know. Declare it only where the document already
     answers at the declared pin, because a declared suite that 404s (or whose
     bytes do not match the pin) is exactly the machine-readable false claim
     A.8.5 exists to make checkable — and is now inadmissible. Omitting it is
     full conformance: a simple CRUD or lookup API has no workflow to publish
     and must never be asked for one. */
  let testSuite;
  if (input.testSuite !== undefined) {
    const t = input.testSuite;
    if (t === null || typeof t !== "object" || Array.isArray(t)) {
      fail("testSuite must be an object (Appendix A.8.5) — { digest } plus an address ({ url } and/or { package, version }) at minimum");
    }
    /* AXP 0.7.0 closes the dialect set: `api.qa/suite@1` (declarative,
       interpreted) and `api.qa/vitest@1` (executable, Appendix A.8.6 — the
       tests travel inside the digest-pinned artifact: string members of the
       suite document, or a natively served ES module per A.8.6.6). Any other
       runner value MUST fail at the verifier, never skip — so a generator
       that emitted one would be emitting a card that cannot be admitted.
       Refuse it here, where the mistake is cheap. */
    if (t.runner !== undefined && t.runner !== "api.qa/suite@1" && t.runner !== "api.qa/vitest@1") {
      fail(
        'testSuite.runner is closed to "api.qa/suite@1" | "api.qa/vitest@1" (Appendix A.8.5 — any other value fails at the verifier, never skips)' +
          ` — got ${JSON.stringify(t.runner)}`,
      );
    }
    const executable = t.runner === "api.qa/vitest@1";
    if (t.url === undefined && t.package === undefined) {
      fail(
        "testSuite needs an address (Appendix A.8.5): at least one of `url` / `package` — a suite that names no location and no pin is not a published suite",
      );
    }
    let u;
    if (t.url !== undefined) {
      if (typeof t.url !== "string") {
        fail("testSuite.url must be a string URL (Appendix A.8.5)");
      }
      const abs = t.url.startsWith("/") ? `${origin}${t.url}` : t.url;
      try {
        u = new URL(abs);
      } catch {
        fail(`testSuite.url must be an absolute URL or a same-origin-relative pathname (got ${JSON.stringify(t.url)})`);
      }
      /* Off-origin addresses are legal since AXP 0.7.0 (A.8.6.6): a versioned
         module-CDN URL is the normal case for an SDK, and the digest — never
         the host — is the authority over the bytes. */
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        fail(`testSuite.url must be an http(s) address (got ${JSON.stringify(t.url)})`);
      }
    }
    /* The npm coordinate is an IDENTITY ASSERTION (A.8.6.6): provenance that
       the pinned served bytes equal that published version's entry module.
       npm is a verifiable mirror, never in the loop — so the coordinate is
       meaningful only where something executes: the vitest@1 dialect. */
    if (t.package !== undefined) {
      if (typeof t.package !== "string" || !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(t.package)) {
        fail(`testSuite.package must be a valid npm package name (Appendix A.8.6.6) — got ${JSON.stringify(t.package)}`);
      }
      if (!executable) {
        fail('testSuite.package is meaningful only under runner "api.qa/vitest@1" (Appendix A.8.5 — a declarative suite has no module to assert identity over)');
      }
      if (typeof t.version !== "string" || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(t.version)) {
        fail(
          "testSuite.version is REQUIRED with testSuite.package and must be an exact published version, never a range (Appendix A.8.5) — an identity assertion over a moving target asserts nothing",
        );
      }
    } else if (t.version !== undefined) {
      fail("testSuite.version is meaningful only with testSuite.package (Appendix A.8.5)");
    }
    if (t.export !== undefined) {
      if (typeof t.export !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t.export)) {
        fail(`testSuite.export must be the name of a module export (Appendix A.8.5) — got ${JSON.stringify(t.export)}`);
      }
      if (!executable) {
        fail('testSuite.export is meaningful only under runner "api.qa/vitest@1" (Appendix A.8.5 — a declarative document has no exports)');
      }
    }
    if (typeof t.digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(t.digest)) {
      fail(
        "testSuite.digest is REQUIRED and must be \"sha256:<64 lowercase hex>\" over the pinned artifact's exact bytes " +
          "(Appendix A.8.5.1) — the digest is the SOLE byte authority in every addressing (A.8.6.6). Unpinned, a surface could rewrite its assertions between advertising them and being held to them.",
      );
    }
    if (t.environment !== undefined && typeof t.environment !== "string") {
      fail("testSuite.environment must be a string naming one of the suite's environments (Appendix A.8.5)");
    }
    testSuite = Object.freeze({
      ...(u !== undefined && { url: u.href }),
      ...(t.package !== undefined && { package: t.package, version: t.version }),
      ...(t.export !== undefined && { export: t.export }),
      digest: t.digest,
      ...(t.environment !== undefined && { environment: t.environment }),
      ...(t.runner !== undefined && { runner: t.runner }),
    });
  }

  const familyPath = assertPath(input.familyPath || "/family.json", "familyPath");

  // ── links.verify (axp-ext/rates-g2@0.2.0 §3 — presence-when-true) ─────────
  /* The card's link to the property's published runnable-suite export (the
     "/verify" door: the suites anyone can run against the live surface).
     Declared only where that document already answers — a verify link that
     404s is a machine-readable false claim. A same-origin pathname is
     absolutized; an absolute http(s) URL is carried verbatim (a suite may be
     served off-origin per A.8.6.6 — the digest, never the host, is the byte
     authority there). */
  let verifyUrl;
  if (input.verifyUrl !== undefined) {
    if (typeof input.verifyUrl !== "string") fail("verifyUrl must be a string — an absolute http(s) URL or a same-origin pathname (axp-ext/rates-g2 §3)");
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

  // ── g2 (axp-ext/rates-g2@0.2.0 §4 — presence-when-true) ──────────────────
  /* The property's G2/ICP coordinates as a TOP-LEVEL object on the capability
     card (the ruled placement): who this face is for and on what motion —
     machine-readable go-to-market coordinates, additive only. The generator
     never authors the coordinates (it cannot know them); it carries the
     site's own object verbatim. An empty object declares nothing and is
     refused — declare coordinates or omit the member. */
  let g2;
  if (input.g2 !== undefined) {
    if (input.g2 === null || typeof input.g2 !== "object" || Array.isArray(input.g2)) {
      fail("g2 must be a plain object of G2/ICP coordinates (axp-ext/rates-g2 §4) — or absent");
    }
    if (Object.keys(input.g2).length === 0) fail("g2: {} declares nothing — declare at least one coordinate member or omit g2 (presence-when-true)");
    g2 = Object.freeze(JSON.parse(JSON.stringify(input.g2)));
  }

  // ── the one-identifier cross-checks (axp-ext/rates-g2@0.2.0 §1/§2) ───────
  /* The contract's operationId set: the generated quartet operations plus
     every declared route that names one. Uniqueness is enforced — one
     operation, one identifier, everywhere. */
  const contractOperationIds = [
    collection.operationId,
    "getPricing",
    ...(family.length > 0 ? ["getFamilyRegistry"] : []),
    ...(pricing.model === "metered" ? ["getOffer"] : []),
    ...routes.filter((r) => r.operationId !== undefined).map((r) => r.operationId),
  ];
  {
    const seen = new Set();
    for (const id of contractOperationIds) {
      if (seen.has(id)) fail(`operationId ${JSON.stringify(id)} is declared twice — one operation, one canonical identifier (axp-ext/rates-g2 §1)`);
      seen.add(id);
    }
  }
  const nameable = new Set([...contractOperationIds, ...(mcp !== undefined && Array.isArray(mcp.tools) ? mcp.tools : [])]);
  if (rates !== undefined) {
    /* Every rate row keys on an operation this SAME manifest declares — a
       contract operationId or an MCP tool name (the same identifier space by
       §1). A rate for an operation nobody can find is a machine-readable
       claim about a ghost door; presence-when-true applies to rates. */
    for (const row of rates) {
      if (!nameable.has(row.operation)) {
        fail(
          `pricing.rates row ${JSON.stringify(row.operation)} names an operation this manifest does not declare — ` +
            `rates[] keys on the canonical operationId (give the route an operationId, or drop the row); declared: ${[...nameable].sort().join(", ")}`,
        );
      }
    }
  }
  /* A5 — pooled-allowance references obey the same law as rate keys. */
  for (const { ref, where } of allowanceRefs) {
    if (!nameable.has(ref)) {
      fail(`${where} references ${JSON.stringify(ref)} — an operation this manifest does not declare (A5/G5); declared: ${[...nameable].sort().join(", ")}`);
    }
  }

  const manifest = Object.freeze({
    origin,
    name,
    description,
    version: String(input.version || "0.1.0"),
    collection,
    pricing,
    routes,
    ...(mcp !== undefined && { mcp }),
    ...(digitalLink !== undefined && { digitalLink }),
    ...(testSuite !== undefined && { testSuite }),
    ...(llms !== undefined && { llms }),
    ...(input.docsUrl !== undefined && { docsUrl: String(input.docsUrl) }),
    ...(verifyUrl !== undefined && { verifyUrl }),
    ...(g2 !== undefined && { g2 }),
    conformanceUrl: String(input.conformanceUrl || `https://api.qa/${name}`),
    ...(input.icpUrl !== undefined && { icpUrl: String(input.icpUrl) }),
    ...(input.attestationLadder !== undefined && { attestationLadder: Object.freeze(JSON.parse(JSON.stringify(input.attestationLadder))) }),
    family,
    familyPath,
    ...(input.home !== undefined && { home: input.home }),
    homeContext: String(input.homeContext || "https://schema.org.ai"),
    knownEmptyQueries: Object.freeze(knownEmptyQueries),
  });

  return manifest;
}

/** Appendix A.3 — the probe manifest derived from the manifest (never hand-written). */
export function buildProbes(manifest) {
  const { collection, pricing, knownEmptyQueries } = manifest;
  return {
    keyless: { url: collection.path },
    knownEmpty: knownEmptyQueries.map((q) => ({ url: `${collection.path}?${q}` })),
    knownForbidden: collection.blockedScopes.slice(0, 2).map((s) => ({ url: `${collection.path}?scope=${s}` })),
    pricing: { url: "/pricing" },
    ...(pricing.model === "metered" && {
      overCeiling: { url: collection.path, param: pricing.spendParam },
    }),
  };
}
