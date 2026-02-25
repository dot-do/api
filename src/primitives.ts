export interface Navigator {
  core: Record<string, string>
  intelligence: Record<string, string>
  execution: Record<string, string>
  actors: Record<string, string>
  outputs: Record<string, string>
  interfaces: Record<string, string>
  lifecycle: Record<string, string>
}

interface Primitive {
  label: string
  /** The .do domain name (without .do suffix), or null if no domain owned */
  domain: string | null
  /** Path on apis.do (used when no domain or when useLocal=true) */
  path: string
}

const CORE: Primitive[] = [
  { label: 'Domain', domain: null, path: 'domains' },
  { label: 'Noun', domain: 'nouns', path: 'nouns' },
  { label: 'Verb', domain: 'verbs', path: 'verbs' },
  { label: 'Thing', domain: 'objects', path: 'objects' },
  { label: 'Action', domain: 'actions', path: 'actions' },
  { label: 'Event', domain: 'events', path: 'events' },
]

const INTELLIGENCE: Primitive[] = [
  { label: 'Function', domain: 'functions', path: 'functions' },
  { label: 'Database', domain: 'database', path: 'database' },
  { label: 'Experiment', domain: 'experiments', path: 'experiments' },
]

const EXECUTION: Primitive[] = [
  { label: 'Workflow', domain: 'workflows', path: 'workflows' },
  { label: 'Goal', domain: 'goals', path: 'goals' },
  { label: 'Plan', domain: 'plans', path: 'plans' },
  { label: 'Project', domain: 'projects', path: 'projects' },
  { label: 'Task', domain: 'tasks', path: 'tasks' },
  { label: 'Tool', domain: null, path: 'tools' },
]

const ACTORS: Primitive[] = [
  { label: 'Agent', domain: 'agents', path: 'agents' },
  { label: 'Human', domain: 'humans', path: 'humans' },
]

const OUTPUTS: Primitive[] = [
  { label: 'Product', domain: 'products', path: 'products' },
  { label: 'Service', domain: 'services', path: 'services' },
  { label: 'Business', domain: 'businesses', path: 'businesses' },
]

const INTERFACES: Primitive[] = [
  { label: 'API', domain: 'apis', path: '' },
  { label: 'SDK', domain: 'sdk', path: 'sdk' },
  { label: 'CLI', domain: 'cli', path: 'cli' },
  { label: 'MCP', domain: 'mcp', path: 'mcp' },
  { label: 'MDX', domain: 'mdx', path: 'mdx' },
]

const LIFECYCLE: Primitive[] = [
  { label: 'Design', domain: null, path: 'design' },
  { label: 'Deploy', domain: null, path: 'deploy' },
  { label: 'Observe', domain: null, path: 'observe' },
  { label: 'Launch', domain: null, path: 'launch' },
  { label: 'Grow', domain: null, path: 'grow' },
  { label: 'Scale', domain: null, path: 'scale' },
]

function buildCategory(primitives: Primitive[], base: string, useLocal: boolean): Record<string, string> {
  const result: Record<string, string> = {}
  for (const p of primitives) {
    if (!p.domain || useLocal) {
      result[p.label] = p.path ? `${base}/${p.path}` : base
    } else {
      result[p.label] = `https://${p.domain}.do`
    }
  }
  return result
}

export function buildNavigator(base: string, useLocal: boolean): Navigator {
  return {
    core: buildCategory(CORE, base, useLocal),
    intelligence: buildCategory(INTELLIGENCE, base, useLocal),
    execution: buildCategory(EXECUTION, base, useLocal),
    actors: buildCategory(ACTORS, base, useLocal),
    outputs: buildCategory(OUTPUTS, base, useLocal),
    interfaces: buildCategory(INTERFACES, base, useLocal),
    lifecycle: buildCategory(LIFECYCLE, base, useLocal),
  }
}
