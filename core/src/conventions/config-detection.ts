/**
 * Config Detection Convention
 *
 * Analyzes what was passed to API() and classifies it to determine
 * how to generate routes. Supports:
 *
 * - **Single function**: Direct endpoint (POST handler)
 * - **String**: Config value (name, URL, etc.)
 * - **Binding/object**: Service binding or Durable Object stub
 * - **Object of functions**: Module wrapping (lodash-style _.fn endpoints)
 * - **Class instance**: SDK client wrapping (stripe.resource.method endpoints)
 * - **Module with default**: Package default export
 *
 * Package wrapping generates routes from module exports using dot notation
 * namespaces (e.g., `lodash.camelCase` -> `GET /lodash/camelCase`).
 *
 * Client wrapping traverses SDK client instances and exposes resource methods
 * as API endpoints (e.g., `stripe.customers.list` -> `GET /stripe/customers/list`).
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Classification of what was passed to API()
 */
export type InputKind =
  | 'function'       // Single function -> direct endpoint
  | 'string'         // String value -> config (name, URL, binding name)
  | 'config'         // Plain object with known config keys
  | 'binding'        // Cloudflare service binding or Durable Object
  | 'module'         // Object of functions -> package wrapping
  | 'class-instance' // SDK client instance -> client wrapping
  | 'array'          // Array value -> static data endpoint
  | 'unknown'        // Could not classify

/**
 * Result of detecting what was passed to API()
 */
export interface DetectedInput {
  /** Classification of the input */
  kind: InputKind
  /** The original input value */
  value: unknown
  /** Detected functions (for module/class-instance kinds) */
  functions?: Record<string, Function>
  /** Detected nested namespaces (for class-instance kind) */
  namespaces?: Record<string, Record<string, Function>>
  /** Human-readable reason for the classification */
  reason: string
}

/**
 * Configuration for wrapping a module/package as API routes.
 */
export interface PackageWrapConfig {
  /** The module or object containing functions to expose */
  module: Record<string, unknown>
  /** Namespace prefix for routes (e.g., 'lodash') */
  namespace: string
  /** Specific functions to expose (default: all) */
  include?: string[]
  /** Functions to exclude */
  exclude?: string[]
  /** Maximum depth for nested object traversal */
  maxDepth?: number
  /** Route prefix (default: `/${namespace}`) */
  basePath?: string
}

/**
 * Configuration for wrapping an SDK client as API routes.
 */
export interface ClientWrapConfig {
  /** The SDK client instance */
  client: object
  /** Namespace prefix for routes (e.g., 'stripe') */
  namespace: string
  /** Specific resources to expose (default: all) */
  include?: string[]
  /** Resources to exclude */
  exclude?: string[]
  /** Maximum traversal depth for nested resources */
  maxDepth?: number
  /** Methods to treat as GET (read) vs POST (write) */
  readMethods?: string[]
  /** Route prefix (default: `/${namespace}`) */
  basePath?: string
}

/**
 * A single route generated from package/client wrapping.
 */
export interface GeneratedRoute {
  /** HTTP method */
  method: 'GET' | 'POST'
  /** Route path (e.g., '/lodash/camelCase') */
  path: string
  /** Dot-notation name (e.g., 'lodash.camelCase') */
  name: string
  /** The underlying function */
  handler: Function
  /** Description for docs/MCP */
  description: string
}

// =============================================================================
// Constants
// =============================================================================

/** Property names that indicate a Cloudflare service binding */
const BINDING_INDICATORS = new Set([
  'fetch',
  'connect',
  'queue',
  'get',       // DO stub
  'idFromName', // DO namespace
  'idFromString',
  'jurisdiction',
])

/** Known config keys from the API factory */
const CONFIG_KEYS = new Set([
  'name', 'description', 'version', 'basePath',
  'auth', 'rateLimit', 'crud', 'proxy', 'rpc', 'mcp',
  'analytics', 'analyticsBuffer', 'testing', 'database',
  'functions', 'landing', 'routes', 'plans', 'features',
  'before', 'after', 'webhooks', 'source', 'proxies',
])

/** Default methods considered read-only (mapped to GET) */
const DEFAULT_READ_METHODS = new Set([
  'list', 'get', 'retrieve', 'search', 'find', 'count',
  'exists', 'check', 'verify', 'validate',
])

