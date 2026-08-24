/**
 * property.test.js — the §9.1 checklist rows that are this property's own
 * behavior (the pinned AXP gate lives in conformance.test.js). Every test
 * here is a public-contract check: it exercises only doors the card and
 * openapi declare.
 */
import { describe, expect, it, vi } from "vitest";
import worker from "../worker.mjs";
import { manifest } from "../manifest.mjs";
import { substrate } from "../substrate.mjs";
import { projection } from "../projection.mjs";
import * as seed from "../seed.mjs";
import { tools } from "../mcp.mjs";

const ORIGIN = "https://api.equipment";
const call = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), {}, {});
const json = async (path, init) => {
  const res = await call(path, init);
  return { res, body: await res.json() };
};

describe("G3 substrate (substrate.mjs)", () => {
  it("every Noun has schema + binding + verbs; System coordinates declared", () => {
    for (const n of substrate.nouns) {
      expect(n.schema).toMatch(/^https:\/\//);
      expect(["ingested", "generated", "native", "federated"]).toContain(n.binding);
      expect(n.verbs.length).toBeGreaterThan(0);
    }
    expect(substrate.systems.length).toBeGreaterThan(0);
    for (const s of substrate.systems) expect(s.coordinates.length).toBeGreaterThan(0);
  });

  it("operations use canonical camelCase verbs; the branching collection carries a REAL verb (batch watch list)", () => {
    for (const op of substrate.operations) expect(op.operation).toMatch(/^[a-z][A-Za-z0-9]*$/);
    expect(manifest.collection.operationId).toBe("listAssets");
  });
});

describe("anon sandbox — the universal floor", () => {
  it("keyless GET on every Noun collection answers 200 OK with labeled substance", async () => {
    for (const path of ["/assets", "/work-orders", "/models"]) {
      const { res, body } = await json(path);
      expect(res.status, path).toBe(200);
      expect(body.type, path).toBe("OK");
      for (const rec of body.results) expect(rec.example, `${path} record ${rec.id}`).toBe(true);
    }
  });

  it("branches truthfully: knownEmpty ×2, knownForbidden ×2 on /assets", async () => {
    for (const q of ["class=none", "status=none"]) {
      const { res, body } = await json(`/assets?${q}`);
      expect(res.status).toBe(200);
      expect(body.type).toBe("EMPTY");
    }
    for (const scope of ["admin", "internal"]) {
      const { res, body } = await json(`/assets?scope=${scope}`);
      expect(res.status).toBe(403);
      expect(body.type).toBe("BLOCKED");
    }
  });

  it("seed corpus passes fixture law: labeled, synthetic names, GS1 demo prefix 952 with VALID check digits, no EIN-shaped identifiers, no secrets", () => {
    const all = [...seed.assets, ...seed.workOrders, ...seed.models, ...seed.passports];
    expect(seed.assets.length).toBeGreaterThan(0);
    expect(seed.workOrders.length).toBeGreaterThan(0);
    expect(seed.models.length).toBeGreaterThan(0);
    expect(seed.passports.length).toBeGreaterThan(0);
    for (const rec of all) expect(rec.example, rec.id).toBe(true);
    const text = JSON.stringify(all);
    expect(text).toMatch(/synthetic/);
    expect(text).not.toMatch(/\b\d{2}-\d{7}\b/); // no EIN-shaped identifiers
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN/); // secret scan
    // every GTIN: 952 demo prefix + valid check digit (recomputed)
    for (const m of seed.models) {
      expect(m.gtin).toMatch(/^952\d{10}$/);
      expect(m.gtin).toBe(seed.gtin13(m.gtin.slice(3, 12)));
    }
    // seed statuses cover the lifecycle the filters serve
    expect(new Set(seed.assets.map((a) => a.status))).toEqual(new Set(["operational", "needs-maintenance", "retired"]));
    expect(new Set(seed.workOrders.map((w) => w.status))).toEqual(new Set(["open", "in-progress", "completed"]));
  });

  it("seed exercises every operation: reads have substance; writes and verbs answer on the same collections", async () => {
    // reads
    for (const [path, expectType] of [
      ["/assets/ast-demo-001", "OK"],
      ["/assets/ast-demo-005/passport", "OK"],
      ["/work-orders/wo-demo-001", "OK"],
      ["/models/mdl-lift-e25", "OK"],
    ]) {
      const { body } = await json(path);
      expect(body.type, path).toBe(expectType);
    }
    // registerAsset (headless EAM/CMMS write) mints an anon workspace with disclosed retention (#17 rung 0)
    const reg = await json("/assets", {
      method: "POST",
      body: JSON.stringify({ name: "sandbox test asset", modelId: "mdl-hvac-rtu-40", class: "hvac", site: "Building A (synthetic)" }),
      headers: { "content-type": "application/json" },
    });
    expect(reg.res.status).toBe(201);
    expect(reg.body.workspace).toMatch(/^ws-/);
    expect(reg.body.retention).toMatch(/ephemeral/);
    expect(reg.body.results[0].sandbox).toBe(true);
    // the write landed on the SAME collection the data face serves (one substrate)
    const list = await json(`/assets?workspace=${reg.body.workspace}`);
    // workspace is not a declared filter on /assets — verify via direct get instead
    const got = await json(`/assets/${reg.body.results[0].id}`);
    expect(got.body.type).toBe("OK");
    expect(list.res.status).toBe(200); // unknown params are ignored by the branching collection, honestly
    // openWorkOrder + completeWorkOrder (system-of-record verbs)
    const open = await json("/work-orders", {
      method: "POST",
      body: JSON.stringify({ assetId: "ast-demo-002", summary: "sandbox test work order", task: "diagnose mechanical fault" }),
      headers: { "content-type": "application/json" },
    });
    expect(open.res.status).toBe(201);
    const woId = open.body.results[0].id;
    const done = await json(`/work-orders/${woId}/complete`, { method: "POST" });
    expect(done.res.status).toBe(200);
    expect(done.body.results[0].status).toBe("completed");
    // the completion landed on the SAME record the data face serves
    const reread = await json(`/work-orders/${woId}`);
    expect(reread.body.results[0].status).toBe("completed");
  });
});

