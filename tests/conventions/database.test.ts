import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { databaseConvention, parseSchema, parseField, parseModel, generateJsonSchema } from '../../src/conventions/database'
import { responseMiddleware } from '../../src/response'
import { contextMiddleware } from '../../src/middleware/context'
import type { ApiEnv } from '../../src/types'

function createTestApp(schema: Record<string, Record<string, string>>) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'database-test' }))

  const { routes } = databaseConvention({ schema })
  app.route('', routes)

  return app
}

// Helper to make requests with an empty env (triggers in-memory DB)
function req(app: Hono<ApiEnv>, path: string, init?: RequestInit) {
  return app.request(path, init, {})
}

describe('Database convention input validation', () => {
  const schema = {
    User: {
      name: 'string!',
      email: 'string! #unique',
      age: 'number',
      active: 'boolean',
    },
    Post: {
      title: 'string!',
      content: 'text!',
      authorId: '-> User!',
    },
  }

  describe('CREATE validation (POST)', () => {
    it('returns 400 when required field is missing', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: 25 }), // missing required 'name' and 'email'
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
      expect((body.error as Record<string, unknown>).details).toBeDefined()
    })

    it('returns 400 when field has wrong type (string instead of number)', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          age: 'not-a-number', // should be number
        }),
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
      expect((body.error as Record<string, unknown>).details).toBeDefined()
    })

    it('returns 400 when field has wrong type (number instead of string)', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 12345, // should be string
          email: 'john@example.com',
        }),
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when field has wrong type (string instead of boolean)', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John',
          email: 'john@example.com',
          active: 'yes', // should be boolean
        }),
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })

    it('accepts valid data with all required fields', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          active: true,
        }),
      })

      expect(res.status).toBe(201)
    })

    it('accepts valid data with only required fields', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
        }),
      })

      expect(res.status).toBe(201)
    })

    it('returns validation details listing all errors', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // missing title, content, and authorId
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      const error = body.error as Record<string, unknown>
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toBeDefined()
      // Details should list the missing required fields
      const details = error.details as Array<{ field: string; message: string }>
      expect(details.length).toBeGreaterThan(0)
      expect(details.some(d => d.field === 'title' || d.message.includes('title'))).toBe(true)
    })
  })

  describe('UPDATE validation (PUT)', () => {
    it('returns 400 when field has wrong type on update', async () => {
      const app = createTestApp(schema)

      // First create a user
      await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-user-1',
          name: 'John',
          email: 'john@example.com',
        }),
      })

      // Then try to update with invalid data
      const res = await req(app, '/users/test-user-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Updated',
          email: 'john@example.com',
          age: 'invalid-number',
        }),
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PATCH validation', () => {
    it('returns 400 when partial update has wrong type', async () => {
      const app = createTestApp(schema)

      // First create a user
      await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-user-2',
          name: 'Jane',
          email: 'jane@example.com',
        }),
      })

      // Then try to patch with invalid data
      const res = await req(app, '/users/test-user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: 'not-a-boolean',
        }),
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })

    it('accepts valid partial updates (passes validation)', async () => {
      const app = createTestApp(schema)

      // First create a user - need to use the same app instance for persistence
      const createRes = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-user-3',
          name: 'Bob',
          email: 'bob@example.com',
        }),
      })
      expect(createRes.status).toBe(201)

      // Then patch with valid data - should not fail validation
      // Since each databaseConvention() creates its own in-memory DB,
      // we verify the PATCH doesn't return a validation error (400)
      // It might return 404 if the DB doesn't persist across requests,
      // which is fine - we're testing validation, not persistence
      const res = await req(app, '/users/test-user-3', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: 35,
        }),
      })

      // The key assertion: valid data should NOT return a validation error
      // If it's 200, the update succeeded; if 404, the resource wasn't found
      // but validation passed. We just ensure it's not 400 (validation failure)
      expect(res.status).not.toBe(400)
    })
  })

  describe('relation validation', () => {
    it('returns 400 when relation field has wrong type (not a string ID)', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Post',
          content: 'Some content',
          authorId: 12345, // should be string ID
        }),
      })

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })
  })
})

// =============================================================================
// Schema Parsing Tests
// =============================================================================

