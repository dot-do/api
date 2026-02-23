import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { databaseConvention, parseSchema, parseField, parseModel, generateJsonSchema, buildTypeRegistry, createSqids, decodeSqid, shuffleAlphabet, matchesWhere, coerceValue } from '../../src/conventions/database'
import { responseMiddleware } from '../../src/response'
import { contextMiddleware } from '../../src/middleware/context'
import type { ApiEnv } from '../../src/types'
import type { TypeRegistry, ReverseTypeRegistry } from '../../src/conventions/database'

function createTestApp(schema: Record<string, Record<string, string>>) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'database-test' }))

  const { routes } = databaseConvention({ schema })
  app.route('', routes)

  return app
}

function createTestAppWithConfig(config: Parameters<typeof databaseConvention>[0]) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'database-test' }))

  const result = databaseConvention(config)
  app.route('', result.routes)

  return { app, ...result }
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
// 1. Extended Schema Parser Tests
// =============================================================================

describe('Extended Schema Parser', () => {
  describe('enum(a,b,c) syntax', () => {
    it('parses enum() with values', () => {
      const field = parseField('status', 'enum(active,inactive,archived)')
      expect(field.type).toBe('string')
      expect(field.enum).toEqual(['active', 'inactive', 'archived'])
      expect(field.required).toBe(false)
    })

    it('parses enum() with default value', () => {
      const field = parseField('status', 'enum(active,inactive,archived) = "active"')
      expect(field.type).toBe('string')
      expect(field.enum).toEqual(['active', 'inactive', 'archived'])
      expect(field.default).toBe('active')
    })

    it('parses required enum()', () => {
      const field = parseField('role', 'enum(admin,user,guest)!')
      expect(field.type).toBe('string')
      expect(field.enum).toEqual(['admin', 'user', 'guest'])
      expect(field.required).toBe(true)
    })
  })

  describe('pipe-separated enums', () => {
    it('parses pipe-separated enum: Lead | Qualified | Customer', () => {
      const field = parseField('stage', 'Lead | Qualified | Customer')
      expect(field.type).toBe('string')
      expect(field.enum).toEqual(['Lead', 'Qualified', 'Customer'])
    })

    it('parses pipe-separated enum with default', () => {
      const field = parseField('stage', 'Lead | Qualified | Customer = "Lead"')
      expect(field.type).toBe('string')
      expect(field.enum).toEqual(['Lead', 'Qualified', 'Customer'])
      expect(field.default).toBe('Lead')
    })

    it('parses pipe-separated enum with many values', () => {
      const field = parseField('stage', 'Lead | Qualified | Customer | Churned | Partner')
      expect(field.enum).toEqual(['Lead', 'Qualified', 'Customer', 'Churned', 'Partner'])
    })
  })

  describe('decimal(n,m)', () => {
    it('parses decimal(15,2) to number with precision/scale', () => {
      const field = parseField('amount', 'decimal(15,2)')
      expect(field.type).toBe('number')
      expect(field.precision).toBe(15)
      expect(field.scale).toBe(2)
    })

    it('parses required decimal', () => {
      const field = parseField('price', 'decimal(10,4)!')
      expect(field.type).toBe('number')
      expect(field.precision).toBe(10)
      expect(field.scale).toBe(4)
      expect(field.required).toBe(true)
    })

    it('parses decimal with default', () => {
      const field = parseField('rate', 'decimal(5,2) = 0.00')
      expect(field.type).toBe('number')
      expect(field.precision).toBe(5)
      expect(field.scale).toBe(2)
      expect(field.default).toBe(0)
    })
  })

  describe('format types', () => {
    it('parses url to string with format url', () => {
      const field = parseField('website', 'url')
      expect(field.type).toBe('string')
      expect(field.format).toBe('url')
    })

    it('parses email to string with format email', () => {
      const field = parseField('email', 'email')
      expect(field.type).toBe('string')
      expect(field.format).toBe('email')
    })

    it('parses markdown to string with format markdown', () => {
      const field = parseField('body', 'markdown')
      expect(field.type).toBe('string')
      expect(field.format).toBe('markdown')
    })

    it('parses slug to string with format slug', () => {
      const field = parseField('handle', 'slug')
      expect(field.type).toBe('string')
      expect(field.format).toBe('slug')
    })

    it('parses required url', () => {
      const field = parseField('homepage', 'url!')
      expect(field.type).toBe('string')
      expect(field.format).toBe('url')
      expect(field.required).toBe(true)
    })
  })

  describe('inline modifiers', () => {
    it('parses ## as unique + indexed', () => {
      const field = parseField('code', 'string!##')
      expect(field.unique).toBe(true)
      expect(field.indexed).toBe(true)
      expect(field.required).toBe(true)
    })

    it('parses # as indexed', () => {
      const field = parseField('slug', 'string!#')
      expect(field.indexed).toBe(true)
      expect(field.unique).toBe(false)
      expect(field.required).toBe(true)
    })

    it('parses ## on optional field', () => {
      const field = parseField('sku', 'string##')
      expect(field.unique).toBe(true)
      expect(field.indexed).toBe(true)
      expect(field.required).toBe(false)
    })
  })

  describe('backrefs with inverseField', () => {
    it('parses -> Organization.contacts with inverseField', () => {
      const field = parseField('org', '-> Organization.contacts')
      expect(field.type).toBe('relation')
      expect(field.relation?.type).toBe('forward')
      expect(field.relation?.target).toBe('Organization')
      expect(field.relation?.inverseField).toBe('contacts')
      expect(field.relation?.many).toBe(false)
    })

    it('parses <- Deal.contact[] with inverseField', () => {
      const field = parseField('deals', '<- Deal.contact[]')
      expect(field.type).toBe('relation')
      expect(field.relation?.type).toBe('inverse')
      expect(field.relation?.target).toBe('Deal')
      expect(field.relation?.inverseField).toBe('contact')
      expect(field.relation?.many).toBe(true)
    })

    it('parses forward relation with many and inverseField', () => {
      const field = parseField('tags', '-> Tag.items[]')
      expect(field.relation?.type).toBe('forward')
      expect(field.relation?.target).toBe('Tag')
      expect(field.relation?.inverseField).toBe('items')
      expect(field.relation?.many).toBe(true)
    })
  })

  describe('$id / $name metadata', () => {
    it('extracts $id as idStrategy on model', () => {
      const model = parseModel('Contact', {
        $id: 'sqid',
        name: 'string!',
        email: 'email',
      })
      expect(model.idStrategy).toBe('sqid')
      // $id should not appear as a field
      expect(model.fields.$id).toBeUndefined()
    })

    it('extracts $name as nameField on model', () => {
      const model = parseModel('Contact', {
        $name: 'fullName',
        fullName: 'string!',
        email: 'email',
      })
      expect(model.nameField).toBe('fullName')
      expect(model.fields.$name).toBeUndefined()
    })

    it('handles model with both $id and $name', () => {
      const model = parseModel('Organization', {
        $id: 'cuid',
        $name: 'title',
        title: 'string!',
      })
      expect(model.idStrategy).toBe('cuid')
      expect(model.nameField).toBe('title')
    })

    it('model without $id has no idStrategy', () => {
      const model = parseModel('Simple', {
        name: 'string!',
      })
      expect(model.idStrategy).toBeUndefined()
    })
  })

  describe('array types', () => {
    it('parses string[] as array type', () => {
      const field = parseField('tags', 'string[]')
      expect(field.type).toBe('string')
      expect(field.array).toBe(true)
    })

    it('parses number[] as array type', () => {
      const field = parseField('scores', 'number[]')
      expect(field.type).toBe('number')
      expect(field.array).toBe(true)
    })

    it('parses boolean[] as array type', () => {
      const field = parseField('flags', 'boolean[]')
      expect(field.type).toBe('boolean')
      expect(field.array).toBe(true)
    })

    it('generates JSON Schema for array fields', () => {
      const model = parseModel('Config', {
        tags: 'string[]',
        scores: 'number[]',
      })
      const jsonSchema = generateJsonSchema(model)
      const props = jsonSchema.properties as Record<string, { type?: string; items?: { type: string } }>
      expect(props.tags?.type).toBe('array')
      expect(props.tags?.items?.type).toBe('string')
      expect(props.scores?.type).toBe('array')
      expect(props.scores?.items?.type).toBe('number')
    })
  })
})

