import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

/**
 * Helper to compute HMAC-SHA256 signature
 * This is what webhook consumers would use to verify signatures
 */
function computeSignature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Helper to verify webhook signature
 * Example of how consumers would verify incoming webhooks
 */
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = computeSignature(body, secret)
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) return false
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

describe('Webhook Signature Authentication', () => {
  let capturedRequests: { url: string; method: string; headers: Record<string, string>; body: string }[] = []

  beforeEach(() => {
    capturedRequests = []
    // Mock global fetch to capture webhook requests
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url instanceof Request ? url.url : url.toString()
      const headers: Record<string, string> = {}
      if (init?.headers) {
        const h = init.headers as Record<string, string>
        for (const [key, value] of Object.entries(h)) {
          headers[key.toLowerCase()] = value
        }
      }
      capturedRequests.push({
        url: urlStr,
        method: init?.method || 'GET',
        headers,
        body: init?.body as string || '',
      })
      return new Response('OK', { status: 200 })
    })
  })

  describe('generateWebhookSignatureAsync', () => {
    it('generates HMAC-SHA256 signature of request body', async () => {
      const { generateWebhookSignatureAsync } = await import('../../src/conventions/database/do')

      const body = JSON.stringify({ event: 'test', data: { id: '123' } })
      const secret = 'test-webhook-secret'

      const signature = await generateWebhookSignatureAsync(body, secret)

      // Verify it's a valid hex string
      expect(signature).toMatch(/^[a-f0-9]{64}$/)

      // Verify it matches expected HMAC-SHA256
      const expected = computeSignature(body, secret)
      expect(signature).toBe(expected)
    })

    it('produces consistent signatures for same input', async () => {
      const { generateWebhookSignatureAsync } = await import('../../src/conventions/database/do')

      const body = '{"test": true}'
      const secret = 'my-secret'

      const sig1 = await generateWebhookSignatureAsync(body, secret)
      const sig2 = await generateWebhookSignatureAsync(body, secret)

      expect(sig1).toBe(sig2)
    })

    it('produces different signatures for different bodies', async () => {
      const { generateWebhookSignatureAsync } = await import('../../src/conventions/database/do')

      const secret = 'my-secret'
      const sig1 = await generateWebhookSignatureAsync('body1', secret)
      const sig2 = await generateWebhookSignatureAsync('body2', secret)

      expect(sig1).not.toBe(sig2)
    })

    it('produces different signatures for different secrets', async () => {
      const { generateWebhookSignatureAsync } = await import('../../src/conventions/database/do')

      const body = 'same-body'
      const sig1 = await generateWebhookSignatureAsync(body, 'secret1')
      const sig2 = await generateWebhookSignatureAsync(body, 'secret2')

      expect(sig1).not.toBe(sig2)
    })
  })

  describe('Webhook sink with signature', () => {
    it('includes X-Webhook-Signature header when secret is configured', async () => {
      const { sendToWebhookSink } = await import('../../src/conventions/database/do')

      const event = {
        id: 'evt_1',
        sequence: 1,
        timestamp: new Date().toISOString(),
        operation: 'create' as const,
        model: 'User',
        documentId: 'user_1',
        after: { id: 'user_1', name: 'Test' },
      }

      const sink = {
        type: 'webhook' as const,
        url: 'https://example.com/webhook',
        secret: 'my-webhook-secret',
      }

      await sendToWebhookSink(event, sink)

      expect(capturedRequests).toHaveLength(1)
      const req = capturedRequests[0]

      expect(req.headers['x-webhook-signature']).toBeDefined()

      // Verify signature is correct
      const body = req.body
      const signature = req.headers['x-webhook-signature']
      expect(verifySignature(body, signature, 'my-webhook-secret')).toBe(true)
    })

    it('does not include X-Webhook-Signature header when no secret configured', async () => {
      const { sendToWebhookSink } = await import('../../src/conventions/database/do')

      const event = {
        id: 'evt_2',
        sequence: 2,
        timestamp: new Date().toISOString(),
        operation: 'update' as const,
        model: 'User',
        documentId: 'user_1',
        before: { id: 'user_1', name: 'Test' },
        after: { id: 'user_1', name: 'Updated' },
      }

      const sink = {
        type: 'webhook' as const,
        url: 'https://example.com/webhook',
        // No secret configured
      }

      await sendToWebhookSink(event, sink)

      expect(capturedRequests).toHaveLength(1)
      const req = capturedRequests[0]

      expect(req.headers['x-webhook-signature']).toBeUndefined()
    })

    it('includes custom headers from config', async () => {
      const { sendToWebhookSink } = await import('../../src/conventions/database/do')

      const event = {
        id: 'evt_3',
        sequence: 3,
        timestamp: new Date().toISOString(),
        operation: 'delete' as const,
        model: 'User',
        documentId: 'user_1',
        before: { id: 'user_1', name: 'Test' },
      }

      const sink = {
        type: 'webhook' as const,
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token123',
        },
      }

      await sendToWebhookSink(event, sink)

      expect(capturedRequests).toHaveLength(1)
      const req = capturedRequests[0]

      expect(req.headers['x-custom-header']).toBe('custom-value')
      expect(req.headers['authorization']).toBe('Bearer token123')
      expect(req.headers['x-webhook-signature']).toBeDefined()
    })

    it('signature is HMAC-SHA256 of the exact JSON body', async () => {
      const { sendToWebhookSink, generateWebhookSignatureAsync } = await import('../../src/conventions/database/do')

      const event = {
        id: 'evt_4',
        sequence: 4,
        timestamp: '2024-01-15T10:00:00.000Z',
        operation: 'create' as const,
        model: 'Post',
        documentId: 'post_1',
        after: { id: 'post_1', title: 'Hello World' },
      }

      const secret = 'verify-test-secret'
      const sink = {
        type: 'webhook' as const,
        url: 'https://example.com/webhook',
        secret,
      }

      await sendToWebhookSink(event, sink)

      expect(capturedRequests).toHaveLength(1)
      const req = capturedRequests[0]

      // Manually compute what the signature should be
      const expectedSignature = await generateWebhookSignatureAsync(req.body, secret)

      expect(req.headers['x-webhook-signature']).toBe(expectedSignature)
    })
  })

  describe('Webhook signature verification helper', () => {
    it('verifySignature returns true for valid signature', () => {
      const body = '{"event":"test"}'
      const secret = 'secret123'
      const signature = computeSignature(body, secret)

      expect(verifySignature(body, signature, secret)).toBe(true)
    })

    it('verifySignature returns false for invalid signature', () => {
      const body = '{"event":"test"}'
      const secret = 'secret123'
      const wrongSignature = 'invalid-signature'

      expect(verifySignature(body, wrongSignature, secret)).toBe(false)
    })

    it('verifySignature returns false for wrong secret', () => {
      const body = '{"event":"test"}'
      const signature = computeSignature(body, 'secret123')

      expect(verifySignature(body, signature, 'wrong-secret')).toBe(false)
    })

    it('verifySignature returns false for tampered body', () => {
      const originalBody = '{"event":"test"}'
      const tamperedBody = '{"event":"tampered"}'
      const secret = 'secret123'
      const signature = computeSignature(originalBody, secret)

      expect(verifySignature(tamperedBody, signature, secret)).toBe(false)
    })
  })
})
