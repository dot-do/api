import { build } from 'esbuild'

await build({
  entryPoints: ['worker.ts'],
  bundle: true,
  outfile: '_worker.js',
  format: 'esm',
  target: 'es2022',
  external: ['oauth.do', 'rpc.do', 'cloudflare:*', '@dotdo/pg-search'],
  conditions: ['worker', 'browser'],
})
