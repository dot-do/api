/**
 * manifest.js — the ONE site manifest the whole machine face is generated
 * from (vendored axp-faces, apis-ax-axp@2.6.0 pin — see axp/PINS.json).
 *
 * GAP row (`fn-product-development`, full-economy register 2026-08-23): no
 * product-function name is held, so per template spec §0 the G3 substrate is
 * instantiated under a PLACEHOLDER org.ai address and no G4 brand config
 * exists. apis.dev is explicitly NOT this rail (#3 doctrine: its subject is
 * "APIs for api dev", Software vertical). When a name is acquired (#16), the
 * G4 projection attaches; nothing here re-derives naming.
 */
import { defineSiteManifest } from "./axp/index.js";
import { products, RETENTION_NOTICE } from "./seed.js";

/** Placeholder origin — the unnamed-substrate address, never a brand claim. */
export const ORIGIN = "https://fn-product-development.org.ai";

/** The row's G2 coordinates — ONE truth, three faces: the card's top-level
 *  `g2` member (axp-ext-rates-g2@0.1.0 §4, carried verbatim by the
 *  generator), the /icp.json door (projection.js/worker.js), and the
 *  Stratum-B projection registration (projection.js imports this). */
export const G2 = Object.freeze({
  icp: Object.freeze({
    coordinates: "Function = Product Development × Departments = Product / Engineering",
    companyTypes: "all — horizontal Function row",
    jobTypes: Object.freeze(["head of product", "head of engineering", "product manager", "hardware program manager"]),
  }),
  personas: Object.freeze([
    Object.freeze({ id: "agentBuilder", description: "an autonomous agent that builds products — the wave-zero first tenant (B2A)" }),
    Object.freeze({ id: "productLead", description: "head of product across CompanyTypes" }),
    Object.freeze({ id: "engineeringLead", description: "head of engineering / hardware program lead (PLM/CAD side)" }),
  ]),
  motion: "B2A",
});

const llmsBody = `# fn-product-development.org.ai — the Product Development substrate (wave zero, unnamed)

The G3 substrate for the Product Development Function (APQC PCF category 2,
one of the 13 Functions): Product, Requirement, Release, RoadmapItem and BOM
Item records (data face) and the same collections as headless PM/PLM
system-of-record doors (headless face) — one definition, two plies.

This is a GAP-row placeholder surface: no product-function brand name is held
yet, so there is no G4 brand here — only the substrate, its anon sandbox, and
its machine face. All records are SYNTHETIC EXAMPLE DATA, clearly labeled
(\`example: true\`, "[demo]" prefixes, GS1 demo-prefix-952 GTINs).

## Quickstart (keyless — the anon sandbox is the universal floor)

\`\`\`sh
curl ${ORIGIN}/products              # typed OK envelope, branching collection
curl ${ORIGIN}/products?stage=beta   # branch: filtered
curl ${ORIGIN}/requirements          # sibling data-face collection
curl ${ORIGIN}/pricing               # the Pricing Document (metered stub — no live billing)
\`\`\`

${RETENTION_NOTICE}
`;

