/**
 * seed.mjs — the §5.2 anon-sandbox seed corpus for the `lodging` substrate
 * (register row `lodging`, Lodging & Accommodation, NAICS 721), produced
 * MECHANICALLY from the row's record types (Booking record per schema.org
 * Offer/Reservation — SC #22 verbatim; night-audit report as the typed
 * operational artifact; folio/guest-ledger [UNVERIFIED — inferred, flag
 * kept from the row]) by this deterministic generator. Reseeding =
 * re-running this module (a build step, never a manual act); the corpus is
 * versioned with the manifest.
 *
 * WHY 100% SYNTHETIC (source-route honesty, batch watch-list item): the
 * row's ruled route is "first-party booking/night-audit capture at the
 * rail" — an owned-by-construction class. That rail is NOT built (C-class,
 * batch 7), and an unbuilt first-party capture rail cannot be probed into
 * existence. The row's ONLY other lane — public rate data — is the
 * register-ruled avoid lane ("most crowded agent lanes", avoid-class 5,
 * SC #22), not a permitted source. So there is no Class-A source honestly
 * reachable on this row's route, no probe was faked to pretend otherwise,
 * and every record on this sandbox is labeled synthetic §5.2 seed. No
 * class-A status is claimed anywhere on this face.
 *
 * Fixture law: every record carries `example: true`; identifiers use the
 * demo prefix 952; companies/people are synthetic ("Example …" names only);
 * all emails live under example.com; no real property, brand, guest, or
 * rate appears anywhere; no credentials or real-identifier shapes.
 *
 * Live-demo ruling: this seed is tenant #1 of the real substrate — the same
 * handlers serve it that serve everything else. It is a live environment of
 * the real product over simulated data, never a faked demo.
 */

const SUBSTRATE = "lodging";
const EXAMPLE_NOTE =
  "labeled example record on the anonymous sandbox — simulated data, not a real property, booking, guest, or rate";

/* Synthetic operator + properties — Example names only. */
const OPERATOR = { name: "Example Coastal Stays (property management)", contact: "avery@example.com" };

const PROPERTY_TABLE = [
  // [type, name, sleeps, nightlyRate]
  ["villa", "Example Villa Marisol", 8, 450],
  ["villa", "Example Villa Cardamine", 6, 380],
  ["guesthouse", "Example Harbor Guesthouse", 4, 190],
];

export const properties = PROPERTY_TABLE.map(([type, name, sleeps, nightlyRate], i) => ({
  $type: "https://schema.org/Accommodation", // the row's schema.org record typing (SC #22); Accommodation is the inventory grain the api.[x] object rule names
  id: `PRP-952-${String(i + 1).padStart(4, "0")}`,
  example: true,
  exampleNote: EXAMPLE_NOTE,
  type,
  name,
  sleeps,
  nightlyRate, // demo rate on a simulated unit — NOT market rate data (the register-ruled avoid lane is untouched)
  currency: "USD",
  operator: OPERATOR,
  locale: "example-coast",
}));

const iso = (day, h) => `2026-08-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00Z`;

/* One row per booking:
 * [status, propertyIdx, guestName, guestEmail, checkInDay, nights]
 * — the reservation lifecycle is exercised end-to-end (confirmed →
 * checked-in → checked-out, plus cancelled), every declared filter value
 * present at least once, none named "none" so knownEmpty probes stay
 * honest. */
const BOOKING_TABLE = [
  ["confirmed", 0, "Alex Example", "alex@example.com", 24, 5],
  ["confirmed", 2, "Jordan Example", "jordan@example.com", 26, 2],
  ["checked-in", 1, "Riley Example", "riley@example.com", 20, 7],
  ["checked-in", 2, "Sam Example", "sam@example.com", 21, 3],
  ["checked-out", 0, "Casey Example", "casey@example.com", 12, 4],
  ["checked-out", 1, "Morgan Example", "morgan@example.com", 14, 3],
  ["cancelled", 0, "Drew Example", "drew@example.com", 18, 2],
  ["checked-out", 2, "Quinn Example", "quinn@example.com", 15, 2],
];

