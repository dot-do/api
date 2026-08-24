/**
 * Tests for the api.ht generation-1 tool wave (25 tools added to the v1 six).
 * Live upstreams (Open-Meteo, Zippopotam, Frankfurter, Nager.Date, Open
 * Library, npm, GitHub, Cert Spotter, maclookup, CIRCL, DoH, feeds) are faked
 * via the injectable fetch; offline tools run with no fetch at all.
 */

import { describe, it, expect } from 'vitest'
import { apiHt } from '../examples/api.ht/src/app'
import { validateIsbn } from '../examples/api.ht/src/tools/isbn'
import { parseGithubRepo } from '../examples/api.ht/src/tools/npm'
import { normalizeMac } from '../examples/api.ht/src/tools/mac'
import { parseColor, rgbToHsl } from '../examples/api.ht/src/tools/color'
import { ipv4ToInt, intToIpv4 } from '../examples/api.ht/src/tools/ipcalc'
import { punycodeDecode } from '../examples/api.ht/src/tools/punycode'
import { parseField } from '../examples/api.ht/src/tools/cron'
import { zoneOffsetMinutes } from '../examples/api.ht/src/tools/tz'
import { b64urlDecode } from '../examples/api.ht/src/tools/jwt'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const RSS_XML = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test Feed</title>
<item><title>First &amp; foremost</title><link>https://example.com/1</link><pubDate>Mon, 24 Aug 2026 00:00:00 GMT</pubDate></item>
<item><title><![CDATA[Second post]]></title><link>https://example.com/2</link></item>
</channel></rss>`

const fakeFetch = (async (input: RequestInfo | URL) => {
  const url = String(input)

  if (url.includes('geocoding-api.open-meteo.com')) {
    return json({ results: [{ name: 'Austin', latitude: 30.26715, longitude: -97.74306, elevation: 149, country_code: 'US', country: 'United States', admin1: 'Texas', timezone: 'America/Chicago', population: 931830, postcodes: ['78701'] }] })
  }
  if (url.includes('api.zippopotam.us/us/90210')) {
    return json({ 'post code': '90210', country: 'United States', 'country abbreviation': 'US', places: [{ 'place name': 'Beverly Hills', state: 'California', 'state abbreviation': 'CA', latitude: '34.0901', longitude: '-118.4065' }] })
  }
  if (url.includes('api.frankfurter.dev')) {
    return json({ base: 'USD', date: '2026-08-21', rates: { EUR: 0.85 } })
  }
  if (url.includes('date.nager.at')) {
    return json([{ date: '2026-07-04', localName: 'Independence Day', name: 'Independence Day', countryCode: 'US', global: true, types: ['Public'] }])
  }
  if (url.includes('openlibrary.org/isbn/9780140328721')) {
    return json({ title: 'Fantastic Mr Fox', publish_date: 'October 1, 1988', number_of_pages: 96, publishers: ['Puffin'], key: '/books/OL7353617M', works: [{ key: '/works/OL45804W' }] })
  }
  if (url.includes('registry.npmjs.org/hono/latest')) {
    return json({ name: 'hono', version: '4.6.0', description: 'Web framework', license: 'MIT', homepage: 'https://hono.dev', repository: { url: 'git+https://github.com/honojs/hono.git' }, dependencies: {}, dist: { unpackedSize: 1000000 } })
  }
  if (url.includes('api.github.com/repos/honojs/hono')) {
    return json({ full_name: 'honojs/hono', description: 'Web framework built on Web Standards', homepage: 'https://hono.dev', language: 'TypeScript', license: { spdx_id: 'MIT' }, stargazers_count: 20000, forks_count: 600, open_issues_count: 50, default_branch: 'main', archived: false, created_at: '2021-12-01T00:00:00Z', pushed_at: '2026-08-20T00:00:00Z', topics: ['web'], owner: { login: 'honojs', type: 'Organization' }, html_url: 'https://github.com/honojs/hono' })
  }
  if (url.includes('api.certspotter.com')) {
    return json([{ id: '1', tbs_sha256: 'abc', dns_names: ['example.com', 'www.example.com'], not_before: '2026-01-01T00:00:00Z', not_after: '2027-01-01T00:00:00Z', issuer: { friendly_name: "Let's Encrypt" } }])
  }
  if (url.includes('api.maclookup.app')) {
    return json({ success: true, found: true, macPrefix: '44:38:39', company: 'Cumulus Networks, Inc', country: 'US', blockType: 'MA-L' })
  }
  if (url.includes('cve.circl.lu/api/cve/CVE-2021-44228')) {
    return json({
      cveMetadata: { cveId: 'CVE-2021-44228', state: 'PUBLISHED', datePublished: '2021-12-10T00:00:00Z', assignerShortName: 'apache' },
      containers: { cna: {
        title: 'Log4j2 JNDI RCE',
        descriptions: [{ lang: 'en', value: 'Apache Log4j2 JNDI features do not protect against attacker controlled LDAP.' }],
        affected: [{ vendor: 'Apache Software Foundation', product: 'Apache Log4j2' }],
        metrics: [{ cvssV3_1: { baseScore: 10, baseSeverity: 'CRITICAL', vectorString: 'CVSS:3.1/AV:N' } }],
        references: [{ url: 'https://logging.apache.org/log4j/2.x/security.html' }],
      } },
    })
  }
  if (url.includes('dns-query') && url.includes('type=MX')) {
    const name = new URL(url).searchParams.get('name')
    if (name === 'cloudflare.com') {
      return json({ Answer: [
        { name: 'cloudflare.com', type: 15, TTL: 300, data: '10 mailstream-east.mxrecord.io.' },
        { name: 'cloudflare.com', type: 15, TTL: 300, data: '5 mailstream-central.mxrecord.mx.' },
      ] })
    }
    return json({ Answer: [] })
  }
  if (url === 'https://feed.example.com/rss') {
    return new Response(RSS_XML, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  }

  return json({ error: `unexpected fetch: ${url}` }, 500)
}) as typeof fetch

const app = apiHt({ fetch: fakeFetch })

const getJson = async (url: string) => {
  const res = await app.request(url, { headers: { accept: 'application/json' } })
  return { res, body: (await res.json()) as any }
}

// ---------------------------------------------------------------------------
// Live-source tools (faked upstreams)
// ---------------------------------------------------------------------------

describe('geo.api.ht', () => {
  it('geocodes a place and cross-links country/tz/zip', async () => {
    const { body } = await getJson('https://geo.api.ht/austin')
    expect(body.data.place).toBe('Austin')
    expect(body.data.country).toBe('https://country.api.ht/us')
    expect(body.data.timezone).toBe('https://tz.api.ht/America%2FChicago')
    expect(body.data.postcode).toBe('https://zip.api.ht/us%2F78701')
  })
})

describe('zip.api.ht', () => {
  it('defaults bare codes to US and links places into geo', async () => {
    const { body } = await getJson('https://zip.api.ht/90210')
    expect(body.data.postalCode).toBe('90210')
    expect(body.data.places[0].place).toBe('https://geo.api.ht/beverly%20hills')
    expect(body.data.country).toBe('https://country.api.ht/us')
  })
})

describe('currency.api.ht', () => {
  it('serves a pair with rate and cross-links using countries', async () => {
    const { body } = await getJson('https://currency.api.ht/USD/EUR')
    expect(body.data.rates.EUR.rate).toBe(0.85)
    expect(body.data.usedBy).toContain('https://country.api.ht/us')
  })
  it('rejects non-ISO codes', async () => {
    const { res } = await getJson('https://currency.api.ht/DOLLARS')
    expect(res.status).toBe(400)
  })
})

describe('holidays.api.ht', () => {
  it('lists holidays for a country/year', async () => {
    const { body } = await getJson('https://holidays.api.ht/us/2026')
    expect(body.data.holidays[0].name).toBe('Independence Day')
    expect(body.links.nextYear).toBe('https://holidays.api.ht/us%2F2027')
  })
})

describe('isbn.api.ht', () => {
  it('validates checksums offline', () => {
    expect(validateIsbn('978-0-14-032872-1')?.kind).toBe('ISBN-13')
    expect(validateIsbn('0140328726')?.kind).toBe('ISBN-10')
    expect(validateIsbn('9780140328722')).toBeNull() // bad check digit
  })
  it('serves book metadata', async () => {
    const { body } = await getJson('https://isbn.api.ht/9780140328721')
    expect(body.data.title).toBe('Fantastic Mr Fox')
    expect(body.data.checksum).toBe('valid')
  })
})

describe('npm.api.ht + github.api.ht', () => {
  it('parses github repos out of repository URLs', () => {
    expect(parseGithubRepo('git+https://github.com/honojs/hono.git')).toBe('honojs/hono')
    expect(parseGithubRepo('https://gitlab.com/x/y')).toBeUndefined()
  })
  it('links an npm package to its github repo', async () => {
    const { body } = await getJson('https://npm.api.ht/hono')
    expect(body.data.version).toBe('4.6.0')
    expect(body.data.repository).toBe('https://github.api.ht/honojs%2Fhono')
    expect(body.data.homepageDns).toBe('https://dns.api.ht/hono.dev')
  })
  it('serves repo metadata with homepage dns link', async () => {
    const { body } = await getJson('https://github.api.ht/honojs/hono')
    expect(body.data.stars).toBe(20000)
    expect(body.data.homepageDns).toBe('https://dns.api.ht/hono.dev')
  })
})

describe('ssl.api.ht', () => {
  it('serves CT-log certificates with dns cross-links', async () => {
    const { body } = await getJson('https://ssl.api.ht/example.com')
    expect(body.data.certificates[0].issuer).toBe("Let's Encrypt")
    expect(body.data.certificates[0].active).toBe(true)
    expect(body.data.certificates[0].dnsNames).toContain('https://dns.api.ht/example.com')
    expect(body.data.note).toMatch(/not a live TLS handshake/)
  })
})

describe('mac.api.ht', () => {
  it('normalizes any separator style', () => {
    expect(normalizeMac('F4.5C.89.12.34.56')).toBe('f4:5c:89:12:34:56')
    expect(normalizeMac('3c-22-fb')).toBe('3c:22:fb')
    expect(normalizeMac('zz')).toBeNull()
  })
  it('serves vendor + bit decode', async () => {
    const { body } = await getJson('https://mac.api.ht/44:38:39:ff:ef:57')
    expect(body.data.vendor).toBe('Cumulus Networks, Inc')
    expect(body.data.unicast).toBe(true)
    expect(body.data.organization).toBe('https://entity.api.ht/cumulus-networks')
  })
})

describe('cve.api.ht', () => {
  it('serves a v5 record with CVSS and entity links', async () => {
    const { body } = await getJson('https://cve.api.ht/CVE-2021-44228')
    expect(body.data.cvss.score).toBe(10)
    expect(body.data.affected[0].organization).toBe('https://entity.api.ht/apache-software-foundation')
  })
  it('rejects malformed ids', async () => {
    const { res } = await getJson('https://cve.api.ht/log4shell')
    expect(res.status).toBe(400)
  })
})

describe('email.api.ht', () => {
  it('validates syntax and finds MX (sorted by priority)', async () => {
    const { body } = await getJson('https://email.api.ht/hello@cloudflare.com')
    expect(body.data.syntaxValid).toBe(true)
    expect(body.data.mxFound).toBe(true)
    expect(body.data.mx[0].priority).toBe(5)
    expect(body.data.mx[0].exchange).toBe('https://dns.api.ht/mailstream-central.mxrecord.mx')
  })
  it('reports missing MX without failing', async () => {
    const { body } = await getJson('https://email.api.ht/nobody@no-mx-here.example')
    expect(body.data.syntaxValid).toBe(true)
    expect(body.data.mxFound).toBe(false)
  })
  it('rejects bad syntax', async () => {
    const { res } = await getJson('https://email.api.ht/not-an-email')
    expect(res.status).toBe(400)
  })
})

describe('rss.api.ht', () => {
  it('parses items and decodes entities/CDATA', async () => {
    const { body } = await getJson('https://rss.api.ht/https%3A%2F%2Ffeed.example.com%2Frss')
    expect(body.data.format).toBe('RSS')
    expect(body.data.items[0].title).toBe('First & foremost')
    expect(body.data.items[1].title).toBe('Second post')
    expect(body.links.dns).toBe('https://dns.api.ht/feed.example.com')
  })
  it('refuses non-https and localhost', async () => {
    expect((await getJson('https://rss.api.ht/http%3A%2F%2Ffeed.example.com%2Frss')).res.status).toBe(400)
    expect((await getJson('https://rss.api.ht/https%3A%2F%2Flocalhost%2Ffeed')).res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Offline tools (no fetch at all)
// ---------------------------------------------------------------------------

describe('country.api.ht (offline)', () => {
  it('resolves iso2, iso3, and slug forms with reference cross-links', async () => {
    const { body } = await getJson('https://country.api.ht/us')
    expect(body.data.name).toBe('United States')
    expect(body.data.flag).toBe('🇺🇸')
    expect(body.data.currency).toBe('https://currency.api.ht/USD')
    expect(body.data.holidays).toBe('https://holidays.api.ht/us')
    expect((await getJson('https://country.api.ht/united-kingdom')).body.data.country).toBe('GB')
    expect((await getJson('https://country.api.ht/jpn')).body.data.country).toBe('JP')
  })
  it('404s outside the vendored subset and says it is a subset', async () => {
    const { res, body } = await getJson('https://country.api.ht/xx')
    expect(res.status).toBe(404)
    expect(body.error.message).toMatch(/vendored country subset/)
  })
})

describe('tz.api.ht (offline, ICU)', () => {
  it('computes offsets from the runtime tz database', () => {
    expect(zoneOffsetMinutes('UTC', new Date())).toBe(0)
    expect(zoneOffsetMinutes('Asia/Tokyo', new Date())).toBe(540) // no DST
  })
  it('serves zone views with country cross-links', async () => {
    const { body } = await getJson('https://tz.api.ht/Asia/Tokyo')
    expect(body.data.utcOffset).toBe('UTC+09:00')
    expect(body.data.observesDst).toBe(false)
    expect(body.data.countries).toContain('https://country.api.ht/jp')
  })
  it('404s unknown zones', async () => {
    const { res } = await getJson('https://tz.api.ht/Mars/Olympus_Mons')
    expect(res.status).toBe(404)
  })
})

describe('units.api.ht (offline)', () => {
  it('converts with exact defined factors', async () => {
    const { body } = await getJson('https://units.api.ht/10km-to-mi')
    expect(body.data.to.amount).toBeCloseTo(6.21371, 4)
    const temp = await getJson('https://units.api.ht/72f-to-c')
    expect(temp.body.data.to.amount).toBeCloseTo(22.2222, 3)
  })
  it('refuses cross-dimension conversions', async () => {
    const { res, body } = await getJson('https://units.api.ht/10kg-to-mi')
    expect(res.status).toBe(400)
    expect(body.error.message).toMatch(/mass.*length/)
  })
})

describe('useragent.api.ht (offline, heuristic)', () => {
  it('parses a Chrome-on-mac UA', async () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    const { body } = await getJson(`https://useragent.api.ht/${encodeURIComponent(ua)}`)
    expect(body.data.browser).toBe('Chrome')
    expect(body.data.os).toBe('macOS')
    expect(body.data.deviceClass).toBe('desktop')
    expect(body.data.note).toMatch(/[Hh]euristic/)
  })
  it('flags bots', async () => {
    const { body } = await getJson(`https://useragent.api.ht/${encodeURIComponent('Mozilla/5.0 (compatible; Googlebot/2.1)')}`)
    expect(body.data.likelyBot).toBe(true)
  })
})

