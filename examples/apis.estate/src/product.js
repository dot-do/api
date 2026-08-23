/**
 * product.js — Stratum A: the G3 APIProduct instance for register row
 * `real-estate` (Real Estate & Closings, NAICS 53; template spec §1,
 * docs/plans/2026-08-23-property-template-spec.md in the studio repo).
 * Brand, ICP, motion, offer, price and positioning are NOT here — they live
 * in the G4 projection config (./projection.js). One substrate, many
 * non-exclusive projections.
 *
 * SCOPE (from the row, permanent): the MONEY/ESCROW LAYER IS EXCLUDED —
 * licensure plus the A1 settlement-module gate. No door on this substrate
 * holds, moves, disburses, or instructs the movement of funds; the closing
 * DOCUMENT layer (typed records) is the entered grain (SC §4 #8). The
 * `escrow` query scope answers BLOCKED by construction.
 *
 * SHARED FACE: the LienWaiver record type is literally shared with the
 * construction row (SC #10/#13). No projection-primacy ruling exists in the
 * register, so the Noun is built UNDER THIS ROW KEY and the collision is
 * recorded in ../REGISTER-NOTE.md — nothing shared is claimed.
 *
 * The normative APIProduct shape lands in primitives.org.ai
 * `digital-products`; this instance is authored to that shape.
 *
 * @typedef {Object} NounDef
 * @property {string} name        PascalCase Noun
 * @property {string} schema      $type → schema.org.ai
 * @property {'ingested'|'generated'|'native'|'federated'} binding
 * @property {string[]} verbs     camelCase verbs actually served (presence-when-true)
 *
 * @typedef {Object} SystemCoordinate
 * @property {string} system      one of the 52-System catalog
 * @property {string[]} coordinates
 */

export const product = {
  substrate: 'real-estate',

  /** Canonical Nouns. Every verb listed is served today; nothing aspirational.
   *  Schema anchors: the row records NO national interchange standard for the
   *  closing-document layer (county-level public records are the G1-grade
   *  corpus; MISMO is flagged [UNVERIFIED/BK] in the register) — so record
   *  schemas fall back to schema.org generics per cascade rule 2 (§3.1);
   *  $type resolves against https://schema.org.ai. */
  nouns: [
    {
      name: 'ClosingPacket',
      schema: 'https://schema.org.ai/DigitalDocument', // generic fallback; the packet is the SC #10 THE-record
      binding: 'generated', // §5.2 labeled synthetic seed — no unified county corpus is reachable in-session
      verbs: ['list', 'get'],
    },
    {
      name: 'LienWaiver',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'generated', // SHARED FACE with construction (SC #10/#13) — see REGISTER-NOTE.md
      verbs: ['list'],
    },
    {
      name: 'PayoffLetter',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'Deed',
      schema: 'https://schema.org.ai/DigitalDocument', // county recorder grain (book/page/instrument — synthetic in seed)
      binding: 'generated',
      verbs: ['list'],
    },
    {
      name: 'TransactionFile',
      schema: 'https://schema.org.ai/Service', // system-of-record door — the headless ply (transaction management)
      binding: 'native',
      verbs: ['create', 'get'],
    },
    {
      name: 'PacketDocument',
      schema: 'https://schema.org.ai/DigitalDocument',
      binding: 'native', // documents assembled into a transaction file's packet — same noun family, native door
      verbs: ['create', 'list'],
    },
  ],

  /** The row's System set actually instantiated here (52-System catalog):
   *  transaction management at the closings coordinate. The row also names
   *  title production and the notary/RON pipeline, and flags a rental/PM
   *  system [UNVERIFIED]; none of those is served by this build, so none is
   *  declared (presence-when-true). */
  systems: [{ system: 'TransactionManagement', coordinates: ['real-estate-closings', 'title-escrow-adjacent'] }],

  /** Transports emitted from this one definition. */
  transports: ['REST', 'MCP'],

  /** Canonical operationIds (axp-ext/rates-g2 §1) — the only things a rate
   *  card may price. One identifier, five surfaces: route operationId = MCP
   *  tool = suite coverage reference = SDK method = rates[] key. */
  operations: [
    'searchClosingPackets',
    'getPricing',
    'getFamilyRegistry',
    'getOffer',
    'getClosingPacket',
    'listLienWaivers',
    'listPayoffLetters',
    'listDeeds',
    'getICP',
    'getVerify',
    'getVerifySuite',
    'createTransactionFile',
    'getTransactionFile',
    'listPacketDocuments',
    'addPacketDocument',
  ],

  /** §5.2 sandbox spec — versioned with the manifest; reseed is a build step. */
  sandbox: {
    seed: './seed.js',
    floor: 'keyless GET /closing-packets — the universal anon floor (rung 0)',
    workspaces: 'auto-minted via POST /transaction-files, no key, no account',
    retention:
      'ephemeral in wave zero: transaction files are in-memory per isolate and may reset at any time; disclosed on every mint',
  },

  /** The published suite (the /verify export). interfaces.testSuite is NOT
   *  declared on the card: it stays undeclared until digest-pinned (batch
   *  watch list; the deployed verifier cannot judge it yet — api.lawyer
   *  precedent). */
  suite: { url: '/verify/suite.json', declaredOnCard: false },

  /** Per-operation usage meters — seams only (§7.4); tags per §6.4. */
  meters: [
    { operation: 'searchClosingPackets', event: 'meter' },
    { operation: 'getClosingPacket', event: 'meter' },
    { operation: 'getPricing', event: 'meter' },
    { operation: 'getFamilyRegistry', event: 'meter' },
    { operation: 'getOffer', event: 'meter' },
  ],
}
