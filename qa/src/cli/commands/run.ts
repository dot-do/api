/**
 * Run command - execute tests against an API
 */

import { TestRunner } from '../../runner/index.js'
import { createReporter, type ReporterType } from '../../reporters/index.js'
import type { ProtocolType } from '../../types.js'
import { validateUrl, formatError } from '../utils.js'

export interface RunOptions {
  url: string
  tags?: string[]
  type?: ProtocolType
  format?: ReporterType
  parallel?: boolean
  timeout?: number
  retries?: number
  baseUrl?: string
  verbose?: boolean
  output?: string
}

export async function runCommand(options: RunOptions): Promise<number> {
  const { url, tags, format = 'console', parallel = false, timeout, retries, baseUrl, verbose } = options

  if (!validateUrl(url)) {
    console.error(formatError(new Error(`Invalid URL: ${url}`)))
    return 1
  }

  const reporter = createReporter(format, { verbose })

  const runner = new TestRunner({
    baseUrl: baseUrl || url,
    parallel,
    timeout,
    retries,
    tags,
    reporter,
  })

  try {
    const run = await runner.run()

    // Write to file if specified
    if (options.output && reporter.getOutput) {
      const fs = await import('fs')
      fs.writeFileSync(options.output, reporter.getOutput())
    }

    // Return exit code based on test results
    return run.summary.failed > 0 ? 1 : 0
  } catch (error) {
    console.error(formatError(error as Error))
    return 1
  }
}
