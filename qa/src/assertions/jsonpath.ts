/**
 * Simple JSONPath expression evaluator
 * Supports dot notation and bracket notation: "data.user.name", "data['user']['name']", "items[0].id"
 */

/**
 * Parse a JSONPath expression into segments
 */
export function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = []
  let current = ''
  let inBracket = false
  let inQuote: string | null = null

  for (let i = 0; i < path.length; i++) {
    const char = path[i]

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null
      } else {
        current += char
      }
      continue
    }

    if (char === '"' || char === "'") {
      inQuote = char
      continue
    }

    if (char === '[') {
      if (current) {
        segments.push(current)
        current = ''
      }
      inBracket = true
      continue
    }

    if (char === ']') {
      if (current) {
        // Check if it's a number
        const num = parseInt(current, 10)
        if (!isNaN(num) && num.toString() === current) {
          segments.push(num)
        } else {
          segments.push(current)
        }
        current = ''
      }
      inBracket = false
      continue
    }

    if (char === '.' && !inBracket) {
      if (current) {
        segments.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    segments.push(current)
  }

  return segments
}

/**
 * Get a value from an object using a JSONPath expression
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path || path === '.') {
    return obj
  }

  const segments = parsePath(path)
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current !== 'object') {
      return undefined
    }

    if (Array.isArray(current)) {
      if (typeof segment === 'number') {
        current = current[segment]
      } else {
        return undefined
      }
    } else {
      current = (current as Record<string, unknown>)[segment.toString()]
    }
  }

  return current
}

/**
 * Set a value in an object using a JSONPath expression
 * Returns a new object with the value set (immutable)
 */
export function setValueByPath<T>(obj: T, path: string, value: unknown): T {
  if (!path || path === '.') {
    return value as T
  }

  const segments = parsePath(path)

  function setRecursive(current: unknown, index: number): unknown {
    if (index >= segments.length) {
      return value
    }

    const segment = segments[index]!

    if (typeof segment === 'number') {
      const arr = Array.isArray(current) ? [...current] : []
      arr[segment] = setRecursive(arr[segment], index + 1)
      return arr
    } else {
      const currentObj = typeof current === 'object' && current !== null
        ? { ...(current as Record<string, unknown>) }
        : {}
      currentObj[segment] = setRecursive(currentObj[segment], index + 1)
      return currentObj
    }
  }

  return setRecursive(obj, 0) as T
}

/**
 * Check if a path exists in an object
 */
export function hasPath(obj: unknown, path: string): boolean {
  if (!path || path === '.') {
    return true
  }

  const segments = parsePath(path)
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return false
    }

    if (typeof current !== 'object') {
      return false
    }

    if (Array.isArray(current)) {
      if (typeof segment === 'number' && segment >= 0 && segment < current.length) {
        current = current[segment]
      } else {
        return false
      }
    } else {
      const obj = current as Record<string, unknown>
      if (!(segment.toString() in obj)) {
        return false
      }
      current = obj[segment.toString()]
    }
  }

  return true
}
