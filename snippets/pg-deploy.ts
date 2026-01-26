#!/usr/bin/env npx tsx
/**
 * Deploy PostgreSQL Snippets to Cloudflare
 *
 * Usage:
 *   npx tsx snippets/pg-deploy.ts
 *
 * Environment variables (or use .env):
 *   CF_API_TOKEN - Cloudflare API token with Zone.Snippets permissions
 *   CF_ZONE_ID - Cloudflare Zone ID for postgres.do
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env from dotdo if available
const envPath = join(process.env.HOME || '', 'projects/dotdo/.env')
try {
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=')
      if (key && value && !process.env[key]) {
        process.env[key] = value.trim()
      }
    }
  }
} catch {
  // .env not found, use existing env vars
}

const CF_API_TOKEN = process.env.CF_API_TOKEN
const CF_ZONE_ID = process.env.CF_ZONE_ID

if (!CF_API_TOKEN || !CF_ZONE_ID) {
  console.error('Missing CF_API_TOKEN or CF_ZONE_ID')
  console.error('Set these in environment or ~/projects/dotdo/.env')
  process.exit(1)
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4'

interface SnippetRule {
  snippet_name: string
  expression: string
  enabled?: boolean
  description?: string
}

/**
 * Compile TypeScript snippet to JavaScript
 */
function compileSnippet(tsPath: string): string {
  const jsPath = tsPath.replace('.ts', '.js')

  // Use esbuild for fast, minimal compilation
  try {
    execSync(`npx esbuild ${tsPath} --bundle --platform=browser --format=esm --outfile=${jsPath}`, {
      cwd: __dirname,
      stdio: 'pipe',
    })
    return readFileSync(jsPath, 'utf-8')
  } catch (err) {
    console.error(`Failed to compile ${tsPath}:`, err)
    throw err
  }
}

async function deploySnippet(
  name: string,
  code: string,
  expression?: string,
  description?: string
): Promise<void> {
  console.log(`\nDeploying snippet: ${name}`)
  console.log(`Code size: ${code.length} bytes (${(code.length / 1024).toFixed(1)} KB)`)

  if (code.length > 32 * 1024) {
    console.warn(`Warning: Code size exceeds 32KB limit!`)
  }

  // Step 1: Upload the snippet code
  const formData = new FormData()
  const codeBlob = new Blob([code], { type: 'application/javascript' })
  formData.append('files', codeBlob, 'snippet.js')
  formData.append('metadata', JSON.stringify({ main_module: 'snippet.js' }))

  const uploadResponse = await fetch(`${CF_API_BASE}/zones/${CF_ZONE_ID}/snippets/${name}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
    },
    body: formData,
  })

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text()
    throw new Error(`Failed to upload snippet: ${uploadResponse.status} - ${errorBody}`)
  }

  const uploadResult = (await uploadResponse.json()) as {
    success: boolean
    result: { snippet_name: string; created_on: string; modified_on: string }
    errors?: Array<{ message: string }>
  }

  if (!uploadResult.success) {
    const errorMsg = uploadResult.errors?.map((e) => e.message).join(', ') || 'Unknown error'
    throw new Error(`Snippet upload failed: ${errorMsg}`)
  }

  console.log(`  Snippet uploaded: ${uploadResult.result.snippet_name}`)

  // Step 2: Update snippet rules if expression provided
  if (expression) {
    const headers = {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    }

    // Get existing rules
    const rulesResponse = await fetch(`${CF_API_BASE}/zones/${CF_ZONE_ID}/snippets/snippet_rules`, {
      headers,
    })

    let existingRules: SnippetRule[] = []
    if (rulesResponse.ok) {
      const rulesResult = (await rulesResponse.json()) as {
        success: boolean
        result: SnippetRule[] | { rules: SnippetRule[] }
      }
      existingRules = Array.isArray(rulesResult.result)
        ? rulesResult.result
        : rulesResult.result?.rules || []
    }

    // Update or add rule
    const ruleIndex = existingRules.findIndex((r) => r.snippet_name === name)
    const newRule: SnippetRule = {
      snippet_name: name,
      expression,
      enabled: true,
      description: description || `Rule for ${name} snippet`,
    }

    if (ruleIndex >= 0) {
      existingRules[ruleIndex] = newRule
    } else {
      existingRules.push(newRule)
    }

    const updateRulesResponse = await fetch(
      `${CF_API_BASE}/zones/${CF_ZONE_ID}/snippets/snippet_rules`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: existingRules }),
      }
    )

    if (!updateRulesResponse.ok) {
      console.warn('  Warning: Rule update failed')
    } else {
      console.log(`  Rule updated: ${expression}`)
    }
  }

  console.log(`  Snippet "${name}" deployed successfully`)
}

async function listSnippets(): Promise<void> {
  const response = await fetch(`${CF_API_BASE}/zones/${CF_ZONE_ID}/snippets`, {
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to list snippets: ${response.status}`)
  }

  const result = (await response.json()) as {
    success: boolean
    result: Array<{ snippet_name: string; created_on: string; modified_on: string }>
  }

  console.log('\nExisting snippets:')
  for (const snippet of result.result || []) {
    console.log(`  - ${snippet.snippet_name} (modified: ${snippet.modified_on})`)
  }
}

