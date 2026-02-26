import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test-e2e/**', 'node_modules/**'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          serviceBindings: {
            AUTH: () => new Response('{}', { status: 200 }),
            OAUTH: () => new Response('{}', { status: 200 }),
            EVENTS: () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
            DATABASE: () => new Response('{}', { status: 200 }),
            OBJECTS: () => new Response('{}', { status: 200 }),
            CODE: () => new Response('{}', { status: 200 }),
            AGENTS: () => new Response('{}', { status: 200 }),
            PAYMENTS: () => new Response('{}', { status: 200 }),
            GITHUB: () => new Response('{}', { status: 200 }),
            CLOUDFLARE: () => new Response('{}', { status: 200 }),
            MCP_SERVER: () => new Response('{}', { status: 200 }),
            TAIL: () => new Response('{}', { status: 200 }),
          },
        },
      },
    },
  },
})
