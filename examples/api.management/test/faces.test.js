/**
 * faces.test.js — the property-template §9.1 checks that are NOT already
 * discharged by the pinned conformance gate: seed labeling (fixture law),
 * both plies from one definition, the B2A ladder in the 402 OFFER body, the
 * MCP door mirroring the card, the conneg spot matrix, and the seam tags.
 */
import { describe, expect, it, vi } from "vitest";
import worker from "../worker.js";
import { manifest, seed } from "../manifest.js";
import { buildSeed, NOUNS, API_PRODUCT } from "../substrate.js";
import { PROJECTION } from "../projection.js";
import { toolDefs } from "../mcp.js";

const ORIGIN = "https://api.management";
const get = (path, headers = {}) => worker.fetch(new Request(`${ORIGIN}${path}`, { headers }));
const post = (path, body) =>
  worker.fetch(new Request(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("sandbox seed — §5.2 fixture law", () => {
  it("every seed record in every collection is labeled example: true", () => {
    const s = buildSeed();
    for (const coll of [s.processes, s.kpis, s.objectives, s.properties]) {
      expect(coll.length).toBeGreaterThan(0);
      for (const rec of coll) expect(rec.example).toBe(true);
    }
  });

  it("seed is deterministic (reseed = build step, not a manual act)", () => {
    expect(JSON.stringify(buildSeed())).toBe(JSON.stringify(buildSeed()));
  });

  it("seed exercises every list operation's collection", () => {
    const s = buildSeed();
    const byPath = { "/processes": s.processes, "/kpis": s.kpis, "/objectives": s.objectives, "/properties": s.properties };
    for (const noun of NOUNS) expect(byPath[noun.collection].length).toBeGreaterThan(0);
  });
});

describe("two plies, one definition — §3", () => {
  it("the headless door (/properties) serves the same envelope law as the data ply", async () => {
    const okRes = await get("/properties");
    expect(okRes.status).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.type).toBe("OK");
    expect(okBody.properties.every((p) => p.example === true)).toBe(true);

    const emptyRes = await get("/properties?lifecycle=none");
    expect((await emptyRes.json()).type).toBe("EMPTY");

    const blockedRes = await get("/properties?scope=tenant");
    expect(blockedRes.status).toBe(403);
    expect((await blockedRes.json()).type).toBe("BLOCKED");
  });

  it("every MCP tool resolves the same collections the HTTP routes serve", async () => {
    const listed = await post("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" });
    const tools = (await listed.json()).result.tools.map((t) => t.name);
    expect(tools).toEqual([...manifest.mcp.tools]); // card == door (string tool names, axp-ext-rates-g2 §1)

    const call = await post("/mcp", { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "listKPIs", arguments: { kind: "availability" } } });
    const envelope = JSON.parse((await call.json()).result.content[0].text);
    expect(envelope.type).toBe("OK");
    expect(envelope.kpis.every((k) => k.example === true)).toBe(true);
  });
});

describe("the B2A ladder — §5.1 / the 402 OFFER body", () => {
  it("over-ceiling spend answers 402 OFFER advertising pay / work / claim, each labeled a stub", async () => {
    const res = await get(`/processes?spend=${manifest.pricing.hardCeiling + 1}`);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.type).toBe("OFFER");
    const ids = body.alternatives.map((a) => a.id);
    expect(ids).toEqual(["pay", "work", "claim"]);
    for (const alt of body.alternatives) expect(alt.status).toBe("stub");
    expect(JSON.stringify(body)).not.toContain("checkoutUrl"); // never fake billing
  });

  it("the Pricing Document labels itself test-mode (binding: false + statement)", async () => {
    const res = await get("/pricing");
    const doc = await res.json();
    expect(doc.model).toBe("metered");
    expect(doc.binding).toBe(false);
    expect(doc.statement).toMatch(/test mode/);
  });

  it("the projection is B2A with no OAuth/CC gate anywhere in its offer array", () => {
    expect(PROJECTION.motion).toBe("B2A");
    const gates = PROJECTION.offer.map((o) => o.gate.toLowerCase()).join(" ");
    expect(gates).not.toMatch(/oauth|credit card|card on file/);
  });
});

describe("G2 coordinates on the card — stake #6 / axp-ext-rates-g2 §4", () => {
  it("the card links icp.json and the document carries ICP + personas + System coordinates", async () => {
    const card = await (await get("/.well-known/agents.json")).json();
    expect(card.links.icp).toBe(`${ORIGIN}/icp.json`);
    const icp = await (await get("/icp.json")).json();
    expect(icp.icp.companyTypes.length).toBeGreaterThan(0);
    expect(icp.personas.some((p) => p.class === "agent")).toBe(true);
    expect(icp.systems).toEqual(API_PRODUCT.systems);
    expect(icp.motion).toBe("B2A");
  });

  it("g2 rides TOP-LEVEL on the card (the ruled placement), verbatim from the projection, with links.icp legal beside it", async () => {
    const card = await (await get("/.well-known/agents.json")).json();
    expect(card.g2).toBeDefined();
    expect(card.g2.substrate).toBe("fn-business-ops");
    expect(card.g2.projection).toBe("api.management");
    expect(card.g2.motion).toBe("B2A");
    expect(card.g2.icp).toEqual(PROJECTION.icp);
    expect(card.g2.personas).toEqual(PROJECTION.personas);
    expect(card.g2.systems).toEqual(API_PRODUCT.systems);
    expect(card.links.icp).toBe(`${ORIGIN}/icp.json`); // independent and legal beside g2
  });
});