// =============================================================================
// 7. Type Registry Tests
// =============================================================================

describe('buildTypeRegistry', () => {
  it('auto-generates from schema in insertion order', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
      Deal: { title: 'string!' },
      Company: { name: 'string!' },
    })

    const registry = buildTypeRegistry(schema)
    expect(registry.forward.Contact).toBe(1)
    expect(registry.forward.Deal).toBe(2)
    expect(registry.forward.Company).toBe(3)
  })

  it('creates correct reverse mapping', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
      Deal: { title: 'string!' },
    })

    const registry = buildTypeRegistry(schema)
    expect(registry.reverse[1]).toBe('Contact')
    expect(registry.reverse[2]).toBe('Deal')
  })

  it('uses explicit registry when provided', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
      Deal: { title: 'string!' },
    })

    const explicit: TypeRegistry = { Contact: 10, Deal: 20 }
    const registry = buildTypeRegistry(schema, explicit)

    expect(registry.forward.Contact).toBe(10)
    expect(registry.forward.Deal).toBe(20)
    expect(registry.reverse[10]).toBe('Contact')
    expect(registry.reverse[20]).toBe('Deal')
  })

  it('fills gaps for models not in explicit registry', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
      Deal: { title: 'string!' },
      Company: { name: 'string!' },
    })

    // Only Contact and Deal are explicitly mapped
    const explicit: TypeRegistry = { Contact: 5, Deal: 10 }
    const registry = buildTypeRegistry(schema, explicit)

    expect(registry.forward.Contact).toBe(5)
    expect(registry.forward.Deal).toBe(10)
    // Company should be assigned next available ID after the max explicit (10)
    expect(registry.forward.Company).toBe(11)
    expect(registry.reverse[11]).toBe('Company')
  })

  it('handles empty schema', () => {
    const schema = parseSchema({})
    const registry = buildTypeRegistry(schema)
    expect(Object.keys(registry.forward)).toHaveLength(0)
    expect(Object.keys(registry.reverse)).toHaveLength(0)
  })

  it('handles empty explicit registry', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
    })

    const registry = buildTypeRegistry(schema, {})
    // With empty explicit, next ID starts at 1 (max of empty + 1)
    expect(registry.forward.Contact).toBe(1)
    expect(registry.reverse[1]).toBe('Contact')
  })
})

