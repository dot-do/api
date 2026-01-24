/**
 * Discover command - list available tests from an API
 */

import { discover } from '../../discovery/index.js'
import type { ProtocolType } from '../../types.js'
import { validateUrl, formatError } from '../utils.js'

export interface DiscoverOptions {
  url: string
  format?: 'console' | 'json'
  type?: ProtocolType
  verbose?: boolean
}

export async function discoverCommand(options: DiscoverOptions): Promise<number> {
  const { url, format = 'console', verbose } = options

  if (!validateUrl(url)) {
    console.error(formatError(new Error(`Invalid URL: ${url}`)))
    return 1
  }

  try {
    const result = await discover({ baseUrl: url })

    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2))
      return 0
    }

    // Console format
    console.log('')
    console.log('  API.QA Discovery')
    console.log('  ================')
    console.log('')

    console.log(`  Target: ${url}`)
    console.log(`  Total tests: ${result.summary.total}`)
    console.log('')

    if (result.summary.total === 0) {
      console.log('  No tests discovered.')
      console.log('')
      console.log('  Make sure the API exposes tests through:')
      console.log('    - /qa endpoint (tests/list method)')
      console.log('    - /mcp endpoint with embedded tool tests')
      console.log('    - /__schema endpoint for RPC tests')
      console.log('    - OpenAPI spec with x-tests extensions')
      console.log('')
      return 0
    }

    // Show by type
    console.log('  By Protocol:')
    for (const [type, count] of Object.entries(result.summary.byType)) {
      if (count > 0) {
        console.log(`    ${type}: ${count}`)
      }
    }
    console.log('')

    // Show individual tests
    if (verbose) {
      console.log('  Tests:')
      for (const test of result.allTests) {
        const tags = test.tags ? ` [${test.tags.join(', ')}]` : ''
        console.log(`    - ${test.name}${tags}`)
      }
      console.log('')
    }

    // Show MCP tools if available
    if (result.mcp && verbose) {
      console.log('  MCP Tools:')
      for (const tool of result.mcp.tools) {
        const testCount = tool.tests?.length || 0
        console.log(`    - ${tool.name} (${testCount} tests)`)
      }
      console.log('')
    }

    // Show RPC methods if available
    if (result.rpc && verbose) {
      console.log('  RPC Methods:')
      for (const method of result.rpc.schema.methods) {
        const testCount = method.tests?.length || 0
        console.log(`    - ${method.path} (${testCount} tests)`)
      }
      console.log('')
    }

    return 0
  } catch (error) {
    console.error(formatError(error as Error))
    return 1
  }
}
