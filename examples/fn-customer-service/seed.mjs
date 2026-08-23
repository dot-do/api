/**
 * seed.mjs — the §5.2 anon-sandbox seed corpus for the `fn-customer-service`
 * substrate, produced MECHANICALLY from the register row's record types
 * (Ticket, Conversation/resolution events, DeflectionArticle) by this
 * deterministic generator. Reseeding = re-running this module (a build step,
 * never a manual act); the corpus is versioned with the manifest.
 *
 * Fixture law: every record carries `example: true`; identifiers use the
 * demo prefix 952; people/companies are synthetic ("Example …" names only,
 * no real company or person names); all emails live under example.com;
 * no credentials, tokens, or real EIN-shaped identifiers appear anywhere.
 *
 * Live-demo ruling: this seed is tenant #1 of the real substrate — the same
 * handlers serve it that serve everything else. It is a live environment of
 * the real product over simulated data, never a faked demo.
 */

const SUBSTRATE = "fn-customer-service";
const EXAMPLE_NOTE = "labeled example record on the anonymous sandbox — simulated data, not a live customer";

/* Deterministic PRNG (mulberry32) so the corpus is byte-stable per seed. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(952_2026);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const REQUESTERS = [
  { name: "Dana Example", email: "dana@example.com" },
  { name: "Riley Example", email: "riley@example.com" },
  { name: "Sam Example", email: "sam@example.com" },
  { name: "Jordan Example", email: "jordan@example.com" },
];
const AGENTS_ = [
  { name: "Alex Example (support lead)", email: "alex@example.com" },
  { name: "Casey Example (CX)", email: "casey@example.com" },
];
const CHANNELS = ["email", "chat", "api"];

/* One row per ticket: [status, priority, subject, category] — the lifecycle
 * is exercised end-to-end: open → pending → resolved → closed, every
 * declared filter value present at least once, none named "none" so the
 * knownEmpty probes stay honest. */
const TICKET_TABLE = [
  ["open", "urgent", "[demo] API key rotation locked out our integration", "access"],
  ["open", "normal", "[demo] Webhook deliveries intermittently delayed", "integrations"],
  ["pending", "high", "[demo] CSV export drops the timezone column", "data-export"],
  ["pending", "low", "[demo] Question: sandbox retention window", "billing-and-terms"],
  ["resolved", "high", "[demo] 402 boundary returned before free quota was spent", "metering"],
  ["resolved", "normal", "[demo] Docs: conversation endpoint pagination unclear", "docs"],
  ["closed", "normal", "[demo] Duplicate workspace created during onboarding", "onboarding"],
  ["closed", "low", "[demo] Feature question: deflection article locales", "deflection"],
];

const iso = (day, h) => `2026-08-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00Z`;

export const tickets = TICKET_TABLE.map(([status, priority, subject, category], i) => {
  const id = `TCK-952-${String(i + 1).padStart(4, "0")}`;
  const requester = pick(REQUESTERS);
  const assignee = pick(AGENTS_);
  const created = iso(10 + i, 9);
  const resolved = status === "resolved" || status === "closed";
  return {
    $type: "https://schema.org/Ticket", // schema.org generic — the register row names no industry interchange standard for the Ticket record (cascade rule 2)
    id,
    example: true,
    exampleNote: EXAMPLE_NOTE,
    subject,
    status,
    priority,
    category,
    channel: pick(CHANNELS),
    requester,
    assignee,
    createdAt: created,
    updatedAt: iso(10 + i, resolved ? 17 : 11),
    ...(resolved && {
      resolution: {
        code: status === "resolved" ? "fixed" : "closed-no-further-action",
        summary: "[demo] resolved in the labeled example lifecycle — see /conversations?ticket=" + id,
        resolvedAt: iso(10 + i, 16),
      },
    }),
  };
});

/* Conversation / resolution event records — a full cycle on every resolved
 * ticket, at least one message on every ticket, so listConversations always
 * has substance and the resolution event grain is visible. */
export const conversations = tickets.flatMap((t, i) => {
  const base = [
    {
      $type: "https://schema.org/Message",
      id: `MSG-952-${String(i * 3 + 1).padStart(4, "0")}`,
      example: true,
      exampleNote: EXAMPLE_NOTE,
      ticket: t.id,
      kind: "message",
      from: t.requester.email,
      body: `[demo] ${t.subject} — original report (simulated).`,
      at: t.createdAt,
    },
    {
      $type: "https://schema.org/Message",
      id: `MSG-952-${String(i * 3 + 2).padStart(4, "0")}`,
      example: true,
      exampleNote: EXAMPLE_NOTE,
      ticket: t.id,
      kind: "message",
      from: t.assignee.email,
      body: "[demo] Acknowledged — investigating (simulated reply).",
      at: t.updatedAt,
    },
  ];
  if (t.resolution) {
    base.push({
      $type: "https://schema.org/Message",
      id: `MSG-952-${String(i * 3 + 3).padStart(4, "0")}`,
      example: true,
      exampleNote: EXAMPLE_NOTE,
      ticket: t.id,
      kind: "resolution-event",
      from: t.assignee.email,
      body: `[demo] ${t.resolution.summary}`,
      resolutionCode: t.resolution.code,
      at: t.resolution.resolvedAt,
    });
  }
  return base;
});

/* Deflection corpus — the register row's unique catch (EO #28): "not a
 * helpdesk; owned-corpus deflection" at CompanyType grain. binding:
 * `generated` (mechanically derived from the ticket corpus above). */
export const deflections = [
  ["access", "saas", "[demo] Rotating API keys without downtime"],
  ["integrations", "saas", "[demo] Verifying webhook delivery and retries"],
  ["data-export", "services-firm", "[demo] Timezone handling in CSV exports"],
  ["metering", "saas", "[demo] Reading the 402 OFFER boundary and free quotas"],
  ["onboarding", "services-firm", "[demo] One workspace per tenant: avoiding duplicates"],
].map(([topic, companyType, title], i) => ({
  $type: "https://schema.org/Article",
  id: `DFL-952-${String(i + 1).padStart(4, "0")}`,
  example: true,
  exampleNote: EXAMPLE_NOTE,
  title,
  topic,
  companyType, // the CompanyType grain the row's deflection thesis names
  derivedFrom: tickets.filter((t) => t.category === topic).map((t) => t.id),
  body: `${title} — a labeled example deflection article generated from the demo ticket corpus (substrate ${SUBSTRATE}).`,
}));
