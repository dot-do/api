/**
 * Collection Format Helpers
 *
 * Transforms collection list responses between two formats:
 *
 * **Map format** (default) — compact, browsable:
 *   { "Alice Johnson": "https://crm.do/~acme/contact_abc" }
 *
 * **Array format** (?array) — structured, programmatic:
 *   [{ "$id": "https://crm.do/~acme/contact_abc", "id": "contact_abc", "name": "Alice Johnson" }]
 */

export interface FormatOptions {
  /** Base URL for building entity URLs (e.g., 'https://crm.do') */
  baseUrl: string
  /** Tenant slug (e.g., 'acme') — omit for tenant-less URLs */
  tenant?: string
  /** Collection name (e.g., 'contacts') */
  collection: string
  /** Field to use as display name key. Auto-detects 'name', 'title', or first string field */
  titleField?: string
  /** When true, returns array format. When false/undefined, returns map format */
  array?: boolean
}

type Entity = Record<string, unknown>

/**
 * Build the entity URL for a given item.
 */
function buildEntityUrl(baseUrl: string, tenant: string | undefined, entityId: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  if (tenant) {
    return `${base}/~${tenant}/${entityId}`
  }
  return `${base}/${entityId}`
}

/**
 * Detect the best display field for an entity.
 * Priority: explicit titleField > 'name' > 'title' > 'id' > first string field
 */
function resolveDisplayValue(item: Entity, titleField?: string): string {
  // Explicit field
  if (titleField && item[titleField] !== undefined) {
    return String(item[titleField])
  }

  // Auto-detect common display fields
  if (typeof item.name === 'string' && item.name) return item.name
  if (typeof item.title === 'string' && item.title) return item.title
  if (typeof item.id === 'string' && item.id) return item.id

  // Fallback: first string field
  for (const value of Object.values(item)) {
    if (typeof value === 'string' && value) return value
  }

  return ''
}

/**
 * Resolve the entity identifier used for URL construction.
 * Prefers 'id', then first string field.
 */
function resolveEntityId(item: Entity): string {
  if (typeof item.id === 'string' && item.id) return item.id

  // Fallback: first string field value
  for (const value of Object.values(item)) {
    if (typeof value === 'string' && value) return value
  }

  return ''
}

/**
 * Transform an array of entities into a `{ displayName: url }` map.
 *
 * Default format — compact and browsable.
 */
export function toMapFormat(items: Entity[], opts: Omit<FormatOptions, 'array'>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const item of items) {
    const displayName = resolveDisplayValue(item, opts.titleField)
    const entityId = resolveEntityId(item)
    const url = buildEntityUrl(opts.baseUrl, opts.tenant, entityId)
    result[displayName] = url
  }

  return result
}

/**
 * Transform entities into an array with `$id`, `id`, and `name` fields.
 *
 * Array format — structured and programmatic.
 */
export function toArrayFormat(items: Entity[], opts: Omit<FormatOptions, 'array'>): Array<{ $id: string; id: string; name: string }> {
  return items.map((item) => {
    const entityId = resolveEntityId(item)
    const displayName = resolveDisplayValue(item, opts.titleField)
    const url = buildEntityUrl(opts.baseUrl, opts.tenant, entityId)

    return {
      $id: url,
      id: entityId,
      name: displayName,
    }
  })
}

/**
 * Auto-select format based on `opts.array` boolean.
 *
 * - `array: true` → structured array with `$id`, `id`, `name`
 * - `array: false/undefined` → compact map of `displayName → url`
 */
export function formatCollection(items: Entity[], opts: FormatOptions): Record<string, string> | Array<{ $id: string; id: string; name: string }> {
  if (opts.array) {
    return toArrayFormat(items, opts)
  }
  return toMapFormat(items, opts)
}

/**
 * Check if `?array` is present in the URL query string.
 *
 * Presence-only check — `?array`, `?array=`, and `?array=true` all return true.
 */
export function isArrayMode(url: URL): boolean {
  return url.searchParams.has('array')
}