export const bookings = BOOKING_TABLE.map(([status, pi, guestName, guestEmail, inDay, nights], i) => {
  const id = `BKG-952-${String(i + 1).padStart(4, "0")}`;
  const property = properties[pi];
  const roomTotal = property.nightlyRate * nights;
  const reached = { "checked-in": 1, "checked-out": 2 }[status] ?? 0;
  return {
    $type: "https://schema.org/LodgingReservation", // SC #22 verbatim: "Booking record (schema.org Offer/Reservation)"
    id,
    example: true,
    exampleNote: EXAMPLE_NOTE,
    status,
    property: property.id,
    propertyName: property.name,
    guest: { name: guestName, email: guestEmail },
    checkIn: iso(inDay, 16),
    checkOut: iso(inDay + nights, 10),
    nights,
    nightlyRate: property.nightlyRate,
    roomTotal,
    currency: "USD",
    ...(status === "cancelled" && {
      cancelledAt: iso(inDay - 3, 9),
      cancellation: "[demo] cancelled inside the labeled example lifecycle — simulated, no fee assessed",
    }),
    ...(reached >= 1 && { checkedInAt: iso(inDay, 16) }),
    ...(reached >= 2 && { checkedOutAt: iso(inDay + nights, 10), folio: `FOL-952-${String(i + 1).padStart(4, "0")}` }),
    createdAt: iso(Math.max(1, inDay - 10), 11),
    updatedAt: iso(inDay + reached, 12),
  };
});

/* Folio / guest-ledger records [UNVERIFIED — inferred data-ply item, flag
 * carried from the row] — one folio per checked-out booking, line-item
 * arithmetic internally consistent (nightly charges + cleaning + tax =
 * total, and the folio balances to zero on checkout). */
const TAX_RATE = 0.1;
const CLEANING_FEE = 120;

export const folios = bookings
  .filter((b) => b.status === "checked-out")
  .map((b) => {
    const lines = [
      { item: "[demo] room nights", qty: b.nights, unitPrice: b.nightlyRate, amount: b.roomTotal },
      { item: "[demo] cleaning fee", qty: 1, unitPrice: CLEANING_FEE, amount: CLEANING_FEE },
      {
        item: "[demo] occupancy tax (10%)",
        qty: 1,
        unitPrice: +((b.roomTotal + CLEANING_FEE) * TAX_RATE).toFixed(2),
        amount: +((b.roomTotal + CLEANING_FEE) * TAX_RATE).toFixed(2),
      },
    ];
    const total = +lines.reduce((t, l) => t + l.amount, 0).toFixed(2);
    return {
      $type: "https://schema.org.ai/GuestFolio", // no schema.org type at this grain — schema.org.ai typing per cascade rule 2; the noun itself is a row [UNVERIFIED — inferred] item, flag kept
      id: b.folio,
      example: true,
      exampleNote: EXAMPLE_NOTE,
      booking: b.id,
      property: b.property,
      guest: b.guest,
      lines,
      total,
      payments: [{ method: "[demo] card on file (simulated)", amount: total, at: b.checkedOutAt }],
      balance: 0,
      currency: "USD",
      closedAt: b.checkedOutAt,
    };
  });

/* Night-audit reports — `generated` binding: the typed operational artifact
 * the row anchors on (nightaudit.click — the DC artifact-decomposition
 * entry for this sector), mechanically derived from the booking + folio
 * corpus for each business date. Occupancy, room revenue, and the
 * zero-out-of-balance line are computed from the records above, so the
 * arithmetic is internally consistent by construction. */
const BUSINESS_DATES = ["2026-08-15", "2026-08-21"];

export const nightAuditReports = BUSINESS_DATES.map((businessDate, i) => {
  const night = new Date(`${businessDate}T23:59:00Z`).getTime();
  const inHouse = bookings.filter(
    (b) => b.status !== "cancelled" && new Date(b.checkIn).getTime() <= night && new Date(b.checkOut).getTime() > night,
  );
  const roomRevenue = +inHouse.reduce((t, b) => t + b.nightlyRate, 0).toFixed(2);
  const departuresToday = bookings.filter((b) => b.checkOut.startsWith(businessDate) && b.status === "checked-out");
  const foliosClosed = folios.filter((f) => departuresToday.some((b) => b.folio === f.id));
  return {
    $type: "https://schema.org.ai/NightAuditReport", // the wedge artifact the PMS ply automates (register row; nightaudit.click anchor)
    id: `NAR-952-${String(i + 1).padStart(4, "0")}`,
    example: true,
    exampleNote: EXAMPLE_NOTE,
    businessDate,
    property: "all (portfolio roll-up across the three example properties)",
    occupiedUnits: inHouse.length,
    totalUnits: properties.length,
    occupancyPct: +((inHouse.length / properties.length) * 100).toFixed(1),
    roomRevenue,
    adr: inHouse.length ? +(roomRevenue / inHouse.length).toFixed(2) : 0,
    foliosClosed: foliosClosed.map((f) => f.id),
    foliosClosedTotal: +foliosClosed.reduce((t, f) => t + f.total, 0).toFixed(2),
    outOfBalance: 0,
    note: `[demo] night audit for ${businessDate} generated from the labeled example booking/folio corpus (substrate ${SUBSTRATE}) — every figure recomputes from the records this sandbox serves`,
    generatedAt: `${businessDate}T23:59:00Z`,
  };
});