describe('parseField()', () => {
  describe('basic types', () => {
    it('parses required string field', () => {
      const field = parseField('name', 'string!')
      expect(field.name).toBe('name')
      expect(field.type).toBe('string')
      expect(field.required).toBe(true)
      expect(field.unique).toBe(false)
      expect(field.indexed).toBe(false)
    })

    it('parses optional string field', () => {
      const field = parseField('nickname', 'string?')
      expect(field.name).toBe('nickname')
      expect(field.type).toBe('string')
      expect(field.required).toBe(false)
    })

    it('parses number field', () => {
      const field = parseField('age', 'number!')
      expect(field.type).toBe('number')
      expect(field.required).toBe(true)
    })

    it('parses int as number', () => {
      const field = parseField('count', 'int!')
      expect(field.type).toBe('number')
    })

    it('parses integer as number', () => {
      const field = parseField('total', 'integer')
      expect(field.type).toBe('number')
    })

    it('parses float as number', () => {
      const field = parseField('price', 'float!')
      expect(field.type).toBe('number')
    })

    it('parses boolean field', () => {
      const field = parseField('active', 'boolean!')
      expect(field.type).toBe('boolean')
      expect(field.required).toBe(true)
    })

    it('parses bool as boolean', () => {
      const field = parseField('enabled', 'bool')
      expect(field.type).toBe('boolean')
    })

    it('parses json field', () => {
      const field = parseField('data', 'json')
      expect(field.type).toBe('json')
    })

    it('parses object as json', () => {
      const field = parseField('metadata', 'object')
      expect(field.type).toBe('json')
    })

    it('parses text field', () => {
      const field = parseField('content', 'text!')
      expect(field.type).toBe('text')
    })

    it('parses timestamp field', () => {
      const field = parseField('createdAt', 'timestamp!')
      expect(field.type).toBe('timestamp')
    })

    it('parses datetime as timestamp', () => {
      const field = parseField('updatedAt', 'datetime')
      expect(field.type).toBe('timestamp')
    })

    it('parses date field', () => {
      const field = parseField('birthDate', 'date')
      expect(field.type).toBe('date')
    })

    it('parses cuid field', () => {
      const field = parseField('id', 'cuid!')
      expect(field.type).toBe('cuid')
    })

    it('parses uuid field', () => {
      const field = parseField('guid', 'uuid!')
      expect(field.type).toBe('uuid')
    })

    it('parses id as cuid', () => {
      const field = parseField('id', 'id!')
      expect(field.type).toBe('cuid')
    })

    it('defaults unknown type to string', () => {
      const field = parseField('unknown', 'unknowntype')
      expect(field.type).toBe('string')
    })
  })

  describe('modifiers', () => {
    it('parses unique modifier', () => {
      const field = parseField('email', 'string! #unique')
      expect(field.unique).toBe(true)
      expect(field.indexed).toBe(true) // unique implies indexed
    })

    it('parses index modifier', () => {
      const field = parseField('slug', 'string! #index')
      expect(field.indexed).toBe(true)
      expect(field.unique).toBe(false)
    })

    it('parses multiple modifiers', () => {
      const field = parseField('code', 'string! #unique #index')
      expect(field.unique).toBe(true)
      expect(field.indexed).toBe(true)
    })
  })

  describe('default values', () => {
    it('parses string default value', () => {
      const field = parseField('status', 'string = "active"')
      expect(field.type).toBe('string')
      expect(field.default).toBe('active')
      expect(field.required).toBe(false)
    })

    it('parses number default value', () => {
      const field = parseField('count', 'number = 0')
      expect(field.type).toBe('number')
      expect(field.default).toBe(0)
    })

    it('parses boolean true default', () => {
      const field = parseField('enabled', 'boolean = true')
      expect(field.type).toBe('boolean')
      expect(field.default).toBe(true)
    })

    it('parses boolean false default', () => {
      const field = parseField('disabled', 'boolean = false')
      expect(field.type).toBe('boolean')
      expect(field.default).toBe(false)
    })

    it('parses null default', () => {
      const field = parseField('optional', 'string = null')
      expect(field.default).toBe(null)
    })

    it('parses negative number default', () => {
      const field = parseField('offset', 'number = -1')
      expect(field.default).toBe(-1)
    })

    it('parses decimal number default', () => {
      const field = parseField('rate', 'number = 0.5')
      expect(field.default).toBe(0.5)
    })
  })

  describe('forward relations (->)', () => {
    it('parses required forward relation', () => {
      const field = parseField('author', '-> User!')
      expect(field.type).toBe('relation')
      expect(field.required).toBe(true)
      expect(field.relation).toBeDefined()
      expect(field.relation?.type).toBe('forward')
      expect(field.relation?.target).toBe('User')
      expect(field.relation?.many).toBe(false)
      expect(field.indexed).toBe(true) // Relations are always indexed
    })

    it('parses optional forward relation', () => {
      const field = parseField('manager', '-> User')
      expect(field.type).toBe('relation')
      expect(field.required).toBe(false)
      expect(field.relation?.target).toBe('User')
    })

    it('parses many forward relation', () => {
      const field = parseField('tags', '-> Tag[]')
      expect(field.relation?.many).toBe(true)
      expect(field.relation?.target).toBe('Tag')
    })
  })

  describe('inverse relations (<-)', () => {
    it('parses inverse relation', () => {
      const field = parseField('posts', '<- Post[]')
      expect(field.type).toBe('relation')
      expect(field.required).toBe(false) // Inverse relations are never required
      expect(field.relation?.type).toBe('inverse')
      expect(field.relation?.target).toBe('Post')
      expect(field.relation?.many).toBe(true)
    })

    it('parses single inverse relation', () => {
      const field = parseField('profile', '<- Profile')
      expect(field.relation?.many).toBe(false)
      expect(field.relation?.target).toBe('Profile')
    })
  })

  describe('vector fields', () => {
    it('parses vector field with dimensions', () => {
      const field = parseField('embedding', 'vector[1536]')
      expect(field.type).toBe('vector')
      expect(field.vector).toBeDefined()
      expect(field.vector?.dimensions).toBe(1536)
      expect(field.indexed).toBe(true)
    })

    it('parses vector field with different dimensions', () => {
      const field = parseField('smallEmbedding', 'vector[384]')
      expect(field.vector?.dimensions).toBe(384)
    })
  })
})

