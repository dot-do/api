/**
 * Shared filter matching utilities
 *
 * MongoDB-style filter operators used by both the in-memory database
 * and the DatabaseDO production implementation.
 */

/**
 * Check whether a regex pattern is safe from catastrophic backtracking (ReDoS).
 *
 * Rejects:
 * - Nested quantifiers like `(a+)+`, `(a*)*`, `(a+)*`, `(a{2,})+`
 * - Excessive capturing groups (>10)
 * - Patterns longer than 200 characters
 */
export function isSafeRegex(pattern: string): boolean {
  if (pattern.length > 200) return false
  // Reject nested quantifiers: a quantifier (+, *, ?, {n,m}) immediately after a group close
  // that itself is followed by another quantifier — the classic ReDoS shape
  if (/(\+|\*|\?|\{[^}]*\})\s*\)[\+\*\?]/.test(pattern)) return false
  if (/(\+|\*|\?|\{[^}]*\})\s*\)\{/.test(pattern)) return false
  // Reject excessive capturing groups
  const groupCount = (pattern.match(/\(/g) || []).length
  if (groupCount > 10) return false
  return true
}

/**
 * Coerce a value to a number if possible, returning the original value if not.
 * Useful for comparison operators where query param values arrive as strings.
 */
function toComparable(val: unknown): number | string | unknown {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const num = Number(val)
    if (!isNaN(num) && val !== '') return num
    // Return the string as-is for lexicographic comparison (dates, etc.)
    return val
  }
  return val
}

/**
 * Match a document against a where clause with MongoDB-style operators
 *
 * Supported operators:
 * - Logical: $or, $and, $not, $nor
 * - Comparison: $eq, $ne, $gt, $gte, $lt, $lte
 * - Array: $in, $nin
 * - Element: $exists
 * - String: $regex
 */
export function matchesWhere(doc: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, condition] of Object.entries(where)) {
    // Logical operators
    if (key === '$or') {
      if (!Array.isArray(condition)) return false
      const clauses = condition as Record<string, unknown>[]
      if (!clauses.some((clause) => matchesWhere(doc, clause))) return false
      continue
    }
    if (key === '$and') {
      if (!Array.isArray(condition)) return false
      const clauses = condition as Record<string, unknown>[]
      if (!clauses.every((clause) => matchesWhere(doc, clause))) return false
      continue
    }
    if (key === '$not') {
      if (matchesWhere(doc, condition as Record<string, unknown>)) return false
      continue
    }
    if (key === '$nor') {
      if (!Array.isArray(condition)) return false
      const clauses = condition as Record<string, unknown>[]
      if (clauses.some((clause) => matchesWhere(doc, clause))) return false
      continue
    }

    const docVal = doc[key]

    // Operator object: { $gt: 5, $lt: 10 }
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      const ops = condition as Record<string, unknown>
      for (const [op, opVal] of Object.entries(ops)) {
        switch (op) {
          case '$eq':
            if (docVal !== opVal) return false
            break
          case '$ne':
            if (docVal === opVal) return false
            break
          case '$gt': {
            const a = toComparable(docVal)
            const b = toComparable(opVal)
            if (typeof a === 'number' && typeof b === 'number') {
              if (a <= b) return false
            } else if (typeof a === 'string' && typeof b === 'string') {
              if (a <= b) return false
            } else {
              return false
            }
            break
          }
          case '$gte': {
            const a = toComparable(docVal)
            const b = toComparable(opVal)
            if (typeof a === 'number' && typeof b === 'number') {
              if (a < b) return false
            } else if (typeof a === 'string' && typeof b === 'string') {
              if (a < b) return false
            } else {
              return false
            }
            break
          }
          case '$lt': {
            const a = toComparable(docVal)
            const b = toComparable(opVal)
            if (typeof a === 'number' && typeof b === 'number') {
              if (a >= b) return false
            } else if (typeof a === 'string' && typeof b === 'string') {
              if (a >= b) return false
            } else {
              return false
            }
            break
          }
          case '$lte': {
            const a = toComparable(docVal)
            const b = toComparable(opVal)
            if (typeof a === 'number' && typeof b === 'number') {
              if (a > b) return false
            } else if (typeof a === 'string' && typeof b === 'string') {
              if (a > b) return false
            } else {
              return false
            }
            break
          }
          case '$in':
            if (!Array.isArray(opVal) || !opVal.includes(docVal)) return false
            break
          case '$nin':
            if (Array.isArray(opVal) && opVal.includes(docVal)) return false
            break
          case '$exists':
            if (opVal ? docVal === undefined : docVal !== undefined) return false
            break
          case '$regex': {
            const pattern = String(opVal)
            if (!isSafeRegex(pattern)) return false
            try {
              // Read $options sibling (e.g. 'i' for case-insensitive)
              const flags = typeof ops.$options === 'string' ? ops.$options : ''
              const re = new RegExp(pattern, flags)
              if (typeof docVal !== 'string' || !re.test(docVal)) return false
            } catch {
              return false
            }
            break
          }
          case '$options':
            // Handled alongside $regex — skip
            break
        }
      }
    } else {
      // Simple equality
      if (docVal !== condition) return false
    }
  }
  return true
}

/**
 * Coerce a string value to its appropriate JS type
 *
 * - 'true'/'false' -> boolean
 * - 'null' -> null
 * - numeric strings -> number
 * - everything else -> string
 */
export function coerceValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  const num = Number(value)
  if (!isNaN(num) && value !== '') return num
  return value
}