export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: "fn-product-development.org.ai",
    description:
      "Wave-zero machine face of the fn-product-development G3 substrate (Product Development Function, APQC PCF 2): product, requirement, release, roadmap and BOM records as a data face, and the same collections as headless PM/PLM system-of-record doors. GAP-row placeholder — no product-function brand attached; all data synthetic and labeled.",
    version: "0.0.1",
    collection: {
      path: "/products",
      /* axp-ext-rates-g2@0.1.0 §1: the branching collection's canonical
         cross-face name — the same string as the MCP tool and the rate-card
         key (previously the generator default "listCollection"; the
         extension made the collection operation site-nameable). */
      operationId: "listProducts",
      memberName: "products",
      summary: "The Product collection — typed OK | EMPTY | BLOCKED, branching on stage/kind; synthetic labeled demo records",
      records: products,
      filters: ["stage", "kind"],
      blockedScopes: ["admin", "internal"],
    },
    /* axp-ext-rates-g2 §1 — operationId is a native passthrough on every
       route: the ONE cross-face name (OpenAPI operationId = MCP tool name =
       suite coverage reference = SDK method = rates[] key). */
    routes: [
      { method: "GET", path: "/products/{id}", operationId: "getProduct", summary: "getProduct — one Product record by id (typed envelope)" },
      { method: "POST", path: "/products", operationId: "createProduct", summary: "createProduct — headless system-of-record door; writes to the ephemeral demo workspace (sandbox retention disclosed at /llms.txt)" },
      { method: "GET", path: "/requirements", operationId: "listRequirements", summary: "listRequirements — requirement records, filterable by product/status" },
      { method: "POST", path: "/requirements", operationId: "createRequirement", summary: "createRequirement — headless door; ephemeral demo workspace" },
      { method: "GET", path: "/releases", operationId: "listReleases", summary: "listReleases — release records, filterable by product/channel" },
      { method: "GET", path: "/roadmap", operationId: "listRoadmapItems", summary: "listRoadmapItems — roadmap items, filterable by product/horizon" },
      { method: "GET", path: "/bom-items", operationId: "listBOMItems", summary: "listBOMItems — BOM item records for physical products (GS1 demo-prefix-952 GTINs), filterable by product" },
      { method: "GET", path: "/verify", operationId: "getVerify", summary: "getVerify — the published public-contract verification page: how to run this surface's conformance suite yourself" },
      { method: "GET", path: "/icp.json", operationId: "getICP", summary: "getICP — the row's G2 coordinates (ICP + Persona) and 52-System coordinates, machine-readable" },
    ],
    /* axp-ext-rates-g2 §3 — links.verify on the card: the published
       runnable-suite export (the "run this" door), beside links.conformance. */
    verifyUrl: "/verify",
    /* axp-ext-rates-g2 §4 — the G2/ICP coordinates as a TOP-LEVEL card
       object, carried verbatim by the generator; links.icp stays legal and
       declared beside it (icpUrl below). */
    g2: G2,
    icpUrl: `${ORIGIN}/icp.json`,
    /** The attestation/identity ladder — ONLY the rung this deployment can
     *  honor today (presence-when-true). The higher B2A rungs (earned
     *  credits, human-claimed, 402-metered identity) are advertised as
     *  labeled STUBS in the 402 OFFER alternatives, never asserted here. */
    attestationLadder: [
      {
        rung: "anonymous",
        auth: "none",
        grants:
          "every keyless read surface answers in full — the quartet, /products and its sibling collections, /icp.json, /verify — and POST /products or POST /requirements writes to an ephemeral demo workspace with synthetic labeled seed state, no email, no approval, no key. Workspace state is in-memory and may be reset at any time.",
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
         a TOP-LEVEL array of the Pricing Document, native in the generator
         since axp-ext-rates-g2@0.1.0 (survey floor 0.2.0) — this row rode a
         site-side bridge over the generated document while rates[] was an
         upstream gap; the gap is closed. Keys on the canonical operationId. */
      rates: [
        {
          operation: "listProducts", // the branching /products collection (collection.operationId)
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
    mcp: {
      url: `${ORIGIN}/mcp`,
      transport: "streamable-http",
      tools: ["listProducts", "getProduct", "listRequirements", "listReleases", "listRoadmapItems", "listBOMItems"],
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
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>fn-product-development.org.ai</title></head>\n<body><h1>Product Development substrate (wave zero, unnamed)</h1><p>The G3 substrate for the Product Development Function — a GAP-row placeholder surface with no brand attached. All data is synthetic example data, clearly labeled.</p><p>Machine faces: <a href="/llms.txt">/llms.txt</a>, <a href="/.well-known/agents.json">/.well-known/agents.json</a>, <a href="/openapi.json">/openapi.json</a>, <a href="/pricing">/pricing</a>.</p></body></html>\n`,
      md: `# Product Development substrate (wave zero, unnamed)\n\nGAP-row placeholder — same truth as the page, token-cheap. All data synthetic and labeled.\n\n- llms: ${ORIGIN}/llms.txt\n- card: ${ORIGIN}/.well-known/agents.json\n- openapi: ${ORIGIN}/openapi.json\n- pricing: ${ORIGIN}/pricing\n`,
    },
  });
}
