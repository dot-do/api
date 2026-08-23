/**
 * Small offline reference tables used for cross-linking.
 *
 * These are deliberately tiny, curated seed sets — enough to make the
 * entity-link layer real for the canonical demo flows. Anything derived from
 * them is labeled in responses. The expansion path is to replace these with
 * live datasets (PeeringDB, Wikidata, libphonenumber metadata) behind the same
 * link grammar.
 */

/** ASN → entity slug for well-known networks (entity.api.ht/{slug}). */
export const KNOWN_ASN_ENTITIES: Record<number, string> = {
  13335: 'cloudflare',
  15169: 'google',
  396982: 'google',
  8075: 'microsoft',
  16509: 'amazon-web-services',
  14618: 'amazon-web-services',
  32934: 'meta-platforms',
  714: 'apple',
  36459: 'github',
  54113: 'fastly',
  20940: 'akamai-technologies',
  2906: 'netflix',
  13414: 'twitter',
  14061: 'digitalocean',
  16276: 'ovhcloud',
  24940: 'hetzner',
  701: 'verizon',
  7018: 'at-t',
  3356: 'lumen-technologies',
}

/** entity slug → primary domain, for entity → dns/whois cross-links. */
export const ENTITY_DOMAINS: Record<string, string> = {
  'cloudflare': 'cloudflare.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon-web-services': 'aws.amazon.com',
  'meta-platforms': 'meta.com',
  'apple': 'apple.com',
  'github': 'github.com',
  'fastly': 'fastly.com',
  'akamai-technologies': 'akamai.com',
  'netflix': 'netflix.com',
  'digitalocean': 'digitalocean.com',
  'ovhcloud': 'ovhcloud.com',
  'hetzner': 'hetzner.com',
  'verizon': 'verizon.com',
  'at-t': 'att.com',
  'lumen-technologies': 'lumen.com',
  'markmonitor': 'markmonitor.com',
  'godaddy': 'godaddy.com',
  'namecheap': 'namecheap.com',
}

/** entity slug → exact Wikipedia title, where naive title-casing fails. */
export const WIKI_TITLES: Record<string, string> = {
  'amazon-web-services': 'Amazon Web Services',
  'meta-platforms': 'Meta Platforms',
  'at-t': 'AT&T',
  'ovhcloud': 'OVHcloud',
  'united-states': 'United States',
  'united-kingdom': 'United Kingdom',
  'south-korea': 'South Korea',
  'github': 'GitHub',
  'digitalocean': 'DigitalOcean',
  'markmonitor': 'MarkMonitor',
  'godaddy': 'GoDaddy',
  'lumen-technologies': 'Lumen Technologies',
}

export interface CountryInfo {
  iso: string
  name: string
  slug: string
}

/** Calling code → country (dominant assignment for shared codes like +1). */
export const COUNTRY_CODES: Record<string, CountryInfo> = {
  '1': { iso: 'US', name: 'United States', slug: 'united-states' },
  '7': { iso: 'RU', name: 'Russia', slug: 'russia' },
  '20': { iso: 'EG', name: 'Egypt', slug: 'egypt' },
  '27': { iso: 'ZA', name: 'South Africa', slug: 'south-africa' },
  '30': { iso: 'GR', name: 'Greece', slug: 'greece' },
  '31': { iso: 'NL', name: 'Netherlands', slug: 'netherlands' },
  '32': { iso: 'BE', name: 'Belgium', slug: 'belgium' },
  '33': { iso: 'FR', name: 'France', slug: 'france' },
  '34': { iso: 'ES', name: 'Spain', slug: 'spain' },
  '39': { iso: 'IT', name: 'Italy', slug: 'italy' },
  '41': { iso: 'CH', name: 'Switzerland', slug: 'switzerland' },
  '43': { iso: 'AT', name: 'Austria', slug: 'austria' },
  '44': { iso: 'GB', name: 'United Kingdom', slug: 'united-kingdom' },
  '45': { iso: 'DK', name: 'Denmark', slug: 'denmark' },
  '46': { iso: 'SE', name: 'Sweden', slug: 'sweden' },
  '47': { iso: 'NO', name: 'Norway', slug: 'norway' },
  '48': { iso: 'PL', name: 'Poland', slug: 'poland' },
  '49': { iso: 'DE', name: 'Germany', slug: 'germany' },
  '52': { iso: 'MX', name: 'Mexico', slug: 'mexico' },
  '54': { iso: 'AR', name: 'Argentina', slug: 'argentina' },
  '55': { iso: 'BR', name: 'Brazil', slug: 'brazil' },
  '60': { iso: 'MY', name: 'Malaysia', slug: 'malaysia' },
  '61': { iso: 'AU', name: 'Australia', slug: 'australia' },
  '62': { iso: 'ID', name: 'Indonesia', slug: 'indonesia' },
  '63': { iso: 'PH', name: 'Philippines', slug: 'philippines' },
  '64': { iso: 'NZ', name: 'New Zealand', slug: 'new-zealand' },
  '65': { iso: 'SG', name: 'Singapore', slug: 'singapore' },
  '66': { iso: 'TH', name: 'Thailand', slug: 'thailand' },
  '81': { iso: 'JP', name: 'Japan', slug: 'japan' },
  '82': { iso: 'KR', name: 'South Korea', slug: 'south-korea' },
  '84': { iso: 'VN', name: 'Vietnam', slug: 'vietnam' },
  '86': { iso: 'CN', name: 'China', slug: 'china' },
  '90': { iso: 'TR', name: 'Turkey', slug: 'turkey' },
  '91': { iso: 'IN', name: 'India', slug: 'india' },
  '351': { iso: 'PT', name: 'Portugal', slug: 'portugal' },
  '353': { iso: 'IE', name: 'Ireland', slug: 'ireland' },
  '358': { iso: 'FI', name: 'Finland', slug: 'finland' },
  '852': { iso: 'HK', name: 'Hong Kong', slug: 'hong-kong' },
  '886': { iso: 'TW', name: 'Taiwan', slug: 'taiwan' },
  '971': { iso: 'AE', name: 'United Arab Emirates', slug: 'united-arab-emirates' },
  '972': { iso: 'IL', name: 'Israel', slug: 'israel' },
}