describe("rate card (/pricing + native top-level rates[] — axp-ext-rates-g2@0.2.0 §2, survey floor)", () => {
  it("declares model, hard ceiling, and an unbound-price statement (stubs, never fake billing)", async () => {
    const { body } = await json("/pricing");
    expect(body.model).toBe("metered");
    expect(body.hardCeiling).toBeGreaterThan(0);
    expect(body.binding).toBe(false);
    expect(body.statement).toMatch(/settlement is not activated/);
    expect(Array.isArray(body.rates)).toBe(true);
    // the SERVED rates are the manifest's own rows — generated, never patched
    expect(body.rates).toEqual(JSON.parse(JSON.stringify(manifest.pricing.rates)));
  });

  it("every served rate row: operation ⊆ OpenAPI operationIds; ratified row shape; free path named (zero price, allowance, or note)", async () => {
    const { body: openapi } = await json("/openapi.json");
    const ids = new Set();
    for (const methods of Object.values(openapi.paths)) {
      for (const op of Object.values(methods)) if (op.operationId) ids.add(op.operationId);
    }
    const { body: pricing } = await json("/pricing");
    for (const r of pricing.rates) {
      expect(ids.has(r.operation), `rates[] prices ${r.operation} which openapi does not declare`).toBe(true);
      expect(typeof r.price === "number" && r.price >= 0, r.operation).toBe(true);
      if (r.freeQuota !== undefined) expect(r.freeQuota, r.operation).toBeGreaterThan(0);
      // §5.1 law: zero price, positive allowance, or (the outcome door) a note naming the free path
      const freePath =
        r.price === 0 ||
        (typeof r.freeQuota === "number" && r.freeQuota > 0) ||
        r.included !== undefined ||
        (typeof r.note === "string" && /free/i.test(r.note));
      expect(freePath, `${r.operation} names no free path`).toBe(true);
    }
    // rows key uniquely on the canonical operationId
    expect(new Set(pricing.rates.map((r) => r.operation)).size).toBe(pricing.rates.length);
    // and the G3 operations register matches what is actually served
    for (const op of substrate.operations) expect(ids.has(op.operation), `substrate declares ${op.operation} but openapi does not serve it`).toBe(true);
  });
});

