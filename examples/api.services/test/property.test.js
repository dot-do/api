/**
 * property.test.js — the §9.1 checklist rows that are this property's own
 * behavior (the pinned AXP gate lives in conformance.test.js). Every test
 * here is a public-contract check: it exercises only doors the card and
 * openapi declare.
 */
import { describe, expect, it, vi } from "vitest";
import worker from "../src/worker.js";
import { manifest } from "../src/manifest.js";
import { product, operations, nouns } from "../src/product.js";
import { projection } from "../src/projection.js";
import * as seed from "../src/seed.js";
import { tools } from "../src/mcp.js";

const ORIGIN = "https://api.services";
const call = (path, init) => worker.fetch(new Request(`${ORIGIN}${path}`, init), {}, {});
const json = async (path, init) => {
  const res = await call(path, init);
  return { res, body: await res.json() };
};

describe("G3 substrate (product.js)", () => {
  it("every Noun has schema + binding + verbs; System coordinates declared", () => {
    for (const n of nouns) {
      expect(n.schema.$type).toBeTruthy();
      expect(["ingested", "generated", "native", "federated"]).toContain(n.binding);
      expect(n.verbs.length).toBeGreaterThan(0);
    }
    expect(product.systems.length).toBeGreaterThan(0);
    for (const s of product.systems) expect(s.coordinates).toContain("fn-service-delivery");
  });
});

