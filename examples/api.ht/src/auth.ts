/**
 * Sign-in flow (STUBBED for the PoC — labeled everywhere it surfaces).
 *
 * Intended flow: landing → "Sign in with GitHub" → GitHub OAuth → /callback
 * exchanges the code → a free-tier API key appears immediately. The route
 * shape is wired here; the OAuth app + code exchange + key persistence are
 * not. When GITHUB_CLIENT_ID is configured the /login route redirects to the
 * real GitHub authorize URL; otherwise it short-circuits to /callback in demo
 * mode. Keys are random, unpersisted, and not yet enforced (the free tier is
 * currently anonymous).
 */

import type { Context } from 'hono'
import type { ApiEnv } from '../../../src/types'
import type { LinkContext } from './links'

export function githubAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export function demoApiKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `ht_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export function loginRedirect(c: Context<ApiEnv>, links: LinkContext): Response {
  const clientId = (c.env as Record<string, unknown> | undefined)?.GITHUB_CLIENT_ID as string | undefined
  const state = demoApiKey().slice(-16)
  if (clientId) {
    return c.redirect(githubAuthorizeUrl(clientId, links.apex('/callback'), state), 302)
  }
  // No OAuth app configured yet — demo mode goes straight to the callback.
  return c.redirect(`${links.apex('/callback')}?demo=1&state=${state}`, 302)
}

export interface CallbackResult {
  apiKey: string
  tier: 'free'
  demo: boolean
  note: string
}

export function completeCallback(c: Context<ApiEnv>): CallbackResult {
  const demo = !c.req.query('code')
  return {
    apiKey: demoApiKey(),
    tier: 'free',
    demo: true,
    note: demo
      ? 'DEMO — GitHub OAuth app not configured; this key is random, unpersisted, and not yet enforced. The free tier is currently anonymous.'
      : 'DEMO — OAuth code received but the token exchange is stubbed for the PoC; this key is random, unpersisted, and not yet enforced.',
  }
}
