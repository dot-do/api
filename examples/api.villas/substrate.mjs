/**
 * substrate.mjs — Stratum A: the G3 `APIProduct` instance for register row
 * `lodging` (Lodging & Accommodation, NAICS 721 — spec §1, PascalCase shape
 * from primitives.org.ai digital-products). This is the ONE definition both
 * plies serve from: the data face (record collections) and the headless PMS
 * face (booking + night-audit doors on the SAME substrate) are the same
 * manifest rows, same envelopes, same rate rows — binding direction
 * differs, never the surface.
 *
 * Property: api.villas — the row's proposed primary name (ladder step 2
 * within what is held; the api.[x] object rule: the rail an agent calls to
 * get villa/short-stay inventory acts). The row's caveat is carried, not
 * hidden: 'villas' names a lodging SUB-NICHE, not 7211 hotels — the
 * category-apex name is unheld and the apex GAP is recorded on the register
 * (a register note, not a build blocker). See REGISTER-NOTE.md.
 *
 * G1 anchors (from the row, flags kept verbatim):
 *   - NAICS 721 (7211 traveler accommodation; 721214 recreational-camp
 *     adjacency [UNVERIFIED sub-codes])
 *   - schema.org Offer / Reservation as the record typing (SC #22 verbatim:
 *     "Booking record (schema.org Offer/Reservation)")
 *   - Booking/PMS as the derived system (SC #22)
 *   - HTNG / OTA hospitality interchange messaging [UNVERIFIED — not in any
 *     estate doc]; no keyless interchange feed exists on the row's route,
 *     so untyped grains fall back per cascade rule 2
 *
 * Source-route honesty (batch watch-list item, 2026-08-23): the row is
 * Axis-2 ONLY by ruling (avoid-class 5 — "most crowded agent lanes",
 * SC #22). Its provisioned route is FIRST-PARTY booking/night-audit capture
 * at the rail (owned-by-construction class) — a rail that is not built at
 * wave zero (C-class, batch 7), and an unbuilt capture rail cannot be
 * probed. The only other lane, public rate data, is the register-ruled
 * avoid lane and was NOT probed as a source. Consequence: no Class-A
 * source is honestly reachable, every Noun below is labeled synthetic
 * §5.2 seed, and no class-A status is improvised anywhere on this face.
 */
import { properties, bookings, folios, nightAuditReports } from "./seed.mjs";