/** Properties to skip when traversing objects */
const SKIP_PROPERTIES = new Set([
  'constructor', 'prototype', '__proto__',
  'toString', 'valueOf', 'toJSON',
  'hasOwnProperty', 'isPrototypeOf',
  'propertyIsEnumerable',
])

// =============================================================================
// Detection
// =============================================================================

/**
 * Analyze an input value and classify what it is, determining how
 * the API factory should handle it.
 *
 * Detection priority:
 * 1. `undefined`/`null` -> unknown
 * 2. `function` -> function
 * 3. `string` -> string
 * 4. `Array` -> array
 * 5. Object with known config keys -> config
 * 6. Object with `fetch` method (binding shape) -> binding
 * 7. Class instance with methods -> class-instance
 * 8. Plain object where most values are functions -> module
 * 9. Plain object -> config (fallback)
 */
export function detectInputType(input: unknown): DetectedInput {
  // Null/undefined
  if (input === undefined || input === null) {
    return { kind: 'unknown', value: input, reason: 'Input is null or undefined' }
  }

  // Function
  if (typeof input === 'function') {
    return { kind: 'function', value: input, reason: 'Input is a function' }
  }

  // String
  if (typeof input === 'string') {
    return { kind: 'string', value: input, reason: 'Input is a string' }
  }

  // Primitives
  if (typeof input !== 'object') {
    return { kind: 'unknown', value: input, reason: `Input is a ${typeof input} primitive` }
  }

  // Array
  if (Array.isArray(input)) {
    return { kind: 'array', value: input, reason: 'Input is an array' }
  }

  const obj = input as Record<string, unknown>
  const keys = Object.keys(obj)

  // Check for known config keys
  const configKeyCount = keys.filter((k) => CONFIG_KEYS.has(k)).length
  if (configKeyCount > 0 && configKeyCount >= keys.length / 2) {
    return { kind: 'config', value: input, reason: `Object has ${configKeyCount} known config keys` }
  }

  // Check for Cloudflare binding shape
  if (isBinding(obj)) {
    return { kind: 'binding', value: input, reason: 'Object matches Cloudflare service binding shape' }
  }

  // Check for class instance (has prototype methods beyond Object, or has nested resource objects)
  if (isClassInstance(obj)) {
    const { functions, namespaces } = extractClientMethods(obj)
    const fnCount = Object.keys(functions).length
    const nsCount = Object.keys(namespaces).length
    if (fnCount > 0 || nsCount > 0) {
      return {
        kind: 'class-instance',
        value: input,
        functions,
        namespaces,
        reason: `Class instance with ${fnCount} methods and ${nsCount} nested resources`,
      }
    }
  }

  // Check for module (plain object where values are mostly functions)
  const functionKeys = keys.filter((k) => typeof obj[k] === 'function')
  if (functionKeys.length > 0 && functionKeys.length >= keys.length / 2) {
    const functions: Record<string, Function> = {}
    for (const key of functionKeys) {
      functions[key] = obj[key] as Function
    }
    return {
      kind: 'module',
      value: input,
      functions,
      reason: `Plain object with ${functionKeys.length}/${keys.length} function values`,
    }
  }

  // Check if there are any config keys at all
  if (configKeyCount > 0) {
    return { kind: 'config', value: input, reason: `Object has ${configKeyCount} known config keys (minority)` }
  }

  // Fallback: if it has some functions, treat as module; otherwise unknown
  if (functionKeys.length > 0) {
    const functions: Record<string, Function> = {}
    for (const key of functionKeys) {
      functions[key] = obj[key] as Function
    }
    return {
      kind: 'module',
      value: input,
      functions,
      reason: `Plain object with ${functionKeys.length} function values (minority, no config keys)`,
    }
  }

  return { kind: 'unknown', value: input, reason: 'Could not classify object' }
}

// =============================================================================
// Package Wrapping
// =============================================================================

/**
 * Wrap a module/package and generate API routes from its exports.
 *
 * Each exported function becomes a route:
 * - `module.camelCase` -> `POST /namespace/camelCase` + `GET /namespace/camelCase`
 *
 * Nested objects create deeper path segments:
 * - `module.string.trim` -> `POST /namespace/string/trim`
 */
