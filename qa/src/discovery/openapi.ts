/**
 * OpenAPI/Swagger Discovery - parse OpenAPI specs for REST endpoint tests
 */

import type { RestEndpoint, RestTestCase, JSONSchema } from '../types.js'

export interface OpenApiDiscoveryOptions {
  baseUrl: string
  specPath?: string
  timeout?: number
  headers?: Record<string, string>
}

interface OpenApiSpec {
  openapi?: string
  swagger?: string
  info: {
    title: string
    version: string
    description?: string
  }
  servers?: Array<{ url: string; description?: string }>
  paths: Record<string, OpenApiPathItem>
  components?: {
    schemas?: Record<string, JSONSchema>
    securitySchemes?: Record<string, unknown>
  }
}

interface OpenApiPathItem {
  get?: OpenApiOperation
  post?: OpenApiOperation
  put?: OpenApiOperation
  patch?: OpenApiOperation
  delete?: OpenApiOperation
  parameters?: OpenApiParameter[]
}

interface OpenApiOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: OpenApiParameter[]
  requestBody?: {
    description?: string
    required?: boolean
    content?: Record<string, { schema?: JSONSchema; examples?: Record<string, unknown> }>
  }
  responses: Record<string, {
    description: string
    content?: Record<string, { schema?: JSONSchema; examples?: Record<string, unknown> }>
  }>
  'x-tests'?: RestTestCase[]
}

interface OpenApiParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  schema?: JSONSchema
}

/**
 * Fetch OpenAPI spec from discovery endpoint
 */
export async function fetchOpenApiSpec(options: OpenApiDiscoveryOptions): Promise<OpenApiSpec> {
  const {
    baseUrl,
    specPath = '/openapi.json',
    timeout = 30000,
    headers: extraHeaders = {},
  } = options

  // Try multiple common paths
  const paths = [specPath, '/openapi.json', '/swagger.json', '/api-docs', '/openapi.yaml']

  for (const path of paths) {
    try {
      const url = new URL(path, baseUrl)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url.toString(), {
        headers: extraHeaders,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('yaml')) {
          // Would need yaml parser - for now just support JSON
          continue
        }
        return response.json() as Promise<OpenApiSpec>
      }
    } catch {
      // Try next path
      continue
    }
  }

  throw new Error('Could not find OpenAPI spec at any known location')
}

/**
 * Convert OpenAPI operation to REST endpoint
 */
function operationToEndpoint(
  path: string,
  method: string,
  operation: OpenApiOperation,
  pathParams?: OpenApiParameter[]
): RestEndpoint {
  const allParams = [...(pathParams || []), ...(operation.parameters || [])]

  // Build input schema from parameters and request body
  const inputProperties: Record<string, JSONSchema> = {}
  const requiredFields: string[] = []

  for (const param of allParams) {
    if (param.schema) {
      inputProperties[param.name] = param.schema
      if (param.required) {
        requiredFields.push(param.name)
      }
    }
  }

  // Add request body schema
  if (operation.requestBody?.content) {
    const jsonContent = operation.requestBody.content['application/json']
    if (jsonContent?.schema) {
      if (jsonContent.schema.properties) {
        Object.assign(inputProperties, jsonContent.schema.properties)
        if (jsonContent.schema.required) {
          requiredFields.push(...jsonContent.schema.required)
        }
      }
    }
  }

  const inputSchema: JSONSchema | undefined = Object.keys(inputProperties).length > 0
    ? {
        type: 'object',
        properties: inputProperties,
        required: requiredFields.length > 0 ? requiredFields : undefined,
      }
    : undefined

  // Build output schema from 2xx response
  let outputSchema: JSONSchema | undefined
  for (const [code, response] of Object.entries(operation.responses)) {
    if (code.startsWith('2') && response.content?.['application/json']?.schema) {
      outputSchema = response.content['application/json'].schema
      break
    }
  }

  return {
    path,
    method: method.toUpperCase() as RestEndpoint['method'],
    description: operation.summary || operation.description,
    inputSchema,
    outputSchema,
    tests: operation['x-tests'],
  }
}

/**
 * Extract endpoints from OpenAPI spec
 */
export function extractEndpoints(spec: OpenApiSpec): RestEndpoint[] {
  const endpoints: RestEndpoint[] = []

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods: Array<'get' | 'post' | 'put' | 'patch' | 'delete'> = ['get', 'post', 'put', 'patch', 'delete']

    for (const method of methods) {
      const operation = pathItem[method]
      if (operation) {
        endpoints.push(operationToEndpoint(path, method, operation, pathItem.parameters))
      }
    }
  }

  return endpoints
}

/**
 * Extract tests from endpoints
 */
export function extractTestsFromEndpoints(endpoints: RestEndpoint[]): RestTestCase[] {
  const tests: RestTestCase[] = []

  for (const endpoint of endpoints) {
    if (endpoint.tests) {
      for (const test of endpoint.tests) {
        tests.push({
          ...test,
          id: test.id || `rest.${endpoint.method}.${endpoint.path}.${test.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'rest',
          request: {
            ...test.request,
            method: test.request?.method || endpoint.method,
            path: test.request?.path || endpoint.path,
          },
        })
      }
    }
  }

  return tests
}

/**
 * Discover all tests from an OpenAPI spec
 */
export async function discoverOpenApiTests(options: OpenApiDiscoveryOptions): Promise<{
  spec: OpenApiSpec
  endpoints: RestEndpoint[]
  tests: RestTestCase[]
}> {
  const spec = await fetchOpenApiSpec(options)
  const endpoints = extractEndpoints(spec)
  const tests = extractTestsFromEndpoints(endpoints)

  return { spec, endpoints, tests }
}
