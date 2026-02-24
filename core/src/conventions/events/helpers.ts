// .do/api/core/src/conventions/events/helpers.ts

/** Infer scope from hostname */
export function inferScope(hostname: string): string | '*' {
  // Unscoped domains
  if (/^(events|apis)(\.workers)?\.do$/.test(hostname)) return '*'
  // Extract: {service}.do or {service}.workers.do
  const match = hostname.match(/^([^.]+)\.(workers\.)?do$/)
  if (match) return match[1]
  return '*'
}

/** Format count with K/M suffix */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Clamp integer */
export function safeInt(val: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(val || String(fallback), 10)
  return Math.min(Math.max(isNaN(n) ? fallback : n, min), max)
}
