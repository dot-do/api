/**
 * CLI utility functions
 */

/**
 * Parse command line arguments into options object
 */
export function parseArgs(args: string[]): {
  command: string
  positional: string[]
  options: Record<string, string | boolean | string[]>
} {
  const command = args[0] || 'help'
  const positional: string[] = []
  const options: Record<string, string | boolean | string[]> = {}

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const eqIndex = key.indexOf('=')

      if (eqIndex > -1) {
        // --key=value format
        const name = key.slice(0, eqIndex)
        const value = key.slice(eqIndex + 1)
        addOption(options, name, value)
      } else {
        // --key value or --flag format
        const nextArg = args[i + 1]
        if (nextArg && !nextArg.startsWith('-')) {
          addOption(options, key, nextArg)
          i++
        } else {
          options[key] = true
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short flag -x
      const key = arg.slice(1)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        addOption(options, key, nextArg)
        i++
      } else {
        options[key] = true
      }
    } else {
      positional.push(arg)
    }
  }

  return { command, positional, options }
}

function addOption(options: Record<string, string | boolean | string[]>, key: string, value: string): void {
  const existing = options[key]
  if (existing === undefined) {
    options[key] = value
  } else if (Array.isArray(existing)) {
    existing.push(value)
  } else if (typeof existing === 'string') {
    options[key] = [existing, value]
  } else {
    options[key] = value
  }
}

/**
 * Print help message
 */
export function printHelp(): void {
  console.log(`
api.qa - TDD Testing Framework for REST, RPC & MCP APIs

USAGE:
  qa <command> [options]

COMMANDS:
  run <url>         Run tests against an API
  discover <url>    Discover available tests from an API
  types <url>       Generate TypeScript types from API schemas
  validate <file>   Validate a test specification file

OPTIONS:
  --tags <tags>     Filter tests by tags (comma-separated)
  --type <type>     Filter by protocol type (rest, mcp, rpc)
  --format <fmt>    Output format (json, tap, junit, console). Default: json
  --parallel        Run tests in parallel
  --timeout <ms>    Request timeout in milliseconds
  --retries <n>     Number of retries for failed tests
  --output <file>   Write output to file
  --base-url <url>  Override base URL for test execution
  --auth <type>     Authentication type (none, oauth2, bearer)
  --verbose         Show detailed output
  --help, -h        Show this help message
  --version, -v     Show version

EXAMPLES:
  qa run https://api.example.com
  qa run https://api.example.com --tags smoke,auth
  qa run https://api.example.com --format junit > results.xml
  qa discover https://api.example.com
  qa types https://api.example.com -o ./types/api.d.ts

ENVIRONMENT VARIABLES:
  QA_ACCESS_TOKEN   Bearer token for authentication
  QA_CLIENT_ID      OAuth 2.0 client ID
  QA_CLIENT_SECRET  OAuth 2.0 client secret
  QA_HEADERS        JSON string of additional headers
`)
}

/**
 * Print version
 */
export function printVersion(): void {
  // Read from package.json if available
  try {
    const pkg = require('../../package.json')
    console.log(`api.qa v${pkg.version}`)
  } catch {
    console.log('api.qa v0.1.0')
  }
}

/**
 * Format error for display
 */
export function formatError(error: Error): string {
  return `Error: ${error.message}`
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
