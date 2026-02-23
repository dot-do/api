/**
 * Self-describing Entity ID Parser
 *
 * Parses entity IDs in the format `{type}_{sqid}` where:
 * - `type` is the singular entity type (e.g., 'contact', 'deal', 'featureFlag')
 * - `sqid` is the short unique identifier
 *
 * The type prefix is used to determine the collection (plural form)
 * without requiring a separate collection segment in the URL.
 */

/**
 * Result of parsing a self-describing entity ID
 */
export interface ParsedEntityId {
  /** Singular entity type (e.g., 'contact', 'deal') */
  type: string
  /** Plural collection name (e.g., 'contacts', 'deals') */
  collection: string
  /** Full ID including type prefix (e.g., 'contact_abc') */
  id: string
  /** Just the sqid portion after the underscore (e.g., 'abc') */
  sqid: string
}

/**
 * Simple pluralization matching the convention used in database/schema.ts
 */
function pluralize(word: string): string {
  if (word.endsWith('y') && !['ay', 'ey', 'oy', 'uy'].some((s) => word.endsWith(s))) {
    return word.slice(0, -1) + 'ies'
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es'
  }
  return word + 's'
}

/**
 * Check if a path segment looks like a self-describing entity ID.
 *
 * Matches the pattern: `{type}_{sqid}` where:
 * - type is one or more lowercase/camelCase word characters
 * - sqid is one or more alphanumeric characters
 *
 * Does NOT match:
 * - Plain words without underscores (e.g., 'contacts')
 * - Strings starting with $ (meta-resources)
 * - Strings containing ( (function calls)
 * - Strings starting with ~ (tenant prefixes)
 */
export function isEntityId(segment: string): boolean {
  if (!segment || segment.startsWith('$') || segment.startsWith('~') || segment.includes('(')) {
    return false
  }
  // Must contain at least one underscore, with non-empty parts on both sides
  // Type prefix: lowercase letter followed by word chars (camelCase ok)
  // Sqid: alphanumeric characters
  return /^[a-z][a-zA-Z]*_[a-zA-Z0-9]+$/.test(segment)
}

/**
 * Parse a self-describing entity ID into its components.
 *
 * @param id - The entity ID string (e.g., 'contact_abc', 'deal_kRziM')
 * @returns Parsed entity ID or null if the string is not a valid entity ID
 *
 * @example
 * parseEntityId('contact_abc')
 * // => { type: 'contact', collection: 'contacts', id: 'contact_abc', sqid: 'abc' }
 *
 * @example
 * parseEntityId('deal_kRziM')
 * // => { type: 'deal', collection: 'deals', id: 'deal_kRziM', sqid: 'kRziM' }
 *
 * @example
 * parseEntityId('featureFlag_x9z')
 * // => { type: 'featureFlag', collection: 'featureFlags', id: 'featureFlag_x9z', sqid: 'x9z' }
 */
export function parseEntityId(id: string): ParsedEntityId | null {
  if (!isEntityId(id)) return null

  const underscoreIndex = id.indexOf('_')
  const type = id.slice(0, underscoreIndex)
  const sqid = id.slice(underscoreIndex + 1)

  return {
    type,
    collection: pluralize(type),
    id,
    sqid,
  }
}