describe("the 402 boundary (B2A ladder in one OFFER — test-mode stubs)", () => {
  it("orderPassport answers 402 OFFER with pay / work / claim alternatives, labeled test mode, free path named", async () => {
    const { res, body } = await json("/passports/order", {
      method: "POST",
      body: JSON.stringify({ assetId: "ast-demo-005" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(402);
    expect(body.type).toBe("OFFER");
    const kinds = body.alternatives.map((a) => a.kind);
    expect(kinds).toEqual(["pay", "work", "claim"]);
    expect(JSON.stringify(body)).toMatch(/settlement (is )?not activated/i);
    expect(body.message).toMatch(/Free path/);
  });

  it("hard ceiling: over-ceiling spend → 402 OFFER; half-ceiling and zero → 200", async () => {
    const over = await json(`/assets?spend=${manifest.pricing.hardCeiling + 1}`);
    expect(over.res.status).toBe(402);
    expect(over.body.type).toBe("OFFER");
    const half = await json(`/assets?spend=${manifest.pricing.hardCeiling / 2}`);
    expect(half.res.status).toBe(200);
    const zero = await json("/assets?spend=0");
    expect(zero.res.status).toBe(200);
  });
});

describe("G4 projection + G2 coordinates", () => {
  it("projection config is complete per §2 and motion-lawful (B2A: no OAuth/CC gates); primacy collisions recorded, nothing shared claimed", () => {
    for (const k of ["substrate", "brand", "account", "icp", "personas", "motion", "offer", "pricing", "positioning", "experiment"]) {
      // railLedger accepted as read alias for "account"; remove after sweep
      if (k === "account") {
        expect(projection.account ?? projection.railLedger, k).toBeDefined();
        continue;
      }
      expect(projection[k], k).toBeDefined();
    }
    expect(projection.motion).toBe("B2A");
    const text = JSON.stringify(projection.offer);
    expect(text).not.toMatch(/oauth|credit card|cc on file/i);
    expect(projection.counterpartBrandGap.recorded).toBe(true);
    // batch watch list: platform-account address recorded in the projection config
    // railLedger accepted as read alias; remove after sweep
    expect(projection.account ?? projection.railLedger).toBe("https://apis.ax/account/faces?face=api.equipment");
    // primacy: no ruling on record → built under THIS row key, collisions recorded, no shared claims
    expect(projection.primacy.ruling).toBe("none on record");
    expect(projection.primacy.sharedClaims).toBe("none");
    expect(projection.primacy.collisions.length).toBeGreaterThan(0);
    // no agent-default claim before the §4.6 bar
    expect(projection.positioning.toLowerCase()).not.toContain("agent default");
  });

  it("the card exposes the G2 coordinates door (links.icp) and /icp serves them", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.links.icp).toBe(`${ORIGIN}/icp`);
    const { body: icp } = await json("/icp");
    expect(icp.$type).toBe("ICP");
    expect(icp.motion).toBe("B2A");
    expect(icp.icp.companyTypes.length).toBeGreaterThan(0);
  });

  it("the card carries the ruled extension members: top-level g2 (verbatim projection truth) and links.verify (axp-ext-rates-g2 §3/§4)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.g2).toEqual(JSON.parse(JSON.stringify(manifest.g2)));
    expect(card.g2.motion).toBe("B2A");
    expect(card.g2.substrate).toBe("fn-facilities-assets");
    expect(card.links.icp).toBe(`${ORIGIN}/icp`); // icpUrl stays legal beside g2
    expect(card.links.verify).toBe(`${ORIGIN}/verify`);
    expect(card.links.conformance).toBeDefined();
    const res = await call("/verify");
    expect(res.status).toBe(200);
  });
});

describe("machine face", () => {
  it("card declares the mounted MCP door; tools/list serves the same tools; a tool reads the same records as HTTP (five-surface invariant)", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.interfaces.mcp.url).toBe(`${ORIGIN}/mcp`);
    // axp-ext-rates-g2 §1: card tools are STRING names — each IS the canonical operationId
    expect(card.interfaces.mcp.tools).toEqual(tools.map((t) => t.name));
    // every MCP tool name is also priced on the rate card and served by openapi
    const { body: pricing } = await json("/pricing");
    const rated = new Set(pricing.rates.map((r) => r.operation));
    for (const t of tools) expect(rated.has(t.name), `tool ${t.name} has no rate row`).toBe(true);
    const list = await json("/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }), headers: { "content-type": "application/json" } });
    expect(list.body.result.tools.map((t) => t.name)).toEqual(tools.map((t) => t.name));
    const callRes = await json("/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "listAssets", arguments: {} } }),
      headers: { "content-type": "application/json" },
    });
    const envelope = JSON.parse(callRes.body.result.content[0].text);
    const http = await json("/assets");
    expect(envelope.results).toEqual(http.body.results); // one definition, two transports
  });

  it("llms.txt: markdown, H1, family cross-link tail; /verify export answers", async () => {
    const llms = await call("/llms.txt");
    const text = await llms.text();
    expect(text).toMatch(/^# api\.equipment/m);
    expect(text).toMatch(/apis\.ax/);
    expect(text).toMatch(/api\.qa/);
    const { body: verify } = await json("/verify");
    expect(verify.$type).toBe("VerifyExport");
    expect(verify.probes.length).toBeGreaterThan(0);
  });

  it("conneg spot-check on /pricing: bare JSON, Accept html → HTML, .md address → markdown, HEAD mirrors GET", async () => {
    const bare = await call("/pricing");
    expect(bare.headers.get("content-type")).toMatch(/application\/json/);
    const html = await call("/pricing", { headers: { accept: "text/html" } });
    expect(html.headers.get("content-type")).toMatch(/text\/html/);
    const md = await call("/pricing.md");
    expect(md.headers.get("content-type")).toMatch(/markdown/);
    expect(md.headers.get("link")).toMatch(/alternate/);
    const head = await call("/pricing", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  it("no ghost surfaces: every GET the card declares answers", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    for (const { url } of card.interfaces.http) {
      const res = await call(new URL(url).pathname);
      expect([200, 402], url).toContain(res.status); // /offer answers 402 by design
    }
  });
});

describe("seams (§7.4 — emitted, planes deferred)", () => {
  it("a metered call emits a metering event carrying the full §6.4 tag set", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await call("/work-orders");
      const events = spy.mock.calls.map(([line]) => JSON.parse(line));
      const m = events.find((e) => e.$seam === "metering");
      expect(m).toBeDefined();
      for (const k of ["substrate", "projection", "motion", "operation", "shape", "pattern"]) expect(m[k], k).toBeDefined();
      const t = events.find((e) => e.$seam === "traffic");
      expect(t.identityClass).toBeDefined();
    } finally {
      spy.mockRestore();
    }
  });

  it("the 402 boundary emits money + receipt seams (stubs — no settlement)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await call("/passports/order", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
      const events = spy.mock.calls.map(([line]) => JSON.parse(line));
      expect(events.find((e) => e.$seam === "money").settlement).toMatch(/none/);
      expect(events.find((e) => e.$seam === "receipt").status).toMatch(/seam-only/);
    } finally {
      spy.mockRestore();
    }
  });
});
