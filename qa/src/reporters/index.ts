/**
 * Reporters module - exports all reporters
 */

export { ConsoleReporter, createConsoleReporter } from './console.js'
export { JsonReporter, createJsonReporter, type JsonReporterOptions } from './json.js'
export { TapReporter, createTapReporter } from './tap.js'
export { JunitReporter, createJunitReporter, type JunitReporterOptions } from './junit.js'

import type { Reporter } from '../types.js'
import { createConsoleReporter } from './console.js'
import { createJsonReporter } from './json.js'
import { createTapReporter } from './tap.js'
import { createJunitReporter } from './junit.js'

export type ReporterType = 'json' | 'console' | 'tap' | 'junit'

export interface ReporterOptions {
  verbose?: boolean
  pretty?: boolean
  stream?: boolean
  suiteName?: string
}

/**
 * Create a reporter by type
 */
export function createReporter(type: ReporterType = 'json', options: ReporterOptions = {}): Reporter {
  switch (type) {
    case 'json':
      return createJsonReporter({ pretty: options.pretty ?? true, stream: options.stream })
    case 'console':
      return createConsoleReporter({ verbose: options.verbose })
    case 'tap':
      return createTapReporter()
    case 'junit':
      return createJunitReporter({ suiteName: options.suiteName })
    default:
      return createJsonReporter({ pretty: true })
  }
}
