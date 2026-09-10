/**
 * Contract of payments.do's `PaymentsInternal` Workers RPC entrypoint.
 *
 * Verbatim copy of dot-do/payments.do `src/rpc-types.ts` (the packages are not
 * linked); keep the two in step. Bound in wrangler.jsonc as
 * `{ "binding": "PAYMENTS", "service": "payments-do", "entrypoint": "PaymentsInternal" }`
 * — the binding is the authorization boundary (dot-do/payments.do#2); there is
 * no bearer and no HTTP surface. Return types name only the fields a consumer
 * relies on; the full Stripe object is what crosses the wire at runtime.
 *
 * The connected-account pivot is the explicit `stripeAccount` field on every
 * input — it is never read from a header on this surface.
 */

/** Stripe Connect scoping. Omit `stripeAccount` to act on the platform account. */
export interface ConnectScope {
  stripeAccount?: string
}

export interface CreateCustomerInput extends ConnectScope {
  email?: string
  name?: string
  metadata?: Record<string, string>
}

export interface CreateSubscriptionInput extends ConnectScope {
  customer: string
  items: Array<{ price: string }>
  metadata?: Record<string, string>
}

export interface RetrieveInput extends ConnectScope {
  id: string
}

/** The subset of any Stripe object every consumer can rely on. */
export interface StripeObjectRef {
  id: string
  object: string
}

export interface SubscriptionRef extends StripeObjectRef {
  status: string
}

/** One method per operation the service-binding consumers perform. */
export interface PaymentsInternalApi {
  createCustomer(input: CreateCustomerInput): Promise<StripeObjectRef>
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRef>
  getCustomer(input: RetrieveInput): Promise<StripeObjectRef>
  getSubscription(input: RetrieveInput): Promise<SubscriptionRef>
  getInvoice(input: RetrieveInput): Promise<StripeObjectRef>
  getCharge(input: RetrieveInput): Promise<StripeObjectRef>
  getProduct(input: RetrieveInput): Promise<StripeObjectRef>
  getPrice(input: RetrieveInput): Promise<StripeObjectRef>
}
