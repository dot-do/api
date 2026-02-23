import { cors as honoCors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from '../types'

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => string | undefined | null)
  allowMethods?: string[]
  allowHeaders?: string[]
  exposeHeaders?: string[]
  maxAge?: number
  credentials?: boolean
}

export function corsMiddleware(options?: CorsOptions): MiddlewareHandler<ApiEnv> {
  return honoCors({
    origin: options?.origin || '*',
    allowMethods: options?.allowMethods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: options?.allowHeaders || ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: options?.exposeHeaders || ['X-Request-Id', 'X-Total-Count'],
    maxAge: options?.maxAge || 86400,
    credentials: options?.credentials ?? false,
  }) as unknown as MiddlewareHandler<ApiEnv>
}