describe("axp-ext-rates-g2 — the native ruled placements (bridge retired)", () => {
  it("rates[] rides TOP-LEVEL in the Pricing Document, keyed by canonical operationId — never nested under an offer", async () => {
    const doc = await (await get("/pricing")).json();
    expect(Array.isArray(doc.rates)).toBe(true);
    expect(doc.rates.map((r) => r.operation).sort()).toEqual(
      ["getProcess", "getProperty", "listKPIs", "listObjectives", "listProperties", "listProcesses"].sort(),
    );
    for (const row of doc.rates) {
      expect(row.price).toBe(0.002);
      expect(row.unit).toBe("usd-per-call");
    }
    // the ruled placement is top-level: no offer anywhere carries a nested rate card
    const card = await (await get("/.well-known/agents.json")).json();
    for (const offer of card.monetization.offers) expect(offer.rates).toBeUndefined();
    const offerBody = await (await get(`/processes?spend=${manifest.pricing.hardCeiling + 1}`)).json();
    expect(JSON.stringify(offerBody)).not.toContain('"rates"');
  });

  it("every rate row keys on an operation the contract or the MCP door declares (§1: one identifier, five surfaces)", async () => {
    const openapi = await (await get("/openapi.json")).json();
    const contractIds = Object.values(openapi.paths).flatMap((p) =>
      Object.values(p).map((op) => op.operationId).filter((id) => id !== undefined),
    );
    const nameable = new Set([...contractIds, ...manifest.mcp.tools]);
    const doc = await (await get("/pricing")).json();
    for (const row of doc.rates) expect(nameable.has(row.operation), `rate row ${row.operation} names a ghost door`).toBe(true);
  });

  it("the contract carries the canonical camelCase operationId on every business route", async () => {
    const openapi = await (await get("/openapi.json")).json();
    expect(openapi.paths["/processes"].get.operationId).toBe("listProcesses");
    expect(openapi.paths["/kpis"].get.operationId).toBe("listKPIs");
    expect(openapi.paths["/objectives"].get.operationId).toBe("listObjectives");
    expect(openapi.paths["/properties"].get.operationId).toBe("listProperties");
    expect(openapi.paths["/icp.json"].get.operationId).toBe("getICP");
    expect(openapi.paths["/verify"].get.operationId).toBe("getVerify");
    const ids = Object.values(openapi.paths).flatMap((p) => Object.values(p).map((op) => op.operationId).filter(Boolean));
    expect(new Set(ids).size).toBe(ids.length); // one operation, one identifier
  });

  it("links.verify rides the card beside links.conformance (§3)", async () => {
    const card = await (await get("/.well-known/agents.json")).json();
    expect(card.links.verify).toBe(`${ORIGIN}/verify`);
    expect(card.links.conformance).toBeDefined();
    const res = await get("/verify"); // presence-when-true: the door answers
    expect(res.status).toBe(200);
  });
});

describe("conneg spot matrix — §8", () => {
  it("bare curl gets JSON at the home", async () => {
    const res = await get("/", { "user-agent": "curl/8.6.0" });
    expect(res.headers.get("content-type")).toContain("application/json");
  });
  it("a known agent UA gets markdown at the home", async () => {
    const res = await get("/", { "user-agent": "ClaudeBot/1.0" });
    expect(res.headers.get("content-type")).toContain("text/markdown");
  });
  it("a browser navigation gets HTML at the home", async () => {
    const res = await get("/", { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", accept: "*/*" });
    expect(res.headers.get("content-type")).toContain("text/html");
  });
  it("the extension forces the face at /verify", async () => {
    const md = await get("/verify.md", { "user-agent": "curl/8.6.0" });
    expect(md.headers.get("content-type")).toContain("text/markdown");
    const json = await get("/verify.json", { "sec-fetch-mode": "navigate" });
    expect(json.headers.get("content-type")).toContain("application/json");
  });
});

describe("seams — §7.4 / §9.1", () => {
  it("a data call emits a meter event carrying the §6.4 rollup key", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await get("/kpis");
    const events = spy.mock.calls.map(([line]) => JSON.parse(line));
    spy.mockRestore();
    const meter = events.find((e) => e.seam === "meter");
    expect(meter).toMatchObject({
      substrate: "fn-business-ops",
      projection: "api.management",
      motion: "B2A",
      operation: "listKPIs",
      shape: "anon-sandbox",
      pattern: "402-metered",
    });
    const traffic = events.find((e) => e.seam === "traffic");
    expect(traffic.identityClass).toBeDefined();
    expect(traffic).toHaveProperty("referral");
  });

  it("a 402 boundary emits a test-mode money event (offer presented, nothing settled)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await get(`/processes?spend=${manifest.pricing.hardCeiling + 1}`);
    const events = spy.mock.calls.map(([line]) => JSON.parse(line));
    spy.mockRestore();
    const money = events.find((e) => e.seam === "money");
    expect(money).toMatchObject({ kind: "offer-presented", mode: "test" });
  });
});

describe("no ghost surfaces — presence-when-true", () => {
  it("every GET route the card declares actually answers", async () => {
    const card = await (await get("/.well-known/agents.json")).json();
    for (const { url } of card.interfaces.http) {
      const res = await get(new URL(url).pathname);
      expect([200, 402].includes(res.status), `${url} answered ${res.status}`).toBe(true);
    }
  });
  it("the card declares no testSuite (none is pinned and served yet)", async () => {
    const card = await (await get("/.well-known/agents.json")).json();
    expect(card.interfaces.testSuite).toBeUndefined();
  });
});