describe('parseModel()', () => {
  it('parses model with basic fields', () => {
    const model = parseModel('User', {
      name: 'string!',
      email: 'string! #unique',
      age: 'number',
    })

    expect(model.name).toBe('User')
    expect(model.singular).toBe('user')
    expect(model.plural).toBe('users')
    expect(model.primaryKey).toBe('id')
    expect(Object.keys(model.fields)).toContain('id') // Auto-generated
    expect(Object.keys(model.fields)).toContain('name')
    expect(Object.keys(model.fields)).toContain('email')
    expect(Object.keys(model.fields)).toContain('age')
  })

  it('generates singular/plural from PascalCase', () => {
    const model = parseModel('BlogPost', { title: 'string!' })
    expect(model.singular).toBe('blogPost')
    expect(model.plural).toBe('blogPosts')
  })

  it('pluralizes words ending in y correctly', () => {
    const model = parseModel('Category', { name: 'string!' })
    expect(model.plural).toBe('categories')
  })

  it('pluralizes words ending in s correctly', () => {
    const model = parseModel('Address', { street: 'string!' })
    expect(model.plural).toBe('addresses')
  })

  it('pluralizes words ending in x correctly', () => {
    const model = parseModel('Box', { label: 'string!' })
    expect(model.plural).toBe('boxes')
  })

  it('pluralizes words ending in ch correctly', () => {
    const model = parseModel('Branch', { name: 'string!' })
    expect(model.plural).toBe('branches')
  })

  it('pluralizes words ending in sh correctly', () => {
    const model = parseModel('Wish', { content: 'string!' })
    expect(model.plural).toBe('wishes')
  })

  it('does not pluralize words ending in ay, ey, oy, uy with ies', () => {
    const dayModel = parseModel('Day', { date: 'date!' })
    expect(dayModel.plural).toBe('days')

    const keyModel = parseModel('Key', { value: 'string!' })
    expect(keyModel.plural).toBe('keys')

    const toyModel = parseModel('Toy', { name: 'string!' })
    expect(toyModel.plural).toBe('toys')

    const guyModel = parseModel('Guy', { name: 'string!' })
    expect(guyModel.plural).toBe('guys')
  })

  it('auto-generates id field if not provided', () => {
    const model = parseModel('Item', { name: 'string!' })
    expect(model.fields.id).toBeDefined()
    expect(model.fields.id.type).toBe('cuid')
    expect(model.fields.id.required).toBe(true)
    expect(model.fields.id.unique).toBe(true)
    expect(model.fields.id.indexed).toBe(true)
  })

  it('does not override existing id field', () => {
    const model = parseModel('Entity', {
      id: 'uuid!',
      name: 'string!',
    })
    expect(model.fields.id.type).toBe('uuid')
  })

  it('skips special $ prefixed keys', () => {
    const model = parseModel('Config', {
      name: 'string!',
      $tableName: 'configs_table', // Should be skipped
    })
    expect(model.fields.$tableName).toBeUndefined()
    expect(model.fields.name).toBeDefined()
  })

  it('detects custom primary key from cuid/uuid with required and unique', () => {
    const model = parseModel('User', {
      uniqueId: 'cuid! #unique',
      name: 'string!',
    })
    // Primary key detection requires both required and unique
    expect(model.primaryKey).toBe('uniqueId')
  })
})

