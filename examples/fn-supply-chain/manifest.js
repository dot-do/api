/**
 * manifest.js — the ONE site manifest the whole machine face is generated
 * from (vendored axp-faces, apis-ax-axp@2.6.0 pin — see axp/PINS.json).
 *
 * Row `fn-supply-chain` (full-economy register 2026-08-23): the ruled primary
 * name is **apis.supply — a SHARED face with the Wholesale/NAICS 42 vertical
 * row** (that row owns the `examples/apis.supply` build), and the zone is
 * unprovisioned (register: "Requires provisioning (currently zoneless)").
 * Per the batch-1 fn-* precedent this Function row's substrate serves under
 * the row-key placeholder org.ai address; attaching the shared face when the
 * zone provisions (and the shared-face arrangement is reconciled with the
 * NAICS 42 build) is a config change, not a rebuild. The placeholder address
 * is a substrate address, never a brand claim.
 */
import { defineSiteManifest } from "./axp/index.js";
import { purchaseOrders, RETENTION_NOTICE } from "./seed.js";

/** Placeholder origin — the row-key substrate address, never a brand claim. */
export const ORIGIN = "https://fn-supply-chain.org.ai";

const llmsBody = `# fn-supply-chain.org.ai — the Supply Chain & Procurement substrate (wave zero)

The G3 substrate for the Supply Chain & Procurement Function (one of the 13
Functions): X12-typed business documents — 850 purchase orders, 810 invoices,
856 advance ship notices — plus RFQ/quote records (the price-response corpus)
and GS1 EPCIS events over GTIN/GLN-identified things (data face), and the
same collections as headless buy-side procurement system-of-record doors
(headless face) — one definition, two plies.

The row's ruled name (apis.supply) is a shared face with the Wholesale/NAICS
42 vertical row and is not yet provisioned, so this substrate serves under
its row-key placeholder address. All records are SYNTHETIC EXAMPLE DATA,
clearly labeled (\`example: true\`, "[demo]" prefixes, GS1 demo-prefix-952
GTINs and GLNs). UNSPSC codes are omitted, never fabricated.

## Quickstart (keyless — the anon sandbox is the universal floor)

\`\`\`sh
curl ${ORIGIN}/purchase-orders                # typed OK envelope, branching collection
curl ${ORIGIN}/purchase-orders?status=open    # branch: filtered
curl ${ORIGIN}/rfqs                           # RFQ records; POST to fan one out
curl ${ORIGIN}/epcis-events                   # EPCIS ObjectEvents (shipping/receiving)
curl ${ORIGIN}/pricing                        # the Pricing Document + rates[] (metered stub — no live billing)
\`\`\`

${RETENTION_NOTICE}
`;

