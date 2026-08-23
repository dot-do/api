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
 *   - axp-ext/rates-g2@0.1.0 (the ratified generator extension, see
 *     spec/extensions/rates-g2.md): the canonical camelCase-verb operationId
 *     unified across route/MCP/suite/SDK/rate-key (§1), the top-level
 *     `rates[]` rate card in the Pricing Document (§2), the card's
 *     `links.verify` member (§3), and the top-level `g2` card object (§4) —
 *     all additive, all presence-when-true, all fail-closed here.
 */

const HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+$/i;
const PATHNAME = /^\/[^\s?#]*$/;

/* axp-ext/rates-g2@0.1.0 §1 — the canonical operation name: camelCase VERB
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

  /* ── the operation rate card (axp-ext/rates-g2@0.1.0 §2) ──────────────────
     `rates` is a TOP-LEVEL array of the Pricing Document (the ruled placement
     — never nested under an offer): one row per priced operation, keyed by
     the canonical operationId (§1). Optional on either model; declared, it is
     judged strictly: every row names an operation the SAME manifest actually
     declares (checked below, after routes/mcp are normalized), carries a
     numeric price >= 0, and a free surface may only publish zero rates —
     a positive rate contradicts model:"free". Extra row members pass through
     verbatim (the offers precedent) while the dispatched pricing-model survey
     refines the row vocabulary. */
  let rates;
  if (p.rates !== undefined) {
    if (!Array.isArray(p.rates) || p.rates.length === 0) fail("pricing.rates must be a NON-EMPTY array of rate rows (axp-ext/rates-g2 §2) — or absent");
    rates = Object.freeze(
      p.rates.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) fail("every pricing.rates row is an object { operation, price, ... } (axp-ext/rates-g2 §2)");
        assertOperationId(row.operation, "pricing.rates[].operation");
        if (!(typeof row.price === "number" && Number.isFinite(row.price) && row.price >= 0)) {
          fail(`pricing.rates row ${JSON.stringify(row.operation)} needs price: a finite number >= 0 — a rate row that names no price is not a rate (axp-ext/rates-g2 §2)`);
        }
        if (row.unit !== undefined && typeof row.unit !== "string") fail(`pricing.rates row ${JSON.stringify(row.operation)}: unit must be a string`);
        if (row.note !== undefined && typeof row.note !== "string") fail(`pricing.rates row ${JSON.stringify(row.operation)}: note must be a string`);
        if (row.freeQuota !== undefined && !(typeof row.freeQuota === "number" && Number.isFinite(row.freeQuota) && row.freeQuota > 0)) {
          fail(`pricing.rates row ${JSON.stringify(row.operation)}: freeQuota must be a number strictly > 0 — a zero quota is the row without it`);
        }
        if (p.model === "free" && (row.price > 0 || row.freeQuota !== undefined)) {
          fail(
            `pricing.rates row ${JSON.stringify(row.operation)}: a free surface publishes only zero rates and no freeQuota — a positive or quota-bounded rate contradicts model:"free" (declare model:"metered" or zero the row)`,
          );
        }
        return Object.freeze({ ...row });
      }),
    );
    const seen = new Set();
    for (const row of rates) {
      if (seen.has(row.operation)) fail(`pricing.rates keys on operationId and ${JSON.stringify(row.operation)} appears twice — one operation, one rate row`);
      seen.add(row.operation);
    }
  }

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

  // ── links.verify (axp-ext/rates-g2@0.1.0 §3 — presence-when-true) ─────────
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

  // ── g2 (axp-ext/rates-g2@0.1.0 §4 — presence-when-true) ──────────────────
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

  // ── the one-identifier cross-checks (axp-ext/rates-g2@0.1.0 §1/§2) ───────
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
  if (rates !== undefined) {
    /* Every rate row keys on an operation this SAME manifest declares — a
       contract operationId or an MCP tool name (the same identifier space by
       §1). A rate for an operation nobody can find is a machine-readable
       claim about a ghost door; presence-when-true applies to rates. */
    const nameable = new Set([...contractOperationIds, ...(mcp !== undefined && Array.isArray(mcp.tools) ? mcp.tools : [])]);
    for (const row of rates) {
      if (!nameable.has(row.operation)) {
        fail(
          `pricing.rates row ${JSON.stringify(row.operation)} names an operation this manifest does not declare — ` +
            `rates[] keys on the canonical operationId (give the route an operationId, or drop the row); declared: ${[...nameable].sort().join(", ")}`,
        );
      }
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