describe("anon sandbox — the universal floor", () => {
  it("keyless GET on every Noun collection answers 200 OK with labeled substance", async () => {
    for (const path of ["/services", "/engagements", "/work-orders", "/outcomes"]) {
      const { res, body } = await json(path);
      expect(res.status, path).toBe(200);
      expect(body.type, path).toBe("OK");
      for (const rec of body.results) expect(rec.example, `${path} record ${rec.id}`).toBe(true);
    }
  });

  it("branches truthfully: knownEmpty ×2, knownForbidden ×2 on /services", async () => {
    for (const q of ["category=none", "tag=none"]) {
      const { res, body } = await json(`/services?${q}`);
      expect(res.status).toBe(200);
      expect(body.type).toBe("EMPTY");
    }
    for (const scope of ["admin", "internal"]) {
      const { res, body } = await json(`/services?scope=${scope}`);
      expect(res.status).toBe(403);
      expect(body.type).toBe("BLOCKED");
    }
  });

  it("seed corpus gives every read operation substance and passes fixture law (labeled, no real names)", () => {
    const all = [...seed.services, ...seed.engagements, ...seed.workOrders, ...seed.outcomes];
    expect(seed.services.length).toBeGreaterThan(0);
    expect(seed.engagements.length).toBeGreaterThan(0);
    expect(seed.workOrders.length).toBeGreaterThan(0);
    expect(seed.outcomes.length).toBeGreaterThan(0);
    for (const rec of all) {
      expect(rec.example, rec.id).toBe(true);
      expect(rec.title, rec.id).toMatch(/\[demo\]/);
    }
    const text = JSON.stringify(all);
    expect(text).toMatch(/synthetic/); // provider/client names declare themselves synthetic
    expect(text).not.toMatch(/\b\d{2}-\d{7}\b/); // no EIN-shaped identifiers
  });

  it("system-of-record write mints an anon workspace with disclosed retention (#17 rung 0)", async () => {
    const { res, body } = await json("/engagements", {
      method: "POST",
      body: JSON.stringify({ title: "sandbox test engagement", serviceId: "svc-demo-close-books" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(201);
    expect(body.type).toBe("OK");
    expect(body.workspace).toMatch(/^ws-/);
    expect(body.retention).toMatch(/ephemeral/);
    const created = body.results[0];
    expect(created.sandbox).toBe(true);
    // the write landed on the SAME collection the data face serves (one substrate)
    const list = await json(`/engagements?workspace=${body.workspace}`);
    expect(list.body.type).toBe("OK");
    expect(list.body.results[0].id).toBe(created.id);
  });
});

describe("rate card (/pricing + native top-level rates[] — axp-ext-rates-g2@0.2.0 §2)", () => {
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

  it("every served rate row: operation ⊆ OpenAPI operationIds; ratified row shape (price >= 0; allowance via included or freeQuota > 0)", async () => {
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
      if (r.included !== undefined && typeof r.included === "number") expect(r.included, r.operation).toBeGreaterThan(0);
    }
    // rows key uniquely on the canonical operationId
    expect(new Set(pricing.rates.map((r) => r.operation)).size).toBe(pricing.rates.length);
    // and the G3 operations register matches what is actually served
    for (const op of operations) expect(ids.has(op), `product.operations declares ${op} but openapi does not serve it`).toBe(true);
  });
});

describe("the 402 boundary (B2A ladder in one OFFER — test-mode stubs)", () => {
  it("orderOutcome answers 402 OFFER with pay / work / claim alternatives, labeled test mode", async () => {
    const { res, body } = await json("/outcomes/order", {
      method: "POST",
      body: JSON.stringify({ serviceId: "svc-demo-close-books" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(402);
    expect(body.type).toBe("OFFER");
    const kinds = body.alternatives.map((a) => a.kind);
    expect(kinds).toEqual(["pay", "work", "claim"]);
    expect(JSON.stringify(body)).toMatch(/settlement (is )?not activated/i);
  });

  it("hard ceiling: over-ceiling spend → 402 OFFER; half-ceiling and zero → 200", async () => {
    const over = await json(`/services?spend=${manifest.pricing.hardCeiling + 1}`);
    expect(over.res.status).toBe(402);
    expect(over.body.type).toBe("OFFER");
    const half = await json(`/services?spend=${manifest.pricing.hardCeiling / 2}`);
    expect(half.res.status).toBe(200);
    const zero = await json("/services?spend=0");
    expect(zero.res.status).toBe(200);
  });
});

describe("G4 projection + G2 coordinates", () => {
  it("projection config is complete per §2 and motion-lawful (B2A: no OAuth/CC gates)", () => {
    for (const k of ["substrate", "brand", "icp", "personas", "motion", "offer", "pricing", "positioning", "experiment"]) {
      expect(projection[k], k).toBeDefined();
    }
    expect(projection.motion).toBe("B2A");
    const text = JSON.stringify(projection.offer);
    expect(text).not.toMatch(/oauth|credit card|cc on file/i);
    expect(projection.counterpartBrandGap.recorded).toBe(true);
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
    // §4 — g2 TOP-LEVEL on the card, verbatim from the manifest, beside links.icp
    expect(card.g2).toEqual(JSON.parse(JSON.stringify(manifest.g2)));
    expect(card.g2.motion).toBe("B2A");
    expect(card.g2.substrate).toBe("fn-service-delivery");
    expect(card.links.icp).toBe(`${ORIGIN}/icp`); // icpUrl stays legal beside g2
    // §3 — links.verify beside links.conformance, and the door answers
    expect(card.links.verify).toBe(`${ORIGIN}/verify`);
    expect(card.links.conformance).toBeDefined();
    const res = await call("/verify");
    expect(res.status).toBe(200);
  });
});

describe("machine face", () => {
  it("card declares the mounted MCP door; tools/list serves the same tools; a tool reads the same records as HTTP", async () => {
    const { body: card } = await json("/.well-known/agents.json");
    expect(card.interfaces.mcp.url).toBe(`${ORIGIN}/mcp`);
    // axp-ext-rates-g2 §1: card tools are STRING names — each IS the
    // canonical operationId; descriptions/schemas served live by tools/list
    expect(card.interfaces.mcp.tools).toEqual(tools.map((t) => t.name));
    const list = await json("/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }), headers: { "content-type": "application/json" } });
    expect(list.body.result.tools.map((t) => t.name)).toEqual(tools.map((t) => t.name));
    const callRes = await json("/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "listServices", arguments: {} } }),
      headers: { "content-type": "application/json" },
    });
    const envelope = JSON.parse(callRes.body.result.content[0].text);
    const http = await json("/services");
    expect(envelope.results).toEqual(http.body.results); // one definition, two transports
  });

  it("llms.txt: markdown, H1, family cross-link tail; /verify export answers", async () => {
    const llms = await call("/llms.txt");
    const text = await llms.text();
    expect(text).toMatch(/^# api\.services/m);
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
      await call("/engagements");
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
      await call("/outcomes/order", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
      const events = spy.mock.calls.map(([line]) => JSON.parse(line));
      expect(events.find((e) => e.$seam === "money").settlement).toMatch(/none/);
      expect(events.find((e) => e.$seam === "receipt").status).toMatch(/seam-only/);
    } finally {
      spy.mockRestore();
    }
  });
});
