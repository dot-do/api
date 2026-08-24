/**
 * jwt.api.ht/{token} — JWT structure decode (offline). Decodes header and
 * payload and interprets registered claims. DOES NOT VERIFY THE SIGNATURE —
 * every response says so. Never treat output as proof of authenticity.
 */

import type { HypertextTool, ToolContext, ToolResult } from '../registry'
import { badValue } from '../registry'

export function b64urlDecode(part: string): string | null {
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const bin = atob(padded)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

const claimTime = (v: unknown): string | null => (typeof v === 'number' ? new Date(v * 1000).toISOString() : null)

export const jwtTool: HypertextTool = {
  name: 'jwt',
  description: 'JWT decoder — header, payload, claim interpretation (signature NOT verified)',
  valueSyntax: '<jwt>',
  examples: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'],
  source: 'Offline structural decode — RFC 7519; signature is NOT verified',

  async lookup(value: string, ctx: ToolContext): Promise<ToolResult> {
    const token = value.trim()
    const parts = token.split('.')
    if (parts.length !== 3 || token.length > 8192) return badValue('Not a JWT (expected three dot-separated base64url segments)')

    const headerJson = b64urlDecode(parts[0])
    const payloadJson = b64urlDecode(parts[1])
    if (!headerJson || !payloadJson) return badValue('JWT segments are not valid base64url-encoded UTF-8')

    let header: Record<string, unknown>
    let payload: Record<string, unknown>
    try {
      header = JSON.parse(headerJson)
      payload = JSON.parse(payloadJson)
    } catch {
      return badValue('JWT segments are not valid JSON')
    }

    const now = Math.floor(Date.now() / 1000)
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined

    return {
      data: {
        header,
        payload,
        claims: {
          issuer: payload.iss ?? null,
          subject: payload.sub ?? null,
          audience: payload.aud ?? null,
          issuedAt: claimTime(payload.iat),
          notBefore: claimTime(payload.nbf),
          expiresAt: claimTime(payload.exp),
          expired: exp !== undefined ? exp < now : null,
        },
        algorithm: header.alg ?? null,
        signatureVerified: false,
        warning: 'Structural decode only — the signature is NOT verified. Do not treat any claim as authentic.',
        source: this.source,
      },
      links: {},
    }
  },
}
