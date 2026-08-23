/**
 * surface.test.js — the scriptable §9.1 self-verify boxes beyond the pinned
 * conformance gate: fixture law on the seed (GTINs AND GLNs), both plies
 * from one definition, the four RULED BRIDGE PLACEMENTS (batch-2 watch list:
 * rates[] top-level on the Pricing Document, g2 top-level on the card,
 * links.verify as a card link member, operationId on EVERY route), the B2A
 * ladder in the 402 OFFER body, the mounted MCP door, the /verify export,
 * the G2 face, and no ghost surfaces.
 */
import { describe, expect, it } from "vitest";
import worker from "../worker.js";
import { buildManifest, ORIGIN } from "../manifest.js";
import { apiProduct, OPERATIONS } from "../apiproduct.js";
import { projection } from "../projection.js";
import { purchaseOrders, rfqs, quotes, invoices, shipmentNotices, epcisEvents, items, GLN } from "../seed.js";

globalThis.__SEAM_SILENT = true;

const manifest = buildManifest();
const get = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), {}, undefined);
const json = async (path, init) => {
  const res = await get(path, init);
  return { res, body: await res.json() };
};

/** GS1 mod-10 check digit for a 13-digit GTIN/GLN (first 12 digits in). */
function gs1CheckDigit(d12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}
const valid952 = (code) => /^952\d{10}$/.test(code) && Number(code[12]) === gs1CheckDigit(code.slice(0, 12));

describe("§5.2 sandbox seed — fixture law, mechanically checked", () => {
  const all = [...purchaseOrders, ...rfqs, ...quotes, ...invoices, ...shipmentNotices, ...epcisEvents, ...items];
  it("every seed record is labeled example data", () => {
    for (const rec of all) expect(rec.example).toBe(true);
  });
  it("every titled record carries the [demo] prefix", () => {
    for (const rec of all) if (rec.title !== undefined) expect(rec.title.startsWith("[demo]")).toBe(true);
  });
  it("every GTIN is GS1 demo prefix 952 with a valid check digit", () => {
    const gtins = new Set(items.map((i) => i.gtin));
    for (const po of purchaseOrders) for (const l of po.lines) gtins.add(l.gtin);
    for (const asn of shipmentNotices) for (const l of asn.lines) gtins.add(l.gtin);
    for (const e of epcisEvents) for (const g of e.gtins) gtins.add(g);
    expect(gtins.size).toBeGreaterThan(0);
    for (const g of gtins) expect(valid952(g), g).toBe(true);
  });
  it("every GLN is GS1 demo prefix 952 with a valid check digit", () => {
    const glns = new Set(Object.values(GLN));
    for (const po of purchaseOrders) {
      glns.add(po.buyerGln);
      glns.add(po.supplierGln);
    }
    for (const asn of shipmentNotices) {
      glns.add(asn.shipFromGln);
      glns.add(asn.shipToGln);
    }
    for (const e of epcisEvents) glns.add(e.readPointGln);
    for (const g of glns) expect(valid952(g), g).toBe(true);
  });
  it("the seed exercises the row's record chain with realistic depth", () => {
    // the closed PO has its invoice, its ASN, and a shipping→receiving EPCIS pair
    expect(invoices.some((i) => i.purchaseOrder === "po-demo-001")).toBe(true);
    expect(shipmentNotices.some((s) => s.purchaseOrder === "po-demo-001")).toBe(true);
    const trace = epcisEvents.filter((e) => e.shipmentNotice === "asn-demo-001").map((e) => e.bizStep).sort();
    expect(trace).toEqual(["receiving", "shipping"]);
    // the awarded RFQ has competing quotes and its award points at one of them
    const bids = quotes.filter((q) => q.rfq === "rfq-demo-001");
    expect(bids.length).toBeGreaterThan(1);
    expect(bids.map((q) => q.id)).toContain(rfqs.find((r) => r.id === "rfq-demo-001").awardedQuote);
    // invoice amounts foot to their PO lines exactly
    for (const inv of invoices) {
      const po = purchaseOrders.find((p) => p.id === inv.purchaseOrder);
      const total = po.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      expect(inv.amount).toBeCloseTo(total, 2);
    }
  });
  it("UNSPSC codes are omitted, never fabricated", () => {
    for (const rec of all) expect(rec.unspsc).toBeUndefined();
  });
});

