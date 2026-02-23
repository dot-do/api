/**
 * Example: Schema-Driven Database API
 *
 * This example shows how to use the database convention to create
 * a full CRUD API with MCP tools and event streaming from a schema.
 *
 * The schema defines the DO, the DO exposes the API.
 */

import { API, DatabaseDO } from '@dotdo/api'

// =============================================================================
// Schema Definition
// =============================================================================

// Define your data model using IceType-inspired shorthand
const schema = {
  User: {
    id: 'cuid!',
    email: 'string! #unique',
    name: 'string!',
    avatar: 'string?',
    role: 'string = "user"',
    posts: '<- Post[]', // Inverse relation: posts by this user
  },
  Post: {
    id: 'cuid!',
    title: 'string!',
    content: 'text', // Full-text searchable
    published: 'boolean = false',
    author: '-> User!', // Forward relation: required
    comments: '<- Comment[]',
  },
  Comment: {
    id: 'cuid!',
    content: 'text!',
    author: '-> User!',
    post: '-> Post!',
  },
}

// =============================================================================
// API Configuration
// =============================================================================

export default API({
  name: 'blog-api',
  description: 'Blog API with users, posts, and comments',
  version: '1.0.0',

  // Schema-driven database
  // This automatically generates:
  // - REST: GET/POST/PUT/DELETE /users, /posts, /comments
  // - MCP: user.create, user.get, user.list, post.create, etc.
  // - Events: Streams to configured sinks
  database: {
    schema,
    binding: 'DB', // Durable Object binding name
    namespace: 'default', // Or: (c) => c.req.header('X-Tenant-Id')

    // Event streaming configuration
    events: [
      { type: 'lakehouse', binding: 'LAKEHOUSE' },
      { type: 'queue', binding: 'EVENTS' },
      // { type: 'webhook', url: 'https://hooks.example.com/events' },
    ],

    // REST configuration
    rest: {
      basePath: '', // Mount at root
      pageSize: 20,
      maxPageSize: 100,
    },

    // MCP tools enabled by default
    mcp: {
      enabled: true,
      prefix: '', // Tool names: user.create, post.list, etc.
    },

    // WebSocket subscriptions enabled
    subscriptions: true,
  },

  // Optional: Add authentication
  auth: {
    mode: 'optional', // Allow anonymous access, but track user if authenticated
  },

  // Embedded tests - discoverable via /qa endpoint
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['blog-api', 'database'],
    endpoints: [
      {
        path: '/users',
        method: 'POST',
        tests: [
          {
            name: 'creates user with valid data',
            tags: ['smoke', 'crud'],
            request: {
              body: { email: 'test@example.com', name: 'Test User' },
            },
            expect: {
              status: 201,
              body: { 'data.name': 'Test User', 'data.email': 'test@example.com' },
            },
          },
          {
            name: 'rejects user without email',
            tags: ['validation'],
            request: {
              body: { name: 'No Email' },
            },
            expect: {
              status: 400,
            },
          },
        ],
      },
      {
        path: '/users',
        method: 'GET',
        tests: [
          {
            name: 'lists users with pagination',
            tags: ['smoke', 'crud'],
            expect: {
              status: 200,
              body: { 'data': { type: 'array' } },
            },
          },
        ],
      },
    ],
  },

  // MCP tools with embedded test cases
  mcp: {
    name: 'blog-mcp',
    tools: [
      {
        name: 'user.create',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 1 },
          },
          required: ['email', 'name'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
        examples: [
          {
            name: 'create alice',
            input: { email: 'alice@example.com', name: 'Alice' },
            output: { id: 'usr_123', email: 'alice@example.com', name: 'Alice' },
          },
        ],
        tests: [
          {
            name: 'creates user successfully',
            input: { email: 'bob@example.com', name: 'Bob' },
            expect: {
              status: 'success',
              output: { name: 'Bob', email: 'bob@example.com' },
              match: 'partial',
            },
          },
          {
            name: 'rejects invalid email',
            input: { email: 'invalid', name: 'Test' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input, c) => {
          // The database convention handles this - placeholder for MCP test metadata
          return { error: 'Use database convention endpoints' }
        },
      },
    ],
  },
})

// =============================================================================
// Export the Database DO
// =============================================================================

// The DO class that stores the data
// See wrangler.jsonc for binding configuration
export { DatabaseDO }

// =============================================================================
// Usage Examples
// =============================================================================

/*
REST Endpoints (auto-generated):

  # List users
  GET /users
  GET /users?limit=10&offset=0&orderBy=name

  # Search users
  GET /users/search?q=alice

  # Create user
  POST /users
  { "email": "alice@example.com", "name": "Alice" }

  # Get user with relations
  GET /users/usr_123?include=posts

  # Get user's posts
  GET /users/usr_123/posts

  # Update user
  PUT /users/usr_123
  { "name": "Alice Smith" }

  # Delete user (soft delete)
  DELETE /users/usr_123

MCP Tools (auto-generated):

  POST /mcp
  { "jsonrpc": "2.0", "method": "tools/list", "id": 1 }

  POST /mcp
  {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "user.create",
      "arguments": { "email": "bob@example.com", "name": "Bob" }
    },
    "id": 2
  }

Events:

  # Get recent events
  GET /events?since=0&limit=100&model=User

  # WebSocket subscription
  ws://api.example.com/events/ws?model=Post

  # Event format:
  {
    "id": "evt_1",
    "sequence": 1,
    "timestamp": "2026-01-24T12:00:00.000Z",
    "operation": "create",
    "model": "User",
    "documentId": "usr_123",
    "after": { "id": "usr_123", "email": "alice@example.com", "name": "Alice" },
    "userId": "auth_user_id",
    "requestId": "req_abc"
  }
*/
