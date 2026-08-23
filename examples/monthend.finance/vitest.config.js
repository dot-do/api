/**
 * vitest.config.js — scope the row's gate to THIS property.
 *
 * Without a local config, vitest climbs to the workspace root's
 * vitest.config.ts (include: tests/**\/*.test.ts) and the property's
 * test/ directory is silently skipped — a gate that runs zero tests is
 * no gate. This pins discovery to the property's own test files.
 */
export default {
  test: {
    include: ["test/**/*.test.js"],
  },
};
