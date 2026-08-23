/**
 * Tests for the api.ht example — the hypertext API surface.
 * Upstream sources (DoH, RIPEstat, RDAP, Wikipedia) are faked via the
 * injectable fetch; link-grammar and phone parsing are fully offline.
 */

import { describe, it, expect } from 'vitest'
import { apiHt } from '../examples/api.ht/src/app'
import { resolveLinkContext, encodeValue } from '../examples/api.ht/src/links'
import { normalizePhone } from '../examples/api.ht/src/tools/phone'
import { ipv6PtrName, ipv4PtrName } from '../examples/api.ht/src/tools/ip'
import { registrableDomain, asnToEntitySlug } from '../examples/api.ht/src/data/known'

// ---------------------------------------------------------------------------
// Upstream fixtures
// ---------------------------------------------------------------------------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const fakeFetch = (async (input: RequestInfo | URL) => {
  const url = String(input)

  // RIPEstat
  if (url.includes('prefix-overview')) {
    return json({ data: { resource: '1.1.1.0/24', announced: true, asns: [{ asn: 13335, holder: 'CLOUDFLARENET - Cloudflare, Inc.' }] } })
  }
  if (url.includes('as-overview')) {
    return json({ data: { holder: 'CLOUDFLARENET - Cloudflare, Inc.', announced: true, type: 'lir', resource: '13335' } })
  }

  // Cloudflare DoH
  if (url.includes('dns-query')) {
    const u = new URL(url)
    const type = u.searchParams.get('type')
    const name = u.searchParams.get('name') ?? ''
    if (type === 'PTR' && name.includes('in-addr.arpa')) {
      return json({ Answer: [{ name, type: 12, TTL: 1, data: 'one.one.one.one.' }] })
    }
    if (type === 'A' && name === 'example.com') {
      return json({ Answer: [{ name, type: 1, TTL: 60, data: '93.184.215.14' }] })
    }
    if (type === 'NS' && name === 'example.com') {
      return json({ Answer: [{ name, type: 2, TTL: 60, data: 'a.iana-servers.net.' }] })
    }
    return json({ Answer: [] })
  }

  // RDAP
  if (url.includes('rdap.org/domain/cloudflare.com')) {
    return json({
      ldhName: 'CLOUDFLARE.COM',
      handle: '1542998887_DOMAIN_COM-VRSN',
      status: ['client transfer prohibited'],
      events: [
        { eventAction: 'registration', eventDate: '2009-02-17T22:07:54Z' },
        { eventAction: 'expiration', eventDate: '2027-02-17T22:07:54Z' },
        { eventAction: 'last changed', eventDate: '2026-01-09T00:45:04Z' },
      ],
      nameservers: [{ ldhName: 'NS3.CLOUDFLARE.COM' }, { ldhName: 'NS4.CLOUDFLARE.COM' }],
      secureDNS: { delegationSigned: true },
      entities: [
        {
          roles: ['registrar'],
          vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'Cloudflare, Inc.']]],
          publicIds: [{ type: 'IANA Registrar ID', identifier: '1910' }],
        },
      ],
    })
  }
  if (url.includes('rdap.org/domain/')) return json({ errorCode: 404 }, 404)

  // Wikipedia
  if (url.includes('wikipedia.org/api/rest_v1/page/summary/Cloudflare')) {
    return json({
      title: 'Cloudflare',
      description: 'American technology company',
      extract: 'Cloudflare, Inc. is an American company that provides content delivery network services.',
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Cloudflare' } },
    })
  }
  if (url.includes('wikipedia.org')) return json({ type: 'not_found' }, 404)

  return json({ error: `unexpected fetch: ${url}` }, 500)
}) as typeof fetch

const app = apiHt({ fetch: fakeFetch })

const getJson = async (url: string) => {
  const res = await app.request(url, { headers: { accept: 'application/json' } })
  return { res, body: (await res.json()) as any }
}

// ---------------------------------------------------------------------------
// Link grammar
// ---------------------------------------------------------------------------