describe("G3 instance + G4 projection (§1, §2)", () => {
  it("every Noun names schema + binding + verbs, and every verb is an operation", () => {
    for (const n of apiProduct.nouns) {
      expect(typeof n.schema).toBe("string");
      expect(["ingested", "generated", "native", "federated"]).toContain(n.binding);
      expect(n.verbs.length).toBeGreaterThan(0);
      for (const v of n.verbs) expect(OPERATIONS).toContain(v);
    }
  });
  it("a System coordinate is declared", () => {
    expect(apiProduct.systems.length).toBeGreaterThan(0);
    for (const s of apiProduct.systems) expect(s.coordinates.length).toBeGreaterThan(0);
  });
  it("shared-face row: brand recorded but claim-free; motion B2A; shapes from the B2A ladder only", () => {
    expect(projection.brand).toBe("apis.supply");
    expect(projection.brandStatus.state).toMatch(/name-only/);
    // positioning stays claim-free: agent-default withheld until the §4.6 bar is attested
    expect(projection.positioning).not.toMatch(/agent[ -]?default|default for/i);
    expect(projection.motion).toBe("B2A");
    const b2aShapes = ["anon-sandbox", "earned-credits", "human-claimed", "paid"];
    for (const o of projection.offer) expect(b2aShapes).toContain(o.shape);
    // B2A never gates on OAuth or credit cards
    for (const o of projection.offer) expect(`${o.gate}`).not.toMatch(/oauth|credit card/i);
    // only the mounted rung is live; everything above is a labeled stub
    for (const o of projection.offer) if (!o.live) expect(typeof o.stub).toBe("string");
  });
  it("experiment registration is complete (§6.2) and the counterpart-brand gap is recorded (§5.1/§9.3)", () => {
    const e = projection.experiment;
    expect(e.pattern).toBeTruthy();
    expect(e.motion).toBe(projection.motion);
    expect(e.shapes.length).toBeGreaterThan(0);
    expect(e.startDate).toBeTruthy();
    expect(e.hypothesis).toBeTruthy();
    expect(projection.counterpartBrand.gap).toMatch(/recorded/);
  });
});

describe("ruled bridge placements (batch-2 watch list — zero divergence)", () => {
  it("rates[] rides top-level on the one Pricing Document; every row has freeQuota or zero price; operations ⊆ operationIds", async () => {
    const { body: pricing } = await json("/pricing.json");
    expect(pricing.model).toBe("metered");
    expect(pricing.hardCeiling).toBeGreaterThan(0);
    expect(pricing.binding).toBe(false);
    expect(typeof pricing.statement).toBe("string");
    expect(Array.isArray(pricing.rates)).toBe(true);
    expect(pricing.rates.length).toBeGreaterThan(0);
    const { body: openapi } = await json("/openapi.json");
    const opIds = [];
    for (const p of Object.values(openapi.paths)) for (const op of Object.values(p)) if (op.operationId) opIds.push(op.operationId);
    for (const r of pricing.rates) {
      expect(opIds, r.operation).toContain(r.operation);
      expect(r.freeQuota !== undefined || r.price === 0).toBe(true);
    }
  });
  it("g2 is a top-level card member and links.verify is a card link member", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.g2).toBeTruthy();
    expect(card.g2.motion).toBe("B2A");
    expect(card.g2.personas.length).toBeGreaterThan(0);
    expect(card.links.verify).toBe(`${ORIGIN}/verify`);
    expect(card.links.conformance).toBeTruthy();
  });
  it("EVERY route in the OpenAPI document carries an operationId", async () => {
    const { body: openapi } = await json("/openapi.json");
    for (const [p, ops] of Object.entries(openapi.paths)) {
      for (const [m, op] of Object.entries(ops)) {
        expect(typeof op.operationId, `${m.toUpperCase()} ${p}`).toBe("string");
      }
    }
  });
  it("the 402 OFFER body advertises the whole B2A ladder (pay / work / claim)", async () => {
    const { res, body } = await json(manifest.pricing.offerPath);
    expect(res.status).toBe(402);
    expect(body.type).toBe("OFFER");
    const modes = body.alternatives.map((a) => a.mode).sort();
    expect(modes).toEqual(["claim", "pay", "work"]);
    // every unmounted rung is disclosed as a STUB, never asserted
    for (const a of body.alternatives) expect(a.description).toMatch(/STUB/);
  });
});

