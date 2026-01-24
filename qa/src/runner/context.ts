/**
 * Test Context - manages state between tests including auth tokens and variables
 */

import type { TestContext } from '../types.js'
import { getValueByPath } from '../assertions/jsonpath.js'

/**
 * Create a new test context
 */
export function createContext(options: Partial<TestContext> = {}): TestContext {
  return {
    baseUrl: options.baseUrl || '',
    accessToken: options.accessToken,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    variables: options.variables || {},
    headers: options.headers || {},
  }
}

/**
 * Clone a context with optional overrides
 */
export function cloneContext(context: TestContext, overrides: Partial<TestContext> = {}): TestContext {
  const { variables: overrideVars, headers: overrideHeaders, ...restOverrides } = overrides
  return {
    ...context,
    ...restOverrides,
    variables: { ...context.variables, ...(overrideVars || {}) },
    headers: { ...context.headers, ...(overrideHeaders || {}) },
  }
}

/**
 * Set a variable in the context
 */
export function setVariable(context: TestContext, key: string, value: unknown): TestContext {
  return {
    ...context,
    variables: {
      ...context.variables,
      [key]: value,
    },
  }
}

/**
 * Get a variable from the context
 */
export function getVariable(context: TestContext, key: string): unknown {
  return context.variables[key]
}

/**
 * Interpolate variables in a string
 * Supports ${var} and {{var}} syntax
 */
export function interpolate(template: string, context: TestContext): string {
  return template
    .replace(/\$\{(\w+)\}/g, (_, key) => {
      const value = context.variables[key]
      return value !== undefined ? String(value) : `\${${key}}`
    })
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = context.variables[key]
      return value !== undefined ? String(value) : `{{${key}}}`
    })
}

/**
 * Interpolate variables in an object recursively
 */
export function interpolateObject<T>(obj: T, context: TestContext): T {
  if (typeof obj === 'string') {
    return interpolate(obj, context) as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item, context)) as T
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, context)
    }
    return result as T
  }

  return obj
}

/**
 * Extract variables from a response and add to context
 * Uses JSONPath-like expressions to extract values
 */
export function extractVariables(
  response: unknown,
  extractions: Record<string, string>,
  context: TestContext
): TestContext {
  let newContext = context
  for (const [varName, path] of Object.entries(extractions)) {
    const value = getValueByPath(response, path)
    newContext = setVariable(newContext, varName, value)
  }

  return newContext
}

/**
 * Create context from environment variables
 */
export function createContextFromEnv(baseUrl: string): TestContext {
  const env = typeof process !== 'undefined' ? process.env : {}

  return createContext({
    baseUrl,
    accessToken: env.QA_ACCESS_TOKEN,
    clientId: env.QA_CLIENT_ID,
    clientSecret: env.QA_CLIENT_SECRET,
    headers: env.QA_HEADERS ? JSON.parse(env.QA_HEADERS) : {},
  })
}
