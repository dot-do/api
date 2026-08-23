/**
 * manifest.js — the ONE site manifest every machine face is generated from
 * (vendored axp-faces@0.3.0, byte-identical with pins — see axp/VENDORED.json;
 * vendored via `git show` from the axp.org.ai repo's COMMITTED HEAD
 * 523c9ef217d54feefb0b20734a6d2996a6965b79 on branch
 * draft/axp-extension-rates-g2, never the working tree).
 *
 * This vendoring is NATIVE axp-ext/rates-g2@0.2.0 (digest 903e414d…): the
 * four ruled placements emitted by the generator itself, no bridges —
 * `rates[]` TOP-LEVEL in the Pricing Document, `g2` TOP-LEVEL on the
 * capability card, `links.verify` as a card link member, and the canonical
 * camelCase-verb `operationId` on every route — plus the 0.2.0 survey-floor
 * rate-row vocabulary (`included` allowances, reserved members refused
 * fail-closed).
 *
 * ORIGIN IS THE RULED BRAND, NOT THIS WORKER'S DEPLOYMENT. auto.dev is the
 * register row's proposed primary name (the naming doctrine's own exemplar)
 * and the estate's only LIVE-REVENUE property — served today from the
 * Drivly, Inc. stack (entity boundary). This examples worker is the
 * wave-zero AXP machine-face instantiation built in dot-do/api per the
 * agriculture-food home precedent; whether it is adopted into the live
 * serving repo (the fn-it pattern) is a flagged founder ruling. Probes
 * recorded in product.js: the live rail serves llms.txt + openapi.json but
 * no AXP card, no keyless floor, no rates[] Pricing Document — the gaps this
 * face closes.
 */
import { defineSiteManifest } from "./axp/index.js";
import { product } from "./product.js";
import seed from "./seed.json" with { type: "json" };

export const ORIGIN = "https://auto.dev"; // the ruled brand (register: doctrine exemplar); production rail = Drivly stack — see header
export const SUBSTRATE = "automotive";

const llmsBody = `# auto.dev — the vehicle record, VIN-keyed (NAICS 441/8111)

THE VEHICLE record at full breadth: VIN-keyed vehicles, retail listings,
parts/tires on the GTIN/UNSPSC spine, and the 8111 work-order grain
(recon | inspection | maintenance). Two faces, one definition:

- **Data face** — read the typed records: \`/vehicles\`, \`/vin/{vin}\`,
  \`/listings\`, \`/parts\`, \`/work-orders\`.
- **Headless face** — the FSM system-of-record door on the SAME collection:
  \`POST /work-orders\` creates a draft work order in your sandbox workspace
  (the row's 8111 work-order grain, live in Vin lanes).

This is the wave-zero AXP machine face of the register row. The production
data rail (api.auto.dev, key-gated, 2.1M listings) serves separately today;
every record on THIS surface is clearly-labeled synthetic example data typed
to the same shapes.

## Quickstart (keyless — no signup, no key)

\`\`\`sh
curl ${ORIGIN}/vehicles                        # typed OK envelope, labeled example data
curl ${ORIGIN}/vehicles?make=Vantorra          # branching on the query
curl ${ORIGIN}/vin/EXAMPLE0000000001           # sandbox decode over the labeled corpus
curl ${ORIGIN}/pricing                         # the Pricing Document (rates[] top-level)
\`\`\`

All sandbox records are clearly labeled synthetic example data
(\`example: true\` on every record; VINs are EXAMPLE-prefixed VIN-shaped
synthetic — never a real vehicle; GTINs use the GS1 demo prefix 952; makes,
models, and dealers are fictional). Anonymous writes mint an ephemeral
workspace (see the \`X-Workspace\` response header); retention is disclosed
in each response. Payment endpoints on THIS face are 402-shaped stubs — the
pricing document says so in its own \`binding\`/\`statement\` members, and
nothing is ever charged here.
`;