describe("both plies from one substrate (§3) — same collections, same envelopes", () => {
  it("data face: every declared GET collection answers a typed envelope", async () => {
    for (const path of ["/purchase-orders", "/rfqs", "/quotes", "/invoices", "/shipment-notices", "/epcis-events", "/items"]) {
      const { res, body } = await json(path);
      expect(res.status, path).toBe(200);
      expect(body.type, path).toBe("OK");
    }
  });
  it("headless face: the buy-side door writes to the SAME collection, labeled mechanically", async () => {
    const { res, body } = await json("/purchase-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ supplier: "Workspace Supply Co", lines: [{ gtin: "9520002100016", qty: 3, unitPrice: 42.5 }] }),
    });
    expect(res.status).toBe(201);
    expect(body.type).toBe("OK");
    const rec = body.purchaseOrders[0];
    expect(rec.example).toBe(true);
    expect(rec.supplier.startsWith("[demo]")).toBe(true);
    // and it reads back through the data face — one substrate, two plies
    const { body: read } = await json(`/purchase-orders/${rec.id}`);
    expect(read.type).toBe("OK");
    expect(read.purchaseOrders[0].id).toBe(rec.id);
    // ...including through the ONE branching collection itself
    const { body: coll } = await json("/purchase-orders");
    expect(coll.type).toBe("OK");
    expect(coll.purchaseOrders.map((p) => p.id)).toContain(rec.id);
  });
  it("RFQ fan-out and quote submission: the price-response corpus germ accretes in the workspace", async () => {
    const { body: rfq } = await json("/rfqs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Pallet wrap, annual volume", category: "packaging", quantity: 200 }),
    });
    const rfqId = rfq.rfqs[0].id;
    expect(rfq.rfqs[0].title.startsWith("[demo]")).toBe(true);
    const { res, body: quote } = await json(`/rfqs/${rfqId}/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ supplier: "Workspace Supply Co", unitPrice: 26.4, leadTimeDays: 9 }),
    });
    expect(res.status).toBe(201);
    expect(quote.quotes[0].example).toBe(true);
    const { body: read } = await json(`/quotes?rfq=${rfqId}`);
    expect(read.type).toBe("OK");
    expect(read.quotes[0].id).toBe(quote.quotes[0].id);
    // quoting into a nonexistent RFQ is a worded boundary, not a silent success
    const { res: missRes } = await json("/rfqs/rfq-none/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ supplier: "Workspace Supply Co", unitPrice: 1 }),
    });
    expect(missRes.status).toBe(403);
  });
  it("a miss is a truthful EMPTY, never a fake success", async () => {
    const { res, body } = await json("/purchase-orders/po-none");
    expect(res.status).toBe(200);
    expect(body.type).toBe("EMPTY");
    const { body: filtered } = await json("/epcis-events?bizStep=decommissioning");
    expect(filtered.type).toBe("EMPTY");
  });
});

describe("MCP door (§4.4) — mounted, same Nouns/verbs as HTTP", () => {
  const rpc = (method, params, id = 1) =>
    json("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
  it("initialize answers", async () => {
    const { body } = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {} });
    expect(body.result.serverInfo.name).toBe(manifest.name);
  });
  it("tools/list matches the card's declared tools exactly", async () => {
    const { body } = await rpc("tools/list");
    const served = body.result.tools.map((t) => t.name).sort();
    expect(served).toEqual([...manifest.mcp.tools].sort());
  });
  it("tools/call serves the same typed envelope as HTTP", async () => {
    const { body } = await rpc("tools/call", { name: "listEPCISEvents", arguments: { bizStep: "shipping" } });
    const envelope = JSON.parse(body.result.content[0].text);
    expect(envelope.type).toBe("OK");
    const { body: http } = await json("/epcis-events?bizStep=shipping");
    expect(envelope.epcisEvents.map((e) => e.id)).toEqual(http.epcisEvents.map((e) => e.id));
  });
});

describe("no ghost surfaces — everything the card declares answers", () => {
  it("every declared http interface answers GET with 200 (or the declared 402 boundary)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    for (const entry of card.interfaces.http) {
      const path = new URL(entry.url).pathname;
      const res = await get(path);
      const wanted = path === manifest.pricing.offerPath ? 402 : 200;
      expect(res.status, path).toBe(wanted);
    }
  });
  it("links.icp serves the G2 coordinates (ICP + Persona + System set)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    const path = new URL(card.links.icp).pathname;
    const { res, body } = await json(path);
    expect(res.status).toBe(200);
    expect(body.icp).toBeTruthy();
    expect(body.personas.length).toBeGreaterThan(0);
    expect(body.systems.length).toBeGreaterThan(0);
    expect(body.motion).toBe("B2A");
  });
  it("the /verify export answers on all three faces (conneg matrix spot-check)", async () => {
    for (const [hdr, marker] of [
      [{ accept: "application/json" }, '"$type"'],
      [{ accept: "text/markdown" }, "# Verify"],
      [{ "sec-fetch-dest": "document", accept: "text/html" }, "<!doctype html>"],
    ]) {
      const res = await get("/verify", { headers: hdr });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain(marker);
    }
  });
  it("interfaces.testSuite is NOT declared (stays undeclared until digest-pinned — batch-2 watch list)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.interfaces.testSuite).toBeUndefined();
  });
});
