/**
 * Path validation utilities to prevent SSRF and path traversal attacks.
 */

export interface PathValidationResult {
  valid: boolean
  normalized: string
  error?: 'INVALID_PATH' | 'PATH_NOT_ALLOWED'
  message?: string
}

export interface PathValidationOptions {
  /** Optional list of allowed path prefixes for stricter access control */
  allowedPaths?: string[]
  /** Block requests with path traversal sequences (../) */
  blockTraversal?: boolean
  /** Original path before URL normalization (e.g., from X-Original-Path header) */
  originalPath?: string
}

/**
 * Checks if a raw path string contains path traversal sequences.
 *
 * @param path - The raw URL path to check
 * @returns true if traversal sequences are detected
 */
export function hasTraversalSequence(path: string): boolean {
  // First decode to catch encoded attacks
  let decoded: string
  try {
    // Handle double encoding
    decoded = path
    while (decoded !== decodeURIComponent(decoded)) {
      decoded = decodeURIComponent(decoded)
    }
  } catch {
    // If decoding fails, check the raw string
    decoded = path
  }

  // Check for .. sequence (path traversal)
  // Match: /../, /.., /..anything that might be normalized
  return /(?:^|\/)\.\.(\/|$)/.test(decoded)
}

/**
 * Normalizes a URL path by resolving . and .. segments,
 * and detecting path traversal attempts.
 *
 * @param path - The URL path to normalize
 * @returns Normalized path or null if path contains traversal that escapes root
 */
export function normalizePath(path: string): string | null {
  // Decode URL-encoded characters first to catch encoded attacks
  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // Invalid encoding - reject
    return null
  }

  // Split into segments
  const segments = decoded.split('/').filter(s => s !== '' && s !== '.')
  const result: string[] = []

  for (const segment of segments) {
    if (segment === '..') {
      // Attempting to go above root - this is a traversal attack
      if (result.length === 0) {
        return null
      }
      result.pop()
    } else {
      result.push(segment)
    }
  }

  // Check if the final path still contains any .. (shouldn't happen, but be safe)
  const normalized = '/' + result.join('/')
  if (normalized.includes('..')) {
    return null
  }

  return normalized
}

/**
 * Validates and normalizes a path for proxy use.
 *
 * @param path - The URL path to validate
 * @param options - Validation options
 * @returns Validation result with normalized path or error
 */
export function validateProxyPath(
  path: string,
  options?: PathValidationOptions
): PathValidationResult {
  const { allowedPaths, blockTraversal, originalPath } = options || {}

  // If blockTraversal is enabled, check for traversal sequences in original path
  if (blockTraversal) {
    const pathToCheck = originalPath || path
    if (hasTraversalSequence(pathToCheck)) {
      return {
        valid: false,
        normalized: '',
        error: 'INVALID_PATH',
        message: 'Path contains invalid traversal sequences'
      }
    }
  }

  // Normalize the path
  const normalized = normalizePath(path)

  if (normalized === null) {
    return {
      valid: false,
      normalized: '',
      error: 'INVALID_PATH',
      message: 'Path contains invalid traversal sequences'
    }
  }

  // If allowedPaths is specified, check that the normalized path starts with one of them
  if (allowedPaths && allowedPaths.length > 0) {
    const isAllowed = allowedPaths.some(allowed => {
      // Normalize the allowed path too for consistent comparison
      const normalizedAllowed = normalizePath(allowed) || allowed
      return normalized === normalizedAllowed ||
             normalized.startsWith(normalizedAllowed + '/')
    })

    if (!isAllowed) {
      return {
        valid: false,
        normalized,
        error: 'PATH_NOT_ALLOWED',
        message: `Path must start with one of: ${allowedPaths.join(', ')}`
      }
    }
  }

  return {
    valid: true,
    normalized
  }
}