export function buildManifest() {
  return defineSiteManifest({
    origin: ORIGIN,
    name: "fn-supply-chain.org.ai",
    description:
      "Wave-zero machine face of the fn-supply-chain G3 substrate (Supply Chain & Procurement Function): X12 850/810/856-typed purchase orders, invoices and ship notices, RFQ/quote records, and GS1 EPCIS events over GTIN/GLN-identified things as a data face, plus the same collections as headless buy-side procurement system-of-record doors. The ruled name apis.supply is a shared face with the NAICS 42 row and is unprovisioned — this substrate serves under its row-key placeholder address; all data synthetic and labeled.",
    version: "0.0.1",
    collection: {
      path: "/purchase-orders",
      memberName: "purchaseOrders",
      summary: "The PurchaseOrder collection (X12 850-typed) — typed OK | EMPTY | BLOCKED, branching on status/supplier; synthetic labeled demo records",
      records: purchaseOrders,
      filters: ["status", "supplier"],
      blockedScopes: ["admin", "internal"],
    },
    routes: [
      { method: "GET", path: "/purchase-orders/{id}", summary: "getPurchaseOrder — one PurchaseOrder record by id (typed envelope)" },
      { method: "POST", path: "/purchase-orders", summary: "createPurchaseOrder — headless buy-side system-of-record door; writes to the ephemeral demo workspace (sandbox retention disclosed at /llms.txt)" },
      { method: "GET", path: "/rfqs", summary: "listRFQs — RFQ records, filterable by status/category" },
      { method: "POST", path: "/rfqs", summary: "createRFQ — headless door; fan out a request for quotes into the ephemeral demo workspace" },
      { method: "POST", path: "/rfqs/{id}/quotes", summary: "submitQuote — supply-side price response to an RFQ (the price-response corpus germ); ephemeral demo workspace" },
      { method: "GET", path: "/quotes", summary: "listQuotes — quote records, filterable by rfq/supplier" },
      { method: "GET", path: "/invoices", summary: "listInvoices — invoice records (X12 810-typed), filterable by purchaseOrder/status" },
      { method: "GET", path: "/shipment-notices", summary: "listShipmentNotices — advance ship notices (X12 856-typed, GLN-addressed, GTIN-lined), filterable by purchaseOrder" },
      { method: "GET", path: "/epcis-events", summary: "listEPCISEvents — GS1 EPCIS 2.0-shaped ObjectEvents, filterable by bizStep/shipmentNotice" },
      { method: "GET", path: "/items", summary: "listItems — GS1-identified things (GTIN spine; demo prefix 952), filterable by supplier" },
      { method: "GET", path: "/verify", summary: "The published public-contract verification page: how to run this surface's conformance suite yourself" },
      { method: "GET", path: "/icp.json", summary: "getICP — the row's G2 coordinates (ICP + Persona) and 52-System coordinates, machine-readable" },
    ],
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
          "every keyless read surface answers in full — the quartet, /purchase-orders and its sibling collections, /icp.json, /verify — and POST /purchase-orders, POST /rfqs or POST /rfqs/{id}/quotes writes to an ephemeral demo workspace with synthetic labeled seed state, no email, no approval, no key. Workspace state is in-memory and may be reset at any time.",
      },
    ],
    pricing: {
      model: "metered",
      hardCeiling: 100,
      unit: "usd",
      price: 0.002,
      binding: false,
      statement:
        "Wave-zero 402-shaped stub: no billing is live on this placeholder substrate address. The metered shape, hard ceiling and 402 OFFER boundary are served so agents can exercise the payable contract; every call inside the sandbox is free. This is a labeled stub, not an invoice.",
      offers: [
        {
          id: "b2aLadder",
          title: "B2A access ladder (wave-zero stub — no live settlement)",
          alternatives: [
            { mode: "pay", description: "402 metering against machine identity (id.org.ai) — STUB: settlement is not live on this placeholder surface" },
            { mode: "work", description: "earn .ax-ledger credits via proof-of-work tasks (#17 ladder rung 1) — STUB: ledger not attached until the shared face provisions" },
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
      tools: ["listPurchaseOrders", "getPurchaseOrder", "listRFQs", "listQuotes", "listInvoices", "listShipmentNotices", "listEPCISEvents", "listItems"],
    },
    llms: { body: llmsBody },
    family: [
      {
        name: "apis.ax",
        origin: "https://apis.ax",
        role: "the AXP standard this face is generated against (apis-ax-axp@2.6.0)",
      },
      {
        name: "epcis.dev",
        origin: "https://epcis.dev",
        role: "the EPCIS-traceability sub-position's own face (a distinct register cell sharing the EPCIS verbs; BUILT thin — it stays the traceability lead, this substrate stays the Function lead)",
      },
      {
        name: "barcoding.dev",
        origin: "https://barcoding.dev",
        role: "the GS1 identification face beside epcis.dev (category-completing .dev grammar, shared with the EPCIS-traceability cell)",
      },
    ],
    home: {
      html: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>fn-supply-chain.org.ai</title></head>\n<body><h1>Supply Chain &amp; Procurement substrate (wave zero)</h1><p>The G3 substrate for the Supply Chain &amp; Procurement Function — served under its row-key placeholder address while the ruled shared face (apis.supply) awaits provisioning. All data is synthetic example data, clearly labeled.</p><p>Machine faces: <a href="/llms.txt">/llms.txt</a>, <a href="/.well-known/agents.json">/.well-known/agents.json</a>, <a href="/openapi.json">/openapi.json</a>, <a href="/pricing">/pricing</a>.</p></body></html>\n`,
      md: `# Supply Chain & Procurement substrate (wave zero)\n\nRow-key placeholder address — same truth as the page, token-cheap. All data synthetic and labeled.\n\n- llms: ${ORIGIN}/llms.txt\n- card: ${ORIGIN}/.well-known/agents.json\n- openapi: ${ORIGIN}/openapi.json\n- pricing: ${ORIGIN}/pricing\n`,
    },
  });
}
