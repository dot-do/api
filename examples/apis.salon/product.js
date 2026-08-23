/**
 * product.js — the G3 APIProduct instance for register row `personal-care`
 * (property-template spec §1, studio docs/plans/2026-08-23-property-template-spec.md).
 *
 * Row: Personal Care Services (NAICS 812), 8121 core (hair/nail/skin).
 * Ruled primary name: apis.salon (register ladder rung 3 — held, zone-less,
 * covers the 8121 core; the 812 apex incl. laundry and death care stays
 * unnamed). apis.beauty is the recorded alternative and expires 2026-10-22 —
 * a Batch-S dated admin fact, not a sequencing input here.
 *
 * BOOKING-RECORD PRIMACY (batch rule, same check as lodging): THE BOOKING
 * record (schema.org Reservation grain) is named by MULTIPLE register rows —
 * lodging, travel-tourism, passenger-mobility, restaurants-food-service,
 * arts-entertainment all carry a booking/reservation data ply, and the H5
 * Scheduler rail is the shared abstraction. NO primacy ruling exists in the
 * register (checked 2026-08-23: no primacy entry in either register file).
 * Per the standing rule this row builds its Booking under ITS OWN row key —
 * the Booking here is personal-care's salon-appointment record, nothing
 * shared is claimed, and the collision is RECORDED (here and in the
 * projection config) for the register to rule on. If a primacy ruling later
 * assigns the shared booking abstraction elsewhere, this noun re-bases onto
 * it; the wire contract is scoped to this property either way.
 *
 * Bindings note (row source route — no cascade row exists for 812; the
 * posture is the register's own inferred one, carried with its [UNVERIFIED]
 * mark: instantiate booking/POS per-property, capture first-party booking
 * exhaust, public licensure registries as the supply-side ingest). Source
 * routes probed IN-SESSION on 2026-08-23:
 *   - TDLR All Licenses open dataset (data.texas.gov Socrata 7358-krk7):
 *     REACHABLE, keyless, 200 OK — so EstablishmentLicense is `ingested`
 *     and REAL at wave zero (seed-licenses.js: every Travis County
 *     full-service-salon license, provenance + disclosed withheld-fields
 *     curation on the corpus).
 *   - A NY licensing open-data guess (data.ny.gov resource w6t6-dwrk):
 *     404 dataset.missing in-session — recorded honestly; the correct NY
 *     appearance-enhancement dataset id is unresolved, so no NY corpus and
 *     no claim about one. Individual PRACTITIONER-grain licenses (TDLR
 *     serves those too, person-named) are DEFERRED as a curation decision —
 *     person-anchored records need their own ruling before serving.
 *   - Booking / ServiceOffer / SaleRecord are `native` at wave zero — the
 *     salon booking/POS system-of-record grain (C-class first-party
 *     capture), served over labeled synthetic seed: no public corpus of
 *     salon appointments exists, and pretending otherwise would improvise
 *     class-A status the row does not have.
 *
 * Headless-ply caveat carried from the register [UNVERIFIED]: salon
 * management as the vertical lens of the booking-system class is NOT
 * confirmed in the published top ranks of the ~52-System catalog — the
 * row's own words. Coordinate carried verbatim, caveat attached (register
 * defect filed upstream, not improvised away).
 */

export const NOUN_BINDINGS = Object.freeze({
  Booking: "native",
  ServiceOffer: "native",
  SaleRecord: "native",
  EstablishmentLicense: "ingested",
});

