/**
 * Vendored static reference tables for the generation-1 tool wave.
 *
 * Everything here is REAL data from stable public standards (ISO 3166,
 * ISO 639-1, ISO 4217, RFC 9110, IANA media types, CSS Color 4, Unicode),
 * vendored because the sets are small and stable. Where a table is a curated
 * subset rather than the full standard, the owning tool labels it as such in
 * its `source` field.
 */

export interface CountryRecord {
  iso2: string
  iso3: string
  name: string
  slug: string
  capital: string
  currency: string
  languages: string[]
  tz: string
  callingCode: string
}

/** ISO 3166 subset (curated ~50 countries). */
export const COUNTRIES: Record<string, CountryRecord> = {
  US: { iso2: 'US', iso3: 'USA', name: 'United States', slug: 'united-states', capital: 'Washington, D.C.', currency: 'USD', languages: ['en'], tz: 'America/New_York', callingCode: '1' },
  CA: { iso2: 'CA', iso3: 'CAN', name: 'Canada', slug: 'canada', capital: 'Ottawa', currency: 'CAD', languages: ['en', 'fr'], tz: 'America/Toronto', callingCode: '1' },
  MX: { iso2: 'MX', iso3: 'MEX', name: 'Mexico', slug: 'mexico', capital: 'Mexico City', currency: 'MXN', languages: ['es'], tz: 'America/Mexico_City', callingCode: '52' },
  BR: { iso2: 'BR', iso3: 'BRA', name: 'Brazil', slug: 'brazil', capital: 'Brasília', currency: 'BRL', languages: ['pt'], tz: 'America/Sao_Paulo', callingCode: '55' },
  AR: { iso2: 'AR', iso3: 'ARG', name: 'Argentina', slug: 'argentina', capital: 'Buenos Aires', currency: 'ARS', languages: ['es'], tz: 'America/Argentina/Buenos_Aires', callingCode: '54' },
  GB: { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom', slug: 'united-kingdom', capital: 'London', currency: 'GBP', languages: ['en'], tz: 'Europe/London', callingCode: '44' },
  IE: { iso2: 'IE', iso3: 'IRL', name: 'Ireland', slug: 'ireland', capital: 'Dublin', currency: 'EUR', languages: ['en', 'ga'], tz: 'Europe/Dublin', callingCode: '353' },
  FR: { iso2: 'FR', iso3: 'FRA', name: 'France', slug: 'france', capital: 'Paris', currency: 'EUR', languages: ['fr'], tz: 'Europe/Paris', callingCode: '33' },
  DE: { iso2: 'DE', iso3: 'DEU', name: 'Germany', slug: 'germany', capital: 'Berlin', currency: 'EUR', languages: ['de'], tz: 'Europe/Berlin', callingCode: '49' },
  ES: { iso2: 'ES', iso3: 'ESP', name: 'Spain', slug: 'spain', capital: 'Madrid', currency: 'EUR', languages: ['es'], tz: 'Europe/Madrid', callingCode: '34' },
  PT: { iso2: 'PT', iso3: 'PRT', name: 'Portugal', slug: 'portugal', capital: 'Lisbon', currency: 'EUR', languages: ['pt'], tz: 'Europe/Lisbon', callingCode: '351' },
  IT: { iso2: 'IT', iso3: 'ITA', name: 'Italy', slug: 'italy', capital: 'Rome', currency: 'EUR', languages: ['it'], tz: 'Europe/Rome', callingCode: '39' },
  NL: { iso2: 'NL', iso3: 'NLD', name: 'Netherlands', slug: 'netherlands', capital: 'Amsterdam', currency: 'EUR', languages: ['nl'], tz: 'Europe/Amsterdam', callingCode: '31' },
  BE: { iso2: 'BE', iso3: 'BEL', name: 'Belgium', slug: 'belgium', capital: 'Brussels', currency: 'EUR', languages: ['nl', 'fr', 'de'], tz: 'Europe/Brussels', callingCode: '32' },
  CH: { iso2: 'CH', iso3: 'CHE', name: 'Switzerland', slug: 'switzerland', capital: 'Bern', currency: 'CHF', languages: ['de', 'fr', 'it'], tz: 'Europe/Zurich', callingCode: '41' },
  AT: { iso2: 'AT', iso3: 'AUT', name: 'Austria', slug: 'austria', capital: 'Vienna', currency: 'EUR', languages: ['de'], tz: 'Europe/Vienna', callingCode: '43' },
  SE: { iso2: 'SE', iso3: 'SWE', name: 'Sweden', slug: 'sweden', capital: 'Stockholm', currency: 'SEK', languages: ['sv'], tz: 'Europe/Stockholm', callingCode: '46' },
  NO: { iso2: 'NO', iso3: 'NOR', name: 'Norway', slug: 'norway', capital: 'Oslo', currency: 'NOK', languages: ['no'], tz: 'Europe/Oslo', callingCode: '47' },
  DK: { iso2: 'DK', iso3: 'DNK', name: 'Denmark', slug: 'denmark', capital: 'Copenhagen', currency: 'DKK', languages: ['da'], tz: 'Europe/Copenhagen', callingCode: '45' },
  FI: { iso2: 'FI', iso3: 'FIN', name: 'Finland', slug: 'finland', capital: 'Helsinki', currency: 'EUR', languages: ['fi', 'sv'], tz: 'Europe/Helsinki', callingCode: '358' },
  PL: { iso2: 'PL', iso3: 'POL', name: 'Poland', slug: 'poland', capital: 'Warsaw', currency: 'PLN', languages: ['pl'], tz: 'Europe/Warsaw', callingCode: '48' },
  CZ: { iso2: 'CZ', iso3: 'CZE', name: 'Czechia', slug: 'czechia', capital: 'Prague', currency: 'CZK', languages: ['cs'], tz: 'Europe/Prague', callingCode: '420' },
  GR: { iso2: 'GR', iso3: 'GRC', name: 'Greece', slug: 'greece', capital: 'Athens', currency: 'EUR', languages: ['el'], tz: 'Europe/Athens', callingCode: '30' },
  TR: { iso2: 'TR', iso3: 'TUR', name: 'Turkey', slug: 'turkey', capital: 'Ankara', currency: 'TRY', languages: ['tr'], tz: 'Europe/Istanbul', callingCode: '90' },
  RU: { iso2: 'RU', iso3: 'RUS', name: 'Russia', slug: 'russia', capital: 'Moscow', currency: 'RUB', languages: ['ru'], tz: 'Europe/Moscow', callingCode: '7' },
  UA: { iso2: 'UA', iso3: 'UKR', name: 'Ukraine', slug: 'ukraine', capital: 'Kyiv', currency: 'UAH', languages: ['uk'], tz: 'Europe/Kyiv', callingCode: '380' },
  IL: { iso2: 'IL', iso3: 'ISR', name: 'Israel', slug: 'israel', capital: 'Jerusalem', currency: 'ILS', languages: ['he'], tz: 'Asia/Jerusalem', callingCode: '972' },
  AE: { iso2: 'AE', iso3: 'ARE', name: 'United Arab Emirates', slug: 'united-arab-emirates', capital: 'Abu Dhabi', currency: 'AED', languages: ['ar'], tz: 'Asia/Dubai', callingCode: '971' },
  SA: { iso2: 'SA', iso3: 'SAU', name: 'Saudi Arabia', slug: 'saudi-arabia', capital: 'Riyadh', currency: 'SAR', languages: ['ar'], tz: 'Asia/Riyadh', callingCode: '966' },
  EG: { iso2: 'EG', iso3: 'EGY', name: 'Egypt', slug: 'egypt', capital: 'Cairo', currency: 'EGP', languages: ['ar'], tz: 'Africa/Cairo', callingCode: '20' },
  ZA: { iso2: 'ZA', iso3: 'ZAF', name: 'South Africa', slug: 'south-africa', capital: 'Pretoria', currency: 'ZAR', languages: ['en', 'af', 'zu'], tz: 'Africa/Johannesburg', callingCode: '27' },
  NG: { iso2: 'NG', iso3: 'NGA', name: 'Nigeria', slug: 'nigeria', capital: 'Abuja', currency: 'NGN', languages: ['en'], tz: 'Africa/Lagos', callingCode: '234' },
  KE: { iso2: 'KE', iso3: 'KEN', name: 'Kenya', slug: 'kenya', capital: 'Nairobi', currency: 'KES', languages: ['en', 'sw'], tz: 'Africa/Nairobi', callingCode: '254' },
  IN: { iso2: 'IN', iso3: 'IND', name: 'India', slug: 'india', capital: 'New Delhi', currency: 'INR', languages: ['hi', 'en'], tz: 'Asia/Kolkata', callingCode: '91' },
  CN: { iso2: 'CN', iso3: 'CHN', name: 'China', slug: 'china', capital: 'Beijing', currency: 'CNY', languages: ['zh'], tz: 'Asia/Shanghai', callingCode: '86' },
  JP: { iso2: 'JP', iso3: 'JPN', name: 'Japan', slug: 'japan', capital: 'Tokyo', currency: 'JPY', languages: ['ja'], tz: 'Asia/Tokyo', callingCode: '81' },
  KR: { iso2: 'KR', iso3: 'KOR', name: 'South Korea', slug: 'south-korea', capital: 'Seoul', currency: 'KRW', languages: ['ko'], tz: 'Asia/Seoul', callingCode: '82' },
  TW: { iso2: 'TW', iso3: 'TWN', name: 'Taiwan', slug: 'taiwan', capital: 'Taipei', currency: 'TWD', languages: ['zh'], tz: 'Asia/Taipei', callingCode: '886' },
  HK: { iso2: 'HK', iso3: 'HKG', name: 'Hong Kong', slug: 'hong-kong', capital: 'Hong Kong', currency: 'HKD', languages: ['zh', 'en'], tz: 'Asia/Hong_Kong', callingCode: '852' },
  SG: { iso2: 'SG', iso3: 'SGP', name: 'Singapore', slug: 'singapore', capital: 'Singapore', currency: 'SGD', languages: ['en', 'ms', 'zh', 'ta'], tz: 'Asia/Singapore', callingCode: '65' },
  MY: { iso2: 'MY', iso3: 'MYS', name: 'Malaysia', slug: 'malaysia', capital: 'Kuala Lumpur', currency: 'MYR', languages: ['ms'], tz: 'Asia/Kuala_Lumpur', callingCode: '60' },
  TH: { iso2: 'TH', iso3: 'THA', name: 'Thailand', slug: 'thailand', capital: 'Bangkok', currency: 'THB', languages: ['th'], tz: 'Asia/Bangkok', callingCode: '66' },
  VN: { iso2: 'VN', iso3: 'VNM', name: 'Vietnam', slug: 'vietnam', capital: 'Hanoi', currency: 'VND', languages: ['vi'], tz: 'Asia/Ho_Chi_Minh', callingCode: '84' },
  PH: { iso2: 'PH', iso3: 'PHL', name: 'Philippines', slug: 'philippines', capital: 'Manila', currency: 'PHP', languages: ['en', 'tl'], tz: 'Asia/Manila', callingCode: '63' },
  ID: { iso2: 'ID', iso3: 'IDN', name: 'Indonesia', slug: 'indonesia', capital: 'Jakarta', currency: 'IDR', languages: ['id'], tz: 'Asia/Jakarta', callingCode: '62' },
  AU: { iso2: 'AU', iso3: 'AUS', name: 'Australia', slug: 'australia', capital: 'Canberra', currency: 'AUD', languages: ['en'], tz: 'Australia/Sydney', callingCode: '61' },
  NZ: { iso2: 'NZ', iso3: 'NZL', name: 'New Zealand', slug: 'new-zealand', capital: 'Wellington', currency: 'NZD', languages: ['en', 'mi'], tz: 'Pacific/Auckland', callingCode: '64' },
  CL: { iso2: 'CL', iso3: 'CHL', name: 'Chile', slug: 'chile', capital: 'Santiago', currency: 'CLP', languages: ['es'], tz: 'America/Santiago', callingCode: '56' },
  CO: { iso2: 'CO', iso3: 'COL', name: 'Colombia', slug: 'colombia', capital: 'Bogotá', currency: 'COP', languages: ['es'], tz: 'America/Bogota', callingCode: '57' },
  PE: { iso2: 'PE', iso3: 'PER', name: 'Peru', slug: 'peru', capital: 'Lima', currency: 'PEN', languages: ['es'], tz: 'America/Lima', callingCode: '51' },
}

/** slug/name → iso2 lookup helper. */
export function findCountry(value: string): CountryRecord | undefined {
  const v = value.trim().toLowerCase()
  const byIso = COUNTRIES[v.toUpperCase()]
  if (byIso) return byIso
  return Object.values(COUNTRIES).find((c) => c.slug === v || c.iso3.toLowerCase() === v || c.name.toLowerCase() === v)
}

/** ISO 4217 currency code → name (subset covering COUNTRIES + majors). */
export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'United States dollar', EUR: 'Euro', GBP: 'Pound sterling', JPY: 'Japanese yen', CHF: 'Swiss franc',
  CAD: 'Canadian dollar', AUD: 'Australian dollar', NZD: 'New Zealand dollar', CNY: 'Chinese renminbi',
  HKD: 'Hong Kong dollar', SGD: 'Singapore dollar', KRW: 'South Korean won', TWD: 'New Taiwan dollar',
  INR: 'Indian rupee', BRL: 'Brazilian real', MXN: 'Mexican peso', ARS: 'Argentine peso', CLP: 'Chilean peso',
  COP: 'Colombian peso', PEN: 'Peruvian sol', SEK: 'Swedish krona', NOK: 'Norwegian krone', DKK: 'Danish krone',
  PLN: 'Polish złoty', CZK: 'Czech koruna', TRY: 'Turkish lira', RUB: 'Russian ruble', UAH: 'Ukrainian hryvnia',
  ILS: 'Israeli new shekel', AED: 'UAE dirham', SAR: 'Saudi riyal', EGP: 'Egyptian pound', ZAR: 'South African rand',
  NGN: 'Nigerian naira', KES: 'Kenyan shilling', THB: 'Thai baht', VND: 'Vietnamese đồng', PHP: 'Philippine peso',
  IDR: 'Indonesian rupiah', MYR: 'Malaysian ringgit',
}

