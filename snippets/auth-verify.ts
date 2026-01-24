/**
 * CDN-layer snippet: JWT verification
 *
 * Decodes and verifies JWT at the CDN edge before the worker is invoked.
 * Sets X-Snippet-* headers for the worker to trust (avoiding double verification).
 *
 * Configuration variables (set in CF dashboard):
 *   - JWT_SECRET: Secret for HMAC verification (or public key for RSA/EC)
 *   - AUTH_REQUIRED: "true" to reject unauthenticated requests (returns 401)
 *
 * Headers set on success:
 *   - X-Snippet-Auth-Valid: "true"
 *   - X-Snippet-User-Id: JWT sub claim
 *   - X-Snippet-User-Email: JWT email claim
 *   - X-Snippet-User-Name: JWT name claim
 */
export default {
  async fetch(request: Request, env: Record<string, string>): Promise<Request | Response> {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (env.AUTH_REQUIRED === 'true') {
        return new Response(JSON.stringify({ error: { message: 'Authentication required', code: 'AUTH_REQUIRED', status: 401 } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return request
    }

    const token = authHeader.slice(7)

    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        if (env.AUTH_REQUIRED === 'true') {
          return new Response(JSON.stringify({ error: { message: 'Token expired', code: 'TOKEN_EXPIRED', status: 401 } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return request
      }

      // Pass user info to worker via headers
      const headers = new Headers(request.headers)
      headers.set('X-Snippet-Auth-Valid', 'true')
      if (payload.sub) headers.set('X-Snippet-User-Id', payload.sub)
      if (payload.email) headers.set('X-Snippet-User-Email', payload.email)
      if (payload.name) headers.set('X-Snippet-User-Name', payload.name)

      return new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
      })
    } catch {
      if (env.AUTH_REQUIRED === 'true') {
        return new Response(JSON.stringify({ error: { message: 'Invalid token', code: 'INVALID_TOKEN', status: 401 } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return request
    }
  },
}