// =============================================================================
// 8. Sqid ID Generation Tests
// =============================================================================

describe('sqid ID generation', () => {
  it('generates IDs with minimum length', () => {
    const sqids = createSqids()

    // Encode with typical arguments
    const encoded = sqids.encode([1, Date.now(), 12345])
    expect(encoded.length).toBeGreaterThanOrEqual(8) // default minLength = 8
  })

  it('generates decodable sqids', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
      Deal: { title: 'string!' },
    })
    const registry = buildTypeRegistry(schema)
    const sqids = createSqids()

    const typeNum = registry.forward.Contact! // 1
    const timestamp = Date.now()
    const random = 42

    const encoded = sqids.encode([typeNum, timestamp, random])
    const decoded = sqids.decode(encoded)

    expect(decoded).toEqual([typeNum, timestamp, random])
  })

  it('decodeSqid parses 3-number format (no namespace)', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
    })
    const registry = buildTypeRegistry(schema)
    const sqids = createSqids()

    const typeNum = 1
    const timestamp = Date.now()
    const random = 99999

    const segment = sqids.encode([typeNum, timestamp, random])
    const fullId = `contact_${segment}`

    const decoded = decodeSqid(fullId, sqids, registry.reverse)
    expect(decoded).not.toBeNull()
    expect(decoded!.type).toBe('Contact')
    expect(decoded!.typeNum).toBe(1)
    expect(decoded!.timestamp).toBe(timestamp)
    expect(decoded!.random).toBe(random)
    expect(decoded!.namespace).toBeUndefined()
  })

  it('decodeSqid parses 4-number format (with namespace)', () => {
    const schema = parseSchema({
      Contact: { name: 'string!' },
    })
    const registry = buildTypeRegistry(schema)
    const sqids = createSqids()

    const typeNum = 1
    const namespace = 12345 // e.g., GitHub org ID
    const timestamp = Date.now()
    const random = 77777

    const segment = sqids.encode([typeNum, namespace, timestamp, random])
    const fullId = `contact_${segment}`

    const decoded = decodeSqid(fullId, sqids, registry.reverse)
    expect(decoded).not.toBeNull()
    expect(decoded!.type).toBe('Contact')
    expect(decoded!.typeNum).toBe(1)
    expect(decoded!.namespace).toBe(namespace)
    expect(decoded!.timestamp).toBe(timestamp)
    expect(decoded!.random).toBe(random)
  })

  it('decodeSqid returns null for invalid ID format (no underscore)', () => {
    const sqids = createSqids()
    const reverse: ReverseTypeRegistry = { 1: 'Contact' }

    expect(decodeSqid('nounderscore', sqids, reverse)).toBeNull()
  })

  it('decodeSqid returns null for unknown type number', () => {
    const sqids = createSqids()
    const reverse: ReverseTypeRegistry = { 1: 'Contact' }

    // Encode with type number 99 which is not in the registry
    const segment = sqids.encode([99, Date.now(), 1234])
    const fullId = `unknown_${segment}`

    expect(decodeSqid(fullId, sqids, reverse)).toBeNull()
  })

  it('generates unique IDs', () => {
    const sqids = createSqids()
    const ids = new Set<string>()
    const typeNum = 1

    for (let i = 0; i < 100; i++) {
      const timestamp = Date.now()
      const randomBytes = new Uint32Array(1)
      crypto.getRandomValues(randomBytes)
      const random = randomBytes[0]!
      const segment = sqids.encode([typeNum, timestamp, random])
      ids.add(segment)
    }

    // All 100 IDs should be unique
    expect(ids.size).toBe(100)
  })

  it('respects sqidSeed for alphabet shuffling', () => {
    const sqids1 = createSqids(12345)
    const sqids2 = createSqids(67890)

    // Same numbers, different seeds should produce different encodings
    const numbers = [1, Date.now(), 42]
    const encoded1 = sqids1.encode(numbers)
    const encoded2 = sqids2.encode(numbers)

    expect(encoded1).not.toBe(encoded2)

    // But each should decode correctly with its own instance
    expect(sqids1.decode(encoded1)).toEqual(numbers)
    expect(sqids2.decode(encoded2)).toEqual(numbers)
  })

  it('respects sqidMinLength', () => {
    const sqidsShort = createSqids(undefined, 4)
    const sqidsLong = createSqids(undefined, 16)

    const numbers = [1, 100, 200]
    const shortEncoded = sqidsShort.encode(numbers)
    const longEncoded = sqidsLong.encode(numbers)

    expect(shortEncoded.length).toBeGreaterThanOrEqual(4)
    expect(longEncoded.length).toBeGreaterThanOrEqual(16)
  })

  it('shuffleAlphabet is deterministic for same seed', () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    const result1 = shuffleAlphabet(alphabet, 42)
    const result2 = shuffleAlphabet(alphabet, 42)
    expect(result1).toBe(result2)
  })

  it('shuffleAlphabet produces different results for different seeds', () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    const result1 = shuffleAlphabet(alphabet, 1)
    const result2 = shuffleAlphabet(alphabet, 2)
    expect(result1).not.toBe(result2)
  })

  it('shuffleAlphabet preserves all characters', () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    const shuffled = shuffleAlphabet(alphabet, 42)
    expect(shuffled.length).toBe(alphabet.length)
    // Every character in the original should be in the shuffled result
    for (const char of alphabet) {
      expect(shuffled).toContain(char)
    }
  })

  it('sqid generation with namespace encodes 4 numbers', () => {
    const schema = parseSchema({ Contact: { name: 'string!' } })
    const registry = buildTypeRegistry(schema)
    const sqids = createSqids()

    // Simulate what generateSqidId does with a namespace
    const typeNum = registry.forward.Contact!
    const namespace = 54321
    const timestamp = Date.now()
    const random = 11111
    const segment = sqids.encode([typeNum, namespace, timestamp, random])
    const fullId = `contact_${segment}`

    const decoded = decodeSqid(fullId, sqids, registry.reverse)
    expect(decoded).not.toBeNull()
    expect(decoded!.namespace).toBe(54321)
    expect(decoded!.type).toBe('Contact')
  })
})

