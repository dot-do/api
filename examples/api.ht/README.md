# api.ht — the hypertext API surface

**Every response is JSON. Every value is a link.**

```
[tool].api.ht/[value]
```

The path is the query. `ip.api.ht/1.1.1.1` returns IP details whose ASN field
**is** `https://asn.api.ht/13335`, whose owning-company field **is**
`https://entity.api.ht/cloudflare`. Browser JSON viewers make those clickable;
curl and agents get byte-identical output. Hypermedia both ways — there is no
HTML branch on data routes.

Discovery works **without a central directory**: you navigate the graph by
following the links in responses, not by browsing a catalog. (The
centralized-catalog job belongs to data.mt/api.mt, not this property.) The
only HTML in the property is the apex landing, each tool root, `/docs`, and
the `/callback` key page — each of which links straight into live JSON views.

## Tools (v1)

| Tool | Value | Source |
|------|-------|--------|
| `ip` | IPv4/IPv6 | RIPEstat prefix-overview + Cloudflare DoH PTR (live) |
| `dns` | hostname (`?type=MX` optional) | Cloudflare DNS over HTTPS (live) |
| `whois` | domain | RDAP via rdap.org bootstrap (live) |
| `phone` | phone number (vanity letters OK) | offline dataset (**DEMO** — labeled) |
| `asn` | ASN (`13335` or `AS13335`) | RIPEstat as-overview (live) |
| `entity` | slug (`cloudflare`, `united-states`) | Wikipedia REST (live) — entity stub (**DEMO** — labeled) |

`asn` and `entity` are the entity-link layer: `ip → asn → entity → dns →
whois → dns → ip` is a closed browsable loop. Anything mocked or heuristic
says so in its `source` field.

## The graph

```
ip.api.ht/1.1.1.1 ──asn──▶ asn.api.ht/13335 ──organization──▶ entity.api.ht/cloudflare
        │                                                          │
     hostname                                                 dns / whois
        ▼                                                          ▼
dns.api.ht/one.one.one.one     whois.api.ht/cloudflare.com ◀──▶ dns.api.ht/cloudflare.com
                                                                   │ A records
phone.api.ht/800-234-2342 ──country──▶ entity.api.ht/united-states ▼
                                                            ip.api.ht/104.16.132.229 …
```

## Envelope

The standard `@dotdo/api` envelope (carried forward from the drivly apis.do
hypermedia pattern), with the hypertext rule applied to `data`:

```json
{
  "api":   { "name": "api.ht", "version": "0.1.0", "...": "..." },
  "links": { "self": "https://ip.api.ht/1.1.1.1", "asn": "https://asn.api.ht/13335", "...": "..." },
  "data":  { "asn": "https://asn.api.ht/13335", "organization": "https://entity.api.ht/cloudflare", "...": "..." }
}
```

Prior art carried forward: `hyper-texts/dbht` + `apis-dev/db.ht` (2022-23)
established `https://{domain}/{key}` — path-is-the-query, optional bearer
token, JSON always. db.ht applied the same clickable-graph idea to a
database; api.ht applies it to lookup tools.

## Run locally

```bash
# from the repo root
pnpm install

cd examples/api.ht
npx tsx build.ts        # bundles worker.ts → _worker.js
npx wrangler dev        # serves on http://localhost:8787
```

Then click around:

```bash
curl http://localhost:8787/ip/1.1.1.1
curl http://localhost:8787/dns/startups.studio
curl http://localhost:8787/whois/cloudflare.com
curl "http://localhost:8787/phone/1-800-GOT-JUNK"
open http://localhost:8787/            # HTML landing → live JSON links
```

On any host that isn't the `api.ht` zone, links are emitted in **path mode**
(`http://localhost:8787/asn/13335`) so they stay clickable in dev. On the
zone itself they become subdomain links (`https://asn.api.ht/13335`). Same
worker, both grammars.

Tests: `npx vitest run tests/api-ht.test.ts` (from the repo root — upstreams
faked via the injectable fetch).

## Auth (flow wired, OAuth stubbed)

`/login` → GitHub OAuth → `/callback` → free-tier API key on screen. Without
`GITHUB_CLIENT_ID` configured, `/login` short-circuits to `/callback` in
labeled demo mode; keys are random, unpersisted, and not yet enforced
(anonymous use is free).

## Deployment status (2026-08-23)

**Deployed.** The `api.ht` zone is ACTIVE on the estate .do Cloudflare
account and the `api-ht` worker is attached to `api.ht/*` and `*.api.ht/*`
(see `routes` in `wrangler.jsonc`). Redeploy: `npx tsx build.ts && npx
wrangler deploy` from this directory.

## Expanding to hundreds of tools

A tool is one `HypertextTool` object (see `src/registry.ts`) — name,
description, examples, `source` label, and a `lookup(value, ctx)` that
returns data with `ctx.links.href(tool, value)` URLs. Register it in
`src/tools/index.ts` and the subdomain, landing, JSON descriptor, envelope,
and cross-links all come from the framework. ~100 lines per tool wrapping a
data source.

**Generation 1 (2026-08-24) ran this loop from 6 to 31 tools** — live free
sources (`geo`, `zip`, `currency`, `holidays`, `isbn`, `npm`, `github`,
`ssl`, `mac`, `cve`, `email`, `rss`) plus vendored-standard offline tools
(`country`, `tz`, `lang`, `units`, `color`, `http`, `mime`, `cron`, `jwt`,
`ipcalc`, `punycode`, `emoji`, `useragent`). See `GENERATION.md` for the
loop itself and what it needs to reach thousands. Next candidates: `vin`,
`barcode`, `tld`, `unicode`, `naics`, `cusip`, `lei`, …
