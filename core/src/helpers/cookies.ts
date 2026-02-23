/** Extract token from auth cookie (oauth.do convention) or wos-session (WorkOS AuthKit) */
export function extractCookieToken(cookie?: string): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/) || cookie.match(/(?:^|;\s*)wos-session=([^;]+)/)
  return match?.[1]
}
