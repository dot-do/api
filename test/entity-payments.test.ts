/**
 * GET /:id for Stripe-native ids → payments.do over the PaymentsInternal RPC
 * binding (dot-do/payments.do#2). The lookup is a typed method call carrying
 * only the id: no HTTP request, no bearer, and none of the caller's headers.
 */

import { describe, it, expect, vi } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'

function fakePayments() {
  const found = async ({ id }: { id: string }) => ({ id, object: id.split('_')[0] })
  return {
    createCustomer: vi.fn(),
    createSubscription: vi.fn(),
    getCustomer: vi.fn(found),
    getSubscription: vi.fn(found),
    getInvoice: vi.fn(found),
    getCharge: vi.fn(found),
    getProduct: vi.fn(found),
    getPrice: vi.fn(found),
    // A PaymentsInternal binding has no fetch; keep a spy so a regression to HTTP is visible.
    fetch: vi.fn(),
  }
}

/** The kind of inbound request a browser or SDK sends — none of it may reach payments.do. */
const callerHeaders = {
  Authorization: 'Bearer user_session_token',
  'Stripe-Account': 'acct_attacker',
  Cookie: 'session=abc',
  'x-tenant': 'evil',
}

async function lookup(id: string, payments: ReturnType<typeof fakePayments> | undefined) {
  return app.request(`https://apis.do/${id}`, { headers: callerHeaders }, { ...env, PAYMENTS: payments })
}

describe('Stripe-native id lookup over PaymentsInternal', () => {
  it('resolves cus_* through getCustomer with only the id', async () => {
    const payments = fakePayments()

    const res = await lookup('cus_abc123', payments)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'cus_abc123', object: 'cus' })
    expect(payments.getCustomer).toHaveBeenCalledTimes(1)
    expect(payments.getCustomer).toHaveBeenCalledWith({ id: 'cus_abc123' })
    expect(payments.fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['sub_abc123', 'getSubscription'],
    ['inv_abc123', 'getInvoice'],
    ['ch_abc123', 'getCharge'],
    ['prod_abc123', 'getProduct'],
    ['price_abc123', 'getPrice'],
  ] as const)('resolves %s through %s', async (id, method) => {
    const payments = fakePayments()

    const res = await lookup(id, payments)

    expect(res.status).toBe(200)
    expect(payments[method]).toHaveBeenCalledWith({ id })
    for (const other of ['getCustomer', 'getSubscription', 'getInvoice', 'getCharge', 'getProduct', 'getPrice'] as const) {
      if (other !== method) expect(payments[other]).not.toHaveBeenCalled()
    }
    expect(payments.fetch).not.toHaveBeenCalled()
  })

  it('never forwards the connected-account header as a pivot', async () => {
    const payments = fakePayments()

    await lookup('cus_abc123', payments)

    const [input] = payments.getCustomer.mock.calls[0]
    expect(input).not.toHaveProperty('stripeAccount')
    expect(Object.keys(input)).toEqual(['id'])
  })

  it.each(['pi_abc123', 'pm_abc123', 'si_abc123', 'il_abc123', 'txn_abc123'])(
    '%s has no read on payments.do and answers 404 instead of being forwarded',
    async (id) => {
      const payments = fakePayments()

      const res = await lookup(id, payments)

      expect(res.status).toBe(404)
      expect(payments.fetch).not.toHaveBeenCalled()
      for (const method of ['getCustomer', 'getSubscription', 'getInvoice', 'getCharge', 'getProduct', 'getPrice'] as const) {
        expect(payments[method]).not.toHaveBeenCalled()
      }
    },
  )

  it('answers 502 with the sanitized message when payments.do refuses', async () => {
    const payments = fakePayments()
    payments.getCustomer.mockRejectedValue(new Error('No such customer: cus_missing'))

    const res = await lookup('cus_missing', payments)

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: { message: 'No such customer: cus_missing', code: 'PAYMENTS_ERROR', status: 502 } })
  })

  it('answers 404 when the PAYMENTS binding is absent', async () => {
    const res = await lookup('cus_abc123', undefined)
    expect(res.status).toBe(404)
  })
})
