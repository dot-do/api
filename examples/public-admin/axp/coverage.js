/**
 * coverage.js — the AXP capability-coverage seam (Appendix A.8.7, pinned as
 * `check-capability-coverage` since apis-ax-axp@2.5.0, declaration-armed on
 * `interfaces.testSuite`).
 *
 * Where a card declares a published test suite, every capability the card
 * declares MUST be covered by at least one PASSING test of that suite's run.
 * The generator's half of that gate is the DOMAIN: because every face is
 * emitted from the one site manifest, the set of capability identifiers a
 * site's suite must cover is derivable from the same manifest — so a suite
 * author enumerates it here instead of hand-listing it, and a hand-list that
 * drifts from the card is impossible by construction.
 *
 * The generator does NOT author the suite, the coverage map, or the tests —
 * exactly as it never authors the suite document itself (manifest.js): a
 * generated test would be AXP asserting workflows it cannot know. What it
 * gives the author is the domain (`coverageDomain`), the tag spelling
 * (`coverageTag`), and the same pure audit the verifier's judgment is built
 * on (`auditCoverage`), so a site's own vitest run can go red on an
 * uncovered declared capability BEFORE the hosted verifier does.
 *
 * Identifier grammar (A.8.7.1/A.8.7.2, normative):
 *   openapi:<operationId>          a contract operation with an operationId
 *   openapi:<METHOD> <path>        one without (uppercase method, one space,
 *                                  the path template exactly as printed)
 *   mcp:<toolName>                 each declared MCP tool
 *   interfaces.<name>              interfaces.mcp with no tools array, and
 *                                  every other optional declared interface
 *                                  (testSuite itself excluded — the suite is
 *                                  the instrument of proof)
 */

import { buildOpenapi } from "./openapi.js";

/** A bracketed token is a coverage TAG iff it matches this grammar (A.8.7.2). */
export const COVERAGE_TAG_RE = /\[((?:openapi|mcp):[^\[\]]+|interfaces\.[A-Za-z][A-Za-z0-9]*)\]/g;

const HTTP_METHODS = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);

/** The canonical identifier of one OpenAPI operation (A.8.7.1 rule 1). */
export function operationId(method, path, op) {
  return op && typeof op.operationId === "string" && op.operationId
    ? `openapi:${op.operationId}`
    : `openapi:${method.toUpperCase()} ${path}`;
}

/**
 * The A.8.7.1 coverage domain of a site manifest: every capability its card
 * and contract declare, as a frozen, sorted array of canonical identifiers.
 * Derived from the SAME manifest the faces are generated from, so the domain
 * cannot drift from the card.
 */
export function coverageDomain(manifest) {
  const ids = new Set();

  // 1. Contract operations — every operation the emitted contract declares.
  //    interfaces.http entries resolve to these (rule 2) and the faces the
  //    standard itself verifies (/.well-known/agents.json, /openapi.json,
  //    /llms.txt) are exempt, so rule 2 adds no identifiers of its own here:
  //    the generator's card only ever addresses contract operations + faces.
  const api = buildOpenapi(manifest);
  for (const [path, item] of Object.entries(api.paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      ids.add(operationId(method, path, op));
    }
  }

  // 2. interfaces.mcp — per declared tool, or the single interface identifier.
  if (manifest.mcp !== undefined) {
    const tools = Array.isArray(manifest.mcp.tools) ? manifest.mcp.tools : null;
    if (tools && tools.length > 0) {
      for (const t of tools) ids.add(`mcp:${typeof t === "string" ? t : t.name}`);
    } else {
      ids.add("interfaces.mcp");
    }
  }

  // 3. Every other optional declared interface, testSuite itself excluded.
  if (manifest.digitalLink !== undefined) ids.add("interfaces.digitalLink");

  return Object.freeze([...ids].sort());
}

/** The implicit-mapping spelling of one identifier: a square-bracket tag. */
export function coverageTag(id) {
  return `[${id}]`;
}

/** Every A.8.7.2 tag carried in one row id / full folded test name. */
export function tagsIn(name) {
  const out = [];
  for (const m of String(name).matchAll(COVERAGE_TAG_RE)) out.push(m[1]);
  return out;
}

/**
 * The A.8.7 judgment as a pure function — the same rules the verifier's
 * `capability-coverage` check enforces, so a site can run them locally.
 *
 *   domain    string[] — the A.8.7.1 identifiers (see coverageDomain)
 *   coverage  optional explicit map: { [identifier]: [testReference, ...] } —
 *             the suite document's `coverage` root member or the pinned
 *             module's `coverage` export
 *   results   the folded result set of ONE run: [{ name, passed }] where
 *             `name` is a declarative row id or the full folded test name
 *
 * Returns a list of problems; empty means every declared capability is
 * covered by at least one passing row/test and no coverage claim is
 * defective. Each rule below is a MUST of A.8.7.2 and fails closed.
 */
export function auditCoverage({ domain, coverage, results }) {
  const problems = [];
  const ids = new Set(domain);
  const byName = new Map();
  for (const r of results) byName.set(String(r.name), r.passed === true);

  /** identifier -> at least one PASSING bound row/test seen. */
  const covered = new Set();

  // ── the explicit map (A.8.7.2) ────────────────────────────────────────────
  if (coverage !== undefined) {
    if (coverage === null || typeof coverage !== "object" || Array.isArray(coverage)) {
      problems.push("coverage must be a JSON object mapping capability identifiers to non-empty arrays of test references (A.8.7.2)");
    } else {
      for (const [key, refs] of Object.entries(coverage)) {
        if (!ids.has(key)) {
          problems.push(`coverage key "${key}" names no declared capability — coverage of undeclared surface is a claim about surface that does not exist (presence-when-true, A.8.7.2)`);
          continue;
        }
        if (!Array.isArray(refs) || refs.length === 0 || refs.some((r) => typeof r !== "string")) {
          problems.push(`coverage["${key}"] must be a non-empty array of test-reference strings (A.8.7.2)`);
          continue;
        }
        for (const ref of refs) {
          if (!byName.has(ref)) {
            problems.push(`coverage["${key}"] references "${ref}", which names no row and no registered test of this run (A.8.7.2)`);
          } else if (byName.get(ref)) {
            covered.add(key);
          }
        }
      }
    }
  }

  // ── the implicit tags (A.8.7.2) ───────────────────────────────────────────
  for (const r of results) {
    for (const tag of tagsIn(r.name)) {
      if (!ids.has(tag)) {
        problems.push(`"${r.name}" carries coverage tag [${tag}], which names no declared capability (presence-when-true, A.8.7.2)`);
      } else if (r.passed === true) {
        covered.add(tag);
      }
    }
  }

  // ── the gate itself: every declared capability has a PASSING test ─────────
  for (const id of domain) {
    if (!covered.has(id)) {
      problems.push(`declared capability "${id}" is not covered by any passing row or test — declared-but-untested is inadmissible (A.8.7)`);
    }
  }

  return problems;
}
