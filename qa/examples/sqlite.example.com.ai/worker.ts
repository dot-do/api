/**
 * sqlite.example.com.ai - Durable Objects with SQLite Storage Example
 *
 * Demonstrates Durable Objects with native SQLite storage:
 * - TasksDO Durable Object class using this.ctx.storage.sql
 * - MCP tools with embedded tests for task management
 * - Custom routes for health check and stats
 * - /qa endpoint for test discovery
 */

import { API } from '@dotdo/apis'
import { DurableObject } from 'cloudflare:workers'

// Types for our task system
interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  completedAt: string | null
}

interface Env {
  TASKS_DO: DurableObjectNamespace<TasksDO>
}

// TasksDO - Durable Object with native SQLite storage
export class TasksDO extends DurableObject {
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    // Create tasks table if it doesn't exist
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        created_at TEXT NOT NULL,
        completed_at TEXT
      )
    `)

    this.initialized = true
  }

  async createTask(input: { title: string; description?: string; priority?: string }): Promise<Task> {
    await this.ensureInitialized()

    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const createdAt = new Date().toISOString()
    const priority = input.priority || 'medium'

    this.ctx.storage.sql.exec(
      `INSERT INTO tasks (id, title, description, completed, priority, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      id,
      input.title,
      input.description || null,
      priority,
      createdAt
    )

    return {
      id,
      title: input.title,
      description: input.description || null,
      completed: false,
      priority: priority as Task['priority'],
      createdAt,
      completedAt: null,
    }
  }

  async getTask(id: string): Promise<Task | null> {
    await this.ensureInitialized()

    const cursor = this.ctx.storage.sql.exec(
      `SELECT id, title, description, completed, priority, created_at, completed_at
       FROM tasks WHERE id = ?`,
      id
    )

    const row = cursor.one()
    if (!row) return null

    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      completed: Boolean(row.completed),
      priority: row.priority as Task['priority'],
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | null,
    }
  }

  async listTasks(input: { completed?: boolean; priority?: string; limit?: number; offset?: number }): Promise<{
    tasks: Task[]
    total: number
    limit: number
    offset: number
  }> {
    await this.ensureInitialized()

    const { completed, priority, limit = 10, offset = 0 } = input

    // Build query with filters
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (completed !== undefined) {
      conditions.push('completed = ?')
      params.push(completed ? 1 : 0)
    }

    if (priority) {
      conditions.push('priority = ?')
      params.push(priority)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countCursor = this.ctx.storage.sql.exec(`SELECT COUNT(*) as count FROM tasks ${whereClause}`, ...params)
    const countRow = countCursor.one()
    const total = Number(countRow?.count ?? 0)

    // Get paginated results
    const queryCursor = this.ctx.storage.sql.exec(
      `SELECT id, title, description, completed, priority, created_at, completed_at
       FROM tasks ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset
    )

    const tasks: Task[] = []
    for (const row of queryCursor) {
      tasks.push({
        id: row.id as string,
        title: row.title as string,
        description: row.description as string | null,
        completed: Boolean(row.completed),
        priority: row.priority as Task['priority'],
        createdAt: row.created_at as string,
        completedAt: row.completed_at as string | null,
      })
    }

    return { tasks, total, limit, offset }
  }

  async completeTask(id: string): Promise<Task | null> {
    await this.ensureInitialized()

    const task = await this.getTask(id)
    if (!task) return null

    const completedAt = new Date().toISOString()

    this.ctx.storage.sql.exec(`UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?`, completedAt, id)

    return {
      ...task,
      completed: true,
      completedAt,
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.ensureInitialized()

    const task = await this.getTask(id)
    if (!task) return false

    this.ctx.storage.sql.exec(`DELETE FROM tasks WHERE id = ?`, id)
    return true
  }

  async getStats(): Promise<{
    total: number
    completed: number
    pending: number
    byPriority: Record<string, number>
  }> {
    await this.ensureInitialized()

    const totalCursor = this.ctx.storage.sql.exec(`SELECT COUNT(*) as count FROM tasks`)
    const total = Number(totalCursor.one()?.count ?? 0)

    const completedCursor = this.ctx.storage.sql.exec(`SELECT COUNT(*) as count FROM tasks WHERE completed = 1`)
    const completed = Number(completedCursor.one()?.count ?? 0)

    const priorityCursor = this.ctx.storage.sql.exec(
      `SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority`
    )

    const byPriority: Record<string, number> = {}
    for (const row of priorityCursor) {
      byPriority[row.priority as string] = Number(row.count)
    }

    return {
      total,
      completed,
      pending: total - completed,
      byPriority,
    }
  }

  // HTTP request handler for the Durable Object
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    try {
      if (request.method === 'POST' && url.pathname === '/create') {
        const input = await request.json()
        const task = await this.createTask(input as { title: string; description?: string; priority?: string })
        return Response.json(task)
      }

      if (request.method === 'GET' && url.pathname === '/get') {
        const id = url.searchParams.get('id')
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400 })
        const task = await this.getTask(id)
        if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })
        return Response.json(task)
      }

      if (request.method === 'GET' && url.pathname === '/list') {
        const completed = url.searchParams.get('completed')
        const priority = url.searchParams.get('priority')
        const limit = url.searchParams.get('limit')
        const offset = url.searchParams.get('offset')

        const result = await this.listTasks({
          completed: completed !== null ? completed === 'true' : undefined,
          priority: priority || undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
          offset: offset ? parseInt(offset, 10) : undefined,
        })
        return Response.json(result)
      }

      if (request.method === 'POST' && url.pathname === '/complete') {
        const { id } = (await request.json()) as { id: string }
        const task = await this.completeTask(id)
        if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })
        return Response.json(task)
      }

      if (request.method === 'DELETE' && url.pathname === '/delete') {
        const id = url.searchParams.get('id')
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400 })
        const success = await this.deleteTask(id)
        if (!success) return Response.json({ error: 'Task not found' }, { status: 404 })
        return Response.json({ success: true, id })
      }

      if (request.method === 'GET' && url.pathname === '/stats') {
        const stats = await this.getStats()
        return Response.json(stats)
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  }
}

// Helper to get DO stub
function getTasksDO(env: Env, userId = 'default'): DurableObjectStub<TasksDO> {
  const id = env.TASKS_DO.idFromName(userId)
  return env.TASKS_DO.get(id)
}

export default API<Env>({
  name: 'sqlite.example.com.ai',
  description: 'Durable Objects with SQLite storage example - Task management API',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // MCP tools with embedded tests
  mcp: {
    name: 'do-sqlite-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'tasks.create',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
          },
          required: ['title'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            completed: { type: 'boolean' },
            priority: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            name: 'create basic task',
            input: { title: 'Buy groceries' },
            output: { id: 'task-1', title: 'Buy groceries', completed: false, priority: 'medium' },
          },
          {
            name: 'create high priority task',
            input: { title: 'Fix production bug', priority: 'high', description: 'Critical issue' },
            output: { id: 'task-2', title: 'Fix production bug', priority: 'high', completed: false },
          },
        ],
        tests: [
          {
            name: 'creates task with valid data',
            tags: ['smoke', 'crud'],
            input: { title: 'Test Task', description: 'A test task', priority: 'medium' },
            expect: {
              status: 'success',
              output: {
                title: 'Test Task',
                description: 'A test task',
                priority: 'medium',
                completed: false,
              },
              match: 'partial',
            },
          },
          {
            name: 'creates task with default priority',
            tags: ['crud'],
            input: { title: 'Simple Task' },
            expect: {
              status: 'success',
              output: {
                'title': 'Simple Task',
                'priority': 'medium',
                'id': { type: 'string' },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty title',
            tags: ['validation', 'negative'],
            input: { title: '' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing title',
            tags: ['validation', 'negative'],
            input: { priority: 'high' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects invalid priority',
            tags: ['validation', 'negative'],
            input: { title: 'Test', priority: 'urgent' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { title, description, priority } = input as {
            title?: string
            description?: string
            priority?: string
          }

          // Validation
          if (!title || title.length === 0) {
            throw Object.assign(new Error('Title is required'), { code: 'VALIDATION_ERROR' })
          }

          const validPriorities = ['low', 'medium', 'high']
          if (priority && !validPriorities.includes(priority)) {
            throw Object.assign(new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`), {
              code: 'VALIDATION_ERROR',
            })
          }

          const stub = getTasksDO(c.env)
          return await stub.createTask({ title, description, priority })
        },
      },
      {
        name: 'tasks.get',
        description: 'Get a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            completed: { type: 'boolean' },
            priority: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        tests: [
          {
            name: 'returns 404 for non-existent task',
            tags: ['negative'],
            input: { id: 'non-existent-id' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { id } = input as { id: string }
          const stub = getTasksDO(c.env)
          const task = await stub.getTask(id)

          if (!task) {
            throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' })
          }

          return task
        },
      },
      {
        name: 'tasks.list',
        description: 'List all tasks with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            completed: { type: 'boolean', description: 'Filter by completion status' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
            offset: { type: 'number', default: 0, minimum: 0 },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  completed: { type: 'boolean' },
                  priority: { type: 'string' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        tests: [
          {
            name: 'returns tasks array',
            tags: ['smoke'],
            input: {},
            expect: {
              status: 'success',
              output: {
                'tasks': { type: 'array' },
                'total': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects limit parameter',
            tags: ['pagination'],
            input: { limit: 5 },
            expect: {
              status: 'success',
              output: {
                'limit': 5,
              },
              match: 'partial',
            },
          },
          {
            name: 'filters by priority',
            tags: ['filtering'],
            input: { priority: 'high' },
            expect: {
              status: 'success',
              output: {
                'tasks': { type: 'array' },
              },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { completed, priority, limit, offset } = input as {
            completed?: boolean
            priority?: string
            limit?: number
            offset?: number
          }

          const stub = getTasksDO(c.env)
          return await stub.listTasks({ completed, priority, limit, offset })
        },
      },
      {
        name: 'tasks.complete',
        description: 'Mark a task as completed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID to complete' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            completed: { type: 'boolean' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        tests: [
          {
            name: 'returns 404 when completing non-existent task',
            tags: ['negative'],
            input: { id: 'does-not-exist' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { id } = input as { id: string }
          const stub = getTasksDO(c.env)
          const task = await stub.completeTask(id)

          if (!task) {
            throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' })
          }

          return task
        },
      },
      {
        name: 'tasks.delete',
        description: 'Delete a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID to delete' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            id: { type: 'string' },
          },
        },
        tests: [
          {
            name: 'returns 404 when deleting non-existent task',
            tags: ['negative'],
            input: { id: 'does-not-exist' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { id } = input as { id: string }
          const stub = getTasksDO(c.env)
          const success = await stub.deleteTask(id)

          if (!success) {
            throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' })
          }

          return { success: true, id }
        },
      },
    ],
  },

  // Testing configuration - enables /qa endpoint
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'durable-objects', 'sqlite'],
    // REST endpoint tests
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        tests: [
          {
            name: 'health check returns ok status',
            tags: ['smoke', 'health'],
            expect: {
              status: 200,
              body: {
                'data.status': 'ok',
                'data.timestamp': { type: 'string' },
              },
            },
          },
        ],
      },
      {
        path: '/',
        method: 'GET',
        tests: [
          {
            name: 'root returns API info',
            tags: ['smoke'],
            expect: {
              status: 200,
              body: {
                'api.name': 'sqlite.example.com.ai',
                'data.name': 'sqlite.example.com.ai',
              },
            },
          },
        ],
      },
      {
        path: '/tasks/stats',
        method: 'GET',
        tests: [
          {
            name: 'stats endpoint returns task statistics',
            tags: ['smoke', 'stats'],
            expect: {
              status: 200,
              body: {
                'data.total': { type: 'number', gte: 0 },
                'data.completed': { type: 'number', gte: 0 },
                'data.pending': { type: 'number', gte: 0 },
              },
            },
          },
        ],
      },
    ],
  },

  // Custom routes
  routes: (app) => {
    // Health check
    app.get('/health', (c) => {
      return c.var.respond({
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          features: ['durable-objects', 'sqlite-storage'],
        },
      })
    })

    // Task statistics from Durable Object
    app.get('/tasks/stats', async (c) => {
      const stub = getTasksDO(c.env)
      const stats = await stub.getStats()

      return c.var.respond({
        data: {
          ...stats,
          timestamp: new Date().toISOString(),
        },
      })
    })
  },
})
