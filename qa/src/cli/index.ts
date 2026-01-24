/**
 * CLI Entry Point
 */

import { parseArgs, printHelp, printVersion } from './utils.js'
import { runCommand } from './commands/run.js'
import { discoverCommand } from './commands/discover.js'
import { typesCommand } from './commands/types.js'
import { validateCommand } from './commands/validate.js'
import type { ReporterType } from '../reporters/index.js'
import type { ProtocolType } from '../types.js'

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { command, positional, options } = parseArgs(argv)

  // Handle help and version flags
  if (options.help || options.h || command === 'help') {
    printHelp()
    return 0
  }

  if (options.version || options.v || command === 'version') {
    printVersion()
    return 0
  }

  // Parse common options
  const tags = options.tags
    ? (typeof options.tags === 'string' ? options.tags.split(',') : options.tags as string[])
    : undefined

  switch (command) {
    case 'run': {
      const url = positional[0]
      if (!url) {
        console.error('Error: URL is required')
        console.error('Usage: qa run <url>')
        return 1
      }

      return runCommand({
        url,
        tags,
        type: options.type as ProtocolType | undefined,
        format: (options.format || options.reporter) as ReporterType | undefined,
        parallel: !!options.parallel,
        timeout: options.timeout ? parseInt(options.timeout as string, 10) : undefined,
        retries: options.retries ? parseInt(options.retries as string, 10) : undefined,
        baseUrl: options['base-url'] as string | undefined,
        verbose: !!options.verbose,
        output: (options.output || options.o) as string | undefined,
      })
    }

    case 'discover': {
      const url = positional[0]
      if (!url) {
        console.error('Error: URL is required')
        console.error('Usage: qa discover <url>')
        return 1
      }

      return discoverCommand({
        url,
        format: options.format as 'console' | 'json' | undefined,
        type: options.type as ProtocolType | undefined,
        verbose: !!options.verbose,
      })
    }

    case 'types': {
      const url = positional[0]
      if (!url) {
        console.error('Error: URL is required')
        console.error('Usage: qa types <url>')
        return 1
      }

      return typesCommand({
        url,
        output: (options.output || options.o) as string | undefined,
        namespace: options.namespace as string | undefined,
      })
    }

    case 'validate': {
      const file = positional[0]
      if (!file) {
        console.error('Error: File path is required')
        console.error('Usage: qa validate <file>')
        return 1
      }

      return validateCommand({
        file,
        verbose: !!options.verbose,
      })
    }

    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      return 1
  }
}

// Export for testing
export { parseArgs, printHelp, printVersion } from './utils.js'
export { runCommand } from './commands/run.js'
export { discoverCommand } from './commands/discover.js'
export { typesCommand } from './commands/types.js'
export { validateCommand } from './commands/validate.js'
