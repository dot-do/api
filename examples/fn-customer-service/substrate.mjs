/**
 * substrate.mjs — Stratum A: the G3 `APIProduct` instance for register row
 * `fn-customer-service` (spec §1, PascalCase shape from primitives.org.ai
 * digital-products). This is the ONE definition both plies serve from:
 * the data face (record collections) and the headless face (helpdesk
 * system-of-record doors) are the same manifest rows, same envelopes,
 * same rate rows — binding direction differs, never the surface.
 *
 * GAP row (spec §0): everything here is name-independent by construction.
 * No brand, domain, ICP, persona, motion, offer, price, or positioning
 * appears in this stratum — those are G4 projection fields (§2).
 */
import { tickets, conversations, deflections } from "./seed.mjs";

export const substrate = Object.freeze({
  substrate: "fn-customer-service",

  /** Canonical Nouns — each names its schema and its binding direction.
   * The register row names NO industry interchange standard for the Ticket
   * record, so record schemas fall back to schema.org generics (spec §3.1
   * cascade rule 2). */
  nouns: [
    {
      noun: "Ticket",
      schema: "https://schema.org/Ticket",
      binding: "native", // helpdesk system of record — the headless ply's door
      verbs: ["list", "get", "create", "resolve"],
    },
    {
      noun: "Conversation",
      schema: "https://schema.org/Message",
      binding: "native", // conversation + resolution events on the same system of record
      verbs: ["list"],
    },
    {
      noun: "DeflectionArticle",
      schema: "https://schema.org/Article",
      binding: "generated", // the deflection corpus is derived from the owned ticket corpus (EO #28 grain)
      verbs: ["search"],
    },
  ],

  /** The row's System set — the helpdesk is an H5-rail member of the
   * 52-System catalog; coordinate = every CompanyType's support/CX
   * department (the Function × Department × Process root). */
  systems: [{ system: "Helpdesk", coordinates: ["support-cx-department"] }],

  /** Transports actually served by this wave-zero worker — live-only,
   * presence-when-true. (RPC / CapnWeb / HATEOAS emission is the workers.do
   * pattern and arrives with the extraction lane, spec §7.2.) */
  transports: ["REST", "MCP"],

  /** OpenAPI operations — the only things a rate card may price.
   * `listTickets` is served as the branching collection (generator
   * operationId `listCollection`); the rest are site routes. */
  operations: [
    { operation: "listCollection", method: "GET", path: "/tickets", noun: "Ticket", verb: "list" },
    { operation: "getTicket", method: "GET", path: "/tickets/{ticketId}", noun: "Ticket", verb: "get" },
    { operation: "createTicket", method: "POST", path: "/tickets", noun: "Ticket", verb: "create" },
    { operation: "resolveTicket", method: "POST", path: "/tickets/{ticketId}/resolve", noun: "Ticket", verb: "resolve" },
    { operation: "listConversations", method: "GET", path: "/conversations", noun: "Conversation", verb: "list" },
    { operation: "searchDeflections", method: "GET", path: "/deflections", noun: "DeflectionArticle", verb: "search" },
  ],

  /** §5.2 sandbox spec — the universal floor. The seed corpus is generated
   * deterministically by seed.mjs (versioned with this manifest; reseeding
   * is a build step). Anonymous callers get the labeled seed tenant plus an
   * ephemeral auto-minted workspace for writes. */
  sandbox: {
    seedModule: "./seed.mjs",
    seedTenant: "tenant-1 (the labeled demo tenant on the production substrate — live-demo ruling)",
    autoMintedWorkspace: {
      retention: "ephemeral — isolate lifetime only at wave zero; records created anonymously are not durable and are disclosed as such on every write",
      tenure: "anon (#17 ladder rung 0)",
    },
    fixtureLaw: "952 demo prefix on every identifier; synthetic Example-surname people; example.com emails only; secret-scanned",
  },

  /** One meter per operation (seams only at wave zero — spec §7.4). */
  meters: [
    "listCollection",
    "getTicket",
    "createTicket",
    "resolveTicket",
    "listConversations",
    "searchDeflections",
  ].map((operation) => ({ operation, event: "metering" })),
});

/** The seed corpus, exported for the worker + manifest. */
export const seed = Object.freeze({ tickets, conversations, deflections });
