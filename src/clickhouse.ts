/**
 * ClickHouse Cloud HTTP query helper.
 * Direct port of chCloudQuery from apps/api/src/index.ts.
 */

interface ChEnv {
  CLICKHOUSE_URL?: string
  CLICKHOUSE_PASSWORD?: string
}

export function getChCredentials(env: ChEnv | Record<string, unknown> | undefined | null): { url: string; password: string } | null {
  if (!env) return null
  const chUrl = (env as ChEnv).CLICKHOUSE_URL
  const chPassword = (env as ChEnv).CLICKHOUSE_PASSWORD
  if (!chUrl || !chPassword) return null
  return { url: chUrl, password: chPassword }
}

export async function chQuery(
  env: ChEnv | Record<string, unknown>,
  sql: string,
  params: Record<string, string | number> = {},
  database = 'default',
): Promise<Record<string, unknown>[]> {
  const creds = getChCredentials(env as ChEnv)
  if (!creds) throw new Error('ClickHouse Cloud not configured — set CLICKHOUSE_URL and CLICKHOUSE_PASSWORD secrets')

  const trimmed = creds.url.trim()
  const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  url.searchParams.set('default_format', 'JSON')
  url.searchParams.set('database', database)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(`param_${k}`, String(v))
  }

  const doFetch = () =>
    fetch(url.toString(), {
      method: 'POST',
      body: sql,
      headers: {
        'Content-Type': 'text/plain',
        'X-ClickHouse-User': 'default',
        'X-ClickHouse-Key': creds.password,
      },
      signal: AbortSignal.timeout(5000),
    })

  let resp = await doFetch()
  // Single retry on 5xx
  if (!resp.ok && resp.status >= 500) {
    resp = await doFetch()
  }
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`ClickHouse error (${resp.status}): ${text.slice(0, 500)}`)
  }

  return ((await resp.json()) as { data: Record<string, unknown>[] }).data
}

/** Format count with K/M suffix for display */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