/** ISO 639-1 subset (curated ~50 languages). */
export const LANGUAGES: Record<string, { name: string; native: string }> = {
  en: { name: 'English', native: 'English' }, es: { name: 'Spanish', native: 'español' },
  fr: { name: 'French', native: 'français' }, de: { name: 'German', native: 'Deutsch' },
  it: { name: 'Italian', native: 'italiano' }, pt: { name: 'Portuguese', native: 'português' },
  nl: { name: 'Dutch', native: 'Nederlands' }, sv: { name: 'Swedish', native: 'svenska' },
  no: { name: 'Norwegian', native: 'norsk' }, da: { name: 'Danish', native: 'dansk' },
  fi: { name: 'Finnish', native: 'suomi' }, pl: { name: 'Polish', native: 'polski' },
  cs: { name: 'Czech', native: 'čeština' }, el: { name: 'Greek', native: 'ελληνικά' },
  tr: { name: 'Turkish', native: 'Türkçe' }, ru: { name: 'Russian', native: 'русский' },
  uk: { name: 'Ukrainian', native: 'українська' }, he: { name: 'Hebrew', native: 'עברית' },
  ar: { name: 'Arabic', native: 'العربية' }, hi: { name: 'Hindi', native: 'हिन्दी' },
  bn: { name: 'Bengali', native: 'বাংলা' }, ta: { name: 'Tamil', native: 'தமிழ்' },
  zh: { name: 'Chinese', native: '中文' }, ja: { name: 'Japanese', native: '日本語' },
  ko: { name: 'Korean', native: '한국어' }, th: { name: 'Thai', native: 'ไทย' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt' }, id: { name: 'Indonesian', native: 'Bahasa Indonesia' },
  ms: { name: 'Malay', native: 'Bahasa Melayu' }, tl: { name: 'Tagalog', native: 'Tagalog' },
  sw: { name: 'Swahili', native: 'Kiswahili' }, af: { name: 'Afrikaans', native: 'Afrikaans' },
  zu: { name: 'Zulu', native: 'isiZulu' }, ga: { name: 'Irish', native: 'Gaeilge' },
  mi: { name: 'Māori', native: 'te reo Māori' }, fa: { name: 'Persian', native: 'فارسی' },
  ur: { name: 'Urdu', native: 'اردو' }, ro: { name: 'Romanian', native: 'română' },
  hu: { name: 'Hungarian', native: 'magyar' }, bg: { name: 'Bulgarian', native: 'български' },
  hr: { name: 'Croatian', native: 'hrvatski' }, sr: { name: 'Serbian', native: 'српски' },
  sk: { name: 'Slovak', native: 'slovenčina' }, sl: { name: 'Slovenian', native: 'slovenščina' },
  lt: { name: 'Lithuanian', native: 'lietuvių' }, lv: { name: 'Latvian', native: 'latviešu' },
  et: { name: 'Estonian', native: 'eesti' }, is: { name: 'Icelandic', native: 'íslenska' },
  ca: { name: 'Catalan', native: 'català' }, eu: { name: 'Basque', native: 'euskara' },
}

/** Countries where a language is official/primary (derived from COUNTRIES). */
export function countriesForLanguage(code: string): CountryRecord[] {
  return Object.values(COUNTRIES).filter((c) => c.languages.includes(code))
}

/** RFC 9110 (+ registered) HTTP status codes — full standard set. */
export const HTTP_STATUSES: Record<string, { name: string; summary: string; rfc: string }> = {
  '100': { name: 'Continue', summary: 'Interim response: continue the request or ignore if finished.', rfc: 'RFC 9110 §15.2.1' },
  '101': { name: 'Switching Protocols', summary: 'Server is switching to the protocol named in Upgrade.', rfc: 'RFC 9110 §15.2.2' },
  '102': { name: 'Processing', summary: 'WebDAV: server has accepted the request but not completed it.', rfc: 'RFC 2518' },
  '103': { name: 'Early Hints', summary: 'Preload hints sent before the final response.', rfc: 'RFC 8297' },
  '200': { name: 'OK', summary: 'The request succeeded.', rfc: 'RFC 9110 §15.3.1' },
  '201': { name: 'Created', summary: 'A new resource was created.', rfc: 'RFC 9110 §15.3.2' },
  '202': { name: 'Accepted', summary: 'Accepted for processing; not yet completed.', rfc: 'RFC 9110 §15.3.3' },
  '203': { name: 'Non-Authoritative Information', summary: 'Transformed by a proxy.', rfc: 'RFC 9110 §15.3.4' },
  '204': { name: 'No Content', summary: 'Success with no response body.', rfc: 'RFC 9110 §15.3.5' },
  '205': { name: 'Reset Content', summary: 'Success; reset the document view.', rfc: 'RFC 9110 §15.3.6' },
  '206': { name: 'Partial Content', summary: 'Range request succeeded.', rfc: 'RFC 9110 §15.3.7' },
  '207': { name: 'Multi-Status', summary: 'WebDAV: multiple status values.', rfc: 'RFC 4918' },
  '208': { name: 'Already Reported', summary: 'WebDAV: members already enumerated.', rfc: 'RFC 5842' },
  '226': { name: 'IM Used', summary: 'Delta encoding applied.', rfc: 'RFC 3229' },
  '300': { name: 'Multiple Choices', summary: 'More than one representation available.', rfc: 'RFC 9110 §15.4.1' },
  '301': { name: 'Moved Permanently', summary: 'Resource has a new permanent URI.', rfc: 'RFC 9110 §15.4.2' },
  '302': { name: 'Found', summary: 'Resource temporarily at a different URI.', rfc: 'RFC 9110 §15.4.3' },
  '303': { name: 'See Other', summary: 'Retrieve with GET at another URI.', rfc: 'RFC 9110 §15.4.4' },
  '304': { name: 'Not Modified', summary: 'Conditional request: cached copy is current.', rfc: 'RFC 9110 §15.4.5' },
  '307': { name: 'Temporary Redirect', summary: 'Repeat with same method at another URI.', rfc: 'RFC 9110 §15.4.8' },
  '308': { name: 'Permanent Redirect', summary: 'Permanent; keep the request method.', rfc: 'RFC 9110 §15.4.9' },
  '400': { name: 'Bad Request', summary: 'Malformed or invalid request.', rfc: 'RFC 9110 §15.5.1' },
  '401': { name: 'Unauthorized', summary: 'Authentication required or failed.', rfc: 'RFC 9110 §15.5.2' },
  '402': { name: 'Payment Required', summary: 'Reserved; used for payment/quota walls.', rfc: 'RFC 9110 §15.5.3' },
  '403': { name: 'Forbidden', summary: 'Understood but refused.', rfc: 'RFC 9110 §15.5.4' },
  '404': { name: 'Not Found', summary: 'No representation for the target resource.', rfc: 'RFC 9110 §15.5.5' },
  '405': { name: 'Method Not Allowed', summary: 'Method not supported by the resource.', rfc: 'RFC 9110 §15.5.6' },
  '406': { name: 'Not Acceptable', summary: 'No representation matches Accept headers.', rfc: 'RFC 9110 §15.5.7' },
  '407': { name: 'Proxy Authentication Required', summary: 'Authenticate with the proxy first.', rfc: 'RFC 9110 §15.5.8' },
  '408': { name: 'Request Timeout', summary: 'Server timed out waiting for the request.', rfc: 'RFC 9110 §15.5.9' },
  '409': { name: 'Conflict', summary: 'Conflict with current resource state.', rfc: 'RFC 9110 §15.5.10' },
  '410': { name: 'Gone', summary: 'Permanently removed; no forwarding address.', rfc: 'RFC 9110 §15.5.11' },
  '411': { name: 'Length Required', summary: 'Content-Length header required.', rfc: 'RFC 9110 §15.5.12' },
  '412': { name: 'Precondition Failed', summary: 'A request precondition evaluated false.', rfc: 'RFC 9110 §15.5.13' },
  '413': { name: 'Content Too Large', summary: 'Request body exceeds limits.', rfc: 'RFC 9110 §15.5.14' },
  '414': { name: 'URI Too Long', summary: 'Request target is too long.', rfc: 'RFC 9110 §15.5.15' },
  '415': { name: 'Unsupported Media Type', summary: 'Body format not supported.', rfc: 'RFC 9110 §15.5.16' },
  '416': { name: 'Range Not Satisfiable', summary: 'Requested range not available.', rfc: 'RFC 9110 §15.5.17' },
  '417': { name: 'Expectation Failed', summary: 'Expect header could not be met.', rfc: 'RFC 9110 §15.5.18' },
  '418': { name: "I'm a teapot", summary: 'April Fools joke (HTCPCP); refuses to brew coffee.', rfc: 'RFC 2324' },
  '421': { name: 'Misdirected Request', summary: 'Directed at a server that cannot answer.', rfc: 'RFC 9110 §15.5.20' },
  '422': { name: 'Unprocessable Content', summary: 'Well-formed but semantically invalid.', rfc: 'RFC 9110 §15.5.21' },
  '423': { name: 'Locked', summary: 'WebDAV: resource is locked.', rfc: 'RFC 4918' },
  '424': { name: 'Failed Dependency', summary: 'WebDAV: a dependent request failed.', rfc: 'RFC 4918' },
  '425': { name: 'Too Early', summary: 'Server unwilling to risk an early-data replay.', rfc: 'RFC 8470' },
  '426': { name: 'Upgrade Required', summary: 'Switch to the protocol in Upgrade.', rfc: 'RFC 9110 §15.5.22' },
  '428': { name: 'Precondition Required', summary: 'Conditional request required.', rfc: 'RFC 6585' },
  '429': { name: 'Too Many Requests', summary: 'Rate limit exceeded.', rfc: 'RFC 6585' },
  '431': { name: 'Request Header Fields Too Large', summary: 'Headers exceed limits.', rfc: 'RFC 6585' },
  '451': { name: 'Unavailable For Legal Reasons', summary: 'Blocked for legal reasons.', rfc: 'RFC 7725' },
  '500': { name: 'Internal Server Error', summary: 'Unexpected server condition.', rfc: 'RFC 9110 §15.6.1' },
  '501': { name: 'Not Implemented', summary: 'Method not supported by the server.', rfc: 'RFC 9110 §15.6.2' },
  '502': { name: 'Bad Gateway', summary: 'Invalid response from an upstream server.', rfc: 'RFC 9110 §15.6.3' },
  '503': { name: 'Service Unavailable', summary: 'Temporarily overloaded or down.', rfc: 'RFC 9110 §15.6.4' },
  '504': { name: 'Gateway Timeout', summary: 'Upstream server did not respond in time.', rfc: 'RFC 9110 §15.6.5' },
  '505': { name: 'HTTP Version Not Supported', summary: 'Protocol version not supported.', rfc: 'RFC 9110 §15.6.6' },
  '506': { name: 'Variant Also Negotiates', summary: 'Content negotiation misconfiguration.', rfc: 'RFC 2295' },
  '507': { name: 'Insufficient Storage', summary: 'WebDAV: server out of space.', rfc: 'RFC 4918' },
  '508': { name: 'Loop Detected', summary: 'WebDAV: infinite loop detected.', rfc: 'RFC 5842' },
  '510': { name: 'Not Extended', summary: 'Further extensions required.', rfc: 'RFC 2774' },
  '511': { name: 'Network Authentication Required', summary: 'Captive portal: authenticate to the network.', rfc: 'RFC 6585' },
}

/** extension → IANA media type (curated common subset). */
export const MIME_BY_EXT: Record<string, string> = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', jsonld: 'application/ld+json', xml: 'application/xml', txt: 'text/plain',
  md: 'text/markdown', csv: 'text/csv', ics: 'text/calendar', yaml: 'application/yaml', yml: 'application/yaml',
  pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar', wasm: 'application/wasm',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/vnd.microsoft.icon', bmp: 'image/bmp',
  tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', weba: 'audio/webm',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  epub: 'application/epub+zip', apk: 'application/vnd.android.package-archive',
  bin: 'application/octet-stream', exe: 'application/vnd.microsoft.portable-executable',
  sh: 'application/x-sh', php: 'application/x-httpd-php', rtf: 'application/rtf',
}