describe('link grammar', () => {
  it('builds subdomain links on the api.ht zone', () => {
    const ctx = resolveLinkContext('https://ip.api.ht/1.1.1.1')
    expect(ctx.mode).toBe('subdomain')
    expect(ctx.tool).toBe('ip')
    expect(ctx.href('asn', '13335')).toBe('https://asn.api.ht/13335')
    expect(ctx.href('dns')).toBe('https://dns.api.ht/')
    expect(ctx.apex('/docs')).toBe('https://api.ht/docs')
  })

  it('builds path-mode links on other hosts (local dev)', () => {
    const ctx = resolveLinkContext('http://localhost:8787/ip/1.1.1.1')
    expect(ctx.mode).toBe('path')
    expect(ctx.tool).toBeUndefined()
    expect(ctx.href('asn', '13335')).toBe('http://localhost:8787/asn/13335')
    expect(ctx.apex('/docs')).toBe('http://localhost:8787/docs')
  })

  it('keeps ip/phone characters readable in path values', () => {
    expect(encodeValue('2606:4700:4700::1111')).toBe('2606:4700:4700::1111')
    expect(encodeValue('+18002342342')).toBe('+18002342342')
    expect(encodeValue('a b')).toBe('a%20b')
  })
})

// ---------------------------------------------------------------------------
// Offline helpers
// ---------------------------------------------------------------------------

describe('offline helpers', () => {
  it('normalizes vanity phone numbers', () => {
    expect(normalizePhone('1-800-GOT-JUNK')?.digits).toBe('18004685865')
    expect(normalizePhone('not a phone @@@')).toBeNull()
  })

  it('builds PTR zone names', () => {
    expect(ipv4PtrName('1.1.1.1')).toBe('1.1.1.1.in-addr.arpa')
    expect(ipv6PtrName('2606:4700:4700::1111')).toBe(
      '1.1.1.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.7.4.0.0.7.4.6.0.6.2.ip6.arpa',
    )
  })

  it('extracts registrable domains (with multi-part suffix heuristic)', () => {
    expect(registrableDomain('one.one.one.one')).toBe('one.one')
    expect(registrableDomain('www.example.co.uk')).toBe('example.co.uk')
  })

  it('maps ASN holders to entity slugs', () => {
    expect(asnToEntitySlug(13335, 'CLOUDFLARENET - Cloudflare, Inc.')).toBe('cloudflare')
    expect(asnToEntitySlug(64512, 'EXAMPLENET - Example Networks, Inc.')).toBe('example-networks')
  })
})

// ---------------------------------------------------------------------------
// Tools (through the full app, subdomain + path modes)
// ---------------------------------------------------------------------------

describe('ip.api.ht', () => {
  it('returns every entity value as an absolute URL', async () => {
    const { res, body } = await getJson('https://ip.api.ht/1.1.1.1')
    expect(res.status).toBe(200)
    expect(body.api.name).toBe('api.ht')
    expect(body.links.self).toContain('ip.api.ht/1.1.1.1')
    expect(body.data.asn).toBe('https://asn.api.ht/13335')
    expect(body.data.organization).toBe('https://entity.api.ht/cloudflare')
    expect(body.data.hostname).toBe('https://dns.api.ht/one.one.one.one')
    expect(body.data.prefix).toBe('1.1.1.0/24')
  })

  it('rejects invalid addresses', async () => {
    const { res, body } = await getJson('https://ip.api.ht/999.999.1.1')
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_VALUE')
  })
})

describe('dns.api.ht', () => {
  it('links answers into ip/whois views (path mode)', async () => {
    const { res, body } = await getJson('http://localhost:8787/dns/example.com?type=A')
    expect(res.status).toBe(200)
    expect(body.data.records.A[0]).toBe('http://localhost:8787/ip/93.184.215.14')
    expect(body.data.registrableDomain).toBe('http://localhost:8787/whois/example.com')
  })

  it('links NS answers back into dns views (subdomain mode)', async () => {
    const { body } = await getJson('https://dns.api.ht/example.com?type=NS')
    expect(body.data.records.NS[0]).toBe('https://dns.api.ht/a.iana-servers.net')
  })
})

describe('whois.api.ht', () => {
  it('parses RDAP and cross-links nameservers + registrar', async () => {
    const { res, body } = await getJson('https://whois.api.ht/cloudflare.com')
    expect(res.status).toBe(200)
    expect(body.data.registrar).toBe('Cloudflare, Inc.')
    expect(body.data.registrarEntity).toBe('https://entity.api.ht/cloudflare')
    expect(body.data.nameservers).toContain('https://dns.api.ht/ns3.cloudflare.com')
    expect(body.data.registered).toBe('2009-02-17T22:07:54Z')
    expect(body.data.dnssec).toBe(true)
  })

  it('404s for unregistered domains', async () => {
    const { res } = await getJson('https://whois.api.ht/definitely-not-registered-zz.com')
    expect(res.status).toBe(404)
  })
})

