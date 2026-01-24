/**
 * MCP Tool Registry
 *
 * Unified registry for MCP tools from all sources:
 * - Explicit MCP config tools
 * - Database convention auto-generated tools
 * - Functions convention tools
 *
 * The registry ensures all tools are accessible through a single /mcp endpoint.
 */

import type { Context } from 'hono'

/**
 * Tool definition for the registry (without requiring a handler for listing)
 */
export interface RegistryTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  examples?: Array<{ name: string; input?: unknown; output?: unknown }>
  tests?: Array<{ name: string; input: unknown; expect: unknown }>
  handler?: (input: unknown, c: Context) => Promise<unknown>
}

/**
 * Unified MCP Tool Registry
 *
 * Collects tools from all conventions and serves them through a single endpoint.
 * Uses "last wins" strategy for duplicate tool names.
 */
export class McpToolRegistry {
  private tools: Map<string, RegistryTool> = new Map()

  /**
   * Register a tool in the registry
   *
   * @param tool - The tool to register
   */
  register(tool: RegistryTool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Register multiple tools at once
   *
   * @param tools - Array of tools to register
   */
  registerAll(tools: RegistryTool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * Get all registered tools
   *
   * @returns Array of all registered tools
   */
  getTools(): RegistryTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get a specific tool by name
   *
   * @param name - The tool name to look up
   * @returns The tool if found, undefined otherwise
   */
  getTool(name: string): RegistryTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool exists in the registry
   *
   * @param name - The tool name to check
   * @returns true if the tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get the number of registered tools
   */
  get size(): number {
    return this.tools.size
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear()
  }
}

/**
 * Create a new McpToolRegistry instance
 */
export function createMcpToolRegistry(): McpToolRegistry {
  return new McpToolRegistry()
}
