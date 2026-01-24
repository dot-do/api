/**
 * Validate command - validate a test specification file
 */

import { validateSchema } from '../../assertions/schema.js'
import type { TestCase, JSONSchema } from '../../types.js'
import { formatError } from '../utils.js'

export interface ValidateOptions {
  file: string
  verbose?: boolean
}

// Schema for test case validation
const testCaseSchema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    id: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    timeout: { type: 'number', minimum: 0 },
    skip: { oneOf: [{ type: 'boolean' }, { type: 'string' }] },
    only: { type: 'boolean' },
  },
  required: ['name'],
}

const rpcTestSchema: JSONSchema = {
  allOf: [
    testCaseSchema,
    {
      type: 'object',
      properties: {
        type: { enum: ['rpc', 'mcp'] },
        method: { type: 'string' },
        input: {},
        expect: {
          type: 'object',
          properties: {
            status: { enum: ['success', 'error'] },
            output: {},
            error: {
              type: 'object',
              properties: {
                code: {},
                message: {},
              },
            },
            match: { enum: ['exact', 'partial', 'schema'] },
          },
          required: ['status'],
        },
      },
      required: ['input', 'expect'],
    },
  ],
}

const restTestSchema: JSONSchema = {
  allOf: [
    testCaseSchema,
    {
      type: 'object',
      properties: {
        type: { const: 'rest' },
        request: {
          type: 'object',
          properties: {
            method: { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
            path: { type: 'string' },
            body: {},
            headers: { type: 'object' },
            query: { type: 'object' },
          },
        },
        expect: {
          type: 'object',
          properties: {
            status: {},
            headers: { type: 'object' },
            body: {},
            match: { enum: ['exact', 'partial', 'schema'] },
          },
          required: ['status'],
        },
      },
      required: ['request', 'expect'],
    },
  ],
}

const specSchema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    baseUrl: { type: 'string', format: 'uri' },
    tests: {
      type: 'array',
      items: {
        oneOf: [rpcTestSchema, restTestSchema],
      },
    },
    tools: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          tests: { type: 'array' },
        },
        required: ['name'],
      },
    },
  },
}

export async function validateCommand(options: ValidateOptions): Promise<number> {
  const { file, verbose } = options

  try {
    const fs = await import('fs')
    const path = await import('path')

    // Resolve file path
    const filePath = path.resolve(file)

    if (!fs.existsSync(filePath)) {
      console.error(formatError(new Error(`File not found: ${filePath}`)))
      return 1
    }

    // Read and parse file
    const content = fs.readFileSync(filePath, 'utf-8')
    let spec: unknown

    if (filePath.endsWith('.json')) {
      spec = JSON.parse(content)
    } else if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      // For JS/TS files, try to import them
      const module = await import(filePath)
      spec = module.default || module
    } else {
      console.error(formatError(new Error('Unsupported file format. Use .json, .js, or .ts')))
      return 1
    }

    // Validate against schema
    const result = validateSchema(spec, specSchema)

    if (result.valid) {
      console.log('')
      console.log('  Validation: PASSED')
      console.log('')

      // Count tests
      const specObj = spec as { tests?: TestCase[]; tools?: Array<{ name: string; tests?: TestCase[] }> }
      let testCount = specObj.tests?.length || 0

      if (specObj.tools) {
        for (const tool of specObj.tools) {
          testCount += tool.tests?.length || 0
        }
      }

      console.log(`  Tests found: ${testCount}`)
      console.log('')

      if (verbose && testCount > 0) {
        console.log('  Test names:')
        if (specObj.tests) {
          for (const test of specObj.tests) {
            console.log(`    - ${test.name}`)
          }
        }
        if (specObj.tools) {
          for (const tool of specObj.tools) {
            if (tool.tests) {
              for (const test of tool.tests) {
                console.log(`    - ${tool.name}: ${test.name}`)
              }
            }
          }
        }
        console.log('')
      }

      return 0
    } else {
      console.log('')
      console.log('  Validation: FAILED')
      console.log('')
      console.log('  Errors:')

      for (const error of result.errors) {
        console.log(`    ${error.path}: ${error.message}`)
        if (verbose) {
          console.log(`      Keyword: ${error.keyword}`)
          console.log(`      Params: ${JSON.stringify(error.params)}`)
        }
      }

      console.log('')
      return 1
    }
  } catch (error) {
    console.error(formatError(error as Error))
    return 1
  }
}
