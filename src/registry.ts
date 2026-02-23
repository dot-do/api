import { DO_DOMAINS } from './domains'
import { isNamedAgent } from './hostname'

export interface Service {
  name: string
  domain: string
  url: string
  description: string
  category: string
  status: 'active' | 'planned' | 'available'
}

export interface Category {
  name: string
  slug: string
  description: string
  services: Service[]
}

export interface Registry {
  services: Service[]
  categories: Category[]
  byName: Map<string, Service>
  byCategory: Map<string, Category>
}

const CATEGORY_MAP: Record<string, { name: string; description: string; domains: string[] }> = {
  infrastructure: {
    name: 'Infrastructure',
    description: 'Core data and compute primitives',
    domains: [
      'database', 'databases', 'sql', 'sqlite', 'postgres', 'redis', 'kafka', 'neon', 'turso',
      'supabase', 'clickhouse', 'mongo', 'mongoose', 'neo4j', 'firebase', 'convex', 'iceberg',
      'storage', 'queue', 'vectors', 'embeddings', 'state',
    ],
  },
  compute: {
    name: 'Compute',
    description: 'Functions, workflows, and execution',
    domains: [
      'functions', 'function', 'workflows', 'sandbox', 'workers', 'worker',
      'triggers', 'trigger', 'exec', 'esbuild', 'esm', 'rpa',
    ],
  },
  ai: {
    name: 'AI & Agents',
    description: 'AI models, agents, and evaluation',
    domains: [
      'agents', 'llm', 'llms', 'models', 'gpt', 'gemini', 'agi', 'thinking',
      'evals', 'mcp', 'bots', 'assistant', 'assistants',
    ],
  },
  events: {
    name: 'Events',
    description: 'Event streaming and observability',
    domains: ['events', 'traces', 'trace', 'perf', 'analytics'],
  },
  identity: {
    name: 'Identity',
    description: 'Authentication, authorization, and access control',
    domains: ['oauth', 'rbac', 'keys', 'roles', 'teams', 'orgs', 'accounts', 'fga'],
  },
  business: {
    name: 'Business',
    description: 'Payments, accounting, and business operations',
    domains: [
      'payments', 'accounting', 'treasury', 'financials', 'plans',
      'cards', 'incorporate', 'patent',
    ],
  },
  communication: {
    name: 'Communication',
    description: 'Email, SMS, calls, and messaging',
    domains: ['emails', 'texts', 'calls', 'slack', 'speak'],
  },
  content: {
    name: 'Content',
    description: 'Media, documents, and publishing',
    domains: [
      'blogs', 'photos', 'images', 'videos', 'mdx', 'icons', 'screenshots',
      'documentation', 'word', 'excel', 'sheets', 'components', 'templates',
    ],
  },
  data: {
    name: 'Data',
    description: 'Data processing, search, and extraction',
    domains: [
      'datasets', 'searches', 'extract', 'transform', 'fetch', 'summarize',
      'scraper', 'scrapers', 'lists', 'directories', 'directory',
    ],
  },
  development: {
    name: 'Development',
    description: 'SDKs, CLI tools, and developer experience',
    domains: [
      'sdk', 'cli', 'repo', 'tests', 'benchmarks', 'devs', 'programmers',
      'engineers', 'swe', 'gitx', 'react', 'pkg',
    ],
  },
  core: {
    name: 'Core Platform',
    description: 'Platform fundamentals',
    domains: [
      'apis', 'objects', 'nouns', 'verbs', 'action', 'actions',
      'platform', 'dashboard', 'studio', 'service', 'services',
      'rpc', 'cname', 'reference', 'guide', 'resources',
    ],
  },
  integrations: {
    name: 'Integrations',
    description: 'Third-party service connections',
    domains: [
      'integrations', 'integrate', 'browse', 'browser', 'browsers',
      'webhooks', 'cloudflare', 'vercel', 'gcp',
    ],
  },
  projects: {
    name: 'Projects',
    description: 'Project management and issue tracking',
    domains: ['projects', 'issues', 'tasks', 'beads', 'okr', 'okrs', 'kpis', 'goals'],
  },
  startups: {
    name: 'Startups',
    description: 'Startup tools and services',
    domains: [
      'startups', 'startupkit', 'businesses', 'companies', 'careers',
      'waitlist', 'management', 'mgmt', 'names', 'deck',
    ],
  },
}

const DESCRIPTIONS: Record<string, string> = {
  apis: 'API Directory & Management',
  database: 'Serverless Database',
  events: 'Event Streaming & CDC',
  functions: 'Serverless Functions',
  workflows: 'Workflow Orchestration',
  agents: 'Agent Management',
  analytics: 'Real-time Analytics',
  oauth: 'OAuth 2.1 Provider',
  objects: 'Digital Object Runtime',
  mcp: 'Model Context Protocol',
  payments: 'Payment Processing',
  llm: 'AI Language Models',
  searches: 'Search Engine',
  triggers: 'Event Triggers',
  queue: 'Message Queues',
  storage: 'Object Storage',
  vectors: 'Vector Database',
  integrations: 'Third-party Integrations',
  sdk: 'Developer SDK',
  cli: 'Command Line Interface',
}

function categorize(name: string): string {
  if (isNamedAgent(name)) return 'agents'
  for (const [cat, info] of Object.entries(CATEGORY_MAP)) {
    if (info.domains.includes(name)) return cat
  }
  return 'other'
}

function describeService(name: string): string {
  if (DESCRIPTIONS[name]) return DESCRIPTIONS[name]
  if (isNamedAgent(name)) return `AI Agent: ${name.charAt(0).toUpperCase() + name.slice(1)}`
  return `${name.charAt(0).toUpperCase() + name.slice(1)} Service`
}

export function buildRegistry(domains?: string[]): Registry {
  const domainList = domains || DO_DOMAINS
  const services: Service[] = domainList.map((domain) => {
    const name = domain.replace('.do', '')
    const cat = categorize(name)
    return {
      name,
      domain,
      url: `https://${domain}`,
      description: describeService(name),
      category: cat,
      status: 'available' as const,
    }
  })

  const byName = new Map(services.map((s) => [s.name, s]))

  const catMap = new Map<string, Category>()
  for (const [slug, info] of Object.entries(CATEGORY_MAP)) {
    catMap.set(slug, {
      name: info.name,
      slug,
      description: info.description,
      services: [],
    })
  }
  catMap.set('agents', {
    name: 'Named Agents',
    slug: 'agents',
    description: 'AI agents with identity and expertise',
    services: [],
  })
  catMap.set('other', {
    name: 'Other',
    slug: 'other',
    description: 'Additional services',
    services: [],
  })

  for (const svc of services) {
    const cat = catMap.get(svc.category) || catMap.get('other')!
    cat.services.push(svc)
  }

  const categories = [...catMap.values()].filter((c) => c.services.length > 0)

  return { services, categories, byName, byCategory: catMap }
}

export function getService(registry: Registry, name: string): Service | undefined {
  return registry.byName.get(name)
}

export function getCategory(registry: Registry, slug: string): Category | undefined {
  return registry.byCategory.get(slug)
}

export function listCategories(registry: Registry): Category[] {
  return registry.categories
}

export function searchServices(registry: Registry, q: string): Service[] {
  const lower = q.toLowerCase()
  return registry.services.filter(
    (s) => s.name.includes(lower) || s.description.toLowerCase().includes(lower) || s.category.includes(lower),
  )
}
