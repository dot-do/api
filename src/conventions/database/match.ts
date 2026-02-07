/**
 * Shared filter matching utilities
 *
 * MongoDB-style filter operators used by both the in-memory database
 * and the DatabaseDO production implementation.
 */

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
          case '$gt':
            if (typeof docVal !== 'number' || typeof opVal !== 'number' || docVal <= opVal) return false
            break
          case '$gte':
            if (typeof docVal !== 'number' || typeof opVal !== 'number' || docVal < opVal) return false
            break
          case '$lt':
            if (typeof docVal !== 'number' || typeof opVal !== 'number' || docVal >= opVal) return false
            break
          case '$lte':
            if (typeof docVal !== 'number' || typeof opVal !== 'number' || docVal > opVal) return false
            break
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
            if (pattern.length > 200) return false
            try {
              const re = new RegExp(pattern)
              if (typeof docVal !== 'string' || !re.test(docVal)) return false
            } catch {
              return false
            }
            break
          }
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
