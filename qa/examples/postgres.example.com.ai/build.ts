import { build } from 'esbuild'

await build({
  entryPoints: ['worker.ts'],
  bundle: true,
  outfile: '_worker.js',
  format: 'esm',
  target: 'es2022',
  external: ['cloudflare:*', '@electric-sql/pglite', 'oauth.do', 'rpc.do'],
  conditions: ['worker', 'browser'],
})
