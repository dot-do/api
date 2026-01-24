import { build } from 'esbuild'

await build({
  entryPoints: ['worker.ts'],
  bundle: true,
  outfile: '_worker.js',
  format: 'esm',
  target: 'es2022',
  external: ['cloudflare:*'],
  conditions: ['worker', 'browser'],
})
