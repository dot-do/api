/**
 * Dual filter syntax parser for @dotdo/api
 *
 * Supports two filter syntaxes that produce the same MongoDB-style filter:
 *   - Symbolic (shorthand): ?status=Active, ?amount>10000, ?name~alice
 *   - Dot-suffix (canonical): ?status.eq=Active, ?amount.gt=10000, ?name.contains=alice
 */

const RESERVED_PARAMS = new Set([
  'page', 'limit', 'after', 'before', 'array', 'raw', 'debug',
  'domains', 'count', 'distinct', 'stream', 'format', 'depth',
  'include', 'fields', 'exclude', 'sort', 'q',
])

const DOT_SUFFIX_OPS = new Set([
  'eq', 'in', 'not', 'gt', 'gte', 'lt', 'lte',
  'contains', 'starts', 'ends', 'exists', 'between', 'nin',
  'ne', 'regex',
])

// Symbolic operator regex: key!=val, key>=val, key<=val, key>val, key<val, key~val
// Must test >= before >, <= before < to avoid partial matches
const SYMBOLIC_REGEX = /^([a-zA-Z_$][\w.$]*)(!?=|>=|<=|>|<|~)(.*)$/

export interface ParseFilterResult {
  filter: Record<string, any>
  sort: Record<string, 1 | -1>
  fields?: string[]
  exclude?: string[]
}

export interface ParseFilterOptions {
  reservedParams?: Set<string>
}

/**
 * Coerce a string value to the appropriate JS type.
 * Numbers become numbers, 'true'/'false' become booleans, otherwise stays string.
 */
function coerceValue(val: string): string | number | boolean {
  if (val === 'true') return true
  if (val === 'false') return false
  // Only coerce if the entire string is a valid finite number
  if (val !== '' && !isNaN(Number(val)) && isFinite(Number(val))) {
    return Number(val)
  }
  return val
}

/**
 * Coerce an array of strings — only coerces all elements to numbers
 * if every element is numeric. Otherwise returns strings.
 */
