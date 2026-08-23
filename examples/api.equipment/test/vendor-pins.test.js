/**
 * vendor-pins.test.js — the drift gate, self-contained: the vendored
 * axp/*.js bytes must hash to exactly what PINS.json records, and the pin
 * must be the ratified apis-ax-axp@2.6.0 at the ratified digest —
 * "never hand-rolled" made mechanical. VENDORED.json additionally records
 * the axp.org.ai commit the tree was cut from (batch watch list: vendored
 * from COMMITTED HEAD via git show, hash recorded).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("../axp/", import.meta.url);
const pins = JSON.parse(readFileSync(new URL("PINS.json", dir), "utf8"));
const vendored = JSON.parse(readFileSync(new URL("VENDORED.json", dir), "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

describe("vendored axp-faces", () => {
  it("is pinned to the ratified spec", () => {
    expect(pins.pinnedSpec).toBe("apis-ax-axp@2.6.0");
    expect(pins.pinnedSpecDigest).toBe("a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d");
    const specBytes = readFileSync(new URL("../spec/apis-ax-standard.spec.json", import.meta.url));
    expect(sha256(specBytes)).toBe(pins.pinnedSpecDigest);
  });

  it("carries the ratified generator extension pin (axp-ext-rates-g2@0.2.0 — the four ruled members native, survey floor, no bridges)", () => {
    expect(pins.extensions["axp-ext-rates-g2"]).toEqual({
      version: "0.2.0",
      digest: "903e414d4f1440ddf9028b66d6987a2a3263ec1e84902b9ef4f8cb715a12ccc5",
    });
  });

  it("records the axp.org.ai commit it was vendored from (git show, committed head)", () => {
    expect(vendored.vendoredFrom.branch).toBe("draft/axp-extension-rates-g2");
    expect(vendored.vendoredFrom.commit).toBe("523c9ef217d54feefb0b20734a6d2996a6965b79");
  });

  it("is byte-identical with the pinned generator sources (no hand edits)", () => {
    for (const [label, digest] of Object.entries(pins.files)) {
      const file = label.replace(/^src\//, "");
      expect(sha256(readFileSync(new URL(file, dir))), label).toBe(digest);
    }
  });
});
