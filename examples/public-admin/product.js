/**
 * product.js — the G3 APIProduct instance for register row `public-admin`
 * (property-template spec §1, studio docs/plans/2026-08-23-property-template-spec.md).
 *
 * D-ROW PLACEHOLDER: the row is GAP AT APEX — no api./apis./headless./data.
 * name is held for NAICS 92. Per spec §0 a GAP row instantiates everything
 * EXCEPT the G4 brand config; the G3 work is never blocked on a name. The
 * substrate id is the register row key, and the serving placeholder address
 * is public-admin.org.ai (open question #4's placeholder-org.ai route).
 * api.procurement is ruled hold-don't-build and is not used anywhere here.
 *
 * Stratum A only: substrate, Nouns (schema + binding + verbs), System
 * coordinates, transports, operations, sandbox spec, meters. NO brand, ICP,
 * motion, offer, price, or positioning here — those are G4 projection fields
 * (projection.config.json).
 *
 * Bindings note (row source route — public-licensable ingest end to end):
 *   - Award is `ingested` and REAL at wave zero: USAspending is a keyless
 *     Class-A public route, ingested in-session (seed-awards.js, provenance
 *     on every record).
 *   - Registration / Filing / Permit are `native` at wave zero — the entity
 *     back-office system of record (the registrant's own compliance record),
 *     served over labeled synthetic seed: FinCEN BOI data is confidential by
 *     law (never ingestable), and state SoS / county permit portals are not
 *     one mechanically reachable Class-A route. The enrichment ladder adds
 *     `ingested` SAM/SoS mirror records later, consent-at-rail.
 */

export const JURISDICTIONS = Object.freeze(["federal-sam", "state-sos", "fincen-boi", "county-permits"]);

export const APIProduct = Object.freeze({
  substrate: "public-admin",
  nouns: Object.freeze([
    Object.freeze({
      noun: "Registration",
      schema: { $type: "Registration", $context: "https://schema.org.ai" },
      binding: "native", // the entity back-office system of record (formation → EIN → BOI → registered agent → licenses → renewals)
      verbs: Object.freeze(["listRegistrations", "getRegistration", "orderRenewal"]),
    }),
    Object.freeze({
      noun: "Filing",
      schema: { $type: "Filing", $context: "https://schema.org.ai" },
      binding: "native", // filing artifacts produced in the back office (SoS annual reports, BOI reports, SAM renewals)
      verbs: Object.freeze(["listFilings", "getFiling"]),
    }),
    Object.freeze({
      noun: "Award",
      schema: { $type: "Award", $context: "https://schema.org.ai" },
      binding: "ingested", // REAL public data: USAspending contract awards (Class A, keyless, public domain)
      verbs: Object.freeze(["listAwards", "getAward"]),
    }),
    Object.freeze({
      noun: "Permit",
      schema: { $type: "Permit", $context: "https://schema.org.ai" },
      binding: "native", // permit records at the owned artifact doors (permits.works / permits.casa); county ingest is the ladder's next rung
      verbs: Object.freeze(["listPermits", "getPermit"]),
    }),
  ]),
  systems: Object.freeze([
    // 52-System catalog: the entity back-office / compliance system at the
    // registrant coordinate (row anchor: O*NET 13-1041.00 Compliance
    // Officers). The buyer is never the government — the system of record is
    // the REGISTRANT's compliance seat across all jurisdictions.
    Object.freeze({ system: "Compliance", coordinates: Object.freeze(["registrant-back-office"]) }),
  ]),
  transports: Object.freeze(["REST", "MCP"]), // live-only; RPC/CapnWeb/HATEOAS land with the serving-lane extraction
  // The only things a rate card may price. The branching collection carries
  // the generator's operationId (listCollection); every other verb records
  // its wire address, and the OpenAPI extension layer injects operationIds.
  operations: Object.freeze([
    Object.freeze({ verb: "listRegistrations", wire: "GET /registrations", operationId: "listCollection" }),
    Object.freeze({ verb: "getRegistration", wire: "GET /registrations/{id}" }),
    Object.freeze({ verb: "orderRenewal", wire: "POST /renewals" }),
    Object.freeze({ verb: "listFilings", wire: "GET /filings" }),
    Object.freeze({ verb: "getFiling", wire: "GET /filings/{id}" }),
    Object.freeze({ verb: "listAwards", wire: "GET /awards" }),
    Object.freeze({ verb: "getAward", wire: "GET /awards/{id}" }),
    Object.freeze({ verb: "listPermits", wire: "GET /permits" }),
    Object.freeze({ verb: "getPermit", wire: "GET /permits/{id}" }),
  ]),
  sandbox: Object.freeze({
    // §5.2 — the synthetic corpus generator is seed.js (deterministic,
    // internally consistent, every record labeled example: true); the REAL
    // ingested Award corpus is seed-awards.js (provenance-labeled, never
    // labeled example — it is not an example). Reseeding either is a build
    // step: node scripts/ingest-awards.mjs; seed.js is code.
    seedModule: "./seed.js",
    ingestModule: "./seed-awards.js",
    tenant: "example", // tenant #1 pattern: same handlers as product, simulated back-office data
    retention: "anonymous sandbox reads are stateless; nothing a caller sends is stored at wave zero",
  }),
  meters: Object.freeze(
    ["listRegistrations", "getRegistration", "orderRenewal", "listFilings", "getFiling", "listAwards", "getAward", "listPermits", "getPermit"].map(
      (operation) =>
        Object.freeze({ operation, event: "meter", tags: Object.freeze(["substrate", "projection", "motion", "operation", "shape", "pattern"]) }),
    ),
  ),
});