export function wrapPackage(config: PackageWrapConfig): GeneratedRoute[] {
  const routes: GeneratedRoute[] = []
  const { module: mod, namespace, include, exclude, maxDepth = 3, basePath } = config
  const prefix = basePath ?? `/${namespace}`

  traverseModule(mod, namespace, prefix, routes, {
    include: include ? new Set(include) : undefined,
    exclude: exclude ? new Set(exclude) : undefined,
    maxDepth,
    currentDepth: 0,
  })

  return routes
}

interface TraverseOptions {
  include?: Set<string>
  exclude?: Set<string>
  maxDepth: number
  currentDepth: number
}

function traverseModule(
  obj: Record<string, unknown>,
  namePrefix: string,
  pathPrefix: string,
  routes: GeneratedRoute[],
  opts: TraverseOptions,
): void {
  if (opts.currentDepth >= opts.maxDepth) return

  for (const [key, value] of Object.entries(obj)) {
    if (SKIP_PROPERTIES.has(key)) continue
    if (key.startsWith('_')) continue

    const dotName = `${namePrefix}.${key}`
    const routePath = `${pathPrefix}/${key}`

    // Check include/exclude filters
    if (opts.include && !opts.include.has(key) && !opts.include.has(dotName)) continue
    if (opts.exclude && (opts.exclude.has(key) || opts.exclude.has(dotName))) continue

    if (typeof value === 'function') {
      const isRead = DEFAULT_READ_METHODS.has(key)
      routes.push({
        method: isRead ? 'GET' : 'POST',
        path: routePath,
        name: dotName,
        handler: value as Function,
        description: `Call ${dotName}`,
      })
      // Also register the other method for convenience
      routes.push({
        method: isRead ? 'POST' : 'GET',
        path: routePath,
        name: dotName,
        handler: value as Function,
        description: `Call ${dotName}`,
      })
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects
      traverseModule(
        value as Record<string, unknown>,
        dotName,
        routePath,
        routes,
        { ...opts, currentDepth: opts.currentDepth + 1 },
      )
    }
  }
}

// =============================================================================
// Client Wrapping
// =============================================================================

/**
 * Wrap an SDK client instance and generate API routes from its methods.
 *
 * Traverses the client's prototype chain and nested resource objects:
 * - `client.customers.list()` -> `GET /namespace/customers/list`
 * - `client.customers.create()` -> `POST /namespace/customers/create`
 * - `client.charges.retrieve()` -> `GET /namespace/charges/retrieve`
 *
 * Methods matching `readMethods` are mapped to GET, others to POST.
 */
export function wrapClient(config: ClientWrapConfig): GeneratedRoute[] {
  const routes: GeneratedRoute[] = []
  const {
    client,
    namespace,
    include,
    exclude,
    maxDepth = 3,
    readMethods,
    basePath,
  } = config
  const prefix = basePath ?? `/${namespace}`
  const reads = readMethods ? new Set(readMethods) : DEFAULT_READ_METHODS

  traverseClient(client, namespace, prefix, routes, {
    include: include ? new Set(include) : undefined,
    exclude: exclude ? new Set(exclude) : undefined,
    reads,
    maxDepth,
    currentDepth: 0,
    visited: new WeakSet(),
  })

  return routes
}

interface ClientTraverseOptions {
  include?: Set<string>
  exclude?: Set<string>
  reads: Set<string>
  maxDepth: number
  currentDepth: number
  visited: WeakSet<object>
  /** When true, include filter was satisfied by a parent — allow all descendants */
  parentIncluded?: boolean
}