/** CSS named colors (Color 4 subset — the commonly used names). */
export const CSS_COLORS: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', lime: '#00ff00', blue: '#0000ff',
  yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', silver: '#c0c0c0', gray: '#808080',
  maroon: '#800000', olive: '#808000', green: '#008000', purple: '#800080', teal: '#008080',
  navy: '#000080', orange: '#ffa500', gold: '#ffd700', pink: '#ffc0cb', hotpink: '#ff69b4',
  coral: '#ff7f50', tomato: '#ff6347', orangered: '#ff4500', crimson: '#dc143c', salmon: '#fa8072',
  brown: '#a52a2a', chocolate: '#d2691e', tan: '#d2b48c', khaki: '#f0e68c', beige: '#f5f5dc',
  ivory: '#fffff0', lavender: '#e6e6fa', violet: '#ee82ee', orchid: '#da70d6', plum: '#dda0dd',
  indigo: '#4b0082', slateblue: '#6a5acd', royalblue: '#4169e1', dodgerblue: '#1e90ff', skyblue: '#87ceeb',
  steelblue: '#4682b4', turquoise: '#40e0d0', aquamarine: '#7fffd4', seagreen: '#2e8b57', forestgreen: '#228b22',
  olivedrab: '#6b8e23', darkgreen: '#006400', springgreen: '#00ff7f', chartreuse: '#7fff00', rebeccapurple: '#663399',
  dimgray: '#696969', lightgray: '#d3d3d3', gainsboro: '#dcdcdc', whitesmoke: '#f5f5f5', snow: '#fffafa',
}

