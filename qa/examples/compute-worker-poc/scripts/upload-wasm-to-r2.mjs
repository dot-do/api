#!/usr/bin/env node
/**
 * Upload PGLite WASM files to R2 bucket
 *
 * This script uploads pglite.wasm and pglite.data to an R2 bucket
 * for use by the Lazy WASM DO architecture.
 *
 * Usage:
 *   node scripts/upload-wasm-to-r2.mjs
 *
 * Prerequisites:
 *   - R2 bucket "pglite-wasm" must exist
 *   - wrangler must be authenticated
 */

import { execSync } from 'child_process'
import { existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

// Path to PGLite assets
const assetsDir = join(projectRoot, 'src', 'pglite-assets')
const wasmPath = join(assetsDir, 'pglite.wasm')
const dataPath = join(assetsDir, 'pglite.data')

// R2 bucket configuration
const bucketName = 'pglite-wasm'

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function main() {
  console.log('=== Upload PGLite WASM to R2 ===\n')

  // Check if files exist
  if (!existsSync(wasmPath)) {
    console.error(`Error: ${wasmPath} not found`)
    console.error('Please ensure pglite.wasm is in the pglite-assets directory')
    process.exit(1)
  }

  if (!existsSync(dataPath)) {
    console.error(`Error: ${dataPath} not found`)
    console.error('Please ensure pglite.data is in the pglite-assets directory')
    process.exit(1)
  }

  const wasmSize = statSync(wasmPath).size
  const dataSize = statSync(dataPath).size

  console.log(`Found pglite.wasm: ${formatBytes(wasmSize)}`)
  console.log(`Found pglite.data: ${formatBytes(dataSize)}`)
  console.log()

  // Check if bucket exists (this will fail if it doesn't)
  try {
    console.log(`Checking R2 bucket "${bucketName}"...`)
    execSync(`wrangler r2 bucket list`, { stdio: 'pipe' })
    console.log('R2 access confirmed\n')
  } catch (error) {
    console.error('Error: Could not access R2. Make sure wrangler is authenticated.')
    console.error('Run: wrangler login')
    process.exit(1)
  }

  // Upload pglite.wasm
  console.log(`Uploading pglite.wasm (${formatBytes(wasmSize)})...`)
  try {
    execSync(
      `wrangler r2 object put "${bucketName}/pglite.wasm" --file="${wasmPath}" --content-type="application/wasm"`,
      { stdio: 'inherit' }
    )
    console.log('pglite.wasm uploaded successfully\n')
  } catch (error) {
    console.error('Error uploading pglite.wasm:', error.message)
    process.exit(1)
  }

  // Upload pglite.data
  console.log(`Uploading pglite.data (${formatBytes(dataSize)})...`)
  try {
    execSync(
      `wrangler r2 object put "${bucketName}/pglite.data" --file="${dataPath}" --content-type="application/octet-stream"`,
      { stdio: 'inherit' }
    )
    console.log('pglite.data uploaded successfully\n')
  } catch (error) {
    console.error('Error uploading pglite.data:', error.message)
    process.exit(1)
  }

  // Verify uploads
  console.log('Verifying uploads...')
  try {
    const listOutput = execSync(`wrangler r2 object list "${bucketName}"`, { encoding: 'utf-8' })
    console.log('\nR2 bucket contents:')
    console.log(listOutput)
  } catch (error) {
    console.error('Warning: Could not verify uploads:', error.message)
  }

  console.log('=== Upload Complete ===')
  console.log()
  console.log('The Lazy WASM DO can now fetch WASM from R2.')
  console.log('First request will cache in Cloudflare Cache for faster subsequent loads.')
}

main().catch(console.error)
