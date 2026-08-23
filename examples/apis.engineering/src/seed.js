/**
 * seed.js — the sandbox seed corpus for apis.engineering (register row
 * engineering-architecture), produced per template spec §5.2.
 *
 * DATA CLASS — ALL RECORDS ARE LABELED SYNTHETIC EXAMPLE DATA. The row's
 * source route has not been derived to ingest depth (no corpus is named
 * anywhere in the estate record; the register's own verdict for this cell
 * is "Nominal — names held, zero thesis"). Nothing here is real: every
 * firm, project, drawing, spec, and submittal is fictional, generated
 * against the row's record schemas under estate fixture law (no real
 * company or person names, no real license numbers, `"example": true`
 * on every record). The sandbox is the live product over simulated data —
 * never a faked demo (live-demo ruling).
 *
 * Licensure boundary, honest by construction: no record carries or implies
 * a PE stamp (`stamped: false` everywhere). Stamped artifacts are reserved
 * acts for independent licensed professionals; the `stamped` scope on the
 * collection answers BLOCKED.
 *
 * NAICS-23 boundary kept: no draw, lien waiver, or construction-payment
 * record appears here — that family belongs to Construction, not 5413.
 *
 * No record here implies a ranking. Collections are alphabetical by id.
 */

const EXAMPLE_NOTE = 'example data — synthetic sandbox seed, labeled per estate fixture law; fictional firm and project'

const FIRM_ENG = { $type: 'Organization', name: 'Northspan Engineering (fictional demo firm)' }
const FIRM_ARCH = { $type: 'Organization', name: 'Atrium Line Architects (fictional demo firm)' }
const DEMO_PROJECT = 'demo-cedar-flats'

/** Drawing records — the row's data-ply record type. schema.org generics
 *  per cascade rule 2 (no settled interchange standard cited for this cell). */
export const drawingRecords = [
  {
    $type: 'Drawing',
    id: 'demo-a-101',
    sheet: 'A-101',
    name: 'Floor plan — level 1',
    discipline: 'architectural',
    project: DEMO_PROJECT,
    revision: 'B',
    issuedFor: 'review',
    author: FIRM_ARCH,
    stamped: false,
    stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Drawing',
    id: 'demo-a-301',
    sheet: 'A-301',
    name: 'Building sections',
    discipline: 'architectural',
    project: DEMO_PROJECT,
    revision: 'A',
    issuedFor: 'coordination',
    author: FIRM_ARCH,
    stamped: false,
    stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Drawing',
    id: 'demo-c-101',
    sheet: 'C-101',
    name: 'Site grading and drainage plan',
    discipline: 'civil',
    project: DEMO_PROJECT,
    revision: 'C',
    issuedFor: 'review',
    author: FIRM_ENG,
    stamped: false,
    stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Drawing',
    id: 'demo-c-102',
    sheet: 'C-102',
    name: 'Utility plan',
    discipline: 'civil',
    project: DEMO_PROJECT,
    revision: 'A',
    issuedFor: 'coordination',
    author: FIRM_ENG,
    stamped: false,
    stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Drawing',
    id: 'demo-s-201',
    sheet: 'S-201',
    name: 'Foundation plan',
    discipline: 'structural',
    project: DEMO_PROJECT,
    revision: 'B',
    issuedFor: 'review',
    author: FIRM_ENG,
    stamped: false,
    stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'Drawing',
    id: 'demo-s-501',
    sheet: 'S-501',
    name: 'Typical framing details',
    discipline: 'structural',
    project: DEMO_PROJECT,
    revision: 'A',
    issuedFor: 'coordination',
    author: FIRM_ENG,
    stamped: false,
    stampNote: 'not a stamped artifact — PE/RA stamping is a reserved act of a licensed professional and is not served by this API',
    example: true,
    note: EXAMPLE_NOTE,
  },
]

/** Specification records — schema.org DigitalDocument generics (cascade
 *  rule 2). Section labels are plain-language, deliberately NOT keyed to
 *  any proprietary numbering standard (none is cited for this cell in the
 *  estate record). */
export const specificationRecords = [
  {
    $type: 'DigitalDocument',
    kind: 'Specification',
    id: 'demo-spec-concrete',
    section: 'Cast-in-place concrete',
    name: 'Cast-in-place concrete — materials and placement',
    project: DEMO_PROJECT,
    revision: 'B',
    author: FIRM_ENG,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    kind: 'Specification',
    id: 'demo-spec-earthwork',
    section: 'Earthwork',
    name: 'Earthwork — excavation, fill, and compaction',
    project: DEMO_PROJECT,
    revision: 'A',
    author: FIRM_ENG,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    kind: 'Specification',
    id: 'demo-spec-glazing',
    section: 'Glazing',
    name: 'Glazing — exterior storefront assemblies',
    project: DEMO_PROJECT,
    revision: 'A',
    author: FIRM_ARCH,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    kind: 'Specification',
    id: 'demo-spec-steel',
    section: 'Structural steel',
    name: 'Structural steel — fabrication and erection',
    project: DEMO_PROJECT,
    revision: 'C',
    author: FIRM_ENG,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
]

/** Submittal records — assembled packages referencing drawings and specs
 *  by id (the row's implied first-party route: submittal/drawing assembly
 *  on consented projects; here exercised over the fictional demo project). */
export const submittalRecords = [
  {
    $type: 'DigitalDocument',
    kind: 'Submittal',
    id: 'demo-sub-001',
    name: 'Concrete mix design package',
    project: DEMO_PROJECT,
    status: 'reviewed',
    items: [
      { drawing: 'demo-s-201' },
      { specification: 'demo-spec-concrete' },
    ],
    assembledBy: FIRM_ENG,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    kind: 'Submittal',
    id: 'demo-sub-002',
    name: 'Structural steel shop package',
    project: DEMO_PROJECT,
    status: 'submitted',
    items: [
      { drawing: 'demo-s-501' },
      { specification: 'demo-spec-steel' },
    ],
    assembledBy: FIRM_ENG,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
  {
    $type: 'DigitalDocument',
    kind: 'Submittal',
    id: 'demo-sub-003',
    name: 'Storefront glazing package',
    project: DEMO_PROJECT,
    status: 'draft',
    items: [
      { drawing: 'demo-a-301' },
      { specification: 'demo-spec-glazing' },
    ],
    assembledBy: FIRM_ARCH,
    stamped: false,
    example: true,
    note: EXAMPLE_NOTE,
  },
]
