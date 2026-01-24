import { build } from 'esbuild'
import path from 'path'

// Use local @dotdo/api from workspace root
const apiRoot = path.resolve(import.meta.dirname, '../../..')

await build({
  entryPoints: ['worker.ts'],
  bundle: true,
  outfile: '_worker.js',
  format: 'esm',
  target: 'es2022',
  external: ['oauth.do', 'rpc.do', 'cloudflare:*'],
  conditions: ['worker', 'browser'],
  alias: {
    '@dotdo/api': path.join(apiRoot, 'dist/index.js'),
  },
})