export const substrate = Object.freeze({
  substrate: "lodging",

  /** Canonical Nouns — each names its schema and its binding direction.
   * `native` here means the noun's system of record IS this substrate's
   * headless PMS ply (the first-party capture rail, owned by construction
   * once operators use the doors); at wave zero those collections hold
   * labeled synthetic seed only. */
  nouns: [
    {
      noun: "Property",
      schema: "https://schema.org/Accommodation",
      binding: "native", // the villa/short-stay inventory the api.[x] object rule names — first-party, never scraped rate data
      verbs: ["list", "get"],
    },
    {
      noun: "Booking",
      schema: "https://schema.org/LodgingReservation", // the row's verbatim anchor: "Booking record (schema.org Offer/Reservation)" (SC #22)
      binding: "native", // first-party booking capture at the rail — the headless PMS door; C-class at wave zero (rail not built), seed is labeled synthetic
      verbs: ["list", "get", "create", "cancel"],
    },
    {
      noun: "NightAuditReport",
      schema: "https://schema.org.ai/NightAuditReport", // the typed operational artifact (nightaudit.click — the DC artifact-decomposition entry for this sector); no interchange standard on the row → cascade rule 2
      binding: "generated", // mechanically derived from the booking/folio corpus; the night-audit process is the wedge the PMS ply automates
      verbs: ["list", "get", "run"],
    },
    {
      noun: "Folio",
      schema: "https://schema.org.ai/GuestFolio", // folio/guest-ledger record [UNVERIFIED — inferred, flag carried verbatim from the row's data ply]
      binding: "native",
      verbs: ["list"],
    },
  ],

  /** The row's System set — the register names Booking/PMS as the derived
   * system-of-record (SC #22 verbatim); the channel-manager function the
   * row lists is [UNVERIFIED — inferred] and is NOT declared here because
   * nothing on this face serves it (presence-when-true). */
  systems: [
    { system: "BookingPMS", coordinates: ["Industry=NAICS-721", "CompanyType=independent-lodging-operator"] },
  ],

  /** Transports actually served by this wave-zero worker — live-only,
   * presence-when-true. (RPC / CapnWeb / HATEOAS emission is the workers.do
   * pattern and arrives with the extraction lane, spec §7.2.) */
  transports: ["REST", "MCP"],

  /** OpenAPI operations — the only things a rate card may price. One
   * canonical camelCase operationId per operation (axp-ext-rates-g2 §1):
   * `listBookings` IS the branching collection's operationId
   * (collection.operationId in manifest.mjs), the MCP tool name, and the
   * rates[] key — one operation, one identifier, everywhere. */
  operations: [
    { operation: "listBookings", method: "GET", path: "/bookings", noun: "Booking", verb: "list" },
    { operation: "getBooking", method: "GET", path: "/bookings/{bookingId}", noun: "Booking", verb: "get" },
    { operation: "createBooking", method: "POST", path: "/bookings", noun: "Booking", verb: "create" },
    { operation: "cancelBooking", method: "POST", path: "/bookings/{bookingId}/cancel", noun: "Booking", verb: "cancel" },
    { operation: "listProperties", method: "GET", path: "/properties", noun: "Property", verb: "list" },
    { operation: "getProperty", method: "GET", path: "/properties/{propertyId}", noun: "Property", verb: "get" },
    { operation: "listNightAuditReports", method: "GET", path: "/night-audit-reports", noun: "NightAuditReport", verb: "list" },
    { operation: "getNightAuditReport", method: "GET", path: "/night-audit-reports/{reportId}", noun: "NightAuditReport", verb: "get" },
    { operation: "runNightAudit", method: "POST", path: "/night-audit-reports", noun: "NightAuditReport", verb: "run" },
    { operation: "listFolios", method: "GET", path: "/folios", noun: "Folio", verb: "list" },
  ],

  /** §5.2 sandbox spec — the universal floor. 100% labeled synthetic
   * (source-route honesty above): deterministic corpus from seed.mjs,
   * 952-prefixed, Example-name parties only. Anonymous callers get it
   * keyless, plus an ephemeral auto-minted workspace for writes. */
  sandbox: {
    seedModule: "./seed.mjs",
    realCorpusModule: null, // none — no Class-A source is honestly reachable on the row's route (first-party capture rail unbuilt; public rate data is the register-ruled avoid lane)
    seedTenant: "tenant-1 (the labeled demo tenant on the production substrate — live-demo ruling)",
    autoMintedWorkspace: {
      retention:
        "ephemeral — isolate lifetime only at wave zero; records created anonymously are not durable and are disclosed as such on every write",
      tenure: "anon (#17 ladder rung 0)",
    },
    fixtureLaw:
      "952 demo prefix on every synthetic identifier; Example-name properties/companies/people; example.com emails only; no real property, brand, guest, or market rate anywhere; secret-scanned",
  },

  /** One meter per operation (seams only at wave zero — spec §7.4). */
  meters: [
    "listBookings",
    "getBooking",
    "createBooking",
    "cancelBooking",
    "listProperties",
    "getProperty",
    "listNightAuditReports",
    "getNightAuditReport",
    "runNightAudit",
    "listFolios",
  ].map((operation) => ({ operation, event: "metering" })),
});

/** The corpora, exported for the worker + manifest. */
export const seed = Object.freeze({ properties, bookings, folios, nightAuditReports });