async function main() {
  console.log('='.repeat(65))
  console.log('  PostgreSQL Snippet Deployment')
  console.log('='.repeat(65))
  console.log(`Zone ID: ${CF_ZONE_ID}`)

  // List existing snippets
  await listSnippets()

  // Deploy pg-query-buffer snippet
  try {
    const queryBufferCode = compileSnippet(join(__dirname, 'pg-query-buffer.ts'))
    await deploySnippet(
      'pg_query_buffer',
      queryBufferCode,
      '(http.host eq "postgres.do" and starts_with(http.request.uri.path, "/pg"))',
      'PostgreSQL query batching for cost optimization'
    )
  } catch (err) {
    console.error('Failed to deploy pg-query-buffer:', err)
  }

  // Deploy pg-ws-pool snippet
  try {
    const wsPoolCode = compileSnippet(join(__dirname, 'pg-ws-pool.ts'))
    await deploySnippet(
      'pg_ws_pool',
      wsPoolCode,
      '(http.host eq "postgres.do" and starts_with(http.request.uri.path, "/ws-pool"))',
      'PostgreSQL WebSocket connection pool for tenant DOs'
    )
  } catch (err) {
    console.error('Failed to deploy pg-ws-pool:', err)
  }

  // Deploy pg-session snippet
  try {
    const sessionCode = compileSnippet(join(__dirname, 'pg-session.ts'))
    await deploySnippet(
      'pg_session',
      sessionCode,
      '(http.host eq "postgres.do" and starts_with(http.request.uri.path, "/session"))',
      'PostgreSQL session-aware connection pooling'
    )
  } catch (err) {
    console.error('Failed to deploy pg-session:', err)
  }

  console.log('\n' + '='.repeat(65))
  console.log('  Deployment Complete!')
  console.log('='.repeat(65))
  console.log('\nTest snippets:')
  console.log('')
  console.log('  # Query buffer stats')
  console.log('  curl https://postgres.do/pg/stats')
  console.log('')
  console.log('  # Execute batched query')
  console.log('  curl -X POST https://postgres.do/pg/query \\')
  console.log('    -H "Content-Type: application/json" \\')
  console.log("    -d '{\"tenantId\":\"test\",\"sql\":\"SELECT 1+1 as result\"}'")
  console.log('')
  console.log('  # WebSocket pool stats')
  console.log('  curl https://postgres.do/ws-pool/stats')
  console.log('')
  console.log('  # Session stats')
  console.log('  curl https://postgres.do/session/stats')
}

main().catch((err) => {
  console.error('Deployment failed:', err.message)
  process.exit(1)
})