/** Unicode emoji shortname table (curated common subset). */
export const EMOJI: Record<string, string> = {
  'grinning-face': '😀', 'face-with-tears-of-joy': '😂', 'smiling-face-with-heart-eyes': '😍',
  'thinking-face': '🤔', 'winking-face': '😉', 'crying-face': '😢', 'loudly-crying-face': '😭',
  'face-with-rolling-eyes': '🙄', 'smiling-face-with-sunglasses': '😎', 'zany-face': '🤪',
  'red-heart': '❤️', 'broken-heart': '💔', 'sparkling-heart': '💖', 'fire': '🔥', 'sparkles': '✨',
  'star': '⭐', 'glowing-star': '🌟', 'collision': '💥', 'party-popper': '🎉', 'confetti-ball': '🎊',
  'balloon': '🎈', 'birthday-cake': '🎂', 'wrapped-gift': '🎁', 'trophy': '🏆', 'medal': '🏅',
  'thumbs-up': '👍', 'thumbs-down': '👎', 'clapping-hands': '👏', 'waving-hand': '👋', 'ok-hand': '👌',
  'folded-hands': '🙏', 'flexed-biceps': '💪', 'eyes': '👀', 'brain': '🧠', 'robot': '🤖',
  'ghost': '👻', 'alien': '👽', 'skull': '💀', 'rocket': '🚀', 'airplane': '✈️',
  'automobile': '🚗', 'bicycle': '🚲', 'globe-showing-americas': '🌎', 'earth-globe-europe-africa': '🌍',
  'sun': '☀️', 'crescent-moon': '🌙', 'cloud': '☁️', 'umbrella-with-rain-drops': '☔', 'snowflake': '❄️',
  'rainbow': '🌈', 'ocean-wave': '🌊', 'dog-face': '🐶', 'cat-face': '🐱', 'unicorn': '🦄',
  'butterfly': '🦋', 'rose': '🌹', 'sunflower': '🌻', 'four-leaf-clover': '🍀', 'pizza': '🍕',
  'hamburger': '🍔', 'taco': '🌮', 'sushi': '🍣', 'hot-beverage': '☕', 'beer-mug': '🍺',
  'check-mark-button': '✅', 'cross-mark': '❌', 'warning': '⚠️', 'red-question-mark': '❓',
  'light-bulb': '💡', 'gear': '⚙️', 'hammer-and-wrench': '🛠️', 'magnifying-glass-tilted-left': '🔍',
  'locked': '🔒', 'unlocked': '🔓', 'key': '🔑', 'bell': '🔔', 'bookmark': '🔖', 'link': '🔗',
  'chart-increasing': '📈', 'chart-decreasing': '📉', 'money-bag': '💰', 'dollar-banknote': '💵',
  'credit-card': '💳', 'e-mail': '📧', 'telephone': '☎️', 'mobile-phone': '📱', 'laptop': '💻',
  'keyboard': '⌨️', 'floppy-disk': '💾', 'package': '📦', 'memo': '📝', 'books': '📚',
  'calendar': '📅', 'alarm-clock': '⏰', 'hourglass-done': '⌛', 'hundred-points': '💯',
}