function coerceArray(values: string[]): (string | number)[] {
  const allNumeric = values.every((v) => v !== '' && !isNaN(Number(v)) && isFinite(Number(v)))
  if (allNumeric) {
    return values.map(Number)
  }
  return values
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse a dot-suffix param into field name and operator.
 * Returns null if the suffix is not a recognized operator (meaning it is a nested field, not a filter op).
 */
function parseDotSuffix(key: string): { field: string, op: string } | null {
  const lastDot = key.lastIndexOf('.')
  if (lastDot === -1) return null

  const suffix = key.slice(lastDot + 1)
  if (!DOT_SUFFIX_OPS.has(suffix)) return null

  const field = key.slice(0, lastDot)
  if (!field) return null

  return { field, op: suffix }
}

/**
 * Apply a single dot-suffix operation to the filter.
 */
function applyDotSuffix(filter: Record<string, any>, field: string, op: string, value: string): void {
  switch (op) {
    case 'eq': {
      filter[field] = { $eq: coerceValue(value) }
      break
    }
    case 'in': {
      const parts = value.split(',')
      filter[field] = { $in: coerceArray(parts) }
      break
    }
    case 'not':
    case 'ne': {
      filter[field] = { $ne: coerceValue(value) }
      break
    }
    case 'gt': {
      filter[field] = { $gt: coerceValue(value) }
      break
    }
    case 'gte': {
      filter[field] = { $gte: coerceValue(value) }
      break
    }
    case 'lt': {
      filter[field] = { $lt: coerceValue(value) }
      break
    }
    case 'lte': {
      filter[field] = { $lte: coerceValue(value) }
      break
    }
    case 'contains':
    case 'regex': {
      filter[field] = { $regex: value }
      break
    }
    case 'starts': {
      filter[field] = { $regex: `^${value}` }
      break
    }
    case 'ends': {
      filter[field] = { $regex: `${escapeRegex(value)}$` }
      break
    }
    case 'exists': {
      filter[field] = { $exists: value === 'true' }
      break
    }
    case 'between': {
      const [low, high] = value.split(',')
      filter[field] = { $gte: coerceValue(low ?? ''), $lte: coerceValue(high ?? '') }
      break
    }
    case 'nin': {
      const items = value.split(',')
      filter[field] = { $nin: coerceArray(items) }
      break
    }
  }
}

/**
 * Apply a symbolic operator to the filter.
 */
function applySymbolic(filter: Record<string, any>, field: string, op: string, value: string): void {
  switch (op) {
    case '=': {
      // Comma-separated → $in, otherwise $eq
      if (value.includes(',')) {
        const parts = value.split(',')
        filter[field] = { $in: coerceArray(parts) }
      } else {
        filter[field] = { $eq: coerceValue(value) }
      }
      break
    }
    case '!=': {
      filter[field] = { $ne: coerceValue(value) }
      break
    }
    case '>': {
      filter[field] = { $gt: coerceValue(value) }
      break
    }
    case '>=': {
      filter[field] = { $gte: coerceValue(value) }
      break
    }
    case '<': {
      filter[field] = { $lt: coerceValue(value) }
      break
    }
    case '<=': {
      filter[field] = { $lte: coerceValue(value) }
      break
    }
    case '~': {
      filter[field] = { $regex: value }
      break
    }
  }
}

/**
 * Parse sort parameter string into a sort object.
 *
 * Supports:
 *   - Prefix: `name` (asc), `-name` (desc)
 *   - Dot-suffix: `name.asc`, `name.desc`
 *   - Multi-field: `-createdAt,name` or `createdAt.desc,name.asc`
 */
export function parseSort(sortParam: string): Record<string, 1 | -1> {
  if (!sortParam) return {}

  const sort: Record<string, 1 | -1> = {}
  const fields = sortParam.split(',')

  for (const field of fields) {
    const trimmed = field.trim()
    if (!trimmed) continue

    // Check for dot-suffix syntax: name.asc or name.desc
    if (trimmed.endsWith('.asc')) {
      sort[trimmed.slice(0, -4)] = 1
    } else if (trimmed.endsWith('.desc')) {
      sort[trimmed.slice(0, -5)] = -1
    } else if (trimmed.startsWith('-')) {
      sort[trimmed.slice(1)] = -1
    } else {
      sort[trimmed] = 1
    }
  }

  return sort
}

/**
 * Canonicalize a sort object to a dot-suffix string.
 */
export function canonicalizeSort(sort: Record<string, 1 | -1>): string {
  const entries = Object.entries(sort)
  if (entries.length === 0) return ''

  return entries
    .map(([field, dir]) => `${field}.${dir === 1 ? 'asc' : 'desc'}`)
    .join(',')
}

/**
 * Parse query parameters into a structured filter result.
 *
 * Supports two syntaxes:
 *   - Symbolic: ?status=Active, ?amount>10000, ?status!=Churned, ?name~alice
 *   - Dot-suffix: ?status.eq=Active, ?amount.gt=10000, ?name.contains=alice
 *
 * Reserved params (page, limit, sort, fields, etc.) are NOT treated as filters.
 */
export function parseFilters(searchParams: URLSearchParams, opts?: ParseFilterOptions): ParseFilterResult {
  const reserved = opts?.reservedParams ?? RESERVED_PARAMS
  const filter: Record<string, any> = {}
  const result: ParseFilterResult = { filter, sort: {} }

  // Extract sort
  const sortParam = searchParams.get('sort')
  if (sortParam) {
    result.sort = parseSort(sortParam)
  }

  // Extract fields
  const fieldsParam = searchParams.get('fields')
  if (fieldsParam) {
    result.fields = fieldsParam.split(',').filter(Boolean)
    if (result.fields.length === 0) result.fields = undefined
  }

  // Extract exclude
  const excludeParam = searchParams.get('exclude')
  if (excludeParam) {
    result.exclude = excludeParam.split(',').filter(Boolean)
    if (result.exclude.length === 0) result.exclude = undefined
  }

  // Process each param
  //
  // URLSearchParams behavior with symbolic operators:
  //   "status!=Churned"  → key="status!", value="Churned"
  //   "amount>=10000"    → key="amount>", value="10000"
  //   "amount<=50000"    → key="amount<", value="50000"
  //   "amount>10000"     → key="amount>10000", value=""
  //   "amount<50000"     → key="amount<50000", value=""
  //   "name~alice"       → key="name~alice", value=""
  //
  // So for operators without '=' the value ends up in the key.
  // We reconstruct key=value and re-parse with the symbolic regex.

  for (const [rawKey, rawValue] of searchParams.entries()) {
    // Skip reserved params (only for clean key names)
    if (reserved.has(rawKey)) continue

    // Try dot-suffix syntax first (only when value is non-empty)
    if (rawValue !== '') {
      const dotParsed = parseDotSuffix(rawKey)
      if (dotParsed) {
        applyDotSuffix(filter, dotParsed.field, dotParsed.op, rawValue)
        continue
      }
    }

    // Try symbolic syntax — reconstruct the full key=value pair
    const fullParam = rawValue ? `${rawKey}=${rawValue}` : rawKey
    const match = SYMBOLIC_REGEX.exec(fullParam)
    if (match) {
      const [, field, op, value] = match
      if (field && !reserved.has(field) && value !== '') {
        applySymbolic(filter, field, op!, value!)
        continue
      }
    }

    // Skip empty values for plain equality fallback
    if (rawValue === '') continue

    // No operator found — treat as plain equality
    if (rawValue.includes(',')) {
      filter[rawKey] = { $in: coerceArray(rawValue.split(',')) }
    } else {
      filter[rawKey] = { $eq: coerceValue(rawValue) }
    }
  }

  return result
}

/**
 * Canonicalize a MongoDB-style filter object to dot-suffix URL params.
 *
 * Produces a deterministic, sorted query string in canonical dot-suffix form.
 */
export function canonicalizeFilter(filter: Record<string, any>): string {
  const params = new URLSearchParams()

  // Sort fields alphabetically for deterministic output
  const fields = Object.keys(filter).sort()

  for (const field of fields) {
    const ops = filter[field]
    if (typeof ops !== 'object' || ops === null) continue

    const opKeys = Object.keys(ops)

    // Detect between pattern: $gte + $lte on same field with exactly 2 ops
    if (opKeys.length === 2 && '$gte' in ops && '$lte' in ops) {
      params.set(`${field}.between`, `${ops.$gte},${ops.$lte}`)
      continue
    }

    for (const op of opKeys) {
      const value = ops[op]

      switch (op) {
        case '$eq':
          params.set(`${field}.eq`, String(value))
          break
        case '$ne':
          params.set(`${field}.not`, String(value))
          break
        case '$gt':
          params.set(`${field}.gt`, String(value))
          break
        case '$gte':
          params.set(`${field}.gte`, String(value))
          break
        case '$lt':
          params.set(`${field}.lt`, String(value))
          break
        case '$lte':
          params.set(`${field}.lte`, String(value))
          break
        case '$in':
          params.set(`${field}.in`, (value as any[]).join(','))
          break
        case '$nin':
          params.set(`${field}.nin`, (value as any[]).join(','))
          break
        case '$exists':
          params.set(`${field}.exists`, String(value))
          break
        case '$regex': {
          const regex = value as string
          if (regex.startsWith('^')) {
            params.set(`${field}.starts`, regex.slice(1))
          } else if (regex.endsWith('$')) {
            params.set(`${field}.ends`, regex.slice(0, -1))
          } else {
            params.set(`${field}.contains`, regex)
          }
          break
        }
      }
    }
  }

  return params.toString()
}
