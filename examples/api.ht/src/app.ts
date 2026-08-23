/**
 * api.ht — the hypertext API surface, as a @dotdo/api instance.
 *
 * In this repo the example imports the framework from ../../src so it runs
 * (wrangler dev, vitest, tsc) without a build step. Outside the repo you
 * would `import { API } from '@dotdo/api'`.
 */

import type { Hono } from 'hono'
import { API } from '../../../src'
import type { ApiEnv } from '../../../src/types'
import { mountHypertext, type HypertextDeps } from './hypertext'

export function apiHt(deps: HypertextDeps = {}): Hono<ApiEnv> {
  return API({
    name: 'api.ht',
    description: 'Hypertext APIs — every response is JSON, every value is a link',
    version: '0.1.0',
    landing: false, // the hypertext layer owns '/' (apex + per-tool landings)
    routes: (app) => mountHypertext(app, deps),
  })
}
