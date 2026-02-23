import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.jsonc' },
        miniflare: {
          compatibilityDate: '2026-01-24',
          compatibilityFlags: ['nodejs_compat'],
          bindings: {
            API_NAME: 'test.do',
          },
        },
      },
    },
  },
})