function traverseClient(
  obj: object,
  namePrefix: string,
  pathPrefix: string,
  routes: GeneratedRoute[],
  opts: ClientTraverseOptions,
): void {
  if (opts.currentDepth >= opts.maxDepth) return
  if (opts.visited.has(obj)) return
  opts.visited.add(obj)

  // Collect all enumerable own properties + prototype methods
  const allKeys = new Set<string>()

  // Own enumerable properties
  for (const key of Object.keys(obj)) {
    allKeys.add(key)
  }

  // Prototype methods (one level up, not Object.prototype)
  const proto = Object.getPrototypeOf(obj)
  if (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key !== 'constructor') {
        allKeys.add(key)
      }
    }
  }

  for (const key of allKeys) {
    if (SKIP_PROPERTIES.has(key)) continue
    if (key.startsWith('_')) continue

    const dotName = `${namePrefix}.${key}`

    // Check include/exclude at resource level
    const keyIncluded = opts.parentIncluded || !opts.include || opts.include.has(key) || opts.include.has(dotName)
    if (!keyIncluded) continue
    if (opts.exclude && (opts.exclude.has(key) || opts.exclude.has(dotName))) continue

    let value: unknown
    try {
      value = (obj as Record<string, unknown>)[key]
    } catch {
      // Some getters may throw
      continue
    }

    const routePath = `${pathPrefix}/${key}`

    if (typeof value === 'function') {
      const isRead = opts.reads.has(key)
      routes.push({
        method: isRead ? 'GET' : 'POST',
        path: routePath,
        name: dotName,
        handler: value.bind(obj),
        description: `Call ${dotName}`,
      })
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Nested resource (e.g., stripe.customers -> { list, create, ... })
      // If this key matched the include filter, allow all descendants
      const childParentIncluded = opts.parentIncluded || (opts.include !== undefined && (opts.include.has(key) || opts.include.has(dotName)))
      traverseClient(
        value as object,
        dotName,
        routePath,
        routes,
        { ...opts, currentDepth: opts.currentDepth + 1, visited: opts.visited, parentIncluded: childParentIncluded },
      )
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if an object looks like a Cloudflare service binding or DO stub.
 *
 * Service bindings have a `fetch` method. DO namespaces have `idFromName`.
 * Cloudflare binding proxies are transparent (`'anyProp' in stub` returns true),
 * so we check for the presence of specific methods.
 */
function isBinding(obj: Record<string, unknown>): boolean {
  // Check if it has binding-specific methods
  let bindingMethodCount = 0
  for (const key of BINDING_INDICATORS) {
    if (typeof obj[key] === 'function') {
      bindingMethodCount++
    }
  }
  // If it has 2+ binding indicator methods, it's likely a binding
  return bindingMethodCount >= 2
}

/**
 * Check if an object is a class instance (not a plain object).
 *
 * A class instance has a prototype chain beyond Object.prototype.
 * It may have prototype methods or own properties that are resource objects
 * (nested objects containing functions).
 */
function isClassInstance(obj: Record<string, unknown>): boolean {
  const proto = Object.getPrototypeOf(obj)
  if (!proto || proto === Object.prototype) return false

  // Check if the prototype has methods (beyond constructor)
  const protoKeys = Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor')
  const hasProtoMethods = protoKeys.some((k) => {
    try {
      return typeof proto[k] === 'function'
    } catch {
      return false
    }
  })

  if (hasProtoMethods) return true

  // Also consider it a class instance if it has nested resource objects
  // (e.g., stripe.customers = { list, create, ... })
  for (const key of Object.keys(obj)) {
    if (SKIP_PROPERTIES.has(key) || key.startsWith('_')) continue
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this nested object has callable methods
      for (const nv of Object.values(value as Record<string, unknown>)) {
        if (typeof nv === 'function') return true
      }
    }
  }

  return false
}

/**
 * Extract callable methods and nested resources from a class instance.
 */
function extractClientMethods(obj: Record<string, unknown>): {
  functions: Record<string, Function>
  namespaces: Record<string, Record<string, Function>>
} {
  const functions: Record<string, Function> = {}
  const namespaces: Record<string, Record<string, Function>> = {}

  // Own properties that are functions or resources
  for (const key of Object.keys(obj)) {
    if (SKIP_PROPERTIES.has(key) || key.startsWith('_')) continue
    const value = obj[key]

    if (typeof value === 'function') {
      functions[key] = value as Function
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Check if it's a nested resource with methods
      const nestedFns: Record<string, Function> = {}
      for (const [nk, nv] of Object.entries(value as Record<string, unknown>)) {
        if (typeof nv === 'function' && !SKIP_PROPERTIES.has(nk) && !nk.startsWith('_')) {
          nestedFns[nk] = nv as Function
        }
      }
      if (Object.keys(nestedFns).length > 0) {
        namespaces[key] = nestedFns
      }
    }
  }

  // Prototype methods
  const proto = Object.getPrototypeOf(obj)
  if (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor' || SKIP_PROPERTIES.has(key) || key.startsWith('_')) continue
      try {
        if (typeof proto[key] === 'function') {
          functions[key] = proto[key] as Function
        }
      } catch {
        // Skip inaccessible properties
      }
    }
  }

  return { functions, namespaces }
}
