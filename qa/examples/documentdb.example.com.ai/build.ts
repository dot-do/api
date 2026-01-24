import { build } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: ['worker.ts'],
  bundle: true,
  outfile: '_worker.js',
  format: 'esm',
  target: 'es2022',
  external: ['cloudflare:*'],
  conditions: ['worker', 'browser'],
  alias: {
    // @dotdo/documentdb may have similar export issues
    '@dotdo/documentdb': resolve(__dirname, '../../../node_modules/@dotdo/documentdb/dist/index.js'),
  },
})
