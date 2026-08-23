#!/usr/bin/env node
/**
 * generate-seed.mjs — the §5.2 mechanical sandbox seed for the
 * `consulting-research` substrate (register row: Consulting & Scientific
 * Services, NAICS 5416-5417; a GAP row — no G4 name held).
 *
 * The row's source route is UNRULED (no class-A corpus reachable), so the
 * universal-floor anon sandbox is seeded synthetically, generated against the
 * row's G1-anchored record schemas under estate fixture law:
 *   - every record carries `example: true` and a demo notice — the sandbox is
 *     the real product over clearly-labeled simulated data, never a faked demo;
 *   - no real company or person names (fictional firm names, collision-checked
 *     by construction against common real brand names);
 *   - no real EINs/identifiers — synthetic 00-prefixed patterns;
 *   - O*NET occupation code 13-1111.00 (Management Analysts) is used as
 *     TYPING metadata only (a G1 anchor the register provides); all task
 *     STATEMENTS are synthetic. APQC-grain process ids use a synthetic
 *     `PCF-EX-*` format — they are schema-shaped, not real PCF codes.
 *
 * Deterministic: seeded PRNG keyed on the substrate id. Reseeding is a build
 * step (`node scripts/generate-seed.mjs`), never a manual edit of seed.json.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "seed.json");

// mulberry32 — tiny deterministic PRNG
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const rnd = mulberry32(hash("consulting-research"));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const DEMO_NOTICE =
  "Synthetic example data — mechanically generated sandbox seed for the consulting-research substrate; not real client, firm, or engagement data. Retention: sandbox seed is versioned with the manifest and may be regenerated at any deploy.";

const label = (rec) => ({ ...rec, example: true, demo_notice: DEMO_NOTICE });

// Fictional firms — invented compounds, no real-brand collision by construction.
const firms = [
  { id: "firm-ex-1", name: "Bramblewick Advisory LLC [example]", kind: "management-consulting", naics: "541611", ein: "00-1100001" },
  { id: "firm-ex-2", name: "Quarrelstone Research Collective LLC [example]", kind: "scientific-rd-services", naics: "541715", ein: "00-1100002" },
  { id: "firm-ex-3", name: "Fennelmoor Strategy Partners LLC [example]", kind: "management-consulting", naics: "541613", ein: "00-1100003" },
].map(label);

// Fictional client tenants of those firms.
const clients = [
  { id: "client-ex-1", name: "Osselton Fabrication Co. [example]", sector: "manufacturing" },
  { id: "client-ex-2", name: "Larkspindle Logistics Inc. [example]", sector: "freight-logistics" },
  { id: "client-ex-3", name: "Midgewater Provisions LLC [example]", sector: "food-retail" },
  { id: "client-ex-4", name: "Tarnbeck Utilities Cooperative [example]", sector: "utilities-energy" },
].map(label);

// Synthetic task statements at the O*NET task grain (typing anchor 13-1111.00;
// statements are invented, not O*NET text).
const TASK_TEMPLATES = [
  "Document the current-state workflow for {area} and identify handoff losses",
  "Assemble the baseline metrics workbook for {area}",
  "Interview process owners in {area} and code the findings",
  "Draft the recommendations memo for {area}",
  "Build the implementation sequence for the {area} changes",
  "Verify post-change metrics for {area} against the baseline",
];
const AREAS = ["order intake", "vendor onboarding", "field scheduling", "claims handling", "inventory close", "lab sample routing"];

// Synthetic APQC-grain process records (schema-shaped ids, not real PCF codes).
const processes = [
  { id: "PCF-EX-1.2.3", name: "Assess current-state operating model [synthetic process id]", grain: "apqc-process" },
  { id: "PCF-EX-2.4.1", name: "Define future-state process design [synthetic process id]", grain: "apqc-process" },
  { id: "PCF-EX-3.1.5", name: "Plan and sequence implementation [synthetic process id]", grain: "apqc-process" },
  { id: "PCF-EX-4.2.2", name: "Measure and verify outcomes [synthetic process id]", grain: "apqc-process" },
  { id: "PCF-EX-5.3.1", name: "Design and run research protocol [synthetic process id]", grain: "apqc-process" },
  { id: "PCF-EX-5.3.4", name: "Compile and peer-review findings [synthetic process id]", grain: "apqc-process" },
].map(label);

const STATUSES = ["proposed", "active", "active", "closed"]; // weighted
const SECTORS = clients.map((c) => c.sector);

const engagements = [];
const sows = [];
const milestones = [];
const deliverables = [];
const tasks = [];

let dSeq = 0, mSeq = 0, tSeq = 0;
for (let i = 1; i <= 6; i++) {
  const firm = firms[i % firms.length];
  const client = clients[i % clients.length];
  const status = i <= 2 ? "active" : pick(STATUSES); // guarantee active depth
  const eid = `eng-ex-${i}`;
  const sowId = `sow-ex-${i}`;
  const start = `2026-0${1 + (i % 6)}-0${1 + (i % 9)}`;

  const engMilestones = [];
  const engDeliverables = [];
  const nMilestones = 2 + (i % 3);
  for (let m = 1; m <= nMilestones; m++) {
    const mid = `ms-ex-${++mSeq}`;
    const done = m < nMilestones || status === "closed";
    engMilestones.push(mid);
    milestones.push(
      label({
        id: mid, engagementId: eid,
        name: `Milestone ${m}: ${pick(["diagnostic complete", "recommendations delivered", "pilot verified", "final readout"])} [example]`,
        due: `2026-0${1 + ((i + m) % 8)}-15`,
        status: done ? "complete" : "open",
      }),
    );
    const did = `del-ex-${++dSeq}`;
    engDeliverables.push(did);
    deliverables.push(
      label({
        id: did, engagementId: eid, milestoneId: mid,
        title: `${pick(["Current-state assessment", "Findings memo", "Implementation plan", "Verified outcome report", "Research protocol", "Peer-reviewed findings package"])} [example]`,
        status: done ? "verified" : pick(["draft", "in-review"]),
        napcsClass: "synthetic-services-outcome", // NAPCS types the sellable engagement outcome; class value is schema-shaped, not a real NAPCS code
      }),
    );
    for (let t = 0; t < 2; t++) {
      const area = pick(AREAS);
      tasks.push(
        label({
          id: `task-ex-${++tSeq}`, engagementId: eid, deliverableId: did,
          statement: pick(TASK_TEMPLATES).replace("{area}", area) + " [synthetic statement]",
          onetTypingAnchor: "13-1111.00", // G1 typing anchor (Management Analysts); statement is synthetic
          processId: pick(processes).id,
          status: done ? "done" : "open",
        }),
      );
    }
  }

  sows.push(
    label({
      id: sowId, engagementId: eid,
      title: `Statement of Work — ${client.name} × ${firm.name}`,
      scope: `Synthetic SOW scope: ${pick(AREAS)} improvement program, ${nMilestones} milestones, outcome-verified deliverables. [example]`,
      signed: status !== "proposed",
    }),
  );

  engagements.push(
    label({
      id: eid,
      title: `${pick(["Operating-model diagnostic", "Process redesign program", "Applied research study", "Outcome verification engagement"])} — ${client.sector} [example]`,
      firmId: firm.id, clientId: client.id,
      status, sector: client.sector,
      naics: i % 2 === 0 ? "5417" : "5416",
      start, sowId, milestoneIds: engMilestones, deliverableIds: engDeliverables,
    }),
  );
}

const seed = {
  $context: "https://schema.org.ai",
  substrate: "consulting-research",
  generated: "deterministic (mulberry32, keyed on substrate id) — reseed via scripts/generate-seed.mjs",
  demo_notice: DEMO_NOTICE,
  fixtureLaw: { realNames: false, syntheticIdentifiers: "00-prefixed EIN pattern; PCF-EX-* process ids; *-ex-* record ids", secretScan: "no credentials present by construction" },
  firms, clients, engagements, sows, milestones, deliverables, tasks, processes,
};

writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `seed: ${engagements.length} engagements, ${sows.length} sows, ${milestones.length} milestones, ${deliverables.length} deliverables, ${tasks.length} tasks, ${processes.length} processes → seed.json`,
);
