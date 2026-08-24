/**
 * Bundles worker.ts → _worker.js. esbuild is resolved from core's install
 * (`cd core && pnpm install --ignore-workspace` — the repo root on this
 * branch line has no node_modules; pre-existing layout fact, not fixed here).
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(here, '..', '..', 'core', 'package.json'))
const { build } = require('esbuild') as typeof import('esbuild')

await build({
  entryPoints: [join(here, 'worker.ts')],
  bundle: true,
  outfile: join(here, '_worker.js'),
  format: 'esm',
  target: 'es2022',
  external: ['oauth.do', 'rpc.do', 'cloudflare:*'],
  conditions: ['worker', 'browser'],
})
