/**
 * manifest.js — the ONE site manifest the whole machine face is generated
 * from (vendored axp-faces@0.3.0 at the PINS.json digest, apis-ax-axp@2.6.0
 * pin, axp-ext-rates-g2@0.2.0 native — see axp/PINS.json + axp/VENDORED.json).
 *
 * GAP row (`mining-oil-gas`, full-economy register 2026-08-23): no apex name
 * is held at ANY ladder rung — no category-completing TLD, no
 * api./apis./headless./data. form, no acquisition candidate on record. Held
 * names are artifact singletons only (minesafety.dev, jib.claims,
 * tankcheck.dev). Per template spec §0 the G3 substrate is instantiated
 * under a PLACEHOLDER org.ai address and no G4 brand config exists; the
 * brand attaches when a name is acquired (#16). Nothing here re-derives
 * naming.
 */
import { defineSiteManifest } from "./axp/index.js";
import { wells, RETENTION_NOTICE } from "./seed.js";

/** Placeholder origin — the unnamed-substrate address, never a brand claim. */
export const ORIGIN = "https://mining-oil-gas.org.ai";

/** The row's G2 coordinates — ONE truth, three faces: the card's top-level
 *  `g2` member (axp-ext-rates-g2 §4, carried verbatim by the generator), the
 *  /icp.json door, and the Stratum-B projection registration. The row's own
 *  ICP field is thin ("No CompanyType/JobType coordinates pulled for this
 *  sector in any estate doc [UNVERIFIED]") — only what the row states is
 *  encoded; nothing is invented. */
export const G2 = Object.freeze({
  icp: Object.freeze({
    coordinates: "Vertical = Mining, Oil & Gas (NAICS 21) × operators and non-operating working-interest holders (the JIB counterparty pair — the row's own phrasing)",
    companyTypes: "operators; non-operating working-interest holders [row hint — no CompanyType coordinates pulled for NAICS 21 in any estate doc, UNVERIFIED]",
    jobTypes: Object.freeze(["land/JIB accountant", "EHS/compliance manager"]),
  }),
  personas: Object.freeze([
    Object.freeze({ id: "complianceAgent", description: "an autonomous agent running MSHA/FracFocus-class compliance and registry reads — the wave-zero first tenant (B2A)" }),
    Object.freeze({ id: "jibAccountant", description: "land/JIB accountant at an operator or working-interest holder (row persona hint)" }),
    Object.freeze({ id: "ehsManager", description: "EHS/compliance manager (row persona hint)" }),
  ]),
  motion: "B2A",
});

const llmsBody = `# mining-oil-gas.org.ai — the Mining, Oil & Gas substrate (wave zero, unnamed)

The G3 substrate for the Mining, Oil & Gas vertical (NAICS 21 — 211/212/213):
Well, Operator, Violation (MSHA-class), Disclosure (FracFocus-class) and
JIBStatement records (data face), and the JIB statement collection as a
headless production-accounting system-of-record door (headless face) — one
definition, two plies.

This is a GAP-row placeholder surface: no apex name is held for this sector
(artifact singletons only: minesafety.dev, jib.claims, tankcheck.dev), so
there is no G4 brand here — only the substrate, its anon sandbox, and its
machine face. All records are SYNTHETIC EXAMPLE DATA, clearly labeled
(\`example: true\`, "[demo]" prefixes, synthetic 00-prefix well API numbers;
regulatory classification codes omitted, never fabricated).

## Quickstart (keyless — the anon sandbox is the universal floor)

\`\`\`sh
curl ${ORIGIN}/wells                     # typed OK envelope, branching collection
curl ${ORIGIN}/wells?status=producing    # branch: filtered
curl ${ORIGIN}/jib-statements            # sibling data-face collection (JIB grammar)
curl ${ORIGIN}/pricing                   # the Pricing Document (metered stub — no live billing)
\`\`\`

${RETENTION_NOTICE}
`;

