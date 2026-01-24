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
    // postgres.do package has incorrect exports (.mjs vs .js)
    'postgres.do': resolve(__dirname, '../../../node_modules/postgres.do/dist/index.js'),
  },
})
