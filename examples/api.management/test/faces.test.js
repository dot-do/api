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
    expect(tools).toEqual(manifest.mcp.tools.map((t) => t.name)); // card == door

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

describe("G2 coordinates on the card — stake #6", () => {
  it("the card links icp.json and the document carries ICP + personas + System coordinates", async () => {
    const card = await (await get("/.well-known/agents.json")).json();
    expect(card.links.icp).toBe(`${ORIGIN}/icp.json`);
    const icp = await (await get("/icp.json")).json();
    expect(icp.icp.companyTypes.length).toBeGreaterThan(0);
    expect(icp.personas.some((p) => p.class === "agent")).toBe(true);
    expect(icp.systems).toEqual(API_PRODUCT.systems);
    expect(icp.motion).toBe("B2A");
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