export const APIProduct = Object.freeze({
  substrate: "personal-care",
  nouns: Object.freeze([
    Object.freeze({
      noun: "Booking",
      schema: { $type: "Booking", $context: "https://schema.org.ai", grain: "schema.org Reservation — the H5 Scheduler grain vertically lensed to the salon appointment" },
      binding: "native", // the salon booking system of record — first-party capture at the rail
      verbs: Object.freeze(["listBookings", "getBooking", "requestBooking"]),
      primacy:
        "shared-record-type collision RECORDED: the booking/Reservation grain is also named by lodging, travel-tourism, passenger-mobility, restaurants-food-service, and arts-entertainment rows; no register primacy ruling exists, so this Booking is built under row key personal-care and claims nothing shared",
    }),
    Object.freeze({
      noun: "ServiceOffer",
      schema: { $type: "ServiceOffer", $context: "https://schema.org.ai", grain: "schema.org Offer — the service menu row" },
      binding: "native", // the salon's own service menu (booking-system master data)
      verbs: Object.freeze(["listServiceOffers", "getServiceOffer"]),
    }),
    Object.freeze({
      noun: "SaleRecord",
      schema: { $type: "SaleRecord", $context: "https://schema.org.ai", grain: "POS ticket — the checkout record a completed booking settles into" },
      binding: "native", // the POS ply of the C-class booking/POS capture
      verbs: Object.freeze(["listSaleRecords", "getSaleRecord"]),
    }),
    Object.freeze({
      noun: "EstablishmentLicense",
      schema: { $type: "EstablishmentLicense", $context: "https://schema.org.ai", grain: "state cosmetology establishment (salon) license — the public credential registry record" },
      binding: "ingested", // REAL public data: TDLR full-service-salon licenses (keyless, probed reachable in-session)
      verbs: Object.freeze(["listEstablishmentLicenses", "getEstablishmentLicense"]),
    }),
  ]),
  systems: Object.freeze([
    // Register headless ply VERBATIM, caveat attached: "Scheduler/booking
    // (H5 rail) + POS; salon-management is the vertical lens of the booking
    // system class [UNVERIFIED membership/rank in the ~52-System catalog]".
    Object.freeze({
      system: "Scheduler/Booking",
      coordinates: Object.freeze(["salon-spa-operations"]),
      unverified:
        "register row marks salon management's membership/rank in the ~52-System catalog UNVERIFIED — the catalog's published top ranks don't name it; carried verbatim, filed upstream",
    }),
    Object.freeze({
      system: "POS",
      coordinates: Object.freeze(["salon-spa-operations"]),
    }),
  ]),
  transports: Object.freeze(["REST", "MCP"]), // live-only; RPC/CapnWeb/HATEOAS land with the serving-lane extraction
  // The only things a rate card may price. One identifier, five surfaces
  // (axp-ext/rates-g2 §1): route operationId = MCP tool = suite ref = SDK
  // method = rates[] key. The branching collection's operationId is the real
  // verb listBookings (never the generator default listCollection).
  operations: Object.freeze([
    Object.freeze({ verb: "listBookings", wire: "GET /bookings", collection: true }),
    Object.freeze({ verb: "getBooking", wire: "GET /bookings/{id}" }),
    Object.freeze({ verb: "requestBooking", wire: "POST /bookings" }),
    Object.freeze({ verb: "listServiceOffers", wire: "GET /service-offers" }),
    Object.freeze({ verb: "getServiceOffer", wire: "GET /service-offers/{id}" }),
    Object.freeze({ verb: "listSaleRecords", wire: "GET /sale-records" }),
    Object.freeze({ verb: "getSaleRecord", wire: "GET /sale-records/{id}" }),
    Object.freeze({ verb: "listEstablishmentLicenses", wire: "GET /establishment-licenses" }),
    Object.freeze({ verb: "getEstablishmentLicense", wire: "GET /establishment-licenses/{id}" }),
  ]),
  sandbox: Object.freeze({
    // §5.2 — the synthetic corpus generator is seed.js (deterministic,
    // internally consistent, every record labeled example: true); the REAL
    // ingested EstablishmentLicense corpus is seed-licenses.js (provenance-
    // labeled, never labeled example — it is not an example). Reseeding
    // either is a build step: node scripts/ingest-licenses.mjs; seed.js is code.
    seedModule: "./seed.js",
    ingestModule: "./seed-licenses.js",
    tenant: "example", // tenant #1 pattern: same handlers as product, simulated salon front desk
    retention: "anonymous sandbox reads are stateless; nothing a caller sends is stored at wave zero",
  }),
  meters: Object.freeze(
    [
      "listBookings",
      "getBooking",
      "requestBooking",
      "listServiceOffers",
      "getServiceOffer",
      "listSaleRecords",
      "getSaleRecord",
      "listEstablishmentLicenses",
      "getEstablishmentLicense",
    ].map((operation) =>
      Object.freeze({ operation, event: "meter", tags: Object.freeze(["substrate", "projection", "motion", "operation", "shape", "pattern"]) }),
    ),
  ),
});
