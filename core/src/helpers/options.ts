/**
 * Options Block Builder
 *
 * Generates the standard `options` block for collection responses,
 * providing view-customization links like ?array toggle, $schema, and $facets.
 */

import type { Options } from '../types'

export interface BuildOptionsConfig {
  /** Base URL (e.g., 'https://crm.do') */
  baseUrl: string
  /** Tenant slug (e.g., 'acme') */
  tenant?: string
  /** Collection name (e.g., 'contacts') */
  collection: string
  /** Whether the current response is in array mode — swaps the toggle to show 'map' instead of 'array' */
  isArrayMode?: boolean
}

/**
 * Build the standard options block for a collection response.
 *
 * Default (map mode):
 * ```json
 * {
 *   "array": "https://crm.do/~acme/contacts?array",
 *   "schema": "https://crm.do/~acme/contacts/$schema",
 *   "facets": "https://crm.do/~acme/contacts/$facets"
 * }
 * ```
 *
 * Array mode (swaps toggle):
 * ```json
 * {
 *   "map": "https://crm.do/~acme/contacts",
 *   "schema": "https://crm.do/~acme/contacts/$schema",
 *   "facets": "https://crm.do/~acme/contacts/$facets"
 * }
 * ```
 *
 * @param config - Collection URL configuration
 * @param extra - Additional options to merge into the block
 */
export function buildOptions(config: BuildOptionsConfig, extra?: Options): Options {
  const base = config.baseUrl.replace(/\/+$/, '')
  const tenantPrefix = config.tenant ? `/~${config.tenant}` : ''
  const collectionPath = `${base}${tenantPrefix}/${config.collection}`

  const options: Options = {}

  // Format toggle — show the opposite of the current mode
  if (config.isArrayMode) {
    options.map = collectionPath
  } else {
    options.array = `${collectionPath}?array`
  }

  // Meta-resource links
  options.schema = `${collectionPath}/$schema`
  options.facets = `${collectionPath}/$facets`

  // Merge any additional options
  if (extra) {
    Object.assign(options, extra)
  }

  return options
}
