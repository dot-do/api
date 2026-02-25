/** Canonical alias map: abbreviation/variant → canonical name */
export const ALIASES: Record<string, string> = {
  // database
  db: 'database',
  databases: 'database',
  // functions
  fn: 'functions',
  function: 'functions',
  // events
  event: 'events',
  // experiments
  experiment: 'experiments',
  // workflows
  workflow: 'workflows',
  // goals
  goal: 'goals',
  // plans
  plan: 'plans',
  // projects
  project: 'projects',
  // tasks
  task: 'tasks',
  // agents
  agent: 'agents',
  // nouns
  noun: 'nouns',
  // verbs
  verb: 'verbs',
  // actions
  action: 'actions',
  // products
  product: 'products',
  // services
  svc: 'services',
  service: 'services',
  // businesses
  business: 'businesses',
  // humans
  human: 'humans',
  // domains
  domain: 'domains',
  // objects/things
  thing: 'objects',
  things: 'objects',
  object: 'objects',
}

/** Resolve an alias to its canonical name. Returns input if no alias exists. */
export function resolve(name: string): string {
  return ALIASES[name] ?? name
}
