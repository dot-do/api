/**
 * documentdb.example.com.ai - DocumentDB (MongoDB-compatible) API example
 *
 * Demonstrates the api.qa testing framework with:
 * - DocumentDB client using @dotdo/documentdb
 * - MCP tools with MongoDB-style CRUD operations
 * - Filters, projections, and aggregation pipelines
 * - Embedded tests for validation and coverage
 */

import { API } from 'api.do'
import { DocumentDBClient } from '@dotdo/documentdb'
import type { Context } from 'hono'

// Type definitions for our products collection
interface Product {
  _id?: string
  name: string
  description?: string
  category: string
  price: number
  stock?: number
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

// Env type with Durable Object binding
interface Env {
  DOCUMENTDB_DO: DurableObjectNamespace
}

// Helper to get DocumentDB client from Durable Object
async function getClient(env: Env): Promise<DocumentDBClient> {
  const id = env.DOCUMENTDB_DO.idFromName('products-db')
  const stub = env.DOCUMENTDB_DO.get(id)
  // The DO exposes the client via RPC
  return stub as unknown as DocumentDBClient
}

export default API({
  name: 'documentdb.example.com.ai',
  description: 'DocumentDB (MongoDB-compatible) API demonstrating MongoDB-style operations',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // MCP tools with embedded tests
  mcp: {
    name: 'documentdb.qa-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'products.insert',
        description: 'Insert one or more products into the collection',
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, description: 'Product name' },
                  description: { type: 'string', description: 'Product description' },
                  category: { type: 'string', enum: ['electronics', 'clothing', 'food', 'books', 'other'], description: 'Product category' },
                  price: { type: 'number', minimum: 0, description: 'Product price' },
                  stock: { type: 'integer', minimum: 0, description: 'Stock quantity' },
                  tags: { type: 'array', items: { type: 'string' }, description: 'Product tags' },
                },
                required: ['name', 'category', 'price'],
              },
              minItems: 1,
              description: 'Array of product documents to insert',
            },
          },
          required: ['documents'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            acknowledged: { type: 'boolean' },
            insertedCount: { type: 'integer' },
            insertedIds: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        examples: [
          {
            name: 'insert single product',
            input: {
              documents: [{ name: 'Laptop', category: 'electronics', price: 999.99 }],
            },
            output: { acknowledged: true, insertedCount: 1 },
          },
          {
            name: 'insert multiple products',
            input: {
              documents: [
                { name: 'Laptop', category: 'electronics', price: 999.99 },
                { name: 'T-Shirt', category: 'clothing', price: 29.99 },
              ],
            },
            output: { acknowledged: true, insertedCount: 2 },
          },
        ],
        tests: [
          {
            name: 'inserts single product successfully',
            tags: ['smoke', 'crud', 'insert'],
            input: {
              documents: [{ name: 'Test Laptop', category: 'electronics', price: 999.99, stock: 10 }],
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                insertedCount: 1,
              },
              match: 'partial',
            },
          },
          {
            name: 'inserts multiple products',
            tags: ['crud', 'insert', 'batch'],
            input: {
              documents: [
                { name: 'Product A', category: 'electronics', price: 100 },
                { name: 'Product B', category: 'clothing', price: 50 },
                { name: 'Product C', category: 'food', price: 25 },
              ],
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                insertedCount: 3,
              },
              match: 'partial',
            },
          },
          {
            name: 'inserts product with all fields',
            tags: ['crud', 'insert'],
            input: {
              documents: [{
                name: 'Complete Product',
                description: 'A fully specified product',
                category: 'books',
                price: 19.99,
                stock: 100,
                tags: ['bestseller', 'new'],
              }],
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                insertedCount: 1,
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects product without name',
            tags: ['validation', 'negative'],
            input: {
              documents: [{ category: 'electronics', price: 100 }],
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects product with invalid category',
            tags: ['validation', 'negative'],
            input: {
              documents: [{ name: 'Test', category: 'invalid-category', price: 100 }],
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects product with negative price',
            tags: ['validation', 'negative'],
            input: {
              documents: [{ name: 'Test', category: 'electronics', price: -10 }],
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects empty documents array',
            tags: ['validation', 'negative'],
            input: {
              documents: [],
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c: Context) => {
          const { documents } = input as { documents: Product[] }
          const env = c.env as Env

          // Validation
          if (!documents || documents.length === 0) {
            throw Object.assign(new Error('Documents array is required and cannot be empty'), { code: 'VALIDATION_ERROR' })
          }

          const validCategories = ['electronics', 'clothing', 'food', 'books', 'other']
          for (const doc of documents) {
            if (!doc.name || doc.name.length === 0) {
              throw Object.assign(new Error('Product name is required'), { code: 'VALIDATION_ERROR' })
            }
            if (!validCategories.includes(doc.category)) {
              throw Object.assign(new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`), { code: 'VALIDATION_ERROR' })
            }
            if (doc.price < 0) {
              throw Object.assign(new Error('Price cannot be negative'), { code: 'VALIDATION_ERROR' })
            }
          }

          // Add timestamps
          const now = new Date().toISOString()
          const docsWithTimestamps = documents.map(doc => ({
            ...doc,
            createdAt: now,
            updatedAt: now,
          }))

          const id = env.DOCUMENTDB_DO.idFromName('products-db')
          const stub = env.DOCUMENTDB_DO.get(id)
          const result = await (stub as any).command('default', {
            insert: 'products',
            documents: docsWithTimestamps,
          })

          return {
            acknowledged: result.ok === 1,
            insertedCount: result.n ?? documents.length,
            insertedIds: result.insertedIds ?? {},
          }
        },
      },
      {
        name: 'products.find',
        description: 'Find products matching a filter with optional sort, limit, and projection',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'MongoDB-style filter query',
              additionalProperties: true,
            },
            projection: {
              type: 'object',
              description: 'Fields to include (1) or exclude (0)',
              additionalProperties: { type: 'integer', enum: [0, 1] },
            },
            sort: {
              type: 'object',
              description: 'Sort order: 1 for ascending, -1 for descending',
              additionalProperties: { type: 'integer', enum: [-1, 1] },
            },
            limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
            skip: { type: 'integer', minimum: 0, default: 0 },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            documents: { type: 'array', items: { type: 'object' } },
            count: { type: 'integer' },
          },
        },
        examples: [
          {
            name: 'find all products',
            input: {},
            output: { documents: [], count: 0 },
          },
          {
            name: 'find electronics',
            input: { filter: { category: 'electronics' } },
            output: { documents: [], count: 0 },
          },
          {
            name: 'find with price range',
            input: { filter: { price: { $gte: 100, $lte: 500 } } },
            output: { documents: [], count: 0 },
          },
        ],
        tests: [
          {
            name: 'returns empty array when no products',
            tags: ['smoke', 'crud', 'find'],
            input: {},
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
                'count': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'filters by category',
            tags: ['crud', 'find', 'filter'],
            input: { filter: { category: 'electronics' } },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'filters by price range using $gte and $lte',
            tags: ['crud', 'find', 'filter', 'operators'],
            input: { filter: { price: { $gte: 50, $lte: 200 } } },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'applies projection to exclude fields',
            tags: ['crud', 'find', 'projection'],
            input: { filter: {}, projection: { description: 0 } },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'applies sort by price descending',
            tags: ['crud', 'find', 'sort'],
            input: { filter: {}, sort: { price: -1 }, limit: 10 },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects limit parameter',
            tags: ['crud', 'find', 'pagination'],
            input: { limit: 5 },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects skip parameter for pagination',
            tags: ['crud', 'find', 'pagination'],
            input: { skip: 10, limit: 5 },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'filters using $in operator',
            tags: ['crud', 'find', 'operators'],
            input: { filter: { category: { $in: ['electronics', 'clothing'] } } },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
          {
            name: 'filters using $regex operator',
            tags: ['crud', 'find', 'operators'],
            input: { filter: { name: { $regex: 'Laptop' } } },
            expect: {
              status: 'success',
              output: {
                'documents': { type: 'array' },
              },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown, c: Context) => {
          const { filter = {}, projection, sort, limit = 100, skip = 0 } = input as {
            filter?: Record<string, unknown>
            projection?: Record<string, 0 | 1>
            sort?: Record<string, 1 | -1>
            limit?: number
            skip?: number
          }
          const env = c.env as Env

          const id = env.DOCUMENTDB_DO.idFromName('products-db')
          const stub = env.DOCUMENTDB_DO.get(id)
          const result = await (stub as any).command('default', {
            find: 'products',
            filter,
            projection,
            sort,
            limit,
            skip,
          })

          const documents = result.cursor?.firstBatch ?? []

          return {
            documents,
            count: documents.length,
          }
        },
      },
      {
        name: 'products.findOne',
        description: 'Find a single product by ID or filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'MongoDB-style filter query (e.g., { _id: "..." } or { name: "..." })',
              additionalProperties: true,
            },
            projection: {
              type: 'object',
              description: 'Fields to include (1) or exclude (0)',
              additionalProperties: { type: 'integer', enum: [0, 1] },
            },
          },
          required: ['filter'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            document: {
              type: ['object', 'null'],
              properties: {
                _id: { type: 'string' },
                name: { type: 'string' },
                category: { type: 'string' },
                price: { type: 'number' },
              },
            },
            found: { type: 'boolean' },
          },
        },
        examples: [
          {
            name: 'find by ID',
            input: { filter: { _id: 'product-123' } },
            output: { document: null, found: false },
          },
          {
            name: 'find by name',
            input: { filter: { name: 'Laptop' } },
            output: { document: null, found: false },
          },
        ],
        tests: [
          {
            name: 'returns null for non-existent product',
            tags: ['crud', 'findOne'],
            input: { filter: { _id: 'non-existent-id' } },
            expect: {
              status: 'success',
              output: {
                document: null,
                found: false,
              },
            },
          },
          {
            name: 'finds product by name filter',
            tags: ['crud', 'findOne', 'filter'],
            input: { filter: { name: 'Test Product' } },
            expect: {
              status: 'success',
              output: {
                'found': { type: 'boolean' },
              },
              match: 'partial',
            },
          },
          {
            name: 'applies projection to result',
            tags: ['crud', 'findOne', 'projection'],
            input: { filter: { category: 'electronics' }, projection: { name: 1, price: 1 } },
            expect: {
              status: 'success',
              output: {
                'found': { type: 'boolean' },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects missing filter',
            tags: ['validation', 'negative'],
            input: {},
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c: Context) => {
          const { filter, projection } = input as {
            filter?: Record<string, unknown>
            projection?: Record<string, 0 | 1>
          }
          const env = c.env as Env

          if (!filter) {
            throw Object.assign(new Error('Filter is required'), { code: 'VALIDATION_ERROR' })
          }

          const id = env.DOCUMENTDB_DO.idFromName('products-db')
          const stub = env.DOCUMENTDB_DO.get(id)
          const result = await (stub as any).command('default', {
            find: 'products',
            filter,
            projection,
            limit: 1,
          })

          const documents = result.cursor?.firstBatch ?? []
          const document = documents[0] ?? null

          return {
            document,
            found: document !== null,
          }
        },
      },
      {
        name: 'products.update',
        description: 'Update products matching a filter using MongoDB update operators',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'MongoDB-style filter to select documents',
              additionalProperties: true,
            },
            update: {
              type: 'object',
              description: 'Update operators ($set, $inc, $unset, $push, etc.)',
              additionalProperties: true,
            },
            multi: {
              type: 'boolean',
              default: false,
              description: 'Update all matching documents (true) or just the first (false)',
            },
          },
          required: ['filter', 'update'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            acknowledged: { type: 'boolean' },
            matchedCount: { type: 'integer' },
            modifiedCount: { type: 'integer' },
          },
        },
        examples: [
          {
            name: 'update price with $set',
            input: {
              filter: { _id: 'product-123' },
              update: { $set: { price: 899.99 } },
            },
            output: { acknowledged: true, matchedCount: 1, modifiedCount: 1 },
          },
          {
            name: 'increment stock with $inc',
            input: {
              filter: { category: 'electronics' },
              update: { $inc: { stock: 10 } },
              multi: true,
            },
            output: { acknowledged: true, matchedCount: 5, modifiedCount: 5 },
          },
        ],
        tests: [
          {
            name: 'updates single product with $set',
            tags: ['crud', 'update'],
            input: {
              filter: { name: 'Test Update Product' },
              update: { $set: { price: 199.99, updatedAt: '2024-01-01T00:00:00Z' } },
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                'matchedCount': { type: 'number', gte: 0 },
                'modifiedCount': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'updates multiple products with multi flag',
            tags: ['crud', 'update', 'batch'],
            input: {
              filter: { category: 'electronics' },
              update: { $inc: { stock: 5 } },
              multi: true,
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
              },
              match: 'partial',
            },
          },
          {
            name: 'uses $push to add tag',
            tags: ['crud', 'update', 'operators'],
            input: {
              filter: { _id: 'test-product' },
              update: { $push: { tags: 'new-tag' } },
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
              },
              match: 'partial',
            },
          },
          {
            name: 'uses $unset to remove field',
            tags: ['crud', 'update', 'operators'],
            input: {
              filter: { _id: 'test-product' },
              update: { $unset: { description: '' } },
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
              },
              match: 'partial',
            },
          },
          {
            name: 'returns zero matched for non-existent filter',
            tags: ['crud', 'update', 'negative'],
            input: {
              filter: { _id: 'non-existent-product' },
              update: { $set: { price: 100 } },
            },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                matchedCount: 0,
                modifiedCount: 0,
              },
            },
          },
          {
            name: 'rejects missing filter',
            tags: ['validation', 'negative'],
            input: {
              update: { $set: { price: 100 } },
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing update',
            tags: ['validation', 'negative'],
            input: {
              filter: { _id: 'product-123' },
            },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c: Context) => {
          const { filter, update, multi = false } = input as {
            filter?: Record<string, unknown>
            update?: Record<string, unknown>
            multi?: boolean
          }
          const env = c.env as Env

          if (!filter) {
            throw Object.assign(new Error('Filter is required'), { code: 'VALIDATION_ERROR' })
          }
          if (!update) {
            throw Object.assign(new Error('Update is required'), { code: 'VALIDATION_ERROR' })
          }

          // Add updatedAt to $set if present
          if (update.$set) {
            (update.$set as Record<string, unknown>).updatedAt = new Date().toISOString()
          } else {
            update.$set = { updatedAt: new Date().toISOString() }
          }

          const id = env.DOCUMENTDB_DO.idFromName('products-db')
          const stub = env.DOCUMENTDB_DO.get(id)
          const result = await (stub as any).command('default', {
            update: 'products',
            updates: [{ q: filter, u: update, multi }],
          })

          return {
            acknowledged: result.ok === 1,
            matchedCount: result.n ?? 0,
            modifiedCount: result.nModified ?? 0,
          }
        },
      },
      {
        name: 'products.delete',
        description: 'Delete products matching a filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'MongoDB-style filter to select documents to delete',
              additionalProperties: true,
            },
            multi: {
              type: 'boolean',
              default: false,
              description: 'Delete all matching documents (true) or just the first (false)',
            },
          },
          required: ['filter'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            acknowledged: { type: 'boolean' },
            deletedCount: { type: 'integer' },
          },
        },
        examples: [
          {
            name: 'delete by ID',
            input: { filter: { _id: 'product-123' } },
            output: { acknowledged: true, deletedCount: 1 },
          },
          {
            name: 'delete all in category',
            input: { filter: { category: 'archived' }, multi: true },
            output: { acknowledged: true, deletedCount: 5 },
          },
        ],
        tests: [
          {
            name: 'deletes single product by ID',
            tags: ['crud', 'delete'],
            input: { filter: { _id: 'test-delete-product' } },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                'deletedCount': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'deletes multiple products with multi flag',
            tags: ['crud', 'delete', 'batch'],
            input: { filter: { category: 'test-delete' }, multi: true },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                'deletedCount': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'returns zero for non-existent filter',
            tags: ['crud', 'delete', 'negative'],
            input: { filter: { _id: 'non-existent-product' } },
            expect: {
              status: 'success',
              output: {
                acknowledged: true,
                deletedCount: 0,
              },
            },
          },
          {
            name: 'rejects missing filter',
            tags: ['validation', 'negative'],
            input: {},
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects empty filter without confirmation',
            tags: ['validation', 'negative', 'safety'],
            input: { filter: {} },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c: Context) => {
          const { filter, multi = false } = input as {
            filter?: Record<string, unknown>
            multi?: boolean
          }
          const env = c.env as Env

          if (!filter) {
            throw Object.assign(new Error('Filter is required'), { code: 'VALIDATION_ERROR' })
          }

          // Safety check: prevent accidental deletion of all documents
          if (Object.keys(filter).length === 0) {
            throw Object.assign(new Error('Empty filter not allowed. Use { _id: { $exists: true } } to delete all documents intentionally.'), { code: 'VALIDATION_ERROR' })
          }

          const id = env.DOCUMENTDB_DO.idFromName('products-db')
          const stub = env.DOCUMENTDB_DO.get(id)
          const result = await (stub as any).command('default', {
            delete: 'products',
            deletes: [{ q: filter, limit: multi ? 0 : 1 }],
          })

          return {
            acknowledged: result.ok === 1,
            deletedCount: result.n ?? 0,
          }
        },
      },
    ],
  },

  // Testing configuration - enables /qa endpoint
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'documentdb', 'mongodb'],
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
                'data.database': 'documentdb',
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
                'api.name': 'documentdb.example.com.ai',
                'data.name': 'documentdb.example.com.ai',
              },
            },
          },
        ],
      },
      {
        path: '/products/aggregate',
        method: 'POST',
        tests: [
          {
            name: 'aggregation pipeline returns results',
            tags: ['aggregation'],
            body: {
              pipeline: [
                { $match: { category: 'electronics' } },
                { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
              ],
            },
            expect: {
              status: 200,
              body: {
                'data.results': { type: 'array' },
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
          database: 'documentdb',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      })
    })

    // Aggregation endpoint
    app.post('/products/aggregate', async (c) => {
      const env = c.env as Env

      try {
        const body = await c.req.json<{ pipeline: unknown[] }>()
        const pipeline = body.pipeline ?? []

        if (!Array.isArray(pipeline)) {
          return c.var.respond({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Pipeline must be an array of stages',
            },
          }, 400)
        }

        const id = env.DOCUMENTDB_DO.idFromName('products-db')
        const stub = env.DOCUMENTDB_DO.get(id)
        const result = await (stub as any).command('default', {
          aggregate: 'products',
          pipeline,
        })

        return c.var.respond({
          data: {
            results: result.cursor?.firstBatch ?? [],
            count: (result.cursor?.firstBatch ?? []).length,
          },
        })
      } catch (error) {
        return c.var.respond({
          error: {
            code: 'AGGREGATION_ERROR',
            message: error instanceof Error ? error.message : 'Aggregation failed',
          },
        }, 500)
      }
    })

    // Collection stats endpoint
    app.get('/products/stats', async (c) => {
      const env = c.env as Env

      try {
        const id = env.DOCUMENTDB_DO.idFromName('products-db')
        const stub = env.DOCUMENTDB_DO.get(id)

        // Get count
        const countResult = await (stub as any).command('default', {
          count: 'products',
        })

        // Get category breakdown via aggregation
        const categoryResult = await (stub as any).command('default', {
          aggregate: 'products',
          pipeline: [
            { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: '$price' } } },
            { $sort: { count: -1 } },
          ],
        })

        return c.var.respond({
          data: {
            totalProducts: countResult.n ?? 0,
            byCategory: categoryResult.cursor?.firstBatch ?? [],
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        return c.var.respond({
          error: {
            code: 'STATS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get stats',
          },
        }, 500)
      }
    })
  },
})

// Export the DocumentDB Durable Object
export { DocumentDBDO } from '@dotdo/documentdb'
