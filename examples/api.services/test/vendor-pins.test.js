/**
 * vendor-pins.test.js — the drift gate, self-contained: the vendored
 * src/axp/*.js bytes must hash to exactly what PINS.json records, and the
 * pin must be the ratified apis-ax-axp@2.6.0 at the ratified digest —
 * "never hand-rolled" made mechanical.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("../src/axp/", import.meta.url);
const pins = JSON.parse(readFileSync(new URL("PINS.json", dir), "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

describe("vendored axp-faces", () => {
  it("is pinned to the ratified spec", () => {
    expect(pins.pinnedSpec).toBe("apis-ax-axp@2.6.0");
    expect(pins.pinnedSpecDigest).toBe("a9a1197c439d708b4db54f606f07c9a2d019c7f2989fbcd9b599de2fcc028e0d");
    const specBytes = readFileSync(new URL("../spec/apis-ax-standard.spec.json", import.meta.url));
    expect(sha256(specBytes)).toBe(pins.pinnedSpecDigest);
  });

  it("is byte-identical with the pinned generator sources (no hand edits)", () => {
    for (const [label, digest] of Object.entries(pins.files)) {
      const file = label.replace(/^src\//, "");
      expect(sha256(readFileSync(new URL(file, dir))), label).toBe(digest);
    }
  });
});
