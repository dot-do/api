import { Hono } from 'hono'
import type { ApiEnv, RpcConfig } from '../types'

export function rpcConvention(config: RpcConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()

  // List available RPC methods
  app.get('/rpc', (c) => {
    return c.var.respond({
      data: {
        methods: config.methods || [],
      },
      actions: Object.fromEntries(
        (config.methods || []).map((method) => [
          method,
          { method: 'POST', href: `/rpc/${method}` },
        ]),
      ),
    })
  })

  // Execute RPC method
  app.post('/rpc/:method{.+}', async (c) => {
    const method = c.req.param('method')

    if (config.methods && !config.methods.includes(method)) {
      return c.var.respond({
        error: { message: `Unknown RPC method: ${method}`, code: 'METHOD_NOT_FOUND', status: 404 },
        status: 404,
      })
    }

    const params = await c.req.json().catch(() => ({}))

    // Try service binding first
    if (config.binding) {
      const binding = (c.env as Record<string, unknown>)[config.binding]
      if (binding && typeof binding === 'object') {
        const parts = method.split('.')
        let target: unknown = binding
        for (const part of parts) {
          target = (target as Record<string, unknown>)[part]
        }
        if (typeof target === 'function') {
          const result = await (target as (...args: unknown[]) => Promise<unknown>)(params)
          return c.var.respond({ data: result })
        }
      }
    }

    // Try rpc.do via dynamic import
    try {
      const rpc: Record<string, unknown> = await import('rpc.do')
      if (typeof rpc.call === 'function') {
        const result = await (rpc.call as (target: unknown, method: string, params: unknown) => Promise<unknown>)(config.url || config.binding, method, params)
        return c.var.respond({ data: result })
      }
    } catch {
      // rpc.do not available
    }

    return c.var.respond({
      error: { message: `Failed to execute RPC method: ${method}`, code: 'RPC_ERROR', status: 500 },
      status: 500,
    })
  })

  return app
}