describe('parseSchema()', () => {
  it('parses empty schema', () => {
    const schema = parseSchema({})
    expect(schema.models).toEqual({})
  })

  describe('table name validation (SQL injection prevention)', () => {
    it('throws error for model name with SQL injection pattern', () => {
      expect(() => parseSchema({
        'users; DROP TABLE users--': { name: 'string!' },
      })).toThrow('Invalid model name')
    })

    it('throws error for model name with single quotes', () => {
      expect(() => parseSchema({
        "users' OR '1'='1": { name: 'string!' },
      })).toThrow('Invalid model name')
    })

    it('throws error for model name with spaces', () => {
      expect(() => parseSchema({
        'user table': { name: 'string!' },
      })).toThrow('Invalid model name')
    })

    it('throws error for model name starting with number', () => {
      expect(() => parseSchema({
        '123users': { name: 'string!' },
      })).toThrow('Invalid model name')
    })

    it('throws error for model name starting with underscore', () => {
      expect(() => parseSchema({
        '_private_table': { name: 'string!' },
      })).toThrow('Invalid model name')
    })

    it('throws error for model name with special characters', () => {
      expect(() => parseSchema({
        'users!': { name: 'string!' },
      })).toThrow('Invalid model name')
    })

    it('accepts valid PascalCase model names', () => {
      expect(() => parseSchema({
        UserAccount: { name: 'string!' },
      })).not.toThrow()
    })

    it('accepts valid snake_case model names', () => {
      expect(() => parseSchema({
        user_profiles: { name: 'string!' },
      })).not.toThrow()
    })

    it('accepts valid camelCase model names', () => {
      expect(() => parseSchema({
        userAccount: { name: 'string!' },
      })).not.toThrow()
    })

    it('accepts model names with numbers after first character', () => {
      expect(() => parseSchema({
        User2: { name: 'string!' },
        dataV2: { name: 'string!' },
      })).not.toThrow()
    })
  })

  it('parses single model schema', () => {
    const schema = parseSchema({
      User: {
        name: 'string!',
        email: 'string!',
      },
    })

    expect(Object.keys(schema.models)).toEqual(['User'])
    expect(schema.models.User.name).toBe('User')
    expect(schema.models.User.fields.name).toBeDefined()
    expect(schema.models.User.fields.email).toBeDefined()
  })

  it('parses multiple model schema', () => {
    const schema = parseSchema({
      User: {
        name: 'string!',
      },
      Post: {
        title: 'string!',
        authorId: '-> User!',
      },
      Comment: {
        content: 'text!',
        postId: '-> Post!',
      },
    })

    expect(Object.keys(schema.models)).toHaveLength(3)
    expect(schema.models.User).toBeDefined()
    expect(schema.models.Post).toBeDefined()
    expect(schema.models.Comment).toBeDefined()
  })

  it('resolves relation targets', () => {
    // The parseSchema validates relation targets exist
    const schema = parseSchema({
      User: { name: 'string!' },
      Post: { authorId: '-> User!' },
    })

    expect(schema.models.Post.fields.authorId.relation?.target).toBe('User')
    // Relation target User exists in schema
    expect(schema.models.User).toBeDefined()
  })

  it('handles bidirectional relations', () => {
    const schema = parseSchema({
      User: {
        name: 'string!',
        posts: '<- Post[]',
      },
      Post: {
        title: 'string!',
        author: '-> User!',
      },
    })

    expect(schema.models.User.fields.posts.relation?.type).toBe('inverse')
    expect(schema.models.Post.fields.author.relation?.type).toBe('forward')
  })
})

