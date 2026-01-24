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
  external: ['oauth.do', 'rpc.do', 'cloudflare:*'],
  conditions: ['worker', 'browser'],
  alias: {
    '@dotdo/apis': resolve(__dirname, '../../../dist/index.js'),
  },
})
