/**
 * surface.test.js — the scriptable §9.1 self-verify boxes beyond the pinned
 * conformance gate: fixture law on the seed, both plies from one definition,
 * the rate card's rates[] discipline, the B2A ladder in the 402 OFFER body,
 * the mounted MCP door, the /verify export, the G2 face, and no ghost
 * surfaces (everything the card declares answers).
 */
import { describe, expect, it } from "vitest";
import worker from "../worker.js";
import { buildManifest, ORIGIN } from "../manifest.js";
import { apiProduct, OPERATIONS } from "../apiproduct.js";
import { projection } from "../projection.js";
import { wells, operators, violations, disclosures, jibStatements } from "../seed.js";

const manifest = buildManifest();
const get = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), {}, undefined);
const json = async (path, init) => {
  const res = await get(path, init);
  return { res, body: await res.json() };
};

describe("§5.2 sandbox seed — fixture law, mechanically checked", () => {
  const all = [...wells, ...operators, ...violations, ...disclosures, ...jibStatements];
  it("every seed record is labeled example data", () => {
    for (const rec of all) expect(rec.example).toBe(true);
  });
  it("every named/titled/memo field carries the [demo] prefix", () => {
    for (const rec of all) {
      for (const field of ["name", "title", "memo", "mineName"]) {
        if (rec[field] !== undefined) expect(rec[field].startsWith("[demo]"), `${rec.id}.${field}`).toBe(true);
      }
    }
  });
  it("every well API number uses the synthetic 00 state prefix (never a real state code)", () => {
    for (const w of wells) expect(w.apiNumber).toMatch(/^00-\d{3}-\d{5}$/);
    for (const d of disclosures) expect(d.apiNumber).toMatch(/^00-\d{3}-\d{5}$/);
  });
  it("regulatory classification codes are omitted, never fabricated", () => {
    // no 30 CFR cites on violations, no CAS numbers on disclosures
    for (const v of violations) {
      expect(v.standardCite).toBeUndefined();
      expect(JSON.stringify(v)).not.toMatch(/30 CFR \d/);
    }
    for (const d of disclosures) {
      expect(d.ingredients).toBeUndefined();
      expect(JSON.stringify(d)).not.toMatch(/\b\d{2,7}-\d{2}-\d\b/); // CAS pattern
    }
  });
  it("JIB share arithmetic is internally consistent (netDue = round(gross × share, 2))", () => {
    for (const j of jibStatements) {
      expect(Math.round(j.grossBilled * j.workingInterestShare * 100) / 100).toBeCloseTo(j.netDue, 2);
    }
  });
  it("the seed exercises every declared collection with realistic depth", () => {
    // a producing demo well has a disclosure and JIB statements; the demo
    // quarry has violations across severities; a disputed JIB exists
    expect(disclosures.some((d) => d.wellId === "well-demo-001")).toBe(true);
    expect(jibStatements.some((j) => j.wellId === "well-demo-001")).toBe(true);
    expect(new Set(violations.map((v) => v.severity)).size).toBeGreaterThan(1);
    expect(jibStatements.some((j) => j.status === "disputed")).toBe(true);
    expect(new Set(wells.map((w) => w.status)).size).toBeGreaterThan(1);
  });
});

describe("G3 instance + G4 placeholder (§1, §2, GAP per §0)", () => {
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
  it("GAP row: no brand, no positioning claim, motion declared, shapes from the B2A ladder only", () => {
    expect(projection.brand).toBeNull();
    expect(projection.positioning).toBeNull();
    expect(projection.motion).toBe("B2A");
    const b2aShapes = ["anon-sandbox", "earned-credits", "human-claimed", "paid"];
    for (const o of projection.offer) expect(b2aShapes).toContain(o.shape);
    // B2A never gates on OAuth or credit cards
    for (const o of projection.offer) expect(`${o.gate}`).not.toMatch(/oauth|credit card/i);
  });
  it("the counterpart-brand gap is RECORDED (§5.1 — row ICP names non-technical principals, no human-vocabulary name held)", () => {
    expect(projection.counterpartBrand.gap).toBe(true);
    expect(projection.counterpartBrand.note.length).toBeGreaterThan(0);
  });
  it("experiment registration is complete (§6.2)", () => {
    const e = projection.experiment;
    expect(e.pattern).toBeTruthy();
    expect(e.motion).toBe(projection.motion);
    expect(e.shapes.length).toBeGreaterThan(0);
    expect(e.startDate).toBeTruthy();
    expect(e.hypothesis).toBeTruthy();
  });
});