export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: "mining-oil-gas.org.ai",
    description:
      "Wave-zero machine face of the mining-oil-gas G3 substrate (Mining, Oil & Gas vertical, NAICS 21): well, operator, MSHA-class violation, FracFocus-class disclosure and joint-interest-billing records as a data face, and the JIB collection as a headless production-accounting system-of-record door. GAP-row placeholder — no brand attached; all data synthetic and labeled.",
    version: "0.0.1",
    collection: {
      path: "/wells",
      /* axp-ext-rates-g2 §1: the branching collection's canonical cross-face
         name — the same string as the MCP tool, the suite reference, the SDK
         functionName and the rate-card key (five-surface invariant). */
      operationId: "listWells",
      memberName: "wells",
      summary: "The Well collection — typed OK | EMPTY | BLOCKED, branching on status/operatorId; synthetic labeled demo records (state-registry-shaped)",
      records: wells,
      filters: ["status", "operatorId"],
      blockedScopes: ["admin", "internal"],
    },
    /* axp-ext-rates-g2 §1 — operationId is a native passthrough on every
       route: the ONE cross-face name. Collections carry real verbs
       (listWells, listJIBStatements — never listCollection). */
    routes: [
      { method: "GET", path: "/wells/{id}", operationId: "getWell", summary: "getWell — one Well record by id (typed envelope)" },
      { method: "GET", path: "/operators", operationId: "listOperators", summary: "listOperators — operator and working-interest-holder records, filterable by kind" },
      { method: "GET", path: "/violations", operationId: "listViolations", summary: "listViolations — MSHA-class mine-safety violation records, filterable by mineId/severity (synthetic; standard cites omitted, never fabricated)" },
      { method: "GET", path: "/disclosures", operationId: "listDisclosures", summary: "listDisclosures — FracFocus-class chemical-disclosure records, filterable by wellId (synthetic; CAS numbers omitted, never fabricated)" },
      { method: "GET", path: "/jib-statements", operationId: "listJIBStatements", summary: "listJIBStatements — joint-interest-billing statements (the jib.claims document grammar), filterable by wellId/partnerId" },
      { method: "GET", path: "/jib-statements/{id}", operationId: "getJIBStatement", summary: "getJIBStatement — one JIB statement by id (typed envelope)" },
      { method: "POST", path: "/jib-statements", operationId: "createJIBStatement", summary: "createJIBStatement — headless production-accounting system-of-record door; writes to the ephemeral demo workspace (sandbox retention disclosed at /llms.txt); netDue computed server-side so share arithmetic stays honest" },
      { method: "GET", path: "/verify", operationId: "getVerify", summary: "getVerify — the published public-contract verification page: how to run this surface's conformance suite yourself" },
      { method: "GET", path: "/icp.json", operationId: "getICP", summary: "getICP — the row's G2 coordinates (ICP + Persona) and System coordinates, machine-readable" },
    ],
    /* axp-ext-rates-g2 §3 — links.verify on the card: the published
       runnable-suite export (the "run this" door), beside links.conformance. */
    verifyUrl: "/verify",
    /* axp-ext-rates-g2 §4 — the G2/ICP coordinates as a TOP-LEVEL card
       object, carried verbatim by the generator; links.icp declared beside
       it (icpUrl below). */
    g2: G2,
    icpUrl: `${ORIGIN}/icp.json`,
    /** The attestation/identity ladder — ONLY the rung this deployment can
     *  honor today (presence-when-true). The higher B2A rungs are advertised
     *  as labeled STUBS in the 402 OFFER alternatives, never asserted here. */
    attestationLadder: [
      {
        rung: "anonymous",
        auth: "none",
        grants:
          "every keyless read surface answers in full — the quartet, /wells and its sibling collections, /icp.json, /verify — and POST /jib-statements writes to an ephemeral demo workspace with synthetic labeled seed state, no email, no approval, no key. Workspace state is in-memory and may be reset at any time.",
      },
    ],
    pricing: {
      model: "metered",
      hardCeiling: 100,
      unit: "usd",
      price: 0.002,
      binding: false,
      statement:
        "Wave-zero 402-shaped stub: no billing is live on this unnamed placeholder surface. The metered shape, hard ceiling and 402 OFFER boundary are served so agents can exercise the payable contract; every call inside the sandbox is free. This is a labeled stub, not an invoice.",
      /* axp-ext-rates-g2 §2 — the operation rate card at its RULED placement:
         a TOP-LEVEL rates[] array of the Pricing Document, native in the
         generator (survey-floor vocabulary at 0.2.0: every row names a
         freeQuota or prices from zero; no freeQuota on model:free; no
         reserved member names). Keys on the canonical operationId. */
      rates: [
        {
          operation: "listWells", // the branching /wells collection (collection.operationId)
          price: 0.002,
          unit: "usd",
          freeQuota: 100,
          note: "wave-zero 402-shaped stub — no live settlement; every sandbox call is free",
        },
      ],
      offers: [
        {
          id: "b2aLadder",
          title: "B2A access ladder (wave-zero stub — no live settlement)",
          alternatives: [
            { mode: "pay", description: "402 metering against machine identity (id.org.ai) — STUB: settlement is not live on this placeholder surface" },
            { mode: "work", description: "earn .ax-ledger credits via proof-of-work tasks (#17 ladder rung 1) — STUB: ledger not attached until the row is named" },
            { mode: "claim", description: "a human claims this agent's demo workspace for attribution and longer tenure — STUB: claim door not mounted at wave zero" },
          ],
        },
      ],
      offerPath: "/offer",
      spendParam: "spend",
    },
    /* MCP: mounted (worker.js), authless at the anon-sandbox rung — the only
       rung this deployment honors; bearer-key doors arrive with the higher
       rungs, so none is declared (presence-when-true). String tool names =
       the same canonical operationIds. */
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: "streamable-http",
      tools: ["listWells", "getWell", "listOperators", "listViolations", "listDisclosures", "listJIBStatements"],
    },
    llms: { body: llmsBody },
    family: [
      {
        name: "apis.ax",
        origin: "https://apis.ax",
        role: "the AXP standard this face is generated against (apis-ax-axp@2.6.0)",
      },
    ],
    home: {
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>mining-oil-gas.org.ai</title></head>\n<body><h1>Mining, Oil &amp; Gas substrate (wave zero, unnamed)</h1><p>The G3 substrate for the Mining, Oil &amp; Gas vertical (NAICS 21) — a GAP-row placeholder surface with no brand attached. All data is synthetic example data, clearly labeled.</p><p>Machine faces: <a href="/llms.txt">/llms.txt</a>, <a href="/.well-known/agents.json">/.well-known/agents.json</a>, <a href="/openapi.json">/openapi.json</a>, <a href="/pricing">/pricing</a>.</p></body></html>\n`,
      md: `# Mining, Oil & Gas substrate (wave zero, unnamed)\n\nGAP-row placeholder — same truth as the page, token-cheap. All data synthetic and labeled.\n\n- llms: ${ORIGIN}/llms.txt\n- card: ${ORIGIN}/.well-known/agents.json\n- openapi: ${ORIGIN}/openapi.json\n- pricing: ${ORIGIN}/pricing\n`,
    },
  });
}
