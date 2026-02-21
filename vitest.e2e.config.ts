import { defineConfig } from 'vitest/config'

/**
 * E2E tests against live deployed endpoints.
 *
 * Two categories:
 *   - api-framework.e2e.test.ts — validates @dotdo/api framework features via example workers
 *   - apis-do.e2e.test.ts       — validates apis.do managed service
 *
 * Run:
 *   pnpm test:e2e
 *   vitest run --config vitest.e2e.config.ts
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    environment: 'node',
    reporters: ['verbose'],
    retry: 1,
    sequence: {
      concurrent: false,
    },
  },
})