/** NANP toll-free area codes. */
export const NANP_TOLL_FREE = new Set(['800', '833', '844', '855', '866', '877', '888'])

/** NANP premium-rate area codes. */
export const NANP_PREMIUM = new Set(['900'])

/** Curated NANP geographic area codes (demo subset). */
export const NANP_AREA_CODES: Record<string, string> = {
  '202': 'Washington, DC',
  '206': 'Seattle, WA',
  '212': 'New York, NY',
  '213': 'Los Angeles, CA',
  '214': 'Dallas, TX',
  '303': 'Denver, CO',
  '305': 'Miami, FL',
  '310': 'Los Angeles, CA',
  '312': 'Chicago, IL',
  '314': 'St. Louis, MO',
  '404': 'Atlanta, GA',
  '415': 'San Francisco, CA',
  '480': 'Phoenix, AZ',
  '504': 'New Orleans, LA',
  '512': 'Austin, TX',
  '615': 'Nashville, TN',
  '617': 'Boston, MA',
  '646': 'New York, NY',
  '650': 'San Mateo County, CA',
  '702': 'Las Vegas, NV',
  '713': 'Houston, TX',
  '917': 'New York, NY',
  '972': 'Dallas, TX',
}

/** Multi-part public suffixes for the registrable-domain heuristic (demo subset). */
export const SECOND_LEVEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.au', 'net.au', 'org.au',
  'co.nz', 'co.jp', 'or.jp', 'ne.jp',
  'com.br', 'com.mx', 'co.in', 'co.za',
  'com.sg', 'com.cn', 'com.tr',
])

const CORP_SUFFIX = /,?\s+(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|company|co\.?|gmbh|s\.?a\.?|b\.?v\.?|plc)$/i

/** Slugify an organization name into an entity slug. */
export function slugifyEntity(name: string): string {
  return name
    .trim()
    .replace(CORP_SUFFIX, '')
    .toLowerCase()
    .replace(/&/g, '-') // AT&T → at-t
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** ASN holder string ("CLOUDFLARENET - Cloudflare, Inc.") → entity slug. */
export function asnToEntitySlug(asn: number, holder?: string): string | undefined {
  if (KNOWN_ASN_ENTITIES[asn]) return KNOWN_ASN_ENTITIES[asn]
  if (!holder) return undefined
  const parts = holder.split(' - ')
  const candidate = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0]
  const slug = slugifyEntity(candidate)
  return slug || undefined
}

/** Naive registrable-domain extraction (heuristic, labeled where surfaced). */
export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/\.$/, '').split('.')
  if (labels.length <= 2) return labels.join('.')
  const lastTwo = labels.slice(-2).join('.')
  const take = SECOND_LEVEL_SUFFIXES.has(lastTwo) ? 3 : 2
  return labels.slice(-take).join('.')
}
