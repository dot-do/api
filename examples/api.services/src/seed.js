/**
 * seed.js — the anon-sandbox seed corpus for api.services (fn-service-delivery),
 * produced mechanically from the register row's G1 anchors per the property
 * template §5.2:
 *
 *   - Service records are NAPCS-register-shaped (the sellable-outcome grain);
 *     WorkOrder decomposition follows the O*NET task grain; Engagement/Outcome
 *     follow schema.org Service/Offer generics (no industry interchange
 *     standard is recorded for this row — cascade rule 2 fallback).
 *   - EVERY record is synthetic and labeled: `example: true` plus a [demo]
 *     marker in its title. Fixture law: no real company or person names; no
 *     real identifiers; the provider/client names below are invented for this
 *     sandbox and collide with no registered business name we could find.
 *   - The sandbox is the real product surface over simulated data — the same
 *     handlers serve seed and (future) live tenants; nothing here is a faked
 *     demo screenshot.
 *
 * Retention disclosure (served with every minted record): sandbox state is
 * ephemeral and in-memory per isolate; it may reset at any time.
 */

export const SEED_VERSION = "2026-08-23.1";

export const RETENTION =
  "sandbox retention: ephemeral, in-memory per isolate — state may reset at any time; example data only";

/** Service — the NAPCS-grain sellable service product (data ply). */
export const services = [
  {
    id: "svc-demo-close-books",
    $type: "Service",
    example: true,
    title: "[demo] Monthly bookkeeping close — completed, verified",
    category: "professional",
    tag: "finance",
    register: "NAPCS",
    serviceClass: "Accounting and bookkeeping services",
    outcome: "a reconciled month-end close, delivered as a verified outcome record",
    priceCharacter: "per-outcome",
  },
  {
    id: "svc-demo-hvac-maintenance",
    $type: "Service",
    example: true,
    title: "[demo] HVAC preventive-maintenance visit",
    category: "field",
    tag: "facilities",
    register: "NAPCS",
    serviceClass: "Heating and air-conditioning maintenance services",
    outcome: "a completed on-site maintenance visit with a signed work-order record",
    priceCharacter: "per-visit",
  },
  {
    id: "svc-demo-contract-review",
    $type: "Service",
    example: true,
    title: "[demo] Commercial contract review",
    category: "professional",
    tag: "legal",
    register: "NAPCS",
    serviceClass: "Legal document review services",
    outcome: "a reviewed contract with a findings memo, delivered as a verified outcome record",
    priceCharacter: "per-outcome",
  },
  {
    id: "svc-demo-site-survey",
    $type: "Service",
    example: true,
    title: "[demo] Property site survey",
    category: "field",
    tag: "construction",
    register: "NAPCS",
    serviceClass: "Surveying and mapping services",
    outcome: "a completed site survey with measurements attached to the work order",
    priceCharacter: "per-visit",
  },
];

/** Engagement — the SOW/engagement record (native ply; PSA grain). */
export const engagements = [
  {
    id: "eng-demo-1",
    $type: "Engagement",
    example: true,
    title: "[demo] Ongoing bookkeeping engagement — Brightgable Cafe Group (synthetic client)",
    provider: "Fernwhistle Advisory Co. (synthetic provider)",
    client: "Brightgable Cafe Group (synthetic client)",
    serviceId: "svc-demo-close-books",
    status: "active",
    cadence: "monthly",
    retention: RETENTION,
  },
  {
    id: "eng-demo-2",
    $type: "Engagement",
    example: true,
    title: "[demo] Facilities maintenance engagement — Larkspindle Storage (synthetic client)",
    provider: "Quaverstone Field Services (synthetic provider)",
    client: "Larkspindle Storage (synthetic client)",
    serviceId: "svc-demo-hvac-maintenance",
    status: "active",
    cadence: "quarterly",
    retention: RETENTION,
  },
];

/** WorkOrder — the delivery decomposition (native ply; FSM grain, O*NET task shape). */
export const workOrders = [
  {
    id: "wo-demo-1",
    $type: "WorkOrder",
    example: true,
    title: "[demo] July close — Brightgable Cafe Group (synthetic)",
    engagementId: "eng-demo-1",
    serviceId: "svc-demo-close-books",
    status: "completed",
    tasks: [
      { seq: 1, task: "reconcile bank and card accounts", done: true },
      { seq: 2, task: "post accruals and deferrals", done: true },
      { seq: 3, task: "produce trial balance and close packet", done: true },
    ],
    completedAt: "2026-08-05T00:00:00Z",
    outcomeId: "out-demo-1",
    retention: RETENTION,
  },
  {
    id: "wo-demo-2",
    $type: "WorkOrder",
    example: true,
    title: "[demo] Q3 preventive maintenance — Larkspindle Storage (synthetic)",
    engagementId: "eng-demo-2",
    serviceId: "svc-demo-hvac-maintenance",
    status: "scheduled",
    tasks: [
      { seq: 1, task: "inspect and replace filters", done: false },
      { seq: 2, task: "test condenser and refrigerant pressure", done: false },
      { seq: 3, task: "record readings on the work order", done: false },
    ],
    scheduledFor: "2026-09-02T00:00:00Z",
    retention: RETENTION,
  },
];

/** Outcome — the completed, verified deliverable (the verify-then-settle seam:
 *  a completed Outcome references a VerificationReport door on fn-it — served
 *  here as a typed reference, never a fake report). */
export const outcomes = [
  {
    id: "out-demo-1",
    $type: "Outcome",
    example: true,
    title: "[demo] Verified July close packet — Brightgable Cafe Group (synthetic)",
    workOrderId: "wo-demo-1",
    serviceId: "svc-demo-close-books",
    status: "verified",
    verification: {
      kind: "VerificationReport",
      note: "verification handoff seam — the report is produced by the verification rail (fn-it), not by this surface",
    },
    deliveredAt: "2026-08-06T00:00:00Z",
    retention: RETENTION,
  },
];