// =============================================================================
// 11. JSON Schema Generation for New Field Types
// =============================================================================

describe('generateJsonSchema for extended types', () => {
  it('includes enum values in JSON Schema', () => {
    const model = parseModel('Contact', {
      stage: 'Lead | Qualified | Customer',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; enum?: string[] }>
    expect(props.stage?.type).toBe('string')
    expect(props.stage?.enum).toEqual(['Lead', 'Qualified', 'Customer'])
  })

  it('includes format in JSON Schema for url fields', () => {
    const model = parseModel('Site', {
      homepage: 'url!',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; format?: string }>
    expect(props.homepage?.type).toBe('string')
    expect(props.homepage?.format).toBe('url')
  })

  it('includes format in JSON Schema for email fields', () => {
    const model = parseModel('User', {
      email: 'email!',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; format?: string }>
    expect(props.email?.type).toBe('string')
    expect(props.email?.format).toBe('email')
  })

  it('wraps array types correctly', () => {
    const model = parseModel('Config', {
      tags: 'string[]',
      scores: 'number[]',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; items?: { type: string } }>
    expect(props.tags?.type).toBe('array')
    expect(props.tags?.items?.type).toBe('string')
    expect(props.scores?.type).toBe('array')
    expect(props.scores?.items?.type).toBe('number')
  })

  it('generates number type for decimal fields', () => {
    const model = parseModel('Invoice', {
      amount: 'decimal(15,2)!',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string }>
    expect(props.amount?.type).toBe('number')
  })

  it('includes enum from enum() syntax in JSON Schema', () => {
    const model = parseModel('Order', {
      status: 'enum(pending,processing,shipped,delivered)',
    })
    const jsonSchema = generateJsonSchema(model)
    const props = jsonSchema.properties as Record<string, { type?: string; enum?: string[] }>
    expect(props.status?.enum).toEqual(['pending', 'processing', 'shipped', 'delivered'])
  })
})

// =============================================================================
// 13. Convention Output Structure Tests
// =============================================================================

describe('databaseConvention output structure', () => {
  it('returns routes, schema, mcpTools, and typeRegistry', () => {
    const config = {
      schema: {
        Contact: { name: 'string!' },
        Deal: { title: 'string!' },
      },
    }
    const result = databaseConvention(config)

    expect(result.routes).toBeDefined()
    expect(result.schema).toBeDefined()
    expect(result.schema.models.Contact).toBeDefined()
    expect(result.schema.models.Deal).toBeDefined()
    expect(result.mcpTools).toBeDefined()
    expect(Array.isArray(result.mcpTools)).toBe(true)
    expect(result.typeRegistry).toBeDefined()
    expect(result.typeRegistry.forward).toBeDefined()
    expect(result.typeRegistry.reverse).toBeDefined()
  })

  it('generates MCP tools for each model (create, get, list, search, update, delete)', () => {
    const result = databaseConvention({
      schema: { Contact: { name: 'string!' } },
    })

    const toolNames = result.mcpTools.map((t) => t.name)
    expect(toolNames).toContain('contact.create')
    expect(toolNames).toContain('contact.get')
    expect(toolNames).toContain('contact.list')
    expect(toolNames).toContain('contact.search')
    expect(toolNames).toContain('contact.update')
    expect(toolNames).toContain('contact.delete')
  })

  it('uses MCP prefix when configured', () => {
    const result = databaseConvention({
      schema: { Contact: { name: 'string!' } },
      mcp: { enabled: true, prefix: 'crm.' },
    })

    const toolNames = result.mcpTools.map((t) => t.name)
    expect(toolNames).toContain('crm.contact.create')
    expect(toolNames).toContain('crm.contact.get')
  })

  it('returns sqids instance when idFormat is sqid', () => {
    const result = databaseConvention({
      schema: { Contact: { name: 'string!' } },
      idFormat: 'sqid',
    })
    expect(result.sqids).toBeDefined()
  })

  it('does not return sqids instance when idFormat is not sqid', () => {
    const result = databaseConvention({
      schema: { Contact: { name: 'string!' } },
    })
    expect(result.sqids).toBeUndefined()
  })
})

// =============================================================================
// 14. Logical Operators ($or, $and, $not, $nor) via matchesWhere
// =============================================================================

describe('Logical operators ($or, $and, $not, $nor)', () => {
  // Test matchesWhere directly since logical operators cannot be easily expressed via URL query params
  it('$or matches if ANY clause matches', () => {
    const doc = { id: '1', name: 'Widget', category: 'tools', price: 10 }

    expect(matchesWhere(doc, { $or: [{ category: 'tools' }, { category: 'electronics' }] })).toBe(true)
    expect(matchesWhere(doc, { $or: [{ category: 'electronics' }, { category: 'misc' }] })).toBe(false)
  })

  it('$or with operator conditions', () => {
    const doc = { id: '1', name: 'Widget', price: 10 }

    expect(matchesWhere(doc, { $or: [{ price: { $gt: 50 } }, { name: 'Widget' }] })).toBe(true)
    expect(matchesWhere(doc, { $or: [{ price: { $gt: 50 } }, { price: { $lt: 5 } }] })).toBe(false)
  })

  it('$and matches if ALL clauses match', () => {
    const doc = { id: '1', name: 'Widget', category: 'tools', price: 10 }

    expect(matchesWhere(doc, { $and: [{ category: 'tools' }, { price: 10 }] })).toBe(true)
    expect(matchesWhere(doc, { $and: [{ category: 'tools' }, { price: 20 }] })).toBe(false)
  })

  it('$and with operator conditions', () => {
    const doc = { id: '1', name: 'Widget', price: 10 }

    expect(matchesWhere(doc, { $and: [{ price: { $gte: 5 } }, { price: { $lte: 15 } }] })).toBe(true)
    expect(matchesWhere(doc, { $and: [{ price: { $gte: 5 } }, { price: { $lte: 8 } }] })).toBe(false)
  })

  it('$not rejects if clause matches', () => {
    const doc = { id: '1', name: 'Widget', category: 'tools', price: 10 }

    expect(matchesWhere(doc, { $not: { category: 'electronics' } })).toBe(true)
    expect(matchesWhere(doc, { $not: { category: 'tools' } })).toBe(false)
  })

  it('$not with operator conditions', () => {
    const doc = { id: '1', name: 'Widget', price: 10 }

    expect(matchesWhere(doc, { $not: { price: { $gt: 50 } } })).toBe(true)
    expect(matchesWhere(doc, { $not: { price: { $lt: 50 } } })).toBe(false)
  })

  it('$nor rejects if ANY clause matches', () => {
    const doc = { id: '1', name: 'Widget', category: 'tools', price: 10 }

    expect(matchesWhere(doc, { $nor: [{ category: 'electronics' }, { category: 'misc' }] })).toBe(true)
    expect(matchesWhere(doc, { $nor: [{ category: 'electronics' }, { category: 'tools' }] })).toBe(false)
  })

  it('nested logical operators', () => {
    const doc = { id: '1', name: 'Widget', category: 'tools', price: 10, active: true }

    // $or nested within $and: (category is tools OR electronics) AND (price < 20)
    expect(
      matchesWhere(doc, {
        $and: [{ $or: [{ category: 'tools' }, { category: 'electronics' }] }, { price: { $lt: 20 } }],
      })
    ).toBe(true)

    // Same but price doesn't match
    expect(
      matchesWhere(doc, {
        $and: [{ $or: [{ category: 'tools' }, { category: 'electronics' }] }, { price: { $gt: 20 } }],
      })
    ).toBe(false)
  })
})

// =============================================================================
// 23. coerceValue Tests
// =============================================================================

describe('coerceValue', () => {
  it('coerces "true" to boolean true', () => {
    expect(coerceValue('true')).toBe(true)
  })

  it('coerces "false" to boolean false', () => {
    expect(coerceValue('false')).toBe(false)
  })

  it('coerces "null" to null', () => {
    expect(coerceValue('null')).toBe(null)
  })

  it('coerces numeric strings to numbers', () => {
    expect(coerceValue('42')).toBe(42)
    expect(coerceValue('3.14')).toBe(3.14)
    expect(coerceValue('-10')).toBe(-10)
    expect(coerceValue('0')).toBe(0)
  })

  it('leaves non-numeric strings as strings', () => {
    expect(coerceValue('hello')).toBe('hello')
    expect(coerceValue('abc123')).toBe('abc123')
  })

  it('leaves empty string as string', () => {
    expect(coerceValue('')).toBe('')
  })
})
