/**
 * Transformation Pipelines Sub-module
 *
 * Handles chained transformation pipelines for data processing.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  PipelineDef,
  FunctionContext,
} from './types'
import {
  type McpTool,
  type CallableFn,
  createFunctionContext,
} from './utils'

// =============================================================================
// Pipeline Step Execution
// =============================================================================

async function executePipelineStep(
  step: NonNullable<PipelineDef['steps']>[number],
  data: unknown,
  ctx: FunctionContext,
  registry: Map<string, CallableFn>
): Promise<unknown> {
  switch (step.type) {
    case 'function': {
      const fn = registry.get(step.function!)
      if (!fn) throw new Error(`Function not found: ${step.function}`)
      return fn(data, ctx)
    }

    case 'transform':
      return step.transform!(data, ctx)

    case 'parallel': {
      const results = await Promise.all(
        (step.parallel || []).map((s) => executePipelineStep(s, data, ctx, registry))
      )
      return results
    }

    case 'condition': {
      if (step.condition!.if(data)) {
        let result = data
        for (const s of step.condition!.then) {
          result = await executePipelineStep(s, result, ctx, registry)
        }
        return result
      } else if (step.condition!.else) {
        let result = data
        for (const s of step.condition!.else) {
          result = await executePipelineStep(s, result, ctx, registry)
        }
        return result
      }
      return data
    }

    default:
      return data
  }
}

// =============================================================================
// Request Handler
// =============================================================================

export function createPipelineHandler(
  pipeline: PipelineDef,
  registry: Map<string, CallableFn>,
  config: FunctionsConfig
) {
  return async (c: Context<ApiEnv>) => {
    const input = c.req.method === 'GET'
      ? Object.fromEntries(new URL(c.req.url).searchParams)
      : await c.req.json().catch(() => ({}))

    const ctx = createFunctionContext(c, config, registry)

    try {
      let data = input

      for (const step of pipeline.steps) {
        if (step.skipIf && step.skipIf(data)) continue

        data = await executePipelineStep(step, data, ctx, registry)
      }

      return c.var.respond({ data })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'PIPELINE_ERROR' },
        status: 500,
      })
    }
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export function registerPipelineRoutes(
  app: Hono<ApiEnv>,
  config: FunctionsConfig,
  registry: Map<string, CallableFn>,
  mcpTools: McpTool[]
): void {
  const basePath = config.basePath || ''

  if (config.pipelines) {
    for (const pipeline of config.pipelines) {
      const path = `${basePath}/${pipeline.name.replace(/\./g, '/')}`

      app.post(path, createPipelineHandler(pipeline, registry, config))

      mcpTools.push({
        name: pipeline.name,
        description: pipeline.description,
        inputSchema: pipeline.input,
      })
    }
  }
}
