# GENERATION.md — the catalog-driven tool-generation loop

**Status of this document:** written 2026-08-24 after the first generation wave
(gen-1: 6 → 31 tools, branch `draft/api-ht-gen-1`). It records what the loop
actually was for 25 tools, and what it needs to run from 25 to thousands.

## What gen-1 proved

- **The template holds.** All 25 new tools are single `HypertextTool` objects
  (60–110 lines each). None required framework changes: routing, landings,
  JSON envelope, HTML/JSON content negotiation, and path-vs-subdomain link
  modes came free from `hypertext.ts` + `registry.ts` + `links.ts`.
- **Free data sources are the binding constraint, and they exist in tiers:**
  - *Live, keyless, generous:* Open-Meteo geocoding, Zippopotam, Frankfurter
    (ECB), Nager.Date, Open Library, npm registry, Cloudflare DoH,
    cve.circl.lu, maclookup.app, Cert Spotter. All verified reachable and
    correct in-session before wiring.
  - *Live but rate-limited:* GitHub REST (60/hr unauthenticated), Cert Spotter
    and maclookup (per-IP throttles). Tools surface a 502 with a retry note.
  - *Dead or unusable:* crt.sh (502s), restcountries (v3.1 deprecated mid-2026,
    v5 undocumented). Both were caught by the pre-wire probe, not in
    production. **Probe before you wire — catalogs rot.**
  - *Vendored standards:* where the set is small and stable (ISO 3166/639/4217
    subsets, RFC 9110 statuses, IANA media types, CSS colors, Unicode emoji,
    unit definitions, tz via runtime ICU), static data beats a flaky upstream.
    Subsets are labeled as subsets in every `source` field.
- **Cross-links are the product.** Every wave must land links *into* the
  existing graph (mac→entity, npm→github→dns, email→dns/whois, geo→country→
  currency/lang/tz/holidays), or the result is 31 isolated endpoints instead
  of one browsable surface. `country` became the reference-graph hub the same
  way `entity` is the network-graph hub.

## The loop, as actually run (one wave)

1. **Select** from the capability register
   (`studio/data/directory/capabilities.json` + the curated 129): filter to
   lookups whose value fits in a URL path and whose data source is free.
2. **Probe** each candidate source live (curl the exact endpoint, check the
   response shape and status). Kill or substitute failures *now*.
3. **Author** one `HypertextTool` per source from the template: validate the
   value → fetch or compute → map every entity-referencing value to an
   absolute URL → label anything demo/heuristic/subset in `source`/`note`.
4. **Register** in `src/tools/index.ts` (one import + one line).
5. **Test** three layers: offline unit tests for parsers/math, faked-fetch
   integration tests for envelopes and links, and a live smoke script hitting
   real upstreams once per wave (not in CI).
6. **Gate**: full suite + typecheck + the catalog-integrity test (every tool
   serves a descriptor; every example link resolves on the right host).

Cost of gen-1: ~25 tools in one session, zero framework changes, 72 tests.

## What the loop needs to go from 25 to thousands

**1. A machine-readable catalog with source contracts.**
The capability register names capabilities; it does not name *data sources*.
The unit of generation is actually the source, not the capability. Needed: a
`catalog.json` per candidate with `{ tool, valueSyntax, source: { url-template,
auth: none, rate-limit, response-shape sample }, crossLinks: [tool→field] }`.
Selection then becomes a query; today it is judgment.

**2. An automated source-prober.**
Two of fourteen intended sources were dead on arrival (crt.sh, restcountries).
At thousands-scale this is a nightly job: run every tool's example values
against its live upstream, diff response shapes, flag drift. The `examples`
array on each tool is already the probe corpus — the harness just needs to
exist (`vitest --project live` or a scheduled worker).

**3. A test harness that is generated with the tool.**
Gen-1 tests were hand-written (~15 lines/tool). The pattern is now fully
mechanical: one faked-fetch fixture from the probe's captured response + three
assertions (valid value → 200 with absolute links; invalid value → 400;
upstream down → 502). The generator should emit the fixture from the probe
capture, so tests and reality cannot diverge at authoring time.

**4. A review gate that checks the grammar, not the code.**
What actually matters per tool is checkable mechanically:
- every `data` field that names another entity is an absolute URL built via
  `ctx.links` (grep for bare `api.ht` strings = fail);
- `source` says live/offline and names the upstream; subsets/heuristics/demo
  say so in-band (`note`/`source`), not in comments;
- no secrets, no non-free endpoints, no auth headers;
- value regex rejects garbage before any fetch;
- upstream failure maps to `upstreamError`, never a throw.
Human review then only reads the *interesting* 10 lines per tool (the mapping),
which is what keeps thousands reviewable.

**5. Rate-limit and cache strategy at the edge.**
Free upstreams stay free only if we are polite. Before the next order of
magnitude: Cloudflare cache API on upstream responses (respecting per-source
TTLs — ECB rates daily, DNS by TTL, CVE records hours), and per-upstream
concurrency caps. This is framework work (one place, `runLookup`), not
per-tool work.

**6. Registry sharding.**
`index.ts` with 31 imports is fine; with 3,000 it is not a file a human edits.
The natural shard is the category comment blocks already in `index.ts`
(network / world / developer / content) → per-category barrel files, plus a
generated manifest. The `HypertextTool` interface itself needs nothing.

**7. Subdomain provisioning.**
Every tool is a `{tool}.api.ht` host. The worker route (`*.api.ht/*`) already
covers all subdomains, so DNS is the only per-tool operation — a wildcard
record covers it. Verify wildcard is in place before the next wave ships
(gen-1 requires no deploy; this is a go-live checklist item, not code).

## Deploy (NOT run — for the operator)

```sh
cd examples/api.ht && npx wrangler deploy   # estate .do account, existing api.ht zone routes
```

Gen-1 is dev-complete on `draft/api-ht-gen-1`; nothing in this wave has been
deployed.