describe("rate card (§9.1) — rates[] native at the ruled placement (axp-ext-rates-g2 §2)", () => {
  it("rates[] rides the GENERATED Pricing Document top-level (manifest input pricing.rates — no site-side bridge)", async () => {
    const { body: pricing } = await json("/pricing.json");
    expect(pricing.rates).toEqual([...manifest.pricing.rates]);
    expect(pricing.rates.map((r) => r.operation)).toContain("listWells");
  });
  it("every rate row has freeQuota or zero price, and rates[].operation ⊆ operationIds", async () => {
    const { body: pricing } = await json("/pricing.json");
    expect(pricing.model).toBe("metered");
    expect(pricing.hardCeiling).toBeGreaterThan(0);
    expect(pricing.binding).toBe(false);
    expect(typeof pricing.statement).toBe("string");
    const { body: openapi } = await json("/openapi.json");
    const opIds = [];
    for (const p of Object.values(openapi.paths)) for (const op of Object.values(p)) if (op.operationId) opIds.push(op.operationId);
    expect(pricing.rates.length).toBeGreaterThan(0);
    for (const r of pricing.rates) {
      expect(opIds).toContain(r.operation);
      expect(r.freeQuota !== undefined || r.price === 0).toBe(true);
    }
  });
  it("the canonical operationId spans the five surfaces: collection route = MCP tool = rate key (axp-ext-rates-g2 §1)", async () => {
    const { body: openapi } = await json("/openapi.json");
    const collectionOp = Object.values(openapi.paths[manifest.collection.path]).find((op) => op.operationId)?.operationId;
    expect(collectionOp).toBe("listWells");
    expect(manifest.mcp.tools).toContain("listWells");
    for (const r of manifest.pricing.rates) expect(/^[a-z][A-Za-z0-9]*$/.test(r.operation)).toBe(true);
  });
  it("collections carry real verbs, never listCollection", async () => {
    const { body: openapi } = await json("/openapi.json");
    for (const p of Object.values(openapi.paths)) for (const op of Object.values(p)) if (op.operationId) expect(op.operationId).not.toBe("listCollection");
  });
  it("the 402 OFFER body advertises the whole B2A ladder (pay / work / claim)", async () => {
    const { res, body } = await json(manifest.pricing.offerPath);
    expect(res.status).toBe(402);
    expect(body.type).toBe("OFFER");
    const modes = body.alternatives.map((a) => a.mode).sort();
    expect(modes).toEqual(["claim", "pay", "work"]);
  });
});

describe("both plies from one substrate (§3) — same collections, same envelopes", () => {
  it("data face: every declared GET collection answers a typed envelope", async () => {
    for (const path of ["/wells", "/operators", "/violations", "/disclosures", "/jib-statements"]) {
      const { res, body } = await json(path);
      expect(res.status).toBe(200);
      expect(body.type).toBe("OK");
    }
  });
  it("headless face: the production-accounting door writes to the SAME collection, labeled mechanically, arithmetic computed server-side", async () => {
    const { res, body } = await json("/jib-statements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wellId: "well-demo-002", partnerId: "op-demo-002", period: "2026-08", memo: "August opex", grossBilled: 12000, workingInterestShare: 0.25 }),
    });
    expect(res.status).toBe(201);
    expect(body.type).toBe("OK");
    const rec = body.jibStatements[0];
    expect(rec.example).toBe(true);
    expect(rec.memo.startsWith("[demo]")).toBe(true);
    expect(rec.netDue).toBe(3000);
    // and it reads back through the data face — one substrate, two plies
    const { body: read } = await json(`/jib-statements/${rec.id}`);
    expect(read.type).toBe("OK");
    expect(read.jibStatements[0].id).toBe(rec.id);
    // ...including through the list collection itself
    const { body: coll } = await json("/jib-statements");
    expect(coll.type).toBe("OK");
    expect(coll.jibStatements.map((j) => j.id)).toContain(rec.id);
  });
  it("the door refuses dishonest arithmetic inputs (share out of range) with a typed BLOCKED", async () => {
    const { res, body } = await json("/jib-statements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wellId: "well-demo-002", partnerId: "op-demo-002", grossBilled: 12000, workingInterestShare: 1.5 }),
    });
    expect(res.status).toBe(403);
    expect(body.type).toBe("BLOCKED");
  });
  it("a miss is a truthful EMPTY, never a fake success", async () => {
    const { res, body } = await json("/wells/well-none");
    expect(res.status).toBe(200);
    expect(body.type).toBe("EMPTY");
  });
});

describe("MCP door (§4.4) — mounted, authless at the anon-sandbox rung, same Nouns/verbs as HTTP", () => {
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
    const { body } = await rpc("tools/call", { name: "listWells", arguments: { status: "producing" } });
    const envelope = JSON.parse(body.result.content[0].text);
    expect(envelope.type).toBe("OK");
    const { body: http } = await json("/wells?status=producing");
    expect(envelope.wells.map((w) => w.id)).toEqual(http.wells.map((w) => w.id));
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
  it("the card carries links.verify and the top-level g2 object at the ruled placements (axp-ext-rates-g2 §3/§4)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.links.verify).toBe(`${ORIGIN}/verify`);
    expect(card.links.icp).toBe(`${ORIGIN}/icp.json`); // links.icp stays legal beside g2
    expect(card.g2).toBeTruthy();
    expect(card.g2.motion).toBe("B2A");
    expect(card.g2.icp).toEqual({ ...projection.icp });
    expect(card.g2.personas.length).toBeGreaterThan(0);
  });
  it("the /verify export answers on all three faces", async () => {
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
  it("interfaces.testSuite is NOT declared (no pinned suite document is published yet)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.interfaces.testSuite).toBeUndefined();
  });
});
