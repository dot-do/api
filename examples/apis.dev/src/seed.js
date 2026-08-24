/**
 * seed.js — the sandbox seed corpus for apis.dev (register row
 * software-it-services), produced per template spec §5.2.
 *
 * DATA CLASS, per record set (the row's source route is Class A — owned
 * corpus by construction: the estate operates the registry and the verifier):
 *
 *   - API records: REAL. Each record is derived from the named origin's own
 *     published machine face (its /.well-known/agents.json and /pricing),
 *     probed live on 2026-08-23. Nothing is restated that the origin does
 *     not itself publish; absent members mean the origin does not serve that
 *     surface (presence-when-true).
 *   - VerificationReport records: REAL observations — the probe outcomes of
 *     the same in-session run, recorded as data.
 *   - Action records: LABELED EXAMPLE DATA (`"example": true`) — a typed
 *     sample of the schema.org Action vocabulary over a fictional provider,
 *     per platform fixture law (no real company names in synthetic records).
 *
 * No record here implies a ranking. Collections are alphabetical by id.
 */

/** The API (machine-face) records — the row's data-ply record type:
 *  agents.json + openapi + pricing surface, AXP-typed; schema.org WebAPI
 *  as the generic noun. Binding: federated (derived from sibling origins'
 *  own published surfaces). */
export const apiRecords = [
  {
    $type: 'WebAPI',
    id: 'api.lawyer',
    name: 'api.lawyer',
    description:
      'Legal work as an API: everything the law leaves open runs agent-native, and the reserved acts route to independent licensed professionals who sign under their own credential.',
    card: 'https://api.lawyer/.well-known/agents.json',
    openapi: 'https://api.lawyer/openapi.json',
    llms: 'https://api.lawyer/llms.txt',
    pricing: 'https://api.lawyer/pricing',
    pricingModel: 'free',
    conformance: 'https://api.qa/api.lawyer',
    binding: 'federated',
    provenance: { source: 'probe of the origin’s published machine face', observedAt: '2026-08-23' },
  },
  {
    $type: 'WebAPI',
    id: 'api.qa',
    name: 'api.qa',
    description:
      'External third-party verifier for agent-first APIs: discovery from published machine surfaces, contract-derived deterministic checks, attested public grade reports.',
    card: 'https://api.qa/.well-known/agents.json',
    binding: 'federated',
    provenance: { source: 'probe of the origin’s published machine face', observedAt: '2026-08-23' },
  },
  {
    $type: 'WebAPI',
    id: 'apis.ax',
    name: 'apis.ax',
    description:
      'The agent-first API catalog — every high-quality API an agent needs mid-task, agent-legible by construction, worst-case cost on the wire before the first call.',
    card: 'https://apis.ax/.well-known/agents.json',
    binding: 'federated',
    provenance: { source: 'probe of the origin’s published machine face', observedAt: '2026-08-23' },
  },
  {
    $type: 'WebAPI',
    id: 'barcoding.dev',
    name: 'barcoding.dev',
    description:
      'The universal barcode and identifier layer of the visibility.cloud family — resolve / verify / generate, pure and local, on every scheme in the pinned registry.',
    card: 'https://barcoding.dev/.well-known/agents.json',
    pricing: 'https://barcoding.dev/pricing',
    pricingModel: 'free',
    binding: 'federated',
    provenance: { source: 'probe of the origin’s published machine face', observedAt: '2026-08-23' },
  },
  {
    $type: 'WebAPI',
    id: 'epcis.dev',
    name: 'epcis.dev',
    description:
      'An EPCIS 2.0 capture gateway: validated against GS1’s pinned official schema, gateway-stamped, hashed by CBV 2.0 §8.9, append-only. One door for people and agents.',
    card: 'https://epcis.dev/.well-known/agents.json',
    pricing: 'https://epcis.dev/pricing',
    pricingModel: 'free',
    binding: 'federated',
    provenance: { source: 'probe of the origin’s published machine face', observedAt: '2026-08-23' },
  },
]

/** VerificationReport records — the row's data-ply record type shared with
 *  fn-it. REAL: outcomes of the in-session probe run behind the API records
 *  above. A check not run is not listed. */
