/**
 * RPC Discovery - fetch schema and tests from rpc.do servers
 */

import type { RpcMethod, RpcTestCase, RpcBatchTest, RpcPipelineTest } from '../types.js'

export interface RpcDiscoveryOptions {
  baseUrl: string
  schema?: string
  timeout?: number
  headers?: Record<string, string>
  accessToken?: string
}

export interface RpcSchema {
  name?: string
  version?: string
  methods: RpcMethod[]
  batchTests?: RpcBatchTest[]
  pipelineTests?: RpcPipelineTest[]
}

/**
 * Fetch RPC schema from discovery endpoint
 */
export async function fetchSchema(options: RpcDiscoveryOptions): Promise<RpcSchema> {
  const {
    baseUrl,
    schema = '/__schema',
    timeout = 30000,
    headers: extraHeaders = {},
    accessToken,
  } = options

  const url = new URL(schema, baseUrl)

  const headers: Record<string, string> = {
    ...extraHeaders,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`RPC schema fetch failed: ${response.status}`)
    }

    return response.json() as Promise<RpcSchema>
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Extract tests from RPC methods
 */
export function extractTestsFromMethods(methods: RpcMethod[]): RpcTestCase[] {
  const tests: RpcTestCase[] = []

  for (const method of methods) {
    if (method.tests) {
      for (const test of method.tests) {
        tests.push({
          ...test,
          id: test.id || `rpc.${method.path}.${test.name.replace(/\s+/g, '-').toLowerCase()}`,
          method: method.path,
          type: 'rpc',
        })
      }
    }
  }

  return tests
}

/**
 * Discover all tests from an RPC server
 */
export async function discoverRpcTests(options: RpcDiscoveryOptions): Promise<{
  schema: RpcSchema
  tests: RpcTestCase[]
  batchTests: RpcBatchTest[]
  pipelineTests: RpcPipelineTest[]
}> {
  const schema = await fetchSchema(options)
  const tests = extractTestsFromMethods(schema.methods)

  return {
    schema,
    tests,
    batchTests: schema.batchTests || [],
    pipelineTests: schema.pipelineTests || [],
  }
}
