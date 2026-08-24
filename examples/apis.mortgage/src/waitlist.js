/**
 * waitlist.js — POST /waitlist, the durable KV-backed register carried over
 * from the pre-cutover waitlist property (~/projects/fin/mortgage,
 * src/index.ts, MR-J1 2026-08-02) at the 2026-08-23 cutover (#9 founder
 * ruling). The semantics are ported whole and unchanged: same KV namespace,
 * same record shape, same typed refusals (405 / 413 / 422 / 503), same
 * receipt bodies — no signup capability and no existing data path is lost.
 *
 * The door writes and never lists: no name on this list is published in
 * any form, aggregate or individual. It never answers a receipt it did not
 * earn — a failed durable write is said plainly as a 503 with the record
 * copied to the error log for hand recovery.
 */

const CONFIRMATION =
  'As soon as we’re ready for someone with your profile and requirements, we’ll be in contact.'

/** 16KB. A waitlist answer is three sentences and an address; anything past this is not one. */
const MAX_BODY_BYTES = 16 * 1024

/** Deliberately permissive: one @, no spaces, a dot in the host. It rejects what is not an
 *  address and never adjudicates which real addresses are allowed to exist. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

const NO_STORE = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

const clip = (v) => String(v ?? '').slice(0, 2000).trim()

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * A typed refusal that carries its own cure. The reader is told which field failed, what
 * would satisfy it, and that nothing was recorded — a refusal that does not say whether it
 * kept the data is a refusal the reader cannot act on.
 */
const refuse = (status, code, detail, cure) => ({
  object: 'waitlist.refused',
  status: code,
  http_status: status,
  detail,
  recorded: false,
  cure,
  contact: 'keys@apis.finance',
})

function receiptDocument(email, surface) {
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>You are on the list · apis.mortgage</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 8vh 6vw; max-width: 34rem; font: 400 17px/1.6 Piazzolla, Georgia, serif; }
  code, .mono { font-family: "Sometype Mono", ui-monospace, monospace; font-size: .86em; }
  h1 { font-size: 1.5rem; font-weight: 500; margin: 0 0 1.4rem; letter-spacing: -.01em; }
  p { margin: 0 0 1.1rem; }
  .said { opacity: .68; }
  .rule { border: 0; border-top: 1px solid currentColor; opacity: .18; margin: 2rem 0 1.4rem; }
  a { color: inherit; }
</style>
<h1>You’re on the list for apis.mortgage.</h1>
<p>The machine face of this property is live and priced. The rows this list is
   for — payoff and lien data, eNote/eVault control state, doc intelligence —
   are ROADMAP: when one ships it will be stamped LIVE on the page, its price
   will post on this property’s own rate card, and this list hears it first.</p>
<p>${CONFIRMATION}</p>
<hr class="rule">
<p class="said mono">Recorded. We answer to ${escapeHtml(email)}${
    surface ? `, and you named <strong>${escapeHtml(surface)}</strong> first` : ''
  }. A person replies from keys@apis.finance.</p>