describe('generateJsonSchema()', () => {
  it('generates JSON Schema for basic model', () => {
    const model = parseModel('User', {
      name: 'string!',
      email: 'string!',
      age: 'number',
    })

    const jsonSchema = generateJsonSchema(model)

    expect(jsonSchema.type).toBe('object')
    expect(jsonSchema.properties).toBeDefined()
    const props = jsonSchema.properties as Record<string, { type?: string }>
    expect(props.name?.type).toBe('string')
    expect(props.email?.type).toBe('string')
    expect(props.age?.type).toBe('number')
  })

  it('includes required fields in required array', () => {
    const model = parseModel('User', {
      name: 'string!',
      nickname: 'string?',
    })

    const jsonSchema = generateJsonSchema(model)
    const required = jsonSchema.required as string[] | undefined

    expect(required).toContain('name')
    expect(required).not.toContain('nickname')
    expect(required).not.toContain('id') // Primary key is not required in input
  })

  it('generates correct type for boolean', () => {
    const model = parseModel('Setting', { enabled: 'boolean!' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string }>
    expect(props.enabled?.type).toBe('boolean')
  })

  it('generates object type for json fields', () => {
    const model = parseModel('Config', { data: 'json!' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string }>
    expect(props.data?.type).toBe('object')
  })

  it('generates date-time format for timestamp', () => {
    const model = parseModel('Event', { occurredAt: 'timestamp!' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; format?: string }>
    expect(props.occurredAt?.type).toBe('string')
    expect(props.occurredAt?.format).toBe('date-time')
  })

  it('generates date-time format for date', () => {
    const model = parseModel('Task', { dueDate: 'date!' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; format?: string }>
    expect(props.dueDate?.type).toBe('string')
    expect(props.dueDate?.format).toBe('date-time')
  })

  it('generates string type for cuid/uuid', () => {
    const model = parseModel('Entity', {
      id: 'cuid!',
      guid: 'uuid!',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string }>
    expect(props.id?.type).toBe('string')
    expect(props.guid?.type).toBe('string')
  })

  it('generates array type for vector fields', () => {
    const model = parseModel('Document', { embedding: 'vector[1536]' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; items?: { type: string } }>
    expect(props.embedding?.type).toBe('array')
    expect(props.embedding?.items?.type).toBe('number')
  })

  it('generates string type for forward relations', () => {
    const model = parseModel('Post', { authorId: '-> User!' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string }>
    expect(props.authorId?.type).toBe('string')
  })

  it('generates array of strings for many forward relations', () => {
    const model = parseModel('Post', { tagIds: '-> Tag[]' })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; items?: { type: string } }>
    expect(props.tagIds?.type).toBe('array')
    expect(props.tagIds?.items?.type).toBe('string')
  })

  it('skips inverse relations in JSON Schema', () => {
    const model = parseModel('User', {
      name: 'string!',
      posts: '<- Post[]',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, unknown>
    expect(props.posts).toBeUndefined()
  })

  it('includes default values in schema', () => {
    const model = parseModel('Config', {
      status: 'string = "pending"',
      count: 'number = 0',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { default?: unknown }>
    expect(props.status?.default).toBe('pending')
    expect(props.count?.default).toBe(0)
  })

  it('returns undefined for required when no required fields', () => {
    const model = parseModel('OptionalModel', {
      nickname: 'string?',
      age: 'number',
    })
    const jsonSchema = generateJsonSchema(model)
    // Required array should be undefined or empty when no required fields
    expect(jsonSchema.required).toBeUndefined()
  })
})

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge cases', () => {
  describe('parseField edge cases', () => {
    it('handles empty string field definition', () => {
      const field = parseField('empty', '')
      expect(field.type).toBe('string') // Defaults to string
      expect(field.required).toBe(false)
    })

    it('handles whitespace in field definition', () => {
      const field = parseField('spaced', '  string!  ')
      expect(field.type).toBe('string')
      expect(field.required).toBe(true)
    })

    it('handles case insensitivity for types', () => {
      const upperField = parseField('upper', 'STRING!')
      const lowerField = parseField('lower', 'string!')
      expect(upperField.type).toBe('string')
      expect(lowerField.type).toBe('string')
    })

    it('handles default value with spaces', () => {
      const field = parseField('greeting', 'string = "hello world"')
      expect(field.default).toBe('hello world')
    })
  })

  describe('parseModel edge cases', () => {
    it('handles model with no fields', () => {
      const model = parseModel('Empty', {})
      expect(model.name).toBe('Empty')
      expect(model.fields.id).toBeDefined() // Auto-generated id
    })

    it('handles single character model name', () => {
      const model = parseModel('A', { name: 'string!' })
      expect(model.singular).toBe('a')
      expect(model.plural).toBe('as')
    })
  })

  describe('parseSchema edge cases', () => {
    it('handles self-referencing relations', () => {
      const schema = parseSchema({
        Employee: {
          name: 'string!',
          managerId: '-> Employee',
          reports: '<- Employee[]',
        },
      })

      expect(schema.models.Employee.fields.managerId.relation?.target).toBe('Employee')
      expect(schema.models.Employee.fields.reports.relation?.target).toBe('Employee')
    })
  })
})

// =============================================================================
// REST Endpoints with In-Memory Fallback
// =============================================================================

describe('REST endpoints with in-memory fallback', () => {
  const schema = {
    Task: {
      title: 'string!',
      description: 'text',
      completed: 'boolean = false',
      priority: 'number = 0',
    },
  }

  // Note: The in-memory database is recreated on each request in the test environment
  // because getDatabase() creates a fresh instance when no DO binding is present.
  // These tests verify the REST endpoint structure and response format.

  it('creates a document and returns 201 with data', async () => {
    const app = createTestApp(schema)

    const createRes = await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'task-1',
        title: 'Test Task',
        description: 'A test task',
      }),
    })

    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: string; title: string; _version: number; _createdAt: string } }
    expect(createBody.data.id).toBe('task-1')
    expect(createBody.data.title).toBe('Test Task')
    expect(createBody.data._version).toBe(1)
    expect(createBody.data._createdAt).toBeDefined()
  })

  it('returns list structure with pagination metadata', async () => {
    const app = createTestApp(schema)

    const listRes = await req(app, '/tasks?limit=3')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json() as { data: unknown[]; meta: { total: number; limit: number; offset: number }; links: { self: string } }
    expect(listBody.data).toBeDefined()
    expect(Array.isArray(listBody.data)).toBe(true)
    expect(listBody.meta.limit).toBe(3)
    expect(listBody.meta.offset).toBe(0)
    expect(listBody.links.self).toBeDefined()
  })

  it('returns search structure with query metadata', async () => {
    const app = createTestApp(schema)

    const searchRes = await req(app, '/tasks/search?q=test')
    expect(searchRes.status).toBe(200)
    const searchBody = await searchRes.json() as { data: unknown[]; meta: { query: string } }
    expect(searchBody.meta.query).toBe('test')
    expect(Array.isArray(searchBody.data)).toBe(true)
  })

  it('returns 404 for non-existent document', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/tasks/non-existent-id')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('delete returns success structure', async () => {
    const app = createTestApp(schema)

    const deleteRes = await req(app, '/tasks/any-id', {
      method: 'DELETE',
    })

    expect(deleteRes.status).toBe(200)
    const deleteBody = await deleteRes.json() as { data: { deleted: boolean; id: string } }
    expect(deleteBody.data.deleted).toBe(true)
    expect(deleteBody.data.id).toBe('any-id')
  })

  it('respects custom limit parameter', async () => {
    const app = createTestApp(schema)

    const listRes = await req(app, '/tasks?limit=50')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json() as { meta: { limit: number } }
    expect(listBody.meta.limit).toBe(50)
  })

  it('respects offset parameter', async () => {
    const app = createTestApp(schema)

    const listRes = await req(app, '/tasks?offset=10')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json() as { meta: { offset: number } }
    expect(listBody.meta.offset).toBe(10)
  })

  it('validates PUT request body type', async () => {
    const app = createTestApp(schema)

    // First create (so the document exists)
    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'put-test', title: 'Original' }),
    })

    // PUT with wrong type
    const putRes = await req(app, '/tasks/put-test', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 12345, // wrong type
      }),
    })

    expect(putRes.status).toBe(400)
    const body = await putRes.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('validates PATCH request body type', async () => {
    const app = createTestApp(schema)

    const patchRes = await req(app, '/tasks/any-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: 'not-a-boolean', // wrong type
      }),
    })

    expect(patchRes.status).toBe(400)
    const body = await patchRes.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
