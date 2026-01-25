import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['worker.ts'],
  bundle: true,
  format: 'esm',
  outfile: '_worker.js',
  platform: 'browser',
  target: 'esnext',
  external: ['cloudflare:*', '*.wasm', '*.data'],
})

console.log('Build complete')
