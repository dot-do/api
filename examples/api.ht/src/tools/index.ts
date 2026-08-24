/**
 * The api.ht tool catalog.
 *
 * Expansion path: every new subdomain is one HypertextTool object added here.
 * Generation 1 (this file's second wave) grew the catalog from 6 to 31 tools,
 * each ~100 lines wrapping a free public data source (or vendored standard
 * data) with the same link grammar. See ../../GENERATION.md for the loop that
 * takes this from 31 to thousands.
 */

import type { ToolRegistry } from '../registry'
// v1 wave — network identity
import { dnsTool } from './dns'
import { ipTool } from './ip'
import { asnTool } from './asn'
import { whoisTool } from './whois'
import { phoneTool } from './phone'
import { entityTool } from './entity'
// gen-1 wave — live public sources
import { geoTool } from './geo'
import { zipTool } from './zip'
import { currencyTool } from './currency'
import { holidaysTool } from './holidays'
import { isbnTool } from './isbn'
import { npmTool } from './npm'
import { githubTool } from './github'
import { sslTool } from './ssl'
import { macTool } from './mac'
import { cveTool } from './cve'
import { emailTool } from './email'
import { rssTool } from './rss'
// gen-1 wave — offline (vendored standards + exact computation)
import { countryTool } from './country'
import { tzTool } from './tz'
import { unitsTool } from './units'
import { useragentTool } from './useragent'
import { langTool } from './lang'
import { colorTool } from './color'
import { httpTool } from './http'
import { mimeTool } from './mime'
import { cronTool } from './cron'
import { jwtTool } from './jwt'
import { ipcalcTool } from './ipcalc'
import { punycodeTool } from './punycode'
import { emojiTool } from './emoji'

export function createTools(): ToolRegistry {
  return {
    // network identity
    ip: ipTool,
    dns: dnsTool,
    whois: whoisTool,
    phone: phoneTool,
    asn: asnTool,
    entity: entityTool,
    ssl: sslTool,
    email: emailTool,
    mac: macTool,
    ipcalc: ipcalcTool,
    punycode: punycodeTool,
    // world reference
    geo: geoTool,
    zip: zipTool,
    country: countryTool,
    currency: currencyTool,
    holidays: holidaysTool,
    tz: tzTool,
    lang: langTool,
    // developer reference
    npm: npmTool,
    github: githubTool,
    cve: cveTool,
    http: httpTool,
    mime: mimeTool,
    cron: cronTool,
    jwt: jwtTool,
    useragent: useragentTool,
    // content + conversion
    isbn: isbnTool,
    rss: rssTool,
    units: unitsTool,
    color: colorTool,
    emoji: emojiTool,
  }
}