describe('lang.api.ht (offline)', () => {
  it('resolves codes and names with country cross-links', async () => {
    const { body } = await getJson('https://lang.api.ht/ja')
    expect(body.data.name).toBe('Japanese')
    expect(body.data.officialIn[0].country).toBe('https://country.api.ht/jp')
    expect((await getJson('https://lang.api.ht/spanish')).body.data.language).toBe('es')
  })
})

describe('color.api.ht (offline)', () => {
  it('parses hex, names, and rgb() and converts', () => {
    expect(parseColor('rebeccapurple')).toEqual({ r: 102, g: 51, b: 153 })
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
  })
  it('serves conversions and WCAG contrast', async () => {
    const { body } = await getJson('https://color.api.ht/ff6347')
    expect(body.data.cssName).toBe('tomato')
    expect(body.data.hsl.h).toBe(9)
    expect(body.data.contrast.onWhite).toBeGreaterThan(1)
  })
})

describe('http.api.ht (offline)', () => {
  it('serves the full registered set with class context', async () => {
    const { body } = await getJson('https://http.api.ht/418')
    expect(body.data.name).toBe("I'm a teapot")
    expect(body.data.rfc).toBe('RFC 2324')
    expect(body.data.sameClass['404']).toBe('https://http.api.ht/404')
  })
  it('404s unregistered codes in valid classes', async () => {
    expect((await getJson('https://http.api.ht/499')).res.status).toBe(404)
    expect((await getJson('https://http.api.ht/999')).res.status).toBe(400)
  })
})

