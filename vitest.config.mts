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
            AUTH_HTTP: () => new Response('{}', { status: 200 }),
            HEADLESSLY: (req: Request) => {
              const url = new URL(req.url)
              // Mock entity responses
              return new Response(JSON.stringify({ data: [], total: 0, path: url.pathname }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            },
            EVENTS: () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
          },
        },
      },
    },
  },
})
