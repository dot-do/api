/**
 * substrate.ts — Stratum A: the G3 `APIProduct` instance for the
 * `staffing-talent` substrate (register row: Staffing & Talent Placement,
 * NAICS 5613 — shared by design with the fn-hr-talent Function row; the
 * vertical row leads).
 *
 * The G3 stratum carries NO brand, domain, ICP, persona, motion, offer,
 * price, positioning, or gate — those are G4 projection fields
 * (./projection.ts). One substrate, many non-exclusive projections.
 *
 * Shape follows the property-template spec §1 (the digital-products
 * `APIProduct` sketch); the normative definition lands in the
 * primitives.org.ai `digital-products` package — this file instantiates the
 * shape, it does not redefine it.
 */

export interface NounDef {
  name: string
  schema: string // $type → schema.org.ai
  binding: 'ingested' | 'generated' | 'native' | 'federated'
  verbs: string[]
  note?: string
}

export interface SystemCoordinate {
  system: string // one of the ~52-System catalog
  coordinates: string[]
}

export interface OperationDef {
  id: string // the OpenAPI operationId — the only thing a rate card may price
  method: 'GET' | 'POST'
  path: string
  noun: string
  verb: string
  summary: string
}

export interface MeterDef {
  operation: string
  event: 'meter'
}

export interface APIProduct {
  substrate: string
  g1Anchors: Record<string, string>
  nouns: NounDef[]
  systems: SystemCoordinate[]
  transports: string[]
  operations: OperationDef[]
  sandbox: { seedModule: string; workspaceRule: string; retention: string }
  suite: { path: string; note: string }
  meters: MeterDef[]
}

export const staffingTalent: APIProduct = {
  substrate: 'staffing-talent',

  // The row's G1 anchors — the one register row whose primary record schema
  // is literally a G1 standard (O*NET-SOC types the Candidate/Placement record).
  g1Anchors: {
    naics: '5613 Employment Services',
    onet: 'O*NET-SOC 29.0 — skills typing on Candidate/Placement records; occupation vocabulary served as ingested reference data',
    apqc: 'Manage Human Capital process family [UNVERIFIED exact PCF code — register-carried marker]',
  },

  nouns: [
    {
      name: 'Candidate',
      schema: 'https://schema.org.ai/Candidate',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      note: 'O*NET-typed skills; ATS system-of-record grain. EOR/payroll fields excluded per the register [COUNSEL] marker.',
    },
    {
      name: 'Placement',
      schema: 'https://schema.org.ai/Placement',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      note: 'the placement-outcome record — 90-day-validatable grain; the branching collection of this property.',
    },
    {
      name: 'JobOrder',
      schema: 'https://schema.org.ai/JobOrder',
      binding: 'native',
      verbs: ['list', 'get', 'create'],
      note: 'demand-side requisition at staffing-agency grain.',
    },
    {
      name: 'Occupation',
      schema: 'https://schema.org.ai/Occupation',
      binding: 'ingested',
      verbs: ['list', 'get'],
      note: 'O*NET-SOC vocabulary excerpt (U.S. DOL, CC BY 4.0) — free G1 reference data, read-only.',
    },
  ],

  // The row's System set: ATS is the derived system-of-record ("People:
  // candidate/employee — ATS/HRIS"); HRIS is the adjacency shared with the
  // fn-hr-talent Function coordinate — same record, same systems, one cell
  // with two register addresses.
  systems: [
    { system: 'ATS', coordinates: ['staffing-agencies (NAICS 5613)', 'hr-departments (fn-hr-talent coordinate)'] },
    { system: 'HRIS', coordinates: ['employee-lifecycle adjacency (fn-hr-talent)'] },
  ],

  // Presence-when-true: only the transports this worker actually serves.
  transports: ['REST', 'MCP'],

  operations: [
    { id: 'listPlacements', method: 'GET', path: '/placements', noun: 'Placement', verb: 'list', summary: 'List placements — the branching typed collection (OK | EMPTY | BLOCKED on one pathname)' },
    { id: 'getPlacement', method: 'GET', path: '/placements/{id}', noun: 'Placement', verb: 'get', summary: 'Get one placement (90-day-validatable outcome record)' },
    { id: 'createPlacement', method: 'POST', path: '/placements', noun: 'Placement', verb: 'create', summary: 'Record a placement (headless ATS door; anon sandbox mints an ephemeral workspace)' },
    { id: 'listCandidates', method: 'GET', path: '/candidates', noun: 'Candidate', verb: 'list', summary: 'List candidates (O*NET-typed skills)' },
    { id: 'getCandidate', method: 'GET', path: '/candidates/{id}', noun: 'Candidate', verb: 'get', summary: 'Get one candidate' },
    { id: 'createCandidate', method: 'POST', path: '/candidates', noun: 'Candidate', verb: 'create', summary: 'Create a candidate (headless ATS door; anon sandbox mints an ephemeral workspace)' },
    { id: 'listJobOrders', method: 'GET', path: '/job-orders', noun: 'JobOrder', verb: 'list', summary: 'List job orders' },
    { id: 'getJobOrder', method: 'GET', path: '/job-orders/{id}', noun: 'JobOrder', verb: 'get', summary: 'Get one job order' },
    { id: 'createJobOrder', method: 'POST', path: '/job-orders', noun: 'JobOrder', verb: 'create', summary: 'Create a job order (headless ATS door; anon sandbox mints an ephemeral workspace)' },
    { id: 'listOccupations', method: 'GET', path: '/occupations', noun: 'Occupation', verb: 'list', summary: 'List the O*NET-SOC occupation vocabulary excerpt (free G1 reference data)' },
    { id: 'getOccupation', method: 'GET', path: '/occupations/{id}', noun: 'Occupation', verb: 'get', summary: 'Get one O*NET-SOC occupation' },
  ],

  sandbox: {
    seedModule: './seed.ts',
    workspaceRule:
      'any keyless POST without an x-workspace header auto-mints an ephemeral workspace (ws_*) and returns its id; subsequent calls may present x-workspace to read seed + own minted records',
    retention: 'ephemeral worker memory only — vanishes on isolate recycle; disclosed on every minting response',
  },

  suite: {
    path: '/verify',
    note: 'published runnable suites — the /verify export; interfaces.testSuite is deliberately not declared on the card until the suite document is digest-pinned',
  },

  meters: [
    { operation: 'listPlacements', event: 'meter' },
    { operation: 'getPlacement', event: 'meter' },
    { operation: 'createPlacement', event: 'meter' },
    { operation: 'listCandidates', event: 'meter' },
    { operation: 'getCandidate', event: 'meter' },
    { operation: 'createCandidate', event: 'meter' },
    { operation: 'listJobOrders', event: 'meter' },
    { operation: 'getJobOrder', event: 'meter' },
    { operation: 'createJobOrder', event: 'meter' },
    { operation: 'listOccupations', event: 'meter' },
    { operation: 'getOccupation', event: 'meter' },
  ],
}