/**
 * Unit conversion factors — canonical base unit per dimension.
 * Factors are exact where the unit is defined exactly (SI, international
 * yard/pound agreement); temperature is handled as affine separately.
 */
export const UNIT_FACTORS: Record<string, { dimension: string; toBase: number; name: string }> = {
  // length (base: meter)
  mm: { dimension: 'length', toBase: 0.001, name: 'millimeter' },
  cm: { dimension: 'length', toBase: 0.01, name: 'centimeter' },
  m: { dimension: 'length', toBase: 1, name: 'meter' },
  km: { dimension: 'length', toBase: 1000, name: 'kilometer' },
  in: { dimension: 'length', toBase: 0.0254, name: 'inch' },
  ft: { dimension: 'length', toBase: 0.3048, name: 'foot' },
  yd: { dimension: 'length', toBase: 0.9144, name: 'yard' },
  mi: { dimension: 'length', toBase: 1609.344, name: 'mile' },
  nmi: { dimension: 'length', toBase: 1852, name: 'nautical mile' },
  // mass (base: kilogram)
  mg: { dimension: 'mass', toBase: 0.000001, name: 'milligram' },
  g: { dimension: 'mass', toBase: 0.001, name: 'gram' },
  kg: { dimension: 'mass', toBase: 1, name: 'kilogram' },
  t: { dimension: 'mass', toBase: 1000, name: 'metric ton' },
  oz: { dimension: 'mass', toBase: 0.028349523125, name: 'ounce' },
  lb: { dimension: 'mass', toBase: 0.45359237, name: 'pound' },
  st: { dimension: 'mass', toBase: 6.35029318, name: 'stone' },
  // volume (base: liter)
  ml: { dimension: 'volume', toBase: 0.001, name: 'milliliter' },
  l: { dimension: 'volume', toBase: 1, name: 'liter' },
  gal: { dimension: 'volume', toBase: 3.785411784, name: 'US gallon' },
  qt: { dimension: 'volume', toBase: 0.946352946, name: 'US quart' },
  pt: { dimension: 'volume', toBase: 0.473176473, name: 'US pint' },
  cup: { dimension: 'volume', toBase: 0.2365882365, name: 'US cup' },
  floz: { dimension: 'volume', toBase: 0.0295735295625, name: 'US fluid ounce' },
  // speed (base: meter/second)
  mps: { dimension: 'speed', toBase: 1, name: 'meter per second' },
  kph: { dimension: 'speed', toBase: 0.2777777777777778, name: 'kilometer per hour' },
  mph: { dimension: 'speed', toBase: 0.44704, name: 'mile per hour' },
  kn: { dimension: 'speed', toBase: 0.5144444444444445, name: 'knot' },
  // data (base: byte)
  b: { dimension: 'data', toBase: 1, name: 'byte' },
  kb: { dimension: 'data', toBase: 1000, name: 'kilobyte' },
  mb: { dimension: 'data', toBase: 1000000, name: 'megabyte' },
  gb: { dimension: 'data', toBase: 1000000000, name: 'gigabyte' },
  tb: { dimension: 'data', toBase: 1000000000000, name: 'terabyte' },
  kib: { dimension: 'data', toBase: 1024, name: 'kibibyte' },
  mib: { dimension: 'data', toBase: 1048576, name: 'mebibyte' },
  gib: { dimension: 'data', toBase: 1073741824, name: 'gibibyte' },
  tib: { dimension: 'data', toBase: 1099511627776, name: 'tebibyte' },
  // area (base: square meter)
  sqm: { dimension: 'area', toBase: 1, name: 'square meter' },
  sqkm: { dimension: 'area', toBase: 1000000, name: 'square kilometer' },
  sqft: { dimension: 'area', toBase: 0.09290304, name: 'square foot' },
  acre: { dimension: 'area', toBase: 4046.8564224, name: 'acre' },
  ha: { dimension: 'area', toBase: 10000, name: 'hectare' },
}
