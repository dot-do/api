import type { Context, MiddlewareHandler } from 'hono'
import type { Actions, ApiConfig, ApiEnv, RespondOptions, ResponseEnvelope, UserContext, UserInfo } from './types'

export function responseMiddleware(config: ApiConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    c.set('apiConfig', config)

    c.set('respond', <T = unknown>(options: RespondOptions<T>): Response => {
      const { data, key, links, actions, options: opts, status = 200, error, user } = options

      const url = new URL(c.req.url)
      const selfUrl = url.toString()
      const baseUrl = `${url.protocol}//${url.host}${config.basePath || ''}`

      const apiType = getApiType(config)

      const envelope: ResponseEnvelope = {
        api: {
          name: config.name,
          ...(config.description && { description: config.description }),
          url: baseUrl,
          ...(apiType !== 'api' && { type: apiType }),
          ...(config.version && { version: config.version }),
          login: `${baseUrl}/login`,
          signup: `${baseUrl}/login`,
          docs: `https://docs.headless.ly`,
        },
      }

      // MDXLD identifiers
      if (options.$context) envelope.$context = options.$context
      if (options.$type) envelope.$type = options.$type
      if (options.$id) envelope.$id = options.$id

      // Pagination summary (lists only)
      if (options.total !== undefined) envelope.total = options.total
      if (options.limit !== undefined) envelope.limit = options.limit
      if (options.page !== undefined) envelope.page = options.page

      // Backcompat: pull total/limit from meta if not provided at top level
      if (options.meta && options.total === undefined && options.meta.total !== undefined) {
        envelope.total = options.meta.total
      }
      if (options.meta && options.limit === undefined && options.meta.limit !== undefined) {
        envelope.limit = options.meta.limit
      }

      // Backcompat: pass through meta for conventions that still use it
      if (options.meta) {
        ;(envelope as Record<string, unknown>).meta = options.meta
      }

      // HATEOAS links — always include self
      envelope.links = {
        self: selfUrl,
        home: baseUrl,
        ...links,
      }

      // Payload or error
      if (error) {
        envelope.error = error
      } else {
        const payloadKey = key || 'data'
        ;(envelope as Record<string, unknown>)[payloadKey] = data
      }

      // Mutation links — normalize legacy {method, href} objects to plain URL strings
      if (actions) envelope.actions = normalizeActions(actions, baseUrl)

      // View customization links
      if (opts) envelope.options = opts

      // Caller context — always last (always included, even for anonymous)
      const resolvedUser = user || c.var.user || { authenticated: false }
      const enriched = enrichUserContext(normalizeUser(resolvedUser), c)
      ;(envelope as Record<string, unknown>).user = enriched

      // Authenticated-only traceability links (top-level, not nested in user)
      if (enriched.authenticated && enriched.requestId) {
        envelope.links!.request = `${baseUrl}/${enriched.requestId}`
        if (enriched.id) envelope.links!.profile = `${baseUrl}/me`
      }

      return new Response(JSON.stringify(envelope, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    })

    await next()
  }
}

function getApiType(config: ApiConfig): string {
  if (config.proxy) return 'proxy'
  if (config.crud) return 'crud'
  if (config.rpc) return 'rpc'
  return 'api'
}

/**
 * Normalize actions — convert legacy {method, href} objects to plain URL strings.
 * If the href is relative, resolve against baseUrl.
 */
function normalizeActions(actions: Actions, baseUrl: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [name, value] of Object.entries(actions)) {
    if (typeof value === 'string') {
      result[name] = value
    } else if (value && typeof value === 'object' && 'href' in value) {
      // Legacy format: { method: 'POST', href: '/path' } → resolve to full URL
      const href = value.href
      if (href.startsWith('http://') || href.startsWith('https://')) {
        result[name] = href
      } else {
        result[name] = `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
      }
    }
  }
  return result
}

/**
 * Normalize legacy UserInfo into the new UserContext shape.
 * If the object already has `authenticated`, pass through as-is.
 */
function normalizeUser(raw: UserContext | UserInfo): UserContext {
  if ('authenticated' in raw) return raw as UserContext
  // Legacy UserInfo → UserContext bridge
  const result: UserContext = {
    authenticated: Boolean(raw.id || raw.email),
  }
  if (raw.id) result.id = raw.id
  if (raw.name) result.name = raw.name
  if (raw.email) result.email = raw.email
  return result
}

/**
 * Enrich user context with geo/request metadata from Cloudflare's cf object.
 * Produces the rich user object matching the .do ecosystem convention
 * (e.g. apis.vin, colo.do).
 */
function enrichUserContext(user: UserContext, c: Context): Record<string, unknown> {
  const cf = (c.req.raw as { cf?: Record<string, unknown> }).cf
  const result: Record<string, unknown> = { ...user }

  // Strip auth-level internals — these belong in api header or nowhere, not user
  delete result.links
  delete result.level

  // Plan — derive from auth level or default to free tier name
  if (!result.plan) result.plan = result.authenticated ? 'Pro' : 'Free'

  // Client metadata
  result.userAgent = c.req.header('user-agent')
  result.ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')

  if (cf) {
    if (cf.asOrganization) result.isp = cf.asOrganization
    if (cf.country) {
      result.flag = countryFlag(cf.country as string)
      result.zipcode = cf.postalCode || undefined
      result.city = cf.city || undefined
      result.metro = cf.metroCode ? (DMA_NAMES[cf.metroCode as number] || cf.metroCode) : undefined
      result.region = cf.region || undefined
      result.country = countryName(cf.country as string)
      result.continent = CONTINENT_NAMES[cf.continent as string] || cf.continent || undefined
    }

    // Request identity
    const cfRay = c.req.header('cf-ray')
    const rawId = cfRay || c.req.header('x-request-id') || crypto.randomUUID()
    const colo = cf.colo as string | undefined
    result.requestId = `request_${rawId}${colo ? `-${colo}` : ''}`
    result.localTime = cf.timezone
      ? new Date().toLocaleString('en-US', { timeZone: cf.timezone as string })
      : undefined
    result.timezone = cf.timezone || undefined

    // Edge network
    result.edgeLocation = colo ? (COLO_CITIES[colo] || colo) : undefined
    result.latencyMilliseconds = cf.clientTcpRtt || undefined
  } else {
    // No cf object (local dev) — still generate requestId
    const rawId = c.req.header('x-request-id') || crypto.randomUUID()
    result.requestId = `request_${rawId}`
  }

  // Strip undefined values for clean output
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) delete result[key]
  }

  return result
}

/** Convert ISO 3166-1 alpha-2 country code to full country name */
function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

const CONTINENT_NAMES: Record<string, string> = {
  AF: 'Africa', AN: 'Antarctica', AS: 'Asia', EU: 'Europe',
  NA: 'North America', OC: 'Oceania', SA: 'South America',
}

/**
 * Cloudflare colo IATA code → city name.
 * 346 data centers sourced from cloudflarestatus.com + LufsX/Cloudflare-Data-Center-IATA-Code-list.
 * Chinese DCs use major metro names (not the smaller nearby cities CF physically occupies).
 */
const COLO_CITIES: Record<string, string> = {
  // Africa (33)
  AAE: 'Annaba', ABJ: 'Abidjan', ACC: 'Accra', ADD: 'Addis Ababa', ALG: 'Algiers',
  ASK: 'Yamoussoukro', CAI: 'Cairo', CPT: 'Cape Town', CZL: 'Constantine', DAR: 'Dar es Salaam',
  DKR: 'Dakar', DUR: 'Durban', EBB: 'Kampala', FIH: 'Kinshasa', GBE: 'Gaborone',
  HRE: 'Harare', JIB: 'Djibouti City', JNB: 'Johannesburg', KGL: 'Kigali', LAD: 'Luanda',
  LLW: 'Lilongwe', LOS: 'Lagos', LUN: 'Lusaka', MBA: 'Mombasa', MPM: 'Maputo',
  MRU: 'Port Louis', NBO: 'Nairobi', ORN: 'Oran', OUA: 'Ouagadougou', RUN: 'Réunion',
  TNR: 'Antananarivo', TUN: 'Tunis', WDH: 'Windhoek',
  // Asia (90)
  AGR: 'Agra', AKX: 'Aktobe', ALA: 'Almaty', AMD: 'Ahmedabad', BBI: 'Bhubaneswar',
  BHY: 'Beihai', BKK: 'Bangkok', BLR: 'Bangalore', BOM: 'Mumbai', BWN: 'Bandar Seri Begawan',
  CAN: 'Guangzhou', CCU: 'Kolkata', CEB: 'Cebu', CGD: 'Changde', CGK: 'Jakarta',
  CGO: 'Zhengzhou', CGP: 'Chittagong', CGY: 'Cagayan de Oro', CJB: 'Coimbatore', CKG: 'Chongqing',
  CMB: 'Colombo', CNN: 'Kannur', CNX: 'Chiang Mai', COK: 'Kochi', CRK: 'Clark',
  CSX: 'Changsha', CTU: 'Chengdu', CZX: 'Changzhou', DAC: 'Dhaka', DAD: 'Da Nang',
  DEL: 'New Delhi', DLC: 'Dalian', DPS: 'Denpasar', EVN: 'Yerevan', FOC: 'Fuzhou',
  FRU: 'Bishkek', FUK: 'Fukuoka', FUO: 'Foshan', HAK: 'Haikou', HAN: 'Hanoi',
  HFE: 'Hefei', HGH: 'Hangzhou', HKG: 'Hong Kong', HYD: 'Hyderabad', HYN: 'Taizhou',
  ICN: 'Seoul', ISB: 'Islamabad', IXC: 'Chandigarh', JHB: 'Johor Bahru', JOG: 'Yogyakarta',
  JSR: 'Jashore', JXG: 'Jiaxing', KCH: 'Kuching', KHH: 'Kaohsiung', KHI: 'Karachi',
  KHN: 'Nanchang', KIX: 'Osaka', KJA: 'Krasnoyarsk', KMG: 'Kunming', KNU: 'Kanpur',
  KTM: 'Kathmandu', KUL: 'Kuala Lumpur', KWE: 'Guiyang', LHE: 'Lahore', LHW: 'Lanzhou',
  MAA: 'Chennai', MFM: 'Macau', MLE: 'Malé', MLG: 'Malang', MNL: 'Manila',
  NAG: 'Nagpur', NNG: 'Nanning', NQZ: 'Astana', NRT: 'Tokyo', OKA: 'Naha',
  PAT: 'Patna', PBH: 'Thimphu', PKX: 'Beijing', PNH: 'Phnom Penh', SHA: 'Shanghai',
  SGN: 'Ho Chi Minh City', SIN: 'Singapore', SJW: 'Shijiazhuang', SZX: 'Shenzhen', TAO: 'Qingdao',
  TAS: 'Tashkent', TEN: 'Tongren', TNA: 'Jinan', TPE: 'Taipei', TSN: 'Tianjin',
  TYN: 'Taiyuan', ULN: 'Ulaanbaatar', URT: 'Surat Thani', VTE: 'Vientiane', WHU: 'Wuhu',
  XFN: 'Xiangyang', XIY: "Xi'an", XNN: 'Xining', ZGN: 'Zhongshan',
  // Europe (60)
  ADB: 'Izmir', AMS: 'Amsterdam', ARN: 'Stockholm', ATH: 'Athens', BCN: 'Barcelona',
  BEG: 'Belgrade', BOD: 'Bordeaux', BRU: 'Brussels', BTS: 'Bratislava', BUD: 'Budapest',
  CDG: 'Paris', CPH: 'Copenhagen', DME: 'Moscow', DUB: 'Dublin', DUS: 'Düsseldorf',
  EDI: 'Edinburgh', FCO: 'Rome', FRA: 'Frankfurt', GOT: 'Gothenburg', GVA: 'Geneva',
  HAM: 'Hamburg', HEL: 'Helsinki', IST: 'Istanbul', KBP: 'Kyiv', KEF: 'Reykjavík',
  KIV: 'Chișinău', LCA: 'Nicosia', LED: 'Saint Petersburg', LHR: 'London', LIS: 'Lisbon',
  LUX: 'Luxembourg City', LYS: 'Lyon', MAD: 'Madrid', MAN: 'Manchester', MLA: 'Valletta',
  MRS: 'Marseille', MSQ: 'Minsk', MUC: 'Munich', MXP: 'Milan', ORK: 'Cork',
  OSL: 'Oslo', OTP: 'Bucharest', PMO: 'Palermo', PRG: 'Prague', RIX: 'Riga',
  SKG: 'Thessaloniki', SKP: 'Skopje', SOF: 'Sofia', STR: 'Stuttgart', SVX: 'Yekaterinburg',
  TBS: 'Tbilisi', TIA: 'Tirana', TLL: 'Tallinn', TXL: 'Berlin', VIE: 'Vienna',
  VNO: 'Vilnius', WAW: 'Warsaw', WRO: 'Wroclaw', ZAG: 'Zagreb', ZRH: 'Zurich',
  // Latin America & Caribbean (59)
  ARI: 'Arica', ARU: 'Araçatuba', ASU: 'Asunción', BAQ: 'Barranquilla', BEL: 'Belém',
  BGI: 'Bridgetown', BNU: 'Blumenau', BOG: 'Bogotá', BSB: 'Brasília', CAW: 'Campos dos Goytacazes',
  CCP: 'Concepción', CFC: 'Caçador', CGB: 'Cuiabá', CLO: 'Cali', CNF: 'Belo Horizonte',
  COR: 'Córdoba', CWB: 'Curitiba', EZE: 'Buenos Aires', FLN: 'Florianópolis', FOR: 'Fortaleza',
  GEO: 'Georgetown', GIG: 'Rio de Janeiro', GND: "St. George's", GRU: 'São Paulo',
  GUA: 'Guatemala City', GYE: 'Guayaquil', GYN: 'Goiânia', ITJ: 'Itajaí', JDO: 'Juazeiro do Norte',
  JOI: 'Joinville', LIM: 'Lima', LPB: 'La Paz', MAO: 'Manaus', MDE: 'Medellín',
  MFE: 'McAllen', NQN: 'Neuquén', NVT: 'Navegantes', PBM: 'Paramaribo', PMW: 'Palmas',
  POA: 'Porto Alegre', POS: 'Port of Spain', PTY: 'Panama City', QRO: 'Querétaro',
  QWJ: 'Americana', RAO: 'Ribeirão Preto', REC: 'Recife', SAP: 'San Pedro Sula',
  SCL: 'Santiago', SDQ: 'Santo Domingo', SJK: 'São José dos Campos', SJO: 'San José',
  SJP: 'São José do Rio Preto', SJU: 'San Juan', SOD: 'Sorocaba', SSA: 'Salvador',
  STI: 'Santiago de los Caballeros', TGU: 'Tegucigalpa', UDI: 'Uberlândia', UIO: 'Quito',
  VCP: 'Campinas', VIX: 'Vitória', XAP: 'Chapecó',
  // Middle East (21)
  AMM: 'Amman', BAH: 'Manama', BEY: 'Beirut', BGW: 'Baghdad', BSR: 'Basra',
  DMM: 'Dammam', DOH: 'Doha', DXB: 'Dubai', EBL: 'Erbil', GYD: 'Baku',
  HFA: 'Haifa', ISU: 'Sulaymaniyah', JED: 'Jeddah', KWI: 'Kuwait City', LLK: 'Astara',
  MCT: 'Muscat', NJF: 'Najaf', RUH: 'Riyadh', TLV: 'Tel Aviv', XNH: 'Nasiriyah',
  ZDM: 'Ramallah',
  // North America (57)
  ABQ: 'Albuquerque', ANC: 'Anchorage', ATL: 'Atlanta', AUS: 'Austin', BGR: 'Bangor',
  BNA: 'Nashville', BOS: 'Boston', BUF: 'Buffalo', CLT: 'Charlotte', CLE: 'Cleveland',
  CMH: 'Columbus', DEN: 'Denver', DFW: 'Dallas', DTW: 'Detroit', EWR: 'Newark',
  FSD: 'Sioux Falls', GDL: 'Guadalajara', HNL: 'Honolulu', IAD: 'Ashburn', IAH: 'Houston',
  IND: 'Indianapolis', JAX: 'Jacksonville', KIN: 'Kingston', LAS: 'Las Vegas', LAX: 'Los Angeles',
  MCI: 'Kansas City', MEM: 'Memphis', MEX: 'Mexico City', MIA: 'Miami', MSP: 'Minneapolis',
  OKC: 'Oklahoma City', OMA: 'Omaha', ORD: 'Chicago', ORF: 'Norfolk', PDX: 'Portland',
  PHL: 'Philadelphia', PHX: 'Phoenix', PIT: 'Pittsburgh', RDU: 'Raleigh-Durham', RIC: 'Richmond',
  SAN: 'San Diego', SAT: 'San Antonio', SEA: 'Seattle', SFO: 'San Francisco', SJC: 'San Jose',
  SLC: 'Salt Lake City', SMF: 'Sacramento', STL: 'St. Louis', TLH: 'Tallahassee', TPA: 'Tampa',
  YHZ: 'Halifax', YOW: 'Ottawa', YUL: 'Montréal', YVR: 'Vancouver', YWG: 'Winnipeg',
  YXE: 'Saskatoon', YYC: 'Calgary', YYZ: 'Toronto',
  // Oceania (13)
  ADL: 'Adelaide', AKL: 'Auckland', BNE: 'Brisbane', CBR: 'Canberra', CHC: 'Christchurch',
  GUM: 'Hagåtña', HBA: 'Hobart', MEL: 'Melbourne', NOU: 'Nouméa', PER: 'Perth',
  PPT: 'Tahiti', SUV: 'Suva', SYD: 'Sydney',
}

/** Nielsen DMA (Designated Market Area) names by metro code. Source: ctx.do */
const DMA_NAMES: Record<number, string> = {
  500: 'Portland-Auburn', 501: 'New York', 502: 'Binghamton', 503: 'Macon', 504: 'Philadelphia',
  505: 'Detroit', 506: 'Boston (Manchester)', 507: 'Savannah', 508: 'Pittsburgh', 509: 'Ft. Wayne',
  510: 'Cleveland-Akron (Canton)', 511: 'Washington, DC (Hagrstwn)', 512: 'Baltimore',
  513: 'Flint-Saginaw-Bay City', 514: 'Buffalo', 515: 'Cincinnati', 516: 'Erie', 517: 'Charlotte',
  518: 'Greensboro-H.Point-W.Salem', 519: 'Charleston, SC', 520: 'Augusta-Aiken',
  521: 'Providence-New Bedford', 522: 'Columbus, GA (Opelika, AL)', 523: 'Burlington-Plattsburgh',
  524: 'Atlanta', 525: 'Albany, GA', 526: 'Utica', 527: 'Indianapolis', 528: 'Miami-Ft. Lauderdale',
  529: 'Louisville', 530: 'Tallahassee-Thomasville', 531: 'Tri-Cities, TN-VA',
  532: 'Albany-Schenectady-Troy', 533: 'Hartford & New Haven', 534: 'Orlando-Daytona Bch-Melbrn',
  535: 'Columbus, OH', 536: 'Youngstown', 537: 'Bangor', 538: 'Rochester, NY',
  539: 'Tampa-St. Pete (Sarasota)', 540: 'Traverse City-Cadillac', 541: 'Lexington', 542: 'Dayton',
  543: 'Springfield-Holyoke', 544: 'Norfolk-Portsmth-Newpt Nws', 545: 'Greenville-N.Bern-Washngtn',
  546: 'Columbia, SC', 547: 'Toledo', 548: 'West Palm Beach-Ft. Pierce', 549: 'Watertown',
  550: 'Wilmington', 551: 'Lansing', 552: 'Presque Isle', 553: 'Marquette',
  554: 'Wheeling-Steubenville', 555: 'Syracuse', 556: 'Richmond-Petersburg', 557: 'Knoxville',
  558: 'Lima', 559: 'Bluefield-Beckley-Oak Hill', 560: 'Raleigh-Durham (Fayetvlle)',
  561: 'Jacksonville', 563: 'Grand Rapids-Kalmzoo-B.Crk', 564: 'Charleston-Huntington',
  565: 'Elmira (Corning)', 566: 'Harrisburg-Lncstr-Leb-York', 567: 'Greenvll-Spart-Ashevll-And',
  569: 'Harrisonburg', 570: 'Myrtle Beach-Florence', 571: 'Ft. Myers-Naples',
  573: 'Roanoke-Lynchburg', 574: 'Johnstown-Altoona-St Colge', 575: 'Chattanooga', 576: 'Salisbury',
  577: 'Wilkes Barre-Scranton-Hztn', 581: 'Terre Haute', 582: 'Lafayette, IN', 583: 'Alpena',
  584: 'Charlottesville', 588: 'South Bend-Elkhart', 592: 'Gainesville', 596: 'Zanesville',
  597: 'Parkersburg', 598: 'Clarksburg-Weston', 600: 'Corpus Christi', 602: 'Chicago',
  603: 'Joplin-Pittsburg', 604: 'Columbia-Jefferson City', 605: 'Topeka', 606: 'Dothan',
  609: 'St. Louis', 610: 'Rockford', 611: 'Rochestr-Mason City-Austin', 612: 'Shreveport',
  613: 'Minneapolis-St. Paul', 616: 'Kansas City', 617: 'Milwaukee', 618: 'Houston',
  619: 'Springfield, MO', 622: 'New Orleans', 623: 'Dallas-Ft. Worth', 624: 'Sioux City',
  625: 'Waco-Temple-Bryan', 626: 'Victoria', 627: 'Wichita Falls & Lawton',
  628: 'Monroe-El Dorado', 630: 'Birmingham (Ann and Tusc)', 631: 'Ottumwa-Kirksville',
  632: 'Paducah-Cape Girardeau', 633: 'Odessa-Midland', 634: 'Amarillo',
  635: 'Austin', 636: 'Harlingen-Weslaco-Brownsville-McAllen', 637: 'Cedar Rapids-Waterloo-Iowa City',
  638: 'St. Joseph', 639: 'Jackson, TN', 640: 'Memphis', 641: 'San Antonio',
  642: 'Lafayette, LA', 643: 'Lake Charles', 644: 'Alexandria, LA', 647: 'Greenwood-Greenville',
  648: 'Champaign & Sprngfld-Decatur', 649: 'Evansville', 650: 'Oklahoma City',
  651: 'Lubbock', 652: 'Omaha', 656: 'Panama City', 657: 'Sherman-Ada',
  658: 'Green Bay-Appleton', 659: 'Nashville', 661: 'San Angelo',
  662: 'Abilene-Sweetwater', 669: 'Madison', 670: 'Ft. Smith-Fay-Sprngdl-Rgrs',
  671: 'Tulsa', 673: 'Columbus-Tupelo-West Point', 675: 'Peoria-Bloomington',
  676: 'Duluth-Superior', 678: 'Wichita-Hutchinson Plus', 679: 'Des Moines-Ames',
  682: 'Davenport-R.Island-Moline', 686: 'Mobile-Pensacola (Ft Walt)', 687: 'Minot-Bismarck-Dickinson',
  691: 'Huntsville-Decatur (Flor)', 692: 'Beaumont-Port Arthur', 693: 'Little Rock-Pine Bluff',
  698: 'Montgomery-Selma', 702: 'La Crosse-Eau Claire', 705: 'Wausau-Rhinelander',
  709: 'Tyler-Longview (Lufkin & Nacogdoches)', 710: 'Hattiesburg-Laurel',
  711: 'Meridian', 716: 'Baton Rouge', 717: 'Quincy-Hannibal-Keokuk',
  718: 'Jackson, MS', 722: 'Lincoln & Hastings-Kearney', 724: 'Fargo-Valley City',
  725: 'Sioux Falls (Mitchell)', 734: 'Jonesboro', 736: 'Bowling Green',
  737: 'Knoxville', 740: 'North Platte', 743: 'Anchorage',
  744: 'Honolulu', 745: 'Fairbanks', 746: 'Biloxi-Gulfport',
  747: 'Juneau', 749: 'Laredo', 751: 'Denver', 752: 'Colorado Springs-Pueblo',
  753: 'Phoenix (Prescott)', 754: 'Butte-Bozeman', 755: 'Great Falls',
  756: 'Billings', 757: 'Boise', 758: 'Idaho Falls-Pocatello (Jackson)',
  759: 'Cheyenne-Scottsbluff', 760: 'Twin Falls', 762: 'Missoula', 764: 'Rapid City',
  765: 'El Paso (Las Cruces)', 766: 'Helena', 767: 'Casper-Riverton',
  770: 'Salt Lake City', 771: 'Yuma-El Centro', 773: 'Grand Junction-Montrose',
  789: 'Tucson (Sierra Vista)', 790: 'Albuquerque-Santa Fe', 798: 'Glendive',
  800: 'Bakersfield', 801: 'Eugene', 802: 'Eureka', 803: 'Los Angeles',
  804: 'Palm Springs', 807: 'San Francisco-Oakland-San Jose', 810: 'Yakima-Pasco-Richland-Kennewick',
  811: 'Reno', 813: 'Medford-Klamath Falls', 819: 'Seattle-Tacoma',
  820: 'Portland, OR', 821: 'Bend, OR', 825: 'San Diego',
  828: 'Monterey-Salinas', 839: 'Las Vegas', 855: 'Santabarbra-Sanmar-Sanluob',
  862: 'Sacramento-Stockton-Modesto', 866: 'Fresno-Visalia',
  868: 'Chico-Redding', 881: 'Spokane',
}

/** Convert ISO 3166-1 alpha-2 country code to flag emoji */
function countryFlag(code: string): string {
  if (code.length !== 2) return code
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)))
}
