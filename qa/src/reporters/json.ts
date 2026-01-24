/**
 * JSON Reporter - outputs test results as JSON
 */

import type { Reporter, TestResult, TestRun } from '../types.js'

export interface JsonReporterOptions {
  pretty?: boolean
  stream?: boolean
}

export class JsonReporter implements Reporter {
  private run: Partial<TestRun> = {}
  private results: TestResult[] = []
  private options: JsonReporterOptions

  constructor(options: JsonReporterOptions = {}) {
    this.options = {
      pretty: true,
      stream: false,
      ...options,
    }
  }

  onRunStart(run: Pick<TestRun, 'runId' | 'startedAt'>): void {
    this.run = { ...run, status: 'running', results: [] }

    if (this.options.stream) {
      console.log(JSON.stringify({ event: 'runStart', ...run }))
    }
  }

  onTestStart(test: Pick<TestResult, 'id' | 'name'>): void {
    if (this.options.stream) {
      console.log(JSON.stringify({ event: 'testStart', ...test }))
    }
  }

  onTestComplete(result: TestResult): void {
    this.results.push(result)

    if (this.options.stream) {
      console.log(JSON.stringify({ event: 'testComplete', result }))
    }
  }

  onRunComplete(run: TestRun): void {
    this.run = run

    if (!this.options.stream) {
      const output = this.options.pretty
        ? JSON.stringify(run, null, 2)
        : JSON.stringify(run)
      console.log(output)
    } else {
      console.log(JSON.stringify({ event: 'runComplete', summary: run.summary }))
    }
  }

  getOutput(): string {
    return this.options.pretty
      ? JSON.stringify(this.run, null, 2)
      : JSON.stringify(this.run)
  }

  getRun(): TestRun {
    return this.run as TestRun
  }
}

export function createJsonReporter(options?: JsonReporterOptions): JsonReporter {
  return new JsonReporter(options)
}