<p class="mono"><a href="/">apis.mortgage</a> · <a href="/llms.txt">/llms.txt</a></p>
`
}

export async function handleWaitlist(request, env) {
  const ctype = request.headers.get('content-type') || ''
  const wantsJson = ctype.includes('application/json')
  const reply = (body, status) =>
    new Response(JSON.stringify(body, null, 2), { status, headers: NO_STORE })

  if (request.method !== 'POST') {
    return reply(
      refuse(405, 'METHOD_NOT_ALLOWED', 'The register takes names by POST. Nothing is readable here: this door writes and never lists, because no name on this list is ever published in any form.', {
        method: 'POST',
        content_type: 'application/x-www-form-urlencoded or application/json',
        fields: { email: 'required', building: 'optional', surface: 'optional', volume: 'optional' },
      }),
      405,
    )
  }

  // 16KB cap, enforced before the body is read where the sender declares a length, and
  // again on the bytes themselves where it does not. A declared length is a claim.
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > MAX_BODY_BYTES) {
    return reply(
      refuse(413, 'BODY_TOO_LARGE', `The submission is larger than the ${MAX_BODY_BYTES} byte cap for this door. Nothing was recorded.`, {
        max_bytes: MAX_BODY_BYTES,
        declared_bytes: declared,
        remedy: 'Shorten the answers, or write to keys@apis.finance, which has no cap and is read by the same person.',
      }),
      413,
    )
  }

  let raw
  try {
    raw = await request.text()
  } catch {
    return reply(
      refuse(400, 'BODY_UNREADABLE', 'The submission body could not be read, so nothing was recorded.', {
        remedy: 'Send the form again, or write to keys@apis.finance.',
      }),
      400,
    )
  }

  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return reply(
      refuse(413, 'BODY_TOO_LARGE', `The submission is larger than the ${MAX_BODY_BYTES} byte cap for this door. Nothing was recorded.`, {
        max_bytes: MAX_BODY_BYTES,
        remedy: 'Shorten the answers, or write to keys@apis.finance, which has no cap and is read by the same person.',
      }),
      413,
    )
  }

  let building = '', surface = '', volume = '', email = ''
  try {
    if (wantsJson) {
      const body = JSON.parse(raw)
      building = clip(body.building)
      surface = clip(body.surface)
      volume = clip(body.volume)
      email = clip(body.email)
    } else {
      const form = new URLSearchParams(raw)
      building = clip(form.get('building'))
      surface = clip(form.get('surface'))
      volume = clip(form.get('volume'))
      email = clip(form.get('email'))
    }
  } catch {
    return reply(
      refuse(422, 'BODY_UNPARSEABLE', 'The submission could not be parsed as JSON or as form data, so nothing was recorded.', {
        content_type: 'application/x-www-form-urlencoded or application/json',
        fields: { email: 'required', building: 'optional', surface: 'optional', volume: 'optional' },
      }),
      422,
    )
  }

  // The reply address is the one required field: the page promises a person
  // answers. A submission with no address cannot be answered by one, so
  // accepting it would make the promise untrue at the moment it was believed.
  if (!email) {
    const body = refuse(422, 'EMAIL_REQUIRED', 'No reply address was given, and this list is answered by a person, so a name with no address cannot be answered. Nothing was recorded.', {
      field: 'email',
      expected: 'An address a person can reply to.',
      alternative: 'keys@apis.finance, which reaches the same person.',
    })
    return reply(body, 422)
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    const body = refuse(422, 'EMAIL_INVALID', 'That reply address is not an address a person can answer, so nothing was recorded.', {
      field: 'email',
      received: email.slice(0, 120),
      expected: 'A single address of the form name@host.tld, with no spaces.',
      alternative: 'keys@apis.finance, which reaches the same person.',
    })
    return reply(body, 422)
  }

  const receivedAt = new Date().toISOString()
  const key = `${receivedAt}-${crypto.randomUUID()}`
  const record = {
    object: 'waitlist.entry',
    received_at: receivedAt,
    property: 'apis.mortgage',
    email,
    building,
    surface,
    volume,
    user_agent: request.headers.get('user-agent') || null,
    country: request.cf?.country ?? null,
  }

  // Never dropped, and never silently. If the durable write fails the reader is told the
  // truth — that they are NOT on the list — and the record goes to the log so the person
  // answering the mailbox can recover it. A 200 over a failed write is the exact thing
  // this property's villain is: a surface that lies about what it is.
  try {
    await env.WAITLIST.put(key, JSON.stringify(record))
  } catch (err) {
    console.error(
      'WAITLIST_WRITE_FAILED',
      JSON.stringify({ key, error: String(err), record }),
    )
    const body = {
      object: 'waitlist.not_recorded',
      status: 'STORAGE_UNAVAILABLE',
      http_status: 503,
      recorded: false,
      detail:
        'The register could not be written to, so you are not on the list. This is said plainly rather than answered with a receipt that is not true. Your submission was written to this property’s error log and the person who answers keys@apis.finance can recover it, but do not rely on that.',
      cure: {
        remedy: 'Send the same three answers to keys@apis.finance and a person will enter them by hand.',
        retry: 'Or post this form again.',
      },
      contact: 'keys@apis.finance',
    }
    return reply(body, 503)
  }

  if (wantsJson) {
    return reply(
      {
        object: 'waitlist.receipt',
        status: 'RECORDED',
        recorded: true,
        received_at: receivedAt,
        we_answer_to: email,
        you_named: surface || null,
        note: 'The rows this list is for — payoff/lien, eNote/eVault, doc intelligence — are ROADMAP, and joining grants no early price, no reserved capacity, no beta and no place in a queue. The list hears it first, and the order these surfaces ship in is set by what this list asks for.',
        confirmation: CONFIRMATION,
        contact: 'keys@apis.finance',
      },
      201,
    )
  }

  return new Response(receiptDocument(email, surface), {
    status: 201,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}
