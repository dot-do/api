/**
 * JSON Schema validation using Ajv
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { JSONSchema, AssertionResult } from '../types.js'
import type { PartialMatchResult } from './partial.js'

let ajvInstance: Ajv | null = null

function getAjv(): Ajv {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    })
    addFormats(ajvInstance)
  }
  return ajvInstance
}

export interface SchemaValidationResult {
  valid: boolean
  errors: Array<{
    path: string
    message: string
    keyword: string
    params: Record<string, unknown>
  }>
}

/**
 * Validate a value against a JSON Schema
 */
export function validateSchema(value: unknown, schema: JSONSchema): SchemaValidationResult {
  const ajv = getAjv()

  // Create a unique key for this schema
  const schemaKey = `schema-${Date.now()}-${Math.random()}`

  try {
    const validate = ajv.compile(schema)
    const valid = validate(value)

    if (valid) {
      return { valid: true, errors: [] }
    }

    const errors = (validate.errors || []).map((err) => ({
      path: err.instancePath || '.',
      message: err.message || 'Validation failed',
      keyword: err.keyword,
      params: err.params as Record<string, unknown>,
    }))

    return { valid: false, errors }
  } finally {
    // Clean up compiled schema
    ajv.removeSchema(schemaKey)
  }
}

/**
 * Match a value against a JSON Schema and return assertion results
 */
export function matchSchema(actual: unknown, schema: JSONSchema): PartialMatchResult {
  const result = validateSchema(actual, schema)
  const assertions: AssertionResult[] = []

  if (result.valid) {
    assertions.push({
      path: '.',
      expected: 'matches schema',
      actual: 'matches schema',
      passed: true,
    })
  } else {
    for (const error of result.errors) {
      assertions.push({
        path: error.path || '.',
        expected: `${error.keyword}: ${JSON.stringify(error.params)}`,
        actual: 'validation failed',
        passed: false,
        message: error.message,
      })
    }
  }

  return { passed: result.valid, assertions }
}

/**
 * Generate a JSON Schema from a sample value
 * Useful for creating schemas from examples
 */
export function inferSchema(value: unknown): JSONSchema {
  if (value === null) {
    return { type: 'null' }
  }

  if (value === undefined) {
    return {}
  }

  if (typeof value === 'string') {
    const schema: JSONSchema = { type: 'string' }

    // Try to infer format
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      schema.format = 'email'
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      schema.format = 'date-time'
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      schema.format = 'date'
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      schema.format = 'uuid'
    }

    return schema
  }

  if (typeof value === 'number') {
    return { type: Number.isInteger(value) ? 'integer' : 'number' }
  }

  if (typeof value === 'boolean') {
    return { type: 'boolean' }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array' }
    }

    // Infer item schema from first element
    return {
      type: 'array',
      items: inferSchema(value[0]),
    }
  }

  if (typeof value === 'object') {
    const properties: Record<string, JSONSchema> = {}
    const required: string[] = []

    for (const [key, val] of Object.entries(value)) {
      properties[key] = inferSchema(val)
      if (val !== undefined && val !== null) {
        required.push(key)
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    }
  }

  return {}
}
