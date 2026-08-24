/**
 * dashboard-config.js — the api.management INSTANCE of the abstract
 * dashboard template (./dashboard-template.js; instance #1 is apis.dev).
 * All property-specific knowledge lives here as config; the template stays
 * generic. Rates come from the manifest's own pricing — never retyped.
 *
 * Honesty split, stated in the demo band: the console CHROME is a demo
 * shell; the inventory ledger is the estate's REAL wave-zero register
 * (branch/commit/gate cited from StartupsStudio/studio#9); the verdict
 * instruments are the four REAL attested api.qa runs; the managed-property
 * and process panels call this origin's live doors over §5.2-labeled
 * synthetic seed. Nothing real wears a demo stamp; nothing demo goes
 * unstamped.
 */

import { manifest } from "../manifest.js";
import { INVENTORY, VERDICTS, REGISTER_TOTAL, GATED_ROWS, SOURCE } from "./inventory.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const LEDGER_GRID = "minmax(150px,1.4fr) minmax(120px,1.1fr) minmax(230px,2fr) 74px 84px minmax(120px,1fr)";

const inventoryRows = INVENTORY.map((r) => ({
  face: r.gap ? `${esc(r.face)} <span class="gap-tag">GAP·placeholder</span>` : esc(r.face),
  row: r.row,
  branch: `${r.branch} @ ${r.commit}${r.repo ? ` (${r.repo})` : ""}`,
  gate: r.gate,
  state: r.state,
  verdict: r.verdict ? `<b>${esc(r.verdict.grade)}</b> · ${r.verdict.ax}/10 · attested` : "awaiting run",
}));

const rate = manifest.pricing.rates[0];

export const dashboardConfig = {
  brand: "api.management",
  pageName: "console",
  path: "/console",
  description:
    "Management console v1: the estate's API inventory ledger, attested api.qa verdict instruments, live managed-property doors, usage and billing panels.",
  demoNotice:
    "Demo-labeled shell. The inventory ledger is the estate's real wave-zero register, cited from the build log; verdicts shown only where an attested api.qa run exists. Managed-property and process panels call this origin's live doors over labeled synthetic seed. Usage and billing are demo-local until the apis.ax account lane is wired.",
  demoNoticeHtml: `Demo-labeled shell. The inventory ledger is the estate's real wave-zero register, cited from the <a href="${SOURCE}" rel="noopener">build log</a>; verdicts shown only where an attested api.qa run exists. Managed-property and process panels call this origin's live doors over labeled synthetic seed. Usage and billing are demo-local until the apis.ax account lane is wired.`,
  panels: [
    {
      id: "inventory",
      kind: "ledger",
      title: "API inventory — the estate register, dogfooded",
      wide: true,
      grid: LEDGER_GRID,
      filter: { placeholder: "filter by face, row, branch, state, grade…" },
      columns: [
        { key: "face", label: "face", class: "face", html: true },
        { key: "row", label: "register row", class: "subst" },
        { key: "branch", label: "branch @ commit", class: "branch" },
        { key: "gate", label: "gate", class: "gate" },
        { key: "state", label: "state", class: "state", stateKey: "state" },
        { key: "verdict", label: "verdict", class: "vres", html: true, right: true },
      ],
      rows: inventoryRows,
      note: `${INVENTORY.length} of ${REGISTER_TOTAL} category-register rows built and self-verified; ${GATED_ROWS.length} start gated by standing ruling (${GATED_ROWS.join(", ")}). Real branch/commit/gate data — your estate would sit in this same ledger.`,
    },
    {
      id: "verdicts",
      kind: "instruments",
      title: "Hosted verdicts — §9.2 lane, first run 2026-08-23",
      wide: true,
      items: VERDICTS.map((v) => ({
        host: v.host,
        headline: v.grade,
        value: v.ax,
        scale: 10,
        note: v.note,
        href: `https://api.qa/${v.host}`,
      })),
      note: "four properties have been through the attested lane; every other row's verdict waits on its deploy. Both failing grades are printed above their receipts.",
    },
    {
      id: "properties",
      kind: "collection",
      title: "Managed properties",
      source: { method: "GET", path: "/properties", member: "properties" },
      columns: { idKey: "id", metaKeys: ["domain", "lifecycle"] },
      note: "live from GET /properties — the headless operate door; sandbox seed, every record labeled example:true",
    },
    {
      id: "processes",
      kind: "collection",
      title: "Process spine",
      source: { method: "GET", path: "/processes", member: "processes" },
      columns: { idKey: "id", metaKeys: ["apqc", "kind", "state"] },
      note: "live from GET /processes — the APQC-typed spine; sandbox seed, labeled example:true",
    },
    {
      id: "usage",
      kind: "kv",
      title: "Usage",
      demo: true,
      entries: [
        ["calls this period", "— (demo-local: no queryable usage store is wired yet)"],
        ["metered operations", manifest.pricing.rates.map((r) => r.operation).join(" · ")],
      ],
      note: "metering seams emit structured events per call; the readout lane lands with the apis.ax account wiring",
    },
    {
      id: "billing",
      kind: "kv",
      title: "Billing",
      demo: true,
      entries: [
        ["rate", `$${rate.price}/call — test-mode: nothing is charged, no invoice will issue`],
        ["ceiling", `$${manifest.pricing.hardCeiling} hard`],
        ["account door", { href: "https://apis.ax/account", label: "apis.ax/account" }],
        ["rate card", { href: "/pricing", label: "/pricing" }],
      ],
      note: "demo-local fallback — balances and settlements arrive via the apis.ax/account lane, not this shell",
    },
  ],
};
