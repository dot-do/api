import { Hono } from 'hono'
import type { ApiEnv, CrudConfig } from '../types'
import { buildPagination } from '../helpers/pagination'
import { validateColumns } from '../helpers/sql-validation'

export function crudConvention(config: CrudConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const { table, primaryKey = 'id', pageSize = 25, maxPageSize = 100 } = config

  // LIST
  app.get('/', async (c) => {
    const db = (c.env as Record<string, unknown>)[config.db] as D1Database
    const url = new URL(c.req.url)

    const limit = Math.min(Number(url.searchParams.get('limit')) || pageSize, maxPageSize)
    const offset = Number(url.searchParams.get('offset')) || 0
    const search = url.searchParams.get('q')
    const sort = url.searchParams.get('sort') || primaryKey
    const order = url.searchParams.get('order')?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

    let query = `SELECT * FROM ${table}`
    const params: unknown[] = []

    if (search && config.searchable?.length) {
      const conditions = config.searchable.map((col) => `${col} LIKE ?`)
      query += ` WHERE (${conditions.join(' OR ')})`
      config.searchable.forEach(() => params.push(`%${search}%`))
    }

    const sortCol = config.sortable?.includes(sort) || sort === primaryKey ? sort : primaryKey
    query += ` ORDER BY ${sortCol} ${order}`
    query += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const countQuery = search && config.searchable?.length
      ? `SELECT COUNT(*) as total FROM ${table} WHERE (${config.searchable.map((col) => `${col} LIKE ?`).join(' OR ')})`
      : `SELECT COUNT(*) as total FROM ${table}`
    const countParams = search && config.searchable?.length
      ? config.searchable.map(() => `%${search}%`)
      : []

    const [results, countResult] = await Promise.all([
      db.prepare(query).bind(...params).all(),
      db.prepare(countQuery).bind(...countParams).first<{ total: number }>(),
    ])

    const total = countResult?.total || 0
    const pagination = buildPagination({ url, total, limit, offset })

    return c.var.respond({
      data: results.results,
      meta: { total, limit, offset },
      links: pagination.links,
      actions: {
        create: { method: 'POST', href: url.pathname },
      },
    })
  })

  // GET by ID
  app.get('/:id', async (c) => {
    const db = (c.env as Record<string, unknown>)[config.db] as D1Database
    const id = c.req.param('id')

    const result = await db.prepare(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`).bind(id).first()

    if (!result) {
      return c.var.respond({
        error: { message: `${table} not found`, code: 'NOT_FOUND', status: 404 },
        status: 404,
      })
    }

    return c.var.respond({ data: result })
  })

  // CREATE
  app.post('/', async (c) => {
    const db = (c.env as Record<string, unknown>)[config.db] as D1Database
    const body = await c.req.json<Record<string, unknown>>()

    const columns = Object.keys(body)
    const values = Object.values(body)

    // Validate column names to prevent SQL injection
    const validation = validateColumns(columns, config.columns)
    if (!validation.valid) {
      return c.var.respond({
        error: {
          message: `Invalid column names: ${validation.invalidColumns.join(', ')}`,
          code: 'INVALID_COLUMN',
          status: 400
        },
        status: 400
      })
    }

    // Generate ID if not provided
    if (!body[primaryKey]) {
      columns.unshift(primaryKey)
      values.unshift(crypto.randomUUID())
    }

    const insertCols = columns.join(', ')
    const insertPlaceholders = columns.map(() => '?').join(', ')

    await db.prepare(`INSERT INTO ${table} (${insertCols}) VALUES (${insertPlaceholders})`).bind(...values).run()

    const created = await db.prepare(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`).bind(values[0]).first()

    return c.var.respond({ data: created, status: 201 })
  })

  // UPDATE
  app.put('/:id', async (c) => {
    const db = (c.env as Record<string, unknown>)[config.db] as D1Database
    const id = c.req.param('id')
    const body = await c.req.json<Record<string, unknown>>()

    const columns = Object.keys(body)

    // Validate column names to prevent SQL injection
    const validation = validateColumns(columns, config.columns)
    if (!validation.valid) {
      return c.var.respond({
        error: {
          message: `Invalid column names: ${validation.invalidColumns.join(', ')}`,
          code: 'INVALID_COLUMN',
          status: 400
        },
        status: 400
      })
    }

    const sets = columns.map((col) => `${col} = ?`)
    const values = [...Object.values(body), id]

    await db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${primaryKey} = ?`).bind(...values).run()

    const updated = await db.prepare(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`).bind(id).first()

    if (!updated) {
      return c.var.respond({
        error: { message: `${table} not found`, code: 'NOT_FOUND', status: 404 },
        status: 404,
      })
    }

    return c.var.respond({ data: updated })
  })

  // PATCH
  app.patch('/:id', async (c) => {
    const db = (c.env as Record<string, unknown>)[config.db] as D1Database
    const id = c.req.param('id')
    const body = await c.req.json<Record<string, unknown>>()

    const columns = Object.keys(body)

    // Validate column names to prevent SQL injection
    const validation = validateColumns(columns, config.columns)
    if (!validation.valid) {
      return c.var.respond({
        error: {
          message: `Invalid column names: ${validation.invalidColumns.join(', ')}`,
          code: 'INVALID_COLUMN',
          status: 400
        },
        status: 400
      })
    }

    const sets = columns.map((col) => `${col} = ?`)
    const values = [...Object.values(body), id]

    await db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${primaryKey} = ?`).bind(...values).run()

    const updated = await db.prepare(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`).bind(id).first()

    if (!updated) {
      return c.var.respond({
        error: { message: `${table} not found`, code: 'NOT_FOUND', status: 404 },
        status: 404,
      })
    }

    return c.var.respond({ data: updated })
  })

  // DELETE
  app.delete('/:id', async (c) => {
    const db = (c.env as Record<string, unknown>)[config.db] as D1Database
    const id = c.req.param('id')

    const existing = await db.prepare(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`).bind(id).first()
    if (!existing) {
      return c.var.respond({
        error: { message: `${table} not found`, code: 'NOT_FOUND', status: 404 },
        status: 404,
      })
    }

    await db.prepare(`DELETE FROM ${table} WHERE ${primaryKey} = ?`).bind(id).run()

    return c.var.respond({ data: existing })
  })

  return app
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all(): Promise<{ results: unknown[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}