describe('mime.api.ht (offline)', () => {
  it('maps both directions', async () => {
    const ext = await getJson('https://mime.api.ht/json')
    expect(ext.body.data.mediaType).toBe('https://mime.api.ht/application%2Fjson')
    const type = await getJson('https://mime.api.ht/application/json')
    expect(type.body.data.extensions[0].extension).toBe('.json')
  })
})

describe('cron.api.ht (offline)', () => {
  it('parses fields including steps, ranges, and names', () => {
    expect([...parseField('*/15', 0, 59)!]).toEqual([0, 15, 30, 45])
    expect([...parseField('1-5', 0, 7)!]).toEqual([1, 2, 3, 4, 5])
    expect(parseField('61', 0, 59)).toBeNull()
  })
  it('computes next UTC runs', async () => {
    const { body } = await getJson('https://cron.api.ht/0_9_*_*_1-5')
    expect(body.data.nextRunsUtc).toHaveLength(3)
    for (const run of body.data.nextRunsUtc) {
      const d = new Date(run)
      expect(d.getUTCHours()).toBe(9)
      expect(d.getUTCMinutes()).toBe(0)
      expect([1, 2, 3, 4, 5]).toContain(d.getUTCDay())
    }
  })
})

describe('jwt.api.ht (offline)', () => {
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  it('decodes base64url', () => {
    expect(b64urlDecode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe('{"alg":"HS256","typ":"JWT"}')
  })
  it('decodes and interprets claims without verifying', async () => {
    const { body } = await getJson(`https://jwt.api.ht/${TOKEN}`)
    expect(body.data.payload.sub).toBe('1234567890')
    expect(body.data.claims.issuedAt).toBe('2018-01-18T01:30:22.000Z')
    expect(body.data.signatureVerified).toBe(false)
    expect(body.data.warning).toMatch(/NOT verified/)
  })
})

describe('ipcalc.api.ht (offline)', () => {
  it('does exact bitwise math', () => {
    expect(intToIpv4(ipv4ToInt('192.168.1.130')! & 0xffffff00)).toBe('192.168.1.0')
  })
  it('serves network views with ip cross-links', async () => {
    const { body } = await getJson('https://ipcalc.api.ht/192.168.1.130/24')
    expect(body.data.network).toBe('192.168.1.0')
    expect(body.data.broadcast).toBe('192.168.1.255')
    expect(body.data.usableHosts).toBe(254)
    expect(body.data.privateRfc1918).toBe(true)
    expect(body.data.firstHost).toBe('https://ip.api.ht/192.168.1.1')
  })
  it('handles /31 and /32 edge prefixes', async () => {
    expect((await getJson('https://ipcalc.api.ht/1.1.1.1/32')).body.data.usableHosts).toBe(1)
    expect((await getJson('https://ipcalc.api.ht/1.1.1.0/31')).body.data.usableHosts).toBe(2)
  })
})

describe('punycode.api.ht (offline)', () => {
  it('decodes RFC 3492 labels', () => {
    expect(punycodeDecode('mnchen-3ya')).toBe('münchen')
    expect(punycodeDecode('bcher-kva')).toBe('bücher')
  })
  it('converts both directions through the same value', async () => {
    const uni = await getJson(`https://punycode.api.ht/${encodeURIComponent('münchen.de')}`)
    expect(uni.body.data.ascii).toBe('xn--mnchen-3ya.de')
    expect(uni.body.data.isIdn).toBe(true)
    const asc = await getJson('https://punycode.api.ht/xn--mnchen-3ya.de')
    expect(asc.body.data.unicode).toBe('münchen.de')
    expect(asc.body.data.dns).toBe('https://dns.api.ht/xn--mnchen-3ya.de')
  })
})

describe('emoji.api.ht (offline)', () => {
  it('resolves shortnames and decomposes characters', async () => {
    const named = await getJson('https://emoji.api.ht/party-popper')
    expect(named.body.data.emoji).toBe('🎉')
    expect(named.body.data.codepoints).toEqual(['U+1F389'])
    const char = await getJson(`https://emoji.api.ht/${encodeURIComponent('🦄')}`)
    expect(char.body.data.shortname).toBe('unicorn')
  })
  it('suggests near matches', async () => {
    const { res, body } = await getJson('https://emoji.api.ht/heart')
    expect(res.status).toBe(404)
    expect(body.error.message).toMatch(/red-heart/)
  })
})

// ---------------------------------------------------------------------------
// Catalog integrity
// ---------------------------------------------------------------------------

describe('catalog', () => {
  it('lists all 31 tools at the apex with example links', async () => {
    const { body } = await getJson('https://api.ht/')
    expect(Object.keys(body.data.tools)).toHaveLength(31)
    for (const [name, entry] of Object.entries<any>(body.data.tools)) {
      expect(entry.home).toBe(`https://${name}.api.ht/`)
      expect(entry.example).toContain(`https://${name}.api.ht/`)
      expect(entry.description.length).toBeGreaterThan(10)
    }
  })
  it('every tool serves a JSON descriptor at its root', async () => {
    const { body } = await getJson('https://api.ht/')
    for (const name of Object.keys(body.data.tools)) {
      const { res, body: descriptor } = await getJson(`https://${name}.api.ht/`)
      expect(res.status).toBe(200)
      expect(descriptor.data.tool).toBe(name)
      expect(descriptor.data.source.length).toBeGreaterThan(5)
    }
  })
})