export const manifest = defineSiteManifest({
  origin: ORIGIN,
  name: "auto.dev",
  description:
    "VIN-keyed vehicle records, retail listings, parts/tires on the GTIN/UNSPSC spine, and 8111 work orders (recon/inspection/maintenance) for Automotive (NAICS 441/8111) — one definition serving a data face and the FSM work-order headless door.",
  version: "0.1.0",

  // The ONE branching collection (Clauses 4 + 7 on one pathname): THE
  // VEHICLE record, VIN-keyed — the row's data ply.
  collection: {
    path: "/vehicles",
    operationId: "listVehicles",
    memberName: "vehicles",
    summary: "Vehicles (THE VEHICLE record, VIN-keyed — the row's data abstraction) — the branching typed collection: OK | EMPTY | BLOCKED on one pathname",
    records: seed.vehicles,
    filters: ["make", "year"],
    blockedScopes: ["owner-pii", "dealer-cost"],
  },

  // Extra LIVE routes — every path listed here answers in worker.js today,
  // and every route carries its canonical operationId (axp-ext/rates-g2 §1).
  routes: [
    { method: "GET", path: "/vehicles/{vin}", operationId: "getVehicle", summary: "One vehicle by VIN (sandbox: EXAMPLE-prefixed VIN-shaped synthetic ids), typed envelope" },
    { method: "GET", path: "/vin/{vin}", operationId: "decodeVin", summary: "Decode a VIN against this sandbox's labeled corpus (the live wedge's signature operation; the production decoder at api.auto.dev is key-gated — probed 401 keyless 2026-08-23)" },
    { method: "GET", path: "/listings", operationId: "listListings", summary: "Retail listings on the vehicle record (synthetic, labeled; the live rail's 2.1M-listing corpus is key-gated and never reproduced here)", params: [{ name: "dealer", description: "filter by dealer id (DLR-EX-*)" }, { name: "status", description: "active | sold" }] },
    { method: "GET", path: "/listings/{id}", operationId: "getListing", summary: "One listing by id" },
    { method: "GET", path: "/parts", operationId: "listParts", summary: "Parts/tires on the GTIN/UNSPSC spine (GS1 demo prefix 952, valid check digits; tires = category)", params: [{ name: "category", description: "brakes | tires | filters | electrical | engine" }, { name: "gtin", description: "filter by GTIN (952-prefixed demo range)" }] },
    { method: "GET", path: "/parts/{id}", operationId: "getPart", summary: "One part by id" },
    { method: "GET", path: "/work-orders", operationId: "listWorkOrders", summary: "Work orders — the 8111 FSM grain (recon | inspection | maintenance)", params: [{ name: "status", description: "draft | in-progress | completed" }] },
    { method: "GET", path: "/work-orders/{id}", operationId: "getWorkOrder", summary: "One work order by id" },
    {
      method: "POST",
      path: "/work-orders",
      operationId: "createWorkOrder",
      summary: "Create a draft work order in your sandbox workspace (the FSM system-of-record headless door — same collection, one definition)",
      description:
        "Anonymous callers are auto-minted an ephemeral workspace (X-Workspace response header). Retention is disclosed in the response body; the sandbox is the real product over labeled example data. The operator brings the license where 8111 work is regulated (#22 regulation unlock).",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["kind", "vin"], properties: { kind: { type: "string", enum: ["recon", "inspection", "maintenance"] }, vin: { type: "string" }, operatorId: { type: "string" }, lineItems: { type: "array" } } } } } },
      responses: { 200: { description: "OK envelope with the created draft work order and workspace id" } },
    },
    {
      method: "POST",
      path: "/work-orders/{id}/complete",
      operationId: "completeWorkOrder",
      summary: "Complete a work order as a verified deliverable (outcome verb) — answers a typed 402 OFFER; wave-zero STUB on this face, no live settlement",
      responses: { 402: { description: "OFFER envelope; only the mounted sandbox rung is advertised as live — unmounted shapes are labeled stubs; nothing is charged on this face" } },
    },
    { method: "GET", path: "/icp.json", operationId: "getIcp", summary: "G2 coordinates: ICP + personas of this substrate; System coordinate FSM⟨automotive-repair 8111⟩ (DMS deferred per the row)" },
    { method: "GET", path: "/verify", operationId: "getVerifySuite", summary: "The published verification suite document — run our tests" },
  ],

  // MCP — declared because the door IS mounted at /mcp (worker.js). Tool
  // names ARE the canonical operationIds as STRINGS (axp-ext/rates-g2 §1).
  // The door is AUTHLESS at the anon-sandbox rung (the universal floor); the
  // shapes above the floor are not mounted on THIS face at wave zero, so no
  // key surface is advertised (presence-when-true). (The production rail's
  // separate MCP server at the Drivly stack takes account keys — that door
  // is that stack's, not this face's.)
  mcp: {
    url: `${ORIGIN}/mcp`,
    transport: "streamable-http",
    tools: ["listVehicles", "getVehicle", "decodeVin", "listListings", "listParts", "listWorkOrders"],
  },

  // Wave-zero pricing FOR THIS FACE: metered SHAPE with the 402 boundary
  // served, honestly declared UNBOUND (stub — no settlement is wired on this
  // examples worker; test-mode counts as face-payable, never as billing).
  // The production rail's real plans live at the Drivly stack and are NOT
  // restated here — these rates are stated intent for the wave-zero face,
  // not the production rail's terms. `rates` is TOP-LEVEL in the Pricing
  // Document (the ruled placement), operationId-keyed, survey-floor
  // vocabulary (`included` allowances; every row prices from zero or names
  // its allowance).
  pricing: {
    model: "metered",
    hardCeiling: 25,
    unit: "usd-per-month",
    price: 0.002,
    binding: false,
    statement:
      "Wave-zero stub pricing on the machine-face instantiation: no settlement is wired on this face and nothing is ever charged here. The 402 boundary is test-mode. These rates are stated intent for this face, not the production rail's plans (api.auto.dev prices its own keys at the Drivly stack).",
    rates: [
      { operation: "listVehicles", price: 0 },
      { operation: "getVehicle", price: 0.002, included: { qty: 100, period: "month" } },
      { operation: "decodeVin", price: 0.005, included: { qty: 100, period: "month" } },
      { operation: "listListings", price: 0 },
      { operation: "getListing", price: 0.002, included: { qty: 100, period: "month" } },
      { operation: "listParts", price: 0 },
      { operation: "getPart", price: 0.002, included: { qty: 100, period: "month" } },
      { operation: "listWorkOrders", price: 0 },
      { operation: "getWorkOrder", price: 0 },
      { operation: "createWorkOrder", price: 0, note: "sandbox workspaces — free at the anon floor" },
      {
        operation: "completeWorkOrder",
        price: 2.5,
        unit: "per completed verified work-order deliverable (per-outcome)",
        included: { qty: 3, period: "month" },
        note: "402 OFFER boundary is served today; settlement on this face is a stub (test-mode). Per-outcome pricing on the completed 8111 deliverable is the row-specific experiment sub-hypothesis (projection.json).",
      },
    ],
    offers: [
      {
        id: "metered-access-stub",
        title: "Metered access (test-mode stub on this face — no live billing here)",
        price: { model: "metered", hardCeiling: 25, unit: "usd-per-month", price: 0.002 },
        // MOUNTED-RUNGS RULE (B2D motion): only the anon-sandbox floor is a
        // live door on THIS face at wave zero, and it is the only alternative
        // advertised as mounted. The B2D shapes above it — GitHub OAuth free
        // tier, checkout (key + card on file), committed subscription —
        // appear for shape discovery ONLY, each explicitly mounted:false +
        // stub:true. The production rail onboards developers with keys today
        // at the Drivly stack; that door is that stack's, never claimed here.
        alternatives: [
          { id: "sandbox", rel: "sandbox", mounted: true, title: "Keyless anon sandbox floor — free, labeled example data; the only mounted door on this face today." },
          { id: "oauth-free", rel: "free-tier", mounted: false, stub: true, title: "GitHub OAuth free tier (B2D onboarding). NOT MOUNTED on this face: no OAuth flow is wired here. The production rail's free plan lives at the Drivly stack." },
          { id: "checkout", rel: "payment", mounted: false, stub: true, title: "Self-serve metered — key + card on file, 402 boundary (the auto.dev 402 pattern). NOT MOUNTED on this face: test-mode stub, no settlement wired; nothing is charged here." },
          { id: "subscription", rel: "subscription", mounted: false, stub: true, title: "Committed monthly subscription, cheaper units. NOT MOUNTED on this face: no checkout exists here." },
        ],
      },
    ],
    offerPath: "/offer",
    spendParam: "spend",
  },

  llms: { body: llmsBody },
  icpUrl: `${ORIGIN}/icp.json`,

  // axp-ext/rates-g2 §3 — links.verify: the published runnable-suite export.
  verifyUrl: "/verify",

  // axp-ext/rates-g2 §4 — G2/ICP coordinates TOP-LEVEL on the card
  // (generator-native in this vendoring). Row ICP: Industry 441/8111 ×
  // CompanyType {franchise dealer, dealer group, independent repair operator};
  // auto.dev's motion is B2D (row: "Motions already differentiated by brand").
  g2: {
    icp: {
      companyTypes: ["franchise dealer", "dealer group", "independent repair operator", "automotive software vendor"],
      jobTypes: ["developer at a dealer-systems or automotive-data vendor", "dealer principal / GM", "service & recon manager", "automotive service technician [O*NET 49-3023 — register: UNVERIFIED code]"],
    },
    personas: [
      { id: "developer", description: "developer at an automotive software vendor or dealer group integrating VIN-keyed vehicle, listing, and parts records (the auto.dev B2D motion — the row's proven wedge)" },
      { id: "operator", description: "service/recon manager at a dealer or independent repair operator running work orders on the 8111 FSM grain" },
      { id: "agent", description: "autonomous agent decoding VINs, pulling listings, or preparing work orders on a principal's behalf — the row's B2A generalization frontier (apis.ax face, not yet built)" },
    ],
  },

  // Family: the row holds sibling names (apis.autos brand record, apis.parts/
  // tires/motorcycles zones, data.vin, the .vin estate) but NONE serves a
  // machine face today — a family edge to a non-serving door would be a ghost
  // surface. vin.company serves humans in human vocabulary (the counterpart
  // brand, projection.json) — not a machine-face sibling. Edges attach when
  // siblings serve.
  family: [],

  home: {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>auto.dev — machine face (wave zero)</title></head>
<body>
<h1>auto.dev — the vehicle record, VIN-keyed</h1>
<p>Wave-zero AXP machine face for Automotive (NAICS 441/8111): VIN-keyed vehicles, retail listings, parts/tires on the GTIN/UNSPSC spine, and 8111 work orders — one definition, a data face and an FSM work-order headless door. All sandbox data on this surface is clearly labeled synthetic example data (EXAMPLE-prefixed VIN-shaped ids, GS1 952 demo GTINs, fictional makes and dealers). The production data rail (api.auto.dev, key-gated) serves separately.</p>
<p>Machine surfaces: <a href="/llms.txt">/llms.txt</a> · <a href="/.well-known/agents.json">agents.json</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing">pricing</a> · <a href="/verify">verify</a> · <a href="/vehicles">vehicles (keyless, labeled example data)</a></p>
</body></html>
`,
    md: `# auto.dev — machine face (wave zero)

VIN-keyed vehicles, listings, parts, and 8111 work orders for Automotive (NAICS 441/8111) — live machine face over labeled synthetic sandbox data; the production data rail (api.auto.dev, key-gated) serves separately.

- llms: ${ORIGIN}/llms.txt
- card: ${ORIGIN}/.well-known/agents.json
- openapi: ${ORIGIN}/openapi.json
- pricing: ${ORIGIN}/pricing
- verify: ${ORIGIN}/verify
- collection: ${ORIGIN}/vehicles
`,
  },
});