export const verificationReports = [
  {
    $type: 'VerificationReport',
    id: 'probe-2026-08-23-api.lawyer',
    subject: 'api.lawyer',
    checks: [
      { probe: 'capability card', url: 'https://api.lawyer/.well-known/agents.json', outcome: 'answers' },
      { probe: 'pricing document', url: 'https://api.lawyer/pricing', outcome: 'answers', model: 'free' },
    ],
    provenance: { source: 'in-session HTTP probe', observedAt: '2026-08-23' },
  },
  {
    $type: 'VerificationReport',
    id: 'probe-2026-08-23-api.qa',
    subject: 'api.qa',
    checks: [
      { probe: 'capability card', url: 'https://api.qa/.well-known/agents.json', outcome: 'answers' },
      { probe: 'pricing document', url: 'https://api.qa/pricing', outcome: 'does not answer' },
    ],
    provenance: { source: 'in-session HTTP probe', observedAt: '2026-08-23' },
  },
  {
    $type: 'VerificationReport',
    id: 'probe-2026-08-23-apis.ax',
    subject: 'apis.ax',
    checks: [
      { probe: 'capability card', url: 'https://apis.ax/.well-known/agents.json', outcome: 'answers' },
      { probe: 'pricing document', url: 'https://apis.ax/pricing', outcome: 'does not answer' },
    ],
    provenance: { source: 'in-session HTTP probe', observedAt: '2026-08-23' },
  },
  {
    $type: 'VerificationReport',
    id: 'probe-2026-08-23-barcoding.dev',
    subject: 'barcoding.dev',
    checks: [
      { probe: 'capability card', url: 'https://barcoding.dev/.well-known/agents.json', outcome: 'answers' },
      { probe: 'pricing document', url: 'https://barcoding.dev/pricing', outcome: 'answers', model: 'free' },
    ],
    provenance: { source: 'in-session HTTP probe', observedAt: '2026-08-23' },
  },
  {
    $type: 'VerificationReport',
    id: 'probe-2026-08-23-epcis.dev',
    subject: 'epcis.dev',
    checks: [
      { probe: 'capability card', url: 'https://epcis.dev/.well-known/agents.json', outcome: 'answers' },
      { probe: 'pricing document', url: 'https://epcis.dev/pricing', outcome: 'answers', model: 'free' },
    ],
    provenance: { source: 'in-session HTTP probe', observedAt: '2026-08-23' },
  },
]

/** Action records — the row's Action/Event catalog record type ("what can
 *  software do", cross-vendor). The full first-party catalog is not wired in
 *  this wave-zero build, so this is the §5.2 mechanically produced sandbox
 *  sample: schema.org Action types over a FICTIONAL provider, every record
 *  labeled example data. Fixture law: no real company or person names. */
export const actionRecords = [
  {
    $type: 'SearchAction',
    id: 'example-crm.contacts.search',
    name: 'Search contacts',
    provider: { $type: 'SoftwareApplication', name: 'Example CRM (fictional demo provider)' },
    example: true,
    note: 'example data — synthetic sandbox sample, labeled per platform fixture law',
  },
  {
    $type: 'CreateAction',
    id: 'example-crm.contacts.create',
    name: 'Create a contact',
    provider: { $type: 'SoftwareApplication', name: 'Example CRM (fictional demo provider)' },
    example: true,
    note: 'example data — synthetic sandbox sample, labeled per platform fixture law',
  },
  {
    $type: 'UpdateAction',
    id: 'example-issues.issue.update',
    name: 'Update an issue',
    provider: { $type: 'SoftwareApplication', name: 'Example Issue Tracker (fictional demo provider)' },
    example: true,
    note: 'example data — synthetic sandbox sample, labeled per platform fixture law',
  },
  {
    $type: 'SendAction',
    id: 'example-mail.message.send',
    name: 'Send a transactional message',
    provider: { $type: 'SoftwareApplication', name: 'Example Mailer (fictional demo provider)' },
    example: true,
    note: 'example data — synthetic sandbox sample, labeled per platform fixture law',
  },
]