describe('phone.api.ht (offline, labeled demo)', () => {
  it('classifies toll-free NANP numbers', async () => {
    const { body } = await getJson('https://phone.api.ht/800-234-2342')
    expect(body.data.e164).toBe('+18002342342')
    expect(body.data.tollFree).toBe(true)
    expect(body.data.type).toBe('toll-free')
    expect(body.data.country).toBe('https://entity.api.ht/united-states')
    expect(body.data.source).toContain('DEMO')
  })

  it('resolves vanity letters and geographic area codes', async () => {
    const { body } = await getJson('https://phone.api.ht/1-800-GOT-JUNK')
    expect(body.data.e164).toBe('+18004685865')
    const sf = await getJson('https://phone.api.ht/+14155552671')
    expect(sf.body.data.region).toBe('San Francisco, CA')
  })

  it('handles non-NANP country codes', async () => {
    const { body } = await getJson('https://phone.api.ht/+442079460958')
    expect(body.data.countryIso).toBe('GB')
    expect(body.data.country).toBe('https://entity.api.ht/united-kingdom')
  })
})

describe('asn.api.ht + entity.api.ht', () => {
  it('links an ASN to its organization entity', async () => {
    const { body } = await getJson('https://asn.api.ht/AS13335')
    expect(body.data.asn).toBe('AS13335')
    expect(body.data.holder).toContain('Cloudflare')
    expect(body.data.organization).toBe('https://entity.api.ht/cloudflare')
  })

  it('serves Wikipedia-backed entity stubs with cross-links', async () => {
    const { body } = await getJson('https://entity.api.ht/cloudflare')
    expect(body.data.wikipedia).toBe('https://en.wikipedia.org/wiki/Cloudflare')
    expect(body.data.dns).toBe('https://dns.api.ht/cloudflare.com')
    expect(body.data.whois).toBe('https://whois.api.ht/cloudflare.com')
    expect(body.data.source).toContain('DEMO')
  })
})

// ---------------------------------------------------------------------------
// Landings, docs, auth flow
// ---------------------------------------------------------------------------

describe('landings and discovery', () => {
  it('apex root JSON lists tools with example links (no catalog beyond this)', async () => {
    const { body } = await getJson('https://api.ht/')
    expect(body.data.grammar).toBe('[tool].api.ht/[value]')
    expect(body.data.tools.ip.example).toBe('https://ip.api.ht/1.1.1.1')
    expect(body.data.tools.dns.home).toBe('https://dns.api.ht/')
  })

  it('apex root serves HTML to browsers with a GitHub sign-in', async () => {
    const res = await app.request('https://api.ht/', { headers: { accept: 'text/html' } })
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('Sign in with GitHub')
    expect(html).toContain('https://ip.api.ht/1.1.1.1')
  })

  it('tool roots serve a JSON descriptor to agents', async () => {
    const { body } = await getJson('https://ip.api.ht/')
    expect(body.data.tool).toBe('ip')
    expect(body.data.examples['1.1.1.1']).toBe('https://ip.api.ht/1.1.1.1')
  })

  it('unknown tools 404 with links to real ones', async () => {
    const { res, body } = await getJson('https://bogus.api.ht/x')
    expect(res.status).toBe(404)
    expect(body.error.code).toBe('UNKNOWN_TOOL')
    expect(body.links.ip).toBe('https://ip.api.ht/')
  })
})

describe('auth flow (stubbed)', () => {
  it('redirects /login to the callback in demo mode', async () => {
    const res = await app.request('https://api.ht/login')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('https://api.ht/callback?demo=1')
  })

  it('issues a labeled demo key at /callback', async () => {
    const { body } = await getJson('https://api.ht/callback?demo=1')
    expect(body.data.apiKey).toMatch(/^ht_demo_[0-9a-f]{32}$/)
    expect(body.data.tier).toBe('free')
    expect(body.data.note).toContain('DEMO')
  })
})
